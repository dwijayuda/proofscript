import Lean4Lean.Verify.TypeChecker.InferType

namespace Lean4Lean.PSKernelKA75
open Lean
open Lean4Lean
open Lean4Lean.TypeChecker

/-- KA-75 bridge: source level checking transports to a translated universe level. -/
theorem translated_checkLevel_wf {c : VContext} {l : Level}
    (H : l.hasMVar' = false) :
    (Lean4Lean.TypeChecker.Inner.checkLevel c.toContext l).WF
      fun _ => ∃ u', VLevel.ofLevel c.lparams l = some u' := by
  exact Lean4Lean.TypeChecker.Inner.checkLevel.WF H

/-- KA-75 bridge: local free-variable inference preserves translated typing. -/
theorem translated_inferFVar_wf {c : VContext} {name : FVarId} :
    (Lean4Lean.TypeChecker.Inner.inferFVar c.toContext name).WF
      fun ty => ∃ e' ty', c.TrTyping (.fvar name) ty e' ty' := by
  exact Lean4Lean.TypeChecker.Inner.inferFVar.WF

/-- KA-75 bridge: environment lookup exposes the exact constant-info witness. -/
theorem translated_envGet_wf {c : VContext} {name : Name} :
    (c.env.get name).WF fun ci => c.env.find? name = some ci := by
  exact Lean4Lean.TypeChecker.Inner.envGet.WF

/-- KA-75 bridge: sort inference transports source levels into translated sort typing. -/
theorem translated_infer_sort_wf {c : VContext} {u : Level} {u' : VLevel}
    (H : VLevel.ofLevel c.lparams u = some u') :
    c.TrTyping (.sort u) (.sort u.succ) (.sort u') (.sort u'.succ) := by
  exact Lean4Lean.TypeChecker.Inner.infer_sort H

end Lean4Lean.PSKernelKA75
