import ProofScriptKernelEquivalence.ExprTranslation
import ProofScriptKernelEquivalence.RecursorMetadata
import Lean.Declaration

namespace ProofScriptKernelEquivalence
namespace DeclarationRecursorMetadata

open RecursorMetadata

/--
Explicit formed recursor-rule image used by the environment correspondence.
ProofScript's shipped checker computes iota procedurally; this structure is the
formal extensional image whose RHS-generation correspondence remains under O-IND.
-/
structure PSRecursorRuleInfo where
  ctor : Lean.Name
  nfields : Nat
  rhs : PSExpr
  deriving Repr

namespace PSRecursorRuleInfo

def toLeanRule (r : PSRecursorRuleInfo) : Lean.RecursorRule :=
  Lean.RecursorRule.mk r.ctor r.nfields (PSExpr.toLean r.rhs)

@[simp] theorem toLeanRule_ctor (r : PSRecursorRuleInfo) : r.toLeanRule.ctor = r.ctor := rfl
@[simp] theorem toLeanRule_nfields (r : PSRecursorRuleInfo) : r.toLeanRule.nfields = r.nfields := rfl
@[simp] theorem toLeanRule_rhs (r : PSRecursorRuleInfo) : r.toLeanRule.rhs = PSExpr.toLean r.rhs := rfl

end PSRecursorRuleInfo

/-- Full formed recursor constant metadata needed by Lean.ConstantInfo. -/
structure PSRecursorInfo where
  name : Lean.Name
  levelParams : List Lean.Name
  type : PSExpr
  all : List Lean.Name
  numParams : Nat
  numIndices : Nat
  numMotives : Nat
  numMinors : Nat
  rules : List PSRecursorRuleInfo
  k : Bool
  isUnsafe : Bool := false
  deriving Repr

namespace PSRecursorInfo

def toLeanVal (d : PSRecursorInfo) : Lean.RecursorVal :=
  Lean.RecursorVal.mk
    (Lean.ConstantVal.mk d.name d.levelParams (PSExpr.toLean d.type))
    d.all d.numParams d.numIndices d.numMotives d.numMinors
    (d.rules.map PSRecursorRuleInfo.toLeanRule) d.k d.isUnsafe

def metadata (d : PSRecursorInfo) : PSRecursorMeta :=
  { inductiveName := d.all.headD .anonymous
    numParams := d.numParams
    numIndices := d.numIndices
    numMotives := d.numMotives
    numMinors := d.numMinors
    rules := d.rules.map fun r => { ctor := r.ctor, nfields := r.nfields }
    k := d.k }

@[simp] theorem toLeanVal_name (d : PSRecursorInfo) : d.toLeanVal.name = d.name := rfl
@[simp] theorem toLeanVal_levelParams (d : PSRecursorInfo) : d.toLeanVal.levelParams = d.levelParams := rfl
@[simp] theorem toLeanVal_type (d : PSRecursorInfo) : d.toLeanVal.type = PSExpr.toLean d.type := rfl
@[simp] theorem toLeanVal_all (d : PSRecursorInfo) : d.toLeanVal.all = d.all := rfl
@[simp] theorem toLeanVal_k (d : PSRecursorInfo) : d.toLeanVal.k = d.k := rfl

/-- Full formed metadata is represented by the actual pinned Lean RecursorVal datatype. -/
theorem toLean_corresponds (d : PSRecursorInfo) :
    d.toLeanVal.name = d.name ∧
    d.toLeanVal.levelParams = d.levelParams ∧
    d.toLeanVal.type = PSExpr.toLean d.type ∧
    d.toLeanVal.all = d.all ∧
    d.toLeanVal.numParams = d.numParams ∧
    d.toLeanVal.numIndices = d.numIndices ∧
    d.toLeanVal.numMotives = d.numMotives ∧
    d.toLeanVal.numMinors = d.numMinors ∧
    d.toLeanVal.k = d.k ∧
    d.toLeanVal.isUnsafe = d.isUnsafe := by
  exact ⟨rfl, rfl, rfl, rfl, rfl, rfl, rfl, rfl, rfl, rfl⟩

/-- Rule constructor/field-count projection agrees with the earlier reduction metadata model. -/
theorem metadata_corresponds (d : PSRecursorInfo) :
    RecursorMetadata.Corresponds d.metadata d.toLeanVal := by
  refine ⟨rfl, rfl, rfl, rfl, ?_, rfl⟩
  simp [RecursorMetadata.leanRuleKeys, RecursorMetadata.psRuleKeys, metadata,
    toLeanVal, PSRecursorRuleInfo.toLeanRule]

end PSRecursorInfo

end DeclarationRecursorMetadata
end ProofScriptKernelEquivalence

#print axioms ProofScriptKernelEquivalence.DeclarationRecursorMetadata.PSRecursorInfo.toLean_corresponds
#print axioms ProofScriptKernelEquivalence.DeclarationRecursorMetadata.PSRecursorInfo.metadata_corresponds
