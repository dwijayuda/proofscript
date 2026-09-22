import Lean4Lean
import Lean4Lean.Environment
import Lean4Lean.TypeChecker
import Lean4Lean.Level
import Lean4Lean.Expr

namespace PSKernel.KA11

-- This file is intentionally small: it proves that the real imported
-- Lean4Lean modules are available through the offline dependency bundle.
-- It is an import/build gate, not yet the equivalence theorem itself.

def sourceBindingWitness : Nat := 1


end PSKernel.KA11
