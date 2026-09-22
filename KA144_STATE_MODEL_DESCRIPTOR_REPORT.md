# KA-144 — State-model descriptor workflow

Checkpoint: `proofscript-v1-ka144-state-model-descriptor0`  
Version: `1.0.0-pskernel.147`  
Base: `proofscript-v1-ka143-architecture-extraction0`

## Purpose

KA-144 adds the descriptor layer needed before real monadic/stateful verification can be connected to Lean `vcgen` / `mvcgen` style workflows.

This checkpoint does **not** claim semantic monadic proof discharge. It makes monadic contracts fail closed unless an explicit `proofscript.state-model.v1` descriptor is supplied and structurally validated.

## Added package

```text
packages/state-models
  package: @proofscript/state-models
  schema: proofscript.state-model.v1
  validates: state type, monad, WP/triple interface, semantics runner, adequacy theorem, laws, operations, vcgen status
```

## Added CLI

```bash
psc state-model validate model.json --out model.validation.json --json
psc contracts Transfer.ps --state-model BankState.model.json --out Transfer.contracts.json --emit-lean Transfer.contracts.lean --json
psc obligations Transfer.ps --state-model BankState.model.json --contracts-out Transfer.contracts.json --out Transfer.obligations.json --json
```

## Added contract behavior

Monadic/stateful contracts such as:

```ps
function transfer(from: AccountId, to: AccountId, amount: Nat): State Bank Unit
  requires positive: amount > 0
  ensures debit: balanceOf(from) = old(balanceOf(from)) - amount
  ensures credit: balanceOf(to) = old(balanceOf(to)) + amount
:= do {
  debit(from, amount);
  credit(to, amount);
}
```

now require `--state-model`. Without it, `psc contracts` returns `unsupported` and does not silently invent a semantics.

## Added artifacts

```text
proofscript.state-model-validation.v1
proofscript.contracts.v1 with contractKind: monadic-stateful
proofscript.obligations.v1 with monadic.operation.spec / monadic.ensures obligations
proofscript.proof-status.v1 remains unproved until explicit proofs or future vcgen integration
```

## Verification

Passed:

```text
npm run build
npm run test:ka144
npm run test:ka143
npm run test:ka142
npm run test:ka141
npm run test:ka140
npm run test:ka139
npm run test:ka138
npm run test:ka137
npm run test:ka136
npm pack --ignore-scripts
npm publish --dry-run --ignore-scripts --access public
fresh npm install from tarball
fresh psc state-model validate
fresh psc contracts --state-model
fresh psc obligations --state-model
fresh psc proof-status
fresh psc verify
fresh psc software-alpha
```

## Boundary

Still not implemented:

```text
Lean vcgen/mvcgen semantic discharge
monadic adequacy theorem checking
automatic proof search
full tactic engine
full Lean 4 equivalence
fully formal K3
```
