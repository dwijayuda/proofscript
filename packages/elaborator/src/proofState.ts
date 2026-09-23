import { Term } from "@proofscript/kernel";

export interface ProofStateLocal {
  readonly name: string;
  readonly type: Term;
}

export interface ProofStateSnapshot {
  readonly kind: "tactic" | "branch";
  readonly tactic: string;
  readonly startOffset: number;
  readonly endOffset: number;
  readonly goal: Term;
  readonly locals: readonly ProofStateLocal[];
  readonly branch?: string;
}

/**
 * Observational proof-state sink used by editor/compiler tooling.
 *
 * Snapshots are emitted while the ordinary elaborator constructs Core proof
 * terms. They are never consulted by elaboration or kernel checking and carry
 * no proof authority.
 */
export interface ProofElaborationObserver {
  recordProofState(state: ProofStateSnapshot): void;
}

export function proofStateLocals(
  names: readonly string[],
  types: readonly Term[],
): ProofStateLocal[] {
  if (names.length !== types.length) {
    throw new Error("internal: proof-state local names/types length mismatch");
  }
  return names.map((name, index) => ({ name, type: types[index] }));
}
