# ProofScript Status

## Canonical baseline

- Repository: `dwijayuda/proofscript`
- Baseline commit: `f5ca526d07c4d3521cdc4ec48246cf3962860503`
- Baseline label: KA146 canonical baseline
- Protected archive branch: `archive/legacy-ka146`
- Cleanup branch: `cleanup/ps1-architecture`

## Baseline behavior already observed

The uploaded KA146 code corresponding to this baseline was exercised before cleanup work began.

Observed passing behavior:

- `npm run test:ka137` — PASS
- `npm run test:ka140` — PASS
- `npm run test:ka146` — PASS
- `psc check examples/software/01-domain-model.ps` — accepted
- `psc build examples/software/01-domain-model.ps --target js` — emitted executable JavaScript
- theorem declarations were omitted from runtime emission in that build path

GitHub had no recorded workflow run/status for the baseline commit when PS1 cleanup started, so PS1 adds a lightweight CI workflow and treats it as the remote regression gate going forward.

## Current architectural findings

- ProofScript is an npm-workspaces monorepo and should remain one.
- `packages/kernel` is a meaningful trust boundary and should stay modular.
- `packages/compiler` exists but currently has a narrow backend-dispatch role rather than being the canonical high-level compiler API.
- `packages/lsp` in KA146 is scaffold-only.
- The separately developed LSP implementation is not present in KA146 and must later be rebased through a stable language-service boundary.
- The repository contains overlapping frontend architecture: `frontend`, `frontend-next`, and `unified-bridge`.
- Several packages are scaffolds or future-facing boundaries and need classification before removal or implementation.
- The root `package.json` contains a very large historical script surface. PS1 will not delete scripts blindly; active product gates must be separated from historical/assurance gates first.

## PS1 progress

- [x] Preserve baseline on `archive/legacy-ka146`
- [x] Create isolated cleanup branch
- [x] Freeze PS1 milestone
- [ ] Add lightweight PS1 CI
- [ ] Publish canonical package classification
- [ ] Make compiler API the canonical programmatic entry point
- [ ] Establish language-service boundary
- [ ] Audit `frontend-next` vs canonical frontend behavior
- [ ] Remove/migrate `unified-bridge`
- [ ] Restore/adapt LSP
- [ ] Reduce historical root/tooling clutter without losing assurance evidence
- [ ] Final PS1 acceptance suite green

## Next engineering target

Add the lightweight CI gate and package-architecture target document. Then inspect the dependency graph and classify every workspace package as:

- active product;
- active assurance;
- editor/tooling;
- deferred scaffold;
- duplicate/migration candidate.
