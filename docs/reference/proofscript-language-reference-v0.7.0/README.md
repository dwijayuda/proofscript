# ProofScript Language Reference v0.7.0 — Lean 4.34 aligned candidate

Status: **candidate authoritative package**. Production authority remains v0.6.1 until the migration gate is closed.

Normative semantic baseline:
- Lean 4.34.0
- `293d5d0c0c3f3dded4688b3ccd6a33939ac5102b`

Non-normative watch:
- Lean 4.35.0-rc2
- `11acb17ec6b07a8f9e9173e6845197929540936b`

The initial v0.7.0 candidate preserves the admitted v0.6.1 D/E syntax surface. Its main changes are semantic-baseline accuracy, standalone-pkernel architecture, package/module architecture, and TypeScript-first implementation policy.

## Lean 4.34 delta audit

Appendix K records stable-4.34 changes with direct ProofScript consequences, including removal of in-kernel native reduction and new verification-oriented `erased` do bindings.
