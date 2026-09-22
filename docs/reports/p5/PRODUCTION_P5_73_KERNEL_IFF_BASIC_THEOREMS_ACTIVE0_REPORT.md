# P5.73 Kernel Iff Basic Theorems Active Report

P5.73 is a bounded trusted-boundary checked-kernel-prelude improvement. It does not claim ProofScript is the same full theory as Lean 4, does not claim fully formal K3, and does not add formal Lean 4 equivalence proofs.

## Kernel/prelude change

P5.73 extends the optional propositional-extensionality primitive prelude. P5.72 already installed `Iff.mp` and `Iff.mpr` as checked theorem definitions derived from generated `Iff.rec`. P5.73 adds checked theorem definitions:

```text
Iff.refl  : ∀ (a : Prop), a ↔ a
Iff.symm  : ∀ {a b : Prop}, (a ↔ b) → b ↔ a
Iff.trans : ∀ {a b c : Prop}, (a ↔ b) → (b ↔ c) → a ↔ c
```

They are derived from existing checked declarations `Iff.intro`, `Iff.mp`, and `Iff.mpr`. They are not new trusted axioms, and no kernel-codec change is introduced.

## TDD evidence

RED on P5.72:

```text
SyntaxError: Named export 'iffReflDefinition' not found
```

GREEN on P5.73:

```text
npm run test:kernel:iff-basic-theorems-active0
KERNEL_IFF_BASIC_THEOREMS_ACTIVE0=PASS exact-lean=PASS
```

## Exact Lean evidence

The focused oracle uses exact Lean 4.33.1 commit `819816b2e0a3bf405af45ae5c7af2491d8f5bee6` and checks `#print Iff.refl`, `#print Iff.symm`, `#print Iff.trans`, plus use-sites for reflexivity, symmetry, and transitivity.

## Non-claims

- K3-TB trusted-boundary: YES
- Fully formal K3: NO
- Full Lean 4 equivalence: NO
- ProofScript same theory as full Lean 4: NO
- Formal Lean 4 equivalence proven obligations: 0


## Release verification update

Fresh bounded verification after the indexed/Prop projection, historical-profile, positivity, bootstrap, and smoke-path repairs passed the focused P5.73 gate, inherited P5.72/P5.71/P5.70/P5.69/P5.68/P5.67/P5.66/P5.65 kernel gates, standalone-small, architecture, conformance positive and negative corpora, and K3-TB publish sub-gates. The full conformance and K3-TB wrapper forms exceeded tool time in some runs and were not counted; their bounded sub-gates were rerun directly. Exact Lean differential was reconstructed from bounded manifests and accepted all 25/25 cases against Lean 4.33.1 commit `819816b2e0a3bf405af45ae5c7af2491d8f5bee6`.

Trust boundary remains K3-TB trusted-boundary evidence only. Fully formal K3 remains no. Full Lean 4 equivalence remains no. Formal Lean 4 equivalence proven obligations remain 0.


## Final freeze validation

Final P5.73 source-archive validation passed. The archive integrity gates (`sha256sum -c` and `unzip -t`) passed; source residue is clean with zero `node_modules`, zero `dist`, zero `*.tsbuildinfo`, zero nested ZIPs, zero non-vendor `*.tgz`, and the expected three vendored offline npm tarballs. Fresh extract validation passed offline `npm ci --ignore-scripts`, build, focused feature tests, inherited kernel gates through P5.65-P5.72, standalone-small, architecture, conformance positive/negative corpora, exact Lean differential 25/25 via bounded reruns, and K3-TB publish sub-gates. Long wrappers that exceeded execution time were not counted as pass; their tails were rerun directly.
