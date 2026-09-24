# ProofScript Full Language Tour

This directory is an executable tour of the currently implemented ProofScript
product surface. It intentionally demonstrates only features backed by the
current compiler/tests; it is not a claim of full Lean 4 or TypeScript
compatibility.

## Pipeline

```text
.ps source
  -> canonical parser
  -> elaborator
  -> checked dependent Core
  -> PSKernel
       |
       +-> theorem checking / proof-state tooling
       |
       +-> executable Core
             -> TypeScript backend
             -> JavaScript runtime
```

Verification-extension examples additionally produce contract/obligation/Lean
artifacts through the v0.7 verification pipeline.

## Files

| File | Demonstrates |
|---|---|
| `01-Basics.ps` | declarations, lambdas, arithmetic, braced `if`, local `let`/`have`, non-recursive `where`, `String`, `Int`, `by rfl` |
| `02-Data.ps` | structures, literals, projection/update, user inductives, constructors, exhaustive `match` |
| `03-Collections.ps` | finite `List`/`Array`, literals, `map`, `length`, `size` |
| `04-Effects.ps` | `Option`, `Except`, checked `map`, bounded `do`, default extraction |
| `05-Classes.ps` | bounded classes/instances and explicit class projection calls |
| `06-Proofs.ps` | `rfl`, `exact`, `intro`, `assumption`, `apply`, `show`, `have`, `rw`, `subst`, `constructor`, `cases`, `induction`, bounded `simp`, named branches |
| `07-Contracts.ps` | `requires`/`ensures`/`result`/`ghost`/`old`/`assert` |
| `08-LoopVerification.ps` | loop `invariant` and `decreases` VC surface |
| `09-StatefulVerification.ps` | bounded State/monadic contract |
| `09-StatefulVerification.model.json` | state model, WP, operation, and Lean binding |

## Run everything

```bash
npm ci
npm run build
npm run test:language-tour
```

Check one source:

```bash
npm run pslive -- check examples/language-tour/01-Basics.ps --std --json
```

Emit TypeScript:

```bash
npm run pslive -- build-ts examples/language-tour/02-Data.ps --out .tmp/Data.ts --json
```

Emit JavaScript:

```bash
npm run pslive -- build-js examples/language-tour/04-Effects.ps --out .tmp/Effects.js --json
```

Run an exported value:

```bash
npm run pslive -- run examples/language-tour/02-Data.ps --call movedSum --json
```

Expected result: `62`.

## Verification-extension commands

```bash
node bin/psc.mjs contracts examples/language-tour/07-Contracts.ps \
  --out .tmp/Contracts.contracts.json --json

node bin/psc.mjs obligations examples/language-tour/07-Contracts.ps \
  --out .tmp/Contracts.obligations.json --json

node bin/psc.mjs contracts examples/language-tour/08-LoopVerification.ps \
  --out .tmp/Loop.contracts.json --json

node bin/psc.mjs contracts examples/language-tour/09-StatefulVerification.ps \
  --state-model examples/language-tour/09-StatefulVerification.model.json \
  --out .tmp/Stateful.contracts.json --json

node bin/psc.mjs monadic-lowering .tmp/Stateful.contracts.json \
  --out .tmp/Stateful.lowering.json --json
```

For the stronger multi-Lean proof-required verification matrix:

```bash
npm run assurance:product-v1:verification-endtest
```

## Trust boundary

Executable examples are accepted only after elaboration to checked Core and
PSKernel checking. Native tactics construct ordinary proof terms; they do not
bypass the kernel.

This tour does **not** claim full Lean 4 compatibility, fully formal K3,
self-hosting, or formal Core-to-TypeScript-to-JavaScript refinement.
