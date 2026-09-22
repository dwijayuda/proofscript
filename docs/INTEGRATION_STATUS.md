# Unified Integration Status

## PRODUCTION-P6.16 — v71 trusted-boundary K3-TB default kernel + strict Lean environment doctor

- Default practical kernel: `KERNEL-level-instantiation-conformance1` / Core v71.
- Boundary label: **trusted-boundary K3-TB**.
- Not fully formal K3; v72 owns fully formal K3.
- Historical rollback/reference kernel: `KERNEL-resource-bounds0` / Core v68.
- P6.14 bounded String work is preserved above the trust boundary and emits/checks through the v71 default production bridge.
- P6.16 adds `doctor:k3tb` and a strict publish-verifier doctor phase so missing/wrong Lean is reported precisely without weakening the publish gate.
- Local verification in this sandbox: `npm run clean`, `npm run build`, `npm run test:v71:local-merged`, `npm run test:production-p6:string`, `npm run test:v71:k3tb-lean-env-doctor`, and `npm run verify:production:no-build` passed.
- Requested publish gate was run and blocked by the strict doctor with `K3TB_LEAN_ENV_STATUS=BLOCKED_MISSING_PROOFSCRIPT_LEAN_BIN`. The gate remains strict; it was not weakened.

## Kernel bases

- Practical/default trusted kernel: `KERNEL-level-instantiation-conformance1` / Core v71 / trusted-boundary K3-TB.
- Historical rollback/reference kernel: `KERNEL-resource-bounds0` / Core v68 / certificate v2.
- Immediate integration rollback: `PRODUCTION-P6.14` with historical Core v68 bridge.
- Lean semantic oracle: 4.33.1, commit `819816b2e0a3bf405af45ae5c7af2491d8f5bee6`.

## PRODUCTION-P6 — verified candidate

Profile: `PRODUCTION-P6-bounded-string`. As of P6.15, the production bridge emits Core v71 under `KERNEL-level-instantiation-conformance1`; bounded String remains an above-trust-boundary lowering slice and does not add a trusted String primitive.

P6 adds the first bounded executable `String` slice to the unified production path without adding a trusted String primitive:

- source `String` types lower to the checked finite-domain inductive `ProofScript.Core.P6.String`;
- each literal value used by the artifact becomes one checked constructor;
- primitive `String == String` lowers to the checked function `ProofScript.Core.P6.String.beq`;
- literal-only `String ++ String` folds before Core lowering into one canonical checked String literal;
- literal-only `String.length` folds decoded portable String literals and folded concat outputs into checked Nat character-count literals;
- literal-only `String.utf8ByteSize` folds decoded portable String literals and folded concat outputs into checked Nat byte-count literals;
- literal-only `String.isEmpty` folds decoded portable String literals and folded concat outputs into checked Bool constructors;
- literal-only `String.startsWith` / `String.isPrefixOf` / `String.endsWith` folds decoded portable String literal operands and folded concat outputs into checked Bool constructors;
- Bool branches may consume those equality results through the existing checked Bool/control path;
- functions, local lets, and monomorphic closures may pass and capture bounded String values;
- TypeScript emits native `string` values and `===` only for this checked bounded slice;
- standalone replay and tamper rejection still use the existing verifier/kernel path.

## P6.1 hardening

The P6.1 patch closes a semantic-correspondence bug in the finite-domain model: constructor identity is now keyed by the decoded portable Lean literal value, not raw source spelling. Therefore equivalent source spellings such as `"A"`, `"\x41"`, and `"\u0041"` share one checked Core constructor and compare equal in Core, reconstructed Lean, and TypeScript.

## Regression evidence

- P6 focused String gate: PASS.
- Canonical escaped-literal identity: PASS; `"A" == "\x41"` and `"A" == "\u0041"` both evaluate to true, and the checked Core String domain shares constructors by decoded value rather than raw spelling.
- Literal-only concat folding: PASS; `"he" ++ "llo"`, `"y" ++ "es"`, and escaped `"\x41" ++ "\u0042"` fold to checked literals before Core lowering.
- Literal-only length folding: PASS; `String.length("hello")`, `String.length("\x41")`, and `String.length("he" ++ "llo")` fold to checked Nat character-count literals.
- Literal-only `String.append` function folding: PASS; `String.append("he", "llo")` folds to the same checked String value as `"hello"`, and nested `String.length(String.append(...))` / `String.contains(String.append(...))` fold through the same path.
- Literal-only UTF-8 byte-size folding: PASS; `String.utf8ByteSize("hello")`, `String.utf8ByteSize("\u2200")`, and `String.utf8ByteSize("\x41" ++ "\u2200")` fold to checked Nat byte-count literals.
- Literal-only isEmpty folding: PASS; `String.isEmpty("")`, `String.isEmpty("hello")`, and `String.isEmpty("a" ++ "b")` fold to checked Bool constructors.
- Literal-only prefix/isPrefixOf/suffix predicate folding: PASS; `String.startsWith("hello", "he")`, `String.startsWith("he" ++ "llo", "hell")`, `String.isPrefixOf("hell", "he" ++ "llo")`, `String.endsWith("hello", "lo")`, and `String.endsWith("he" ++ "llo", "llo")` fold to checked Bool constructors.
- Literal-only contains predicate folding: PASS; `String.contains("hello", "ell")`, `String.contains("he" ++ "llo", "ell")`, and escaped `String.contains("\x41\u0042", "AB")` fold to checked Bool constructors.
- Non-literal concat rejection: PASS; `s ++ "!"` fails closed in the bounded P6 slice.
- Non-literal length rejection: PASS; `String.length(s)` fails closed in the bounded P6 slice.
- Non-literal UTF-8 byte-size rejection: PASS; `String.utf8ByteSize(s)` fails closed in the bounded P6 slice.
- Non-literal isEmpty rejection: PASS; `String.isEmpty(s)` fails closed in the bounded P6 slice.
- Non-literal prefix/isPrefixOf/suffix rejection: PASS; both subject and prefix/suffix operands must be literal in the bounded P6 slice, and `String.isPrefixOf` also rejects non-literal prefix-first operands.
- Non-literal contains rejection: PASS; both subject and needle operands must be literal in the bounded P6 slice.
- P5, P4, P3, P2, P1 compatibility gates: PASS.
- WaveA–WaveH compatibility gates: PASS.
- UI0–UI4 compatibility gates: PASS.
- Coverage matrix: PASS; 101 language features and 30 registered Core operation lowerings; production verifier now runs 27 gates including K3-TB environment-doctor coverage.
- Architecture boundaries: PASS.
- K0–K2r conformance smoke corpus: PASS.

## Deliberate non-claims

P6 does **not** claim full Lean `String`, arbitrary Unicode/string APIs, arbitrary/runtime append beyond literal-only folding, runtime String length, runtime String byte-size queries, arbitrary/runtime String predicates, equality functions, or strip functions, interpolation, `Char`, `Substring`, arrays, byte arrays, IO/effects, package-level separate Core module artifacts, or full frontend-to-Core coverage. P6.14 claims only literal-only `++`, literal-only `String.append`, literal-only `String.take`, literal-only `String.drop`, literal-only `String.takeRight`, literal-only `String.dropRight`, literal-only `String.length`, literal-only `String.utf8ByteSize`, literal-only `String.isEmpty`, literal-only `String.startsWith` / `String.endsWith`, literal-only `String.contains`, literal-only `String.isPrefixOf`, literal-only `String.beq`, literal-only `String.stripPrefix`, literal-only `String.stripSuffix`, and literal-only `String.isNat` folding before Core lowering. Unsupported neighboring behavior remains fail-closed.
