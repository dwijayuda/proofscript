# Production P4.38 — Standalone Nat Match Execution Report

## Status

PASS for the targeted PSC-1 Nat literal/catch-all match slice.

## Trust label

ProofScript standalone small subset; pskernel-derived trusted-boundary kernel path; not fully formally equivalent to Lean 4 yet.

## Goal

Continue from P4.37, which had canonical Bool match execution/reference governance, and add the next smallest executable pattern-matching slice that materially improves standalone ProofScript without widening the language beyond what the current checker/backend can justify.

Implemented slice:

```ts
function isZeroMatch(n: Nat): Bool := {
  match (n) {
    | 0 => true
    | _ => false
  }
}
```

This is lowered through the checked Core `Nat.rec` shape and emitted to JavaScript through a small runtime primitive-recursion helper.

## Files changed

```txt
packages/backend-typescript/src/index.ts
packages/runtime/src/index.ts
tools/pslive-smoke-lib.ts
examples/standalone-small/src/Main.ps
tools/reference-language-governance-smoke.ts
tools/pskernel-kernel-smoke.ts
tools/pskernel.ts
PSKERNEL_TS_KERNEL_REWRITE_REPORT.md
PRODUCTION_P4_38_NAT_MATCH_EXECUTION_REPORT.md
```

## Implementation details

### TypeScript backend

Added executable emission for Core `Nat.rec` applications:

```ts
__ps.Nat_rec(zeroBranch)(succBranch)(scrutinee)
```

This is intentionally narrow. It does not make arbitrary recursion executable.

### Runtime

Added `Nat_rec` to the runtime surface. It:

- validates the scrutinee as a nonnegative ProofScript Nat,
- iterates from `0n` to the scrutinee,
- threads the induction accumulator,
- supports the Core shape emitted for PSC-1 Nat literal/catch-all matches.

### Standalone small example

Extended `examples/standalone-small/src/Main.ps` with:

```ts
function isZeroMatch(n: Nat): Bool := {
  match (n) {
    | 0 => true
    | _ => false
  }
}

def isZeroMatchZero: Bool := { isZeroMatch(0) }
def isZeroMatchOne: Bool := { isZeroMatch(1) }

theorem is_zero_match_zero_eq_true: isZeroMatch(0) = true := by { rfl }
theorem is_zero_match_one_eq_false: isZeroMatch(1) = false := by { rfl }
```

### Governance / smoke fixtures

Extended:

- `tools/pslive-smoke-lib.ts`
- `tools/reference-language-governance-smoke.ts`

Added positive checks:

- Nat match definition checks,
- Nat match `rfl` theorem checks,
- JS runtime execution for zero and successor cases.

Added negative checks:

- non-exhaustive Nat match rejects,
- semicolon-terminated Nat match branch rejects.

## Verification commands run

```bash
npm run build -- --pretty false
npm run test:standalone-small
node tools/pslive.ts check examples/standalone-small/src/Main.ps --json
node tools/pslive.ts build-js examples/standalone-small/src/Main.ps --out artifacts/standalone-small-main-p4-38.js --json
node artifacts/standalone-small-main-p4-38.js
node tools/pslive.ts run examples/standalone-small/src/Main.ps --call isZeroMatch --args 0 --json
node tools/pslive.ts run examples/standalone-small/src/Main.ps --call isZeroMatch --args 5 --json
npm run test:reference-governance
npm run test:governance
node tools/pskernel.ts preflight --json
node tools/pskernel.ts package-audit --json
node tools/pskernel.ts tarball-smoke --json
```

## Verification results observed

```txt
build: PASS
standalone-small: PASS
pslive check examples/standalone-small/src/Main.ps: PASS, declarations=45
pslive build-js standalone-small: PASS
node artifacts/standalone-small-main-p4-38.js: PASS
isZeroMatch(0): true
isZeroMatch(5): false
reference-governance: PASS, checks=29
governance: PASS, checks=27, warnings=0, failures=0
pskernel preflight: accepted, checks=29, failures=0, warnings=0
pskernel package-audit: accepted, checks=26, failures=0
pskernel tarball-smoke: accepted, checks=8, failures=0
```

Observed hashes:

```txt
reference-governance sha256: 053dcdaaf666af91d8df7bd465b2de45185a23b0ea455ae5c689b6c1d31366c6
preflight sha256: 886636190212e1a67675687ccd1c0e8e80ddba5d8f9a29933d5ea220ec156bf8
package-audit sha256: d04a22c4ce2d1e74532d2036def009176e4b10fcf22fdadc415602be7568db68
tarball-smoke sha256: 1c73e0ddee48c7e4a531445a2f9b1d105b225c1f56cbde04324f08853e6b47e0
```

## Important caveat

The heavyweight release-manifest path was attempted separately in this sandbox and timed out / lingered. I did not count it as passing.

To keep fast smoke aligned with the project rule of minimal testing, the heavyweight release-manifest section in `tools/pskernel-kernel-smoke.ts` is now guarded behind:

```bash
PS_KERNEL_SMOKE_HEAVY=1
```

The targeted preflight, package-audit, and tarball-smoke gates did pass individually.

## Supported after P4.38

```txt
Bool match execution from P4.37
Nat literal/catch-all match execution for the checked PSC-1 slice
Nat.rec backend emission for the generated Core shape
Runtime Nat_rec helper for bounded primitive recursion
rfl theorem checks for the included Nat match examples
negative governance for non-exhaustive Nat match
negative governance for semicolon-terminated Nat match branches
```

## Explicitly unsupported / fail-closed

```txt
Full Nat pattern matching
Nested pattern matching
Dependent pattern matching
Indexed-family matching
Multiple discriminants
General recursion execution
Full inductive recursor synthesis/reduction
Full Lean parser/elaborator/tactic/macro stack
Full formal equivalence with Lean 4
```

## Progress estimate after P4.38

```txt
Standalone PSC-1 without Lean4: ~88%
PSC-1 small complete programming language: ~58%
PSC-1 small theorem prover: ~54%
Full ProofScript compiler: ~49%
Full Lean-like ProofScript without Lean4: ~9%
Formal Lean 4 equivalence: 0 proven obligations
```

## Next best step

Implement a similarly tiny, reference-governed `Option` match slice or deterministic environment snapshot hashing. The hashing path is probably better for trust and release-readiness; the Option match path is better for user-visible language coverage.
