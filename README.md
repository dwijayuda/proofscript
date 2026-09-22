# ProofScript npm alpha

ProofScript is intended to be installed like TypeScript:

```bash
npm install proofscript
npx psc --version
npx psc init my-app
cd my-app
npx psc check
npx psc build
```

This alpha package exposes the `psc` CLI and preserves the PSKernel/Core trust boundary from the KA-128 line. It does **not** claim full Lean 4 equivalence or fully formal K3.

Useful alpha commands:

```bash
psc init my-app
psc check [file.ps] [--emit-core out.pscore.json]
psc build [file.ps] --target ts
psc contracts file.ps --out file.contracts.json --emit-lean file.contracts.lean
psc obligations file.contracts.json
psc verify artifact.json
psc kernel status
psc npm-readiness
```

---

# ProofScript PSKernel KA-22 Non-definition VEnv.LE Bridge0

Current checkpoint: `proofscript-v1-ka22-nondef-env-extension-bridge0` / public version `1.0.0-pskernel.25`.

KA-22 keeps the active kernel branded as **PSKernel** and preserves the trusted-boundary default: `KERNEL-level-instantiation-conformance1` / Core format 71 / certificate v2. It does not mutate trusted kernel semantics, the kernel codec, or trusted computation rules.

New in this checkpoint:

- imports real `Lean4Lean.Theory.Typing.Env`;
- proves conditional `Lean4Lean.VEnv.LE` bridge lemmas for translated theorem, example, and opaque declarations;
- raises the tracked conditional Lean4Lean bridge-obligation count to 25;
- keeps full Lean 4 equivalence, same-theory-with-full-Lean, fully formal K3, and executable PSKernel-refinement claims false.

---

# ProofScript PSKernel v1.0.0-pskernel.1 Advancement Audit0

This checkpoint keeps the active kernel branded as **PSKernel** and preserves the current trusted-boundary default: `KERNEL-level-instantiation-conformance1` / Core format 71 / certificate v2. It does not mutate trusted kernel semantics.

New in this checkpoint:

- adds a strict `arena:corpus-preflight` gate before `verify:arena`;
- missing Lean Kernel Arena fixtures now fail early as `arena_corpus_missing` instead of producing misleading downstream assertion errors;
- adds `test:pskernel:advancement-audit` to verify PSKernel naming, Core v71 status, 41/41 K3-TB checklist metadata, and Arena preflight wiring;
- restarts package/public metadata to `1.0.0-pskernel.1`; serialized Core format remains 71 for compatibility.

Current claim boundary remains unchanged: K3-TB trusted-boundary only; not full Lean 4 equivalence; not fully formal K3; formal Lean 4 equivalence proven obligations remain 0.

---

# ProofScript Software Profile P5.103 CRUD Template + Host Demo0

Current **P5.103 CRUD Template + Host Demo0** builds on P5.102 by keeping the separated runtime output and adding a more app-like CRUD starter/demo flow. The normal app path remains:

```bash
npm install --offline --no-audit --no-fund
npm run setup
npm link
psc init my-app
cd my-app
psc check
psc build
psc run sample
```

A richer app template is now available:

```bash
psc init my-crud-app --template crud
cd my-crud-app
psc check
psc build
npm run build:generated-js
npm run build:host
npm run start:host
```

Default TypeScript output separates generated program code from executable runtime support:

```text
dist/
  Main.ts
  proofscript-runtime.ts
  proofscript.manifest.json
```

`Main.ts` imports `./proofscript-runtime.js` by default while the sibling source file remains `proofscript-runtime.ts`. `psc build --bundle-runtime` preserves self-contained single-file TypeScript output for demos and smoke tests. `psc build --runtime package` emits an `@proofscript/runtime` import for package-oriented experiments, while the local runtime remains the safe default for starter apps.

P5.103 keeps `examples/software-profile/crud-app` as a realistic immutable CRUD-style task domain using `inductive`, `structure`, total functions, `Option`, `Except`, `List.find?`, `List.map`, `List.filter`, `List.foldl`, and `by rfl` smoke theorems. It also adds a compiled imperative TypeScript host demo that calls the generated ProofScript CRUD module and prints a create/update/delete JSON summary.

Trust boundary: P5.103 changes CLI/build/backend-output usability, starter templates, and examples only. Kernel source changed: NO. Arena importer changed: NO. Kernel-codec changed: NO. Full Lean 4 equivalence: NO. Backend execution-correspondence proof: NO.

---

# ProofScript Production P5.94 Arena Nested Helper Target Validation0

Current **P5.94 Arena Nested Helper Target Validation0** (`arena-nested-helper-target-validation0`): PSC-1 keeps the K3-TB trust boundary and strengthens the uploaded Lean Kernel Arena `good/init-prelude.ndjson` nested-recursion frontier. It validates nested recursor topology, helper rule/minor shape, and helper target constructor-family coverage before declining unsupported helper iota.

## P5.94 semantic change

P5.94 does **not** implement full nested-inductive helper iota. It safely validates the first `Lean.Syntax` nested frontier before declining it:

- expected outer recursor plus helper recursors `.rec_1..rec_N`;
- constructor/rule coverage and field counts;
- canonical nested minor ordering;
- nested rule RHS prefix abstraction;
- expected minor-premise head selection;
- minor argument count against the corresponding minor telescope;
- helper rule target constructor must be previously validated;
- helper rule target constructor field count must match the validated constructor;
- each helper recursor must target exactly one constructor family and cover that family completely.

A corrupted `Lean.Syntax.rec_2` helper rule that retargets a `List.nil` rule to `Array.mk` is rejected structurally. Valid `Lean.Syntax` still declines at `inductive.nested.helper-iota`, because helper recursor derivation and helper iota validation are not implemented yet. This is intentional: nested helper recursors must not be accepted as axioms or whitelisted metadata.

P5.94 preserves measured Arena tutorial agreement: 93/93 good tutorial tests accepted, 47/47 bad tutorial tests rejected, 0 tutorial declines, and static non-performance subset 4/4 good accepted plus 22/22 bad rejected.

K3-TB trusted-boundary only. Fully formal K3: NO. Full Lean 4 equivalence: NO. ProofScript same theory as full Lean 4: NO. Formal Lean 4 equivalence proven obligations: 0. Arena agreement is external evidence, not formal equivalence.

This package inherits the v71 K3-TB Release Candidate trust-boundary artifacts and keeps their publication wording visible for automated release checks: **v71 K3-TB Release Candidate**, **99.5%** engineering progress toward the K3-TB boundary, and **not a fully formal K3 equivalence proof**. This inherited section is a trust-boundary status statement only; it does not convert P5.94 into full Lean 4 equivalence, fully formal K3, or a Lean replacement for arbitrary Lean programs.
