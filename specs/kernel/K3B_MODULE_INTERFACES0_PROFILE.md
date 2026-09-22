# K3b-module-interfaces0 implementation profile

K3b is a module-interface/provenance hardening milestone. It does **not** change the trusted logical Core calculus or kernel typing rules inherited from K3a/K2r.

## Implemented additions over K3a

- Core artifact v12;
- module-interface format v1;
- explicit per-module `exports` metadata;
- ordered import-edge metadata with current mode `plain`;
- imported-interface SHA-256 binding on every direct edge;
- canonical semantic module-interface SHA-256;
- deterministic module cache-key SHA-256;
- checked base/prelude-environment SHA-256;
- strict replay-time recomputation of base/interface/cache identities;
- semantic-change propagation through dependency-interface fingerprints;
- comment/whitespace source changes may preserve interface identity while changing exact-source/cache identity;
- historical v11/K3a artifact upgrade/replay;
- certificate v2 continues to bind every transitive source plus Core;
- no project plugins during strict verification.

## Interface trust boundary

Interface/cache metadata is **not a proof** and is not trusted by the logical kernel. The codec recomputes the metadata from decoded Core declarations, validated typeclass registrations, module ownership, source hashes, and dependency edges. The verifier then independently checks the explicit Core declarations in a fresh kernel environment.

A future frontend cache may use `cacheKeySha256` to decide whether a candidate frontend result is reusable, but cache reuse must never bypass Core decoding/validation and kernel replay where strict verification is required.

## Visibility status

K3b introduces explicit export metadata but intentionally does not invent private/public semantics:

- every currently owned declaration is exported;
- `imports[].mode` is currently only `plain`;
- `public import`, `meta import`, and `import all` remain unsupported;
- no module-scoped instance visibility is claimed.

This is deliberate groundwork so later visibility behavior can be added as a semantic extension rather than retrofitted through ambiguous metadata.

## Explicitly unsupported/deferred

- `public import` execution semantics;
- `meta import`;
- `import all`;
- package/system module resolution;
- namespaces, sections, and `open`;
- private/internal source declarations;
- persistent compiled module cache loading/writing;
- module-scoped typeclass registrations/local/scoped instances.

These remain `unsupported` rather than being flattened into existing plain-import/global-instance behavior.
