import ProofScriptKernelEquivalence.ExprTranslation
import Lean.Declaration

namespace ProofScriptKernelEquivalence
namespace DeclarationInductiveMetadata

/--
Reduction/type-lookup relevant image of an already-admitted inductive declaration.
This is an environment-metadata theorem boundary, not yet a positivity/admission theorem.
-/
structure PSInductiveInfo where
  name : Lean.Name
  levelParams : List Lean.Name
  type : PSExpr
  numParams : Nat
  numIndices : Nat
  all : List Lean.Name
  ctors : List Lean.Name
  numNested : Nat
  isRec : Bool
  isUnsafe : Bool
  isReflexive : Bool
  deriving Repr

structure PSConstructorInfo where
  name : Lean.Name
  levelParams : List Lean.Name
  type : PSExpr
  induct : Lean.Name
  cidx : Nat
  numParams : Nat
  numFields : Nat
  isUnsafe : Bool
  deriving Repr

namespace PSInductiveInfo

def toLeanVal (d : PSInductiveInfo) : Lean.InductiveVal :=
  Lean.InductiveVal.mk
    (Lean.ConstantVal.mk d.name d.levelParams (PSExpr.toLean d.type))
    d.numParams d.numIndices d.all d.ctors d.numNested d.isRec d.isUnsafe d.isReflexive

def Corresponds (ps : PSInductiveInfo) (lean : Lean.InductiveVal) : Prop :=
  lean.name = ps.name ∧
  lean.levelParams = ps.levelParams ∧
  lean.type = PSExpr.toLean ps.type ∧
  lean.numParams = ps.numParams ∧
  lean.numIndices = ps.numIndices ∧
  lean.all = ps.all ∧
  lean.ctors = ps.ctors ∧
  lean.numNested = ps.numNested ∧
  lean.isRec = ps.isRec ∧
  lean.isUnsafe = ps.isUnsafe ∧
  lean.isReflexive = ps.isReflexive

theorem toLean_corresponds (d : PSInductiveInfo) : Corresponds d d.toLeanVal := by
  exact ⟨rfl, rfl, rfl, rfl, rfl, rfl, rfl, rfl, rfl, rfl, rfl⟩

end PSInductiveInfo

namespace PSConstructorInfo

def toLeanVal (d : PSConstructorInfo) : Lean.ConstructorVal :=
  Lean.ConstructorVal.mk
    (Lean.ConstantVal.mk d.name d.levelParams (PSExpr.toLean d.type))
    d.induct d.cidx d.numParams d.numFields d.isUnsafe

def Corresponds (ps : PSConstructorInfo) (lean : Lean.ConstructorVal) : Prop :=
  lean.name = ps.name ∧
  lean.levelParams = ps.levelParams ∧
  lean.type = PSExpr.toLean ps.type ∧
  lean.induct = ps.induct ∧
  lean.cidx = ps.cidx ∧
  lean.numParams = ps.numParams ∧
  lean.numFields = ps.numFields ∧
  lean.isUnsafe = ps.isUnsafe

theorem toLean_corresponds (d : PSConstructorInfo) : Corresponds d d.toLeanVal := by
  exact ⟨rfl, rfl, rfl, rfl, rfl, rfl, rfl, rfl⟩

end PSConstructorInfo

/-- Canonical Eq type expected by ProofScript's quotient admission path. -/
def canonicalEqType (uName : Lean.Name := `u) : PSExpr :=
  let u : PSLevel := .param uName
  .pi (.sort u)
    (.pi (.bvar 0)
      (.pi (.bvar 1) (.sort .zero) .explicit)
      .explicit)
    .implicit

/-- Canonical Eq.refl type expected by quotient admission. -/
def canonicalEqReflType (uName : Lean.Name := `u) : PSExpr :=
  let u : PSLevel := .param uName
  let eqHead : PSExpr := .const `Eq [u]
  let result := .app (.app (.app eqHead (.bvar 1)) (.bvar 0)) (.bvar 0)
  .pi (.sort u) (.pi (.bvar 0) result .explicit) .implicit

/-- Normalized metadata image of the canonical Eq declaration used by `add_quot`. -/
def canonicalEqInfo : PSInductiveInfo :=
  { name := `Eq
    levelParams := [`u]
    type := canonicalEqType
    numParams := 2
    numIndices := 1
    all := [`Eq]
    ctors := [`Eq.refl]
    numNested := 0
    isRec := false
    isUnsafe := false
    isReflexive := false }

def canonicalEqReflInfo : PSConstructorInfo :=
  { name := `Eq.refl
    levelParams := [`u]
    type := canonicalEqReflType
    induct := `Eq
    cidx := 0
    numParams := 2
    numFields := 0
    isUnsafe := false }

/-- The formal quotient precondition is the exact normalized Eq/Eq.refl pair. -/
structure CanonicalEqPrecondition where
  eq : PSInductiveInfo
  refl : PSConstructorInfo
  eq_exact : eq = canonicalEqInfo
  refl_exact : refl = canonicalEqReflInfo

/-- Canonical metadata trivially satisfies the formal precondition. -/
def canonicalEqPrecondition : CanonicalEqPrecondition :=
  { eq := canonicalEqInfo, refl := canonicalEqReflInfo, eq_exact := rfl, refl_exact := rfl }

/-- The translated canonical Eq metadata occupies the actual Lean metadata datatypes. -/
theorem canonicalEq_toLean_corresponds :
    PSInductiveInfo.Corresponds canonicalEqInfo canonicalEqInfo.toLeanVal :=
  PSInductiveInfo.toLean_corresponds canonicalEqInfo

theorem canonicalEqRefl_toLean_corresponds :
    PSConstructorInfo.Corresponds canonicalEqReflInfo canonicalEqReflInfo.toLeanVal :=
  PSConstructorInfo.toLean_corresponds canonicalEqReflInfo

end DeclarationInductiveMetadata
end ProofScriptKernelEquivalence

#print axioms ProofScriptKernelEquivalence.DeclarationInductiveMetadata.PSInductiveInfo.toLean_corresponds
#print axioms ProofScriptKernelEquivalence.DeclarationInductiveMetadata.PSConstructorInfo.toLean_corresponds
#print axioms ProofScriptKernelEquivalence.DeclarationInductiveMetadata.canonicalEq_toLean_corresponds
#print axioms ProofScriptKernelEquivalence.DeclarationInductiveMetadata.canonicalEqRefl_toLean_corresponds
