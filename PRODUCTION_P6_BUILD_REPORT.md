# Production P6 Build Report

Profile: PRODUCTION-P6-bounded-string
Patch level: P6.19 v71 trusted-boundary K3-TB default kernel + strict Lean environment doctor + default consistency guard + CI publish-parity gate + one-command doctor guard
Core format: v71
Kernel profile: KERNEL-level-instantiation-conformance1
Kernel boundary: trusted-boundary K3-TB
Frozen rollback base: Production P5 module namespaces
Trusted kernel changes: none

## Scope

P6 adds bounded executable `String` semantics above the frozen trusted kernel. The unified bridge lowers source `String` values to a checked finite literal-domain inductive, `ProofScript.Core.P6.String`, and lowers primitive String equality to a checked finite-domain equality function, `ProofScript.Core.P6.String.beq`. TypeScript output uses native `string` and `===` only after the source has been lowered to accepted Core and independently replayable artifacts.

P6.1 hardens the correspondence by canonicalizing portable Lean String escapes before assigning Core constructors. Equivalent source spellings such as `"A"`, `"\x41"`, and `"\u0041"` now share one checked Core constructor instead of becoming different finite-domain values.

P6.2 adds the fastest safe concat slice: literal-only `++` constant folding. A source expression such as `"he" ++ "llo"` is decoded with the same portable Lean String escape rules, folded before Core lowering, and then emitted as an ordinary checked finite-domain String literal. Non-literal/runtime append remains rejected so P6 does not accidentally claim an unbounded String domain.

P6.3 adds literal-only `String.length`. The operand must elaborate to a checked String literal, including a literal-only `++` folded result. The decoded portable Lean character count is emitted as an ordinary Nat literal in frozen Core, so this does not introduce a String-length primitive or runtime String API to the trusted kernel.

P6.4 adds literal-only `String.isEmpty`. The operand must elaborate to a checked String literal, including a literal-only `++` folded result. The decoded portable Lean value is folded to an ordinary Bool constructor in frozen Core, so this does not introduce a String predicate primitive or runtime String API to the trusted kernel.

P6.5 adds literal-only `String.startsWith` and `String.endsWith`. Both operands must elaborate to checked String literals, including literal-only `++` folded results. The decoded portable Lean values are folded to ordinary Bool constructors in frozen Core, so no runtime String predicate primitive is added to the trusted kernel.

P6.6 adds literal-only `String.contains`. Both operands must elaborate to checked String literals, including literal-only `++` folded results. The decoded portable Lean values are folded to ordinary Bool constructors in frozen Core, so no runtime String predicate primitive is added to the trusted kernel.

P6.7 adds literal-only `String.utf8ByteSize`. The operand must elaborate to a checked String literal, including a literal-only `++` folded result. The decoded portable Lean UTF-8 byte count is emitted as an ordinary Nat literal in frozen Core, so this does not introduce a String byte-size primitive or runtime String API to the trusted kernel.

P6.8 adds literal-only `String.append` as a function form for the same append semantics as `++`. P6.9 adds literal-only `String.take` and `String.drop`; P6.10 adds literal-only `String.takeRight` and `String.dropRight`. For all four slicing forms, the subject must be literal-foldable and the count must be a Nat literal or known literal String size. Runtime append/take/drop/takeRight/dropRight remain fail-closed. P6.11 adds literal-only `String.beq` as a function form for checked decoded-literal String equality; runtime/non-literal `String.beq` remains fail-closed. P6.12 adds literal-only `String.isPrefixOf` using Lean-compatible prefix-first argument order; runtime/non-literal operands remain fail-closed. P6.13 adds literal-only `String.stripPrefix` and `String.stripSuffix`, returning checked bounded String constructors after decoded literal/folded affix removal; runtime/non-literal operands remain fail-closed. P6.14 adds literal-only `String.isNat`, folding decoded literal/folded String values to checked Bool constructors for non-empty decimal Nat strings; runtime/non-literal operands remain fail-closed.

## Completed gates

- Production P6 bounded String gate: PASS
- Canonical escaped-literal identity regression: PASS
- Literal-only `++` String folding regression: PASS
- Literal-only `String.length` folding regression: PASS
- Literal-only `String.utf8ByteSize` folding regression: PASS
- Literal-only `String.append` function folding regression: PASS
- Nested literal `String.append` consumer regression: PASS
- Literal-only `String.isEmpty` folding regression: PASS
- Literal-only `String.startsWith` / `String.endsWith` regression: PASS
- Literal-only `String.contains` regression: PASS
- Literal-only `String.beq` function regression: PASS
- Literal-only `String.stripPrefix` / `String.stripSuffix` regression: PASS
- Literal-only `String.take` / `String.drop` regression: PASS
- Literal-only `String.takeRight` / `String.dropRight` regression: PASS
- Non-literal/runtime String `++` rejection: PASS
- Non-literal/runtime `String.length` rejection: PASS
- Non-literal/runtime `String.utf8ByteSize` rejection: PASS
- Non-literal/runtime `String.isEmpty` rejection: PASS
- Non-literal/runtime `String.startsWith` / `String.endsWith` rejection: PASS
- Non-literal/runtime `String.contains` rejection: PASS
- Non-literal/runtime `String.beq` rejection: PASS
- Non-literal/runtime `String.stripPrefix` / `String.stripSuffix` rejection: PASS
- Non-literal/runtime `String.take` / `String.drop` rejection: PASS
- Non-literal/runtime `String.takeRight` / `String.dropRight` rejection: PASS
- Standalone `.pscore` replay: PASS
- TypeScript compile/runtime correspondence: PASS
- Optional exact Lean gate: supported only when `PROOFSCRIPT_LEAN_BIN` points to exact Lean 4.33.1; otherwise it is skipped by the focused fixture
- Core String inductive tamper rejection: PASS
- Core String equality-body tamper rejection: PASS
- Production P5 namespace/project gate: PASS
- Production P4 module gate: PASS
- Production P3 gates: PASS
- Production P2 gate: PASS
- Production P1 gate: PASS
- WaveA–WaveH compatibility: PASS
- UI0–UI4 compatibility: PASS
- coverage matrix: PASS
- architecture boundaries: PASS
- K0–K2r conformance corpus: PASS

## Sandbox reproduction evidence

Commands run in this snapshot:

```bash
npm install --ignore-scripts
npm run build
npm run test:production-p6:string
npm run verify:production:no-build
```

Observed result: `verify:production:no-build` completed all 30 production gates successfully after a clean build. `npm run test:v71:k3tb-lean-env-doctor` passed. `npm run doctor:k3tb` reported `BLOCKED_MISSING_PROOFSCRIPT_LEAN_BIN`, and `npm run verify:k3tb:publish` remains blocked here because the sandbox does not provide exact Lean 4.33.1.

## Trust boundary

P6.15 intentionally changed the practical/default trusted kernel source to the uploaded v71 K3-TB kernel. P6.16 adds strict Lean environment diagnostics for the publish gate without changing kernel semantics. P6 bounded String remains above the trust boundary; its claims become valid only after the generated Core artifact is accepted by `KERNEL-level-instantiation-conformance1` and replayed by the standalone verifier. This is trusted-boundary K3-TB, not fully formal K3.

## Deliberate non-claims

P6 does not claim full Lean `String`, arbitrary Unicode/string APIs, arbitrary/runtime append beyond literal-only folding, runtime String length, runtime String byte-size queries, arbitrary/runtime String predicates or strip functions, interpolation, `Char`, `Substring`, arrays, byte arrays, IO/effects, package-level separate Core module artifacts, or full frontend-to-Core coverage. P6.14 only claims literal-only `++`, literal-only `String.append`, literal-only `String.take`, literal-only `String.drop`, literal-only `String.takeRight`, literal-only `String.dropRight`, literal-only `String.length`, literal-only `String.utf8ByteSize`, literal-only `String.isEmpty`, literal-only `String.startsWith` / `String.endsWith`, literal-only `String.contains`, literal-only `String.isPrefixOf`, literal-only `String.beq`, literal-only `String.stripPrefix`, literal-only `String.stripSuffix`, and literal-only `String.isNat` folding before Core lowering.


## P6.17 default-kernel consistency

P6.17 adds `test:v71:k3tb-default-consistency` to keep current/default metadata aligned with `KERNEL-level-instantiation-conformance1` / Core v71 / trusted-boundary K3-TB. It rejects package/provenance version drift and stale active-bridge Core v68 wording. This does not change trusted kernel semantics and does not claim fully formal K3.


## P6.18 CI publish parity

P6.18 adds `test:v71:k3tb-ci-publish-parity` and includes it in `npm run verify:production:no-build`. The guard statically verifies that GitHub Actions runs the local production verifier and the exact `npm run verify:k3tb:publish` path after installing pinned Lean 4.33.1. The CI publish preflight does not run `npm publish`; it preserves the trusted-boundary K3-TB / not fully formal K3 label.


## P6.19 one-command doctor guard

P6.19 makes `npm run verify:k3tb` run the strict Lean environment doctor before Lean-dependent K3-TB verification. Missing or mismatched Lean now fails closed with `K3TB_LEAN_ENV_STATUS=...`, expected Lean 4.33.1, expected commit, and next action instead of an opaque assertion. This remains trusted-boundary K3-TB and not fully formal K3.
