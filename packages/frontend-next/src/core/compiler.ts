import { ProofScriptError } from "./errors.js";
import { readFile } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import { Elaborator } from "./elaborator.js";
import type { EmitContext, IRAnnotation, IRExpr, IRExtensionDecl, IRProgram, IRType, IRTypeArgument, OperationDomain, VerificationReport, ProofScriptModuleInterface, ModuleImportDescriptor } from "./model.js";
import { Parser } from "./parser.js";
import { Registry } from "./registry.js";
import { lex } from "./lexer.js";

export interface CheckResult { readonly program: IRProgram; }
export interface CompilationResult extends CheckResult { readonly targetSource: string; readonly target: string; }

export interface CheckedProjectModule {
  readonly module: string;
  readonly path: string;
  readonly source: string;
  readonly program: IRProgram;
  readonly registry: Registry;
  readonly interface: ProofScriptModuleInterface;
  readonly privateInterface: ProofScriptModuleInterface;
  readonly imports: readonly ModuleImportDescriptor[];
  readonly leanSource: string;
  readonly leanResources: ReadonlyMap<string, string>;
}

export interface ProjectCheckResult {
  readonly entry: CheckedProjectModule;
  readonly modules: readonly CheckedProjectModule[];
  readonly reusedModules?: readonly string[];
}

export interface ReusableProjectModuleData {
  readonly program: IRProgram;
  readonly interface: ProofScriptModuleInterface;
  readonly privateInterface: ProofScriptModuleInterface;
  readonly imports: readonly ModuleImportDescriptor[];
  readonly leanSource: string;
}

export interface ProjectModuleReuseContext {
  readonly module: string;
  readonly path: string;
  readonly source: string;
  readonly imports: readonly ModuleImportDescriptor[];
  readonly dependencies: ReadonlyMap<string, CheckedProjectModule>;
}

export interface ProjectCheckOptions {
  readonly reuseModule?: (context: ProjectModuleReuseContext) => Promise<ReusableProjectModuleData | undefined>;
}

interface ScannedImport extends ModuleImportDescriptor { readonly meta: boolean; readonly all: boolean; }

export function checkSource(source: string, registry: Registry): CheckResult {
  const parser = new Parser(source, registry);
  const elaborator = new Elaborator(registry);
  const declarations: IRProgram["declarations"][number][] = [];
  while (true) {
    const declaration = parser.parseNextDeclaration();
    if (!declaration) break;
    declarations.push(elaborator.elaborateCommand(declaration));
  }
  return { program: { declarations } };
}

export function compileSource(source: string, registry: Registry, targetId: string): CompilationResult {
  const { program } = checkSource(source, registry);
  return compileProgram(program, registry, targetId);
}

export function compileProgram(program: IRProgram, registry: Registry, targetId: string): CompilationResult {
  const target = registry.getTarget(targetId);
  validateCapabilities(program, registry, targetId, target.capabilities);
  const context = makeEmitContext(registry, targetId);
  return { program, targetSource: target.emitProgram(program, context), target: targetId };
}

export async function checkProject(projectDir: string, entryRelativePath: string, baseRegistry: Registry, options: ProjectCheckOptions = {}): Promise<ProjectCheckResult> {
  const root = resolve(projectDir);
  const entryPath = resolve(root, entryRelativePath);
  const entryRel = relative(root, entryPath);
  if (entryRel.startsWith("..") || entryRel.startsWith(sep) || entryRel === "..") throw new ProofScriptError("PS7001", "Project entry escapes the project directory.");
  const cache = new Map<string, CheckedProjectModule>();
  const reusedModules = new Set<string>();
  const active: string[] = [];

  const compileModule = async (moduleName: string, path: string): Promise<CheckedProjectModule> => {
    const cached = cache.get(moduleName);
    if (cached) return cached;
    const cycleIndex = active.indexOf(moduleName);
    if (cycleIndex >= 0) throw new ProofScriptError("PS7002", `Module import cycle detected: ${[...active.slice(cycleIndex), moduleName].join(" -> ")}.`);
    active.push(moduleName);
    let source: string;
    try { source = await readFile(path, "utf8"); }
    catch { active.pop(); throw new ProofScriptError("PS7003", `Cannot read ProofScript module '${moduleName}' at '${path}'.`); }
    const scanned = scanModuleImports(source);
    const dependencies = new Map<string, CheckedProjectModule>();
    for (const item of scanned) {
      const dependencyPath = modulePath(root, item.module);
      const dependency = await compileModule(item.module, dependencyPath);
      dependencies.set(item.module, dependency);
    }

    const expectedImports: ModuleImportDescriptor[] = scanned.map(({ module, public: isPublic, meta, all }) => ({ module, public: isPublic, ...(meta ? { meta: true } : {}), ...(all ? { all: true } : {}) }));
    const reused = await options.reuseModule?.({ module: moduleName, path, source, imports: expectedImports, dependencies });
    if (reused) {
      const registry = baseRegistry.fork();
      const leanResources = new Map<string, string>();
      for (const dependency of dependencies.values()) {
        for (const [resourceName, resourceSource] of dependency.leanResources) leanResources.set(resourceName, resourceSource);
        leanResources.set(`ProofScriptGenerated.${dependency.module}`, dependency.leanSource);
      }
      for (const [resourceName, resourceSource] of leanResources) registry.registerLeanModule(resourceName, resourceSource, { autoImport: false });
      const result: CheckedProjectModule = {
        module: moduleName, path, source, program: reused.program, registry, interface: reused.interface, privateInterface: reused.privateInterface,
        imports: reused.imports, leanSource: reused.leanSource, leanResources,
      };
      cache.set(moduleName, result);
      reusedModules.add(moduleName);
      active.pop();
      return result;
    }

    const registry = baseRegistry.fork();
    const available = new Map<string, ProofScriptModuleInterface>();
    const availablePrivate = new Map<string, ProofScriptModuleInterface>();
    for (const [name, dependency] of dependencies) { available.set(name, dependency.interface); availablePrivate.set(name, dependency.privateInterface); }
    const parser = new Parser(source, registry);
    const elaborator = new Elaborator(registry, { moduleName, availableModules: available, availablePrivateModules: availablePrivate });
    const declarations: IRProgram["declarations"][number][] = [];
    while (true) {
      const declaration = parser.parseNextDeclaration();
      if (!declaration) break;
      declarations.push(elaborator.elaborateCommand(declaration));
    }
    const program: IRProgram = { declarations };
    const actualImports = elaborator.getModuleImports();
    if (JSON.stringify(actualImports) !== JSON.stringify(expectedImports)) {
      active.pop();
      throw new ProofScriptError("PS7004", `Module import scan/elaboration mismatch in '${moduleName}'.`);
    }

    // Materialize dependency modules without auto-importing them. The exact
    // ordinary/public import commands in this module's IR control header imports.
    const leanResources = new Map<string, string>();
    for (const dependency of dependencies.values()) {
      for (const [resourceName, resourceSource] of dependency.leanResources) leanResources.set(resourceName, resourceSource);
      const resourceName = `ProofScriptGenerated.${dependency.module}`;
      leanResources.set(resourceName, dependency.leanSource);
    }
    for (const [resourceName, resourceSource] of leanResources) {
      if (!registry.getLeanModules().some((item) => item.module === resourceName)) registry.registerLeanModule(resourceName, resourceSource, { autoImport: false });
    }
    const leanSource = emitLean(program, registry);
    const iface = elaborator.exportModuleInterface(moduleName, "public");
    const privateInterface = elaborator.exportModuleInterface(moduleName, "private");
    const result: CheckedProjectModule = { module: moduleName, path, source, program, registry, interface: iface, privateInterface, imports: actualImports, leanSource, leanResources };
    cache.set(moduleName, result);
    active.pop();
    return result;
  };

  const entryModuleName = moduleNameFromPath(root, entryPath);
  const entry = await compileModule(entryModuleName, entryPath);
  return { entry, modules: [...cache.values()], ...(reusedModules.size ? { reusedModules: [...reusedModules] } : {}) };
}

export function moduleNameFromPath(projectDir: string, filePath: string): string {
  const rel = relative(resolve(projectDir), resolve(filePath));
  if (rel.startsWith("..") || rel.startsWith(sep)) throw new ProofScriptError("PS7005", `Module path '${filePath}' is outside project '${projectDir}'.`);
  if (!rel.endsWith(".ps")) throw new ProofScriptError("PS7006", `ProofScript module '${rel}' must use the .ps extension.`);
  return rel.slice(0, -3).split(sep).join(".");
}

function modulePath(projectDir: string, moduleName: string): string {
  if (!moduleName.split(".").every((part) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(part))) throw new ProofScriptError("PS7007", `Invalid ProofScript module name '${moduleName}'.`);
  return join(projectDir, ...moduleName.split(".")) + ".ps";
}

function scanModuleImports(source: string): readonly ScannedImport[] {
  const tokens = lex(source);
  let index = 0;
  const text = () => tokens[index]?.text ?? "<eof>";
  const consume = (expected?: string): string => {
    const token = tokens[index];
    if (!token) throw new ProofScriptError("PS7008", "Unexpected end of source while scanning module imports.");
    if (expected !== undefined && token.text !== expected) throw new ProofScriptError("PS7009", `Expected '${expected}' in module header, found '${token.text}'.`);
    index += 1; return token.text;
  };
  const qualified = (): string => {
    const first = tokens[index];
    if (!first || first.kind !== "identifier") throw new ProofScriptError("PS7010", "Expected module identifier after import.");
    let name = consume();
    while (text() === ".") { consume("."); name += `.${consume()}`; }
    return name;
  };
  if (text() === "module") { consume("module"); consume(";"); }
  const result: ScannedImport[] = [];
  while (true) {
    const start = index;
    let isPublic = false;
    let meta = false;
    if (text() === "public") { consume("public"); isPublic = true; }
    if (text() === "meta") { consume("meta"); meta = true; }
    if (text() !== "import") { index = start; break; }
    consume("import");
    const all = text() === "all";
    if (all) consume("all");
    const module = qualified();
    consume(";");
    result.push({ module, public: isPublic, meta, all });
  }
  return result;
}

export function validateProgramForTarget(program: IRProgram, registry: Registry, targetId: string): void {
  const target = registry.getTarget(targetId);
  validateCapabilities(program, registry, targetId, target.capabilities);
}

export function emitLean(program: IRProgram, registry: Registry): string { return registry.getLeanEngine().emitProgram(program, registry); }

export async function materializeLean(program: IRProgram, registry: Registry, cwd: string, options?: import("./model.js").LeanMaterializeOptions) {
  const engine = registry.getLeanEngine();
  const leanSource = engine.emitProgram(program, registry);
  const materialization = await engine.materialize(leanSource, cwd, registry, options);
  return { leanSource, ...materialization };
}

export async function verifyWithLean(program: IRProgram, registry: Registry, cwd: string): Promise<{ readonly leanSource: string; readonly report: VerificationReport }> {
  const engine = registry.getLeanEngine();
  const leanSource = engine.emitProgram(program, registry);
  const result = await engine.check(leanSource, cwd, registry);
  const operations = [...collectOperations(program, registry)];
  const base = {
    engine: engine.id,
    status: result.status,
    semanticFeatures: operations.map((operation) => {
      const descriptor = registry.getOperation(operation).verification;
      const feature = { operation, level: descriptor.level } as const;
      return descriptor.notes === undefined ? feature : { ...feature, notes: descriptor.notes };
    }),
    stdout: result.stdout,
    stderr: result.stderr,
  };
  return {
    leanSource,
    report: {
      ...base,
      ...(result.checker === undefined ? {} : { checker: result.checker }),
      ...(result.workspace === undefined ? {} : { workspace: result.workspace }),
      ...(result.modules === undefined ? {} : { modules: result.modules }),
    },
  };
}

function makeEmitContext(registry: Registry, targetId: string): EmitContext {
  const context: EmitContext = {
    registry,
    emitExpr(expr: IRExpr): string {
      switch (expr.kind) {
        case "var": return expr.name;
        case "type": return context.emitType(expr.value);
        case "call": return `${expr.callee}(${expr.args.filter((_, index) => !(expr.erasedArgs?.[index] ?? false)).map((arg) => context.emitExpr(arg)).join(", ")})`;
        case "apply": return `${context.emitExpr(expr.callee)}(${expr.args.map((arg) => context.emitExpr(arg)).join(", ")})`;
        case "lambda": {
          const unsupported = expr.params.find((param) => param.isTypeParam || param.binderInfo !== "explicit" || param.isProofParam);
          if (unsupported) throw new ProofScriptError("PS3005", `Target '${targetId}' does not yet lower ${unsupported.binderInfo}${unsupported.isTypeParam ? " Type-valued" : ""} lambda binder '${unsupported.name}'.`);
          const params = expr.params.map((param) => `${param.name}: ${context.emitType(param.type)}`).join(", ");
          return `((${params}) => ${context.emitExpr(expr.body)})`;
        }
        case "quantifier": throw new ProofScriptError("PS3006", `Target '${targetId}' does not lower proof quantifiers as runtime expressions.`);
        case "literal":
        case "op":
        case "extension": return registry.getTargetExprLowering(targetId, expr.op)(expr, context);
      }
    },
    emitType(type: IRType): string {
      return registry.getTargetTypeLowering(targetId, type)(type, {
        emitType: (nested) => context.emitType(nested),
        emitExpr: (expr) => context.emitExpr(expr),
        emitTypeArgument: (argument) => context.emitTypeArgument(argument),
      });
    },
    emitTypeArgument(argument: IRTypeArgument): string {
      return argument.kind === "type" ? context.emitType(argument.value) : context.emitExpr(argument.value);
    },
    emitDeclaration(declaration: IRExtensionDecl): string {
      return registry.getTargetDeclarationLowering(targetId, declaration.op)(declaration, context);
    },
  };
  return context;
}

function validateCapabilities(program: IRProgram, registry: Registry, targetId: string, provided: ReadonlySet<string>): void {
  for (const declaration of program.declarations) {
    if (declaration.modifiers && (declaration.modifiers.visibility || declaration.modifiers.protected || declaration.modifiers.meta || declaration.modifiers.expose)) {
      throw new ProofScriptError("PS3107", `Target '${targetId}' does not yet define a correspondence for Lean declaration accessibility modifiers or module-phase modifiers.`);
    }
  }
  for (const operationId of collectOperations(program, registry, "runtime")) {
    const operation = registry.getOperation(operationId);
    for (const required of operation.requiredCapabilities) {
      if (!provided.has(required)) throw new ProofScriptError("PS3101", `Target '${targetId}' cannot compile operation '${operationId}': missing capability '${required}'.`);
    }
  }
}

export function collectOperations(program: IRProgram, registry?: Registry, domain?: OperationDomain): Set<string> {
  const result = new Set<string>();
  const include = (operation: string): boolean => domain === undefined || registry === undefined || registry.getOperation(operation).domain === domain;
  const visitExpr = (expr: IRExpr): void => {
    if ((expr.kind === "literal" || expr.kind === "op" || expr.kind === "extension") && include(expr.op)) result.add(expr.op);
    if (expr.kind === "extension" && expr.op === "core.local.letRec") {
      const termination = (expr.payload as { readonly termination?: { readonly kind?: string } }).termination;
      if (termination?.kind === "wellFounded" && include("core.recursion.wellFounded")) result.add("core.recursion.wellFounded");
    }
    if (expr.kind === "apply") { visitExpr(expr.callee); for (const arg of expr.args) visitExpr(arg); }
    if (expr.kind === "lambda" || expr.kind === "quantifier") visitExpr(expr.body);
    if (expr.kind === "call" || expr.kind === "op" || expr.kind === "extension") for (const arg of expr.args) visitExpr(arg);
  };
  const visitAnnotation = (annotation: IRAnnotation): void => {
    if (include(annotation.op)) result.add(annotation.op);
    for (const arg of annotation.args) visitExpr(arg);
  };
  for (const declaration of program.declarations) {
    if (declaration.kind === "extension") {
      if (include(declaration.op)) result.add(declaration.op);
      for (const arg of declaration.args ?? []) visitExpr(arg);
      continue;
    }
    const defs = declaration.kind === "mutual" ? declaration.members : [declaration];
    if (declaration.kind === "mutual" && include("core.recursion.mutual")) result.add("core.recursion.mutual");
    for (const def of defs) {
      if (def.sourceForm === "equations" && include("core.definition.equations")) result.add("core.definition.equations");
      if (def.termination?.kind === "structural" && include("core.recursion.structural")) result.add("core.recursion.structural");
      if (def.termination?.kind === "wellFounded" && include("core.recursion.wellFounded")) result.add("core.recursion.wellFounded");
      visitExpr(def.body);
      for (const annotation of def.annotations ?? []) visitAnnotation(annotation);
    }
  }
  return result;
}
