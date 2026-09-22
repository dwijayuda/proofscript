import type {
  DeclarationLowering,
  ExprLowering,
  FunctionSignature,
  IRAnnotation,
  IRExpr,
  IRParam,
  ClassDescriptor,
  InstanceCandidate,
  IRProgram,
  IRType,
  LeanAnnotationLowering,
  LeanDeclarationLowering,
  LeanDefBinderContributor,
  LeanEngineSpec,
  OperationDomain,
  SurfaceClause,
  SurfaceDecl,
  SurfaceDeclarationPrefix,
  SurfaceExpr,
  SurfaceParam,
  SurfaceTypeExpr,
  TargetSpec,
  TypeFamilyResolver,
  TypeLowering,
  VerificationDescriptor,
} from "./model.js";

export interface ParserCursor {
  peek(text?: string): boolean;
  peekAhead(offset: number, text?: string): boolean;
  currentToken(): import("./model.js").Token;
  consume(text?: string): string;
  parseIdentifier(): string;
  parseTypeName(): string;
  parseTypeExpression(): SurfaceTypeExpr;
  parseExpression(minPrecedence?: number): SurfaceExpr;
  parseDeclarationClauses(): readonly SurfaceClause[];
  /** Parse one declaration from the current token using the currently installed
   * declaration grammar. This is intended for reference-defined declaration
   * containers such as `mutual { ... }`; it does not pre-parse later top-level
   * commands and therefore preserves the incremental command model. */
  parseNestedDeclaration(): SurfaceDecl;
  expect(text: string): void;
  /** Register the synthetic command emitted when the matching `}` is reached.
   * This keeps nested command blocks incremental: commands inside a section are
   * still parsed only after preceding commands have elaborated.
   */
  enterCommandBlock(exitDeclaration: SurfaceDecl): void;
  /** Register an environment-scope exit that is emitted after exactly one following command.
   * Nested one-command scopes and command blocks are tracked without pre-parsing the wrapped command.
   */
  enterOneCommandScope(exitDeclaration: SurfaceDecl): void;
}


export interface DeclarationSyntax {
  readonly keyword: string;
  readonly parse: (cursor: ParserCursor) => SurfaceDecl;
}

export interface DeclarationPrefixSyntax {
  /** First token that activates the prefix parser, e.g. `local`, `scoped`, `@`. */
  readonly keyword: string;
  readonly owner: string;
  readonly parse: (cursor: ParserCursor) => SurfaceDeclarationPrefix;
}

export interface DeclarationClauseSyntax {
  readonly keyword: string;
  readonly owner: string;
  readonly parse: (cursor: ParserCursor) => SurfaceClause;
}

export interface ExpressionSyntax {
  readonly keyword: string;
  readonly owner: string;
  readonly parse: (cursor: ParserCursor) => SurfaceExpr;
}

export interface InfixSyntax {
  readonly operator: string;
  readonly precedence: number;
}

export interface DeclarationElaborationContext {
  resolveType(name: string): IRType;
  resolveTypeExpression(type: SurfaceTypeExpr): IRType;
  declareUniverse(name: string): void;
  hasUniverse(name: string): boolean;
  declareType(id: string, displayName?: string, family?: string): void;
  declareTypeFamily(name: string, resolver: TypeFamilyResolver): void;
  /** Declare a semantic name alias (used by reducible type abbreviations). */
  declareNameAlias(alias: string, target: string): void;
  declareFunction(
    name: string,
    params: readonly IRParam[],
    result: IRType,
    options?: { readonly operation?: string; readonly payload?: unknown; readonly universeParams?: readonly string[] },
  ): void;
  /** Replace the signature of a function already declared by the current command.
   * Used by recursive definitions after exact section-instance capture finalizes
   * their telescope; this never changes declaration ownership/access metadata. */
  updateFunctionSignature(
    name: string,
    params: readonly IRParam[],
    result: IRType,
    options?: { readonly operation?: string; readonly payload?: unknown; readonly universeParams?: readonly string[] },
  ): void;
  declareIntrinsic(spec: IntrinsicSpec): void;
  declareSemanticInfo(key: string, value: unknown): void;
  declareClass(descriptor: ClassDescriptor): void;
  getClass(name: string): ClassDescriptor | undefined;
  declareInstanceCandidate(candidate: Omit<InstanceCandidate, "declarationOrder">): InstanceCandidate;
  enterSection(name?: string): number;
  exitSection(expectedName?: string): void;
  currentSectionScopeId(): number | undefined;
  declareSectionVariables(params: readonly SurfaceParam[]): void;
  setSectionVariablePolicy(name: string, policy: "include" | "omit"): void;
  selectSectionVariables(referencedNames: ReadonlySet<string>, shadowedNames?: ReadonlySet<string>): readonly IRParam[];
  collectClauseReferencedNames(clause: SurfaceClause): readonly string[];
  captureSectionInstanceUsage<T>(fn: () => T): { readonly value: T; readonly usedNames: ReadonlySet<string> };
  enterNamespace(name: string): void;
  exitNamespace(expectedName?: string): void;
  currentNamespaceName(): string | undefined;
  qualifyName(name: string): string;
  openNamespace(name: string, only?: readonly string[], hiding?: readonly string[]): void;
  enterOneCommandEnvironmentScope(): void;
  exitOneCommandEnvironmentScope(): void;
  exportNamespace(name: string, members: readonly string[]): void;
  importModule(name: string, options?: { readonly public?: boolean; readonly meta?: boolean; readonly all?: boolean }): void;
  openScopedEnvironment(name: string): void;
  isScopedEnvironmentOpen(name: string): boolean;
  setInstanceDefaultAttribute(name: string, priority?: number): void;
  removeInstanceDefaultAttribute(name: string): void;
  setDeclarationAttribute(name: string, attribute: import("./model.js").IRDeclarationAttribute): void;
  removeDeclarationAttribute(name: string, attributeName: string): void;
  getDeclarationAttributes(name: string): readonly import("./model.js").IRDeclarationAttribute[];
  synthesizeInstance(type: IRType): IRExpr;
  /** Synthesize an instance while treating the named type variables occurring in
   * outParam/semiOutParam positions as inference outputs. This exposes the same
   * trusted instance-search engine used internally by the elaborator without
   * exposing its mutable search session. */
  synthesizeInstanceWithTypeOutputs(type: IRType, outputNames: ReadonlySet<string>): { readonly expr: IRExpr; readonly inferredTypes: ReadonlyMap<string, IRType> };
  coerceExpression(expr: IRExpr, target: IRType): IRExpr;
  /** Reduce installed plugin-owned reducible type abbreviations at default transparency. */
  reduceTypeForComparison(type: IRType): IRType;
  /** Definitional equality used by feature plugins after reducible abbreviation expansion. */
  typesDefinitionallyEqual(left: IRType, right: IRType): boolean;
  getSemanticInfo<T = unknown>(key: string): T | undefined;
  setElaborationInfo(key: string, value: unknown): void;
  getElaborationInfo<T = unknown>(key: string): T | undefined;
  /** Snapshot of the active value-local context for dependent match generalization. */
  currentLocals(): ReadonlyMap<string, IRType>;
  withLocals<T>(locals: ReadonlyMap<string, IRType>, fn: () => T): T;
  withLocal<T>(name: string, type: IRType, fn: () => T): T;
  withInstanceLocals<T>(locals: ReadonlyMap<string, IRType>, fn: () => T): T;
  withTypeLocals<T>(locals: ReadonlyMap<string, IRType>, fn: () => T): T;
  withTypeLocal<T>(name: string, type: IRType, fn: () => T): T;
  elaborateExpression(expr: SurfaceExpr, expected?: IRType): IRExpr;
  elaborateClauses(
    clauses: readonly SurfaceClause[],
    params: ReadonlyMap<string, IRType>,
    resultType: IRType,
  ): readonly IRAnnotation[];
}

export interface DeclarationElaborator {
  readonly kind: string;
  /** Prefix owners this declaration kind currently understands. Unknown prefixes
   * fail closed instead of being silently ignored. */
  readonly acceptedPrefixOwners?: readonly string[];
  readonly declarePhase?: number;
  readonly declare: (decl: SurfaceDecl, context: DeclarationElaborationContext) => void;
  readonly elaborate: (decl: SurfaceDecl, context: DeclarationElaborationContext) => IRProgram["declarations"][number];
}

export interface ClauseElaborationScope {
  readonly params: ReadonlyMap<string, IRType>;
  readonly resultType: IRType;
}

export interface DeclarationClauseElaborator {
  readonly owner: string;
  readonly scope: "params" | "params+result";
  readonly elaborate: (clause: SurfaceClause, context: DeclarationElaborationContext, scope: ClauseElaborationScope) => IRAnnotation;
  /** Optional syntax-level dependency report used for section-variable automatic generalization. */
  readonly collectReferencedNames?: (clause: SurfaceClause) => readonly string[];
}

export interface ExpressionElaborator {
  readonly owner: string;
  readonly elaborate: (expr: SurfaceExpr, expected: IRType | undefined, context: DeclarationElaborationContext) => IRExpr;
}

export interface IntrinsicSpec {
  readonly name: string;
  readonly params: readonly string[];
  readonly result: string;
  readonly operation: string;
  readonly payload?: unknown;
}

export interface LiteralElaborator {
  readonly literalKind: "number" | "string";
  /** Return true only when this plugin owns the literal under the given expected type.
   * Multiple plugins may contribute the same literal kind; ambiguity fails closed. */
  readonly supports?: (expected: IRType | undefined, resolveType: (name: string) => IRType) => boolean;
  readonly elaborate: (text: string, expected: IRType | undefined, resolveType: (name: string) => IRType) => IRExpr;
}

export interface BinaryElaborator {
  readonly operator: string;
  /** Optional surface-controlled elaboration for genuinely heterogeneous
   * operators whose operand types cannot be fixed by the core before instance
   * synthesis. Legacy binary plugins may omit this and use `elaborate`. */
  readonly elaborateSurface?: (
    left: SurfaceExpr,
    right: SurfaceExpr,
    expected: IRType | undefined,
    context: DeclarationElaborationContext,
  ) => IRExpr;
  readonly elaborate: (
    left: IRExpr,
    right: IRExpr,
    expected: IRType | undefined,
    resolveType: (name: string) => IRType,
    context: DeclarationElaborationContext,
  ) => IRExpr;
}

export interface PluginManifest {
  readonly schema: "proofscript.plugin/v1";
  readonly id: string;
  readonly version: string;
  readonly kind: ProofScriptPlugin["kind"];
  readonly semanticIds?: readonly string[];
  readonly proofscriptBaseline?: string;
  readonly leanBaseline?: string;
  readonly lean?: {
    readonly sources?: readonly string[];
    readonly assumptionPolicy?: "none" | "declared";
  };
}

export interface SemanticInterfaceCodecContext {
  readonly moduleInterface: import("./model.js").ProofScriptModuleInterface;
}

export interface SemanticInterfaceCodec {
  /** Stable codec identity. Change version whenever serialized payload meaning changes. */
  readonly id: string;
  readonly version: string;
  /** Return true only for semantic-info entries owned by this codec. */
  readonly matches: (key: string, value: unknown) => boolean;
  readonly serialize: (key: string, value: unknown, context: SemanticInterfaceCodecContext) => unknown;
  /** Throw on invalid/untrusted payload. */
  readonly validate: (key: string, payload: unknown) => void;
  readonly rehydrate: (key: string, payload: unknown) => unknown;
}

export type ReducibleTypeFamilyReducer = (type: IRType) => IRType | undefined;

export interface FeatureRegistryApi {
  registerType(id: string, displayName?: string, family?: string): void;
  registerTypeValue(type: IRType): void;
  registerTypeFamily(name: string, resolver: TypeFamilyResolver): void;
  /** Register a plugin-owned reducible family abbreviation used only by semantic
   * type comparison/unification. The original family identity remains in IR so
   * emitters/backends can preserve source/runtime routing. */
  registerReducibleTypeFamily(family: string, reducer: ReducibleTypeFamilyReducer): void;
  /** Register a trusted plugin-provided global constant/function signature. The
   * implementation is represented by its semantic operation, not host code. */
  registerBuiltinFunction(name: string, signature: FunctionSignature): void;
  /** Add an existing Lean/prelude class to the elaboration environment without
   * emitting a user class declaration. Multiple plugins may contribute classes. */
  registerBuiltinClass(descriptor: ClassDescriptor): void;
  /** Add an existing Lean/prelude instance candidate. The elaborator assigns a
   * deterministic local declaration order when it snapshots the registry. */
  registerBuiltinInstance(candidate: Omit<InstanceCandidate, "declarationOrder">): void;
  registerSemanticInfo(key: string, value: unknown): void;
  registerSemanticInterfaceCodec(codec: SemanticInterfaceCodec): void;
  registerDeclarationSyntax(syntax: DeclarationSyntax): void;
  registerDeclarationPrefixSyntax(syntax: DeclarationPrefixSyntax): void;
  registerDeclarationClauseSyntax(syntax: DeclarationClauseSyntax): void;
  registerExpressionSyntax(syntax: ExpressionSyntax): void;
  registerInfixSyntax(syntax: InfixSyntax): void;
  registerDeclarationElaborator(elaborator: DeclarationElaborator): void;
  registerDeclarationClauseElaborator(elaborator: DeclarationClauseElaborator): void;
  registerExpressionElaborator(elaborator: ExpressionElaborator): void;
  registerIntrinsic(spec: IntrinsicSpec): void;
  registerLiteralElaborator(elaborator: LiteralElaborator): void;
  registerBinaryElaborator(elaborator: BinaryElaborator): void;
  registerOperation(
    id: string,
    options: {
      requiredCapabilities?: readonly string[];
      verification: VerificationDescriptor;
      domain?: OperationDomain;
    },
  ): void;
  registerTarget(target: TargetSpec): void;
  registerTargetTypeLowering(target: string, typeId: string, lowering: TypeLowering): void;
  registerTargetTypeFamilyLowering(target: string, family: string, lowering: TypeLowering): void;
  registerTargetExprLowering(target: string, operation: string, lowering: ExprLowering): void;
  registerTargetDeclarationLowering(target: string, operation: string, lowering: DeclarationLowering): void;
  addTargetCapability(target: string, capability: string): void;
  registerLeanTypeLowering(typeId: string, lowering: TypeLowering): void;
  registerLeanTypeFamilyLowering(family: string, lowering: TypeLowering): void;
  registerLeanExprLowering(operation: string, lowering: ExprLowering): void;
  registerLeanDeclarationLowering(operation: string, lowering: LeanDeclarationLowering): void;
  registerLeanAnnotationLowering(operation: string, lowering: LeanAnnotationLowering): void;
  registerLeanDefBinderContributor(contributor: LeanDefBinderContributor): void;
  registerLeanPrelude(source: string): void;
  registerLeanModule(module: string, source: string, options?: { readonly autoImport?: boolean }): void;
  registerLeanEngine(engine: LeanEngineSpec): void;
}

export interface ProofScriptPlugin {
  readonly id: string;
  readonly version: string;
  readonly kind: "feature" | "backend" | "backend-feature" | "prover";
  readonly requires?: readonly string[];
  readonly setup: (registry: FeatureRegistryApi) => void;
}
