# ProofScript Standalone Kernel Maturity Replacement P4.69

## Status

P4.69 adds a practical PSC-1 language/frontend improvement: Lean-style Nat addition infix syntax is parsed, elaborated through the existing checked `Nat.add` bootstrap declaration, and emitted through the existing JavaScript/TypeScript runtime lowering.

This is an MVP language-surface improvement, not a kernel equivalence upgrade.

## New capability

```proofscript
function addThree(x: Nat): Nat := { x + 3 }
def seven: Nat := { 3 + 4 }
def nested: Nat := { 1 + 2 + 3 }
theorem nested_eq_six: nested = 6 := by { rfl }
```

The parser lowers `a + b` to an ordinary surface application of `Nat.add(a, b)`. The existing elaborator and kernel checker then enforce that both operands are `Nat`; non-Nat operands remain rejected before emission.

## Files changed

- `packages/parser/src/index.ts`
- `packages/parser/dist/index.js`
- `packages/parser/dist/index.d.ts` / maps from build
- `packages/runtime/src/index.ts`
- `packages/runtime/dist/index.js`
- `packages/runtime/dist/index.d.ts` / maps from build
- `tools/pslive-nat-plus-tests.ts`
- `package.json`
- `PRODUCTION_P4_69_NAT_PLUS_SUGAR_REPORT.md`
- `P4_69_VERIFICATION_SUMMARY.json`

## Verification summary

Fresh commands run in this workspace:

```txt
npm run build -- --pretty false                 PASS
npm run test:pslive:nat-plus                    PASS
npm run test:pslive:reserved-identifiers        PASS
npm run test:pslive:js-name-collision           PASS
npm run test:pslive:build-ts                    PASS
npm run test:standalone-small                   PASS
npm run test:kernel:typechecker                 PASS, 43/43
npm run test:kernel:smoke                       PASS
npm run test:governance                         PASS, 27 checks
node tools/pskernel.ts status --json           PASS, trusted-boundary / not-proven
npm run verify:k3tb:publish                     BLOCKED: missing PROOFSCRIPT_LEAN_BIN for Lean 4.33.1
```

A fresh-extract package smoke also ran after packaging.

## Trust boundary

P4.69 remains K3-TB trusted-boundary:

- No full Lean 4 kernel equivalence is claimed.
- No fully formal K3 theorem is claimed.
- Formal Lean 4 equivalence remains 0 proven obligations in this release line.
