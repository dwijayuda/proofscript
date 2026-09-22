# ProofScript KA-137 local test

```bash
npm install --offline --no-audit --no-fund
npm run build
npm run test:ka137
npm pack --ignore-scripts
```

Installed-package workflow tested by KA-137:

```bash
npm install ./proofscript-1.0.0-pskernel.140.tgz
npx psc --version
npx psc init app
cd app
npx psc check --json
npx psc emit-core src/Main.ps --out dist/Main.pscore.json --json
npx psc emit-lean dist/Main.pscore.json --out dist/Main.lean --json
npx psc certify src/Main.ps --core dist/Main.pscore.json --out dist/Main.pscert.json --json
npx psc verify dist/Main.pscert.json --json
npx psc build --target ts --json
```
