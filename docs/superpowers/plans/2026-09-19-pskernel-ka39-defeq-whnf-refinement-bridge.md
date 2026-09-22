# KA-39 DefEq/WHNF Refinement Bridge Implementation Plan

Goal: Add the next narrow Lean4Lean proof-surface bridge for definitional equality and WHNF conversion progress, without changing PSKernel trusted semantics or Core format.

Scope: Direct imported Lean4Lean theory wrappers only. No executable PSKernel isDefEq refinement claim.
