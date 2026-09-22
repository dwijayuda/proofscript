import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { EmitContext, IRDeclarationModifiers, IRDef, IREquationPattern, IRExpr, IRParam, IRProgram, IRType, IRTypeArgument, LeanMaterializeOptions, LeanModuleResource, RegistryView } from "../../core/model.js";
import type { ProofScriptPlugin } from "../../core/plugin-api.js";

import { DEFAULT_LEAN_TOOLCHAIN } from "../../core/baseline.js";
import { universeDisplay } from "../../core/type-utils.js";
export { DEFAULT_LEAN_TOOLCHAIN } from "../../core/baseline.js";

function makeLeanContext(registry: RegistryView): EmitContext {
  const context: EmitContext = {
    registry,
    emitExpr(expr: IRExpr): string {
      switch (expr.kind) {
        case "var": return expr.name.includes(".") ? `_root_.ProofScript.Generated.${expr.name}` : expr.name;
        case "type": return context.emitType(expr.value);
        case "call": {
          const universeSuffix = expr.universeArgs?.length ? `.{${expr.universeArgs.map(universeDisplay).join(", ")}}` : "";
          const callee = expr.rootQualified ? `_root_.ProofScript.Generated.${expr.callee}` : expr.callee;
          const head = `${expr.explicitMode ? "@" : ""}${callee}${universeSuffix}`;
          const args = expr.args.flatMap((arg, index) => {
            // Runtime-erased dependent indices are branch-local elaboration
            // evidence. Reconstructed Lean source should let Lean infer them
            // rather than mentioning compiler-generated hidden names.
            if (expr.runtimeErasedArgs?.[index]) return [];
            const rendered = context.emitExpr(arg);
            const name = expr.argumentNames?.[index];
            return [name && !expr.explicitMode ? `(${name} := ${rendered})` : rendered];
          }).join(" ");
          return args.length === 0 ? head : `(${head} ${args})`;
        }
        case "apply": {
          const args = expr.args.map((arg) => context.emitExpr(arg)).join(" ");
          return args.length === 0 ? context.emitExpr(expr.callee) : `(${context.emitExpr(expr.callee)} ${args})`;
        }
        case "lambda": {
          const params = expr.params.map((param) => renderLeanBinder(param, context.emitType(param.type))).join(" ");
          return `(fun ${params} => ${context.emitExpr(expr.body)})`;
        }
        case "quantifier": {
          const head = expr.quantifier === "forall" ? "∀" : "∃";
          const params = expr.params.map((param) => renderLeanBinder(param, context.emitType(param.type))).join(" ");
          return `(${head} ${params}, ${context.emitExpr(expr.body)})`;
        }
        case "literal":
        case "op":
        case "extension": return registry.getLeanExprLowering(expr.op)(expr, context);
      }
    },
    emitType(type: IRType): string {
      return registry.getLeanTypeLowering(type)(type, {
        emitType: (nested) => context.emitType(nested),
        emitExpr: (expr) => context.emitExpr(expr),
        emitTypeArgument: (argument) => context.emitTypeArgument(argument),
      });
    },
    emitTypeArgument(argument: IRTypeArgument): string {
      return argument.kind === "type" ? context.emitType(argument.value) : context.emitExpr(argument.value);
    },
    emitDeclaration(declaration) {
      const rendered = registry.getLeanDeclarationLowering(declaration.op)(declaration, context);
      return applyLeanDeclarationModifiers(rendered, declaration.modifiers);
    },
  };
  return context;
}


function renderEquationPattern(pattern: IREquationPattern, context: ReturnType<typeof makeLeanContext>): string {
  switch (pattern.kind) {
    case "constructor": {
      const fields = pattern.fields.map((field) => {
        const rendered = renderEquationPattern(field, context);
        return field.kind === "constructor" || field.kind === "named" ? `(${rendered})` : rendered;
      }).join(" ");
      return `.${pattern.variant}${fields ? ` ${fields}` : ""}`;
    }
    case "number": return pattern.value;
    case "wildcard": return "_";
    case "variable": return pattern.name;
    case "inaccessible": return `.(${context.emitExpr(pattern.term)})`;
    case "named": return `${pattern.name} @ ${pattern.equalityName ? `${pattern.equalityName}: ` : ""}${renderEquationPattern(pattern.pattern, context)}`;
  }
}

function renderWellFoundedTermination(termination: Exclude<NonNullable<IRDef["termination"]>, { readonly kind: "structural" }>, context: ReturnType<typeof makeLeanContext>, indent: string): string[] {
  const lines: string[] = [];
  if (termination.suggest) {
    lines.push(`${indent}termination_by?`);
  } else if (termination.measure) {
    const binders = termination.binders?.length ? `${termination.binders.join(" ")} => ` : "";
    lines.push(`${indent}termination_by ${binders}${context.emitExpr(termination.measure)}`);
  }
  if (termination.decreasingBy) {
    lines.push(`${indent}decreasing_by`);
    lines.push(`${indent}  ${termination.decreasingBy}`);
  }
  return lines;
}

function emitLeanDefLines(declaration: IRDef, registry: RegistryView, context: ReturnType<typeof makeLeanContext>, indent = ""): string[] {
  const lines: string[] = [];
  const equationNames = new Set(declaration.equationParamNames ?? []);
  const ordinaryParams = declaration.params
    .filter((param) => !equationNames.has(param.name))
    .map((param) => renderLeanBinder(param, context.emitType(param.type), param.defaultValue ? context.emitExpr(param.defaultValue) : undefined));
  const extraParams = registry.getLeanDefBinders(declaration, {
    registry,
    emitExpr: (expr) => context.emitExpr(expr),
    emitType: (type) => context.emitType(type),
    emitTypeArgument: (argument) => context.emitTypeArgument(argument),
  });
  const params = [...ordinaryParams, ...extraParams].join(" ");
  if (declaration.sourceForm === "equations" && declaration.equations?.length && declaration.equationParamNames?.length) {
    const equationParams = declaration.equationParamNames.map((name) => declaration.params.find((param) => param.name === name)).filter((param): param is IRParam => !!param);
    let resultType = context.emitType(declaration.returnType);
    for (let index = equationParams.length - 1; index >= 0; index -= 1) {
      const param = equationParams[index]!;
      // Anonymous arrow parameters retain arrow spelling. Named equation
      // parameters reconstruct an explicit Pi binder so dependencies in later
      // parameter/result types remain in scope in generated Lean.
      resultType = param.name.startsWith("$eq")
        ? `${context.emitType(param.type)} → ${resultType}`
        : `${renderLeanBinder(param, context.emitType(param.type))} → ${resultType}`;
    }
    lines.push(`${indent}${renderLeanDeclarationModifiers(declaration.modifiers)}def ${declaration.name}${declaration.universeParams?.length ? `.{${declaration.universeParams.join(", ")}}` : ""}${params ? ` ${params}` : ""} : ${resultType}`);
    for (const equation of declaration.equations) {
      lines.push(`${indent}  | ${equation.patterns.map((pattern) => renderEquationPattern(pattern, context)).join(", ")} => ${context.emitExpr(equation.body)}`);
    }
    if (declaration.termination?.kind === "structural") {
      const equationIndex = declaration.equationParamNames.indexOf(declaration.termination.parameter);
      if (equationIndex >= 0) {
        const localNames = declaration.equationParamNames.map((_, index) => `__ps_eq${index}`);
        lines.push(`${indent}termination_by structural ${localNames.join(" ")} => ${localNames[equationIndex]}`);
      } else {
        lines.push(`${indent}termination_by structural ${declaration.termination.parameter}`);
      }
    } else if (declaration.termination?.kind === "wellFounded") {
      lines.push(...renderWellFoundedTermination(declaration.termination, context, indent));
    }
  } else {
    const allParams = [...ordinaryParams, ...extraParams].join(" ");
    lines.push(
      `${indent}${renderLeanDeclarationModifiers(declaration.modifiers)}def ${declaration.name}${declaration.universeParams?.length ? `.{${declaration.universeParams.join(", ")}}` : ""}${allParams ? ` ${allParams}` : ""} : ${context.emitType(declaration.returnType)} :=`,
      `${indent}  ${context.emitExpr(declaration.body)}`,
      ...(declaration.termination?.kind === "structural"
        ? [`${indent}termination_by structural ${declaration.termination.parameter}`]
        : declaration.termination?.kind === "wellFounded"
          ? renderWellFoundedTermination(declaration.termination, context, indent)
          : []),
    );
  }
  return lines;
}

function emitProgram(program: IRProgram, registry: RegistryView): string {
  const context = makeLeanContext(registry);
  const resources = [...registry.getLeanModules()].sort((a, b) => a.module.localeCompare(b.module));
  const automaticImports = resources.filter((resource) => resource.autoImport !== false);
  const sourceHeaders = program.declarations.filter((declaration) => declaration.kind === "extension" && (declaration.op === "lean.module.header" || declaration.op === "lean.import"));
  const moduleHeader = sourceHeaders.find((declaration) => declaration.kind === "extension" && declaration.op === "lean.module.header");
  const sourceImports = sourceHeaders.filter((declaration) => declaration.kind === "extension" && declaration.op === "lean.import");
  const lines = [
    "/- Generated by ProofScript. Lean remains the normative proof-checking authority. -/",
    ...(moduleHeader && moduleHeader.kind === "extension" ? [context.emitDeclaration(moduleHeader)] : []),
    ...automaticImports.map((resource) => `import ${resource.module}`),
    ...sourceImports.map((declaration) => context.emitDeclaration(declaration as import("../../core/model.js").IRExtensionDecl)),
    ...(automaticImports.length > 0 || sourceImports.length > 0 || moduleHeader ? [""] : []),
    "namespace ProofScript.Generated",
    "",
  ];
  for (const prelude of registry.getLeanPrelude()) lines.push(prelude, "");
  for (const declaration of program.declarations) {
    if (declaration.kind === "extension" && (declaration.op === "lean.module.header" || declaration.op === "lean.import")) continue;
    if (declaration.kind === "extension") {
      lines.push(context.emitDeclaration(declaration), "");
      continue;
    }
    if (declaration.kind === "mutual") {
      lines.push("mutual");
      for (const member of declaration.members) lines.push(...emitLeanDefLines(member, registry, context, "  "), "");
      lines.push("end", "");
      for (const member of declaration.members) {
        for (const annotation of member.annotations ?? []) {
          const proof = registry.getLeanAnnotationLowering(annotation.op)(annotation, member, context);
          if (proof.trim().length > 0) lines.push(proof, "");
        }
      }
      continue;
    }
    lines.push(...emitLeanDefLines(declaration, registry, context), "");
    for (const annotation of declaration.annotations ?? []) {
      const proof = registry.getLeanAnnotationLowering(annotation.op)(annotation, declaration, context);
      if (proof.trim().length > 0) lines.push(proof, "");
    }
  }
  lines.push("end ProofScript.Generated", "");
  return lines.join("\n");
}


function renderLeanDeclarationModifiers(modifiers?: IRDeclarationModifiers): string {
  if (!modifiers) return "";
  const parts: string[] = [];
  const attributes = modifiers.attributes ?? [];
  if (attributes.length) parts.push(`@[${attributes.map((attribute) => `${attribute.name}${attribute.priority === undefined ? "" : ` ${attribute.priority}`}`).join(", ")}]`);
  if (modifiers.expose) parts.push("@[expose]");
  if (modifiers.visibility) parts.push(modifiers.visibility);
  if (modifiers.protected) parts.push("protected");
  if (modifiers.meta) parts.push("meta");
  return parts.length ? `${parts.join(" ")} ` : "";
}

function applyLeanDeclarationModifiers(rendered: string, modifiers?: IRDeclarationModifiers): string {
  const prefix = renderLeanDeclarationModifiers(modifiers);
  if (!prefix || rendered.trim().length === 0) return rendered;
  const lines = rendered.split("\n");
  lines[0] = `${prefix}${lines[0]}`;
  return lines.join("\n");
}

function renderLeanBinder(param: IRParam, type: string, defaultValue?: string): string {
  switch (param.binderInfo) {
    case "explicit": return `(${param.name} : ${type}${defaultValue === undefined ? "" : ` := ${defaultValue}`})`;
    case "implicit": return `{${param.name} : ${type}}`;
    case "strictImplicit": return `⦃${param.name} : ${type}⦄`;
    case "instance": return `[${param.name} : ${type}]`;
  }
}
async function writeLeanModule(workspace: string, resource: LeanModuleResource, reuse = false): Promise<boolean> {
  const path = join(workspace, ...resource.module.split(".")) + ".lean";
  await mkdir(dirname(path), { recursive: true });
  const normalized = resource.source.endsWith("\n") ? resource.source : `${resource.source}\n`;
  if (reuse) {
    try { if (await readFile(path, "utf8") === normalized) return true; } catch { /* cache miss */ }
  }
  await writeFile(path, normalized, "utf8");
  return false;
}

async function createLakeWorkspace(source: string, cwd: string, registry: RegistryView, options: LeanMaterializeOptions = {}): Promise<{ workspace: string; sourceFile: string; modules: readonly { module: string; sha256: string }[]; reusedModules?: readonly string[]; writtenModules?: readonly string[]; entryReused?: boolean }> {
  const workspace = join(cwd, "lean-workspace");
  const generatedDir = join(workspace, "ProofScriptGenerated");
  await mkdir(generatedDir, { recursive: true });
  const sourceFile = join(generatedDir, "Main.lean");
  let entryReused = false;
  if (options.reuseEntry) {
    try { entryReused = await readFile(sourceFile, "utf8") === source; } catch { entryReused = false; }
  }
  if (!entryReused) await writeFile(sourceFile, source, "utf8");

  const resources = [...registry.getLeanModules()].sort((a, b) => a.module.localeCompare(b.module));
  const reusedModules: string[] = [];
  const writtenModules: string[] = [];
  for (const resource of resources) {
    const reused = await writeLeanModule(workspace, resource, options.reuseModules?.has(resource.module) ?? false);
    (reused ? reusedModules : writtenModules).push(resource.module);
  }
  const modules = resources.map((resource) => ({ module: resource.module, sha256: sha256(resource.source) }));

  await writeFile(join(workspace, "lean-toolchain"), `${DEFAULT_LEAN_TOOLCHAIN}\n`, "utf8");
  await writeFile(
    join(workspace, "lakefile.toml"),
    [
      'name = "proofscript_generated"',
      'version = "0.85.0"',
      'defaultTargets = ["ProofScript", "ProofScriptGenerated"]',
      "",
      "[[lean_lib]]",
      'name = "ProofScript"',
      "",
      "[[lean_lib]]",
      'name = "ProofScriptGenerated"',
      "",
    ].join("\n"),
    "utf8",
  );
  return {
    workspace, sourceFile, modules,
    ...(reusedModules.length ? { reusedModules } : {}),
    ...(writtenModules.length ? { writtenModules } : {}),
    ...(entryReused ? { entryReused: true } : {}),
  };
}

function sha256(text: string): string { return createHash("sha256").update(text).digest("hex"); }

const plugin: ProofScriptPlugin = {
  id: "proofscript.prover.lean",
  version: "0.91.0",
  kind: "prover",
  setup(registry) {
    registry.registerLeanEngine({
      id: "lean",
      emitProgram,
      async materialize(source, cwd, registryView, options) {
        return createLakeWorkspace(source, cwd, registryView, options);
      },
      async check(source, cwd, registryView) {
        const { workspace, sourceFile, modules } = await createLakeWorkspace(source, cwd, registryView);
        const lake = spawnSync("lake", ["build"], { cwd: workspace, encoding: "utf8" });
        if (lake.status === 0) {
          return { status: "kernel-checked", checker: "lake", workspace, modules, stdout: lake.stdout ?? "", stderr: lake.stderr ?? "" };
        }

        if (modules.length === 0) {
          const direct = spawnSync("lean", [sourceFile], { cwd: workspace, encoding: "utf8" });
          if (direct.status === 0) {
            return { status: "kernel-checked", checker: "lean", workspace, modules, stdout: direct.stdout ?? "", stderr: direct.stderr ?? "" };
          }
          const lakeUnavailable = lake.status === null;
          const leanUnavailable = direct.status === null;
          if (lakeUnavailable && leanUnavailable) {
            return {
              status: "lean-unavailable",
              checker: "none",
              workspace,
              modules,
              stdout: "",
              stderr: "Lake and Lean executables are unavailable. The complete Lean workspace was generated but no kernel check was claimed.",
            };
          }
          return {
            status: "rejected",
            checker: direct.status === null ? "lake" : "lean",
            workspace,
            modules,
            stdout: [lake.stdout ?? "", direct.stdout ?? ""].filter(Boolean).join("\n"),
            stderr: [lake.stderr ?? "", direct.stderr ?? ""].filter(Boolean).join("\n"),
          };
        }

        if (lake.status === null) {
          return {
            status: "lean-unavailable",
            checker: "none",
            workspace,
            modules,
            stdout: "",
            stderr: "Lake is unavailable. This verification uses imported plugin Lean modules, so the complete workspace was generated but no kernel check was claimed.",
          };
        }

        return {
          status: "rejected",
          checker: "lake",
          workspace,
          modules,
          stdout: lake.stdout ?? "",
          stderr: lake.stderr ?? "",
        };
      },
    });
  },
};

export default plugin;
