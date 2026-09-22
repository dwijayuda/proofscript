# Appendix G — Conformance Suite Specification

Status: **Normative test-corpus contract v0.7.0**

The ProofScript Language Reference must be executable as a specification. This appendix defines the minimum conformance artifacts that bridge the prose reference and implementation work.

## G.1 Purpose

The conformance suite exists to verify that an implementation follows the registered surface language rather than merely accepting similar-looking programs. It checks feature ownership, rejection behavior, canonical lowering, and claim discipline.

The suite is intentionally not a replacement for the Lean proof plan. It is an implementation-facing checkpoint before S2/S3 claims.

## G.2 Required corpus files

A release SHOULD include:

```text
conformance/
  feature-registry.schema.json
  feature-registry.json
  cases/
    positive.jsonl
    negative.jsonl
    lowering.jsonl
  expected/
    positive-lowerings.lean
```

## G.3 Case format

Positive cases include:

```json
{"id":"function-add","feature":"D-FUNCTION-ALIAS","source":"function add(x : Nat, y : Nat) : Nat := x + y;","expected_lean":"def add (x : Nat) (y : Nat) : Nat := x + y","status":"specified"}
```

Negative cases include:

```json
{"id":"function-without-params","feature":"D-FUNCTION-ALIAS","source":"function answer : Nat := 42;","reason":"function alias requires at least one explicit declaration parameter group"}
```

## G.4 Conformance levels

| Level | Meaning |
|---|---|
| C0 | Static corpus is well-formed. |
| C1 | Reference frontend accepts/rejects all corpus cases as specified. |
| C2 | Reference frontend emits canonical Lean matching the corpus. |
| C3 | Production frontend matches reference frontend on the corpus. |
| C4 | Corpus properties are covered by machine-checked reference theorems. |

C-levels are implementation-conformance checkpoints. They do not replace S1–S5 proof claims.

## G.5 Regression principle

Once a source case enters the conformance suite, future releases may change it only by:

1. explicitly recording the breaking change in the changelog;
2. updating the feature registry status;
3. explaining the soundness and DX rationale;
4. preserving older behavior through a compatibility mode when practical.
