# KA-48 executable WHNF/DefEq refinement preflight plan

Goal: add a narrow source-bound Lean4Lean scaffold for executable WHNF/DefEq refinement without changing trusted PSKernel semantics, kernel codec behavior, Core format, or certificate format.

TDD:
1. Add `tools/pskernel-ka48-executable-whnf-defeq-refinement-tests.ts` first and confirm it fails because KA-48 files do not exist.
2. Add one Lean bridge scaffold under `assurance/ka48`.
3. Add one gate/tool under `tools/`.
4. Update package scripts only.
5. Run focused KA-48 test and assurance/lean soft gates.
6. Keep strict Lean4Lean gate blocked-not-counted unless offline Batteries v4.33.0-rc2 is present.
