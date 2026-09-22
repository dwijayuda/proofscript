# K3a-modules0 implementation profile

K3a is a frontend/project/artifact provenance milestone. It does **not** change the trusted logical Core calculus introduced by prior profiles.

## Implemented source/project slice

- canonical `.ps` source files;
- header-only `import Foo.Bar;`;
- configured relative `sourceRoots`;
- deterministic module-name to file resolution;
- dependency graph construction;
- missing-module, cycle, and cross-root ambiguity rejection;
- diamond dependency deduplication;
- sibling-module isolation during elaboration;
- declaration ownership by module;
- per-module source SHA-256;
- self-contained final Core artifact;
- artifact v11 provenance metadata;
- certificate v2 binding every transitive source;
- strict imported-source tamper rejection;
- historical artifact/certificate replay.

## Trust boundary

Module parsing, path resolution, graph construction, environment assembly, and visibility are untrusted frontend operations. They may select/produce candidate explicit Core declarations. The kernel independently validates those declarations and has no module/path/import rule.

Strict verification does not rerun module resolution or load project plugins. It validates v11/v2 provenance and independently replays the explicit Core.

## Explicitly unsupported/deferred

- `public import`;
- `meta import`;
- `import all`;
- package/system module resolution;
- namespaces;
- sections;
- `open`;
- module interface/cache semantics;
- module-scoped typeclass visibility/local/scoped instances.

These must return the appropriate `unsupported` result rather than being assigned substitute semantics.
