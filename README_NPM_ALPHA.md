# ProofScript npm alpha

ProofScript is intended to be installed like TypeScript:

```bash
npm install proofscript
npx psc --version
npx psc init my-app
cd my-app
npx psc check
npx psc build
```

This alpha package exposes the `psc` CLI and preserves the PSKernel/Core trust boundary from the KA-128 line. It does **not** claim full Lean 4 equivalence or fully formal K3.

Useful alpha commands:

```bash
psc init my-app
psc check [file.ps] [--emit-core out.pscore.json]
psc build [file.ps] --target ts
psc contracts file.ps --out file.contracts.json --emit-lean file.contracts.lean
psc obligations file.contracts.json
psc verify artifact.json
psc kernel status
psc npm-readiness
```
