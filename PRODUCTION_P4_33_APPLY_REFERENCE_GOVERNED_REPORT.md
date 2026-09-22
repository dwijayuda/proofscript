# P4.33 — Reference-Governed PSC-1 `apply` Proof Support

## Status

PASS.

This phase advances the standalone PSC-1 theorem-prover slice without requiring Lean4 at runtime.

## Added

- `SurfaceTerm.applyProof`.
- Parser support for `by { apply term }` and `by { apply term; nextProof }`.
- Elaborator support for exact-proof `apply` and one explicit generated premise.
- Smoke coverage for:
  - `apply h; assumption`
  - `apply h; exact hp`
  - direct exact `apply h`
  - unsolved generated premise rejection
  - wrong-premise rejection
- Local-context ordering fix: frontend local types are passed to the kernel in oldest-to-newest order so de Bruijn index 0 denotes the newest local declaration.

## Reference boundary

This phase follows the v0.2.x rule that ProofScript is semantically faithful to Lean 4.33.1 and changes surface shape without changing logical concepts. The tactic name `apply` is preserved as a Lean tactic concept and implemented only for the current PSC-1 subset.

## Still fail-closed

- Full Lean `apply` with metavariables.
- Hidden/instance premise synthesis inside `apply`.
- Dependent apply.
- Multi-goal tactic sequencing.
- Full tactic combinators and tactic macros.
- Formal Lean-equivalence proof.

## Fresh smoke commands

```bash
npm run test:fast-smoke
node tools/pskernel.ts preflight
node tools/pskernel.ts package-audit
node tools/pskernel.ts release-manifest
node tools/pslive.ts check examples/standalone-small/src/Main.ps --json
node tools/pslive.ts build-js examples/standalone-small/src/Main.ps --out artifacts/standalone-small-main-p4-33.js --json
node artifacts/standalone-small-main-p4-33.js
node tools/pslive.ts run examples/standalone-small/src/Main.ps --call add2 --args 5 --json
```

## Trust label

trusted-boundary standalone small subset; not fully formally equivalent to Lean 4 yet.
