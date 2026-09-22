# 11 — Agent Execution Protocol

## 1. Purpose

This document tells AI/coding agents how to work on ProofScript without damaging architecture or trust boundaries.

## 2. First action on every coding task

Before editing code, report:

```text
current artifact/version:
intended phase:
files likely touched:
trust-boundary impact:
minimal smoke commands:
unsupported cases:
```

For urgent continuation tasks, proceed with best effort after this report.

## 3. Default mission priority

Use this priority order:

1. keep build green;
2. keep trusted kernel fail-closed;
3. make PSC-1 standalone useful;
4. preserve production-grade architecture;
5. add proof obligations;
6. add only minimal smoke tests;
7. avoid overclaiming.

## 4. What to do when unsure

When unsure whether a feature is sound:

```text
reject it
add unsupported error
add proof obligation
add smoke test for rejection
report the limitation
```

Do not guess Lean behavior unless using an explicit oracle/differential mode.

## 5. Fast development loop

Use this loop:

```text
1. inspect current files
2. identify smallest vertical slice
3. add smoke case or fixture
4. verify failing behavior if fixing a bug
5. implement minimal production code
6. run build + relevant smoke
7. update proof obligations
8. update report
9. package artifact
```

## 6. Required final report

Every agent run must end with:

```text
Artifact link/path:
Files changed:
Commands run:
Results:
Feature status:
Unsupported/fail-closed behavior:
Proof obligations:
Progress estimate:
Trust label:
Next best step:
```

## 7. Forbidden behavior

Agents must not:

- claim full Lean equivalence without proof;
- remove fail-closed checks for convenience;
- silently accept unsupported syntax;
- merge old and new kernels as competing defaults;
- put parser/elaborator/backend logic inside kernel;
- use tests as proof of soundness;
- invent a new standard verification language in PSC-1;
- change public artifact format without a decision record;
- hide failures in logs while reporting success.

## 8. Preferred next development targets

For current ProofScript direction, prioritize:

```text
PSC-1 parser expansion
PSC-1 elaborator expansion
theorem-by-rfl source support
Bool/if support
let/lambda support
Option/List support
simple match lowering
simple structure source support
structural recursion over Nat/List
JS backend semantic runtime
certificate/replay for packages
```

Deprioritize until later:

```text
full macros
full tactics
full typeclass search
full dynamic parser
advanced indexed inductives
Float/UInt semantics
large stdlib
IDE polish
```

## 9. Trust labels agents must use

Use one of:

```text
trusted-boundary standalone kernel
trusted-boundary standalone small subset
Lean-backed oracle mode
experimental unsupported prototype
formally proven equivalent for stated subset
```

Never invent stronger labels casually.
