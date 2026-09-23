import {
  CoreDeclaration,
  TypeclassEnvironmentMetadata,
  emptyTypeclassEnvironment,
} from "@proofscript/kernel";
import { SurfaceBinder, SurfaceDeclaration, SurfaceTerm } from "@proofscript/syntax";
import { InitialGlobalInfo } from "./globalEnvironment";
import { elaborateInitialProofGoalCore, elaborateProgramCore } from "./programElaboration";
import { elabTerm } from "./termElaboration";
import { ProofElaborationObserver } from "./proofState";
export type { GlobalInfo, InitialGlobalInfo } from "./globalEnvironment";
export { elabTerm } from "./termElaboration";
export { collectResolvedGlobalReferences } from "./sourceReferences";
export type { ResolvedGlobalReference } from "./sourceReferences";
export type { ProofElaborationObserver, ProofStateLocal, ProofStateSnapshot } from "./proofState";
export type { ElaboratedInitialProofGoal } from "./programElaboration";

/**
 * Elaborate the current K2c/PSC-1 source slice into explicit kernel declarations.
 *
 * `initialDeclarations` is used only as an already-checked semantic environment
 * for type-directed elaboration such as unannotated local `let`; the returned
 * array contains only declarations originating from `decls`.
 */
export function elaborateProgram(
  decls: SurfaceDeclaration[],
  initialGlobals: readonly InitialGlobalInfo[] = [],
  initialDeclarations: readonly CoreDeclaration[] = [],
  initialTypeclasses: TypeclassEnvironmentMetadata = emptyTypeclassEnvironment(),
  observer?: ProofElaborationObserver,
): { declarations: CoreDeclaration[]; typeclasses: TypeclassEnvironmentMetadata } {
  return elaborateProgramCore(
    decls,
    initialGlobals,
    initialDeclarations,
    initialTypeclasses,
    (term, locals, localTypes, globals, available, kernelEnv, expectedType) =>
      elabTerm(term, locals, localTypes, globals, available, kernelEnv, expectedType, observer),
  );
}

export function elaborateInitialProofGoal(
  prefixDecls: SurfaceDeclaration[],
  sourceName: string,
  namespacePath: readonly string[] | undefined,
  binders: SurfaceBinder[],
  resultTerm: SurfaceTerm,
  availableLevels: readonly string[],
  initialGlobals: readonly InitialGlobalInfo[] = [],
  initialDeclarations: readonly CoreDeclaration[] = [],
  initialTypeclasses: TypeclassEnvironmentMetadata = emptyTypeclassEnvironment(),
) {
  return elaborateInitialProofGoalCore(
    prefixDecls,
    sourceName,
    namespacePath,
    binders,
    resultTerm,
    availableLevels,
    initialGlobals,
    initialDeclarations,
    initialTypeclasses,
    (term, locals, localTypes, globals, available, kernelEnv, expectedType) =>
      elabTerm(term, locals, localTypes, globals, available, kernelEnv, expectedType),
  );
}

export function elaborateDeclarations(
  decls: SurfaceDeclaration[],
  initialGlobals: readonly InitialGlobalInfo[] = [],
  initialDeclarations: readonly CoreDeclaration[] = [],
): CoreDeclaration[] {
  return elaborateProgram(decls, initialGlobals, initialDeclarations).declarations;
}
