import { ProofScriptError } from "./errors.js";
import type {
  BinaryElaborator,
  DeclarationClauseElaborator,
  DeclarationClauseSyntax,
  DeclarationElaborator,
  DeclarationSyntax,
  DeclarationPrefixSyntax,
  ExpressionElaborator,
  ExpressionSyntax,
  FeatureRegistryApi,
  ReducibleTypeFamilyReducer,
  InfixSyntax,
  IntrinsicSpec,
  LiteralElaborator,
  ProofScriptPlugin,
  SemanticInterfaceCodec,
} from "./plugin-api.js";
import type {
  ClassDescriptor,
  InstanceCandidate,
  DeclarationLowering,
  ExprLowering,
  FunctionSignature,
  IRType,
  IROperationSpec,
  LeanAnnotationLowering,
  LeanDeclarationLowering,
  LeanDefBinderContributor,
  LeanEngineSpec,
  LeanModuleResource,
  RegistryView,
  TargetSpec,
  TypeFamilyResolver,
  IRTypeArgument,
  TypeLowering,
  VerificationDescriptor,
  OperationDomain,
} from "./model.js";

interface RegisteredTarget {
  readonly spec: TargetSpec;
  readonly capabilities: Set<string>;
}

export class Registry implements FeatureRegistryApi, RegistryView {
  readonly declarationSyntax = new Map<string, DeclarationSyntax>();
  readonly declarationPrefixSyntax = new Map<string, DeclarationPrefixSyntax>();
  readonly declarationClauseSyntax = new Map<string, DeclarationClauseSyntax>();
  readonly expressionSyntax = new Map<string, ExpressionSyntax>();
  readonly infixSyntax = new Map<string, InfixSyntax>();
  readonly declarationElaborators = new Map<string, DeclarationElaborator>();
  readonly declarationClauseElaborators = new Map<string, DeclarationClauseElaborator>();
  readonly expressionElaborators = new Map<string, ExpressionElaborator>();
  readonly intrinsicSpecs = new Map<string, IntrinsicSpec>();
  readonly binaryElaborators = new Map<string, BinaryElaborator>();
  readonly literalElaborators = new Map<string, LiteralElaborator[]>();

  private readonly plugins = new Map<string, ProofScriptPlugin>();
  private readonly pluginProvenance = new Map<string, { readonly specifier: string; readonly resolvedEntry?: string; readonly entrySha256?: string }>();
  private readonly types = new Map<string, IRType>();
  private readonly typeFamilies = new Map<string, TypeFamilyResolver>();
  private readonly reducibleTypeFamilies = new Map<string, ReducibleTypeFamilyReducer>();
  private readonly builtinFunctions = new Map<string, FunctionSignature>();
  private readonly builtinClasses = new Map<string, ClassDescriptor>();
  private readonly builtinInstances = new Map<string, Omit<InstanceCandidate, "declarationOrder">>();
  private readonly semanticInfo = new Map<string, unknown>();
  private readonly semanticInterfaceCodecs = new Map<string, { readonly codec: SemanticInterfaceCodec; readonly pluginId: string; readonly pluginVersion: string }>();
  private installingPlugin: ProofScriptPlugin | undefined;
  private readonly operations = new Map<string, IROperationSpec>();
  private readonly targets = new Map<string, RegisteredTarget>();
  private readonly targetTypes = new Map<string, Map<string, TypeLowering>>();
  private readonly targetTypeFamilies = new Map<string, Map<string, TypeLowering>>();
  private readonly targetExprs = new Map<string, Map<string, ExprLowering>>();
  private readonly targetDeclarations = new Map<string, Map<string, DeclarationLowering>>();
  private readonly leanTypes = new Map<string, TypeLowering>();
  private readonly leanTypeFamilies = new Map<string, TypeLowering>();
  private readonly leanExprs = new Map<string, ExprLowering>();
  private readonly leanDeclarations = new Map<string, LeanDeclarationLowering>();
  private readonly leanAnnotations = new Map<string, LeanAnnotationLowering>();
  private readonly leanDefBinderContributors: LeanDefBinderContributor[] = [];
  private readonly leanPrelude: string[] = [];
  private readonly leanModules = new Map<string, LeanModuleResource>();
  private leanEngine: LeanEngineSpec | undefined;

  install(plugin: ProofScriptPlugin): void {
    if (this.plugins.has(plugin.id)) throw new ProofScriptError("PS1001", `Plugin '${plugin.id}' is already installed.`);
    for (const dependency of plugin.requires ?? []) {
      if (!this.plugins.has(dependency)) {
        throw new ProofScriptError("PS1002", `Plugin '${plugin.id}' requires '${dependency}', which must be installed first.`);
      }
    }
    const previousInstalling = this.installingPlugin;
    this.installingPlugin = plugin;
    try { plugin.setup(this); } finally { this.installingPlugin = previousInstalling; }
    this.plugins.set(plugin.id, plugin);
  }

  installedPluginIds(): readonly string[] { return [...this.plugins.keys()]; }

  installedPlugins(): readonly {
    id: string;
    version: string;
    kind: ProofScriptPlugin["kind"];
    specifier?: string;
    entrySha256?: string;
  }[] {
    return [...this.plugins.values()].map((plugin) => {
      const provenance = this.pluginProvenance.get(plugin.id);
      return {
        id: plugin.id,
        version: plugin.version,
        kind: plugin.kind,
        ...(provenance?.specifier === undefined ? {} : { specifier: provenance.specifier }),
        ...(provenance?.entrySha256 === undefined ? {} : { entrySha256: provenance.entrySha256 }),
      };
    });
  }

  recordPluginProvenance(
    id: string,
    provenance: { readonly specifier: string; readonly resolvedEntry?: string; readonly entrySha256?: string },
  ): void {
    this.pluginProvenance.set(id, provenance);
  }

  registerType(id: string, displayName = id, family?: string): void {
    this.assertFree(this.types, id, "type");
    this.types.set(id, { form: "nominal", id, displayName, ...(family === undefined ? {} : { family }) });
  }

  registerTypeValue(type: IRType): void {
    this.assertFree(this.types, type.displayName, "type");
    this.types.set(type.displayName, type);
  }

  registerTypeFamily(name: string, resolver: TypeFamilyResolver): void {
    this.assertFree(this.typeFamilies, name, "type family");
    this.typeFamilies.set(name, resolver);
  }

  registerReducibleTypeFamily(family: string, reducer: ReducibleTypeFamilyReducer): void {
    this.assertFree(this.reducibleTypeFamilies, family, "reducible type family");
    this.reducibleTypeFamilies.set(family, reducer);
  }

  findReducibleTypeFamily(family: string): ReducibleTypeFamilyReducer | undefined {
    return this.reducibleTypeFamilies.get(family);
  }

  registerBuiltinFunction(name: string, signature: FunctionSignature): void {
    this.assertFree(this.builtinFunctions, name, "builtin function");
    this.builtinFunctions.set(name, signature);
  }

  getBuiltinFunctions(): readonly (readonly [string, FunctionSignature])[] {
    return [...this.builtinFunctions.entries()];
  }

  registerBuiltinClass(descriptor: ClassDescriptor): void {
    this.assertFree(this.builtinClasses, descriptor.name, "builtin class");
    this.builtinClasses.set(descriptor.name, descriptor);
  }

  getBuiltinClasses(): readonly ClassDescriptor[] { return [...this.builtinClasses.values()]; }

  registerBuiltinInstance(candidate: Omit<InstanceCandidate, "declarationOrder">): void {
    this.assertFree(this.builtinInstances, candidate.name, "builtin instance");
    this.builtinInstances.set(candidate.name, candidate);
  }

  getBuiltinInstances(): readonly Omit<InstanceCandidate, "declarationOrder">[] { return [...this.builtinInstances.values()]; }

  registerSemanticInfo(key: string, value: unknown): void {
    this.assertFree(this.semanticInfo, key, "semantic metadata");
    this.semanticInfo.set(key, value);
  }

  registerSemanticInterfaceCodec(codec: SemanticInterfaceCodec): void {
    const owner = this.installingPlugin;
    if (!owner) throw new ProofScriptError("PS1010", `Semantic interface codec '${codec.id}' must be registered while installing a plugin.`);
    if (this.semanticInterfaceCodecs.has(codec.id)) throw new ProofScriptError("PS1011", `Semantic interface codec '${codec.id}' is already registered.`);
    this.semanticInterfaceCodecs.set(codec.id, { codec, pluginId: owner.id, pluginVersion: owner.version });
  }

  findSemanticInterfaceCodecs(key: string, value: unknown) {
    return [...this.semanticInterfaceCodecs.values()].filter((item) => item.codec.matches(key, value));
  }

  getSemanticInterfaceCodec(id: string) { return this.semanticInterfaceCodecs.get(id); }

  getSemanticInfo<T = unknown>(key: string): T | undefined { return this.semanticInfo.get(key) as T | undefined; }

  registerDeclarationSyntax(syntax: DeclarationSyntax): void {
    this.assertFree(this.declarationSyntax, syntax.keyword, "declaration syntax");
    this.declarationSyntax.set(syntax.keyword, syntax);
  }

  registerDeclarationPrefixSyntax(syntax: DeclarationPrefixSyntax): void {
    this.assertFree(this.declarationPrefixSyntax, syntax.keyword, "declaration-prefix syntax");
    this.declarationPrefixSyntax.set(syntax.keyword, syntax);
  }

  registerDeclarationClauseSyntax(syntax: DeclarationClauseSyntax): void {
    this.assertFree(this.declarationClauseSyntax, syntax.keyword, "declaration clause syntax");
    this.declarationClauseSyntax.set(syntax.keyword, syntax);
  }

  registerExpressionSyntax(syntax: ExpressionSyntax): void {
    this.assertFree(this.expressionSyntax, syntax.keyword, "expression syntax");
    this.expressionSyntax.set(syntax.keyword, syntax);
  }

  registerInfixSyntax(syntax: InfixSyntax): void {
    this.assertFree(this.infixSyntax, syntax.operator, "infix syntax");
    this.infixSyntax.set(syntax.operator, syntax);
  }

  registerDeclarationElaborator(elaborator: DeclarationElaborator): void {
    this.assertFree(this.declarationElaborators, elaborator.kind, "declaration elaborator");
    this.declarationElaborators.set(elaborator.kind, elaborator);
  }

  registerDeclarationClauseElaborator(elaborator: DeclarationClauseElaborator): void {
    this.assertFree(this.declarationClauseElaborators, elaborator.owner, "declaration clause elaborator");
    this.declarationClauseElaborators.set(elaborator.owner, elaborator);
  }

  registerExpressionElaborator(elaborator: ExpressionElaborator): void {
    this.assertFree(this.expressionElaborators, elaborator.owner, "expression elaborator");
    this.expressionElaborators.set(elaborator.owner, elaborator);
  }

  registerIntrinsic(spec: IntrinsicSpec): void {
    this.assertFree(this.intrinsicSpecs, spec.name, "intrinsic");
    this.intrinsicSpecs.set(spec.name, spec);
  }

  registerLiteralElaborator(elaborator: LiteralElaborator): void {
    const existing = this.literalElaborators.get(elaborator.literalKind) ?? [];
    this.literalElaborators.set(elaborator.literalKind, [...existing, elaborator]);
  }

  registerBinaryElaborator(elaborator: BinaryElaborator): void {
    this.assertFree(this.binaryElaborators, elaborator.operator, "binary elaborator");
    this.binaryElaborators.set(elaborator.operator, elaborator);
  }

  registerOperation(id: string, options: { requiredCapabilities?: readonly string[]; verification: VerificationDescriptor; domain?: OperationDomain }): void {
    this.assertFree(this.operations, id, "IR operation");
    this.operations.set(id, {
      id,
      requiredCapabilities: options.requiredCapabilities ?? [],
      verification: options.verification,
      domain: options.domain ?? "runtime",
    });
  }

  registerTarget(target: TargetSpec): void {
    this.assertFree(this.targets, target.id, "target");
    this.targets.set(target.id, { spec: target, capabilities: new Set(target.capabilities) });
  }

  addTargetCapability(target: string, capability: string): void {
    const entry = this.targets.get(target);
    if (!entry) throw new ProofScriptError("PS1003", `Cannot add capability to unknown target '${target}'.`);
    entry.capabilities.add(capability);
  }

  registerTargetTypeLowering(target: string, typeId: string, lowering: TypeLowering): void {
    this.nestedMap(this.targetTypes, target).set(typeId, lowering);
  }

  registerTargetTypeFamilyLowering(target: string, family: string, lowering: TypeLowering): void {
    this.nestedMap(this.targetTypeFamilies, target).set(family, lowering);
  }

  registerTargetExprLowering(target: string, operation: string, lowering: ExprLowering): void {
    this.nestedMap(this.targetExprs, target).set(operation, lowering);
  }

  registerTargetDeclarationLowering(target: string, operation: string, lowering: DeclarationLowering): void {
    this.nestedMap(this.targetDeclarations, target).set(operation, lowering);
  }

  registerLeanTypeLowering(typeId: string, lowering: TypeLowering): void {
    this.assertFree(this.leanTypes, typeId, "Lean type lowering");
    this.leanTypes.set(typeId, lowering);
  }

  registerLeanTypeFamilyLowering(family: string, lowering: TypeLowering): void {
    this.assertFree(this.leanTypeFamilies, family, "Lean type-family lowering");
    this.leanTypeFamilies.set(family, lowering);
  }

  registerLeanExprLowering(operation: string, lowering: ExprLowering): void {
    this.assertFree(this.leanExprs, operation, "Lean expression lowering");
    this.leanExprs.set(operation, lowering);
  }

  registerLeanDeclarationLowering(operation: string, lowering: LeanDeclarationLowering): void {
    this.assertFree(this.leanDeclarations, operation, "Lean declaration lowering");
    this.leanDeclarations.set(operation, lowering);
  }

  registerLeanAnnotationLowering(operation: string, lowering: LeanAnnotationLowering): void {
    this.assertFree(this.leanAnnotations, operation, "Lean annotation lowering");
    this.leanAnnotations.set(operation, lowering);
  }

  registerLeanDefBinderContributor(contributor: LeanDefBinderContributor): void {
    this.leanDefBinderContributors.push(contributor);
  }

  registerLeanPrelude(source: string): void { this.leanPrelude.push(source); }

  registerLeanModule(module: string, source: string, options?: { readonly autoImport?: boolean }): void {
    this.assertFree(this.leanModules, module, "Lean module");
    this.leanModules.set(module, { module, source, ...(options?.autoImport === undefined ? {} : { autoImport: options.autoImport }) });
  }

  registerLeanEngine(engine: LeanEngineSpec): void {
    if (this.leanEngine) throw new ProofScriptError("PS1004", `Lean engine '${this.leanEngine.id}' is already installed.`);
    this.leanEngine = engine;
  }

  getType(id: string): IRType {
    const type = this.types.get(id);
    if (!type) throw new ProofScriptError("PS2001", `Unknown type '${id}'.`);
    return type;
  }

  findType(id: string): IRType | undefined { return this.types.get(id); }

  resolveType(name: string, locals?: ReadonlyMap<string, IRType>): IRType {
    const local = locals?.get(name);
    if (local) return local;
    const direct = this.types.get(name);
    if (direct) return direct;
    const parsed = parseTypeApplication(name);
    if (!parsed) throw new ProofScriptError("PS2001", `Unknown type '${name}'.`);
    const spec = this.typeFamilies.get(parsed.family);
    if (!spec) throw new ProofScriptError("PS2003", `No installed feature owns type family '${parsed.family}'.`);
    if (spec.params.some((param) => param.kind !== "type")) {
      throw new ProofScriptError("PS2004", `Type family '${parsed.family}' has term indices and must be resolved from structured ProofScript type syntax.`);
    }
    const args: IRTypeArgument[] = parsed.args.map((arg) => ({ kind: "type", value: this.resolveType(arg, locals) }));
    if (args.length !== spec.params.length) throw new ProofScriptError("PS2005", `Type family '${parsed.family}' expects ${spec.params.length} argument(s), got ${args.length}.`);
    return spec.resolve(args);
  }

  findTypeFamily(name: string): TypeFamilyResolver | undefined { return this.typeFamilies.get(name); }

  getOperation(id: string): IROperationSpec {
    const operation = this.operations.get(id);
    if (!operation) throw new ProofScriptError("PS2002", `Unknown IR operation '${id}'.`);
    return operation;
  }

  getTarget(id: string): TargetSpec {
    const entry = this.targets.get(id);
    if (!entry) throw new ProofScriptError("PS3001", `Unknown backend target '${id}'.`);
    return { ...entry.spec, capabilities: new Set(entry.capabilities) };
  }

  getTargetTypeLowering(target: string, type: IRType): TypeLowering {
    const exact = this.targetTypes.get(target)?.get(type.id);
    if (exact) return exact;
    if (type.family) {
      const families = this.targetTypeFamilies.get(target);
      const family = families?.get(type.family) ?? families?.get(baseFamily(type.family));
      if (family) return family;
    }
    throw new ProofScriptError("PS3002", `Target '${target}' has no type lowering for '${type.displayName}'.`);
  }

  getTargetExprLowering(target: string, op: string): ExprLowering {
    const lowering = this.targetExprs.get(target)?.get(op);
    if (!lowering) throw new ProofScriptError("PS3003", `Target '${target}' has no lowering for operation '${op}'.`);
    return lowering;
  }

  getTargetDeclarationLowering(target: string, op: string): DeclarationLowering {
    const lowering = this.targetDeclarations.get(target)?.get(op);
    if (!lowering) throw new ProofScriptError("PS3004", `Target '${target}' has no declaration lowering for operation '${op}'.`);
    return lowering;
  }

  getLeanTypeLowering(type: IRType): TypeLowering {
    const exact = this.leanTypes.get(type.id);
    if (exact) return exact;
    if (type.family) {
      const family = this.leanTypeFamilies.get(type.family) ?? this.leanTypeFamilies.get(baseFamily(type.family));
      if (family) return family;
    }
    throw new ProofScriptError("PS4001", `Lean model has no type lowering for '${type.displayName}'.`);
  }

  getLeanExprLowering(op: string): ExprLowering {
    const lowering = this.leanExprs.get(op);
    if (!lowering) throw new ProofScriptError("PS4002", `Lean model has no lowering for operation '${op}'.`);
    return lowering;
  }

  getLeanDeclarationLowering(op: string): LeanDeclarationLowering {
    const lowering = this.leanDeclarations.get(op);
    if (!lowering) throw new ProofScriptError("PS4004", `Lean model has no declaration lowering for operation '${op}'.`);
    return lowering;
  }

  getLeanAnnotationLowering(op: string): LeanAnnotationLowering {
    const lowering = this.leanAnnotations.get(op);
    if (!lowering) throw new ProofScriptError("PS4005", `Lean model has no annotation lowering for operation '${op}'.`);
    return lowering;
  }

  getLeanDefBinders(declaration: import("./model.js").IRDef, context: import("./model.js").LeanDeclarationContext): readonly string[] {
    return this.leanDefBinderContributors.flatMap((contributor) => contributor(declaration, context));
  }

  getLeanPrelude(): readonly string[] { return this.leanPrelude; }

  getLeanModules(): readonly LeanModuleResource[] { return [...this.leanModules.values()]; }

  /** Create a fresh registry with the same installed plugins/provenance but no
   * user declarations. Multi-file compilation uses one fork per source module
   * so private/local declarations cannot leak through mutable registry state. */
  fork(): Registry {
    const fork = new Registry();
    for (const plugin of this.plugins.values()) fork.install(plugin);
    for (const [id, provenance] of this.pluginProvenance) fork.recordPluginProvenance(id, provenance);
    return fork;
  }

  getLeanEngine(): LeanEngineSpec {
    if (!this.leanEngine) throw new ProofScriptError("PS4003", "No Lean proof-engine plugin is installed.");
    return this.leanEngine;
  }

  private nestedMap<K, V>(map: Map<string, Map<K, V>>, key: string): Map<K, V> {
    let nested = map.get(key);
    if (!nested) { nested = new Map<K, V>(); map.set(key, nested); }
    return nested;
  }

  private assertFree(map: ReadonlyMap<string, unknown>, key: string, kind: string): void {
    if (map.has(key)) throw new ProofScriptError("PS1005", `Duplicate ${kind} registration '${key}'.`);
  }
}

function baseFamily(family: string): string {
  const colon = family.indexOf(":");
  return colon < 0 ? family : family.slice(0, colon);
}

function parseTypeApplication(name: string): { family: string; args: string[] } | undefined {
  const first = name.indexOf("(");
  if (first < 0 || !name.endsWith(")")) return undefined;
  const family = name.slice(0, first);
  const inner = name.slice(first + 1, -1);
  const args: string[] = [];
  let start = 0;
  let depth = 0;
  for (let i = 0; i < inner.length; i += 1) {
    const char = inner[i]!;
    if (char === "(") depth += 1;
    else if (char === ")") depth -= 1;
    else if (char === "," && depth === 0) {
      args.push(inner.slice(start, i));
      start = i + 1;
    }
  }
  args.push(inner.slice(start));
  return { family, args };
}
