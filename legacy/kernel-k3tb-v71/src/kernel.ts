import {
  BinderInfo,
  CoreDeclaration,
  Term,
  collectTermLevelParams,
  binderInfoOf,
  coreLevelDefEq,
  instantiate,
  instantiateTermLevels,
  pretty,
  sameTerm,
  shift,
} from "./core";
import {
  Level,
  LevelZero,
  levelDefEq,
  levelIMax,
  levelSucc,
  levelGeq,
  isNeverZero,
  normalizesToZero,
  prettyLevel,
} from "./level";
import { generateDirectMutualRecursors, generateEmptyRecursor, generateIndexedNoFieldRecursor, generateIndexedRecursiveRecursor, generateParameterizedSimpleRecursor, generateSimpleRecursor, MotiveUniversePolicy, RecursorGenerationProfile, SimpleCtorRule, SimpleRecursorMetadata } from "./inductive";
import { expectedEqReflType, expectedEqType, generateQuotientPrimitives, QuotientPrimitiveKind } from "./quotient";

export class KernelError extends Error {}
export class KernelResourceError extends KernelError {
  readonly code: string;
  constructor(message:string,code="kernel_resource_limit"){super(message);this.name="KernelResourceError";this.code=code;}
}

export type EnvironmentDeclaration =
  | CoreDeclaration
  | {
      kind: "constructor";
      name: string;
      levelParams: string[];
      type: Term;
      inductive: string;
    }
  | {
      kind: "quotient";
      name: string;
      levelParams: string[];
      type: Term;
      quotKind: QuotientPrimitiveKind;
    }
  | {
      kind: "recursor";
      name: string;
      levelParams: string[];
      type: Term;
      metadata: SimpleRecursorMetadata;
    };

export interface CheckedDeclaration {
  declaration: EnvironmentDeclaration;
  assumptions: Set<string>;
  /** Names generated while admitting this source/core declaration. */
  generated: string[];
}

export interface KernelOptions {
  recursorProfile?: RecursorGenerationProfile;
  allowEmptyInductives?: boolean;
  /** v15+: admit Lean kernel projection expressions for the implemented zero-index one-constructor slice. */
  allowProjections?: boolean;
  /** v15+: enable Lean nonrecursive one-constructor/no-index eta conversion. */
  allowStructureEta?: boolean;
  /** v16+: admit Lean-style higher-order strictly-positive recursion for the non-mutual simple slice. */
  allowHigherOrderPositiveRecursion?: boolean;
  /** v17+: admit the first direct strictly-positive recursive indexed recursor slice. */
  allowIndexedRecursiveRecursors?: boolean;
  /** v18+: extend raw projection inference/reduction to admitted indexed one-constructor families. */
  allowIndexedProjections?: boolean;
  /** v19+: derive Lean 4.33.1 Prop-elimination universe permission from admitted constructors. */
  allowPropElimination?: boolean;
  /** v20+: enable Lean 4.33.1 RecursorVal.k K-like reduction for declaration-derived nullary Prop recursors. */
  allowRecursorK?: boolean;
  /** v21+: enforce Lean 4.33.1 constructor-field universe ceilings for admitted inductives. */
  allowInductiveUniverseChecks?: boolean;
  /** v22+: admit constructor fields in the simple zero-parameter/index path that depend on earlier fields. */
  allowDependentConstructorFields?: boolean;
  /** v23+: preserve lambda/let term shapes when constructing trusted recursor telescopes. */
  allowTelescopeTerms?: boolean;
  /** v24+: admit the bounded direct mutual-inductive trusted Core slice. */
  allowMutualInductives?: boolean;
  /** v25+: admit shared uniform parameter telescopes in the bounded mutual slice. */
  allowMutualParameters?: boolean;
  /** v26: direct mutually recursive families may carry per-member index telescopes. */
  allowMutualIndices?: boolean;
  /** v27: admit strictly-positive higher-order recursive fields across mutual families. */
  allowHigherOrderMutualRecursion?: boolean;
  /** v28: admit mutual predicates and derive the shared mutual recursor elimination universe from the result level. */
  allowMutualProp?: boolean;
  /** v29: preprocess the first bounded Lean-style nested-inductive slice through trusted auxiliary mutual families. */
  allowNestedInductives?: boolean;
  /** v30: thread shared/dependent outer parameter telescopes through the bounded nested preprocessing slice. */
  allowNestedParameters?: boolean;
  /** v31: admit the bounded indexed-outer nested preprocessing modes derived from Lean 4.33.1. */
  allowNestedIndices?: boolean;
  /** v32: admit fixed nested outer-index expressions that depend only on uniform outer parameters. */
  allowNestedIndexExpressions?: boolean;
  /** v33: admit multiple compatible nested auxiliary specializations/containers in one declaration. */
  allowNestedMultipleSpecializations?: boolean;
  /** v34+: admit bounded universe-polymorphic nested preprocessing with explicit universe instantiation. */
  allowNestedPolymorphic?: boolean;
  /** v35+: admit bounded indexed nested containers while preserving the container index telescope. */
  allowNestedIndexedContainers?: boolean;
  /** v36+: generate/apply recursive recursor minors with all fields before all IHs, matching Lean 4.33.1. */
  allowLeanRecursorMinorOrder?: boolean;
  /** v37+: admit the bounded exact two-layer deeper-nested preprocessing slice. */
  allowNestedDeeper?: boolean;
  /** v38+: admit arbitrary closed linear-depth nested preprocessing. */
  allowNestedDeeperGeneralization?: boolean;
  /** v39+: thread uniform/dependent outer parameters through arbitrary-depth nested helper chains. */
  allowNestedDeeperParameters?: boolean;
  /** v40+: combine arbitrary-depth nested helper chains with Lean-compatible indexed outer-family modes. */
  allowNestedDeeperIndices?: boolean;
  /** v41+: combine arbitrary-depth parameter/index nesting with explicit universe-polymorphic instantiation. */
  allowNestedDeeperPolymorphic?: boolean;
  /** v42+: admit multiple compatible nested fields through a deduplicated helper graph. */
  allowNestedDeeperMultipleFields?: boolean;
  /** v43+: admit graph-based arbitrary-depth nested Prop preprocessing. */
  allowNestedDeeperProp?: boolean;
  /** v44+: admit bounded multi-parameter nested container specializations. */
  allowNestedDeeperMultiParameter?: boolean;
  /** v45+: generalize multi-parameter nested specialization graphs across parameters/fixed indices/universes/Prop/indexed containers. */
  allowNestedDeeperMultiParameterGeneralization?: boolean;
  /** v46+: admit dependent nested-container parameter telescopes with checked recursive parameter families. */
  allowNestedDeeperDependentContainerParameters?: boolean;
  /** v47: compare non-mutual recursive uniform parameters by trusted definitional equality. */
  allowUniformParameterDefEq?: boolean;
  /** v48: match Lean recursor outer family parameter/index BinderInfo (explicit→implicit; preserve hidden/instance kinds). */
  allowRecursorFamilyBinderInfo?: boolean;
  /** v50+: preprocess bounded Lean-positive nested recursive occurrences inside a direct mutual block. */
  allowMutualNestedGeneralization?: boolean;
  /** v51+: thread shared/dependent uniform mutual parameters through the v50 mutual+nested helper graph. */
  allowMutualNestedParameters?: boolean;
  /** v52+: preserve per-member mutual indices while nested target specializations use only closed/shared-parameter-derived indices. */
  allowMutualNestedIndices?: boolean;
  /** v53: preserve explicit universe instantiations through bounded mutual+nested preprocessing. */
  allowMutualNestedPolymorphic?: boolean;
  /** v54: compose bounded mutual+nested preprocessing with Prop-valued mutual elimination. */
  allowMutualNestedProp?: boolean;
  /** v55: preserve indexed nested-container telescopes inside mutual/nested helper families. */
  allowMutualNestedIndexedContainers?: boolean;
  /** v56: synthesize arbitrary-depth linear mutual+nested helper chains for the bounded monomorphic zero-parameter/index slice. */
  allowMutualNestedDeeper?: boolean;
  /** v57: thread shared/dependent uniform parameters through the bounded deep mutual+nested helper chain. */
  allowMutualNestedDeeperParameters?: boolean;
  /** v58: retain outer mutual index telescopes while deep helpers specialize target indices from the shared-parameter context. */
  allowMutualNestedDeeperIndices?: boolean;
  allowMutualNestedDeeperPolymorphic?: boolean;
  /** v60: compose deep polymorphic/indexed mutual+nested preprocessing with Prop-valued mutual elimination. */
  allowMutualNestedDeeperProp?: boolean;
  /** v61: preserve live indexed-container telescopes across the v60 deep Prop helper chain. */
  allowMutualNestedDeeperIndexedContainers?: boolean;
  /** v62: allow multi-parameter indexed Prop containers in the deep mutual/nested helper chain. */
  allowMutualNestedDeeperMultiParameterContainers?: boolean;
  /** v63: admit dependent parameter telescopes in deep multi-parameter mutual/nested Prop containers. */
  allowMutualNestedDeeperDependentContainerParameters?: boolean;
  /** v64: admit multiple compatible deep recursive fields with Lean-compatible helper deduplication/order. */
  allowMutualNestedDeeperMultipleFields?: boolean;
  /** v65+: admit multiple recursive-carrying parameter slots in deep mutual/nested container specializations. */
  allowMutualNestedDeeperMultipleRecursiveParameterSlots?: boolean;
  /** v66+: generalize the v65 nonlinear deep helper graph from Prop to a shared, provably valid result Sort (Prop or always-nonzero Type). */
  allowMutualNestedFinalGeneralizationAudit?: boolean;
  /** v67+: finish transparent-head application re-flattening during WHNF/conversion. */
  allowConversionFinalAudit?: boolean;
  /** v68+: enforce explicit trusted-kernel resource ceilings and typed exhaustion. */
  allowResourceBounds?: boolean;
  /** v70+: match Lean 4.33.1 raw projection typing, including Prop dependency gating. */
  allowProjectionConformance?: boolean;
}

export class Environment {
  private declarations = new Map<string, CheckedDeclaration>();
  readonly recursorProfile: RecursorGenerationProfile;
  readonly allowEmptyInductives: boolean;
  readonly allowProjections: boolean;
  readonly allowStructureEta: boolean;
  readonly allowHigherOrderPositiveRecursion: boolean;
  readonly allowIndexedRecursiveRecursors: boolean;
  readonly allowIndexedProjections: boolean;
  readonly allowPropElimination: boolean;
  readonly allowRecursorK: boolean;
  readonly allowInductiveUniverseChecks: boolean;
  readonly allowDependentConstructorFields: boolean;
  readonly allowTelescopeTerms: boolean;
  readonly allowMutualInductives: boolean;
  readonly allowMutualParameters: boolean;
  readonly allowMutualIndices: boolean;
  readonly allowHigherOrderMutualRecursion: boolean;
  readonly allowMutualProp: boolean;
  readonly allowNestedInductives: boolean;
  readonly allowNestedParameters: boolean;
  readonly allowNestedIndices: boolean;
  readonly allowNestedIndexExpressions: boolean;
  readonly allowNestedMultipleSpecializations: boolean;
  readonly allowNestedPolymorphic: boolean;
  readonly allowNestedIndexedContainers: boolean;
  readonly allowLeanRecursorMinorOrder: boolean;
  readonly allowNestedDeeper: boolean;
  readonly allowNestedDeeperGeneralization: boolean;
  readonly allowNestedDeeperParameters: boolean;
  readonly allowNestedDeeperIndices: boolean;
  readonly allowNestedDeeperPolymorphic: boolean;
  readonly allowNestedDeeperMultipleFields: boolean;
  readonly allowNestedDeeperProp: boolean;
  readonly allowNestedDeeperMultiParameter: boolean;
  readonly allowNestedDeeperMultiParameterGeneralization: boolean;
  readonly allowNestedDeeperDependentContainerParameters: boolean;
  readonly allowUniformParameterDefEq: boolean;
  readonly allowRecursorFamilyBinderInfo: boolean;
  readonly allowMutualNestedGeneralization: boolean;
  readonly allowMutualNestedParameters: boolean;
  readonly allowMutualNestedIndices: boolean;
  readonly allowMutualNestedPolymorphic: boolean;
  readonly allowMutualNestedProp: boolean;
  readonly allowMutualNestedIndexedContainers: boolean;
  readonly allowMutualNestedDeeper: boolean;
  readonly allowMutualNestedDeeperParameters: boolean;
  readonly allowMutualNestedDeeperIndices: boolean;
  readonly allowMutualNestedDeeperPolymorphic: boolean;
  readonly allowMutualNestedDeeperProp: boolean;
  readonly allowMutualNestedDeeperIndexedContainers: boolean;
  readonly allowMutualNestedDeeperMultiParameterContainers: boolean;
  readonly allowMutualNestedDeeperDependentContainerParameters: boolean;
  readonly allowMutualNestedDeeperMultipleFields: boolean;
  readonly allowMutualNestedDeeperMultipleRecursiveParameterSlots: boolean;
  readonly allowMutualNestedFinalGeneralizationAudit: boolean;
  readonly allowConversionFinalAudit: boolean;
  readonly allowResourceBounds: boolean;
  readonly allowProjectionConformance: boolean;

  constructor(options: KernelOptions = {}) {
    this.recursorProfile = options.recursorProfile ?? "legacy";
    this.allowEmptyInductives = options.allowEmptyInductives ?? false;
    this.allowProjections = options.allowProjections ?? false;
    this.allowStructureEta = options.allowStructureEta ?? false;
    this.allowHigherOrderPositiveRecursion = options.allowHigherOrderPositiveRecursion ?? false;
    this.allowIndexedRecursiveRecursors = options.allowIndexedRecursiveRecursors ?? false;
    this.allowIndexedProjections = options.allowIndexedProjections ?? false;
    this.allowPropElimination = options.allowPropElimination ?? false;
    this.allowRecursorK = options.allowRecursorK ?? false;
    this.allowInductiveUniverseChecks = options.allowInductiveUniverseChecks ?? false;
    this.allowDependentConstructorFields = options.allowDependentConstructorFields ?? false;
    this.allowTelescopeTerms = options.allowTelescopeTerms ?? false;
    this.allowMutualInductives = options.allowMutualInductives ?? false;
    this.allowMutualParameters = options.allowMutualParameters ?? false;
    this.allowMutualIndices = options.allowMutualIndices ?? false;
    this.allowHigherOrderMutualRecursion = options.allowHigherOrderMutualRecursion ?? false;
    this.allowMutualProp = options.allowMutualProp ?? false;
    this.allowNestedInductives = options.allowNestedInductives ?? false;
    this.allowNestedParameters = options.allowNestedParameters ?? false;
    this.allowNestedIndices = options.allowNestedIndices ?? false;
    this.allowNestedIndexExpressions = options.allowNestedIndexExpressions ?? false;
    this.allowNestedMultipleSpecializations = options.allowNestedMultipleSpecializations ?? false;
    this.allowNestedPolymorphic = options.allowNestedPolymorphic ?? false;
    this.allowNestedIndexedContainers = options.allowNestedIndexedContainers ?? false;
    this.allowLeanRecursorMinorOrder = options.allowLeanRecursorMinorOrder ?? false;
    this.allowNestedDeeper = options.allowNestedDeeper ?? false;
    this.allowNestedDeeperGeneralization = options.allowNestedDeeperGeneralization ?? false;
    this.allowNestedDeeperParameters = options.allowNestedDeeperParameters ?? false;
    this.allowNestedDeeperIndices = options.allowNestedDeeperIndices ?? false;
    this.allowNestedDeeperPolymorphic = options.allowNestedDeeperPolymorphic ?? false;
    this.allowNestedDeeperMultipleFields = options.allowNestedDeeperMultipleFields ?? false;
    this.allowNestedDeeperProp = options.allowNestedDeeperProp ?? false;
    this.allowNestedDeeperMultiParameter = options.allowNestedDeeperMultiParameter ?? false;
    this.allowNestedDeeperMultiParameterGeneralization = options.allowNestedDeeperMultiParameterGeneralization ?? false;
    this.allowNestedDeeperDependentContainerParameters = options.allowNestedDeeperDependentContainerParameters ?? false;
    this.allowUniformParameterDefEq = options.allowUniformParameterDefEq ?? false;
    this.allowRecursorFamilyBinderInfo = options.allowRecursorFamilyBinderInfo ?? false;
    this.allowMutualNestedGeneralization = options.allowMutualNestedGeneralization ?? false;
    this.allowMutualNestedParameters = options.allowMutualNestedParameters ?? false;
    this.allowMutualNestedIndices = options.allowMutualNestedIndices ?? false;
    this.allowMutualNestedPolymorphic = options.allowMutualNestedPolymorphic ?? false;
    this.allowMutualNestedProp = options.allowMutualNestedProp ?? false;
    this.allowMutualNestedIndexedContainers = options.allowMutualNestedIndexedContainers ?? false;
    this.allowMutualNestedDeeper = options.allowMutualNestedDeeper ?? false;
    this.allowMutualNestedDeeperParameters = options.allowMutualNestedDeeperParameters ?? false;
    this.allowMutualNestedDeeperIndices = options.allowMutualNestedDeeperIndices ?? false;
    this.allowMutualNestedDeeperPolymorphic = options.allowMutualNestedDeeperPolymorphic ?? false;
    this.allowMutualNestedDeeperProp = options.allowMutualNestedDeeperProp ?? false;
    this.allowMutualNestedDeeperIndexedContainers = options.allowMutualNestedDeeperIndexedContainers ?? false;
    this.allowMutualNestedDeeperMultiParameterContainers = options.allowMutualNestedDeeperMultiParameterContainers ?? false;
    this.allowMutualNestedDeeperDependentContainerParameters = options.allowMutualNestedDeeperDependentContainerParameters ?? false;
    this.allowMutualNestedDeeperMultipleFields = options.allowMutualNestedDeeperMultipleFields ?? false;
    this.allowMutualNestedDeeperMultipleRecursiveParameterSlots = options.allowMutualNestedDeeperMultipleRecursiveParameterSlots ?? false;
    this.allowMutualNestedFinalGeneralizationAudit = options.allowMutualNestedFinalGeneralizationAudit ?? false;
    this.allowConversionFinalAudit = options.allowConversionFinalAudit ?? false;
    this.allowResourceBounds = options.allowResourceBounds ?? false;
    this.allowProjectionConformance = options.allowProjectionConformance ?? false;
  }

  has(name: string): boolean { return this.declarations.has(name); }
  get(name: string): CheckedDeclaration | undefined { return this.declarations.get(name); }

  add(checked: CheckedDeclaration): void {
    if (this.declarations.has(checked.declaration.name)) {
      throw new KernelError(`duplicate declaration: ${checked.declaration.name}`);
    }
    this.declarations.set(checked.declaration.name, checked);
  }

  all(): CheckedDeclaration[] { return [...this.declarations.values()]; }

  clone(): Environment {
    const copy = new Environment({recursorProfile:this.recursorProfile,allowEmptyInductives:this.allowEmptyInductives,allowProjections:this.allowProjections,allowStructureEta:this.allowStructureEta,allowHigherOrderPositiveRecursion:this.allowHigherOrderPositiveRecursion,allowIndexedRecursiveRecursors:this.allowIndexedRecursiveRecursors,allowIndexedProjections:this.allowIndexedProjections,allowPropElimination:this.allowPropElimination,allowRecursorK:this.allowRecursorK,allowInductiveUniverseChecks:this.allowInductiveUniverseChecks,allowDependentConstructorFields:this.allowDependentConstructorFields,allowTelescopeTerms:this.allowTelescopeTerms,allowMutualInductives:this.allowMutualInductives,allowMutualParameters:this.allowMutualParameters,allowMutualIndices:this.allowMutualIndices,allowHigherOrderMutualRecursion:this.allowHigherOrderMutualRecursion,allowMutualProp:this.allowMutualProp,allowNestedInductives:this.allowNestedInductives,allowNestedParameters:this.allowNestedParameters,allowNestedIndices:this.allowNestedIndices,allowNestedIndexExpressions:this.allowNestedIndexExpressions,allowNestedMultipleSpecializations:this.allowNestedMultipleSpecializations,allowNestedPolymorphic:this.allowNestedPolymorphic,allowNestedIndexedContainers:this.allowNestedIndexedContainers,allowLeanRecursorMinorOrder:this.allowLeanRecursorMinorOrder,allowNestedDeeper:this.allowNestedDeeper,allowNestedDeeperGeneralization:this.allowNestedDeeperGeneralization,allowNestedDeeperParameters:this.allowNestedDeeperParameters,allowNestedDeeperIndices:this.allowNestedDeeperIndices,allowNestedDeeperPolymorphic:this.allowNestedDeeperPolymorphic,allowNestedDeeperMultipleFields:this.allowNestedDeeperMultipleFields,allowNestedDeeperProp:this.allowNestedDeeperProp,allowNestedDeeperMultiParameter:this.allowNestedDeeperMultiParameter,allowNestedDeeperMultiParameterGeneralization:this.allowNestedDeeperMultiParameterGeneralization,allowNestedDeeperDependentContainerParameters:this.allowNestedDeeperDependentContainerParameters,allowUniformParameterDefEq:this.allowUniformParameterDefEq,allowRecursorFamilyBinderInfo:this.allowRecursorFamilyBinderInfo,allowMutualNestedGeneralization:this.allowMutualNestedGeneralization,allowMutualNestedParameters:this.allowMutualNestedParameters,allowMutualNestedIndices:this.allowMutualNestedIndices,allowMutualNestedPolymorphic:this.allowMutualNestedPolymorphic,allowMutualNestedProp:this.allowMutualNestedProp,allowMutualNestedIndexedContainers:this.allowMutualNestedIndexedContainers,allowMutualNestedDeeper:this.allowMutualNestedDeeper,allowMutualNestedDeeperParameters:this.allowMutualNestedDeeperParameters,allowMutualNestedDeeperIndices:this.allowMutualNestedDeeperIndices,allowMutualNestedDeeperPolymorphic:this.allowMutualNestedDeeperPolymorphic,allowMutualNestedDeeperProp:this.allowMutualNestedDeeperProp,allowMutualNestedDeeperIndexedContainers:this.allowMutualNestedDeeperIndexedContainers,allowMutualNestedDeeperMultiParameterContainers:this.allowMutualNestedDeeperMultiParameterContainers,allowMutualNestedDeeperDependentContainerParameters:this.allowMutualNestedDeeperDependentContainerParameters,allowMutualNestedDeeperMultipleFields:this.allowMutualNestedDeeperMultipleFields,allowMutualNestedDeeperMultipleRecursiveParameterSlots:this.allowMutualNestedDeeperMultipleRecursiveParameterSlots,allowMutualNestedFinalGeneralizationAudit:this.allowMutualNestedFinalGeneralizationAudit,allowConversionFinalAudit:this.allowConversionFinalAudit,allowResourceBounds:this.allowResourceBounds,allowProjectionConformance:this.allowProjectionConformance});
    for (const [name, value] of this.declarations) {
      copy.declarations.set(name, {
        declaration: value.declaration,
        assumptions: new Set(value.assumptions),
        generated: [...value.generated],
      });
    }
    return copy;
  }

  replaceWith(other: Environment): void {
    this.declarations = new Map();
    for (const [name, value] of other.declarations) {
      this.declarations.set(name, {
        declaration: value.declaration,
        assumptions: new Set(value.assumptions),
        generated: [...value.generated],
      });
    }
  }
}

type Context = Term[];

function lookupBVar(ctx: Context, index: number): Term {
  const ty = ctx[index];
  if (!ty) throw new KernelError(`unbound de Bruijn variable #${index}`);
  return shift(ty, index + 1);
}

function flattenApps(term: Term): { head: Term; args: Term[] } {
  const args: Term[] = [];
  let head = term;
  while (head.tag === "app") {
    args.unshift(head.arg);
    head = head.fn;
  }
  return { head, args };
}

function mkApps(head: Term, args: readonly Term[]): Term {
  let out = head;
  for (const arg of args) out = { tag: "app", fn: out, arg };
  return out;
}

interface ProjectionShape {
  inductive: Extract<CoreDeclaration,{kind:"inductive"}>;
  constructor: { name:string; type:Term };
  fieldCount: number;
  recursive: boolean;
}

/**
 * Lean raw Expr.proj is meaningful only for one-constructor inductives.
 * v15-v17 retain the original zero-index slice. v18+ admits indexed majors,
 * but indexed inductives never acquire structure eta.
 */
function projectionShape(env:Environment,typeName:string):ProjectionShape {
  const entry=env.get(typeName);
  if(!entry || entry.declaration.kind!=="inductive") throw new KernelError(`invalid projection: '${typeName}' is not an inductive type`);
  const d=entry.declaration;
  if(d.numIndices!==0 && !env.allowIndexedProjections) throw new KernelError(`indexed projections are unsupported in this kernel profile: ${typeName}`);
  if(d.constructors.length!==1) throw new KernelError(`invalid projection: ${typeName} does not have exactly one constructor`);
  let tail=d.constructors[0].type;
  for(let p=0;p<d.numParams;p++){
    if(tail.tag!=="pi") throw new KernelError(`invalid projection metadata for ${typeName}: constructor parameter telescope is too short`);
    tail=tail.body;
  }
  let fieldCount=0, recursive=false;
  while(tail.tag==="pi"){
    if(containsConst(tail.domain,typeName)) recursive=true;
    fieldCount++;
    tail=tail.body;
  }
  return{inductive:d,constructor:d.constructors[0],fieldCount,recursive};
}

function inferProjectionLegacy(env:Environment,ctx:Context,term:Extract<Term,{tag:"proj"}>):Term {
  if(!env.allowProjections) throw new KernelError("projection expressions unavailable in this kernel profile");
  if(!Number.isSafeInteger(term.index) || term.index<0) throw new KernelError(`invalid projection index: ${term.index}`);
  const shape=projectionShape(env,term.typeName);
  if(term.index>=shape.fieldCount) throw new KernelError(`invalid projection index ${term.index} for ${term.typeName}`);

  const majorType=kernelWhnfIn(env,ctx,infer(env,ctx,term.expr));
  const {head,args}=flattenApps(majorType);
  if(head.tag!=="const" || head.name!==term.typeName) throw new KernelError(`invalid projection from type ${pretty(majorType)}; expected ${term.typeName}`);
  if(head.levels.length!==shape.inductive.levelParams.length) throw new KernelError(`invalid projection universe arity for ${term.typeName}`);
  const expectedArity=shape.inductive.numParams+shape.inductive.numIndices;
  if(args.length!==expectedArity) throw new KernelError(`invalid projection major arity for ${term.typeName}: expected ${expectedArity}, got ${args.length}`);

  let instantiatedTail=instantiateTermLevels(shape.constructor.type,shape.inductive.levelParams,head.levels);
  let localTail=instantiatedTail;
  for(let p=0;p<shape.inductive.numParams;p++){
    if(instantiatedTail.tag!=="pi"||localTail.tag!=="pi") throw new KernelError(`invalid projection metadata for ${term.typeName}`);
    instantiatedTail=instantiate(instantiatedTail.body,args[p]);
    localTail=instantiate(localTail.body,args[p]);
  }

  // Lean's kernel forbids extracting data from proof-valued majors. For a
  // dependent later proof field, proposition-ness must be decided in the
  // constructor-local binder context before generated raw projections are
  // substituted for earlier fields.
  const majorIsProp=isProp(env,ctx,majorType);
  const localCtx:Context=[];
  for(let i=0;i<shape.fieldCount;i++){
    if(instantiatedTail.tag!=="pi"||localTail.tag!=="pi") throw new KernelError(`invalid projection metadata for ${term.typeName}`);
    const fieldIsProp=isProp(env,localCtx,localTail.domain);
    if(i===term.index){
      if(majorIsProp&&!fieldIsProp) throw new KernelError(`invalid projection from Prop ${term.typeName}: field ${i} is data-valued`);
      return instantiatedTail.domain;
    }
    const prior:Term={tag:"proj",typeName:term.typeName,index:i,expr:term.expr};
    instantiatedTail=instantiate(instantiatedTail.body,prior);
    localCtx.unshift(localTail.domain);
    localTail=localTail.body;
  }
  throw new KernelError(`invalid projection index ${term.index} for ${term.typeName}`);
}


/**
 * Lean 4.33.1 `type_checker::infer_proj` correspondence path.
 *
 * The key subtlety is proof-valued majors.  Lean only materializes a prior raw
 * projection when the remaining constructor telescope actually depends on that
 * field.  If such a dependency would require projecting data from Prop, the
 * projection is rejected.  An independent proof field after an unused data
 * field is therefore legal, while a proof field whose type depends on that data
 * is rejected.  This is intentionally profile-gated so v69 and earlier artifacts
 * retain byte-for-byte historical replay semantics.
 */
function inferProjectionLean4331(env:Environment,ctx:Context,term:Extract<Term,{tag:"proj"}>):Term {
  if(!env.allowProjections) throw new KernelError("projection expressions unavailable in this kernel profile");
  if(!Number.isSafeInteger(term.index) || term.index<0) throw new KernelError(`invalid projection index: ${term.index}`);
  const shape=projectionShape(env,term.typeName);

  const majorType=kernelWhnfIn(env,ctx,infer(env,ctx,term.expr));
  const {head,args}=flattenApps(majorType);
  if(head.tag!=="const" || head.name!==term.typeName) throw new KernelError(`invalid projection from type ${pretty(majorType)}; expected ${term.typeName}`);
  if(head.levels.length!==shape.inductive.levelParams.length) throw new KernelError(`invalid projection universe arity for ${term.typeName}`);
  const expectedArity=shape.inductive.numParams+shape.inductive.numIndices;
  if(args.length!==expectedArity) throw new KernelError(`invalid projection major arity for ${term.typeName}: expected ${expectedArity}, got ${args.length}`);

  let tail=instantiateTermLevels(shape.constructor.type,shape.inductive.levelParams,head.levels);
  for(let p=0;p<shape.inductive.numParams;p++){
    tail=kernelWhnfIn(env,ctx,tail);
    if(tail.tag!=="pi") throw new KernelError(`invalid projection metadata for ${term.typeName}`);
    tail=instantiate(tail.body,args[p]);
  }

  const majorIsProp=isProp(env,ctx,majorType);
  for(let i=0;i<term.index;i++){
    tail=kernelWhnfIn(env,ctx,tail);
    if(tail.tag!=="pi") throw new KernelError(`invalid projection index ${term.index} for ${term.typeName}`);
    if(containsLooseBVar(tail.body)){
      if(majorIsProp&&!isProp(env,ctx,tail.domain)){
        throw new KernelError(`invalid projection from Prop ${term.typeName}: dependency crosses data-valued field ${i}`);
      }
      const prior:Term={tag:"proj",typeName:term.typeName,index:i,expr:term.expr};
      tail=instantiate(tail.body,prior);
    }else{
      tail=tail.body;
    }
  }

  tail=kernelWhnfIn(env,ctx,tail);
  if(tail.tag!=="pi") throw new KernelError(`invalid projection index ${term.index} for ${term.typeName}`);
  const result=tail.domain;
  if(majorIsProp&&!isProp(env,ctx,result)){
    throw new KernelError(`invalid projection from Prop ${term.typeName}: field ${term.index} is data-valued`);
  }
  return result;
}

function inferProjection(env:Environment,ctx:Context,term:Extract<Term,{tag:"proj"}>):Term {
  return env.allowProjectionConformance
    ? inferProjectionLean4331(env,ctx,term)
    : inferProjectionLegacy(env,ctx,term);
}

function reduceProjection(env:Environment,ctx:Context,term:Extract<Term,{tag:"proj"}>):Term|undefined {
  if(!env.allowProjections) throw new KernelError("projection expressions unavailable in this kernel profile");
  const shape=projectionShape(env,term.typeName);
  if(term.index<0 || term.index>=shape.fieldCount) return undefined;
  const major=kernelWhnfIn(env,ctx,term.expr);
  const {head,args}=flattenApps(major);
  if(head.tag!=="const" || head.name!==shape.constructor.name) {
    if(!sameTerm(major,term.expr)) return{...term,expr:major};
    return undefined;
  }
  if(args.length!==shape.inductive.numParams+shape.fieldCount) return undefined;
  return args[shape.inductive.numParams+term.index];
}

/** Structure eta is intentionally still restricted to the zero-index slice. */
function inductiveApplication(env:Environment,type:Term):{shape:ProjectionShape;head:Extract<Term,{tag:"const"}>;args:Term[]}|undefined {
  const wh=kernelWhnf(env,type);const {head,args}=flattenApps(wh);
  if(head.tag!=="const")return undefined;
  try{
    const shape=projectionShape(env,head.name);
    if(shape.inductive.numIndices!==0)return undefined;
    if(args.length!==shape.inductive.numParams)return undefined;
    return{shape,head,args};
  }catch{return undefined;}
}


/**
 * Kernel weak-head normalization for the implemented profile.
 *
 * It performs beta reduction plus the computation rules for recursors generated
 * by the restricted K1 inductive checker. It intentionally does not perform
 * source-level pattern matching or tactic computation.
 */
export function kernelWhnf(env: Environment, term: Term): Term {
  return kernelWhnfIn(env, [], term);
}

function kernelWhnfIn(env: Environment, ctx: Context, term: Term): Term {
  let current = term;
  for (let fuel = 0; fuel < 20_000; fuel++) {
    if (current.tag === "let") {
      current = instantiate(current.body, current.value);
      continue;
    }
    if (current.tag === "proj") {
      const reduced=reduceProjection(env,ctx,current);
      if(reduced){current=reduced;continue;}
      return current;
    }
    if (current.tag === "const") {
      const entry = env.get(current.name);
      if (entry?.declaration.kind === "definition") {
        const d = entry.declaration;
        if (current.levels.length !== d.levelParams.length) throw new KernelError(`universe arity mismatch for ${current.name}`);
        current = instantiateTermLevels(d.value, d.levelParams, current.levels);
        continue;
      }
      return current;
    }
    if (current.tag === "app") {
      const { head, args } = flattenApps(current);
      const reducedHead = kernelWhnfIn(env, ctx, head);
      if (reducedHead.tag === "lam" && args.length > 0) {
        current = mkApps(instantiate(reducedHead.body, args[0]), args.slice(1));
        continue;
      }

      if (reducedHead.tag === "const") {
        const entry = env.get(reducedHead.name);
        if (entry?.declaration.kind === "recursor") {
          const reduced = reduceSimpleRecursor(env, ctx, reducedHead, args, entry.declaration.metadata);
          if (reduced) { current = reduced; continue; }
        }
        if (entry?.declaration.kind === "quotient" && (entry.declaration.quotKind === "lift" || entry.declaration.quotKind === "ind")) {
          const reduced = reduceQuotientRecursor(env, reducedHead, args, entry.declaration.quotKind);
          if (reduced) { current = reduced; continue; }
        }
      }

      if (reducedHead !== head) {
        const rebuilt=mkApps(reducedHead,args);
        // v67 closes a WHNF spine-composition gap: unfolding a transparent
        // function head may expose a partially-applied recursor/quotient or
        // another application that becomes reducible only after the caller's
        // remaining arguments are appended. Lean re-flattens that spine.
        // Historical profiles intentionally retain the old one-step behavior.
        if(env.allowConversionFinalAudit && !sameTerm(rebuilt,current)){current=rebuilt;continue;}
        return rebuilt;
      }
      return current;
    }
    return current;
  }
  throw new KernelResourceError("weak-head normalization resource limit exceeded","whnf_fuel");
}

/** Compatibility alias used internally by older K0 code paths. */
export function whnf(term: Term): Term {
  // There are no environment-dependent reductions in this compatibility path.
  const empty = new Environment();
  return kernelWhnf(empty, term);
}

function instantiateOuterContext(term:Term,values:readonly Term[]):Term{
  let out=term;for(let i=values.length-1;i>=0;i--)out=instantiate(out,values[i]);return out;
}

function buildPointwiseRecursiveIH(
  recursor:Extract<Term,{tag:"const"}>,
  recursivePrefix:readonly Term[],
  field:Term,
  fieldType:Term,
):Term{
  const domains:{domain:Term;binderInfo:BinderInfo}[]=[];
  let tail=fieldType;
  while(tail.tag==="pi"){domains.push({domain:tail.domain,binderInfo:binderInfoOf(tail)});tail=tail.body;}
  const depth=domains.length;
  let appliedField=shift(field,depth);
  for(let i=0;i<depth;i++) appliedField={tag:"app",fn:appliedField,arg:{tag:"bvar",index:depth-1-i}};
  let body=mkApps(shift(recursor,depth),[...recursivePrefix.map(a=>shift(a,depth)),appliedField]);
  for(let i=domains.length-1;i>=0;i--) body={tag:"lam",domain:domains[i].domain,body,binderInfo:domains[i].binderInfo};
  return body;
}


function buildPointwiseIndexedRecursiveIH(
  env:Environment,
  recursor:Extract<Term,{tag:"const"}>,
  recursivePrefix:readonly Term[],
  field:Term,
  fieldType:Term,
  inductiveName:string,
  numParams:number,
  numIndices:number,
):Term|undefined{
  const domains:{domain:Term;binderInfo:BinderInfo}[]=[];
  let tail=fieldType;
  while(tail.tag==="pi"){domains.push({domain:tail.domain,binderInfo:binderInfoOf(tail)});tail=tail.body;}
  const terminal=flattenApps(kernelWhnf(env,tail));
  if(terminal.head.tag!=="const"||terminal.head.name!==inductiveName||terminal.args.length!==numParams+numIndices)return undefined;
  const depth=domains.length;
  let appliedField=shift(field,depth);
  for(let i=0;i<depth;i++)appliedField={tag:"app",fn:appliedField,arg:{tag:"bvar",index:depth-1-i}};
  const recursiveIndices=terminal.args.slice(numParams);
  let body=mkApps(shift(recursor,depth),[...recursivePrefix.map(a=>shift(a,depth)),...recursiveIndices,appliedField]);
  for(let i=domains.length-1;i>=0;i--)body={tag:"lam",domain:domains[i].domain,body,binderInfo:domains[i].binderInfo};
  return body;
}

function buildPointwiseMutualRecursiveIH(
  env:Environment,
  targetRecursor:Extract<Term,{tag:"const"}>,
  recursivePrefix:readonly Term[],
  field:Term,
  fieldType:Term,
  targetName:string,
  numParams:number,
  numIndices:number,
):Term|undefined{
  const domains:{domain:Term;binderInfo:BinderInfo}[]=[];
  let tail=fieldType;
  while(tail.tag==="pi"){domains.push({domain:tail.domain,binderInfo:binderInfoOf(tail)});tail=tail.body;}
  const terminal=flattenApps(kernelWhnf(env,tail));
  if(terminal.head.tag!=="const"||terminal.head.name!==targetName||terminal.args.length!==numParams+numIndices)return undefined;
  const depth=domains.length;
  let appliedField=shift(field,depth);
  for(let i=0;i<depth;i++)appliedField={tag:"app",fn:appliedField,arg:{tag:"bvar",index:depth-1-i}};
  const recursiveIndices=terminal.args.slice(numParams);
  let body=mkApps(shift(targetRecursor,depth),[...recursivePrefix.map(a=>shift(a,depth)),...recursiveIndices,appliedField]);
  for(let i=domains.length-1;i>=0;i--)body={tag:"lam",domain:domains[i].domain,body,binderInfo:domains[i].binderInfo};
  return body;
}


function buildPointwiseLinkedIndexedRecursiveIH(
  env:Environment,
  targetRecursor:Extract<Term,{tag:"const"}>,
  recursivePrefix:readonly Term[],
  field:Term,
  fieldType:Term,
  numIndices:number,
):Term|undefined{
  const domains:{domain:Term;binderInfo:BinderInfo}[]=[];
  let tail=fieldType;
  while(tail.tag==="pi"){domains.push({domain:tail.domain,binderInfo:binderInfoOf(tail)});tail=tail.body;}
  const terminal=flattenApps(kernelWhnf(env,tail));
  if(terminal.head.tag!=="const"||terminal.args.length<numIndices)return undefined;
  const depth=domains.length;
  let appliedField=shift(field,depth);
  for(let i=0;i<depth;i++)appliedField={tag:"app",fn:appliedField,arg:{tag:"bvar",index:depth-1-i}};
  const recursiveIndices=numIndices===0?[]:terminal.args.slice(terminal.args.length-numIndices);
  let body=mkApps(shift(targetRecursor,depth),[...recursivePrefix.map(a=>shift(a,depth)),...recursiveIndices,appliedField]);
  for(let i=domains.length-1;i>=0;i--)body={tag:"lam",domain:domains[i].domain,body,binderInfo:domains[i].binderInfo};
  return body;
}

function buildPointwiseLinkedRecursiveIH(
  targetRecursor:Extract<Term,{tag:"const"}>,
  recursivePrefix:readonly Term[],
  field:Term,
  fieldType:Term,
):Term{
  const domains:{domain:Term;binderInfo:BinderInfo}[]=[];
  let tail=fieldType;
  while(tail.tag==="pi"){domains.push({domain:tail.domain,binderInfo:binderInfoOf(tail)});tail=tail.body;}
  const depth=domains.length;
  let appliedField=shift(field,depth);
  for(let i=0;i<depth;i++)appliedField={tag:"app",fn:appliedField,arg:{tag:"bvar",index:depth-1-i}};
  let body=mkApps(shift(targetRecursor,depth),[...recursivePrefix.map(a=>shift(a,depth)),appliedField]);
  for(let i=domains.length-1;i>=0;i--)body={tag:"lam",domain:domains[i].domain,body,binderInfo:domains[i].binderInfo};
  return body;
}

/**
 * Lean 4.33.1 RecursorVal.k classification for the admitted non-mutual slice.
 * The permission is derived from the checked inductive declaration; no artifact
 * or frontend-controlled K flag is trusted.
 */
function recursorSupportsKLikeReduction(
  env:Environment,
  metadata:SimpleRecursorMetadata,
):boolean {
  if(metadata.mutual)return false;
  const entry=env.get(metadata.inductive);
  if(!entry||entry.declaration.kind!=="inductive")return false;
  const decl=entry.declaration;
  if(decl.constructors.length!==1||metadata.rules.length!==1)return false;

  // The inductive must live in Prop.
  let familyTail=decl.type;
  while(familyTail.tag==="pi")familyTail=familyTail.body;
  if(familyTail.tag!=="sort"||!levelDefEq(familyTail.level,LevelZero))return false;

  // Lean ConstructorVal.numFields excludes datatype parameters. K is enabled
  // exactly when the unique constructor has zero such fields.
  let ctorTail=decl.constructors[0].type,binderCount=0;
  while(ctorTail.tag==="pi"){binderCount++;ctorTail=ctorTail.body;}
  if(binderCount!==decl.numParams)return false;
  const rule=metadata.rules[0];
  return rule.ctor===decl.constructors[0].name&&rule.nfields===0;
}

/**
 * Exact K-like major conversion used before ordinary iota reduction. This
 * mirrors Lean's `toCtorWhenK`: infer the major type, reconstruct the unique
 * nullary constructor from the major's datatype parameters, and use it only
 * when its inferred type is definitionally equal to the actual major type.
 */
function toCtorWhenK(
  env:Environment,
  ctx:Context,
  major:Term,
  metadata:SimpleRecursorMetadata,
):Term {
  if(!env.allowRecursorK||!recursorSupportsKLikeReduction(env,metadata))return major;
  let majorType:Term;
  try{majorType=kernelWhnfIn(env,ctx,infer(env,ctx,major));}catch{return major;}
  const {head,args}=flattenApps(majorType);
  if(head.tag!=="const"||head.name!==metadata.inductive)return major;
  const indEntry=env.get(metadata.inductive);
  if(!indEntry||indEntry.declaration.kind!=="inductive")return major;
  const decl=indEntry.declaration;
  if(args.length!==decl.numParams+decl.numIndices)return major;
  const ctor=decl.constructors[0];
  const newCtor=mkApps({tag:"const",name:ctor.name,levels:[...head.levels]},args.slice(0,decl.numParams));
  let newType:Term;
  try{newType=infer(env,ctx,newCtor);}catch{return major;}
  return defEq(env,ctx,majorType,newType)?newCtor:major;
}

function reduceSimpleRecursor(
  env: Environment,
  ctx: Context,
  recursor: Extract<Term, { tag: "const" }>,
  args: readonly Term[],
  metadata: SimpleRecursorMetadata,
): Term | undefined {
  // Recursor layout for the current profiles:
  // params..., motive, minors..., indices..., major
  const motiveCount = metadata.mutual?.motiveCount ?? 1;
  const motivePos = metadata.numParams;
  const minorsStart = motivePos + motiveCount;
  const indicesStart = minorsStart + metadata.numMinors;
  const majorPos = indicesStart + metadata.numIndices;
  if (args.length <= majorPos) return undefined;

  let major = kernelWhnfIn(env, ctx, args[majorPos]);
  major = toCtorWhenK(env,ctx,major,metadata);
  const { head: ctorHead, args: ctorArgs } = flattenApps(major);
  if (ctorHead.tag !== "const") return undefined;
  const ruleIndex = metadata.rules.findIndex(r => r.ctor === ctorHead.name);
  if (ruleIndex < 0) return undefined;
  const rule = metadata.rules[ruleIndex];
  const ctorParamCount = rule.ctorParamCount ?? metadata.numParams;
  if (ctorArgs.length !== ctorParamCount + rule.nfields) return undefined;

  const fields = ctorArgs.slice(ctorParamCount);
  const minorIndex = rule.minorIndex ?? ruleIndex;
  const minor = args[minorsStart + minorIndex];
  const minorArgs: Term[] = [];
  const recursiveIHArgs:Term[]=[];
  const fieldsFirst=env.allowLeanRecursorMinorOrder;
  const pushIH=(ih:Term)=>{if(fieldsFirst)recursiveIHArgs.push(ih);else minorArgs.push(ih);};
  if(fieldsFirst)minorArgs.push(...fields);
  for (let i = 0; i < fields.length; i++) {
    const field = fields[i];
    if(!fieldsFirst)minorArgs.push(field);
    if (rule.recursiveFields[i]) {
      // Reuse motive + all minors. Higher-order strictly-positive recursive
      // arguments receive a pointwise induction hypothesis, matching Lean.
      const recursivePrefix = args.slice(0, indicesStart);
      const explicitTargetRecursor=rule.recursiveRecursors?.[i]??null;
      if(explicitTargetRecursor){
        // v29 nested preprocessing restores an internal auxiliary mutual family
        // to the original container specialization.  Reduction therefore names
        // the linked public recursor directly instead of trusting a serialized
        // family-to-recursor capability flag.  The rule itself is generated by
        // the kernel from checked auxiliary mutual metadata.
        const recursiveFieldType=rule.recursiveFieldTypes?.[i];
        if(!recursiveFieldType)return undefined;
        const instantiated=instantiateOuterContext(recursiveFieldType,fields.slice(0,i));
        const targetEntry=env.get(explicitTargetRecursor);
        if(!targetEntry||targetEntry.declaration.kind!=="recursor")return undefined;
        if(targetEntry.declaration.metadata.numIndices>0){
          const ih=env.allowNestedIndexedContainers
            ?buildPointwiseLinkedIndexedRecursiveIH(
              env,{tag:"const",name:explicitTargetRecursor,levels:[...recursor.levels]},recursivePrefix,field,instantiated,
              targetEntry.declaration.metadata.numIndices,
            )
            :buildPointwiseMutualRecursiveIH(
              env,{tag:"const",name:explicitTargetRecursor,levels:[...recursor.levels]},recursivePrefix,field,instantiated,
              targetEntry.declaration.metadata.inductive,targetEntry.declaration.metadata.numParams,targetEntry.declaration.metadata.numIndices,
            );
          if(!ih)return undefined;
          pushIH(ih);
        }else{
          const ih=buildPointwiseLinkedRecursiveIH(
            {tag:"const",name:explicitTargetRecursor,levels:[...recursor.levels]},recursivePrefix,field,instantiated,
          );
          pushIH(ih);
        }
        continue;
      }
      const mutualTarget=rule.recursiveTargets?.[i]??null;
      if(metadata.mutual&&mutualTarget){
        const targetRecIndex=metadata.mutual.inductives.indexOf(mutualTarget);
        if(targetRecIndex<0)return undefined;
        const targetRecName=metadata.mutual.recursors[targetRecIndex];
        const targetIndexCount=metadata.mutual.indexCounts?.[targetRecIndex]??0;
        const recursiveFieldType=rule.recursiveFieldTypes?.[i];
        if(!recursiveFieldType)return undefined;
        const instantiated=instantiateOuterContext(recursiveFieldType,ctorArgs.slice(0,metadata.numParams+i));
        const ih=buildPointwiseMutualRecursiveIH(
          env,{tag:"const",name:targetRecName,levels:[...recursor.levels]},recursivePrefix,field,instantiated,mutualTarget,metadata.numParams,targetIndexCount,
        );
        if(!ih)return undefined;
        pushIH(ih);
        continue;
      }
      const recursiveFieldType=rule.recursiveFieldTypes?.[i];
      const instantiatedRecursiveFieldType=recursiveFieldType
        ? instantiateOuterContext(recursiveFieldType,ctorArgs.slice(0,metadata.numParams+i))
        : undefined;
      if(instantiatedRecursiveFieldType && metadata.numIndices>0){
        const ih=buildPointwiseIndexedRecursiveIH(
          env,recursor,recursivePrefix,field,instantiatedRecursiveFieldType,
          metadata.inductive,metadata.numParams,metadata.numIndices,
        );
        if(!ih)return undefined;
        pushIH(ih);
      }else{
        pushIH(instantiatedRecursiveFieldType
          ? buildPointwiseRecursiveIH(recursor,recursivePrefix,field,instantiatedRecursiveFieldType)
          : mkApps(recursor,[...recursivePrefix,field]));
      }
    }
  }
  if(fieldsFirst)minorArgs.push(...recursiveIHArgs);

  const reduced = mkApps(minor, minorArgs);
  const rest = args.slice(majorPos + 1);
  return mkApps(reduced, rest);
}

function reduceQuotientRecursor(
  env: Environment,
  recursor: Extract<Term, { tag: "const" }>,
  args: readonly Term[],
  kind: "lift" | "ind",
): Term | undefined {
  // Exact Lean 4.33.1 quotient reduction argument positions:
  // Quot.lift: α r β f sound major   (major=5, f=3)
  // Quot.ind : α r β f major         (major=4, f=3)
  const majorPos = kind === "lift" ? 5 : 4;
  const fnPos = 3;
  if (args.length <= majorPos) return undefined;
  const major = kernelWhnf(env, args[majorPos]);
  const { head: mkHead, args: mkArgs } = flattenApps(major);
  if (mkHead.tag !== "const" || mkHead.name !== "Quot.mk" || mkArgs.length !== 3) return undefined;
  // Representative is the third explicit Core argument of Quot.mk: α, r, a.
  let reduced: Term = { tag: "app", fn: args[fnPos], arg: mkArgs[2] };
  const rest = args.slice(majorPos + 1);
  if (rest.length) reduced = mkApps(reduced, rest);
  return reduced;
}

export function infer(env: Environment, ctx: Context, term: Term): Term {
  switch (term.tag) {
    case "sort":
      return { tag: "sort", level: levelSucc(term.level) };

    case "bvar":
      return lookupBVar(ctx, term.index);

    case "const": {
      const entry = env.get(term.name);
      if (!entry) throw new KernelError(`unknown constant: ${term.name}`);
      const decl = entry.declaration;
      if (decl.kind === "quot" || decl.kind === "mutualInductive") throw new KernelError("internal: non-constant declaration marker cannot be referenced as a constant");
      if (term.levels.length !== decl.levelParams.length) {
        throw new KernelError(
          `universe arity mismatch for ${term.name}: expected ${decl.levelParams.length}, got ${term.levels.length}`,
        );
      }
      return instantiateTermLevels(decl.type, decl.levelParams, term.levels);
    }

    case "proj":
      return inferProjection(env,ctx,term);

    case "pi": {
      const domainSort = expectSort(env, ctx, infer(env, ctx, term.domain), "Pi domain");
      const codomainSort = expectSort(
        env,
        [term.domain, ...ctx],
        infer(env, [term.domain, ...ctx], term.body),
        "Pi codomain",
      );
      return { tag: "sort", level: levelIMax(domainSort, codomainSort) };
    }

    case "lam": {
      expectSort(env, ctx, infer(env, ctx, term.domain), "lambda domain");
      const bodyType = infer(env, [term.domain, ...ctx], term.body);
      return { tag: "pi", domain: term.domain, body: bodyType, binderInfo: term.binderInfo };
    }

    case "let": {
      expectSort(env, ctx, infer(env, ctx, term.type), "let type");
      check(env, ctx, term.value, term.type);
      const bodyType = infer(env, [term.type, ...ctx], term.body);
      return instantiate(bodyType, term.value);
    }

    case "app": {
      const fnType = kernelWhnfIn(env, ctx, infer(env, ctx, term.fn));
      if (fnType.tag !== "pi") {
        throw new KernelError(`application head is not a function; inferred ${pretty(fnType)}`);
      }
      check(env, ctx, term.arg, fnType.domain);
      return instantiate(fnType.body, term.arg);
    }
  }
}

function expectSort(env: Environment, _ctx: Context, type: Term, where: string): Level {
  const t = kernelWhnfIn(env, _ctx, type);
  if (t.tag !== "sort") throw new KernelError(`${where} is not a type; inferred ${pretty(t)}`);
  return t.level;
}

export function check(env: Environment, ctx: Context, term: Term, expected: Term): void {
  const actual = infer(env, ctx, term);
  if (!defEq(env, ctx, actual, expected)) {
    throw new KernelError(`type mismatch\n  expected: ${pretty(expected)}\n  actual:   ${pretty(actual)}`);
  }
}

export function defEq(env: Environment, ctx: Context, left: Term, right: Term): boolean {
  return defEqInternal(env, ctx, left, right, true, 0);
}

function defEqInternal(
  env: Environment,
  ctx: Context,
  left0: Term,
  right0: Term,
  allowProofIrrelevance: boolean,
  depth: number,
  allowStructureEta: boolean = true,
): boolean {
  if (depth > 512) throw new KernelResourceError("definitional equality recursion limit exceeded","defeq_depth");

  const left = kernelWhnfIn(env, ctx, left0);
  const right = kernelWhnfIn(env, ctx, right0);
  if (sameTerm(left, right)) return true;

  if (left.tag === "sort" && right.tag === "sort" && levelDefEq(left.level, right.level)) return true;
  if (left.tag === "bvar" && right.tag === "bvar" && left.index === right.index) return true;
  if (left.tag === "const" && right.tag === "const") {
    if (left.name === right.name && left.levels.length === right.levels.length && left.levels.every((l, i) => levelDefEq(l, right.levels[i]))) return true;
    // Distinct constants can still be definitionally equal through proof
    // irrelevance or structure eta; do not fail before those kernel rules run.
  }

  if (left.tag === "app" && right.tag === "app") {
    if (
      defEqInternal(env, ctx, left.fn, right.fn, allowProofIrrelevance, depth + 1, allowStructureEta) &&
      defEqInternal(env, ctx, left.arg, right.arg, allowProofIrrelevance, depth + 1, allowStructureEta)
    ) return true;
  }

  if (left.tag === "pi" && right.tag === "pi") {
    if (
      defEqInternal(env, ctx, left.domain, right.domain, allowProofIrrelevance, depth + 1, allowStructureEta) &&
      defEqInternal(env, [left.domain, ...ctx], left.body, right.body, allowProofIrrelevance, depth + 1, allowStructureEta)
    ) return true;
  }

  if (left.tag === "lam" && right.tag === "lam") {
    if (
      defEqInternal(env, ctx, left.domain, right.domain, allowProofIrrelevance, depth + 1, allowStructureEta) &&
      defEqInternal(env, [left.domain, ...ctx], left.body, right.body, allowProofIrrelevance, depth + 1, allowStructureEta)
    ) return true;
  }

  // Lean-style function eta for the supported function fragment.
  if (left.tag === "lam") {
    const rightType = safeInfer(env, ctx, right);
    const pi = rightType && kernelWhnfIn(env, ctx, rightType);
    if (pi?.tag === "pi" && defEqInternal(env, ctx, left.domain, pi.domain, false, depth + 1, allowStructureEta)) {
      const etaRight: Term = { tag: "app", fn: shift(right, 1), arg: { tag: "bvar", index: 0 } };
      if (defEqInternal(env, [left.domain, ...ctx], left.body, etaRight, allowProofIrrelevance, depth + 1, allowStructureEta)) return true;
    }
  }
  if (right.tag === "lam") {
    const leftType = safeInfer(env, ctx, left);
    const pi = leftType && kernelWhnfIn(env, ctx, leftType);
    if (pi?.tag === "pi" && defEqInternal(env, ctx, right.domain, pi.domain, false, depth + 1, allowStructureEta)) {
      const etaLeft: Term = { tag: "app", fn: shift(left, 1), arg: { tag: "bvar", index: 0 } };
      if (defEqInternal(env, [right.domain, ...ctx], etaLeft, right.body, allowProofIrrelevance, depth + 1, allowStructureEta)) return true;
    }
  }

  // Lean kernel eta for nonrecursive, one-constructor, zero-index inductives.
  // Projection expressions are compared fieldwise; projection iota handles a
  // constructor on either side. Recursive one-constructor types intentionally
  // do not receive this eta rule.
  if(env.allowStructureEta && allowStructureEta){
    const leftType=safeInfer(env,ctx,left), rightType=safeInfer(env,ctx,right);
    if(leftType&&rightType&&defEqInternal(env,ctx,leftType,rightType,false,depth+1,false)){
      const app=inductiveApplication(env,leftType);
      if(app && !app.shape.recursive){
        let fieldsEqual=true;
        for(let i=0;i<app.shape.fieldCount;i++){
          const lp:Term={tag:"proj",typeName:app.shape.inductive.name,index:i,expr:left};
          const rp:Term={tag:"proj",typeName:app.shape.inductive.name,index:i,expr:right};
          if(!defEqInternal(env,ctx,lp,rp,allowProofIrrelevance,depth+1, allowStructureEta)){fieldsEqual=false;break;}
        }
        if(fieldsEqual)return true;
      }
    }
  }

  // Lean-style definitional proof irrelevance for the implemented Prop slice.
  if (allowProofIrrelevance) {
    const leftType = safeInfer(env, ctx, left);
    const rightType = safeInfer(env, ctx, right);
    if (
      leftType && rightType &&
      defEqInternal(env, ctx, leftType, rightType, false, depth + 1, allowStructureEta) &&
      isProp(env, ctx, leftType)
    ) return true;
  }

  return false;
}

function safeInfer(env: Environment, ctx: Context, term: Term): Term | undefined {
  try { return infer(env, ctx, term); } catch { return undefined; }
}

function isProp(env: Environment, ctx: Context, type: Term): boolean {
  const sort = safeInfer(env, ctx, type);
  if (!sort) return false;
  const wh = kernelWhnfIn(env, ctx, sort);
  return wh.tag === "sort" && levelDefEq(wh.level, LevelZero);
}

export function collectConstNames(term: Term, out = new Set<string>()): Set<string> {
  switch (term.tag) {
    case "sort":
    case "bvar":
      return out;
    case "const": out.add(term.name); return out;
    case "app": collectConstNames(term.fn, out); collectConstNames(term.arg, out); return out;
    case "lam":
    case "pi": collectConstNames(term.domain, out); collectConstNames(term.body, out); return out;
    case "let": collectConstNames(term.type,out); collectConstNames(term.value,out); collectConstNames(term.body,out); return out;
    case "proj": out.add(term.typeName); collectConstNames(term.expr,out); return out;
  }
}

function dependencyAssumptions(env: Environment, terms: readonly Term[]): Set<string> {
  const result = new Set<string>();
  for (const term of terms) {
    for (const name of collectConstNames(term)) {
      const entry = env.get(name);
      if (!entry) continue;
      if (entry.declaration.kind === "axiom") result.add(name);
      for (const a of entry.assumptions) result.add(a);
    }
  }
  return result;
}

function validateLevelParams(decl: CoreDeclaration): void {
  if (decl.kind === "quot") {
    if (decl.levelParams.length !== 0) throw new KernelError("Quot kernel declaration cannot have universe parameters");
    return;
  }
  const unique = new Set(decl.levelParams);
  if (unique.size !== decl.levelParams.length) throw new KernelError(`duplicate universe parameter in ${decl.name}`);
  for (const p of decl.levelParams) {
    if (!/^[A-Za-z_][A-Za-z0-9_']*$/.test(p)) throw new KernelError(`invalid universe parameter '${p}' in ${decl.name}`);
  }

  const used = new Set<string>();
  const add = (term: Term) => { for (const p of collectTermLevelParams(term)) used.add(p); };
  if(decl.kind==="mutualInductive") {
    for(const m of decl.inductives){ add(m.type); for(const c of m.constructors)add(c.type); }
  } else {
    add(decl.type);
    if (decl.kind === "theorem" || decl.kind === "definition" || decl.kind === "opaque" || decl.kind === "example") add(decl.value);
    if (decl.kind === "inductive") for (const c of decl.constructors) add(c.type);
  }
  for (const p of used) {
    if (!unique.has(p)) throw new KernelError(`undeclared universe parameter '${p}' in ${decl.name}`);
  }
}

function validateName(name: string): void {
  if (!/^[A-Za-z_][A-Za-z0-9_'.]*$/.test(name)) throw new KernelError(`invalid declaration name: ${name}`);
}

function containsConst(term: Term, name: string): boolean {
  switch (term.tag) {
    case "sort":
    case "bvar": return false;
    case "const": return term.name === name;
    case "app": return containsConst(term.fn, name) || containsConst(term.arg, name);
    case "lam":
    case "pi": return containsConst(term.domain, name) || containsConst(term.body, name);
    case "let": return containsConst(term.type,name) || containsConst(term.value,name) || containsConst(term.body,name);
    case "proj": return term.typeName===name || containsConst(term.expr,name);
  }
}

function containsAnyConst(term:Term,names:ReadonlySet<string>):boolean{
  switch(term.tag){
    case "sort": case "bvar": return false;
    case "const": return names.has(term.name);
    case "app": return containsAnyConst(term.fn,names)||containsAnyConst(term.arg,names);
    case "lam": case "pi": return containsAnyConst(term.domain,names)||containsAnyConst(term.body,names);
    case "let": return containsAnyConst(term.type,names)||containsAnyConst(term.value,names)||containsAnyConst(term.body,names);
    case "proj": return names.has(term.typeName)||containsAnyConst(term.expr,names);
  }
}

function splitPi(term: Term): { fields: Term[]; fieldBinderInfo: BinderInfo[]; result: Term } {
  const fields: Term[] = [];
  const fieldBinderInfo: BinderInfo[] = [];
  let cur = term;
  while (cur.tag === "pi") {
    fields.push(cur.domain);
    fieldBinderInfo.push(cur.binderInfo ?? "explicit");
    cur = cur.body;
  }
  return { fields, fieldBinderInfo, result: cur };
}

function checkOrdinaryDeclaration(env: Environment, decl: Exclude<CoreDeclaration, { kind: "inductive" } | { kind: "mutualInductive" } | { kind: "quot" }>): CheckedDeclaration {
  validateName(decl.name);
  validateLevelParams(decl);
  if (env.has(decl.name)) throw new KernelError(`duplicate declaration: ${decl.name}`);

  const typeSort = kernelWhnf(env, infer(env, [], decl.type));
  if (typeSort.tag !== "sort") throw new KernelError(`declaration type is not itself a type: ${pretty(decl.type)}`);

  if (decl.kind === "theorem") {
    if (!levelDefEq(typeSort.level, LevelZero)) {
      throw new KernelError(`theorem ${decl.name} must be proposition-valued; got ${pretty(decl.type)} : ${pretty(typeSort)}`);
    }
    check(env, [], decl.value, decl.type);
  } else if (decl.kind === "definition" || decl.kind === "opaque" || decl.kind === "example") {
    check(env, [], decl.value, decl.type);
  }

  const hasValue = decl.kind === "theorem" || decl.kind === "definition" || decl.kind === "opaque" || decl.kind === "example";
  const assumptions = dependencyAssumptions(env, hasValue ? [decl.type, decl.value] : [decl.type]);
  if (decl.kind === "axiom") assumptions.add(decl.name);
  const checked: CheckedDeclaration = { declaration: decl, assumptions, generated: [] };
  // `example` is checked but deliberately does not extend the environment.
  if (decl.kind !== "example") env.add(checked);
  return checked;
}

/** True when `term` refers to a de Bruijn variable outside binders introduced inside `term` itself. */
function containsLooseBVar(term:Term,depth=0):boolean{
  switch(term.tag){
    case "sort": case "const": return false;
    case "bvar": return term.index>=depth;
    case "app": return containsLooseBVar(term.fn,depth)||containsLooseBVar(term.arg,depth);
    case "lam": case "pi": return containsLooseBVar(term.domain,depth)||containsLooseBVar(term.body,depth+1);
    case "let": return containsLooseBVar(term.type,depth)||containsLooseBVar(term.value,depth)||containsLooseBVar(term.body,depth+1);
    case "proj": return containsLooseBVar(term.expr,depth);
  }
}

/**
 * Lean 4.33.1 positivity check for a constructor argument in the current
 * non-mutual declaration. After WHNF, recursive occurrences may only appear
 * through Pi codomains. Pi domains must be free of the inductive. The terminal
 * term must be a valid application of the inductive with uniform parameters,
 * and indices may not themselves contain recursive occurrences.
 *
 * `paramBaseIndices[p]` is the de Bruijn index of uniform parameter `p` at the
 * outer level of the constructor field. Internal Pi binders add to this index.
 */
function positiveRecursiveFieldType(
  env:Environment,
  field:Term,
  decl:Extract<CoreDeclaration,{kind:"inductive"}>,
  paramBaseIndices:number[],
  outerCtx:Context=[],
):Term|undefined{
  const selfName=decl.name;
  const root=kernelWhnf(env,field);
  if(!containsConst(root,selfName))return undefined;
  let t=root,depth=0;const localCtx:Context=[...outerCtx];
  for(let fuel=0;fuel<4096;fuel++){
    if(t.tag==="pi"){
      if(containsConst(t.domain,selfName)) throw new KernelError(`non-positive occurrence of ${selfName} in recursive function domain`);
      localCtx.unshift(t.domain);t=kernelWhnf(env,t.body);depth++;continue;
    }
    const {head,args}=flattenApps(t);
    const selfLevels=decl.levelParams.map(name=>({tag:"param",name} as Level));
    if(head.tag!=="const"||head.name!==selfName||head.levels.length!==selfLevels.length||!head.levels.every((l,i)=>levelDefEq(l,selfLevels[i])))
      throw new KernelError(`non-valid positive occurrence of ${selfName} in constructor field`);
    if(args.length!==decl.numParams+decl.numIndices)
      throw new KernelError(`non-valid recursive application of ${selfName}: expected ${decl.numParams+decl.numIndices} arguments, got ${args.length}`);
    if(paramBaseIndices.length!==decl.numParams)throw new KernelError(`internal positivity parameter metadata mismatch for ${selfName}`);
    for(let p=0;p<decl.numParams;p++){
      const arg=args[p],expectedIndex=paramBaseIndices[p]+depth;
      if(env.allowUniformParameterDefEq){
        const expected={tag:"bvar",index:expectedIndex} as Term;
        if(!defEq(env,localCtx,arg,expected))throw new KernelError(`non-uniform recursive parameter ${p} of ${selfName}`);
      }else if(arg.tag!=="bvar"||arg.index!==expectedIndex){
        throw new KernelError(`non-uniform recursive parameter ${p} of ${selfName}`);
      }
    }
    for(let i=decl.numParams;i<args.length;i++)if(containsConst(args[i],selfName))
      throw new KernelError(`recursive occurrence of ${selfName} inside an index is invalid`);
    return root;
  }
  throw new KernelResourceError("positivity checking resource limit exceeded","positivity_depth");
}

/**
 * Lean 4.33.1 strict-positivity classifier for a recursive field in the
 * currently admitted direct mutual block. Recursive occurrences may appear
 * only through Pi codomains; Pi domains must contain no member of the mutual
 * block. The terminal codomain must be a direct application of one mutual
 * family with the shared parameters fixed and a valid target index tuple.
 *
 * The returned `recursiveType` preserves the whole positive Pi telescope so
 * recursor generation/reduction can synthesize Lean's pointwise IH.
 */
function positiveMutualRecursiveFieldType(
  env:Environment,
  field:Term,
  members:Extract<CoreDeclaration,{kind:"mutualInductive"}>["inductives"],
  memberNames:ReadonlySet<string>,
  blockLevelParams:readonly string[],
  numParams:number,
  paramBaseIndices:number[],
  outerCtx:Context,
):{targetName:string;recursiveType:Term;higherOrder:boolean}|undefined{
  const root=kernelWhnf(env,field);
  if(!containsAnyConst(root,memberNames))return undefined;
  let t=root,depth=0;const localCtx:Context=[...outerCtx];
  for(let fuel=0;fuel<4096;fuel++){
    if(t.tag==="pi"){
      if(containsAnyConst(t.domain,memberNames))throw new KernelError("non-positive mutual occurrence in recursive function domain");
      localCtx.unshift(t.domain);t=kernelWhnf(env,t.body);depth++;continue;
    }
    const {head,args}=flattenApps(t);
    if(head.tag!=="const"||!memberNames.has(head.name))
      throw new KernelError("non-valid positive mutual occurrence in constructor field");
    const target=members.find(m=>m.name===head.name);
    if(!target)throw new KernelError(`internal mutual positivity target missing: ${head.name}`);
    const expectedLevels=blockLevelParams.map(name=>({tag:"param",name} as Level));
    if(head.levels.length!==expectedLevels.length||!head.levels.every((l,i)=>levelDefEq(l,expectedLevels[i])))
      throw new KernelError(`${head.name}: mutual recursive field uses incompatible universe instantiation`);
    if(args.length!==numParams+target.numIndices)
      throw new KernelError(`recursive ${head.name} application has the wrong parameter/index arity`);
    if(paramBaseIndices.length!==numParams)throw new KernelError(`internal mutual positivity parameter metadata mismatch for ${head.name}`);
    for(let p=0;p<numParams;p++){
      const expected={tag:"bvar",index:paramBaseIndices[p]+depth} as Term;
      if(!defEq(env,localCtx,args[p],expected))throw new KernelError(`recursive ${head.name} parameter ${p} is not the corresponding uniform mutual parameter`);
    }
    if(args.slice(numParams).some(a=>containsAnyConst(a,memberNames)))
      throw new KernelError(`${head.name}: mutual recursive indices may not contain a mutual family occurrence`);
    return{targetName:head.name,recursiveType:root,higherOrder:depth>0};
  }
  throw new KernelResourceError("mutual positivity checking resource limit exceeded","mutual_positivity_depth");
}


/**
 * Lean 4.33.1 constructor-field universe admission rule (`check_constructors`).
 * Uniform parameters are checked separately and are exempt from this ceiling.
 * Each non-parameter constructor field must live in a universe <= the
 * inductive result universe, except that Prop is impredicative and waives
 * the ceiling entirely. Historical profiles intentionally preserve their
 * pre-v21 admission behavior.
 */
function checkConstructorFieldUniverse(
  env: Environment,
  ctx: Context,
  field: Term,
  resultLevel: Level,
  ctorName: string,
  argIndex: number,
): void {
  if (!env.allowInductiveUniverseChecks) return;
  const fieldSort = kernelWhnf(env, infer(env, ctx, field));
  if (fieldSort.tag !== "sort") throw new KernelError(`${ctorName}: constructor field type is not a type`);
  if (!levelGeq(resultLevel, fieldSort.level) && !normalizesToZero(resultLevel)) {
    throw new KernelError(`${ctorName}: universe level of type_of(arg #${argIndex + 1}) is too big for ${prettyLevel(resultLevel)}`);
  }
}

/**
 * Lean 4.33.1 `elim_only_at_universe_zero` for the currently admitted
 * non-mutual inductive environment. The result is derived from the checked
 * declaration itself; no frontend-controlled elimination capability is trusted.
 *
 * For a proposition:
 * - zero constructors: large elimination;
 * - more than one constructor: Prop-only elimination;
 * - exactly one constructor: every non-parameter field must either live in
 *   Prop or occur directly as an argument of the constructor result.
 */
function propEliminationMotivePolicy(
  env:Environment,
  decl:Extract<CoreDeclaration,{kind:"inductive"}>,
):MotiveUniversePolicy {
  if(decl.constructors.length===0)return"fresh";
  if(decl.constructors.length>1)return"prop";

  let tail=decl.constructors[0].type;
  const ctx:Context=[];
  const nonPropBinderPositions:number[]=[];
  let binderPos=0;
  while(tail.tag==="pi"){
    if(binderPos>=decl.numParams){
      const domainSort=kernelWhnf(env,infer(env,ctx,tail.domain));
      if(domainSort.tag!=="sort")throw new KernelError(`${decl.constructors[0].name}: constructor field type is not a type`);
      if(!levelDefEq(domainSort.level,LevelZero))nonPropBinderPositions.push(binderPos);
    }
    ctx.unshift(tail.domain);
    tail=tail.body;
    binderPos++;
  }

  const {args}=flattenApps(tail);
  for(const pos of nonPropBinderPositions){
    const binder:Term={tag:"bvar",index:binderPos-1-pos};
    if(!args.some(arg=>sameTerm(arg,binder)))return"prop";
  }
  return"fresh";
}



type MutualNestedV50Spec={
  containerName:string;
  targetName:string;
  container:Extract<CoreDeclaration,{kind:"inductive"}>;
  auxName:string;
  ctorRestore:Map<string,string>;
};

/** v50 recognition: `Container Target` where Target is a zero-argument member of the mutual block. */
function parseMutualNestedV50Spec(
  env:Environment,
  term:Term,
  memberNames:ReadonlySet<string>,
):Omit<MutualNestedV50Spec,"auxName"|"ctorRestore">|undefined{
  const flat=flattenApps(term);
  if(flat.head.tag!=="const"||flat.head.levels.length!==0||flat.args.length!==1)return undefined;
  const inner=flattenApps(flat.args[0]);
  if(inner.head.tag!=="const"||inner.head.levels.length!==0||inner.args.length!==0||!memberNames.has(inner.head.name))return undefined;
  const entry=env.get(flat.head.name);
  if(!entry||entry.declaration.kind!=="inductive")return undefined;
  return{containerName:flat.head.name,targetName:inner.head.name,container:entry.declaration};
}

function sameMutualNestedV50Spec(a:{containerName:string;targetName:string},b:{containerName:string;targetName:string}):boolean{
  return a.containerName===b.containerName&&a.targetName===b.targetName;
}

function rewriteMutualNestedV50(term:Term,specs:readonly MutualNestedV50Spec[],env:Environment,memberNames:ReadonlySet<string>):Term{
  const parsed=parseMutualNestedV50Spec(env,term,memberNames);
  if(parsed){const sp=specs.find(s=>sameMutualNestedV50Spec(s,parsed));if(sp)return{tag:"const",name:sp.auxName,levels:[]};}
  switch(term.tag){
    case"sort":case"bvar":case"const":return term;
    case"app":return{tag:"app",fn:rewriteMutualNestedV50(term.fn,specs,env,memberNames),arg:rewriteMutualNestedV50(term.arg,specs,env,memberNames)};
    case"lam":return{tag:"lam",domain:rewriteMutualNestedV50(term.domain,specs,env,memberNames),body:rewriteMutualNestedV50(term.body,specs,env,memberNames),binderInfo:term.binderInfo};
    case"pi":return{tag:"pi",domain:rewriteMutualNestedV50(term.domain,specs,env,memberNames),body:rewriteMutualNestedV50(term.body,specs,env,memberNames),binderInfo:term.binderInfo};
    case"let":return{tag:"let",type:rewriteMutualNestedV50(term.type,specs,env,memberNames),value:rewriteMutualNestedV50(term.value,specs,env,memberNames),body:rewriteMutualNestedV50(term.body,specs,env,memberNames),nondep:term.nondep};
    case"proj":return{tag:"proj",typeName:term.typeName,index:term.index,expr:rewriteMutualNestedV50(term.expr,specs,env,memberNames)};
  }
}

/** Restore private auxiliary families back to public `Container Target` specializations. */
function restoreMutualNestedV50(term:Term,specs:readonly MutualNestedV50Spec[]):Term{
  const flat=flattenApps(term),head=flat.head;
  if(head.tag==="const"){
    const aux=specs.find(s=>s.auxName===head.name&&head.levels.length===0&&flat.args.length===0);
    if(aux){const target:Term={tag:"const",name:aux.targetName,levels:[]};return mkApps({tag:"const",name:aux.containerName,levels:[]},[target]);}
    for(const sp of specs){
      const original=sp.ctorRestore.get(head.name);
      if(original){
        const target:Term={tag:"const",name:sp.targetName,levels:[]};
        return mkApps({tag:"const",name:original,levels:[]},[target,...flat.args.map(a=>restoreMutualNestedV50(a,specs))]);
      }
    }
  }
  switch(term.tag){
    case"sort":case"bvar":case"const":return term;
    case"app":return{tag:"app",fn:restoreMutualNestedV50(term.fn,specs),arg:restoreMutualNestedV50(term.arg,specs)};
    case"lam":return{tag:"lam",domain:restoreMutualNestedV50(term.domain,specs),body:restoreMutualNestedV50(term.body,specs),binderInfo:term.binderInfo};
    case"pi":return{tag:"pi",domain:restoreMutualNestedV50(term.domain,specs),body:restoreMutualNestedV50(term.body,specs),binderInfo:term.binderInfo};
    case"let":return{tag:"let",type:restoreMutualNestedV50(term.type,specs),value:restoreMutualNestedV50(term.value,specs),body:restoreMutualNestedV50(term.body,specs),nondep:term.nondep};
    case"proj":return{tag:"proj",typeName:specs.find(s=>s.auxName===term.typeName)?.containerName??term.typeName,index:term.index,expr:restoreMutualNestedV50(term.expr,specs)};
  }
}

/**
 * v50: first composition of the previously separate mutual and nested campaigns.
 *
 * Trusted slice:
 * - monomorphic, parameterless, indexless mutual Type block;
 * - any finite set of distinct one-level `Container Target` specializations;
 * - each Container is an already checked monomorphic `Type -> Type` inductive
 *   with one uniform parameter and zero indices;
 * - direct/higher-order mutual recursion may coexist with nested fields;
 * - identical specializations share one private helper, while distinct
 *   specializations get deterministic `${firstMember}.rec_N` helpers in
 *   first-occurrence order, matching Lean's motive/helper family layout.
 *
 * Every helper is materialized as a private auxiliary member and the complete
 * enlarged block is rechecked by the existing trusted mutual checker. Recursor
 * types and iota metadata are then restored to public container syntax.
 */
function tryCheckMutualNestedGeneralizationV50(
  env:Environment,
  decl:Extract<CoreDeclaration,{kind:"mutualInductive"}>,
):CheckedDeclaration|undefined{
  if(!env.allowMutualNestedGeneralization)return undefined;
  if(decl.levelParams.length!==0||decl.inductives.length<2)return undefined;
  if(decl.inductives.some(m=>m.numParams!==0||m.numIndices!==0))return undefined;
  const memberNames=new Set(decl.inductives.map(m=>m.name));

  const rawSpecs:Omit<MutualNestedV50Spec,"auxName"|"ctorRestore">[]=[];
  const addRaw=(parsed:Omit<MutualNestedV50Spec,"auxName"|"ctorRestore">)=>{if(!rawSpecs.some(s=>sameMutualNestedV50Spec(s,parsed)))rawSpecs.push(parsed);};
  for(const m of decl.inductives){
    const t=kernelWhnf(env,m.type);
    if(t.tag!=="sort"||!levelDefEq(t.level,levelSucc(LevelZero)))return undefined;
    for(const ctor of m.constructors){
      const {fields}=splitPi(ctor.type);
      for(const field of fields){const parsed=parseMutualNestedV50Spec(env,field,memberNames);if(parsed)addRaw(parsed);}
    }
  }
  if(rawSpecs.length===0)return undefined;

  const firstName=decl.inductives[0].name;
  const specs:MutualNestedV50Spec[]=rawSpecs.map((raw,index)=>{
    const container=raw.container;
    if(container.levelParams.length!==0||container.numParams!==1||container.numIndices!==0)
      throw new KernelError(`${decl.name}: v50 nested container ${container.name} must be monomorphic with exactly one parameter and no indices`);
    if(container.type.tag!=="pi")throw new KernelError(`${decl.name}: malformed v50 nested container ${container.name}`);
    const paramSort=kernelWhnf(env,container.type.domain),resultSort=kernelWhnf(env,container.type.body);
    if(paramSort.tag!=="sort"||!levelDefEq(paramSort.level,levelSucc(LevelZero))||resultSort.tag!=="sort"||!levelDefEq(resultSort.level,levelSucc(LevelZero)))
      throw new KernelError(`${decl.name}: v50 nested container ${container.name} must have trusted Type -> Type shape`);
    let auxName=`_nestedMutual.${decl.name}.aux${index+1}`;
    for(let i=0;env.has(auxName)||env.has(`${auxName}.rec`);i++)auxName=`_nestedMutual.${decl.name}.aux${index+1}_${i+1}`;
    return{...raw,auxName,ctorRestore:new Map()};
  });
  const helperNames=specs.map((_,i)=>`${firstName}.rec_${i+1}`);
  for(const helperName of helperNames)if(env.has(helperName))throw new KernelError(`${decl.name}: v50 nested helper recursor name already exists: ${helperName}`);

  const syntheticMembers:Extract<CoreDeclaration,{kind:"mutualInductive"}>["inductives"]=decl.inductives.map(m=>({
    name:m.name,type:m.type,numParams:0,numIndices:0,
    constructors:m.constructors.map(c=>({name:c.name,type:rewriteMutualNestedV50(c.type,specs,env,memberNames)})),
  }));
  for(const sp of specs){
    const target:Term={tag:"const",name:sp.targetName,levels:[]};
    const auxCtors=sp.container.constructors.map((ctor,index)=>{
      if(ctor.type.tag!=="pi")throw new KernelError(`${decl.name}: malformed v50 nested-container constructor ${ctor.name}`);
      const syntheticName=`${sp.auxName}.ctor${index}`;sp.ctorRestore.set(syntheticName,ctor.name);
      const specialized=instantiate(ctor.type.body,target);
      return{name:syntheticName,type:rewriteMutualNestedV50(specialized,specs,env,memberNames)};
    });
    syntheticMembers.push({name:sp.auxName,type:{tag:"sort",level:levelSucc(LevelZero)},numParams:0,numIndices:0,constructors:auxCtors});
  }
  const synthetic:Extract<CoreDeclaration,{kind:"mutualInductive"}>={kind:"mutualInductive",name:`_nestedMutual.${decl.name}.block`,levelParams:[],inductives:syntheticMembers};

  const transformed=env.clone();checkDirectMutualInductive(transformed,synthetic);
  const syntheticNames=syntheticMembers.map(m=>m.name);
  const publicRecursors=[...decl.inductives.map(m=>`${m.name}.rec`),...helperNames];
  const targetRecursor=new Map(syntheticNames.map((n,i)=>[n,publicRecursors[i]] as const));
  const originalCount=decl.inductives.length;
  const restoredRecursors:Extract<EnvironmentDeclaration,{kind:"recursor"}>[]=syntheticNames.map((name,ri)=>{
    const e=transformed.get(`${name}.rec`);if(!e||e.declaration.kind!=="recursor")throw new KernelError(`${decl.name}: internal v50 mutual+nested preprocessing did not generate recursor for ${name}`);
    const helper=ri>=originalCount;const helperSpec=helper?specs[ri-originalCount]:undefined;
    const rules=e.declaration.metadata.rules.map(rule=>({
      ...rule,
      ctor:helper?(helperSpec!.ctorRestore.get(rule.ctor)??rule.ctor):rule.ctor,
      recursiveFieldTypes:rule.recursiveFieldTypes?.map(t=>t?restoreMutualNestedV50(t,specs):null),
      recursiveTargets:rule.recursiveTargets?.map(()=>null),
      recursiveRecursors:rule.recursiveTargets?.map(targetName=>targetName?targetRecursor.get(targetName)??null:null),
      ...(helper?{ctorParamCount:1}:{}),
    }));
    return{
      kind:"recursor",name:publicRecursors[ri],levelParams:[...e.declaration.levelParams],
      type:restoreMutualNestedV50(e.declaration.type,specs),
      metadata:{...e.declaration.metadata,inductive:helper?firstName:name,rules,mutual:{inductives:syntheticNames,motiveCount:syntheticNames.length,recursors:publicRecursors,indexCounts:syntheticNames.map(()=>0)}},
    };
  });

  const final=env.clone();const aggregateAssumptions=new Set<string>();
  for(let mi=0;mi<decl.inductives.length;mi++){
    const m=decl.inductives[mi];const as=dependencyAssumptions(transformed,[m.type,...m.constructors.map(c=>c.type)]);for(const a of as)aggregateAssumptions.add(a);
    const memberGenerated=[...m.constructors.map(c=>c.name),`${m.name}.rec`,...(mi===0?helperNames:[])];
    final.add({declaration:{kind:"inductive",name:m.name,levelParams:[],type:m.type,numParams:0,numIndices:0,constructors:m.constructors},assumptions:as,generated:memberGenerated});
  }
  for(const m of decl.inductives)for(const ctor of m.constructors){
    const sort=kernelWhnf(final,infer(final,[],ctor.type));if(sort.tag!=="sort")throw new KernelError(`${ctor.name}: restored v50 constructor type is not a type`);
    final.add({declaration:{kind:"constructor",name:ctor.name,levelParams:[],type:ctor.type,inductive:m.name},assumptions:dependencyAssumptions(final,[ctor.type]),generated:[]});
  }
  for(const rec of restoredRecursors){
    const sort=kernelWhnf(final,infer(final,[],rec.type));if(sort.tag!=="sort")throw new KernelError(`${rec.name}: restored v50 recursor type is not a type`);
    final.add({declaration:rec,assumptions:dependencyAssumptions(final,[rec.type]),generated:[]});
  }
  env.replaceWith(final);
  const generated=[...decl.inductives.flatMap(m=>m.constructors.map(c=>c.name)),...publicRecursors];
  return{declaration:decl,assumptions:aggregateAssumptions,generated};
}


type MutualNestedV51Spec={
  containerName:string;
  targetName:string;
  container:Extract<CoreDeclaration,{kind:"inductive"}>;
  auxName:string;
  ctorRestore:Map<string,string>;
};

/** v51 recognition: `Container (Target sharedParams...)` for a mutual member. */
function parseMutualNestedV51Spec(
  env:Environment,term:Term,memberNames:ReadonlySet<string>,numParams:number,
):({containerName:string;targetName:string;container:Extract<CoreDeclaration,{kind:"inductive"}>;targetArgs:Term[]})|undefined{
  const flat=flattenApps(term);
  if(flat.head.tag!=="const"||flat.head.levels.length!==0||flat.args.length!==1)return undefined;
  const inner=flattenApps(flat.args[0]);
  if(inner.head.tag!=="const"||inner.head.levels.length!==0||inner.args.length!==numParams||!memberNames.has(inner.head.name))return undefined;
  const entry=env.get(flat.head.name);if(!entry||entry.declaration.kind!=="inductive")return undefined;
  return{containerName:flat.head.name,targetName:inner.head.name,container:entry.declaration,targetArgs:[...inner.args]};
}
function sameMutualNestedV51Spec(a:{containerName:string;targetName:string},b:{containerName:string;targetName:string}):boolean{
  return a.containerName===b.containerName&&a.targetName===b.targetName;
}
function rewriteMutualNestedV51(term:Term,specs:readonly MutualNestedV51Spec[],env:Environment,memberNames:ReadonlySet<string>,numParams:number):Term{
  const parsed=parseMutualNestedV51Spec(env,term,memberNames,numParams);
  if(parsed){const sp=specs.find(s=>sameMutualNestedV51Spec(s,parsed));if(sp)return mkApps({tag:"const",name:sp.auxName,levels:[]},parsed.targetArgs);}
  switch(term.tag){
    case"sort":case"bvar":case"const":return term;
    case"app":return{tag:"app",fn:rewriteMutualNestedV51(term.fn,specs,env,memberNames,numParams),arg:rewriteMutualNestedV51(term.arg,specs,env,memberNames,numParams)};
    case"lam":return{tag:"lam",domain:rewriteMutualNestedV51(term.domain,specs,env,memberNames,numParams),body:rewriteMutualNestedV51(term.body,specs,env,memberNames,numParams),binderInfo:term.binderInfo};
    case"pi":return{tag:"pi",domain:rewriteMutualNestedV51(term.domain,specs,env,memberNames,numParams),body:rewriteMutualNestedV51(term.body,specs,env,memberNames,numParams),binderInfo:term.binderInfo};
    case"let":return{tag:"let",type:rewriteMutualNestedV51(term.type,specs,env,memberNames,numParams),value:rewriteMutualNestedV51(term.value,specs,env,memberNames,numParams),body:rewriteMutualNestedV51(term.body,specs,env,memberNames,numParams),nondep:term.nondep};
    case"proj":return{tag:"proj",typeName:term.typeName,index:term.index,expr:rewriteMutualNestedV51(term.expr,specs,env,memberNames,numParams)};
  }
}
function restoreMutualNestedV51(term:Term,specs:readonly MutualNestedV51Spec[],numParams:number):Term{
  const recur=(t:Term)=>restoreMutualNestedV51(t,specs,numParams);
  const flat=flattenApps(term),head=flat.head;
  if(head.tag==="const"){
    const aux=specs.find(s=>s.auxName===head.name&&head.levels.length===0&&flat.args.length===numParams);
    if(aux){const shared=flat.args.map(recur),target=mkApps({tag:"const",name:aux.targetName,levels:[]},shared);return mkApps({tag:"const",name:aux.containerName,levels:[]},[target]);}
    for(const sp of specs){
      const original=sp.ctorRestore.get(head.name);
      if(original&&flat.args.length>=numParams){
        const shared=flat.args.slice(0,numParams).map(recur),fields=flat.args.slice(numParams).map(recur);
        const target=mkApps({tag:"const",name:sp.targetName,levels:[]},shared);
        return mkApps({tag:"const",name:original,levels:[]},[target,...fields]);
      }
    }
  }
  switch(term.tag){
    case"sort":case"bvar":case"const":return term;
    case"app":return{tag:"app",fn:recur(term.fn),arg:recur(term.arg)};
    case"lam":return{tag:"lam",domain:recur(term.domain),body:recur(term.body),binderInfo:term.binderInfo};
    case"pi":return{tag:"pi",domain:recur(term.domain),body:recur(term.body),binderInfo:term.binderInfo};
    case"let":return{tag:"let",type:recur(term.type),value:recur(term.value),body:recur(term.body),nondep:term.nondep};
    case"proj":return{tag:"proj",typeName:specs.find(s=>s.auxName===term.typeName)?.containerName??term.typeName,index:term.index,expr:recur(term.expr)};
  }
}

/**
 * v51: shared/dependent uniform parameters for the v50 mutual+nested graph.
 * Parameter uniformity is deliberately delegated to checkDirectMutualInductive:
 * rewritten nested occurrences become ordinary recursive auxiliary-family
 * occurrences with the same parameter arguments, so non-uniform target
 * specializations fail the existing trusted definitional-equality check.
 */
function tryCheckMutualNestedParametersV51(
  env:Environment,decl:Extract<CoreDeclaration,{kind:"mutualInductive"}>,
):CheckedDeclaration|undefined{
  if(!env.allowMutualNestedParameters)return undefined;
  if(decl.levelParams.length!==0||decl.inductives.length<2)return undefined;
  const numParams=decl.inductives[0]?.numParams??0;
  if(numParams<=0||decl.inductives.some(m=>m.numParams!==numParams||m.numIndices!==0))return undefined;
  const memberNames=new Set(decl.inductives.map(m=>m.name));
  for(const m of decl.inductives){
    let tail=m.type;for(let pi=0;pi<numParams;pi++){if(tail.tag!=="pi")return undefined;tail=tail.body;}
    if(tail.tag!=="sort"||!levelDefEq(tail.level,levelSucc(LevelZero)))return undefined;
  }

  const rawSpecs:{containerName:string;targetName:string;container:Extract<CoreDeclaration,{kind:"inductive"}>}[]=[];
  for(const m of decl.inductives)for(const ctor of m.constructors){
    const {fields}=splitPi(ctor.type);
    for(const field of fields.slice(numParams)){
      const parsed=parseMutualNestedV51Spec(env,field,memberNames,numParams);
      if(parsed&&!rawSpecs.some(s=>sameMutualNestedV51Spec(s,parsed)))rawSpecs.push({containerName:parsed.containerName,targetName:parsed.targetName,container:parsed.container});
    }
  }
  if(rawSpecs.length===0)return undefined;
  const first=decl.inductives[0],firstName=first.name;
  const specs:MutualNestedV51Spec[]=rawSpecs.map((raw,index)=>{
    const container=raw.container;
    if(container.levelParams.length!==0||container.numParams!==1||container.numIndices!==0)throw new KernelError(`${decl.name}: v51 nested container ${container.name} must be monomorphic with exactly one parameter and no indices`);
    if(container.type.tag!=="pi")throw new KernelError(`${decl.name}: malformed v51 nested container ${container.name}`);
    const paramSort=kernelWhnf(env,container.type.domain),resultSort=kernelWhnf(env,container.type.body);
    if(paramSort.tag!=="sort"||!levelDefEq(paramSort.level,levelSucc(LevelZero))||resultSort.tag!=="sort"||!levelDefEq(resultSort.level,levelSucc(LevelZero)))throw new KernelError(`${decl.name}: v51 nested container ${container.name} must have trusted Type -> Type shape`);
    let auxName=`_nestedMutualParams.${decl.name}.aux${index+1}`;for(let i=0;env.has(auxName)||env.has(`${auxName}.rec`);i++)auxName=`_nestedMutualParams.${decl.name}.aux${index+1}_${i+1}`;
    return{...raw,auxName,ctorRestore:new Map()};
  });
  const helperNames=specs.map((_,i)=>`${firstName}.rec_${i+1}`);for(const h of helperNames)if(env.has(h))throw new KernelError(`${decl.name}: v51 nested helper recursor name already exists: ${h}`);

  const syntheticMembers:Extract<CoreDeclaration,{kind:"mutualInductive"}>["inductives"]=decl.inductives.map(m=>({
    name:m.name,type:m.type,numParams,numIndices:0,
    constructors:m.constructors.map(c=>({name:c.name,type:rewriteMutualNestedV51(c.type,specs,env,memberNames,numParams)})),
  }));
  const sharedArgs=Array.from({length:numParams},(_,p)=>({tag:"bvar",index:numParams-1-p} as Term));
  for(const sp of specs){
    const target=mkApps({tag:"const",name:sp.targetName,levels:[]},sharedArgs);
    const auxCtors=sp.container.constructors.map((ctor,index)=>{
      if(ctor.type.tag!=="pi")throw new KernelError(`${decl.name}: malformed v51 nested-container constructor ${ctor.name}`);
      const syntheticName=`${sp.auxName}.ctor${index}`;sp.ctorRestore.set(syntheticName,ctor.name);
      const specialized=instantiate(ctor.type.body,target);
      const rewritten=rewriteMutualNestedV51(specialized,specs,env,memberNames,numParams);
      return{name:syntheticName,type:prependPiTelescope(first.type,numParams,rewritten)};
    });
    const auxType=prependPiTelescope(first.type,numParams,{tag:"sort",level:levelSucc(LevelZero)});
    syntheticMembers.push({name:sp.auxName,type:auxType,numParams,numIndices:0,constructors:auxCtors});
  }
  const synthetic:Extract<CoreDeclaration,{kind:"mutualInductive"}>={kind:"mutualInductive",name:`_nestedMutualParams.${decl.name}.block`,levelParams:[],inductives:syntheticMembers};
  const transformed=env.clone();checkDirectMutualInductive(transformed,synthetic);
  const syntheticNames=syntheticMembers.map(m=>m.name),publicRecursors=[...decl.inductives.map(m=>`${m.name}.rec`),...helperNames];
  const targetRecursor=new Map(syntheticNames.map((n,i)=>[n,publicRecursors[i]] as const)),originalCount=decl.inductives.length;
  const restoredRecursors:Extract<EnvironmentDeclaration,{kind:"recursor"}>[]=syntheticNames.map((name,ri)=>{
    const e=transformed.get(`${name}.rec`);if(!e||e.declaration.kind!=="recursor")throw new KernelError(`${decl.name}: internal v51 mutual+nested preprocessing did not generate recursor for ${name}`);
    const helper=ri>=originalCount,helperSpec=helper?specs[ri-originalCount]:undefined;
    const rules=e.declaration.metadata.rules.map(rule=>({...rule,
      ctor:helper?(helperSpec!.ctorRestore.get(rule.ctor)??rule.ctor):rule.ctor,
      recursiveFieldTypes:rule.recursiveFieldTypes?.map(t=>t?restoreMutualNestedV51(t,specs,numParams):null),
      recursiveTargets:rule.recursiveTargets?.map(()=>null),
      recursiveRecursors:rule.recursiveTargets?.map(targetName=>targetName?targetRecursor.get(targetName)??null:null),
      ...(helper?{ctorParamCount:1}:{}),
    }));
    return{kind:"recursor",name:publicRecursors[ri],levelParams:[...e.declaration.levelParams],type:restoreMutualNestedV51(e.declaration.type,specs,numParams),metadata:{...e.declaration.metadata,inductive:helper?firstName:name,rules,mutual:{inductives:syntheticNames,motiveCount:syntheticNames.length,recursors:publicRecursors,indexCounts:syntheticNames.map(()=>0)}}};
  });
  const final=env.clone(),aggregateAssumptions=new Set<string>();
  for(let mi=0;mi<decl.inductives.length;mi++){
    const m=decl.inductives[mi],as=dependencyAssumptions(transformed,[m.type,...m.constructors.map(c=>c.type)]);for(const a of as)aggregateAssumptions.add(a);
    final.add({declaration:{kind:"inductive",name:m.name,levelParams:[],type:m.type,numParams,numIndices:0,constructors:m.constructors},assumptions:as,generated:[...m.constructors.map(c=>c.name),`${m.name}.rec`,...(mi===0?helperNames:[])]});
  }
  for(const m of decl.inductives)for(const ctor of m.constructors){const sort=kernelWhnf(final,infer(final,[],ctor.type));if(sort.tag!=="sort")throw new KernelError(`${ctor.name}: restored v51 constructor type is not a type`);final.add({declaration:{kind:"constructor",name:ctor.name,levelParams:[],type:ctor.type,inductive:m.name},assumptions:dependencyAssumptions(final,[ctor.type]),generated:[]});}
  for(const rec of restoredRecursors){const sort=kernelWhnf(final,infer(final,[],rec.type));if(sort.tag!=="sort")throw new KernelError(`${rec.name}: restored v51 recursor type is not a type`);final.add({declaration:rec,assumptions:dependencyAssumptions(final,[rec.type]),generated:[]});}
  env.replaceWith(final);
  return{declaration:decl,assumptions:aggregateAssumptions,generated:[...decl.inductives.flatMap(m=>m.constructors.map(c=>c.name)),...publicRecursors]};
}



type MutualNestedV53Occurrence={
  ctorIndex:number;fieldIndex:number;containerName:string;containerLevels:Level[];targetName:string;
  container:Extract<CoreDeclaration,{kind:"inductive"}>;targetArgs:Term[];targetIndexCount:number;projectedIndices:Term[];specIndex?:number;
};
type MutualNestedV53Spec={
  containerName:string;containerLevels:Level[];targetName:string;targetIndexCount:number;container:Extract<CoreDeclaration,{kind:"inductive"}>;
  fixedIndices:Term[];auxName:string;ctorRestore:Map<string,string>;
};

/** v53: recognize one-level `Container.{ls} (MutualMember.{us} params... indices...)`. */
function parseMutualNestedV53Occurrence(
  env:Environment,term:Term,members:ReadonlyMap<string,{numIndices:number}>,numParams:number,selfLevels:readonly Level[],
):{containerName:string;containerLevels:Level[];targetName:string;container:Extract<CoreDeclaration,{kind:"inductive"}>;targetArgs:Term[];targetIndexCount:number}|undefined{
  const flat=flattenApps(term);
  if(flat.head.tag!=="const"||flat.args.length!==1)return undefined;
  const inner=flattenApps(flat.args[0]);
  if(inner.head.tag!=="const"||!levelsDefEq(inner.head.levels,selfLevels))return undefined;
  const target=members.get(inner.head.name);if(!target||inner.args.length!==numParams+target.numIndices)return undefined;
  const entry=env.get(flat.head.name);if(!entry||entry.declaration.kind!=="inductive")return undefined;
  return{containerName:flat.head.name,containerLevels:[...flat.head.levels],targetName:inner.head.name,container:entry.declaration,targetArgs:[...inner.args],targetIndexCount:target.numIndices};
}

function restoreMutualNestedV53(term:Term,specs:readonly MutualNestedV53Spec[],numParams:number,selfLevels:readonly Level[]):Term{
  let out=term;
  for(const sp of specs){
    const mode:NestedIndexMode={kind:"closed",sharedParamCount:numParams,outerIndexCount:sp.targetIndexCount,fixedIndices:sp.fixedIndices};
    out=restoreNestedAuxTermPoly(out,sp.auxName,selfLevels,sp.containerName,sp.containerLevels,sp.targetName,selfLevels,mode,sp.ctorRestore);
  }
  return out;
}

/**
 * v53: universe-polymorphic mutual+nested preprocessing.
 *
 * This is a strict composition of the v34 polymorphic nested machinery with
 * the v52 mutual/index graph.  Mutual members retain the block's declared
 * level parameters.  Every nested container occurrence preserves its explicit
 * universe instantiation; the container declaration is instantiated at those
 * levels before helper synthesis.  Helpers themselves use only the mutual
 * block's universe parameter telescope.  As in v52, target indices must
 * project to the shared parameter context and may not capture constructor/index
 * locals.  The enlarged block is rechecked by the ordinary trusted mutual
 * checker, including result-universe equality and positivity.
 */





type MutualNestedV59Path={targetName:string;targetIndices:Term[];layers:NestedV41Layer[]};

/** v59: level-aware deep chain ending in a universe-instantiated indexed mutual member. */
function nestedDeepMutualChainV59(
  env:Environment,term:Term,members:ReadonlyMap<string,{numIndices:number}>,numParams:number,paramCtx:Context,currentParams:readonly Term[],selfLevels:readonly Level[],
):MutualNestedV59Path|undefined{
  const layers:NestedV41Layer[]=[];let current=term;
  while(true){
    const flat=flattenApps(current);
    if(flat.head.tag==="const"&&levelsDefEq(flat.head.levels,selfLevels)){
      const target=members.get(flat.head.name);
      if(target&&flat.args.length===numParams+target.numIndices){
        if(!flat.args.slice(0,numParams).every((a,i)=>defEq(env,paramCtx,a,currentParams[i])))return undefined;
        return layers.length>=2?{targetName:flat.head.name,targetIndices:[...flat.args.slice(numParams)],layers}:undefined;
      }
    }
    if(flat.head.tag!=="const"||flat.args.length!==1)return undefined;
    const entry=env.get(flat.head.name);if(!entry||entry.declaration.kind!=="inductive")return undefined;
    const container=entry.declaration;
    if(container.numParams!==1||container.numIndices!==0||flat.head.levels.length!==container.levelParams.length)return undefined;
    const publicParam=flat.args[0];
    layers.push({containerName:flat.head.name,containerLevels:[...flat.head.levels],container,publicParam,publicTerm:current,containerIndices:[],auxName:"",ctorRestore:new Map()});
    current=publicParam;
  }
}

/** v61: deep chain parser that preserves each container's own live index telescope.
 *  Only the container parameter specialization and final mutual target tuple must
 *  project to the shared mutual-parameter context. Thus an outer helper index may
 *  be constructor-local, while an index buried inside a deeper container parameter
 *  is rejected exactly like Lean with auto-promotion disabled. */
function nestedDeepMutualChainV61(
  env:Environment,term:Term,members:ReadonlyMap<string,{numIndices:number}>,numParams:number,paramCtx:Context,currentParams:readonly Term[],selfLevels:readonly Level[],localCount:number,
):MutualNestedV59Path|undefined{
  const layers:NestedV41Layer[]=[];let current=term,hasIndexed=false;
  while(true){
    const flat=flattenApps(current);
    if(flat.head.tag==="const"&&levelsDefEq(flat.head.levels,selfLevels)){
      const target=members.get(flat.head.name);
      if(target&&flat.args.length===numParams+target.numIndices){
        const projected:Term[]=[];
        for(let i=0;i<flat.args.length;i++){
          const p=projectNestedIndexToParamContext(flat.args[i],localCount);if(!p)return undefined;projected.push(p);
        }
        if(!projected.slice(0,numParams).every((a,i)=>defEq(env,paramCtx,a,currentParams[i])))return undefined;
        return layers.length>=2&&hasIndexed?{targetName:flat.head.name,targetIndices:projected.slice(numParams),layers}:undefined;
      }
    }
    if(flat.head.tag!=="const"||flat.args.length<1)return undefined;
    const entry=env.get(flat.head.name);if(!entry||entry.declaration.kind!=="inductive")return undefined;
    const container=entry.declaration;
    if(container.numParams!==1||flat.head.levels.length!==container.levelParams.length||flat.args.length!==1+container.numIndices)return undefined;
    const projectedParam=projectNestedIndexToParamContext(flat.args[0],localCount);if(!projectedParam)return undefined;
    hasIndexed ||= container.numIndices>0;
    layers.push({containerName:flat.head.name,containerLevels:[...flat.head.levels],container,publicParam:projectedParam,publicTerm:current,containerIndices:[...flat.args.slice(1)],auxName:"",ctorRestore:new Map()});
    current=flat.args[0];
  }
}

type MutualNestedV62Path={targetName:string;targetIndices:Term[];layers:NestedV45Spec[]};

/** v62: deep chain through multi-parameter indexed Prop containers. Exactly one
 * parameter slot per layer carries the recursive path; every parameter
 * specialization projects to the shared mutual-parameter context. The current
 * container's indices remain live helper indices. */
function nestedDeepMutualChainV62(
  env:Environment,term:Term,members:ReadonlyMap<string,{numIndices:number}>,memberNames:ReadonlySet<string>,numParams:number,
  paramCtx:Context,currentParams:readonly Term[],selfLevels:readonly Level[],localCount:number,
):MutualNestedV62Path|undefined{
  const layers:NestedV45Spec[]=[];let current=term,hasIndexed=false,sawMulti=false;
  while(true){
    const flat=flattenApps(current);
    if(flat.head.tag==="const"&&levelsDefEq(flat.head.levels,selfLevels)){
      const target=members.get(flat.head.name);
      if(target&&flat.args.length===numParams+target.numIndices){
        const projected:Term[]=[];
        for(const a of flat.args){const p=projectNestedIndexToParamContext(a,localCount);if(!p)return undefined;projected.push(p);}
        if(!projected.slice(0,numParams).every((a,i)=>defEq(env,paramCtx,a,currentParams[i])))return undefined;
        return layers.length>=2&&hasIndexed&&sawMulti?{targetName:flat.head.name,targetIndices:projected.slice(numParams),layers}:undefined;
      }
    }
    if(flat.head.tag!=="const")return undefined;
    const entry=env.get(flat.head.name);if(!entry||entry.declaration.kind!=="inductive")return undefined;
    const container=entry.declaration;
    if(container.numParams<1||flat.head.levels.length!==container.levelParams.length||flat.args.length!==container.numParams+container.numIndices)return undefined;
    const rawParams=flat.args.slice(0,container.numParams);
    const recursiveSlots=rawParams.map((p,i)=>containsAnyConst(p,memberNames)?i:-1).filter(i=>i>=0);
    if(recursiveSlots.length!==1)return undefined;
    const projectedParams:Term[]=[];
    for(const p of rawParams){const projected=projectNestedIndexToParamContext(p,localCount);if(!projected)return undefined;projectedParams.push(projected);}
    hasIndexed ||= container.numIndices>0;sawMulti ||= container.numParams>1;
    layers.push({containerName:flat.head.name,containerLevels:[...flat.head.levels],container,publicParams:projectedParams,publicTerm:current,sampleIndices:[...flat.args.slice(container.numParams)],auxName:"",ctorRestore:new Map()});
    current=rawParams[recursiveSlots[0]];
  }
}

/** v63: dependent parameter terms may mention the recursive family in binder
 * annotations (for example Q : P → Prop) without themselves carrying the
 * recursive nested-data path. Select the unique top-level parameter application
 * that actually carries the recursive path; dependent lambdas/Pis remain fixed
 * parameter specializations and are validated sequentially later. */
function nestedDeepMutualChainV63(
  env:Environment,term:Term,members:ReadonlyMap<string,{numIndices:number}>,memberNames:ReadonlySet<string>,numParams:number,
  paramCtx:Context,currentParams:readonly Term[],selfLevels:readonly Level[],localCount:number,
):MutualNestedV62Path|undefined{
  const layers:NestedV45Spec[]=[];let current=term,hasIndexed=false,sawMulti=false;
  const carriesPath=(p:Term):boolean=>{
    const f=flattenApps(p);if(f.head.tag!=="const")return false;
    if(members.has(f.head.name))return true;
    const e=env.get(f.head.name);return !!e&&e.declaration.kind==="inductive"&&containsAnyConst(p,memberNames);
  };
  while(true){
    const flat=flattenApps(current);
    if(flat.head.tag==="const"&&levelsDefEq(flat.head.levels,selfLevels)){
      const target=members.get(flat.head.name);
      if(target&&flat.args.length===numParams+target.numIndices){
        const projected:Term[]=[];
        for(const a of flat.args){const p=projectNestedIndexToParamContext(a,localCount);if(!p)return undefined;projected.push(p);}
        if(!projected.slice(0,numParams).every((a,i)=>defEq(env,paramCtx,a,currentParams[i])))return undefined;
        return layers.length>=2&&hasIndexed&&sawMulti?{targetName:flat.head.name,targetIndices:projected.slice(numParams),layers}:undefined;
      }
    }
    if(flat.head.tag!=="const")return undefined;
    const entry=env.get(flat.head.name);if(!entry||entry.declaration.kind!=="inductive")return undefined;
    const container=entry.declaration;
    if(container.numParams<1||flat.head.levels.length!==container.levelParams.length||flat.args.length!==container.numParams+container.numIndices)return undefined;
    const rawParams=flat.args.slice(0,container.numParams);
    const recursiveSlots=rawParams.map((p,i)=>carriesPath(p)?i:-1).filter(i=>i>=0);
    if(recursiveSlots.length!==1)return undefined;
    const projectedParams:Term[]=[];
    for(const p of rawParams){const projected=projectNestedIndexToParamContext(p,localCount);if(!projected)return undefined;projectedParams.push(projected);}
    hasIndexed ||= container.numIndices>0;sawMulti ||= container.numParams>1;
    layers.push({containerName:flat.head.name,containerLevels:[...flat.head.levels],container,publicParams:projectedParams,publicTerm:current,sampleIndices:[...flat.args.slice(container.numParams)],auxName:"",ctorRestore:new Map()});
    current=rawParams[recursiveSlots[0]];
  }
}

/** v62: compose v61 live indexed helpers with arbitrary multi-parameter Prop
 * container specialization. Historical one-parameter machinery is untouched;
 * helper rewrite/restore uses the already trusted NestedV45Spec parameter-vector
 * implementation. */

/** v64: generalize v63 from one selected deep recursive field to a deduplicated
 * breadth-first helper graph shared by every compatible deep recursive field.
 * Helper identity is the complete NestedV45Spec parameter specialization; live
 * container indices remain helper telescopes and therefore do not split helpers.
 * Dependent container parameters are validated with the same staged/sequential
 * discipline as v63 before the enlarged graph reaches the trusted mutual checker. */

type MutualNestedV65ContainerSeed={spec:NestedV45Spec;rawParams:Term[];recursiveSlots:number[]};

/** v66 final-audit helper: recursive occurrences may be reached through Pi
 * codomains, but never through a Pi domain. The returned depth is the number
 * of positive function binders surrounding the eventual mutual/container node. */
function peelMutualNestedPositivePi(term:Term,memberNames:ReadonlySet<string>):{term:Term;depth:number}|undefined{
  let t=term,depth=0;
  for(let fuel=0;fuel<4096;fuel++){
    if(t.tag!=="pi")return{term:t,depth};
    if(containsAnyConst(t.domain,memberNames))return undefined;
    t=t.body;depth++;
  }
  throw new KernelResourceError("mutual/nested positive Pi traversal resource limit exceeded","mutual_nested_pi_depth");
}

function mutualNestedV66DirectPositiveLeaf(
  env:Environment,term:Term,members:ReadonlyMap<string,{numIndices:number}>,numParams:number,
  paramCtx:Context,currentParams:readonly Term[],selfLevels:readonly Level[],localCount:number,
):boolean{
  const memberNames=new Set(members.keys()),peeled=peelMutualNestedPositivePi(term,memberNames);if(!peeled)return false;
  const flat=flattenApps(peeled.term);if(flat.head.tag!=="const"||!levelsDefEq(flat.head.levels,selfLevels))return false;
  const target=members.get(flat.head.name);if(!target||flat.args.length!==numParams+target.numIndices)return false;
  for(let p=0;p<numParams;p++){
    const q=projectNestedIndexToParamContext(flat.args[p],localCount+peeled.depth);
    if(!q||!defEq(env,paramCtx,q,currentParams[p]))return false;
  }
  return !flat.args.slice(numParams).some(a=>containsAnyConst(a,memberNames));
}

function mutualNestedV65Leaf(
  env:Environment,term:Term,members:ReadonlyMap<string,{numIndices:number}>,numParams:number,
  paramCtx:Context,currentParams:readonly Term[],selfLevels:readonly Level[],localCount:number,
):boolean{
  const memberNames=new Set(members.keys()),peeled=peelMutualNestedPositivePi(term,memberNames);if(!peeled)return false;
  const flat=flattenApps(peeled.term);if(flat.head.tag!=="const"||!levelsDefEq(flat.head.levels,selfLevels))return false;
  const target=members.get(flat.head.name);if(!target||flat.args.length!==numParams+target.numIndices)return false;
  const projected:Term[]=[];
  for(const a of flat.args){const p=projectNestedIndexToParamContext(a,localCount+peeled.depth);if(!p)return false;projected.push(p);}
  return projected.slice(0,numParams).every((a,i)=>defEq(env,paramCtx,a,currentParams[i]));
}

/** v65 graph node parser. Unlike the v63/v64 linear parser, a container may
 * expose several top-level recursive carrier parameters. Dependent parameter
 * terms that merely mention a mutual family in a binder annotation are not
 * carriers; only a direct mutual leaf or an inductive application containing a
 * mutual occurrence is followed as a recursive graph edge. */
function parseMutualNestedV65Container(
  env:Environment,term:Term,memberNames:ReadonlySet<string>,localCount:number,
):MutualNestedV65ContainerSeed|undefined{
  const peeled=peelMutualNestedPositivePi(term,memberNames);if(!peeled)return undefined;
  term=peeled.term;localCount+=peeled.depth;
  const flat=flattenApps(term);if(flat.head.tag!=="const")return undefined;
  const entry=env.get(flat.head.name);if(!entry||entry.declaration.kind!=="inductive")return undefined;
  const container=entry.declaration;
  if(container.numParams<1||flat.head.levels.length!==container.levelParams.length||flat.args.length!==container.numParams+container.numIndices)return undefined;
  const rawParams=flat.args.slice(0,container.numParams);
  const carriesPath=(p:Term):boolean=>{
    if(!containsAnyConst(p,memberNames))return false;
    const q=peelMutualNestedPositivePi(p,memberNames);if(!q)return false;
    const f=flattenApps(q.term);if(f.head.tag!=="const")return false;
    if(memberNames.has(f.head.name))return true;
    const e=env.get(f.head.name);return !!e&&e.declaration.kind==="inductive"&&containsAnyConst(q.term,memberNames);
  };
  const recursiveSlots=rawParams.map((p,i)=>carriesPath(p)?i:-1).filter(i=>i>=0);
  if(recursiveSlots.length===0)return undefined;
  const projectedParams:Term[]=[];
  for(const p of rawParams){const projected=projectNestedIndexToParamContext(p,localCount);if(!projected)return undefined;projectedParams.push(projected);}
  return{spec:{containerName:flat.head.name,containerLevels:[...flat.head.levels],container,publicParams:projectedParams,publicTerm:term,sampleIndices:[...flat.args.slice(container.numParams)],auxName:"",ctorRestore:new Map()},rawParams:[...projectedParams],recursiveSlots};
}

/** v65: generalize the v64 deduplicated multiple-field graph so each helper
 * container may carry the recursive nested-data path in more than one parameter
 * slot. The graph remains breadth-first and definitionally deduplicated. Helper
 * synthesis is unchanged: rewriteNestedV45 rewrites every matching child slot,
 * so the trusted direct-mutual checker derives one induction hypothesis per
 * recursive parameter field. */
function tryCheckMutualNestedDeeperMultipleRecursiveParameterSlotsV65(
  env:Environment,decl:Extract<CoreDeclaration,{kind:"mutualInductive"}>,
):CheckedDeclaration|undefined{
  if(!env.allowMutualNestedDeeperMultipleRecursiveParameterSlots||decl.inductives.length<2)return undefined;
  const finalGeneralization=env.allowMutualNestedFinalGeneralizationAudit;
  // Historical v65 was intentionally restricted to polymorphic indexed Prop graphs.
  // v66 is the final graph-generalization audit and removes those routing-only
  // restrictions while preserving the same checked breadth-first helper algorithm.
  if(!finalGeneralization&&decl.levelParams.length===0)return undefined;
  const milestone=finalGeneralization?"v66":"v65";
  validateLevelParams(decl);
  const selfLevels=decl.levelParams.map(name=>({tag:"param",name} as Level));
  const numParams=decl.inductives[0]?.numParams??0;
  if(decl.inductives.some(m=>m.numParams!==numParams)||(!finalGeneralization&&decl.inductives.every(m=>m.numIndices===0)))return undefined;
  const memberNames=new Set(decl.inductives.map(m=>m.name));
  const memberMap=new Map(decl.inductives.map(m=>[m.name,{numIndices:m.numIndices}] as const));
  const first=decl.inductives[0];
  const {ctx:paramCtx,args:currentParams}=mutualSharedParamContextV57(first,numParams);
  let resultLevel:Level|undefined;
  for(const m of decl.inductives){
    let tail=m.type;for(let p=0;p<numParams+m.numIndices;p++){if(tail.tag!=="pi")return undefined;tail=tail.body;}
    if(tail.tag!=="sort")return undefined;
    if(finalGeneralization){
      if(!(normalizesToZero(tail.level)||isNeverZero(tail.level)))return undefined;
      if(resultLevel===undefined)resultLevel=tail.level;else if(!levelDefEq(resultLevel,tail.level))return undefined;
    }else if(!normalizesToZero(tail.level))return undefined;
  }
  if(resultLevel===undefined)resultLevel=LevelZero;

  type Occ={memberIndex:number;ctorIndex:number;fieldIndex:number;rootSeed:MutualNestedV65ContainerSeed;rootSpecIndex?:number};
  const occurrences:Occ[]=[];
  for(let mi=0;mi<decl.inductives.length;mi++)for(let ci=0;ci<decl.inductives[mi].constructors.length;ci++){
    const ctor=decl.inductives[mi].constructors[ci],{fields}=splitPi(ctor.type);
    for(let fi=numParams;fi<fields.length;fi++){
      const field=fields[fi];if(!containsAnyConst(field,memberNames))continue;
      const localCount=fi-numParams;
      if(mutualNestedV66DirectPositiveLeaf(env,field,memberMap,numParams,paramCtx,currentParams,selfLevels,localCount))continue;
      const rootSeed=parseMutualNestedV65Container(env,field,memberNames,localCount);
      if(!rootSeed)throw new KernelError(`${ctor.name}: ${milestone} deep dependent-container specialization may not capture constructor/index-local parameter values and recursive carriers must be top-level container parameters`);
      occurrences.push({memberIndex:mi,ctorIndex:ci,fieldIndex:fi,rootSeed});
    }
  }
  if(occurrences.length===0)return undefined;

  validateName(decl.name);for(const m of decl.inductives)if(env.has(m.name))throw new KernelError(`duplicate declaration: ${m.name}`);

  // Exact Lean ordering: all root specializations in constructor/field order,
  // then recursive parameter children breadth-first. Definitionally equal helper
  // specializations are shared even when reached through several slots/fields.
  const specs:NestedV45Spec[]=[],seeds:MutualNestedV65ContainerSeed[]=[];
  const addSeed=(seed:MutualNestedV65ContainerSeed):number=>{
    for(let i=0;i<specs.length;i++)if(nestedV45SameSpec(env,paramCtx,seed.spec,specs[i]))return i;
    if(env.allowResourceBounds && specs.length>=512)throw new KernelResourceError(`${decl.name}: mutual/nested helper graph resource limit exceeded`,"mutual_nested_helper_graph");
    specs.push({...seed.spec,containerLevels:[...seed.spec.containerLevels],publicParams:[...seed.spec.publicParams],sampleIndices:[...seed.spec.sampleIndices],auxName:"",ctorRestore:new Map()});
    seeds.push(seed);return specs.length-1;
  };
  for(const o of occurrences)o.rootSpecIndex=addSeed(o.rootSeed);
  let sawMultipleRecursiveSlots=false;
  for(let qi=0;qi<seeds.length;qi++){
    const seed=seeds[qi];
    if(seed.recursiveSlots.length>1)sawMultipleRecursiveSlots=true;
    for(const slot of seed.recursiveSlots){
      const child=seed.rawParams[slot];
      // Every recursive edge must terminate either in a uniform mutual leaf or
      // another checked nested container node. The same original constructor
      // localCount applies because public parameter specializations were projected
      // when the root seed was created; nested children cannot introduce locals.
      if(mutualNestedV65Leaf(env,child,memberMap,numParams,paramCtx,currentParams,selfLevels,0))continue;
      const parsed=parseMutualNestedV65Container(env,child,memberNames,0);
      if(!parsed)throw new KernelError(`${decl.name}: ${milestone} recursive container parameter must terminate in a uniform mutual target or another checked nested container specialization`);
      addSeed(parsed);
    }

    // Lean's nested preprocessing closes over the specialized container's own
    // constructor dependencies too. In v66 this admits a pre-existing mutually
    // recursive container family such as MBox/MWrap: specializing MBox B exposes
    // MWrap B in an MBox constructor, so MWrap B becomes another helper motive.
    if(finalGeneralization){
      const sp=specs[qi];
      for(const ctor of sp.container.constructors){
        let specialized=instantiateTermLevels(ctor.type,sp.container.levelParams,sp.containerLevels);
        specialized=instantiateV45Params(specialized,sp.publicParams,`${decl.name}: v66 ${ctor.name}`);
        const {fields}=splitPi(specialized);
        for(let fi=0;fi<fields.length;fi++){
          const field=fields[fi];if(!containsAnyConst(field,memberNames))continue;
          if(mutualNestedV66DirectPositiveLeaf(env,field,memberMap,numParams,paramCtx,currentParams,selfLevels,fi))continue;
          const dep=parseMutualNestedV65Container(env,field,memberNames,fi);
          if(!dep)throw new KernelError(`${decl.name}: v66 specialized container constructor ${ctor.name} contains an unsupported or non-positive mutual/nested dependency`);
          addSeed(dep);
        }
      }
    }
  }
  if(!finalGeneralization&&(!sawMultipleRecursiveSlots||specs.length<2))return undefined; // v64 remains authority historically; v66 is the final generalized graph route.
  // v63 staged/sequential dependent-parameter validation, now once per unique
  // helper specialization rather than once per selected linear path layer.
  const validationEnv=env.clone();
  for(const m of decl.inductives)if(!validationEnv.has(m.name))validationEnv.add({declaration:{kind:"axiom",name:m.name,levelParams:[...decl.levelParams],type:m.type},assumptions:new Set(),generated:[]});
  for(let i=0;i<specs.length;i++){
    const sp=specs[i];sp.auxName=`${finalGeneralization?"_nestedMutualDeepFinal":"_nestedMutualDeepMultipleRecursiveSlots"}.${decl.name}.aux${i+1}`;
    if(env.has(sp.auxName)||env.has(`${sp.auxName}.rec`))throw new KernelError(`${decl.name}: internal ${milestone} nested auxiliary name already exists: ${sp.auxName}`);
    if(sp.containerLevels.length!==sp.container.levelParams.length)throw new KernelError(`${decl.name}: ${milestone} nested container ${sp.containerName} universe arity mismatch`);
    let t=instantiateTermLevels(sp.container.type,sp.container.levelParams,sp.containerLevels);
    for(let pi=0;pi<sp.container.numParams;pi++){
      if(t.tag!=="pi")throw new KernelError(`${decl.name}: malformed v65 dependent parameter telescope for ${sp.containerName}`);
      const q=sp.publicParams[pi],actual=infer(validationEnv,paramCtx,q);
      if(!defEq(validationEnv,paramCtx,actual,t.domain))throw new KernelError(`${decl.name}: ${milestone} nested container ${sp.containerName} dependent parameter ${pi} type mismatch`);
      t=instantiate(t.body,q);
    }
    if(sp.sampleIndices.length!==sp.container.numIndices)throw new KernelError(`${decl.name}: ${milestone} nested container ${sp.containerName} index arity mismatch`);
    for(let ii=0;ii<sp.container.numIndices;ii++){
      if(t.tag!=="pi")throw new KernelError(`${decl.name}: ${milestone} nested container ${sp.containerName} index telescope is shorter than numIndices`);
      if(containsAnyConst(t.domain,memberNames))throw new KernelError(`${decl.name}: ${milestone} bounded slice requires container index domains independent of the recursive mutual target`);
      t=t.body;
    }
    const result=kernelWhnfIn(validationEnv,paramCtx,t);
    if(result.tag!=="sort")throw new KernelError(`${decl.name}: ${milestone} nested container ${sp.containerName} specialization is not a Sort`);
    if(finalGeneralization){
      if(!levelDefEq(result.level,resultLevel))throw new KernelError(`${decl.name}: v66 nested container ${sp.containerName} specialization must live in the mutual block result universe`);
    }else if(!normalizesToZero(result.level))throw new KernelError(`${decl.name}: v65 nested container ${sp.containerName} specialization must be Prop`);
  }

  const occurrenceAt=new Map<string,Occ>();for(const o of occurrences)occurrenceAt.set(`${o.memberIndex}:${o.ctorIndex}:${o.fieldIndex}`,o);
  for(let mi=0;mi<decl.inductives.length;mi++)for(let ci=0;ci<decl.inductives[mi].constructors.length;ci++){
    const ctor=decl.inductives[mi].constructors[ci],{fields}=splitPi(ctor.type);
    for(let fi=numParams;fi<fields.length;fi++){
      const field=fields[fi];if(!containsAnyConst(field,memberNames))continue;
      if(occurrenceAt.has(`${mi}:${ci}:${fi}`))continue;
      const localCount=fi-numParams;
      if(!mutualNestedV66DirectPositiveLeaf(env,field,memberMap,numParams,paramCtx,currentParams,selfLevels,localCount))
        throw new KernelError(`${ctor.name}: ${milestone} admits only positive direct/higher-order mutual recursion or checked nested occurrences`);
    }
  }

  const firstName=first.name,helperNames=specs.map((_,i)=>`${firstName}.rec_${i+1}`);
  for(const h of helperNames)if(env.has(h))throw new KernelError(`${decl.name}: ${milestone} nested helper recursor name already exists: ${h}`);
  const syntheticMembers:Extract<CoreDeclaration,{kind:"mutualInductive"}>["inductives"]=decl.inductives.map((m,mi)=>({
    name:m.name,type:m.type,numParams,numIndices:m.numIndices,
    constructors:m.constructors.map((ctor,ci)=>{
      const {fields,fieldBinderInfo,result}=splitPi(ctor.type);
      const rewritten=fields.map((field,fi)=>{
        const occ=occurrenceAt.get(`${mi}:${ci}:${fi}`);if(!occ)return field;
        const localCount=fi-numParams;
        if(finalGeneralization)return rewriteNestedV45(field,specs,numParams,selfLevels,localCount);
        const sp=specs[occ.rootSpecIndex!];
        const shared=Array.from({length:numParams},(_,i)=>({tag:"bvar",index:localCount+numParams-1-i} as Term));
        const flat=flattenApps(field),indices=flat.args.slice(sp.container.numParams);
        return mkApps({tag:"const",name:sp.auxName,levels:[...selfLevels]},[...shared,...indices]);
      });
      return{name:ctor.name,type:rebuildPi(rewritten,fieldBinderInfo,result)};
    }),
  }));

  for(const sp of specs){
    const instantiatedType=instantiateTermLevels(sp.container.type,sp.container.levelParams,sp.containerLevels);
    const auxCtors=sp.container.constructors.map((ctor,index)=>{
      const instantiatedCtorType=instantiateTermLevels(ctor.type,sp.container.levelParams,sp.containerLevels);
      const syntheticName=`${sp.auxName}.ctor${index}`;sp.ctorRestore.set(syntheticName,ctor.name);
      const specialized=instantiateV45Params(instantiatedCtorType,sp.publicParams,`${decl.name}: ${milestone} ${ctor.name}`);
      const rewritten=rewriteNestedV45(specialized,specs,numParams,selfLevels);
      return{name:syntheticName,type:prependPiTelescope(first.type,numParams,rewritten)};
    });
    const auxTail=instantiateV45Params(instantiatedType,sp.publicParams,`${decl.name}: ${milestone} ${sp.containerName}`);
    syntheticMembers.push({name:sp.auxName,type:prependPiTelescope(first.type,numParams,auxTail),numParams,numIndices:sp.container.numIndices,constructors:auxCtors});
  }

  const synthetic:Extract<CoreDeclaration,{kind:"mutualInductive"}>={kind:"mutualInductive",name:`${finalGeneralization?"_nestedMutualDeepFinal":"_nestedMutualDeepMultipleRecursiveSlots"}.${decl.name}.block`,levelParams:[...decl.levelParams],inductives:syntheticMembers};
  const transformed=env.clone();checkDirectMutualInductive(transformed,synthetic);
  const syntheticNames=syntheticMembers.map(m=>m.name),publicRecursors=[...decl.inductives.map(m=>`${m.name}.rec`),...helperNames];
  const targetRecursor=new Map(syntheticNames.map((n,i)=>[n,publicRecursors[i]] as const)),originalCount=decl.inductives.length;
  const restoredRecursors:Extract<EnvironmentDeclaration,{kind:"recursor"}>[]=syntheticNames.map((name,ri)=>{
    const e=transformed.get(`${name}.rec`);if(!e||e.declaration.kind!=="recursor")throw new KernelError(`${decl.name}: internal ${milestone} preprocessing did not generate recursor for ${name}`);
    const helper=ri>=originalCount,sp=helper?specs[ri-originalCount]:undefined;
    const rules=e.declaration.metadata.rules.map(rule=>({...rule,
      ctor:helper?(sp!.ctorRestore.get(rule.ctor)??rule.ctor):rule.ctor,
      recursiveFieldTypes:rule.recursiveFieldTypes?.map(t=>t?restoreNestedV45(t,specs,numParams,selfLevels):null),
      recursiveTargets:rule.recursiveTargets?.map(()=>null),
      recursiveRecursors:rule.recursiveTargets?.map(target=>target?targetRecursor.get(target)??null:null),
      ...(helper?{ctorParamCount:sp!.container.numParams}:{}),
    }));
    return{kind:"recursor",name:publicRecursors[ri],levelParams:[...e.declaration.levelParams],type:restoreNestedV45(e.declaration.type,specs,numParams,selfLevels),metadata:{...e.declaration.metadata,inductive:helper?firstName:name,rules,mutual:{inductives:syntheticNames,motiveCount:syntheticNames.length,recursors:publicRecursors,indexCounts:syntheticMembers.map(m=>m.numIndices)}}};
  });

  const final=env.clone(),aggregateAssumptions=new Set<string>();
  for(let mi=0;mi<decl.inductives.length;mi++){
    const m=decl.inductives[mi],assumptions=dependencyAssumptions(transformed,[m.type,...m.constructors.map(c=>c.type)]);for(const a of assumptions)aggregateAssumptions.add(a);
    final.add({declaration:{kind:"inductive",name:m.name,levelParams:[...decl.levelParams],type:m.type,numParams,numIndices:m.numIndices,constructors:m.constructors},assumptions,generated:[...m.constructors.map(c=>c.name),`${m.name}.rec`,...(mi===0?helperNames:[])]});
  }
  for(const m of decl.inductives)for(const ctor of m.constructors){const sort=kernelWhnf(final,infer(final,[],ctor.type));if(sort.tag!=="sort")throw new KernelError(`${ctor.name}: restored v65 constructor type is not a type`);final.add({declaration:{kind:"constructor",name:ctor.name,levelParams:[...decl.levelParams],type:ctor.type,inductive:m.name},assumptions:dependencyAssumptions(final,[ctor.type]),generated:[]});}
  for(const rec of restoredRecursors){const sort=kernelWhnf(final,infer(final,[],rec.type));if(sort.tag!=="sort")throw new KernelError(`${rec.name}: restored v65 recursor type is not a type`);final.add({declaration:rec,assumptions:dependencyAssumptions(final,[rec.type]),generated:[]});}
  env.replaceWith(final);
  return{declaration:decl,assumptions:aggregateAssumptions,generated:[...decl.inductives.flatMap(m=>m.constructors.map(c=>c.name)),...publicRecursors]};
}


function tryCheckMutualNestedDeeperMultipleFieldsV64(
  env:Environment,decl:Extract<CoreDeclaration,{kind:"mutualInductive"}>,
):CheckedDeclaration|undefined{
  if(!env.allowMutualNestedDeeperMultipleFields||decl.levelParams.length===0||decl.inductives.length<2)return undefined;
  validateLevelParams(decl);
  const selfLevels=decl.levelParams.map(name=>({tag:"param",name} as Level));
  const numParams=decl.inductives[0]?.numParams??0;
  if(decl.inductives.some(m=>m.numParams!==numParams)||decl.inductives.every(m=>m.numIndices===0))return undefined;
  const memberNames=new Set(decl.inductives.map(m=>m.name));
  const memberMap=new Map(decl.inductives.map(m=>[m.name,{numIndices:m.numIndices}] as const));
  const first=decl.inductives[0];
  const {ctx:paramCtx,args:currentParams}=mutualSharedParamContextV57(first,numParams);
  for(const m of decl.inductives){
    let tail=m.type;for(let p=0;p<numParams+m.numIndices;p++){if(tail.tag!=="pi")return undefined;tail=tail.body;}
    if(tail.tag!=="sort"||!normalizesToZero(tail.level))return undefined;
  }

  type Occ={memberIndex:number;ctorIndex:number;fieldIndex:number;path:MutualNestedV62Path;rootSpecIndex?:number};
  const occurrences:Occ[]=[];
  for(let mi=0;mi<decl.inductives.length;mi++)for(let ci=0;ci<decl.inductives[mi].constructors.length;ci++){
    const ctor=decl.inductives[mi].constructors[ci],{fields}=splitPi(ctor.type);
    for(let fi=numParams;fi<fields.length;fi++){
      const field=fields[fi];if(!containsAnyConst(field,memberNames))continue;
      const localCount=fi-numParams;
      const direct=flattenApps(field),directTarget=direct.head.tag==="const"?memberMap.get(direct.head.name):undefined;
      if(directTarget&&direct.head.tag==="const"&&levelsDefEq(direct.head.levels,selfLevels)&&direct.args.length===numParams+directTarget.numIndices){
        let ok=true;for(let pi=0;pi<numParams;pi++){const q=projectNestedIndexToParamContext(direct.args[pi],localCount);if(!q||!defEq(env,paramCtx,q,currentParams[pi])){ok=false;break;}}
        if(ok)continue;
      }
      const path=nestedDeepMutualChainV63(env,field,memberMap,memberNames,numParams,paramCtx,currentParams,selfLevels,localCount);
      if(!path)throw new KernelError(`${ctor.name}: v64 deep dependent-container specialization may not capture constructor/index-local parameter values and each layer must contain exactly one top-level recursive carrier parameter`);
      occurrences.push({memberIndex:mi,ctorIndex:ci,fieldIndex:fi,path});
    }
  }
  if(occurrences.length<2)return undefined; // v63 remains authority for one deep field.

  validateName(decl.name);for(const m of decl.inductives)if(env.has(m.name))throw new KernelError(`duplicate declaration: ${m.name}`);

  // Exact Lean ordering: roots in field first-occurrence order, then each deeper
  // layer breadth-first in the same occurrence order. Shared specializations are
  // definitionally deduplicated by the complete specialized parameter vector.
  const specs:NestedV45Spec[]=[];
  const addSpec=(candidate:NestedV45Spec):number=>{
    for(let i=0;i<specs.length;i++)if(nestedV45SameSpec(env,paramCtx,candidate,specs[i]))return i;
    specs.push({...candidate,containerLevels:[...candidate.containerLevels],publicParams:[...candidate.publicParams],sampleIndices:[...candidate.sampleIndices],auxName:"",ctorRestore:new Map()});
    return specs.length-1;
  };
  for(const o of occurrences)o.rootSpecIndex=addSpec(o.path.layers[0]);
  const maxDepth=Math.max(...occurrences.map(o=>o.path.layers.length));
  for(let depth=1;depth<maxDepth;depth++)for(const o of occurrences)if(depth<o.path.layers.length)addSpec(o.path.layers[depth]);

  // v63 staged/sequential dependent-parameter validation, now once per unique
  // helper specialization rather than once per selected linear path layer.
  const validationEnv=env.clone();
  for(const m of decl.inductives)if(!validationEnv.has(m.name))validationEnv.add({declaration:{kind:"axiom",name:m.name,levelParams:[...decl.levelParams],type:m.type},assumptions:new Set(),generated:[]});
  for(let i=0;i<specs.length;i++){
    const sp=specs[i];sp.auxName=`_nestedMutualDeepMultipleFields.${decl.name}.aux${i+1}`;
    if(env.has(sp.auxName)||env.has(`${sp.auxName}.rec`))throw new KernelError(`${decl.name}: internal v64 nested auxiliary name already exists: ${sp.auxName}`);
    if(sp.containerLevels.length!==sp.container.levelParams.length)throw new KernelError(`${decl.name}: v64 nested container ${sp.containerName} universe arity mismatch`);
    let t=instantiateTermLevels(sp.container.type,sp.container.levelParams,sp.containerLevels);
    for(let pi=0;pi<sp.container.numParams;pi++){
      if(t.tag!=="pi")throw new KernelError(`${decl.name}: malformed v64 dependent parameter telescope for ${sp.containerName}`);
      const q=sp.publicParams[pi],actual=infer(validationEnv,paramCtx,q);
      if(!defEq(validationEnv,paramCtx,actual,t.domain))throw new KernelError(`${decl.name}: v64 nested container ${sp.containerName} dependent parameter ${pi} type mismatch`);
      t=instantiate(t.body,q);
    }
    if(sp.sampleIndices.length!==sp.container.numIndices)throw new KernelError(`${decl.name}: v64 nested container ${sp.containerName} index arity mismatch`);
    for(let ii=0;ii<sp.container.numIndices;ii++){
      if(t.tag!=="pi")throw new KernelError(`${decl.name}: v64 nested container ${sp.containerName} index telescope is shorter than numIndices`);
      if(containsAnyConst(t.domain,memberNames))throw new KernelError(`${decl.name}: v64 bounded slice requires container index domains independent of the recursive mutual target`);
      t=t.body;
    }
    const result=kernelWhnfIn(validationEnv,paramCtx,t);if(result.tag!=="sort"||!normalizesToZero(result.level))throw new KernelError(`${decl.name}: v64 nested container ${sp.containerName} specialization must be Prop`);
  }

  const occurrenceAt=new Map<string,Occ>();for(const o of occurrences)occurrenceAt.set(`${o.memberIndex}:${o.ctorIndex}:${o.fieldIndex}`,o);
  for(let mi=0;mi<decl.inductives.length;mi++)for(let ci=0;ci<decl.inductives[mi].constructors.length;ci++){
    const ctor=decl.inductives[mi].constructors[ci],{fields}=splitPi(ctor.type);
    for(let fi=numParams;fi<fields.length;fi++){
      const field=fields[fi];if(!containsAnyConst(field,memberNames))continue;
      if(occurrenceAt.has(`${mi}:${ci}:${fi}`))continue;
      const direct=flattenApps(field),target=direct.head.tag==="const"?memberMap.get(direct.head.name):undefined;
      if(!target||direct.head.tag!=="const"||!levelsDefEq(direct.head.levels,selfLevels)||direct.args.length!==numParams+target.numIndices)
        throw new KernelError(`${ctor.name}: v64 admits only direct mutual recursion or checked deep nested occurrences`);
      const localCount=fi-numParams;
      for(let pi=0;pi<numParams;pi++){const q=projectNestedIndexToParamContext(direct.args[pi],localCount);if(!q||!defEq(env,paramCtx,q,currentParams[pi]))throw new KernelError(`${ctor.name}: v64 direct recursive occurrence must preserve the exact shared mutual parameter tuple`);}
    }
  }

  const firstName=first.name,helperNames=specs.map((_,i)=>`${firstName}.rec_${i+1}`);
  for(const h of helperNames)if(env.has(h))throw new KernelError(`${decl.name}: v64 nested helper recursor name already exists: ${h}`);
  const syntheticMembers:Extract<CoreDeclaration,{kind:"mutualInductive"}>["inductives"]=decl.inductives.map((m,mi)=>({
    name:m.name,type:m.type,numParams,numIndices:m.numIndices,
    constructors:m.constructors.map((ctor,ci)=>{
      const {fields,fieldBinderInfo,result}=splitPi(ctor.type);
      const rewritten=fields.map((field,fi)=>{
        const occ=occurrenceAt.get(`${mi}:${ci}:${fi}`);if(!occ)return field;
        const sp=specs[occ.rootSpecIndex!],localCount=fi-numParams;
        const shared=Array.from({length:numParams},(_,i)=>({tag:"bvar",index:localCount+numParams-1-i} as Term));
        const flat=flattenApps(field),indices=flat.args.slice(sp.container.numParams);
        return mkApps({tag:"const",name:sp.auxName,levels:[...selfLevels]},[...shared,...indices]);
      });
      return{name:ctor.name,type:rebuildPi(rewritten,fieldBinderInfo,result)};
    }),
  }));

  for(const sp of specs){
    const instantiatedType=instantiateTermLevels(sp.container.type,sp.container.levelParams,sp.containerLevels);
    const auxCtors=sp.container.constructors.map((ctor,index)=>{
      const instantiatedCtorType=instantiateTermLevels(ctor.type,sp.container.levelParams,sp.containerLevels);
      const syntheticName=`${sp.auxName}.ctor${index}`;sp.ctorRestore.set(syntheticName,ctor.name);
      const specialized=instantiateV45Params(instantiatedCtorType,sp.publicParams,`${decl.name}: v64 ${ctor.name}`);
      const rewritten=rewriteNestedV45(specialized,specs,numParams,selfLevels);
      return{name:syntheticName,type:prependPiTelescope(first.type,numParams,rewritten)};
    });
    const auxTail=instantiateV45Params(instantiatedType,sp.publicParams,`${decl.name}: v64 ${sp.containerName}`);
    syntheticMembers.push({name:sp.auxName,type:prependPiTelescope(first.type,numParams,auxTail),numParams,numIndices:sp.container.numIndices,constructors:auxCtors});
  }

  const synthetic:Extract<CoreDeclaration,{kind:"mutualInductive"}>={kind:"mutualInductive",name:`_nestedMutualDeepMultipleFields.${decl.name}.block`,levelParams:[...decl.levelParams],inductives:syntheticMembers};
  const transformed=env.clone();checkDirectMutualInductive(transformed,synthetic);
  const syntheticNames=syntheticMembers.map(m=>m.name),publicRecursors=[...decl.inductives.map(m=>`${m.name}.rec`),...helperNames];
  const targetRecursor=new Map(syntheticNames.map((n,i)=>[n,publicRecursors[i]] as const)),originalCount=decl.inductives.length;
  const restoredRecursors:Extract<EnvironmentDeclaration,{kind:"recursor"}>[]=syntheticNames.map((name,ri)=>{
    const e=transformed.get(`${name}.rec`);if(!e||e.declaration.kind!=="recursor")throw new KernelError(`${decl.name}: internal v64 preprocessing did not generate recursor for ${name}`);
    const helper=ri>=originalCount,sp=helper?specs[ri-originalCount]:undefined;
    const rules=e.declaration.metadata.rules.map(rule=>({...rule,
      ctor:helper?(sp!.ctorRestore.get(rule.ctor)??rule.ctor):rule.ctor,
      recursiveFieldTypes:rule.recursiveFieldTypes?.map(t=>t?restoreNestedV45(t,specs,numParams,selfLevels):null),
      recursiveTargets:rule.recursiveTargets?.map(()=>null),
      recursiveRecursors:rule.recursiveTargets?.map(target=>target?targetRecursor.get(target)??null:null),
      ...(helper?{ctorParamCount:sp!.container.numParams}:{}),
    }));
    return{kind:"recursor",name:publicRecursors[ri],levelParams:[...e.declaration.levelParams],type:restoreNestedV45(e.declaration.type,specs,numParams,selfLevels),metadata:{...e.declaration.metadata,inductive:helper?firstName:name,rules,mutual:{inductives:syntheticNames,motiveCount:syntheticNames.length,recursors:publicRecursors,indexCounts:syntheticMembers.map(m=>m.numIndices)}}};
  });

  const final=env.clone(),aggregateAssumptions=new Set<string>();
  for(let mi=0;mi<decl.inductives.length;mi++){
    const m=decl.inductives[mi],assumptions=dependencyAssumptions(transformed,[m.type,...m.constructors.map(c=>c.type)]);for(const a of assumptions)aggregateAssumptions.add(a);
    final.add({declaration:{kind:"inductive",name:m.name,levelParams:[...decl.levelParams],type:m.type,numParams,numIndices:m.numIndices,constructors:m.constructors},assumptions,generated:[...m.constructors.map(c=>c.name),`${m.name}.rec`,...(mi===0?helperNames:[])]});
  }
  for(const m of decl.inductives)for(const ctor of m.constructors){const sort=kernelWhnf(final,infer(final,[],ctor.type));if(sort.tag!=="sort")throw new KernelError(`${ctor.name}: restored v64 constructor type is not a type`);final.add({declaration:{kind:"constructor",name:ctor.name,levelParams:[...decl.levelParams],type:ctor.type,inductive:m.name},assumptions:dependencyAssumptions(final,[ctor.type]),generated:[]});}
  for(const rec of restoredRecursors){const sort=kernelWhnf(final,infer(final,[],rec.type));if(sort.tag!=="sort")throw new KernelError(`${rec.name}: restored v64 recursor type is not a type`);final.add({declaration:rec,assumptions:dependencyAssumptions(final,[rec.type]),generated:[]});}
  env.replaceWith(final);
  return{declaration:decl,assumptions:aggregateAssumptions,generated:[...decl.inductives.flatMap(m=>m.constructors.map(c=>c.name)),...publicRecursors]};
}

function tryCheckMutualNestedDeeperDependentContainerParametersV63(
  env:Environment,decl:Extract<CoreDeclaration,{kind:"mutualInductive"}>,
):CheckedDeclaration|undefined{
  if(!env.allowMutualNestedDeeperDependentContainerParameters||decl.levelParams.length===0||decl.inductives.length<2)return undefined;
  validateLevelParams(decl);
  const selfLevels=decl.levelParams.map(name=>({tag:"param",name} as Level));
  const numParams=decl.inductives[0]?.numParams??0;
  if(decl.inductives.some(m=>m.numParams!==numParams)||decl.inductives.every(m=>m.numIndices===0))return undefined;
  const memberNames=new Set(decl.inductives.map(m=>m.name));
  const memberMap=new Map(decl.inductives.map(m=>[m.name,{numIndices:m.numIndices}] as const));
  const first=decl.inductives[0];
  const {ctx:paramCtx,args:currentParams}=mutualSharedParamContextV57(first,numParams);
  for(const m of decl.inductives){
    let tail=m.type;for(let p=0;p<numParams+m.numIndices;p++){if(tail.tag!=="pi")return undefined;tail=tail.body;}
    if(tail.tag!=="sort"||!normalizesToZero(tail.level))return undefined;
  }

  let deep:{memberIndex:number;ctorIndex:number;fieldIndex:number;targetName:string;targetIndices:Term[];layers:NestedV45Spec[]}|undefined;
  for(let mi=0;mi<decl.inductives.length;mi++)for(let ci=0;ci<decl.inductives[mi].constructors.length;ci++){
    const ctor=decl.inductives[mi].constructors[ci],{fields}=splitPi(ctor.type);
    for(let fi=numParams;fi<fields.length;fi++){
      if(!containsAnyConst(fields[fi],memberNames))continue;
      const localCount=fi-numParams;
      const direct=flattenApps(fields[fi]),directTarget=direct.head.tag==="const"?memberMap.get(direct.head.name):undefined;
      if(directTarget&&direct.head.tag==="const"&&levelsDefEq(direct.head.levels,selfLevels)&&direct.args.length===numParams+directTarget.numIndices){
        let ok=true;for(let pi=0;pi<numParams;pi++){const p=projectNestedIndexToParamContext(direct.args[pi],localCount);if(!p||!defEq(env,paramCtx,p,currentParams[pi])){ok=false;break;}}
        if(ok)continue;
      }
      const path=nestedDeepMutualChainV63(env,fields[fi],memberMap,memberNames,numParams,paramCtx,currentParams,selfLevels,localCount);
      if(!path)throw new KernelError(`${ctor.name}: v63 deep multi-parameter container specialization may not capture constructor/index-local values and each layer must contain exactly one recursive parameter slot`);
      if(deep)throw new KernelError(`${decl.name}: v63 bounded slice admits exactly one linear deep recursive field`);
      deep={memberIndex:mi,ctorIndex:ci,fieldIndex:fi,targetName:path.targetName,targetIndices:path.targetIndices,layers:path.layers};
    }
  }
  if(!deep)return undefined;

  validateName(decl.name);for(const m of decl.inductives)if(env.has(m.name))throw new KernelError(`duplicate declaration: ${m.name}`);
  const layers=deep.layers;
  // v63 mirrors the already-trusted v46 validation discipline: stage the mutual
  // family signatures, then validate each dependent container parameter in order.
  const validationEnv=env.clone();
  for(const m of decl.inductives)if(!validationEnv.has(m.name))validationEnv.add({declaration:{kind:"axiom",name:m.name,levelParams:[...decl.levelParams],type:m.type},assumptions:new Set(),generated:[]});
  for(let i=0;i<layers.length;i++){
    const layer=layers[i];layer.auxName=`_nestedMutualDeepDependentParam.${decl.name}.aux${i+1}`;
    if(env.has(layer.auxName)||env.has(`${layer.auxName}.rec`))throw new KernelError(`${decl.name}: internal v63 nested auxiliary name already exists: ${layer.auxName}`);
    if(layer.containerLevels.length!==layer.container.levelParams.length)throw new KernelError(`${decl.name}: v63 nested container ${layer.containerName} universe arity mismatch`);
    let t=instantiateTermLevels(layer.container.type,layer.container.levelParams,layer.containerLevels);
    for(let pi=0;pi<layer.container.numParams;pi++){
      if(t.tag!=="pi")throw new KernelError(`${decl.name}: malformed v63 dependent parameter telescope for ${layer.containerName}`);
      const p=layer.publicParams[pi];
      const actual=infer(validationEnv,paramCtx,p);
      if(!defEq(validationEnv,paramCtx,actual,t.domain))throw new KernelError(`${decl.name}: v63 nested container ${layer.containerName} dependent parameter ${pi} type mismatch`);
      t=instantiate(t.body,p);
    }
    if(layer.sampleIndices.length!==layer.container.numIndices)throw new KernelError(`${decl.name}: v63 nested container ${layer.containerName} index arity mismatch`);
    for(let ii=0;ii<layer.container.numIndices;ii++){
      if(t.tag!=="pi")throw new KernelError(`${decl.name}: v63 nested container ${layer.containerName} index telescope is shorter than numIndices`);
      if(containsAnyConst(t.domain,memberNames))throw new KernelError(`${decl.name}: v63 bounded slice requires container index domains independent of the recursive mutual target`);
      t=t.body;
    }
    const result=kernelWhnfIn(validationEnv,paramCtx,t);if(result.tag!=="sort"||!normalizesToZero(result.level))throw new KernelError(`${decl.name}: v63 nested container ${layer.containerName} specialization must be Prop`);
  }

  for(let mi=0;mi<decl.inductives.length;mi++)for(let ci=0;ci<decl.inductives[mi].constructors.length;ci++){
    const ctor=decl.inductives[mi].constructors[ci],{fields}=splitPi(ctor.type);
    for(let fi=numParams;fi<fields.length;fi++){
      const field=fields[fi];if(!containsAnyConst(field,memberNames))continue;
      if(mi===deep.memberIndex&&ci===deep.ctorIndex&&fi===deep.fieldIndex)continue;
      const direct=flattenApps(field),target=direct.head.tag==="const"?memberMap.get(direct.head.name):undefined;
      if(!target||direct.head.tag!=="const"||!levelsDefEq(direct.head.levels,selfLevels)||direct.args.length!==numParams+target.numIndices)
        throw new KernelError(`${ctor.name}: v63 bounded slice admits only direct mutual recursion outside the selected deep path`);
      const localCount=fi-numParams;
      for(let pi=0;pi<numParams;pi++){const p=projectNestedIndexToParamContext(direct.args[pi],localCount);if(!p||!defEq(env,paramCtx,p,currentParams[pi]))throw new KernelError(`${ctor.name}: v63 direct recursive occurrence must preserve the exact shared mutual parameter tuple`);}
    }
  }

  const firstName=first.name,helperNames=layers.map((_,i)=>`${firstName}.rec_${i+1}`);
  for(const h of helperNames)if(env.has(h))throw new KernelError(`${decl.name}: v63 nested helper recursor name already exists: ${h}`);
  const syntheticMembers:Extract<CoreDeclaration,{kind:"mutualInductive"}>["inductives"]=decl.inductives.map((m,mi)=>({
    name:m.name,type:m.type,numParams,numIndices:m.numIndices,
    constructors:m.constructors.map((ctor,ci)=>{
      const {fields,fieldBinderInfo,result}=splitPi(ctor.type);
      const rewritten=fields.map((field,fi)=>{
        if(mi!==deep!.memberIndex||ci!==deep!.ctorIndex||fi!==deep!.fieldIndex)return field;
        const localCount=fi-numParams,shared=Array.from({length:numParams},(_,i)=>({tag:"bvar",index:localCount+numParams-1-i} as Term));
        const outer=flattenApps(field),indices=outer.args.slice(layers[0].container.numParams);
        return mkApps({tag:"const",name:layers[0].auxName,levels:[...selfLevels]},[...shared,...indices]);
      });
      return{name:ctor.name,type:rebuildPi(rewritten,fieldBinderInfo,result)};
    }),
  }));

  for(const layer of layers){
    const instantiatedType=instantiateTermLevels(layer.container.type,layer.container.levelParams,layer.containerLevels);
    const auxCtors=layer.container.constructors.map((ctor,index)=>{
      const instantiatedCtorType=instantiateTermLevels(ctor.type,layer.container.levelParams,layer.containerLevels);
      const syntheticName=`${layer.auxName}.ctor${index}`;layer.ctorRestore.set(syntheticName,ctor.name);
      const specialized=instantiateV45Params(instantiatedCtorType,layer.publicParams,`${decl.name}: v63 ${ctor.name}`);
      const rewritten=rewriteNestedV45(specialized,layers,numParams,selfLevels);
      return{name:syntheticName,type:prependPiTelescope(first.type,numParams,rewritten)};
    });
    const auxTail=instantiateV45Params(instantiatedType,layer.publicParams,`${decl.name}: v63 ${layer.containerName}`);
    syntheticMembers.push({name:layer.auxName,type:prependPiTelescope(first.type,numParams,auxTail),numParams,numIndices:layer.container.numIndices,constructors:auxCtors});
  }

  const synthetic:Extract<CoreDeclaration,{kind:"mutualInductive"}>={kind:"mutualInductive",name:`_nestedMutualDeepDependentParam.${decl.name}.block`,levelParams:[...decl.levelParams],inductives:syntheticMembers};
  const transformed=env.clone();checkDirectMutualInductive(transformed,synthetic);
  const syntheticNames=syntheticMembers.map(m=>m.name),publicRecursors=[...decl.inductives.map(m=>`${m.name}.rec`),...helperNames];
  const targetRecursor=new Map(syntheticNames.map((n,i)=>[n,publicRecursors[i]] as const)),originalCount=decl.inductives.length;
  const restoredRecursors:Extract<EnvironmentDeclaration,{kind:"recursor"}>[]=syntheticNames.map((name,ri)=>{
    const e=transformed.get(`${name}.rec`);if(!e||e.declaration.kind!=="recursor")throw new KernelError(`${decl.name}: internal v63 preprocessing did not generate recursor for ${name}`);
    const helper=ri>=originalCount,layer=helper?layers[ri-originalCount]:undefined;
    const rules=e.declaration.metadata.rules.map(rule=>({...rule,
      ctor:helper?(layer!.ctorRestore.get(rule.ctor)??rule.ctor):rule.ctor,
      recursiveFieldTypes:rule.recursiveFieldTypes?.map(t=>t?restoreNestedV45(t,layers,numParams,selfLevels):null),
      recursiveTargets:rule.recursiveTargets?.map(()=>null),
      recursiveRecursors:rule.recursiveTargets?.map(target=>target?targetRecursor.get(target)??null:null),
      ...(helper?{ctorParamCount:layer!.container.numParams}:{}),
    }));
    return{kind:"recursor",name:publicRecursors[ri],levelParams:[...e.declaration.levelParams],type:restoreNestedV45(e.declaration.type,layers,numParams,selfLevels),metadata:{...e.declaration.metadata,inductive:helper?firstName:name,rules,mutual:{inductives:syntheticNames,motiveCount:syntheticNames.length,recursors:publicRecursors,indexCounts:syntheticMembers.map(m=>m.numIndices)}}};
  });

  const final=env.clone(),aggregateAssumptions=new Set<string>();
  for(let mi=0;mi<decl.inductives.length;mi++){
    const m=decl.inductives[mi],assumptions=dependencyAssumptions(transformed,[m.type,...m.constructors.map(c=>c.type)]);for(const a of assumptions)aggregateAssumptions.add(a);
    final.add({declaration:{kind:"inductive",name:m.name,levelParams:[...decl.levelParams],type:m.type,numParams,numIndices:m.numIndices,constructors:m.constructors},assumptions,generated:[...m.constructors.map(c=>c.name),`${m.name}.rec`,...(mi===0?helperNames:[])]});
  }
  for(const m of decl.inductives)for(const ctor of m.constructors){const sort=kernelWhnf(final,infer(final,[],ctor.type));if(sort.tag!=="sort")throw new KernelError(`${ctor.name}: restored v63 constructor type is not a type`);final.add({declaration:{kind:"constructor",name:ctor.name,levelParams:[...decl.levelParams],type:ctor.type,inductive:m.name},assumptions:dependencyAssumptions(final,[ctor.type]),generated:[]});}
  for(const rec of restoredRecursors){const sort=kernelWhnf(final,infer(final,[],rec.type));if(sort.tag!=="sort")throw new KernelError(`${rec.name}: restored v63 recursor type is not a type`);final.add({declaration:rec,assumptions:dependencyAssumptions(final,[rec.type]),generated:[]});}
  env.replaceWith(final);
  return{declaration:decl,assumptions:aggregateAssumptions,generated:[...decl.inductives.flatMap(m=>m.constructors.map(c=>c.name)),...publicRecursors]};
}


function tryCheckMutualNestedDeeperMultiParameterContainersV62(
  env:Environment,decl:Extract<CoreDeclaration,{kind:"mutualInductive"}>,
):CheckedDeclaration|undefined{
  if(!env.allowMutualNestedDeeperMultiParameterContainers||decl.levelParams.length===0||decl.inductives.length<2)return undefined;
  validateLevelParams(decl);
  const selfLevels=decl.levelParams.map(name=>({tag:"param",name} as Level));
  const numParams=decl.inductives[0]?.numParams??0;
  if(decl.inductives.some(m=>m.numParams!==numParams)||decl.inductives.every(m=>m.numIndices===0))return undefined;
  const memberNames=new Set(decl.inductives.map(m=>m.name));
  const memberMap=new Map(decl.inductives.map(m=>[m.name,{numIndices:m.numIndices}] as const));
  const first=decl.inductives[0];
  const {ctx:paramCtx,args:currentParams}=mutualSharedParamContextV57(first,numParams);
  for(const m of decl.inductives){
    let tail=m.type;for(let p=0;p<numParams+m.numIndices;p++){if(tail.tag!=="pi")return undefined;tail=tail.body;}
    if(tail.tag!=="sort"||!normalizesToZero(tail.level))return undefined;
  }

  let deep:{memberIndex:number;ctorIndex:number;fieldIndex:number;targetName:string;targetIndices:Term[];layers:NestedV45Spec[]}|undefined;
  for(let mi=0;mi<decl.inductives.length;mi++)for(let ci=0;ci<decl.inductives[mi].constructors.length;ci++){
    const ctor=decl.inductives[mi].constructors[ci],{fields}=splitPi(ctor.type);
    for(let fi=numParams;fi<fields.length;fi++){
      if(!containsAnyConst(fields[fi],memberNames))continue;
      const localCount=fi-numParams;
      const direct=flattenApps(fields[fi]),directTarget=direct.head.tag==="const"?memberMap.get(direct.head.name):undefined;
      if(directTarget&&direct.head.tag==="const"&&levelsDefEq(direct.head.levels,selfLevels)&&direct.args.length===numParams+directTarget.numIndices){
        let ok=true;for(let pi=0;pi<numParams;pi++){const p=projectNestedIndexToParamContext(direct.args[pi],localCount);if(!p||!defEq(env,paramCtx,p,currentParams[pi])){ok=false;break;}}
        if(ok)continue;
      }
      const path=nestedDeepMutualChainV62(env,fields[fi],memberMap,memberNames,numParams,paramCtx,currentParams,selfLevels,localCount);
      if(!path)throw new KernelError(`${ctor.name}: v62 deep multi-parameter container specialization may not capture constructor/index-local values and each layer must contain exactly one recursive parameter slot`);
      if(deep)throw new KernelError(`${decl.name}: v62 bounded slice admits exactly one linear deep recursive field`);
      deep={memberIndex:mi,ctorIndex:ci,fieldIndex:fi,targetName:path.targetName,targetIndices:path.targetIndices,layers:path.layers};
    }
  }
  if(!deep)return undefined;

  validateName(decl.name);for(const m of decl.inductives)if(env.has(m.name))throw new KernelError(`duplicate declaration: ${m.name}`);
  const layers=deep.layers;
  for(let i=0;i<layers.length;i++){
    const layer=layers[i];layer.auxName=`_nestedMutualDeepMultiParam.${decl.name}.aux${i+1}`;
    if(env.has(layer.auxName)||env.has(`${layer.auxName}.rec`))throw new KernelError(`${decl.name}: internal v62 nested auxiliary name already exists: ${layer.auxName}`);
    if(layer.containerLevels.length!==layer.container.levelParams.length)throw new KernelError(`${decl.name}: v62 nested container ${layer.containerName} universe arity mismatch`);
    let t=instantiateTermLevels(layer.container.type,layer.container.levelParams,layer.containerLevels);
    for(let pi=0;pi<layer.container.numParams;pi++){
      if(t.tag!=="pi")throw new KernelError(`${decl.name}: malformed v62 parameter telescope for ${layer.containerName}`);
      const dom=kernelWhnfIn(env,paramCtx,t.domain);if(dom.tag!=="sort"||!normalizesToZero(dom.level))throw new KernelError(`${decl.name}: v62 nested container ${layer.containerName} parameters must be independent Prop parameters`);
      const p=layer.publicParams[pi];
      if(!containsAnyConst(p,memberNames)){
        const actual=infer(env,paramCtx,p);if(!defEq(env,paramCtx,actual,t.domain))throw new KernelError(`${decl.name}: v62 nested container ${layer.containerName} parameter ${pi} type mismatch`);
      }
      t=instantiate(t.body,p);
    }
    if(layer.sampleIndices.length!==layer.container.numIndices)throw new KernelError(`${decl.name}: v62 nested container ${layer.containerName} index arity mismatch`);
    for(let ii=0;ii<layer.container.numIndices;ii++){
      if(t.tag!=="pi")throw new KernelError(`${decl.name}: v62 nested container ${layer.containerName} index telescope is shorter than numIndices`);
      if(containsAnyConst(t.domain,memberNames))throw new KernelError(`${decl.name}: v62 bounded slice requires container index domains independent of the recursive mutual target`);
      t=t.body;
    }
    const result=kernelWhnfIn(env,paramCtx,t);if(result.tag!=="sort"||!normalizesToZero(result.level))throw new KernelError(`${decl.name}: v62 nested container ${layer.containerName} specialization must be Prop`);
  }

  for(let mi=0;mi<decl.inductives.length;mi++)for(let ci=0;ci<decl.inductives[mi].constructors.length;ci++){
    const ctor=decl.inductives[mi].constructors[ci],{fields}=splitPi(ctor.type);
    for(let fi=numParams;fi<fields.length;fi++){
      const field=fields[fi];if(!containsAnyConst(field,memberNames))continue;
      if(mi===deep.memberIndex&&ci===deep.ctorIndex&&fi===deep.fieldIndex)continue;
      const direct=flattenApps(field),target=direct.head.tag==="const"?memberMap.get(direct.head.name):undefined;
      if(!target||direct.head.tag!=="const"||!levelsDefEq(direct.head.levels,selfLevels)||direct.args.length!==numParams+target.numIndices)
        throw new KernelError(`${ctor.name}: v62 bounded slice admits only direct mutual recursion outside the selected deep path`);
      const localCount=fi-numParams;
      for(let pi=0;pi<numParams;pi++){const p=projectNestedIndexToParamContext(direct.args[pi],localCount);if(!p||!defEq(env,paramCtx,p,currentParams[pi]))throw new KernelError(`${ctor.name}: v62 direct recursive occurrence must preserve the exact shared mutual parameter tuple`);}
    }
  }

  const firstName=first.name,helperNames=layers.map((_,i)=>`${firstName}.rec_${i+1}`);
  for(const h of helperNames)if(env.has(h))throw new KernelError(`${decl.name}: v62 nested helper recursor name already exists: ${h}`);
  const syntheticMembers:Extract<CoreDeclaration,{kind:"mutualInductive"}>["inductives"]=decl.inductives.map((m,mi)=>({
    name:m.name,type:m.type,numParams,numIndices:m.numIndices,
    constructors:m.constructors.map((ctor,ci)=>{
      const {fields,fieldBinderInfo,result}=splitPi(ctor.type);
      const rewritten=fields.map((field,fi)=>{
        if(mi!==deep!.memberIndex||ci!==deep!.ctorIndex||fi!==deep!.fieldIndex)return field;
        const localCount=fi-numParams,shared=Array.from({length:numParams},(_,i)=>({tag:"bvar",index:localCount+numParams-1-i} as Term));
        const outer=flattenApps(field),indices=outer.args.slice(layers[0].container.numParams);
        return mkApps({tag:"const",name:layers[0].auxName,levels:[...selfLevels]},[...shared,...indices]);
      });
      return{name:ctor.name,type:rebuildPi(rewritten,fieldBinderInfo,result)};
    }),
  }));

  for(const layer of layers){
    const instantiatedType=instantiateTermLevels(layer.container.type,layer.container.levelParams,layer.containerLevels);
    const auxCtors=layer.container.constructors.map((ctor,index)=>{
      const instantiatedCtorType=instantiateTermLevels(ctor.type,layer.container.levelParams,layer.containerLevels);
      const syntheticName=`${layer.auxName}.ctor${index}`;layer.ctorRestore.set(syntheticName,ctor.name);
      const specialized=instantiateV45Params(instantiatedCtorType,layer.publicParams,`${decl.name}: v62 ${ctor.name}`);
      const rewritten=rewriteNestedV45(specialized,layers,numParams,selfLevels);
      return{name:syntheticName,type:prependPiTelescope(first.type,numParams,rewritten)};
    });
    const auxTail=instantiateV45Params(instantiatedType,layer.publicParams,`${decl.name}: v62 ${layer.containerName}`);
    syntheticMembers.push({name:layer.auxName,type:prependPiTelescope(first.type,numParams,auxTail),numParams,numIndices:layer.container.numIndices,constructors:auxCtors});
  }

  const synthetic:Extract<CoreDeclaration,{kind:"mutualInductive"}>={kind:"mutualInductive",name:`_nestedMutualDeepMultiParam.${decl.name}.block`,levelParams:[...decl.levelParams],inductives:syntheticMembers};
  const transformed=env.clone();checkDirectMutualInductive(transformed,synthetic);
  const syntheticNames=syntheticMembers.map(m=>m.name),publicRecursors=[...decl.inductives.map(m=>`${m.name}.rec`),...helperNames];
  const targetRecursor=new Map(syntheticNames.map((n,i)=>[n,publicRecursors[i]] as const)),originalCount=decl.inductives.length;
  const restoredRecursors:Extract<EnvironmentDeclaration,{kind:"recursor"}>[]=syntheticNames.map((name,ri)=>{
    const e=transformed.get(`${name}.rec`);if(!e||e.declaration.kind!=="recursor")throw new KernelError(`${decl.name}: internal v62 preprocessing did not generate recursor for ${name}`);
    const helper=ri>=originalCount,layer=helper?layers[ri-originalCount]:undefined;
    const rules=e.declaration.metadata.rules.map(rule=>({...rule,
      ctor:helper?(layer!.ctorRestore.get(rule.ctor)??rule.ctor):rule.ctor,
      recursiveFieldTypes:rule.recursiveFieldTypes?.map(t=>t?restoreNestedV45(t,layers,numParams,selfLevels):null),
      recursiveTargets:rule.recursiveTargets?.map(()=>null),
      recursiveRecursors:rule.recursiveTargets?.map(target=>target?targetRecursor.get(target)??null:null),
      ...(helper?{ctorParamCount:layer!.container.numParams}:{}),
    }));
    return{kind:"recursor",name:publicRecursors[ri],levelParams:[...e.declaration.levelParams],type:restoreNestedV45(e.declaration.type,layers,numParams,selfLevels),metadata:{...e.declaration.metadata,inductive:helper?firstName:name,rules,mutual:{inductives:syntheticNames,motiveCount:syntheticNames.length,recursors:publicRecursors,indexCounts:syntheticMembers.map(m=>m.numIndices)}}};
  });

  const final=env.clone(),aggregateAssumptions=new Set<string>();
  for(let mi=0;mi<decl.inductives.length;mi++){
    const m=decl.inductives[mi],assumptions=dependencyAssumptions(transformed,[m.type,...m.constructors.map(c=>c.type)]);for(const a of assumptions)aggregateAssumptions.add(a);
    final.add({declaration:{kind:"inductive",name:m.name,levelParams:[...decl.levelParams],type:m.type,numParams,numIndices:m.numIndices,constructors:m.constructors},assumptions,generated:[...m.constructors.map(c=>c.name),`${m.name}.rec`,...(mi===0?helperNames:[])]});
  }
  for(const m of decl.inductives)for(const ctor of m.constructors){const sort=kernelWhnf(final,infer(final,[],ctor.type));if(sort.tag!=="sort")throw new KernelError(`${ctor.name}: restored v62 constructor type is not a type`);final.add({declaration:{kind:"constructor",name:ctor.name,levelParams:[...decl.levelParams],type:ctor.type,inductive:m.name},assumptions:dependencyAssumptions(final,[ctor.type]),generated:[]});}
  for(const rec of restoredRecursors){const sort=kernelWhnf(final,infer(final,[],rec.type));if(sort.tag!=="sort")throw new KernelError(`${rec.name}: restored v62 recursor type is not a type`);final.add({declaration:rec,assumptions:dependencyAssumptions(final,[rec.type]),generated:[]});}
  env.replaceWith(final);
  return{declaration:decl,assumptions:aggregateAssumptions,generated:[...decl.inductives.flatMap(m=>m.constructors.map(c=>c.name)),...publicRecursors]};
}

/**
 * v59: compose explicit universe instantiations with the v58 deep indexed
 * mutual/nested graph.  Universe expressions are preserved exactly on public
 * containers, private helpers use the mutual block's declared level telescope,
 * and every instantiated helper result must live in the block result universe.
 */
/**
 * v60: compose the v59 deep universe/index graph with the existing trusted
 * mutual-Prop elimination policy. Original members retain parameters, indices,
 * and universe telescopes; every deep container must be Prop -> Prop after its
 * explicit universe instantiation. Fixed/shared-parameter-derived target indices
 * are preserved, constructor/index-local nested target capture remains rejected,
 * and the entire synthetic graph is rechecked by checkDirectMutualInductive.
 */
function tryCheckMutualNestedDeeperPropV60(
  env:Environment,decl:Extract<CoreDeclaration,{kind:"mutualInductive"}>,
):CheckedDeclaration|undefined{
  if(!(env.allowMutualNestedDeeperProp||env.allowMutualNestedDeeperIndexedContainers)||decl.levelParams.length===0||decl.inductives.length<2)return undefined;
  const indexedDeepContainers=env.allowMutualNestedDeeperIndexedContainers;
  validateLevelParams(decl);
  const selfLevels=decl.levelParams.map(name=>({tag:"param",name} as Level));
  const numParams=decl.inductives[0]?.numParams??0;
  if(decl.inductives.some(m=>m.numParams!==numParams)||decl.inductives.every(m=>m.numIndices===0))return undefined;
  const memberNames=new Set(decl.inductives.map(m=>m.name));
  const memberMap=new Map(decl.inductives.map(m=>[m.name,{numIndices:m.numIndices}] as const));
  const first=decl.inductives[0];
  const {ctx:paramCtx,args:currentParams}=mutualSharedParamContextV57(first,numParams);

  let resultLevel:Level|undefined;
  for(const m of decl.inductives){
    let tail=m.type;for(let p=0;p<numParams+m.numIndices;p++){if(tail.tag!=="pi")return undefined;tail=tail.body;}
    if(tail.tag!=="sort"||!normalizesToZero(tail.level))return undefined;
    if(resultLevel===undefined)resultLevel=tail.level;else if(!levelDefEq(resultLevel,tail.level))return undefined;
  }
  if(resultLevel===undefined)return undefined;

  let deep:{memberIndex:number;ctorIndex:number;fieldIndex:number;targetName:string;targetIndices:Term[];layers:NestedV41Layer[];projected:Term}|undefined;
  for(let mi=0;mi<decl.inductives.length;mi++){
    const m=decl.inductives[mi];
    for(let ci=0;ci<m.constructors.length;ci++){
      const ctor=m.constructors[ci],{fields}=splitPi(ctor.type);
      for(let fi=numParams;fi<fields.length;fi++){
        if(!containsAnyConst(fields[fi],memberNames))continue;
        const localCount=fi-numParams;
        const direct=flattenApps(fields[fi]);
        const directTarget=direct.head.tag==="const"?memberMap.get(direct.head.name):undefined;
        if(directTarget&&direct.head.tag==="const"&&levelsDefEq(direct.head.levels,selfLevels)&&direct.args.length===numParams+directTarget.numIndices){
          let paramsOk=true;
          for(let pi=0;pi<numParams;pi++){
            const pp=projectNestedIndexToParamContext(direct.args[pi],localCount);
            if(!pp||!defEq(env,paramCtx,pp,currentParams[pi])){paramsOk=false;break;}
          }
          if(paramsOk)continue;
        }
        let projected:Term|undefined,path:MutualNestedV59Path|undefined;
        if(indexedDeepContainers){
          path=nestedDeepMutualChainV61(env,fields[fi],memberMap,numParams,paramCtx,currentParams,selfLevels,localCount);
          projected=projectNestedIndexToParamContext(fields[fi],localCount)??fields[fi];
        }else{
          projected=projectNestedIndexToParamContext(fields[fi],localCount);
          if(!projected)throw new KernelError(`${ctor.name}: v60 nested mutual target may not capture constructor/index-local values`);
          path=nestedDeepMutualChainV59(env,projected,memberMap,numParams,paramCtx,currentParams,selfLevels);
        }
        if(!path){
          if(indexedDeepContainers)throw new KernelError(`${ctor.name}: v61 deep nested container parameter specialization may not capture constructor/index-local values or use an unsupported indexed-container shape`);
          continue;
        }
        if(deep)throw new KernelError(`${decl.name}: v60 bounded polymorphic deeper indexed mutual/nested slice admits exactly one uniform linear deep recursive field`);
        deep={memberIndex:mi,ctorIndex:ci,fieldIndex:fi,targetName:path.targetName,targetIndices:path.targetIndices,layers:path.layers,projected};
      }
    }
  }
  if(!deep)return undefined;

  validateName(decl.name);for(const m of decl.inductives)if(env.has(m.name))throw new KernelError(`duplicate declaration: ${m.name}`);
  const layers=deep.layers;
  for(let i=0;i<layers.length;i++){
    const layer=layers[i];layer.auxName=`_nestedMutualDeepProp.${decl.name}.aux${i+1}`;
    if(env.has(layer.auxName)||env.has(`${layer.auxName}.rec`))throw new KernelError(`${decl.name}: internal v60 nested auxiliary name already exists: ${layer.auxName}`);
    if(layer.containerLevels.length!==layer.container.levelParams.length)throw new KernelError(`${decl.name}: v60 nested container ${layer.containerName} universe arity mismatch`);
    const ct=instantiateTermLevels(layer.container.type,layer.container.levelParams,layer.containerLevels);
    if(ct.tag!=="pi")throw new KernelError(`${decl.name}: malformed v${indexedDeepContainers?61:60} nested container ${layer.containerName}`);
    const paramSort=kernelWhnf(env,ct.domain);if(paramSort.tag!=="sort"||!normalizesToZero(paramSort.level))throw new KernelError(`${decl.name}: v${indexedDeepContainers?61:60} nested container ${layer.containerName} parameter must be Prop`);
    let resultTail=instantiate(ct.body,layer.publicParam);
    for(let ii=0;ii<layer.container.numIndices;ii++){
      if(resultTail.tag!=="pi")throw new KernelError(`${decl.name}: v61 nested container ${layer.containerName} index telescope is shorter than numIndices`);
      if(indexedDeepContainers&&containsAnyConst(resultTail.domain,memberNames))throw new KernelError(`${decl.name}: v61 bounded indexed-container slice requires container index domains independent of the recursive mutual target`);
      resultTail=resultTail.body;
    }
    const result=kernelWhnfIn(env,paramCtx,resultTail);
    if(result.tag!=="sort"||!normalizesToZero(result.level))throw new KernelError(`${decl.name}: v${indexedDeepContainers?61:60} nested container ${layer.containerName} specialization must be Prop`);
  }

  // Non-selected recursive fields remain direct mutual occurrences.  They may
  // vary indices in constructor context, but must preserve levels + parameters.
  for(let mi=0;mi<decl.inductives.length;mi++)for(let ci=0;ci<decl.inductives[mi].constructors.length;ci++){
    const ctor=decl.inductives[mi].constructors[ci],{fields}=splitPi(ctor.type);
    for(let fi=numParams;fi<fields.length;fi++){
      const field=fields[fi];if(!containsAnyConst(field,memberNames))continue;
      if(mi===deep.memberIndex&&ci===deep.ctorIndex&&fi===deep.fieldIndex)continue;
      const direct=flattenApps(field),target=direct.head.tag==="const"?memberMap.get(direct.head.name):undefined;
      if(!target||direct.head.tag!=="const"||!levelsDefEq(direct.head.levels,selfLevels)||direct.args.length!==numParams+target.numIndices)
        throw new KernelError(`${ctor.name}: v60 bounded polymorphic deeper indexed slice admits only direct mutual recursion outside the selected deep path`);
      const localCount=fi-numParams;
      for(let pi=0;pi<numParams;pi++){
        const pp=projectNestedIndexToParamContext(direct.args[pi],localCount);
        if(!pp||!defEq(env,paramCtx,pp,currentParams[pi]))throw new KernelError(`${ctor.name}: v60 direct recursive occurrence must preserve the exact shared mutual parameter tuple`);
      }
    }
  }

  const firstName=first.name,helperNames=layers.map((_,i)=>`${firstName}.rec_${i+1}`);
  for(const h of helperNames)if(env.has(h))throw new KernelError(`${decl.name}: v60 nested helper recursor name already exists: ${h}`);
  const syntheticMembers:Extract<CoreDeclaration,{kind:"mutualInductive"}>["inductives"]=decl.inductives.map((m,mi)=>({
    name:m.name,type:m.type,numParams,numIndices:m.numIndices,
    constructors:m.constructors.map((ctor,ci)=>{
      const {fields,fieldBinderInfo,result}=splitPi(ctor.type);
      const rewritten=fields.map((field,fi)=>{
        if(mi!==deep!.memberIndex||ci!==deep!.ctorIndex||fi!==deep!.fieldIndex)return field;
        const localCount=fi-numParams,shared=Array.from({length:numParams},(_,i)=>({tag:"bvar",index:localCount+numParams-1-i} as Term));
        return mkApps({tag:"const",name:layers[0].auxName,levels:[...selfLevels]},indexedDeepContainers?[...shared,...layers[0].containerIndices]:shared);
      });
      return{name:ctor.name,type:rebuildPi(rewritten,fieldBinderInfo,result)};
    }),
  }));

  for(const layer of layers){
    const instantiatedType=instantiateTermLevels(layer.container.type,layer.container.levelParams,layer.containerLevels);
    if(instantiatedType.tag!=="pi")throw new KernelError(`${decl.name}: malformed v60 nested-container type ${layer.containerName}`);
    const auxCtors=layer.container.constructors.map((ctor,index)=>{
      const instantiatedCtorType=instantiateTermLevels(ctor.type,layer.container.levelParams,layer.containerLevels);
      if(instantiatedCtorType.tag!=="pi")throw new KernelError(`${decl.name}: malformed v60 nested-container constructor ${ctor.name}`);
      const syntheticName=`${layer.auxName}.ctor${index}`;layer.ctorRestore.set(syntheticName,ctor.name);
      const specialized=instantiate(instantiatedCtorType.body,layer.publicParam);
      const rewritten=rewriteNestedDeepV41(specialized,layers,numParams,selfLevels);
      return{name:syntheticName,type:prependPiTelescope(first.type,numParams,rewritten)};
    });
    const auxTail=instantiate(instantiatedType.body,layer.publicParam);
    syntheticMembers.push({name:layer.auxName,type:prependPiTelescope(first.type,numParams,auxTail),numParams,numIndices:indexedDeepContainers?layer.container.numIndices:0,constructors:auxCtors});
  }

  const synthetic:Extract<CoreDeclaration,{kind:"mutualInductive"}>={kind:"mutualInductive",name:`_nestedMutualDeepProp.${decl.name}.block`,levelParams:[...decl.levelParams],inductives:syntheticMembers};
  const transformed=env.clone();checkDirectMutualInductive(transformed,synthetic);
  const syntheticNames=syntheticMembers.map(m=>m.name),publicRecursors=[...decl.inductives.map(m=>`${m.name}.rec`),...helperNames];
  const targetRecursor=new Map(syntheticNames.map((n,i)=>[n,publicRecursors[i]] as const)),originalCount=decl.inductives.length;
  const restoredRecursors:Extract<EnvironmentDeclaration,{kind:"recursor"}>[]=syntheticNames.map((name,ri)=>{
    const e=transformed.get(`${name}.rec`);if(!e||e.declaration.kind!=="recursor")throw new KernelError(`${decl.name}: internal v60 mutual/nested preprocessing did not generate recursor for ${name}`);
    const helper=ri>=originalCount,layer=helper?layers[ri-originalCount]:undefined;
    const rules=e.declaration.metadata.rules.map(rule=>({...rule,
      ctor:helper?(layer!.ctorRestore.get(rule.ctor)??rule.ctor):rule.ctor,
      recursiveFieldTypes:rule.recursiveFieldTypes?.map(t=>t?restoreNestedDeepV41(t,layers,numParams,selfLevels):null),
      recursiveTargets:rule.recursiveTargets?.map(()=>null),
      recursiveRecursors:rule.recursiveTargets?.map(target=>target?targetRecursor.get(target)??null:null),
      ...(helper?{ctorParamCount:1}:{}),
    }));
    return{kind:"recursor",name:publicRecursors[ri],levelParams:[...e.declaration.levelParams],type:restoreNestedDeepV41(e.declaration.type,layers,numParams,selfLevels),metadata:{...e.declaration.metadata,inductive:helper?firstName:name,rules,mutual:{inductives:syntheticNames,motiveCount:syntheticNames.length,recursors:publicRecursors,indexCounts:syntheticMembers.map(m=>m.numIndices)}}};
  });

  const final=env.clone(),aggregateAssumptions=new Set<string>();
  for(let mi=0;mi<decl.inductives.length;mi++){
    const m=decl.inductives[mi],as=dependencyAssumptions(transformed,[m.type,...m.constructors.map(c=>c.type)]);for(const a of as)aggregateAssumptions.add(a);
    final.add({declaration:{kind:"inductive",name:m.name,levelParams:[...decl.levelParams],type:m.type,numParams,numIndices:m.numIndices,constructors:m.constructors},assumptions:as,generated:[...m.constructors.map(c=>c.name),`${m.name}.rec`,...(mi===0?helperNames:[])]});
  }
  for(const m of decl.inductives)for(const ctor of m.constructors){
    const sort=kernelWhnf(final,infer(final,[],ctor.type));if(sort.tag!=="sort")throw new KernelError(`${ctor.name}: restored v60 constructor type is not a type`);
    final.add({declaration:{kind:"constructor",name:ctor.name,levelParams:[...decl.levelParams],type:ctor.type,inductive:m.name},assumptions:dependencyAssumptions(final,[ctor.type]),generated:[]});
  }
  for(const rec of restoredRecursors){const sort=kernelWhnf(final,infer(final,[],rec.type));if(sort.tag!=="sort")throw new KernelError(`${rec.name}: restored v60 recursor type is not a type`);final.add({declaration:rec,assumptions:dependencyAssumptions(final,[rec.type]),generated:[]});}
  env.replaceWith(final);
  return{declaration:decl,assumptions:aggregateAssumptions,generated:[...decl.inductives.flatMap(m=>m.constructors.map(c=>c.name)),...publicRecursors]};
}

function tryCheckMutualNestedDeeperPolymorphicV59(
  env:Environment,decl:Extract<CoreDeclaration,{kind:"mutualInductive"}>,
):CheckedDeclaration|undefined{
  if(!env.allowMutualNestedDeeperPolymorphic||decl.levelParams.length===0||decl.inductives.length<2)return undefined;
  validateLevelParams(decl);
  const selfLevels=decl.levelParams.map(name=>({tag:"param",name} as Level));
  const numParams=decl.inductives[0]?.numParams??0;
  if(decl.inductives.some(m=>m.numParams!==numParams)||decl.inductives.every(m=>m.numIndices===0))return undefined;
  const memberNames=new Set(decl.inductives.map(m=>m.name));
  const memberMap=new Map(decl.inductives.map(m=>[m.name,{numIndices:m.numIndices}] as const));
  const first=decl.inductives[0];
  const {ctx:paramCtx,args:currentParams}=mutualSharedParamContextV57(first,numParams);

  let resultLevel:Level|undefined;
  for(const m of decl.inductives){
    let tail=m.type;for(let p=0;p<numParams+m.numIndices;p++){if(tail.tag!=="pi")return undefined;tail=tail.body;}
    if(tail.tag!=="sort"||!isNeverZero(tail.level))return undefined;
    if(resultLevel===undefined)resultLevel=tail.level;else if(!levelDefEq(resultLevel,tail.level))return undefined;
  }
  if(resultLevel===undefined)return undefined;

  let deep:{memberIndex:number;ctorIndex:number;fieldIndex:number;targetName:string;targetIndices:Term[];layers:NestedV41Layer[];projected:Term}|undefined;
  for(let mi=0;mi<decl.inductives.length;mi++){
    const m=decl.inductives[mi];
    for(let ci=0;ci<m.constructors.length;ci++){
      const ctor=m.constructors[ci],{fields}=splitPi(ctor.type);
      for(let fi=numParams;fi<fields.length;fi++){
        if(!containsAnyConst(fields[fi],memberNames))continue;
        const localCount=fi-numParams;
        const projected=projectNestedIndexToParamContext(fields[fi],localCount);
        if(!projected){
          const direct=flattenApps(fields[fi]);
          const target=direct.head.tag==="const"?memberMap.get(direct.head.name):undefined;
          if(target&&direct.head.tag==="const"&&levelsDefEq(direct.head.levels,selfLevels)&&direct.args.length===numParams+target.numIndices){
            let paramsOk=true;
            for(let pi=0;pi<numParams;pi++){
              const pp=projectNestedIndexToParamContext(direct.args[pi],localCount);
              if(!pp||!defEq(env,paramCtx,pp,currentParams[pi])){paramsOk=false;break;}
            }
            if(paramsOk)continue;
          }
          throw new KernelError(`${ctor.name}: v59 nested mutual target may not capture constructor/index-local values`);
        }
        const path=nestedDeepMutualChainV59(env,projected,memberMap,numParams,paramCtx,currentParams,selfLevels);
        if(!path)continue;
        if(deep)throw new KernelError(`${decl.name}: v59 bounded polymorphic deeper indexed mutual/nested slice admits exactly one uniform linear deep recursive field`);
        deep={memberIndex:mi,ctorIndex:ci,fieldIndex:fi,targetName:path.targetName,targetIndices:path.targetIndices,layers:path.layers,projected};
      }
    }
  }
  if(!deep)return undefined;

  validateName(decl.name);for(const m of decl.inductives)if(env.has(m.name))throw new KernelError(`duplicate declaration: ${m.name}`);
  const layers=deep.layers;
  for(let i=0;i<layers.length;i++){
    const layer=layers[i];layer.auxName=`_nestedMutualDeepPoly.${decl.name}.aux${i+1}`;
    if(env.has(layer.auxName)||env.has(`${layer.auxName}.rec`))throw new KernelError(`${decl.name}: internal v59 nested auxiliary name already exists: ${layer.auxName}`);
    if(layer.containerLevels.length!==layer.container.levelParams.length)throw new KernelError(`${decl.name}: v59 nested container ${layer.containerName} universe arity mismatch`);
    const ct=instantiateTermLevels(layer.container.type,layer.container.levelParams,layer.containerLevels);
    if(ct.tag!=="pi")throw new KernelError(`${decl.name}: malformed v59 nested container ${layer.containerName}`);
    const paramSort=kernelWhnf(env,ct.domain);if(paramSort.tag!=="sort"||!isNeverZero(paramSort.level))throw new KernelError(`${decl.name}: v59 nested container ${layer.containerName} parameter must live in Type`);
    const result=kernelWhnfIn(env,paramCtx,instantiate(ct.body,layer.publicParam));
    if(result.tag!=="sort"||!levelDefEq(result.level,resultLevel))throw new KernelError(`${decl.name}: v59 nested container ${layer.containerName} specialization must live in the mutual block result universe`);
  }

  // Non-selected recursive fields remain direct mutual occurrences.  They may
  // vary indices in constructor context, but must preserve levels + parameters.
  for(let mi=0;mi<decl.inductives.length;mi++)for(let ci=0;ci<decl.inductives[mi].constructors.length;ci++){
    const ctor=decl.inductives[mi].constructors[ci],{fields}=splitPi(ctor.type);
    for(let fi=numParams;fi<fields.length;fi++){
      const field=fields[fi];if(!containsAnyConst(field,memberNames))continue;
      if(mi===deep.memberIndex&&ci===deep.ctorIndex&&fi===deep.fieldIndex)continue;
      const direct=flattenApps(field),target=direct.head.tag==="const"?memberMap.get(direct.head.name):undefined;
      if(!target||direct.head.tag!=="const"||!levelsDefEq(direct.head.levels,selfLevels)||direct.args.length!==numParams+target.numIndices)
        throw new KernelError(`${ctor.name}: v59 bounded polymorphic deeper indexed slice admits only direct mutual recursion outside the selected deep path`);
      const localCount=fi-numParams;
      for(let pi=0;pi<numParams;pi++){
        const pp=projectNestedIndexToParamContext(direct.args[pi],localCount);
        if(!pp||!defEq(env,paramCtx,pp,currentParams[pi]))throw new KernelError(`${ctor.name}: v59 direct recursive occurrence must preserve the exact shared mutual parameter tuple`);
      }
    }
  }

  const firstName=first.name,helperNames=layers.map((_,i)=>`${firstName}.rec_${i+1}`);
  for(const h of helperNames)if(env.has(h))throw new KernelError(`${decl.name}: v59 nested helper recursor name already exists: ${h}`);
  const syntheticMembers:Extract<CoreDeclaration,{kind:"mutualInductive"}>["inductives"]=decl.inductives.map((m,mi)=>({
    name:m.name,type:m.type,numParams,numIndices:m.numIndices,
    constructors:m.constructors.map((ctor,ci)=>{
      const {fields,fieldBinderInfo,result}=splitPi(ctor.type);
      const rewritten=fields.map((field,fi)=>{
        if(mi!==deep!.memberIndex||ci!==deep!.ctorIndex||fi!==deep!.fieldIndex)return field;
        const localCount=fi-numParams,shared=Array.from({length:numParams},(_,i)=>({tag:"bvar",index:localCount+numParams-1-i} as Term));
        return mkApps({tag:"const",name:layers[0].auxName,levels:[...selfLevels]},shared);
      });
      return{name:ctor.name,type:rebuildPi(rewritten,fieldBinderInfo,result)};
    }),
  }));

  for(const layer of layers){
    const instantiatedType=instantiateTermLevels(layer.container.type,layer.container.levelParams,layer.containerLevels);
    if(instantiatedType.tag!=="pi")throw new KernelError(`${decl.name}: malformed v59 nested-container type ${layer.containerName}`);
    const auxCtors=layer.container.constructors.map((ctor,index)=>{
      const instantiatedCtorType=instantiateTermLevels(ctor.type,layer.container.levelParams,layer.containerLevels);
      if(instantiatedCtorType.tag!=="pi")throw new KernelError(`${decl.name}: malformed v59 nested-container constructor ${ctor.name}`);
      const syntheticName=`${layer.auxName}.ctor${index}`;layer.ctorRestore.set(syntheticName,ctor.name);
      const specialized=instantiate(instantiatedCtorType.body,layer.publicParam);
      const rewritten=rewriteNestedDeepV41(specialized,layers,numParams,selfLevels);
      return{name:syntheticName,type:prependPiTelescope(first.type,numParams,rewritten)};
    });
    const auxTail=instantiate(instantiatedType.body,layer.publicParam);
    syntheticMembers.push({name:layer.auxName,type:prependPiTelescope(first.type,numParams,auxTail),numParams,numIndices:0,constructors:auxCtors});
  }

  const synthetic:Extract<CoreDeclaration,{kind:"mutualInductive"}>={kind:"mutualInductive",name:`_nestedMutualDeepPoly.${decl.name}.block`,levelParams:[...decl.levelParams],inductives:syntheticMembers};
  const transformed=env.clone();checkDirectMutualInductive(transformed,synthetic);
  const syntheticNames=syntheticMembers.map(m=>m.name),publicRecursors=[...decl.inductives.map(m=>`${m.name}.rec`),...helperNames];
  const targetRecursor=new Map(syntheticNames.map((n,i)=>[n,publicRecursors[i]] as const)),originalCount=decl.inductives.length;
  const restoredRecursors:Extract<EnvironmentDeclaration,{kind:"recursor"}>[]=syntheticNames.map((name,ri)=>{
    const e=transformed.get(`${name}.rec`);if(!e||e.declaration.kind!=="recursor")throw new KernelError(`${decl.name}: internal v59 mutual/nested preprocessing did not generate recursor for ${name}`);
    const helper=ri>=originalCount,layer=helper?layers[ri-originalCount]:undefined;
    const rules=e.declaration.metadata.rules.map(rule=>({...rule,
      ctor:helper?(layer!.ctorRestore.get(rule.ctor)??rule.ctor):rule.ctor,
      recursiveFieldTypes:rule.recursiveFieldTypes?.map(t=>t?restoreNestedDeepV41(t,layers,numParams,selfLevels):null),
      recursiveTargets:rule.recursiveTargets?.map(()=>null),
      recursiveRecursors:rule.recursiveTargets?.map(target=>target?targetRecursor.get(target)??null:null),
      ...(helper?{ctorParamCount:1}:{}),
    }));
    return{kind:"recursor",name:publicRecursors[ri],levelParams:[...e.declaration.levelParams],type:restoreNestedDeepV41(e.declaration.type,layers,numParams,selfLevels),metadata:{...e.declaration.metadata,inductive:helper?firstName:name,rules,mutual:{inductives:syntheticNames,motiveCount:syntheticNames.length,recursors:publicRecursors,indexCounts:syntheticMembers.map(m=>m.numIndices)}}};
  });

  const final=env.clone(),aggregateAssumptions=new Set<string>();
  for(let mi=0;mi<decl.inductives.length;mi++){
    const m=decl.inductives[mi],as=dependencyAssumptions(transformed,[m.type,...m.constructors.map(c=>c.type)]);for(const a of as)aggregateAssumptions.add(a);
    final.add({declaration:{kind:"inductive",name:m.name,levelParams:[...decl.levelParams],type:m.type,numParams,numIndices:m.numIndices,constructors:m.constructors},assumptions:as,generated:[...m.constructors.map(c=>c.name),`${m.name}.rec`,...(mi===0?helperNames:[])]});
  }
  for(const m of decl.inductives)for(const ctor of m.constructors){
    const sort=kernelWhnf(final,infer(final,[],ctor.type));if(sort.tag!=="sort")throw new KernelError(`${ctor.name}: restored v59 constructor type is not a type`);
    final.add({declaration:{kind:"constructor",name:ctor.name,levelParams:[...decl.levelParams],type:ctor.type,inductive:m.name},assumptions:dependencyAssumptions(final,[ctor.type]),generated:[]});
  }
  for(const rec of restoredRecursors){const sort=kernelWhnf(final,infer(final,[],rec.type));if(sort.tag!=="sort")throw new KernelError(`${rec.name}: restored v59 recursor type is not a type`);final.add({declaration:rec,assumptions:dependencyAssumptions(final,[rec.type]),generated:[]});}
  env.replaceWith(final);
  return{declaration:decl,assumptions:aggregateAssumptions,generated:[...decl.inductives.flatMap(m=>m.constructors.map(c=>c.name)),...publicRecursors]};
}

type MutualNestedV58Path={targetName:string;targetIndices:Term[];layers:NestedV37Layer[]};

/** v58: recognize a parameter-context deep chain ending in an indexed mutual member. */
function nestedDeepMutualChainV58(
  env:Environment,term:Term,members:ReadonlyMap<string,{numIndices:number}>,numParams:number,paramCtx:Context,currentParams:readonly Term[],
):MutualNestedV58Path|undefined{
  const layers:NestedV37Layer[]=[];let current=term;
  while(true){
    const flat=flattenApps(current);
    if(flat.head.tag==="const"&&flat.head.levels.length===0){
      const target=members.get(flat.head.name);
      if(target&&flat.args.length===numParams+target.numIndices){
        if(!flat.args.slice(0,numParams).every((a,i)=>defEq(env,paramCtx,a,currentParams[i])))return undefined;
        return layers.length>=2?{targetName:flat.head.name,targetIndices:[...flat.args.slice(numParams)],layers}:undefined;
      }
    }
    if(flat.head.tag!=="const"||flat.head.levels.length!==0||flat.args.length!==1)return undefined;
    const entry=env.get(flat.head.name);if(!entry||entry.declaration.kind!=="inductive")return undefined;
    const container=entry.declaration;
    if(container.levelParams.length!==0||container.numParams!==1||container.numIndices!==0)return undefined;
    const publicParam=flat.args[0];
    layers.push({containerName:flat.head.name,container,publicParam,publicTerm:current,containerIndices:[],auxName:"",ctorRestore:new Map()});
    current=publicParam;
  }
}

/**
 * v58: compose the v57 deep parameter-aware helper chain with v52 outer mutual indices.
 *
 * Original mutual members retain their own index telescopes.  The selected deep
 * nested target is first projected to the shared-parameter context, so every
 * specialized target index is closed or derived solely from shared parameters.
 * Constructor/index-local capture in the nested target is rejected.  Synthetic
 * deep helpers carry the common parameter prefix but no outer-family indices;
 * the complete enlarged graph is then rechecked by the ordinary trusted mutual
 * checker, which remains authoritative for positivity, index-aware recursors,
 * and linked iota.
 */
function tryCheckMutualNestedDeeperIndicesV58(
  env:Environment,decl:Extract<CoreDeclaration,{kind:"mutualInductive"}>,
):CheckedDeclaration|undefined{
  if(!env.allowMutualNestedDeeperIndices)return undefined;
  if(decl.levelParams.length!==0||decl.inductives.length<2)return undefined;
  const numParams=decl.inductives[0]?.numParams??0;
  if(decl.inductives.some(m=>m.numParams!==numParams)||decl.inductives.every(m=>m.numIndices===0))return undefined;
  const memberNames=new Set(decl.inductives.map(m=>m.name));
  const memberMap=new Map(decl.inductives.map(m=>[m.name,{numIndices:m.numIndices}] as const));
  const first=decl.inductives[0];
  const {ctx:paramCtx,args:currentParams}=mutualSharedParamContextV57(first,numParams);

  // Bounded v58 remains monomorphic and Type-valued.  Universe/Prop composition
  // is intentionally separate from this index-locality milestone.
  for(const m of decl.inductives){
    let tail=m.type;for(let p=0;p<numParams+m.numIndices;p++){if(tail.tag!=="pi")return undefined;tail=tail.body;}
    if(tail.tag!=="sort"||!levelDefEq(tail.level,levelSucc(LevelZero)))return undefined;
  }

  let deep:{memberIndex:number;ctorIndex:number;fieldIndex:number;targetName:string;targetIndices:Term[];layers:NestedV37Layer[];projected:Term}|undefined;
  for(let mi=0;mi<decl.inductives.length;mi++){
    const m=decl.inductives[mi];
    for(let ci=0;ci<m.constructors.length;ci++){
      const ctor=m.constructors[ci],{fields}=splitPi(ctor.type);
      for(let fi=numParams;fi<fields.length;fi++){
        if(!containsAnyConst(fields[fi],memberNames))continue;
        const localCount=fi-numParams;
        const projected=projectNestedIndexToParamContext(fields[fi],localCount);
        if(!projected){
          // A direct mutual recursive field may legitimately carry a varying
          // constructor-local index.  Only nested paths are subject to the
          // shared-parameter projection rule.
          const direct=flattenApps(fields[fi]);
          const target=direct.head.tag==="const"?memberMap.get(direct.head.name):undefined;
          if(target&&direct.head.tag==="const"&&direct.head.levels.length===0&&direct.args.length===numParams+target.numIndices){
            let paramsOk=true;
            for(let pi=0;pi<numParams;pi++){
              const pp=projectNestedIndexToParamContext(direct.args[pi],localCount);
              if(!pp||!defEq(env,paramCtx,pp,currentParams[pi])){paramsOk=false;break;}
            }
            if(paramsOk)continue;
          }
          throw new KernelError(`${ctor.name}: v58 nested mutual target may not capture constructor/index-local values`);
        }
        const path=nestedDeepMutualChainV58(env,projected,memberMap,numParams,paramCtx,currentParams);
        if(!path)continue;
        if(deep)throw new KernelError(`${decl.name}: v58 bounded deeper indexed mutual/nested slice admits exactly one uniform linear deep recursive field`);
        deep={memberIndex:mi,ctorIndex:ci,fieldIndex:fi,targetName:path.targetName,targetIndices:path.targetIndices,layers:path.layers,projected};
      }
    }
  }
  if(!deep)return undefined;

  validateName(decl.name);validateLevelParams(decl);
  for(const m of decl.inductives)if(env.has(m.name))throw new KernelError(`duplicate declaration: ${m.name}`);

  const layers=deep.layers;
  for(let i=0;i<layers.length;i++){
    const layer=layers[i];layer.auxName=`_nestedMutualDeepIdx.${decl.name}.aux${i+1}`;
    if(env.has(layer.auxName)||env.has(`${layer.auxName}.rec`))throw new KernelError(`${decl.name}: internal v58 nested auxiliary name already exists: ${layer.auxName}`);
    const ct=layer.container.type;if(ct.tag!=="pi")throw new KernelError(`${decl.name}: malformed v58 nested container ${layer.containerName}`);
    const paramSort=kernelWhnf(env,ct.domain);
    if(paramSort.tag!=="sort"||!levelDefEq(paramSort.level,levelSucc(LevelZero)))throw new KernelError(`${decl.name}: v58 nested container ${layer.containerName} parameter must live in Type`);
    const result=kernelWhnfIn(env,paramCtx,instantiate(ct.body,layer.publicParam));
    if(result.tag!=="sort"||!levelDefEq(result.level,levelSucc(LevelZero)))throw new KernelError(`${decl.name}: v58 nested container ${layer.containerName} must return Type`);
  }

  // Every recursive field outside the selected deep path must be a direct
  // mutual occurrence with the exact shared parameter tuple. Its target indices
  // may vary with constructor locals; the existing direct-mutual checker will
  // validate them in full context.
  for(let mi=0;mi<decl.inductives.length;mi++)for(let ci=0;ci<decl.inductives[mi].constructors.length;ci++){
    const ctor=decl.inductives[mi].constructors[ci],{fields}=splitPi(ctor.type);
    for(let fi=numParams;fi<fields.length;fi++){
      const field=fields[fi];if(!containsAnyConst(field,memberNames))continue;
      if(mi===deep.memberIndex&&ci===deep.ctorIndex&&fi===deep.fieldIndex)continue;
      const direct=flattenApps(field),target=direct.head.tag==="const"?memberMap.get(direct.head.name):undefined;
      if(!target||direct.head.tag!=="const"||direct.head.levels.length!==0||direct.args.length!==numParams+target.numIndices)
        throw new KernelError(`${ctor.name}: v58 bounded deeper indexed slice admits only direct mutual recursion outside the selected deep path`);
      const localCount=fi-numParams;
      for(let pi=0;pi<numParams;pi++){
        const pp=projectNestedIndexToParamContext(direct.args[pi],localCount);
        if(!pp||!defEq(env,paramCtx,pp,currentParams[pi]))throw new KernelError(`${ctor.name}: v58 direct recursive occurrence must preserve the exact shared mutual parameter tuple`);
      }
    }
  }

  const firstName=first.name,helperNames=layers.map((_,i)=>`${firstName}.rec_${i+1}`);
  for(const h of helperNames)if(env.has(h))throw new KernelError(`${decl.name}: v58 nested helper recursor name already exists: ${h}`);

  const syntheticMembers:Extract<CoreDeclaration,{kind:"mutualInductive"}>["inductives"]=decl.inductives.map((m,mi)=>({
    name:m.name,type:m.type,numParams,numIndices:m.numIndices,
    constructors:m.constructors.map((ctor,ci)=>{
      const {fields,fieldBinderInfo,result}=splitPi(ctor.type);
      const rewritten=fields.map((field,fi)=>{
        if(mi!==deep!.memberIndex||ci!==deep!.ctorIndex||fi!==deep!.fieldIndex)return field;
        const localCount=fi-numParams;
        const shared=Array.from({length:numParams},(_,i)=>({tag:"bvar",index:localCount+numParams-1-i} as Term));
        return mkApps({tag:"const",name:layers[0].auxName,levels:[]},shared);
      });
      return{name:ctor.name,type:rebuildPi(rewritten,fieldBinderInfo,result)};
    }),
  }));

  for(const layer of layers){
    const auxCtors=layer.container.constructors.map((ctor,index)=>{
      if(ctor.type.tag!=="pi")throw new KernelError(`${decl.name}: malformed v58 nested-container constructor ${ctor.name}`);
      const syntheticName=`${layer.auxName}.ctor${index}`;layer.ctorRestore.set(syntheticName,ctor.name);
      const specialized=instantiate(ctor.type.body,layer.publicParam);
      const rewritten=rewriteNestedDeepV39(specialized,layers,numParams);
      return{name:syntheticName,type:prependPiTelescope(first.type,numParams,rewritten)};
    });
    const ct=layer.container.type;if(ct.tag!=="pi")throw new KernelError(`${decl.name}: malformed v58 nested-container type ${layer.containerName}`);
    const auxTail=instantiate(ct.body,layer.publicParam);
    syntheticMembers.push({name:layer.auxName,type:prependPiTelescope(first.type,numParams,auxTail),numParams,numIndices:0,constructors:auxCtors});
  }

  const synthetic:Extract<CoreDeclaration,{kind:"mutualInductive"}>={kind:"mutualInductive",name:`_nestedMutualDeepIdx.${decl.name}.block`,levelParams:[],inductives:syntheticMembers};
  const transformed=env.clone();checkDirectMutualInductive(transformed,synthetic);
  const syntheticNames=syntheticMembers.map(m=>m.name),publicRecursors=[...decl.inductives.map(m=>`${m.name}.rec`),...helperNames];
  const targetRecursor=new Map(syntheticNames.map((n,i)=>[n,publicRecursors[i]] as const)),originalCount=decl.inductives.length;
  const restoredRecursors:Extract<EnvironmentDeclaration,{kind:"recursor"}>[]=syntheticNames.map((name,ri)=>{
    const e=transformed.get(`${name}.rec`);if(!e||e.declaration.kind!=="recursor")throw new KernelError(`${decl.name}: internal v58 mutual/nested preprocessing did not generate recursor for ${name}`);
    const helper=ri>=originalCount,layer=helper?layers[ri-originalCount]:undefined;
    const rules=e.declaration.metadata.rules.map(rule=>({...rule,
      ctor:helper?(layer!.ctorRestore.get(rule.ctor)??rule.ctor):rule.ctor,
      recursiveFieldTypes:rule.recursiveFieldTypes?.map(t=>t?restoreNestedDeepV39(t,layers,numParams):null),
      recursiveTargets:rule.recursiveTargets?.map(()=>null),
      recursiveRecursors:rule.recursiveTargets?.map(target=>target?targetRecursor.get(target)??null:null),
      ...(helper?{ctorParamCount:1}:{}),
    }));
    return{kind:"recursor",name:publicRecursors[ri],levelParams:[...e.declaration.levelParams],type:restoreNestedDeepV39(e.declaration.type,layers,numParams),metadata:{...e.declaration.metadata,inductive:helper?firstName:name,rules,mutual:{inductives:syntheticNames,motiveCount:syntheticNames.length,recursors:publicRecursors,indexCounts:syntheticMembers.map(m=>m.numIndices)}}};
  });

  const final=env.clone(),aggregateAssumptions=new Set<string>();
  for(let mi=0;mi<decl.inductives.length;mi++){
    const m=decl.inductives[mi],as=dependencyAssumptions(transformed,[m.type,...m.constructors.map(c=>c.type)]);for(const a of as)aggregateAssumptions.add(a);
    final.add({declaration:{kind:"inductive",name:m.name,levelParams:[],type:m.type,numParams,numIndices:m.numIndices,constructors:m.constructors},assumptions:as,generated:[...m.constructors.map(c=>c.name),`${m.name}.rec`,...(mi===0?helperNames:[])]});
  }
  for(const m of decl.inductives)for(const ctor of m.constructors){
    const sort=kernelWhnf(final,infer(final,[],ctor.type));if(sort.tag!=="sort")throw new KernelError(`${ctor.name}: restored v58 constructor type is not a type`);
    final.add({declaration:{kind:"constructor",name:ctor.name,levelParams:[],type:ctor.type,inductive:m.name},assumptions:dependencyAssumptions(final,[ctor.type]),generated:[]});
  }
  for(const rec of restoredRecursors){
    const sort=kernelWhnf(final,infer(final,[],rec.type));if(sort.tag!=="sort")throw new KernelError(`${rec.name}: restored v58 recursor type is not a type`);
    final.add({declaration:rec,assumptions:dependencyAssumptions(final,[rec.type]),generated:[]});
  }
  env.replaceWith(final);
  return{declaration:decl,assumptions:aggregateAssumptions,generated:[...decl.inductives.flatMap(m=>m.constructors.map(c=>c.name)),...publicRecursors]};
}

type MutualNestedV57Path={targetName:string;layers:NestedV37Layer[]};

/** Build the shared parameter context for a mutual member. */
function mutualSharedParamContextV57(
  member:Extract<CoreDeclaration,{kind:"mutualInductive"}>["inductives"][number],numParams:number,
):{ctx:Context;args:Term[]} {
  const ctx:Context=[];let tail=member.type;
  for(let pi=0;pi<numParams;pi++){
    if(tail.tag!=="pi")throw new KernelError(`${member.name}: v57 shared parameter telescope shorter than numParams`);
    ctx.unshift(tail.domain);tail=tail.body;
  }
  return{ctx,args:Array.from({length:numParams},(_,i)=>({tag:"bvar",index:numParams-1-i} as Term))};
}

/** v57: recognize a parameter-context deep chain ending in a mutual member at the exact shared parameter tuple. */
function nestedDeepMutualChainV57(
  env:Environment,term:Term,memberNames:ReadonlySet<string>,numParams:number,paramCtx:Context,currentParams:readonly Term[],
):MutualNestedV57Path|undefined{
  const layers:NestedV37Layer[]=[];let current=term;
  while(true){
    const flat=flattenApps(current);
    if(flat.head.tag==="const"&&flat.head.levels.length===0&&memberNames.has(flat.head.name)&&flat.args.length===numParams){
      if(!flat.args.every((a,i)=>defEq(env,paramCtx,a,currentParams[i])))return undefined;
      return layers.length>=2?{targetName:flat.head.name,layers}:undefined;
    }
    if(flat.head.tag!=="const"||flat.head.levels.length!==0||flat.args.length!==1)return undefined;
    const entry=env.get(flat.head.name);if(!entry||entry.declaration.kind!=="inductive")return undefined;
    const container=entry.declaration;
    if(container.levelParams.length!==0||container.numParams!==1||container.numIndices!==0)return undefined;
    const publicParam=flat.args[0];
    layers.push({containerName:flat.head.name,container,publicParam,publicTerm:current,containerIndices:[],auxName:"",ctorRestore:new Map()});
    current=publicParam;
  }
}

/**
 * v57: shared/dependent uniform parameters for the arbitrary-depth v56 mutual/nested graph.
 *
 * The selected deep field is first projected out of constructor-local context into
 * the common mutual-parameter context.  This rejects local capture before any
 * helper is synthesized.  Every helper then carries exactly the same shared
 * parameter telescope as the original mutual members.  Parameter uniformity,
 * positivity, recursor generation, and linked iota are revalidated by the
 * existing trusted direct-mutual checker over the complete synthetic graph.
 */
function tryCheckMutualNestedDeeperParametersV57(
  env:Environment,decl:Extract<CoreDeclaration,{kind:"mutualInductive"}>,
):CheckedDeclaration|undefined{
  if(!env.allowMutualNestedDeeperParameters)return undefined;
  if(decl.levelParams.length!==0||decl.inductives.length<2)return undefined;
  const numParams=decl.inductives[0]?.numParams??0;
  if(numParams<=0||decl.inductives.some(m=>m.numParams!==numParams||m.numIndices!==0))return undefined;
  const memberNames=new Set(decl.inductives.map(m=>m.name));
  const first=decl.inductives[0];
  const {ctx:paramCtx,args:currentParams}=mutualSharedParamContextV57(first,numParams);

  // Bounded v57 remains Type-valued; Prop/deep composition is a later slice.
  for(const m of decl.inductives){
    let tail=m.type;for(let p=0;p<numParams;p++){if(tail.tag!=="pi")return undefined;tail=tail.body;}
    if(tail.tag!=="sort"||!levelDefEq(tail.level,levelSucc(LevelZero)))return undefined;
  }

  let deep:{memberIndex:number;ctorIndex:number;fieldIndex:number;targetName:string;layers:NestedV37Layer[];projected:Term}|undefined;
  for(let mi=0;mi<decl.inductives.length;mi++){
    const m=decl.inductives[mi];
    for(let ci=0;ci<m.constructors.length;ci++){
      const {fields}=splitPi(m.constructors[ci].type);
      for(let fi=numParams;fi<fields.length;fi++){
        if(!containsAnyConst(fields[fi],memberNames))continue;
        const localCount=fi-numParams;
        const projected=projectNestedIndexToParamContext(fields[fi],localCount);
        if(!projected)throw new KernelError(`${m.constructors[ci].name}: v57 recursive field depends on a constructor-local value`);
        const path=nestedDeepMutualChainV57(env,projected,memberNames,numParams,paramCtx,currentParams);
        if(!path)continue;
        if(deep)throw new KernelError(`${decl.name}: v57 bounded parameterized deeper mutual/nested slice admits exactly one uniform linear deep recursive field`);
        deep={memberIndex:mi,ctorIndex:ci,fieldIndex:fi,targetName:path.targetName,layers:path.layers,projected};
      }
    }
  }
  if(!deep)return undefined;

  validateName(decl.name);validateLevelParams(decl);
  for(const m of decl.inductives)if(env.has(m.name))throw new KernelError(`duplicate declaration: ${m.name}`);

  const layers=deep.layers;
  for(let i=0;i<layers.length;i++){
    const layer=layers[i];layer.auxName=`_nestedMutualDeepParams.${decl.name}.aux${i+1}`;
    if(env.has(layer.auxName)||env.has(`${layer.auxName}.rec`))throw new KernelError(`${decl.name}: internal v57 nested auxiliary name already exists: ${layer.auxName}`);
    const ct=layer.container.type;
    if(ct.tag!=="pi")throw new KernelError(`${decl.name}: malformed v57 nested container ${layer.containerName}`);
    const paramSort=kernelWhnf(env,ct.domain);
    if(paramSort.tag!=="sort"||!levelDefEq(paramSort.level,levelSucc(LevelZero)))throw new KernelError(`${decl.name}: v57 nested container ${layer.containerName} parameter must live in Type`);
    const result=kernelWhnfIn(env,paramCtx,instantiate(ct.body,layer.publicParam));
    if(result.tag!=="sort"||!levelDefEq(result.level,levelSucc(LevelZero)))throw new KernelError(`${decl.name}: v57 nested container ${layer.containerName} must return Type`);
  }

  // All other recursive fields must project to an exact mutual member at the
  // shared parameter tuple.  This rejects constructor-local parameter capture
  // and non-uniform recursive specializations.
  for(let mi=0;mi<decl.inductives.length;mi++)for(let ci=0;ci<decl.inductives[mi].constructors.length;ci++){
    const ctor=decl.inductives[mi].constructors[ci],{fields}=splitPi(ctor.type);
    for(let fi=numParams;fi<fields.length;fi++){
      const field=fields[fi];if(!containsAnyConst(field,memberNames))continue;
      if(mi===deep.memberIndex&&ci===deep.ctorIndex&&fi===deep.fieldIndex)continue;
      const projected=projectNestedIndexToParamContext(field,fi-numParams);
      if(!projected)throw new KernelError(`${ctor.name}: v57 recursive field depends on a constructor-local value`);
      const direct=flattenApps(projected);
      if(direct.head.tag==="const"&&direct.head.levels.length===0&&memberNames.has(direct.head.name)&&direct.args.length===numParams&&direct.args.every((a,i)=>defEq(env,paramCtx,a,currentParams[i])))continue;
      throw new KernelError(`${ctor.name}: v57 recursive occurrence must preserve the exact shared mutual parameter tuple`);
    }
  }

  const firstName=first.name,helperNames=layers.map((_,i)=>`${firstName}.rec_${i+1}`);
  for(const h of helperNames)if(env.has(h))throw new KernelError(`${decl.name}: v57 nested helper recursor name already exists: ${h}`);

  const syntheticMembers:Extract<CoreDeclaration,{kind:"mutualInductive"}>["inductives"]=decl.inductives.map((m,mi)=>({
    name:m.name,type:m.type,numParams,numIndices:0,
    constructors:m.constructors.map((ctor,ci)=>{
      const {fields,fieldBinderInfo,result}=splitPi(ctor.type);
      const rewritten=fields.map((field,fi)=>{
        if(mi!==deep!.memberIndex||ci!==deep!.ctorIndex||fi!==deep!.fieldIndex)return field;
        const localCount=fi-numParams;
        const shared=Array.from({length:numParams},(_,i)=>({tag:"bvar",index:localCount+numParams-1-i} as Term));
        return mkApps({tag:"const",name:layers[0].auxName,levels:[]},shared);
      });
      return{name:ctor.name,type:rebuildPi(rewritten,fieldBinderInfo,result)};
    }),
  }));

  for(const layer of layers){
    const auxCtors=layer.container.constructors.map((ctor,index)=>{
      if(ctor.type.tag!=="pi")throw new KernelError(`${decl.name}: malformed v57 nested-container constructor ${ctor.name}`);
      const syntheticName=`${layer.auxName}.ctor${index}`;layer.ctorRestore.set(syntheticName,ctor.name);
      const specialized=instantiate(ctor.type.body,layer.publicParam);
      const rewritten=rewriteNestedDeepV39(specialized,layers,numParams);
      return{name:syntheticName,type:prependPiTelescope(first.type,numParams,rewritten)};
    });
    const ct=layer.container.type;if(ct.tag!=="pi")throw new KernelError(`${decl.name}: malformed v57 nested-container type ${layer.containerName}`);
    const auxTail=instantiate(ct.body,layer.publicParam);
    syntheticMembers.push({name:layer.auxName,type:prependPiTelescope(first.type,numParams,auxTail),numParams,numIndices:0,constructors:auxCtors});
  }

  const synthetic:Extract<CoreDeclaration,{kind:"mutualInductive"}>={kind:"mutualInductive",name:`_nestedMutualDeepParams.${decl.name}.block`,levelParams:[],inductives:syntheticMembers};
  const transformed=env.clone();checkDirectMutualInductive(transformed,synthetic);
  const syntheticNames=syntheticMembers.map(m=>m.name),publicRecursors=[...decl.inductives.map(m=>`${m.name}.rec`),...helperNames];
  const targetRecursor=new Map(syntheticNames.map((n,i)=>[n,publicRecursors[i]] as const)),originalCount=decl.inductives.length;
  const restoredRecursors:Extract<EnvironmentDeclaration,{kind:"recursor"}>[]=syntheticNames.map((name,ri)=>{
    const e=transformed.get(`${name}.rec`);if(!e||e.declaration.kind!=="recursor")throw new KernelError(`${decl.name}: internal v57 mutual/nested preprocessing did not generate recursor for ${name}`);
    const helper=ri>=originalCount,layer=helper?layers[ri-originalCount]:undefined;
    const rules=e.declaration.metadata.rules.map(rule=>({...rule,
      ctor:helper?(layer!.ctorRestore.get(rule.ctor)??rule.ctor):rule.ctor,
      recursiveFieldTypes:rule.recursiveFieldTypes?.map(t=>t?restoreNestedDeepV39(t,layers,numParams):null),
      recursiveTargets:rule.recursiveTargets?.map(()=>null),
      recursiveRecursors:rule.recursiveTargets?.map(target=>target?targetRecursor.get(target)??null:null),
      ...(helper?{ctorParamCount:1}:{}),
    }));
    return{kind:"recursor",name:publicRecursors[ri],levelParams:[...e.declaration.levelParams],type:restoreNestedDeepV39(e.declaration.type,layers,numParams),metadata:{...e.declaration.metadata,inductive:helper?firstName:name,rules,mutual:{inductives:syntheticNames,motiveCount:syntheticNames.length,recursors:publicRecursors,indexCounts:syntheticNames.map(()=>0)}}};
  });

  const final=env.clone(),aggregateAssumptions=new Set<string>();
  for(let mi=0;mi<decl.inductives.length;mi++){
    const m=decl.inductives[mi],as=dependencyAssumptions(transformed,[m.type,...m.constructors.map(c=>c.type)]);for(const a of as)aggregateAssumptions.add(a);
    final.add({declaration:{kind:"inductive",name:m.name,levelParams:[],type:m.type,numParams,numIndices:0,constructors:m.constructors},assumptions:as,generated:[...m.constructors.map(c=>c.name),`${m.name}.rec`,...(mi===0?helperNames:[])]});
  }
  for(const m of decl.inductives)for(const ctor of m.constructors){
    const sort=kernelWhnf(final,infer(final,[],ctor.type));if(sort.tag!=="sort")throw new KernelError(`${ctor.name}: restored v57 constructor type is not a type`);
    final.add({declaration:{kind:"constructor",name:ctor.name,levelParams:[],type:ctor.type,inductive:m.name},assumptions:dependencyAssumptions(final,[ctor.type]),generated:[]});
  }
  for(const rec of restoredRecursors){
    const sort=kernelWhnf(final,infer(final,[],rec.type));if(sort.tag!=="sort")throw new KernelError(`${rec.name}: restored v57 recursor type is not a type`);
    final.add({declaration:rec,assumptions:dependencyAssumptions(final,[rec.type]),generated:[]});
  }
  env.replaceWith(final);
  return{declaration:decl,assumptions:aggregateAssumptions,generated:[...decl.inductives.flatMap(m=>m.constructors.map(c=>c.name)),...publicRecursors]};
}

type MutualNestedV56Path={targetName:string;layers:NestedV37Layer[]};

/** v56: recognize a closed linear chain F1(F2(...(MutualMember))) of depth >= 2. */
function nestedDeepMutualChainV56(env:Environment,term:Term,memberNames:ReadonlySet<string>):MutualNestedV56Path|undefined{
  if(containsLooseBVar(term))return undefined;
  const layers:NestedV37Layer[]=[];
  let current=term;
  while(true){
    const flat=flattenApps(current);
    if(flat.head.tag==="const"&&flat.head.levels.length===0&&flat.args.length===0&&memberNames.has(flat.head.name))
      return layers.length>=2?{targetName:flat.head.name,layers}:undefined;
    if(flat.head.tag!=="const"||flat.head.levels.length!==0||flat.args.length!==1)return undefined;
    const entry=env.get(flat.head.name);if(!entry||entry.declaration.kind!=="inductive")return undefined;
    const container=entry.declaration;
    if(container.levelParams.length!==0||container.numParams!==1||container.numIndices!==0)return undefined;
    const publicParam=flat.args[0];
    layers.push({containerName:flat.head.name,container,publicParam,publicTerm:current,containerIndices:[],auxName:"",ctorRestore:new Map()});
    current=publicParam;
  }
}

/**
 * v56: bounded arbitrary-depth linear mutual+nested preprocessing.
 *
 * Trusted slice:
 * - monomorphic mutual block with >=2 members, zero parameters and zero indices;
 * - every member lives in the same `Type` (Sort 1) or `Prop` (Sort 0);
 * - exactly one recursive constructor field is a closed linear nested path of
 *   depth >=2 through already checked monomorphic one-parameter/indexless
 *   containers whose parameter/result universe equals the mutual result;
 * - other recursive fields must be direct zero-argument mutual-member fields.
 *
 * Helper order is outermost-to-innermost, matching Lean 4.33.1: original
 * mutual motives first, then one motive/helper recursor for every public nested
 * specialization in path order. The complete synthetic block is rechecked by
 * the existing trusted direct-mutual checker, including strict positivity and
 * the shared Prop-only elimination policy when the block lives in Prop.
 */
function tryCheckMutualNestedDeeperV56(
  env:Environment,
  decl:Extract<CoreDeclaration,{kind:"mutualInductive"}>,
):CheckedDeclaration|undefined{
  if(!env.allowMutualNestedDeeper)return undefined;
  if(decl.levelParams.length!==0||decl.inductives.length<2)return undefined;
  if(decl.inductives.some(m=>m.numParams!==0||m.numIndices!==0))return undefined;
  const memberNames=new Set(decl.inductives.map(m=>m.name));

  let resultLevel:Level|undefined;
  for(const m of decl.inductives){
    if(m.type.tag!=="sort")return undefined;
    if(!resultLevel)resultLevel=m.type.level;
    else if(!levelDefEq(resultLevel,m.type.level))return undefined;
  }
  if(!resultLevel||(!levelDefEq(resultLevel,LevelZero)&&!levelDefEq(resultLevel,levelSucc(LevelZero))))return undefined;

  let deep:{memberIndex:number;ctorIndex:number;fieldIndex:number;targetName:string;layers:NestedV37Layer[]}|undefined;
  for(let mi=0;mi<decl.inductives.length;mi++){
    const m=decl.inductives[mi];
    for(let ci=0;ci<m.constructors.length;ci++){
      const {fields}=splitPi(m.constructors[ci].type);
      for(let fi=0;fi<fields.length;fi++){
        if(!containsAnyConst(fields[fi],memberNames))continue;
        const path=nestedDeepMutualChainV56(env,fields[fi],memberNames);
        if(!path)continue;
        if(deep)throw new KernelError(`${decl.name}: v56 bounded deeper mutual/nested slice admits exactly one closed linear nested recursive field`);
        deep={memberIndex:mi,ctorIndex:ci,fieldIndex:fi,targetName:path.targetName,layers:path.layers};
      }
    }
  }
  if(!deep)return undefined;

  validateName(decl.name);validateLevelParams(decl);
  for(const m of decl.inductives){if(env.has(m.name))throw new KernelError(`duplicate declaration: ${m.name}`);}

  // Validate every public container in the chain against the common result sort.
  const layers=deep.layers;
  for(let i=0;i<layers.length;i++){
    const layer=layers[i];
    const ct=layer.container.type;
    if(ct.tag!=="pi")throw new KernelError(`${decl.name}: malformed v56 nested container ${layer.containerName}`);
    const paramSort=kernelWhnf(env,ct.domain),tail=kernelWhnf(env,instantiate(ct.body,layer.publicParam));
    if(paramSort.tag!=="sort"||!levelDefEq(paramSort.level,resultLevel)||tail.tag!=="sort"||!levelDefEq(tail.level,resultLevel))
      throw new KernelError(`${decl.name}: v56 nested container ${layer.containerName} must map the mutual block result sort to itself`);
    layer.auxName=`_nestedMutualDeep.${decl.name}.aux${i+1}`;
    if(env.has(layer.auxName)||env.has(`${layer.auxName}.rec`))throw new KernelError(`${decl.name}: internal v56 nested auxiliary name already exists: ${layer.auxName}`);
  }

  // Recursive occurrences outside the selected deep path remain direct mutual recursion.
  for(let mi=0;mi<decl.inductives.length;mi++)for(let ci=0;ci<decl.inductives[mi].constructors.length;ci++){
    const ctor=decl.inductives[mi].constructors[ci],{fields}=splitPi(ctor.type);
    for(let fi=0;fi<fields.length;fi++){
      const field=fields[fi];if(!containsAnyConst(field,memberNames))continue;
      if(mi===deep.memberIndex&&ci===deep.ctorIndex&&fi===deep.fieldIndex)continue;
      const direct=flattenApps(field);
      if(direct.head.tag==="const"&&direct.head.levels.length===0&&direct.args.length===0&&memberNames.has(direct.head.name))continue;
      throw new KernelError(`${ctor.name}: v56 bounded deeper mutual/nested slice only admits direct mutual recursion plus one closed linear deep nested field`);
    }
  }

  const firstName=decl.inductives[0].name;
  const helperNames=layers.map((_,i)=>`${firstName}.rec_${i+1}`);
  for(const h of helperNames)if(env.has(h))throw new KernelError(`${decl.name}: v56 nested helper recursor name already exists: ${h}`);

  const syntheticMembers:Extract<CoreDeclaration,{kind:"mutualInductive"}>["inductives"]=decl.inductives.map((m,mi)=>({
    name:m.name,type:m.type,numParams:0,numIndices:0,
    constructors:m.constructors.map((ctor,ci)=>{
      const {fields,fieldBinderInfo,result}=splitPi(ctor.type);
      const rewritten=fields.map((field,fi)=>mi===deep!.memberIndex&&ci===deep!.ctorIndex&&fi===deep!.fieldIndex
        ?({tag:"const",name:layers[0].auxName,levels:[]} as Term):field);
      return{name:ctor.name,type:rebuildPi(rewritten,fieldBinderInfo,result)};
    }),
  }));

  for(const layer of layers){
    const auxCtors=layer.container.constructors.map((ctor,index)=>{
      if(ctor.type.tag!=="pi")throw new KernelError(`${decl.name}: malformed v56 nested-container constructor ${ctor.name}`);
      const syntheticName=`${layer.auxName}.ctor${index}`;layer.ctorRestore.set(syntheticName,ctor.name);
      const specialized=instantiate(ctor.type.body,layer.publicParam);
      return{name:syntheticName,type:rewriteNestedDeepV37(specialized,layers)};
    });
    const ct=layer.container.type;if(ct.tag!=="pi")throw new KernelError(`${decl.name}: malformed v56 nested-container type ${layer.containerName}`);
    syntheticMembers.push({name:layer.auxName,type:instantiate(ct.body,layer.publicParam),numParams:0,numIndices:0,constructors:auxCtors});
  }

  const synthetic:Extract<CoreDeclaration,{kind:"mutualInductive"}>={kind:"mutualInductive",name:`_nestedMutualDeep.${decl.name}.block`,levelParams:[],inductives:syntheticMembers};
  const transformed=env.clone();checkDirectMutualInductive(transformed,synthetic);
  const syntheticNames=syntheticMembers.map(m=>m.name),publicRecursors=[...decl.inductives.map(m=>`${m.name}.rec`),...helperNames];
  const targetRecursor=new Map(syntheticNames.map((n,i)=>[n,publicRecursors[i]] as const)),originalCount=decl.inductives.length;
  const restoredRecursors:Extract<EnvironmentDeclaration,{kind:"recursor"}>[]=syntheticNames.map((name,ri)=>{
    const e=transformed.get(`${name}.rec`);if(!e||e.declaration.kind!=="recursor")throw new KernelError(`${decl.name}: internal v56 mutual/nested preprocessing did not generate recursor for ${name}`);
    const helper=ri>=originalCount,layer=helper?layers[ri-originalCount]:undefined;
    const rules=e.declaration.metadata.rules.map(rule=>({...rule,
      ctor:helper?(layer!.ctorRestore.get(rule.ctor)??rule.ctor):rule.ctor,
      recursiveFieldTypes:rule.recursiveFieldTypes?.map(t=>t?restoreNestedDeepV37(t,layers):null),
      recursiveTargets:rule.recursiveTargets?.map(()=>null),
      recursiveRecursors:rule.recursiveTargets?.map(target=>target?targetRecursor.get(target)??null:null),
      ...(helper?{ctorParamCount:1}:{}),
    }));
    return{kind:"recursor",name:publicRecursors[ri],levelParams:[...e.declaration.levelParams],type:restoreNestedDeepV37(e.declaration.type,layers),metadata:{...e.declaration.metadata,inductive:helper?firstName:name,rules,mutual:{inductives:syntheticNames,motiveCount:syntheticNames.length,recursors:publicRecursors,indexCounts:syntheticNames.map(()=>0)}}};
  });

  const final=env.clone(),aggregateAssumptions=new Set<string>();
  for(let mi=0;mi<decl.inductives.length;mi++){
    const m=decl.inductives[mi],as=dependencyAssumptions(transformed,[m.type,...m.constructors.map(c=>c.type)]);for(const a of as)aggregateAssumptions.add(a);
    final.add({declaration:{kind:"inductive",name:m.name,levelParams:[],type:m.type,numParams:0,numIndices:0,constructors:m.constructors},assumptions:as,generated:[...m.constructors.map(c=>c.name),`${m.name}.rec`,...(mi===0?helperNames:[])]});
  }
  for(const m of decl.inductives)for(const ctor of m.constructors){
    const sort=kernelWhnf(final,infer(final,[],ctor.type));if(sort.tag!=="sort")throw new KernelError(`${ctor.name}: restored v56 constructor type is not a type`);
    final.add({declaration:{kind:"constructor",name:ctor.name,levelParams:[],type:ctor.type,inductive:m.name},assumptions:dependencyAssumptions(final,[ctor.type]),generated:[]});
  }
  for(const rec of restoredRecursors){
    const sort=kernelWhnf(final,infer(final,[],rec.type));if(sort.tag!=="sort")throw new KernelError(`${rec.name}: restored v56 recursor type is not a type`);
    final.add({declaration:rec,assumptions:dependencyAssumptions(final,[rec.type]),generated:[]});
  }
  env.replaceWith(final);
  return{declaration:decl,assumptions:aggregateAssumptions,generated:[...decl.inductives.flatMap(m=>m.constructors.map(c=>c.name)),...publicRecursors]};
}

type MutualNestedV55Occurrence={
  ctorIndex:number;fieldIndex:number;containerName:string;containerLevels:Level[];targetName:string;
  container:Extract<CoreDeclaration,{kind:"inductive"}>;targetArgs:Term[];targetIndexCount:number;containerIndices:Term[];projectedIndices:Term[];specIndex?:number;
};
type MutualNestedV55Spec={
  containerName:string;containerLevels:Level[];targetName:string;targetIndexCount:number;container:Extract<CoreDeclaration,{kind:"inductive"}>;
  fixedIndices:Term[];auxName:string;ctorRestore:Map<string,string>;
};

/** v55: recognize `IndexedContainer.{ls} (MutualMember.{us} params... indices...) containerIndices...`. */
function parseMutualNestedV55Occurrence(
  env:Environment,term:Term,members:ReadonlyMap<string,{numIndices:number}>,numParams:number,selfLevels:readonly Level[],
):{containerName:string;containerLevels:Level[];targetName:string;container:Extract<CoreDeclaration,{kind:"inductive"}>;targetArgs:Term[];targetIndexCount:number;containerIndices:Term[]}|undefined{
  const flat=flattenApps(term);
  if(flat.head.tag!=="const")return undefined;
  const entry=env.get(flat.head.name);if(!entry||entry.declaration.kind!=="inductive")return undefined;
  const container=entry.declaration;
  if(container.numParams!==1||container.numIndices<=0||flat.args.length!==1+container.numIndices)return undefined;
  const inner=flattenApps(flat.args[0]);
  if(inner.head.tag!=="const"||!levelsDefEq(inner.head.levels,selfLevels))return undefined;
  const target=members.get(inner.head.name);if(!target||inner.args.length!==numParams+target.numIndices)return undefined;
  return{containerName:flat.head.name,containerLevels:[...flat.head.levels],targetName:inner.head.name,container,targetArgs:[...inner.args],targetIndexCount:target.numIndices,containerIndices:flat.args.slice(1)};
}

function restoreMutualNestedV55(term:Term,specs:readonly MutualNestedV55Spec[],numParams:number,selfLevels:readonly Level[]):Term{
  let out=term;
  for(const sp of specs){
    const mode:NestedIndexMode={kind:"closed",sharedParamCount:numParams,outerIndexCount:sp.targetIndexCount,fixedIndices:sp.fixedIndices};
    out=restoreNestedAuxTermIndexedPoly(out,sp.auxName,selfLevels,sp.containerName,sp.containerLevels,sp.targetName,selfLevels,mode,sp.ctorRestore,sp.container.numIndices);
  }
  return out;
}

/**
 * v55: indexed nested containers inside the bounded one-level mutual/nested graph.
 *
 * This generalizes v53/v54 only in the container dimension: the recursive mutual
 * target specialization remains fixed in the shared parameter context, while the
 * already-admitted nested container may retain its own index telescope.  The
 * helper family therefore has the shared mutual parameters plus exactly the
 * container's own indices.  Container index expressions may mention constructor
 * locals because they remain ordinary helper indices; target indices still may
 * not capture such locals.  Container index *domains* must remain independent of
 * the recursive target in this bounded milestone.
 */
function tryCheckMutualNestedIndexedContainersV55(
  env:Environment,decl:Extract<CoreDeclaration,{kind:"mutualInductive"}>,
):CheckedDeclaration|undefined{
  if(!env.allowMutualNestedIndexedContainers||decl.inductives.length<2)return undefined;
  validateLevelParams(decl);
  const selfLevels=decl.levelParams.map(name=>({tag:"param",name} as Level));
  const numParams=decl.inductives[0]?.numParams??0;
  if(decl.inductives.some(m=>m.numParams!==numParams))return undefined;
  const memberMap=new Map(decl.inductives.map(m=>[m.name,{numIndices:m.numIndices}] as const));

  let resultLevel:Level|undefined;
  for(const m of decl.inductives){
    let tail=m.type;
    for(let i=0;i<numParams+m.numIndices;i++){if(tail.tag!=="pi")return undefined;tail=tail.body;}
    if(tail.tag!=="sort"||!(normalizesToZero(tail.level)||isNeverZero(tail.level)))return undefined;
    if(resultLevel===undefined)resultLevel=tail.level;else if(!levelDefEq(resultLevel,tail.level))return undefined;
  }
  if(resultLevel===undefined)return undefined;

  const paramCtx:Context=[];let firstTail=decl.inductives[0].type;
  for(let pi=0;pi<numParams;pi++){if(firstTail.tag!=="pi")return undefined;paramCtx.unshift(firstTail.domain);firstTail=firstTail.body;}

  const occurrences:MutualNestedV55Occurrence[]=[];
  for(const m of decl.inductives){
    for(let ci=0;ci<m.constructors.length;ci++){
      const ctor=m.constructors[ci],{fields}=splitPi(ctor.type);
      for(let fi=numParams;fi<fields.length;fi++){
        const parsed=parseMutualNestedV55Occurrence(env,fields[fi],memberMap,numParams,selfLevels);if(!parsed)continue;
        const projected:Term[]=[];const localCount=fi-numParams;
        for(const idx of parsed.targetArgs.slice(numParams)){
          const p=projectNestedIndexToParamContext(idx,localCount);
          if(!p)throw new KernelError(`${ctor.name}: v55 nested mutual target indices may depend only on shared mutual parameters, not constructor/index-local variables`);
          projected.push(p);
        }
        occurrences.push({ctorIndex:ci,fieldIndex:fi,...parsed,projectedIndices:projected});
      }
    }
  }
  if(occurrences.length===0)return undefined;

  const specs:MutualNestedV55Spec[]=[];
  for(const occ of occurrences){
    let found=-1;
    for(let si=0;si<specs.length;si++){
      const sp=specs[si];
      if(sp.containerName!==occ.containerName||!levelsDefEq(sp.containerLevels,occ.containerLevels)||sp.targetName!==occ.targetName||sp.fixedIndices.length!==occ.projectedIndices.length)continue;
      if(occ.projectedIndices.every((x,i)=>defEq(env,paramCtx,x,sp.fixedIndices[i]))){found=si;break;}
    }
    if(found<0){
      const container=occ.container;
      if(container.numParams!==1||container.numIndices<=0)throw new KernelError(`${decl.name}: v55 nested container ${container.name} must have exactly one parameter and at least one index`);
      if(container.levelParams.length!==occ.containerLevels.length)throw new KernelError(`${decl.name}: v55 nested container ${container.name} has incompatible universe arity`);
      const instantiatedContainerType=instantiateTermLevels(container.type,container.levelParams,occ.containerLevels);
      if(instantiatedContainerType.tag!=="pi")throw new KernelError(`${decl.name}: malformed v55 nested container ${container.name}`);
      const paramSort=kernelWhnf(env,instantiatedContainerType.domain);
      if(paramSort.tag!=="sort"||!levelDefEq(paramSort.level,resultLevel))throw new KernelError(`${decl.name}: v55 nested container ${container.name} parameter universe must match the mutual block result universe`);
      let auxName=`_nestedMutualIndexedContainer.${decl.name}.aux${specs.length+1}`;for(let n=0;env.has(auxName)||env.has(`${auxName}.rec`);n++)auxName=`_nestedMutualIndexedContainer.${decl.name}.aux${specs.length+1}_${n+1}`;
      specs.push({containerName:occ.containerName,containerLevels:[...occ.containerLevels],targetName:occ.targetName,targetIndexCount:occ.targetIndexCount,container,fixedIndices:[...occ.projectedIndices],auxName,ctorRestore:new Map()});
      found=specs.length-1;
    }
    occ.specIndex=found;
  }

  const firstName=decl.inductives[0].name,helperNames=specs.map((_,i)=>`${firstName}.rec_${i+1}`);
  for(const h of helperNames)if(env.has(h))throw new KernelError(`${decl.name}: v55 nested helper recursor name already exists: ${h}`);
  const occurrenceAt=new Map<string,MutualNestedV55Occurrence>();for(const occ of occurrences)occurrenceAt.set(`${occ.ctorIndex}:${occ.fieldIndex}`,occ);

  const syntheticMembers:Extract<CoreDeclaration,{kind:"mutualInductive"}>["inductives"]=decl.inductives.map(m=>({
    name:m.name,type:m.type,numParams,numIndices:m.numIndices,
    constructors:m.constructors.map((ctor,ci)=>{
      const {fields,fieldBinderInfo,result}=splitPi(ctor.type);
      const rewritten=fields.map((field,fi)=>{
        const occ=occurrenceAt.get(`${ci}:${fi}`);if(!occ)return field;
        const sp=specs[occ.specIndex!];
        return mkApps({tag:"const",name:sp.auxName,levels:[...selfLevels]},[...occ.targetArgs.slice(0,numParams),...occ.containerIndices]);
      });
      return{name:ctor.name,type:rebuildPi(rewritten,fieldBinderInfo,result)};
    }),
  }));

  const sharedArgs=Array.from({length:numParams},(_,p)=>({tag:"bvar",index:numParams-1-p} as Term));
  for(const sp of specs){
    const mode:NestedIndexMode={kind:"closed",sharedParamCount:numParams,outerIndexCount:sp.targetIndexCount,fixedIndices:sp.fixedIndices};
    const target=mkApps({tag:"const",name:sp.targetName,levels:[...selfLevels]},[...sharedArgs,...sp.fixedIndices.map(t=>instantiateNestedParamContext(t,sharedArgs))]);
    const instantiatedContainerType=instantiateTermLevels(sp.container.type,sp.container.levelParams,sp.containerLevels);
    if(instantiatedContainerType.tag!=="pi")throw new KernelError(`${decl.name}: malformed v55 nested container ${sp.containerName}`);
    const specializedTail=instantiate(instantiatedContainerType.body,target);
    if(containsConst(specializedTail,sp.targetName))throw new KernelError(`${decl.name}: v55 bounded indexed-container slice requires container index domains independent of the recursive mutual target`);
    let resultTail=specializedTail;
    for(let ii=0;ii<sp.container.numIndices;ii++){if(resultTail.tag!=="pi")throw new KernelError(`${decl.name}: v55 nested container ${sp.containerName} index telescope is shorter than numIndices`);resultTail=resultTail.body;}
    const specializedResult=kernelWhnf(env,resultTail);
    if(specializedResult.tag!=="sort"||!levelDefEq(specializedResult.level,resultLevel))throw new KernelError(`${decl.name}: v55 nested container ${sp.containerName} specialization must live in the mutual block result universe`);
    const auxCtors=sp.container.constructors.map((ctor,index)=>{
      const instantiatedCtorType=instantiateTermLevels(ctor.type,sp.container.levelParams,sp.containerLevels);
      if(instantiatedCtorType.tag!=="pi")throw new KernelError(`${decl.name}: malformed v55 nested-container constructor ${ctor.name}`);
      const syntheticName=`${sp.auxName}.ctor${index}`;sp.ctorRestore.set(syntheticName,ctor.name);
      const specialized=instantiate(instantiatedCtorType.body,target);
      const rewritten=rewriteNestedSpecializationToAuxIndexedPoly(specialized,sp.containerName,sp.containerLevels,sp.targetName,selfLevels,sp.auxName,numParams+sp.targetIndexCount,mode,sp.container.numIndices);
      return{name:syntheticName,type:prependPiTelescope(decl.inductives[0].type,numParams,rewritten)};
    });
    const auxType=prependPiTelescope(decl.inductives[0].type,numParams,specializedTail);
    syntheticMembers.push({name:sp.auxName,type:auxType,numParams,numIndices:sp.container.numIndices,constructors:auxCtors});
  }

  const synthetic:Extract<CoreDeclaration,{kind:"mutualInductive"}>={kind:"mutualInductive",name:`_nestedMutualIndexedContainer.${decl.name}.block`,levelParams:[...decl.levelParams],inductives:syntheticMembers};
  const transformed=env.clone();checkDirectMutualInductive(transformed,synthetic);
  const syntheticNames=syntheticMembers.map(m=>m.name),publicRecursors=[...decl.inductives.map(m=>`${m.name}.rec`),...helperNames];
  const targetRecursor=new Map(syntheticNames.map((n,i)=>[n,publicRecursors[i]] as const)),originalCount=decl.inductives.length;
  const restoredRecursors:Extract<EnvironmentDeclaration,{kind:"recursor"}>[]=syntheticNames.map((name,ri)=>{
    const e=transformed.get(`${name}.rec`);if(!e||e.declaration.kind!=="recursor")throw new KernelError(`${decl.name}: internal v55 mutual/nested preprocessing did not generate recursor for ${name}`);
    const helper=ri>=originalCount,sp=helper?specs[ri-originalCount]:undefined;
    const rules=e.declaration.metadata.rules.map(rule=>({...rule,
      ctor:helper?(sp!.ctorRestore.get(rule.ctor)??rule.ctor):rule.ctor,
      recursiveFieldTypes:rule.recursiveFieldTypes?.map(t=>t?restoreMutualNestedV55(t,specs,numParams,selfLevels):null),
      recursiveTargets:rule.recursiveTargets?.map(()=>null),
      recursiveRecursors:rule.recursiveTargets?.map(target=>target?targetRecursor.get(target)??null:null),
      ...(helper?{ctorParamCount:1}:{}),
    }));
    return{kind:"recursor",name:publicRecursors[ri],levelParams:[...e.declaration.levelParams],type:restoreMutualNestedV55(e.declaration.type,specs,numParams,selfLevels),metadata:{...e.declaration.metadata,inductive:helper?firstName:name,rules,mutual:{inductives:syntheticNames,motiveCount:syntheticNames.length,recursors:publicRecursors,indexCounts:syntheticMembers.map(m=>m.numIndices)}}};
  });

  const final=env.clone(),aggregateAssumptions=new Set<string>();
  for(let mi=0;mi<decl.inductives.length;mi++){
    const m=decl.inductives[mi],as=dependencyAssumptions(transformed,[m.type,...m.constructors.map(c=>c.type)]);for(const a of as)aggregateAssumptions.add(a);
    final.add({declaration:{kind:"inductive",name:m.name,levelParams:[...decl.levelParams],type:m.type,numParams,numIndices:m.numIndices,constructors:m.constructors},assumptions:as,generated:[...m.constructors.map(c=>c.name),`${m.name}.rec`,...(mi===0?helperNames:[])]});
  }
  for(const m of decl.inductives)for(const ctor of m.constructors){const sort=kernelWhnf(final,infer(final,[],ctor.type));if(sort.tag!=="sort")throw new KernelError(`${ctor.name}: restored v55 constructor type is not a type`);final.add({declaration:{kind:"constructor",name:ctor.name,levelParams:[...decl.levelParams],type:ctor.type,inductive:m.name},assumptions:dependencyAssumptions(final,[ctor.type]),generated:[]});}
  for(const rec of restoredRecursors){const sort=kernelWhnf(final,infer(final,[],rec.type));if(sort.tag!=="sort")throw new KernelError(`${rec.name}: restored v55 recursor type is not a type`);final.add({declaration:rec,assumptions:dependencyAssumptions(final,[rec.type]),generated:[]});}
  env.replaceWith(final);
  return{declaration:decl,assumptions:aggregateAssumptions,generated:[...decl.inductives.flatMap(m=>m.constructors.map(c=>c.name)),...publicRecursors]};
}

function tryCheckMutualNestedPropV54(
  env:Environment,decl:Extract<CoreDeclaration,{kind:"mutualInductive"}>,
):CheckedDeclaration|undefined{
  if(!env.allowMutualNestedProp||decl.inductives.length<2)return undefined;
  validateLevelParams(decl);
  const selfLevels=decl.levelParams.map(name=>({tag:"param",name} as Level));
  const numParams=decl.inductives[0]?.numParams??0;
  if(decl.inductives.some(m=>m.numParams!==numParams))return undefined;
  const memberMap=new Map(decl.inductives.map(m=>[m.name,{numIndices:m.numIndices}] as const));

  // v54 is Prop-valued. All members must end in Prop; the ordinary trusted
  // mutual checker then derives one shared Prop-only motive policy for originals
  // and synthesized helpers.
  let resultLevel:Level|undefined;
  for(const m of decl.inductives){
    let tail=m.type;
    for(let i=0;i<numParams+m.numIndices;i++){if(tail.tag!=="pi")return undefined;tail=tail.body;}
    if(tail.tag!=="sort"||!normalizesToZero(tail.level))return undefined;
    if(resultLevel===undefined)resultLevel=tail.level;else if(!levelDefEq(resultLevel,tail.level))return undefined;
  }
  if(resultLevel===undefined)return undefined;

  const paramCtx:Context=[];let firstTail=decl.inductives[0].type;
  for(let pi=0;pi<numParams;pi++){
    if(firstTail.tag!=="pi")return undefined;
    paramCtx.unshift(firstTail.domain);firstTail=firstTail.body;
  }

  const occurrences:MutualNestedV53Occurrence[]=[];
  for(const m of decl.inductives){
    for(let ci=0;ci<m.constructors.length;ci++){
      const ctor=m.constructors[ci],{fields}=splitPi(ctor.type);
      for(let fi=numParams;fi<fields.length;fi++){
        const parsed=parseMutualNestedV53Occurrence(env,fields[fi],memberMap,numParams,selfLevels);if(!parsed)continue;
        const projected:Term[]=[];const localCount=fi-numParams;
        for(const idx of parsed.targetArgs.slice(numParams)){
          const p=projectNestedIndexToParamContext(idx,localCount);
          if(!p)throw new KernelError(`${ctor.name}: v54 nested mutual target indices may depend only on shared mutual parameters, not constructor/index-local variables`);
          projected.push(p);
        }
        occurrences.push({ctorIndex:ci,fieldIndex:fi,...parsed,projectedIndices:projected});
      }
    }
  }
  if(occurrences.length===0)return undefined;

  const specs:MutualNestedV53Spec[]=[];
  for(const occ of occurrences){
    let found=-1;
    for(let si=0;si<specs.length;si++){
      const sp=specs[si];
      if(sp.containerName!==occ.containerName||!levelsDefEq(sp.containerLevels,occ.containerLevels)||sp.targetName!==occ.targetName||sp.fixedIndices.length!==occ.projectedIndices.length)continue;
      if(occ.projectedIndices.every((x,i)=>defEq(env,paramCtx,x,sp.fixedIndices[i]))){found=si;break;}
    }
    if(found<0){
      const container=occ.container;
      if(container.numParams!==1||container.numIndices!==0)throw new KernelError(`${decl.name}: v54 nested container ${container.name} must have exactly one parameter and no indices`);
      if(container.levelParams.length!==occ.containerLevels.length)throw new KernelError(`${decl.name}: v54 nested container ${container.name} has incompatible universe arity`);
      const instantiatedContainerType=instantiateTermLevels(container.type,container.levelParams,occ.containerLevels);
      if(instantiatedContainerType.tag!=="pi")throw new KernelError(`${decl.name}: malformed v54 nested container ${container.name}`);
      const paramSort=kernelWhnf(env,instantiatedContainerType.domain);
      if(paramSort.tag!=="sort"||!normalizesToZero(paramSort.level))throw new KernelError(`${decl.name}: v54 nested container ${container.name} parameter must be Prop`);
      let auxName=`_nestedMutualProp.${decl.name}.aux${specs.length+1}`;for(let n=0;env.has(auxName)||env.has(`${auxName}.rec`);n++)auxName=`_nestedMutualProp.${decl.name}.aux${specs.length+1}_${n+1}`;
      specs.push({containerName:occ.containerName,containerLevels:[...occ.containerLevels],targetName:occ.targetName,targetIndexCount:occ.targetIndexCount,container,fixedIndices:[...occ.projectedIndices],auxName,ctorRestore:new Map()});
      found=specs.length-1;
    }
    occ.specIndex=found;
  }

  const firstName=decl.inductives[0].name,helperNames=specs.map((_,i)=>`${firstName}.rec_${i+1}`);
  for(const h of helperNames)if(env.has(h))throw new KernelError(`${decl.name}: v54 nested helper recursor name already exists: ${h}`);

  const syntheticMembers:Extract<CoreDeclaration,{kind:"mutualInductive"}>["inductives"]=decl.inductives.map(m=>({
    name:m.name,type:m.type,numParams,numIndices:m.numIndices,
    constructors:m.constructors.map(ctor=>{
      const {fields,fieldBinderInfo,result}=splitPi(ctor.type);
      const rewritten=fields.map((field,fi)=>{
        if(fi<numParams)return field;
        const parsed=parseMutualNestedV53Occurrence(env,field,memberMap,numParams,selfLevels);if(!parsed)return field;
        const localCount=fi-numParams,projected:Term[]=[];
        for(const idx of parsed.targetArgs.slice(numParams)){
          const p=projectNestedIndexToParamContext(idx,localCount);if(!p)throw new KernelError(`${ctor.name}: v54 nested mutual target indices may depend only on shared mutual parameters, not constructor/index-local variables`);projected.push(p);
        }
        const si=specs.findIndex(sp=>sp.containerName===parsed.containerName&&levelsDefEq(sp.containerLevels,parsed.containerLevels)&&sp.targetName===parsed.targetName&&sp.fixedIndices.length===projected.length&&projected.every((x,i)=>defEq(env,paramCtx,x,sp.fixedIndices[i])));
        if(si<0)return field;
        return mkApps({tag:"const",name:specs[si].auxName,levels:[...selfLevels]},parsed.targetArgs.slice(0,numParams));
      });
      return{name:ctor.name,type:rebuildPi(rewritten,fieldBinderInfo,result)};
    }),
  }));

  const sharedArgs=Array.from({length:numParams},(_,p)=>({tag:"bvar",index:numParams-1-p} as Term));
  for(const sp of specs){
    const mode:NestedIndexMode={kind:"closed",sharedParamCount:numParams,outerIndexCount:sp.targetIndexCount,fixedIndices:sp.fixedIndices};
    const target=mkApps({tag:"const",name:sp.targetName,levels:[...selfLevels]},[...sharedArgs,...sp.fixedIndices.map(t=>instantiateNestedParamContext(t,sharedArgs))]);
    const instantiatedContainerType=instantiateTermLevels(sp.container.type,sp.container.levelParams,sp.containerLevels);
    if(instantiatedContainerType.tag!=="pi")throw new KernelError(`${decl.name}: malformed v54 nested container ${sp.containerName}`);
    const specializedTail=instantiate(instantiatedContainerType.body,target);
    const auxWh=kernelWhnf(env,specializedTail);
    if(auxWh.tag!=="sort"||!levelDefEq(auxWh.level,resultLevel))throw new KernelError(`${decl.name}: v54 nested container ${sp.containerName} specialization must live in the mutual block result universe`);
    const auxCtors=sp.container.constructors.map((ctor,index)=>{
      const instantiatedCtorType=instantiateTermLevels(ctor.type,sp.container.levelParams,sp.containerLevels);
      if(instantiatedCtorType.tag!=="pi")throw new KernelError(`${decl.name}: malformed v54 nested-container constructor ${ctor.name}`);
      const syntheticName=`${sp.auxName}.ctor${index}`;sp.ctorRestore.set(syntheticName,ctor.name);
      const specialized=instantiate(instantiatedCtorType.body,target);
      const rewritten=rewriteNestedSpecializationToAuxPoly(specialized,sp.containerName,sp.containerLevels,sp.targetName,selfLevels,sp.auxName,numParams+sp.targetIndexCount,mode);
      return{name:syntheticName,type:prependPiTelescope(decl.inductives[0].type,numParams,rewritten)};
    });
    const auxType=prependPiTelescope(decl.inductives[0].type,numParams,specializedTail);
    syntheticMembers.push({name:sp.auxName,type:auxType,numParams,numIndices:0,constructors:auxCtors});
  }

  const synthetic:Extract<CoreDeclaration,{kind:"mutualInductive"}>={kind:"mutualInductive",name:`_nestedMutualProp.${decl.name}.block`,levelParams:[...decl.levelParams],inductives:syntheticMembers};
  const transformed=env.clone();checkDirectMutualInductive(transformed,synthetic);
  const syntheticNames=syntheticMembers.map(m=>m.name),publicRecursors=[...decl.inductives.map(m=>`${m.name}.rec`),...helperNames];
  const targetRecursor=new Map(syntheticNames.map((n,i)=>[n,publicRecursors[i]] as const)),originalCount=decl.inductives.length;
  const restoredRecursors:Extract<EnvironmentDeclaration,{kind:"recursor"}>[]=syntheticNames.map((name,ri)=>{
    const e=transformed.get(`${name}.rec`);if(!e||e.declaration.kind!=="recursor")throw new KernelError(`${decl.name}: internal v54 mutual+nested preprocessing did not generate recursor for ${name}`);
    const helper=ri>=originalCount,sp=helper?specs[ri-originalCount]:undefined;
    const rules=e.declaration.metadata.rules.map(rule=>({...rule,
      ctor:helper?(sp!.ctorRestore.get(rule.ctor)??rule.ctor):rule.ctor,
      recursiveFieldTypes:rule.recursiveFieldTypes?.map(t=>t?restoreMutualNestedV53(t,specs,numParams,selfLevels):null),
      recursiveTargets:rule.recursiveTargets?.map(()=>null),
      recursiveRecursors:rule.recursiveTargets?.map(target=>target?targetRecursor.get(target)??null:null),
      ...(helper?{ctorParamCount:1}:{}),
    }));
    return{kind:"recursor",name:publicRecursors[ri],levelParams:[...e.declaration.levelParams],type:restoreMutualNestedV53(e.declaration.type,specs,numParams,selfLevels),metadata:{...e.declaration.metadata,inductive:helper?firstName:name,rules,mutual:{inductives:syntheticNames,motiveCount:syntheticNames.length,recursors:publicRecursors,indexCounts:syntheticMembers.map(m=>m.numIndices)}}};
  });

  const final=env.clone(),aggregateAssumptions=new Set<string>();
  for(let mi=0;mi<decl.inductives.length;mi++){
    const m=decl.inductives[mi],as=dependencyAssumptions(transformed,[m.type,...m.constructors.map(c=>c.type)]);for(const a of as)aggregateAssumptions.add(a);
    final.add({declaration:{kind:"inductive",name:m.name,levelParams:[...decl.levelParams],type:m.type,numParams,numIndices:m.numIndices,constructors:m.constructors},assumptions:as,generated:[...m.constructors.map(c=>c.name),`${m.name}.rec`,...(mi===0?helperNames:[])]});
  }
  for(const m of decl.inductives)for(const ctor of m.constructors){const sort=kernelWhnf(final,infer(final,[],ctor.type));if(sort.tag!=="sort")throw new KernelError(`${ctor.name}: restored v54 constructor type is not a type`);final.add({declaration:{kind:"constructor",name:ctor.name,levelParams:[...decl.levelParams],type:ctor.type,inductive:m.name},assumptions:dependencyAssumptions(final,[ctor.type]),generated:[]});}
  for(const rec of restoredRecursors){const sort=kernelWhnf(final,infer(final,[],rec.type));if(sort.tag!=="sort")throw new KernelError(`${rec.name}: restored v54 recursor type is not a type`);final.add({declaration:rec,assumptions:dependencyAssumptions(final,[rec.type]),generated:[]});}
  env.replaceWith(final);
  return{declaration:decl,assumptions:aggregateAssumptions,generated:[...decl.inductives.flatMap(m=>m.constructors.map(c=>c.name)),...publicRecursors]};
}


function tryCheckMutualNestedPolymorphicV53(
  env:Environment,decl:Extract<CoreDeclaration,{kind:"mutualInductive"}>,
):CheckedDeclaration|undefined{
  if(!env.allowMutualNestedPolymorphic||decl.levelParams.length===0||decl.inductives.length<2)return undefined;
  validateLevelParams(decl);
  const selfLevels=decl.levelParams.map(name=>({tag:"param",name} as Level));
  const numParams=decl.inductives[0]?.numParams??0;
  if(decl.inductives.some(m=>m.numParams!==numParams))return undefined;
  const memberMap=new Map(decl.inductives.map(m=>[m.name,{numIndices:m.numIndices}] as const));

  // Keep v53 Type-valued.  All members must share one nonzero result universe;
  // the direct mutual checker repeats this check on the synthetic block.
  let resultLevel:Level|undefined;
  for(const m of decl.inductives){
    let tail=m.type;
    for(let i=0;i<numParams+m.numIndices;i++){if(tail.tag!=="pi")return undefined;tail=tail.body;}
    if(tail.tag!=="sort"||!isNeverZero(tail.level))return undefined;
    if(resultLevel===undefined)resultLevel=tail.level;else if(!levelDefEq(resultLevel,tail.level))return undefined;
  }
  if(resultLevel===undefined)return undefined;

  const paramCtx:Context=[];let firstTail=decl.inductives[0].type;
  for(let pi=0;pi<numParams;pi++){
    if(firstTail.tag!=="pi")return undefined;
    paramCtx.unshift(firstTail.domain);firstTail=firstTail.body;
  }

  const occurrences:MutualNestedV53Occurrence[]=[];
  for(const m of decl.inductives){
    for(let ci=0;ci<m.constructors.length;ci++){
      const ctor=m.constructors[ci],{fields}=splitPi(ctor.type);
      for(let fi=numParams;fi<fields.length;fi++){
        const parsed=parseMutualNestedV53Occurrence(env,fields[fi],memberMap,numParams,selfLevels);if(!parsed)continue;
        const projected:Term[]=[];const localCount=fi-numParams;
        for(const idx of parsed.targetArgs.slice(numParams)){
          const p=projectNestedIndexToParamContext(idx,localCount);
          if(!p)throw new KernelError(`${ctor.name}: v53 nested mutual target indices may depend only on shared mutual parameters, not constructor/index-local variables`);
          projected.push(p);
        }
        occurrences.push({ctorIndex:ci,fieldIndex:fi,...parsed,projectedIndices:projected});
      }
    }
  }
  if(occurrences.length===0)return undefined;

  const specs:MutualNestedV53Spec[]=[];
  for(const occ of occurrences){
    let found=-1;
    for(let si=0;si<specs.length;si++){
      const sp=specs[si];
      if(sp.containerName!==occ.containerName||!levelsDefEq(sp.containerLevels,occ.containerLevels)||sp.targetName!==occ.targetName||sp.fixedIndices.length!==occ.projectedIndices.length)continue;
      if(occ.projectedIndices.every((x,i)=>defEq(env,paramCtx,x,sp.fixedIndices[i]))){found=si;break;}
    }
    if(found<0){
      const container=occ.container;
      if(container.numParams!==1||container.numIndices!==0)throw new KernelError(`${decl.name}: v53 nested container ${container.name} must have exactly one parameter and no indices`);
      if(container.levelParams.length!==occ.containerLevels.length)throw new KernelError(`${decl.name}: v53 nested container ${container.name} has incompatible universe arity`);
      const instantiatedContainerType=instantiateTermLevels(container.type,container.levelParams,occ.containerLevels);
      if(instantiatedContainerType.tag!=="pi")throw new KernelError(`${decl.name}: malformed v53 nested container ${container.name}`);
      const paramSort=kernelWhnf(env,instantiatedContainerType.domain);
      if(paramSort.tag!=="sort"||!isNeverZero(paramSort.level))throw new KernelError(`${decl.name}: v53 nested container ${container.name} parameter must live in Type`);
      let auxName=`_nestedMutualPoly.${decl.name}.aux${specs.length+1}`;for(let n=0;env.has(auxName)||env.has(`${auxName}.rec`);n++)auxName=`_nestedMutualPoly.${decl.name}.aux${specs.length+1}_${n+1}`;
      specs.push({containerName:occ.containerName,containerLevels:[...occ.containerLevels],targetName:occ.targetName,targetIndexCount:occ.targetIndexCount,container,fixedIndices:[...occ.projectedIndices],auxName,ctorRestore:new Map()});
      found=specs.length-1;
    }
    occ.specIndex=found;
  }

  const firstName=decl.inductives[0].name,helperNames=specs.map((_,i)=>`${firstName}.rec_${i+1}`);
  for(const h of helperNames)if(env.has(h))throw new KernelError(`${decl.name}: v53 nested helper recursor name already exists: ${h}`);

  const syntheticMembers:Extract<CoreDeclaration,{kind:"mutualInductive"}>["inductives"]=decl.inductives.map(m=>({
    name:m.name,type:m.type,numParams,numIndices:m.numIndices,
    constructors:m.constructors.map(ctor=>{
      const {fields,fieldBinderInfo,result}=splitPi(ctor.type);
      const rewritten=fields.map((field,fi)=>{
        if(fi<numParams)return field;
        const parsed=parseMutualNestedV53Occurrence(env,field,memberMap,numParams,selfLevels);if(!parsed)return field;
        const localCount=fi-numParams,projected:Term[]=[];
        for(const idx of parsed.targetArgs.slice(numParams)){
          const p=projectNestedIndexToParamContext(idx,localCount);if(!p)throw new KernelError(`${ctor.name}: v53 nested mutual target indices may depend only on shared mutual parameters, not constructor/index-local variables`);projected.push(p);
        }
        const si=specs.findIndex(sp=>sp.containerName===parsed.containerName&&levelsDefEq(sp.containerLevels,parsed.containerLevels)&&sp.targetName===parsed.targetName&&sp.fixedIndices.length===projected.length&&projected.every((x,i)=>defEq(env,paramCtx,x,sp.fixedIndices[i])));
        if(si<0)return field;
        return mkApps({tag:"const",name:specs[si].auxName,levels:[...selfLevels]},parsed.targetArgs.slice(0,numParams));
      });
      return{name:ctor.name,type:rebuildPi(rewritten,fieldBinderInfo,result)};
    }),
  }));

  const sharedArgs=Array.from({length:numParams},(_,p)=>({tag:"bvar",index:numParams-1-p} as Term));
  for(const sp of specs){
    const mode:NestedIndexMode={kind:"closed",sharedParamCount:numParams,outerIndexCount:sp.targetIndexCount,fixedIndices:sp.fixedIndices};
    const target=mkApps({tag:"const",name:sp.targetName,levels:[...selfLevels]},[...sharedArgs,...sp.fixedIndices.map(t=>instantiateNestedParamContext(t,sharedArgs))]);
    const instantiatedContainerType=instantiateTermLevels(sp.container.type,sp.container.levelParams,sp.containerLevels);
    if(instantiatedContainerType.tag!=="pi")throw new KernelError(`${decl.name}: malformed v53 nested container ${sp.containerName}`);
    const specializedTail=instantiate(instantiatedContainerType.body,target);
    const auxWh=kernelWhnf(env,specializedTail);
    if(auxWh.tag!=="sort"||!levelDefEq(auxWh.level,resultLevel))throw new KernelError(`${decl.name}: v53 nested container ${sp.containerName} specialization must live in the mutual block result universe`);
    const auxCtors=sp.container.constructors.map((ctor,index)=>{
      const instantiatedCtorType=instantiateTermLevels(ctor.type,sp.container.levelParams,sp.containerLevels);
      if(instantiatedCtorType.tag!=="pi")throw new KernelError(`${decl.name}: malformed v53 nested-container constructor ${ctor.name}`);
      const syntheticName=`${sp.auxName}.ctor${index}`;sp.ctorRestore.set(syntheticName,ctor.name);
      const specialized=instantiate(instantiatedCtorType.body,target);
      const rewritten=rewriteNestedSpecializationToAuxPoly(specialized,sp.containerName,sp.containerLevels,sp.targetName,selfLevels,sp.auxName,numParams+sp.targetIndexCount,mode);
      return{name:syntheticName,type:prependPiTelescope(decl.inductives[0].type,numParams,rewritten)};
    });
    const auxType=prependPiTelescope(decl.inductives[0].type,numParams,specializedTail);
    syntheticMembers.push({name:sp.auxName,type:auxType,numParams,numIndices:0,constructors:auxCtors});
  }

  const synthetic:Extract<CoreDeclaration,{kind:"mutualInductive"}>={kind:"mutualInductive",name:`_nestedMutualPoly.${decl.name}.block`,levelParams:[...decl.levelParams],inductives:syntheticMembers};
  const transformed=env.clone();checkDirectMutualInductive(transformed,synthetic);
  const syntheticNames=syntheticMembers.map(m=>m.name),publicRecursors=[...decl.inductives.map(m=>`${m.name}.rec`),...helperNames];
  const targetRecursor=new Map(syntheticNames.map((n,i)=>[n,publicRecursors[i]] as const)),originalCount=decl.inductives.length;
  const restoredRecursors:Extract<EnvironmentDeclaration,{kind:"recursor"}>[]=syntheticNames.map((name,ri)=>{
    const e=transformed.get(`${name}.rec`);if(!e||e.declaration.kind!=="recursor")throw new KernelError(`${decl.name}: internal v53 mutual+nested preprocessing did not generate recursor for ${name}`);
    const helper=ri>=originalCount,sp=helper?specs[ri-originalCount]:undefined;
    const rules=e.declaration.metadata.rules.map(rule=>({...rule,
      ctor:helper?(sp!.ctorRestore.get(rule.ctor)??rule.ctor):rule.ctor,
      recursiveFieldTypes:rule.recursiveFieldTypes?.map(t=>t?restoreMutualNestedV53(t,specs,numParams,selfLevels):null),
      recursiveTargets:rule.recursiveTargets?.map(()=>null),
      recursiveRecursors:rule.recursiveTargets?.map(target=>target?targetRecursor.get(target)??null:null),
      ...(helper?{ctorParamCount:1}:{}),
    }));
    return{kind:"recursor",name:publicRecursors[ri],levelParams:[...e.declaration.levelParams],type:restoreMutualNestedV53(e.declaration.type,specs,numParams,selfLevels),metadata:{...e.declaration.metadata,inductive:helper?firstName:name,rules,mutual:{inductives:syntheticNames,motiveCount:syntheticNames.length,recursors:publicRecursors,indexCounts:syntheticMembers.map(m=>m.numIndices)}}};
  });

  const final=env.clone(),aggregateAssumptions=new Set<string>();
  for(let mi=0;mi<decl.inductives.length;mi++){
    const m=decl.inductives[mi],as=dependencyAssumptions(transformed,[m.type,...m.constructors.map(c=>c.type)]);for(const a of as)aggregateAssumptions.add(a);
    final.add({declaration:{kind:"inductive",name:m.name,levelParams:[...decl.levelParams],type:m.type,numParams,numIndices:m.numIndices,constructors:m.constructors},assumptions:as,generated:[...m.constructors.map(c=>c.name),`${m.name}.rec`,...(mi===0?helperNames:[])]});
  }
  for(const m of decl.inductives)for(const ctor of m.constructors){const sort=kernelWhnf(final,infer(final,[],ctor.type));if(sort.tag!=="sort")throw new KernelError(`${ctor.name}: restored v53 constructor type is not a type`);final.add({declaration:{kind:"constructor",name:ctor.name,levelParams:[...decl.levelParams],type:ctor.type,inductive:m.name},assumptions:dependencyAssumptions(final,[ctor.type]),generated:[]});}
  for(const rec of restoredRecursors){const sort=kernelWhnf(final,infer(final,[],rec.type));if(sort.tag!=="sort")throw new KernelError(`${rec.name}: restored v53 recursor type is not a type`);final.add({declaration:rec,assumptions:dependencyAssumptions(final,[rec.type]),generated:[]});}
  env.replaceWith(final);
  return{declaration:decl,assumptions:aggregateAssumptions,generated:[...decl.inductives.flatMap(m=>m.constructors.map(c=>c.name)),...publicRecursors]};
}

type MutualNestedV52Occurrence={
  ctorIndex:number;fieldIndex:number;containerName:string;targetName:string;
  container:Extract<CoreDeclaration,{kind:"inductive"}>;targetArgs:Term[];targetIndexCount:number;projectedIndices:Term[];specIndex?:number;
};
type MutualNestedV52Spec={
  containerName:string;targetName:string;targetIndexCount:number;container:Extract<CoreDeclaration,{kind:"inductive"}>;
  fixedIndices:Term[];auxName:string;ctorRestore:Map<string,string>;
};

/** v52: recognize one-level `Container (MutualMember params... indices...)`. */
function parseMutualNestedV52Occurrence(
  env:Environment,term:Term,members:ReadonlyMap<string,{numIndices:number}>,numParams:number,
):{containerName:string;targetName:string;container:Extract<CoreDeclaration,{kind:"inductive"}>;targetArgs:Term[];targetIndexCount:number}|undefined{
  const flat=flattenApps(term);
  if(flat.head.tag!=="const"||flat.head.levels.length!==0||flat.args.length!==1)return undefined;
  const inner=flattenApps(flat.args[0]);
  if(inner.head.tag!=="const"||inner.head.levels.length!==0)return undefined;
  const target=members.get(inner.head.name);if(!target||inner.args.length!==numParams+target.numIndices)return undefined;
  const entry=env.get(flat.head.name);if(!entry||entry.declaration.kind!=="inductive")return undefined;
  return{containerName:flat.head.name,targetName:inner.head.name,container:entry.declaration,targetArgs:[...inner.args],targetIndexCount:target.numIndices};
}

function restoreMutualNestedV52(term:Term,specs:readonly MutualNestedV52Spec[],numParams:number):Term{
  let out=term;
  for(const sp of specs){
    const mode:NestedIndexMode={kind:"closed",sharedParamCount:numParams,outerIndexCount:sp.targetIndexCount,fixedIndices:sp.fixedIndices};
    out=restoreNestedAuxTerm(out,sp.auxName,sp.containerName,sp.targetName,mode,sp.ctorRestore);
  }
  return out;
}

/**
 * v52: indexed mutual members plus bounded nested specializations.
 *
 * The original mutual families retain their per-member index telescopes.  A
 * nested helper represents one specialization `Container (Target params fixed)`
 * and itself carries only the shared parameter telescope.  Every target index
 * must project into that shared-parameter context; constructor-local/index-local
 * variables are rejected, matching Lean 4.33.1's nested-parameter restriction.
 */
function tryCheckMutualNestedIndicesV52(
  env:Environment,decl:Extract<CoreDeclaration,{kind:"mutualInductive"}>,
):CheckedDeclaration|undefined{
  if(!env.allowMutualNestedIndices)return undefined;
  if(decl.levelParams.length!==0||decl.inductives.length<2)return undefined;
  const numParams=decl.inductives[0]?.numParams??0;
  if(decl.inductives.some(m=>m.numParams!==numParams)||decl.inductives.every(m=>m.numIndices===0))return undefined;
  const memberMap=new Map(decl.inductives.map(m=>[m.name,{numIndices:m.numIndices}] as const));

  // Keep this milestone monomorphic and Type-valued; later milestones may lift
  // universes/Prop independently without weakening this index-locality rule.
  for(const m of decl.inductives){
    let tail=m.type;
    for(let i=0;i<numParams+m.numIndices;i++){if(tail.tag!=="pi")return undefined;tail=tail.body;}
    if(tail.tag!=="sort"||!levelDefEq(tail.level,levelSucc(LevelZero)))return undefined;
  }
  const paramCtx:Context=[];let firstTail=decl.inductives[0].type;
  for(let pi=0;pi<numParams;pi++){
    if(firstTail.tag!=="pi")return undefined;
    paramCtx.unshift(firstTail.domain);firstTail=firstTail.body;
  }

  const occurrences:MutualNestedV52Occurrence[]=[];
  for(let mi=0;mi<decl.inductives.length;mi++){
    const m=decl.inductives[mi];
    for(let ci=0;ci<m.constructors.length;ci++){
      const ctor=m.constructors[ci],{fields}=splitPi(ctor.type);
      for(let fi=numParams;fi<fields.length;fi++){
        const parsed=parseMutualNestedV52Occurrence(env,fields[fi],memberMap,numParams);if(!parsed)continue;
        const projected:Term[]=[];const localCount=fi-numParams;
        for(const idx of parsed.targetArgs.slice(numParams)){
          const p=projectNestedIndexToParamContext(idx,localCount);
          if(!p)throw new KernelError(`${ctor.name}: v52 nested mutual target indices may depend only on shared mutual parameters, not constructor/index-local variables`);
          projected.push(p);
        }
        occurrences.push({ctorIndex:ci,fieldIndex:fi,...parsed,projectedIndices:projected});
      }
    }
  }
  if(occurrences.length===0)return undefined;

  // Deduplicate helpers by container/target/fixed index tuple, using trusted
  // definitional equality in the shared parameter context.
  const specs:MutualNestedV52Spec[]=[];
  for(const occ of occurrences){
    let found=-1;
    for(let si=0;si<specs.length;si++){
      const sp=specs[si];
      if(sp.containerName!==occ.containerName||sp.targetName!==occ.targetName||sp.fixedIndices.length!==occ.projectedIndices.length)continue;
      if(occ.projectedIndices.every((x,i)=>defEq(env,paramCtx,x,sp.fixedIndices[i]))){found=si;break;}
    }
    if(found<0){
      const container=occ.container;
      if(container.levelParams.length!==0||container.numParams!==1||container.numIndices!==0)throw new KernelError(`${decl.name}: v52 nested container ${container.name} must be monomorphic with exactly one parameter and no indices`);
      if(container.type.tag!=="pi")throw new KernelError(`${decl.name}: malformed v52 nested container ${container.name}`);
      const ps=kernelWhnf(env,container.type.domain),rs=kernelWhnf(env,container.type.body);
      if(ps.tag!=="sort"||!levelDefEq(ps.level,levelSucc(LevelZero))||rs.tag!=="sort"||!levelDefEq(rs.level,levelSucc(LevelZero)))throw new KernelError(`${decl.name}: v52 nested container ${container.name} must have trusted Type -> Type shape`);
      let auxName=`_nestedMutualIdx.${decl.name}.aux${specs.length+1}`;for(let n=0;env.has(auxName)||env.has(`${auxName}.rec`);n++)auxName=`_nestedMutualIdx.${decl.name}.aux${specs.length+1}_${n+1}`;
      specs.push({containerName:occ.containerName,targetName:occ.targetName,targetIndexCount:occ.targetIndexCount,container,fixedIndices:[...occ.projectedIndices],auxName,ctorRestore:new Map()});
      found=specs.length-1;
    }
    occ.specIndex=found;
  }
  const firstName=decl.inductives[0].name,helperNames=specs.map((_,i)=>`${firstName}.rec_${i+1}`);
  for(const h of helperNames)if(env.has(h))throw new KernelError(`${decl.name}: v52 nested helper recursor name already exists: ${h}`);

  // Rewrite only the exact constructor-field occurrences discovered above;
  // this prevents distinct fixed index specializations from being conflated.
  // Re-scan exact fields when rebuilding the public members.
  const syntheticMembers:Extract<CoreDeclaration,{kind:"mutualInductive"}>["inductives"]=decl.inductives.map(m=>({
    name:m.name,type:m.type,numParams,numIndices:m.numIndices,
    constructors:m.constructors.map((ctor,ci)=>{
      const {fields,fieldBinderInfo,result}=splitPi(ctor.type);
      const rewritten=fields.map((field,fi)=>{
        if(fi<numParams)return field;
        const parsed=parseMutualNestedV52Occurrence(env,field,memberMap,numParams);if(!parsed)return field;
        const localCount=fi-numParams,projected:Term[]=[];
        for(const idx of parsed.targetArgs.slice(numParams)){
          const p=projectNestedIndexToParamContext(idx,localCount);if(!p)throw new KernelError(`${ctor.name}: v52 nested mutual target indices may depend only on shared mutual parameters, not constructor/index-local variables`);projected.push(p);
        }
        const si=specs.findIndex(sp=>sp.containerName===parsed.containerName&&sp.targetName===parsed.targetName&&sp.fixedIndices.length===projected.length&&projected.every((x,i)=>defEq(env,paramCtx,x,sp.fixedIndices[i])));
        if(si<0)return field;
        return mkApps({tag:"const",name:specs[si].auxName,levels:[]},parsed.targetArgs.slice(0,numParams));
      });
      return{name:ctor.name,type:rebuildPi(rewritten,fieldBinderInfo,result)};
    }),
  }));

  const sharedArgs=Array.from({length:numParams},(_,p)=>({tag:"bvar",index:numParams-1-p} as Term));
  for(const sp of specs){
    const mode:NestedIndexMode={kind:"closed",sharedParamCount:numParams,outerIndexCount:sp.targetIndexCount,fixedIndices:sp.fixedIndices};
    const target=mkApps({tag:"const",name:sp.targetName,levels:[]},[...sharedArgs,...sp.fixedIndices.map(t=>instantiateNestedParamContext(t,sharedArgs))]);
    const auxCtors=sp.container.constructors.map((ctor,index)=>{
      if(ctor.type.tag!=="pi")throw new KernelError(`${decl.name}: malformed v52 nested-container constructor ${ctor.name}`);
      const syntheticName=`${sp.auxName}.ctor${index}`;sp.ctorRestore.set(syntheticName,ctor.name);
      const specialized=instantiate(ctor.type.body,target);
      const rewritten=rewriteNestedSpecializationToAux(specialized,sp.containerName,sp.targetName,sp.auxName,numParams+sp.targetIndexCount,mode);
      return{name:syntheticName,type:prependPiTelescope(decl.inductives[0].type,numParams,rewritten)};
    });
    const auxType=prependPiTelescope(decl.inductives[0].type,numParams,{tag:"sort",level:levelSucc(LevelZero)});
    syntheticMembers.push({name:sp.auxName,type:auxType,numParams,numIndices:0,constructors:auxCtors});
  }

  const synthetic:Extract<CoreDeclaration,{kind:"mutualInductive"}>={kind:"mutualInductive",name:`_nestedMutualIdx.${decl.name}.block`,levelParams:[],inductives:syntheticMembers};
  const transformed=env.clone();checkDirectMutualInductive(transformed,synthetic);
  const syntheticNames=syntheticMembers.map(m=>m.name),publicRecursors=[...decl.inductives.map(m=>`${m.name}.rec`),...helperNames];
  const targetRecursor=new Map(syntheticNames.map((n,i)=>[n,publicRecursors[i]] as const)),originalCount=decl.inductives.length;
  const restoredRecursors:Extract<EnvironmentDeclaration,{kind:"recursor"}>[]=syntheticNames.map((name,ri)=>{
    const e=transformed.get(`${name}.rec`);if(!e||e.declaration.kind!=="recursor")throw new KernelError(`${decl.name}: internal v52 mutual+nested preprocessing did not generate recursor for ${name}`);
    const helper=ri>=originalCount,sp=helper?specs[ri-originalCount]:undefined;
    const rules=e.declaration.metadata.rules.map(rule=>({...rule,
      ctor:helper?(sp!.ctorRestore.get(rule.ctor)??rule.ctor):rule.ctor,
      recursiveFieldTypes:rule.recursiveFieldTypes?.map(t=>t?restoreMutualNestedV52(t,specs,numParams):null),
      recursiveTargets:rule.recursiveTargets?.map(()=>null),
      recursiveRecursors:rule.recursiveTargets?.map(target=>target?targetRecursor.get(target)??null:null),
      ...(helper?{ctorParamCount:1}:{}),
    }));
    return{kind:"recursor",name:publicRecursors[ri],levelParams:[...e.declaration.levelParams],type:restoreMutualNestedV52(e.declaration.type,specs,numParams),metadata:{...e.declaration.metadata,inductive:helper?firstName:name,rules,mutual:{inductives:syntheticNames,motiveCount:syntheticNames.length,recursors:publicRecursors,indexCounts:syntheticMembers.map(m=>m.numIndices)}}};
  });

  const final=env.clone(),aggregateAssumptions=new Set<string>();
  for(let mi=0;mi<decl.inductives.length;mi++){
    const m=decl.inductives[mi],as=dependencyAssumptions(transformed,[m.type,...m.constructors.map(c=>c.type)]);for(const a of as)aggregateAssumptions.add(a);
    final.add({declaration:{kind:"inductive",name:m.name,levelParams:[],type:m.type,numParams,numIndices:m.numIndices,constructors:m.constructors},assumptions:as,generated:[...m.constructors.map(c=>c.name),`${m.name}.rec`,...(mi===0?helperNames:[])]});
  }
  for(const m of decl.inductives)for(const ctor of m.constructors){const sort=kernelWhnf(final,infer(final,[],ctor.type));if(sort.tag!=="sort")throw new KernelError(`${ctor.name}: restored v52 constructor type is not a type`);final.add({declaration:{kind:"constructor",name:ctor.name,levelParams:[],type:ctor.type,inductive:m.name},assumptions:dependencyAssumptions(final,[ctor.type]),generated:[]});}
  for(const rec of restoredRecursors){const sort=kernelWhnf(final,infer(final,[],rec.type));if(sort.tag!=="sort")throw new KernelError(`${rec.name}: restored v52 recursor type is not a type`);final.add({declaration:rec,assumptions:dependencyAssumptions(final,[rec.type]),generated:[]});}
  env.replaceWith(final);
  return{declaration:decl,assumptions:aggregateAssumptions,generated:[...decl.inductives.flatMap(m=>m.constructors.map(c=>c.name)),...publicRecursors]};
}

function checkDirectMutualInductive(
  env:Environment,
  decl:Extract<CoreDeclaration,{kind:"mutualInductive"}>,
):CheckedDeclaration{
  if(!env.allowMutualInductives)throw new KernelError(`${decl.name}: mutual inductives unavailable in this kernel profile`);
  validateName(decl.name);validateLevelParams(decl);
  if(decl.inductives.length<2)throw new KernelError(`${decl.name}: mutual block requires at least two inductive members`);
  const memberNames=new Set<string>();const allNames=new Set<string>();
  const numParams=decl.inductives[0]?.numParams??0;
  for(const m of decl.inductives){
    validateName(m.name);
    if(memberNames.has(m.name))throw new KernelError(`${decl.name}: duplicate mutual inductive member ${m.name}`);
    memberNames.add(m.name);allNames.add(m.name);
    if(m.numIndices!==0&&!env.allowMutualIndices)throw new KernelError(`${m.name}: mutual indices are outside this kernel profile`);
    if(m.numParams!==numParams)throw new KernelError(`${decl.name}: all mutually inductive types must have the same number of parameters`);
    if(numParams!==0&&!env.allowMutualParameters)throw new KernelError(`${m.name}: v24 mutual slice requires numParams=0`);
    if(env.has(m.name))throw new KernelError(`duplicate declaration: ${m.name}`);
    if(env.has(`${m.name}.rec`))throw new KernelError(`duplicate declaration: ${m.name}.rec`);
    for(const c of m.constructors){validateName(c.name);if(allNames.has(c.name)||env.has(c.name))throw new KernelError(`duplicate declaration: ${c.name}`);allNames.add(c.name);}
  }

  // Validate a single shared parameter telescope before exposing any member.
  // Terms are compared in the same de Bruijn context, so dependent parameters
  // such as (α : Type u) (x : α) are supported without trusting names.
  const sharedParamDomains:Term[]=[];
  let resultLevel:Level|undefined;
  const pre=env.clone();
  for(let mi=0;mi<decl.inductives.length;mi++){
    const m=decl.inductives[mi];
    const typeSort=kernelWhnf(pre,infer(pre,[],m.type));if(typeSort.tag!=="sort")throw new KernelError(`${m.name}: mutual inductive type is not a type`);
    let tail=m.type;const paramCtx:Context=[];
    for(let pi=0;pi<numParams;pi++){
      if(tail.tag!=="pi")throw new KernelError(`${m.name}: mutual parameter telescope shorter than numParams`);
      if(containsAnyConst(tail.domain,memberNames))throw new KernelError(`${m.name}: mutual parameter types may not depend on the families being defined`);
      if(mi===0)sharedParamDomains.push(tail.domain);
      else if(!defEq(pre,paramCtx,tail.domain,sharedParamDomains[pi]))throw new KernelError(`${m.name}: mutual parameter ${pi} is not definitionally equal to the shared parameter telescope`);
      paramCtx.unshift(sharedParamDomains[pi]??tail.domain);tail=tail.body;
    }
    for(let xi=0;xi<m.numIndices;xi++){
      if(tail.tag!=="pi")throw new KernelError(`${m.name}: mutual index telescope shorter than numIndices`);
      if(containsAnyConst(tail.domain,memberNames))throw new KernelError(`${m.name}: mutual index types may not depend on the families being defined`);
      paramCtx.unshift(tail.domain);tail=tail.body;
    }
    if(tail.tag!=="sort")throw new KernelError(`${m.name}: mutual parameter/index telescope must end in a Sort`);
    if(env.allowMutualNestedFinalGeneralizationAudit&&!(normalizesToZero(tail.level)||isNeverZero(tail.level)))
      throw new KernelError(`${m.name}: invalid universe polymorphic mutual result Sort; it must be Prop or provably nonzero Type`);
    if(normalizesToZero(tail.level)&&!env.allowMutualProp)throw new KernelError(`${m.name}: mutual Prop families are outside this kernel profile`);
    if(resultLevel===undefined)resultLevel=tail.level;else if(!levelDefEq(resultLevel,tail.level))throw new KernelError(`${decl.name}: mutually inductive types must live in the same universe`);
  }
  if(resultLevel===undefined)throw new KernelError(`${decl.name}: empty mutual block`);
  // Lean 4.33.1 uses one elimination universe for the whole mutual block.
  // If the result universe is not provably nonzero, the block can be a predicate
  // and mutual recursors are restricted to Prop. Always-nonzero Type blocks get
  // a fresh motive universe. This is derived from trusted universe syntax.
  const mutualMotivePolicy:MotiveUniversePolicy=env.allowMutualProp&&!isNeverZero(resultLevel)?"prop":"fresh";

  const staged=env.clone();
  const memberDecls=decl.inductives.map(m=>({kind:"inductive" as const,name:m.name,levelParams:[...decl.levelParams],type:m.type,numParams:m.numParams,numIndices:m.numIndices,constructors:m.constructors}));
  for(const m of memberDecls)staged.add({declaration:m,assumptions:dependencyAssumptions(staged,[m.type]),generated:[]});

  const rulesByMember:SimpleCtorRule[][]=[];const generated:string[]=[];
  for(const m of memberDecls){
    const rules:SimpleCtorRule[]=[];
    for(const ctor of m.constructors){
      const ctorSort=kernelWhnf(staged,infer(staged,[],ctor.type));if(ctorSort.tag!=="sort")throw new KernelError(`${ctor.name}: constructor type is not a type`);
      let tail=ctor.type;const ctx:Context=[];
      // Constructor parameters must repeat the shared telescope definitionally.
      for(let pi=0;pi<numParams;pi++){
        if(tail.tag!=="pi")throw new KernelError(`${ctor.name}: missing uniform mutual parameter ${pi}`);
        if(!defEq(staged,ctx,tail.domain,sharedParamDomains[pi]))throw new KernelError(`${ctor.name}: parameter ${pi} is not uniform with the mutual block`);
        ctx.unshift(sharedParamDomains[pi]);tail=tail.body;
      }
      const fields:Term[]=[],fieldBinderInfo:BinderInfo[]=[],recursiveFields:boolean[]=[],recursiveFieldTypes:(Term|null)[]=[],recursiveTargets:(string|null)[]=[];
      while(tail.tag==="pi"){
        const field=tail.domain,priorFieldCount=fields.length;
        checkConstructorFieldUniverse(staged,ctx,field,resultLevel,ctor.name,numParams+priorFieldCount);
        const whField=kernelWhnf(staged,field);
        if(containsAnyConst(whField,memberNames)){
          const paramBaseIndices=Array.from({length:numParams},(_,pi)=>priorFieldCount+(numParams-1-pi));
          let positive;
          try{positive=positiveMutualRecursiveFieldType(staged,whField,memberDecls,memberNames,decl.levelParams,numParams,paramBaseIndices,ctx);}
          catch(e){if(e instanceof KernelError)throw new KernelError(`${ctor.name}: ${e.message}`);throw e;}
          if(!positive)throw new KernelError(`${ctor.name}: internal mutual positivity classification failed`);
          if(positive.higherOrder&&!env.allowHigherOrderMutualRecursion)
            throw new KernelError(`${ctor.name}: mutual recursion must be a direct field of a mutual family`);
          recursiveFields.push(true);recursiveFieldTypes.push(positive.recursiveType);recursiveTargets.push(positive.targetName);
        }else{recursiveFields.push(false);recursiveFieldTypes.push(null);recursiveTargets.push(null);}
        fields.push(field);fieldBinderInfo.push(binderInfoOf(tail));ctx.unshift(field);tail=tail.body;
      }
      const r=flattenApps(tail);
      if(r.head.tag!=="const"||r.head.name!==m.name||r.args.length!==numParams+m.numIndices)throw new KernelError(`${ctor.name}: constructor result must target ${m.name} with the declared parameter/index arity`);
      const expectedLevels=m.levelParams.map(name=>({tag:"param",name} as Level));
      if(r.head.levels.length!==expectedLevels.length||!r.head.levels.every((l,i)=>levelDefEq(l,expectedLevels[i])))throw new KernelError(`${ctor.name}: constructor result uses incompatible universe instantiation for ${m.name}`);
      for(let pi=0;pi<numParams;pi++){
        const expected={tag:"bvar",index:fields.length+(numParams-1-pi)} as Term;
        if(!defEq(staged,ctx,r.args[pi],expected))throw new KernelError(`${ctor.name}: constructor result parameter ${pi} is not the corresponding uniform mutual parameter`);
      }
      if(r.args.slice(numParams).some(a=>containsAnyConst(a,memberNames)))
        throw new KernelError(`${ctor.name}: constructor result indices may not contain a mutual family occurrence`);
      staged.add({declaration:{kind:"constructor",name:ctor.name,levelParams:[...decl.levelParams],type:ctor.type,inductive:m.name},assumptions:dependencyAssumptions(staged,[ctor.type]),generated:[]});
      generated.push(ctor.name);rules.push({ctor:ctor.name,fields,fieldBinderInfo,recursiveFields,recursiveFieldTypes,recursiveTargets});
    }
    rulesByMember.push(rules);
  }
  const recursors=generateDirectMutualRecursors(decl.levelParams,decl.inductives,rulesByMember,env.recursorProfile,env.allowTelescopeTerms,mutualMotivePolicy,env.allowLeanRecursorMinorOrder,env.allowRecursorFamilyBinderInfo);
  for(const rec of recursors){
    const recSort=kernelWhnf(staged,infer(staged,[],rec.type));if(recSort.tag!=="sort")throw new KernelError(`${rec.name}: generated mutual recursor type is not a type`);
    staged.add({declaration:{kind:"recursor",name:rec.name,levelParams:rec.levelParams,type:rec.type,metadata:rec.metadata},assumptions:dependencyAssumptions(staged,[rec.type]),generated:[]});generated.push(rec.name);
  }
  const final=env.clone();
  const assumptions=new Set<string>();
  for(const m of memberDecls){
    const as=dependencyAssumptions(staged,[m.type,...m.constructors.map(c=>c.type)]);for(const a of as)assumptions.add(a);
    final.add({declaration:m,assumptions:as,generated:[...m.constructors.map(c=>c.name),`${m.name}.rec`]});
  }
  for(const entry of staged.all())if(!env.has(entry.declaration.name)&&!memberNames.has(entry.declaration.name))final.add(entry);
  env.replaceWith(final);
  return{declaration:decl,assumptions,generated};
}


/** Return the fully-applied outer-family argument tuple. */
function nestedOuterApplication(term:Term,outerName:string,totalArgs:number):Term[]|undefined{
  const {head,args}=flattenApps(term);
  if(head.tag!=="const"||head.name!==outerName||head.levels.length!==0||args.length!==totalArgs)return undefined;
  return args;
}

/** Recognize one-level `Container (Outer args...)` nesting. */
function nestedSpecialization(
  term:Term,outerName:string,totalOuterArgs:number,
):{containerName:string;outerArgs:Term[]}|undefined{
  const {head,args}=flattenApps(term);
  if(head.tag!=="const"||head.levels.length!==0||args.length!==1)return undefined;
  const outerArgs=nestedOuterApplication(args[0],outerName,totalOuterArgs);
  if(!outerArgs)return undefined;
  return{containerName:head.name,outerArgs};
}

function levelsDefEq(xs:readonly Level[],ys:readonly Level[]):boolean{
  return xs.length===ys.length&&xs.every((x,i)=>levelDefEq(x,ys[i]));
}

/** v34 recognition: preserve explicit universe instantiations on both container and recursive outer constants. */
function nestedOuterApplicationPoly(term:Term,outerName:string,totalArgs:number,selfLevels:readonly Level[]):Term[]|undefined{
  const {head,args}=flattenApps(term);
  if(head.tag!=="const"||head.name!==outerName||!levelsDefEq(head.levels,selfLevels)||args.length!==totalArgs)return undefined;
  return args;
}

function nestedSpecializationPoly(
  term:Term,outerName:string,totalOuterArgs:number,selfLevels:readonly Level[],
):{containerName:string;containerLevels:Level[];outerArgs:Term[]}|undefined{
  const {head,args}=flattenApps(term);
  if(head.tag!=="const"||args.length!==1)return undefined;
  const outerArgs=nestedOuterApplicationPoly(args[0],outerName,totalOuterArgs,selfLevels);
  if(!outerArgs)return undefined;
  return{containerName:head.name,containerLevels:[...head.levels],outerArgs};
}

/** v35 recognition: `Container.{ls} (Outer.{us} args...) indices...`. */
function nestedSpecializationIndexedPoly(
  term:Term,outerName:string,totalOuterArgs:number,selfLevels:readonly Level[],
):{containerName:string;containerLevels:Level[];outerArgs:Term[];containerIndices:Term[]}|undefined{
  const {head,args}=flattenApps(term);
  if(head.tag!=="const"||args.length<1)return undefined;
  const outerArgs=nestedOuterApplicationPoly(args[0],outerName,totalOuterArgs,selfLevels);
  if(!outerArgs)return undefined;
  return{containerName:head.name,containerLevels:[...head.levels],outerArgs,containerIndices:args.slice(1)};
}

type NestedIndexMode=
  |{kind:"captured";sharedParamCount:number;outerIndexCount:0;fixedIndices:Term[]}
  |{kind:"closed";sharedParamCount:number;outerIndexCount:number;fixedIndices:Term[]};

/**
 * Project a term from a constructor-field context to the uniform outer-parameter
 * context by deleting `localCount` constructor-local binders.  Internal binders
 * introduced inside `term` remain intact.  A reference to any deleted local
 * makes the projection invalid.
 */
function projectNestedIndexToParamContext(term:Term,localCount:number,depth=0):Term|undefined{
  switch(term.tag){
    case"sort":case"const":return term;
    case"bvar":{
      if(term.index<depth)return term;
      const loose=term.index-depth;
      if(loose<localCount)return undefined;
      return{tag:"bvar",index:term.index-localCount};
    }
    case"app":{
      const fn=projectNestedIndexToParamContext(term.fn,localCount,depth);
      const arg=projectNestedIndexToParamContext(term.arg,localCount,depth);
      return fn&&arg?{tag:"app",fn,arg}:undefined;
    }
    case"lam":case"pi":{
      const domain=projectNestedIndexToParamContext(term.domain,localCount,depth);
      const body=projectNestedIndexToParamContext(term.body,localCount,depth+1);
      if(!domain||!body)return undefined;
      return term.tag==="lam"
        ?{tag:"lam",domain,body,binderInfo:term.binderInfo}
        :{tag:"pi",domain,body,binderInfo:term.binderInfo};
    }
    case"let":{
      const type=projectNestedIndexToParamContext(term.type,localCount,depth);
      const value=projectNestedIndexToParamContext(term.value,localCount,depth);
      const body=projectNestedIndexToParamContext(term.body,localCount,depth+1);
      return type&&value&&body?{tag:"let",type,value,body,nondep:term.nondep}:undefined;
    }
    case"proj":{
      const expr=projectNestedIndexToParamContext(term.expr,localCount,depth);
      return expr?{tag:"proj",typeName:term.typeName,index:term.index,expr}:undefined;
    }
  }
}

/** Instantiate a term expressed in the outer-parameter context with actual shared arguments. */
function instantiateNestedParamContext(term:Term,shared:readonly Term[],depth=0):Term{
  switch(term.tag){
    case"sort":case"const":return term;
    case"bvar":{
      if(term.index<depth)return term;
      const loose=term.index-depth;
      const arg=shared[shared.length-1-loose];
      if(!arg)throw new KernelError("nested fixed-index expression references a non-parameter binder");
      return shift(arg,depth);
    }
    case"app":return{tag:"app",fn:instantiateNestedParamContext(term.fn,shared,depth),arg:instantiateNestedParamContext(term.arg,shared,depth)};
    case"lam":return{tag:"lam",domain:instantiateNestedParamContext(term.domain,shared,depth),body:instantiateNestedParamContext(term.body,shared,depth+1),binderInfo:term.binderInfo};
    case"pi":return{tag:"pi",domain:instantiateNestedParamContext(term.domain,shared,depth),body:instantiateNestedParamContext(term.body,shared,depth+1),binderInfo:term.binderInfo};
    case"let":return{tag:"let",type:instantiateNestedParamContext(term.type,shared,depth),value:instantiateNestedParamContext(term.value,shared,depth),body:instantiateNestedParamContext(term.body,shared,depth+1),nondep:term.nondep};
    case"proj":return{tag:"proj",typeName:term.typeName,index:term.index,expr:instantiateNestedParamContext(term.expr,shared,depth)};
  }
}

/** Rewrite the bounded nested specialization to the synthesized auxiliary family. */
function rewriteNestedSpecializationToAux(
  term:Term,containerName:string,outerName:string,auxName:string,totalOuterArgs:number,mode:NestedIndexMode,
):Term{
  const nested=nestedSpecialization(term,outerName,totalOuterArgs);
  if(nested?.containerName===containerName){
    const auxArgs=mode.kind==="captured"?nested.outerArgs:nested.outerArgs.slice(0,mode.sharedParamCount);
    return mkApps({tag:"const",name:auxName,levels:[]},auxArgs);
  }
  switch(term.tag){
    case"sort":case"bvar":case"const":return term;
    case"app":return{tag:"app",fn:rewriteNestedSpecializationToAux(term.fn,containerName,outerName,auxName,totalOuterArgs,mode),arg:rewriteNestedSpecializationToAux(term.arg,containerName,outerName,auxName,totalOuterArgs,mode)};
    case"lam":return{tag:"lam",domain:rewriteNestedSpecializationToAux(term.domain,containerName,outerName,auxName,totalOuterArgs,mode),body:rewriteNestedSpecializationToAux(term.body,containerName,outerName,auxName,totalOuterArgs,mode),binderInfo:term.binderInfo};
    case"pi":return{tag:"pi",domain:rewriteNestedSpecializationToAux(term.domain,containerName,outerName,auxName,totalOuterArgs,mode),body:rewriteNestedSpecializationToAux(term.body,containerName,outerName,auxName,totalOuterArgs,mode),binderInfo:term.binderInfo};
    case"let":return{tag:"let",type:rewriteNestedSpecializationToAux(term.type,containerName,outerName,auxName,totalOuterArgs,mode),value:rewriteNestedSpecializationToAux(term.value,containerName,outerName,auxName,totalOuterArgs,mode),body:rewriteNestedSpecializationToAux(term.body,containerName,outerName,auxName,totalOuterArgs,mode),nondep:term.nondep};
    case"proj":return{tag:"proj",typeName:term.typeName,index:term.index,expr:rewriteNestedSpecializationToAux(term.expr,containerName,outerName,auxName,totalOuterArgs,mode)};
  }
}

function restoreNestedAuxTerm(
  term:Term,auxName:string,containerName:string,outerName:string,mode:NestedIndexMode,ctorRestore:ReadonlyMap<string,string>,
):Term{
  const flat=flattenApps(term);
  if(flat.head.tag==="const"&&flat.head.name===auxName&&flat.head.levels.length===0&&flat.args.length===mode.sharedParamCount){
    const shared=flat.args.map(a=>restoreNestedAuxTerm(a,auxName,containerName,outerName,mode,ctorRestore));
    const outerArgs=mode.kind==="captured"?shared:[...shared,...mode.fixedIndices.map(t=>instantiateNestedParamContext(t,shared))];
    const outer=mkApps({tag:"const",name:outerName,levels:[]},outerArgs);
    return mkApps({tag:"const",name:containerName,levels:[]},[outer]);
  }
  if(flat.head.tag==="const"){
    const originalCtor=ctorRestore.get(flat.head.name);
    if(originalCtor&&flat.args.length>=mode.sharedParamCount){
      const shared=flat.args.slice(0,mode.sharedParamCount).map(a=>restoreNestedAuxTerm(a,auxName,containerName,outerName,mode,ctorRestore));
      const fields=flat.args.slice(mode.sharedParamCount).map(a=>restoreNestedAuxTerm(a,auxName,containerName,outerName,mode,ctorRestore));
      const outerArgs=mode.kind==="captured"?shared:[...shared,...mode.fixedIndices.map(t=>instantiateNestedParamContext(t,shared))];
      const outer=mkApps({tag:"const",name:outerName,levels:[]},outerArgs);
      return mkApps({tag:"const",name:originalCtor,levels:[]},[outer,...fields]);
    }
  }
  switch(term.tag){
    case"sort":case"bvar":case"const":return term;
    case"app":return{tag:"app",fn:restoreNestedAuxTerm(term.fn,auxName,containerName,outerName,mode,ctorRestore),arg:restoreNestedAuxTerm(term.arg,auxName,containerName,outerName,mode,ctorRestore)};
    case"lam":return{tag:"lam",domain:restoreNestedAuxTerm(term.domain,auxName,containerName,outerName,mode,ctorRestore),body:restoreNestedAuxTerm(term.body,auxName,containerName,outerName,mode,ctorRestore),binderInfo:term.binderInfo};
    case"pi":return{tag:"pi",domain:restoreNestedAuxTerm(term.domain,auxName,containerName,outerName,mode,ctorRestore),body:restoreNestedAuxTerm(term.body,auxName,containerName,outerName,mode,ctorRestore),binderInfo:term.binderInfo};
    case"let":return{tag:"let",type:restoreNestedAuxTerm(term.type,auxName,containerName,outerName,mode,ctorRestore),value:restoreNestedAuxTerm(term.value,auxName,containerName,outerName,mode,ctorRestore),body:restoreNestedAuxTerm(term.body,auxName,containerName,outerName,mode,ctorRestore),nondep:term.nondep};
    case"proj":return{tag:"proj",typeName:term.typeName===auxName?containerName:term.typeName,index:term.index,expr:restoreNestedAuxTerm(term.expr,auxName,containerName,outerName,mode,ctorRestore)};
  }
}

function rewriteNestedSpecializationToAuxPoly(
  term:Term,containerName:string,containerLevels:readonly Level[],outerName:string,outerLevels:readonly Level[],auxName:string,totalOuterArgs:number,mode:NestedIndexMode,
):Term{
  const nested=nestedSpecializationPoly(term,outerName,totalOuterArgs,outerLevels);
  if(nested?.containerName===containerName&&levelsDefEq(nested.containerLevels,containerLevels)){
    const auxArgs=mode.kind==="captured"?nested.outerArgs:nested.outerArgs.slice(0,mode.sharedParamCount);
    return mkApps({tag:"const",name:auxName,levels:[...outerLevels]},auxArgs);
  }
  switch(term.tag){
    case"sort":case"bvar":case"const":return term;
    case"app":return{tag:"app",fn:rewriteNestedSpecializationToAuxPoly(term.fn,containerName,containerLevels,outerName,outerLevels,auxName,totalOuterArgs,mode),arg:rewriteNestedSpecializationToAuxPoly(term.arg,containerName,containerLevels,outerName,outerLevels,auxName,totalOuterArgs,mode)};
    case"lam":return{tag:"lam",domain:rewriteNestedSpecializationToAuxPoly(term.domain,containerName,containerLevels,outerName,outerLevels,auxName,totalOuterArgs,mode),body:rewriteNestedSpecializationToAuxPoly(term.body,containerName,containerLevels,outerName,outerLevels,auxName,totalOuterArgs,mode),binderInfo:term.binderInfo};
    case"pi":return{tag:"pi",domain:rewriteNestedSpecializationToAuxPoly(term.domain,containerName,containerLevels,outerName,outerLevels,auxName,totalOuterArgs,mode),body:rewriteNestedSpecializationToAuxPoly(term.body,containerName,containerLevels,outerName,outerLevels,auxName,totalOuterArgs,mode),binderInfo:term.binderInfo};
    case"let":return{tag:"let",type:rewriteNestedSpecializationToAuxPoly(term.type,containerName,containerLevels,outerName,outerLevels,auxName,totalOuterArgs,mode),value:rewriteNestedSpecializationToAuxPoly(term.value,containerName,containerLevels,outerName,outerLevels,auxName,totalOuterArgs,mode),body:rewriteNestedSpecializationToAuxPoly(term.body,containerName,containerLevels,outerName,outerLevels,auxName,totalOuterArgs,mode),nondep:term.nondep};
    case"proj":return{tag:"proj",typeName:term.typeName,index:term.index,expr:rewriteNestedSpecializationToAuxPoly(term.expr,containerName,containerLevels,outerName,outerLevels,auxName,totalOuterArgs,mode)};
  }
}

function restoreNestedAuxTermPoly(
  term:Term,auxName:string,auxLevels:readonly Level[],containerName:string,containerLevels:readonly Level[],outerName:string,outerLevels:readonly Level[],mode:NestedIndexMode,ctorRestore:ReadonlyMap<string,string>,
):Term{
  const flat=flattenApps(term);
  if(flat.head.tag==="const"&&flat.head.name===auxName&&levelsDefEq(flat.head.levels,auxLevels)&&flat.args.length===mode.sharedParamCount){
    const shared=flat.args.map(a=>restoreNestedAuxTermPoly(a,auxName,auxLevels,containerName,containerLevels,outerName,outerLevels,mode,ctorRestore));
    const outerArgs=mode.kind==="captured"?shared:[...shared,...mode.fixedIndices.map(t=>instantiateNestedParamContext(t,shared))];
    const outer=mkApps({tag:"const",name:outerName,levels:[...outerLevels]},outerArgs);
    return mkApps({tag:"const",name:containerName,levels:[...containerLevels]},[outer]);
  }
  if(flat.head.tag==="const"){
    const originalCtor=ctorRestore.get(flat.head.name);
    if(originalCtor&&flat.args.length>=mode.sharedParamCount){
      const shared=flat.args.slice(0,mode.sharedParamCount).map(a=>restoreNestedAuxTermPoly(a,auxName,auxLevels,containerName,containerLevels,outerName,outerLevels,mode,ctorRestore));
      const fields=flat.args.slice(mode.sharedParamCount).map(a=>restoreNestedAuxTermPoly(a,auxName,auxLevels,containerName,containerLevels,outerName,outerLevels,mode,ctorRestore));
      const outerArgs=mode.kind==="captured"?shared:[...shared,...mode.fixedIndices.map(t=>instantiateNestedParamContext(t,shared))];
      const outer=mkApps({tag:"const",name:outerName,levels:[...outerLevels]},outerArgs);
      return mkApps({tag:"const",name:originalCtor,levels:[...containerLevels]},[outer,...fields]);
    }
  }
  switch(term.tag){
    case"sort":case"bvar":case"const":return term;
    case"app":return{tag:"app",fn:restoreNestedAuxTermPoly(term.fn,auxName,auxLevels,containerName,containerLevels,outerName,outerLevels,mode,ctorRestore),arg:restoreNestedAuxTermPoly(term.arg,auxName,auxLevels,containerName,containerLevels,outerName,outerLevels,mode,ctorRestore)};
    case"lam":return{tag:"lam",domain:restoreNestedAuxTermPoly(term.domain,auxName,auxLevels,containerName,containerLevels,outerName,outerLevels,mode,ctorRestore),body:restoreNestedAuxTermPoly(term.body,auxName,auxLevels,containerName,containerLevels,outerName,outerLevels,mode,ctorRestore),binderInfo:term.binderInfo};
    case"pi":return{tag:"pi",domain:restoreNestedAuxTermPoly(term.domain,auxName,auxLevels,containerName,containerLevels,outerName,outerLevels,mode,ctorRestore),body:restoreNestedAuxTermPoly(term.body,auxName,auxLevels,containerName,containerLevels,outerName,outerLevels,mode,ctorRestore),binderInfo:term.binderInfo};
    case"let":return{tag:"let",type:restoreNestedAuxTermPoly(term.type,auxName,auxLevels,containerName,containerLevels,outerName,outerLevels,mode,ctorRestore),value:restoreNestedAuxTermPoly(term.value,auxName,auxLevels,containerName,containerLevels,outerName,outerLevels,mode,ctorRestore),body:restoreNestedAuxTermPoly(term.body,auxName,auxLevels,containerName,containerLevels,outerName,outerLevels,mode,ctorRestore),nondep:term.nondep};
    case"proj":return{tag:"proj",typeName:term.typeName===auxName?containerName:term.typeName,index:term.index,expr:restoreNestedAuxTermPoly(term.expr,auxName,auxLevels,containerName,containerLevels,outerName,outerLevels,mode,ctorRestore)};
  }
}

function prependPiTelescope(type:Term,count:number,body:Term):Term{
  const domains:Term[]=[];const infos:BinderInfo[]=[];let tail=type;
  for(let i=0;i<count;i++){
    if(tail.tag!=="pi")throw new KernelError(`nested outer parameter telescope shorter than requested prefix`);
    domains.push(tail.domain);infos.push(binderInfoOf(tail));tail=tail.body;
  }
  let out=body;
  for(let i=count-1;i>=0;i--)out={tag:"pi",domain:domains[i],body:out,binderInfo:infos[i]};
  return out;
}



/** v35: rewrite an indexed nested container specialization while preserving its own index tuple. */
function rewriteNestedSpecializationToAuxIndexedPoly(
  term:Term,containerName:string,containerLevels:readonly Level[],outerName:string,outerLevels:readonly Level[],auxName:string,totalOuterArgs:number,mode:NestedIndexMode,containerIndexCount:number,
):Term{
  const nested=nestedSpecializationIndexedPoly(term,outerName,totalOuterArgs,outerLevels);
  if(nested?.containerName===containerName&&levelsDefEq(nested.containerLevels,containerLevels)&&nested.containerIndices.length===containerIndexCount){
    const shared=mode.kind==="captured"?nested.outerArgs:nested.outerArgs.slice(0,mode.sharedParamCount);
    return mkApps({tag:"const",name:auxName,levels:[...outerLevels]},[...shared,...nested.containerIndices]);
  }
  switch(term.tag){
    case"sort":case"bvar":case"const":return term;
    case"app":return{tag:"app",fn:rewriteNestedSpecializationToAuxIndexedPoly(term.fn,containerName,containerLevels,outerName,outerLevels,auxName,totalOuterArgs,mode,containerIndexCount),arg:rewriteNestedSpecializationToAuxIndexedPoly(term.arg,containerName,containerLevels,outerName,outerLevels,auxName,totalOuterArgs,mode,containerIndexCount)};
    case"lam":return{tag:"lam",domain:rewriteNestedSpecializationToAuxIndexedPoly(term.domain,containerName,containerLevels,outerName,outerLevels,auxName,totalOuterArgs,mode,containerIndexCount),body:rewriteNestedSpecializationToAuxIndexedPoly(term.body,containerName,containerLevels,outerName,outerLevels,auxName,totalOuterArgs,mode,containerIndexCount),binderInfo:term.binderInfo};
    case"pi":return{tag:"pi",domain:rewriteNestedSpecializationToAuxIndexedPoly(term.domain,containerName,containerLevels,outerName,outerLevels,auxName,totalOuterArgs,mode,containerIndexCount),body:rewriteNestedSpecializationToAuxIndexedPoly(term.body,containerName,containerLevels,outerName,outerLevels,auxName,totalOuterArgs,mode,containerIndexCount),binderInfo:term.binderInfo};
    case"let":return{tag:"let",type:rewriteNestedSpecializationToAuxIndexedPoly(term.type,containerName,containerLevels,outerName,outerLevels,auxName,totalOuterArgs,mode,containerIndexCount),value:rewriteNestedSpecializationToAuxIndexedPoly(term.value,containerName,containerLevels,outerName,outerLevels,auxName,totalOuterArgs,mode,containerIndexCount),body:rewriteNestedSpecializationToAuxIndexedPoly(term.body,containerName,containerLevels,outerName,outerLevels,auxName,totalOuterArgs,mode,containerIndexCount),nondep:term.nondep};
    case"proj":return{tag:"proj",typeName:term.typeName,index:term.index,expr:rewriteNestedSpecializationToAuxIndexedPoly(term.expr,containerName,containerLevels,outerName,outerLevels,auxName,totalOuterArgs,mode,containerIndexCount)};
  }
}

/** v35: restore an indexed synthesized auxiliary family to the public container family. */
function restoreNestedAuxTermIndexedPoly(
  term:Term,auxName:string,auxLevels:readonly Level[],containerName:string,containerLevels:readonly Level[],outerName:string,outerLevels:readonly Level[],mode:NestedIndexMode,ctorRestore:ReadonlyMap<string,string>,containerIndexCount:number,
):Term{
  const recur=(t:Term)=>restoreNestedAuxTermIndexedPoly(t,auxName,auxLevels,containerName,containerLevels,outerName,outerLevels,mode,ctorRestore,containerIndexCount);
  const flat=flattenApps(term);
  if(flat.head.tag==="const"&&flat.head.name===auxName&&levelsDefEq(flat.head.levels,auxLevels)&&flat.args.length===mode.sharedParamCount+containerIndexCount){
    const shared=flat.args.slice(0,mode.sharedParamCount).map(recur);
    const indices=flat.args.slice(mode.sharedParamCount).map(recur);
    const outerArgs=mode.kind==="captured"?shared:[...shared,...mode.fixedIndices.map(t=>instantiateNestedParamContext(t,shared))];
    const outer=mkApps({tag:"const",name:outerName,levels:[...outerLevels]},outerArgs);
    return mkApps({tag:"const",name:containerName,levels:[...containerLevels]},[outer,...indices]);
  }
  if(flat.head.tag==="const"){
    const originalCtor=ctorRestore.get(flat.head.name);
    if(originalCtor&&flat.args.length>=mode.sharedParamCount){
      const shared=flat.args.slice(0,mode.sharedParamCount).map(recur);
      const fields=flat.args.slice(mode.sharedParamCount).map(recur);
      const outerArgs=mode.kind==="captured"?shared:[...shared,...mode.fixedIndices.map(t=>instantiateNestedParamContext(t,shared))];
      const outer=mkApps({tag:"const",name:outerName,levels:[...outerLevels]},outerArgs);
      return mkApps({tag:"const",name:originalCtor,levels:[...containerLevels]},[outer,...fields]);
    }
  }
  switch(term.tag){
    case"sort":case"bvar":case"const":return term;
    case"app":return{tag:"app",fn:recur(term.fn),arg:recur(term.arg)};
    case"lam":return{tag:"lam",domain:recur(term.domain),body:recur(term.body),binderInfo:term.binderInfo};
    case"pi":return{tag:"pi",domain:recur(term.domain),body:recur(term.body),binderInfo:term.binderInfo};
    case"let":return{tag:"let",type:recur(term.type),value:recur(term.value),body:recur(term.body),nondep:term.nondep};
    case"proj":return{tag:"proj",typeName:term.typeName===auxName?containerName:term.typeName,index:term.index,expr:recur(term.expr)};
  }
}


type NestedV37Layer={
  containerName:string;
  container:Extract<CoreDeclaration,{kind:"inductive"}>;
  publicParam:Term;
  publicTerm:Term;
  containerIndices:Term[];
  auxName:string;
  ctorRestore:Map<string,string>;
};

/** v37: recognize an exact two-container linear chain `F (G Outer)` (indices allowed). */
function nestedDeepChainV37(env:Environment,term:Term,outerName:string):NestedV37Layer[]|undefined{
  if(containsLooseBVar(term))return undefined;
  const layers:NestedV37Layer[]=[];
  let current=term;
  for(let depth=0;depth<3;depth++){
    const flat=flattenApps(current);
    if(flat.head.tag==="const"&&flat.head.name===outerName&&flat.head.levels.length===0&&flat.args.length===0)
      return layers.length===2?layers:undefined;
    if(flat.head.tag!=="const"||flat.head.levels.length!==0||flat.args.length<1)return undefined;
    const entry=env.get(flat.head.name);
    if(!entry||entry.declaration.kind!=="inductive")return undefined;
    const container=entry.declaration;
    if(container.levelParams.length!==0||container.numParams!==1||flat.args.length!==1+container.numIndices)return undefined;
    const publicParam=flat.args[0];
    layers.push({containerName:flat.head.name,container,publicParam,publicTerm:current,containerIndices:flat.args.slice(1),auxName:"",ctorRestore:new Map()});
    current=publicParam;
  }
  return undefined;
}

/** v38: recognize any closed linear chain `F₁ (F₂ (... (Fₙ Outer)))`, n >= 2. */
function nestedDeepChainV38(env:Environment,term:Term,outerName:string):NestedV37Layer[]|undefined{
  if(containsLooseBVar(term))return undefined;
  const layers:NestedV37Layer[]=[];
  let current=term;
  while(true){
    const flat=flattenApps(current);
    if(flat.head.tag==="const"&&flat.head.name===outerName&&flat.head.levels.length===0&&flat.args.length===0)
      return layers.length>=2?layers:undefined;
    if(flat.head.tag!=="const"||flat.head.levels.length!==0||flat.args.length<1)return undefined;
    const entry=env.get(flat.head.name);
    if(!entry||entry.declaration.kind!=="inductive")return undefined;
    const container=entry.declaration;
    if(container.levelParams.length!==0||container.numParams!==1||flat.args.length!==1+container.numIndices)return undefined;
    const publicParam=flat.args[0];
    layers.push({containerName:flat.head.name,container,publicParam,publicTerm:current,containerIndices:flat.args.slice(1),auxName:"",ctorRestore:new Map()});
    current=publicParam;
  }
}

/** Replace exact public deep-container specializations by their synthetic auxiliary family. */
function rewriteNestedDeepV37(term:Term,layers:readonly NestedV37Layer[]):Term{
  const flat=flattenApps(term);
  if(flat.head.tag==="const"&&flat.head.levels.length===0){
    for(const layer of layers){
      if(flat.head.name!==layer.containerName||flat.args.length!==1+layer.container.numIndices)continue;
      if(!sameTerm(flat.args[0],layer.publicParam))continue;
      return mkApps({tag:"const",name:layer.auxName,levels:[]},flat.args.slice(1).map(a=>rewriteNestedDeepV37(a,layers)));
    }
  }
  switch(term.tag){
    case"sort":case"bvar":case"const":return term;
    case"app":return{tag:"app",fn:rewriteNestedDeepV37(term.fn,layers),arg:rewriteNestedDeepV37(term.arg,layers)};
    case"lam":return{tag:"lam",domain:rewriteNestedDeepV37(term.domain,layers),body:rewriteNestedDeepV37(term.body,layers),binderInfo:term.binderInfo};
    case"pi":return{tag:"pi",domain:rewriteNestedDeepV37(term.domain,layers),body:rewriteNestedDeepV37(term.body,layers),binderInfo:term.binderInfo};
    case"let":return{tag:"let",type:rewriteNestedDeepV37(term.type,layers),value:rewriteNestedDeepV37(term.value,layers),body:rewriteNestedDeepV37(term.body,layers),nondep:term.nondep};
    case"proj":return{tag:"proj",typeName:term.typeName,index:term.index,expr:rewriteNestedDeepV37(term.expr,layers)};
  }
}

/** Restore private v37 auxiliary families/constructors to their public container specializations. */
function restoreNestedDeepV37(term:Term,layers:readonly NestedV37Layer[]):Term{
  const flat=flattenApps(term);
  if(flat.head.tag==="const"&&flat.head.levels.length===0){
    for(const layer of layers){
      if(flat.head.name===layer.auxName&&flat.args.length===layer.container.numIndices){
        const indices=flat.args.map(a=>restoreNestedDeepV37(a,layers));
        return mkApps({tag:"const",name:layer.containerName,levels:[]},[layer.publicParam,...indices]);
      }
      const originalCtor=layer.ctorRestore.get(flat.head.name);
      if(originalCtor){
        const fields=flat.args.map(a=>restoreNestedDeepV37(a,layers));
        return mkApps({tag:"const",name:originalCtor,levels:[]},[layer.publicParam,...fields]);
      }
    }
  }
  switch(term.tag){
    case"sort":case"bvar":case"const":return term;
    case"app":return{tag:"app",fn:restoreNestedDeepV37(term.fn,layers),arg:restoreNestedDeepV37(term.arg,layers)};
    case"lam":return{tag:"lam",domain:restoreNestedDeepV37(term.domain,layers),body:restoreNestedDeepV37(term.body,layers),binderInfo:term.binderInfo};
    case"pi":return{tag:"pi",domain:restoreNestedDeepV37(term.domain,layers),body:restoreNestedDeepV37(term.body,layers),binderInfo:term.binderInfo};
    case"let":return{tag:"let",type:restoreNestedDeepV37(term.type,layers),value:restoreNestedDeepV37(term.value,layers),body:restoreNestedDeepV37(term.body,layers),nondep:term.nondep};
    case"proj":return{tag:"proj",typeName:term.typeName,index:term.index,expr:restoreNestedDeepV37(term.expr,layers)};
  }
}

/**
 * v37 bounded exact two-layer deeper-nested preprocessing.
 *
 * The outer family is parameterless/indexless/monomorphic `Type`; exactly one
 * constructor field is a closed linear chain of two already-checked monomorphic
 * one-parameter containers. Container indices are admitted only when the
 * specialized index telescope is independent of the recursive outer family.
 */
function tryCheckNestedInductiveV37(
  env:Environment,
  decl:Extract<CoreDeclaration,{kind:"inductive"}>,
):CheckedDeclaration|undefined{
  if(decl.levelParams.length!==0||decl.numParams!==0||decl.numIndices!==0)return undefined;
  if(decl.type.tag!=="sort"||!levelDefEq(decl.type.level,levelSucc(LevelZero)))return undefined;

  let deep:{ctorIndex:number;fieldIndex:number;layers:NestedV37Layer[]}|undefined;
  for(let ci=0;ci<decl.constructors.length;ci++){
    const {fields}=splitPi(decl.constructors[ci].type);
    for(let fi=0;fi<fields.length;fi++){
      if(!containsConst(fields[fi],decl.name))continue;
      const layers=nestedDeepChainV37(env,fields[fi],decl.name);
      if(!layers)continue;
      if(deep)throw new KernelError(`${decl.name}: v37 bounded deeper nested slice admits exactly one two-layer nested field`);
      deep={ctorIndex:ci,fieldIndex:fi,layers};
    }
  }
  if(!deep)return undefined;

  validateName(decl.name);validateLevelParams(decl);
  if(env.has(decl.name))throw new KernelError(`duplicate declaration: ${decl.name}`);
  const publicRecursors=[`${decl.name}.rec`,`${decl.name}.rec_1`,`${decl.name}.rec_2`];
  for(const rn of publicRecursors)if(env.has(rn))throw new KernelError(`${decl.name}: nested recursor name already exists`);

  const layers=deep.layers;
  for(let i=0;i<layers.length;i++){
    const layer=layers[i];
    layer.auxName=`_nested.${decl.name}.deepaux${i+1}`;
    if(env.has(layer.auxName)||env.has(`${layer.auxName}.rec`))throw new KernelError(`${decl.name}: internal v37 nested auxiliary name already exists`);
    const ct=layer.container.type;
    if(ct.tag!=="pi")throw new KernelError(`${decl.name}: malformed v37 nested container ${layer.containerName}`);
    const paramSort=kernelWhnf(env,ct.domain);
    if(paramSort.tag!=="sort"||!levelDefEq(paramSort.level,levelSucc(LevelZero)))
      throw new KernelError(`${decl.name}: v37 nested container ${layer.containerName} parameter must be Type`);
    let tail=instantiate(ct.body,layer.publicParam);
    for(let ii=0;ii<layer.container.numIndices;ii++){
      if(tail.tag!=="pi")throw new KernelError(`${decl.name}: v37 nested container ${layer.containerName} index telescope is shorter than numIndices`);
      if(containsConst(tail.domain,decl.name))throw new KernelError(`${decl.name}: v37 rejects container index domains depending on the recursive outer family`);
      tail=tail.body;
    }
    const result=kernelWhnf(env,tail);
    if(result.tag!=="sort"||!levelDefEq(result.level,levelSucc(LevelZero)))
      throw new KernelError(`${decl.name}: v37 nested container ${layer.containerName} must return Type`);
  }

  // Every recursive occurrence outside the selected deep field must be a direct
  // recursive outer field. One-level/multiple nested declarations continue
  // through the already-frozen v33-v36 path when this v37 recognizer returns undefined.
  for(let ci=0;ci<decl.constructors.length;ci++){
    const {fields}=splitPi(decl.constructors[ci].type);
    for(let fi=0;fi<fields.length;fi++){
      const field=fields[fi];if(!containsConst(field,decl.name))continue;
      if(ci===deep.ctorIndex&&fi===deep.fieldIndex)continue;
      const direct=flattenApps(field);
      if(direct.head.tag==="const"&&direct.head.name===decl.name&&direct.head.levels.length===0&&direct.args.length===0)continue;
      throw new KernelError(`${decl.constructors[ci].name}: v37 bounded deeper nested slice only admits direct recursion plus one closed two-layer nested field`);
    }
  }

  const syntheticOuterCtors=decl.constructors.map((ctor,ci)=>{
    const {fields,fieldBinderInfo,result}=splitPi(ctor.type);
    const rewritten=fields.map((field,fi)=>ci===deep!.ctorIndex&&fi===deep!.fieldIndex
      ?mkApps({tag:"const",name:layers[0].auxName,levels:[]},layers[0].containerIndices)
      :field);
    return{name:ctor.name,type:rebuildPi(rewritten,fieldBinderInfo,result)};
  });

  const syntheticAuxMembers:Extract<CoreDeclaration,{kind:"mutualInductive"}>["inductives"]=layers.map(layer=>{
    const ctors=layer.container.constructors.map((ctor,index)=>{
      if(ctor.type.tag!=="pi")throw new KernelError(`${decl.name}: malformed nested-container constructor ${ctor.name}`);
      const syntheticName=`${layer.auxName}.ctor${index}`;layer.ctorRestore.set(syntheticName,ctor.name);
      const specialized=instantiate(ctor.type.body,layer.publicParam);
      return{name:syntheticName,type:rewriteNestedDeepV37(specialized,layers)};
    });
    const containerType=layer.container.type;
    if(containerType.tag!=="pi")throw new KernelError(`${decl.name}: malformed nested-container type ${layer.containerName}`);
    const auxType=instantiate(containerType.body,layer.publicParam);
    return{name:layer.auxName,type:auxType,numParams:0,numIndices:layer.container.numIndices,constructors:ctors};
  });

  const synthetic:Extract<CoreDeclaration,{kind:"mutualInductive"}>={
    kind:"mutualInductive",name:`_nested.${decl.name}.deepblock`,levelParams:[],inductives:[
      {name:decl.name,type:decl.type,numParams:0,numIndices:0,constructors:syntheticOuterCtors},
      ...syntheticAuxMembers,
    ],
  };
  const transformed=env.clone();checkDirectMutualInductive(transformed,synthetic);
  const syntheticNames=[decl.name,...layers.map(l=>l.auxName)];
  const targetRecursor=new Map<string,string>(syntheticNames.map((n,i)=>[n,publicRecursors[i]]));
  const helperEntries=syntheticNames.map(n=>{
    const e=transformed.get(`${n}.rec`);
    if(!e||e.declaration.kind!=="recursor")throw new KernelError(`${decl.name}: internal v37 nested preprocessing did not generate recursor for ${n}`);
    return e.declaration;
  });

  const restoreRecursor=(entry:Extract<EnvironmentDeclaration,{kind:"recursor"}>,ri:number):Extract<EnvironmentDeclaration,{kind:"recursor"}>=>{
    const helper=ri>0;const layer=helper?layers[ri-1]:undefined;
    const rules=entry.metadata.rules.map(rule=>({
      ...rule,
      ctor:helper?(layer!.ctorRestore.get(rule.ctor)??rule.ctor):rule.ctor,
      recursiveFieldTypes:rule.recursiveFieldTypes?.map(t=>t?restoreNestedDeepV37(t,layers):null),
      recursiveTargets:rule.recursiveTargets?.map(()=>null),
      recursiveRecursors:rule.recursiveTargets?.map(target=>target?targetRecursor.get(target)??null:null),
      ...(helper?{ctorParamCount:1}:{}),
    }));
    return{kind:"recursor",name:publicRecursors[ri],levelParams:[...entry.levelParams],type:restoreNestedDeepV37(entry.type,layers),metadata:{...entry.metadata,inductive:decl.name,rules,mutual:{inductives:syntheticNames,motiveCount:syntheticNames.length,recursors:publicRecursors,indexCounts:[0,...layers.map(l=>l.container.numIndices)]}}};
  };
  const recursors=helperEntries.map(restoreRecursor);

  const assumptions=dependencyAssumptions(transformed,[decl.type,...decl.constructors.map(c=>c.type)]);
  const generated=[...decl.constructors.map(c=>c.name),...publicRecursors];
  const final=env.clone();final.add({declaration:decl,assumptions,generated});
  for(const ctor of decl.constructors){
    const ctorSort=kernelWhnf(final,infer(final,[],ctor.type));
    if(ctorSort.tag!=="sort")throw new KernelError(`${ctor.name}: restored v37 nested constructor type is not a type`);
    final.add({declaration:{kind:"constructor",name:ctor.name,levelParams:[],type:ctor.type,inductive:decl.name},assumptions:dependencyAssumptions(final,[ctor.type]),generated:[]});
  }
  for(const rec of recursors){
    const recSort=kernelWhnf(final,infer(final,[],rec.type));
    if(recSort.tag!=="sort")throw new KernelError(`${rec.name}: restored v37 nested recursor type is not a type`);
    final.add({declaration:rec,assumptions:dependencyAssumptions(final,[rec.type]),generated:[]});
  }
  env.replaceWith(final);
  return{declaration:decl,assumptions,generated};
}




type NestedV41Layer={
  containerName:string;
  containerLevels:Level[];
  container:Extract<CoreDeclaration,{kind:"inductive"}>;
  publicParam:Term;
  publicTerm:Term;
  containerIndices:Term[];
  auxName:string;
  ctorRestore:Map<string,string>;
};

type NestedV41Chain={layers:NestedV41Layer[];outerArgs:Term[]};

/** v41: level-aware arbitrary-depth chain ending in the exact outer universe instantiation. */
function nestedDeepChainV41(
  env:Environment,term:Term,outerName:string,outerLevels:readonly Level[],ctx:Context,expectedPrefix:readonly Term[],totalOuterArgs:number,
):NestedV41Chain|undefined{
  const layers:NestedV41Layer[]=[];let current=term;
  while(true){
    const flat=flattenApps(current);
    if(flat.head.tag==="const"&&flat.head.name===outerName&&levelsDefEq(flat.head.levels,outerLevels)&&flat.args.length===totalOuterArgs){
      if(expectedPrefix.length>flat.args.length||!expectedPrefix.every((a,i)=>defEq(env,ctx,flat.args[i],a)))return undefined;
      return layers.length>=2?{layers,outerArgs:[...flat.args]}:undefined;
    }
    if(flat.head.tag!=="const"||flat.args.length<1)return undefined;
    const entry=env.get(flat.head.name);if(!entry||entry.declaration.kind!=="inductive")return undefined;
    const container=entry.declaration;
    if(container.numParams!==1||flat.head.levels.length!==container.levelParams.length||flat.args.length!==1+container.numIndices)return undefined;
    const publicParam=flat.args[0];
    layers.push({containerName:flat.head.name,containerLevels:[...flat.head.levels],container,publicParam,publicTerm:current,containerIndices:flat.args.slice(1),auxName:"",ctorRestore:new Map()});
    current=publicParam;
  }
}

/** v41 helper rewrite: universe parameters live on the private helper family; container levels stay explicit public data. */
function rewriteNestedDeepV41(
  term:Term,layers:readonly NestedV41Layer[],sharedParamCount:number,selfLevels:readonly Level[],depth=0,
):Term{
  const flat=flattenApps(term);
  if(flat.head.tag==="const"){
    const shared=Array.from({length:sharedParamCount},(_,i)=>({tag:"bvar",index:depth+sharedParamCount-1-i} as Term));
    for(const layer of layers){
      if(flat.head.name!==layer.containerName||!levelsDefEq(flat.head.levels,layer.containerLevels)||flat.args.length!==1+layer.container.numIndices)continue;
      const expected=instantiateNestedParamContext(layer.publicParam,shared);
      if(!sameTerm(flat.args[0],expected))continue;
      return mkApps({tag:"const",name:layer.auxName,levels:[...selfLevels]},[
        ...shared,...flat.args.slice(1).map(a=>rewriteNestedDeepV41(a,layers,sharedParamCount,selfLevels,depth)),
      ]);
    }
  }
  switch(term.tag){
    case"sort":case"bvar":case"const":return term;
    case"app":return{tag:"app",fn:rewriteNestedDeepV41(term.fn,layers,sharedParamCount,selfLevels,depth),arg:rewriteNestedDeepV41(term.arg,layers,sharedParamCount,selfLevels,depth)};
    case"lam":return{tag:"lam",domain:rewriteNestedDeepV41(term.domain,layers,sharedParamCount,selfLevels,depth),body:rewriteNestedDeepV41(term.body,layers,sharedParamCount,selfLevels,depth+1),binderInfo:term.binderInfo};
    case"pi":return{tag:"pi",domain:rewriteNestedDeepV41(term.domain,layers,sharedParamCount,selfLevels,depth),body:rewriteNestedDeepV41(term.body,layers,sharedParamCount,selfLevels,depth+1),binderInfo:term.binderInfo};
    case"let":return{tag:"let",type:rewriteNestedDeepV41(term.type,layers,sharedParamCount,selfLevels,depth),value:rewriteNestedDeepV41(term.value,layers,sharedParamCount,selfLevels,depth),body:rewriteNestedDeepV41(term.body,layers,sharedParamCount,selfLevels,depth+1),nondep:term.nondep};
    case"proj":return{tag:"proj",typeName:term.typeName,index:term.index,expr:rewriteNestedDeepV41(term.expr,layers,sharedParamCount,selfLevels,depth)};
  }
}

/** Restore private v41 helpers to explicitly universe-instantiated public container terms. */
function restoreNestedDeepV41(term:Term,layers:readonly NestedV41Layer[],sharedParamCount:number,selfLevels:readonly Level[]):Term{
  const flat=flattenApps(term);
  if(flat.head.tag==="const"){
    for(const layer of layers){
      if(flat.head.name===layer.auxName&&levelsDefEq(flat.head.levels,selfLevels)&&flat.args.length===sharedParamCount+layer.container.numIndices){
        const shared=flat.args.slice(0,sharedParamCount).map(a=>restoreNestedDeepV41(a,layers,sharedParamCount,selfLevels));
        const indices=flat.args.slice(sharedParamCount).map(a=>restoreNestedDeepV41(a,layers,sharedParamCount,selfLevels));
        const publicParam=restoreNestedDeepV41(instantiateNestedParamContext(layer.publicParam,shared),layers,sharedParamCount,selfLevels);
        return mkApps({tag:"const",name:layer.containerName,levels:[...layer.containerLevels]},[publicParam,...indices]);
      }
      const originalCtor=layer.ctorRestore.get(flat.head.name);
      if(originalCtor&&flat.args.length>=sharedParamCount){
        const shared=flat.args.slice(0,sharedParamCount).map(a=>restoreNestedDeepV41(a,layers,sharedParamCount,selfLevels));
        const fields=flat.args.slice(sharedParamCount).map(a=>restoreNestedDeepV41(a,layers,sharedParamCount,selfLevels));
        const publicParam=restoreNestedDeepV41(instantiateNestedParamContext(layer.publicParam,shared),layers,sharedParamCount,selfLevels);
        return mkApps({tag:"const",name:originalCtor,levels:[...layer.containerLevels]},[publicParam,...fields]);
      }
    }
  }
  switch(term.tag){
    case"sort":case"bvar":case"const":return term;
    case"app":return{tag:"app",fn:restoreNestedDeepV41(term.fn,layers,sharedParamCount,selfLevels),arg:restoreNestedDeepV41(term.arg,layers,sharedParamCount,selfLevels)};
    case"lam":return{tag:"lam",domain:restoreNestedDeepV41(term.domain,layers,sharedParamCount,selfLevels),body:restoreNestedDeepV41(term.body,layers,sharedParamCount,selfLevels),binderInfo:term.binderInfo};
    case"pi":return{tag:"pi",domain:restoreNestedDeepV41(term.domain,layers,sharedParamCount,selfLevels),body:restoreNestedDeepV41(term.body,layers,sharedParamCount,selfLevels),binderInfo:term.binderInfo};
    case"let":return{tag:"let",type:restoreNestedDeepV41(term.type,layers,sharedParamCount,selfLevels),value:restoreNestedDeepV41(term.value,layers,sharedParamCount,selfLevels),body:restoreNestedDeepV41(term.body,layers,sharedParamCount,selfLevels),nondep:term.nondep};
    case"proj":return{tag:"proj",typeName:term.typeName,index:term.index,expr:restoreNestedDeepV41(term.expr,layers,sharedParamCount,selfLevels)};
  }
}


type NestedV42Occurrence={
  ctorIndex:number;fieldIndex:number;projected:Term;layers:NestedV41Layer[];kind:"closed"|"captured";outerArgs:Term[];specIndex?:number;
};

/** v42 chain recognizer: v41 semantics, but depth one is also a graph node so mixed-depth fields compose. */
function nestedDeepChainV42(
  env:Environment,term:Term,outerName:string,outerLevels:readonly Level[],ctx:Context,expectedPrefix:readonly Term[],totalOuterArgs:number,
):NestedV41Chain|undefined{
  const layers:NestedV41Layer[]=[];let current=term;
  while(true){
    const flat=flattenApps(current);
    if(flat.head.tag==="const"&&flat.head.name===outerName&&levelsDefEq(flat.head.levels,outerLevels)&&flat.args.length===totalOuterArgs){
      if(expectedPrefix.length>flat.args.length||!expectedPrefix.every((a,i)=>defEq(env,ctx,flat.args[i],a)))return undefined;
      return layers.length>=1?{layers,outerArgs:[...flat.args]}:undefined;
    }
    if(flat.head.tag!=="const"||flat.args.length<1)return undefined;
    const entry=env.get(flat.head.name);if(!entry||entry.declaration.kind!=="inductive")return undefined;
    const container=entry.declaration;
    if(container.numParams!==1||flat.head.levels.length!==container.levelParams.length||flat.args.length!==1+container.numIndices)return undefined;
    const publicParam=flat.args[0];
    layers.push({containerName:flat.head.name,containerLevels:[...flat.head.levels],container,publicParam,publicTerm:current,containerIndices:flat.args.slice(1),auxName:"",ctorRestore:new Map()});
    current=publicParam;
  }
}

/** Unique nested specialization lookup in the common shared parameter context. */
function nestedV42SameSpec(env:Environment,ctx:Context,a:NestedV41Layer,b:NestedV41Layer):boolean{
  return a.containerName===b.containerName&&levelsDefEq(a.containerLevels,b.containerLevels)&&a.container.numIndices===b.container.numIndices&&defEq(env,ctx,a.publicTerm,b.publicTerm);
}

/**
 * v42: multiple compatible nested fields via a deduplicated specialization graph.
 *
 * Direct nested field specializations are seeded in constructor/field order. Their
 * inner dependencies are then added breadth-first, also in first-occurrence order.
 * This reproduces Lean 4.33.1 helper/motive ordering, reuses identical helpers,
 * shares prefixes, and supports different container chains/specializations.  All
 * occurrences must use one outer-index regime (closed/fixed or captured/promoted),
 * matching Lean's rejection of mixed local/fixed nested parameters.
 */


type NestedV45Spec={
  containerName:string;
  containerLevels:Level[];
  container:Extract<CoreDeclaration,{kind:"inductive"}>;
  publicParams:Term[];
  publicTerm:Term;
  sampleIndices:Term[];
  auxName:string;
  ctorRestore:Map<string,string>;
};
type NestedV45Occurrence={ctorIndex:number;fieldIndex:number;projected:Term;specIndex?:number};

function parseNestedV45Spec(env:Environment,term:Term,outerName:string):NestedV45Spec|undefined{
  const flat=flattenApps(term);if(flat.head.tag!=="const")return undefined;
  const entry=env.get(flat.head.name);if(!entry||entry.declaration.kind!=="inductive")return undefined;
  const container=entry.declaration;
  if(container.numParams<1||flat.head.levels.length!==container.levelParams.length||flat.args.length!==container.numParams+container.numIndices)return undefined;
  const publicParams=flat.args.slice(0,container.numParams);
  if(!publicParams.some(a=>containsConst(a,outerName)))return undefined;
  return{containerName:flat.head.name,containerLevels:[...flat.head.levels],container,publicParams:[...publicParams],publicTerm:term,sampleIndices:flat.args.slice(container.numParams),auxName:"",ctorRestore:new Map()};
}

function v45OuterLeaf(
  env:Environment,ctx:Context,term:Term,outerName:string,selfLevels:readonly Level[],expectedPrefix:readonly Term[],totalOuterArgs:number,
):boolean{
  const flat=flattenApps(term);
  return flat.head.tag==="const"&&flat.head.name===outerName&&levelsDefEq(flat.head.levels,selfLevels)&&flat.args.length===totalOuterArgs&&
    expectedPrefix.every((a,i)=>defEq(env,ctx,flat.args[i],a));
}

/** v45 helper identity is the specialized parameter vector; container indices remain a family telescope. */
function nestedV45SameSpec(env:Environment,ctx:Context,a:NestedV45Spec,b:NestedV45Spec):boolean{
  return a.containerName===b.containerName&&levelsDefEq(a.containerLevels,b.containerLevels)&&a.container.numParams===b.container.numParams&&
    a.container.numIndices===b.container.numIndices&&a.publicParams.length===b.publicParams.length&&a.publicParams.every((p,i)=>defEq(env,ctx,p,b.publicParams[i]));
}

function rewriteNestedV45(term:Term,specs:readonly NestedV45Spec[],sharedParamCount:number,selfLevels:readonly Level[],depth=0):Term{
  const flat=flattenApps(term);
  if(flat.head.tag==="const"){
    const shared=Array.from({length:sharedParamCount},(_,i)=>({tag:"bvar",index:depth+sharedParamCount-1-i} as Term));
    for(const sp of specs){
      if(flat.head.name!==sp.containerName||!levelsDefEq(flat.head.levels,sp.containerLevels)||flat.args.length!==sp.container.numParams+sp.container.numIndices)continue;
      const expected=sp.publicParams.map(p=>instantiateNestedParamContext(p,shared));
      if(!expected.every((p,i)=>sameTerm(flat.args[i],p)))continue;
      return mkApps({tag:"const",name:sp.auxName,levels:[...selfLevels]},[
        ...shared,...flat.args.slice(sp.container.numParams).map(a=>rewriteNestedV45(a,specs,sharedParamCount,selfLevels,depth)),
      ]);
    }
  }
  switch(term.tag){
    case"sort":case"bvar":case"const":return term;
    case"app":return{tag:"app",fn:rewriteNestedV45(term.fn,specs,sharedParamCount,selfLevels,depth),arg:rewriteNestedV45(term.arg,specs,sharedParamCount,selfLevels,depth)};
    case"lam":return{tag:"lam",domain:rewriteNestedV45(term.domain,specs,sharedParamCount,selfLevels,depth),body:rewriteNestedV45(term.body,specs,sharedParamCount,selfLevels,depth+1),binderInfo:term.binderInfo};
    case"pi":return{tag:"pi",domain:rewriteNestedV45(term.domain,specs,sharedParamCount,selfLevels,depth),body:rewriteNestedV45(term.body,specs,sharedParamCount,selfLevels,depth+1),binderInfo:term.binderInfo};
    case"let":return{tag:"let",type:rewriteNestedV45(term.type,specs,sharedParamCount,selfLevels,depth),value:rewriteNestedV45(term.value,specs,sharedParamCount,selfLevels,depth),body:rewriteNestedV45(term.body,specs,sharedParamCount,selfLevels,depth+1),nondep:term.nondep};
    case"proj":return{tag:"proj",typeName:term.typeName,index:term.index,expr:rewriteNestedV45(term.expr,specs,sharedParamCount,selfLevels,depth)};
  }
}

function restoreNestedV45(term:Term,specs:readonly NestedV45Spec[],sharedParamCount:number,selfLevels:readonly Level[]):Term{
  const flat=flattenApps(term);
  if(flat.head.tag==="const"){
    for(const sp of specs){
      if(flat.head.name===sp.auxName&&levelsDefEq(flat.head.levels,selfLevels)&&flat.args.length===sharedParamCount+sp.container.numIndices){
        const shared=flat.args.slice(0,sharedParamCount).map(a=>restoreNestedV45(a,specs,sharedParamCount,selfLevels));
        const indices=flat.args.slice(sharedParamCount).map(a=>restoreNestedV45(a,specs,sharedParamCount,selfLevels));
        const params=sp.publicParams.map(p=>restoreNestedV45(instantiateNestedParamContext(p,shared),specs,sharedParamCount,selfLevels));
        return mkApps({tag:"const",name:sp.containerName,levels:[...sp.containerLevels]},[...params,...indices]);
      }
      const original=sp.ctorRestore.get(flat.head.name);
      if(original&&flat.args.length>=sharedParamCount){
        const shared=flat.args.slice(0,sharedParamCount).map(a=>restoreNestedV45(a,specs,sharedParamCount,selfLevels));
        const fields=flat.args.slice(sharedParamCount).map(a=>restoreNestedV45(a,specs,sharedParamCount,selfLevels));
        const params=sp.publicParams.map(p=>restoreNestedV45(instantiateNestedParamContext(p,shared),specs,sharedParamCount,selfLevels));
        return mkApps({tag:"const",name:original,levels:[...sp.containerLevels]},[...params,...fields]);
      }
    }
  }
  switch(term.tag){
    case"sort":case"bvar":case"const":return term;
    case"app":return{tag:"app",fn:restoreNestedV45(term.fn,specs,sharedParamCount,selfLevels),arg:restoreNestedV45(term.arg,specs,sharedParamCount,selfLevels)};
    case"lam":return{tag:"lam",domain:restoreNestedV45(term.domain,specs,sharedParamCount,selfLevels),body:restoreNestedV45(term.body,specs,sharedParamCount,selfLevels),binderInfo:term.binderInfo};
    case"pi":return{tag:"pi",domain:restoreNestedV45(term.domain,specs,sharedParamCount,selfLevels),body:restoreNestedV45(term.body,specs,sharedParamCount,selfLevels),binderInfo:term.binderInfo};
    case"let":return{tag:"let",type:restoreNestedV45(term.type,specs,sharedParamCount,selfLevels),value:restoreNestedV45(term.value,specs,sharedParamCount,selfLevels),body:restoreNestedV45(term.body,specs,sharedParamCount,selfLevels),nondep:term.nondep};
    case"proj":return{tag:"proj",typeName:specs.some(sp=>sp.auxName===term.typeName)?(specs.find(sp=>sp.auxName===term.typeName)?.containerName??term.typeName):term.typeName,index:term.index,expr:restoreNestedV45(term.expr,specs,sharedParamCount,selfLevels)};
  }
}

function instantiateV45Params(type:Term,params:readonly Term[],label:string):Term{
  let t=type;
  for(const p of params){if(t.tag!=="pi")throw new KernelError(`${label}: parameter telescope shorter than declared parameter count`);t=instantiate(t.body,p);}
  return t;
}

function validateNestedV45Spec(
  env:Environment,decl:Extract<CoreDeclaration,{kind:"inductive"}>,sp:NestedV45Spec,sharedCtx:Context,outerTail:Extract<Term,{tag:"sort"}>,allowDependentContainerParameters=false,
):void{
  const milestone=allowDependentContainerParameters?"v46":"v45";
  const validationEnv=allowDependentContainerParameters?env.clone():env;
  if(allowDependentContainerParameters&&!validationEnv.has(decl.name))validationEnv.add({declaration:{kind:"axiom",name:decl.name,levelParams:[...decl.levelParams],type:decl.type},assumptions:new Set(),generated:[]});
  if(sp.containerLevels.length!==sp.container.levelParams.length)throw new KernelError(`${decl.name}: ${milestone} nested container ${sp.containerName} universe arity mismatch`);
  let t=instantiateTermLevels(sp.container.type,sp.container.levelParams,sp.containerLevels);
  for(let pi=0;pi<sp.container.numParams;pi++){
    if(t.tag!=="pi")throw new KernelError(`${decl.name}: malformed v45 parameter telescope for ${sp.containerName}`);
    const p=sp.publicParams[pi];
    if(allowDependentContainerParameters){
      const actual=infer(validationEnv,sharedCtx,p);
      if(!defEq(validationEnv,sharedCtx,actual,t.domain))throw new KernelError(`${decl.name}: v46 nested container ${sp.containerName} dependent parameter ${pi} type mismatch`);
    }else if(containsConst(p,decl.name)){
      const dom=kernelWhnfIn(env,sharedCtx,t.domain);
      if(dom.tag!=="sort"||!levelDefEq(dom.level,outerTail.level))throw new KernelError(`${decl.name}: v45 recursive nested parameter ${pi} of ${sp.containerName} must inhabit the outer family universe`);
    }else{
      const actual=infer(env,sharedCtx,p);
      if(!defEq(env,sharedCtx,actual,t.domain))throw new KernelError(`${decl.name}: v45 nested container ${sp.containerName} parameter ${pi} type mismatch`);
    }
    t=instantiate(t.body,p);
  }
  if(sp.sampleIndices.length!==sp.container.numIndices)throw new KernelError(`${decl.name}: v45 nested container ${sp.containerName} index arity mismatch`);
  for(let ii=0;ii<sp.container.numIndices;ii++){
    if(t.tag!=="pi")throw new KernelError(`${decl.name}: v45 nested container ${sp.containerName} index telescope is shorter than numIndices`);
    const idx=sp.sampleIndices[ii];
    if(containsConst(t.domain,decl.name)||containsConst(idx,decl.name))throw new KernelError(`${decl.name}: v45 rejects container index domains/arguments depending on the recursive outer family`);
    const actual=infer(validationEnv,sharedCtx,idx);if(!defEq(validationEnv,sharedCtx,actual,t.domain))throw new KernelError(`${decl.name}: ${milestone} nested container ${sp.containerName} index ${ii} type mismatch`);
    t=instantiate(t.body,idx);
  }
  const result=kernelWhnfIn(validationEnv,sharedCtx,t);
  if(result.tag!=="sort"||!levelDefEq(result.level,outerTail.level))throw new KernelError(`${decl.name}: ${milestone} nested container ${sp.containerName} result universe must match the outer family universe`);
}


/**
 * v46 recursively discovers recursive nested specializations inside dependent
 * container parameter terms. Terms under binders are projected back to the
 * shared outer-parameter context before becoming helper identities. A helper
 * specialization that actually depends on a binder local remains rejected,
 * matching Lean's nested-parameter local-variable restriction.
 */
function collectNestedV46ParamSpecs(
  env:Environment,decl:Extract<CoreDeclaration,{kind:"inductive"}>,term:Term,sharedCtx:Context,selfLevels:readonly Level[],expectedPrefix:readonly Term[],totalOuterArgs:number,
  emit:(sp:NestedV45Spec)=>void,depth=0,
):void{
  if(!containsConst(term,decl.name))return;
  const rawSpec=parseNestedV45Spec(env,term,decl.name);
  if(rawSpec){
    const projected=projectNestedIndexToParamContext(term,depth);
    if(!projected)throw new KernelError(`${decl.name}: v46 nested dependent parameter specialization cannot depend on a parameter-local binder`);
    const sp=parseNestedV45Spec(env,projected,decl.name);
    if(!sp)throw new KernelError(`${decl.name}: v46 failed to project a dependent nested specialization into the shared parameter context`);
    emit(sp);return;
  }
  const projected=projectNestedIndexToParamContext(term,depth);
  if(projected){
    const flat=flattenApps(projected);
    if(flat.head.tag==="const"&&flat.head.name===decl.name){
      if(!levelsDefEq(flat.head.levels,selfLevels)||flat.args.length!==totalOuterArgs||!expectedPrefix.every((a,i)=>defEq(env,sharedCtx,flat.args[i],a)))
        throw new KernelError(`${decl.name}: v46 dependent nested parameter contains a nonuniform recursive outer occurrence`);
      return;
    }
  }
  switch(term.tag){
    case"sort":case"bvar":case"const":return;
    case"app":collectNestedV46ParamSpecs(env,decl,term.fn,sharedCtx,selfLevels,expectedPrefix,totalOuterArgs,emit,depth);collectNestedV46ParamSpecs(env,decl,term.arg,sharedCtx,selfLevels,expectedPrefix,totalOuterArgs,emit,depth);return;
    case"lam":case"pi":collectNestedV46ParamSpecs(env,decl,term.domain,sharedCtx,selfLevels,expectedPrefix,totalOuterArgs,emit,depth);collectNestedV46ParamSpecs(env,decl,term.body,sharedCtx,selfLevels,expectedPrefix,totalOuterArgs,emit,depth+1);return;
    case"let":collectNestedV46ParamSpecs(env,decl,term.type,sharedCtx,selfLevels,expectedPrefix,totalOuterArgs,emit,depth);collectNestedV46ParamSpecs(env,decl,term.value,sharedCtx,selfLevels,expectedPrefix,totalOuterArgs,emit,depth);collectNestedV46ParamSpecs(env,decl,term.body,sharedCtx,selfLevels,expectedPrefix,totalOuterArgs,emit,depth+1);return;
    case"proj":collectNestedV46ParamSpecs(env,decl,term.expr,sharedCtx,selfLevels,expectedPrefix,totalOuterArgs,emit,depth);return;
  }
}

/**
 * v45 generalized multi-parameter nested specialization graph.
 *
 * This composes v44 parameter vectors with the v41-v43 shared-parameter,
 * fixed-index, explicit-universe, indexed-container and Prop machinery.  Exact
 * Lean 4.33.1 rejects constructor-local captured/promoted outer indices once a
 * multi-parameter nested container is involved, so this path deliberately uses
 * only the closed/fixed outer-index regime. One helper is keyed by the complete
 * specialized container parameter vector; its own indices remain a full family
 * telescope and therefore do not split helpers by index value.
 */
function tryCheckNestedInductiveV45(env:Environment,decl:Extract<CoreDeclaration,{kind:"inductive"}>,allowDependentContainerParameters=false):CheckedDeclaration|undefined{
  const selfLevels=decl.levelParams.map(name=>({tag:"param",name} as Level));
  const totalOuterArgs=decl.numParams+decl.numIndices;
  let outerTail=decl.type;
  for(let p=0;p<totalOuterArgs;p++){if(outerTail.tag!=="pi")return undefined;outerTail=outerTail.body;}
  if(outerTail.tag!=="sort")return undefined;
  const paramPrefix=nestedOuterPrefixContextV40(decl,decl.numParams),sharedCtx=paramPrefix.ctx,sharedParamCount=decl.numParams;

  const occurrences:NestedV45Occurrence[]=[];
  for(let ci=0;ci<decl.constructors.length;ci++){
    const {fields}=splitPi(decl.constructors[ci].type);
    for(let fi=decl.numParams;fi<fields.length;fi++){
      const field=fields[fi];if(!containsConst(field,decl.name))continue;
      const direct=flattenApps(field);
      if(direct.head.tag==="const"&&direct.head.name===decl.name&&levelsDefEq(direct.head.levels,selfLevels)&&direct.args.length===totalOuterArgs)continue;
      const projected=projectNestedIndexToParamContext(field,fi-decl.numParams);if(!projected)continue;
      const sp=parseNestedV45Spec(env,projected,decl.name);if(sp)occurrences.push({ctorIndex:ci,fieldIndex:fi,projected});
    }
  }
  if(occurrences.length===0)return undefined;

  const specs:NestedV45Spec[]=[];let sawMulti=false;
  const addSpec=(candidate:NestedV45Spec):{index:number;fresh:boolean}=>{
    validateNestedV45Spec(env,decl,candidate,sharedCtx,outerTail as Extract<Term,{tag:"sort"}>,allowDependentContainerParameters);
    for(let i=0;i<specs.length;i++)if(nestedV45SameSpec(env,sharedCtx,candidate,specs[i]))return{index:i,fresh:false};
    const copy:NestedV45Spec={...candidate,containerLevels:[...candidate.containerLevels],publicParams:[...candidate.publicParams],sampleIndices:[...candidate.sampleIndices],auxName:"",ctorRestore:new Map()};
    if(copy.container.numParams>=2)sawMulti=true;specs.push(copy);return{index:specs.length-1,fresh:true};
  };

  let frontier:NestedV45Spec[]=[];
  for(const o of occurrences){const sp=parseNestedV45Spec(env,o.projected,decl.name)!;const a=addSpec(sp);o.specIndex=a.index;if(a.fresh)frontier.push(specs[a.index]);}
  while(frontier.length){
    const next:NestedV45Spec[]=[];
    for(const sp of frontier)for(const param of sp.publicParams){
      if(!containsConst(param,decl.name))continue;
      if(allowDependentContainerParameters){
        collectNestedV46ParamSpecs(env,decl,param,sharedCtx,selfLevels,paramPrefix.args,totalOuterArgs,(child)=>{const a=addSpec(child);if(a.fresh)next.push(specs[a.index]);});
        continue;
      }
      if(v45OuterLeaf(env,sharedCtx,param,decl.name,selfLevels,paramPrefix.args,totalOuterArgs))continue;
      const child=parseNestedV45Spec(env,param,decl.name);
      if(!child)throw new KernelError(`${decl.name}: v45 recursive nested parameter is neither the uniform outer family nor a checked nested container specialization`);
      const a=addSpec(child);if(a.fresh)next.push(specs[a.index]);
    }
    frontier=next;
  }
  if(!sawMulti)return undefined; // v43 remains authority for the one-parameter graph.

  const occurrenceAt=new Map<string,NestedV45Occurrence>();for(const o of occurrences)occurrenceAt.set(`${o.ctorIndex}:${o.fieldIndex}`,o);
  for(let ci=0;ci<decl.constructors.length;ci++){
    const {fields}=splitPi(decl.constructors[ci].type);
    for(let fi=decl.numParams;fi<fields.length;fi++){
      const field=fields[fi];if(!containsConst(field,decl.name))continue;
      const direct=flattenApps(field);
      if(direct.head.tag==="const"&&direct.head.name===decl.name&&levelsDefEq(direct.head.levels,selfLevels)&&direct.args.length===totalOuterArgs)continue;
      if(occurrenceAt.has(`${ci}:${fi}`))continue;
      throw new KernelError(`${decl.constructors[ci].name}: v45 multi-parameter nested graph only admits direct recursion or fixed/parameter-context nested specializations; constructor-local captured indices are rejected by Lean`);
    }
  }

  validateName(decl.name);validateLevelParams(decl);if(env.has(decl.name))throw new KernelError(`duplicate declaration: ${decl.name}`);
  const publicRecursors=[`${decl.name}.rec`,...specs.map((_,i)=>`${decl.name}.rec_${i+1}`)];for(const rn of publicRecursors)if(env.has(rn))throw new KernelError(`${decl.name}: nested recursor name already exists`);

  for(let i=0;i<specs.length;i++){
    const sp=specs[i];sp.auxName=`_nested.${decl.name}.${allowDependentContainerParameters?"deepdependentparamaux":"deepmultiparamgenaux"}${i+1}`;
    if(env.has(sp.auxName)||env.has(`${sp.auxName}.rec`))throw new KernelError(`${decl.name}: internal ${allowDependentContainerParameters?"v46":"v45"} nested auxiliary name already exists`);
  }

  const syntheticOuterCtors=decl.constructors.map((ctor,ci)=>{
    const {fields,fieldBinderInfo,result}=splitPi(ctor.type);
    const rewritten=fields.map((field,fi)=>{
      const occ=occurrenceAt.get(`${ci}:${fi}`);if(!occ)return field;
      const sp=specs[occ.specIndex!],extraLocals=fi-sharedParamCount;if(extraLocals<0)throw new KernelError(`${decl.name}: v45 nested field occurs before complete outer parameter telescope`);
      const shared=Array.from({length:sharedParamCount},(_,i)=>({tag:"bvar",index:extraLocals+sharedParamCount-1-i} as Term));
      const flat=flattenApps(field);
      return mkApps({tag:"const",name:sp.auxName,levels:[...selfLevels]},[...shared,...flat.args.slice(sp.container.numParams)]);
    });
    return{name:ctor.name,type:rebuildPi(rewritten,fieldBinderInfo,result)};
  });

  const syntheticAuxMembers:Extract<CoreDeclaration,{kind:"mutualInductive"}>["inductives"]=specs.map(sp=>{
    const instantiatedContainerType=instantiateTermLevels(sp.container.type,sp.container.levelParams,sp.containerLevels);
    const ctors=sp.container.constructors.map((ctor,index)=>{
      const instantiatedCtorType=instantiateTermLevels(ctor.type,sp.container.levelParams,sp.containerLevels);
      const syntheticName=`${sp.auxName}.ctor${index}`;sp.ctorRestore.set(syntheticName,ctor.name);
      const specialized=instantiateV45Params(instantiatedCtorType,sp.publicParams,`${decl.name}: ${ctor.name}`);
      const rewritten=rewriteNestedV45(specialized,specs,sharedParamCount,selfLevels);
      return{name:syntheticName,type:prependPiTelescope(decl.type,sharedParamCount,rewritten)};
    });
    const auxTail=instantiateV45Params(instantiatedContainerType,sp.publicParams,`${decl.name}: ${sp.containerName}`);
    return{name:sp.auxName,type:prependPiTelescope(decl.type,sharedParamCount,auxTail),numParams:sharedParamCount,numIndices:sp.container.numIndices,constructors:ctors};
  });

  const synthetic:Extract<CoreDeclaration,{kind:"mutualInductive"}>={kind:"mutualInductive",name:`_nested.${decl.name}.${allowDependentContainerParameters?"deepdependentparamblock":"deepmultiparamgenblock"}`,levelParams:[...decl.levelParams],inductives:[
    {name:decl.name,type:decl.type,numParams:decl.numParams,numIndices:decl.numIndices,constructors:syntheticOuterCtors},...syntheticAuxMembers,
  ]};
  const transformed=env.clone();checkDirectMutualInductive(transformed,synthetic);
  const syntheticNames=[decl.name,...specs.map(s=>s.auxName)],targetRecursor=new Map<string,string>(syntheticNames.map((n,i)=>[n,publicRecursors[i]]));
  const helperEntries=syntheticNames.map(n=>{const e=transformed.get(`${n}.rec`);if(!e||e.declaration.kind!=="recursor")throw new KernelError(`${decl.name}: internal v45 nested preprocessing did not generate recursor for ${n}`);return e.declaration;});
  const restoreRecursor=(entry:Extract<EnvironmentDeclaration,{kind:"recursor"}>,ri:number):Extract<EnvironmentDeclaration,{kind:"recursor"}>=>{
    const helper=ri>0,sp=helper?specs[ri-1]:undefined;
    const rules=entry.metadata.rules.map(rule=>({...rule,ctor:helper?(sp!.ctorRestore.get(rule.ctor)??rule.ctor):rule.ctor,
      recursiveFieldTypes:rule.recursiveFieldTypes?.map(t=>t?restoreNestedV45(t,specs,sharedParamCount,selfLevels):null),recursiveTargets:rule.recursiveTargets?.map(()=>null),recursiveRecursors:rule.recursiveTargets?.map(target=>target?targetRecursor.get(target)??null:null),...(helper?{ctorParamCount:sp!.container.numParams}:{})}));
    return{kind:"recursor",name:publicRecursors[ri],levelParams:[...entry.levelParams],type:restoreNestedV45(entry.type,specs,sharedParamCount,selfLevels),metadata:{...entry.metadata,inductive:decl.name,rules,mutual:{inductives:syntheticNames,motiveCount:syntheticNames.length,recursors:publicRecursors,indexCounts:[decl.numIndices,...specs.map(s=>s.container.numIndices)]}}};
  };
  const recursors=helperEntries.map(restoreRecursor),assumptions=dependencyAssumptions(transformed,[decl.type,...decl.constructors.map(c=>c.type)]),generated=[...decl.constructors.map(c=>c.name),...publicRecursors];
  const final=env.clone();final.add({declaration:decl,assumptions,generated});
  for(const ctor of decl.constructors){const ctorSort=kernelWhnf(final,infer(final,[],ctor.type));if(ctorSort.tag!=="sort")throw new KernelError(`${ctor.name}: restored v45 nested constructor type is not a type`);final.add({declaration:{kind:"constructor",name:ctor.name,levelParams:[...decl.levelParams],type:ctor.type,inductive:decl.name},assumptions:dependencyAssumptions(final,[ctor.type]),generated:[]});}
  for(const rec of recursors){const recSort=kernelWhnf(final,infer(final,[],rec.type));if(recSort.tag!=="sort")throw new KernelError(`${rec.name}: restored v45 nested recursor type is not a type`);final.add({declaration:rec,assumptions:dependencyAssumptions(final,[rec.type]),generated:[]});}
  env.replaceWith(final);return{declaration:decl,assumptions,generated};
}

type NestedV44Spec={
  containerName:string;
  container:Extract<CoreDeclaration,{kind:"inductive"}>;
  publicParams:Term[];
  publicTerm:Term;
  auxName:string;
  ctorRestore:Map<string,string>;
};
type NestedV44Occurrence={ctorIndex:number;fieldIndex:number;rootTerm:Term;specIndex?:number};

function v44OuterExact(term:Term,outerName:string):boolean{
  const f=flattenApps(term);return f.head.tag==="const"&&f.head.name===outerName&&f.head.levels.length===0&&f.args.length===0;
}

/** Parse one monomorphic zero-index nested container specialization. */
function parseNestedV44Spec(env:Environment,term:Term,outerName:string):NestedV44Spec|undefined{
  const flat=flattenApps(term);if(flat.head.tag!=="const"||flat.head.levels.length!==0)return undefined;
  const e=env.get(flat.head.name);if(!e||e.declaration.kind!=="inductive")return undefined;
  const c=e.declaration;if(c.levelParams.length!==0||c.numIndices!==0||c.numParams<1||flat.args.length!==c.numParams)return undefined;
  if(!flat.args.some(a=>containsConst(a,outerName)))return undefined;
  return{containerName:flat.head.name,container:c,publicParams:[...flat.args],publicTerm:term,auxName:"",ctorRestore:new Map()};
}

function nestedV44SameSpec(a:NestedV44Spec,b:NestedV44Spec):boolean{
  return a.containerName===b.containerName&&sameTerm(a.publicTerm,b.publicTerm);
}

function rewriteNestedV44(term:Term,specs:readonly NestedV44Spec[]):Term{
  for(const sp of specs)if(sameTerm(term,sp.publicTerm))return{tag:"const",name:sp.auxName,levels:[]};
  switch(term.tag){
    case"sort":case"bvar":case"const":return term;
    case"app":return{tag:"app",fn:rewriteNestedV44(term.fn,specs),arg:rewriteNestedV44(term.arg,specs)};
    case"lam":return{tag:"lam",domain:rewriteNestedV44(term.domain,specs),body:rewriteNestedV44(term.body,specs),binderInfo:term.binderInfo};
    case"pi":return{tag:"pi",domain:rewriteNestedV44(term.domain,specs),body:rewriteNestedV44(term.body,specs),binderInfo:term.binderInfo};
    case"let":return{tag:"let",type:rewriteNestedV44(term.type,specs),value:rewriteNestedV44(term.value,specs),body:rewriteNestedV44(term.body,specs),nondep:term.nondep};
    case"proj":return{tag:"proj",typeName:term.typeName,index:term.index,expr:rewriteNestedV44(term.expr,specs)};
  }
}

function restoreNestedV44(term:Term,specs:readonly NestedV44Spec[]):Term{
  const flat=flattenApps(term);
  if(flat.head.tag==="const"){
    for(const sp of specs){
      if(flat.head.name===sp.auxName&&flat.head.levels.length===0&&flat.args.length===0)return sp.publicTerm;
      const original=sp.ctorRestore.get(flat.head.name);
      if(original){
        const fields=flat.args.map(a=>restoreNestedV44(a,specs));
        return mkApps({tag:"const",name:original,levels:[]},[...sp.publicParams,...fields]);
      }
    }
  }
  switch(term.tag){
    case"sort":case"bvar":case"const":return term;
    case"app":return{tag:"app",fn:restoreNestedV44(term.fn,specs),arg:restoreNestedV44(term.arg,specs)};
    case"lam":return{tag:"lam",domain:restoreNestedV44(term.domain,specs),body:restoreNestedV44(term.body,specs),binderInfo:term.binderInfo};
    case"pi":return{tag:"pi",domain:restoreNestedV44(term.domain,specs),body:restoreNestedV44(term.body,specs),binderInfo:term.binderInfo};
    case"let":return{tag:"let",type:restoreNestedV44(term.type,specs),value:restoreNestedV44(term.value,specs),body:restoreNestedV44(term.body,specs),nondep:term.nondep};
    case"proj":return{tag:"proj",typeName:term.typeName,index:term.index,expr:restoreNestedV44(term.expr,specs)};
  }
}

function instantiateV44Params(type:Term,params:readonly Term[],label:string):Term{
  let t=type;
  for(const p of params){if(t.tag!=="pi")throw new KernelError(`${label}: parameter telescope shorter than declared parameter count`);t=instantiate(t.body,p);}
  return t;
}

/**
 * v44 bounded multi-parameter nested-container graph.
 *
 * This first slice intentionally targets monomorphic parameterless/indexless Type
 * outer families and monomorphic zero-index containers.  A container may have any
 * positive number of parameters, and every parameter position may contain either
 * direct outer recursion or another checked nested specialization.  One helper is
 * generated per unique complete specialized container type, in Lean first-root then
 * breadth-first dependency order.  v43 and earlier remain the authority for the
 * broader one-parameter parameter/index/universe/Prop cross-product.
 */
function tryCheckNestedInductiveV44(env:Environment,decl:Extract<CoreDeclaration,{kind:"inductive"}>):CheckedDeclaration|undefined{
  if(decl.levelParams.length!==0||decl.numParams!==0||decl.numIndices!==0||decl.type.tag!=="sort"||!levelDefEq(decl.type.level,levelSucc(LevelZero)))return undefined;

  const occurrences:NestedV44Occurrence[]=[];
  for(let ci=0;ci<decl.constructors.length;ci++){
    const {fields}=splitPi(decl.constructors[ci].type);
    for(let fi=0;fi<fields.length;fi++){
      const field=fields[fi];if(!containsConst(field,decl.name))continue;
      if(v44OuterExact(field,decl.name))continue;
      const sp=parseNestedV44Spec(env,field,decl.name);if(sp)occurrences.push({ctorIndex:ci,fieldIndex:fi,rootTerm:field});
    }
  }
  if(occurrences.length===0)return undefined;

  const specs:NestedV44Spec[]=[];let sawMulti=false;
  const addSpec=(sp:NestedV44Spec):{index:number;fresh:boolean}=>{
    for(let i=0;i<specs.length;i++)if(nestedV44SameSpec(sp,specs[i]))return{index:i,fresh:false};
    const cp={...sp,publicParams:[...sp.publicParams],auxName:"",ctorRestore:new Map<string,string>()};
    if(cp.container.numParams>=2)sawMulti=true;specs.push(cp);return{index:specs.length-1,fresh:true};
  };
  let frontier:NestedV44Spec[]=[];
  for(const o of occurrences){const sp=parseNestedV44Spec(env,o.rootTerm,decl.name)!;const a=addSpec(sp);o.specIndex=a.index;if(a.fresh)frontier.push(specs[a.index]);}
  while(frontier.length){
    const next:NestedV44Spec[]=[];
    for(const sp of frontier)for(const param of sp.publicParams){
      if(!containsConst(param,decl.name))continue;
      if(v44OuterExact(param,decl.name))continue;
      const child=parseNestedV44Spec(env,param,decl.name);
      if(!child)throw new KernelError(`${decl.name}: v44 nested container parameter containing the recursive outer family is not a checked container specialization`);
      const a=addSpec(child);if(a.fresh)next.push(specs[a.index]);
    }
    frontier=next;
  }
  if(!sawMulti)return undefined; // frozen v43 remains authority for the one-parameter graph.

  const occurrenceAt=new Map<string,NestedV44Occurrence>();for(const o of occurrences)occurrenceAt.set(`${o.ctorIndex}:${o.fieldIndex}`,o);
  for(let ci=0;ci<decl.constructors.length;ci++){
    const {fields}=splitPi(decl.constructors[ci].type);
    for(let fi=0;fi<fields.length;fi++){
      const field=fields[fi];if(!containsConst(field,decl.name))continue;
      if(v44OuterExact(field,decl.name)||occurrenceAt.has(`${ci}:${fi}`))continue;
      throw new KernelError(`${decl.constructors[ci].name}: v44 multi-parameter nested slice only admits direct recursion or checked multi-parameter container graphs`);
    }
  }

  validateName(decl.name);validateLevelParams(decl);if(env.has(decl.name))throw new KernelError(`duplicate declaration: ${decl.name}`);
  const publicRecursors=[`${decl.name}.rec`,...specs.map((_,i)=>`${decl.name}.rec_${i+1}`)];for(const rn of publicRecursors)if(env.has(rn))throw new KernelError(`${decl.name}: nested recursor name already exists`);

  for(let i=0;i<specs.length;i++){
    const sp=specs[i];sp.auxName=`_nested.${decl.name}.deepmultiparamaux${i+1}`;
    if(env.has(sp.auxName)||env.has(`${sp.auxName}.rec`))throw new KernelError(`${decl.name}: internal v44 nested auxiliary name already exists`);
    let t=sp.container.type;
    for(let pi=0;pi<sp.container.numParams;pi++){
      if(t.tag!=="pi")throw new KernelError(`${decl.name}: malformed v44 container parameter telescope for ${sp.containerName}`);
      const dom=kernelWhnf(env,t.domain);if(dom.tag!=="sort"||!levelDefEq(dom.level,levelSucc(LevelZero)))throw new KernelError(`${decl.name}: v44 container ${sp.containerName} parameter ${pi} must have type Type`);
      t=instantiate(t.body,sp.publicParams[pi]);
    }
    const result=kernelWhnf(env,t);if(result.tag!=="sort"||!levelDefEq(result.level,levelSucc(LevelZero)))throw new KernelError(`${decl.name}: v44 container ${sp.containerName} must return Type`);
  }

  const syntheticOuterCtors=decl.constructors.map((ctor,ci)=>{
    const {fields,fieldBinderInfo,result}=splitPi(ctor.type);
    return{name:ctor.name,type:rebuildPi(fields.map((field,fi)=>{
      const o=occurrenceAt.get(`${ci}:${fi}`);return o?({tag:"const",name:specs[o.specIndex!].auxName,levels:[]} as Term):field;
    }),fieldBinderInfo,result)};
  });

  const syntheticAuxMembers:Extract<CoreDeclaration,{kind:"mutualInductive"}>["inductives"]=specs.map(sp=>{
    const ctors=sp.container.constructors.map((ctor,index)=>{
      const syntheticName=`${sp.auxName}.ctor${index}`;sp.ctorRestore.set(syntheticName,ctor.name);
      const specialized=instantiateV44Params(ctor.type,sp.publicParams,`${decl.name}: ${ctor.name}`);
      return{name:syntheticName,type:rewriteNestedV44(specialized,specs)};
    });
    const tail=instantiateV44Params(sp.container.type,sp.publicParams,`${decl.name}: ${sp.containerName}`);
    return{name:sp.auxName,type:tail,numParams:0,numIndices:0,constructors:ctors};
  });

  const synthetic:Extract<CoreDeclaration,{kind:"mutualInductive"}>={kind:"mutualInductive",name:`_nested.${decl.name}.deepmultiparamblock`,levelParams:[],inductives:[
    {name:decl.name,type:decl.type,numParams:0,numIndices:0,constructors:syntheticOuterCtors},...syntheticAuxMembers,
  ]};
  const transformed=env.clone();checkDirectMutualInductive(transformed,synthetic);
  const syntheticNames=[decl.name,...specs.map(s=>s.auxName)];const targetRecursor=new Map<string,string>(syntheticNames.map((n,i)=>[n,publicRecursors[i]]));
  const helperEntries=syntheticNames.map(n=>{const e=transformed.get(`${n}.rec`);if(!e||e.declaration.kind!=="recursor")throw new KernelError(`${decl.name}: internal v44 nested preprocessing did not generate recursor for ${n}`);return e.declaration;});
  const restoreRecursor=(entry:Extract<EnvironmentDeclaration,{kind:"recursor"}>,ri:number):Extract<EnvironmentDeclaration,{kind:"recursor"}>=>{
    const helper=ri>0;const sp=helper?specs[ri-1]:undefined;
    const rules=entry.metadata.rules.map(rule=>({...rule,ctor:helper?(sp!.ctorRestore.get(rule.ctor)??rule.ctor):rule.ctor,
      recursiveFieldTypes:rule.recursiveFieldTypes?.map(t=>t?restoreNestedV44(t,specs):null),recursiveTargets:rule.recursiveTargets?.map(()=>null),recursiveRecursors:rule.recursiveTargets?.map(target=>target?targetRecursor.get(target)??null:null),...(helper?{ctorParamCount:sp!.container.numParams}:{})}));
    return{kind:"recursor",name:publicRecursors[ri],levelParams:[...entry.levelParams],type:restoreNestedV44(entry.type,specs),metadata:{...entry.metadata,inductive:decl.name,rules,mutual:{inductives:syntheticNames,motiveCount:syntheticNames.length,recursors:publicRecursors,indexCounts:syntheticNames.map(()=>0)}}};
  };
  const recursors=helperEntries.map(restoreRecursor);
  const assumptions=dependencyAssumptions(transformed,[decl.type,...decl.constructors.map(c=>c.type)]);const generated=[...decl.constructors.map(c=>c.name),...publicRecursors];
  const final=env.clone();final.add({declaration:decl,assumptions,generated});
  for(const ctor of decl.constructors){const ctorSort=kernelWhnf(final,infer(final,[],ctor.type));if(ctorSort.tag!=="sort")throw new KernelError(`${ctor.name}: restored v44 nested constructor type is not a type`);final.add({declaration:{kind:"constructor",name:ctor.name,levelParams:[],type:ctor.type,inductive:decl.name},assumptions:dependencyAssumptions(final,[ctor.type]),generated:[]});}
  for(const rec of recursors){const recSort=kernelWhnf(final,infer(final,[],rec.type));if(recSort.tag!=="sort")throw new KernelError(`${rec.name}: restored v44 nested recursor type is not a type`);final.add({declaration:rec,assumptions:dependencyAssumptions(final,[rec.type]),generated:[]});}
  env.replaceWith(final);return{declaration:decl,assumptions,generated};
}

function tryCheckNestedInductiveV43(env:Environment,decl:Extract<CoreDeclaration,{kind:"inductive"}>):CheckedDeclaration|undefined{
  const selfLevels=decl.levelParams.map(name=>({tag:"param",name} as Level));
  const totalOuterArgs=decl.numParams+decl.numIndices;
  let outerTail=decl.type;
  for(let p=0;p<totalOuterArgs;p++){if(outerTail.tag!=="pi")return undefined;outerTail=outerTail.body;}
  if(outerTail.tag!=="sort"||!normalizesToZero(outerTail.level))return undefined;

  const paramPrefix=nestedOuterPrefixContextV40(decl,decl.numParams);
  const capturedPrefix=nestedOuterPrefixContextV40(decl,totalOuterArgs);
  const occurrences:NestedV42Occurrence[]=[];
  for(let ci=0;ci<decl.constructors.length;ci++){
    const {fields}=splitPi(decl.constructors[ci].type);
    for(let fi=decl.numParams;fi<fields.length;fi++){
      const field=fields[fi];if(!containsConst(field,decl.name))continue;
      const direct=flattenApps(field);
      if(direct.head.tag==="const"&&direct.head.name===decl.name&&levelsDefEq(direct.head.levels,selfLevels)&&direct.args.length===totalOuterArgs)continue;
      const projectedClosed=projectNestedIndexToParamContext(field,fi-decl.numParams);
      if(projectedClosed){
        const chain=nestedDeepChainV42(env,projectedClosed,decl.name,selfLevels,paramPrefix.ctx,paramPrefix.args,totalOuterArgs);
        if(chain){occurrences.push({ctorIndex:ci,fieldIndex:fi,projected:projectedClosed,layers:chain.layers,kind:"closed",outerArgs:chain.outerArgs});continue;}
      }
      if(decl.numIndices>0&&fi>=totalOuterArgs){
        const projectedCaptured=projectNestedIndexToParamContext(field,fi-totalOuterArgs);
        if(projectedCaptured){
          const chain=nestedDeepChainV42(env,projectedCaptured,decl.name,selfLevels,capturedPrefix.ctx,capturedPrefix.args,totalOuterArgs);
          if(chain){occurrences.push({ctorIndex:ci,fieldIndex:fi,projected:projectedCaptured,layers:chain.layers,kind:"captured",outerArgs:chain.outerArgs});continue;}
        }
      }
    }
  }
  if(occurrences.length<1)return undefined;

  const kinds=new Set(occurrences.map(o=>o.kind));
  if(kinds.size!==1)throw new KernelError(`${decl.name}: v43 nested multiple-field slice rejects mixed captured/promoted and closed/fixed specializations`);
  const globalKind=occurrences[0].kind;
  const mode:NestedIndexMode=globalKind==="captured"
    ?{kind:"captured",sharedParamCount:totalOuterArgs,outerIndexCount:0,fixedIndices:[]}
    :{kind:"closed",sharedParamCount:decl.numParams,outerIndexCount:decl.numIndices,fixedIndices:[]};
  const sharedCtx=globalKind==="captured"?capturedPrefix.ctx:paramPrefix.ctx;

  // Any recursive non-direct field not classified above is outside this bounded graph.
  const occurrenceAt=new Map<string,NestedV42Occurrence>();for(const o of occurrences)occurrenceAt.set(`${o.ctorIndex}:${o.fieldIndex}`,o);
  for(let ci=0;ci<decl.constructors.length;ci++){
    const {fields}=splitPi(decl.constructors[ci].type);
    for(let fi=decl.numParams;fi<fields.length;fi++){
      const field=fields[fi];if(!containsConst(field,decl.name))continue;
      const direct=flattenApps(field);
      if(direct.head.tag==="const"&&direct.head.name===decl.name&&levelsDefEq(direct.head.levels,selfLevels)&&direct.args.length===totalOuterArgs)continue;
      if(occurrenceAt.has(`${ci}:${fi}`))continue;
      throw new KernelError(`${decl.constructors[ci].name}: v43 multiple-field nested slice only admits direct recursion or checked linear nested fields`);
    }
  }

  validateName(decl.name);validateLevelParams(decl);if(env.has(decl.name))throw new KernelError(`duplicate declaration: ${decl.name}`);

  // Seed direct field specializations first, then dependencies breadth-first. This
  // exactly matches Lean's motive ordering for independent and shared-prefix chains.
  const specs:NestedV41Layer[]=[];
  const addSpec=(layer:NestedV41Layer):number=>{
    for(let i=0;i<specs.length;i++)if(nestedV42SameSpec(env,sharedCtx,layer,specs[i]))return i;
    const copy:NestedV41Layer={...layer,containerLevels:[...layer.containerLevels],containerIndices:[...layer.containerIndices],auxName:"",ctorRestore:new Map()};
    specs.push(copy);return specs.length-1;
  };
  for(const o of occurrences)o.specIndex=addSpec(o.layers[0]);
  const maxDepth=Math.max(...occurrences.map(o=>o.layers.length));
  for(let depth=1;depth<maxDepth;depth++)for(const o of occurrences)if(o.layers[depth])addSpec(o.layers[depth]);

  const publicRecursors=[`${decl.name}.rec`,...specs.map((_,i)=>`${decl.name}.rec_${i+1}`)];
  for(const rn of publicRecursors)if(env.has(rn))throw new KernelError(`${decl.name}: nested recursor name already exists`);

  for(let i=0;i<specs.length;i++){
    const layer=specs[i];layer.auxName=`_nested.${decl.name}.deeppropaux${i+1}`;
    if(env.has(layer.auxName)||env.has(`${layer.auxName}.rec`))throw new KernelError(`${decl.name}: internal v43 nested auxiliary name already exists`);
    if(layer.containerLevels.length!==layer.container.levelParams.length)throw new KernelError(`${decl.name}: v43 nested container ${layer.containerName} universe arity mismatch`);
    const instantiatedType=instantiateTermLevels(layer.container.type,layer.container.levelParams,layer.containerLevels);
    if(instantiatedType.tag!=="pi")throw new KernelError(`${decl.name}: malformed v43 nested container ${layer.containerName}`);
    const paramSort=kernelWhnf(env,instantiatedType.domain);
    if(paramSort.tag!=="sort"||!levelDefEq(paramSort.level,outerTail.level))throw new KernelError(`${decl.name}: v43 nested container ${layer.containerName} parameter universe must match the outer family universe`);
    let tail=instantiate(instantiatedType.body,layer.publicParam);
    for(let ii=0;ii<layer.container.numIndices;ii++){
      if(tail.tag!=="pi")throw new KernelError(`${decl.name}: v43 nested container ${layer.containerName} index telescope is shorter than numIndices`);
      if(containsConst(tail.domain,decl.name))throw new KernelError(`${decl.name}: v43 rejects container index domains depending on the recursive outer family`);
      tail=tail.body;
    }
    const result=kernelWhnfIn(env,sharedCtx,tail);
    if(result.tag!=="sort"||!levelDefEq(result.level,outerTail.level))throw new KernelError(`${decl.name}: v43 nested container ${layer.containerName} result universe must match the outer family universe`);
  }

  const syntheticOuterCtors=decl.constructors.map((ctor,ci)=>{
    const {fields,fieldBinderInfo,result}=splitPi(ctor.type);
    const rewritten=fields.map((field,fi)=>{
      const occ=occurrenceAt.get(`${ci}:${fi}`);if(!occ)return field;
      const spec=specs[occ.specIndex!];
      const extraLocals=fi-mode.sharedParamCount;if(extraLocals<0)throw new KernelError(`${decl.name}: v43 nested field occurs before the complete shared telescope`);
      const shared=Array.from({length:mode.sharedParamCount},(_,i)=>({tag:"bvar",index:extraLocals+mode.sharedParamCount-1-i} as Term));
      const flat=flattenApps(field);
      return mkApps({tag:"const",name:spec.auxName,levels:[...selfLevels]},[...shared,...flat.args.slice(1)]);
    });
    return{name:ctor.name,type:rebuildPi(rewritten,fieldBinderInfo,result)};
  });

  const syntheticAuxMembers:Extract<CoreDeclaration,{kind:"mutualInductive"}>["inductives"]=specs.map(layer=>{
    const instantiatedContainerType=instantiateTermLevels(layer.container.type,layer.container.levelParams,layer.containerLevels);
    if(instantiatedContainerType.tag!=="pi")throw new KernelError(`${decl.name}: malformed v43 nested-container type ${layer.containerName}`);
    const ctors=layer.container.constructors.map((ctor,index)=>{
      const instantiatedCtorType=instantiateTermLevels(ctor.type,layer.container.levelParams,layer.containerLevels);
      if(instantiatedCtorType.tag!=="pi")throw new KernelError(`${decl.name}: malformed nested-container constructor ${ctor.name}`);
      const syntheticName=`${layer.auxName}.ctor${index}`;layer.ctorRestore.set(syntheticName,ctor.name);
      const specialized=instantiate(instantiatedCtorType.body,layer.publicParam);
      const rewritten=rewriteNestedDeepV41(specialized,specs,mode.sharedParamCount,selfLevels);
      return{name:syntheticName,type:prependPiTelescope(decl.type,mode.sharedParamCount,rewritten)};
    });
    const auxTail=instantiate(instantiatedContainerType.body,layer.publicParam);
    return{name:layer.auxName,type:prependPiTelescope(decl.type,mode.sharedParamCount,auxTail),numParams:mode.sharedParamCount,numIndices:layer.container.numIndices,constructors:ctors};
  });

  const synthetic:Extract<CoreDeclaration,{kind:"mutualInductive"}>={kind:"mutualInductive",name:`_nested.${decl.name}.deeppropblock`,levelParams:[...decl.levelParams],inductives:[
    {name:decl.name,type:decl.type,numParams:mode.sharedParamCount,numIndices:mode.outerIndexCount,constructors:syntheticOuterCtors},...syntheticAuxMembers,
  ]};
  const transformed=env.clone();checkDirectMutualInductive(transformed,synthetic);
  const syntheticNames=[decl.name,...specs.map(s=>s.auxName)];
  const targetRecursor=new Map<string,string>(syntheticNames.map((n,i)=>[n,publicRecursors[i]]));
  const helperEntries=syntheticNames.map(n=>{const e=transformed.get(`${n}.rec`);if(!e||e.declaration.kind!=="recursor")throw new KernelError(`${decl.name}: internal v43 nested preprocessing did not generate recursor for ${n}`);return e.declaration;});
  const restoreRecursor=(entry:Extract<EnvironmentDeclaration,{kind:"recursor"}>,ri:number):Extract<EnvironmentDeclaration,{kind:"recursor"}>=>{
    const helper=ri>0;const layer=helper?specs[ri-1]:undefined;
    const rules=entry.metadata.rules.map(rule=>({...rule,ctor:helper?(layer!.ctorRestore.get(rule.ctor)??rule.ctor):rule.ctor,
      recursiveFieldTypes:rule.recursiveFieldTypes?.map(t=>t?restoreNestedDeepV41(t,specs,mode.sharedParamCount,selfLevels):null),recursiveTargets:rule.recursiveTargets?.map(()=>null),recursiveRecursors:rule.recursiveTargets?.map(target=>target?targetRecursor.get(target)??null:null),...(helper?{ctorParamCount:1}:{})}));
    return{kind:"recursor",name:publicRecursors[ri],levelParams:[...entry.levelParams],type:restoreNestedDeepV41(entry.type,specs,mode.sharedParamCount,selfLevels),metadata:{...entry.metadata,inductive:decl.name,rules,mutual:{inductives:syntheticNames,motiveCount:syntheticNames.length,recursors:publicRecursors,indexCounts:[mode.outerIndexCount,...specs.map(s=>s.container.numIndices)]}}};
  };
  const recursors=helperEntries.map(restoreRecursor);
  const assumptions=dependencyAssumptions(transformed,[decl.type,...decl.constructors.map(c=>c.type)]);const generated=[...decl.constructors.map(c=>c.name),...publicRecursors];
  const final=env.clone();final.add({declaration:decl,assumptions,generated});
  for(const ctor of decl.constructors){const ctorSort=kernelWhnf(final,infer(final,[],ctor.type));if(ctorSort.tag!=="sort")throw new KernelError(`${ctor.name}: restored v43 nested constructor type is not a type`);final.add({declaration:{kind:"constructor",name:ctor.name,levelParams:[...decl.levelParams],type:ctor.type,inductive:decl.name},assumptions:dependencyAssumptions(final,[ctor.type]),generated:[]});}
  for(const rec of recursors){const recSort=kernelWhnf(final,infer(final,[],rec.type));if(recSort.tag!=="sort")throw new KernelError(`${rec.name}: restored v43 nested recursor type is not a type`);final.add({declaration:rec,assumptions:dependencyAssumptions(final,[rec.type]),generated:[]});}
  env.replaceWith(final);return{declaration:decl,assumptions,generated};
}


function tryCheckNestedInductiveV42(env:Environment,decl:Extract<CoreDeclaration,{kind:"inductive"}>):CheckedDeclaration|undefined{
  const selfLevels=decl.levelParams.map(name=>({tag:"param",name} as Level));
  const totalOuterArgs=decl.numParams+decl.numIndices;
  let outerTail=decl.type;
  for(let p=0;p<totalOuterArgs;p++){if(outerTail.tag!=="pi")return undefined;outerTail=outerTail.body;}
  if(outerTail.tag!=="sort"||!isNeverZero(outerTail.level))return undefined;

  const paramPrefix=nestedOuterPrefixContextV40(decl,decl.numParams);
  const capturedPrefix=nestedOuterPrefixContextV40(decl,totalOuterArgs);
  const occurrences:NestedV42Occurrence[]=[];
  for(let ci=0;ci<decl.constructors.length;ci++){
    const {fields}=splitPi(decl.constructors[ci].type);
    for(let fi=decl.numParams;fi<fields.length;fi++){
      const field=fields[fi];if(!containsConst(field,decl.name))continue;
      const direct=flattenApps(field);
      if(direct.head.tag==="const"&&direct.head.name===decl.name&&levelsDefEq(direct.head.levels,selfLevels)&&direct.args.length===totalOuterArgs)continue;
      const projectedClosed=projectNestedIndexToParamContext(field,fi-decl.numParams);
      if(projectedClosed){
        const chain=nestedDeepChainV42(env,projectedClosed,decl.name,selfLevels,paramPrefix.ctx,paramPrefix.args,totalOuterArgs);
        if(chain){occurrences.push({ctorIndex:ci,fieldIndex:fi,projected:projectedClosed,layers:chain.layers,kind:"closed",outerArgs:chain.outerArgs});continue;}
      }
      if(decl.numIndices>0&&fi>=totalOuterArgs){
        const projectedCaptured=projectNestedIndexToParamContext(field,fi-totalOuterArgs);
        if(projectedCaptured){
          const chain=nestedDeepChainV42(env,projectedCaptured,decl.name,selfLevels,capturedPrefix.ctx,capturedPrefix.args,totalOuterArgs);
          if(chain){occurrences.push({ctorIndex:ci,fieldIndex:fi,projected:projectedCaptured,layers:chain.layers,kind:"captured",outerArgs:chain.outerArgs});continue;}
        }
      }
    }
  }
  if(occurrences.length<2)return undefined; // v41 and earlier remain the one-field authority.

  const kinds=new Set(occurrences.map(o=>o.kind));
  if(kinds.size!==1)throw new KernelError(`${decl.name}: v42 nested multiple-field slice rejects mixed captured/promoted and closed/fixed specializations`);
  const globalKind=occurrences[0].kind;
  const mode:NestedIndexMode=globalKind==="captured"
    ?{kind:"captured",sharedParamCount:totalOuterArgs,outerIndexCount:0,fixedIndices:[]}
    :{kind:"closed",sharedParamCount:decl.numParams,outerIndexCount:decl.numIndices,fixedIndices:[]};
  const sharedCtx=globalKind==="captured"?capturedPrefix.ctx:paramPrefix.ctx;

  // Any recursive non-direct field not classified above is outside this bounded graph.
  const occurrenceAt=new Map<string,NestedV42Occurrence>();for(const o of occurrences)occurrenceAt.set(`${o.ctorIndex}:${o.fieldIndex}`,o);
  for(let ci=0;ci<decl.constructors.length;ci++){
    const {fields}=splitPi(decl.constructors[ci].type);
    for(let fi=decl.numParams;fi<fields.length;fi++){
      const field=fields[fi];if(!containsConst(field,decl.name))continue;
      const direct=flattenApps(field);
      if(direct.head.tag==="const"&&direct.head.name===decl.name&&levelsDefEq(direct.head.levels,selfLevels)&&direct.args.length===totalOuterArgs)continue;
      if(occurrenceAt.has(`${ci}:${fi}`))continue;
      throw new KernelError(`${decl.constructors[ci].name}: v42 multiple-field nested slice only admits direct recursion or checked linear nested fields`);
    }
  }

  validateName(decl.name);validateLevelParams(decl);if(env.has(decl.name))throw new KernelError(`duplicate declaration: ${decl.name}`);

  // Seed direct field specializations first, then dependencies breadth-first. This
  // exactly matches Lean's motive ordering for independent and shared-prefix chains.
  const specs:NestedV41Layer[]=[];
  const addSpec=(layer:NestedV41Layer):number=>{
    for(let i=0;i<specs.length;i++)if(nestedV42SameSpec(env,sharedCtx,layer,specs[i]))return i;
    const copy:NestedV41Layer={...layer,containerLevels:[...layer.containerLevels],containerIndices:[...layer.containerIndices],auxName:"",ctorRestore:new Map()};
    specs.push(copy);return specs.length-1;
  };
  for(const o of occurrences)o.specIndex=addSpec(o.layers[0]);
  const maxDepth=Math.max(...occurrences.map(o=>o.layers.length));
  for(let depth=1;depth<maxDepth;depth++)for(const o of occurrences)if(o.layers[depth])addSpec(o.layers[depth]);

  const publicRecursors=[`${decl.name}.rec`,...specs.map((_,i)=>`${decl.name}.rec_${i+1}`)];
  for(const rn of publicRecursors)if(env.has(rn))throw new KernelError(`${decl.name}: nested recursor name already exists`);

  for(let i=0;i<specs.length;i++){
    const layer=specs[i];layer.auxName=`_nested.${decl.name}.deepmultiaux${i+1}`;
    if(env.has(layer.auxName)||env.has(`${layer.auxName}.rec`))throw new KernelError(`${decl.name}: internal v42 nested auxiliary name already exists`);
    if(layer.containerLevels.length!==layer.container.levelParams.length)throw new KernelError(`${decl.name}: v42 nested container ${layer.containerName} universe arity mismatch`);
    const instantiatedType=instantiateTermLevels(layer.container.type,layer.container.levelParams,layer.containerLevels);
    if(instantiatedType.tag!=="pi")throw new KernelError(`${decl.name}: malformed v42 nested container ${layer.containerName}`);
    const paramSort=kernelWhnf(env,instantiatedType.domain);
    if(paramSort.tag!=="sort"||!levelDefEq(paramSort.level,outerTail.level))throw new KernelError(`${decl.name}: v42 nested container ${layer.containerName} parameter universe must match the outer family universe`);
    let tail=instantiate(instantiatedType.body,layer.publicParam);
    for(let ii=0;ii<layer.container.numIndices;ii++){
      if(tail.tag!=="pi")throw new KernelError(`${decl.name}: v42 nested container ${layer.containerName} index telescope is shorter than numIndices`);
      if(containsConst(tail.domain,decl.name))throw new KernelError(`${decl.name}: v42 rejects container index domains depending on the recursive outer family`);
      tail=tail.body;
    }
    const result=kernelWhnfIn(env,sharedCtx,tail);
    if(result.tag!=="sort"||!levelDefEq(result.level,outerTail.level))throw new KernelError(`${decl.name}: v42 nested container ${layer.containerName} result universe must match the outer family universe`);
  }

  const syntheticOuterCtors=decl.constructors.map((ctor,ci)=>{
    const {fields,fieldBinderInfo,result}=splitPi(ctor.type);
    const rewritten=fields.map((field,fi)=>{
      const occ=occurrenceAt.get(`${ci}:${fi}`);if(!occ)return field;
      const spec=specs[occ.specIndex!];
      const extraLocals=fi-mode.sharedParamCount;if(extraLocals<0)throw new KernelError(`${decl.name}: v42 nested field occurs before the complete shared telescope`);
      const shared=Array.from({length:mode.sharedParamCount},(_,i)=>({tag:"bvar",index:extraLocals+mode.sharedParamCount-1-i} as Term));
      const flat=flattenApps(field);
      return mkApps({tag:"const",name:spec.auxName,levels:[...selfLevels]},[...shared,...flat.args.slice(1)]);
    });
    return{name:ctor.name,type:rebuildPi(rewritten,fieldBinderInfo,result)};
  });

  const syntheticAuxMembers:Extract<CoreDeclaration,{kind:"mutualInductive"}>["inductives"]=specs.map(layer=>{
    const instantiatedContainerType=instantiateTermLevels(layer.container.type,layer.container.levelParams,layer.containerLevels);
    if(instantiatedContainerType.tag!=="pi")throw new KernelError(`${decl.name}: malformed v42 nested-container type ${layer.containerName}`);
    const ctors=layer.container.constructors.map((ctor,index)=>{
      const instantiatedCtorType=instantiateTermLevels(ctor.type,layer.container.levelParams,layer.containerLevels);
      if(instantiatedCtorType.tag!=="pi")throw new KernelError(`${decl.name}: malformed nested-container constructor ${ctor.name}`);
      const syntheticName=`${layer.auxName}.ctor${index}`;layer.ctorRestore.set(syntheticName,ctor.name);
      const specialized=instantiate(instantiatedCtorType.body,layer.publicParam);
      const rewritten=rewriteNestedDeepV41(specialized,specs,mode.sharedParamCount,selfLevels);
      return{name:syntheticName,type:prependPiTelescope(decl.type,mode.sharedParamCount,rewritten)};
    });
    const auxTail=instantiate(instantiatedContainerType.body,layer.publicParam);
    return{name:layer.auxName,type:prependPiTelescope(decl.type,mode.sharedParamCount,auxTail),numParams:mode.sharedParamCount,numIndices:layer.container.numIndices,constructors:ctors};
  });

  const synthetic:Extract<CoreDeclaration,{kind:"mutualInductive"}>={kind:"mutualInductive",name:`_nested.${decl.name}.deepmultiblock`,levelParams:[...decl.levelParams],inductives:[
    {name:decl.name,type:decl.type,numParams:mode.sharedParamCount,numIndices:mode.outerIndexCount,constructors:syntheticOuterCtors},...syntheticAuxMembers,
  ]};
  const transformed=env.clone();checkDirectMutualInductive(transformed,synthetic);
  const syntheticNames=[decl.name,...specs.map(s=>s.auxName)];
  const targetRecursor=new Map<string,string>(syntheticNames.map((n,i)=>[n,publicRecursors[i]]));
  const helperEntries=syntheticNames.map(n=>{const e=transformed.get(`${n}.rec`);if(!e||e.declaration.kind!=="recursor")throw new KernelError(`${decl.name}: internal v42 nested preprocessing did not generate recursor for ${n}`);return e.declaration;});
  const restoreRecursor=(entry:Extract<EnvironmentDeclaration,{kind:"recursor"}>,ri:number):Extract<EnvironmentDeclaration,{kind:"recursor"}>=>{
    const helper=ri>0;const layer=helper?specs[ri-1]:undefined;
    const rules=entry.metadata.rules.map(rule=>({...rule,ctor:helper?(layer!.ctorRestore.get(rule.ctor)??rule.ctor):rule.ctor,
      recursiveFieldTypes:rule.recursiveFieldTypes?.map(t=>t?restoreNestedDeepV41(t,specs,mode.sharedParamCount,selfLevels):null),recursiveTargets:rule.recursiveTargets?.map(()=>null),recursiveRecursors:rule.recursiveTargets?.map(target=>target?targetRecursor.get(target)??null:null),...(helper?{ctorParamCount:1}:{})}));
    return{kind:"recursor",name:publicRecursors[ri],levelParams:[...entry.levelParams],type:restoreNestedDeepV41(entry.type,specs,mode.sharedParamCount,selfLevels),metadata:{...entry.metadata,inductive:decl.name,rules,mutual:{inductives:syntheticNames,motiveCount:syntheticNames.length,recursors:publicRecursors,indexCounts:[mode.outerIndexCount,...specs.map(s=>s.container.numIndices)]}}};
  };
  const recursors=helperEntries.map(restoreRecursor);
  const assumptions=dependencyAssumptions(transformed,[decl.type,...decl.constructors.map(c=>c.type)]);const generated=[...decl.constructors.map(c=>c.name),...publicRecursors];
  const final=env.clone();final.add({declaration:decl,assumptions,generated});
  for(const ctor of decl.constructors){const ctorSort=kernelWhnf(final,infer(final,[],ctor.type));if(ctorSort.tag!=="sort")throw new KernelError(`${ctor.name}: restored v42 nested constructor type is not a type`);final.add({declaration:{kind:"constructor",name:ctor.name,levelParams:[...decl.levelParams],type:ctor.type,inductive:decl.name},assumptions:dependencyAssumptions(final,[ctor.type]),generated:[]});}
  for(const rec of recursors){const recSort=kernelWhnf(final,infer(final,[],rec.type));if(recSort.tag!=="sort")throw new KernelError(`${rec.name}: restored v42 nested recursor type is not a type`);final.add({declaration:rec,assumptions:dependencyAssumptions(final,[rec.type]),generated:[]});}
  env.replaceWith(final);return{declaration:decl,assumptions,generated};
}

type NestedV41Deep={ctorIndex:number;fieldIndex:number;layers:NestedV41Layer[];projected:Term;mode:NestedIndexMode;sharedCtx:Context;sharedArgs:Term[]};

/**
 * v41: arbitrary-depth explicit-universe nested preprocessing over parameterized
 * and indexed outer Type families. It composes v40 fixed/captured outer-index
 * modes with v34's explicit universe-instantiation rule. No universe metavariable
 * inference is added: every public constant carries checked levels, and every
 * container layer's parameter/result universe must definitionally equal the
 * outer family universe.
 */
function tryCheckNestedInductiveV41(env:Environment,decl:Extract<CoreDeclaration,{kind:"inductive"}>):CheckedDeclaration|undefined{
  if(decl.levelParams.length===0)return undefined;
  const selfLevels=decl.levelParams.map(name=>({tag:"param",name} as Level));
  const totalOuterArgs=decl.numParams+decl.numIndices;
  let outerTail=decl.type;
  for(let p=0;p<totalOuterArgs;p++){if(outerTail.tag!=="pi")return undefined;outerTail=outerTail.body;}
  if(outerTail.tag!=="sort"||!isNeverZero(outerTail.level))return undefined;

  const paramPrefix=nestedOuterPrefixContextV40(decl,decl.numParams);
  const capturedPrefix=nestedOuterPrefixContextV40(decl,totalOuterArgs);
  let deep:NestedV41Deep|undefined;
  for(let ci=0;ci<decl.constructors.length;ci++){
    const {fields}=splitPi(decl.constructors[ci].type);
    for(let fi=decl.numParams;fi<fields.length;fi++){
      const field=fields[fi];if(!containsConst(field,decl.name))continue;
      const projectedClosed=projectNestedIndexToParamContext(field,fi-decl.numParams);
      if(projectedClosed){
        const chain=nestedDeepChainV41(env,projectedClosed,decl.name,selfLevels,paramPrefix.ctx,paramPrefix.args,totalOuterArgs);
        if(chain){
          const candidate:NestedV41Deep={ctorIndex:ci,fieldIndex:fi,layers:chain.layers,projected:projectedClosed,mode:{kind:"closed",sharedParamCount:decl.numParams,outerIndexCount:decl.numIndices,fixedIndices:chain.outerArgs.slice(decl.numParams)},sharedCtx:paramPrefix.ctx,sharedArgs:paramPrefix.args};
          if(deep)throw new KernelError(`${decl.name}: v41 bounded polymorphic deeper nested slice admits exactly one linear nested field`);deep=candidate;continue;
        }
      }
      if(decl.numIndices>0&&fi>=totalOuterArgs){
        const projectedCaptured=projectNestedIndexToParamContext(field,fi-totalOuterArgs);
        if(projectedCaptured){
          const chain=nestedDeepChainV41(env,projectedCaptured,decl.name,selfLevels,capturedPrefix.ctx,capturedPrefix.args,totalOuterArgs);
          if(chain){
            const candidate:NestedV41Deep={ctorIndex:ci,fieldIndex:fi,layers:chain.layers,projected:projectedCaptured,mode:{kind:"captured",sharedParamCount:totalOuterArgs,outerIndexCount:0,fixedIndices:[]},sharedCtx:capturedPrefix.ctx,sharedArgs:capturedPrefix.args};
            if(deep)throw new KernelError(`${decl.name}: v41 bounded polymorphic deeper nested slice admits exactly one linear nested field`);deep=candidate;
          }
        }
      }
    }
  }
  if(!deep)return undefined;

  validateName(decl.name);validateLevelParams(decl);if(env.has(decl.name))throw new KernelError(`duplicate declaration: ${decl.name}`);
  const publicRecursors=[`${decl.name}.rec`,...deep.layers.map((_,i)=>`${decl.name}.rec_${i+1}`)];
  for(const rn of publicRecursors)if(env.has(rn))throw new KernelError(`${decl.name}: nested recursor name already exists`);
  const {mode,layers,sharedCtx}=deep;

  for(let i=0;i<layers.length;i++){
    const layer=layers[i];layer.auxName=`_nested.${decl.name}.deeppolyaux${i+1}`;
    if(env.has(layer.auxName)||env.has(`${layer.auxName}.rec`))throw new KernelError(`${decl.name}: internal v41 nested auxiliary name already exists`);
    if(layer.containerLevels.length!==layer.container.levelParams.length)throw new KernelError(`${decl.name}: v41 nested container ${layer.containerName} universe arity mismatch`);
    const instantiatedType=instantiateTermLevels(layer.container.type,layer.container.levelParams,layer.containerLevels);
    if(instantiatedType.tag!=="pi")throw new KernelError(`${decl.name}: malformed v41 nested container ${layer.containerName}`);
    const paramSort=kernelWhnf(env,instantiatedType.domain);
    if(paramSort.tag!=="sort"||!levelDefEq(paramSort.level,outerTail.level))throw new KernelError(`${decl.name}: v41 nested container ${layer.containerName} parameter universe must match the outer family universe`);
    let tail=instantiate(instantiatedType.body,layer.publicParam);
    for(let ii=0;ii<layer.container.numIndices;ii++){
      if(tail.tag!=="pi")throw new KernelError(`${decl.name}: v41 nested container ${layer.containerName} index telescope is shorter than numIndices`);
      if(containsConst(tail.domain,decl.name))throw new KernelError(`${decl.name}: v41 rejects container index domains depending on the recursive outer family`);
      tail=tail.body;
    }
    const result=kernelWhnfIn(env,sharedCtx,tail);
    if(result.tag!=="sort"||!levelDefEq(result.level,outerTail.level))throw new KernelError(`${decl.name}: v41 nested container ${layer.containerName} result universe must match the outer family universe`);
  }

  for(let ci=0;ci<decl.constructors.length;ci++){
    const {fields}=splitPi(decl.constructors[ci].type);
    for(let fi=decl.numParams;fi<fields.length;fi++){
      const field=fields[fi];if(!containsConst(field,decl.name))continue;
      if(ci===deep.ctorIndex&&fi===deep.fieldIndex)continue;
      const direct=flattenApps(field);
      if(direct.head.tag==="const"&&direct.head.name===decl.name&&levelsDefEq(direct.head.levels,selfLevels)&&direct.args.length===totalOuterArgs)continue;
      throw new KernelError(`${decl.constructors[ci].name}: v41 polymorphic indexed deeper slice only admits direct recursion plus one linear deeper nested field`);
    }
  }

  const syntheticOuterCtors=decl.constructors.map((ctor,ci)=>{
    const {fields,fieldBinderInfo,result}=splitPi(ctor.type);
    const rewritten=fields.map((field,fi)=>{
      if(ci!==deep!.ctorIndex||fi!==deep!.fieldIndex)return field;
      const extraLocals=fi-mode.sharedParamCount;if(extraLocals<0)throw new KernelError(`${decl.name}: v41 deep field occurs before the complete shared telescope`);
      const shared=Array.from({length:mode.sharedParamCount},(_,i)=>({tag:"bvar",index:extraLocals+mode.sharedParamCount-1-i} as Term));
      const flat=flattenApps(field);
      return mkApps({tag:"const",name:layers[0].auxName,levels:[...selfLevels]},[...shared,...flat.args.slice(1)]);
    });
    return{name:ctor.name,type:rebuildPi(rewritten,fieldBinderInfo,result)};
  });

  const syntheticAuxMembers:Extract<CoreDeclaration,{kind:"mutualInductive"}>["inductives"]=layers.map(layer=>{
    const instantiatedContainerType=instantiateTermLevels(layer.container.type,layer.container.levelParams,layer.containerLevels);
    if(instantiatedContainerType.tag!=="pi")throw new KernelError(`${decl.name}: malformed v41 nested-container type ${layer.containerName}`);
    const ctors=layer.container.constructors.map((ctor,index)=>{
      const instantiatedCtorType=instantiateTermLevels(ctor.type,layer.container.levelParams,layer.containerLevels);
      if(instantiatedCtorType.tag!=="pi")throw new KernelError(`${decl.name}: malformed nested-container constructor ${ctor.name}`);
      const syntheticName=`${layer.auxName}.ctor${index}`;layer.ctorRestore.set(syntheticName,ctor.name);
      const specialized=instantiate(instantiatedCtorType.body,layer.publicParam);
      const rewritten=rewriteNestedDeepV41(specialized,layers,mode.sharedParamCount,selfLevels);
      return{name:syntheticName,type:prependPiTelescope(decl.type,mode.sharedParamCount,rewritten)};
    });
    const auxTail=instantiate(instantiatedContainerType.body,layer.publicParam);
    return{name:layer.auxName,type:prependPiTelescope(decl.type,mode.sharedParamCount,auxTail),numParams:mode.sharedParamCount,numIndices:layer.container.numIndices,constructors:ctors};
  });

  const synthetic:Extract<CoreDeclaration,{kind:"mutualInductive"}>={kind:"mutualInductive",name:`_nested.${decl.name}.deeppolyblock`,levelParams:[...decl.levelParams],inductives:[
    {name:decl.name,type:decl.type,numParams:mode.sharedParamCount,numIndices:mode.outerIndexCount,constructors:syntheticOuterCtors},...syntheticAuxMembers,
  ]};
  const transformed=env.clone();checkDirectMutualInductive(transformed,synthetic);
  const syntheticNames=[decl.name,...layers.map(l=>l.auxName)];
  const targetRecursor=new Map<string,string>(syntheticNames.map((n,i)=>[n,publicRecursors[i]]));
  const helperEntries=syntheticNames.map(n=>{const e=transformed.get(`${n}.rec`);if(!e||e.declaration.kind!=="recursor")throw new KernelError(`${decl.name}: internal v41 nested preprocessing did not generate recursor for ${n}`);return e.declaration;});
  const restoreRecursor=(entry:Extract<EnvironmentDeclaration,{kind:"recursor"}>,ri:number):Extract<EnvironmentDeclaration,{kind:"recursor"}>=>{
    const helper=ri>0;const layer=helper?layers[ri-1]:undefined;
    const rules=entry.metadata.rules.map(rule=>({...rule,ctor:helper?(layer!.ctorRestore.get(rule.ctor)??rule.ctor):rule.ctor,
      recursiveFieldTypes:rule.recursiveFieldTypes?.map(t=>t?restoreNestedDeepV41(t,layers,mode.sharedParamCount,selfLevels):null),recursiveTargets:rule.recursiveTargets?.map(()=>null),recursiveRecursors:rule.recursiveTargets?.map(target=>target?targetRecursor.get(target)??null:null),...(helper?{ctorParamCount:1}:{})}));
    return{kind:"recursor",name:publicRecursors[ri],levelParams:[...entry.levelParams],type:restoreNestedDeepV41(entry.type,layers,mode.sharedParamCount,selfLevels),metadata:{...entry.metadata,inductive:decl.name,rules,mutual:{inductives:syntheticNames,motiveCount:syntheticNames.length,recursors:publicRecursors,indexCounts:[mode.outerIndexCount,...layers.map(l=>l.container.numIndices)]}}};
  };
  const recursors=helperEntries.map(restoreRecursor);
  const assumptions=dependencyAssumptions(transformed,[decl.type,...decl.constructors.map(c=>c.type)]);const generated=[...decl.constructors.map(c=>c.name),...publicRecursors];
  const final=env.clone();final.add({declaration:decl,assumptions,generated});
  for(const ctor of decl.constructors){const ctorSort=kernelWhnf(final,infer(final,[],ctor.type));if(ctorSort.tag!=="sort")throw new KernelError(`${ctor.name}: restored v41 nested constructor type is not a type`);final.add({declaration:{kind:"constructor",name:ctor.name,levelParams:[...decl.levelParams],type:ctor.type,inductive:decl.name},assumptions:dependencyAssumptions(final,[ctor.type]),generated:[]});}
  for(const rec of recursors){const recSort=kernelWhnf(final,infer(final,[],rec.type));if(recSort.tag!=="sort")throw new KernelError(`${rec.name}: restored v41 nested recursor type is not a type`);final.add({declaration:rec,assumptions:dependencyAssumptions(final,[rec.type]),generated:[]});}
  env.replaceWith(final);return{declaration:decl,assumptions,generated};
}

/** Build a trusted prefix context from the outer family telescope. */
function nestedOuterPrefixContextV40(
  decl:Extract<CoreDeclaration,{kind:"inductive"}>,count:number,
):{ctx:Context;args:Term[]} {
  const ctx:Context=[];let tail=decl.type;
  for(let i=0;i<count;i++){
    if(tail.tag!=="pi")throw new KernelError(`${decl.name}: v40 outer telescope shorter than requested shared prefix`);
    ctx.unshift(tail.domain);tail=tail.body;
  }
  const args=Array.from({length:count},(_,i)=>({tag:"bvar",index:count-1-i} as Term));
  return{ctx,args};
}

type NestedV40Chain={layers:NestedV37Layer[];outerArgs:Term[]};

/**
 * v40 chain recognition. `expectedPrefix` is either the ordinary uniform outer
 * parameter tuple (closed/fixed mode) or the full parameter+index tuple after
 * Lean-style captured-index promotion.
 */
function nestedDeepChainV40(
  env:Environment,term:Term,outerName:string,ctx:Context,expectedPrefix:readonly Term[],totalOuterArgs:number,
):NestedV40Chain|undefined{
  const layers:NestedV37Layer[]=[];let current=term;
  while(true){
    const flat=flattenApps(current);
    if(flat.head.tag==="const"&&flat.head.name===outerName&&flat.head.levels.length===0&&flat.args.length===totalOuterArgs){
      if(expectedPrefix.length>flat.args.length)return undefined;
      if(!expectedPrefix.every((a,i)=>defEq(env,ctx,flat.args[i],a)))return undefined;
      return layers.length>=2?{layers,outerArgs:[...flat.args]}:undefined;
    }
    if(flat.head.tag!=="const"||flat.head.levels.length!==0||flat.args.length<1)return undefined;
    const entry=env.get(flat.head.name);if(!entry||entry.declaration.kind!=="inductive")return undefined;
    const container=entry.declaration;
    if(container.levelParams.length!==0||container.numParams!==1||flat.args.length!==1+container.numIndices)return undefined;
    const publicParam=flat.args[0];
    layers.push({containerName:flat.head.name,container,publicParam,publicTerm:current,containerIndices:flat.args.slice(1),auxName:"",ctorRestore:new Map()});
    current=publicParam;
  }
}

type NestedV40Deep={
  ctorIndex:number;fieldIndex:number;layers:NestedV37Layer[];projected:Term;mode:NestedIndexMode;sharedCtx:Context;sharedArgs:Term[];
};

/**
 * v40: arbitrary-depth deeper nesting over a monomorphic indexed outer Type
 * family. Two exact Lean 4.33.1 modes are admitted:
 *
 *  - closed: the helper chain is specialized to a fixed outer index tuple that
 *    can be projected wholly into the uniform outer-parameter context; the
 *    public outer family remains indexed.
 *  - captured: when the complete outer index telescope is uniformly represented
 *    by constructor prefix binders, those indices become additional fixed
 *    parameters of the private mutual translation (and generated recursors),
 *    matching Lean nested-preprocessing auto-promotion.
 *
 * The trusted mutual checker remains the authority for fixed-parameter
 * discipline. Changed local expressions and nonuniform constructor prefixes are
 * rejected rather than approximated.
 */
function tryCheckNestedInductiveV40(
  env:Environment,
  decl:Extract<CoreDeclaration,{kind:"inductive"}>,
):CheckedDeclaration|undefined{
  if(decl.levelParams.length!==0||decl.numIndices<=0)return undefined;
  const totalOuterArgs=decl.numParams+decl.numIndices;
  let outerTail=decl.type;
  for(let p=0;p<totalOuterArgs;p++){
    if(outerTail.tag!=="pi")return undefined;
    outerTail=outerTail.body;
  }
  if(outerTail.tag!=="sort"||!levelDefEq(outerTail.level,levelSucc(LevelZero)))return undefined;

  const paramPrefix=nestedOuterPrefixContextV40(decl,decl.numParams);
  const capturedPrefix=nestedOuterPrefixContextV40(decl,totalOuterArgs);
  let deep:NestedV40Deep|undefined;
  for(let ci=0;ci<decl.constructors.length;ci++){
    const {fields}=splitPi(decl.constructors[ci].type);
    for(let fi=decl.numParams;fi<fields.length;fi++){
      const field=fields[fi];if(!containsConst(field,decl.name))continue;

      // First prefer the closed/fixed classifier: deleting every constructor
      // local must leave a chain whose ordinary parameters are the current ones.
      const projectedClosed=projectNestedIndexToParamContext(field,fi-decl.numParams);
      if(projectedClosed){
        const chain=nestedDeepChainV40(env,projectedClosed,decl.name,paramPrefix.ctx,paramPrefix.args,totalOuterArgs);
        if(chain){
          const fixed=chain.outerArgs.slice(decl.numParams);
          const candidate:NestedV40Deep={ctorIndex:ci,fieldIndex:fi,layers:chain.layers,projected:projectedClosed,mode:{kind:"closed",sharedParamCount:decl.numParams,outerIndexCount:decl.numIndices,fixedIndices:fixed},sharedCtx:paramPrefix.ctx,sharedArgs:paramPrefix.args};
          if(deep)throw new KernelError(`${decl.name}: v40 bounded indexed deeper nested slice admits exactly one linear nested field`);
          deep=candidate;continue;
        }
      }

      // Otherwise try Lean's captured/promoted-index mode. Preserve the first
      // params+indices constructor-prefix binders and delete only later locals.
      if(fi>=totalOuterArgs){
        const projectedCaptured=projectNestedIndexToParamContext(field,fi-totalOuterArgs);
        if(projectedCaptured){
          const chain=nestedDeepChainV40(env,projectedCaptured,decl.name,capturedPrefix.ctx,capturedPrefix.args,totalOuterArgs);
          if(chain){
            const candidate:NestedV40Deep={ctorIndex:ci,fieldIndex:fi,layers:chain.layers,projected:projectedCaptured,mode:{kind:"captured",sharedParamCount:totalOuterArgs,outerIndexCount:0,fixedIndices:[]},sharedCtx:capturedPrefix.ctx,sharedArgs:capturedPrefix.args};
            if(deep)throw new KernelError(`${decl.name}: v40 bounded indexed deeper nested slice admits exactly one linear nested field`);
            deep=candidate;
          }
        }
      }
    }
  }
  if(!deep)return undefined;

  validateName(decl.name);validateLevelParams(decl);
  if(env.has(decl.name))throw new KernelError(`duplicate declaration: ${decl.name}`);
  const publicRecursors=[`${decl.name}.rec`,...deep.layers.map((_,i)=>`${decl.name}.rec_${i+1}`)];
  for(const rn of publicRecursors)if(env.has(rn))throw new KernelError(`${decl.name}: nested recursor name already exists`);

  const {mode,layers,sharedCtx}=deep;
  for(let i=0;i<layers.length;i++){
    const layer=layers[i];layer.auxName=`_nested.${decl.name}.deepindexaux${i+1}`;
    if(env.has(layer.auxName)||env.has(`${layer.auxName}.rec`))throw new KernelError(`${decl.name}: internal v40 nested auxiliary name already exists`);
    const ct=layer.container.type;if(ct.tag!=="pi")throw new KernelError(`${decl.name}: malformed v40 nested container ${layer.containerName}`);
    const paramSort=kernelWhnf(env,ct.domain);
    if(paramSort.tag!=="sort"||!levelDefEq(paramSort.level,levelSucc(LevelZero)))throw new KernelError(`${decl.name}: v40 nested container ${layer.containerName} parameter must be Type`);
    let tail=instantiate(ct.body,layer.publicParam);
    for(let ii=0;ii<layer.container.numIndices;ii++){
      if(tail.tag!=="pi")throw new KernelError(`${decl.name}: v40 nested container ${layer.containerName} index telescope is shorter than numIndices`);
      if(containsConst(tail.domain,decl.name))throw new KernelError(`${decl.name}: v40 rejects container index domains depending on the recursive outer family`);
      tail=tail.body;
    }
    const result=kernelWhnfIn(env,sharedCtx,tail);
    if(result.tag!=="sort"||!levelDefEq(result.level,levelSucc(LevelZero)))throw new KernelError(`${decl.name}: v40 nested container ${layer.containerName} must return Type`);
  }

  // Outside the selected deep field, only direct recursive outer occurrences
  // are admitted by this bounded slice. The synthetic mutual checker validates
  // their exact fixed-parameter/index discipline according to the chosen mode.
  for(let ci=0;ci<decl.constructors.length;ci++){
    const {fields}=splitPi(decl.constructors[ci].type);
    for(let fi=decl.numParams;fi<fields.length;fi++){
      const field=fields[fi];if(!containsConst(field,decl.name))continue;
      if(ci===deep.ctorIndex&&fi===deep.fieldIndex)continue;
      const direct=flattenApps(field);
      if(direct.head.tag==="const"&&direct.head.name===decl.name&&direct.head.levels.length===0&&direct.args.length===totalOuterArgs)continue;
      throw new KernelError(`${decl.constructors[ci].name}: v40 indexed deeper slice only admits direct recursion plus one linear deeper nested field`);
    }
  }

  const syntheticOuterCtors=decl.constructors.map((ctor,ci)=>{
    const {fields,fieldBinderInfo,result}=splitPi(ctor.type);
    const rewritten=fields.map((field,fi)=>{
      if(ci!==deep!.ctorIndex||fi!==deep!.fieldIndex)return field;
      const extraLocals=fi-mode.sharedParamCount;
      if(extraLocals<0)throw new KernelError(`${decl.name}: v40 deep field occurs before the complete shared telescope`);
      const shared=Array.from({length:mode.sharedParamCount},(_,i)=>({tag:"bvar",index:extraLocals+mode.sharedParamCount-1-i} as Term));
      const flat=flattenApps(field);
      return mkApps({tag:"const",name:layers[0].auxName,levels:[]},[...shared,...flat.args.slice(1)]);
    });
    return{name:ctor.name,type:rebuildPi(rewritten,fieldBinderInfo,result)};
  });

  const syntheticAuxMembers:Extract<CoreDeclaration,{kind:"mutualInductive"}>["inductives"]=layers.map(layer=>{
    const ctors=layer.container.constructors.map((ctor,index)=>{
      if(ctor.type.tag!=="pi")throw new KernelError(`${decl.name}: malformed nested-container constructor ${ctor.name}`);
      const syntheticName=`${layer.auxName}.ctor${index}`;layer.ctorRestore.set(syntheticName,ctor.name);
      const specialized=instantiate(ctor.type.body,layer.publicParam);
      const rewritten=rewriteNestedDeepV39(specialized,layers,mode.sharedParamCount);
      return{name:syntheticName,type:prependPiTelescope(decl.type,mode.sharedParamCount,rewritten)};
    });
    const containerType=layer.container.type;if(containerType.tag!=="pi")throw new KernelError(`${decl.name}: malformed nested-container type ${layer.containerName}`);
    const auxTail=instantiate(containerType.body,layer.publicParam);
    return{name:layer.auxName,type:prependPiTelescope(decl.type,mode.sharedParamCount,auxTail),numParams:mode.sharedParamCount,numIndices:layer.container.numIndices,constructors:ctors};
  });

  const synthetic:Extract<CoreDeclaration,{kind:"mutualInductive"}>={
    kind:"mutualInductive",name:`_nested.${decl.name}.deepindexblock`,levelParams:[],inductives:[
      {name:decl.name,type:decl.type,numParams:mode.sharedParamCount,numIndices:mode.outerIndexCount,constructors:syntheticOuterCtors},
      ...syntheticAuxMembers,
    ],
  };
  const transformed=env.clone();checkDirectMutualInductive(transformed,synthetic);
  const syntheticNames=[decl.name,...layers.map(l=>l.auxName)];
  const targetRecursor=new Map<string,string>(syntheticNames.map((n,i)=>[n,publicRecursors[i]]));
  const helperEntries=syntheticNames.map(n=>{
    const e=transformed.get(`${n}.rec`);if(!e||e.declaration.kind!=="recursor")throw new KernelError(`${decl.name}: internal v40 nested preprocessing did not generate recursor for ${n}`);return e.declaration;
  });
  const restoreRecursor=(entry:Extract<EnvironmentDeclaration,{kind:"recursor"}>,ri:number):Extract<EnvironmentDeclaration,{kind:"recursor"}>=>{
    const helper=ri>0;const layer=helper?layers[ri-1]:undefined;
    const rules=entry.metadata.rules.map(rule=>({
      ...rule,
      ctor:helper?(layer!.ctorRestore.get(rule.ctor)??rule.ctor):rule.ctor,
      recursiveFieldTypes:rule.recursiveFieldTypes?.map(t=>t?restoreNestedDeepV39(t,layers,mode.sharedParamCount):null),
      recursiveTargets:rule.recursiveTargets?.map(()=>null),
      recursiveRecursors:rule.recursiveTargets?.map(target=>target?targetRecursor.get(target)??null:null),
      ...(helper?{ctorParamCount:1}:{}),
    }));
    return{kind:"recursor",name:publicRecursors[ri],levelParams:[...entry.levelParams],type:restoreNestedDeepV39(entry.type,layers,mode.sharedParamCount),metadata:{...entry.metadata,inductive:decl.name,rules,mutual:{inductives:syntheticNames,motiveCount:syntheticNames.length,recursors:publicRecursors,indexCounts:[mode.outerIndexCount,...layers.map(l=>l.container.numIndices)]}}};
  };
  const recursors=helperEntries.map(restoreRecursor);

  const assumptions=dependencyAssumptions(transformed,[decl.type,...decl.constructors.map(c=>c.type)]);
  const generated=[...decl.constructors.map(c=>c.name),...publicRecursors];
  const final=env.clone();final.add({declaration:decl,assumptions,generated});
  for(const ctor of decl.constructors){
    const ctorSort=kernelWhnf(final,infer(final,[],ctor.type));if(ctorSort.tag!=="sort")throw new KernelError(`${ctor.name}: restored v40 nested constructor type is not a type`);
    final.add({declaration:{kind:"constructor",name:ctor.name,levelParams:[],type:ctor.type,inductive:decl.name},assumptions:dependencyAssumptions(final,[ctor.type]),generated:[]});
  }
  for(const rec of recursors){
    const recSort=kernelWhnf(final,infer(final,[],rec.type));if(recSort.tag!=="sort")throw new KernelError(`${rec.name}: restored v40 nested recursor type is not a type`);
    final.add({declaration:rec,assumptions:dependencyAssumptions(final,[rec.type]),generated:[]});
  }
  env.replaceWith(final);return{declaration:decl,assumptions,generated};
}

/** Build the trusted outer-parameter context and canonical current parameter tuple. */
function nestedOuterParamContextV39(
  decl:Extract<CoreDeclaration,{kind:"inductive"}>,
):{ctx:Context;args:Term[]} {
  const ctx:Context=[];let tail=decl.type;
  for(let pi=0;pi<decl.numParams;pi++){
    if(tail.tag!=="pi")throw new KernelError(`${decl.name}: v39 outer parameter telescope shorter than numParams`);
    ctx.unshift(tail.domain);tail=tail.body;
  }
  const args=Array.from({length:decl.numParams},(_,i)=>({tag:"bvar",index:decl.numParams-1-i} as Term));
  return{ctx,args};
}

/** v39: recognize a parameter-context deep chain ending in the exact current outer parameters. */
function nestedDeepChainV39(
  env:Environment,term:Term,outerName:string,paramCtx:Context,currentParams:readonly Term[],
):NestedV37Layer[]|undefined{
  const layers:NestedV37Layer[]=[];let current=term;
  while(true){
    const flat=flattenApps(current);
    if(flat.head.tag==="const"&&flat.head.name===outerName&&flat.head.levels.length===0&&flat.args.length===currentParams.length){
      if(!flat.args.every((a,i)=>defEq(env,paramCtx,a,currentParams[i])))return undefined;
      return layers.length>=2?layers:undefined;
    }
    if(flat.head.tag!=="const"||flat.head.levels.length!==0||flat.args.length<1)return undefined;
    const entry=env.get(flat.head.name);if(!entry||entry.declaration.kind!=="inductive")return undefined;
    const container=entry.declaration;
    if(container.levelParams.length!==0||container.numParams!==1||flat.args.length!==1+container.numIndices)return undefined;
    const publicParam=flat.args[0];
    layers.push({containerName:flat.head.name,container,publicParam,publicTerm:current,containerIndices:flat.args.slice(1),auxName:"",ctorRestore:new Map()});
    current=publicParam;
  }
}

/** v39 helper application rewrite with the shared outer parameter tuple made explicit. */
function rewriteNestedDeepV39(
  term:Term,layers:readonly NestedV37Layer[],sharedParamCount:number,depth=0,
):Term{
  const flat=flattenApps(term);
  if(flat.head.tag==="const"&&flat.head.levels.length===0){
    const shared=Array.from({length:sharedParamCount},(_,i)=>({tag:"bvar",index:depth+sharedParamCount-1-i} as Term));
    for(const layer of layers){
      if(flat.head.name!==layer.containerName||flat.args.length!==1+layer.container.numIndices)continue;
      const expected=instantiateNestedParamContext(layer.publicParam,shared);
      if(!sameTerm(flat.args[0],expected))continue;
      return mkApps({tag:"const",name:layer.auxName,levels:[]},[
        ...shared,
        ...flat.args.slice(1).map(a=>rewriteNestedDeepV39(a,layers,sharedParamCount,depth)),
      ]);
    }
  }
  switch(term.tag){
    case"sort":case"bvar":case"const":return term;
    case"app":return{tag:"app",fn:rewriteNestedDeepV39(term.fn,layers,sharedParamCount,depth),arg:rewriteNestedDeepV39(term.arg,layers,sharedParamCount,depth)};
    case"lam":return{tag:"lam",domain:rewriteNestedDeepV39(term.domain,layers,sharedParamCount,depth),body:rewriteNestedDeepV39(term.body,layers,sharedParamCount,depth+1),binderInfo:term.binderInfo};
    case"pi":return{tag:"pi",domain:rewriteNestedDeepV39(term.domain,layers,sharedParamCount,depth),body:rewriteNestedDeepV39(term.body,layers,sharedParamCount,depth+1),binderInfo:term.binderInfo};
    case"let":return{tag:"let",type:rewriteNestedDeepV39(term.type,layers,sharedParamCount,depth),value:rewriteNestedDeepV39(term.value,layers,sharedParamCount,depth),body:rewriteNestedDeepV39(term.body,layers,sharedParamCount,depth+1),nondep:term.nondep};
    case"proj":return{tag:"proj",typeName:term.typeName,index:term.index,expr:rewriteNestedDeepV39(term.expr,layers,sharedParamCount,depth)};
  }
}

/** Restore v39 private helper families/constructors to public parameterized container terms. */
function restoreNestedDeepV39(term:Term,layers:readonly NestedV37Layer[],sharedParamCount:number):Term{
  const flat=flattenApps(term);
  if(flat.head.tag==="const"&&flat.head.levels.length===0){
    for(const layer of layers){
      if(flat.head.name===layer.auxName&&flat.args.length===sharedParamCount+layer.container.numIndices){
        const shared=flat.args.slice(0,sharedParamCount).map(a=>restoreNestedDeepV39(a,layers,sharedParamCount));
        const indices=flat.args.slice(sharedParamCount).map(a=>restoreNestedDeepV39(a,layers,sharedParamCount));
        const publicParam=restoreNestedDeepV39(instantiateNestedParamContext(layer.publicParam,shared),layers,sharedParamCount);
        return mkApps({tag:"const",name:layer.containerName,levels:[]},[publicParam,...indices]);
      }
      const originalCtor=layer.ctorRestore.get(flat.head.name);
      if(originalCtor&&flat.args.length>=sharedParamCount){
        const shared=flat.args.slice(0,sharedParamCount).map(a=>restoreNestedDeepV39(a,layers,sharedParamCount));
        const fields=flat.args.slice(sharedParamCount).map(a=>restoreNestedDeepV39(a,layers,sharedParamCount));
        const publicParam=restoreNestedDeepV39(instantiateNestedParamContext(layer.publicParam,shared),layers,sharedParamCount);
        return mkApps({tag:"const",name:originalCtor,levels:[]},[publicParam,...fields]);
      }
    }
  }
  switch(term.tag){
    case"sort":case"bvar":case"const":return term;
    case"app":return{tag:"app",fn:restoreNestedDeepV39(term.fn,layers,sharedParamCount),arg:restoreNestedDeepV39(term.arg,layers,sharedParamCount)};
    case"lam":return{tag:"lam",domain:restoreNestedDeepV39(term.domain,layers,sharedParamCount),body:restoreNestedDeepV39(term.body,layers,sharedParamCount),binderInfo:term.binderInfo};
    case"pi":return{tag:"pi",domain:restoreNestedDeepV39(term.domain,layers,sharedParamCount),body:restoreNestedDeepV39(term.body,layers,sharedParamCount),binderInfo:term.binderInfo};
    case"let":return{tag:"let",type:restoreNestedDeepV39(term.type,layers,sharedParamCount),value:restoreNestedDeepV39(term.value,layers,sharedParamCount),body:restoreNestedDeepV39(term.body,layers,sharedParamCount),nondep:term.nondep};
    case"proj":return{tag:"proj",typeName:term.typeName,index:term.index,expr:restoreNestedDeepV39(term.expr,layers,sharedParamCount)};
  }
}

/**
 * v39: arbitrary-depth deeper nesting over a monomorphic, indexless outer Type
 * family with one or more uniform/dependent parameters. Deep fields are first
 * projected into the outer-parameter context, excluding constructor-local
 * capture. Every synthetic helper carries the exact same shared parameter
 * telescope; the trusted mutual checker revalidates fixed-parameter discipline.
 */
function tryCheckNestedInductiveV39(
  env:Environment,
  decl:Extract<CoreDeclaration,{kind:"inductive"}>,
):CheckedDeclaration|undefined{
  if(decl.levelParams.length!==0||decl.numParams<=0||decl.numIndices!==0)return undefined;
  let outerTail=decl.type;
  for(let p=0;p<decl.numParams;p++){
    if(outerTail.tag!=="pi")return undefined;
    outerTail=outerTail.body;
  }
  if(outerTail.tag!=="sort"||!levelDefEq(outerTail.level,levelSucc(LevelZero)))return undefined;
  const {ctx:paramCtx,args:currentParams}=nestedOuterParamContextV39(decl);

  let deep:{ctorIndex:number;fieldIndex:number;layers:NestedV37Layer[];projected:Term}|undefined;
  for(let ci=0;ci<decl.constructors.length;ci++){
    const {fields}=splitPi(decl.constructors[ci].type);
    for(let fi=decl.numParams;fi<fields.length;fi++){
      if(!containsConst(fields[fi],decl.name))continue;
      const projected=projectNestedIndexToParamContext(fields[fi],fi-decl.numParams);
      if(!projected)continue;
      const layers=nestedDeepChainV39(env,projected,decl.name,paramCtx,currentParams);
      if(!layers)continue;
      if(deep)throw new KernelError(`${decl.name}: v39 bounded parameterized deeper nested slice admits exactly one uniform linear nested field`);
      deep={ctorIndex:ci,fieldIndex:fi,layers,projected};
    }
  }
  if(!deep)return undefined;

  validateName(decl.name);validateLevelParams(decl);
  if(env.has(decl.name))throw new KernelError(`duplicate declaration: ${decl.name}`);
  const publicRecursors=[`${decl.name}.rec`,...deep.layers.map((_,i)=>`${decl.name}.rec_${i+1}`)];
  for(const rn of publicRecursors)if(env.has(rn))throw new KernelError(`${decl.name}: nested recursor name already exists`);

  const layers=deep.layers;
  for(let i=0;i<layers.length;i++){
    const layer=layers[i];layer.auxName=`_nested.${decl.name}.deepparamaux${i+1}`;
    if(env.has(layer.auxName)||env.has(`${layer.auxName}.rec`))throw new KernelError(`${decl.name}: internal v39 nested auxiliary name already exists`);
    const ct=layer.container.type;
    if(ct.tag!=="pi")throw new KernelError(`${decl.name}: malformed v39 nested container ${layer.containerName}`);
    const paramSort=kernelWhnf(env,ct.domain);
    if(paramSort.tag!=="sort"||!levelDefEq(paramSort.level,levelSucc(LevelZero)))throw new KernelError(`${decl.name}: v39 nested container ${layer.containerName} parameter must be Type`);
    let tail=instantiate(ct.body,layer.publicParam);
    for(let ii=0;ii<layer.container.numIndices;ii++){
      if(tail.tag!=="pi")throw new KernelError(`${decl.name}: v39 nested container ${layer.containerName} index telescope is shorter than numIndices`);
      if(containsConst(tail.domain,decl.name))throw new KernelError(`${decl.name}: v39 rejects container index domains depending on the recursive outer family`);
      tail=tail.body;
    }
    const result=kernelWhnfIn(env,paramCtx,tail);
    if(result.tag!=="sort"||!levelDefEq(result.level,levelSucc(LevelZero)))throw new KernelError(`${decl.name}: v39 nested container ${layer.containerName} must return Type`);
  }

  // Recursive occurrences outside the selected deep field must be the exact
  // current outer family application. Projecting removes constructor locals and
  // therefore rejects any local-dependent recursive specialization.
  for(let ci=0;ci<decl.constructors.length;ci++){
    const {fields}=splitPi(decl.constructors[ci].type);
    for(let fi=decl.numParams;fi<fields.length;fi++){
      const field=fields[fi];if(!containsConst(field,decl.name))continue;
      if(ci===deep.ctorIndex&&fi===deep.fieldIndex)continue;
      const projected=projectNestedIndexToParamContext(field,fi-decl.numParams);
      if(!projected)throw new KernelError(`${decl.constructors[ci].name}: v39 recursive field depends on a constructor-local value`);
      const direct=flattenApps(projected);
      if(direct.head.tag==="const"&&direct.head.name===decl.name&&direct.head.levels.length===0&&direct.args.length===decl.numParams&&direct.args.every((a,i)=>defEq(env,paramCtx,a,currentParams[i])))continue;
      throw new KernelError(`${decl.constructors[ci].name}: v39 recursive occurrence must preserve the exact uniform outer parameter tuple`);
    }
  }

  const syntheticOuterCtors=decl.constructors.map((ctor,ci)=>{
    const {fields,fieldBinderInfo,result}=splitPi(ctor.type);
    const rewritten=fields.map((field,fi)=>{
      if(ci!==deep!.ctorIndex||fi!==deep!.fieldIndex)return field;
      const flat=flattenApps(field);const localCount=fi-decl.numParams;
      const shared=Array.from({length:decl.numParams},(_,i)=>({tag:"bvar",index:localCount+decl.numParams-1-i} as Term));
      return mkApps({tag:"const",name:layers[0].auxName,levels:[]},[...shared,...flat.args.slice(1)]);
    });
    return{name:ctor.name,type:rebuildPi(rewritten,fieldBinderInfo,result)};
  });

  const syntheticAuxMembers:Extract<CoreDeclaration,{kind:"mutualInductive"}>["inductives"]=layers.map(layer=>{
    const ctors=layer.container.constructors.map((ctor,index)=>{
      if(ctor.type.tag!=="pi")throw new KernelError(`${decl.name}: malformed nested-container constructor ${ctor.name}`);
      const syntheticName=`${layer.auxName}.ctor${index}`;layer.ctorRestore.set(syntheticName,ctor.name);
      const specialized=instantiate(ctor.type.body,layer.publicParam);
      const rewritten=rewriteNestedDeepV39(specialized,layers,decl.numParams);
      return{name:syntheticName,type:prependPiTelescope(decl.type,decl.numParams,rewritten)};
    });
    const containerType=layer.container.type;if(containerType.tag!=="pi")throw new KernelError(`${decl.name}: malformed nested-container type ${layer.containerName}`);
    const auxTail=instantiate(containerType.body,layer.publicParam);
    return{name:layer.auxName,type:prependPiTelescope(decl.type,decl.numParams,auxTail),numParams:decl.numParams,numIndices:layer.container.numIndices,constructors:ctors};
  });

  const synthetic:Extract<CoreDeclaration,{kind:"mutualInductive"}>={
    kind:"mutualInductive",name:`_nested.${decl.name}.deepparamblock`,levelParams:[],inductives:[
      {name:decl.name,type:decl.type,numParams:decl.numParams,numIndices:0,constructors:syntheticOuterCtors},
      ...syntheticAuxMembers,
    ],
  };
  const transformed=env.clone();checkDirectMutualInductive(transformed,synthetic);
  const syntheticNames=[decl.name,...layers.map(l=>l.auxName)];
  const targetRecursor=new Map<string,string>(syntheticNames.map((n,i)=>[n,publicRecursors[i]]));
  const helperEntries=syntheticNames.map(n=>{
    const e=transformed.get(`${n}.rec`);if(!e||e.declaration.kind!=="recursor")throw new KernelError(`${decl.name}: internal v39 nested preprocessing did not generate recursor for ${n}`);return e.declaration;
  });
  const restoreRecursor=(entry:Extract<EnvironmentDeclaration,{kind:"recursor"}>,ri:number):Extract<EnvironmentDeclaration,{kind:"recursor"}>=>{
    const helper=ri>0;const layer=helper?layers[ri-1]:undefined;
    const rules=entry.metadata.rules.map(rule=>({
      ...rule,
      ctor:helper?(layer!.ctorRestore.get(rule.ctor)??rule.ctor):rule.ctor,
      recursiveFieldTypes:rule.recursiveFieldTypes?.map(t=>t?restoreNestedDeepV39(t,layers,decl.numParams):null),
      recursiveTargets:rule.recursiveTargets?.map(()=>null),
      recursiveRecursors:rule.recursiveTargets?.map(target=>target?targetRecursor.get(target)??null:null),
      ...(helper?{ctorParamCount:1}:{}),
    }));
    return{kind:"recursor",name:publicRecursors[ri],levelParams:[...entry.levelParams],type:restoreNestedDeepV39(entry.type,layers,decl.numParams),metadata:{...entry.metadata,inductive:decl.name,rules,mutual:{inductives:syntheticNames,motiveCount:syntheticNames.length,recursors:publicRecursors,indexCounts:[0,...layers.map(l=>l.container.numIndices)]}}};
  };
  const recursors=helperEntries.map(restoreRecursor);

  const assumptions=dependencyAssumptions(transformed,[decl.type,...decl.constructors.map(c=>c.type)]);
  const generated=[...decl.constructors.map(c=>c.name),...publicRecursors];
  const final=env.clone();final.add({declaration:decl,assumptions,generated});
  for(const ctor of decl.constructors){
    const ctorSort=kernelWhnf(final,infer(final,[],ctor.type));if(ctorSort.tag!=="sort")throw new KernelError(`${ctor.name}: restored v39 nested constructor type is not a type`);
    final.add({declaration:{kind:"constructor",name:ctor.name,levelParams:[],type:ctor.type,inductive:decl.name},assumptions:dependencyAssumptions(final,[ctor.type]),generated:[]});
  }
  for(const rec of recursors){
    const recSort=kernelWhnf(final,infer(final,[],rec.type));if(recSort.tag!=="sort")throw new KernelError(`${rec.name}: restored v39 nested recursor type is not a type`);
    final.add({declaration:rec,assumptions:dependencyAssumptions(final,[rec.type]),generated:[]});
  }
  env.replaceWith(final);return{declaration:decl,assumptions,generated};
}

/**
 * v38 general closed linear-depth nested preprocessing.
 *
 * This inherits v37's deliberately narrow outer/container universe and parameter
 * boundary, but removes the fixed two-layer limit. Every additional public
 * container layer becomes one private mutual helper family and one linked
 * recursor, derived entirely by the trusted kernel.
 */
function tryCheckNestedInductiveV38(
  env:Environment,
  decl:Extract<CoreDeclaration,{kind:"inductive"}>,
):CheckedDeclaration|undefined{
  if(decl.levelParams.length!==0||decl.numParams!==0||decl.numIndices!==0)return undefined;
  if(decl.type.tag!=="sort"||!levelDefEq(decl.type.level,levelSucc(LevelZero)))return undefined;

  let deep:{ctorIndex:number;fieldIndex:number;layers:NestedV37Layer[]}|undefined;
  for(let ci=0;ci<decl.constructors.length;ci++){
    const {fields}=splitPi(decl.constructors[ci].type);
    for(let fi=0;fi<fields.length;fi++){
      if(!containsConst(fields[fi],decl.name))continue;
      const layers=nestedDeepChainV38(env,fields[fi],decl.name);
      if(!layers)continue;
      if(deep)throw new KernelError(`${decl.name}: v38 bounded deeper nested slice admits exactly one closed linear nested field of depth at least two`);
      deep={ctorIndex:ci,fieldIndex:fi,layers};
    }
  }
  if(!deep)return undefined;

  validateName(decl.name);validateLevelParams(decl);
  if(env.has(decl.name))throw new KernelError(`duplicate declaration: ${decl.name}`);
  const publicRecursors=[`${decl.name}.rec`,...deep.layers.map((_,i)=>`${decl.name}.rec_${i+1}`)];
  for(const rn of publicRecursors)if(env.has(rn))throw new KernelError(`${decl.name}: nested recursor name already exists`);

  const layers=deep.layers;
  for(let i=0;i<layers.length;i++){
    const layer=layers[i];
    layer.auxName=`_nested.${decl.name}.deepaux${i+1}`;
    if(env.has(layer.auxName)||env.has(`${layer.auxName}.rec`))throw new KernelError(`${decl.name}: internal v38 nested auxiliary name already exists`);
    const ct=layer.container.type;
    if(ct.tag!=="pi")throw new KernelError(`${decl.name}: malformed v38 nested container ${layer.containerName}`);
    const paramSort=kernelWhnf(env,ct.domain);
    if(paramSort.tag!=="sort"||!levelDefEq(paramSort.level,levelSucc(LevelZero)))
      throw new KernelError(`${decl.name}: v38 nested container ${layer.containerName} parameter must be Type`);
    let tail=instantiate(ct.body,layer.publicParam);
    for(let ii=0;ii<layer.container.numIndices;ii++){
      if(tail.tag!=="pi")throw new KernelError(`${decl.name}: v38 nested container ${layer.containerName} index telescope is shorter than numIndices`);
      if(containsConst(tail.domain,decl.name))throw new KernelError(`${decl.name}: v38 rejects container index domains depending on the recursive outer family`);
      tail=tail.body;
    }
    const result=kernelWhnf(env,tail);
    if(result.tag!=="sort"||!levelDefEq(result.level,levelSucc(LevelZero)))
      throw new KernelError(`${decl.name}: v38 nested container ${layer.containerName} must return Type`);
  }

  // Every recursive occurrence outside the selected deep field must be a direct
  // recursive outer field. One-level/multiple nested declarations continue
  // through the already-frozen v33-v36 path when this v38 recognizer returns undefined.
  for(let ci=0;ci<decl.constructors.length;ci++){
    const {fields}=splitPi(decl.constructors[ci].type);
    for(let fi=0;fi<fields.length;fi++){
      const field=fields[fi];if(!containsConst(field,decl.name))continue;
      if(ci===deep.ctorIndex&&fi===deep.fieldIndex)continue;
      const direct=flattenApps(field);
      if(direct.head.tag==="const"&&direct.head.name===decl.name&&direct.head.levels.length===0&&direct.args.length===0)continue;
      throw new KernelError(`${decl.constructors[ci].name}: v38 bounded deeper nested slice only admits direct recursion plus one closed linear nested field`);
    }
  }

  const syntheticOuterCtors=decl.constructors.map((ctor,ci)=>{
    const {fields,fieldBinderInfo,result}=splitPi(ctor.type);
    const rewritten=fields.map((field,fi)=>ci===deep!.ctorIndex&&fi===deep!.fieldIndex
      ?mkApps({tag:"const",name:layers[0].auxName,levels:[]},layers[0].containerIndices)
      :field);
    return{name:ctor.name,type:rebuildPi(rewritten,fieldBinderInfo,result)};
  });

  const syntheticAuxMembers:Extract<CoreDeclaration,{kind:"mutualInductive"}>["inductives"]=layers.map(layer=>{
    const ctors=layer.container.constructors.map((ctor,index)=>{
      if(ctor.type.tag!=="pi")throw new KernelError(`${decl.name}: malformed nested-container constructor ${ctor.name}`);
      const syntheticName=`${layer.auxName}.ctor${index}`;layer.ctorRestore.set(syntheticName,ctor.name);
      const specialized=instantiate(ctor.type.body,layer.publicParam);
      return{name:syntheticName,type:rewriteNestedDeepV37(specialized,layers)};
    });
    const containerType=layer.container.type;
    if(containerType.tag!=="pi")throw new KernelError(`${decl.name}: malformed nested-container type ${layer.containerName}`);
    const auxType=instantiate(containerType.body,layer.publicParam);
    return{name:layer.auxName,type:auxType,numParams:0,numIndices:layer.container.numIndices,constructors:ctors};
  });

  const synthetic:Extract<CoreDeclaration,{kind:"mutualInductive"}>={
    kind:"mutualInductive",name:`_nested.${decl.name}.deepblock`,levelParams:[],inductives:[
      {name:decl.name,type:decl.type,numParams:0,numIndices:0,constructors:syntheticOuterCtors},
      ...syntheticAuxMembers,
    ],
  };
  const transformed=env.clone();checkDirectMutualInductive(transformed,synthetic);
  const syntheticNames=[decl.name,...layers.map(l=>l.auxName)];
  const targetRecursor=new Map<string,string>(syntheticNames.map((n,i)=>[n,publicRecursors[i]]));
  const helperEntries=syntheticNames.map(n=>{
    const e=transformed.get(`${n}.rec`);
    if(!e||e.declaration.kind!=="recursor")throw new KernelError(`${decl.name}: internal v38 nested preprocessing did not generate recursor for ${n}`);
    return e.declaration;
  });

  const restoreRecursor=(entry:Extract<EnvironmentDeclaration,{kind:"recursor"}>,ri:number):Extract<EnvironmentDeclaration,{kind:"recursor"}>=>{
    const helper=ri>0;const layer=helper?layers[ri-1]:undefined;
    const rules=entry.metadata.rules.map(rule=>({
      ...rule,
      ctor:helper?(layer!.ctorRestore.get(rule.ctor)??rule.ctor):rule.ctor,
      recursiveFieldTypes:rule.recursiveFieldTypes?.map(t=>t?restoreNestedDeepV37(t,layers):null),
      recursiveTargets:rule.recursiveTargets?.map(()=>null),
      recursiveRecursors:rule.recursiveTargets?.map(target=>target?targetRecursor.get(target)??null:null),
      ...(helper?{ctorParamCount:1}:{}),
    }));
    return{kind:"recursor",name:publicRecursors[ri],levelParams:[...entry.levelParams],type:restoreNestedDeepV37(entry.type,layers),metadata:{...entry.metadata,inductive:decl.name,rules,mutual:{inductives:syntheticNames,motiveCount:syntheticNames.length,recursors:publicRecursors,indexCounts:[0,...layers.map(l=>l.container.numIndices)]}}};
  };
  const recursors=helperEntries.map(restoreRecursor);

  const assumptions=dependencyAssumptions(transformed,[decl.type,...decl.constructors.map(c=>c.type)]);
  const generated=[...decl.constructors.map(c=>c.name),...publicRecursors];
  const final=env.clone();final.add({declaration:decl,assumptions,generated});
  for(const ctor of decl.constructors){
    const ctorSort=kernelWhnf(final,infer(final,[],ctor.type));
    if(ctorSort.tag!=="sort")throw new KernelError(`${ctor.name}: restored v38 nested constructor type is not a type`);
    final.add({declaration:{kind:"constructor",name:ctor.name,levelParams:[],type:ctor.type,inductive:decl.name},assumptions:dependencyAssumptions(final,[ctor.type]),generated:[]});
  }
  for(const rec of recursors){
    const recSort=kernelWhnf(final,infer(final,[],rec.type));
    if(recSort.tag!=="sort")throw new KernelError(`${rec.name}: restored v38 nested recursor type is not a type`);
    final.add({declaration:rec,assumptions:dependencyAssumptions(final,[rec.type]),generated:[]});
  }
  env.replaceWith(final);
  return{declaration:decl,assumptions,generated};
}

type NestedV33Occurrence={
  ctorIndex:number;fieldIndex:number;containerName:string;containerLevels:Level[];outerArgs:Term[];containerIndices:Term[];localCount:number;projectedIndices?:Term[];specIndex?:number;
};
type NestedV33Spec={
  containerName:string;containerLevels:Level[];container:Extract<CoreDeclaration,{kind:"inductive"}>;auxName:string;mode:NestedIndexMode;ctorRestore:Map<string,string>;
};

/** Rebuild a Pi telescope after replacing selected direct field domains. */
function rebuildPi(fields:readonly Term[],infos:readonly BinderInfo[],result:Term):Term{
  let out=result;
  for(let i=fields.length-1;i>=0;i--)out={tag:"pi",domain:fields[i],body:out,binderInfo:infos[i]};
  return out;
}

/**
 * v33: multiple compatible nested auxiliary families.
 *
 * Lean 4.33.1 accepts multiple closed fixed specializations (including multiple
 * specializations of one container) and multiple captured-current containers.
 * It rejects a declaration that mixes captured-current and closed-specialized
 * nested occurrences.  v33 mirrors that boundary and keeps v29-v32 untouched.
 */
function tryCheckNestedInductiveV33(
  env:Environment,
  decl:Extract<CoreDeclaration,{kind:"inductive"}>,
):CheckedDeclaration|undefined{
  const totalOuterArgs=decl.numParams+decl.numIndices;
  const indexedContainers=env.allowNestedIndexedContainers;
  const poly=env.allowNestedPolymorphic;
  const selfLevels=decl.levelParams.map(name=>({tag:"param",name} as Level));
  const occurrences:NestedV33Occurrence[]=[];
  for(let ci=0;ci<decl.constructors.length;ci++){
    const {fields}=splitPi(decl.constructors[ci].type);
    for(let fi=decl.numParams;fi<fields.length;fi++){
      const nested=indexedContainers
        ?nestedSpecializationIndexedPoly(fields[fi],decl.name,totalOuterArgs,selfLevels)
        :poly?nestedSpecializationPoly(fields[fi],decl.name,totalOuterArgs,selfLevels):nestedSpecialization(fields[fi],decl.name,totalOuterArgs);
      if(nested&&nested.containerName!==decl.name){
        const containerLevels:Level[]="containerLevels" in nested?[...((nested as unknown as {containerLevels:Level[]}).containerLevels)]:[];
        const containerIndices:Term[]="containerIndices" in nested?[...((nested as unknown as {containerIndices:Term[]}).containerIndices)]:[];
        occurrences.push({ctorIndex:ci,fieldIndex:fi,containerName:nested.containerName,containerLevels,outerArgs:nested.outerArgs,containerIndices,localCount:fi-decl.numParams});
      }
    }
  }
  if(occurrences.length===0)return undefined;

  const milestone=indexedContainers?"v35":poly?"v34":"v33";
  validateName(decl.name);validateLevelParams(decl);
  if(!poly&&decl.levelParams.length!==0)throw new KernelError(`${decl.name}: ${milestone} nested slice requires a monomorphic outer inductive`);
  if(env.has(decl.name))throw new KernelError(`duplicate declaration: ${decl.name}`);
  for(let i=0;i<=occurrences.length;i++)if(env.has(`${decl.name}.rec${i===0?"":`_${i}`}`))throw new KernelError(`${decl.name}: nested recursor name already exists`);

  let outerTail=decl.type;
  for(let p=0;p<totalOuterArgs;p++){
    if(outerTail.tag!=="pi")throw new KernelError(`${decl.name}: nested outer telescope shorter than parameters + indices`);
    outerTail=outerTail.body;
  }
  if(outerTail.tag!=="sort"||!(poly?isNeverZero(outerTail.level):levelDefEq(outerTail.level,levelSucc(LevelZero))))
    throw new KernelError(`${decl.name}: ${milestone} nested slice requires an outer family in Type`);

  const paramCtx:Context=[];let paramTail=decl.type;
  for(let pi=0;pi<decl.numParams;pi++){
    if(paramTail.tag!=="pi")throw new KernelError(`${decl.name}: nested outer parameter telescope shorter than numParams`);
    paramCtx.unshift(paramTail.domain);paramTail=paramTail.body;
  }

  // Classify every occurrence individually. For indexed outers either all
  // occurrences project into the uniform-parameter context (closed mode) or
  // none do (captured-current mode). Lean rejects mixing the two forms.
  let globalKind:"closed"|"captured"="closed";
  if(decl.numIndices!==0){
    let projectedCount=0;
    for(const occ of occurrences){
      const projected:Term[]=[];let ok=true;
      for(const indexTerm of occ.outerArgs.slice(decl.numParams)){
        const t=projectNestedIndexToParamContext(indexTerm,occ.localCount);
        if(!t){ok=false;break;} projected.push(t);
      }
      if(ok){occ.projectedIndices=projected;projectedCount++;}
    }
    if(projectedCount!==0&&projectedCount!==occurrences.length)
      throw new KernelError(`${decl.name}: v33 nested slice rejects mixed captured-current and closed fixed specializations`);
    globalKind=projectedCount===occurrences.length?"closed":"captured";
  }else{
    for(const occ of occurrences)occ.projectedIndices=[];
  }
  const sharedParamCount=globalKind==="captured"?totalOuterArgs:decl.numParams;
  const outerIndexCount=globalKind==="captured"?0:decl.numIndices;

  // Validate each referenced container independently. v33 still deliberately
  // keeps the v29-v32 container shape: monomorphic Type -> Type, one parameter,
  // zero indices. The extension is multiplicity, not broader container shape.
  const containerCache=new Map<string,Extract<CoreDeclaration,{kind:"inductive"}>>();
  for(const occ of occurrences){
    if(containerCache.has(occ.containerName))continue;
    const entry=env.get(occ.containerName);
    if(!entry||entry.declaration.kind!=="inductive")throw new KernelError(`${decl.name}: nested container ${occ.containerName} is not an already-checked inductive`);
    const container=entry.declaration;
    if(container.numParams!==1||(!indexedContainers&&container.numIndices!==0)||(!poly&&container.levelParams.length!==0))
      throw new KernelError(`${decl.name}: ${milestone} nested container ${occ.containerName} must have exactly one parameter${indexedContainers?"":" and no indices"}${poly?"":" and be monomorphic"}`);
    for(const row of occurrences)if(row.containerName===occ.containerName&&row.containerIndices.length!==container.numIndices)
      throw new KernelError(`${decl.name}: ${milestone} nested container ${occ.containerName} index arity mismatch`);
    if(poly&&occ.containerLevels.length!==container.levelParams.length)
      throw new KernelError(`${decl.name}: ${milestone} nested container ${occ.containerName} universe arity mismatch`);
    // Keep one explicit universe instantiation per container name in this first polymorphic slice.
    if(poly){
      for(const prev of occurrences)if(prev!==occ&&prev.containerName===occ.containerName&&prev.containerLevels.length&& !levelsDefEq(prev.containerLevels,occ.containerLevels))
        throw new KernelError(`${decl.name}: ${milestone} bounded slice requires one universe instantiation per nested container`);
    }
    const instantiatedType=poly?instantiateTermLevels(container.type,container.levelParams,occ.containerLevels):container.type;
    if(instantiatedType.tag!=="pi")throw new KernelError(`${decl.name}: ${milestone} malformed nested container ${occ.containerName} type`);
    let resultTail=instantiatedType.body;
    for(let ii=0;ii<container.numIndices;ii++){
      if(resultTail.tag!=="pi")throw new KernelError(`${decl.name}: ${milestone} nested container ${occ.containerName} index telescope is shorter than numIndices`);
      resultTail=resultTail.body;
    }
    const resultType=kernelWhnf(env,resultTail);
    if(resultType.tag!=="sort"||!levelDefEq(resultType.level,outerTail.level))
      throw new KernelError(`${decl.name}: ${milestone} nested container ${occ.containerName} result universe must match the outer family universe`);
    const paramType=kernelWhnf(env,instantiatedType.domain);
    if(paramType.tag!=="sort"||!levelDefEq(paramType.level,outerTail.level))
      throw new KernelError(`${decl.name}: ${milestone} nested container ${occ.containerName} parameter universe must match the outer family universe`);
    containerCache.set(occ.containerName,container);
  }

  // Build one auxiliary family per unique (container, specialization) in first
  // occurrence order. Captured-current occurrences are unique by container;
  // closed occurrences are grouped by definitional equality in the parameter context.
  const specs:NestedV33Spec[]=[];
  for(const occ of occurrences){
    let found=-1;
    for(let si=0;si<specs.length;si++){
      const spec=specs[si]; if(spec.containerName!==occ.containerName||!levelsDefEq(spec.containerLevels,occ.containerLevels))continue;
      if(globalKind==="captured"){found=si;break;}
      const xs=occ.projectedIndices??[],ys=spec.mode.fixedIndices;
      if(xs.length===ys.length&&xs.every((x,i)=>defEq(env,paramCtx,x,ys[i]))){found=si;break;}
    }
    if(found<0){
      let auxName=`_nested.${decl.name}.aux${specs.length===0?"":specs.length+1}`;
      for(let n=1;env.has(auxName)||env.has(`${auxName}.rec`);n++)auxName=`_nested.${decl.name}.aux${specs.length+1}_${n}`;
      const mode:NestedIndexMode=globalKind==="captured"
        ?{kind:"captured",sharedParamCount,outerIndexCount:0,fixedIndices:[]}
        :{kind:"closed",sharedParamCount,outerIndexCount,fixedIndices:[...(occ.projectedIndices??[])]};
      specs.push({containerName:occ.containerName,containerLevels:[...occ.containerLevels],container:containerCache.get(occ.containerName)!,auxName,mode,ctorRestore:new Map()});
      found=specs.length-1;
    }
    occ.specIndex=found;
  }

  // Fail closed on unsupported recursive shapes. Direct outer recursion remains
  // available; every nested recursive field must be one of the occurrences above.
  const occurrenceAt=new Map<string,NestedV33Occurrence>();
  for(const occ of occurrences)occurrenceAt.set(`${occ.ctorIndex}:${occ.fieldIndex}`,occ);
  for(let ci=0;ci<decl.constructors.length;ci++){
    const {fields}=splitPi(decl.constructors[ci].type);
    for(let fi=decl.numParams;fi<fields.length;fi++){
      const field=fields[fi];
      if(!containsConst(field,decl.name))continue;
      if(poly?nestedOuterApplicationPoly(field,decl.name,totalOuterArgs,selfLevels):nestedOuterApplication(field,decl.name,totalOuterArgs))continue;
      if(occurrenceAt.has(`${ci}:${fi}`))continue;
      throw new KernelError(`${decl.constructors[ci].name}: ${milestone} nested slice only admits direct outer recursion or one-level checked nested specializations`);
    }
  }

  // Rebuild outer constructors, replacing each direct nested field with its own
  // auxiliary family application. This avoids guessing specialization identity
  // from shifted de Bruijn syntax across different constructor-local contexts.
  const syntheticOuterCtors=decl.constructors.map((ctor,ci)=>{
    const {fields,fieldBinderInfo,result}=splitPi(ctor.type);
    const rewritten=fields.map((field,fi)=>{
      const occ=occurrenceAt.get(`${ci}:${fi}`); if(!occ)return field;
      const spec=specs[occ.specIndex!];
      const args=globalKind==="captured"?occ.outerArgs:occ.outerArgs.slice(0,decl.numParams);
      return mkApps({tag:"const",name:spec.auxName,levels:poly?[...selfLevels]:[]},indexedContainers?[...args,...occ.containerIndices]:args);
    });
    return{name:ctor.name,type:rebuildPi(rewritten,fieldBinderInfo,result)};
  });

  const sharedArgs=Array.from({length:sharedParamCount},(_,p)=>({tag:"bvar",index:sharedParamCount-1-p} as Term));
  const syntheticAuxMembers:Extract<CoreDeclaration,{kind:"mutualInductive"}>["inductives"]=specs.map(spec=>{
    const outerAtSpecialization=mkApps({tag:"const",name:decl.name,levels:poly?[...selfLevels]:[]},
      globalKind==="captured"?sharedArgs:[...sharedArgs,...spec.mode.fixedIndices.map(t=>instantiateNestedParamContext(t,sharedArgs))]);
    const ctors=spec.container.constructors.map((ctor,index)=>{
      if(ctor.type.tag!=="pi")throw new KernelError(`${decl.name}: malformed nested-container constructor ${ctor.name}`);
      const syntheticName=`${spec.auxName}.ctor${index}`; spec.ctorRestore.set(syntheticName,ctor.name);
      const instantiatedCtorType=poly?instantiateTermLevels(ctor.type,spec.container.levelParams,spec.containerLevels):ctor.type;
      if(instantiatedCtorType.tag!=="pi")throw new KernelError(`${decl.name}: malformed nested-container constructor ${ctor.name}`);
      const specialized=instantiate(instantiatedCtorType.body,outerAtSpecialization);
      const rewritten=indexedContainers
        ?rewriteNestedSpecializationToAuxIndexedPoly(specialized,spec.containerName,spec.containerLevels,decl.name,selfLevels,spec.auxName,totalOuterArgs,spec.mode,spec.container.numIndices)
        :poly?rewriteNestedSpecializationToAuxPoly(specialized,spec.containerName,spec.containerLevels,decl.name,selfLevels,spec.auxName,totalOuterArgs,spec.mode)
        :rewriteNestedSpecializationToAux(specialized,spec.containerName,decl.name,spec.auxName,totalOuterArgs,spec.mode);
      return{name:syntheticName,type:prependPiTelescope(decl.type,sharedParamCount,rewritten)};
    });
    let auxType:Term;
    if(indexedContainers){
      const instantiatedContainerType=poly?instantiateTermLevels(spec.container.type,spec.container.levelParams,spec.containerLevels):spec.container.type;
      if(instantiatedContainerType.tag!=="pi")throw new KernelError(`${decl.name}: malformed indexed nested-container type ${spec.containerName}`);
      const specializedTail=instantiate(instantiatedContainerType.body,outerAtSpecialization);
      if(containsConst(specializedTail,decl.name))throw new KernelError(`${decl.name}: v35 bounded indexed-container slice requires container index domains independent of the recursive outer family`);
      auxType=prependPiTelescope(decl.type,sharedParamCount,specializedTail);
    }else{
      auxType=globalKind==="captured"?decl.type:prependPiTelescope(decl.type,decl.numParams,{tag:"sort",level:poly?outerTail.level:levelSucc(LevelZero)});
    }
    return{name:spec.auxName,type:auxType,numParams:sharedParamCount,numIndices:indexedContainers?spec.container.numIndices:0,constructors:ctors};
  });

  const synthetic:Extract<CoreDeclaration,{kind:"mutualInductive"}>={
    kind:"mutualInductive",name:`_nested.${decl.name}.block`,levelParams:poly?[...decl.levelParams]:[],inductives:[
      {name:decl.name,type:decl.type,numParams:sharedParamCount,numIndices:outerIndexCount,constructors:syntheticOuterCtors},
      ...syntheticAuxMembers,
    ],
  };
  const transformed=env.clone(); checkDirectMutualInductive(transformed,synthetic);
  const syntheticOuterRec=transformed.get(`${decl.name}.rec`);
  if(!syntheticOuterRec||syntheticOuterRec.declaration.kind!=="recursor")throw new KernelError(`${decl.name}: internal nested preprocessing did not generate outer recursor`);
  const syntheticAuxRecs=specs.map(spec=>{
    const entry=transformed.get(`${spec.auxName}.rec`);
    if(!entry||entry.declaration.kind!=="recursor")throw new KernelError(`${decl.name}: internal nested preprocessing did not generate helper recursor`);
    return entry.declaration;
  });

  const helperNames=specs.map((_,i)=>`${decl.name}.rec_${i+1}`);
  const syntheticNames=[decl.name,...specs.map(s=>s.auxName)];
  const publicRecursors=[`${decl.name}.rec`,...helperNames];
  const targetRecursor=new Map<string,string>(syntheticNames.map((n,i)=>[n,publicRecursors[i]]));
  const restoreAll=(term:Term):Term=>{
    let out=term;
    for(const spec of specs)out=indexedContainers
      ?restoreNestedAuxTermIndexedPoly(out,spec.auxName,selfLevels,spec.containerName,spec.containerLevels,decl.name,selfLevels,spec.mode,spec.ctorRestore,spec.container.numIndices)
      :poly?restoreNestedAuxTermPoly(out,spec.auxName,selfLevels,spec.containerName,spec.containerLevels,decl.name,selfLevels,spec.mode,spec.ctorRestore)
      :restoreNestedAuxTerm(out,spec.auxName,spec.containerName,decl.name,spec.mode,spec.ctorRestore);
    return out;
  };
  const restoreRecursor=(entry:Extract<EnvironmentDeclaration,{kind:"recursor"}>,helperIndex:number|undefined):Extract<EnvironmentDeclaration,{kind:"recursor"}>=>{
    const helper=helperIndex!==undefined; const spec=helper?specs[helperIndex!]:undefined;
    const rules=entry.metadata.rules.map(rule=>({
      ...rule,
      ctor:helper?(spec!.ctorRestore.get(rule.ctor)??rule.ctor):rule.ctor,
      recursiveFieldTypes:rule.recursiveFieldTypes?.map(t=>t?restoreAll(t):null),
      recursiveTargets:rule.recursiveTargets?.map(()=>null),
      recursiveRecursors:rule.recursiveTargets?.map(target=>target?targetRecursor.get(target)??null:null),
      ...(helper?{ctorParamCount:1}:{}),
    }));
    return{
      kind:"recursor",name:helper?helperNames[helperIndex!]:`${decl.name}.rec`,levelParams:[...entry.levelParams],type:restoreAll(entry.type),
      metadata:{...entry.metadata,inductive:decl.name,numParams:entry.metadata.numParams,numIndices:entry.metadata.numIndices,rules,
        mutual:{inductives:syntheticNames,motiveCount:syntheticNames.length,recursors:publicRecursors,indexCounts:[outerIndexCount,...specs.map(s=>indexedContainers?s.container.numIndices:0)]}},
    };
  };
  const outerRec=restoreRecursor(syntheticOuterRec.declaration,undefined);
  const helperRecs=syntheticAuxRecs.map((r,i)=>restoreRecursor(r,i));

  const assumptions=dependencyAssumptions(transformed,[decl.type,...decl.constructors.map(c=>c.type)]);
  const generated=[...decl.constructors.map(c=>c.name),outerRec.name,...helperNames];
  const final=env.clone(); final.add({declaration:decl,assumptions,generated});
  for(const ctor of decl.constructors){
    const ctorSort=kernelWhnf(final,infer(final,[],ctor.type));
    if(ctorSort.tag!=="sort")throw new KernelError(`${ctor.name}: restored nested constructor type is not a type`);
    final.add({declaration:{kind:"constructor",name:ctor.name,levelParams:poly?[...decl.levelParams]:[],type:ctor.type,inductive:decl.name},assumptions:dependencyAssumptions(final,[ctor.type]),generated:[]});
  }
  for(const rec of [outerRec,...helperRecs]){
    const recSort=kernelWhnf(final,infer(final,[],rec.type));
    if(recSort.tag!=="sort")throw new KernelError(`${rec.name}: restored nested recursor type is not a type`);
    final.add({declaration:rec,assumptions:dependencyAssumptions(final,[rec.type]),generated:[]});
  }
  env.replaceWith(final);
  return{declaration:decl,assumptions,generated};
}

/**
 * v29-v32: bounded Lean-style nested-inductive preprocessing.
 *
 * v29 covers parameterless/indexless monomorphic Type families; v30 threads
 * shared/dependent outer parameters; v31 adds two exact indexed-outer modes:
 * (1) constructor-local indices captured unchanged by the nested specialization
 * become extra fixed parameters of the synthesized mutual block, and
 * (2) a closed fixed specialization keeps the outer family indexed while the
 * helper family is specialized to that closed index tuple.  v32 additionally
 * admits a closed index expression over uniform outer parameters by projecting
 * it out of the constructor-local context. Expressions that depend on constructor
 * locals but are not uniform are rejected by the trusted mutual checker.
 */
function tryCheckNestedInductive(
  env:Environment,
  decl:Extract<CoreDeclaration,{kind:"inductive"}>,
):CheckedDeclaration|undefined{
  if(env.allowNestedDeeperDependentContainerParameters){const deep=tryCheckNestedInductiveV45(env,decl,true);if(deep)return deep;}
  if(env.allowNestedDeeperMultiParameterGeneralization){const deep=tryCheckNestedInductiveV45(env,decl);if(deep)return deep;}
  if(env.allowNestedDeeperMultiParameter){const deep=tryCheckNestedInductiveV44(env,decl);if(deep)return deep;}
  if(env.allowNestedDeeperProp){const deep=tryCheckNestedInductiveV43(env,decl);if(deep)return deep;}
  if(env.allowNestedDeeperMultipleFields){const deep=tryCheckNestedInductiveV42(env,decl);if(deep)return deep;}
  if(env.allowNestedDeeperPolymorphic){const deep=tryCheckNestedInductiveV41(env,decl);if(deep)return deep;}
  if(env.allowNestedDeeperIndices){const deep=tryCheckNestedInductiveV40(env,decl);if(deep)return deep;}
  if(env.allowNestedDeeperParameters){const deep=tryCheckNestedInductiveV39(env,decl);if(deep)return deep;}
  if(env.allowNestedDeeperGeneralization){const deep=tryCheckNestedInductiveV38(env,decl);if(deep)return deep;}
  if(env.allowNestedDeeper){const deep=tryCheckNestedInductiveV37(env,decl);if(deep)return deep;}
  if(env.allowNestedMultipleSpecializations)return tryCheckNestedInductiveV33(env,decl);
  if(!env.allowNestedInductives)return undefined;
  if(decl.numParams!==0&&!env.allowNestedParameters)return undefined;
  if(decl.numIndices!==0&&!env.allowNestedIndices)return undefined;

  const totalOuterArgs=decl.numParams+decl.numIndices;
  const nestedContainers=new Set<string>();
  const nestedOccurrences:{containerName:string;outerArgs:Term[];localCount:number}[]=[];
  for(const ctor of decl.constructors){
    const {fields}=splitPi(ctor.type);
    for(let fi=decl.numParams;fi<fields.length;fi++){
      const field=fields[fi];
      const nested=nestedSpecialization(field,decl.name,totalOuterArgs);
      if(nested&&nested.containerName!==decl.name){
        nestedContainers.add(nested.containerName);
        nestedOccurrences.push({...nested,localCount:fi-decl.numParams});
      }
    }
  }
  if(nestedContainers.size===0)return undefined;
  const milestone=decl.numIndices!==0?(env.allowNestedIndexExpressions?"v32":"v31"):decl.numParams===0?"v29":"v30";
  if(nestedContainers.size!==1)throw new KernelError(`${decl.name}: ${milestone} nested slice admits exactly one nested container type former`);
  const containerName=[...nestedContainers][0];

  validateName(decl.name);validateLevelParams(decl);
  if(decl.levelParams.length!==0)throw new KernelError(`${decl.name}: ${milestone} nested slice requires a monomorphic outer inductive`);
  if(env.has(decl.name))throw new KernelError(`duplicate declaration: ${decl.name}`);
  if(env.has(`${decl.name}.rec`)||env.has(`${decl.name}.rec_1`))throw new KernelError(`${decl.name}: nested recursor name already exists`);

  let outerTail=decl.type;
  for(let p=0;p<totalOuterArgs;p++){
    if(outerTail.tag!=="pi")throw new KernelError(`${decl.name}: nested outer telescope shorter than parameters + indices`);
    outerTail=outerTail.body;
  }
  if(outerTail.tag!=="sort"||!levelDefEq(outerTail.level,levelSucc(LevelZero)))
    throw new KernelError(`${decl.name}: ${milestone} nested slice requires an outer family in Type`);

  const containerEntry=env.get(containerName);
  if(!containerEntry||containerEntry.declaration.kind!=="inductive")
    throw new KernelError(`${decl.name}: nested container ${containerName} is not an already-checked inductive`);
  const container=containerEntry.declaration;
  if(container.levelParams.length!==0||container.numParams!==1||container.numIndices!==0)
    throw new KernelError(`${decl.name}: ${milestone} nested container ${containerName} must be monomorphic with exactly one parameter and no indices`);
  if(container.type.tag!=="pi"||!levelDefEq(kernelWhnf(env,container.type.body).tag==="sort"?(kernelWhnf(env,container.type.body) as Extract<Term,{tag:"sort"}>).level:LevelZero,levelSucc(LevelZero)))
    throw new KernelError(`${decl.name}: ${milestone} nested container ${containerName} must return Type`);
  const containerParamType=kernelWhnf(env,container.type.domain);
  if(containerParamType.tag!=="sort"||!levelDefEq(containerParamType.level,levelSucc(LevelZero)))
    throw new KernelError(`${decl.name}: ${milestone} nested container ${containerName} parameter must be Type`);

  let mode:NestedIndexMode;
  if(decl.numIndices===0){
    mode={kind:"closed",sharedParamCount:decl.numParams,outerIndexCount:0,fixedIndices:[]};
  }else{
    const occurrenceIndices=nestedOccurrences.map(n=>n.outerArgs.slice(decl.numParams));
    if(!env.allowNestedIndexExpressions){
      // Preserve the frozen v31 classifier exactly: syntactically closed tuples
      // are fixed specializations; any loose constructor-context variable takes
      // the captured-index path and is validated by the mutual checker.
      const hasConstructorLocal=occurrenceIndices.some(xs=>xs.some(x=>containsLooseBVar(x)));
      if(hasConstructorLocal){
        mode={kind:"captured",sharedParamCount:totalOuterArgs,outerIndexCount:0,fixedIndices:[]};
      }else{
        const fixed=occurrenceIndices[0];
        for(const xs of occurrenceIndices){
          if(xs.length!==fixed.length||xs.some((x,i)=>!defEq(env,[],x,fixed[i])))
            throw new KernelError(`${decl.name}: v31 bounded closed nested slice admits exactly one fixed outer-index specialization`);
        }
        mode={kind:"closed",sharedParamCount:decl.numParams,outerIndexCount:decl.numIndices,fixedIndices:fixed};
      }
    }else{
      const rows:Term[][]=[];let projectable=true;
      for(let oi=0;oi<nestedOccurrences.length;oi++){
        const row:Term[]=[];
        for(const indexTerm of occurrenceIndices[oi]){
          const t=projectNestedIndexToParamContext(indexTerm,nestedOccurrences[oi].localCount);
          if(!t){projectable=false;break;}
          row.push(t);
        }
        if(!projectable)break;
        rows.push(row);
      }
      if(projectable){
        // The fixed specialization is represented in the uniform outer-parameter
        // context, not in any constructor-local context.  This admits terms such
        // as p, succ p, or p+q while forbidding constructor-local variables.
        const paramCtx:Context=[];let tail=decl.type;
        for(let pi=0;pi<decl.numParams;pi++){
          if(tail.tag!=="pi")throw new KernelError(`${decl.name}: nested outer parameter telescope shorter than numParams`);
          paramCtx.unshift(tail.domain);tail=tail.body;
        }
        const fixed=rows[0];
        for(const xs of rows){
          if(xs.length!==fixed.length||xs.some((x,i)=>!defEq(env,paramCtx,x,fixed[i])))
            throw new KernelError(`${decl.name}: v32 bounded closed nested slice admits exactly one fixed outer-index expression`);
        }
        mode={kind:"closed",sharedParamCount:decl.numParams,outerIndexCount:decl.numIndices,fixedIndices:fixed};
      }else{
        // Constructor-local references take the captured-index path. The mutual
        // checker then accepts only the exact current-index tuple and rejects
        // transformed locals such as succ i.
        mode={kind:"captured",sharedParamCount:totalOuterArgs,outerIndexCount:0,fixedIndices:[]};
      }
    }
  }

  // Recursive fields remain one-level direct occurrences. The synthesized
  // mutual checker below enforces fixed parameters/captured indices and strict
  // positivity.  Closed index terms are deliberately required to contain no
  // constructor-local variables in this first indexed nested slice.
  for(const ctor of decl.constructors){
    const {fields}=splitPi(ctor.type);
    for(const field of fields.slice(decl.numParams)){
      if(!containsConst(field,decl.name))continue;
      if(nestedOuterApplication(field,decl.name,totalOuterArgs))continue;
      const nested=nestedSpecialization(field,decl.name,totalOuterArgs);
      if(nested?.containerName===containerName)continue;
      throw new KernelError(`${ctor.name}: ${milestone} nested slice only admits direct ${decl.name} or ${containerName} (${decl.name} args) recursive fields`);
    }
  }

  let auxName=`_nested.${decl.name}.aux`;
  for(let i=0;env.has(auxName)||env.has(`${auxName}.rec`);i++)auxName=`_nested.${decl.name}.aux${i+1}`;
  const syntheticOuterCtors=decl.constructors.map(ctor=>({
    name:ctor.name,
    type:rewriteNestedSpecializationToAux(ctor.type,containerName,decl.name,auxName,totalOuterArgs,mode),
  }));
  const ctorRestore=new Map<string,string>();
  const sharedArgs=Array.from({length:mode.sharedParamCount},(_,p)=>({tag:"bvar",index:mode.sharedParamCount-1-p} as Term));
  const outerAtSpecialization=mkApps(
    {tag:"const",name:decl.name,levels:[]},
    mode.kind==="captured"?sharedArgs:[...sharedArgs,...mode.fixedIndices.map(t=>instantiateNestedParamContext(t,sharedArgs))],
  );
  const syntheticAuxCtors=container.constructors.map((ctor,index)=>{
    if(ctor.type.tag!=="pi")throw new KernelError(`${decl.name}: malformed nested-container constructor ${ctor.name}`);
    const syntheticName=`${auxName}.ctor${index}`;
    ctorRestore.set(syntheticName,ctor.name);
    const specialized=instantiate(ctor.type.body,outerAtSpecialization);
    const rewritten=rewriteNestedSpecializationToAux(specialized,containerName,decl.name,auxName,totalOuterArgs,mode);
    return{name:syntheticName,type:prependPiTelescope(decl.type,mode.sharedParamCount,rewritten)};
  });
  const auxType=mode.kind==="captured"
    ?decl.type
    :prependPiTelescope(decl.type,decl.numParams,{tag:"sort",level:levelSucc(LevelZero)});
  const synthetic:Extract<CoreDeclaration,{kind:"mutualInductive"}>={
    kind:"mutualInductive",name:`${auxName}.block`,levelParams:[],inductives:[
      {name:decl.name,type:decl.type,numParams:mode.sharedParamCount,numIndices:mode.outerIndexCount,constructors:syntheticOuterCtors},
      {name:auxName,type:auxType,numParams:mode.sharedParamCount,numIndices:0,constructors:syntheticAuxCtors},
    ],
  };

  const transformed=env.clone();
  checkDirectMutualInductive(transformed,synthetic);
  const syntheticOuterRec=transformed.get(`${decl.name}.rec`);
  const syntheticAuxRec=transformed.get(`${auxName}.rec`);
  if(!syntheticOuterRec||syntheticOuterRec.declaration.kind!=="recursor"||!syntheticAuxRec||syntheticAuxRec.declaration.kind!=="recursor")
    throw new KernelError(`${decl.name}: internal nested preprocessing did not generate linked recursors`);

  const helperName=`${decl.name}.rec_1`;
  const restoreRecursor=(entry:Extract<EnvironmentDeclaration,{kind:"recursor"}>,helper:boolean):Extract<EnvironmentDeclaration,{kind:"recursor"}>=>{
    const rules=entry.metadata.rules.map(rule=>({
      ...rule,
      ctor:helper?(ctorRestore.get(rule.ctor)??rule.ctor):rule.ctor,
      recursiveFieldTypes:rule.recursiveFieldTypes?.map(t=>t?restoreNestedAuxTerm(t,auxName,containerName,decl.name,mode,ctorRestore):null),
      recursiveTargets:rule.recursiveTargets?.map(()=>null),
      recursiveRecursors:rule.recursiveTargets?.map(target=>target===decl.name?`${decl.name}.rec`:target===auxName?helperName:null),
      ...(helper?{ctorParamCount:1}:{}),
    }));
    return{
      kind:"recursor",
      name:helper?helperName:`${decl.name}.rec`,
      levelParams:[...entry.levelParams],
      type:restoreNestedAuxTerm(entry.type,auxName,containerName,decl.name,mode,ctorRestore),
      metadata:{
        ...entry.metadata,
        inductive:decl.name,
        numParams:entry.metadata.numParams,numIndices:entry.metadata.numIndices,rules,
        mutual:{inductives:[decl.name,auxName],motiveCount:2,recursors:[`${decl.name}.rec`,helperName],indexCounts:[mode.outerIndexCount,0]},
      },
    };
  };
  const outerRec=restoreRecursor(syntheticOuterRec.declaration,false);
  const helperRec=restoreRecursor(syntheticAuxRec.declaration,true);

  const assumptions=dependencyAssumptions(transformed,[decl.type,...decl.constructors.map(c=>c.type)]);
  const generated=[...decl.constructors.map(c=>c.name),outerRec.name,helperRec.name];
  const final=env.clone();
  final.add({declaration:decl,assumptions,generated});
  for(const ctor of decl.constructors){
    const ctorSort=kernelWhnf(final,infer(final,[],ctor.type));
    if(ctorSort.tag!=="sort")throw new KernelError(`${ctor.name}: restored nested constructor type is not a type`);
    final.add({declaration:{kind:"constructor",name:ctor.name,levelParams:[],type:ctor.type,inductive:decl.name},assumptions:dependencyAssumptions(final,[ctor.type]),generated:[]});
  }
  for(const rec of [outerRec,helperRec]){
    const recSort=kernelWhnf(final,infer(final,[],rec.type));
    if(recSort.tag!=="sort")throw new KernelError(`${rec.name}: restored nested recursor type is not a type`);
    final.add({declaration:rec,assumptions:dependencyAssumptions(final,[rec.type]),generated:[]});
  }
  env.replaceWith(final);
  return{declaration:decl,assumptions,generated};
}

function checkSimpleInductive(env: Environment, decl: Extract<CoreDeclaration, { kind: "inductive" }>): CheckedDeclaration {
  validateName(decl.name);
  validateLevelParams(decl);
  if (decl.numParams !== 0 || decl.numIndices !== 0) {
    throw new KernelError(`${decl.name}: K1-inductives0 only admits parameterless/indexless inductives`);
  }
  if (env.has(decl.name)) throw new KernelError(`duplicate declaration: ${decl.name}`);
  if (decl.constructors.length === 0 && !env.allowEmptyInductives) throw new KernelError(`${decl.name}: empty inductives unavailable in this kernel profile`);

  const typeSort = kernelWhnf(env, infer(env, [], decl.type));
  if (typeSort.tag !== "sort") throw new KernelError(`inductive type is not a type: ${pretty(decl.type)}`);
  const inductiveWh = kernelWhnf(env, decl.type);
  if (inductiveWh.tag !== "sort") {
    throw new KernelError(`${decl.name}: K1-inductives0 requires an indexless inductive result sort, got ${pretty(decl.type)}`);
  }

  // Stage admission atomically in a cloned environment.
  const staged = env.clone();
  const selfEntry: CheckedDeclaration = { declaration: decl, assumptions: new Set(), generated: [] };
  staged.add(selfEntry);

  const selfLevels = decl.levelParams.map(name => ({ tag: "param", name } as Level));
  const self: Term = { tag: "const", name: decl.name, levels: selfLevels };
  const rules: SimpleCtorRule[] = [];
  const generated: string[] = [];

  for (const ctor of decl.constructors) {
    validateName(ctor.name);
    if (!ctor.name.startsWith(`${decl.name}.`)) throw new KernelError(`${ctor.name}: constructor must be namespaced under ${decl.name}`);
    if (staged.has(ctor.name)) throw new KernelError(`duplicate declaration: ${ctor.name}`);

    const ctorSort = kernelWhnf(staged, infer(staged, [], ctor.type));
    if (ctorSort.tag !== "sort") throw new KernelError(`${ctor.name}: constructor type is not a type`);

    const { fields, fieldBinderInfo, result } = splitPi(ctor.type);
    if (!defEq(staged, [], result, self)) {
      throw new KernelError(`${ctor.name}: constructor result must be ${pretty(self)}, got ${pretty(result)}`);
    }

    const recursiveFields: boolean[] = [];
    const recursiveFieldTypes: (Term|null)[] = [];
    const fieldCtx: Context = [];
    for (let fieldIndex = 0; fieldIndex < fields.length; fieldIndex++) {
      const field = fields[fieldIndex];
      checkConstructorFieldUniverse(staged, fieldCtx, field, inductiveWh.level, ctor.name, fieldIndex);
      // v22 closes the remaining simple-inductive telescope gap: field types may
      // refer to earlier constructor fields exactly as they already can in the
      // parameterized/indexed path. Historical profiles preserve the old
      // rejection. Binders introduced inside a field's own Pi telescope have
      // always been permitted.
      if (!env.allowDependentConstructorFields && containsLooseBVar(field)) {
        throw new KernelError(`${ctor.name}: constructor fields depending on earlier constructor fields are unsupported in this historical kernel profile`);
      }
      if (defEq(staged, fieldCtx, field, self)) { recursiveFields.push(true); recursiveFieldTypes.push(null); }
      else if (containsConst(field, decl.name)) {
        if(!env.allowHigherOrderPositiveRecursion) throw new KernelError(`${ctor.name}: non-direct or negative recursive occurrence of ${decl.name} is rejected by this kernel profile`);
        try{
          const positive=positiveRecursiveFieldType(staged,field,decl,[]);
          recursiveFields.push(true); recursiveFieldTypes.push(positive??null);
        }catch(e){
          if(e instanceof KernelError)throw new KernelError(`${ctor.name}: ${e.message}`);
          throw e;
        }
      } else { recursiveFields.push(false); recursiveFieldTypes.push(null); }
      fieldCtx.unshift(field);
    }

    const assumptions = dependencyAssumptions(staged, [ctor.type]);
    const ctorEntry: CheckedDeclaration = {
      declaration: { kind: "constructor", name: ctor.name, levelParams: [...decl.levelParams], type: ctor.type, inductive: decl.name },
      assumptions,
      generated: [],
    };
    staged.add(ctorEntry);
    generated.push(ctor.name);
    rules.push({ ctor: ctor.name, fields, fieldBinderInfo, recursiveFields, recursiveFieldTypes });
  }

  // Empty inductives have a distinct Lean recursor shape. v19 extends
  // nonempty Prop recursors using Lean's declaration-derived elimination rule.
  const isPropFamily=levelDefEq(inductiveWh.level,LevelZero);
  if (!isPropFamily || decl.constructors.length === 0 || env.allowPropElimination) {
    const motivePolicy:MotiveUniversePolicy=isPropFamily&&decl.constructors.length>0
      ?propEliminationMotivePolicy(staged,decl)
      :"fresh";
    const rec = decl.constructors.length === 0 && env.recursorProfile === "lean4331"
      ? generateEmptyRecursor(decl,env.allowTelescopeTerms,env.allowRecursorFamilyBinderInfo)
      : generateSimpleRecursor(decl, rules, env.recursorProfile, motivePolicy,env.allowTelescopeTerms,env.allowLeanRecursorMinorOrder);
    validateName(rec.name);
    const recSort = kernelWhnf(staged, infer(staged, [], rec.type));
    if (recSort.tag !== "sort") throw new KernelError(`${rec.name}: generated recursor type is not a type`);
    const recAssumptions = dependencyAssumptions(staged, [rec.type]);
    staged.add({
      declaration: { kind: "recursor", name: rec.name, levelParams: rec.levelParams, type: rec.type, metadata: rec.metadata },
      assumptions: recAssumptions,
      generated: [],
    });
    generated.push(rec.name);
  }

  const assumptions = dependencyAssumptions(staged, [decl.type, ...decl.constructors.map(c => c.type)]);
  const checked: CheckedDeclaration = { declaration: decl, assumptions, generated };
  // Replace the provisional self entry with the final source-facing checked entry.
  const final = new Environment({recursorProfile:env.recursorProfile,allowEmptyInductives:env.allowEmptyInductives,allowProjections:env.allowProjections,allowStructureEta:env.allowStructureEta,allowHigherOrderPositiveRecursion:env.allowHigherOrderPositiveRecursion,allowIndexedRecursiveRecursors:env.allowIndexedRecursiveRecursors,allowIndexedProjections:env.allowIndexedProjections,allowPropElimination:env.allowPropElimination,allowRecursorK:env.allowRecursorK,allowInductiveUniverseChecks:env.allowInductiveUniverseChecks,allowDependentConstructorFields:env.allowDependentConstructorFields,allowTelescopeTerms:env.allowTelescopeTerms,allowMutualInductives:env.allowMutualInductives,allowMutualParameters:env.allowMutualParameters,allowMutualIndices:env.allowMutualIndices,allowHigherOrderMutualRecursion:env.allowHigherOrderMutualRecursion,allowMutualProp:env.allowMutualProp,allowNestedInductives:env.allowNestedInductives,allowNestedParameters:env.allowNestedParameters,allowNestedIndices:env.allowNestedIndices,allowNestedIndexExpressions:env.allowNestedIndexExpressions,allowNestedMultipleSpecializations:env.allowNestedMultipleSpecializations,allowNestedPolymorphic:env.allowNestedPolymorphic,allowNestedIndexedContainers:env.allowNestedIndexedContainers,allowLeanRecursorMinorOrder:env.allowLeanRecursorMinorOrder,allowNestedDeeper:env.allowNestedDeeper,allowNestedDeeperGeneralization:env.allowNestedDeeperGeneralization,allowNestedDeeperParameters:env.allowNestedDeeperParameters,allowNestedDeeperIndices:env.allowNestedDeeperIndices,allowNestedDeeperPolymorphic:env.allowNestedDeeperPolymorphic,allowNestedDeeperMultipleFields:env.allowNestedDeeperMultipleFields,allowNestedDeeperProp:env.allowNestedDeeperProp,allowNestedDeeperMultiParameter:env.allowNestedDeeperMultiParameter,allowNestedDeeperMultiParameterGeneralization:env.allowNestedDeeperMultiParameterGeneralization,allowNestedDeeperDependentContainerParameters:env.allowNestedDeeperDependentContainerParameters,allowUniformParameterDefEq:env.allowUniformParameterDefEq,allowRecursorFamilyBinderInfo:env.allowRecursorFamilyBinderInfo,allowMutualNestedGeneralization:env.allowMutualNestedGeneralization,allowMutualNestedParameters:env.allowMutualNestedParameters,allowMutualNestedIndices:env.allowMutualNestedIndices,allowMutualNestedPolymorphic:env.allowMutualNestedPolymorphic,allowMutualNestedProp:env.allowMutualNestedProp,allowMutualNestedIndexedContainers:env.allowMutualNestedIndexedContainers});
  for (const entry of staged.all()) {
    if (entry.declaration.name === decl.name) final.add(checked);
    else final.add(entry);
  }
  env.replaceWith(final);
  return checked;
}


function checkIndexedInductive0(env: Environment, decl: Extract<CoreDeclaration, { kind: "inductive" }>): CheckedDeclaration {
  validateName(decl.name);
  validateLevelParams(decl);
  if (decl.numParams < 0 || decl.numIndices < 0) throw new KernelError(`${decl.name}: invalid parameter/index count`);
  if (decl.numIndices === 0 && decl.numParams === 0) return checkSimpleInductive(env, decl);
  if (env.has(decl.name)) throw new KernelError(`duplicate declaration: ${decl.name}`);
  if (decl.constructors.length === 0 && !env.allowEmptyInductives) throw new KernelError(`${decl.name}: empty inductives unavailable in this kernel profile`);

  // The inductive type must consist of exactly numParams + numIndices Pi binders
  // followed by a result sort.
  const inductiveDomains: Term[] = [];
  let typeTail = decl.type;
  for (let i = 0; i < decl.numParams + decl.numIndices; i++) {
    if (typeTail.tag !== "pi") throw new KernelError(`${decl.name}: inductive telescope shorter than declared parameter/index counts`);
    inductiveDomains.push(typeTail.domain);
    typeTail = typeTail.body;
  }
  if (typeTail.tag !== "sort") throw new KernelError(`${decl.name}: indexed inductive result must be a Sort`);

  // Validate the type itself before making the inductive available to constructors.
  const typeSort = kernelWhnf(env, infer(env, [], decl.type));
  if (typeSort.tag !== "sort") throw new KernelError(`${decl.name}: inductive type is not itself a type`);

  const staged = env.clone();
  staged.add({ declaration: decl, assumptions: new Set(), generated: [] });
  const selfLevels = decl.levelParams.map(name => ({ tag: "param", name } as Level));
  const generated: string[] = [];
  const recursorRules: SimpleCtorRule[] = [];

  for (const ctor of decl.constructors) {
    validateName(ctor.name);
    if (!ctor.name.startsWith(`${decl.name}.`)) throw new KernelError(`${ctor.name}: constructor must be namespaced under ${decl.name}`);
    if (staged.has(ctor.name)) throw new KernelError(`duplicate declaration: ${ctor.name}`);

    const ctorSort = kernelWhnf(staged, infer(staged, [], ctor.type));
    if (ctorSort.tag !== "sort") throw new KernelError(`${ctor.name}: constructor type is not a type`);

    // Uniform parameters: the constructor begins with the same parameter
    // telescope as the inductive declaration.
    let ctorTail = ctor.type;
    const ctx: Term[] = [];
    for (let p = 0; p < decl.numParams; p++) {
      if (ctorTail.tag !== "pi") throw new KernelError(`${ctor.name}: missing uniform parameter ${p}`);
      const expectedParam = inductiveDomains[p];
      if (!defEq(staged, ctx, ctorTail.domain, expectedParam)) {
        throw new KernelError(`${ctor.name}: parameter ${p} is not uniform with ${decl.name}`);
      }
      ctx.unshift(expectedParam);
      ctorTail = ctorTail.body;
    }

    // Constructor-local fields may be dependent. v16 additionally admits
    // Lean-valid higher-order recursive fields for the non-indexed parameterized
    // slice; indexed recursive recursors remain a separate milestone.
    const fields: Term[] = [];
    const fieldBinderInfo: BinderInfo[]=[];
    const recursiveFields:boolean[]=[];
    const recursiveFieldTypes:(Term|null)[]=[];
    while (ctorTail.tag === "pi") {
      const field=ctorTail.domain;
      const priorFieldCount=fields.length;
      checkConstructorFieldUniverse(staged, ctx, field, typeTail.level, ctor.name, decl.numParams + priorFieldCount);
      fields.push(field);fieldBinderInfo.push(binderInfoOf(ctorTail));
      if(containsConst(field,decl.name)){
        if(!env.allowHigherOrderPositiveRecursion)throw new KernelError(`${ctor.name}: recursive fields in parameterized/indexed inductives are unsupported in this kernel profile`);
        const paramBaseIndices=Array.from({length:decl.numParams},(_,p)=>priorFieldCount+(decl.numParams-1-p));
        let positive:Term|undefined;
        try{positive=positiveRecursiveFieldType(staged,field,decl,paramBaseIndices,ctx);}
        catch(e){if(e instanceof KernelError)throw new KernelError(`${ctor.name}: ${e.message}`);throw e;}
        if(decl.numIndices!==0){
          if(!env.allowIndexedRecursiveRecursors)throw new KernelError(`${ctor.name}: positive recursive indexed fields are not yet admitted because indexed recursive recursors are unsupported`);
        }
        recursiveFields.push(true);recursiveFieldTypes.push(positive??null);
      }else{recursiveFields.push(false);recursiveFieldTypes.push(null);}
      ctx.unshift(field);
      ctorTail = ctorTail.body;
    }

    const { head, args } = flattenApps(ctorTail);
    if (head.tag !== "const" || head.name !== decl.name) {
      throw new KernelError(`${ctor.name}: constructor result must target ${decl.name}`);
    }
    if (head.levels.length !== selfLevels.length || !head.levels.every((l, i) => levelDefEq(l, selfLevels[i]))) {
      throw new KernelError(`${ctor.name}: constructor result uses incompatible universe instantiation for ${decl.name}`);
    }
    if (args.length !== decl.numParams + decl.numIndices) {
      throw new KernelError(`${ctor.name}: constructor result expected ${decl.numParams + decl.numIndices} arguments to ${decl.name}, got ${args.length}`);
    }

    // Parameters in the result must be the constructor's own initial uniform
    // binders, shifted by any constructor-local fields.
    const totalCtorBinders = decl.numParams + fields.length;
    for (let p = 0; p < decl.numParams; p++) {
      const expectedIndex = totalCtorBinders - 1 - p;
      const arg = args[p];
      if(env.allowUniformParameterDefEq){
        const expected={tag:"bvar",index:expectedIndex} as Term;
        if(!defEq(staged,ctx,arg,expected))throw new KernelError(`${ctor.name}: constructor result parameter ${p} is not the corresponding uniform parameter`);
      }else if (arg.tag !== "bvar" || arg.index !== expectedIndex) {
        throw new KernelError(`${ctor.name}: constructor result parameter ${p} is not the corresponding uniform parameter`);
      }
    }

    const assumptions = dependencyAssumptions(staged, [ctor.type]);
    staged.add({
      declaration: { kind: "constructor", name: ctor.name, levelParams: [...decl.levelParams], type: ctor.type, inductive: decl.name },
      assumptions,
      generated: [],
    });
    generated.push(ctor.name);
    recursorRules.push({ctor:ctor.name,fields,fieldBinderInfo,recursiveFields,recursiveFieldTypes});
  }

  // Preserve the historical Eq-like indexed slice, then v19 derives the
  // complete admitted Prop-elimination motive universe from the declaration.
  const noLocalFields = decl.constructors.every(ctor => {
    let t = ctor.type; for (let p = 0; p < decl.numParams; p++) { if (t.tag !== "pi") return false; t = t.body; }
    return t.tag !== "pi";
  });
  const isPropFamily = typeTail.tag === "sort" && levelDefEq(typeTail.level, LevelZero);
  const installRecursor=(rec:ReturnType<typeof generateSimpleRecursor>)=>{
    const recSort=kernelWhnf(staged,infer(staged,[],rec.type));
    if(recSort.tag!=="sort")throw new KernelError(`${rec.name}: generated recursor type is not a type`);
    staged.add({
      declaration:{kind:"recursor",name:rec.name,levelParams:rec.levelParams,type:rec.type,metadata:rec.metadata},
      assumptions:dependencyAssumptions(staged,[rec.type]),
      generated:[],
    });
    generated.push(rec.name);
  };

  if (decl.constructors.length === 0 && env.recursorProfile === "lean4331") {
    installRecursor(generateEmptyRecursor(decl,env.allowTelescopeTerms,env.allowRecursorFamilyBinderInfo));
  } else if (isPropFamily && env.allowPropElimination) {
    const motivePolicy=propEliminationMotivePolicy(staged,decl);
    if(decl.numIndices===0){
      installRecursor(generateParameterizedSimpleRecursor(decl,env.recursorProfile,recursorRules,motivePolicy,env.allowTelescopeTerms,env.allowLeanRecursorMinorOrder,env.allowRecursorFamilyBinderInfo));
    }else if(noLocalFields){
      installRecursor(generateIndexedNoFieldRecursor(decl,env.recursorProfile,motivePolicy,env.allowTelescopeTerms,env.allowRecursorFamilyBinderInfo));
    }else if(env.allowIndexedRecursiveRecursors){
      // This generator also handles nonrecursive constructor-local fields; the
      // name reflects the v17 milestone where it was introduced.
      installRecursor(generateIndexedRecursiveRecursor(decl,recursorRules,env.recursorProfile,motivePolicy,env.allowTelescopeTerms,env.allowLeanRecursorMinorOrder,env.allowRecursorFamilyBinderInfo));
    }else{
      throw new KernelError(`${decl.name}: indexed Prop constructor fields require the indexed recursor kernel profile`);
    }
  } else if (decl.numIndices === 0 && decl.numParams > 0 && !isPropFamily) {
    installRecursor(generateParameterizedSimpleRecursor(decl, env.recursorProfile, recursorRules,"fresh",env.allowTelescopeTerms,env.allowLeanRecursorMinorOrder,env.allowRecursorFamilyBinderInfo));
  } else if (decl.numIndices > 0 && env.allowIndexedRecursiveRecursors && !isPropFamily) {
    installRecursor(generateIndexedRecursiveRecursor(decl, recursorRules, env.recursorProfile,"fresh",env.allowTelescopeTerms,env.allowLeanRecursorMinorOrder,env.allowRecursorFamilyBinderInfo));
  } else if (noLocalFields && (!isPropFamily || decl.constructors.length <= 1)) {
    installRecursor(generateIndexedNoFieldRecursor(decl, env.recursorProfile,"fresh",env.allowTelescopeTerms,env.allowRecursorFamilyBinderInfo));
  }

  const assumptions = dependencyAssumptions(staged, [decl.type, ...decl.constructors.map(c => c.type)]);
  const checked: CheckedDeclaration = { declaration: decl, assumptions, generated };
  const final = new Environment({recursorProfile:env.recursorProfile,allowEmptyInductives:env.allowEmptyInductives,allowProjections:env.allowProjections,allowStructureEta:env.allowStructureEta,allowHigherOrderPositiveRecursion:env.allowHigherOrderPositiveRecursion,allowIndexedRecursiveRecursors:env.allowIndexedRecursiveRecursors,allowIndexedProjections:env.allowIndexedProjections,allowPropElimination:env.allowPropElimination,allowRecursorK:env.allowRecursorK,allowInductiveUniverseChecks:env.allowInductiveUniverseChecks,allowDependentConstructorFields:env.allowDependentConstructorFields,allowTelescopeTerms:env.allowTelescopeTerms,allowMutualInductives:env.allowMutualInductives,allowMutualParameters:env.allowMutualParameters,allowMutualIndices:env.allowMutualIndices,allowHigherOrderMutualRecursion:env.allowHigherOrderMutualRecursion,allowMutualProp:env.allowMutualProp,allowNestedInductives:env.allowNestedInductives,allowNestedParameters:env.allowNestedParameters,allowNestedIndices:env.allowNestedIndices,allowNestedIndexExpressions:env.allowNestedIndexExpressions,allowNestedMultipleSpecializations:env.allowNestedMultipleSpecializations,allowNestedPolymorphic:env.allowNestedPolymorphic,allowNestedIndexedContainers:env.allowNestedIndexedContainers,allowLeanRecursorMinorOrder:env.allowLeanRecursorMinorOrder,allowNestedDeeper:env.allowNestedDeeper,allowNestedDeeperGeneralization:env.allowNestedDeeperGeneralization,allowNestedDeeperParameters:env.allowNestedDeeperParameters,allowNestedDeeperIndices:env.allowNestedDeeperIndices,allowNestedDeeperPolymorphic:env.allowNestedDeeperPolymorphic,allowNestedDeeperMultipleFields:env.allowNestedDeeperMultipleFields,allowNestedDeeperProp:env.allowNestedDeeperProp,allowNestedDeeperMultiParameter:env.allowNestedDeeperMultiParameter,allowNestedDeeperMultiParameterGeneralization:env.allowNestedDeeperMultiParameterGeneralization,allowNestedDeeperDependentContainerParameters:env.allowNestedDeeperDependentContainerParameters,allowUniformParameterDefEq:env.allowUniformParameterDefEq,allowRecursorFamilyBinderInfo:env.allowRecursorFamilyBinderInfo,allowMutualNestedGeneralization:env.allowMutualNestedGeneralization,allowMutualNestedParameters:env.allowMutualNestedParameters,allowMutualNestedIndices:env.allowMutualNestedIndices,allowMutualNestedPolymorphic:env.allowMutualNestedPolymorphic,allowMutualNestedProp:env.allowMutualNestedProp,allowMutualNestedIndexedContainers:env.allowMutualNestedIndexedContainers});
  for (const entry of staged.all()) {
    if (entry.declaration.name === decl.name) final.add(checked);
    else final.add(entry);
  }
  env.replaceWith(final);
  return checked;
}

function containsBVar(term: Term): boolean {
  switch (term.tag) {
    case "bvar": return true;
    case "sort":
    case "const": return false;
    case "app": return containsBVar(term.fn) || containsBVar(term.arg);
    case "lam":
    case "pi": return containsBVar(term.domain) || containsBVar(term.body);
    case "let": return containsBVar(term.type) || containsBVar(term.value) || containsBVar(term.body);
    case "proj": return containsBVar(term.expr);
  }
}

function checkQuotDeclaration(env: Environment, decl: Extract<CoreDeclaration,{kind:"quot"}>): CheckedDeclaration {
  if (decl.name !== "Quot") throw new KernelError("quotient kernel declaration must be named 'Quot'");
  if (decl.levelParams.length !== 0) throw new KernelError("quotient kernel declaration cannot have universe parameters");
  for (const name of ["Quot","Quot.mk","Quot.lift","Quot.ind"]) {
    if (env.has(name)) throw new KernelError(`cannot initialize quotients: declaration name already exists: ${name}`);
  }

  // Lean's environment::add_quot requires the canonical Eq inductive and Eq.refl
  // shapes before installing quotient primitives. BinderInfo is included in this
  // structural check, matching the pinned kernel's initialization contract.
  const eq = env.get("Eq");
  if (!eq || eq.declaration.kind !== "inductive") throw new KernelError("cannot initialize quotients: environment does not have inductive 'Eq'");
  if (eq.declaration.levelParams.length !== 1 || eq.declaration.numParams !== 2 || eq.declaration.numIndices !== 1 || eq.declaration.constructors.length !== 1) {
    throw new KernelError("cannot initialize quotients: unexpected Eq inductive metadata");
  }
  const lp = eq.declaration.levelParams[0];
  if (!sameTerm(eq.declaration.type, expectedEqType(lp))) throw new KernelError("cannot initialize quotients: Eq has unexpected type");
  const eqRefl = env.get(eq.declaration.constructors[0].name);
  if (!eqRefl || eqRefl.declaration.kind !== "constructor" || eqRefl.declaration.name !== "Eq.refl") throw new KernelError("cannot initialize quotients: missing Eq.refl constructor");
  if (!sameTerm(eqRefl.declaration.type, expectedEqReflType(lp))) throw new KernelError("cannot initialize quotients: Eq.refl has unexpected type");

  const staged = env.clone();
  const generated:string[]=[];
  for (const primitive of generateQuotientPrimitives()) {
    // Add in Lean's order so later primitive types can refer to earlier ones.
    const typeSort = kernelWhnf(staged, infer(staged, [], primitive.type));
    if (typeSort.tag !== "sort") throw new KernelError(`${primitive.name}: quotient primitive type is not a type`);
    const assumptions = dependencyAssumptions(staged,[primitive.type]);
    staged.add({declaration:{kind:"quotient",name:primitive.name,levelParams:primitive.levelParams,type:primitive.type,quotKind:primitive.quotKind},assumptions,generated:[]});
    generated.push(primitive.name);
  }
  env.replaceWith(staged);
  return{declaration:decl,assumptions:new Set(),generated};
}

export function checkAndAddDeclaration(env: Environment, decl: CoreDeclaration): CheckedDeclaration {
  if (decl.kind === "quot") return checkQuotDeclaration(env,decl);
  if (decl.kind === "mutualInductive") {
    const nestedDeeperMultipleRecursiveSlots=tryCheckMutualNestedDeeperMultipleRecursiveParameterSlotsV65(env,decl);if(nestedDeeperMultipleRecursiveSlots)return nestedDeeperMultipleRecursiveSlots;
    const nestedDeeperMultipleFields=tryCheckMutualNestedDeeperMultipleFieldsV64(env,decl);if(nestedDeeperMultipleFields)return nestedDeeperMultipleFields;
    const nestedDeeperDependentContainerParams=tryCheckMutualNestedDeeperDependentContainerParametersV63(env,decl);if(nestedDeeperDependentContainerParams)return nestedDeeperDependentContainerParams;
    const nestedDeeperMultiParamContainers=tryCheckMutualNestedDeeperMultiParameterContainersV62(env,decl);if(nestedDeeperMultiParamContainers)return nestedDeeperMultiParamContainers;
    const nestedDeeperProp=tryCheckMutualNestedDeeperPropV60(env,decl);if(nestedDeeperProp)return nestedDeeperProp;
    const nestedDeeperPoly=tryCheckMutualNestedDeeperPolymorphicV59(env,decl);if(nestedDeeperPoly)return nestedDeeperPoly;
    const nestedDeeperIdx=tryCheckMutualNestedDeeperIndicesV58(env,decl);if(nestedDeeperIdx)return nestedDeeperIdx;
    const nestedDeeperParams=tryCheckMutualNestedDeeperParametersV57(env,decl);if(nestedDeeperParams)return nestedDeeperParams;
    const nestedDeeper=tryCheckMutualNestedDeeperV56(env,decl);if(nestedDeeper)return nestedDeeper;
    const nestedIndexedContainer=tryCheckMutualNestedIndexedContainersV55(env,decl);if(nestedIndexedContainer)return nestedIndexedContainer;
    const nestedProp=tryCheckMutualNestedPropV54(env,decl);if(nestedProp)return nestedProp;
    const nestedPoly=tryCheckMutualNestedPolymorphicV53(env,decl);if(nestedPoly)return nestedPoly;
    const nestedIdx=tryCheckMutualNestedIndicesV52(env,decl);if(nestedIdx)return nestedIdx;
    const nestedParams=tryCheckMutualNestedParametersV51(env,decl);if(nestedParams)return nestedParams;
    const nested=tryCheckMutualNestedGeneralizationV50(env,decl);if(nested)return nested;
    return checkDirectMutualInductive(env,decl);
  }
  if (decl.kind === "inductive") {
    {const nested=tryCheckNestedInductive(env,decl);if(nested)return nested;}
    if(decl.numParams===0&&decl.numIndices===0)return checkSimpleInductive(env,decl);
    return checkIndexedInductive0(env,decl);
  }
  return checkOrdinaryDeclaration(env, decl);
}
