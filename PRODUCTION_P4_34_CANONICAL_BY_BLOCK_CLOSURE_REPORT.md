# ProofScript Production P4.34 — Canonical By-Block Closure

Status: **PASS**

## Goal

Align the standalone PSC-1 parser and examples with the ProofScript v0.2.x final-source-extent rule. A theorem/example declaration whose proof is a self-delimited `by { ... }` block must close at the final `}` in standard PSC-1 mode. A trailing command-level `;` after that block is not canonical and is rejected unless a future explicit migration/source-preserving mode is introduced.

## User-facing correction

The canonical theorem spelling is now:

```ts
theorem exact_two_eq_two: 2 = 2 := by { exact two_eq_two }
```

not:

```ts
theorem exact_two_eq_two: 2 = 2 := by { exact two_eq_two };
```

## Implementation changes

- Updated `packages/parser/src/index.ts` so `closeProofDeclaration(selfDelimited = true)` rejects command-level `;` after a `by { ... }` theorem/example block.
- Updated `examples/standalone-small/src/Main.ps` to use canonical no-semicolon theorem/example endings.
- Updated `tools/pslive-smoke-lib.ts` so all semantic negative proof fixtures omit trailing theorem semicolons.
- Added standalone small smoke coverage for rejecting `theorem semicolon_after_by: 2 = 2 := by { rfl };`.
- Added reference-governance smoke coverage for the same rejection.
- Updated runtime feature text to say by-block declarations close at final `}` with no command semicolon.
- Updated `docs/WORKING_LANGUAGE_PROGRESS.md`.

## Verification

```bash
npm run build -- --pretty false
npm run test:fast-smoke
node tools/pskernel.ts preflight
node tools/pskernel.ts package-audit
node tools/pskernel.ts release-manifest
node tools/pskernel.ts tarball-smoke
node tools/pslive.ts check examples/standalone-small/src/Main.ps --json
node tools/pslive.ts run examples/standalone-small/src/Main.ps --call add2 --args 5 --json
```

Observed result:

```text
build: PASS
fast-smoke: PASS
standalone-small theorem terminator rejection: PASS
reference governance: PASS
preflight: PASS, checks=29, warnings=0, failures=0
package audit: PASS, checks=26, failures=0
release manifest: PASS, checks=9, failures=0
tarball smoke: PASS, checks=8, failures=0
pslive check: PASS
pslive run add2(5): 7
```

## Boundary

This is a canonical parser/conformance correction. It is not a full dynamic parser, not a full Lean tactic implementation, and not formal Lean 4 equivalence. The trust label remains: **trusted-boundary standalone small subset; not fully formally equivalent to Lean 4 yet**.
