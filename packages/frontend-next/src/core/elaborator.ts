import { ProofScriptError } from "./errors.js";
import type { DeclarationElaborationContext, IntrinsicSpec } from "./plugin-api.js";
import type {
  FunctionSignature,
  ClassDescriptor,
  InstanceCandidate,
  IRAnnotation,
  IRExpr,
  IRParam,
  IRProgram,
  IRType,
  SurfaceClause,
  SurfaceDecl,
  SurfaceExpr,
  SurfaceProgram,
  SurfaceParam,
  SurfaceTypeExpr,
  IRTypeArgument,
  IRUniverseLevel,
  SurfaceUniverseLevel,
  IRDeclarationModifiers,
  IRDeclarationAttribute,
  IRDeclaration,
  ProofScriptModuleInterface,
  TypeFamilyResolver,
  ModulePhase,
} from "./model.js";
import { containsTypeVariable, isSortType, makePiType, makeSortType, makeTypeTerm, makeTypeVariable, sameType, substituteExpr, substituteType, substituteUniversesInExpr, substituteUniversesInType, exprKey, termArgument, typeArgument, typeKey, typeVariableName, unifyTypePattern } from "./type-utils.js";
import { Registry } from "./registry.js";

export interface ElaboratorOptions {
  readonly moduleName?: string;
  readonly availableModules?: ReadonlyMap<string, ProofScriptModuleInterface>;
  readonly availablePrivateModules?: ReadonlyMap<string, ProofScriptModuleInterface>;
}

interface InstanceSearchResult {
  readonly expr: IRExpr;
  readonly inferredTypes: ReadonlyMap<string, IRType>;
  /** Term-valued output metavariables (for example CoeFun's γ : α → Sort v). */
  readonly inferredValues: ReadonlyMap<string, IRExpr>;
}

interface InstanceSearchSession {
  readonly active: Set<string>;
  readonly stack: string[];
  readonly table: Map<string, InstanceSearchResult>;
}

type TransparencyMode = "none" | "reducible" | "instances" | "implicit" | "default" | "all";
const TRANSPARENCY_RANK: Readonly<Record<TransparencyMode, number>> = { none: 0, reducible: 1, instances: 2, implicit: 3, default: 4, all: 5 };

function typeVariablesIn(type: IRType, result = new Set<string>()): Set<string> {
  const variable = typeVariableName(type);
  if (variable) { result.add(variable); return result; }
  for (const arg of type.args ?? []) if (arg.kind === "type") typeVariablesIn(arg.value, result);
  if (type.domain) typeVariablesIn(type.domain, result);
  if (type.codomain) typeVariablesIn(type.codomain, result);
  if (type.binder) typeVariablesIn(type.binder.type, result);
  if (type.typeVarSort) typeVariablesIn(type.typeVarSort, result);
  return result;
}

function valueVariablesInExpr(expr: IRExpr, result = new Set<string>()): Set<string> {
  switch (expr.kind) {
    case "var": result.add(expr.name); break;
    case "literal": case "type": break;
    case "call": for (const arg of expr.args) valueVariablesInExpr(arg, result); break;
    case "apply": valueVariablesInExpr(expr.callee, result); for (const arg of expr.args) valueVariablesInExpr(arg, result); break;
    case "lambda": case "quantifier": {
      const nested = new Set(result);
      valueVariablesInExpr(expr.body, nested);
      for (const param of expr.params) nested.delete(param.name);
      for (const name of nested) result.add(name);
      break;
    }
    case "op": case "extension": for (const arg of expr.args) valueVariablesInExpr(arg, result); break;
  }
  return result;
}

function valueVariablesInType(type: IRType, result = new Set<string>()): Set<string> {
  for (const arg of type.args ?? []) {
    if (arg.kind === "type") valueVariablesInType(arg.value, result);
    else valueVariablesInExpr(arg.value, result);
  }
  if (type.term) valueVariablesInExpr(type.term, result);
  if (type.domain) valueVariablesInType(type.domain, result);
  if (type.codomain) valueVariablesInType(type.codomain, result);
  return result;
}

export class Elaborator implements DeclarationElaborationContext {
  private readonly functions = new Map<string, FunctionSignature>();
  private readonly namespacedFunctions = new Set<string>();
  private readonly elaborationInfo = new Map<string, unknown>();
  private locals: ReadonlyMap<string, IRType> = new Map();
  private typeLocals: ReadonlyMap<string, IRType> = new Map();
  private instanceLocals: ReadonlyMap<string, IRType> = new Map();
  private readonly universes = new Set<string>();
  private readonly classes = new Map<string, ClassDescriptor>();
  private readonly instances: InstanceCandidate[] = [];
  private instanceOrder = 0;
  private readonly sectionInstanceUsageStack: Set<string>[] = [];
  private sectionCounter = 0;
  private readonly sectionStack: {
    readonly id: number;
    readonly name?: string;
    readonly openScopesBefore: ReadonlySet<string>;
    readonly openNamespacesBefore: readonly { readonly name: string; readonly only?: ReadonlySet<string>; readonly hiding?: ReadonlySet<string> }[];
    readonly sectionVariablesBefore: readonly IRParam[];
    readonly sectionVariablePoliciesBefore: ReadonlyMap<string, "include" | "omit">;
    readonly defaultVisibilityBefore: "public" | "private" | undefined;
    readonly metaPhaseBefore: boolean;
    readonly exposeBefore: boolean;
  }[] = [];
  private openScopedEnvironments = new Set<string>();
  private openNamespaces: { readonly name: string; readonly only?: ReadonlySet<string>; readonly hiding?: ReadonlySet<string> }[] = [];
  private readonly knownNamespaces = new Set<string>();
  private readonly nameAliases = new Map<string, string>();
  private readonly declarationAccess = new Map<string, { readonly visibility: "public" | "private"; readonly protected: boolean; readonly exposed: boolean }>();
  /** Semantic-name availability by execution phase. Builtins/untracked names
   * are available in both phases; user/project names are recorded explicitly. */
  private readonly namePhaseAvailability = new Map<string, Set<ModulePhase>>();
  private activeDeclarationModifiers: IRDeclarationModifiers | undefined;
  private sectionDefaultVisibility: "public" | "private" | undefined;
  private sectionMetaPhase = false;
  private sectionExpose = false;
  private sectionVariables: IRParam[] = [];
  private sectionVariablePolicies = new Map<string, "include" | "omit">();
  private readonly sectionTypeLocals = new Map<string, IRType>();
  private readonly sectionValueLocals = new Map<string, IRType>();
  private readonly namespaceStack: {
    readonly name: string;
    readonly openScopesBefore: ReadonlySet<string>;
    readonly openNamespacesBefore: readonly { readonly name: string; readonly only?: ReadonlySet<string>; readonly hiding?: ReadonlySet<string> }[];
  }[] = [];
  private readonly oneCommandEnvironmentStack: {
    readonly openScopesBefore: ReadonlySet<string>;
    readonly openNamespacesBefore: readonly { readonly name: string; readonly only?: ReadonlySet<string>; readonly hiding?: ReadonlySet<string> }[];
  }[] = [];

  private readonly moduleName: string | undefined;
  private readonly availableModules: ReadonlyMap<string, ProofScriptModuleInterface>;
  private readonly availablePrivateModules: ReadonlyMap<string, ProofScriptModuleInterface>;
  private readonly importedModules = new Map<string, {
    readonly publicIface: ProofScriptModuleInterface;
    readonly privateIface: ProofScriptModuleInterface;
    ordinary: boolean;
    meta: boolean;
    allOrdinary: boolean;
    allMeta: boolean;
    publicOrdinary: boolean;
    publicMeta: boolean;
  }>();
  private readonly moduleImportCommands: import("./model.js").ModuleImportDescriptor[] = [];
  private moduleHeaderRegionOpen = true;
  private moduleHeaderSeen = false;
  private importSeen = false;
  private readonly ownFunctions = new Set<string>();
  private readonly ownDefinitionBodies = new Map<string, IRExpr>();
  /** Definition bodies available for transparency-aware elaboration. Imported
   * bodies appear here only when the module interface exposes them. */
  private readonly definitionBodies = new Map<string, IRExpr>();
  private readonly declarationAttributes = new Map<string, Map<string, IRDeclarationAttribute>>();
  private readonly ownTypes = new Map<string, IRType>();
  private readonly ownTypeFamilies = new Map<string, TypeFamilyResolver>();
  private readonly ownClasses = new Set<string>();
  private readonly ownInstances = new Set<string>();
  private readonly ownNamespaces = new Set<string>();
  private readonly ownAliases = new Map<string, string>();
  private readonly ownSemanticInfo = new Map<string, unknown>();
  private readonly declarationOrigins = new Map<string, string>();

  constructor(private readonly registry: Registry, options: ElaboratorOptions = {}) {
    this.moduleName = options.moduleName;
    this.availableModules = options.availableModules ?? new Map();
    this.availablePrivateModules = options.availablePrivateModules ?? new Map();
    // Plugin-contributed Lean/prelude environment seeds are additive. They are
    // not user declarations and are never serialized as project-owned classes
    // or instances.
    for (const descriptor of registry.getBuiltinClasses()) this.classes.set(descriptor.name, descriptor);
    for (const candidate of registry.getBuiltinInstances()) this.instances.push({ ...candidate, declarationOrder: ++this.instanceOrder });
    for (const [name, signature] of registry.getBuiltinFunctions()) this.functions.set(name, signature);
  }

  elaborate(program: SurfaceProgram): IRProgram {
    return { declarations: program.declarations.map((declaration) => this.elaborateCommand(declaration)) };
  }

  /** Declare and elaborate one source command before the next command is parsed. */
  elaborateCommand(declaration: SurfaceDecl): IRProgram["declarations"][number] {
    const rule = this.registry.declarationElaborators.get(declaration.kind);
    if (!rule) throw new ProofScriptError("PS2101", `No elaborator installed for declaration kind '${declaration.kind}'.`);
    const isModuleHeader = declaration.kind === "lean.module.header";
    const isImport = declaration.kind === "lean.import";
    if (isModuleHeader) {
      if (!this.moduleHeaderRegionOpen || this.importSeen || this.moduleHeaderSeen) throw new ProofScriptError("PS2190", "'module;' must appear at most once and before imports/declarations.");
      this.moduleHeaderSeen = true;
    } else if (isImport) {
      if (!this.moduleHeaderRegionOpen) throw new ProofScriptError("PS2191", "Imports must appear in the module header/import region before ordinary declarations.");
      this.importSeen = true;
    } else {
      this.moduleHeaderRegionOpen = false;
    }
    const accepted = new Set(rule.acceptedPrefixOwners ?? []);
    const declarationKinds = new Set(["core.def", "lean.theorem", "lean.abbrev", "lean.opaque", "lean.axiom", "lean.example", "lean.inductive", "lean.structure", "lean.class", "lean.instance"]);
    const visibilityKinds = new Set([...declarationKinds, "lean.section.enter", "lean.import"]);
    const protectedKinds = new Set(["core.def", "lean.theorem", "lean.abbrev", "lean.opaque", "lean.axiom", "lean.inductive", "lean.structure", "lean.class"]);
    const metaKinds = new Set([...declarationKinds, "lean.section.enter", "lean.import"]);
    const exposeKinds = new Set(["core.def", "lean.section.enter"]);
    for (const prefix of declaration.prefixes ?? []) {
      const generic =
        (prefix.owner === "lean.declaration.visibility" && visibilityKinds.has(declaration.kind)) ||
        (prefix.owner === "lean.declaration.protected" && protectedKinds.has(declaration.kind)) ||
        (prefix.owner === "lean.declaration.meta" && metaKinds.has(declaration.kind)) ||
        (prefix.owner === "lean.declaration.expose" && exposeKinds.has(declaration.kind)) ||
        (prefix.owner === "lean.declaration.attributes" && declarationKinds.has(declaration.kind));
      if (!accepted.has(prefix.owner) && !generic) {
        throw new ProofScriptError("PS2162", `Declaration '${declaration.kind}' does not support prefix '${prefix.owner}' in this implementation slice.`);
      }
    }
    const visibilityPrefixes = (declaration.prefixes ?? []).filter((prefix) => prefix.owner === "lean.declaration.visibility");
    if (visibilityPrefixes.length > 1) throw new ProofScriptError("PS2180", "A declaration cannot specify both private and public visibility.");
    const protectedPrefixes = (declaration.prefixes ?? []).filter((prefix) => prefix.owner === "lean.declaration.protected");
    if (protectedPrefixes.length > 1) throw new ProofScriptError("PS2184", "A declaration cannot repeat the protected modifier.");
    const metaPrefixes = (declaration.prefixes ?? []).filter((prefix) => prefix.owner === "lean.declaration.meta");
    if (metaPrefixes.length > 1) throw new ProofScriptError("PS2201", "A declaration cannot repeat the meta modifier.");
    const exposePrefixes = (declaration.prefixes ?? []).filter((prefix) => prefix.owner === "lean.declaration.expose");
    if (exposePrefixes.length > 1) throw new ProofScriptError("PS2202", "A declaration cannot repeat @[expose].");
    const declarationAttributePrefixes = (declaration.prefixes ?? []).filter((prefix) => prefix.owner === "lean.declaration.attributes");
    const declarationAttributes: IRDeclarationAttribute[] = declarationAttributePrefixes.flatMap((prefix) =>
      ((prefix.payload as { readonly attributes?: readonly IRDeclarationAttribute[] }).attributes ?? []).map((attribute) => ({ ...attribute })),
    );
    const duplicateAttribute = declarationAttributes.find((attribute, index) => declarationAttributes.findIndex((other) => other.name === attribute.name) !== index);
    if (duplicateAttribute) throw new ProofScriptError("PS2205", `Declaration attribute '@[${duplicateAttribute.name}]' is repeated.`);
    const prefixOwners = (declaration.prefixes ?? []).map((prefix) => prefix.owner);
    const protectedIndex = prefixOwners.indexOf("lean.declaration.protected");
    const visibilityIndex = prefixOwners.indexOf("lean.declaration.visibility");
    const metaIndex = prefixOwners.indexOf("lean.declaration.meta");
    const exposeIndex = prefixOwners.indexOf("lean.declaration.expose");
    if (protectedIndex >= 0 && visibilityIndex >= 0 && protectedIndex < visibilityIndex) {
      throw new ProofScriptError("PS2185", "Lean declaration modifier order requires private/public before protected.");
    }
    if (metaIndex >= 0 && visibilityIndex >= 0 && metaIndex < visibilityIndex) {
      throw new ProofScriptError("PS2203", "Lean declaration modifier order requires private/public before meta.");
    }
    if (exposeIndex >= 0 && visibilityIndex >= 0 && exposeIndex > visibilityIndex) {
      throw new ProofScriptError("PS2204", "Lean declaration modifier order requires attributes such as @[expose] before visibility modifiers.");
    }
    const visibility = visibilityPrefixes.length === 0 ? undefined : ((visibilityPrefixes[0]!.payload as { visibility: "private" | "public" }).visibility);
    const isProtected = protectedPrefixes.length > 0;
    const isMeta = metaPrefixes.length > 0;
    const isExpose = exposePrefixes.length > 0 || declarationAttributes.some((attribute) => attribute.name === "expose");
    if (isImport && visibility === "private") throw new ProofScriptError("PS2192", "'private import' is not a Lean import form; use ordinary or public import.");
    const semanticAttributes = declarationAttributes.filter((attribute) => attribute.name !== "expose");
    const modifiers: IRDeclarationModifiers | undefined = isImport ? undefined : (visibility || isProtected || isMeta || isExpose || semanticAttributes.length > 0 ? {
      ...(semanticAttributes.length ? { attributes: semanticAttributes } : {}),
      ...(visibility ? { visibility } : {}),
      ...(isProtected ? { protected: true } : {}),
      ...(isMeta ? { meta: true } : {}),
      ...(isExpose ? { expose: true } : {}),
    } : undefined);
    if (isProtected && !this.currentNamespaceName()) {
      throw new ProofScriptError("PS2186", "The protected modifier requires an active namespace in the v0.20 accessibility slice.");
    }
    // v0.15 migrates the principal declaration families into the same
    // qualified-name environment. Plugins that have not been migrated remain
    // fail-closed here rather than leaking unqualified semantic identities.
    if (this.namespaceStack.length > 0 &&
        !["core.def", "core.mutual.defs", "lean.theorem", "lean.abbrev", "lean.opaque", "lean.axiom", "lean.example", "lean.inductive", "lean.structure", "lean.class", "lean.instance", "lean.namespace.enter", "lean.namespace.exit", "lean.open.scoped", "lean.open.namespace", "lean.open.scoped.in", "lean.open.namespace.in", "lean.open.in.exit", "lean.export", "lean.section.enter", "lean.section.exit", "lean.variable", "lean.include", "lean.omit", "lean.attribute.command", "lean.module.header", "lean.import"].includes(declaration.kind)) {
      throw new ProofScriptError("PS2165", `Declaration '${declaration.kind}' inside namespace '${this.currentNamespaceName()}' is not implemented by the v0.15 qualified-name slice.`);
    }
    const previousModifiers = this.activeDeclarationModifiers;
    this.activeDeclarationModifiers = modifiers;
    try {
      rule.declare(declaration, this);
      const elaborated = rule.elaborate(declaration, this);
      const semanticName = this.semanticNameOfDeclaration(elaborated);
      if (semanticName) {
        this.recordDeclarationAccess(semanticName);
        for (const attribute of semanticAttributes) this.setDeclarationAttribute(semanticName, attribute);
        if (declaration.kind === "lean.instance") this.setDeclarationAttribute(semanticName, { name: "instance_reducible" });
        if (declaration.kind === "lean.abbrev") this.setDeclarationAttribute(semanticName, { name: "reducible" });
      }
      const normalized = modifiers ? ({ ...elaborated, modifiers } as IRDeclaration) : elaborated;
      if (normalized.kind === "def") {
        this.ownDefinitionBodies.set(normalized.semanticName ?? normalized.name, normalized.body);
        this.definitionBodies.set(normalized.semanticName ?? normalized.name, normalized.body);
        this.validatePublicSignature(normalized);
      } else if (normalized.kind === "mutual") {
        for (const member of normalized.members) {
          const memberName = member.semanticName ?? member.name;
          this.recordDeclarationAccess(memberName);
          this.ownDefinitionBodies.set(memberName, member.body);
          this.definitionBodies.set(memberName, member.body);
          this.validatePublicSignature(member);
        }
      } else {
        this.validatePublicSignature(normalized);
      }
      return normalized;
    } finally {
      this.activeDeclarationModifiers = previousModifiers;
    }
  }

  resolveType(name: string): IRType {
    const locals = new Map(this.sectionTypeLocals);
    for (const [key, value] of this.typeLocals) locals.set(key, value);
    const local = locals.get(name);
    if (local) return local;
    const resolved = this.resolveNamespaceName(name, (candidate) => this.registry.findType(candidate) !== undefined && this.isNameAvailableInCurrentPhase(candidate), "type");
    if (resolved) return this.registry.findType(resolved)!;
    const abbrev = this.resolveNamespaceName(name, (candidate) => this.registry.getSemanticInfo<IRType>(`type.abbrev:${candidate}`) !== undefined && this.isNameAvailableInCurrentPhase(candidate), "type abbreviation");
    if (abbrev) return this.registry.getSemanticInfo<IRType>(`type.abbrev:${abbrev}`)!;
    return this.registry.resolveType(name, locals);
  }

  resolveTypeExpression(surface: SurfaceTypeExpr): IRType {
    switch (surface.kind) {
      case "arrow": {
        const domain = this.resolveTypeExpression(surface.domain);
        const codomain = this.resolveTypeExpression(surface.codomain);
        return makePiType(undefined, domain, codomain);
      }
      case "pi": {
        const typeLocals = new Map(this.typeLocals);
        const valueLocals = new Map(this.locals);
        const params: IRParam[] = [];
        for (const surfaceParam of surface.params) {
          const type = this.withTypeLocals(typeLocals, () => this.withLocals(valueLocals, () => this.resolveTypeExpression(surfaceParam.type)));
          const isTypeParam = isSortType(type);
          const param: IRParam = {
            name: surfaceParam.name,
            type,
            binderInfo: surfaceParam.binderInfo,
            ...(isTypeParam ? { isTypeParam: true } : {}),
          };
          params.push(param);
          if (isTypeParam) typeLocals.set(surfaceParam.name, makeTypeVariable(surfaceParam.name, type));
          else valueLocals.set(surfaceParam.name, type);
        }
        let body = this.withTypeLocals(typeLocals, () => this.withLocals(valueLocals, () => this.resolveTypeExpression(surface.codomain)));
        for (let index = params.length - 1; index >= 0; index -= 1) {
          const param = params[index]!;
          body = makePiType({ name: param.name, binderInfo: param.binderInfo }, param.type, body);
        }
        return body;
      }
      case "sort": return makeSortType(surface.sort, surface.level ? this.resolveUniverseLevel(surface.level) : undefined);
      case "term": return this.resolveTypeTerm(surface.expr);
    }
  }

  private resolveTypeTerm(expr: SurfaceExpr): IRType {
    if (expr.kind === "identifier") {
      const local = this.typeLocals.get(expr.name) ?? this.sectionTypeLocals.get(expr.name);
      if (local) return local;
      const resolved = this.resolveNamespaceName(expr.name, (candidate) => this.registry.findType(candidate) !== undefined && this.isNameAvailableInCurrentPhase(candidate), "type");
      if (resolved) return this.registry.findType(resolved)!;
      const abbrev = this.resolveNamespaceName(expr.name, (candidate) => this.registry.getSemanticInfo<IRType>(`type.abbrev:${candidate}`) !== undefined && this.isNameAvailableInCurrentPhase(candidate), "type abbreviation");
      if (abbrev) return this.registry.getSemanticInfo<IRType>(`type.abbrev:${abbrev}`)!;
      const valueType = this.locals.get(expr.name) ?? this.sectionValueLocals.get(expr.name);
      if (valueType) {
        const coerced = this.coerceExpressionToSort({ kind: "var", name: expr.name, type: valueType });
        return makeTypeTerm(coerced);
      }
      const functionName = this.resolveFunctionName(expr.name);
      const signature = functionName ? this.functions.get(functionName) : undefined;
      if (functionName && signature && signature.params.length === 0 && isSortType(signature.result)) {
        return makeTypeTerm({ kind: "var", name: functionName, type: signature.result });
      }
      throw new ProofScriptError("PS2001", `Unknown type '${expr.name}'.`);
    }

    if (expr.kind === "call") {
      const resolvedFamilyName = this.resolveNamespaceName(expr.callee, (candidate) => this.registry.findTypeFamily(candidate) !== undefined && this.isNameAvailableInCurrentPhase(candidate), "type family");
      const family = resolvedFamilyName ? this.registry.findTypeFamily(resolvedFamilyName) : undefined;
      if (family) {
        if (expr.args.length !== family.params.length) {
          throw new ProofScriptError("PS2120", `Type family '${resolvedFamilyName ?? expr.callee}' expects ${family.params.length} argument(s), got ${expr.args.length}.`);
        }
        const args: IRTypeArgument[] = [];
        for (let index = 0; index < family.params.length; index += 1) {
          const spec = family.params[index]!;
          const source = expr.args[index]!;
          if (spec.kind === "type") {
            args.push(typeArgument(this.resolveTypeExpression({ kind: "term", expr: source })));
          } else {
            // Some Lean-native families infer hidden type information from the
            // supplied term itself (for example `Quot(r)` infers the carrier
            // from `r : A → A → Prop`). A plugin may therefore omit an expected
            // type and validate/derive the argument shape in its resolver.
            const expected = spec.expectedType?.(args);
            args.push(termArgument(this.elaborateExpression(source, expected)));
          }
        }
        return family.resolve(args);
      }
    }

    const term = this.elaborateExpression(expr);
    if (isSortType(term.type)) return makeTypeTerm(term);
    try {
      return makeTypeTerm(this.coerceExpressionToSort(term));
    } catch (error) {
      if (error instanceof ProofScriptError && ["PS2134", "PS2161", "PS2162"].includes(error.code)) {
        throw new ProofScriptError("PS2122", `Expression '${term.type.displayName}' does not elaborate to a sort and no CoeSort evidence is available.`);
      }
      throw error;
    }
  }

  declareUniverse(name: string): void {
    if (this.universes.has(name)) throw new ProofScriptError("PS2130", `Universe '${name}' is already declared.`);
    this.universes.add(name);
  }

  hasUniverse(name: string): boolean { return this.universes.has(name); }

  private resolveUniverseLevel(level: SurfaceUniverseLevel): IRUniverseLevel {
    switch (level.kind) {
      case "zero": return level;
      case "param":
        if (!this.universes.has(level.name)) throw new ProofScriptError("PS2131", `Unknown universe parameter '${level.name}'. Declare it with 'universe ${level.name};'.`);
        return level;
      case "succ": return { kind: "succ", base: this.resolveUniverseLevel(level.base), amount: level.amount };
      case "max": return { kind: "max", left: this.resolveUniverseLevel(level.left), right: this.resolveUniverseLevel(level.right) };
      case "imax": return { kind: "imax", left: this.resolveUniverseLevel(level.left), right: this.resolveUniverseLevel(level.right) };
    }
  }

  private claimDeclarationOrigin(name: string, origin = this.moduleName ?? "<single-source>"): void {
    const existing = this.declarationOrigins.get(name);
    if (existing && existing !== origin) {
      throw new ProofScriptError("PS2200", `Semantic name '${name}' is provided by both module '${existing}' and module '${origin}'.`);
    }
    this.declarationOrigins.set(name, origin);
  }

  declareType(id: string, displayName = id, family?: string): void {
    this.claimDeclarationOrigin(id);
    this.registry.registerType(id, displayName, family);
    this.recordDeclarationAccess(id);
    this.recordNamePhase(id);
    this.ownTypes.set(id, this.registry.getType(id));
  }

  declareTypeFamily(name: string, resolver: TypeFamilyResolver): void {
    this.claimDeclarationOrigin(name);
    this.registry.registerTypeFamily(name, resolver);
    this.recordDeclarationAccess(name);
    this.recordNamePhase(name);
    this.ownTypeFamilies.set(name, resolver);
  }

  declareNameAlias(alias: string, target: string): void {
    this.claimDeclarationOrigin(alias);
    const existing = this.nameAliases.get(alias);
    if (existing && existing !== target) throw new ProofScriptError("PS2187", `Alias '${alias}' is already bound to '${existing}'.`);
    this.nameAliases.set(alias, target);
    this.ownAliases.set(alias, target);
    this.recordDeclarationAccess(alias);
    this.recordNamePhase(alias);
  }

  declareFunction(
    name: string,
    params: readonly IRParam[],
    result: IRType,
    options?: { readonly operation?: string; readonly payload?: unknown; readonly universeParams?: readonly string[] },
  ): void {
    this.claimDeclarationOrigin(name);
    if (this.functions.has(name)) throw new ProofScriptError("PS2102", `Function '${name}' is already declared.`);
    const currentNamespace = this.currentNamespaceName();
    if (currentNamespace && name.startsWith(`${currentNamespace}.`)) this.namespacedFunctions.add(name);
    this.recordDeclarationAccess(name);
    this.recordNamePhase(name);
    this.ownFunctions.add(name);
    this.functions.set(name, {
      ...(options?.universeParams?.length ? { universeParams: options.universeParams } : {}),
      params,
      result,
      ...(options?.operation === undefined ? {} : { operation: options.operation }),
      ...(options?.payload === undefined ? {} : { payload: options.payload }),
    });
  }

  updateFunctionSignature(
    name: string,
    params: readonly IRParam[],
    result: IRType,
    options?: { readonly operation?: string; readonly payload?: unknown; readonly universeParams?: readonly string[] },
  ): void {
    if (!this.functions.has(name)) throw new ProofScriptError("PS2201", `Cannot update undeclared function '${name}'.`);
    this.functions.set(name, {
      ...(options?.universeParams?.length ? { universeParams: options.universeParams } : {}),
      params,
      result,
      ...(options?.operation === undefined ? {} : { operation: options.operation }),
      ...(options?.payload === undefined ? {} : { payload: options.payload }),
    });
  }

  declareIntrinsic(spec: IntrinsicSpec): void { this.registry.registerIntrinsic(spec); }

  declareSemanticInfo(key: string, value: unknown): void { this.registry.registerSemanticInfo(key, value); this.ownSemanticInfo.set(key, value); }

  declareClass(descriptor: ClassDescriptor): void {
    this.claimDeclarationOrigin(descriptor.name);
    if (this.classes.has(descriptor.name)) throw new ProofScriptError("PS2140", `Class '${descriptor.name}' is already declared.`);
    this.classes.set(descriptor.name, descriptor);
    this.recordDeclarationAccess(descriptor.name);
    this.recordNamePhase(descriptor.name);
    this.ownClasses.add(descriptor.name);
  }

  getClass(name: string): ClassDescriptor | undefined {
    const resolved = this.resolveNamespaceName(name, (candidate) => this.classes.has(candidate) && this.isNameAvailableInCurrentPhase(candidate), "class");
    return resolved ? this.classes.get(resolved) : undefined;
  }

  declareInstanceCandidate(candidate: Omit<InstanceCandidate, "declarationOrder">): InstanceCandidate {
    this.claimDeclarationOrigin(candidate.name);
    const registered: InstanceCandidate = { ...candidate, declarationOrder: ++this.instanceOrder };
    this.instances.push(registered);
    this.recordDeclarationAccess(candidate.name);
    this.recordNamePhase(candidate.name);
    this.ownInstances.add(candidate.name);
    return registered;
  }

  enterSection(name?: string): number {
    const id = ++this.sectionCounter;
    this.sectionStack.push({
      id, ...(name ? { name } : {}),
      openScopesBefore: new Set(this.openScopedEnvironments),
      openNamespacesBefore: this.openNamespaces.map((entry) => ({ ...entry, ...(entry.only ? { only: new Set(entry.only) } : {}), ...(entry.hiding ? { hiding: new Set(entry.hiding) } : {}) })),
      sectionVariablesBefore: [...this.sectionVariables],
      sectionVariablePoliciesBefore: new Map(this.sectionVariablePolicies),
      defaultVisibilityBefore: this.sectionDefaultVisibility,
      metaPhaseBefore: this.sectionMetaPhase,
      exposeBefore: this.sectionExpose,
    });
    if (this.activeDeclarationModifiers?.visibility) this.sectionDefaultVisibility = this.activeDeclarationModifiers.visibility;
    if (this.activeDeclarationModifiers?.meta) this.sectionMetaPhase = true;
    if (this.activeDeclarationModifiers?.expose) this.sectionExpose = true;
    return id;
  }

  exitSection(expectedName?: string): void {
    const frame = this.sectionStack.pop();
    if (!frame) throw new ProofScriptError("PS2160", "Cannot leave a section because no section scope is active.");
    if (expectedName && frame.name && expectedName !== frame.name) {
      throw new ProofScriptError("PS2161", `Section close '${expectedName}' does not match active section '${frame.name}'.`);
    }
    this.openScopedEnvironments = new Set(frame.openScopesBefore);
    this.openNamespaces = frame.openNamespacesBefore.map((entry) => ({ ...entry, ...(entry.only ? { only: new Set(entry.only) } : {}), ...(entry.hiding ? { hiding: new Set(entry.hiding) } : {}) }));
    this.sectionVariables = [...frame.sectionVariablesBefore];
    this.sectionVariablePolicies = new Map(frame.sectionVariablePoliciesBefore);
    this.sectionDefaultVisibility = frame.defaultVisibilityBefore;
    this.sectionMetaPhase = frame.metaPhaseBefore;
    this.sectionExpose = frame.exposeBefore;
    this.rebuildSectionLocals();
  }

  currentSectionScopeId(): number | undefined { return this.sectionStack.at(-1)?.id; }

  declareSectionVariables(params: readonly SurfaceParam[]): void {
    if (this.sectionStack.length === 0) throw new ProofScriptError("PS2170", "'variable' requires an active section in the v0.15 slice.");
    for (const surface of params) {
      if (this.sectionVariables.some((param) => param.name === surface.name)) throw new ProofScriptError("PS2171", `Section variable '${surface.name}' is already declared in the active section environment.`);
      const type = this.resolveTypeExpression(surface.type);
      const isTypeParam = isSortType(type);
      const param: IRParam = { name: surface.name, type, binderInfo: surface.binderInfo, ...(isTypeParam ? { isTypeParam: true } : {}) };
      this.sectionVariables.push(param);
      if (isTypeParam) this.sectionTypeLocals.set(surface.name, makeTypeVariable(surface.name, type));
      else this.sectionValueLocals.set(surface.name, type);
    }
  }

  setSectionVariablePolicy(name: string, policy: "include" | "omit"): void {
    if (!this.sectionVariables.some((param) => param.name === name)) throw new ProofScriptError("PS2172", `Unknown section variable '${name}'.`);
    this.sectionVariablePolicies.set(name, policy);
  }

  collectClauseReferencedNames(clause: SurfaceClause): readonly string[] {
    const elaborator = this.registry.declarationClauseElaborators.get(clause.owner);
    return elaborator?.collectReferencedNames?.(clause) ?? [];
  }

  /**
   * Run elaboration while recording which active section instance binders are
   * actually selected by typeclass synthesis. Section instances participate as
   * local candidates even before they are generalized into the declaration
   * telescope; callers then feed the returned names back into
   * `selectSectionVariables` so only consumed instances become binders.
   */
  captureSectionInstanceUsage<T>(fn: () => T): { readonly value: T; readonly usedNames: ReadonlySet<string> } {
    const used = new Set<string>();
    this.sectionInstanceUsageStack.push(used);
    try {
      return { value: fn(), usedNames: used };
    } finally {
      this.sectionInstanceUsageStack.pop();
    }
  }

  private markSectionInstanceUsed(name: string): void {
    if (!this.sectionVariables.some((param) => param.name === name && param.binderInfo === "instance")) return;
    for (const collector of this.sectionInstanceUsageStack) collector.add(name);
  }

  selectSectionVariables(referencedNames: ReadonlySet<string>, shadowedNames: ReadonlySet<string> = new Set()): readonly IRParam[] {
    const selected = new Set<string>();
    for (const name of referencedNames) if (!shadowedNames.has(name)) selected.add(name);
    for (const [name, policy] of this.sectionVariablePolicies) if (policy === "include" && !shadowedNames.has(name)) selected.add(name);
    for (const [name, policy] of this.sectionVariablePolicies) {
      if (policy === "omit" && referencedNames.has(name) && !shadowedNames.has(name)) {
        throw new ProofScriptError("PS2173", `Section variable '${name}' is explicitly omitted but referenced by the declaration.`);
      }
      if (policy === "omit") selected.delete(name);
    }

    // Close dependencies: if x : A is included, A must be included too.
    let changed = true;
    while (changed) {
      changed = false;
      for (const param of this.sectionVariables) {
        if (!selected.has(param.name)) continue;
        for (const dependency of this.typeVariableDependencies(param.type)) {
          if (!shadowedNames.has(dependency) && !selected.has(dependency) && this.sectionVariables.some((item) => item.name === dependency)) {
            selected.add(dependency); changed = true;
          }
        }
      }
    }
    return this.sectionVariables.filter((param) => selected.has(param.name));
  }

  private typeVariableDependencies(type: IRType): Set<string> {
    const result = new Set<string>();
    const visitExpr = (expr: IRExpr, bound: ReadonlySet<string>): void => {
      switch (expr.kind) {
        case "var": if (!bound.has(expr.name)) result.add(expr.name); return;
        case "literal": case "type": return;
        case "call": for (const arg of expr.args) visitExpr(arg, bound); return;
        case "apply": visitExpr(expr.callee, bound); for (const arg of expr.args) visitExpr(arg, bound); return;
        case "op": case "extension": for (const arg of expr.args) visitExpr(arg, bound); return;
        case "lambda": case "quantifier": {
          const next = new Set(bound);
          for (const param of expr.params) next.add(param.name);
          visitExpr(expr.body, next);
          return;
        }
      }
    };
    const visit = (current: IRType, bound: ReadonlySet<string> = new Set()): void => {
      const variable = typeVariableName(current);
      if (variable && !bound.has(variable)) result.add(variable);
      for (const arg of current.args ?? []) {
        if (arg.kind === "type") visit(arg.value, bound);
        else visitExpr(arg.value, bound);
      }
      if (current.term) visitExpr(current.term, bound);
      if (current.domain) visit(current.domain, bound);
      if (current.codomain) {
        const next = new Set(bound);
        if (current.binder) next.add(current.binder.name);
        visit(current.codomain, next);
      }
    };
    visit(type); return result;
  }

  private rebuildSectionLocals(): void {
    this.sectionTypeLocals.clear(); this.sectionValueLocals.clear();
    for (const param of this.sectionVariables) {
      if (param.isTypeParam) this.sectionTypeLocals.set(param.name, makeTypeVariable(param.name, param.type));
      else this.sectionValueLocals.set(param.name, param.type);
    }
  }

  enterNamespace(name: string): void {
    const parent = this.currentNamespaceName();
    const qualified = parent ? `${parent}.${name}` : name;
    this.knownNamespaces.add(qualified);
    this.ownNamespaces.add(qualified);
    this.namespaceStack.push({
      name,
      openScopesBefore: new Set(this.openScopedEnvironments),
      openNamespacesBefore: this.openNamespaces.map((entry) => ({ ...entry, ...(entry.only ? { only: new Set(entry.only) } : {}), ...(entry.hiding ? { hiding: new Set(entry.hiding) } : {}) })),
    });
  }

  exitNamespace(expectedName?: string): void {
    const frame = this.namespaceStack.pop();
    if (!frame) throw new ProofScriptError("PS2166", "Cannot leave a namespace because no namespace scope is active.");
    if (expectedName && expectedName !== frame.name) {
      throw new ProofScriptError("PS2167", `Namespace close '${expectedName}' does not match active namespace '${frame.name}'.`);
    }
    this.openScopedEnvironments = new Set(frame.openScopesBefore);
    this.openNamespaces = frame.openNamespacesBefore.map((entry) => ({ ...entry, ...(entry.only ? { only: new Set(entry.only) } : {}), ...(entry.hiding ? { hiding: new Set(entry.hiding) } : {}) }));
  }

  currentNamespaceName(): string | undefined {
    return this.namespaceStack.length === 0 ? undefined : this.namespaceStack.map((frame) => frame.name).join(".");
  }

  qualifyName(name: string): string {
    const namespace = this.currentNamespaceName();
    return namespace ? `${namespace}.${name}` : name;
  }

  private resolveNamespaceReference(name: string): string {
    if (this.knownNamespaces.has(name)) return name;
    const parts = this.currentNamespaceName()?.split(".") ?? [];
    for (let size = parts.length; size > 0; size -= 1) {
      const candidate = `${parts.slice(0, size).join(".")}.${name}`;
      if (this.knownNamespaces.has(candidate)) return candidate;
    }
    return name;
  }


  enterOneCommandEnvironmentScope(): void {
    this.oneCommandEnvironmentStack.push({
      openScopesBefore: new Set(this.openScopedEnvironments),
      openNamespacesBefore: this.openNamespaces.map((entry) => ({ ...entry, ...(entry.only ? { only: new Set(entry.only) } : {}), ...(entry.hiding ? { hiding: new Set(entry.hiding) } : {}) })),
    });
  }

  exitOneCommandEnvironmentScope(): void {
    const frame = this.oneCommandEnvironmentStack.pop();
    if (!frame) throw new ProofScriptError("PS2177", "Cannot leave one-command environment scope because no such scope is active.");
    this.openScopedEnvironments = new Set(frame.openScopesBefore);
    this.openNamespaces = frame.openNamespacesBefore.map((entry) => ({ ...entry, ...(entry.only ? { only: new Set(entry.only) } : {}), ...(entry.hiding ? { hiding: new Set(entry.hiding) } : {}) }));
  }

  openNamespace(name: string, only?: readonly string[], hiding?: readonly string[]): void {
    const resolvedName = this.resolveNamespaceReference(name);
    this.openNamespaces.push({
      name: resolvedName,
      ...(only ? { only: new Set(only) } : {}),
      ...(hiding ? { hiding: new Set(hiding) } : {}),
    });
  }

  exportNamespace(name: string, members: readonly string[]): void {
    const resolvedNamespace = this.resolveNamespaceReference(name);
    const current = this.currentNamespaceName();
    for (const member of members) {
      const alias = current ? `${current}.${member}` : member;
      const target = `${resolvedNamespace}.${member}`;
      const access = this.declarationAccess.get(target);
      if (access?.visibility === "private") {
        throw new ProofScriptError("PS2181", `Cannot export private declaration '${target}'.`);
      }
      const existing = this.nameAliases.get(alias);
      if (existing && existing !== target) {
        throw new ProofScriptError("PS2176", `Export alias '${alias}' is already bound to '${existing}', cannot rebind it to '${target}'.`);
      }
      this.nameAliases.set(alias, target);
      this.ownAliases.set(alias, target);
    }
  }

  importModule(name: string, options: { readonly public?: boolean; readonly meta?: boolean; readonly all?: boolean } = {}): void {
    if (!this.moduleName) throw new ProofScriptError("PS2193", `Import '${name}' requires project/module compilation; single-source checkSource has no module resolver.`);
    const publicIface = this.availableModules.get(name);
    const privateIface = this.availablePrivateModules.get(name) ?? publicIface;
    if (!publicIface || !privateIface) throw new ProofScriptError("PS2196", `Imported ProofScript module '${name}' is unavailable in the compiled project graph.`);
    if (this.moduleHeaderSeen && !publicIface.isModule) throw new ProofScriptError("PS2198", `Module '${this.moduleName}' cannot import non-module source '${name}'; imported files of a module must also use 'module;'.`);
    if (options.public && !this.moduleHeaderSeen) throw new ProofScriptError("PS2199", "'public import' requires a module source with a 'module;' header in this implementation slice.");

    let state = this.importedModules.get(name);
    if (!state) {
      state = { publicIface, privateIface, ordinary: false, meta: false, allOrdinary: false, allMeta: false, publicOrdinary: false, publicMeta: false };
      this.importedModules.set(name, state);
    }
    const mode = options.meta ? "meta" as const : "ordinary" as const;
    if (options.all) {
      if (mode === "meta") {
        if (!state.allMeta) { this.activateImportedInterface(privateIface, "meta", "private"); state.allMeta = true; }
      } else if (!state.allOrdinary) {
        this.activateImportedInterface(privateIface, "ordinary", "private"); state.allOrdinary = true;
      }
    } else if (mode === "meta") {
      if (!state.meta) { this.activateImportedInterface(publicIface, "meta", options.public ? "public" : "private"); state.meta = true; }
    } else if (!state.ordinary) {
      this.activateImportedInterface(publicIface, "ordinary", options.public ? "public" : "private"); state.ordinary = true;
    }
    // `public` always re-exports only the imported module's public scope. If an
    // earlier private import activated it, upgrade those public names here.
    if (options.public) {
      this.activateImportedInterface(publicIface, mode, "public");
      if (mode === "meta") state.publicMeta = true; else state.publicOrdinary = true;
    }
    this.moduleImportCommands.push({ module: name, public: options.public ?? false, ...(options.meta ? { meta: true } : {}), ...(options.all ? { all: true } : {}) });
  }

  private interfacePhaseMap(iface: ProofScriptModuleInterface): Map<string, Set<ModulePhase>> {
    const map = new Map<string, Set<ModulePhase>>();
    for (const item of iface.phaseAccess ?? []) map.set(item.name, new Set(item.phases));
    const exported = [
      ...iface.functions.map((item) => item.name),
      ...iface.types.map((item) => item.id),
      ...iface.typeFamilies.map((item) => item.name),
      ...iface.classes.map((item) => item.name),
      ...iface.instances.map((item) => item.name),
    ];
    for (const name of exported) if (!map.has(name)) map.set(name, new Set<ModulePhase>(["runtime"]));
    return map;
  }

  private activateImportedInterface(iface: ProofScriptModuleInterface, mode: "ordinary" | "meta", scopeVisibility: "public" | "private"): void {
    const origins = new Map(iface.origins.map((item) => [item.name, item.module] as const));
    const phases = this.interfacePhaseMap(iface);
    const claim = (name: string): void => this.claimDeclarationOrigin(name, origins.get(name) ?? iface.module);
    const activatePhases = (name: string): void => {
      if (mode === "meta") this.addNamePhase(name, "meta");
      else for (const phase of phases.get(name) ?? ["runtime"] as const) this.addNamePhase(name, phase);
    };
    for (const entry of iface.types) {
      claim(entry.id); activatePhases(entry.id);
      if (!this.registry.findType(entry.id) && !this.registry.findType(entry.displayName)) this.registry.registerTypeValue(entry);
    }
    for (const entry of iface.typeFamilies) {
      claim(entry.name); activatePhases(entry.name);
      if (!this.registry.findTypeFamily(entry.name)) this.registry.registerTypeFamily(entry.name, entry.resolver);
    }
    for (const item of iface.definitionBodies ?? []) this.definitionBodies.set(item.name, item.body);
    for (const entry of iface.functions) {
      claim(entry.name); activatePhases(entry.name);
      if (!this.functions.has(entry.name)) {
        this.functions.set(entry.name, entry.signature);
        if (entry.name.includes(".")) this.namespacedFunctions.add(entry.name);
      }
    }
    for (const descriptor of iface.classes) {
      claim(descriptor.name); activatePhases(descriptor.name);
      if (!this.classes.has(descriptor.name)) this.classes.set(descriptor.name, descriptor);
    }
    for (const candidate of iface.instances) {
      claim(candidate.name); activatePhases(candidate.name);
      if (this.instances.some((item) => item.name === candidate.name)) continue;
      this.instances.push({ ...candidate, declarationOrder: ++this.instanceOrder });
    }
    for (const namespace of iface.namespaces) this.knownNamespaces.add(namespace);
    for (const { alias, target } of iface.aliases) {
      const existing = this.nameAliases.get(alias);
      if (existing && existing !== target) throw new ProofScriptError("PS2197", `Imported alias '${alias}' conflicts between '${existing}' and '${target}'.`);
      this.nameAliases.set(alias, target);
    }
    for (const { key, value } of iface.semanticInfo) if (this.registry.getSemanticInfo(key) === undefined) this.registry.registerSemanticInfo(key, value);
    for (const item of iface.declarationAttributes ?? []) {
      const map = this.declarationAttributes.get(item.name) ?? new Map<string, IRDeclarationAttribute>();
      for (const attribute of item.attributes) map.set(attribute.name, attribute);
      this.declarationAttributes.set(item.name, map);
    }
    for (const access of iface.access) this.declarationAccess.set(access.name, { visibility: scopeVisibility, protected: access.protected, exposed: access.exposed ?? false });
  }

  exportModuleInterface(module = this.moduleName ?? "<single-source>", scope: "public" | "private" = "public"): ProofScriptModuleInterface {
    const functions = new Map<string, FunctionSignature>();
    const definitionBodies = new Map<string, IRExpr>();
    const types = new Map<string, IRType>();
    const typeFamilies = new Map<string, TypeFamilyResolver>();
    const classes = new Map<string, ClassDescriptor>();
    const instances = new Map<string, InstanceCandidate>();
    const namespaces = new Set<string>();
    const aliases = new Map<string, string>();
    const semanticInfo = new Map<string, unknown>();
    const declarationAttributes = new Map<string, readonly IRDeclarationAttribute[]>();
    const access = new Map<string, { visibility: "public" | "private"; protected: boolean; exposed: boolean }>();
    const phaseAccess = new Map<string, Set<ModulePhase>>();
    const origins = new Map<string, string>();

    const mergePhases = (name: string, phases: Iterable<ModulePhase>): void => {
      let target = phaseAccess.get(name);
      if (!target) { target = new Set<ModulePhase>(); phaseAccess.set(name, target); }
      for (const phase of phases) target.add(phase);
    };
    const merge = (iface: ProofScriptModuleInterface, mode: "ordinary" | "meta", visibility: "public" | "private"): void => {
      for (const item of iface.functions) functions.set(item.name, item.signature);
      for (const item of iface.definitionBodies ?? []) definitionBodies.set(item.name, item.body);
      for (const item of iface.types) types.set(item.id, item);
      for (const item of iface.typeFamilies) typeFamilies.set(item.name, item.resolver);
      for (const item of iface.classes) classes.set(item.name, item);
      for (const item of iface.instances) instances.set(item.name, item);
      for (const item of iface.namespaces) namespaces.add(item);
      for (const item of iface.aliases) aliases.set(item.alias, item.target);
      for (const item of iface.semanticInfo) semanticInfo.set(item.key, item.value);
      for (const item of iface.declarationAttributes ?? []) declarationAttributes.set(item.name, item.attributes);
      for (const item of iface.access) access.set(item.name, { visibility, protected: item.protected, exposed: item.exposed ?? false });
      for (const item of iface.origins) origins.set(item.name, item.module);
      const sourcePhases = this.interfacePhaseMap(iface);
      for (const name of sourcePhases.keys()) mergePhases(name, mode === "meta" ? ["meta"] : sourcePhases.get(name)!);
    };

    for (const imported of this.importedModules.values()) {
      if (scope === "public") {
        if (imported.publicOrdinary) merge(imported.publicIface, "ordinary", "public");
        if (imported.publicMeta) merge(imported.publicIface, "meta", "public");
      } else {
        if (imported.allOrdinary) merge(imported.privateIface, "ordinary", "private");
        else if (imported.ordinary || imported.publicOrdinary) merge(imported.publicIface, "ordinary", "private");
        if (imported.allMeta) merge(imported.privateIface, "meta", "private");
        else if (imported.meta || imported.publicMeta) merge(imported.publicIface, "meta", "private");
      }
    }

    const isPublic = (name: string): boolean => this.declarationAccess.get(name)?.visibility !== "private";
    const includeOwn = (name: string): boolean => scope === "private" || isPublic(name);
    const addOwn = (name: string): void => {
      const a = this.declarationAccess.get(name);
      access.set(name, { visibility: a?.visibility ?? (this.moduleHeaderSeen ? "private" : "public"), protected: a?.protected ?? false, exposed: a?.exposed ?? false });
      mergePhases(name, this.namePhaseAvailability.get(name) ?? new Set<ModulePhase>(["runtime"]));
    };
    for (const name of this.ownFunctions) if (includeOwn(name)) {
      functions.set(name, this.functions.get(name)!); addOwn(name);
      const body = this.ownDefinitionBodies.get(name);
      const a = this.declarationAccess.get(name);
      if (body && (scope === "private" || a?.exposed)) definitionBodies.set(name, body);
    }
    for (const [name, type] of this.ownTypes) if (includeOwn(name)) { types.set(name, type); addOwn(name); }
    for (const [name, resolver] of this.ownTypeFamilies) if (includeOwn(name)) { typeFamilies.set(name, resolver); addOwn(name); }
    for (const name of this.ownClasses) if (includeOwn(name)) { classes.set(name, this.classes.get(name)!); addOwn(name); }
    for (const name of this.ownInstances) {
      if (!includeOwn(name)) continue;
      const candidate = this.instances.find((item) => item.name === name);
      if (candidate && (candidate.visibility ?? "global") !== "local") { instances.set(name, candidate); addOwn(name); }
    }
    for (const name of this.ownNamespaces) namespaces.add(name);
    for (const [alias, target] of this.ownAliases) {
      const aliasAccess = this.declarationAccess.get(alias);
      if (scope === "private" || (aliasAccess?.visibility !== "private" && !this.isPrivateSemanticName(target))) aliases.set(alias, target);
    }
    for (const [key, value] of this.ownSemanticInfo) semanticInfo.set(key, value);
    for (const [name, attributes] of this.declarationAttributes) if (includeOwn(name)) declarationAttributes.set(name, [...attributes.values()]);
    const exportedNames = new Set<string>([...functions.keys(), ...types.keys(), ...typeFamilies.keys(), ...classes.keys(), ...instances.keys()]);
    for (const name of exportedNames) {
      const origin = this.declarationOrigins.get(name);
      if (origin) origins.set(name, origin);
    }

    return {
      module,
      isModule: this.moduleHeaderSeen,
      functions: [...functions].map(([name, signature]) => ({ name, signature })),
      definitionBodies: [...definitionBodies].filter(([name]) => exportedNames.has(name)).map(([name, body]) => ({ name, body })),
      types: [...types.values()],
      typeFamilies: [...typeFamilies].map(([name, resolver]) => ({ name, resolver })),
      classes: [...classes.values()],
      instances: [...instances.values()],
      namespaces: [...namespaces],
      aliases: [...aliases].map(([alias, target]) => ({ alias, target })),
      semanticInfo: [...semanticInfo].map(([key, value]) => ({ key, value })),
      declarationAttributes: [...declarationAttributes].map(([name, attributes]) => ({ name, attributes })),
      access: [...access].filter(([name]) => exportedNames.has(name)).map(([name, value]) => ({ name, visibility: value.visibility, protected: value.protected, ...(value.exposed ? { exposed: true } : {}) })),
      phaseAccess: [...phaseAccess].filter(([name]) => exportedNames.has(name)).map(([name, phases]) => ({ name, phases: [...phases].sort() as ModulePhase[] })),
      origins: [...origins].filter(([name]) => exportedNames.has(name)).map(([name, originModule]) => ({ name, module: originModule })),
    };
  }

  getModuleImports(): readonly import("./model.js").ModuleImportDescriptor[] {
    return [...this.moduleImportCommands];
  }

  private effectiveActiveAccess(): { readonly visibility: "public" | "private"; readonly protected: boolean; readonly exposed: boolean } {
    return {
      visibility: this.activeDeclarationModifiers?.visibility ?? this.sectionDefaultVisibility ?? (this.moduleHeaderSeen ? "private" : "public"),
      protected: this.activeDeclarationModifiers?.protected ?? false,
      exposed: this.activeDeclarationModifiers?.expose ?? this.sectionExpose,
    };
  }

  private recordDeclarationAccess(name: string): void {
    if (!this.activeDeclarationModifiers && !this.moduleHeaderSeen && this.sectionDefaultVisibility === undefined && !this.sectionExpose) return;
    const next = this.effectiveActiveAccess();
    const existing = this.declarationAccess.get(name);
    if (existing && (existing.visibility !== next.visibility || existing.protected !== next.protected || existing.exposed !== next.exposed)) {
      throw new ProofScriptError("PS2182", `Declaration accessibility for '${name}' was registered inconsistently.`);
    }
    this.declarationAccess.set(name, next);
  }

  private semanticNameOfDeclaration(declaration: IRDeclaration): string | undefined {
    if (declaration.kind === "def") return declaration.semanticName ?? declaration.name;
    if (declaration.kind === "mutual") return undefined;
    if (!["lean.theorem", "lean.abbrev.type", "lean.abbrev.value", "lean.opaque.value", "lean.opaque.bodyless", "lean.axiom.proof", "lean.axiom.runtime", "lean.example", "lean.inductive.decl", "lean.inductive.indexed.decl", "lean.structure.decl", "lean.class.decl", "lean.instance.decl"].includes(declaration.op)) return undefined;
    const payload = declaration.payload;
    if (payload && typeof payload === "object" && "name" in payload && typeof (payload as { name?: unknown }).name === "string") {
      return (payload as { name: string }).name;
    }
    return undefined;
  }

  private isPrivateSemanticName(name: string): boolean {
    const direct = this.declarationAccess.get(name);
    if (direct?.visibility === "private") return true;
    for (const [candidate, access] of this.declarationAccess) {
      if (access.visibility !== "private") continue;
      if (name === candidate || name.startsWith(`${candidate}.`) || name.startsWith(`${candidate}(`)) return true;
    }
    return false;
  }

  private typeHasPrivateReference(type: IRType): string | undefined {
    if (this.isPrivateSemanticName(type.id)) return type.id;
    if (type.family) {
      const suffix = type.family.includes(":") ? type.family.slice(type.family.indexOf(":") + 1) : type.family;
      if (this.isPrivateSemanticName(suffix)) return suffix;
    }
    for (const arg of type.args ?? []) {
      const found = arg.kind === "type" ? this.typeHasPrivateReference(arg.value) : this.exprHasPrivateReference(arg.value);
      if (found) return found;
    }
    if (type.term) { const found = this.exprHasPrivateReference(type.term); if (found) return found; }
    if (type.domain) { const found = this.typeHasPrivateReference(type.domain); if (found) return found; }
    if (type.codomain) { const found = this.typeHasPrivateReference(type.codomain); if (found) return found; }
    if (type.binder) { const found = this.typeHasPrivateReference(type.binder.type); if (found) return found; }
    return undefined;
  }

  private exprHasPrivateReference(expr: IRExpr): string | undefined {
    if (expr.kind === "call" && this.isPrivateSemanticName(expr.callee)) return expr.callee;
    if (expr.kind === "var" && this.isPrivateSemanticName(expr.name)) return expr.name;
    if (expr.kind === "type") return this.typeHasPrivateReference(expr.value);
    if (expr.kind === "lambda" || expr.kind === "quantifier") {
      for (const param of expr.params) { const found = this.typeHasPrivateReference(param.type); if (found) return found; }
      return this.exprHasPrivateReference(expr.body);
    }
    if (expr.kind === "apply") {
      const head = this.exprHasPrivateReference(expr.callee); if (head) return head;
    }
    for (const arg of "args" in expr ? expr.args : []) { const found = this.exprHasPrivateReference(arg); if (found) return found; }
    return this.typeHasPrivateReference(expr.type);
  }

  private validatePublicSignature(declaration: IRDeclaration): void {
    if (declaration.kind === "mutual") { for (const member of declaration.members) this.validatePublicSignature(member); return; }
    const semanticName = this.semanticNameOfDeclaration(declaration);
    if (!semanticName) return;
    const access = this.declarationAccess.get(semanticName) ?? this.effectiveActiveAccess();
    if (access.visibility === "private") return;
    let privateRef: string | undefined;
    if (declaration.kind === "def") {
      for (const param of [...declaration.params, ...(declaration.proofParams ?? [])]) {
        privateRef = this.typeHasPrivateReference(param.type); if (privateRef) break;
      }
      if (!privateRef) privateRef = this.typeHasPrivateReference(declaration.returnType);
      if (!privateRef && access.exposed) privateRef = this.exprHasPrivateReference(declaration.body);
    } else if (["lean.abbrev.type", "lean.abbrev.value", "lean.opaque.value", "lean.opaque.bodyless", "lean.axiom.proof", "lean.axiom.runtime"].includes(declaration.op)) {
      const payload = declaration.payload as { params?: readonly IRParam[]; returnType?: IRType; targetType?: IRType; body?: IRExpr };
      for (const param of payload.params ?? []) { privateRef = this.typeHasPrivateReference(param.type); if (privateRef) break; }
      if (!privateRef && payload.returnType) privateRef = this.typeHasPrivateReference(payload.returnType);
      if (!privateRef && payload.targetType) privateRef = this.typeHasPrivateReference(payload.targetType);
      if (!privateRef && access.exposed && payload.body) privateRef = this.exprHasPrivateReference(payload.body);
    } else if (declaration.op === "lean.theorem") {
      for (const arg of declaration.args ?? []) { privateRef = this.exprHasPrivateReference(arg); if (privateRef) break; }
    } else if (["lean.structure.decl", "lean.class.decl", "lean.inductive.decl", "lean.inductive.indexed.decl"].includes(declaration.op)) {
      const visit = (value: unknown): string | undefined => {
        if (!value || typeof value !== "object") return undefined;
        if (Array.isArray(value)) { for (const item of value) { const found = visit(item); if (found) return found; } return undefined; }
        if ("form" in value && typeof (value as { form?: unknown }).form === "string") return this.typeHasPrivateReference(value as IRType);
        for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
          if (["name", "sourceName", "family", "proof"].includes(key)) continue;
          const found = visit(item); if (found) return found;
        }
        return undefined;
      };
      privateRef = visit(declaration.payload);
    } else if (declaration.op === "lean.instance.decl") {
      const payload = declaration.payload as { params?: readonly IRParam[]; targetType?: IRType };
      for (const param of payload.params ?? []) { privateRef = this.typeHasPrivateReference(param.type); if (privateRef) break; }
      if (!privateRef && payload.targetType) privateRef = this.typeHasPrivateReference(payload.targetType);
    }
    if (privateRef) {
      const location = declaration.kind === "def" && access.exposed ? "public signature/exposed body" : "public signature";
      throw new ProofScriptError("PS2183", `Public declaration '${semanticName}' has private declaration '${privateRef}' in its ${location}.`);
    }
  }

  private currentPhase(): ModulePhase {
    return this.activeDeclarationModifiers?.meta || this.sectionMetaPhase ? "meta" : "runtime";
  }

  private recordNamePhase(name: string, phase = this.currentPhase()): void {
    let phases = this.namePhaseAvailability.get(name);
    if (!phases) { phases = new Set<ModulePhase>(); this.namePhaseAvailability.set(name, phases); }
    phases.add(phase);
  }

  private addNamePhase(name: string, phase: ModulePhase): void {
    let phases = this.namePhaseAvailability.get(name);
    if (!phases) { phases = new Set<ModulePhase>(); this.namePhaseAvailability.set(name, phases); }
    phases.add(phase);
  }

  private isNameAvailableInCurrentPhase(name: string): boolean {
    const phases = this.namePhaseAvailability.get(name);
    // Builtins and plugin-provided primitives predate module phase tracking and
    // remain available in both phases. User/project declarations are recorded.
    return !phases || phases.has(this.currentPhase());
  }

  private resolveNamespaceName(
    name: string,
    exists: (candidate: string) => boolean,
    category: string,
  ): string | undefined {
    const resolveCandidate = (candidate: string): string | undefined => {
      if (exists(candidate)) return candidate;
      const alias = this.nameAliases.get(candidate);
      if (alias && exists(alias)) return alias;
      return undefined;
    };

    const direct = resolveCandidate(name);
    if (direct) return direct;

    const namespaceParts = this.currentNamespaceName()?.split(".") ?? [];
    for (let size = namespaceParts.length; size > 0; size -= 1) {
      const candidate = resolveCandidate(`${namespaceParts.slice(0, size).join(".")}.${name}`);
      if (candidate) return candidate;
    }

    const opened = this.openNamespaces
      .filter((entry) => (!entry.only || entry.only.has(name)) && (!entry.hiding || !entry.hiding.has(name)))
      .map((entry) => {
        const candidate = resolveCandidate(`${entry.name}.${name}`);
        if (!candidate) return undefined;
        const access = this.declarationAccess.get(candidate);
        if (access?.protected && !entry.only) return undefined;
        return candidate;
      })
      .filter((candidate): candidate is string => candidate !== undefined);
    const unique = [...new Set(opened)];
    if (unique.length > 1) throw new ProofScriptError("PS2175", `Ambiguous opened ${category} '${name}': ${unique.join(", ")}.`);
    if (unique.length === 1) return unique[0];
    return undefined;
  }

  private resolveFunctionName(name: string): string | undefined {
    return this.resolveNamespaceName(name, (candidate) => this.functions.has(candidate) && this.isNameAvailableInCurrentPhase(candidate), "name");
  }

  openScopedEnvironment(name: string): void { this.openScopedEnvironments.add(name); }

  isScopedEnvironmentOpen(name: string): boolean { return this.openScopedEnvironments.has(name); }

  setInstanceDefaultAttribute(name: string, priority = 1000): void {
    const resolved = this.resolveNamespaceName(name, (candidate) => this.instances.some((item) => item.name === candidate) && this.isNameAvailableInCurrentPhase(candidate), "instance");
    if (!resolved) throw new ProofScriptError("PS2163", `Cannot apply @[default_instance] to unknown instance '${name}'.`);
    const index = this.instances.findIndex((candidate) => candidate.name === resolved);
    const current = this.instances[index]!;
    this.instances[index] = { ...current, defaultInstancePriority: priority };
  }

  removeInstanceDefaultAttribute(name: string): void {
    const resolved = this.resolveNamespaceName(name, (candidate) => this.instances.some((item) => item.name === candidate) && this.isNameAvailableInCurrentPhase(candidate), "instance");
    if (!resolved) throw new ProofScriptError("PS2164", `Cannot remove @[default_instance] from unknown instance '${name}'.`);
    const index = this.instances.findIndex((candidate) => candidate.name === resolved);
    const current = this.instances[index]!;
    const { defaultInstancePriority: _ignored, ...rest } = current;
    this.instances[index] = rest;
  }

  setDeclarationAttribute(name: string, attribute: IRDeclarationAttribute): void {
    const resolved = this.resolveNamespaceName(
      name,
      (candidate) => this.functions.has(candidate) || this.instances.some((item) => item.name === candidate) || this.classes.has(candidate) || this.registry.findType(candidate) !== undefined || this.registry.findTypeFamily(candidate) !== undefined || this.registry.getSemanticInfo(`type.abbrev:${candidate}`) !== undefined,
      "declaration",
    );
    if (!resolved) throw new ProofScriptError("PS2166", `Cannot apply @[${attribute.name}] to unknown declaration '${name}'.`);
    const map = this.declarationAttributes.get(resolved) ?? new Map<string, IRDeclarationAttribute>();
    map.set(attribute.name, attribute);
    this.declarationAttributes.set(resolved, map);
  }

  removeDeclarationAttribute(name: string, attributeName: string): void {
    const resolved = this.resolveNamespaceName(
      name,
      (candidate) => this.declarationAttributes.has(candidate) || this.functions.has(candidate) || this.instances.some((item) => item.name === candidate) || this.classes.has(candidate) || this.registry.findType(candidate) !== undefined || this.registry.findTypeFamily(candidate) !== undefined || this.registry.getSemanticInfo(`type.abbrev:${candidate}`) !== undefined,
      "declaration",
    );
    if (!resolved) throw new ProofScriptError("PS2167", `Cannot remove @[${attributeName}] from unknown declaration '${name}'.`);
    this.declarationAttributes.get(resolved)?.delete(attributeName);
  }

  getDeclarationAttributes(name: string): readonly IRDeclarationAttribute[] {
    const resolved = this.resolveNamespaceName(
      name,
      (candidate) => this.declarationAttributes.has(candidate),
      "declaration",
    );
    return resolved ? [...(this.declarationAttributes.get(resolved)?.values() ?? [])] : [];
  }

  private reducibilityOf(name: string): "reducible" | "instance_reducible" | "implicit_reducible" | "default" {
    const attributes = this.declarationAttributes.get(name);
    if (attributes?.has("reducible")) return "reducible";
    if (attributes?.has("instance_reducible")) return "instance_reducible";
    if (attributes?.has("implicit_reducible")) return "implicit_reducible";
    return "default";
  }

  private canUnfoldAt(name: string, mode: TransparencyMode): boolean {
    if (mode === "all") return true;
    const status = this.reducibilityOf(name);
    const required = status === "reducible" ? "reducible" : status === "instance_reducible" ? "instances" : status === "implicit_reducible" ? "implicit" : "default";
    return TRANSPARENCY_RANK[mode] >= TRANSPARENCY_RANK[required];
  }

  private reduceTypeAtTransparency(type: IRType, mode: TransparencyMode, seen = new Set<string>()): IRType {
    if (type.form === "term" && type.term?.kind === "var") {
      const name = type.term.name;
      const body = this.definitionBodies.get(name);
      if (body && !seen.has(name) && this.canUnfoldAt(name, mode)) {
        const nested = new Set(seen); nested.add(name);
        if (body.kind === "type") return this.reduceTypeAtTransparency(body.value, mode, nested);
        if (isSortType(body.type)) return this.reduceTypeAtTransparency(makeTypeTerm(body), mode, nested);
      }
    }
    if (type.form === "nominal") {
      let current = type;
      if (type.args?.length) {
        const args = type.args.map((arg) => arg.kind === "type" ? { kind: "type" as const, value: this.reduceTypeAtTransparency(arg.value, mode, seen) } : arg);
        if (args.some((arg, index) => arg.kind === "type" && type.args![index]!.kind === "type" && !sameType(arg.value, (type.args![index] as any).value))) current = { ...type, args };
      }
      if (current.family && TRANSPARENCY_RANK[mode] >= TRANSPARENCY_RANK.reducible) {
        const reducer = this.registry.findReducibleTypeFamily(current.family);
        const key = `family-abbrev:${typeKey(current)}`;
        if (reducer && !seen.has(key)) {
          const unfolded = reducer(current);
          if (unfolded) {
            const nested = new Set(seen); nested.add(key);
            return this.reduceTypeAtTransparency(unfolded, mode, nested);
          }
        }
      }
      if (current !== type) return current;
    }
    if (type.form === "pi" && type.domain && type.codomain) {
      const domain = this.reduceTypeAtTransparency(type.domain, mode, seen);
      const codomain = this.reduceTypeAtTransparency(type.codomain, mode, seen);
      if (!sameType(domain, type.domain) || !sameType(codomain, type.codomain)) return { ...type, domain, codomain, ...(type.binder ? { binder: { ...type.binder, type: domain } } : {}) };
    }
    return type;
  }

  private sameTypeAtTransparency(left: IRType, right: IRType, mode: TransparencyMode): boolean {
    return sameType(this.reduceTypeAtTransparency(left, mode), this.reduceTypeAtTransparency(right, mode));
  }

  reduceTypeForComparison(type: IRType): IRType {
    return this.reduceTypeAtTransparency(type, "default");
  }

  typesDefinitionallyEqual(left: IRType, right: IRType): boolean {
    return this.sameTypeAtTransparency(left, right, "default");
  }

  private isInstanceCandidateActive(candidate: InstanceCandidate): boolean {
    if (!this.isNameAvailableInCurrentPhase(candidate.name)) return false;
    switch (candidate.visibility ?? "global") {
      case "global": return true;
      case "local": return candidate.localScopeId !== undefined && this.sectionStack.some((frame) => frame.id === candidate.localScopeId);
      case "scoped": return candidate.scopeName !== undefined && this.openScopedEnvironments.has(candidate.scopeName);
    }
  }

  synthesizeInstance(type: IRType): IRExpr {
    const session: InstanceSearchSession = { active: new Set(), stack: [], table: new Map() };
    return this.synthesizeInstanceDetailed(type, new Set(), session).expr;
  }

  synthesizeInstanceWithTypeOutputs(type: IRType, outputNames: ReadonlySet<string>): { readonly expr: IRExpr; readonly inferredTypes: ReadonlyMap<string, IRType> } {
    const session: InstanceSearchSession = { active: new Set(), stack: [], table: new Map() };
    const result = this.synthesizeInstanceDetailed(type, outputNames, session);
    return { expr: result.expr, inferredTypes: result.inferredTypes };
  }

  private synthesizeInstanceDetailed(
    type: IRType,
    outputGoalTypeNames: ReadonlySet<string>,
    session: InstanceSearchSession,
    excludedCandidates: ReadonlySet<string> = new Set(),
    outputGoalValueNames: ReadonlySet<string> = new Set(),
  ): InstanceSearchResult {
    const originalGoal = type;
    type = this.reduceTypeAtTransparency(type, "instances");
    const searchKey = `${typeKey(type)}|outputs:${[...outputGoalTypeNames].sort().join(",")}|valueOutputs:${[...outputGoalValueNames].sort().join(",")}|exclude:${[...excludedCandidates].sort().join(",")}`;
    const cached = session.table.get(searchKey);
    if (cached) {
      if (cached.expr.kind === "var") this.markSectionInstanceUsed(cached.expr.name);
      return { expr: cached.expr, inferredTypes: new Map(cached.inferredTypes), inferredValues: new Map(cached.inferredValues) };
    }

    const goalClassNameForLocal = type.family?.startsWith("lean.class:") ? type.family.slice("lean.class:".length) : undefined;
    const goalClassForLocal = goalClassNameForLocal ? this.classes.get(goalClassNameForLocal) : undefined;
    // Active section instance variables are elaboration-local candidates and
    // shadow declaration candidates. Explicit declaration binders shadow
    // section variables of the same name.
    const localCandidates = new Map<string, IRType>();
    for (const param of this.sectionVariables) if (param.binderInfo === "instance") localCandidates.set(param.name, param.type);
    for (const [name, localType] of this.instanceLocals) localCandidates.set(name, localType);
    for (const [name, localType] of [...localCandidates.entries()].reverse()) {
      const localSearchType = this.reduceTypeAtTransparency(localType, "instances");
      if (sameType(localSearchType, type)) {
        const inferred = new Map<string, IRType>();
        if (goalClassForLocal && localSearchType.family === type.family) {
          const localArgs = localSearchType.args ?? [];
          const goalArgs = type.args ?? [];
          for (let index = 0; index < goalArgs.length; index += 1) {
            const mode = goalClassForLocal.params[index]?.instanceSearchMode ?? "input";
            const goalArg = goalArgs[index];
            const localArg = localArgs[index];
            if ((mode === "out" || mode === "semiOut") && goalArg?.kind === "type" && localArg?.kind === "type") {
              const goalVariable = typeVariableName(goalArg.value);
              if (goalVariable && outputGoalTypeNames.has(goalVariable)) inferred.set(goalVariable, localArg.value);
            }
          }
        }
        this.markSectionInstanceUsed(name);
        const originalResolved = substituteType(originalGoal, inferred, new Map());
        const result = { expr: { kind: "var", name, type: originalResolved } as IRExpr, inferredTypes: inferred, inferredValues: new Map<string, IRExpr>() };
        session.table.set(searchKey, result);
        return result;
      }
      if (goalClassForLocal && localSearchType.family === type.family) {
        const localArgs = localSearchType.args ?? [];
        const goalArgs = type.args ?? [];
        if (localArgs.length !== goalArgs.length) continue;
        let compatible = true;
        const inferred = new Map<string, IRType>();
        const inferredValues = new Map<string, IRExpr>();
        for (let index = 0; index < goalArgs.length; index += 1) {
          const mode = goalClassForLocal.params[index]?.instanceSearchMode ?? "input";
          const goalArg = goalArgs[index]!;
          const localArg = localArgs[index]!;
          if (goalArg.kind !== localArg.kind) { compatible = false; break; }
          if (goalArg.kind === "type" && localArg.kind === "type") {
            const goalVariable = typeVariableName(goalArg.value);
            if (goalVariable && outputGoalTypeNames.has(goalVariable) && (mode === "out" || mode === "semiOut")) {
              inferred.set(goalVariable, localArg.value);
            } else if (mode === "out") {
              // `outParam` is an output of search, not an input used to select a
              // local candidate. It must still agree with an already-fixed goal.
              if (!sameType(goalArg.value, localArg.value)) { compatible = false; break; }
            } else if (!sameType(goalArg.value, localArg.value)) { compatible = false; break; }
          } else if (goalArg.kind === "term" && localArg.kind === "term") {
            const goalValueName = goalArg.value.kind === "var" ? goalArg.value.name : undefined;
            if (goalValueName && outputGoalValueNames.has(goalValueName) && (mode === "out" || mode === "semiOut")) {
              inferredValues.set(goalValueName, localArg.value);
            } else if (mode === "out") {
              if (exprKey(goalArg.value) !== exprKey(localArg.value)) { compatible = false; break; }
            } else if (exprKey(goalArg.value) !== exprKey(localArg.value)) { compatible = false; break; }
          }
        }
        if (compatible) {
          this.markSectionInstanceUsed(name);
          const originalResolved = substituteType(originalGoal, inferred, inferredValues);
          const result = { expr: { kind: "var", name, type: originalResolved } as IRExpr, inferredTypes: inferred, inferredValues };
          session.table.set(searchKey, result);
          return result;
        }
      }
    }

    if (session.active.has(searchKey)) {
      const cycleStart = session.stack.indexOf(searchKey);
      const cycle = [...(cycleStart >= 0 ? session.stack.slice(cycleStart) : session.stack), searchKey]
        .map((item) => item.split("|outputs:")[0]).join(" -> ");
      throw new ProofScriptError("PS2144", `Instance synthesis cycle detected while solving '${type.displayName}'. Search cycle: ${cycle}.`);
    }
    session.active.add(searchKey);
    session.stack.push(searchKey);
    try {
      const activeCandidates = this.instances.filter((candidate) => this.isInstanceCandidateActive(candidate) && !excludedCandidates.has(candidate.name));
      const visibilityRank = (candidate: InstanceCandidate): number => candidate.visibility === "local" ? 2 : 1;
      const ordinaryCandidates = [...activeCandidates].sort((a, b) =>
        visibilityRank(b) - visibilityRank(a) || b.priority - a.priority || b.declarationOrder - a.declarationOrder,
      );
      const defaultCandidates = activeCandidates.filter((candidate) => candidate.defaultInstancePriority !== undefined).sort((a, b) =>
        visibilityRank(b) - visibilityRank(a)
        || (b.defaultInstancePriority ?? 0) - (a.defaultInstancePriority ?? 0)
        || b.priority - a.priority
        || b.declarationOrder - a.declarationOrder,
      );
      const failures: string[] = [];
      const goalClassName = type.family?.startsWith("lean.class:") ? type.family.slice("lean.class:".length) : undefined;
      const goalClass = goalClassName ? this.classes.get(goalClassName) : undefined;

      const tryCandidate = (candidate: InstanceCandidate, allowDefaulting: boolean): InstanceSearchResult | undefined => {
        const candidateSearchType = this.reduceTypeAtTransparency(candidate.resultType, "instances");
        const typeSubstitutions = new Map<string, IRType>();
        const valueSubstitutions = new Map<string, IRExpr>();
        const inferredGoalTypes = new Map<string, IRType>();
        const inferredGoalValues = new Map<string, IRExpr>();
        // Lean instance heads may depend on instance-implicit parameters.  A
        // canonical example is a value-dependent `Decidable (LE.le self a b)`
        // candidate: the selected `self : LE A` occurs in the result head and
        // must be unified with the goal *before* solving the remaining
        // prerequisites.  Historically ProofScript allowed only ordinary term
        // parameters to be inferred from a candidate head, which made such
        // dictionary-indexed evidence impossible to model faithfully.
        //
        // Keep this narrow: an instance parameter is head-inferable only when
        // its name actually occurs free in the candidate result type.  Other
        // instance parameters remain ordinary prerequisite goals.
        const resultValueNames = valueVariablesInType(candidate.resultType);
        const inferableValues = new Set(candidate.params.filter((param) =>
          !param.isTypeParam && (param.binderInfo !== "instance" || resultValueNames.has(param.name)),
        ).map((param) => param.name));
        const deferredOutputs: {
          readonly kind: "type" | "term";
          readonly index: number;
          readonly goalName?: string;
          readonly goalType?: IRType;
          readonly goalValue?: IRExpr;
        }[] = [];

        let matched = false;
        if (goalClass && candidateSearchType.family === type.family) {
          const candidateArgs = candidateSearchType.args ?? [];
          const goalArgs = type.args ?? [];
          if (candidateArgs.length !== goalArgs.length) return undefined;
          matched = true;
          for (let index = 0; index < candidateArgs.length; index += 1) {
            const candidateArg = candidateArgs[index]!;
            const goalArg = goalArgs[index]!;
            if (candidateArg.kind !== goalArg.kind) { matched = false; break; }
            const mode = goalClass.params[index]?.instanceSearchMode ?? "input";
            if (candidateArg.kind === "type" && goalArg.kind === "type") {
              const goalVariable = typeVariableName(goalArg.value);
              const unresolvedGoal = !!goalVariable && outputGoalTypeNames.has(goalVariable);
              // outParam is never an input to candidate selection. semiOutParam
              // becomes an input once its metavariable is already assigned.
              const defer = mode === "out"
                || (mode === "semiOut" && unresolvedGoal)
                || (allowDefaulting && unresolvedGoal);
              if (defer) {
                deferredOutputs.push({ kind: "type", index, ...(unresolvedGoal ? { goalName: goalVariable! } : { goalType: goalArg.value }) });
                continue;
              }
              if (!unifyTypePattern(candidateArg.value, goalArg.value, typeSubstitutions, valueSubstitutions, inferableValues)) { matched = false; break; }
            } else if (candidateArg.kind === "term" && goalArg.kind === "term") {
              const goalValueName = goalArg.value.kind === "var" ? goalArg.value.name : undefined;
              const unresolvedGoalValue = !!goalValueName && outputGoalValueNames.has(goalValueName);
              const defer = mode === "out"
                || (mode === "semiOut" && unresolvedGoalValue)
                || (allowDefaulting && unresolvedGoalValue);
              if (defer) {
                deferredOutputs.push({ kind: "term", index, ...(unresolvedGoalValue ? { goalName: goalValueName! } : { goalValue: goalArg.value }) });
                continue;
              }
              if (candidateArg.value.kind === "var" && inferableValues.has(candidateArg.value.name)) {
                const prior = valueSubstitutions.get(candidateArg.value.name);
                if (prior ? exprKey(prior) !== exprKey(goalArg.value) : false) { matched = false; break; }
                if (!prior) valueSubstitutions.set(candidateArg.value.name, goalArg.value);
              } else if (exprKey(candidateArg.value) !== exprKey(goalArg.value)) { matched = false; break; }
            } else { matched = false; break; }
          }
        } else {
          matched = unifyTypePattern(candidateSearchType, type, typeSubstitutions, valueSubstitutions, inferableValues);
        }
        if (!matched) return undefined;

        const paramValues = new Map<string, IRExpr>();
        const pendingInstances = candidate.params.filter((param) => !param.isTypeParam && param.binderInfo === "instance");
        const pending = new Set(pendingInstances.map((param) => param.name));

        // Candidate prerequisites form a small constraint system. A prerequisite
        // whose type still contains an unresolved candidate parameter is stuck,
        // not failed: later prerequisites may infer that parameter via outParam,
        // semiOutParam, or default-instance fallback. Retry until no progress.
        while (pending.size > 0) {
          let progress = false;
          const stuck: string[] = [];
          for (const param of pendingInstances) {
            if (!pending.has(param.name)) continue;
            const expected = substituteType(param.type, typeSubstitutions, valueSubstitutions);
            const prebound = valueSubstitutions.get(param.name);
            if (prebound) {
              if (!this.sameTypeAtTransparency(prebound.type, expected, "instances")) {
                throw new ProofScriptError("PS2189", `Instance '${candidate.name}' inferred prerequisite '${param.name}' with type '${prebound.type.displayName}', expected '${expected.displayName}'.`);
              }
              paramValues.set(param.name, prebound);
              pending.delete(param.name);
              progress = true;
              continue;
            }
            const unresolvedCandidateTypes = new Set(
              candidate.params.filter((item) => item.isTypeParam && !typeSubstitutions.has(item.name)).map((item) => item.name),
            );
            const unresolvedCandidateValues = new Set(
              candidate.params.filter((item) => !item.isTypeParam && item.binderInfo !== "instance" && !valueSubstitutions.has(item.name)).map((item) => item.name),
            );
            try {
              const nested = this.synthesizeInstanceDetailed(expected, unresolvedCandidateTypes, session, new Set(), unresolvedCandidateValues);
              for (const [name, inferred] of nested.inferredTypes) {
                const prior = typeSubstitutions.get(name);
                if (prior && !sameType(prior, inferred)) throw new ProofScriptError("PS2142", `Conflicting instance-search inference for '${name}': '${prior.displayName}' vs '${inferred.displayName}'.`);
                typeSubstitutions.set(name, inferred);
              }
              for (const [name, inferred] of nested.inferredValues) {
                const prior = valueSubstitutions.get(name);
                if (prior && exprKey(prior) !== exprKey(inferred)) throw new ProofScriptError("PS2155", `Conflicting term-output inference for '${name}'.`);
                valueSubstitutions.set(name, inferred);
              }
              const refreshedExpected = substituteType(param.type, typeSubstitutions, valueSubstitutions);
              const nestedExpr = sameType(nested.expr.type, refreshedExpected) ? nested.expr : { ...nested.expr, type: refreshedExpected };
              paramValues.set(param.name, nestedExpr);
              valueSubstitutions.set(param.name, nestedExpr);
              pending.delete(param.name);
              progress = true;
            } catch (error) {
              const unresolvedHereTypes = [...typeVariablesIn(expected)].filter((name) => unresolvedCandidateTypes.has(name));
              const unresolvedHereValues = [...valueVariablesInType(expected)].filter((name) => unresolvedCandidateValues.has(name));
              if (unresolvedHereTypes.length === 0 && unresolvedHereValues.length === 0) throw error;
              stuck.push(`${param.name}: ${expected.displayName}`);
            }
          }
          if (!progress) {
            throw new ProofScriptError("PS2141", `Instance '${candidate.name}' has stuck prerequisite goal(s): ${stuck.join(", ")}. No later prerequisite made metavariable progress.`);
          }
        }

        // Non-instance term parameters must already be determined by head
        // unification. Search never fabricates arbitrary computational values.
        for (const param of candidate.params) {
          if (param.isTypeParam || param.binderInfo === "instance") continue;
          const inferred = valueSubstitutions.get(param.name);
          if (!inferred) throw new ProofScriptError("PS2146", `Instance '${candidate.name}' requires non-instance parameter '${param.name}' that search cannot synthesize.`);
          paramValues.set(param.name, inferred);
        }

        for (const param of candidate.params.filter((item) => item.isTypeParam)) {
          const actual = typeSubstitutions.get(param.name);
          if (!actual) throw new ProofScriptError("PS2145", `Instance '${candidate.name}' leaves type parameter '${param.name}' unresolved.`);
          paramValues.set(param.name, { kind: "type", value: actual, type: param.type });
        }

        const resultType = substituteType(candidate.resultType, typeSubstitutions, valueSubstitutions);
        for (const deferred of deferredOutputs) {
          const resultArg = resultType.args?.[deferred.index];
          if (!resultArg || resultArg.kind !== deferred.kind) throw new ProofScriptError("PS2148", `Instance '${candidate.name}' cannot determine deferred ${deferred.kind} output parameter at index ${deferred.index}.`);
          if (deferred.kind === "type" && resultArg.kind === "type") {
            if (deferred.goalName) {
              const prior = inferredGoalTypes.get(deferred.goalName);
              if (prior && !sameType(prior, resultArg.value)) throw new ProofScriptError("PS2149", `Conflicting output inference for '${deferred.goalName}'.`);
              inferredGoalTypes.set(deferred.goalName, resultArg.value);
            } else if (deferred.goalType && !sameType(deferred.goalType, resultArg.value)) {
              throw new ProofScriptError("PS2147", `Instance '${candidate.name}' determines output '${resultArg.value.displayName}', incompatible with fixed goal output '${deferred.goalType.displayName}'.`);
            }
          } else if (deferred.kind === "term" && resultArg.kind === "term") {
            if (deferred.goalName) {
              const prior = inferredGoalValues.get(deferred.goalName);
              if (prior && exprKey(prior) !== exprKey(resultArg.value)) throw new ProofScriptError("PS2156", `Conflicting term output inference for '${deferred.goalName}'.`);
              inferredGoalValues.set(deferred.goalName, resultArg.value);
            } else if (deferred.goalValue && exprKey(deferred.goalValue) !== exprKey(resultArg.value)) {
              throw new ProofScriptError("PS2157", `Instance '${candidate.name}' determines a term output incompatible with the fixed goal output.`);
            }
          }
        }
        const resolvedGoal = substituteType(type, inferredGoalTypes, inferredGoalValues);
        const originalResolvedGoal = substituteType(originalGoal, inferredGoalTypes, inferredGoalValues);
        if (!this.sameTypeAtTransparency(resultType, resolvedGoal, "instances")) throw new ProofScriptError("PS2147", `Instance '${candidate.name}' synthesized '${resultType.displayName}' instead of '${resolvedGoal.displayName}'.`);

        const args: IRExpr[] = [];
        const erasedArgs: boolean[] = [];
        const argumentNames: (string | null)[] = [];
        for (const param of candidate.params) {
          const value = paramValues.get(param.name);
          if (!value) continue;
          args.push(value);
          erasedArgs.push(param.isProofParam === true || param.isTypeParam === true || param.runtimeErased === true);
          argumentNames.push(param.name);
        }
        const derivedPayload = candidate.derived ? { ...candidate.derived, subject: substituteType(candidate.derived.subject, typeSubstitutions, valueSubstitutions) } : undefined;
        const expr: IRExpr = derivedPayload
          ? { kind: "op", op: "lean.derived.instance", args, payload: derivedPayload, type: originalResolvedGoal }
          : args.length === 0
            ? { kind: "var", name: candidate.name, type: originalResolvedGoal }
            : { kind: "call", callee: candidate.name, args, erasedArgs, argumentNames, ...(candidate.name.includes(".") ? { rootQualified: true } : {}), type: originalResolvedGoal };
        return { expr, inferredTypes: inferredGoalTypes, inferredValues: inferredGoalValues };
      };

      const runCandidates = (candidates: readonly InstanceCandidate[], allowDefaulting: boolean): InstanceSearchResult | undefined => {
        for (const candidate of candidates) {
          try {
            const result = tryCandidate(candidate, allowDefaulting);
            if (result) return result;
          } catch (error) {
            // A fixed outParam is deliberately ignored while selecting the
            // candidate. Once that candidate has otherwise succeeded, an
            // incompatible produced output is a committed mismatch rather than
            // a reason to reinterpret the output as an input and try a lower
            // candidate. semiOutParam differs because its known value was used
            // during head matching above.
            if (error instanceof ProofScriptError && ((error.code === "PS2147" && error.message.includes("fixed goal output")) || error.code === "PS2157")) throw error;
            failures.push(`${candidate.name}: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
        return undefined;
      };

      const ordinary = runCandidates(ordinaryCandidates, false);
      if (ordinary) { session.table.set(searchKey, ordinary); return ordinary; }

      // Lean's default-instance phase is relevant when ordinary synthesis is
      // stuck on unresolved type metavariables. Only explicitly attributed
      // candidates participate, ordered by default-instance priority.
      const goalVariables = typeVariablesIn(type);
      const canDefault = [...goalVariables].some((name) => outputGoalTypeNames.has(name)) || outputGoalValueNames.size > 0;
      if (canDefault && defaultCandidates.length > 0) {
        const fallback = runCandidates(defaultCandidates, true);
        if (fallback) { session.table.set(searchKey, fallback); return fallback; }
      }

      throw new ProofScriptError("PS2134", `Failed to synthesize instance '${type.displayName}'.${failures.length ? ` Candidate failures: ${failures.join(" | ")}` : ""}`);
    } finally {
      session.stack.pop();
      session.active.delete(searchKey);
    }
  }

  private coercionClassType(name: string, args: readonly IRTypeArgument[]): IRType {
    const family = this.registry.findTypeFamily(name);
    if (!family) throw new ProofScriptError("PS2150", `Coercion class '${name}' is not installed.`);
    return family.resolve(args);
  }

  private tryCoercionInstance(
    goal: IRType,
    outputNames: ReadonlySet<string>,
    session: InstanceSearchSession,
    excludedCandidates: ReadonlySet<string> = new Set(),
  ): InstanceSearchResult | undefined {
    try {
      return this.synthesizeInstanceDetailed(goal, outputNames, session, excludedCandidates);
    } catch (error) {
      if (error instanceof ProofScriptError && (error.code === "PS2134" || error.code === "PS2144")) return undefined;
      throw error;
    }
  }

  private instanceEvidenceHead(expr: IRExpr): string | undefined {
    if (expr.kind === "var") return expr.name;
    if (expr.kind === "call") return expr.callee;
    return undefined;
  }

  private coercionInstanceAlternatives(
    goal: IRType,
    outputNames: ReadonlySet<string>,
    session: InstanceSearchSession,
    max = 12,
  ): readonly InstanceSearchResult[] {
    const results: InstanceSearchResult[] = [];
    const excluded = new Set<string>();
    for (let index = 0; index < max; index += 1) {
      const result = this.tryCoercionInstance(goal, outputNames, session, excluded);
      if (!result) break;
      results.push(result);
      const head = this.instanceEvidenceHead(result.expr);
      if (!head || excluded.has(head)) break;
      excluded.add(head);
    }
    return results;
  }

  private inferForwardCoercions(
    className: "CoeHead" | "CoeOut",
    source: IRType,
    session: InstanceSearchSession,
    serial: { value: number },
  ): readonly { readonly target: IRType; readonly evidence: IRExpr }[] {
    const name = `__ps_coe_fwd_${++serial.value}`;
    const variable = makeTypeVariable(name, makeSortType("Type"));
    const goal = this.coercionClassType(className, [typeArgument(source), typeArgument(variable)]);
    return this.coercionInstanceAlternatives(goal, new Set([name]), session)
      .map((result) => ({ target: result.inferredTypes.get(name), evidence: result.expr }))
      .filter((item): item is { readonly target: IRType; readonly evidence: IRExpr } => item.target !== undefined);
  }

  private inferBackwardCoercions(
    className: "Coe" | "CoeTail",
    target: IRType,
    session: InstanceSearchSession,
    serial: { value: number },
  ): readonly { readonly source: IRType; readonly evidence: IRExpr }[] {
    const name = `__ps_coe_back_${++serial.value}`;
    const variable = makeTypeVariable(name, makeSortType("Type"));
    const goal = this.coercionClassType(className, [typeArgument(variable), typeArgument(target)]);
    return this.coercionInstanceAlternatives(goal, new Set([name]), session)
      .map((result) => ({ source: result.inferredTypes.get(name), evidence: result.expr }))
      .filter((item): item is { readonly source: IRType; readonly evidence: IRExpr } => item.source !== undefined);
  }

  private directCoercionStep(
    className: "Coe" | "CoeTail" | "CoeHead" | "CoeOut",
    source: IRType,
    target: IRType,
    session: InstanceSearchSession,
  ): IRExpr | undefined {
    const goal = this.coercionClassType(className, [typeArgument(source), typeArgument(target)]);
    return this.tryCoercionInstance(goal, new Set(), session)?.expr;
  }

  private solveCoeBackwards(
    source: IRType,
    target: IRType,
    session: InstanceSearchSession,
    serial: { value: number },
    depth = 0,
    seen: ReadonlySet<string> = new Set(),
  ): { readonly className: string; readonly source: IRType; readonly target: IRType; readonly evidence: IRExpr }[] | undefined {
    if (sameType(source, target)) return [];
    if (depth >= 12) return undefined;
    const key = `${typeKey(source)}=>${typeKey(target)}`;
    if (seen.has(key)) return undefined;
    const nextSeen = new Set(seen); nextSeen.add(key);
    const direct = this.directCoercionStep("Coe", source, target, session);
    if (direct) return [{ className: "Coe", source, target, evidence: direct }];
    for (const predecessor of this.inferBackwardCoercions("Coe", target, session, serial)) {
      if (sameType(predecessor.source, target)) continue;
      const prefix = this.solveCoeBackwards(source, predecessor.source, session, serial, depth + 1, nextSeen);
      if (prefix) return [...prefix, { className: "Coe", source: predecessor.source, target, evidence: predecessor.evidence }];
    }
    return undefined;
  }

  private solveRightCoercionChain(
    source: IRType,
    target: IRType,
    session: InstanceSearchSession,
    serial: { value: number },
  ): { readonly className: string; readonly source: IRType; readonly target: IRType; readonly evidence: IRExpr }[] | undefined {
    const ordinary = this.solveCoeBackwards(source, target, session, serial);
    if (ordinary) return ordinary;
    const directTail = this.directCoercionStep("CoeTail", source, target, session);
    if (directTail) return [{ className: "CoeTail", source, target, evidence: directTail }];
    for (const tail of this.inferBackwardCoercions("CoeTail", target, session, serial)) {
      const prefix = this.solveCoeBackwards(source, tail.source, session, serial);
      if (prefix) return [...prefix, { className: "CoeTail", source: tail.source, target, evidence: tail.evidence }];
    }
    return undefined;
  }

  private coerceExpressionToFunction(expr: IRExpr, depth = 0, seen: ReadonlySet<string> = new Set()): IRExpr {
    if (expr.type.form === "pi") return expr;
    if (depth > 8 || seen.has(typeKey(expr.type))) throw new ProofScriptError("PS2158", `No acyclic CoeFun path was found for '${expr.type.displayName}'.`);
    const nextSeen = new Set(seen); nextSeen.add(typeKey(expr.type));
    const family = this.registry.findTypeFamily("CoeFun");
    if (!family) throw new ProofScriptError("PS2158", `Value '${expr.type.displayName}' is not a function and CoeFun is not installed.`);
    const session: InstanceSearchSession = { active: new Set(), stack: [], table: new Map() };
    const gammaName = `__ps_coefun_gamma_${depth}_${this.instanceOrder + 1}`;
    const typeSort = makeSortType("Type");
    const gammaType = makePiType({ name: "a", binderInfo: "explicit" }, expr.type, typeSort);
    const gammaVar: IRExpr = { kind: "var", name: gammaName, type: gammaType };
    const goal = family.resolve([typeArgument(expr.type), termArgument(gammaVar)]);
    try {
      const synthesis = this.synthesizeInstanceDetailed(goal, new Set(), session, new Set(), new Set([gammaName]));
      const gamma = synthesis.inferredValues.get(gammaName);
      if (!gamma) throw new ProofScriptError("PS2159", `CoeFun instance for '${expr.type.displayName}' did not determine its function family.`);
      const gammaApplication: IRExpr = { kind: "apply", callee: gamma, args: [expr], type: typeSort };
      const target = substituteType(makeTypeTerm(gammaApplication), new Map(), new Map());
      const coerced: IRExpr = {
        kind: "op",
        op: "lean.coercion.fun",
        args: [expr, synthesis.expr, gamma],
        payload: { source: expr.type },
        type: target,
      };
      if (target.form === "pi") return coerced;
      return this.coerceExpressionToFunction(coerced, depth + 1, nextSeen);
    } catch (error) {
      if (!(error instanceof ProofScriptError) || !["PS2134", "PS2144", "PS2158", "PS2160"].includes(error.code)) throw error;
    }

    // Lean exposes CoeFun through CoeOut. Search the same forward segment before
    // trying CoeFun again so wrappers can first coerce to a callable carrier.
    const serial = { value: depth * 1000 };
    for (const out of this.inferForwardCoercions("CoeOut", expr.type, session, serial)) {
      if (sameType(out.target, expr.type)) continue;
      const throughOut: IRExpr = {
        kind: "op", op: "lean.coercion.apply", args: [expr, out.evidence],
        payload: { steps: [{ className: "CoeOut", source: expr.type, target: out.target }] }, type: out.target,
      };
      try { return this.coerceExpressionToFunction(throughOut, depth + 1, nextSeen); } catch (error) {
        if (!(error instanceof ProofScriptError) || !["PS2134", "PS2144", "PS2158", "PS2160"].includes(error.code)) throw error;
      }
    }
    throw new ProofScriptError("PS2160", `CoeFun/coe-out search for '${expr.type.displayName}' did not produce an applicable function type.`);
  }

  private coerceExpressionToSort(expr: IRExpr, depth = 0, seen: ReadonlySet<string> = new Set()): IRExpr {
    if (depth > 8 || seen.has(typeKey(expr.type))) throw new ProofScriptError("PS2161", `No acyclic CoeSort path was found for '${expr.type.displayName}'.`);
    const nextSeen = new Set(seen); nextSeen.add(typeKey(expr.type));
    const family = this.registry.findTypeFamily("CoeSort");
    if (!family) throw new ProofScriptError("PS2161", `Value '${expr.type.displayName}' cannot be used as a type because CoeSort is not installed.`);
    const session: InstanceSearchSession = { active: new Set(), stack: [], table: new Map() };
    const betaName = `__ps_coesort_beta_${depth}_${this.instanceOrder + 1}`;
    const betaVar = makeTypeVariable(betaName, makeSortType("Type"));
    const goal = family.resolve([typeArgument(expr.type), typeArgument(betaVar)]);
    try {
      const synthesis = this.synthesizeInstanceDetailed(goal, new Set([betaName]), session);
      const targetSort = synthesis.inferredTypes.get(betaName);
      if (!targetSort || !isSortType(targetSort)) {
        throw new ProofScriptError("PS2162", `CoeSort for '${expr.type.displayName}' did not determine a sort.`);
      }
      return {
        kind: "op",
        op: "lean.coercion.sort",
        args: [expr, synthesis.expr],
        payload: { source: expr.type, targetSort },
        type: targetSort,
      };
    } catch (error) {
      if (!(error instanceof ProofScriptError) || !["PS2134", "PS2144", "PS2162"].includes(error.code)) throw error;
    }

    // CoeSort is exposed to the forward CoeOut relation in Lean. Preserve the
    // same composition direction before trying the sort coercion again.
    const serial = { value: depth * 1000 + 500 };
    for (const out of this.inferForwardCoercions("CoeOut", expr.type, session, serial)) {
      if (sameType(out.target, expr.type)) continue;
      const throughOut: IRExpr = {
        kind: "op", op: "lean.coercion.apply", args: [expr, out.evidence],
        payload: { steps: [{ className: "CoeOut", source: expr.type, target: out.target }] }, type: out.target,
      };
      try { return this.coerceExpressionToSort(throughOut, depth + 1, nextSeen); } catch (error) {
        if (!(error instanceof ProofScriptError) || !["PS2134", "PS2144", "PS2161", "PS2162"].includes(error.code)) throw error;
      }
    }
    throw new ProofScriptError("PS2162", `CoeSort/coe-out search for '${expr.type.displayName}' did not determine a sort.`);
  }

  coerceExpression(expr: IRExpr, target: IRType): IRExpr {
    if (sameType(expr.type, target)) return expr;
    if (target.form === "pi") {
      try {
        const callable = this.coerceExpressionToFunction(expr);
        if (sameType(callable.type, target)) return callable;
        // CoeFun's γ is an outParam: once selected, a fixed expected function
        // type mismatch is committed rather than causing lower-candidate search.
        throw new ProofScriptError("PS2163", `CoeFun determines '${callable.type.displayName}', incompatible with fixed expected function type '${target.displayName}'.`);
      } catch (error) {
        if (!(error instanceof ProofScriptError) || !["PS2134", "PS2144", "PS2158", "PS2160"].includes(error.code)) throw error;
      }
    }
    if (isSortType(target)) {
      try {
        const asSort = this.coerceExpressionToSort(expr);
        if (sameType(asSort.type, target)) return asSort;
        throw new ProofScriptError("PS2164", `CoeSort determines '${asSort.type.displayName}', incompatible with fixed expected sort '${target.displayName}'.`);
      } catch (error) {
        if (!(error instanceof ProofScriptError) || !["PS2134", "PS2161", "PS2162"].includes(error.code)) throw error;
      }
    }
    if (!this.registry.findTypeFamily("Coe")) throw new ProofScriptError("PS2150", `No coercion framework is installed for '${expr.type.displayName}' → '${target.displayName}'.`);
    const session: InstanceSearchSession = { active: new Set(), stack: [], table: new Map() };
    const serial = { value: 0 };

    // CoeDep is exact and does not participate in transitive chaining.
    const depFamily = this.registry.findTypeFamily("CoeDep");
    if (depFamily) {
      const depGoal = depFamily.resolve([typeArgument(expr.type), termArgument(expr), typeArgument(target)]);
      const dep = this.tryCoercionInstance(depGoal, new Set(), session);
      if (dep) {
        return {
          kind: "op",
          op: "lean.coercion.apply",
          args: [expr, dep.expr],
          payload: { steps: [{ className: "CoeDep", source: expr.type, target, dependent: true }] },
          type: target,
        };
      }
    }

    type Step = { readonly className: string; readonly source: IRType; readonly target: IRType; readonly evidence: IRExpr };
    const leftStarts: { readonly type: IRType; readonly steps: Step[] }[] = [];
    for (const head of this.inferForwardCoercions("CoeHead", expr.type, session, serial)) {
      if (!sameType(head.target, expr.type)) leftStarts.push({
        type: head.target,
        steps: [{ className: "CoeHead", source: expr.type, target: head.target, evidence: head.evidence }],
      });
    }
    leftStarts.push({ type: expr.type, steps: [] });

    for (const start of leftStarts) {
      const queue: { readonly type: IRType; readonly steps: Step[] }[] = [start];
      const seen = new Set<string>();
      while (queue.length > 0) {
        const current = queue.shift()!;
        const key = typeKey(current.type);
        if (seen.has(key) || current.steps.length > 12) continue;
        seen.add(key);
        const right = this.solveRightCoercionChain(current.type, target, session, serial);
        if (right) {
          const steps = [...current.steps, ...right];
          return {
            kind: "op",
            op: "lean.coercion.apply",
            args: [expr, ...steps.map((step) => step.evidence)],
            payload: { steps: steps.map(({ evidence: _evidence, ...step }) => step) },
            type: target,
          };
        }
        for (const out of this.inferForwardCoercions("CoeOut", current.type, session, serial)) {
          if (sameType(out.target, current.type)) continue;
          queue.push({
            type: out.target,
            steps: [...current.steps, { className: "CoeOut", source: current.type, target: out.target, evidence: out.evidence }],
          });
        }
      }
    }
    throw new ProofScriptError("PS2151", `No admissible coercion chain was found for '${expr.type.displayName}' → '${target.displayName}'.`);
  }

  getSemanticInfo<T = unknown>(key: string): T | undefined { return this.registry.getSemanticInfo<T>(key); }

  setElaborationInfo(key: string, value: unknown): void { this.elaborationInfo.set(key, value); }

  getElaborationInfo<T = unknown>(key: string): T | undefined { return this.elaborationInfo.get(key) as T | undefined; }

  currentLocals(): ReadonlyMap<string, IRType> { return new Map(this.locals); }

  withLocals<T>(locals: ReadonlyMap<string, IRType>, fn: () => T): T {
    const previous = this.locals;
    this.locals = locals;
    try { return fn(); } finally { this.locals = previous; }
  }

  withLocal<T>(name: string, type: IRType, fn: () => T): T {
    const extended = new Map(this.locals);
    extended.set(name, type);
    return this.withLocals(extended, fn);
  }

  withInstanceLocals<T>(locals: ReadonlyMap<string, IRType>, fn: () => T): T {
    const previous = this.instanceLocals;
    this.instanceLocals = locals;
    try { return fn(); } finally { this.instanceLocals = previous; }
  }

  withTypeLocals<T>(locals: ReadonlyMap<string, IRType>, fn: () => T): T {
    const previous = this.typeLocals;
    this.typeLocals = locals;
    try { return fn(); } finally { this.typeLocals = previous; }
  }

  withTypeLocal<T>(name: string, type: IRType, fn: () => T): T {
    const extended = new Map(this.typeLocals);
    extended.set(name, type);
    return this.withTypeLocals(extended, fn);
  }

  elaborateClauses(
    clauses: readonly SurfaceClause[],
    params: ReadonlyMap<string, IRType>,
    resultType: IRType,
  ): readonly IRAnnotation[] {
    return clauses.map((clause) => {
      const rule = this.registry.declarationClauseElaborators.get(clause.owner);
      if (!rule) throw new ProofScriptError("PS2111", `No elaborator installed for declaration clause '${clause.owner}'.`);
      const locals = new Map(params);
      if (rule.scope === "params+result") locals.set("result", resultType);
      return this.withLocals(locals, () => rule.elaborate(clause, this, { params, resultType }));
    });
  }

  elaborateExpression(expr: SurfaceExpr, expected?: IRType): IRExpr {
    switch (expr.kind) {
      case "number": {
        const literals = this.registry.literalElaborators.get("number") ?? [];
        if (literals.length === 0) throw new ProofScriptError("PS2103", "No numeric-literal feature is installed.");
        const resolve = (name: string) => this.resolveType(name);
        const matching = literals.filter((literal) => literal.supports?.(expected, resolve) ?? true);
        if (matching.length === 0) throw new ProofScriptError("PS2202", `Numeric literal '${expr.text}' cannot inhabit '${expected?.displayName ?? "the requested type"}'.`);
        if (matching.length > 1) throw new ProofScriptError("PS2206", `Numeric literal '${expr.text}' has ambiguous plugin ownership${expected ? ` for '${expected.displayName}'` : ""}.`);
        const result = matching[0]!.elaborate(expr.text, expected, resolve);
        return this.fitExpected(result, expected);
      }
      case "string": {
        const literals = this.registry.literalElaborators.get("string") ?? [];
        if (literals.length === 0) throw new ProofScriptError("PS2104", "No string-literal feature is installed.");
        const resolve = (name: string) => this.resolveType(name);
        const matching = literals.filter((literal) => literal.supports?.(expected, resolve) ?? true);
        if (matching.length === 0) throw new ProofScriptError("PS2B01", `String literal ${expr.text} cannot inhabit '${expected?.displayName ?? "the requested type"}'.`);
        if (matching.length > 1) throw new ProofScriptError("PS2207", `String literal ${expr.text} has ambiguous plugin ownership${expected ? ` for '${expected.displayName}'` : ""}.`);
        const result = matching[0]!.elaborate(expr.text, expected, resolve);
        return this.fitExpected(result, expected);
      }
      case "identifier": {
        const valueType = this.locals.get(expr.name) ?? this.sectionValueLocals.get(expr.name);
        if (valueType) {
          return this.fitExpected({ kind: "var", name: expr.name, type: valueType }, expected);
        }
        const typeValue = this.typeLocals.get(expr.name) ?? this.sectionTypeLocals.get(expr.name);
        if (typeValue?.typeVarSort) {
          return this.fitExpected({ kind: "var", name: expr.name, type: typeValue.typeVarSort }, expected);
        }
        if (expected && isSortType(expected)) {
          try {
            const value = this.resolveType(expr.name);
            return { kind: "type", value, type: expected };
          } catch (error) {
            if (!(error instanceof ProofScriptError)) throw error;
          }
        }
        // Lean constants are referenced without an empty call suffix. Reuse the
        // ordinary function environment so both user declarations and plugin-
        // provided builtins with zero term parameters elaborate uniformly.
        const resolvedCallee = this.resolveFunctionName(expr.name);
        const signature = resolvedCallee ? this.functions.get(resolvedCallee) : undefined;
        if (resolvedCallee && signature && !signature.params.some((param) => param.binderInfo === "explicit" && !param.isAutoParam)) {
          const instantiated = this.elaborateFunctionApplication(resolvedCallee, [], [], signature, false, [], expected);
          const applied: IRExpr = signature.operation
            ? {
                kind: "op",
                op: signature.operation,
                args: instantiated.args,
                ...(signature.payload === undefined ? {} : { payload: signature.payload }),
                type: instantiated.resultType,
              }
            : {
                kind: "call",
                callee: resolvedCallee,
                args: instantiated.args,
                ...(instantiated.universeArgs.length ? { universeArgs: instantiated.universeArgs } : {}),
                ...(this.namespacedFunctions.has(resolvedCallee) ? { rootQualified: true } : {}),
                type: instantiated.resultType,
              };
          return this.fitExpected(applied, expected);
        }

        // Production P3: a named monomorphic runtime function may be used as a
        // first-class value.  Lower it by eta-expansion into the already
        // checked lambda/application fragment instead of introducing a new IR
        // or trusted Core construct.  Keep the first slice deliberately
        // fail-closed: polymorphic, implicit/instance/proof, auto, universe, or
        // genuinely dependent function signatures are not silently reified as
        // runtime closures here.
        if (resolvedCallee && signature && signature.params.length > 0) {
          const params = signature.params;
          const paramNames = new Set(params.map((param) => param.name));
          const dependent = params.some((param) => [...valueVariablesInType(param.type)].some((name) => paramNames.has(name)))
            || [...valueVariablesInType(signature.result)].some((name) => paramNames.has(name));
          const runtimeMonomorphic = (signature.universeParams?.length ?? 0) === 0
            && params.every((param) => !param.isTypeParam && !param.isProofParam && !param.isAutoParam && param.binderInfo === "explicit")
            && !dependent;
          if (runtimeMonomorphic) {
            const args: IRExpr[] = params.map((param) => ({ kind: "var", name: param.name, type: param.type }));
            const body: IRExpr = signature.operation
              ? {
                  kind: "op",
                  op: signature.operation,
                  args,
                  ...(signature.payload === undefined ? {} : { payload: signature.payload }),
                  type: signature.result,
                }
              : {
                  kind: "call",
                  callee: resolvedCallee,
                  args,
                  ...(this.namespacedFunctions.has(resolvedCallee) ? { rootQualified: true } : {}),
                  type: signature.result,
                };
            let lambdaType = signature.result;
            for (let index = params.length - 1; index >= 0; index -= 1) {
              const param = params[index]!;
              lambdaType = makePiType({ name: param.name, binderInfo: param.binderInfo }, param.type, lambdaType);
            }
            return this.fitExpected({ kind: "lambda", params, body, type: lambdaType }, expected);
          }
        }
        throw new ProofScriptError("PS2104", `Unknown local '${expr.name}'.`);
      }
      case "call": {
        const localCalleeType = this.locals.get(expr.callee) ?? this.sectionValueLocals.get(expr.callee);
        if (localCalleeType) {
          if ((expr.namedArgs?.length ?? 0) > 0) throw new ProofScriptError("PS2125", `Named arguments for local higher-order value '${expr.callee}' are not implemented in the v0.10 slice.`);
          let callee: IRExpr = { kind: "var", name: expr.callee, type: localCalleeType };
          if (callee.type.form !== "pi") callee = this.coerceExpressionToFunction(callee);
          const applied = this.elaborateLocalApplication(expr.callee, callee, expr.args);
          return this.fitExpected(applied, expected);
        }

        const intrinsic = this.registry.intrinsicSpecs.get(expr.callee);
        if (intrinsic) {
          if ((expr.namedArgs?.length ?? 0) > 0) throw new ProofScriptError("PS2126", `Named arguments for intrinsic '${expr.callee}' are not supported.`);
          if (intrinsic.params.length !== expr.args.length) throw new ProofScriptError("PS2105", `Intrinsic '${expr.callee}' expects ${intrinsic.params.length} arguments, got ${expr.args.length}.`);
          const paramTypes = intrinsic.params.map((name) => this.resolveType(name));
          const args = expr.args.map((arg, index) => this.elaborateExpression(arg, paramTypes[index]!));
          const resultType = this.resolveType(intrinsic.result);
          return this.fitExpected({
            kind: "op",
            op: intrinsic.operation,
            args,
            ...(intrinsic.payload === undefined ? {} : { payload: intrinsic.payload }),
            type: resultType,
          }, expected);
        }

        const resolvedCallee = this.resolveFunctionName(expr.callee);
        const signature = resolvedCallee ? this.functions.get(resolvedCallee) : undefined;
        if (!signature || !resolvedCallee) throw new ProofScriptError("PS2106", `Unknown function or intrinsic '${expr.callee}'.`);

        // Production P3: a zero-parameter global definition may itself return a
        // function value.  Surface syntax `f(x)` must then mean application of
        // that returned Pi-valued constant, not an attempt to feed `x` into the
        // declaration's (empty) binder list.  Materialize the zero-argument
        // global reference first and reuse the ordinary higher-order
        // application elaborator.  This introduces no new IR/Core primitive.
        if (signature.params.length === 0 && signature.result.form === "pi" && expr.args.length > 0) {
          if ((expr.namedArgs?.length ?? 0) > 0 || expr.explicitMode === true || (expr.universeArgs?.length ?? 0) > 0) {
            throw new ProofScriptError("PS2125", `Named/explicit/universe arguments for function-valued global '${expr.callee}' are not implemented in the P3 slice.`);
          }
          const zero = this.elaborateFunctionApplication(resolvedCallee, [], [], signature, false, [], undefined);
          let callee: IRExpr = signature.operation
            ? {
                kind: "op",
                op: signature.operation,
                args: zero.args,
                ...(signature.payload === undefined ? {} : { payload: signature.payload }),
                type: zero.resultType,
              }
            : {
                kind: "call",
                callee: resolvedCallee,
                args: zero.args,
                ...(zero.universeArgs.length ? { universeArgs: zero.universeArgs } : {}),
                ...(this.namespacedFunctions.has(resolvedCallee) ? { rootQualified: true } : {}),
                type: zero.resultType,
              };
          const applied = this.elaborateLocalApplication(resolvedCallee, callee, expr.args);
          return this.fitExpected(applied, expected);
        }

        const instantiated = this.elaborateFunctionApplication(resolvedCallee, expr.args, expr.namedArgs ?? [], signature, expr.explicitMode === true, expr.universeArgs ?? [], expected);
        const applied: IRExpr = signature.operation
          ? {
              kind: "op",
              op: signature.operation,
              args: instantiated.args,
              ...(signature.payload === undefined ? {} : { payload: signature.payload }),
              type: instantiated.resultType,
            }
          : {
              kind: "call",
              callee: resolvedCallee,
              args: instantiated.args,
              ...(instantiated.checkedArgs.length !== instantiated.args.length ? { checkedArgs: instantiated.checkedArgs } : {}),
              ...(instantiated.erasedArgs.some(Boolean) ? { erasedArgs: instantiated.erasedArgs } : {}),
              ...(instantiated.runtimeErasedArgs.some(Boolean) ? { runtimeErasedArgs: instantiated.runtimeErasedArgs } : {}),
              ...(instantiated.argumentNames.some((name) => name !== null) ? { argumentNames: instantiated.argumentNames } : {}),
              ...(expr.explicitMode ? { explicitMode: true } : {}),
              ...(instantiated.universeArgs.length ? { universeArgs: instantiated.universeArgs } : {}),
              ...(this.namespacedFunctions.has(resolvedCallee) ? { rootQualified: true } : {}),
              type: instantiated.resultType,
            };
        return this.fitExpected(applied, expected);
      }
      case "lambda": {
        const typeLocals = new Map(this.typeLocals);
        const valueLocals = new Map(this.locals);
        const params: IRParam[] = [];
        for (const surfaceParam of expr.params) {
          const type = this.withTypeLocals(typeLocals, () => this.withLocals(valueLocals, () => this.resolveTypeExpression(surfaceParam.type)));
          const isTypeParam = isSortType(type);
          const param: IRParam = {
            name: surfaceParam.name,
            type,
            binderInfo: surfaceParam.binderInfo,
            ...(isTypeParam ? { isTypeParam: true } : {}),
          };
          params.push(param);
          if (isTypeParam) typeLocals.set(param.name, makeTypeVariable(param.name, type));
          else valueLocals.set(param.name, type);
        }
        const expectedBody = this.lambdaExpectedBody(expected, params);
        const body = this.withTypeLocals(typeLocals, () => this.withLocals(valueLocals, () => this.elaborateExpression(expr.body, expectedBody)));
        let lambdaType = body.type;
        for (let index = params.length - 1; index >= 0; index -= 1) {
          const param = params[index]!;
          lambdaType = makePiType({ name: param.name, binderInfo: param.binderInfo }, param.type, lambdaType);
        }
        return this.fitExpected({ kind: "lambda", params, body, type: lambdaType }, expected);
      }
      case "quantifier": {
        const prop = this.resolveType("Prop");
        const typeLocals = new Map(this.typeLocals);
        const valueLocals = new Map(this.locals);
        const params: IRParam[] = [];
        for (const surfaceParam of expr.params) {
          const type = this.withTypeLocals(typeLocals, () => this.withLocals(valueLocals, () => this.resolveTypeExpression(surfaceParam.type)));
          const isTypeParam = isSortType(type);
          const param: IRParam = {
            name: surfaceParam.name,
            type,
            binderInfo: surfaceParam.binderInfo,
            ...(isTypeParam ? { isTypeParam: true } : {}),
          };
          params.push(param);
          if (isTypeParam) typeLocals.set(param.name, makeTypeVariable(param.name, type));
          else valueLocals.set(param.name, type);
        }
        const body = this.withTypeLocals(typeLocals, () => this.withLocals(valueLocals, () => this.elaborateExpression(expr.body, prop)));
        return this.fitExpected({ kind: "quantifier", quantifier: expr.quantifier, params, body, type: prop }, expected);
      }
      case "binary": {
        const rule = this.registry.binaryElaborators.get(expr.operator);
        if (!rule) throw new ProofScriptError("PS2108", `No semantic feature owns operator '${expr.operator}'.`);
        if (rule.elaborateSurface) {
          const result = rule.elaborateSurface(expr.left, expr.right, expected, this);
          return this.fitExpected(result, expected);
        }
        const left = this.elaborateExpression(expr.left);
        const right = this.elaborateExpression(expr.right, left.type);
        const result = rule.elaborate(left, right, expected, (name) => this.resolveType(name), this);
        return this.fitExpected(result, expected);
      }
      case "extension": {
        const rule = this.registry.expressionElaborators.get(expr.owner);
        if (!rule) throw new ProofScriptError("PS2110", `No elaborator installed for expression extension '${expr.owner}'.`);
        const result = rule.elaborate(expr, expected, this);
        return this.fitExpected(result, expected);
      }
    }
  }

  private elaborateLocalApplication(name: string, callee: IRExpr, sourceArgs: readonly SurfaceExpr[]): IRExpr {
    let currentType = callee.type;
    const args: IRExpr[] = [];
    for (let index = 0; index < sourceArgs.length; index += 1) {
      if (currentType.form !== "pi" || !currentType.domain || !currentType.codomain || !currentType.binder) {
        throw new ProofScriptError("PS2123", `Local '${name}' is not applicable to ${sourceArgs.length} argument(s).`);
      }
      if (currentType.binder.binderInfo !== "explicit") {
        throw new ProofScriptError("PS2124", `Local higher-order application of ${currentType.binder.binderInfo} binder '${currentType.binder.name}' is not implemented in the v0.10 slice.`);
      }
      const arg = this.elaborateExpression(sourceArgs[index]!, currentType.domain);
      args.push(arg);
      currentType = substituteType(currentType.codomain, new Map(), new Map([[currentType.binder.name, arg]]));
    }
    return { kind: "apply", callee, args, type: currentType };
  }

  private lambdaExpectedBody(expected: IRType | undefined, params: readonly IRParam[]): IRType | undefined {
    if (!expected) return undefined;
    let current: IRType = expected;
    for (const param of params) {
      if (current.form !== "pi" || !current.domain || !current.codomain || !current.binder) return undefined;
      const mode: TransparencyMode = param.binderInfo === "explicit" ? "default" : "implicit";
      if (current.binder.binderInfo !== param.binderInfo || !this.sameTypeAtTransparency(current.domain, param.type, mode)) return undefined;
      current = current.codomain;
    }
    return current;
  }

  private elaborateFunctionApplication(
    name: string,
    sourceArgs: readonly SurfaceExpr[],
    namedArgs: readonly { readonly name: string; readonly value: SurfaceExpr }[],
    signature: FunctionSignature,
    explicitMode: boolean,
    surfaceUniverseArgs: readonly SurfaceUniverseLevel[],
    expectedResult?: IRType,
  ): {
    readonly args: readonly IRExpr[];
    readonly checkedArgs: readonly IRExpr[];
    readonly erasedArgs: readonly boolean[];
    readonly runtimeErasedArgs: readonly boolean[];
    readonly argumentNames: readonly (string | null)[];
    readonly universeArgs: readonly IRUniverseLevel[];
    readonly resultType: IRType;
  } {
    const typeSubstitutions = new Map<string, IRType>();
    const valueSubstitutions = new Map<string, IRExpr>();
    const instanceSearchSession: InstanceSearchSession = { active: new Set(), stack: [], table: new Map() };
    const universeArgs = surfaceUniverseArgs.map((level) => this.resolveUniverseLevel(level));
    const universeParams = signature.universeParams ?? [];
    if (universeArgs.length > 0 && universeArgs.length !== universeParams.length) {
      throw new ProofScriptError("PS2132", `Function '${name}' exposes ${universeParams.length} universe parameter(s), but ${universeArgs.length} explicit universe argument(s) were supplied.`);
    }
    const universeSubstitutions = new Map<string, IRUniverseLevel>();
    universeArgs.forEach((level, index) => universeSubstitutions.set(universeParams[index]!, level));

    const params = signature.params.map((param) => ({
      ...param,
      type: substituteUniversesInType(param.type, universeSubstitutions),
      ...(param.defaultValue ? { defaultValue: substituteUniversesInExpr(param.defaultValue, universeSubstitutions) } : {}),
    }));
    const result = substituteUniversesInType(signature.result, universeSubstitutions);

    const positionalParams = explicitMode
      ? params
      : params.filter((param) => param.binderInfo === "explicit" && !param.isAutoParam);
    if (sourceArgs.length > positionalParams.length) {
      throw new ProofScriptError("PS2107", `Function '${name}' accepts at most ${positionalParams.length} positional argument(s) in this application mode, got ${sourceArgs.length}.`);
    }

    const supplied = new Map<string, { readonly source: SurfaceExpr; readonly named: boolean }>();
    sourceArgs.forEach((arg, index) => supplied.set(positionalParams[index]!.name, { source: arg, named: false }));
    for (const named of namedArgs) {
      const param = params.find((item) => item.name === named.name);
      if (!param) throw new ProofScriptError("PS2127", `Function '${name}' has no parameter named '${named.name}'.`);
      if (supplied.has(named.name)) throw new ProofScriptError("PS2129", `Argument '${named.name}' of '${name}' was supplied more than once.`);
      supplied.set(named.name, { source: named.value, named: true });
    }

    if (explicitMode) {
      const missing = params.find((param) => !supplied.has(param.name) && !param.defaultValue);
      if (missing) throw new ProofScriptError("PS2133", `Explicit application '@${name}' requires exposed binder '${missing.name}' to be supplied positionally in the v0.10 slice.`);
    }

    const inferableValueNames = new Set(
      params.filter((param) => !param.isTypeParam && (param.binderInfo === "implicit" || param.binderInfo === "strictImplicit")).map((param) => param.name),
    );

    // Lean application elaboration can infer omitted generic parameters from
    // the expected result type (for example the result carrier of EIO.throw).
    // Probe on temporary maps so a non-matching expected type does not leave
    // partial metavariable assignments behind; ordinary fitExpected/coercion
    // handling remains authoritative if the result shape is unrelated.
    if (expectedResult) {
      const trialTypes = new Map(typeSubstitutions);
      const trialValues = new Map(valueSubstitutions);
      const trialUniverses = new Map(universeSubstitutions);
      const resultPattern = this.reduceTypeAtTransparency(substituteUniversesInType(result, trialUniverses), "default");
      const expectedPattern = this.reduceTypeAtTransparency(expectedResult, "default");
      if (unifyTypePattern(resultPattern, expectedPattern, trialTypes, trialValues, inferableValueNames, trialUniverses)) {
        typeSubstitutions.clear(); for (const [key, value] of trialTypes) typeSubstitutions.set(key, value);
        valueSubstitutions.clear(); for (const [key, value] of trialValues) valueSubstitutions.set(key, value);
        universeSubstitutions.clear(); for (const [key, value] of trialUniverses) universeSubstitutions.set(key, value);
      }
    }
    const elaborated = new Map<string, IRExpr>();

    // First elaborate arguments that the source explicitly supplied. Later
    // explicit arguments can infer omitted implicit type/value binders through
    // dependent expected-type patterns such as x : Fin(n).
    for (const param of params) {
      const suppliedArg = supplied.get(param.name);
      if (!suppliedArg) continue;
      const parameterType = substituteUniversesInType(substituteType(param.type, typeSubstitutions, valueSubstitutions), universeSubstitutions);
      if (param.isTypeParam) {
        const actualType = this.resolveTypeExpression({ kind: "term", expr: suppliedArg.source });
        typeSubstitutions.set(param.name, actualType);
        // A type-valued binder may also occur as a term index of a dependent
        // family.  The canonical WaveE case is P : Prop followed by
        // [d : Decidable P].  `P` is a type parameter to the application, but
        // Decidable stores the proposition as a term argument.  Once an
        // explicit proposition has elaborated to a type-valued term, expose
        // that same checked term to value-level dependent substitution before
        // instance search.  Keep this deliberately narrow: ordinary nominal
        // Type arguments have no term payload and are unaffected.
        if (actualType.form === "term" && actualType.term) {
          valueSubstitutions.set(param.name, actualType.term);
        }
        elaborated.set(param.name, { kind: "type", value: actualType, type: parameterType });
        continue;
      }

      const comparisonMode: TransparencyMode = param.binderInfo === "explicit" ? "default" : "implicit";
      const matchParameterType = this.reduceTypeAtTransparency(parameterType, comparisonMode);
      const expected = containsTypeVariable(matchParameterType) || inferableValueNames.size > 0 ? undefined : matchParameterType;
      const arg = this.elaborateExpression(suppliedArg.source, expected);
      const matchArgType = this.reduceTypeAtTransparency(arg.type, comparisonMode);
      if (!unifyTypePattern(matchParameterType, matchArgType, typeSubstitutions, valueSubstitutions, inferableValueNames, universeSubstitutions)) {
        throw new ProofScriptError(
          "PS2114",
          `Argument '${param.name}' of '${name}' has type '${arg.type.displayName}', incompatible with '${parameterType.displayName}'.`,
        );
      }
      const nowExpected = substituteUniversesInType(substituteType(param.type, typeSubstitutions, valueSubstitutions), universeSubstitutions);
      if (!containsTypeVariable(nowExpected) && !this.sameTypeAtTransparency(nowExpected, arg.type, comparisonMode)) {
        throw new ProofScriptError(
          "PS2114",
          `Argument '${param.name}' of '${name}' has type '${arg.type.displayName}', expected '${nowExpected.displayName}'.`,
        );
      }
      elaborated.set(param.name, arg);
      valueSubstitutions.set(param.name, arg);
    }

    // Do not reject unresolved implicit type parameters yet: an instance
    // argument may determine them through outParam/semiOutParam search.
    for (const param of params.filter((item) => item.isTypeParam && item.binderInfo === "explicit")) {
      if (!typeSubstitutions.has(param.name)) {
        throw new ProofScriptError("PS2115", `Could not infer explicit Type-valued parameter '${param.name}' when applying '${name}'.`);
      }
    }

    // Materialize omitted defaults and dependent implicit values after the
    // explicit arguments have contributed inference constraints.
    for (const param of params) {
      if (elaborated.has(param.name) || param.isTypeParam) continue;
      if (param.defaultValue) {
        const defaultValue = substituteExpr(param.defaultValue, typeSubstitutions, valueSubstitutions);
        elaborated.set(param.name, defaultValue);
        valueSubstitutions.set(param.name, defaultValue);
        continue;
      }
      if (param.isAutoParam) continue;
      const inferred = valueSubstitutions.get(param.name);
      if (inferred && (param.binderInfo === "implicit" || param.binderInfo === "strictImplicit")) {
        elaborated.set(param.name, inferred);
        continue;
      }
      if (param.binderInfo === "instance") {
        const unresolvedTypeNames = new Set(
          params.filter((item) => item.isTypeParam && !typeSubstitutions.has(item.name)).map((item) => item.name),
        );
        const unresolvedValueNames = new Set(
          params.filter((item) => !item.isTypeParam && (item.binderInfo === "implicit" || item.binderInfo === "strictImplicit") && !valueSubstitutions.has(item.name)).map((item) => item.name),
        );
        const synthesis = this.synthesizeInstanceDetailed(
          substituteUniversesInType(substituteType(param.type, typeSubstitutions, valueSubstitutions), universeSubstitutions),
          unresolvedTypeNames,
          instanceSearchSession,
          new Set(),
          unresolvedValueNames,
        );
        for (const [typeName, inferred] of synthesis.inferredTypes) typeSubstitutions.set(typeName, inferred);
        for (const [valueName, inferred] of synthesis.inferredValues) valueSubstitutions.set(valueName, inferred);
        const instance = synthesis.expr;
        elaborated.set(param.name, instance);
        valueSubstitutions.set(param.name, instance);
        continue;
      }
      if (param.binderInfo === "implicit" || param.binderInfo === "strictImplicit") {
        // A later instance binder may infer this value through a term-valued
        // outParam/semiOutParam. Keep it pending until all instance binders
        // have had an opportunity to contribute metavariable assignments.
        continue;
      }
      throw new ProofScriptError("PS2107", `Function '${name}' is missing required explicit argument '${param.name}'.`);
    }

    // Materialize implicit value binders after instance synthesis. This is the
    // value-level analogue of delaying implicit Type parameters until outParam
    // search has run (for example n inferred from [Pick n]).
    for (const param of params) {
      if (param.isTypeParam || elaborated.has(param.name)) continue;
      if (param.binderInfo !== "implicit" && param.binderInfo !== "strictImplicit") continue;
      const inferred = valueSubstitutions.get(param.name);
      if (!inferred) {
        throw new ProofScriptError("PS2112", `Could not infer omitted ${param.binderInfo} value binder '${param.name}' when applying '${name}'.`);
      }
      elaborated.set(param.name, inferred);
    }

    for (const param of params.filter((item) => item.isTypeParam)) {
      if (!typeSubstitutions.has(param.name)) {
        throw new ProofScriptError("PS2115", `Could not infer implicit type parameter '${param.name}' when applying '${name}'.`);
      }
    }

    // Keep the historical runtime/backend-facing argument list stable, but also
    // retain a full dependent application spine for independently checked Core.
    // The checked spine materializes omitted inferred Type-valued binders in their
    // original binder order so later instance/value arguments cannot shift left.
    const checkedArgs: IRExpr[] = [];
    for (const param of params) {
      const value = elaborated.get(param.name);
      if (value) {
        checkedArgs.push(value);
        continue;
      }
      if (param.isTypeParam) {
        const inferredType = typeSubstitutions.get(param.name);
        if (!inferredType) throw new ProofScriptError("PS2115", `Could not infer implicit type parameter '${param.name}' when applying '${name}'.`);
        const binderType = substituteUniversesInType(substituteType(param.type, typeSubstitutions, valueSubstitutions), universeSubstitutions);
        checkedArgs.push({ kind: "type", value: inferredType, type: binderType });
      }
    }

    const args: IRExpr[] = [];
    const erasedArgs: boolean[] = [];
    const runtimeErasedArgs: boolean[] = [];
    const argumentNames: (string | null)[] = [];
    for (const param of params) {
      const value = elaborated.get(param.name);
      if (!value) continue; // omitted autoParam is intentionally left for Lean elaboration
      const mustName = !explicitMode && param.binderInfo !== "explicit";
      args.push(value);
      erasedArgs.push(param.isProofParam === true || param.isTypeParam === true || param.runtimeErased === true);
      runtimeErasedArgs.push(param.runtimeErased === true);
      argumentNames.push(mustName ? param.name : null);
    }

    const resultType = substituteUniversesInType(substituteType(result, typeSubstitutions, valueSubstitutions), universeSubstitutions);
    // Every callee type parameter has already been required to have a substitution
    // above. Any remaining type-variable nodes therefore belong to the caller's
    // rigid context (for example A in a polymorphic caller), not to an unsolved
    // application metavariable.
    return { args, checkedArgs, erasedArgs, runtimeErasedArgs, argumentNames, universeArgs, resultType };
  }

  private fitExpected(expr: IRExpr, expected: IRType | undefined): IRExpr {
    if (!expected || this.sameTypeAtTransparency(expr.type, expected, "default")) return expected && !sameType(expr.type, expected) ? { ...expr, type: expected } : expr;
    try {
      return this.coerceExpression(expr, expected);
    } catch (error) {
      if (error instanceof ProofScriptError && (error.code === "PS2134" || error.code === "PS2150" || error.code === "PS2151")) {
        throw new ProofScriptError("PS2109", `Type mismatch: expected '${expected.displayName}', got '${expr.type.displayName}', and no admissible coercion was found.`);
      }
      throw error;
    }
  }
}
