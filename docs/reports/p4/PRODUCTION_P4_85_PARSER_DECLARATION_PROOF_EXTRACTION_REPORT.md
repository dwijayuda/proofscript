# Production P4.85 — Parser Declaration/Proof Extraction Report

## Summary

P4.85 continues the cleanup/refactor roadmap after P4.84 by reducing parser
sprawl without changing ProofScript semantics, kernel behavior, proof rules, or
backend/runtime behavior.

Main changes:

- extracted PSC-1 proof syntax parsing to `packages/parser/src/proofParser.ts`;
- extracted top-level declaration command dispatch to `packages/parser/src/declarationParser.ts`;
- kept the main `packages/parser/src/index.ts` as the stateful grammar owner for
  namespace, section-variable, binder, pattern, and term parsing;
- added regression/characterization tests for both extracted modules.

This is a behavior-preserving cleanup slice. It remains K3-TB trusted-boundary,
not fully formal K3, and not Lean 4 equivalent.

## Files changed

- `packages/parser/src/proofParser.ts` — new narrow proof parser module.
- `packages/parser/src/declarationParser.ts` — new declaration command dispatcher.
- `packages/parser/src/index.ts` — delegates proof parsing and declaration dispatch.
- `tools/parser-proof-extraction-tests.ts` — new proof extraction regression.
- `tools/parser-declaration-dispatch-extraction-tests.ts` — new declaration dispatch extraction regression.
- `package.json` — new parser cleanup test scripts and P4.85 metadata.
- `package-lock.json` — root version metadata aligned with P4.85.

## Preserved trust boundary

The extracted parser modules are above the trusted kernel boundary. They do not
add axioms, primitives, proof rules, or runtime authority. Proof terms still
lower into the same existing `SurfaceTerm` proof forms and are checked by the
existing frontend/elaborator/kernel path.

## Fresh verification

Fast verification was run for parser, language smoke, standalone smoke,
architecture guard, reference-governance JSON, and kernel status.

`verify:k3tb:publish` was not rerun because this environment still lacks the
expected `PROOFSCRIPT_LEAN_BIN` for Lean 4.33.1.

## Cleanup progress

- P4.76 parser tokenizer extraction — done
- P4.77 parser cursor extraction — done
- P4.78 parser sugar/lowering extraction — done
- P4.79 pslive core extraction — done
- P4.80 pslive test harness extraction — done
- P4.81 backend-typescript emitter split — done
- P4.82 runtime package split — done
- P4.83 reference-governance JSON hang fix — done
- P4.84 trust-boundary import guard — done
- P4.85 parser declaration/proof extraction — done

## Next recommended cleanup

P4.86 should split parser binder/level parsing or expression parsing. The main
parser is smaller, but it still owns too many independent grammar domains.
