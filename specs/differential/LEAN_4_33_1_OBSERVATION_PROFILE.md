# Lean 4.33.1 differential observation profile

Status: **exact-oracle campaign executed and green; corpus continues to expand with each semantic slice**.

This profile does not change ProofScript language semantics, Core syntax, kernel rules, artifact format, or the logical Core schema. It applies to the current `K3c-section-vars0` profile and preserves historical K3b evidence. It defines the evidence contract used to detect semantic drift against the pinned ProofScript v0.1 / Lean 4.33.1 baseline.

## Pinned oracle

The only conforming Lean oracle for this profile is exact Lean `4.33.1`. Near versions such as `4.33.0` or `4.33.10`, release candidates, `master`, custom forks, and moving web playgrounds are not substitutes.

The Linux release evidence recorded for reproducible provisioning is:

- release tag: `v4.33.1`;
- release short commit shown by upstream: `819816b`;
- `lean-4.33.1-linux.tar.zst` SHA-256: `890afd185370f85666025b883914ab4f4b339136f8c96167b69cfb62aecaf235`;
- `lean-4.33.1-linux.zip` SHA-256: `0376ac87487246b40dd077268c097e701f552e94c6d020d2373b50c7444fa22f`.

The harness must parse the executable's reported semantic version and require exact equality with `4.33.1`; substring matching is forbidden.

## Differential contract

Each corpus case has:

1. canonical ProofScript source;
2. an independently written Lean reference source;
3. a set of Lean observation commands/probes;
4. expected semantic sentinel output where applicable.

The harness must:

1. compile/check the ProofScript source with the standalone ProofScript frontend/kernel;
2. record normalized ProofScript observations, including declaration kinds, universe parameters, declaration types, outer BinderInfo, generated declarations, assumptions, typeclass metadata, and module metadata where applicable;
3. emit Lean from the checked Core artifact;
4. append the same probes to the generated Lean and handwritten reference Lean programs;
5. run both through exact Lean 4.33.1;
6. require both Lean programs to be accepted;
7. require every shared type/value assertion in the probes to typecheck on both sides;
8. compare the canonical `PSDIFF ...` semantic observation lines for equality;
9. retain normalized full Lean diagnostics (`#check`, `#print`, `#reduce`, errors/output) for audit, but do not require pretty-printer text to be byte-identical because alpha-renaming and definitionally equal universe normalization may print differently;
10. require case-specific expected text/sentinels;
11. emit a machine-readable report.

A passing generated Lean file alone is not sufficient evidence: the handwritten reference side prevents the exporter from defining the comparison target by itself. Conversely, raw `#check` text is diagnostic evidence rather than a canonical semantic representation; equality is based on shared assertions plus explicit `PSDIFF` observations.

## Initial observation dimensions

The initial corpus covers:

- declaration kind/type;
- universe parameters and `max`/`imax` normalization;
- implicit and strict-implicit BinderInfo;
- proof irrelevance and propositional `Eq` behavior;
- generated declarations, recursors, recursive and projection reduction;
- structure constructors/recursors/projections;
- typeclass candidate selection and instance BinderInfo;
- axiom dependencies;
- module/import environment and declaration ownership observations;
- namespace/section/open lookup behavior;
- section-variable telescope generalization, BinderInfo/dependency closure, and theorem include/omit policy.

Future corpus growth should add transparency details, more indexed recursor behavior, negative paired cases, resource classifications, and fuzzed terms without weakening the exact-version requirement.

## Result taxonomy

- `accepted`: exact Lean 4.33.1 ran and every selected comparison passed;
- `rejected`: exact Lean 4.33.1 ran and one or more comparisons disagreed or failed;
- `unsupported`: exact Lean 4.33.1 was unavailable or a non-exact Lean version was supplied;
- `resource_exhausted` / `implementation_error`: reserved for explicit harness/runtime failures where applicable.

`unsupported` must never be reported as conformance success.

## Current executed evidence

The current schema-2 corpus contains 24 cases: 19 semantic-equivalence, 3 negative-agreement, and 2 explicit capability-gap cases. All 24 are accepted by the exact Lean 4.33.1 release oracle. The newest `section-vars` case compares generalized telescopes, dependency closure, binder classes, and theorem include/omit behavior against an independently handwritten Lean reference. This remains subset evidence, not a full Lean compatibility claim.
