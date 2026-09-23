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
  const count = Math.min(names.length, types.length);
  const out: ProofStateLocal[] = [];
  for (let index = 0; index < count; index++) {
    out.push({ name: names[index], type: types[index] });
  }
  return out;
}

/**
 * Proof-state collection must never become proof authority. In particular, a
 * buggy or third-party observer is not allowed to make an otherwise valid
 * elaboration fail.
 */
export function observeProofState(
  observer: { readonly recordProofState?: (state: ProofStateSnapshot) => void } | undefined,
  state: ProofStateSnapshot,
): void {
  try {
    observer?.recordProofState(state);
  } catch {
    // Observational tooling is deliberately fail-open with respect to proof
    // checking. The checked Core term remains the only acceptance path.
  }
}
