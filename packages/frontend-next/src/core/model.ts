export type TokenKind = "identifier" | "number" | "string" | "punct" | "eof";

export interface Token {
  readonly kind: TokenKind;
  readonly text: string;
  readonly offset: number;
}

export type SurfaceExpr =
  | { readonly kind: "number"; readonly text: string }
  | { readonly kind: "string"; readonly text: string }
  | { readonly kind: "identifier"; readonly name: string }
  | { readonly kind: "call"; readonly callee: string; readonly args: readonly SurfaceExpr[]; readonly namedArgs?: readonly { readonly name: string; readonly value: SurfaceExpr }[]; readonly explicitMode?: boolean; readonly universeArgs?: readonly SurfaceUniverseLevel[] }
  | { readonly kind: "lambda"; readonly params: readonly SurfaceParam[]; readonly body: SurfaceExpr }
  | { readonly kind: "quantifier"; readonly quantifier: "forall" | "exists"; readonly params: readonly SurfaceParam[]; readonly body: SurfaceExpr }
  | { readonly kind: "binary"; readonly operator: string; readonly left: SurfaceExpr; readonly right: SurfaceExpr }
  | { readonly kind: "extension"; readonly owner: string; readonly payload: unknown };

/**
 * Source-level type syntax is intentionally not a second, nominal-only grammar.
 * Lean types are terms; this v0.15 representation keeps ordinary term
 * syntax available inside types while adding the Pi/arrow forms that need
 * binder-aware parsing.
 */
export type SurfaceUniverseLevel =
  | { readonly kind: "zero" }
  | { readonly kind: "param"; readonly name: string }
  | { readonly kind: "succ"; readonly base: SurfaceUniverseLevel; readonly amount: number }
  | { readonly kind: "max" | "imax"; readonly left: SurfaceUniverseLevel; readonly right: SurfaceUniverseLevel };

export type SurfaceTypeExpr =
  | { readonly kind: "term"; readonly expr: SurfaceExpr }
  | { readonly kind: "sort"; readonly sort: "Prop" | "Sort" | "Type"; readonly level?: SurfaceUniverseLevel }
  | { readonly kind: "arrow"; readonly domain: SurfaceTypeExpr; readonly codomain: SurfaceTypeExpr }
  | { readonly kind: "pi"; readonly params: readonly SurfaceParam[]; readonly codomain: SurfaceTypeExpr };

export type BinderInfo = "explicit" | "implicit" | "strictImplicit" | "instance";

export interface SurfaceParam {
  readonly name: string;
  readonly type: SurfaceTypeExpr;
  readonly binderInfo: BinderInfo;
  readonly defaultValue?: SurfaceExpr;
}

export interface SurfaceClause {
  readonly owner: string;
  readonly payload: unknown;
}

export interface SurfaceDeclarationPrefix {
  readonly owner: string;
  readonly payload: unknown;
}

export interface SurfaceDecl {
  readonly kind: string;
  readonly payload: unknown;
  /** Prefixes/modifiers are preserved separately from the declaration kind.
   * This lets attribute/scope plugins influence elaboration without redefining
   * every declaration grammar.
   */
  readonly prefixes?: readonly SurfaceDeclarationPrefix[];
}

export interface SurfaceProgram {
  readonly declarations: readonly SurfaceDecl[];
}

export type IRUniverseLevel =
  | { readonly kind: "zero" }
  | { readonly kind: "param"; readonly name: string }
  | { readonly kind: "succ"; readonly base: IRUniverseLevel; readonly amount: number }
  | { readonly kind: "max" | "imax"; readonly left: IRUniverseLevel; readonly right: IRUniverseLevel };

export type IRTypeArgument =
  | { readonly kind: "type"; readonly value: IRType }
  | { readonly kind: "term"; readonly value: IRExpr };

/**
 * Semantic IR type representation.
 *
 * `nominal` covers constants/families such as Nat, Option(A), Fin(n), Vector(A,n).
 * `term` records a type-valued Lean term (types are terms in Lean).
 * `pi` records dependent/non-dependent function types with binder class retained.
 */
export interface IRType {
  readonly form: "nominal" | "term" | "pi" | "sort";
  readonly id: string;
  readonly displayName: string;
  readonly family?: string;
  readonly args?: readonly IRTypeArgument[];
  readonly term?: IRExpr;
  readonly binder?: IRParam;
  readonly domain?: IRType;
  readonly codomain?: IRType;
  readonly universe?: IRUniverseLevel;
  readonly sortAlias?: "Prop" | "Sort" | "Type";
  readonly typeVarSort?: IRType;
}

export interface IRParam {
  readonly name: string;
  readonly type: IRType;
  readonly binderInfo: BinderInfo;
  readonly isTypeParam?: boolean;
  readonly isProofParam?: boolean;
  /** Value binder proven compile-time-only for executable backends. Unlike
   * `isProofParam`, this may classify an ordinary dependent index such as an
   * inferred `n : Nat` whose only semantic role is in erased types/evidence. */
  readonly runtimeErased?: boolean;
  readonly isAutoParam?: boolean;
  /** Typeclass search role when this parameter belongs to a class declaration. */
  readonly instanceSearchMode?: "input" | "out" | "semiOut";
  readonly defaultValue?: IRExpr;
}

export type IRExpr =
  | { readonly kind: "literal"; readonly op: string; readonly value: string; readonly type: IRType }
  | { readonly kind: "var"; readonly name: string; readonly type: IRType }
  | { readonly kind: "type"; readonly value: IRType; readonly type: IRType }
  | { readonly kind: "call"; readonly callee: string; readonly args: readonly IRExpr[]; /** Full dependent application arguments for independently checked Core. This may include inferred implicit Type-valued arguments intentionally omitted from ordinary frontend/backend args. */ readonly checkedArgs?: readonly IRExpr[]; readonly erasedArgs?: readonly boolean[]; /** Arguments that exist in dependent source semantics but should be omitted from reconstructed Lean source so Lean re-infers branch-local indices. */ readonly runtimeErasedArgs?: readonly boolean[]; readonly argumentNames?: readonly (string | null)[]; readonly explicitMode?: boolean; readonly universeArgs?: readonly IRUniverseLevel[]; readonly rootQualified?: boolean; readonly type: IRType }
  | { readonly kind: "apply"; readonly callee: IRExpr; readonly args: readonly IRExpr[]; readonly type: IRType }
  | { readonly kind: "lambda"; readonly params: readonly IRParam[]; readonly body: IRExpr; readonly type: IRType }
  | { readonly kind: "quantifier"; readonly quantifier: "forall" | "exists"; readonly params: readonly IRParam[]; readonly body: IRExpr; readonly type: IRType }
  | { readonly kind: "op"; readonly op: string; readonly args: readonly IRExpr[]; readonly payload?: unknown; readonly type: IRType }
  | { readonly kind: "extension"; readonly op: string; readonly args: readonly IRExpr[]; readonly payload: unknown; readonly type: IRType };


export type IREquationPattern =
  | { readonly kind: "constructor"; readonly variant: string; readonly fields: readonly IREquationPattern[] }
  | { readonly kind: "number"; readonly value: string }
  | { readonly kind: "wildcard" }
  | { readonly kind: "variable"; readonly name: string }
  | { readonly kind: "inaccessible"; readonly term: IRExpr }
  | { readonly kind: "named"; readonly name: string; readonly equalityName?: string; readonly pattern: IREquationPattern };

export interface IREquationClause {
  readonly patterns: readonly IREquationPattern[];
  readonly body: IRExpr;
}

export interface IRAnnotation {
  readonly op: string;
  readonly args: readonly IRExpr[];
  readonly payload?: unknown;
  readonly proofParams?: readonly IRParam[];
}

export interface IRDeclarationAttribute {
  readonly name: string;
  readonly priority?: number;
}

export interface IRDeclarationModifiers {
  readonly attributes?: readonly IRDeclarationAttribute[];
  readonly visibility?: "private" | "public";
  readonly protected?: boolean;
  /** Declaration is available for compile-time/meta execution. */
  readonly meta?: boolean;
  /** Public definition body is exported for unfolding. */
  readonly expose?: boolean;
}

export type ModulePhase = "runtime" | "meta";

export type IRTerminationJustification =
  | { readonly kind: "structural"; readonly parameter: string; readonly inferred: boolean }
  | {
      readonly kind: "wellFounded";
      /** Explicit well-founded measure. Undefined when Lean is asked to infer it. */
      readonly measure?: IRExpr;
      /** Local names introduced only for unnamed equation parameters in termination_by. */
      readonly binders?: readonly string[];
      /** Raw ProofScript tactic tokens preserved for Lean decrease obligations. */
      readonly decreasingBy?: string;
      /** True when the measure is intentionally left for Lean to infer. */
      readonly inferred: boolean;
      /** True for source `termination_by?`, which asks Lean to report its inferred annotation. */
      readonly suggest?: boolean;
    };

export interface IRDef {
  readonly kind: "def";
  /** Source spelling used at the current namespace location during Lean emission. */
  readonly name: string;
  /** Fully qualified semantic identity when the declaration lives in a namespace. */
  readonly semanticName?: string;
  readonly universeParams?: readonly string[];
  readonly params: readonly IRParam[];
  readonly returnType: IRType;
  readonly body: IRExpr;
  /** Equation-compiler source form retained for Lean/equation-theorem fidelity. */
  readonly sourceForm?: "rhs" | "equations";
  readonly equationParamNames?: readonly string[];
  readonly equations?: readonly IREquationClause[];
  readonly proofParams?: readonly IRParam[];
  readonly annotations?: readonly IRAnnotation[];
  /** Total recursive-definition justification selected by the frontend.
   * Structural recursion records the decreasing declaration parameter. */
  readonly termination?: IRTerminationJustification;
  readonly modifiers?: IRDeclarationModifiers;
}

export interface IRMutualDefGroup {
  readonly kind: "mutual";
  readonly members: readonly IRDef[];
  readonly structuralIndex: number;
  readonly modifiers?: IRDeclarationModifiers;
}

export interface IRExtensionDecl {
  readonly kind: "extension";
  readonly op: string;
  readonly args?: readonly IRExpr[];
  readonly payload: unknown;
  readonly modifiers?: IRDeclarationModifiers;
}

export type IRDeclaration = IRDef | IRMutualDefGroup | IRExtensionDecl;

export interface IRProgram {
  readonly declarations: readonly IRDeclaration[];
}

export interface FunctionSignature {
  readonly universeParams?: readonly string[];
  readonly params: readonly IRParam[];
  readonly result: IRType;
  readonly operation?: string;
  readonly payload?: unknown;
}


export interface StructureFieldDescriptor {
  readonly name: string;
  readonly type: IRType;
  readonly defaultValue?: IRExpr;
  readonly inheritedFrom?: string;
}

export interface StructureGeneratedApi {
  readonly constructor: string;
  readonly projections: readonly string[];
  readonly parentProjections: readonly { readonly parentName: string; readonly projection: string }[];
}

export interface StructureDescriptor {
  /** Fully qualified semantic identity. */
  readonly name: string;
  /** Source basename emitted inside the active namespace. */
  readonly sourceName?: string;
  readonly params: readonly IRParam[];
  readonly fields: readonly StructureFieldDescriptor[];
  readonly ownFields: readonly StructureFieldDescriptor[];
  /** Direct parents in source order. `parentType` is retained for v0.40 cache compatibility. */
  readonly parentTypes?: readonly IRType[];
  readonly parentType?: IRType;
  readonly deriving?: readonly string[];
  readonly generated?: StructureGeneratedApi;
  readonly family: string;
}

export interface ClassFieldDescriptor {
  readonly name: string;
  readonly type: IRType;
  readonly inheritedFrom?: string;
}

export interface ClassGeneratedApi {
  readonly methods: readonly string[];
  readonly parentProjections: readonly { readonly parentName: string; readonly projection: string }[];
}

export interface ClassDescriptor {
  /** Fully qualified semantic identity. */
  readonly name: string;
  /** Source basename emitted inside the active namespace. */
  readonly sourceName?: string;
  readonly params: readonly IRParam[];
  readonly fields: readonly ClassFieldDescriptor[];
  readonly ownFields?: readonly ClassFieldDescriptor[];
  /** Direct parents in source order. `parentType` is retained for v0.40 cache compatibility. */
  readonly parentTypes?: readonly IRType[];
  readonly parentType?: IRType;
  readonly deriving?: readonly string[];
  readonly generated?: ClassGeneratedApi;
  readonly family: string;
}

export interface InstanceCandidate {
  readonly name: string;
  readonly params: readonly IRParam[];
  readonly resultType: IRType;
  readonly priority: number;
  readonly declarationOrder: number;
  /** Search visibility is elaborator/environment state, not a kernel type. */
  readonly visibility?: "global" | "local" | "scoped";
  readonly localScopeId?: number;
  readonly scopeName?: string;
  /** `@[default_instance]` fallback priority. Ordinary and default-instance
   * priorities are distinct parts of instance-search semantics.
   */
  readonly defaultInstancePriority?: number;
  /** Evidence synthesized by a declaration-level deriving handler. Lean may
   * reconstruct this via its deriving environment; other targets must provide
   * an explicit correspondence rather than inventing an instance. */
  readonly derived?: { readonly handler: string; readonly subject: IRType; readonly requirements?: readonly IRType[] };
}

export interface VerificationDescriptor {
  readonly level: "unverified" | "modeled" | "kernel-checkable";
  readonly notes?: string;
}

export type OperationDomain = "runtime" | "proof";

export interface IROperationSpec {
  readonly id: string;
  readonly requiredCapabilities: readonly string[];
  readonly verification: VerificationDescriptor;
  readonly domain: OperationDomain;
}

export interface TargetSpec {
  readonly id: string;
  readonly displayName: string;
  readonly capabilities: ReadonlySet<string>;
  readonly emitProgram: (program: IRProgram, context: EmitContext) => string;
}

export interface EmitContext {
  readonly registry: RegistryView;
  emitExpr(expr: IRExpr): string;
  emitType(type: IRType): string;
  emitTypeArgument(argument: IRTypeArgument): string;
  emitDeclaration(declaration: IRExtensionDecl): string;
}

export interface LeanModuleResource {
  readonly module: string;
  readonly source: string;
  /** Plugin resources are auto-imported by generated files. Project-module
   * resources are materialized into the Lake workspace but imported only by
   * the source-level `import` commands that selected them. */
  readonly autoImport?: boolean;
}

/** In-memory public environment exported by one ProofScript source module.
 * Resolver functions are intentionally retained here: this interface is used
 * only while compiling one project graph. Certificates use the serializable
 * module descriptors produced by the project compiler instead. */
export interface ProofScriptModuleInterface {
  readonly module: string;
  readonly isModule: boolean;
  readonly functions: readonly { readonly name: string; readonly signature: FunctionSignature }[];
  /** Definition bodies available through this interface. Public interfaces carry
   * only @[expose] bodies; private/all interfaces carry all available def bodies. */
  readonly definitionBodies: readonly { readonly name: string; readonly body: IRExpr }[];
  readonly types: readonly IRType[];
  readonly typeFamilies: readonly { readonly name: string; readonly resolver: TypeFamilyResolver }[];
  readonly classes: readonly ClassDescriptor[];
  readonly instances: readonly InstanceCandidate[];
  readonly namespaces: readonly string[];
  readonly aliases: readonly { readonly alias: string; readonly target: string }[];
  readonly semanticInfo: readonly { readonly key: string; readonly value: unknown }[];
  readonly declarationAttributes?: readonly { readonly name: string; readonly attributes: readonly IRDeclarationAttribute[] }[];
  readonly access: readonly { readonly name: string; readonly visibility?: "public" | "private"; readonly protected: boolean; readonly exposed?: boolean }[];
  /** Phase availability of each exported semantic name. Names omitted here are
   * treated as runtime-only for backward compatibility with older in-memory
   * interfaces. */
  readonly phaseAccess: readonly { readonly name: string; readonly phases: readonly ModulePhase[] }[];
  readonly origins: readonly { readonly name: string; readonly module: string }[];
}

export interface SerializedSemanticCodecIdentity {
  readonly id: string;
  readonly version: string;
  readonly pluginId: string;
  readonly pluginVersion: string;
}

export type SerializedSemanticInfoEntry =
  | { readonly key: string; readonly encoding: "json"; readonly value: unknown }
  | { readonly key: string; readonly encoding: "codec"; readonly codec: SerializedSemanticCodecIdentity; readonly payload: unknown };

export interface SerializedProofScriptModuleInterface {
  readonly schema: "proofscript.module-interface/v2";
  readonly module: string;
  readonly isModule: boolean;
  readonly functions: readonly { readonly name: string; readonly signature: FunctionSignature }[];
  readonly definitionBodies: readonly { readonly name: string; readonly body: IRExpr }[];
  readonly types: readonly IRType[];
  readonly typeFamilies: readonly { readonly name: string; readonly descriptor: DeclaredTypeFamilyDescriptor }[];
  readonly classes: readonly ClassDescriptor[];
  readonly instances: readonly InstanceCandidate[];
  readonly namespaces: readonly string[];
  readonly aliases: readonly { readonly alias: string; readonly target: string }[];
  readonly semanticInfo: readonly SerializedSemanticInfoEntry[];
  readonly declarationAttributes?: readonly { readonly name: string; readonly attributes: readonly IRDeclarationAttribute[] }[];
  readonly access: ProofScriptModuleInterface["access"];
  readonly phaseAccess: ProofScriptModuleInterface["phaseAccess"];
  readonly origins: ProofScriptModuleInterface["origins"];
}

export interface ModuleImportDescriptor {
  readonly module: string;
  readonly public: boolean;
  readonly meta?: boolean;
  readonly all?: boolean;
}

export interface ProjectModuleDescriptor {
  readonly module: string;
  readonly path: string;
  readonly sourceSha256: string;
  readonly semanticIrSha256: string;
  readonly publicInterfaceSha256: string;
  readonly privateInterfaceSha256: string;
  readonly imports: readonly ModuleImportDescriptor[];
}


export interface LeanMaterializeOptions {
  readonly reuseEntry?: boolean;
  readonly reuseModules?: ReadonlySet<string>;
}

export interface LeanMaterialization {
  readonly workspace: string;
  readonly sourceFile: string;
  readonly modules: readonly { readonly module: string; readonly sha256: string }[];
  readonly reusedModules?: readonly string[];
  readonly writtenModules?: readonly string[];
  readonly entryReused?: boolean;
}

export interface LeanEngineSpec {
  readonly id: string;
  readonly emitProgram: (program: IRProgram, registry: RegistryView) => string;
  readonly materialize: (source: string, cwd: string, registry: RegistryView, options?: LeanMaterializeOptions) => Promise<LeanMaterialization>;
  readonly check: (source: string, cwd: string, registry: RegistryView) => Promise<LeanCheckResult>;
}

export interface LeanCheckResult {
  readonly status: "kernel-checked" | "lean-unavailable" | "rejected";
  readonly stdout: string;
  readonly stderr: string;
  readonly checker?: "lake" | "lean" | "none";
  readonly workspace?: string;
  readonly modules?: readonly { readonly module: string; readonly sha256: string }[];
}

export interface VerificationReport {
  readonly engine: string;
  readonly status: LeanCheckResult["status"];
  readonly checker?: LeanCheckResult["checker"];
  readonly workspace?: string;
  readonly modules?: readonly { readonly module: string; readonly sha256: string }[];
  readonly semanticFeatures: readonly {
    readonly operation: string;
    readonly level: VerificationDescriptor["level"];
    readonly notes?: string;
  }[];
  readonly stdout: string;
  readonly stderr: string;
}

export interface TypeFamilyParameterSpec {
  readonly kind: "type" | "term";
  /** Expected type for a term index. May depend on earlier family arguments. */
  readonly expectedType?: (prior: readonly IRTypeArgument[]) => IRType;
}

export interface DeclaredTypeFamilyDescriptor {
  readonly schema: "proofscript.type-family/v1";
  /** Fully-qualified semantic family name used at the ProofScript surface. */
  readonly name: string;
  /** Nominal IR family tag, e.g. core.adt:Foo / lean.structure:Foo. */
  readonly family: string;
  /** Declaration telescope used to validate/reconstruct type/term arguments. */
  readonly params: readonly IRParam[];
}

export interface TypeFamilySpec {
  readonly params: readonly TypeFamilyParameterSpec[];
  readonly resolve: (args: readonly IRTypeArgument[]) => IRType;
  /** Declarative reconstruction recipe for module-produced families. Built-in
   * plugin families may omit this because their trusted plugin is reinstalled
   * before any cache/interface is rehydrated. */
  readonly descriptor?: DeclaredTypeFamilyDescriptor;
}

export interface RegistryView {
  getType(id: string): IRType;
  findType(id: string): IRType | undefined;
  resolveType(name: string): IRType;
  findTypeFamily(name: string): TypeFamilySpec | undefined;
  getOperation(id: string): IROperationSpec;
  getTarget(id: string): TargetSpec;
  getTargetTypeLowering(target: string, type: IRType): TypeLowering;
  getTargetExprLowering(target: string, op: string): ExprLowering;
  getTargetDeclarationLowering(target: string, op: string): DeclarationLowering;
  getLeanTypeLowering(type: IRType): TypeLowering;
  getLeanExprLowering(op: string): ExprLowering;
  getLeanDeclarationLowering(op: string): LeanDeclarationLowering;
  getLeanAnnotationLowering(op: string): LeanAnnotationLowering;
  getLeanDefBinders(declaration: IRDef, context: LeanDeclarationContext): readonly string[];
  getLeanPrelude(): readonly string[];
  getLeanModules(): readonly LeanModuleResource[];
  getLeanEngine(): LeanEngineSpec;
  getSemanticInfo<T = unknown>(key: string): T | undefined;
}

export interface TypeEmitContext {
  emitType(type: IRType): string;
  emitExpr(expr: IRExpr): string;
  emitTypeArgument(argument: IRTypeArgument): string;
}
export type TypeLowering = (type: IRType, context: TypeEmitContext) => string;
export type ExprLowering = (expr: IRExpr, context: EmitContext) => string;
export type DeclarationLowering = (declaration: IRExtensionDecl, context: EmitContext) => string;
export type TypeFamilyResolver = TypeFamilySpec;

export interface LeanDeclarationContext {
  readonly registry: RegistryView;
  emitExpr(expr: IRExpr): string;
  emitType(type: IRType): string;
  emitTypeArgument(argument: IRTypeArgument): string;
}

export type LeanDeclarationLowering = (declaration: IRExtensionDecl, context: LeanDeclarationContext) => string;
export type LeanAnnotationLowering = (annotation: IRAnnotation, declaration: IRDef, context: LeanDeclarationContext) => string;
export type LeanDefBinderContributor = (declaration: IRDef, context: LeanDeclarationContext) => readonly string[];
