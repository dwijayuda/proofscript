import {CoreArtifact,CoreDeclaration,Term,pretty} from "./core";
import {Level} from "./level";
import{Environment,KernelResourceError,checkAndAddDeclaration}from"./kernel";
export type Status="accepted"|"rejected"|"unsupported"|"resource_exhausted"|"implementation_error";
export interface CheckSummary{status:Status;declarations:{name:string;kind:string;universes:string[];type:string;generated:string[];assumptions:string[]}[];assumptions:string[];message?:string;}
export function checkCoreDeclarations(decls:CoreDeclaration[],implementationProfile?:CoreArtifact["implementationProfile"]):CheckSummary{
  const levelInstantiationConformance=implementationProfile==="KERNEL-level-instantiation-conformance1";
  const projectionConformance=implementationProfile==="KERNEL-projection-conformance1"||levelInstantiationConformance;
  const universeConformance=implementationProfile==="KERNEL-universe-conformance1"||projectionConformance;
  const resourceBounds=implementationProfile==="KERNEL-resource-bounds0"||universeConformance;
  const conversionFinalAudit=implementationProfile==="KERNEL-conversion-final-audit0"||resourceBounds;
  const mutualNestedFinalGeneralizationAudit=implementationProfile==="KERNEL-mutual-nested-final-generalization-audit0"||conversionFinalAudit;
  const mutualNestedDeeperMultipleRecursiveParameterSlots=implementationProfile==="KERNEL-mutual-nested-deeper-multiple-recursive-parameter-slots0"||mutualNestedFinalGeneralizationAudit;
  const mutualNestedDeeperMultipleFields=implementationProfile==="KERNEL-mutual-nested-deeper-multiple-fields0"||mutualNestedDeeperMultipleRecursiveParameterSlots;
  const mutualNestedDeeperDependentContainerParameters=implementationProfile==="KERNEL-mutual-nested-deeper-dependent-container-parameters0"||mutualNestedDeeperMultipleFields;
  const mutualNestedDeeperMultiParameterContainers=implementationProfile==="KERNEL-mutual-nested-deeper-multi-parameter-containers0"||mutualNestedDeeperDependentContainerParameters;
  const mutualNestedDeeperIndexedContainers=implementationProfile==="KERNEL-mutual-nested-deeper-indexed-containers0"||mutualNestedDeeperMultiParameterContainers;
  const mutualNestedDeeperProp=implementationProfile==="KERNEL-mutual-nested-deeper-prop0"||mutualNestedDeeperIndexedContainers;
  const mutualNestedDeeperPolymorphic=implementationProfile==="KERNEL-mutual-nested-deeper-polymorphic0"||mutualNestedDeeperProp;
  const mutualNestedDeeperIndices=implementationProfile==="KERNEL-mutual-nested-deeper-indices0"||mutualNestedDeeperPolymorphic;
  const mutualNestedDeeperParameters=implementationProfile==="KERNEL-mutual-nested-deeper-parameters0"||mutualNestedDeeperIndices;
  const mutualNestedDeeper=implementationProfile==="KERNEL-mutual-nested-deeper0"||mutualNestedDeeperParameters;
  const mutualNestedIndexedContainers=implementationProfile==="KERNEL-mutual-nested-indexed-containers0"||mutualNestedDeeper;
  const mutualNestedProp=implementationProfile==="KERNEL-mutual-nested-prop0"||mutualNestedIndexedContainers;
  const mutualNestedPolymorphic=implementationProfile==="KERNEL-mutual-nested-polymorphic0"||mutualNestedProp;
  const mutualNestedIndices=implementationProfile==="KERNEL-mutual-nested-indices0"||mutualNestedPolymorphic;
  const mutualNestedParameters=implementationProfile==="KERNEL-mutual-nested-parameters0"||mutualNestedIndices;
  const mutualNestedGeneralization=implementationProfile==="KERNEL-mutual-nested-generalization0"||mutualNestedParameters;
  const dependentIndexedRecursorCompletion=implementationProfile==="KERNEL-dependent-indexed-recursor-completion0"||mutualNestedGeneralization;
  const recursorFamilyBinderInfo=implementationProfile==="KERNEL-recursor-family-binder-info0"||dependentIndexedRecursorCompletion;
  const uniformParameterDefEq=implementationProfile==="KERNEL-uniform-parameter-defeq0"||recursorFamilyBinderInfo;
  const nestedDeeperDependentContainerParameters=implementationProfile==="KERNEL-nested-deeper-dependent-container-parameters0"||uniformParameterDefEq;
  const nestedDeeperMultiParameterGeneralization=implementationProfile==="KERNEL-nested-deeper-multi-parameter-generalization0"||nestedDeeperDependentContainerParameters;
  const nestedDeeperMultiParameter=implementationProfile==="KERNEL-nested-deeper-multi-parameter0"||nestedDeeperMultiParameterGeneralization;
  const nestedDeeperProp=implementationProfile==="KERNEL-nested-deeper-prop0"||nestedDeeperMultiParameter;
  const nestedDeeperMultipleFields=implementationProfile==="KERNEL-nested-deeper-multiple-fields0"||nestedDeeperProp;
  const nestedDeeperPolymorphic=implementationProfile==="KERNEL-nested-deeper-polymorphic0"||nestedDeeperMultipleFields;
  const nestedDeeperIndices=implementationProfile==="KERNEL-nested-deeper-indices0"||nestedDeeperPolymorphic;
  const nestedDeeperParameters=implementationProfile==="KERNEL-nested-deeper-parameters0"||nestedDeeperIndices;
  const nestedDeeperGeneralization=implementationProfile==="KERNEL-nested-deeper-generalization0"||nestedDeeperParameters;
  const nestedDeeper=implementationProfile==="KERNEL-nested-deeper0"||nestedDeeperGeneralization;
  const recursorMinorOrder=implementationProfile==="KERNEL-recursor-minor-order0"||nestedDeeper;
  const nestedIndexedContainers=implementationProfile==="KERNEL-nested-indexed-containers0"||recursorMinorOrder;
  const nestedPolymorphic=implementationProfile==="KERNEL-nested-polymorphic0"||nestedIndexedContainers;
  const nestedMultipleSpecializations=implementationProfile==="KERNEL-nested-multiple-specializations0"||nestedPolymorphic;
  const nestedIndexExpressions=implementationProfile==="KERNEL-nested-index-expressions0"||nestedMultipleSpecializations;
  const nestedIndices=implementationProfile==="KERNEL-nested-indices0"||nestedIndexExpressions;
  const nestedParameters=implementationProfile==="KERNEL-nested-parameters0"||nestedIndices;
  const nestedInductives=implementationProfile==="KERNEL-nested-inductives0"||nestedParameters;
  const mutualProp=implementationProfile==="KERNEL-mutual-prop0"||nestedInductives;
  const mutualHigherOrder=implementationProfile==="KERNEL-mutual-higher-order0"||mutualProp;
  const mutualIndices=implementationProfile==="KERNEL-mutual-indices0"||mutualHigherOrder;
  const mutualParameters=implementationProfile==="KERNEL-mutual-parameters0"||mutualIndices;
  const mutualInductives=implementationProfile==="KERNEL-mutual-inductives0"||mutualParameters;
  const telescopeTerms=implementationProfile==="KERNEL-telescope-terms0"||mutualInductives;
  const dependentFields=implementationProfile==="KERNEL-dependent-fields0"||telescopeTerms;
  const inductiveUniverses=implementationProfile==="KERNEL-inductive-universes0"||dependentFields;
  const recursorK=implementationProfile==="KERNEL-recursor-k0"||inductiveUniverses;
  const indexedProjection=implementationProfile==="KERNEL-indexed-projections0"||implementationProfile==="KERNEL-prop-elimination0"||recursorK;
  const propElimination=implementationProfile==="KERNEL-prop-elimination0"||recursorK;
  const indexed=implementationProfile==="KERNEL-indexed-recursors0"||indexedProjection;
  const positivity=implementationProfile==="KERNEL-inductive-positivity0"||indexed;
  const structure=implementationProfile==="KERNEL-structure-eta0"||positivity;
  const exact=implementationProfile==="KERNEL-empty-inductives0"||structure;
  if(resourceBounds){
    try{assertCoreResourceBounds(decls);}catch(e){if(e instanceof KernelResourceError)return{status:"resource_exhausted",declarations:[],assumptions:[],message:e.message};throw e;}
  }
  const env=new Environment(exact?{recursorProfile:"lean4331",allowEmptyInductives:true,allowProjections:structure,allowStructureEta:structure,allowHigherOrderPositiveRecursion:positivity,allowIndexedRecursiveRecursors:indexed,allowIndexedProjections:indexedProjection,allowPropElimination:propElimination,allowRecursorK:recursorK,allowInductiveUniverseChecks:inductiveUniverses,allowDependentConstructorFields:dependentFields,allowTelescopeTerms:telescopeTerms,allowMutualInductives:mutualInductives,allowMutualParameters:mutualParameters,allowMutualIndices:mutualIndices,allowHigherOrderMutualRecursion:mutualHigherOrder,allowMutualProp:mutualProp,allowNestedInductives:nestedInductives,allowNestedParameters:nestedParameters,allowNestedIndices:nestedIndices,allowNestedIndexExpressions:nestedIndexExpressions,allowNestedMultipleSpecializations:nestedMultipleSpecializations,allowNestedPolymorphic:nestedPolymorphic,allowNestedIndexedContainers:nestedIndexedContainers,allowLeanRecursorMinorOrder:recursorMinorOrder,allowNestedDeeper:nestedDeeper,allowNestedDeeperGeneralization:nestedDeeperGeneralization,allowNestedDeeperParameters:nestedDeeperParameters,allowNestedDeeperIndices:nestedDeeperIndices,allowNestedDeeperPolymorphic:nestedDeeperPolymorphic,allowNestedDeeperMultipleFields:nestedDeeperMultipleFields,allowNestedDeeperProp:nestedDeeperProp,allowNestedDeeperMultiParameter:nestedDeeperMultiParameter,allowNestedDeeperMultiParameterGeneralization:nestedDeeperMultiParameterGeneralization,allowNestedDeeperDependentContainerParameters:nestedDeeperDependentContainerParameters,allowUniformParameterDefEq:uniformParameterDefEq,allowRecursorFamilyBinderInfo:recursorFamilyBinderInfo,allowMutualNestedGeneralization:mutualNestedGeneralization,allowMutualNestedParameters:mutualNestedParameters,allowMutualNestedIndices:mutualNestedIndices,allowMutualNestedPolymorphic:mutualNestedPolymorphic,allowMutualNestedProp:mutualNestedProp,allowMutualNestedIndexedContainers:mutualNestedIndexedContainers,allowMutualNestedDeeper:mutualNestedDeeper,allowMutualNestedDeeperParameters:mutualNestedDeeperParameters,allowMutualNestedDeeperIndices:mutualNestedDeeperIndices,allowMutualNestedDeeperPolymorphic:mutualNestedDeeperPolymorphic,allowMutualNestedDeeperProp:mutualNestedDeeperProp,allowMutualNestedDeeperIndexedContainers:mutualNestedDeeperIndexedContainers,allowMutualNestedDeeperMultiParameterContainers:mutualNestedDeeperMultiParameterContainers,allowMutualNestedDeeperDependentContainerParameters:mutualNestedDeeperDependentContainerParameters,allowMutualNestedDeeperMultipleFields:mutualNestedDeeperMultipleFields,allowMutualNestedDeeperMultipleRecursiveParameterSlots:mutualNestedDeeperMultipleRecursiveParameterSlots,allowMutualNestedFinalGeneralizationAudit:mutualNestedFinalGeneralizationAudit,allowConversionFinalAudit:conversionFinalAudit,allowResourceBounds:resourceBounds,allowProjectionConformance:projectionConformance}:{}),output:CheckSummary["declarations"]=[],assumptions=new Set<string>();
  try{
    for(const decl of decls){
      const checked=checkAndAddDeclaration(env,decl);for(const a of checked.assumptions)assumptions.add(a);
      output.push({name:decl.name,kind:decl.kind,universes:[...decl.levelParams],type:decl.kind==="quot"?"<Lean quotient primitives>":decl.kind==="mutualInductive"?`<mutual inductive block: ${decl.inductives.map(m=>m.name).join(", ")}>`:pretty(decl.type),generated:[...checked.generated],assumptions:[...checked.assumptions].sort()});
    }
    return{status:"accepted",declarations:output,assumptions:[...assumptions].sort()};
  }catch(e){
    if(resourceBounds&&e instanceof KernelResourceError)return{status:"resource_exhausted",declarations:output,assumptions:[...assumptions].sort(),message:e.message};
    throw e;
  }
}

const DIRECT_MAX_DECLS=10_000,DIRECT_MAX_TERM_NODES=1_000_000,DIRECT_MAX_LEVEL_NODES=1_000_000,DIRECT_MAX_DEPTH=1024,DIRECT_MAX_MUTUAL_MEMBERS=256,DIRECT_MAX_CONSTRUCTORS=10_000;
function assertCoreResourceBounds(decls:readonly CoreDeclaration[]):void{
  if(decls.length>DIRECT_MAX_DECLS)throw new KernelResourceError("too many declarations","core_declarations");
  let termNodes=0,levelNodes=0;
  const terms:{term:Term;depth:number}[]=[],levels:{level:Level;depth:number}[]=[];
  const pushTerm=(term:Term)=>terms.push({term,depth:0});
  for(const d of decls){
    if(d.kind==="quot")continue;
    if(d.kind==="mutualInductive"){
      if(d.inductives.length>DIRECT_MAX_MUTUAL_MEMBERS)throw new KernelResourceError("mutual inductive member resource limit exceeded","mutual_members");
      for(const m of d.inductives){if(m.constructors.length>DIRECT_MAX_CONSTRUCTORS)throw new KernelResourceError("constructor resource limit exceeded","constructors");pushTerm(m.type);for(const c of m.constructors)pushTerm(c.type);}
    }else{
      pushTerm(d.type);
      if(d.kind==="theorem"||d.kind==="opaque"||d.kind==="example"||d.kind==="definition")pushTerm(d.value);
      if(d.kind==="inductive"){if(d.constructors.length>DIRECT_MAX_CONSTRUCTORS)throw new KernelResourceError("constructor resource limit exceeded","constructors");for(const c of d.constructors)pushTerm(c.type);}
    }
  }
  while(terms.length){
    const {term,depth}=terms.pop()!;if(++termNodes>DIRECT_MAX_TERM_NODES)throw new KernelResourceError("term-node resource limit exceeded","term_nodes");if(depth>DIRECT_MAX_DEPTH)throw new KernelResourceError("term nesting depth exceeded","term_depth");
    const next=(t:Term)=>terms.push({term:t,depth:depth+1});
    switch(term.tag){
      case"sort":levels.push({level:term.level,depth:0});break;
      case"const":for(const l of term.levels)levels.push({level:l,depth:0});break;
      case"app":next(term.fn);next(term.arg);break;
      case"lam":case"pi":next(term.domain);next(term.body);break;
      case"let":next(term.type);next(term.value);next(term.body);break;
      case"proj":next(term.expr);break;
      case"bvar":break;
    }
  }
  while(levels.length){
    const {level,depth}=levels.pop()!;if(++levelNodes>DIRECT_MAX_LEVEL_NODES)throw new KernelResourceError("level-node resource limit exceeded","level_nodes");if(depth>DIRECT_MAX_DEPTH)throw new KernelResourceError("level nesting depth exceeded","level_depth");
    switch(level.tag){case"succ":levels.push({level:level.of,depth:depth+1});break;case"max":case"imax":levels.push({level:level.left,depth:depth+1},{level:level.right,depth:depth+1});break;case"zero":case"param":break;}
  }
}
