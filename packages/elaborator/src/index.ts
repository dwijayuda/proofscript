import {
  CoreDeclaration,
  TypeclassEnvironmentMetadata,
  emptyTypeclassEnvironment,
} from "@proofscript/kernel";
import { SurfaceDeclaration } from "@proofscript/syntax";
import { InitialGlobalInfo } from "./globalEnvironment";
import { elaborateProgramCore } from "./programElaboration";
import { elabTerm } from "./termElaboration";
export type { GlobalInfo, InitialGlobalInfo } from "./globalEnvironment";
export { elabTerm } from "./termElaboration";

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
): { declarations: CoreDeclaration[]; typeclasses: TypeclassEnvironmentMetadata } {
  return elaborateProgramCore(decls, initialGlobals, initialDeclarations, initialTypeclasses, elabTerm);
}

export function elaborateDeclarations(
  decls: SurfaceDeclaration[],
  initialGlobals: readonly InitialGlobalInfo[] = [],
  initialDeclarations: readonly CoreDeclaration[] = [],
): CoreDeclaration[] {
  return elaborateProgram(decls, initialGlobals, initialDeclarations).declarations;
}
