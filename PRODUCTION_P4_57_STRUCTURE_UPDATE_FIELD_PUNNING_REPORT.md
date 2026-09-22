# Production P4.57 — Structure Update Field Punning

## Scope

P4.57 adds bounded PSC-1 structure-update field punning:

```proofscript
function setX(p: Point, x: Nat): Point := {
  {p with x}
}
```

The parser treats a missing `:=` in an update field as same-name punning, so `{p with x}` becomes `{p with x := x}`. The elaborator then uses the existing checked structure-update path: infer the base structure type, verify the field exists, elaborate the punned value as an ordinary checked identifier, reconstruct unchanged fields through generated projections, build through the generated constructor, and emit JS only after Core checking.

## Boundary

This is not full Lean record-update elaboration. The supported subset is same-name punned fields over known parameterless single-constructor source structures. The punned identifier must resolve as an ordinary checked term in scope. Unknown fields, missing punned values, duplicate fields, non-structure bases, parameterized/dependent records, and dynamic JavaScript mutation remain unsupported/fail-closed.

## Files changed

- `packages/parser/src/index.ts`
- `packages/runtime/src/index.ts`
- `tools/structure-update-field-punning-tests.ts`
- `tools/pslive-smoke-lib.ts`
- `tools/reference-language-governance-smoke.ts`
- `examples/standalone-small/src/Main.ps`
- `packages/kernel/src/PSKernel/Verify/Obligations.ts`
- `package.json`

## New test command

```bash
npm run test:structure-update-field-punning
```

## TDD evidence

RED:

```txt
{p with x}
=> rejected: K3c-section-vars0 update fields currently require 'field := value'
```

GREEN:

```txt
STRUCTURE_UPDATE_FIELD_PUNNING=PASS
```

## Added proof obligation

```txt
ProofScript.Frontend.Structure.UpdateFieldPunning
```

Status: trusted-boundary / informal-spec / not-proven.
