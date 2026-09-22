# P4.50 — Multi-Literal Nat Match Desugaring

Trust label: `trusted-boundary standalone kernel; not fully formally equivalent to Lean 4 yet`.

## Goal

Make the PSC-1 standalone language more useful after the P4.49 release-trust work by extending Nat matches from only `0 | _` into bounded finite numeric literal matches, while still lowering through checked Lean-style Nat constructors and Nat recursors instead of introducing JavaScript-only switch semantics.

## Implemented

- Added `SurfacePattern { tag: "natLit", value }` for numeric Nat match alternatives above zero.
- Parser now accepts nonnegative safe-integer numeric match patterns.
- Elaborator now desugars bounded Nat literal matches into nested constructor matches:

```proofscript
match (n) {
  | 0 => a
  | 1 => b
  | 2 => c
  | _ => d
}
```

is lowered through nested matches over `Nat.zero` / `Nat.succ`, then elaborated to checked `Nat.rec` applications.

- Added bounded fail-closed guard: max supported Nat literal in this PSC-1 desugaring slice is `64`.
- Duplicate numeric alternatives reject.
- Numeric alternatives above zero without final `_` reject as non-exhaustive.
- Mixed positive numeric literal + constructor-pattern Nat matches remain fail-closed for now.
- Runtime manifest now advertises simple and multi-literal Nat/catch-all matches via checked nested `Nat.rec`.
- Added standalone-small and reference-governance positive/negative tests.
- Added proof obligation:
  - `ProofScript.Frontend.Match.NatLiteralDesugaring`

## Example now accepted

```proofscript
function natTagMatch(n: Nat): Nat := {
  match (n) {
    | 0 => 10
    | 1 => 20
    | 2 => 30
    | _ => 40
  }
}

theorem nat_tag_match_zero_eq_ten: natTagMatch(0) = 10 := by { rfl }
theorem nat_tag_match_one_eq_twenty: natTagMatch(1) = 20 := by { rfl }
theorem nat_tag_match_two_eq_thirty: natTagMatch(2) = 30 := by { rfl }
theorem nat_tag_match_large_eq_forty: natTagMatch(5) = 40 := by { rfl }
```

## RED / GREEN

RED before implementation:

```json
{
  "status": "rejected",
  "message": "K3c-section-vars0 currently implements only Nat zero numeric match pattern '0'"
}
```

GREEN after implementation:

```txt
natTagMatch(0) = 10
natTagMatch(1) = 20
natTagMatch(2) = 30
natTagMatch(5) = 40
```

## Verification

Fresh commands run:

```bash
npm run build -- --pretty false
npm run test:standalone-small
npm run test:reference-governance
npm run test:kernel:smoke
npm run test:governance
node tools/pslive.ts check examples/standalone-small/src/Main.ps --json
node tools/pslive.ts build-js examples/standalone-small/src/Main.ps --out artifacts/standalone-small-main-p4-50.js --json
node tools/pslive.ts run examples/standalone-small/src/Main.ps --call natTagMatch --args 0 --json
node tools/pslive.ts run examples/standalone-small/src/Main.ps --call natTagMatch --args 1 --json
node tools/pslive.ts run examples/standalone-small/src/Main.ps --call natTagMatch --args 2 --json
node tools/pslive.ts run examples/standalone-small/src/Main.ps --call natTagMatch --args 5 --json
node tools/pskernel.ts package-audit --json
node tools/pskernel.ts tarball-smoke --json --pack-destination /tmp/p50tar-smoke
node tools/pskernel.ts release-manifest --json --pack-destination /tmp/p50manifest-pack2
node tools/pskernel.ts verify-release-manifest /tmp/p50_manifest2.json --json --fresh --pack-destination /tmp/p50manifest-fresh2
```

Observed accepted results:

- build: PASS
- standalone-small: PASS, checkedDeclarations=49
- reference-governance: PASS, checks=36
- kernel smoke: PASS
- governance: PASS, checks=27, warnings=0, failures=0
- pslive example check: accepted, declarations=54
- pslive example build-js: accepted
- natTagMatch run 0/1/2/5: accepted with results 10/20/30/40
- package-audit: accepted, failures=0
- tarball-smoke: accepted, runtime=accepted
- release-manifest: accepted, failures=0
- verify-release-manifest --fresh: accepted, failures=0

## Observed hashes

```txt
standaloneExampleSemanticSha256=11d32e085a76e0bcead51791a5ff1a911de0082bee5e773f6b72e82247a8c26b
standaloneExampleOutputSha256=16287f423c991419024ef1f57a09b1f71d8af1a0e2b65e7acec987f82d1833f4
referenceGovernanceSha256=9ac5c2c2053f6efacfe6d029489f9be2ffbe9299acc61c63fa3b0972b9fa0122
packageAuditSha256=ac2c2adeb73fb9b5759df47dbf55429229c7b0a0cfb9e5fbaf257192f8c254bc
sourceTreeSha256=d2ca734a45ede6bb5a5d689fbe7842e1fea35299868a98940e55189887dedbdd
releaseManifestSha256=d6d6628ff987a00d2a4a9df2a3c13e30c8fcec8b5290ba8f7e25e5568bc48d8d
releaseManifestFreshVerificationSha256=cc6b93a3a40eb73dcf3abf327cccced88d943a7d2aad529257085643e9479241
```

## Boundary

This is still not general Lean pattern matching. It is a bounded PSC-1 convenience surface for finite Nat literal alternatives with a required catch-all. The semantics continue through constructor/recursor elaboration and trusted-boundary kernel checking.
