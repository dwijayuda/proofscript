# Architecture

## Layers

```text
specs/                         normative ProofScript reference + versioned implementation contracts
   |
packages/kernel                smallest trusted logical checker
packages/kernel-codec          inert artifact validation boundary
packages/verifier              isolated replay / axiom policy
   |
packages/std                   source-controlled checked bootstrap declarations/artifact
packages/environment           recheck/import checked core environments; expose globals to elaboration
   |
packages/syntax                source representation
packages/parser                source parser for implemented profile
packages/elaborator            source -> explicit kernel terms
packages/recursion             structural-recursion source compiler; no kernel rules
packages/typeclass             class/instance registration + search metadata; no kernel rules
packages/project               config + deterministic source-root/module graph resolution
packages/frontend              module-aware source/prelude orchestration
   |
packages/semantic-ir           checked execution-facing snapshot
packages/compiler              backend dispatch
   |
packages/plugin-api            versioned capability API, intentionally no kernel hooks
packages/plugin-host           npm plugin resolution/loading for non-verifier workflows
   |
plugins/official/*             first-party plugins
plugins/examples/*             third-party-style examples
```

## Security zones

**Zone A / trusted logical checker:** `kernel`, validated `kernel-codec`, isolated `verifier` logic.

**Checked data, not new kernel rules:** the standard bootstrap (`std/core/bootstrap.pscore.json`) is replayed through Zone A. `Eq`, `Nat`, `Bool`, and `Nat.add` are declarations accepted by the kernel, not JavaScript primitives.

**Zone B / proof-producing but untrusted:** parser, macro system (future), elaborator, environment orchestration, typeclass registration/search, recursion compiler, tactics (future), verification extensions (future).

**Zone C / execution and tooling:** semantic IR, compiler, backends, FFI, formatter, LSP, npm plugin host.

A Zone B or C bug may cause wrong source interpretation or wrong executable output. It must not be able to make the kernel accept an ill-typed core declaration.

## K2c/K2d/K2e source lowering boundary

`structure` and `match` remain frontend/elaboration concepts in the current profile:

```text
structure source
   -> one-constructor inductive
   -> generated recursor
   -> transparent recursor-backed projection definitions

match source
   -> exhaustiveness/constructor checks in elaborator
   -> ordinary recursor application
```

Neither construct adds a kernel declaration/term primitive. This is intentional: the current logical kernel remains focused on explicit dependent core declarations and recursor computation. Native Lean structure metadata and richer dependent pattern compilation remain separate conformance work.

K2d extends only the frontend side of this boundary:

```text
recursive def source
   -> structural-recursion analysis (@proofscript/recursion)
   -> recursive calls become internal recursor-IH references
   -> existing match lowering
   -> ordinary recursor application
   -> transparent definition + ordinary checked f.eq_N theorems
```

The internal IH marker is intentionally not a valid source identifier. The elaborator supplies it only for constructor fields that kernel-generated recursor metadata marks recursive. No plugin or source construct can register a new kernel recursion rule.

K2e adds another frontend-only normalization layer:

```text
def f : A → B
  | .c1 => rhs1
  | .c2(x) => rhs2

   -> equation-clause parser
   -> one synthetic explicit argument + ordinary match AST
   -> K2d structural-recursion analysis when self-calls are present
   -> K2c match lowering
   -> existing recursor applications
   -> ordinary definition + checked f.eq_N theorems
```

There is no equation-clause, pattern-matching, or recursive-definition kernel node. The current K2e slice intentionally supports one pattern argument and constructor patterns only; numeric/wildcard/richer pattern syntax remains future frontend work.

## Standard bootstrap flow

```text
Foundation.ps
   |
   v
frontend -> kernel
   |
   v
bootstrap.pscore.json
   |
   +--> environment loader -> globals for user elaboration
   |                           |
   |                           v
   |                       user declarations
   |                           |
   +---------------------------+
               |
               v
       self-contained .pscore
               |
               v
         isolated psverify
```

`--std` is explicit in the current bootstrap. K3b module imports are resolved by the ProofScript project/module layer and elaborate into the same explicit checked environment; they are not JavaScript imports.

## Lean oracle correspondence

For an artifact beginning with the **exact checked standard-bootstrap prefix**, Lean export can validate/remove that prefix and let emitted user terms refer to Lean's existing `Eq`, `Nat`, `Bool`, recursors, and `Nat.add`. The intended mapping and bootstrap core hash are recorded in `packages/std/bootstrap-manifest.json`.

The initial pinned mapping campaign has now executed against the official Lean 4.33.1 release commit `819816b2e0a3bf405af45ae5c7af2491d8f5bee6`: all 21 schema-2 cases passed, covering 15 required observation dimensions. This validates the tested implemented slice only; it is not a full-Lean/full-reference claim. The differential layer distinguishes semantic equivalence, negative agreement, and capability gaps, and requires executable evidence for every claimed semantic dimension; its fake-oracle harness self-test validates control flow only and cannot satisfy the semantic-evidence gate.

The real oracle run also hardened Lean export without changing Core semantics: universe levels are emitted with precedence-safe Lean syntax; ProofScript equation theorems that collide with Lean equation-compiler reserved names receive deterministic Lean-only names with all references rewritten; and definitions lowered through user recursors are selectively emitted as `noncomputable` when Lean's native code generator would otherwise reject direct recursor use. These are exporter/interoperability transformations outside the kernel.

## Plugin architecture

Plugin API v1 freezes only backend/oracle registration. The manifest already has version/capability fields so syntax/macro/elaborator/tactic/library APIs can be added later without exposing kernel mutation. Future frontend extension APIs must preserve command-by-command ProofScript/Lean parser-elaborator state rather than becoming a fixed TypeScript-parser callback system.

## Dependency direction

`tools/check-boundaries.ts` enforces the first hard rules:

- `@proofscript/kernel` may not depend on another ProofScript package;
- `@proofscript/verifier` may depend only on kernel, kernel-codec, certificates (plus Node built-ins);
- no plugin may import `@proofscript/kernel`;
- plugin API must not import the kernel.

The rule set should become stricter as the implementation grows.
## K2n typeclass environment boundary

K2n treats typeclasses as environment/elaboration semantics, not as new kernel declarations:

```text
class source
   -> ordinary one-constructor inductive + projections
   -> kernel check
   -> validated class registration metadata

instance source
   -> ordinary definition
   -> kernel check
   -> validated instance registration metadata
```

Core artifact v10 serializes class parameter metadata and registrations separately; frozen v9 parameterless registries remain replayable. `@proofscript/verifier` remains isolated from `@proofscript/typeclass`; it validates registration metadata against decoded declarations and then replays the logical declarations with the kernel. Candidate ordering/search is therefore Zone B behavior and can never make an ill-typed declaration acceptable to Zone A.

Lean export consumes the same validated registrations to reconstruct Lean `class` and `instance` commands. This preserves the environment observation instead of pretending the lowered inductive/definition alone captures typeclass behavior.
## K2o instance-search boundary

K2o consumes K2n registration metadata only in the untrusted elaboration layer:

```text
instImplicit Pi goal C
   -> rank global C registrations
   -> infer candidate constant type
   -> kernel defEq(candidateType, C)
   -> insert candidate as ordinary App argument
   -> emit explicit Core
```

`@proofscript/verifier` does not depend on `@proofscript/typeclass` and never executes search. The search algorithm can therefore be wrong in source interpretation without gaining the ability to make the kernel accept ill-typed Core.



## K3a/K3b/K3c module, interface, and names boundary

K3a/K3b/K3c keep modules and source name-resolution state outside the logical kernel:

```text
.ps files + sourceRoots
   -> deterministic module graph / cycle+ambiguity checks
   -> dependency-scoped elaboration
   -> explicit self-contained Core declarations
   -> kernel check
   -> v12 module/interface provenance metadata
```

The kernel does not resolve paths, execute imports, read project configuration, compute cache keys, or know module syntax. Artifact v12 carries validated nonlogical metadata: entry module, exact source hashes, ownership, explicit exports, ordered plain import edges, dependency-interface fingerprints, semantic module-interface fingerprints, base-environment fingerprint, and deterministic cache keys. Historical v11/K3a module metadata is still accepted and upgraded by the codec for replay.

The interface fingerprint includes complete exported Core declarations, including reducible definition bodies, plus owned class/instance registration metadata and dependency-interface identities. This is necessary because downstream elaboration and definitional equality can depend on implementation bodies and registration ordering. A names/types-only interface would be an unsound cache boundary.

`cacheKeySha256` additionally commits to exact source bytes. Therefore a comment-only change may preserve the semantic interface but invalidate that module's exact-source cache identity; a semantic dependency change propagates through downstream interface/cache identities. No persistent cache payload is trusted by the kernel, and strict verification never reuses frontend cache results instead of replaying Core.

Certificate v2 binds every transitive source module to the artifact metadata and Core hash. Strict verification requires the certificate module set to equal the artifact module set; each source hash must match both certificate and artifact before independent Core replay. The verifier remains dependency-isolated and does not load project plugins or rerun module resolution/typeclass search.

Implemented through K3c-names0: all K3b module/interface guarantees plus brace-shaped namespaces, hierarchical declaration qualification, current-namespace outward lookup, relative qualified lookup, `_root_.` lookup, namespace-scoped universe parameters, qualified recursive-name lowering, and exact-Lean-tested root-safe export. Namespace state disappears before Core. Deferred: sections, `open`, `public import`, `meta import`, `import all`, package/system resolution, private/internal visibility, persistent compiled cache IO, and module-scoped instance visibility.

## K3c section-variable boundary

`variable`, theorem `include`, and theorem `omit` are frontend environment commands. K3c-section-vars0 computes the required section-variable dependency closure and lowers it into ordinary declaration `Pi` telescopes and definition `Lam` binders before Core crosses the trust boundary. BinderInfo is preserved; the kernel receives no section scope, inclusion policy, or automatic-generalization rule.

For supported definitions/examples, variables referenced by declaration types/bodies are generalized. For theorems, the statement plus explicit `include` policy determines the available section variables; proof-only access to an un-included section variable is rejected. `omit` rejects a theorem that still requires the omitted variable or one of its dependencies. Section instance variables and omit-by-type remain fail-closed until lexical typeclass visibility is implemented.

## KERNEL-structure-eta0 trust-core extension

Core v15 adds a profile-gated raw projection term (`Proj(typeName, fieldIndex, major)`) to the trusted expression language. The kernel—not the frontend—checks its target/type and performs constructor projection reduction. Definitional equality uses these trusted projections to implement Lean's eta rule for nonrecursive one-constructor zero-index inductives. Namespace/source projection syntax remains frontend logic and may continue to elaborate to ordinary Core definitions; no plugin may alter projection checking or eta eligibility.
