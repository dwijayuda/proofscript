# Stateful Lean VC Derivation Request v1

Status: **Lean-facing request source; tactic not yet executed**

Schema:

```text
proofscript.stateful-vc-request/v1
```

The request is downstream of the typed operation layer, concrete `StateM` program lowering, WP identity binding, VC plan, and `Std.Do` semantic encoding.

A state model may optionally declare Lean environment provenance:

```json
{
  "lean": {
    "imports": ["MyProject.BankStateModel"],
    "openNamespaces": ["BankStateModel"]
  }
}
```

These declarations are validated and propagated, but declaring them does **not** prove that the modules exist or that the referenced declarations resolve.

When model imports are declared and all previous artifacts are ready, ProofScript can generate a request source with this shape:

```lean
import Std.Tactic.Do
import MyProject.BankStateModel

open Std.Do
open BankStateModel

def transfer ... : StateM Bank Unit := do
  ...

theorem transfer_vc_request ... :
    Std.Do.Triple
      (transfer ...)
      (fun s => ⌜...⌝)
      (⇓ result s => ⌜...⌝) := by
  mvcgen
  all_goals trace_state
```

The request intentionally contains no `sorry` or `admit`. Its purpose is to be executed in Lean so that generated goals can be captured in a later artifact.

Before that run, all of the following remain false:

```text
leanEnvironmentResolved = false
tacticExecuted = false
semanticVcDerivationComplete = false
realVerificationConditionsGenerated = false
stateModelAdequacyChecked = false
semanticProofDischarge = false
```

If no model import provenance is declared, the request fails closed with `stateful-vc-request-model-imports-unbound` instead of emitting a misleading run-ready source.


## Tactic / Triple compatibility

ProofScript does not treat `vcgen` and `mvcgen` as interchangeable strings.

For the current public stateful profile:

```text
Std.Do.Triple  -> mvcgen
```

Lean 4.34's own regression suite exercises `mvcgen` on `Std.Do.Triple`. The newer experimental `vcgen` implementation targets the newer `Std.Internal.Do.Triple` metatheory and must not be selected for a `Std.Do.Triple` descriptor.

If `vcgen.tactic` is omitted for a `Std.Do.Triple` model, ProofScript selects `mvcgen` automatically. If a descriptor explicitly pairs `Std.Do.Triple` with `vcgen`, state-model validation fails closed.

For `mvcgen`, imported `@[spec]` theorems are discovered through Lean's registered specification database. The `mvcgen [...]` list is instead used to unfold the generated local wrapper definition. For a generated function `withdraw`, the request therefore has the form:

```lean
mvcgen [withdraw]
```

ProofScript records operation Triple theorem identities such as `BankStateModel.debit_triple` separately as provenance; they are not mechanically copied into the mvcgen bracket list.
