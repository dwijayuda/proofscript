# Running the pinned Lean 4.33.1 differential campaign

ProofScript remains standalone: ordinary `psc check`, `psc certify`, and strict `psc verify` do not need Lean. This workflow is development/conformance evidence against the pinned semantic oracle.

## Commands

Build first:

```bash
npm ci --ignore-scripts
npm run build
```

Run the required differential campaign when exact Lean 4.33.1 is on `PATH`:

```bash
npm run test:differential
```

Or point to one explicit binary:

```bash
PROOFSCRIPT_LEAN_BIN=/absolute/path/to/lean npm run test:differential
```

The standalone oracle command can use the same explicit path:

```bash
psc verify proof/Main.pscore.json --oracle lean --lean /absolute/path/to/lean --json
```

For development environments that do not contain Lean, this command prepares all ProofScript-side observations but keeps the evidence pending:

```bash
npm run test:differential:if-available
```

Its report status is `unsupported`, not `accepted`.

The ordinary `npm test` suite also runs differential preparation in this non-claiming mode, so changes cannot silently break the corpus when Lean is absent.

## Evidence model (schema 2)

The manifest separates three kinds of evidence:

1. `semantic-equivalence` — ProofScript must accept; generated Lean and an independently handwritten Lean reference must both be accepted by exact Lean 4.33.1 and produce matching semantic observations.
2. `negative-agreement` — ProofScript must reject an invalid program and the independently handwritten Lean reference must also be rejected. This distinguishes logical invalidity from unsupported implementation coverage.
3. `capability-gap` — ProofScript must return `unsupported` while the corresponding Lean program is accepted. These cases are tracked gaps, not semantic mismatches.

The current corpus contains 21 cases: 16 semantic-equivalence cases, 3 negative-agreement cases, and 2 explicit capability-gap cases.

Each semantic-equivalence case declares its semantic dimensions, concrete ProofScript evidence checks, and Lean probe indices. The harness rejects a manifest that labels a dimension without executable evidence. The required post-K3b observation profile contains 15 dimensions:

- declaration kind;
- universe parameters;
- declaration types;
- constructor types;
- recursor types;
- BinderInfo;
- transparency;
- generated declarations;
- definition reduction;
- recursor reduction;
- proof irrelevance;
- Eq behavior;
- typeclass candidate selection;
- module/import environment observations;
- axiom dependencies.

Every required dimension must have at least one bilateral semantic-equivalence case before the manifest is accepted.

## ProofScript observations

Accepted ProofScript cases are independently rechecked into an explicit kernel environment. The report captures not only top-level Core declarations but also generated constructor and recursor declarations and their kernel-computed types. Structured assertions cover facts such as:

- exact declaration kind and universe parameter lists;
- binder classes;
- definition reducibility (`regular` versus `abbrev`) and opaque declaration kind;
- generated equation declarations;
- generated constructor/recursor types;
- exact axiom-dependency sets;
- explicit typeclass instance selection in emitted Core;
- instance registration order;
- module ownership and direct import edges.

This prevents a semantic dimension from being represented only by a prose label or a weak output substring.

## Lean comparison semantics

Each accepted paired case appends the same probes to generated Lean and to the independently handwritten Lean reference. The probes include compile-time `example` assertions for expected types/definitional reductions and explicit `PSDIFF ...` semantic observations.

A semantic-equivalence case passes only if both programs are accepted by exact Lean 4.33.1, their canonical `PSDIFF` observation lines agree, and all case-specific expected observations are present. Full normalized Lean output from `#check`, `#print`, and `#reduce` is retained in the JSON report for auditing, but it is not compared byte-for-byte because harmless alpha-renaming or definitionally equal universe normalization can change Lean's pretty-printed form.

A negative-agreement case passes only when Lean rejects the reference. A capability-gap case passes only when the ProofScript side is `unsupported` and Lean accepts the reference.

## Harness self-test

`npm run test:differential:harness` uses a deliberately fake executable that reports version 4.33.1 solely to exercise harness control flow. It verifies the 16/3/2 classification split and all 15 required-dimension paths.

**The fake harness self-test is never semantic evidence.** Its report lives in a temporary directory and is not the canonical Lean report.

## Canonical report

The canonical machine-readable report is:

```text
artifacts/LEAN_4_33_1_DIFFERENTIAL_REPORT.json
```

When Lean is unavailable, all 21 ProofScript expectations and structured evidence checks are still executed. The case-level semantic result remains `unsupported` because the Lean side did not run. Capability gaps and negative cases retain their ProofScript-side status inside `proofscriptResult`; the outer differential status is not promoted to accepted.

## CI provisioning

`.github/workflows/ci.yml` has a separate `lean-4-33-1-differential` job. It downloads the official `v4.33.1` Linux release archive, verifies the pinned SHA-256 before execution, records the exact binary path in `PROOFSCRIPT_LEAN_BIN`, checks the reported version, runs the differential corpus, and uploads the machine-readable report.

This job is deliberately separate from the standalone job so a future oracle/tooling outage cannot turn Lean into an ordinary ProofScript runtime dependency.
