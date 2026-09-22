import { ProofScriptError } from "../../core/errors.js";
import type { PluginManifest, ProofScriptPlugin } from "../../core/plugin-api.js";
import type { IRDeclarationAttribute, SurfaceDecl, SurfaceDeclarationPrefix, SurfaceParam } from "../../core/model.js";
import { parseBinderGroups } from "../../core/binders.js";
import { parsePriority } from "../../core/priority.js";

interface ModuleHeaderPayload {}
interface ImportPayload { readonly name: string; readonly all?: boolean; }
interface NormalizedImportPayload extends ImportPayload { readonly public?: boolean; readonly meta?: boolean; }
interface SectionPayload { readonly name?: string; }
interface NamespacePayload { readonly name: string; }
interface OpenScopedPayload { readonly names: readonly string[]; }
interface OpenNamespacePayload { readonly name: string; readonly only?: readonly string[]; readonly hiding?: readonly string[]; }
interface ExportPayload { readonly name: string; readonly members: readonly string[]; }
interface VariablePayload { readonly params: readonly SurfaceParam[]; }
interface NormalizedVariablePayload { readonly params: readonly import("../../core/model.js").IRParam[]; }
interface VariablePolicyPayload { readonly names: readonly string[]; }
interface AttributeSpec extends IRDeclarationAttribute { readonly remove?: boolean; }
interface DeclarationAttributesPayload { readonly attributes: readonly AttributeSpec[]; }
interface AttributeCommandPayload { readonly attributes: readonly AttributeSpec[]; readonly targets: readonly string[]; }

function prefix(owner: string, payload: unknown): SurfaceDeclarationPrefix { return { owner, payload }; }

function parseAttributeSpec(cursor: import("../../core/plugin-api.js").ParserCursor, allowRemove: boolean, code: string): AttributeSpec {
  const remove = allowRemove && cursor.peek("-");
  if (remove) cursor.consume("-");
  const name = cursor.parseIdentifier();
  let priority: number | undefined;
  if (name === "default_instance" && !remove && !cursor.peek("]") && !cursor.peek(",")) priority = parsePriority(cursor, code);
  return { name, ...(remove ? { remove: true } : {}), ...(priority === undefined ? {} : { priority }) };
}

function parseAttributeList(cursor: import("../../core/plugin-api.js").ParserCursor, allowRemove: boolean, code: string): readonly AttributeSpec[] {
  const attributes: AttributeSpec[] = [];
  while (!cursor.peek("]")) {
    if (cursor.peek(",")) cursor.consume(",");
    attributes.push(parseAttributeSpec(cursor, allowRemove, code));
    if (!cursor.peek(",") && !cursor.peek("]")) throw new ProofScriptError(code, "Only bare attributes and default_instance priority expressions are implemented in the generalized v0.45 attribute syntax.");
  }
  if (attributes.length === 0) throw new ProofScriptError(code, "Attribute list must not be empty.");
  return attributes;
}

function parseQualifiedName(cursor: import("../../core/plugin-api.js").ParserCursor): string {
  let name = cursor.parseIdentifier();
  while (cursor.peek(".")) {
    cursor.consume(".");
    name += `.${cursor.parseIdentifier()}`;
  }
  return name;
}

export const proofscriptManifest: PluginManifest = {
  schema: "proofscript.plugin/v1",
  id: "proofscript.feature.environment",
  version: "0.91.0",
  kind: "feature",
  semanticIds: ["lean.module.header", "lean.import", "lean.declaration.meta", "lean.declaration.expose", "lean.section.enter", "lean.section.exit", "lean.namespace.enter", "lean.namespace.exit", "lean.open.scoped", "lean.open.namespace", "lean.open.scoped.in", "lean.open.namespace.in", "lean.open.in.exit", "lean.export", "lean.variable", "lean.include", "lean.omit", "lean.attribute.command", "lean.attribute.default_instance", "lean.declaration.attributes", "lean.instance.local", "lean.instance.scoped"],
  proofscriptBaseline: "v0.1",
  leanBaseline: "4.33.1",
  lean: { assumptionPolicy: "none" },
};

const plugin: ProofScriptPlugin = {
  id: proofscriptManifest.id,
  version: proofscriptManifest.version,
  kind: "feature",
  setup(registry) {
    registry.registerDeclarationPrefixSyntax({
      keyword: "@",
      owner: "lean.declaration.attributes",
      parse(cursor) {
        cursor.expect("[");
        const attributes = parseAttributeList(cursor, false, "PS2601");
        cursor.expect("]");
        if (attributes.length === 1 && attributes[0]!.name === "expose") return prefix("lean.declaration.expose", {});
        if (attributes.length === 1 && attributes[0]!.name === "default_instance") {
          const attribute = attributes[0]!;
          return prefix("lean.attribute.default_instance", attribute.priority === undefined ? {} : { priority: attribute.priority });
        }
        return prefix("lean.declaration.attributes", { attributes } satisfies DeclarationAttributesPayload);
      },
    });

    registry.registerDeclarationPrefixSyntax({
      keyword: "local",
      owner: "lean.instance.local",
      parse() { return prefix("lean.instance.local", {}); },
    });

    registry.registerDeclarationPrefixSyntax({
      keyword: "scoped",
      owner: "lean.instance.scoped",
      parse() { return prefix("lean.instance.scoped", {}); },
    });

    for (const visibility of ["private", "public"] as const) {
      registry.registerDeclarationPrefixSyntax({
        keyword: visibility,
        owner: "lean.declaration.visibility",
        parse() { return prefix("lean.declaration.visibility", { visibility }); },
      });
    }
    registry.registerDeclarationPrefixSyntax({
      keyword: "protected",
      owner: "lean.declaration.protected",
      parse() { return prefix("lean.declaration.protected", {}); },
    });
    registry.registerDeclarationPrefixSyntax({
      keyword: "meta",
      owner: "lean.declaration.meta",
      parse() { return prefix("lean.declaration.meta", {}); },
    });

    registry.registerDeclarationSyntax({
      keyword: "module",
      parse(cursor) {
        cursor.expect(";");
        return { kind: "lean.module.header", payload: {} satisfies ModuleHeaderPayload };
      },
    });

    registry.registerDeclarationSyntax({
      keyword: "import",
      parse(cursor) {
        const all = cursor.peek("all");
        if (all) cursor.consume("all");
        const name = parseQualifiedName(cursor);
        cursor.expect(";");
        return { kind: "lean.import", payload: { name, ...(all ? { all: true } : {}) } satisfies ImportPayload };
      },
    });

    registry.registerDeclarationSyntax({
      keyword: "attribute",
      parse(cursor) {
        cursor.expect("[");
        const attributes = parseAttributeList(cursor, true, "PS2605");
        cursor.expect("]");
        const targets: string[] = [];
        while (!cursor.peek(";")) {
          if (cursor.peek(",")) cursor.consume(",");
          targets.push(parseQualifiedName(cursor));
        }
        if (targets.length === 0) throw new ProofScriptError("PS2604", "attribute command requires at least one target declaration.");
        cursor.expect(";");
        return { kind: "lean.attribute.command", payload: { attributes, targets } satisfies AttributeCommandPayload };
      },
    });

    registry.registerDeclarationSyntax({
      keyword: "section",
      parse(cursor) {
        const name = cursor.peek("{") ? undefined : cursor.parseIdentifier();
        cursor.expect("{");
        const exit: SurfaceDecl = { kind: "lean.section.exit", payload: name ? { name } satisfies SectionPayload : {} satisfies SectionPayload };
        cursor.enterCommandBlock(exit);
        return { kind: "lean.section.enter", payload: name ? { name } satisfies SectionPayload : {} satisfies SectionPayload };
      },
    });

    registry.registerDeclarationSyntax({
      keyword: "namespace",
      parse(cursor) {
        const name = cursor.parseIdentifier();
        cursor.expect("{");
        const exit: SurfaceDecl = { kind: "lean.namespace.exit", payload: { name } satisfies NamespacePayload };
        cursor.enterCommandBlock(exit);
        return { kind: "lean.namespace.enter", payload: { name } satisfies NamespacePayload };
      },
    });

    registry.registerDeclarationSyntax({
      keyword: "open",
      parse(cursor) {
        if (cursor.peek("scoped")) {
          cursor.consume("scoped");
          const names = [parseQualifiedName(cursor)];
          while (!cursor.peek(";") && !cursor.peek("in")) {
            if (cursor.peek(",")) cursor.consume(",");
            names.push(parseQualifiedName(cursor));
          }
          const payload = { names } satisfies OpenScopedPayload;
          if (cursor.peek("in")) {
            cursor.consume("in");
            cursor.enterOneCommandScope({ kind: "lean.open.in.exit", payload: {} });
            return { kind: "lean.open.scoped.in", payload };
          }
          cursor.expect(";");
          return { kind: "lean.open.scoped", payload };
        }
        const name = parseQualifiedName(cursor);
        let only: string[] | undefined;
        let hiding: string[] | undefined;
        if (cursor.peek("(")) {
          cursor.consume("("); only = [];
          while (!cursor.peek(")")) { only.push(cursor.parseIdentifier()); if (cursor.peek(",")) cursor.consume(","); }
          cursor.consume(")");
        } else if (cursor.peek("hiding")) {
          cursor.consume("hiding");
          hiding = [];
          while (!cursor.peek(";") && !cursor.peek("in")) {
            if (cursor.peek(",")) cursor.consume(",");
            hiding.push(cursor.parseIdentifier());
          }
          if (hiding.length === 0) throw new ProofScriptError("PS2606", "'open ... hiding' requires at least one hidden name.");
        }
        const payload = { name, ...(only ? { only } : {}), ...(hiding ? { hiding } : {}) } satisfies OpenNamespacePayload;
        if (cursor.peek("in")) {
          cursor.consume("in");
          cursor.enterOneCommandScope({ kind: "lean.open.in.exit", payload: {} });
          return { kind: "lean.open.namespace.in", payload };
        }
        cursor.expect(";");
        return { kind: "lean.open.namespace", payload };
      },
    });

    registry.registerDeclarationSyntax({
      keyword: "export",
      parse(cursor) {
        const name = parseQualifiedName(cursor);
        cursor.expect("(");
        const members: string[] = [];
        while (!cursor.peek(")")) {
          if (cursor.peek(",")) cursor.consume(",");
          members.push(cursor.parseIdentifier());
        }
        cursor.expect(")");
        if (members.length === 0) throw new ProofScriptError("PS2609", "'export' requires at least one member name in the v0.18 slice.");
        cursor.expect(";");
        return { kind: "lean.export", payload: { name, members } satisfies ExportPayload };
      },
    });

    registry.registerDeclarationSyntax({
      keyword: "variable",
      parse(cursor) {
        const params = parseBinderGroups(cursor);
        if (params.length === 0) throw new ProofScriptError("PS2607", "'variable' requires at least one binder.");
        cursor.expect(";");
        return { kind: "lean.variable", payload: { params } satisfies VariablePayload };
      },
    });
    for (const keyword of ["include", "omit"] as const) {
      registry.registerDeclarationSyntax({
        keyword,
        parse(cursor) {
          const names = [cursor.parseIdentifier()];
          while (!cursor.peek(";")) { if (cursor.peek(",")) cursor.consume(","); names.push(cursor.parseIdentifier()); }
          cursor.expect(";");
          return { kind: keyword === "include" ? "lean.include" : "lean.omit", payload: { names } satisfies VariablePolicyPayload };
        },
      });
    }

    registry.registerDeclarationElaborator({
      kind: "lean.module.header",
      declare() {},
      elaborate() { return { kind: "extension", op: "lean.module.header", payload: {} }; },
    });

    registry.registerDeclarationElaborator({
      kind: "lean.import",
      acceptedPrefixOwners: ["lean.declaration.visibility", "lean.declaration.meta"],
      declare(decl, context) {
        const payload = decl.payload as ImportPayload;
        const visibility = (decl.prefixes ?? []).find((item) => item.owner === "lean.declaration.visibility")?.payload as { visibility?: "private" | "public" } | undefined;
        const isMeta = (decl.prefixes ?? []).some((item) => item.owner === "lean.declaration.meta");
        context.importModule(payload.name, { ...(visibility?.visibility === "public" ? { public: true } : {}), ...(isMeta ? { meta: true } : {}), ...(payload.all ? { all: true } : {}) });
      },
      elaborate(decl) {
        const payload = decl.payload as ImportPayload;
        const visibility = (decl.prefixes ?? []).find((item) => item.owner === "lean.declaration.visibility")?.payload as { visibility?: "private" | "public" } | undefined;
        const isMeta = (decl.prefixes ?? []).some((item) => item.owner === "lean.declaration.meta");
        return { kind: "extension", op: "lean.import", payload: { ...payload, ...(visibility?.visibility === "public" ? { public: true } : {}), ...(isMeta ? { meta: true } : {}) } satisfies NormalizedImportPayload };
      },
    });

    registry.registerDeclarationElaborator({
      kind: "lean.attribute.command",
      declare(decl, context) {
        const payload = decl.payload as AttributeCommandPayload;
        for (const target of payload.targets) {
          for (const attribute of payload.attributes) {
            if (attribute.name === "default_instance") {
              if (attribute.remove) context.removeInstanceDefaultAttribute(target);
              else context.setInstanceDefaultAttribute(target, attribute.priority);
            }
            if (attribute.remove) context.removeDeclarationAttribute(target, attribute.name);
            else context.setDeclarationAttribute(target, { name: attribute.name, ...(attribute.priority === undefined ? {} : { priority: attribute.priority }) });
          }
        }
      },
      elaborate(decl) { return { kind: "extension", op: "lean.attribute.command", payload: decl.payload }; },
    });

    registry.registerDeclarationElaborator({
      kind: "lean.section.enter",
      declare(decl, context) { context.enterSection((decl.payload as SectionPayload).name); },
      elaborate(decl) { return { kind: "extension", op: "lean.section.enter", payload: decl.payload }; },
    });
    registry.registerDeclarationElaborator({
      kind: "lean.section.exit",
      declare(decl, context) { context.exitSection((decl.payload as SectionPayload).name); },
      elaborate(decl) { return { kind: "extension", op: "lean.section.exit", payload: decl.payload }; },
    });
    registry.registerDeclarationElaborator({
      kind: "lean.namespace.enter",
      declare(decl, context) { context.enterNamespace((decl.payload as NamespacePayload).name); },
      elaborate(decl) { return { kind: "extension", op: "lean.namespace.enter", payload: decl.payload }; },
    });
    registry.registerDeclarationElaborator({
      kind: "lean.namespace.exit",
      declare(decl, context) { context.exitNamespace((decl.payload as NamespacePayload).name); },
      elaborate(decl) { return { kind: "extension", op: "lean.namespace.exit", payload: decl.payload }; },
    });

    registry.registerDeclarationElaborator({
      kind: "lean.open.scoped",
      declare(decl, context) {
        for (const name of (decl.payload as OpenScopedPayload).names) context.openScopedEnvironment(name);
      },
      elaborate(decl) { return { kind: "extension", op: "lean.open.scoped", payload: decl.payload }; },
    });

    registry.registerDeclarationElaborator({
      kind: "lean.open.namespace",
      declare(decl, context) { const payload = decl.payload as OpenNamespacePayload; context.openNamespace(payload.name, payload.only, payload.hiding); },
      elaborate(decl) { return { kind: "extension", op: "lean.open.namespace", payload: decl.payload }; },
    });
    registry.registerDeclarationElaborator({
      kind: "lean.open.namespace.in",
      declare(decl, context) {
        const payload = decl.payload as OpenNamespacePayload;
        context.enterOneCommandEnvironmentScope();
        context.openNamespace(payload.name, payload.only, payload.hiding);
      },
      elaborate(decl) { return { kind: "extension", op: "lean.open.namespace.in", payload: decl.payload }; },
    });
    registry.registerDeclarationElaborator({
      kind: "lean.open.scoped.in",
      declare(decl, context) {
        context.enterOneCommandEnvironmentScope();
        for (const name of (decl.payload as OpenScopedPayload).names) context.openScopedEnvironment(name);
      },
      elaborate(decl) { return { kind: "extension", op: "lean.open.scoped.in", payload: decl.payload }; },
    });
    registry.registerDeclarationElaborator({
      kind: "lean.open.in.exit",
      declare(_decl, context) { context.exitOneCommandEnvironmentScope(); },
      elaborate() { return { kind: "extension", op: "lean.open.in.exit", payload: {} }; },
    });
    registry.registerDeclarationElaborator({
      kind: "lean.export",
      declare(decl, context) { const payload = decl.payload as ExportPayload; context.exportNamespace(payload.name, payload.members); },
      elaborate(decl) { return { kind: "extension", op: "lean.export", payload: decl.payload }; },
    });
    registry.registerDeclarationElaborator({
      kind: "lean.variable",
      declare(decl, context) { context.declareSectionVariables((decl.payload as VariablePayload).params); },
      elaborate(decl, context) {
        const params = (decl.payload as VariablePayload).params.map((surface) => {
          const type = context.resolveTypeExpression(surface.type);
          return { name: surface.name, type, binderInfo: surface.binderInfo, ...(type.form === "sort" ? { isTypeParam: true } : {}) };
        });
        return { kind: "extension", op: "lean.variable", payload: { params } satisfies NormalizedVariablePayload };
      },
    });
    for (const [kind, policy] of [["lean.include", "include"], ["lean.omit", "omit"]] as const) {
      registry.registerDeclarationElaborator({
        kind,
        declare(decl, context) { for (const name of (decl.payload as VariablePolicyPayload).names) context.setSectionVariablePolicy(name, policy); },
        elaborate(decl) { return { kind: "extension", op: kind, payload: decl.payload }; },
      });
    }

    for (const op of ["lean.module.header", "lean.import", "lean.section.enter", "lean.section.exit", "lean.namespace.enter", "lean.namespace.exit", "lean.open.scoped", "lean.open.namespace", "lean.open.scoped.in", "lean.open.namespace.in", "lean.open.in.exit", "lean.export", "lean.variable", "lean.include", "lean.omit", "lean.attribute.command"] as const) {
      const namespaceRuntime = op === "lean.import" || op === "lean.namespace.enter" || op === "lean.namespace.exit" || op === "lean.open.namespace" || op === "lean.open.namespace.in" || op === "lean.export";
      registry.registerOperation(op, {
        ...(op === "lean.import" ? { requiredCapabilities: ["lean.module"] } : namespaceRuntime ? { requiredCapabilities: ["lean.namespace"] } : {}),
        verification: { level: "kernel-checkable", notes: "Frontend environment command preserved in generated Lean module state." },
        domain: namespaceRuntime ? "runtime" : "proof",
      });
    }

    registry.registerLeanDeclarationLowering("lean.module.header", () => "module");
    registry.registerLeanDeclarationLowering("lean.import", (decl) => {
      const payload = decl.payload as NormalizedImportPayload;
      const prefix = `${payload.public ? "public " : ""}${payload.meta ? "meta " : ""}`;
      return `${prefix}import ${payload.all ? "all " : ""}ProofScriptGenerated.${payload.name}`;
    });

    registry.registerLeanDeclarationLowering("lean.section.enter", (decl) => {
      const { name } = decl.payload as SectionPayload;
      return name ? `section ${name}` : "section";
    });
    registry.registerLeanDeclarationLowering("lean.section.exit", (decl) => {
      const { name } = decl.payload as SectionPayload;
      return name ? `end ${name}` : "end";
    });
    registry.registerLeanDeclarationLowering("lean.namespace.enter", (decl) => {
      const { name } = decl.payload as NamespacePayload;
      return `namespace ${name}`;
    });
    registry.registerLeanDeclarationLowering("lean.namespace.exit", (decl) => {
      const { name } = decl.payload as NamespacePayload;
      return `end ${name}`;
    });
    registry.registerLeanDeclarationLowering("lean.open.scoped", (decl) => {
      const { names } = decl.payload as OpenScopedPayload;
      return `open scoped ${names.join(" ")}`;
    });
    registry.registerLeanDeclarationLowering("lean.open.namespace", (decl) => {
      const payload = decl.payload as OpenNamespacePayload;
      return `open ${payload.name}${payload.only?.length ? ` (${payload.only.join(" ")})` : payload.hiding?.length ? ` hiding ${payload.hiding.join(" ")}` : ""}`;
    });
    registry.registerLeanDeclarationLowering("lean.open.namespace.in", (decl) => {
      const payload = decl.payload as OpenNamespacePayload;
      return `open ${payload.name}${payload.only?.length ? ` (${payload.only.join(" ")})` : payload.hiding?.length ? ` hiding ${payload.hiding.join(" ")}` : ""} in`;
    });
    registry.registerLeanDeclarationLowering("lean.open.scoped.in", (decl) => {
      const { names } = decl.payload as OpenScopedPayload;
      return `open scoped ${names.join(" ")} in`;
    });
    registry.registerLeanDeclarationLowering("lean.open.in.exit", () => "");
    registry.registerLeanDeclarationLowering("lean.export", (decl) => {
      const payload = decl.payload as ExportPayload;
      return `export ${payload.name} (${payload.members.join(" ")})`;
    });
    registry.registerLeanDeclarationLowering("lean.variable", (decl, context) => {
      const payload = decl.payload as NormalizedVariablePayload;
      const render = (param: import("../../core/model.js").IRParam) => {
        const type = context.emitType(param.type);
        switch (param.binderInfo) {
          case "explicit": return `(${param.name} : ${type})`;
          case "implicit": return `{${param.name} : ${type}}`;
          case "strictImplicit": return `⦃${param.name} : ${type}⦄`;
          case "instance": return `[${param.name} : ${type}]`;
        }
      };
      return `variable ${payload.params.map(render).join(" ")}`;
    });
    registry.registerLeanDeclarationLowering("lean.include", (decl) => `include ${(decl.payload as VariablePolicyPayload).names.join(" ")}`);
    registry.registerLeanDeclarationLowering("lean.omit", (decl) => `omit ${(decl.payload as VariablePolicyPayload).names.join(" ")}`);
    registry.registerLeanDeclarationLowering("lean.attribute.command", (decl) => {
      const payload = decl.payload as AttributeCommandPayload;
      const attrs = payload.attributes.map((attribute) => `${attribute.remove ? "-" : ""}${attribute.name}${attribute.name === "default_instance" && attribute.priority !== undefined ? ` ${attribute.priority}` : ""}`).join(", ");
      return `attribute [${attrs}] ${payload.targets.join(" ")}`;
    });
  },
};

export default plugin;
