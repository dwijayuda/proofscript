# Frontend Capability Convergence Matrix

Status: PS1 working migration matrix.

This matrix distinguishes **language semantics** from **compiler/editor infrastructure**. The goal is not to preserve every historical implementation. The goal is to preserve every capability that is still useful while converging on one source-language semantic path.

## Current paths

### Canonical product path

```text
@proofscript/syntax
  -> @proofscript/parser
  -> @proofscript/elaborator
  -> @proofscript/frontend
  -> checked Core
  -> @proofscript/kernel
  -> @proofscript/compiler
  -> CLI / language-service
```

This path currently owns native `psc check`, the restored editor stack, and the PS1 regression gates.

### Experimental frontend-next path

```text
frontend-next lexer/parser
  -> frontend-next elaborator
  -> frontend-next IR / registry
  -> feature/backend/prover plugins
  -> unified-bridge
  -> PSKernel/Core experiments
```

This path contains useful infrastructure and a broad feature reservoir, but must not remain a second independent definition of ProofScript semantics.

## Capability decisions

| Capability | Canonical path today | frontend-next today | PS1 decision |
|---|---|---|---|
| v0.6.1 production surface parsing | Yes; 20/20 registered production corpus cases | Independent parser | **KEEP canonical; retire duplicate semantic ownership eventually** |
| Native Core elaboration | Yes | Independent IR elaboration | **KEEP canonical** |
| PSKernel checking | Direct | Via unified bridge / integration | **KEEP canonical** |
| Project/module graph | Yes | Yes | **KEEP canonical project package; port useful metadata only** |
| Unsaved document overlays | Yes, restored in `@proofscript/project` | Historical/editor ideas existed | **KEEP canonical** |
| Language-service boundary | Yes | No longer needed as semantic owner | **KEEP canonical** |
| Worker isolation/cancellation | Yes | Not a frontend responsibility | **KEEP canonical editor stack** |
| LSP transport | Yes, minimal diagnostics implementation | Old donor depended on both paths | **KEEP compiler-backed LSP** |
| Module interface hashing | Limited canonical equivalent | Rich public/private interface hashes | **PORT concept/API** |
| Persistent incremental module cache | Not yet | Rich implementation | **PORT after interface model is defined** |
| Dependency-aware incremental invalidation | Not yet | Yes | **PORT** |
| Exact compiler/plugin/baseline cache identity | Not yet | Yes | **PORT concept; use current product manifest versions** |
| Plugin registry / capability registry | Current plugin-api/host exists, narrower | Rich registry | **FREEZE; evaluate extension points individually** |
| Feature plugins | Not canonical source semantics | Many language features | **MINE feature-by-feature through spec/promotion gates; do not bulk-merge** |
| TypeScript backend features | Canonical backend-typescript exists | Large alternate TS backend feature set | **MINE missing behavior; keep one production backend** |
| Rust backend | Out of PS1 scope | Exists experimentally | **DEFER; preserve as reference** |
| Lean prover/export integration | Canonical lean-export/oracle packages exist | Lean prover plugin | **KEEP canonical bridge; mine useful tests only** |
| Execution IR | `@proofscript/semantic-ir` is narrow/experimental | Rich IR model | **DECIDE later from checked-Core derivation requirements** |
| Source locations / editor semantic maps | Partial | Richer historical/editor concepts | **PORT through compiler APIs, not a second parser** |
| Target capability checks | Partial / backend-specific | Rich target registry | **PORT only when multiple active targets require it** |
| Feature provenance/plugin hashes | Partial | Stronger incremental metadata | **PORT into release/cache metadata where useful** |

## frontend-next feature reservoir

The package contains a large set of feature modules, including:

- core declarations, theorem/equality, local binding, conditionals;
- Nat/Int/UInt families, String, Bool, Unit;
- structures, ADTs, match, Option, List, Except, Array;
- typeclasses, order/ord/lawful-order, coercions;
- contracts and verification-adjacent experiments;
- IO and filesystem/process experiments;
- Rust black-box and Rust backend experiments.

These modules are **not automatically product features**.

Promotion rule:

1. identify the active specification feature/profile;
2. add positive and fail-closed negative cases;
3. implement/verify through the canonical parser/elaborator/Core path;
4. add runtime/backend correspondence tests when executable;
5. only then retire the duplicate frontend-next implementation for that feature.

## frontend-next infrastructure worth preserving

The following are high-value designs independent of duplicate language semantics:

### Module interfaces

`core/module-interface.ts` models public/private semantic interfaces.

Target location after migration: project/compiler infrastructure, derived from canonical checked results.

### Incremental snapshots

`core/incremental.ts` contains:

- source hashes;
- semantic IR hashes;
- public/private interface hashes;
- plugin-set identity;
- dependency-sensitive rebuild/reuse plans;
- persistent module snapshots;
- exact cache probes;
- optional Lean artifact hashes.

Target: port the concepts incrementally after the canonical compiler exposes a stable module snapshot. Do not copy frontend-next IR as a prerequisite.

### Plugin/capability registry

`core/registry.ts` and `core/plugin-api.ts` contain a broad extension model.

Target: retain as an experimental design reservoir. PS1 must not expand the plugin surface simply to preserve historical abstractions.

## unified-bridge disposition

Repository consumers show that `@proofscript/unified-bridge` is primarily used by integration/wave and older production-profile tests. The canonical CLI/LSP path does not depend on it.

Therefore its PS1 role is:

> migration/differential adapter, not product compiler architecture.

Keep it while it provides unique regression evidence.

It becomes removable when all of these are true:

1. no canonical product/editor package imports it;
2. frontend-next-only source semantics required by the product have migrated;
3. each useful bridge integration fixture has a canonical acceptance/differential replacement;
4. execution/backend behaviors retained from frontend-next have canonical tests;
5. incremental/module-interface concepts needed by tooling have moved behind compiler/project APIs.

## Concrete migration sequence

### F1 — canonical editor stack — DONE

```text
compiler
 -> language-service
 -> language-worker
 -> lsp
```

No editor package imports frontend-next or unified-bridge.

### F2 — package metadata convergence — CURRENT

Update machine-readable package classification to match the real compiler/editor dependency graph and enforce it in product CI.

### F3 — interface/incremental extraction

Define a canonical checked-module snapshot from the compiler, then port:

- public/private interface hashing;
- module identity hashes;
- dependency invalidation;
- persistent checked-module cache.

### F4 — bridge fixture migration

Classify each `tools/integration/*` consumer of unified-bridge:

- canonical behavior already covered -> retire duplicate fixture;
- useful behavior missing from canonical path -> create a product/spec gate first;
- backend other than current TS/JS target -> archive/defer;
- experimental feature -> keep outside PS1 product gates.

### F5 — duplicate semantic path retirement

After the required feature and infrastructure migrations:

- stop building frontend-next in normal product CI;
- move it to historical/experimental assurance if still useful;
- remove unified-bridge from active workspaces when no required consumers remain;
- retain Git history/tagged baseline for archaeology.

## Anti-drift rule

No new product language feature may be implemented only in frontend-next during PS1.

If frontend-next contains a desirable feature, it is a **donor implementation**, not a second product roadmap.
