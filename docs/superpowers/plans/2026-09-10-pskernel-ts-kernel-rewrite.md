# pskernel TypeScript Kernel Rewrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the old compact ProofScript kernel with a pskernel-derived TypeScript kernel mirror that can become the standalone ProofScript kernel.

**Architecture:** Keep `@proofscript/kernel` as the public package name, replace its active source layout with `PSKernel/**/*.ts`, and quarantine the old K3-TB code as historical evidence. Core implementation modules are partial and fail closed; `Theory/` and `Verify/` are proof-obligation mirrors.

**Tech Stack:** TypeScript 5.8, Node 20, npm workspaces, CommonJS project references.

**Spec:** `docs/PSKERNEL_TS_PHASE_PLAN.md`

## Global Constraints

- Semantic baseline: Lean 4.33.1 / `819816b2e0a3bf405af45ae5c7af2491d8f5bee6`.
- Trust label: trusted-boundary standalone kernel; not fully formally equivalent to Lean 4 yet.
- Minimal tests only: build plus smoke checks.
- Unsupported behavior must fail closed.
- Do not keep two competing active kernels.

---

### Task 1: Phase 0 docs and port map

**Files:**
- Create: `docs/PSKERNEL_TS_REWRITE_FINDINGS.md`
- Create: `docs/PSKERNEL_TS_PORTING_MAP.md`
- Create: `docs/PSKERNEL_TS_PHASE_PLAN.md`

**Interfaces:**
- Consumes: uploaded pskernel file inventory.
- Produces: phase plan and one-to-one source mapping.

- [x] Write findings before code changes.
- [x] Generate one TypeScript target path for every Lean source file.
- [x] Mark proof files as obligations rather than proofs.

### Task 2: Active kernel skeleton mirror

**Files:**
- Replace: `packages/kernel/src/**`
- Preserve: `legacy/kernel-k3tb-v71/src/**`

**Interfaces:**
- Consumes: `docs/PSKERNEL_TS_PORTING_MAP.md`.
- Produces: buildable `packages/kernel/src/PSKernel/**/*.ts` mirror.

- [x] Quarantine old K3-TB source outside active package.
- [x] Create mirror `.ts` files for all 112 pskernel `.lean` files.
- [x] Add portStatus metadata to stubs.

### Task 3: Core partial implementation

**Files:**
- Create/modify: `packages/kernel/src/PSKernel/Level.ts`
- Create/modify: `packages/kernel/src/PSKernel/Expr.ts`
- Create/modify: `packages/kernel/src/PSKernel/Declaration.ts`
- Create/modify: `packages/kernel/src/PSKernel/Environment.ts`
- Create/modify: `packages/kernel/src/PSKernel/TypeChecker.ts`
- Create/modify: `packages/kernel/src/PSKernel/Replay.ts`

**Interfaces:**
- Produces: `Level`, `Term`, `CoreDeclaration`, `Environment`, `infer`, `check`, `defEq`, `checkCoreDeclarations`.

- [x] Implement level constructors/normalization/equality.
- [x] Implement term constructors/helpers/substitution/level instantiation.
- [x] Implement declaration and environment admission skeleton.
- [x] Implement partial infer/whnf/defEq/check.
- [x] Implement replay/check summary.

### Task 4: Minimal smoke verification

**Files:**
- Create: `tools/pskernel-kernel-smoke.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `@proofscript/kernel` public exports.
- Produces: minimal wiring confidence.

- [ ] Run `npm run build`.
- [ ] Run `node tools/pskernel-kernel-smoke.ts`.
- [ ] Package the resulting workspace zip.
