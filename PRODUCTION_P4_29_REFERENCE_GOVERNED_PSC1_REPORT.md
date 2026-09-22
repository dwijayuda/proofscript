# Production P4.29 — Reference-Governed PSC-1 Language Surface Report

## Status

Accepted as a fast-smoke development milestone.

This milestone governs the standalone PSC-1 language surface with the uploaded ProofScript v0.2.1 language reference and grammar/parser specification. It does not claim full ProofScript, full Lean compatibility, or formal Lean equivalence.

## Source of governance

- `docs/reference/ProofScript_Language_Reference_v0.2.1_authoritative_prepublic.md`
- `docs/reference/ProofScript_Grammar_and_Parser_Specification_v0.2.1_prepublic_review.md`

Both files are pinned to Lean revision `819816b2e0a3bf405af45ae5c7af2491d8f5bee6`.

## Implemented changes

- Copied the current reference files into `docs/reference/`.
- Added `tools/reference-language-governance-smoke.ts`.
- Added npm scripts:
  - `test:reference-governance`
  - `test:reference-governance:json`
  - `test:reference-governance:write-docs`
- Added reference governance to `test:fast-smoke`.
- Extended governance check to require the checked-in reference files and pinned baseline.
- Implemented PSC-1 `const` alias parsing as a binderless top-level alias to checked `def`.
- Implemented PSC-1 `function` alias parsing as a typed-binder alias to checked `def`.
- Implemented canonical `where { ... }` acceptance for simple `inductive`, `structure`, and `class` declarations.
- Implemented canonical constructor entries without required semicolon for simple inductives.
- Added explicit rejection for JavaScript `//` source comments in standard ProofScript.
- Added explicit rejection for arrow-only lambda syntax, directing users to `fun`.
- Updated the standalone example to use reference-governed syntax.
- Updated the JS backend to skip generated simple structure/class projection declarations instead of failing whole-module JS emission when those generated declarations are not executable in PSC-1.

## Live accepted PSC-1 surface after this milestone

```ts
-- Lean-compatible comment

const two: Nat := { 2 }

function add2(x: Nat): Nat := {
  Nat.add(x, 2)
}

inductive Tiny: Type where {
  | mk
}

structure Point: Type where {
  x: Nat;
  y: Nat;
}

theorem add2_two_eq_four: add2(2) = 4 := by { rfl };
```

## Fail-closed source behavior

- `// comment` rejects.
- `(x: Nat) => x` rejects; use `fun (x: Nat) => x`.
- Macros, dynamic syntax, general tactics, full typeclasses, modules as runtime namespaces, general recursion execution, and String/UInt/Float semantics remain unsupported.

## Verification commands

```bash
npm install --ignore-scripts --silent
npm run build -- --pretty false
npm run test:fast-smoke
node tools/pskernel.ts preflight
node tools/pslive.ts check examples/standalone-small/src/Main.ps --json
node tools/pslive.ts run examples/standalone-small/src/Main.ps --call add2 --args 5 --json
```

## Verification result

```txt
build: PASS
kernel smoke: PASS
standalone small smoke: PASS
governance check: PASS
reference governance smoke: PASS
preflight: PASS
pslive check example: PASS
pslive run add2(5): 7
```

## Evidence hashes

- `referenceGovernanceSha256`: see `docs/REFERENCE_LANGUAGE_GOVERNANCE_SMOKE.json`
- `governanceSha256`: see `docs/GOVERNANCE_COMPLIANCE_SMOKE.json`
- `preflightSha256`: see `docs/PSKERNEL_TS_RELEASE_PREFLIGHT.json`

## Progress toward goals

- Standalone PSC-1 without Lean4: live and more reference-governed.
- Small PSC-1 language completeness: improved by aliases, canonical declarations, comments, and lambda boundary.
- Full ProofScript: still long-term.
- Formal Lean equivalence: not claimed.

## Trust label

Trusted-boundary standalone small subset; not fully formally equivalent to Lean 4 yet.
