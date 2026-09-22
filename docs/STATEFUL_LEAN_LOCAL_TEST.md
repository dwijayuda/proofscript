# Local Stateful Lean Verification

Use this when GitHub-hosted runners are unavailable or when testing a newer Lean release locally.

## Compatibility policy

The active stateful-verification lane accepts:

```text
Lean >= 4.33.1
```

Later stable releases, RCs, and future development/nightly builds are allowed. Historical K3-TB and differential artifacts remain separately pinned where their claim requires an exact release.

The repository default developer toolchain is currently:

```text
leanprover/lean4:v4.34.0
```

The evidence report records the exact Lean version selected by Lake.

## Windows / PowerShell: default toolchain

From the repository root:

```powershell
git switch cleanup/ps1-architecture
git pull

npm ci
npm run build
npm run test:ps3:lean-version-compatibility
npm run test:ps3:stateful-lean-model
```

Confirm the actual project toolchain:

```powershell
Push-Location specs/verification/v0.7/lean
lake env lean --version
lake build
Pop-Location
```

Run the full debit-only semantic lane:

```powershell
npm run assurance:ps3:stateful-lean-vc -- --strict --out stateful-vc-run.local.json
```

The important output is:

```text
stateful-vc-run.local.json
```

If the run fails, send that JSON plus the terminal output. The report identifies the first failed stage:

```text
setup
lean-model-build
lean-program-typecheck
lean-triple-target-typecheck
vc-residual-goals
vc-request-execution
```

If Lean reaches `vcgen` and leaves goals, the report also contains stable `proofscript.stateful-vc-goals/v1` goal IDs and traces.

## Test a newer RC

Install the desired Lean release with elan if necessary. Then temporarily change only the verification project's toolchain file.

Example:

```powershell
Set-Content specs/verification/v0.7/lean/lean-toolchain "leanprover/lean4:v4.35.0-rc2"

Push-Location specs/verification/v0.7/lean
lake env lean --version
lake build
Pop-Location

npm run assurance:ps3:stateful-lean-vc -- --strict --out stateful-vc-run.rc.json
```

After testing, restore the repository default:

```powershell
git restore specs/verification/v0.7/lean/lean-toolchain
```

Do not relabel historical 4.33.1 assurance artifacts based on a newer successful run. The stateful run is new compatibility evidence and records its own exact toolchain identity.
