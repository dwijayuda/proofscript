# Production P4.97 — Package Classification and Promotion Gate

## Summary

P4.97 adds a machine-readable package classification manifest and enforcement checker so the repository is easier to explain, safer to refactor, and safer for feature additions.

This is architecture cleanup only. It does not change ProofScript syntax, kernel rules, elaboration behavior, backend emission, runtime behavior, or the K3-TB trust claim.

## New files

```text
config/package-classification.json
docs/PRODUCTION_PACKAGE_CLASSIFICATION.md
tools/check-package-classification.ts
tools/package-classification-tests.ts
```

## Enforcement

`npm run test:architecture` now runs:

```text
node tools/check-boundaries.ts
node tools/check-package-classification.ts
```

The checker verifies:

```text
all workspace packages are classified
package.json names match classification npm names
stable PSC-1 path entries are canonical and non-experimental
trust claim remains K3-TB trusted-boundary
formal Lean 4 equivalence obligations remain 0 unless explicitly changed
package.json dependencies match declared allowed dependencies
tsconfig references match declared allowed dependencies
source imports match declared allowed dependencies
classification docs exist
```

## Tier counts

```text
trusted:       4
language:      8
execution:     2
product:       5
plugin-infra:  2
bridge:        3
experimental: 11
total:        35
```

## Canonical PSC-1 path

```text
packages/syntax
packages/parser
packages/recursion
packages/typeclass
packages/elaborator
packages/std
packages/environment
packages/frontend
packages/kernel
packages/kernel-codec
packages/certificates
packages/verifier
packages/backend-typescript
packages/runtime
```

## Why this matters

Before P4.97, the repo had a real working PSC-1 path, but new contributors and future agents could still confuse canonical production packages with broad experimental/future architecture packages.

After P4.97, package status is explicit and tested. Adding a new dependency or promoting an experimental package requires changing `config/package-classification.json`, which makes architecture decisions reviewable.

## Trust status

Still K3-TB trusted-boundary.

Not fully formal K3.

Not proven equivalent to Lean 4.

Formal Lean 4 equivalence remains 0 proven obligations.
