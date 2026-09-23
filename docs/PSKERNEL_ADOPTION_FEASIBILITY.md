# PSKernel Adoption Feasibility

Status: **bounded spike in progress; broad migration is not authorized**

Branch: `integration/pskernel-adoption-feasibility`  
Base branch: `product/v1-completion`  
Base at spike creation: `6bbaa2c8681cf52c5f1ef91a39be153e51af6824`

Paired PSKernel branch: `dwijayuda/pskernel:integration/proofscript-extraction-feasibility`

## Decision

**Provisional GO for the dependency boundary; NO-GO for broad migration yet.**

The repositories already contain most of the architectural ingredients needed for
`ProofScript -> external PSKernel`. The first spike therefore tests whether the
current rich ProofScript product can add PSKernel re-admission without replacing
its parser, elaborator, verification system, backend, or tooling.

Broad migration remains blocked until the cross-repository executable gate runs
successfully and affected Product-v1 regression gates are green.

## Most important finding

The current `@proofscript/kernel` is already documented in its own source as a
**pskernel-derived TypeScript mirror**, but it represents the older ProofScript
Lean-4.33.1 lineage.

The convergence question is therefore not whether ProofScript should suddenly
adopt an unrelated kernel architecture. It is whether the copied/mirrored kernel
can eventually be replaced by the stronger independently maintained Lean-4.34
PSKernel package without losing the larger ProofScript product surface.

That makes the experiment materially more attractive than a clean-room rewrite,
but semantic-baseline and Core-shape differences still make a direct package
swap unsafe.

## Ownership inventory

| Responsibility | Disposition | Reason |
| --- | --- | --- |
| PSKernel `src/core`, `src/kernel` | **KEEP IN PSKERNEL** | Trusted logical acceptance, Lean 4.34 compatibility and differential work belong in the small independent TCB. |
| ProofScript `packages/kernel` | **RETAIN TEMPORARILY AS ADAPTER / RETIRE AFTER REPLACEMENT GATES** | It is the current Product-v1 Core authority and cannot be removed before feature-by-feature external re-admission is proven. |
| ProofScript syntax/parser | **KEEP IN PROOFSCRIPT** | Broader product surface and normative v0.6.1/v0.7 ownership already live here. |
| PSKernel `packages/syntax` | **PORT/HARVEST SELECTIVELY** | Useful cleaner parser/reference work; must not become a second production syntax authority. |
| ProofScript elaborator/frontend | **KEEP IN PROOFSCRIPT, CONVERGE INTERNALLY** | Much broader language coverage, modules, typeclasses, recursion, verification and editor integration. |
| PSKernel `packages/meta` / `packages/elab` | **PORT/HARVEST SELECTIVELY** | Cleaner Lean-compatible metavariable/elaboration architecture is valuable where it replaces, rather than duplicates, Product-v1 behavior. |
| PSKernel `packages/checked-core` design | **PORT/HARVEST INTO PROOFSCRIPT** | Kernel re-admission before compilation is the desired long-term compiler boundary. |
| ProofScript verification/contracts | **KEEP IN PROOFSCRIPT** | `requires/ensures/assert/ghost/old/frame/invariant/decreases` are source/product concepts and should lower to ordinary Core. |
| ProofScript stdlib/runtime | **KEEP IN PROOFSCRIPT** | Product runtime/API coverage is much broader than the PSKernel outer-stack MVP. |
| PSKernel `packages/erasure` | **PORT/HARVEST SELECTIVELY** | Its checked-core-only and generic-erasure discipline is stronger and should inform the canonical ProofScript execution path. |
| ProofScript backend-typescript | **KEEP IN PROOFSCRIPT** | Broad Product-v1 runtime coverage exists here. Mine stronger erasure/IR ideas rather than replace wholesale. |
| PSKernel compiler IR/backend/compiler | **DONOR ONLY AFTER GATES** | Useful architecture, narrower feature coverage. Do not create parallel production backends. |
| ProofScript compiler | **KEEP IN PROOFSCRIPT** | Canonical public source/project facade and editor boundary. |
| ProofScript language-service/worker/LSP/VS Code | **KEEP IN PROOFSCRIPT** | Considerably broader product tooling and correct compiler-backed ownership. |
| PSKernel language-service/LSP/project | **DO NOT EXPAND; DONOR ONLY** | They demonstrate architecture but would duplicate the product repo if independently completed. |
| Lean replay/oracle/kernel conformance | **KEEP IN PSKERNEL** | Kernel-specific compatibility/assurance. |
| ProofScript Lean verification/oracle for source contracts | **KEEP IN PROOFSCRIPT** | Product-level assurance and VC workflows remain language owned. |

## Minimum external PSKernel API

The spike uses only the root `lean-ts-kernel` package façade:

- structured `Name` values and helpers;
- `Level` constructors;
- kernel `Expr` constructors/types;
- `Environment`;
- `Kernel` declaration admission;
- public inductive admission only when a later slice requires it;
- `TypeChecker` only if future diagnostics/inference require it.

ProofScript must not import `lean-ts-kernel/src/core/*` or
`lean-ts-kernel/src/kernel/*`.

If a future slice cannot be implemented without broad internal imports, that is
a STOP signal rather than permission to expand the public kernel API casually.

## First vertical slice

Source:

```proofscript
function identity {α : Type}(x : α) : α := x;
```

The spike in `tools/pskernel-adoption-feasibility.mjs` deliberately does not
replace the existing frontend or backend.

It exercises:

```text
ProofScript source
  -> existing canonical ProofScript parser/elaborator
  -> existing ProofScript Core declaration
  -> bounded Core adapter
  -> external Lean-4.34 PSKernel admission
  -> existing ProofScript backend
  -> TypeScript / JavaScript
```

External re-admission is a hard additional gate. Backend emission occurs only
after re-admission succeeds.

For the first slice the adapter supports only the Core forms required by the
identity declaration and fails closed on unsupported forms.

The gate also requires emitted JS and TS to remain byte-for-byte identical to
the existing Product-v1 backend and executes the generated JavaScript identity.

## Why this is not a third frontend

The spike does not parse or elaborate source independently. It consumes the
declaration already produced by the canonical ProofScript frontend and asks the
external kernel to re-admit it.

This is intentionally an intermediate experiment. If convergence continues,
the target is to move the kernel-admitted checked-Core boundary earlier and
remove the old mirror—not to preserve two permanent logical authorities.

## Running the cross-repository gate

In a PSKernel feasibility checkout:

```bash
npm install
npm run test:public-consumer
npm pack
```

In a ProofScript feasibility checkout:

```bash
npm ci
npm run build
npm install --no-save --package-lock=false ../pskernel/lean-ts-kernel-0.1.0.tgz
node tools/pskernel-adoption-feasibility.mjs
```

Then run affected existing Product-v1 gates, at minimum:

```bash
npm run test:product-v1:software-profile
npm run test:profile:software
npm run test:profile:software:examples
npm run test:reference:v061:production-reference-parity
```

No passing claim may be made until the commands actually execute.

## Hosted CI status

A branch-specific PSKernel workflow was added to execute the public-consumer
gate. Its first GitHub Actions run did **not execute repository code**: GitHub
reported an empty runner name, `runner_id = 0`, and zero job steps. This is an
infrastructure/runner-allocation failure, not evidence of a code failure or
success.

## Core-shape differences found

The migration is not a package-name substitution.

Current ProofScript Core uses, among other differences:

- string `Name` values;
- `tag`-discriminated levels/terms;
- binder name `explicit`;
- a Product-v1 declaration/artifact format tied to the 4.33.1 lineage.

Standalone PSKernel uses:

- structured Lean `Name` values;
- `kind`-discriminated Levels/Exprs;
- Lean-style binder name `default`;
- richer Lean-4.34 declaration metadata.

The first adapter is intentionally small. A broad permanent translation layer
would be a warning sign: the long-term design should converge Core/elaboration
representation rather than endlessly translate between two cores.

## Risks before broader migration

1. **Semantic baseline change:** Product-v1 historical Core is 4.33.1-oriented; standalone PSKernel targets Lean 4.34.
2. **Core representation mismatch:** a large adapter would defeat the convergence goal.
3. **Prelude/environment:** generic identity needs no imported runtime constants, but Nat, structures and real programs require a shared admitted environment policy.
4. **Inductives/recursors:** PSKernel is stronger, but source/runtime migration still needs careful checked metadata and erasure.
5. **Product breadth:** ProofScript verification, stdlib, modules and tooling must not regress to the narrower PSKernel outer-stack MVP.
6. **Packaging:** PSKernel is intentionally still a private package; release/versioning must be decided separately.
7. **Execution correspondence:** external kernel admission proves logical acceptance, not correctness of the existing TypeScript backend.

## GO / STOP interpretation

### Continue the bounded experiment if

- the packed external package works without internal imports;
- the identity slice passes external admission and identical runtime emission;
- affected Product-v1 gates remain green;
- the next Nat or structure slice can reuse the same small boundary;
- the old mirrored kernel path becomes measurably removable.

### Stop broad migration if

- adapter coverage grows into a second permanent Core implementation;
- ProofScript needs access to PSKernel internals;
- the 4.33.1 -> 4.34 transition changes accepted Product-v1 semantics unexpectedly;
- verified Product-v1 features would need to be redesigned or discarded;
- the integration adds more duplicate semantics than it eliminates.

## Next bounded step

Do **not** migrate all features.

After the identity gate executes green, the next useful slice should be one of:

1. Nat function composition, which forces a shared admitted prelude/environment;
2. simple structure + projection, which exercises PSKernel-generated metadata and checked erasure.

The first of those that requires invasive unrelated changes is the point to
re-evaluate the migration.

## Current verdict

The architecture is plausible and the migration may be worth doing because
ProofScript already embeds a pskernel-derived mirror. But the evidence threshold
for a broad migration has not been met yet.

**Current decision: continue only the feasibility branch until executable
cross-repo evidence is green. Keep all current product branches untouched.**
