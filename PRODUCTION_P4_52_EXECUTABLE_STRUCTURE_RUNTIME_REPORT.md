# P4.52 — Executable Structure Runtime Slice

Status: accepted smoke-tested trusted-boundary slice.

Trust label: trusted-boundary standalone small subset; not fully formally equivalent to Lean 4 yet.

## Scope

P4.52 makes parameterless single-constructor structures executable in the PSC-1 JavaScript backend after they have already passed the checked Core path.

```proofscript
structure Point: Type where {
  x: Nat;
  y: Nat;
}

def point: Point := {
  {x := 1, y := 2}
}

def pointX: Nat := {
  Point.x(point)
}

def pointY: Nat := {
  Point.y(point)
}

theorem point_x_eq_one: pointX = 1 := by { rfl }
theorem point_y_eq_two: pointY = 2 := by { rfl }
```

The accepted source elaborates to checked constructor/projection Core first. The JS backend then emits a bounded runtime representation for the same checked shape, not a separate JS-only record language.

## TDD result

RED:

```text
node tools/pslive.ts build-js /tmp/StructSmoke.ps --out /tmp/StructSmoke.js --json
=> rejected: unsupported executable Core constant 'Point.mk'
```

GREEN:

```text
Point.mk structure construction emits a frozen PSC-1 structure value.
Point.x / Point.y generated projections emit executable field projection functions.
pointX and pointY execute to 1 and 2.
Field type mismatch, missing field, and unknown field cases reject.
```

## Implementation notes

- `packages/backend-typescript/src/index.ts`
  - collects parameterless/indexless constructor metadata from Core inductive declarations
  - emits full constructor applications through `__ps.Struct_mk(...)`
  - emits partial constructor constants through `__ps.Struct_ctor(...)`
  - detects generated single-constructor projection definitions and emits direct `Struct_proj` wrappers
  - supports Core `proj` terms in the bounded executable subset

- `packages/runtime/src/index.ts`
  - adds `PsStructValue`
  - adds `Struct_mk`, `Struct_ctor`, and `Struct_proj`
  - documents structure runtime support and fail-closed ADT/runtime boundary

- `tools/pslive-smoke-lib.ts`
  - adds executable structure smoke and rfl theorem smoke
  - adds negative smoke for field type mismatch, missing field, and unknown field

- `tools/reference-language-governance-smoke.ts`
  - adds reference-governed executable structure/projection checks and negative checks

- `examples/standalone-small/src/Main.ps`
  - includes `Point`, `point`, `pointX`, `pointY`, and rfl theorems

- `packages/kernel/src/PSKernel/Verify/Obligations.ts`
  - adds `ProofScript.Runtime.Structure.ConstructorProjectionEncoding`

## Verified commands

```text
npm run build -- --pretty false
npm run test:standalone-small
npm run test:reference-governance
npm run test:kernel:smoke
npm run test:governance
node tools/pslive.ts check examples/standalone-small/src/Main.ps --json
node tools/pslive.ts build-js examples/standalone-small/src/Main.ps --out artifacts/standalone-small-main-p4-52.js --json
node tools/pslive.ts run examples/standalone-small/src/Main.ps --call pointX --json
node tools/pslive.ts run examples/standalone-small/src/Main.ps --call pointY --json
node tools/pskernel.ts package-audit --json
node tools/pskernel.ts tarball-smoke --json --pack-destination /tmp/p52tar-smoke-final2
node tools/pskernel.ts release-manifest --json --pack-destination /tmp/p52manifest-pack-final
node tools/pskernel.ts verify-release-manifest artifacts/p4-52-release-manifest-final.json --json --fresh --pack-destination /tmp/p52manifest-fresh-final
node tools/pskernel.ts verify-delivery --json --write-docs
```

Observed results:

```text
build: PASS
standalone-small: PASS, checkedDeclarations=63
reference-governance: PASS, checks=45
kernel smoke: PASS
governance: PASS, checks=27, warnings=0, failures=0
example check: accepted, declarations=65
example build-js: accepted
pointX: 1
pointY: 2
package-audit: accepted, failures=0
tarball-smoke: accepted, runtime=accepted
release-manifest: accepted, failures=0
verify-release-manifest --fresh: accepted, failures=0
verify-delivery: accepted, failures=0
```

Observed hashes before final delivery zip packaging:

```text
standaloneExampleSemanticSha256=b05b0381d0fda5460e12a22610d2127cab5251b652e64178b2d25f277eaa3b64
standaloneExampleOutputSha256=de2b1fbc3868fe6cb8e2ebd5f1fb12446f904c35c039f6f1c21caac1658cc873
referenceGovernanceSha256=9e73d24b5d6f8a27a612639366b57cc41c374ca3f3d37cd96bf489ebbf807e36
governanceSha256=2dc6bdf8115c5f3851d7701a2cf8726fac4ce83c9e725e857830bdec3fae19fa
packageAuditSha256=6086628bd52a70465440a9020383e57c1fdaa49d71b9c84f44c90022dbfa7f09
releaseManifestSha256=ab72850996ebe33fa66f1141bbfa6a2b4b69139ab8522fa493c2cc52868beef8
deliveryVerificationSha256=cc358e9077c14ebc69ca4008996c82dcf2c72c6b5e685d7f12f254d0016892e9
```

## Boundary

This is not full Lean structure/record runtime support. The executable slice is bounded to parameterless single-constructor structures with first-order fields. Structure parameters, dependent fields, class/typeclass runtime behavior, eta/theorem completeness beyond the checked subset, record update execution beyond already-supported checked terms, and general ADT interop remain fail-closed/trusted-boundary.

## Progress estimate

```text
Standalone PSC-1 without Lean4: ~94.4%
PSC-1 small complete programming language: ~63.0%
PSC-1 small theorem prover: ~59.8%
Full ProofScript compiler: ~55.5%
Full Lean-like ProofScript without Lean4: ~11.6%
Formal Lean 4 equivalence: 0 proven obligations
```
