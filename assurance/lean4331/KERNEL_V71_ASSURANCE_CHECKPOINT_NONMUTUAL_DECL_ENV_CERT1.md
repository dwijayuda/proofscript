# ProofScript Kernel v71 checkpoint: non-mutual declaration/environment certificate

Status: **PASS — K3-progress checkpoint, not full K3**.

This checkpoint turns the current generic non-mutual O-DECL/O-IND evidence into a
release-level certificate.  It does not add new kernel semantics.  It binds the
following already-machine-checked formal layers and executable Lean-backed gates:

- inherited 28-module environment-induction formal stack with `SORRYAX=0`;
- generic non-mutual admission formal boundary with `SORRYAX=0`;
- non-mutual classifier correspondence formal boundary with `SORRYAX=0`;
- TypeScript classifier implementation contract formal boundary with `SORRYAX=0`;
- six persisted v71 Lean-gate parts against pinned Lean 4.33.1;
- local merged O-DECL + TypeScript classifier regression.

Covered claim:

> For the current v71 generic non-mutual slice, successful raw constructor
> admission and classifier acceptance are connected to formal admission witnesses;
> checker-produced normalized packages preserve Core→Lean environment translation;
> generated recursor obligations remain sound; and the installed environment still
> supplies the direct-typing and delta/transparency premises used by earlier
> typing/reduction theorems.

Not claimed:

- full whole-kernel K3 equivalence;
- mutual or nested inductive admission;
- complete TypeScript implementation correspondence proof;
- exact native Lean operational completeness for every `.inductDecl` failure mode.
