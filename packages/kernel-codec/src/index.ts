import crypto from "node:crypto";
import { BinderInfo, CoreArtifact, CoreDeclaration, CoreModulesMetadata, Level, Term, TypeclassEnvironmentMetadata, binderInfoOf, emptyTypeclassEnvironment, levelOfNat, sameTerm, shift } from "@proofscript/kernel";

export class ArtifactError extends Error {}
export class ArtifactResourceError extends ArtifactError { readonly code:string; constructor(message:string,code="artifact_resource_limit"){super(message);this.name="ArtifactResourceError";this.code=code;} }

const MAX_DECLS = 10_000;
const MAX_TERM_NODES = 1_000_000;
const MAX_LEVEL_NODES = 1_000_000;

export interface CoreModuleBuildMetadata {
  name:string;
  sourceSha256:string;
  imports:string[];
  declarations:string[];
}
export interface CoreModulesBuildMetadata { entry:string; modules:CoreModuleBuildMetadata[]; }

export function makeArtifact(declarations: CoreDeclaration[], typeclasses: TypeclassEnvironmentMetadata = emptyTypeclassEnvironment(), modules?:CoreModulesBuildMetadata): CoreArtifact {
  return current(declarations, typeclasses, modules?finalizeModuleMetadata(modules,declarations,typeclasses,"K3c-section-vars0"):undefined);
}

/** Kernel-first v13 quotient artifact constructor. */
export function makeKernelArtifact(declarations: CoreDeclaration[], typeclasses: TypeclassEnvironmentMetadata = emptyTypeclassEnvironment()): CoreArtifact {
  return current(declarations,typeclasses,undefined,"KERNEL-quotients0",13);
}

/** Kernel-first v14 artifact constructor enabling the empty-inductive admission slice. */
export function makeKernelEmptyArtifact(declarations: CoreDeclaration[], typeclasses: TypeclassEnvironmentMetadata = emptyTypeclassEnvironment()): CoreArtifact {
  return current(declarations,typeclasses,undefined,"KERNEL-empty-inductives0",14);
}

/** Kernel-first v15 artifact constructor enabling trusted projection expressions and structure eta. */
export function makeKernelStructureEtaArtifact(declarations: CoreDeclaration[], typeclasses: TypeclassEnvironmentMetadata = emptyTypeclassEnvironment()): CoreArtifact {
  return current(declarations,typeclasses,undefined,"KERNEL-structure-eta0",15);
}

/** Kernel-first v16 artifact constructor enabling the higher-order strict-positivity slice. */
export function makeKernelInductivePositivityArtifact(declarations: CoreDeclaration[], typeclasses: TypeclassEnvironmentMetadata = emptyTypeclassEnvironment()): CoreArtifact {
  return current(declarations,typeclasses,undefined,"KERNEL-inductive-positivity0",16);
}

/** Kernel-first v17 artifact constructor enabling direct recursive indexed recursors. */
export function makeKernelIndexedRecursorsArtifact(declarations: CoreDeclaration[], typeclasses: TypeclassEnvironmentMetadata = emptyTypeclassEnvironment()): CoreArtifact {
  return current(declarations,typeclasses,undefined,"KERNEL-indexed-recursors0",17);
}

/** Kernel-first v18 artifact constructor enabling indexed raw projections. */
export function makeKernelIndexedProjectionsArtifact(declarations: CoreDeclaration[], typeclasses: TypeclassEnvironmentMetadata = emptyTypeclassEnvironment()): CoreArtifact {
  return current(declarations,typeclasses,undefined,"KERNEL-indexed-projections0",18);
}

/** Kernel-first v19 artifact constructor enabling Lean-faithful Prop elimination. */
export function makeKernelPropEliminationArtifact(declarations: CoreDeclaration[], typeclasses: TypeclassEnvironmentMetadata = emptyTypeclassEnvironment()): CoreArtifact {
  return current(declarations,typeclasses,undefined,"KERNEL-prop-elimination0",19);
}

/** Kernel-first v20 artifact constructor enabling Lean-faithful RecursorVal.k reduction. */
export function makeKernelRecursorKArtifact(declarations: CoreDeclaration[], typeclasses: TypeclassEnvironmentMetadata = emptyTypeclassEnvironment()): CoreArtifact {
  return current(declarations,typeclasses,undefined,"KERNEL-recursor-k0",20);
}

/** Kernel-first v21 artifact constructor enforcing Lean constructor-field universe ceilings. */
export function makeKernelInductiveUniversesArtifact(declarations: CoreDeclaration[], typeclasses: TypeclassEnvironmentMetadata = emptyTypeclassEnvironment()): CoreArtifact {
  return current(declarations,typeclasses,undefined,"KERNEL-inductive-universes0",21);
}

/** Kernel-first v22 artifact constructor enabling simple constructor dependent-field telescopes. */
export function makeKernelDependentFieldsArtifact(declarations: CoreDeclaration[], typeclasses: TypeclassEnvironmentMetadata = emptyTypeclassEnvironment()): CoreArtifact {
  return current(declarations,typeclasses,undefined,"KERNEL-dependent-fields0",22);
}

/** Kernel-first v23 artifact constructor enabling lambda/let term shapes in trusted recursor telescopes. */
export function makeKernelTelescopeTermsArtifact(declarations: CoreDeclaration[], typeclasses: TypeclassEnvironmentMetadata = emptyTypeclassEnvironment()): CoreArtifact {
  return current(declarations,typeclasses,undefined,"KERNEL-telescope-terms0",23);
}

/** Kernel-first v24 artifact constructor enabling the bounded direct mutual-inductive slice. */
export function makeKernelMutualInductivesArtifact(declarations: CoreDeclaration[], typeclasses: TypeclassEnvironmentMetadata = emptyTypeclassEnvironment()): CoreArtifact {
  return current(declarations,typeclasses,undefined,"KERNEL-mutual-inductives0",24);
}

/** Kernel-first v25 artifact constructor adding shared uniform parameters to mutual inductives. */
export function makeKernelMutualParametersArtifact(declarations: CoreDeclaration[], typeclasses: TypeclassEnvironmentMetadata = emptyTypeclassEnvironment()): CoreArtifact {
  return current(declarations,typeclasses,undefined,"KERNEL-mutual-parameters0",25);
}

/** Kernel-first v26 artifact constructor adding per-family indices to direct mutual inductives. */
export function makeKernelMutualIndicesArtifact(declarations: CoreDeclaration[], typeclasses: TypeclassEnvironmentMetadata = emptyTypeclassEnvironment()): CoreArtifact {
  return current(declarations,typeclasses,undefined,"KERNEL-mutual-indices0",26);
}

/** Kernel-first v27 artifact constructor adding higher-order positive mutual recursion. */
export function makeKernelMutualHigherOrderArtifact(declarations: CoreDeclaration[], typeclasses: TypeclassEnvironmentMetadata = emptyTypeclassEnvironment()): CoreArtifact {
  return current(declarations,typeclasses,undefined,"KERNEL-mutual-higher-order0",27);
}

/** Kernel-first v28 artifact constructor admitting mutual predicates with Lean-derived Prop-only elimination. */
export function makeKernelMutualPropArtifact(declarations: CoreDeclaration[], typeclasses: TypeclassEnvironmentMetadata = emptyTypeclassEnvironment()): CoreArtifact {
  return current(declarations,typeclasses,undefined,"KERNEL-mutual-prop0",28);
}

/** Kernel-first v29 artifact constructor enabling the first trusted nested-inductive preprocessing slice. */
export function makeKernelNestedInductivesArtifact(declarations: CoreDeclaration[], typeclasses: TypeclassEnvironmentMetadata = emptyTypeclassEnvironment()): CoreArtifact {
  return current(declarations,typeclasses,undefined,"KERNEL-nested-inductives0",29);
}

/** Kernel-first v30 artifact constructor threading shared outer parameters through nested preprocessing. */
export function makeKernelNestedParametersArtifact(declarations: CoreDeclaration[], typeclasses: TypeclassEnvironmentMetadata = emptyTypeclassEnvironment()): CoreArtifact {
  return current(declarations,typeclasses,undefined,"KERNEL-nested-parameters0",30);
}

/** Kernel-first v31 artifact constructor admitting the bounded indexed-outer nested preprocessing slice. */
export function makeKernelNestedIndicesArtifact(declarations: CoreDeclaration[], typeclasses: TypeclassEnvironmentMetadata = emptyTypeclassEnvironment()): CoreArtifact {
  return current(declarations,typeclasses,undefined,"KERNEL-nested-indices0",31);
}

/** Kernel-first v32 artifact constructor admitting fixed nested index expressions over uniform outer parameters. */
export function makeKernelNestedIndexExpressionsArtifact(declarations: CoreDeclaration[], typeclasses: TypeclassEnvironmentMetadata = emptyTypeclassEnvironment()): CoreArtifact {
  return current(declarations,typeclasses,undefined,"KERNEL-nested-index-expressions0",32);
}

/** Kernel-first v33 artifact constructor admitting multiple compatible nested auxiliary specializations. */
export function makeKernelNestedMultipleSpecializationsArtifact(declarations: CoreDeclaration[], typeclasses: TypeclassEnvironmentMetadata = emptyTypeclassEnvironment()): CoreArtifact {
  return current(declarations,typeclasses,undefined,"KERNEL-nested-multiple-specializations0",33);
}

/** Kernel-first v34 artifact constructor admitting bounded universe-polymorphic nested preprocessing. */
export function makeKernelNestedPolymorphicArtifact(declarations: CoreDeclaration[], typeclasses: TypeclassEnvironmentMetadata = emptyTypeclassEnvironment()): CoreArtifact {
  return current(declarations,typeclasses,undefined,"KERNEL-nested-polymorphic0",34);
}

/** Kernel-only v35 artifact: bounded indexed nested-container preprocessing. */
export function makeKernelNestedIndexedContainersArtifact(declarations: CoreDeclaration[], typeclasses: TypeclassEnvironmentMetadata = emptyTypeclassEnvironment()): CoreArtifact {
  return current(declarations,typeclasses,undefined,"KERNEL-nested-indexed-containers0",35);
}

/** Kernel-only v36 artifact: Lean 4.33.1 constructor-fields-first recursive minor ordering. */
export function makeKernelRecursorMinorOrderArtifact(declarations: CoreDeclaration[], typeclasses: TypeclassEnvironmentMetadata = emptyTypeclassEnvironment()): CoreArtifact {
  return current(declarations,typeclasses,undefined,"KERNEL-recursor-minor-order0",36);
}

/** Kernel-only v37 artifact: bounded exact two-layer deeper nested preprocessing. */
export function makeKernelNestedDeeperArtifact(declarations: CoreDeclaration[], typeclasses: TypeclassEnvironmentMetadata = emptyTypeclassEnvironment()): CoreArtifact {
  return current(declarations,typeclasses,undefined,"KERNEL-nested-deeper0",37);
}

/** Kernel-only v38 artifact: arbitrary closed linear-depth deeper nested preprocessing. */
export function makeKernelNestedDeeperGeneralizationArtifact(declarations: CoreDeclaration[], typeclasses: TypeclassEnvironmentMetadata = emptyTypeclassEnvironment()): CoreArtifact {
  return current(declarations,typeclasses,undefined,"KERNEL-nested-deeper-generalization0",38);
}

/** Kernel-only v39 artifact: arbitrary-depth deeper nesting with uniform/dependent outer parameters. */
export function makeKernelNestedDeeperParametersArtifact(declarations: CoreDeclaration[], typeclasses: TypeclassEnvironmentMetadata = emptyTypeclassEnvironment()): CoreArtifact {
  return current(declarations,typeclasses,undefined,"KERNEL-nested-deeper-parameters0",39);
}

/** Kernel-only v40 artifact: arbitrary-depth deeper nesting with Lean-compatible indexed outer-family modes. */
export function makeKernelNestedDeeperIndicesArtifact(declarations: CoreDeclaration[], typeclasses: TypeclassEnvironmentMetadata = emptyTypeclassEnvironment()): CoreArtifact {
  return current(declarations,typeclasses,undefined,"KERNEL-nested-deeper-indices0",40);
}

/** Kernel-only v41 artifact: arbitrary-depth explicit-universe polymorphic nested preprocessing. */
export function makeKernelNestedDeeperPolymorphicArtifact(declarations: CoreDeclaration[], typeclasses: TypeclassEnvironmentMetadata = emptyTypeclassEnvironment()): CoreArtifact {
  return current(declarations,typeclasses,undefined,"KERNEL-nested-deeper-polymorphic0",41);
}

/** Kernel-only v42 artifact: multiple compatible arbitrary-depth polymorphic nested fields with helper deduplication. */
export function makeKernelNestedDeeperMultipleFieldsArtifact(declarations: CoreDeclaration[], typeclasses: TypeclassEnvironmentMetadata = emptyTypeclassEnvironment()): CoreArtifact {
  return current(declarations,typeclasses,undefined,"KERNEL-nested-deeper-multiple-fields0",42);
}

/** Kernel-only v43 artifact: graph-based arbitrary-depth nested Prop preprocessing. */
export function makeKernelNestedDeeperPropArtifact(declarations: CoreDeclaration[], typeclasses: TypeclassEnvironmentMetadata = emptyTypeclassEnvironment()): CoreArtifact {
  return current(declarations,typeclasses,undefined,"KERNEL-nested-deeper-prop0",43);
}

/** Kernel-only v44 artifact: bounded multi-parameter nested container preprocessing. */
export function makeKernelNestedDeeperMultiParameterArtifact(declarations: CoreDeclaration[], typeclasses: TypeclassEnvironmentMetadata = emptyTypeclassEnvironment()): CoreArtifact {
  return current(declarations,typeclasses,undefined,"KERNEL-nested-deeper-multi-parameter0",44);
}

/** Kernel-only v45 artifact: generalized multi-parameter nested specialization graph. */
export function makeKernelNestedDeeperMultiParameterGeneralizationArtifact(declarations: CoreDeclaration[], typeclasses: TypeclassEnvironmentMetadata = emptyTypeclassEnvironment()): CoreArtifact {
  return current(declarations,typeclasses,undefined,"KERNEL-nested-deeper-multi-parameter-generalization0",45);
}

/** Kernel-only v46 artifact: dependent nested-container parameter telescopes. */
export function makeKernelNestedDeeperDependentContainerParametersArtifact(declarations: CoreDeclaration[], typeclasses: TypeclassEnvironmentMetadata = emptyTypeclassEnvironment()): CoreArtifact {
  return current(declarations,typeclasses,undefined,"KERNEL-nested-deeper-dependent-container-parameters0",46);
}


/** Kernel-only v47 artifact: definitional equality for non-mutual recursive uniform parameters. */
export function makeKernelUniformParameterDefEqArtifact(declarations: CoreDeclaration[], typeclasses: TypeclassEnvironmentMetadata = emptyTypeclassEnvironment()): CoreArtifact {
  return current(declarations,typeclasses,undefined,"KERNEL-uniform-parameter-defeq0",47);
}

/** Kernel-only v48 artifact: Lean-faithful recursor outer-family BinderInfo. */
export function makeKernelRecursorFamilyBinderInfoArtifact(declarations: CoreDeclaration[], typeclasses: TypeclassEnvironmentMetadata = emptyTypeclassEnvironment()): CoreArtifact {
  return current(declarations,typeclasses,undefined,"KERNEL-recursor-family-binder-info0",48);
}

/** Core v49 conformance profile after the final non-mutual dependent/indexed recursor audit. */
export function makeKernelDependentIndexedRecursorCompletionArtifact(declarations: CoreDeclaration[], typeclasses: TypeclassEnvironmentMetadata = emptyTypeclassEnvironment()): CoreArtifact {
  return current(declarations,typeclasses,undefined,"KERNEL-dependent-indexed-recursor-completion0",49);
}

/** Core v50: bounded mutual+nested preprocessing generalization. */
export function makeKernelMutualNestedGeneralizationArtifact(declarations: CoreDeclaration[], typeclasses: TypeclassEnvironmentMetadata = emptyTypeclassEnvironment()): CoreArtifact {
  return current(declarations,typeclasses,undefined,"KERNEL-mutual-nested-generalization0",50);
}

/** Kernel-first v51 artifact constructor enabling shared-parameter mutual+nested preprocessing. */
export function makeKernelMutualNestedParametersArtifact(declarations: CoreDeclaration[], typeclasses: TypeclassEnvironmentMetadata = emptyTypeclassEnvironment()): CoreArtifact {
  return current(declarations,typeclasses,undefined,"KERNEL-mutual-nested-parameters0",51);
}

/** Kernel-only v52 artifact constructor for indexed mutual+nested specialization preprocessing. */
export function makeKernelMutualNestedIndicesArtifact(declarations: CoreDeclaration[], typeclasses: TypeclassEnvironmentMetadata = emptyTypeclassEnvironment()): CoreArtifact {
  return current(declarations,typeclasses,undefined,"KERNEL-mutual-nested-indices0",52);
}

/** Kernel-only v53 artifact constructor for universe-polymorphic mutual+nested preprocessing. */
export function makeKernelMutualNestedPolymorphicArtifact(declarations: CoreDeclaration[], typeclasses: TypeclassEnvironmentMetadata = emptyTypeclassEnvironment()): CoreArtifact {
  return current(declarations,typeclasses,undefined,"KERNEL-mutual-nested-polymorphic0",53);
}

/** Kernel-only v54 artifact constructor for Prop-valued mutual+nested preprocessing. */
export function makeKernelMutualNestedPropArtifact(declarations: CoreDeclaration[], typeclasses: TypeclassEnvironmentMetadata = emptyTypeclassEnvironment()): CoreArtifact {
  return current(declarations,typeclasses,undefined,"KERNEL-mutual-nested-prop0",54);
}

/** Kernel-only v55 artifact constructor for indexed nested containers inside mutual/nested graphs. */
export function makeKernelMutualNestedIndexedContainersArtifact(declarations: CoreDeclaration[], typeclasses: TypeclassEnvironmentMetadata = emptyTypeclassEnvironment()): CoreArtifact {
  return current(declarations,typeclasses,undefined,"KERNEL-mutual-nested-indexed-containers0",55);
}

/** Kernel-only v56 artifact constructor enabling bounded deeper mutual+nested preprocessing. */
export function makeKernelMutualNestedDeeperArtifact(declarations: CoreDeclaration[], typeclasses: TypeclassEnvironmentMetadata = emptyTypeclassEnvironment()): CoreArtifact {
  return current(declarations,typeclasses,undefined,"KERNEL-mutual-nested-deeper0",56);
}

/** Kernel-only v57 artifact constructor enabling bounded parameterized deeper mutual+nested preprocessing. */
export function makeKernelMutualNestedDeeperParametersArtifact(declarations: CoreDeclaration[], typeclasses: TypeclassEnvironmentMetadata = emptyTypeclassEnvironment()): CoreArtifact {
  return current(declarations,typeclasses,undefined,"KERNEL-mutual-nested-deeper-parameters0",57);
}

/** Kernel-only v58 artifact constructor enabling bounded deeper indexed mutual+nested preprocessing. */
export function makeKernelMutualNestedDeeperIndicesArtifact(declarations: CoreDeclaration[], typeclasses: TypeclassEnvironmentMetadata = emptyTypeclassEnvironment()): CoreArtifact {
  return current(declarations,typeclasses,undefined,"KERNEL-mutual-nested-deeper-indices0",58);
}

/** Kernel-only v59 artifact constructor enabling universe-polymorphic deeper indexed mutual+nested preprocessing. */
export function makeKernelMutualNestedDeeperPolymorphicArtifact(declarations: CoreDeclaration[], typeclasses: TypeclassEnvironmentMetadata = emptyTypeclassEnvironment()): CoreArtifact {
  return current(declarations,typeclasses,undefined,"KERNEL-mutual-nested-deeper-polymorphic0",59);
}

/** Kernel-only v60 artifact constructor enabling deep polymorphic/indexed mutual+nested Prop preprocessing. */
export function makeKernelMutualNestedDeeperPropArtifact(declarations: CoreDeclaration[], typeclasses: TypeclassEnvironmentMetadata = emptyTypeclassEnvironment()): CoreArtifact {
  return current(declarations,typeclasses,undefined,"KERNEL-mutual-nested-deeper-prop0",60);
}
export function makeKernelMutualNestedDeeperIndexedContainersArtifact(declarations: CoreDeclaration[], typeclasses: TypeclassEnvironmentMetadata = emptyTypeclassEnvironment()): CoreArtifact {
  return current(declarations,typeclasses,undefined,"KERNEL-mutual-nested-deeper-indexed-containers0",61);
}
export function makeKernelMutualNestedDeeperMultiParameterContainersArtifact(declarations: CoreDeclaration[], typeclasses: TypeclassEnvironmentMetadata = emptyTypeclassEnvironment()): CoreArtifact {
  return current(declarations,typeclasses,undefined,"KERNEL-mutual-nested-deeper-multi-parameter-containers0",62);
}
export function makeKernelMutualNestedDeeperDependentContainerParametersArtifact(declarations: CoreDeclaration[], typeclasses: TypeclassEnvironmentMetadata = emptyTypeclassEnvironment()): CoreArtifact {
  return current(declarations,typeclasses,undefined,"KERNEL-mutual-nested-deeper-dependent-container-parameters0",63);
}
export function makeKernelMutualNestedDeeperMultipleFieldsArtifact(declarations: CoreDeclaration[], typeclasses: TypeclassEnvironmentMetadata = emptyTypeclassEnvironment()): CoreArtifact {
  return current(declarations,typeclasses,undefined,"KERNEL-mutual-nested-deeper-multiple-fields0",64);
}
export function makeKernelMutualNestedDeeperMultipleRecursiveParameterSlotsArtifact(declarations: CoreDeclaration[], typeclasses: TypeclassEnvironmentMetadata = emptyTypeclassEnvironment()): CoreArtifact {
  return current(declarations,typeclasses,undefined,"KERNEL-mutual-nested-deeper-multiple-recursive-parameter-slots0",65);
}
export function makeKernelMutualNestedFinalGeneralizationAuditArtifact(declarations: CoreDeclaration[], typeclasses: TypeclassEnvironmentMetadata = emptyTypeclassEnvironment()): CoreArtifact {
  return current(declarations,typeclasses,undefined,"KERNEL-mutual-nested-final-generalization-audit0",66);
}

/** Kernel-first v67 artifact constructor for the final conversion/WHNF audit profile. */
export function makeKernelConversionFinalAuditArtifact(declarations: CoreDeclaration[], typeclasses: TypeclassEnvironmentMetadata = emptyTypeclassEnvironment()): CoreArtifact {
  return current(declarations,typeclasses,undefined,"KERNEL-conversion-final-audit0",67);
}

/** Kernel-first v68 artifact constructor for deterministic resource-bound enforcement. */
export function makeKernelResourceBoundsArtifact(declarations: CoreDeclaration[], typeclasses: TypeclassEnvironmentMetadata = emptyTypeclassEnvironment()): CoreArtifact {
  return current(declarations,typeclasses,undefined,"KERNEL-resource-bounds0",68);
}

/** Kernel assurance v69 artifact: resource-bounded v68 semantics with exact Lean-4.33.1 universe conformance repair. */
export function makeKernelUniverseConformanceArtifact(declarations: CoreDeclaration[], typeclasses: TypeclassEnvironmentMetadata = emptyTypeclassEnvironment()): CoreArtifact {
  return current(declarations,typeclasses,undefined,"KERNEL-universe-conformance1",69);
}

/** Kernel assurance v70 artifact: v69 semantics plus exact Lean-4.33.1 projection dependency/Prop conformance. */
export function makeKernelProjectionConformanceArtifact(declarations: CoreDeclaration[], typeclasses: TypeclassEnvironmentMetadata = emptyTypeclassEnvironment()): CoreArtifact {
  return current(declarations,typeclasses,undefined,"KERNEL-projection-conformance1",70);
}

/** Kernel assurance v71 artifact: v70 semantics plus exact Lean-4.33.1 level/expression universe-instantiation conformance. */
export function makeKernelLevelInstantiationConformanceArtifact(declarations: CoreDeclaration[], typeclasses: TypeclassEnvironmentMetadata = emptyTypeclassEnvironment()): CoreArtifact {
  return current(declarations,typeclasses,undefined,"KERNEL-level-instantiation-conformance1",71);
}

export function decodeArtifact(value: unknown): CoreArtifact {
  if (!isObject(value)) throw new ArtifactError("artifact root must be an object");
  if (value.format !== "proofscript-core") throw new ArtifactError("unsupported artifact format");
  if (value.proofscriptReference !== "v0.1" || value.leanSemanticBaseline !== "4.33.1") {
    throw new ArtifactError("artifact semantic baseline mismatch");
  }

  if (value.formatVersion === 1) return decodeV1(value);
  if (value.formatVersion === 2) {
    if (value.implementationProfile !== "K1-inductives0") throw new ArtifactError("unsupported v2 implementation profile");
    return decodeStructured(value, { legacyV2: true, allowDefinitions: false, allowLet: false, allowTransparencyKinds: false, allowBinderInfo: false });
  }
  if (value.formatVersion === 3) {
    if (value.implementationProfile !== "K1c-indexed0") throw new ArtifactError("unsupported v3 implementation profile");
    return decodeStructured(value, { legacyV2: false, allowDefinitions: false, allowLet: false, allowTransparencyKinds: false, allowBinderInfo: false });
  }
  if (value.formatVersion === 4) {
    if (value.implementationProfile !== "K1d-foundation0") throw new ArtifactError("unsupported v4 implementation profile");
    return decodeStructured(value, { legacyV2: false, allowDefinitions: true, allowLet: false, allowTransparencyKinds: false, allowBinderInfo: false });
  }
  if (value.formatVersion === 5) {
    if (value.implementationProfile !== "K2a-bindings0") throw new ArtifactError("unsupported v5 implementation profile");
    return decodeStructured(value, { legacyV2: false, allowDefinitions: true, allowLet: true, allowTransparencyKinds: false, allowBinderInfo: false });
  }
  if (value.formatVersion === 6) {
    if (value.implementationProfile !== "K2b-transparency0") throw new ArtifactError("unsupported v6 implementation profile");
    return decodeStructured(value, { legacyV2: false, allowDefinitions: true, allowLet: true, allowTransparencyKinds: true, allowBinderInfo: false });
  }
  if (value.formatVersion === 7) {
    if (value.implementationProfile !== "K2c-structures-match0" && value.implementationProfile !== "K2d-structural-recursion0" && value.implementationProfile !== "K2e-equation-clauses0" && value.implementationProfile !== "K2f-patterns0" && value.implementationProfile !== "K2g-structure-instances0" && value.implementationProfile !== "K2h-structure-update0" && value.implementationProfile !== "K2i-literals0" && value.implementationProfile !== "K2j-equality0") {
      throw new ArtifactError("unsupported v7 implementation profile");
    }
    return decodeStructured(value, { legacyV2: false, allowDefinitions: true, allowLet: true, allowTransparencyKinds: true, allowBinderInfo: false });
  }
  if (value.formatVersion === 8) {
    if (value.implementationProfile !== "K2k-binder-info0" && value.implementationProfile !== "K2l-implicit-synthesis0" && value.implementationProfile !== "K2m-unification0") throw new ArtifactError("unsupported v8 implementation profile");
    return decodeStructured(value, { legacyV2: false, allowDefinitions: true, allowLet: true, allowTransparencyKinds: true, allowBinderInfo: true });
  }
  if (value.formatVersion === 9) {
    if (value.implementationProfile !== "K2n-typeclass-env0" && value.implementationProfile !== "K2o-instance-search0") throw new ArtifactError("unsupported v9 implementation profile");
    return decodeStructured(value, { legacyV2: false, allowDefinitions: true, allowLet: true, allowTransparencyKinds: true, allowBinderInfo: true }, 9);
  }
  if (value.formatVersion === 10) {
    if (value.implementationProfile !== "K2p-parameterized-typeclasses0" && value.implementationProfile !== "K2q-polymorphic-instances0" && value.implementationProfile !== "K2r-recursive-instance-search0") throw new ArtifactError("unsupported v10 implementation profile");
    return decodeStructured(value, { legacyV2: false, allowDefinitions: true, allowLet: true, allowTransparencyKinds: true, allowBinderInfo: true }, 10);
  }
  if (value.formatVersion === 11) {
    if (value.implementationProfile !== "K3a-modules0") throw new ArtifactError("unsupported v11 implementation profile");
    return decodeStructured(value, { legacyV2: false, allowDefinitions: true, allowLet: true, allowTransparencyKinds: true, allowBinderInfo: true }, 10, "v11");
  }
  if (value.formatVersion === 12) {
    if (value.implementationProfile !== "K3b-module-interfaces0" && value.implementationProfile !== "K3c-names0" && value.implementationProfile !== "K3c-sections-open0" && value.implementationProfile !== "K3c-section-vars0") throw new ArtifactError("unsupported v12 implementation profile");
    // P5.64 class-field projections are emitted as checked raw Proj definitions
    // in the K3c-section-vars0 artifact profile. This is not a new kernel rule:
    // replay still independently checks the projection term against the current
    // trusted-boundary kernel. The codec must accept the syntax the compiler
    // already emits, otherwise exact-Lean oracle export and standalone replay
    // disagree with the published feature surface.
    return decodeStructured(value, { legacyV2: false, allowDefinitions: true, allowLet: true, allowTransparencyKinds: true, allowBinderInfo: true, allowProjections: value.implementationProfile === "K3c-section-vars0" }, 10, "v12", value.implementationProfile);
  }
  if (value.formatVersion === 13) {
    if (value.implementationProfile !== "KERNEL-quotients0") throw new ArtifactError("unsupported v13 implementation profile");
    if (value.modules !== undefined) throw new ArtifactError("v13 KERNEL-quotients0 artifacts do not carry frontend module metadata");
    return decodeStructured(value, { legacyV2: false, allowDefinitions: true, allowLet: true, allowTransparencyKinds: true, allowBinderInfo: true, allowQuot: true }, 10, false, "KERNEL-quotients0", 13);
  }
  if (value.formatVersion === 14) {
    if (value.implementationProfile !== "KERNEL-empty-inductives0") throw new ArtifactError("unsupported v14 implementation profile");
    if (value.modules !== undefined) throw new ArtifactError("v14 KERNEL-empty-inductives0 artifacts do not carry frontend module metadata");
    return decodeStructured(value, { legacyV2: false, allowDefinitions: true, allowLet: true, allowTransparencyKinds: true, allowBinderInfo: true, allowQuot: true, allowEmptyInductives: true }, 10, false, "KERNEL-empty-inductives0", 14);
  }
  if (value.formatVersion === 15) {
    if (value.implementationProfile !== "KERNEL-structure-eta0") throw new ArtifactError("unsupported v15 implementation profile");
    if (value.modules !== undefined) throw new ArtifactError("v15 KERNEL-structure-eta0 artifacts do not carry frontend module metadata");
    return decodeStructured(value, { legacyV2: false, allowDefinitions: true, allowLet: true, allowTransparencyKinds: true, allowBinderInfo: true, allowQuot: true, allowEmptyInductives: true, allowProjections: true }, 10, false, "KERNEL-structure-eta0", 15);
  }
  if (value.formatVersion === 16) {
    if (value.implementationProfile !== "KERNEL-inductive-positivity0") throw new ArtifactError("unsupported v16 implementation profile");
    if (value.modules !== undefined) throw new ArtifactError("v16 KERNEL-inductive-positivity0 artifacts do not carry frontend module metadata");
    return decodeStructured(value, { legacyV2: false, allowDefinitions: true, allowLet: true, allowTransparencyKinds: true, allowBinderInfo: true, allowQuot: true, allowEmptyInductives: true, allowProjections: true }, 10, false, "KERNEL-inductive-positivity0", 16);
  }
  if (value.formatVersion === 17) {
    if (value.implementationProfile !== "KERNEL-indexed-recursors0") throw new ArtifactError("unsupported v17 implementation profile");
    if (value.modules !== undefined) throw new ArtifactError("v17 KERNEL-indexed-recursors0 artifacts do not carry frontend module metadata");
    return decodeStructured(value, { legacyV2: false, allowDefinitions: true, allowLet: true, allowTransparencyKinds: true, allowBinderInfo: true, allowQuot: true, allowEmptyInductives: true, allowProjections: true }, 10, false, "KERNEL-indexed-recursors0", 17);
  }
  if (value.formatVersion === 18) {
    if (value.implementationProfile !== "KERNEL-indexed-projections0") throw new ArtifactError("unsupported v18 implementation profile");
    if (value.modules !== undefined) throw new ArtifactError("v18 KERNEL-indexed-projections0 artifacts do not carry frontend module metadata");
    return decodeStructured(value, { legacyV2: false, allowDefinitions: true, allowLet: true, allowTransparencyKinds: true, allowBinderInfo: true, allowQuot: true, allowEmptyInductives: true, allowProjections: true }, 10, false, "KERNEL-indexed-projections0", 18);
  }
  if (value.formatVersion === 19) {
    if (value.implementationProfile !== "KERNEL-prop-elimination0") throw new ArtifactError("unsupported v19 implementation profile");
    if (value.modules !== undefined) throw new ArtifactError("v19 KERNEL-prop-elimination0 artifacts do not carry frontend module metadata");
    return decodeStructured(value, { legacyV2: false, allowDefinitions: true, allowLet: true, allowTransparencyKinds: true, allowBinderInfo: true, allowQuot: true, allowEmptyInductives: true, allowProjections: true }, 10, false, "KERNEL-prop-elimination0", 19);
  }
  if (value.formatVersion === 20) {
    if (value.implementationProfile !== "KERNEL-recursor-k0") throw new ArtifactError("unsupported v20 implementation profile");
    if (value.modules !== undefined) throw new ArtifactError("v20 KERNEL-recursor-k0 artifacts do not carry frontend module metadata");
    return decodeStructured(value, { legacyV2: false, allowDefinitions: true, allowLet: true, allowTransparencyKinds: true, allowBinderInfo: true, allowQuot: true, allowEmptyInductives: true, allowProjections: true }, 10, false, "KERNEL-recursor-k0", 20);
  }
  if (value.formatVersion === 21) {
    if (value.implementationProfile !== "KERNEL-inductive-universes0") throw new ArtifactError("unsupported v21 implementation profile");
    if (value.modules !== undefined) throw new ArtifactError("v21 KERNEL-inductive-universes0 artifacts do not carry frontend module metadata");
    return decodeStructured(value, { legacyV2: false, allowDefinitions: true, allowLet: true, allowTransparencyKinds: true, allowBinderInfo: true, allowQuot: true, allowEmptyInductives: true, allowProjections: true }, 10, false, "KERNEL-inductive-universes0", 21);
  }
  if (value.formatVersion === 22) {
    if (value.implementationProfile !== "KERNEL-dependent-fields0") throw new ArtifactError("unsupported v22 implementation profile");
    if (value.modules !== undefined) throw new ArtifactError("v22 KERNEL-dependent-fields0 artifacts do not carry frontend module metadata");
    return decodeStructured(value, { legacyV2: false, allowDefinitions: true, allowLet: true, allowTransparencyKinds: true, allowBinderInfo: true, allowQuot: true, allowEmptyInductives: true, allowProjections: true }, 10, false, "KERNEL-dependent-fields0", 22);
  }
  if (value.formatVersion === 23) {
    if (value.implementationProfile !== "KERNEL-telescope-terms0") throw new ArtifactError("unsupported v23 implementation profile");
    if (value.modules !== undefined) throw new ArtifactError("v23 KERNEL-telescope-terms0 artifacts do not carry frontend module metadata");
    return decodeStructured(value, { legacyV2: false, allowDefinitions: true, allowLet: true, allowTransparencyKinds: true, allowBinderInfo: true, allowQuot: true, allowEmptyInductives: true, allowProjections: true }, 10, false, "KERNEL-telescope-terms0", 23);
  }
  if (value.formatVersion === 24) {
    if (value.implementationProfile !== "KERNEL-mutual-inductives0") throw new ArtifactError("unsupported v24 implementation profile");
    if (value.modules !== undefined) throw new ArtifactError("v24 KERNEL-mutual-inductives0 artifacts do not carry frontend module metadata");
    return decodeStructured(value, { legacyV2: false, allowDefinitions: true, allowLet: true, allowTransparencyKinds: true, allowBinderInfo: true, allowQuot: true, allowEmptyInductives: true, allowProjections: true, allowMutualInductives: true }, 10, false, "KERNEL-mutual-inductives0", 24);
  }
  if (value.formatVersion === 25) {
    if (value.implementationProfile !== "KERNEL-mutual-parameters0") throw new ArtifactError("unsupported v25 implementation profile");
    if (value.modules !== undefined) throw new ArtifactError("v25 KERNEL-mutual-parameters0 artifacts do not carry frontend module metadata");
    return decodeStructured(value, { legacyV2: false, allowDefinitions: true, allowLet: true, allowTransparencyKinds: true, allowBinderInfo: true, allowQuot: true, allowEmptyInductives: true, allowProjections: true, allowMutualInductives: true }, 10, false, "KERNEL-mutual-parameters0", 25);
  }
  if (value.formatVersion === 26) {
    if (value.implementationProfile !== "KERNEL-mutual-indices0") throw new ArtifactError("unsupported v26 implementation profile");
    if (value.modules !== undefined) throw new ArtifactError("v26 KERNEL-mutual-indices0 artifacts do not carry frontend module metadata");
    return decodeStructured(value, { legacyV2: false, allowDefinitions: true, allowLet: true, allowTransparencyKinds: true, allowBinderInfo: true, allowQuot: true, allowEmptyInductives: true, allowProjections: true, allowMutualInductives: true }, 10, false, "KERNEL-mutual-indices0", 26);
  }
  if (value.formatVersion === 27) {
    if (value.implementationProfile !== "KERNEL-mutual-higher-order0") throw new ArtifactError("unsupported v27 implementation profile");
    if (value.modules !== undefined) throw new ArtifactError("v27 KERNEL-mutual-higher-order0 artifacts do not carry frontend module metadata");
    return decodeStructured(value, { legacyV2: false, allowDefinitions: true, allowLet: true, allowTransparencyKinds: true, allowBinderInfo: true, allowQuot: true, allowEmptyInductives: true, allowProjections: true, allowMutualInductives: true }, 10, false, "KERNEL-mutual-higher-order0", 27);
  }
  if (value.formatVersion === 28) {
    if (value.implementationProfile !== "KERNEL-mutual-prop0") throw new ArtifactError("unsupported v28 implementation profile");
    if (value.modules !== undefined) throw new ArtifactError("v28 KERNEL-mutual-prop0 artifacts do not carry frontend module metadata");
    return decodeStructured(value, { legacyV2: false, allowDefinitions: true, allowLet: true, allowTransparencyKinds: true, allowBinderInfo: true, allowQuot: true, allowEmptyInductives: true, allowProjections: true, allowMutualInductives: true }, 10, false, "KERNEL-mutual-prop0", 28);
  }
  if (value.formatVersion === 29) {
    if (value.implementationProfile !== "KERNEL-nested-inductives0") throw new ArtifactError("unsupported v29 implementation profile");
    if (value.modules !== undefined) throw new ArtifactError("v29 KERNEL-nested-inductives0 artifacts do not carry frontend module metadata");
    return decodeStructured(value, { legacyV2: false, allowDefinitions: true, allowLet: true, allowTransparencyKinds: true, allowBinderInfo: true, allowQuot: true, allowEmptyInductives: true, allowProjections: true, allowMutualInductives: true }, 10, false, "KERNEL-nested-inductives0", 29);
  }
  if (value.formatVersion === 30) {
    if (value.implementationProfile !== "KERNEL-nested-parameters0") throw new ArtifactError("unsupported v30 implementation profile");
    if (value.modules !== undefined) throw new ArtifactError("v30 KERNEL-nested-parameters0 artifacts do not carry frontend module metadata");
    return decodeStructured(value, { legacyV2: false, allowDefinitions: true, allowLet: true, allowTransparencyKinds: true, allowBinderInfo: true, allowQuot: true, allowEmptyInductives: true, allowProjections: true, allowMutualInductives: true }, 10, false, "KERNEL-nested-parameters0", 30);
  }
  if (value.formatVersion === 31) {
    if (value.implementationProfile !== "KERNEL-nested-indices0") throw new ArtifactError("unsupported v31 implementation profile");
    if (value.modules !== undefined) throw new ArtifactError("v31 KERNEL-nested-indices0 artifacts do not carry frontend module metadata");
    return decodeStructured(value, { legacyV2: false, allowDefinitions: true, allowLet: true, allowTransparencyKinds: true, allowBinderInfo: true, allowQuot: true, allowEmptyInductives: true, allowProjections: true, allowMutualInductives: true }, 10, false, "KERNEL-nested-indices0", 31);
  }
  if (value.formatVersion === 32) {
    if (value.implementationProfile !== "KERNEL-nested-index-expressions0") throw new ArtifactError("unsupported v32 implementation profile");
    if (value.modules !== undefined) throw new ArtifactError("v32 KERNEL-nested-index-expressions0 artifacts do not carry frontend module metadata");
    return decodeStructured(value, { legacyV2: false, allowDefinitions: true, allowLet: true, allowTransparencyKinds: true, allowBinderInfo: true, allowQuot: true, allowEmptyInductives: true, allowProjections: true, allowMutualInductives: true }, 10, false, "KERNEL-nested-index-expressions0", 32);
  }
  if (value.formatVersion === 33) {
    if (value.implementationProfile !== "KERNEL-nested-multiple-specializations0") throw new ArtifactError("unsupported v33 implementation profile");
    if (value.modules !== undefined) throw new ArtifactError("v33 KERNEL-nested-multiple-specializations0 artifacts do not carry frontend module metadata");
    return decodeStructured(value, { legacyV2: false, allowDefinitions: true, allowLet: true, allowTransparencyKinds: true, allowBinderInfo: true, allowQuot: true, allowEmptyInductives: true, allowProjections: true, allowMutualInductives: true }, 10, false, "KERNEL-nested-multiple-specializations0", 33);
  }
  if (value.formatVersion === 34) {
    if (value.implementationProfile !== "KERNEL-nested-polymorphic0") throw new ArtifactError("unsupported v34 implementation profile");
    if (value.modules !== undefined) throw new ArtifactError("v34 KERNEL-nested-polymorphic0 artifacts do not carry frontend module metadata");
    return decodeStructured(value, { legacyV2: false, allowDefinitions: true, allowLet: true, allowTransparencyKinds: true, allowBinderInfo: true, allowQuot: true, allowEmptyInductives: true, allowProjections: true, allowMutualInductives: true }, 10, false, "KERNEL-nested-polymorphic0", 34);
  }
  if (value.formatVersion === 35) {
    if (value.implementationProfile !== "KERNEL-nested-indexed-containers0") throw new ArtifactError("unsupported v35 implementation profile");
    if (value.modules !== undefined) throw new ArtifactError("v35 KERNEL-nested-indexed-containers0 artifacts do not carry frontend module metadata");
    return decodeStructured(value, { legacyV2: false, allowDefinitions: true, allowLet: true, allowTransparencyKinds: true, allowBinderInfo: true, allowQuot: true, allowEmptyInductives: true, allowProjections: true, allowMutualInductives: true }, 10, false, "KERNEL-nested-indexed-containers0", 35);
  }
  if (value.formatVersion === 36) {
    if (value.implementationProfile !== "KERNEL-recursor-minor-order0") throw new ArtifactError("unsupported v36 implementation profile");
    if (value.modules !== undefined) throw new ArtifactError("v36 KERNEL-recursor-minor-order0 artifacts do not carry frontend module metadata");
    return decodeStructured(value, { legacyV2: false, allowDefinitions: true, allowLet: true, allowTransparencyKinds: true, allowBinderInfo: true, allowQuot: true, allowEmptyInductives: true, allowProjections: true, allowMutualInductives: true }, 10, false, "KERNEL-recursor-minor-order0", 36);
  }
  if (value.formatVersion === 37) {
    if (value.implementationProfile !== "KERNEL-nested-deeper0") throw new ArtifactError("unsupported v37 implementation profile");
    if (value.modules !== undefined) throw new ArtifactError("v37 KERNEL-nested-deeper0 artifacts do not carry frontend module metadata");
    return decodeStructured(value, { legacyV2: false, allowDefinitions: true, allowLet: true, allowTransparencyKinds: true, allowBinderInfo: true, allowQuot: true, allowEmptyInductives: true, allowProjections: true, allowMutualInductives: true }, 10, false, "KERNEL-nested-deeper0", 37);
  }
  if (value.formatVersion === 38) {
    if (value.implementationProfile !== "KERNEL-nested-deeper-generalization0") throw new ArtifactError("unsupported v38 implementation profile");
    if (value.modules !== undefined) throw new ArtifactError("v38 KERNEL-nested-deeper-generalization0 artifacts do not carry frontend module metadata");
    return decodeStructured(value, { legacyV2: false, allowDefinitions: true, allowLet: true, allowTransparencyKinds: true, allowBinderInfo: true, allowQuot: true, allowEmptyInductives: true, allowProjections: true, allowMutualInductives: true }, 10, false, "KERNEL-nested-deeper-generalization0", 38);
  }
  if (value.formatVersion === 39) {
    if (value.implementationProfile !== "KERNEL-nested-deeper-parameters0") throw new ArtifactError("unsupported v39 implementation profile");
    if (value.modules !== undefined) throw new ArtifactError("v39 KERNEL-nested-deeper-parameters0 artifacts do not carry frontend module metadata");
    return decodeStructured(value, { legacyV2: false, allowDefinitions: true, allowLet: true, allowTransparencyKinds: true, allowBinderInfo: true, allowQuot: true, allowEmptyInductives: true, allowProjections: true, allowMutualInductives: true }, 10, false, "KERNEL-nested-deeper-parameters0", 39);
  }
  if (value.formatVersion === 40) {
    if (value.implementationProfile !== "KERNEL-nested-deeper-indices0") throw new ArtifactError("unsupported v40 implementation profile");
    if (value.modules !== undefined) throw new ArtifactError("v40 KERNEL-nested-deeper-indices0 artifacts do not carry frontend module metadata");
    return decodeStructured(value, { legacyV2: false, allowDefinitions: true, allowLet: true, allowTransparencyKinds: true, allowBinderInfo: true, allowQuot: true, allowEmptyInductives: true, allowProjections: true, allowMutualInductives: true }, 10, false, "KERNEL-nested-deeper-indices0", 40);
  }
  if (value.formatVersion === 41) {
    if (value.implementationProfile !== "KERNEL-nested-deeper-polymorphic0") throw new ArtifactError("unsupported v41 implementation profile");
    if (value.modules !== undefined) throw new ArtifactError("v41 KERNEL-nested-deeper-polymorphic0 artifacts do not carry frontend module metadata");
    return decodeStructured(value, { legacyV2: false, allowDefinitions: true, allowLet: true, allowTransparencyKinds: true, allowBinderInfo: true, allowQuot: true, allowEmptyInductives: true, allowProjections: true, allowMutualInductives: true }, 10, false, "KERNEL-nested-deeper-polymorphic0", 41);
  }
  if (value.formatVersion === 42) {
    if (value.implementationProfile !== "KERNEL-nested-deeper-multiple-fields0") throw new ArtifactError("unsupported v42 implementation profile");
    if (value.modules !== undefined) throw new ArtifactError("v42 KERNEL-nested-deeper-multiple-fields0 artifacts do not carry frontend module metadata");
    return decodeStructured(value, { legacyV2: false, allowDefinitions: true, allowLet: true, allowTransparencyKinds: true, allowBinderInfo: true, allowQuot: true, allowEmptyInductives: true, allowProjections: true, allowMutualInductives: true }, 10, false, "KERNEL-nested-deeper-multiple-fields0", 42);
  }
  if (value.formatVersion === 43) {
    if (value.implementationProfile !== "KERNEL-nested-deeper-prop0") throw new ArtifactError("unsupported v43 implementation profile");
    if (value.modules !== undefined) throw new ArtifactError("v43 KERNEL-nested-deeper-prop0 artifacts do not carry frontend module metadata");
    return decodeStructured(value, { legacyV2: false, allowDefinitions: true, allowLet: true, allowTransparencyKinds: true, allowBinderInfo: true, allowQuot: true, allowEmptyInductives: true, allowProjections: true, allowMutualInductives: true }, 10, false, "KERNEL-nested-deeper-prop0", 43);
  }
  if (value.formatVersion === 44) {
    if (value.implementationProfile !== "KERNEL-nested-deeper-multi-parameter0") throw new ArtifactError("unsupported v44 implementation profile");
    if (value.modules !== undefined) throw new ArtifactError("v44 KERNEL-nested-deeper-multi-parameter0 artifacts do not carry frontend module metadata");
    return decodeStructured(value, { legacyV2: false, allowDefinitions: true, allowLet: true, allowTransparencyKinds: true, allowBinderInfo: true, allowQuot: true, allowEmptyInductives: true, allowProjections: true, allowMutualInductives: true }, 10, false, "KERNEL-nested-deeper-multi-parameter0", 44);
  }
  if (value.formatVersion === 45) {
    if (value.implementationProfile !== "KERNEL-nested-deeper-multi-parameter-generalization0") throw new ArtifactError("unsupported v45 implementation profile");
    if (value.modules !== undefined) throw new ArtifactError("v45 KERNEL-nested-deeper-multi-parameter-generalization0 artifacts do not carry frontend module metadata");
    return decodeStructured(value, { legacyV2: false, allowDefinitions: true, allowLet: true, allowTransparencyKinds: true, allowBinderInfo: true, allowQuot: true, allowEmptyInductives: true, allowProjections: true, allowMutualInductives: true }, 10, false, "KERNEL-nested-deeper-multi-parameter-generalization0", 45);
  }
  if (value.formatVersion === 46) {
    if (value.implementationProfile !== "KERNEL-nested-deeper-dependent-container-parameters0") throw new ArtifactError("unsupported v46 implementation profile");
    if (value.modules !== undefined) throw new ArtifactError("v46 KERNEL-nested-deeper-dependent-container-parameters0 artifacts do not carry frontend module metadata");
    return decodeStructured(value, { legacyV2: false, allowDefinitions: true, allowLet: true, allowTransparencyKinds: true, allowBinderInfo: true, allowQuot: true, allowEmptyInductives: true, allowProjections: true, allowMutualInductives: true }, 10, false, "KERNEL-nested-deeper-dependent-container-parameters0", 46);
  }
  if (value.formatVersion === 47) {
    if (value.implementationProfile !== "KERNEL-uniform-parameter-defeq0") throw new ArtifactError("unsupported v47 implementation profile");
    if (value.modules !== undefined) throw new ArtifactError("v47 KERNEL-uniform-parameter-defeq0 artifacts do not carry frontend module metadata");
    return decodeStructured(value, { legacyV2: false, allowDefinitions: true, allowLet: true, allowTransparencyKinds: true, allowBinderInfo: true, allowQuot: true, allowEmptyInductives: true, allowProjections: true, allowMutualInductives: true }, 10, false, "KERNEL-uniform-parameter-defeq0", 47);
  }
  if (value.formatVersion === 48) {
    if (value.implementationProfile !== "KERNEL-recursor-family-binder-info0") throw new ArtifactError("unsupported v48 implementation profile");
    if (value.modules !== undefined) throw new ArtifactError("v48 KERNEL-recursor-family-binder-info0 artifacts do not carry frontend module metadata");
    return decodeStructured(value, { legacyV2: false, allowDefinitions: true, allowLet: true, allowTransparencyKinds: true, allowBinderInfo: true, allowQuot: true, allowEmptyInductives: true, allowProjections: true, allowMutualInductives: true }, 10, false, "KERNEL-recursor-family-binder-info0", 48);
  }
  if (value.formatVersion === 49) {
    if (value.implementationProfile !== "KERNEL-dependent-indexed-recursor-completion0") throw new ArtifactError("unsupported v49 implementation profile");
    if (value.modules !== undefined) throw new ArtifactError("v49 KERNEL-dependent-indexed-recursor-completion0 artifacts do not carry frontend module metadata");
    return decodeStructured(value, { legacyV2: false, allowDefinitions: true, allowLet: true, allowTransparencyKinds: true, allowBinderInfo: true, allowQuot: true, allowEmptyInductives: true, allowProjections: true, allowMutualInductives: true }, 10, false, "KERNEL-dependent-indexed-recursor-completion0", 49);
  }
  if (value.formatVersion === 50) {
    if (value.implementationProfile !== "KERNEL-mutual-nested-generalization0") throw new ArtifactError("unsupported v50 implementation profile");
    if (value.modules !== undefined) throw new ArtifactError("v50 KERNEL-mutual-nested-generalization0 artifacts do not carry frontend module metadata");
    return decodeStructured(value, { legacyV2: false, allowDefinitions: true, allowLet: true, allowTransparencyKinds: true, allowBinderInfo: true, allowQuot: true, allowEmptyInductives: true, allowProjections: true, allowMutualInductives: true }, 10, false, "KERNEL-mutual-nested-generalization0", 50);
  }
  if (value.formatVersion === 51) {
    if (value.implementationProfile !== "KERNEL-mutual-nested-parameters0") throw new ArtifactError("unsupported v51 implementation profile");
    if (value.modules !== undefined) throw new ArtifactError("v51 KERNEL-mutual-nested-parameters0 artifacts do not carry frontend module metadata");
    return decodeStructured(value, { legacyV2: false, allowDefinitions: true, allowLet: true, allowTransparencyKinds: true, allowBinderInfo: true, allowQuot: true, allowEmptyInductives: true, allowProjections: true, allowMutualInductives: true }, 10, false, "KERNEL-mutual-nested-parameters0", 51);
  }
  if (value.formatVersion === 52) {
    if (value.implementationProfile !== "KERNEL-mutual-nested-indices0") throw new ArtifactError("unsupported v52 implementation profile");
    if (value.modules !== undefined) throw new ArtifactError("v52 KERNEL-mutual-nested-indices0 artifacts do not carry frontend module metadata");
    return decodeStructured(value, { legacyV2: false, allowDefinitions: true, allowLet: true, allowTransparencyKinds: true, allowBinderInfo: true, allowQuot: true, allowEmptyInductives: true, allowProjections: true, allowMutualInductives: true }, 10, false, "KERNEL-mutual-nested-indices0", 52);
  }
  if (value.formatVersion === 53) {
    if (value.implementationProfile !== "KERNEL-mutual-nested-polymorphic0") throw new ArtifactError("unsupported v53 implementation profile");
    if (value.modules !== undefined) throw new ArtifactError("v53 KERNEL-mutual-nested-polymorphic0 artifacts do not carry frontend module metadata");
    return decodeStructured(value, { legacyV2: false, allowDefinitions: true, allowLet: true, allowTransparencyKinds: true, allowBinderInfo: true, allowQuot: true, allowEmptyInductives: true, allowProjections: true, allowMutualInductives: true }, 10, false, "KERNEL-mutual-nested-polymorphic0", 53);
  }
  if (value.formatVersion === 55) {
    if (value.implementationProfile !== "KERNEL-mutual-nested-indexed-containers0") throw new ArtifactError("unsupported v55 implementation profile");
    if (value.modules !== undefined) throw new ArtifactError("v55 KERNEL-mutual-nested-indexed-containers0 artifacts do not carry frontend module metadata");
    return decodeStructured(value, { legacyV2: false, allowDefinitions: true, allowLet: true, allowTransparencyKinds: true, allowBinderInfo: true, allowQuot: true, allowEmptyInductives: true, allowProjections: true, allowMutualInductives: true }, 10, false, "KERNEL-mutual-nested-indexed-containers0", 55);
  }
  if (value.formatVersion === 56) {
    if (value.implementationProfile !== "KERNEL-mutual-nested-deeper0") throw new ArtifactError("unsupported v56 implementation profile");
    if (value.modules !== undefined) throw new ArtifactError("v56 KERNEL-mutual-nested-deeper0 artifacts do not carry frontend module metadata");
    return decodeStructured(value, { legacyV2: false, allowDefinitions: true, allowLet: true, allowTransparencyKinds: true, allowBinderInfo: true, allowQuot: true, allowEmptyInductives: true, allowProjections: true, allowMutualInductives: true }, 10, false, "KERNEL-mutual-nested-deeper0", 56);
  }
  if (value.formatVersion === 57) {
    if (value.implementationProfile !== "KERNEL-mutual-nested-deeper-parameters0") throw new ArtifactError("unsupported v57 implementation profile");
    if (value.modules !== undefined) throw new ArtifactError("v57 KERNEL-mutual-nested-deeper-parameters0 artifacts do not carry frontend module metadata");
    return decodeStructured(value, { legacyV2: false, allowDefinitions: true, allowLet: true, allowTransparencyKinds: true, allowBinderInfo: true, allowQuot: true, allowEmptyInductives: true, allowProjections: true, allowMutualInductives: true }, 10, false, "KERNEL-mutual-nested-deeper-parameters0", 57);
  }
  if (value.formatVersion === 58) {
    if (value.implementationProfile !== "KERNEL-mutual-nested-deeper-indices0") throw new ArtifactError("unsupported v58 implementation profile");
    if (value.modules !== undefined) throw new ArtifactError("v58 KERNEL-mutual-nested-deeper-indices0 artifacts do not carry frontend module metadata");
    return decodeStructured(value, { legacyV2: false, allowDefinitions: true, allowLet: true, allowTransparencyKinds: true, allowBinderInfo: true, allowQuot: true, allowEmptyInductives: true, allowProjections: true, allowMutualInductives: true }, 10, false, "KERNEL-mutual-nested-deeper-indices0", 58);
  }
  if (value.formatVersion === 62) {
    if (value.implementationProfile !== "KERNEL-mutual-nested-deeper-multi-parameter-containers0") throw new ArtifactError("unsupported v62 implementation profile");
    if (value.modules !== undefined) throw new ArtifactError("v62 KERNEL-mutual-nested-deeper-multi-parameter-containers0 artifacts do not carry frontend module metadata");
    return decodeStructured(value, { legacyV2: false, allowDefinitions: true, allowLet: true, allowTransparencyKinds: true, allowBinderInfo: true, allowQuot: true, allowEmptyInductives: true, allowProjections: true, allowMutualInductives: true }, 10, false, "KERNEL-mutual-nested-deeper-multi-parameter-containers0", 62);
  }
  if (value.formatVersion === 66) {
    if (value.implementationProfile !== "KERNEL-mutual-nested-final-generalization-audit0") throw new ArtifactError("unsupported v66 implementation profile");
    if (value.modules !== undefined) throw new ArtifactError("v66 KERNEL-mutual-nested-final-generalization-audit0 artifacts do not carry frontend module metadata");
    return decodeStructured(value, { legacyV2: false, allowDefinitions: true, allowLet: true, allowTransparencyKinds: true, allowBinderInfo: true, allowQuot: true, allowEmptyInductives: true, allowProjections: true, allowMutualInductives: true }, 10, false, "KERNEL-mutual-nested-final-generalization-audit0", 66);
  }
  if (value.formatVersion === 67) {
    if (value.implementationProfile !== "KERNEL-conversion-final-audit0") throw new ArtifactError("unsupported v67 implementation profile");
    if (value.modules !== undefined) throw new ArtifactError("v67 KERNEL-conversion-final-audit0 artifacts do not carry frontend module metadata");
    return decodeStructured(value, { legacyV2: false, allowDefinitions: true, allowLet: true, allowTransparencyKinds: true, allowBinderInfo: true, allowQuot: true, allowEmptyInductives: true, allowProjections: true, allowMutualInductives: true }, 10, false, "KERNEL-conversion-final-audit0", 67);
  }
  if (value.formatVersion === 68) {
    if (value.implementationProfile !== "KERNEL-resource-bounds0") throw new ArtifactError("unsupported v68 implementation profile");
    if (value.modules !== undefined) throw new ArtifactError("v68 KERNEL-resource-bounds0 artifacts do not carry frontend module metadata");
    return decodeStructured(value, { legacyV2: false, allowDefinitions: true, allowLet: true, allowTransparencyKinds: true, allowBinderInfo: true, allowQuot: true, allowEmptyInductives: true, allowProjections: true, allowMutualInductives: true, maxDecodeDepth: 1024 }, 10, false, "KERNEL-resource-bounds0", 68);
  }
  if (value.formatVersion === 69) {
    if (value.implementationProfile !== "KERNEL-universe-conformance1") throw new ArtifactError("unsupported v69 implementation profile");
    if (value.modules !== undefined) throw new ArtifactError("v69 KERNEL-universe-conformance1 artifacts do not carry frontend module metadata");
    return decodeStructured(value, { legacyV2: false, allowDefinitions: true, allowLet: true, allowTransparencyKinds: true, allowBinderInfo: true, allowQuot: true, allowEmptyInductives: true, allowProjections: true, allowMutualInductives: true, maxDecodeDepth: 1024 }, 10, false, "KERNEL-universe-conformance1", 69);
  }
  if (value.formatVersion === 70) {
    if (value.implementationProfile !== "KERNEL-projection-conformance1") throw new ArtifactError("unsupported v70 implementation profile");
    if (value.modules !== undefined) throw new ArtifactError("v70 KERNEL-projection-conformance1 artifacts do not carry frontend module metadata");
    return decodeStructured(value, { legacyV2: false, allowDefinitions: true, allowLet: true, allowTransparencyKinds: true, allowBinderInfo: true, allowQuot: true, allowEmptyInductives: true, allowProjections: true, allowMutualInductives: true, maxDecodeDepth: 1024 }, 10, false, "KERNEL-projection-conformance1", 70);
  }
  if (value.formatVersion === 71) {
    if (value.implementationProfile !== "KERNEL-level-instantiation-conformance1") throw new ArtifactError("unsupported v71 implementation profile");
    if (value.modules !== undefined) throw new ArtifactError("v71 KERNEL-level-instantiation-conformance1 artifacts do not carry frontend module metadata");
    return decodeStructured(value, { legacyV2: false, allowDefinitions: true, allowLet: true, allowTransparencyKinds: true, allowBinderInfo: true, allowQuot: true, allowEmptyInductives: true, allowProjections: true, allowMutualInductives: true, maxDecodeDepth: 1024 }, 10, false, "KERNEL-level-instantiation-conformance1", 71);
  }
  if (value.formatVersion === 65) {
    if (value.implementationProfile !== "KERNEL-mutual-nested-deeper-multiple-recursive-parameter-slots0") throw new ArtifactError("unsupported v65 implementation profile");
    if (value.modules !== undefined) throw new ArtifactError("v65 KERNEL-mutual-nested-deeper-multiple-recursive-parameter-slots0 artifacts do not carry frontend module metadata");
    return decodeStructured(value, { legacyV2: false, allowDefinitions: true, allowLet: true, allowTransparencyKinds: true, allowBinderInfo: true, allowQuot: true, allowEmptyInductives: true, allowProjections: true, allowMutualInductives: true }, 10, false, "KERNEL-mutual-nested-deeper-multiple-recursive-parameter-slots0", 65);
  }
  if (value.formatVersion === 64) {
    if (value.implementationProfile !== "KERNEL-mutual-nested-deeper-multiple-fields0") throw new ArtifactError("unsupported v64 implementation profile");
    if (value.modules !== undefined) throw new ArtifactError("v64 KERNEL-mutual-nested-deeper-multiple-fields0 artifacts do not carry frontend module metadata");
    return decodeStructured(value, { legacyV2: false, allowDefinitions: true, allowLet: true, allowTransparencyKinds: true, allowBinderInfo: true, allowQuot: true, allowEmptyInductives: true, allowProjections: true, allowMutualInductives: true }, 10, false, "KERNEL-mutual-nested-deeper-multiple-fields0", 64);
  }
  if (value.formatVersion === 63) {
    if (value.implementationProfile !== "KERNEL-mutual-nested-deeper-dependent-container-parameters0") throw new ArtifactError("unsupported v63 implementation profile");
    if (value.modules !== undefined) throw new ArtifactError("v63 KERNEL-mutual-nested-deeper-dependent-container-parameters0 artifacts do not carry frontend module metadata");
    return decodeStructured(value, { legacyV2: false, allowDefinitions: true, allowLet: true, allowTransparencyKinds: true, allowBinderInfo: true, allowQuot: true, allowEmptyInductives: true, allowProjections: true, allowMutualInductives: true }, 10, false, "KERNEL-mutual-nested-deeper-dependent-container-parameters0", 63);
  }
  if (value.formatVersion === 61) {
    if (value.implementationProfile !== "KERNEL-mutual-nested-deeper-indexed-containers0") throw new ArtifactError("unsupported v61 implementation profile");
    if (value.modules !== undefined) throw new ArtifactError("v61 KERNEL-mutual-nested-deeper-indexed-containers0 artifacts do not carry frontend module metadata");
    return decodeStructured(value, { legacyV2: false, allowDefinitions: true, allowLet: true, allowTransparencyKinds: true, allowBinderInfo: true, allowQuot: true, allowEmptyInductives: true, allowProjections: true, allowMutualInductives: true }, 10, false, "KERNEL-mutual-nested-deeper-indexed-containers0", 61);
  }
  if (value.formatVersion === 60) {
    if (value.implementationProfile !== "KERNEL-mutual-nested-deeper-prop0") throw new ArtifactError("unsupported v60 implementation profile");
    if (value.modules !== undefined) throw new ArtifactError("v60 KERNEL-mutual-nested-deeper-prop0 artifacts do not carry frontend module metadata");
    return decodeStructured(value, { legacyV2: false, allowDefinitions: true, allowLet: true, allowTransparencyKinds: true, allowBinderInfo: true, allowQuot: true, allowEmptyInductives: true, allowProjections: true, allowMutualInductives: true }, 10, false, "KERNEL-mutual-nested-deeper-prop0", 60);
  }
  if (value.formatVersion === 59) {
    if (value.implementationProfile !== "KERNEL-mutual-nested-deeper-polymorphic0") throw new ArtifactError("unsupported v59 implementation profile");
    if (value.modules !== undefined) throw new ArtifactError("v59 KERNEL-mutual-nested-deeper-polymorphic0 artifacts do not carry frontend module metadata");
    return decodeStructured(value, { legacyV2: false, allowDefinitions: true, allowLet: true, allowTransparencyKinds: true, allowBinderInfo: true, allowQuot: true, allowEmptyInductives: true, allowProjections: true, allowMutualInductives: true }, 10, false, "KERNEL-mutual-nested-deeper-polymorphic0", 59);
  }
  if (value.formatVersion === 54) {
    if (value.implementationProfile !== "KERNEL-mutual-nested-prop0") throw new ArtifactError("unsupported v54 implementation profile");
    if (value.modules !== undefined) throw new ArtifactError("v54 KERNEL-mutual-nested-prop0 artifacts do not carry frontend module metadata");
    return decodeStructured(value, { legacyV2: false, allowDefinitions: true, allowLet: true, allowTransparencyKinds: true, allowBinderInfo: true, allowQuot: true, allowEmptyInductives: true, allowProjections: true, allowMutualInductives: true }, 10, false, "KERNEL-mutual-nested-prop0", 54);
  }
  throw new ArtifactError("unsupported artifact version/profile");
}

type ModuleArtifactImplementationProfile="K3b-module-interfaces0"|"K3c-names0"|"K3c-sections-open0"|"K3c-section-vars0";
type ArtifactImplementationProfile=ModuleArtifactImplementationProfile|"KERNEL-quotients0"|"KERNEL-empty-inductives0"|"KERNEL-structure-eta0"|"KERNEL-inductive-positivity0"|"KERNEL-indexed-recursors0"|"KERNEL-indexed-projections0"|"KERNEL-prop-elimination0"|"KERNEL-recursor-k0"|"KERNEL-inductive-universes0"|"KERNEL-dependent-fields0"|"KERNEL-telescope-terms0"|"KERNEL-mutual-inductives0"|"KERNEL-mutual-parameters0"|"KERNEL-mutual-indices0"|"KERNEL-mutual-higher-order0"|"KERNEL-mutual-prop0"|"KERNEL-nested-inductives0"|"KERNEL-nested-parameters0"|"KERNEL-nested-indices0"|"KERNEL-nested-index-expressions0"|"KERNEL-nested-multiple-specializations0"|"KERNEL-nested-polymorphic0"|"KERNEL-nested-indexed-containers0"|"KERNEL-recursor-minor-order0"|"KERNEL-nested-deeper0"|"KERNEL-nested-deeper-generalization0"|"KERNEL-nested-deeper-parameters0"|"KERNEL-nested-deeper-indices0"|"KERNEL-nested-deeper-polymorphic0"|"KERNEL-nested-deeper-multiple-fields0"|"KERNEL-nested-deeper-prop0"|"KERNEL-nested-deeper-multi-parameter0"|"KERNEL-nested-deeper-multi-parameter-generalization0"|"KERNEL-nested-deeper-dependent-container-parameters0"|"KERNEL-uniform-parameter-defeq0"|"KERNEL-recursor-family-binder-info0"|"KERNEL-dependent-indexed-recursor-completion0"|"KERNEL-mutual-nested-generalization0"|"KERNEL-mutual-nested-parameters0"|"KERNEL-mutual-nested-indices0"|"KERNEL-mutual-nested-polymorphic0"|"KERNEL-mutual-nested-prop0"|"KERNEL-mutual-nested-indexed-containers0"|"KERNEL-mutual-nested-deeper0"|"KERNEL-mutual-nested-deeper-parameters0"|"KERNEL-mutual-nested-deeper-indices0"|"KERNEL-mutual-nested-deeper-polymorphic0"|"KERNEL-mutual-nested-deeper-prop0"|"KERNEL-mutual-nested-deeper-indexed-containers0"|"KERNEL-mutual-nested-deeper-multi-parameter-containers0"|"KERNEL-mutual-nested-deeper-dependent-container-parameters0"|"KERNEL-mutual-nested-deeper-multiple-fields0"|"KERNEL-mutual-nested-deeper-multiple-recursive-parameter-slots0"|"KERNEL-mutual-nested-final-generalization-audit0"|"KERNEL-conversion-final-audit0"|"KERNEL-resource-bounds0"|"KERNEL-universe-conformance1"|"KERNEL-projection-conformance1"|"KERNEL-level-instantiation-conformance1";
function current(declarations: CoreDeclaration[], typeclasses: TypeclassEnvironmentMetadata = emptyTypeclassEnvironment(), modules?:CoreModulesMetadata, implementationProfile:ArtifactImplementationProfile="K3c-section-vars0", formatVersion:12|13|14|15|16|17|18|19|20|21|22|23|24|25|26|27|28|29|30|31|32|33|34|35|36|37|38|39|40|41|42|43|44|45|46|47|48|49|50|51|52|53|54|55|56|57|58|59|60|61|62|63|64|65|66|67|68|69|70|71=12): CoreArtifact {
  return {
    format: "proofscript-core",
    formatVersion,
    proofscriptReference: "v0.1",
    leanSemanticBaseline: "4.33.1",
    implementationProfile,
    declarations,
    typeclasses,
    ...(modules?{modules}:{}),
  };
}

function decodeV1(value: Record<string, unknown>): CoreArtifact {
  if (value.implementationProfile !== "K0-bootstrap") throw new ArtifactError("unsupported v1 implementation profile");
  if (!Array.isArray(value.declarations)) throw new ArtifactError("declarations must be an array");
  if (value.declarations.length > MAX_DECLS) throw new ArtifactResourceError("too many declarations","declarations");
  let budget = MAX_TERM_NODES;
  const tick = () => { if (--budget < 0) throw new ArtifactResourceError("term-node resource limit exceeded","term_nodes"); };
  return current(value.declarations.map((d, i) => decodeDeclV1(d, `declarations[${i}]`, tick)));
}

interface StructuredOptions {
  legacyV2: boolean;
  allowDefinitions: boolean;
  allowLet: boolean;
  allowTransparencyKinds: boolean;
  allowBinderInfo: boolean;
  allowQuot?: boolean;
  allowEmptyInductives?: boolean;
  allowProjections?: boolean;
  allowMutualInductives?: boolean;
  maxDecodeDepth?: number;
}

function decodeStructured(value: Record<string, unknown>, options: StructuredOptions, typeclassVersion: 0|9|10 = 0, moduleMetadata:false|"v11"|"v12"=false, implementationProfile:ArtifactImplementationProfile="K3c-section-vars0", formatVersion:12|13|14|15|16|17|18|19|20|21|22|23|24|25|26|27|28|29|30|31|32|33|34|35|36|37|38|39|40|41|42|43|44|45|46|47|48|49|50|51|52|53|54|55|56|57|58|59|60|61|62|63|64|65|66|67|68|69|70|71=12): CoreArtifact {
  if (!Array.isArray(value.declarations)) throw new ArtifactError("declarations must be an array");
  if (value.declarations.length > MAX_DECLS) throw new ArtifactResourceError("too many declarations","declarations");
  let termBudget = MAX_TERM_NODES;
  let levelBudget = MAX_LEVEL_NODES;
  const tickT = () => { if (--termBudget < 0) throw new ArtifactResourceError("term-node resource limit exceeded","term_nodes"); };
  const tickL = () => { if (--levelBudget < 0) throw new ArtifactResourceError("level-node resource limit exceeded","level_nodes"); };
  const declarations=value.declarations.map((d, i) => decodeDecl(d, `declarations[${i}]`, tickT, tickL, options));
  const typeclasses=typeclassVersion?decodeTypeclassMetadata(value.typeclasses, tickT, tickL, options, typeclassVersion):emptyTypeclassEnvironment();
  let modules:CoreModulesMetadata|undefined;
  if(moduleMetadata&&value.modules!==undefined){
    if(moduleMetadata==="v11") modules=decodeLegacyModuleMetadata(value.modules,declarations,typeclasses);
    else {
      if(implementationProfile==="KERNEL-quotients0" || implementationProfile==="KERNEL-empty-inductives0" || implementationProfile==="KERNEL-structure-eta0" || implementationProfile==="KERNEL-inductive-positivity0" || implementationProfile==="KERNEL-indexed-recursors0" || implementationProfile==="KERNEL-indexed-projections0" || implementationProfile==="KERNEL-prop-elimination0" || implementationProfile==="KERNEL-recursor-k0" || implementationProfile==="KERNEL-inductive-universes0" || implementationProfile==="KERNEL-dependent-fields0" || implementationProfile==="KERNEL-telescope-terms0" || implementationProfile==="KERNEL-mutual-inductives0" || implementationProfile==="KERNEL-mutual-parameters0" || implementationProfile==="KERNEL-mutual-indices0" || implementationProfile==="KERNEL-mutual-higher-order0" || implementationProfile==="KERNEL-mutual-prop0" || implementationProfile==="KERNEL-nested-inductives0" || implementationProfile==="KERNEL-nested-parameters0" || implementationProfile==="KERNEL-nested-indices0" || implementationProfile==="KERNEL-nested-index-expressions0" || implementationProfile==="KERNEL-nested-multiple-specializations0" || implementationProfile==="KERNEL-nested-polymorphic0" || implementationProfile==="KERNEL-nested-indexed-containers0" || implementationProfile==="KERNEL-recursor-minor-order0" || implementationProfile==="KERNEL-nested-deeper0" || implementationProfile==="KERNEL-nested-deeper-generalization0" || implementationProfile==="KERNEL-nested-deeper-parameters0" || implementationProfile==="KERNEL-nested-deeper-indices0" || implementationProfile==="KERNEL-nested-deeper-polymorphic0" || implementationProfile==="KERNEL-nested-deeper-multiple-fields0" || implementationProfile==="KERNEL-nested-deeper-prop0" || implementationProfile==="KERNEL-nested-deeper-multi-parameter0" || implementationProfile==="KERNEL-nested-deeper-multi-parameter-generalization0" || implementationProfile==="KERNEL-nested-deeper-dependent-container-parameters0" || implementationProfile==="KERNEL-uniform-parameter-defeq0" || implementationProfile==="KERNEL-recursor-family-binder-info0" || implementationProfile==="KERNEL-dependent-indexed-recursor-completion0" || implementationProfile==="KERNEL-mutual-nested-generalization0" || implementationProfile==="KERNEL-mutual-nested-parameters0" || implementationProfile==="KERNEL-mutual-nested-indices0" || implementationProfile==="KERNEL-mutual-nested-polymorphic0" || implementationProfile==="KERNEL-mutual-nested-prop0" || implementationProfile==="KERNEL-mutual-nested-indexed-containers0" || implementationProfile==="KERNEL-mutual-nested-deeper0" || implementationProfile==="KERNEL-mutual-nested-deeper-parameters0" || implementationProfile==="KERNEL-mutual-nested-deeper-indices0" || implementationProfile==="KERNEL-mutual-nested-deeper-polymorphic0" || implementationProfile==="KERNEL-mutual-nested-deeper-prop0" || implementationProfile==="KERNEL-mutual-nested-deeper-indexed-containers0" || implementationProfile==="KERNEL-mutual-nested-deeper-multi-parameter-containers0" || implementationProfile==="KERNEL-mutual-nested-deeper-dependent-container-parameters0" || implementationProfile==="KERNEL-mutual-nested-deeper-multiple-fields0" || implementationProfile==="KERNEL-mutual-nested-deeper-multiple-recursive-parameter-slots0" || implementationProfile==="KERNEL-mutual-nested-final-generalization-audit0" || implementationProfile==="KERNEL-conversion-final-audit0" || implementationProfile==="KERNEL-resource-bounds0" || implementationProfile==="KERNEL-universe-conformance1" || implementationProfile==="KERNEL-projection-conformance1" || implementationProfile==="KERNEL-level-instantiation-conformance1") throw new ArtifactError("kernel-only artifact profile cannot carry frontend module metadata");
      modules=decodeModuleMetadataV12(value.modules,declarations,typeclasses,implementationProfile);
    }
  }
  return current(declarations,typeclasses,modules,implementationProfile,formatVersion);
}

function decodeDeclV1(value: unknown, path: string, tick: () => void): CoreDeclaration {
  if (!isObject(value)) throw new ArtifactError(`${path} must be an object`);
  if (value.kind !== "axiom" && value.kind !== "theorem") throw new ArtifactError(`${path}.kind invalid`);
  if (typeof value.name !== "string") throw new ArtifactError(`${path}.name must be a string`);
  const type = decodeTermV1(value.type, `${path}.type`, tick, 0);
  if (value.kind === "axiom") return { kind: "axiom", name: value.name, levelParams: [], type };
  return { kind: "theorem", name: value.name, levelParams: [], type, value: decodeTermV1(value.value, `${path}.value`, tick, 0) };
}

function decodeTermV1(value: unknown, path: string, tick: () => void, depth: number): Term {
  tick();
  if (depth > 4096) throw new ArtifactResourceError("term nesting depth exceeded","term_depth");
  if (!isObject(value) || typeof value.tag !== "string") throw new ArtifactError(`${path} must be a term object`);
  switch (value.tag) {
    case "sort":
      if (!Number.isSafeInteger(value.level) || (value.level as number) < 0) throw new ArtifactError(`${path}.level invalid`);
      return { tag: "sort", level: levelOfNat(value.level as number) };
    case "bvar":
      if (!Number.isSafeInteger(value.index) || (value.index as number) < 0) throw new ArtifactError(`${path}.index invalid`);
      return { tag: "bvar", index: value.index as number };
    case "const":
      if (typeof value.name !== "string") throw new ArtifactError(`${path}.name invalid`);
      return { tag: "const", name: value.name, levels: [] };
    case "app":
      return { tag: "app", fn: decodeTermV1(value.fn, `${path}.fn`, tick, depth + 1), arg: decodeTermV1(value.arg, `${path}.arg`, tick, depth + 1) };
    case "lam":
      return { tag: "lam", domain: decodeTermV1(value.domain, `${path}.domain`, tick, depth + 1), body: decodeTermV1(value.body, `${path}.body`, tick, depth + 1) };
    case "pi":
      return { tag: "pi", domain: decodeTermV1(value.domain, `${path}.domain`, tick, depth + 1), body: decodeTermV1(value.body, `${path}.body`, tick, depth + 1) };
    default:
      throw new ArtifactError(`${path}.tag unsupported`);
  }
}

function decodeDecl(
  value: unknown,
  path: string,
  tickT: () => void,
  tickL: () => void,
  options: StructuredOptions,
): CoreDeclaration {
  if (!isObject(value)) throw new ArtifactError(`${path} must be an object`);
  const kinds = options.allowDefinitions ? ["axiom", "theorem", "definition", "inductive", ...(options.allowTransparencyKinds ? ["opaque", "example"] : []), ...(options.allowQuot ? ["quot"] : []), ...(options.allowMutualInductives ? ["mutualInductive"] : [])] : ["axiom", "theorem", "inductive"];
  if (!kinds.includes(String(value.kind))) throw new ArtifactError(`${path}.kind invalid`);
  if (typeof value.name !== "string") throw new ArtifactError(`${path}.name must be a string`);
  if (!Array.isArray(value.levelParams) || !value.levelParams.every(x => typeof x === "string")) throw new ArtifactError(`${path}.levelParams invalid`);

  const levelParams = [...(value.levelParams as string[])];
  if (value.kind === "quot") {
    if (!options.allowQuot) throw new ArtifactError(`${path}.kind unavailable in this artifact profile`);
    if (value.name !== "Quot" || levelParams.length !== 0) throw new ArtifactError(`${path}: malformed quotient kernel declaration`);
    return {kind:"quot",name:"Quot",levelParams:[]};
  }
  if (value.kind === "mutualInductive") {
    if (!options.allowMutualInductives) throw new ArtifactError(`${path}.kind unavailable in this artifact profile`);
    if (!Array.isArray(value.inductives) || value.inductives.length < 2 || value.inductives.length > 256) throw new ArtifactError(`${path}.inductives invalid`);
    const inductives=value.inductives.map((raw,mi)=>{
      if(!isObject(raw)||typeof raw.name!=="string")throw new ArtifactError(`${path}.inductives[${mi}] invalid`);
      if(!Number.isSafeInteger(raw.numParams)||(raw.numParams as number)<0||!Number.isSafeInteger(raw.numIndices)||(raw.numIndices as number)<0)throw new ArtifactError(`${path}.inductives[${mi}] invalid parameter/index counts`);
      if(!Array.isArray(raw.constructors)||raw.constructors.length>10_000)throw new ArtifactError(`${path}.inductives[${mi}].constructors invalid`);
      const memberType=decodeTerm(raw.type,`${path}.inductives[${mi}].type`,tickT,tickL,0,options.allowLet,options.allowBinderInfo,options.allowProjections??false,options.maxDecodeDepth??4096);
      const constructors=raw.constructors.map((c,ci)=>{
        if(!isObject(c)||typeof c.name!=="string")throw new ArtifactError(`${path}.inductives[${mi}].constructors[${ci}] invalid`);
        return{name:c.name,type:decodeTerm(c.type,`${path}.inductives[${mi}].constructors[${ci}].type`,tickT,tickL,0,options.allowLet,options.allowBinderInfo,options.allowProjections??false,options.maxDecodeDepth??4096)};
      });
      return{name:raw.name,type:memberType,numParams:raw.numParams as number,numIndices:raw.numIndices as number,constructors};
    });
    return{kind:"mutualInductive",name:value.name,levelParams,inductives};
  }
  const type = decodeTerm(value.type, `${path}.type`, tickT, tickL, 0, options.allowLet, options.allowBinderInfo, options.allowProjections ?? false, options.maxDecodeDepth ?? 4096);
  if (value.kind === "axiom") return { kind: "axiom", name: value.name, levelParams, type };
  if (value.kind === "theorem") {
    return { kind: "theorem", name: value.name, levelParams, type, value: decodeTerm(value.value, `${path}.value`, tickT, tickL, 0, options.allowLet, options.allowBinderInfo, options.allowProjections ?? false, options.maxDecodeDepth ?? 4096) };
  }
  if (value.kind === "opaque" || value.kind === "example") {
    if (!options.allowTransparencyKinds) throw new ArtifactError(`${path}.kind unavailable in this artifact profile`);
    return { kind: value.kind, name: value.name, levelParams, type, value: decodeTerm(value.value, `${path}.value`, tickT, tickL, 0, options.allowLet, options.allowBinderInfo, options.allowProjections ?? false, options.maxDecodeDepth ?? 4096) };
  }
  if (value.kind === "definition") {
    const allowedReducibility = options.allowTransparencyKinds ? ["regular", "abbrev"] : ["regular"];
    if (!allowedReducibility.includes(String(value.reducibility))) throw new ArtifactError(`${path}.reducibility invalid`);
    return {
      kind: "definition",
      name: value.name,
      levelParams,
      type,
      value: decodeTerm(value.value, `${path}.value`, tickT, tickL, 0, options.allowLet, options.allowBinderInfo, options.allowProjections ?? false, options.maxDecodeDepth ?? 4096),
      reducibility: value.reducibility as "regular" | "abbrev",
    };
  }

  if (!Number.isSafeInteger(value.numParams) || (value.numParams as number) < 0 || !Number.isSafeInteger(value.numIndices) || (value.numIndices as number) < 0) {
    throw new ArtifactError(`${path} invalid inductive parameter/index counts`);
  }
  if (options.legacyV2 && (value.numParams !== 0 || value.numIndices !== 0)) throw new ArtifactError(`${path} legacy K1-inductives0 requires numParams=numIndices=0`);
  if (!Array.isArray(value.constructors) || value.constructors.length > 10_000) throw new ArtifactError(`${path}.constructors invalid`);
  if (value.constructors.length === 0 && !options.allowEmptyInductives) throw new ArtifactError(`${path}: empty inductives unavailable in this artifact profile`);
  const constructors = value.constructors.map((c, i) => {
    if (!isObject(c) || typeof c.name !== "string") throw new ArtifactError(`${path}.constructors[${i}] invalid`);
    return { name: c.name, type: decodeTerm(c.type, `${path}.constructors[${i}].type`, tickT, tickL, 0, options.allowLet, options.allowBinderInfo, options.allowProjections ?? false, options.maxDecodeDepth ?? 4096) };
  });
  return {
    kind: "inductive",
    name: value.name,
    levelParams,
    type,
    numParams: value.numParams as number,
    numIndices: value.numIndices as number,
    constructors,
  };
}

function decodeTerm(
  value: unknown,
  path: string,
  tickT: () => void,
  tickL: () => void,
  depth: number,
  allowLet: boolean,
  allowBinderInfo: boolean,
  allowProjections = false,
  maxDepth = 4096,
): Term {
  tickT();
  if (depth > maxDepth) throw new ArtifactResourceError("term nesting depth exceeded","term_depth");
  if (!isObject(value) || typeof value.tag !== "string") throw new ArtifactError(`${path} must be a term object`);
  const next = (v: unknown, suffix: string) => decodeTerm(v, `${path}.${suffix}`, tickT, tickL, depth + 1, allowLet, allowBinderInfo, allowProjections, maxDepth);
  switch (value.tag) {
    case "sort": return { tag: "sort", level: decodeLevel(value.level, `${path}.level`, tickL, 0, maxDepth) };
    case "bvar":
      if (!Number.isSafeInteger(value.index) || (value.index as number) < 0) throw new ArtifactError(`${path}.index invalid`);
      return { tag: "bvar", index: value.index as number };
    case "const":
      if (typeof value.name !== "string" || !Array.isArray(value.levels)) throw new ArtifactError(`${path} const invalid`);
      return { tag: "const", name: value.name, levels: value.levels.map((l, i) => decodeLevel(l, `${path}.levels[${i}]`, tickL, 0, maxDepth)) };
    case "lit": {
      if (!isObject(value.literal) || typeof value.literal.tag !== "string") throw new ArtifactError(`${path}.literal invalid`);
      if (value.literal.tag === "nat") {
        const rawValue = value.literal.value;
        if (typeof rawValue !== "number" || !Number.isSafeInteger(rawValue) || rawValue < 0) throw new ArtifactError(`${path}.literal.value invalid Nat literal`);
        return { tag: "lit", literal: { tag: "nat", value: rawValue } };
      }
      if (value.literal.tag === "int") {
        const rawValue = value.literal.value;
        if (typeof rawValue !== "number" || !Number.isSafeInteger(rawValue)) throw new ArtifactError(`${path}.literal.value invalid Int literal`);
        return { tag: "lit", literal: { tag: "int", value: rawValue } };
      }
      if (value.literal.tag === "str") {
        const rawValue = value.literal.value;
        if (typeof rawValue !== "string") throw new ArtifactError(`${path}.literal.value invalid String literal`);
        return { tag: "lit", literal: { tag: "str", value: rawValue } };
      }
      throw new ArtifactError(`${path}.literal.tag unsupported`);
    }
    case "app": return { tag: "app", fn: next(value.fn, "fn"), arg: next(value.arg, "arg") };
    case "lam": {
      const binderInfo = decodeBinderInfo(value.binderInfo, path, allowBinderInfo);
      return { tag: "lam", domain: next(value.domain, "domain"), body: next(value.body, "body"), ...(binderInfo === "explicit" ? {} : { binderInfo }) };
    }
    case "pi": {
      const binderInfo = decodeBinderInfo(value.binderInfo, path, allowBinderInfo);
      return { tag: "pi", domain: next(value.domain, "domain"), body: next(value.body, "body"), ...(binderInfo === "explicit" ? {} : { binderInfo }) };
    }
    case "let":
      if (!allowLet) throw new ArtifactError(`${path}.tag 'let' is unavailable in this artifact profile`);
      if (typeof value.nondep !== "boolean") throw new ArtifactError(`${path}.nondep must be boolean`);
      return { tag: "let", type: next(value.type, "type"), value: next(value.value, "value"), body: next(value.body, "body"), nondep: value.nondep };
    case "proj":
      if (!allowProjections) throw new ArtifactError(`${path}.tag 'proj' is unavailable in this artifact profile`);
      if (typeof value.typeName !== "string") throw new ArtifactError(`${path}.typeName invalid`);
      if (!Number.isSafeInteger(value.index) || (value.index as number) < 0) throw new ArtifactError(`${path}.index invalid`);
      return { tag: "proj", typeName: value.typeName, index: value.index as number, expr: next(value.expr,"expr") };
    default: throw new ArtifactError(`${path}.tag unsupported`);
  }
}

function decodeLevel(value: unknown, path: string, tick: () => void, depth: number, maxDepth=4096): Level {
  tick();
  if (depth > maxDepth) throw new ArtifactResourceError("level nesting depth exceeded","level_depth");
  if (!isObject(value) || typeof value.tag !== "string") throw new ArtifactError(`${path} must be a level object`);
  switch (value.tag) {
    case "zero": return { tag: "zero" };
    case "param":
      if (typeof value.name !== "string") throw new ArtifactError(`${path}.name invalid`);
      return { tag: "param", name: value.name };
    case "succ": return { tag: "succ", of: decodeLevel(value.of, `${path}.of`, tick, depth + 1, maxDepth) };
    case "max": return { tag: "max", left: decodeLevel(value.left, `${path}.left`, tick, depth + 1, maxDepth), right: decodeLevel(value.right, `${path}.right`, tick, depth + 1, maxDepth) };
    case "imax": return { tag: "imax", left: decodeLevel(value.left, `${path}.left`, tick, depth + 1, maxDepth), right: decodeLevel(value.right, `${path}.right`, tick, depth + 1, maxDepth) };
    default: throw new ArtifactError(`${path}.tag unsupported`);
  }
}

function decodeBinderInfo(value: unknown, path: string, allow: boolean): BinderInfo {
  if (!allow) {
    if (value !== undefined) throw new ArtifactError(`${path}.binderInfo unavailable in this artifact profile`);
    return "explicit";
  }
  if (value === undefined) return "explicit";
  if (value === "explicit" || value === "implicit" || value === "strictImplicit" || value === "instImplicit") return value;
  throw new ArtifactError(`${path}.binderInfo invalid`);
}

function decodeTypeclassMetadata(value: unknown, tickT:()=>void, tickL:()=>void, options:StructuredOptions, version:9|10):TypeclassEnvironmentMetadata{
  if(!isObject(value))throw new ArtifactError(`typeclasses must be an object in v${version} artifacts`);
  if(!Array.isArray(value.classes)||!Array.isArray(value.instances))throw new ArtifactError("typeclasses.classes/instances must be arrays");
  if(value.classes.length>10_000||value.instances.length>100_000)throw new ArtifactResourceError("typeclass metadata resource limit exceeded","typeclass_metadata");
  const classes=value.classes.map((raw,i)=>{
    const path=`typeclasses.classes[${i}]`;if(!isObject(raw)||typeof raw.name!=="string")throw new ArtifactError(`${path}.name invalid`);
    if(!Number.isSafeInteger(raw.numParams)||(raw.numParams as number)<0)throw new ArtifactError(`${path}.numParams invalid`);
    if(!Number.isSafeInteger(raw.declarationOrder)||(raw.declarationOrder as number)<0)throw new ArtifactError(`${path}.declarationOrder invalid`);
    const numParams=raw.numParams as number;
    let params:{name:string;binderInfo:BinderInfo}[]=[];
    if(version===10){
      if(!Array.isArray(raw.params)||raw.params.length!==numParams)throw new ArtifactError(`${path}.params invalid`);
      params=raw.params.map((p,j)=>{if(!isObject(p)||typeof p.name!=="string")throw new ArtifactError(`${path}.params[${j}] invalid`);return{name:p.name,binderInfo:decodeBinderInfo(p.binderInfo,`${path}.params[${j}].binderInfo`,true)};});
      if(new Set(params.map(p=>p.name)).size!==params.length)throw new ArtifactError(`${path}.params contains duplicate names`);
    } else if(numParams!==0) throw new ArtifactError(`${path}: v9 metadata cannot encode parameterized classes`);
    if(!Array.isArray(raw.fields))throw new ArtifactError(`${path}.fields invalid`);
    const fields=raw.fields.map((f,j)=>{if(!isObject(f)||typeof f.name!=="string")throw new ArtifactError(`${path}.fields[${j}] invalid`);return{name:f.name,type:decodeTerm(f.type,`${path}.fields[${j}].type`,tickT,tickL,0,options.allowLet,options.allowBinderInfo,options.allowProjections??false,options.maxDecodeDepth??4096)};});
    return{name:raw.name,numParams,params,fields,declarationOrder:raw.declarationOrder as number};
  });
  const instances=value.instances.map((raw,i)=>{
    const path=`typeclasses.instances[${i}]`;if(!isObject(raw)||typeof raw.name!=="string"||typeof raw.className!=="string")throw new ArtifactError(`${path} invalid`);
    if(!Number.isSafeInteger(raw.priority)||(raw.priority as number)<0)throw new ArtifactError(`${path}.priority invalid`);
    if(!Number.isSafeInteger(raw.declarationOrder)||(raw.declarationOrder as number)<0)throw new ArtifactError(`${path}.declarationOrder invalid`);
    if(raw.scope!=="global")throw new ArtifactError(`${path}.scope unsupported`);
    if(typeof raw.anonymous!=="boolean")throw new ArtifactError(`${path}.anonymous invalid`);return{name:raw.name,className:raw.className,priority:raw.priority as number,declarationOrder:raw.declarationOrder as number,scope:"global" as const,anonymous:raw.anonymous};
  });
  if(new Set(classes.map(c=>c.name)).size!==classes.length)throw new ArtifactError("duplicate class registration metadata");
  if(new Set(instances.map(c=>c.name)).size!==instances.length)throw new ArtifactError("duplicate instance registration metadata");
  return{classes,instances};
}

function flattenApps(term:Term):{head:Term;args:Term[]}{const args:Term[]=[];let head=term;while(head.tag==="app"){args.unshift(head.arg);head=head.fn;}return{head,args};}

/** Cross-check nonlogical typeclass environment metadata against independently decoded Core declarations. */
export function validateTypeclassMetadataAgainstDeclarations(artifact:CoreArtifact):void{
  const decls=new Map(artifact.declarations.map(d=>[d.name,d] as const));
  const classes=new Map(artifact.typeclasses.classes.map(c=>[c.name,c] as const));
  const closeOverParams=(indType:Term,numParams:number,body:Term):Term=>{const pis:{domain:Term;binderInfo:BinderInfo}[]=[];let cur=indType;for(let p=0;p<numParams;p++){if(cur.tag!=="pi")throw new ArtifactError("class parameter telescope too short");pis.push({domain:cur.domain,binderInfo:binderInfoOf(cur)});cur=cur.body;}let out=body;for(let p=pis.length-1;p>=0;p--)out={tag:"pi",domain:pis[p].domain,body:out,binderInfo:pis[p].binderInfo};return out;};
  for(const c of artifact.typeclasses.classes){
    const d=decls.get(c.name);if(!d||d.kind!=="inductive")throw new ArtifactError(`class metadata '${c.name}' does not reference an inductive declaration`);
    if(d.numParams!==c.numParams)throw new ArtifactError(`class metadata '${c.name}' parameter count mismatch`);
    if(c.params.length!==c.numParams)throw new ArtifactError(`class metadata '${c.name}' parameter metadata count mismatch`);
    if(d.numIndices!==0)throw new ArtifactError(`K2p class metadata does not support indexed classes`);
    let classTail=d.type;for(let p=0;p<c.numParams;p++){if(classTail.tag!=="pi")throw new ArtifactError(`class metadata '${c.name}' parameter telescope mismatch`);if(binderInfoOf(classTail)!==c.params[p].binderInfo)throw new ArtifactError(`class metadata '${c.name}' parameter ${p} binder-info mismatch`);classTail=classTail.body;}if(classTail.tag!=="sort")throw new ArtifactError(`class metadata '${c.name}' result is not a sort`);
    if(d.constructors.length!==1||d.constructors[0].name!==`${c.name}.mk`)throw new ArtifactError(`class metadata '${c.name}' requires exactly the generated ${c.name}.mk constructor`);
    let ctorTail=d.constructors[0].type;for(let p=0;p<c.numParams;p++){if(ctorTail.tag!=="pi")throw new ArtifactError(`class metadata '${c.name}' constructor parameter telescope mismatch`);ctorTail=ctorTail.body;}
    const ctorFields:Term[]=[];while(ctorTail.tag==="pi"){ctorFields.push(ctorTail.domain);ctorTail=ctorTail.body;}
    if(ctorFields.length!==c.fields.length)throw new ArtifactError(`class metadata '${c.name}' field count mismatch`);
    for(let i=0;i<c.fields.length;i++){
      const adjusted=i===0?ctorFields[i]:shift(ctorFields[i],-i,0);
      const expectedClosed=closeOverParams(d.type,c.numParams,adjusted);
      const field=c.fields[i];if(!sameTerm(field.type,expectedClosed))throw new ArtifactError(`class metadata '${c.name}.${field.name}' field type mismatch`);
      const p=decls.get(`${c.name}.${field.name}`);if(!p||p.kind!=="definition")throw new ArtifactError(`class field metadata '${c.name}.${field.name}' has no projection definition`);
    }
  }
  for(const inst of artifact.typeclasses.instances){
    const d=decls.get(inst.name);if(!d||d.kind!=="definition")throw new ArtifactError(`instance metadata '${inst.name}' does not reference a definition`);
    const cls=classes.get(inst.className);if(!cls)throw new ArtifactError(`instance metadata '${inst.name}' references unknown class '${inst.className}'`);
    // K2r permits leading hidden type parameters followed by instance-implicit
    // prerequisites.  Prerequisite domains must themselves be fully applied
    // registered classes, and the final target may not depend on prerequisite
    // values. The kernel independently checks the complete Pi/Lam definition.
    let target=d.type;let seenPrerequisite=false;
    while(target.tag==="pi"){
      const info=binderInfoOf(target);
      if(info==="implicit"||info==="strictImplicit"){
        if(seenPrerequisite)throw new ArtifactError(`instance metadata '${inst.name}' has hidden type parameters after an instance prerequisite`);
        if(target.domain.tag!=="sort")throw new ArtifactError(`instance metadata '${inst.name}' polymorphic binder is not a direct type parameter`);
        target=target.body;continue;
      }
      if(info==="instImplicit"){
        seenPrerequisite=true;
        const prereq=flattenApps(target.domain);const prereqClass=prereq.head.tag==="const"?classes.get(prereq.head.name):undefined;
        if(prereq.head.tag!=="const"||!prereqClass||prereq.args.length!==prereqClass.numParams)throw new ArtifactError(`instance metadata '${inst.name}' prerequisite is not a fully applied registered class`);
        try{target=shift(target.body,-1,0);}catch{throw new ArtifactError(`instance metadata '${inst.name}' class target depends on an instance prerequisite value`);}continue;
      }
      throw new ArtifactError(`instance metadata '${inst.name}' contains an unsupported explicit prerequisite before its class target`);
    }
    const {head,args}=flattenApps(target);if(head.tag!=="const"||head.name!==inst.className||args.length!==cls.numParams)throw new ArtifactError(`instance metadata '${inst.name}' type does not fully apply class '${inst.className}'`);
  }
}

function decodeLegacyModuleMetadata(value:unknown,declarations:readonly CoreDeclaration[],typeclasses:TypeclassEnvironmentMetadata):CoreModulesMetadata{
  if(!isObject(value))throw new ArtifactError("modules must be an object in v11 artifacts");
  if(typeof value.entry!=="string")throw new ArtifactError("modules.entry must be a string");
  if(!Array.isArray(value.modules)||value.modules.length===0||value.modules.length>100_000)throw new ArtifactError("modules.modules must be a non-empty bounded array");
  const build:CoreModulesBuildMetadata={entry:value.entry,modules:value.modules.map((raw,i)=>{
    const p=`modules.modules[${i}]`;
    if(!isObject(raw))throw new ArtifactError(`${p} must be an object`);
    if(typeof raw.name!=="string")throw new ArtifactError(`${p}.name invalid`);
    if(typeof raw.sourceSha256!=="string")throw new ArtifactError(`${p}.sourceSha256 invalid`);
    if(!Array.isArray(raw.imports)||!raw.imports.every(x=>typeof x==="string"))throw new ArtifactError(`${p}.imports invalid`);
    if(!Array.isArray(raw.declarations)||!raw.declarations.every(x=>typeof x==="string"))throw new ArtifactError(`${p}.declarations invalid`);
    return{name:raw.name,sourceSha256:raw.sourceSha256,imports:[...(raw.imports as string[])],declarations:[...(raw.declarations as string[])]};
  })};
  return finalizeModuleMetadata(build,declarations,typeclasses);
}

function decodeModuleMetadataV12(value:unknown,declarations:readonly CoreDeclaration[],typeclasses:TypeclassEnvironmentMetadata,implementationProfile:"K3b-module-interfaces0"|"K3c-names0"|"K3c-sections-open0"|"K3c-section-vars0"):CoreModulesMetadata{
  if(!isObject(value))throw new ArtifactError("modules must be an object in v12 artifacts");
  if(typeof value.entry!=="string")throw new ArtifactError("modules.entry must be a string");
  if(value.interfaceFormatVersion!==1)throw new ArtifactError("modules.interfaceFormatVersion must be 1");
  if(value.cacheKeyFormatVersion!==1)throw new ArtifactError("modules.cacheKeyFormatVersion must be 1");
  if(typeof value.baseEnvironmentSha256!=="string"||!SHA256.test(value.baseEnvironmentSha256))throw new ArtifactError("modules.baseEnvironmentSha256 invalid");
  if(!Array.isArray(value.modules)||value.modules.length===0||value.modules.length>100_000)throw new ArtifactError("modules.modules must be a non-empty bounded array");
  const parsed=value.modules.map((raw,i)=>{
    const p=`modules.modules[${i}]`;
    if(!isObject(raw))throw new ArtifactError(`${p} must be an object`);
    if(typeof raw.name!=="string")throw new ArtifactError(`${p}.name invalid`);
    if(typeof raw.sourceSha256!=="string")throw new ArtifactError(`${p}.sourceSha256 invalid`);
    if(!Array.isArray(raw.imports))throw new ArtifactError(`${p}.imports invalid`);
    const imports=raw.imports.map((edge,j)=>{
      if(!isObject(edge)||typeof edge.module!=="string"||edge.mode!=="plain"||typeof edge.interfaceSha256!=="string"||!SHA256.test(edge.interfaceSha256))throw new ArtifactError(`${p}.imports[${j}] invalid`);
      return{module:edge.module,mode:"plain" as const,interfaceSha256:edge.interfaceSha256};
    });
    if(!Array.isArray(raw.declarations)||!raw.declarations.every(x=>typeof x==="string"))throw new ArtifactError(`${p}.declarations invalid`);
    if(!Array.isArray(raw.exports)||!raw.exports.every(x=>typeof x==="string"))throw new ArtifactError(`${p}.exports invalid`);
    if(typeof raw.interfaceSha256!=="string"||!SHA256.test(raw.interfaceSha256))throw new ArtifactError(`${p}.interfaceSha256 invalid`);
    if(typeof raw.cacheKeySha256!=="string"||!SHA256.test(raw.cacheKeySha256))throw new ArtifactError(`${p}.cacheKeySha256 invalid`);
    return{name:raw.name,sourceSha256:raw.sourceSha256,imports,declarations:[...(raw.declarations as string[])],exports:[...(raw.exports as string[])],interfaceSha256:raw.interfaceSha256,cacheKeySha256:raw.cacheKeySha256};
  });
  const expected=finalizeModuleMetadata({entry:value.entry,modules:parsed.map(m=>({name:m.name,sourceSha256:m.sourceSha256,imports:m.imports.map(i=>i.module),declarations:m.declarations}))},declarations,typeclasses,implementationProfile);
  if(value.baseEnvironmentSha256!==expected.baseEnvironmentSha256)throw new ArtifactError("modules.baseEnvironmentSha256 mismatch");
  for(let i=0;i<parsed.length;i++){
    const raw=parsed[i],want=expected.modules[i],p=`modules.modules[${i}]`;
    if(JSON.stringify(raw.exports)!==JSON.stringify(want.exports))throw new ArtifactError(`${p}.exports mismatch`);
    if(JSON.stringify(raw.imports)!==JSON.stringify(want.imports))throw new ArtifactError(`${p}.imports interface binding mismatch`);
    if(raw.interfaceSha256!==want.interfaceSha256)throw new ArtifactError(`${p}.interfaceSha256 mismatch`);
    if(raw.cacheKeySha256!==want.cacheKeySha256)throw new ArtifactError(`${p}.cacheKeySha256 mismatch`);
  }
  return expected;
}

const MODULE_NAME=/^[A-Za-z_][A-Za-z0-9_']*(?:\.[A-Za-z_][A-Za-z0-9_']*)*$/;
const SHA256=/^[0-9a-f]{64}$/;

export function finalizeModuleMetadata(build:CoreModulesBuildMetadata,declarations:readonly CoreDeclaration[],typeclasses:TypeclassEnvironmentMetadata,implementationProfile:"K3b-module-interfaces0"|"K3c-names0"|"K3c-sections-open0"|"K3c-section-vars0"="K3c-section-vars0"):CoreModulesMetadata{
  if(!MODULE_NAME.test(build.entry))throw new ArtifactError("modules.entry invalid");
  if(!Array.isArray(build.modules)||build.modules.length===0||build.modules.length>100_000)throw new ArtifactError("modules.modules must be a non-empty bounded array");
  const declByName=new Map(declarations.map(d=>[d.name,d] as const));
  const owners=new Map<string,string>();
  const basic=build.modules.map((m,i)=>{
    const p=`modules.modules[${i}]`;
    if(!MODULE_NAME.test(m.name))throw new ArtifactError(`${p}.name invalid`);
    if(!SHA256.test(m.sourceSha256))throw new ArtifactError(`${p}.sourceSha256 invalid`);
    if(!Array.isArray(m.imports)||!m.imports.every(x=>MODULE_NAME.test(x)))throw new ArtifactError(`${p}.imports invalid`);
    if(new Set(m.imports).size!==m.imports.length)throw new ArtifactError(`${p}.imports contains duplicates`);
    if(!Array.isArray(m.declarations)||!m.declarations.every(x=>typeof x==="string"))throw new ArtifactError(`${p}.declarations invalid`);
    if(new Set(m.declarations).size!==m.declarations.length)throw new ArtifactError(`${p}.declarations contains duplicates`);
    for(const d of m.declarations){
      if(!declByName.has(d))throw new ArtifactError(`${p}.declarations references unknown checked declaration '${d}'`);
      const previous=owners.get(d);if(previous)throw new ArtifactError(`checked declaration '${d}' is owned by both '${previous}' and '${m.name}'`);owners.set(d,m.name);
    }
    return{name:m.name,sourceSha256:m.sourceSha256,imports:[...m.imports],declarations:[...m.declarations]};
  });
  const names=new Set(basic.map(m=>m.name));
  if(names.size!==basic.length)throw new ArtifactError("modules contains duplicate module names");
  if(!names.has(build.entry))throw new ArtifactError("modules.entry does not name a module in the artifact");
  for(const m of basic)for(const imported of m.imports)if(!names.has(imported))throw new ArtifactError(`module '${m.name}' imports missing module '${imported}'`);
  const byName=new Map(basic.map(m=>[m.name,m] as const));
  const state=new Map<string,0|1|2>();const stack:string[]=[];
  const ensureAcyclic=(name:string):void=>{const s=state.get(name)??0;if(s===2)return;if(s===1){const at=stack.indexOf(name);const cycle=[...stack.slice(at>=0?at:0),name];throw new ArtifactError(`module metadata cycle: ${cycle.join(" -> ")}`);}state.set(name,1);stack.push(name);for(const i of byName.get(name)!.imports)ensureAcyclic(i);stack.pop();state.set(name,2);};
  for(const m of basic)ensureAcyclic(m.name);

  const baseDecls=declarations.filter(d=>!owners.has(d.name));
  const baseNames=new Set(baseDecls.map(d=>d.name));
  const baseTypeclasses=normalizedTypeclasses(typeclasses,baseNames,baseDecls.map(d=>d.name));
  const baseEnvironmentSha256=hashCanonical({format:"proofscript-base-environment",version:1,proofscriptReference:"v0.1",semanticBaseline:"4.33.1",declarations:baseDecls,typeclasses:baseTypeclasses});
  const computed=new Map<string,CoreModulesMetadata["modules"][number]>();
  const compute=(name:string):CoreModulesMetadata["modules"][number]=>{
    const prior=computed.get(name);if(prior)return prior;
    const m=byName.get(name)!;
    const imports=m.imports.map(module=>{const dep=compute(module);return{module,mode:"plain" as const,interfaceSha256:dep.interfaceSha256};});
    const ownedDecls=m.declarations.map(n=>declByName.get(n)!);
    const ownedNames=new Set(m.declarations);
    const ownedTypeclasses=normalizedTypeclasses(typeclasses,ownedNames,m.declarations);
    const exports=[...m.declarations];
    const interfaceSha256=hashCanonical({format:"proofscript-module-interface",version:1,proofscriptReference:"v0.1",semanticBaseline:"4.33.1",baseEnvironmentSha256,module:m.name,imports,exports:ownedDecls,typeclasses:ownedTypeclasses});
    const cacheKeySha256=hashCanonical({format:"proofscript-module-cache-key",version:1,implementationProfile,proofscriptReference:"v0.1",semanticBaseline:"4.33.1",baseEnvironmentSha256,module:m.name,sourceSha256:m.sourceSha256,imports});
    const out={name:m.name,sourceSha256:m.sourceSha256,imports,declarations:[...m.declarations],exports,interfaceSha256,cacheKeySha256};computed.set(name,out);return out;
  };
  for(const m of basic)compute(m.name);
  return{entry:build.entry,interfaceFormatVersion:1,cacheKeyFormatVersion:1,baseEnvironmentSha256,modules:basic.map(m=>computed.get(m.name)!)};
}

function normalizedTypeclasses(typeclasses:TypeclassEnvironmentMetadata,names:Set<string>,declarationOrder:string[]):TypeclassEnvironmentMetadata{
  const localOrder=new Map(declarationOrder.map((n,i)=>[n,i] as const));
  return{
    classes:typeclasses.classes.filter(c=>names.has(c.name)).map(c=>({...c,params:c.params.map(p=>({...p})),fields:c.fields.map(f=>({...f})),declarationOrder:localOrder.get(c.name)??c.declarationOrder})),
    instances:typeclasses.instances.filter(i=>names.has(i.name)).map(i=>({...i,declarationOrder:localOrder.get(i.name)??i.declarationOrder})),
  };
}

export function canonicalJson(value:unknown):string{return JSON.stringify(canonicalize(value));}
function hashCanonical(value:unknown):string{return crypto.createHash("sha256").update(canonicalJson(value)).digest("hex");}
function canonicalize(value:unknown):unknown{
  if(Array.isArray(value))return value.map(canonicalize);
  if(value&&typeof value==="object"){
    const source=value as Record<string,unknown>;const out:Record<string,unknown>={};
    for(const key of Object.keys(source).sort()){const v=source[key];if(v===undefined||(key==="binderInfo"&&v==="explicit"))continue;out[key]=canonicalize(v);}
    return out;
  }
  return value;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
