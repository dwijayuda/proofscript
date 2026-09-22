# ProofScript Project Governance & Constitution Bundle

This bundle defines the project rules for developing ProofScript forward.

The immediate implementation target is **PSC-1: Small Complete Standalone Profile**: a small but complete standalone ProofScript subset that can parse, elaborate, kernel-check, certify, and execute selected programs without Lean 4 installed.

The long-term target is **Full ProofScript**: a semantically faithful, TypeScript-oriented presentation of Lean 4 concepts with a production-grade architecture that can grow toward full Lean language coverage without becoming spaghetti code.

## Documents

| File | Purpose |
|---|---|
| `00_PROJECT_CONSTITUTION.md` | Non-negotiable principles and project identity. |
| `01_GOVERNANCE_MODEL.md` | Decision-making, roles, authority, and escalation. |
| `02_LANGUAGE_PROFILE_GOVERNANCE.md` | PSC-1 vs future full ProofScript feature policy. |
| `03_ARCHITECTURE_CONSTITUTION.md` | Anti-spaghetti architecture rules and package boundaries. |
| `04_TRUST_BOUNDARY_AND_PROOF_POLICY.md` | Kernel, proofs, certificates, fail-closed rules, and trust labels. |
| `05_DEVELOPMENT_WORKFLOW_FAST_SMOKE.md` | Fast development workflow with minimal smoke tests and proof obligations. |
| `06_RELEASE_AND_CONFORMANCE_GATES.md` | Release gates, preflight, audit, and conformance levels. |
| `07_PACKAGE_AND_MODULE_RULES.md` | Package/module dependency rules and public API stability. |
| `08_ROADMAP_GATES_PSC1_TO_FULL_LEAN.md` | Roadmap from live PSC-1 to full Lean-like ProofScript. |
| `09_DECISION_RECORD_TEMPLATE.md` | Template for architecture/language decisions. |
| `10_PROOF_OBLIGATION_TEMPLATE.md` | Template for every semantic/proof obligation. |
| `11_AGENT_EXECUTION_PROTOCOL.md` | Rules for AI/coding agents working on the project. |

## Standing rule

When these documents conflict with ad-hoc implementation choices, these documents win unless amended through the governance process.
