# Frontend Convergence Plan

Status: PS1 migration plan. No frontend is deleted by this document.

## Why convergence is required

KA146 contains two substantial source-processing paths:

```text
Path A — current CLI/native-Core path

@proofscript/syntax
  -> @proofscript/parser
  -> @proofscript/elaborator
  -> @proofscript/frontend
  -> PSKernel Core
  -> @proofscript/kernel


Path B — rich frontend-next path

frontend-next lexer/parser
  -> frontend-next elaborator
  -> frontend-next IR/registry/features
  -> target/prover plugins
  -> @proofscript/unified-bridge
  -> PSKernel Core / environment
```

Keeping both as independent language implementations indefinitely would make drift inevitable.

## Current strengths

### Path A: `parser/elaborator/frontend`

Strengths:

- used by the current standalone CLI;
- lowers directly into the checked PSKernel/Core model;
- trust boundary is straightforward;
- integrates the current module/project graph;
- already under KA137/KA140/KA146 product workflow tests;
- easiest path for native `psc check` independence from Lean.

Weaknesses / gaps to audit:

- editor-grade source mapping;
- incremental module snapshots;
- document overlays;
- cancellation;
- richer target capability model;
- some richer frontend-next surface features.

### Path B: `frontend-next`

Substantial existing capabilities include:

- independent lexer/parser/elaborator;
- explicit IR model;
- registry and operation/capability system;
- feature plugins;
- backend feature plugins;
- Lean prover integration;
- TypeScript backend integration;
- module interfaces;
- incremental snapshots/reuse;
- richer project checking;
- a separate CLI;
- type-family/type-utility infrastructure.

Weaknesses / risks:

- duplicates language parsing/elaboration semantics;
- does not itself make PSKernel Core the only semantic endpoint;
- requires `unified-bridge` to connect its IR to the native Core/kernel world;
- feature/plugin registration can become a second definition of the language if not governed by the reference registry.

## Target architecture

There should be **one source-language semantic path** and potentially multiple derived service/IR views.

Target:

```text
v0.6.1/v0.7 reference registry
              |
              v
         syntax/parser
              |
              v
          elaborator
              |
              v
      explicit checked Core
              |
              +------> PSKernel
              |
              +------> semantic/execution IR
              |             |
              |             +--> TypeScript backend
              |
              +------> language-service snapshots
              |             |
              |             +--> LSP
              |
              +------> Lean export/oracle
```

A feature must not have one meaning in `frontend` and another in `frontend-next`.

## Migration strategy

### F0 — inventory

For every frontend-next capability, mark:

- already available in Path A;
- needed and portable;
- editor-only;
- backend-only;
- verification-only;
- obsolete/experimental;
- requires specification work.

No code deletion.

### F1 — reference conformance

Run the v0.6.1 compiler-ready corpus against the production source path.

This answers the first question before architecture work:

> Which frontend actually conforms to the declared language?

### F2 — Core as convergence boundary

All verified source features must produce explicit checked Core before they gain a product verification claim.

`unified-bridge` remains useful during this phase as a differential/conformance adapter.

### F3 — migrate non-semantic infrastructure

Prefer moving/reimplementing these capabilities around the canonical source path before language features:

- module interface hashes;
- incremental snapshots;
- reusable project/module data;
- cancellation hooks;
- document overlays;
- structured diagnostics/source maps.

These capabilities are especially valuable for the future language-service/LSP and should not require a second parser.

### F4 — execution IR

Decide whether frontend-next IR or `@proofscript/semantic-ir` should become the execution-facing IR.

Required properties:

- derived only from checked semantics;
- proof-only terms can be erased explicitly;
- backend capability checks happen after logical checking;
- representation has versioned correspondence tests.

Do not let a runtime IR become an alternative proof checker.

### F5 — feature migration

For each frontend-next-only language feature:

1. identify its specification feature ID;
2. add positive/negative conformance tests;
3. implement it in the canonical syntax/parser/elaborator path;
4. check generated Core;
5. compare Lean lowering where specified;
6. compare runtime output where applicable;
7. only then retire the duplicate frontend-next implementation.

### F6 — bridge retirement

`@proofscript/unified-bridge` can be removed when:

- no production or editor path requires frontend-next IR-to-Core translation;
- every retained feature reaches Core through the canonical frontend;
- bridge integration fixtures have replacements in ordinary conformance/acceptance tests.

### F7 — frontend-next retirement or reduction

Possible final outcomes:

A. **Retire frontend-next entirely** after its useful capabilities are migrated; or

B. **Reduce it to non-semantic infrastructure** (for example an incremental/editor service) that consumes canonical compiler results.

Do not retain an independent parser/elaborator merely for compatibility.

## LSP consequence

The old LSP should not be rebased directly onto either parser implementation.

Target:

```text
canonical compiler
       |
       v
language-service
       |
       +--> source maps
       +--> diagnostics
       +--> semantic symbols
       +--> incremental project/document state
       +--> cancellation-aware queries
       |
       v
language-worker (optional isolation)
       |
       v
LSP transport
```

This makes frontend convergence largely transparent to the LSP.

## Guardrails

- no new frontend-next-only verified language features during PS1;
- no direct LSP dependency on kernel internals;
- no duplicate parser behavior added to language-service;
- no bridge deletion before its regression fixtures have canonical replacements;
- no frontend choice based on LOC or naming ("next"); choose by conformance and required capabilities;
- keep PS1 product CI green after each migration step.
