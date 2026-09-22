# P5.72 Kernel Iff Eliminators Active Report

P5.72 is a bounded trusted-boundary kernel-prelude improvement. It does not claim ProofScript is the same full theory as Lean 4, does not claim fully formal K3, and does not add formal Lean 4 equivalence proofs.

## Change

The active PSKernel-derived TypeScript kernel now installs checked Lean 4.33.1-style `Iff.mp` and `Iff.mpr` theorem declarations when propositional-extensionality support is requested. They are derived from the generated `Iff.rec` recursor and are not new trusted axioms. The existing P5.71 `Iff`/`Iff.intro`/`Iff.rec`/`propext` slice remains preserved.

Installed order is deterministic: `Iff`, `Iff.intro`, `Iff.rec`, `Iff.mp`, `Iff.mpr`, then `propext`; quotient initialization still comes after the propositional-extensionality slice when requested.

## TDD

RED on P5.71:

```text
SyntaxError: Named export 'iffMpDefinition' not found
```

GREEN on P5.72:

```text
npm run test:kernel:iff-eliminators-active0
KERNEL_IFF_ELIMINATORS_ACTIVE0=PASS exact-lean=PASS
```

## Exact Lean evidence

The focused oracle uses exact Lean 4.33.1 commit `819816b2e0a3bf405af45ae5c7af2491d8f5bee6` and checks `#print Iff.mp`, `#print Iff.mpr`, plus theorem uses:

```lean
example {P Q : Prop} (h : P ↔ Q) (hp : P) : Q := Iff.mp h hp
example {P Q : Prop} (h : P ↔ Q) (hq : Q) : P := Iff.mpr h hq
```

## Non-claims

- No full Lean 4 equivalence is claimed.
- No fully formal K3 is claimed.
- Formal Lean 4 equivalence proven obligations remain 0.
- `funext`, `Classical.choice`, and full general theorem-library semantics remain deferred.

## Release verification

Final verification used exact Lean 4.33.1 commit `819816b2e0a3bf405af45ae5c7af2491d8f5bee6`. The full differential wrapper exceeded the execution timeout and was not counted as a pass; all 25 manifest cases were rerun in bounded batches/single-case runs and merged into the official report with 25/25 accepted. The conformance and K3-TB publish wrappers likewise had timed-out long forms; their remaining tails were rerun directly and passed.

Fresh source-archive validation passed from a clean extract with zero `node_modules`, zero `dist`, zero `*.tsbuildinfo`, zero nested ZIPs, zero non-vendor `*.tgz`, and three preserved vendored offline npm tarballs. The release remains K3-TB trusted-boundary evidence only: not fully formal K3, not full Lean 4 equivalence, and formal Lean 4 equivalence proven obligations remain 0.
