# ProofScript Production P4.56 — Structure Update Base Expression

## Trust label

Trusted-boundary standalone small subset; not fully formally equivalent to Lean 4 yet.

## Scope

P4.56 extends the bounded PSC-1 structure update slice so update bases can be checked parenthesized expressions, not only a simple source identifier. This keeps update sugar in the frontend/kernel path: the base expression is parsed, elaborated, type-inferred, reconstructed through generated checked projections/constructors, and only then emitted to JavaScript.

## Newly accepted bounded syntax

```proofscript
structure Point: Type where {
  x: Nat;
  y: Nat;
}
structure Box: Type where {
  p: Point;
  label: Nat;
}

def point: Point := { {x := 1, y := 2} }
def box: Box := { {p := point, label := 9} }

def pointFromParenBase: Point := {
  {(point) with x := 4}
}

def pointFromDottedParenBase: Point := {
  {(box.p) with y := 6}
}

def parenBaseX: Nat := { pointFromParenBase.x }
def parenBaseY: Nat := { pointFromParenBase.y }
def dottedParenBaseX: Nat := { pointFromDottedParenBase.x }
def dottedParenBaseY: Nat := { pointFromDottedParenBase.y }

theorem paren_base_x_eq_four: parenBaseX = 4 := by { rfl }
theorem paren_base_y_eq_two: parenBaseY = 2 := by { rfl }
theorem dotted_paren_base_x_eq_one: dottedParenBaseX = 1 := by { rfl }
theorem dotted_paren_base_y_eq_six: dottedParenBaseY = 6 := by { rfl }
```

## Implementation changes

- `packages/parser/src/index.ts`
  - Added bounded parenthesized structure-update base parsing.
  - Added shared `parseStructureUpdateFields()` helper.
  - Preserved the existing simple identifier/dotted-name update form.
  - A parenthesized structure update must be followed by `with`, preventing ambiguous structure literal parsing.

- `packages/elaborator/src/index.ts`
  - Reused existing checked `elab(structUpdate)` and `elaborateStructureUpdateCore(...)` path.
  - No backend-only mutation semantics added.

- `packages/runtime/src/index.ts`
  - Updated PSC-1 supported feature manifest.

- `tools/structure-update-base-expression-tests.ts`
  - Added focused RED/GREEN regression test.

- `tools/pslive-smoke-lib.ts`
  - Added standalone smoke coverage and runtime assertions.

- `tools/reference-language-governance-smoke.ts`
  - Added reference-governed acceptance, rfl, JS emission, runtime, and rejection checks.

- `packages/kernel/src/PSKernel/Verify/Obligations.ts`
  - Added proof obligation:
    - `ProofScript.Frontend.Structure.ParenthesizedUpdateBase`

## TDD result

RED:

```txt
{(point) with x := 4}
=> rejected: expected structure instance field at offset ..., found '('
```

GREEN:

```txt
STRUCTURE_UPDATE_BASE_EXPRESSION=PASS
```

## Fresh verification

```bash
npm run build -- --pretty false
npm run test:structure-update-base-expression
npm run test:standalone-small
npm run test:reference-governance
npm run test:kernel:smoke
npm run test:governance
node tools/pslive.ts check examples/standalone-small/src/Main.ps --json
node tools/pslive.ts build-js examples/standalone-small/src/Main.ps --out artifacts/standalone-small-main-p4-56.js --json
node tools/pslive.ts run examples/standalone-small/src/Main.ps --call parenBaseX --json
node tools/pslive.ts run examples/standalone-small/src/Main.ps --call parenBaseY --json
node tools/pslive.ts run examples/standalone-small/src/Main.ps --call dottedParenBaseX --json
node tools/pslive.ts run examples/standalone-small/src/Main.ps --call dottedParenBaseY --json
node tools/pskernel.ts package-audit --json
node tools/pskernel.ts tarball-smoke --json --pack-destination /tmp/p56tar-smoke-final
node tools/pskernel.ts release-manifest --json --pack-destination /tmp/p56manifest-pack-final
node tools/pskernel.ts verify-release-manifest artifacts/p4-56-release-manifest-final.json --json --fresh --pack-destination /tmp/p56manifest-fresh-final
```

Result:

```txt
build: PASS
structure-update-base-expression: PASS
standalone-small: PASS, checkedDeclarations=98
reference-governance: PASS, checks=65
kernel smoke: PASS
governance: PASS, checks=27, warnings=0, failures=0
example check: accepted, declarations=100
example build-js: accepted
parenBaseX: 4
parenBaseY: 2
dottedParenBaseX: 1
dottedParenBaseY: 6
package-audit: accepted, failures=0
tarball-smoke: accepted, runtime=accepted
release-manifest: accepted, failures=0
verify-release-manifest --fresh: accepted, failures=0, checks=30
```

## Observed hashes

```txt
standaloneExampleSemanticSha256=450a6bee62548f3eac247f353b8211a9ff5c8320aac8da132e39458d9d45e0b0
standaloneExampleOutputSha256=188205b56611f5218e729d8e59928485265b84ac1f629bf56e99460deb4edd1f
referenceGovernanceSha256=7c5e6aecf67e53c2447699eba7afc1ccb23f7847fd505eedbde75a761b0a1339
packageAuditSha256=191e2c676aecffa327eec004d6fb8e8bfc6ce7333e290d04880a764658b85d19
tarballSmokeSha256=05ecdd03e6b1116e0d2ef3d4d0662a9a09b9a37bf666246e16060db6f3855d55
releaseManifestSha256=2ce510aeaf4bad1320f472c6db8eb8c7d90dcd1a45683c1574a420ae7a9eef55
```

## Progress estimate

```txt
Standalone PSC-1 without Lean4: ~95.1%
PSC-1 small complete programming language: ~65.0%
PSC-1 small theorem prover: ~60.5%
Full ProofScript compiler: ~56.5%
Full Lean-like ProofScript without Lean4: ~12.3%
Formal Lean 4 equivalence: 0 proven obligations
```

## Boundary

This is not full Lean record-update elaboration. It is a bounded PSC-1 extension for parenthesized checked base expressions whose inferred type is a known parameterless single-constructor source structure. Unparenthesized arbitrary update bases, parameterized/dependent structures, parser-level field punning in updates, dynamic JavaScript mutation, and full Lean record-update behavior remain unsupported/fail-closed.
