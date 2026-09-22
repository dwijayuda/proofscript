# Appendix I — Parser and Lowering API Contract

Status: **Implementation-facing contract v0.6.1**

This appendix defines the minimum interfaces an implementation should expose so the reference, tests, and production compiler can be compared.

## I.1 Surface feature tags

Every ProofScript-owned node must carry a feature ID from `conformance/feature-registry.json`.

Example conceptual shape:

```typescript
type SurfaceFeatureId =
  | "D-CALL"
  | "D-EXPLICIT-PARAMS"
  | "D-CONST-ALIAS"
  | "D-FUNCTION-ALIAS"
  | "E-IF-BRACE"
  | "E-STRUCT-BODY"
  | "E-CLASS-BODY"
  | "E-INDUCTIVE-BODY"
  | "E-MATCH-BODY"
  | "E-WHERE-BODY";
```

## I.2 Parse result

A parser should distinguish owned syntax from deferral:

```typescript
type OverlayDecision<T> =
  | { kind: "proofscript"; feature: SurfaceFeatureId; node: T }
  | { kind: "defer" };
```

`defer` means ProofScript declines ownership. It does not assert that the fragment is valid Lean.

## I.3 Canonical lowering result

Lowering should expose canonical Lean text and, later, canonical Lean syntax hashes:

```typescript
interface LoweringResult {
  leanText: string;
  relation: "SyntaxEq" | "NormalizedSyntaxEq" | "ElabEq";
  featureIds: SurfaceFeatureId[];
  sourceMapStatus: "synthetic-only" | "diagnostic-mapped" | "proof-tracked";
}
```

## I.4 Failure result

Failures must be explicit and structured:

```typescript
type ProofScriptErrorCode =
  | "PS_UNKNOWN_FEATURE"
  | "PS_UNREGISTERED_EXCEPTION"
  | "PS_AMBIGUOUS_OWNERSHIP"
  | "PS_CONST_WITH_PARAMS"
  | "PS_FUNCTION_WITHOUT_PARAMS"
  | "PS_IF_REQUIRES_PARENS"
  | "PS_BRANCH_REQUIRES_SINGLE_TERM"
  | "PS_PATTERN_CALL_SYNTAX_NOT_ADMITTED"
  | "PS_VERSION_MISMATCH";
```

## I.5 Required compiler commands

A minimal developer-facing compiler should eventually provide:

```text
psc check file.ps
psc emit-lean file.ps
psc conformance run
psc conformance diff --reference lean
psc manifest file.ps
```

The exact CLI can change, but the capabilities are required for trust and developer experience.
