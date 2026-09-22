# 01 — Project Governance Model

## 1. Purpose

This document defines how ProofScript decisions are made so the project can move fast without architectural drift.

## 2. Governance bodies

ProofScript has four governance domains:

1. **Language Governance** — syntax, semantics, profiles, compatibility.
2. **Kernel Governance** — trusted checker, replay, certificates, proof obligations.
3. **Compiler Governance** — parser, elaborator, IR, backends, runtime.
4. **Release Governance** — conformance, packaging, documentation, audit evidence.

A decision may affect more than one domain. When in doubt, classify it by the highest trust impact.

## 3. Authority order

When documents or implementation choices conflict, use this order:

1. `00_PROJECT_CONSTITUTION.md`
2. trust-boundary policy
3. language profile policy
4. architecture constitution
5. release/conformance gates
6. package-specific README/API docs
7. implementation comments
8. ad-hoc chat decisions

## 4. Decision classes

### Class A — Constitutional decision

Requires a decision record.

Examples:

- changing ProofScript semantic baseline;
- adding a new standard verification concept;
- changing trust labels;
- accepting unsupported code instead of failing closed;
- changing package dependency direction;
- introducing a second canonical language surface.

### Class B — Architecture decision

Requires a decision record or architecture note.

Examples:

- adding a new package;
- changing kernel public API;
- adding a new IR layer;
- moving parser responsibility into compiler;
- introducing persistent artifact formats.

### Class C — Implementation decision

May be handled in code + report.

Examples:

- adding a smoke test;
- adding an unsupported error;
- implementing a small parser production;
- refactoring internal helpers without API change.

### Class D — Experimental decision

Allowed only behind explicit experimental profile flags.

Examples:

- new syntax aliases;
- JS convenience features;
- non-Lean semantic experiments;
- unverified runtime optimizations.

## 5. Decision record requirement

Every Class A or Class B decision must create a file under:

```text
docs/decisions/YYYY-MM-DD-short-title.md
```

Use `09_DECISION_RECORD_TEMPLATE.md`.

## 6. Fast path rule

The project may move fast when:

- the change is in PSC-1 scope;
- unsupported behavior rejects;
- the build passes;
- smoke tests pass;
- proof obligations are added for semantic claims;
- no public compatibility is silently broken.

Fast path does not mean undocumented path.

## 7. Escalation rule

Escalate to a decision record when a change affects:

- trusted kernel behavior;
- source acceptance;
- theorem/proof meaning;
- artifact/certificate format;
- backend observable semantics;
- package dependency direction;
- public API stability;
- future Lean-compatibility path.

## 8. Project reports

Every meaningful milestone should add a report:

```text
PRODUCTION_Px_..._REPORT.md
```

Reports must include:

- files changed;
- commands run;
- pass/fail results;
- supported features;
- unsupported/fail-closed features;
- proof obligations created;
- trust label;
- next step.

## 9. Governance anti-patterns

Forbidden:

- “temporary” spaghetti that becomes permanent;
- accepting source syntax before defining elaboration meaning;
- adding JS semantics to standard ProofScript;
- claiming proof because smoke tests pass;
- keeping two active kernels;
- hiding unsupported behavior behind warnings;
- letting backend output define language meaning.
