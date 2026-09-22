# P4.75 Cleanup Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the P4.74 standalone PSC-1 MVP so parser, backend, runtime, and live tooling are easier to audit and extend without changing kernel theory or K3-TB trust claims.

**Architecture:** Keep the existing public command/API surface stable while moving large files into focused modules behind compatibility facades. Characterization tests protect behavior first; every extraction must preserve lowering into checked Core and preserve K3-TB status output.

**Tech Stack:** TypeScript monorepo, Node.js ESM/CJS tools, `tsc -b`, npm scripts, standalone ProofScript `.ps` fixtures, existing `@proofscript/*` workspace packages.

**Spec:** `docs/superpowers/specs/2026-09-12-p4-75-cleanup-refactor-design.md`

## Global Constraints

- Preserve K3-TB labels; do not claim full K3 or Lean 4 equivalence.
- Preserve public APIs: `parseSource`, `tokenize`, `emitJavaScriptModule`, `emitTypeScriptModule`, and `node tools/pslive.ts` commands.
- No new kernel rule, axiom, reduction rule, or proof primitive in this cleanup pass.
- Parser sugar remains above the trust boundary and must lower to existing checked `SurfaceTerm` shapes.
- Backend/runtime remain execution infrastructure, not proof authority.
- Write a characterization test before each extraction.
- Run the exact verification command listed for each task before marking it complete.
- Prefer moving code over rewriting logic; behavior changes require a separate failing regression.

---

## Roadmap Summary

| Milestone | Purpose | Main package/tool | Release label |
| --- | --- | --- | --- |
| P4.75 | freeze behavior + add cleanup docs + verification tiers | docs/tools | plan-only / no theory change |
| P4.76 | split parser tokenizer/state/expression/proof/declaration modules | `packages/parser` | behavior-preserving parser cleanup |
| P4.77 | centralize parser sugar builders/lowering helpers | `packages/parser` + `packages/syntax` | sugar cleanup |
| P4.78 | split `pslive` command core from CLI printing | `tools/pslive*.ts` | tooling cleanup |
| P4.79 | consolidate `pslive` smoke harness and wrappers | `tools/pslive-*-tests.ts` | test cleanup |
| P4.80 | split backend TS emitter into names/analysis/term/templates | `packages/backend-typescript` | backend cleanup |
| P4.81 | split runtime capabilities/values/templates | `packages/runtime` | runtime cleanup |
| P4.82 | fix or quarantine reference-governance JSON hang | `tools/reference-language-governance-smoke.ts` | release tooling cleanup |
| P4.83 | add architecture boundary checks for trust-boundary imports | `tools/check-boundaries.ts` | architecture guard |

---

### Task 1: Freeze cleanup baseline and add verification tiers

**Files:**
- Create: `docs/superpowers/specs/2026-09-12-p4-75-cleanup-refactor-design.md`
- Create: `docs/superpowers/plans/2026-09-12-p4-75-cleanup-refactor-roadmap.md`
- Create: `docs/reports/p4/PRODUCTION_P4_75_CLEANUP_REFACTOR_ROADMAP_REPORT.md`
- Modify: `README.md`
- Modify: `package.json`

**Interfaces:**
- Consumes: existing npm scripts and P4.74 package layout.
- Produces: documented Tier A/B/C verification commands and one new npm script `test:pslive:language-fast`.

- [ ] **Step 1: Add a failing script-existence characterization check**

Create `tools/p4-cleanup-roadmap-baseline-tests.ts`:

```js
#!/usr/bin/env node
import fs from "node:fs";

const requiredFiles = [
  "docs/superpowers/specs/2026-09-12-p4-75-cleanup-refactor-design.md",
  "docs/superpowers/plans/2026-09-12-p4-75-cleanup-refactor-roadmap.md",
  "docs/reports/p4/PRODUCTION_P4_75_CLEANUP_REFACTOR_ROADMAP_REPORT.md",
];

const missing = requiredFiles.filter((file) => !fs.existsSync(file));
if (missing.length > 0) {
  console.error(JSON.stringify({ status: "FAIL", missing }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ status: "PASS", checked: requiredFiles.length }, null, 2));
```

- [ ] **Step 2: Run test to verify it fails before docs exist**

Run:

```bash
node tools/p4-cleanup-roadmap-baseline-tests.ts
```

Expected: FAIL with missing files listed.

- [ ] **Step 3: Add docs and script wiring**

Add the spec and plan files from this roadmap. Add report:

```markdown
# Production P4.75 — Cleanup Refactor Roadmap

P4.75 is a cleanup/refactor planning milestone. It adds no kernel rule, no syntax feature, no backend semantic feature, and no Lean-equivalence claim.

## Scope

- Parser split roadmap.
- Backend/runtime split roadmap.
- `pslive` tooling cleanup roadmap.
- Verification tiers.
- K3-TB trust-boundary preservation.

## Trust boundary

This remains K3-TB trusted-boundary work. Formal Lean 4 equivalence remains 0 proven obligations.
```

Modify `package.json` scripts:

```json
{
  "test:p4:cleanup-roadmap": "node tools/p4-cleanup-roadmap-baseline-tests.ts",
  "test:pslive:language-fast": "npm run test:pslive:nat-plus && npm run test:pslive:nat-mul && npm run test:pslive:lean-application && npm run test:pslive:by-sugar && npm run test:pslive:bool-if && npm run test:pslive:bool-operators"
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npm run test:p4:cleanup-roadmap
npm run build -- --pretty false
node tools/pskernel.ts status --json
```

Expected: all commands exit 0; status JSON still says trusted-boundary / not-proven.

- [ ] **Step 5: Commit**

```bash
git add README.md package.json docs/superpowers docs/reports/p4 tools/p4-cleanup-roadmap-baseline-tests.ts
git commit -m "docs: add p4 cleanup refactor roadmap"
```

---

### Task 2: Extract parser tokenizer without changing public API

**Files:**
- Create: `packages/parser/src/tokenize.ts`
- Modify: `packages/parser/src/index.ts`
- Test: `tools/parser-tokenize-characterization-tests.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `ParseError`, `Token` from `@proofscript/syntax`.
- Produces: `export function tokenize(source: string): Token[]` from both `packages/parser/src/tokenize.ts` and public `packages/parser/src/index.ts`.

- [ ] **Step 1: Write the failing characterization test**

Create `tools/parser-tokenize-characterization-tests.ts`:

```js
#!/usr/bin/env node
import './register-local-workspace.cts';
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { tokenize } = require("../packages/parser/dist/index.js");

const tokens = tokenize("-- comment\ndef x: Nat := { 1 + 2 * 3 };\n");
assert.deepEqual(tokens.map((t) => t.text), ["def", "x", ":", "Nat", ":=", "{", "1", "+", "2", "*", "3", "}", ";", "<eof>"]);
assert.throws(() => tokenize("// bad comment"), /standard ProofScript does not use JavaScript/);
assert.throws(() => tokenize("/- unterminated"), /unterminated block comment/);
console.log("PARSER_TOKENIZE_CHARACTERIZATION=PASS");
```

- [ ] **Step 2: Run test to verify current behavior passes before moving code**

Run:

```bash
npm run build -- --pretty false
node tools/parser-tokenize-characterization-tests.ts
```

Expected: PASS. This is a characterization test, so it may pass before extraction.

- [ ] **Step 3: Move tokenizer code**

Move the full `tokenize` implementation from `packages/parser/src/index.ts` into `packages/parser/src/tokenize.ts`:

```ts
import { ParseError, Token } from "@proofscript/syntax";

export function tokenize(source: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  const push = (kind: Token["kind"], text: string, offset: number) => out.push({ kind, text, offset });
  // Move existing implementation body here exactly.
  out.push({ kind: "eof", text: "<eof>", offset: source.length });
  return out;
}
```

Modify `packages/parser/src/index.ts`:

```ts
export { tokenize } from "./tokenize";
import { tokenize } from "./tokenize";
```

- [ ] **Step 4: Run verification**

Run:

```bash
npm run build -- --pretty false
node tools/parser-tokenize-characterization-tests.ts
npm run test:standalone-small
node tools/pskernel.ts status --json
```

Expected: all pass; K3-TB status unchanged.

- [ ] **Step 5: Commit**

```bash
git add packages/parser/src/index.ts packages/parser/src/tokenize.ts tools/parser-tokenize-characterization-tests.ts package.json
git commit -m "refactor(parser): extract tokenizer"
```

---

### Task 3: Extract parser surface builders for sugar lowering

**Files:**
- Create: `packages/parser/src/surface-builders.ts`
- Modify: `packages/parser/src/index.ts`
- Test: `tools/parser-surface-builder-characterization-tests.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `SurfaceTerm` from `@proofscript/syntax`.
- Produces: `natAdd(left, right)`, `natMul(left, right)`, `boolAnd(left, right)`, `boolOr(left, right)`, `boolIf(condition, thenBranch, elseBranch)`.

- [ ] **Step 1: Write failing direct builder tests**

Create `tools/parser-surface-builder-characterization-tests.ts`:

```js
#!/usr/bin/env node
import './register-local-workspace.cts';
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const builders = require("../packages/parser/dist/surface-builders.js");

const one = { tag: "natLit", value: 1 };
const two = { tag: "natLit", value: 2 };
const t = { tag: "boolLit", value: true };
const f = { tag: "boolLit", value: false };

assert.equal(builders.natAdd(one, two).fn.name, "Nat.add");
assert.equal(builders.natMul(one, two).fn.name, "Nat.mul");
assert.deepEqual(builders.boolAnd(t, f), { tag: "bif", condition: t, thenBranch: f, elseBranch: { tag: "boolLit", value: false } });
assert.deepEqual(builders.boolOr(t, f), { tag: "bif", condition: t, thenBranch: { tag: "boolLit", value: true }, elseBranch: f });
console.log("PARSER_SURFACE_BUILDERS=PASS");
```

- [ ] **Step 2: Run test to verify it fails because module does not exist**

Run:

```bash
npm run build -- --pretty false
node tools/parser-surface-builder-characterization-tests.ts
```

Expected: FAIL with missing `dist/surface-builders.js`.

- [ ] **Step 3: Implement builders and replace inline object literals**

Create `packages/parser/src/surface-builders.ts`:

```ts
import { SurfaceTerm } from "@proofscript/syntax";

const natName = (name: "Nat.add" | "Nat.mul"): SurfaceTerm => ({ tag: "name", name, namespacePath: [], openNamespaces: [] });

export function natAdd(left: SurfaceTerm, right: SurfaceTerm): SurfaceTerm {
  return { tag: "app", fn: natName("Nat.add"), args: [left, right] };
}

export function natMul(left: SurfaceTerm, right: SurfaceTerm): SurfaceTerm {
  return { tag: "app", fn: natName("Nat.mul"), args: [left, right] };
}

export function boolIf(condition: SurfaceTerm, thenBranch: SurfaceTerm, elseBranch: SurfaceTerm): SurfaceTerm {
  return { tag: "bif", condition, thenBranch, elseBranch };
}

export function boolAnd(left: SurfaceTerm, right: SurfaceTerm): SurfaceTerm {
  return boolIf(left, right, { tag: "boolLit", value: false });
}

export function boolOr(left: SurfaceTerm, right: SurfaceTerm): SurfaceTerm {
  return boolIf(left, { tag: "boolLit", value: true }, right);
}
```

In `packages/parser/src/index.ts`, replace inline sugar literals in `parseBoolIf`, `parseBoolOr`, `parseBoolAnd`, `parseNatAddition`, and `parseNatMultiplication` with these builder functions.

- [ ] **Step 4: Run verification**

Run:

```bash
npm run build -- --pretty false
node tools/parser-surface-builder-characterization-tests.ts
npm run test:pslive:nat-plus
npm run test:pslive:nat-mul
npm run test:pslive:bool-if
npm run test:pslive:bool-operators
node tools/pskernel.ts status --json
```

Expected: all pass; no K3-TB label change.

- [ ] **Step 5: Commit**

```bash
git add packages/parser/src/index.ts packages/parser/src/surface-builders.ts tools/parser-surface-builder-characterization-tests.ts package.json
git commit -m "refactor(parser): centralize surface sugar builders"
```

---

### Task 4: Extract `pslive` reusable core from CLI dispatch

**Files:**
- Create: `tools/pslive-core.ts`
- Create: `tools/pslive-output.ts`
- Modify: `tools/pslive.ts`
- Test: `tools/pslive-core-characterization-tests.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: existing `checkProjectFile`, `loadStandardBootstrap`, `emitJavaScriptModule`, `emitTypeScriptModule`.
- Produces: `checkSmallSource(file)`, `buildJs(file, out)`, `buildTs(file, out)`, `runCall(file, call, args)`.

- [ ] **Step 1: Write failing reusable-core test**

Create `tools/pslive-core-characterization-tests.ts`:

```js
#!/usr/bin/env node
import './register-local-workspace.cts';
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { checkSmallSource, buildJs, buildTs, runCall } from "./pslive-core.ts";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pslive-core-test-"));
const src = path.join(dir, "Main.ps");
fs.writeFileSync(src, `function double(x: Nat): Nat := { x * 2 }\ndef six: Nat := { double 3 }\ntheorem six_eq: six = 6 := by rfl\n`);

const checked = checkSmallSource(src);
assert.equal(checked.summary.declarations > 0, true);

const jsOut = path.join(dir, "out.js");
const jsResult = buildJs(src, jsOut);
assert.equal(jsResult.status, "accepted");
const api = (await import(pathToFileURL(jsOut).href)).default;
assert.equal(api.six, 6n);

const tsOut = path.join(dir, "out.ts");
const tsResult = buildTs(src, tsOut);
assert.equal(tsResult.status, "accepted");
assert.equal(fs.existsSync(tsOut), true);

const runResult = await runCall(src, "double", [3n]);
assert.equal(runResult.result, "6");
console.log("PSLIVE_CORE_CHARACTERIZATION=PASS");
```

- [ ] **Step 2: Run test to verify it fails because core module does not exist**

Run:

```bash
npm run build -- --pretty false
node tools/pslive-core-characterization-tests.ts
```

Expected: FAIL with missing `tools/pslive-core.ts`.

- [ ] **Step 3: Move reusable functions into `tools/pslive-core.ts`**

Move these functions from `tools/pslive.ts` unchanged where possible:

```js
checkSmallSource
standardPreludeDeclarationCount
stripPreludeDeclarations
emitCheckedJs
parseRunArg
printableRunValue
importCommonJsModule
```

Add exported wrappers:

```js
export function buildJs(file, out) { /* use current build-js logic */ }
export function buildTs(file, out) { /* use current build-ts logic */ }
export async function runCall(file, call, callArgs) { /* use current run logic */ }
```

Create `tools/pslive-output.ts`:

```js
export function printResult(value, json, text) {
  if (json) console.log(JSON.stringify(value, null, 2));
  else console.log(text(value));
}

export function formatCaughtError(e) {
  return e instanceof Error ? e.message : String(e);
}
```

Keep `tools/pslive.ts` as argument parsing and dispatch only.

- [ ] **Step 4: Run verification**

Run:

```bash
npm run build -- --pretty false
node tools/pslive-core-characterization-tests.ts
npm run test:pslive:build-ts
npm run test:standalone-small
node tools/pslive.ts status --json
node tools/pskernel.ts status --json
```

Expected: all pass; CLI output remains accepted/trusted-boundary.

- [ ] **Step 5: Commit**

```bash
git add tools/pslive.ts tools/pslive-core.ts tools/pslive-output.ts tools/pslive-core-characterization-tests.ts package.json
git commit -m "refactor(tools): extract pslive core"
```

---

### Task 5: Consolidate recent `pslive` language smokes

**Files:**
- Create: `tools/pslive-test-harness.ts`
- Create: `tools/pslive-language-smoke.ts`
- Modify: `tools/pslive-nat-plus-tests.ts`
- Modify: `tools/pslive-nat-mul-tests.ts`
- Modify: `tools/pslive-lean-application-tests.ts`
- Modify: `tools/pslive-by-sugar-tests.ts`
- Modify: `tools/pslive-bool-if-tests.ts`
- Modify: `tools/pslive-bool-operators-tests.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `runPsliveJson(args)`, `writeSource(dir, name, text)`, `importBuiltJs(file)` helper functions.
- Produces: one script `npm run test:pslive:language-fast` that covers P4.69–P4.74 features.

- [ ] **Step 1: Write failing consolidated smoke script**

Create `tools/pslive-language-smoke.ts` with imports from a not-yet-existing harness:

```js
#!/usr/bin/env node
import assert from "node:assert/strict";
import { createTempProject, runPsliveJson, importBuiltJs } from "./pslive-test-harness.ts";

const { dir, sourceFile, outJs } = createTempProject("pslive-language-smoke", `
function double(x: Nat): Nat := { x * 2 }
function addTwo(x: Nat): Nat := { x + 2 }
function choose(b: Bool, x: Nat, y: Nat): Nat := { if b && true then x else y }
def result: Nat := { choose (false || true) (double 3) (addTwo 9) }
theorem result_eq: result = 6 := by rfl
`);

const check = runPsliveJson(["check", sourceFile]);
assert.equal(check.status, "accepted");
const build = runPsliveJson(["build-js", sourceFile, "--out", outJs]);
assert.equal(build.status, "accepted");
const api = await importBuiltJs(outJs);
assert.equal(api.result, 6n);
console.log(JSON.stringify({ status: "PASS", dir }, null, 2));
```

- [ ] **Step 2: Run test to verify it fails because harness does not exist**

Run:

```bash
node tools/pslive-language-smoke.ts
```

Expected: FAIL with missing `pslive-test-harness.ts`.

- [ ] **Step 3: Implement harness**

Create `tools/pslive-test-harness.ts`:

```js
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

export function createTempProject(prefix, source) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `${prefix}-`));
  const sourceFile = path.join(dir, "Main.ps");
  const outJs = path.join(dir, "out.js");
  const outTs = path.join(dir, "out.ts");
  fs.writeFileSync(sourceFile, source.trim() + "\n");
  return { dir, sourceFile, outJs, outTs };
}

export function runPsliveJson(args) {
  const result = spawnSync(process.execPath, ["tools/pslive.ts", ...args, "--json"], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`pslive failed: ${result.stderr || result.stdout}`);
  return JSON.parse(result.stdout);
}

export async function importBuiltJs(file) {
  const mod = await import(pathToFileURL(file).href);
  return mod.default ?? mod;
}
```

Wire `package.json`:

```json
{
  "test:pslive:language-fast": "node tools/pslive-language-smoke.ts"
}
```

Make old `tools/pslive-*-tests.ts` scripts either keep their focused assertions or call the shared harness for temp-project creation and CLI execution.

- [ ] **Step 4: Run verification**

Run:

```bash
npm run build -- --pretty false
npm run test:pslive:language-fast
npm run test:pslive:nat-plus
npm run test:pslive:nat-mul
npm run test:pslive:bool-if
npm run test:pslive:bool-operators
node tools/pskernel.ts status --json
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add tools/pslive-test-harness.ts tools/pslive-language-smoke.ts tools/pslive-*-tests.ts package.json
git commit -m "test(pslive): consolidate language smoke harness"
```

---

### Task 6: Split TypeScript backend name binding and analysis

**Files:**
- Create: `packages/backend-typescript/src/names.ts`
- Create: `packages/backend-typescript/src/analysis.ts`
- Modify: `packages/backend-typescript/src/index.ts`
- Test: `tools/backend-typescript-refactor-characterization-tests.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `CoreArtifact`, `CoreDeclaration`, `Term` from `@proofscript/kernel`.
- Produces: exported helpers `buildSanitizedNameMap`, `sanitizeName`, `collectConstructors`, `collectSimpleRecursors`, `collectSimpleProjections`, `userDeclarations`.

- [ ] **Step 1: Write characterization test for names and existing backend behavior**

Create `tools/backend-typescript-refactor-characterization-tests.ts`:

```js
#!/usr/bin/env node
import './register-local-workspace.cts';
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { checkProjectFile } = require("../packages/frontend/dist/index.js");
const { loadStandardBootstrap } = require("../packages/environment/dist/index.js");
const { emitJavaScriptModule, emitTypeScriptModule } = require("../packages/backend-typescript/dist/index.js");

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "backend-ts-refactor-"));
const src = path.join(dir, "Main.ps");
fs.writeFileSync(src, `def default: Nat := { 1 }\ndef class: Nat := { 2 }\ndef seven: Nat := { 1 + 2 * 3 }\n`);
const prelude = loadStandardBootstrap().artifact;
const checked = checkProjectFile(src, { prelude });
const js = emitJavaScriptModule(checked.artifact, { sourceFile: src, sourceText: fs.readFileSync(src, "utf8"), userDeclarationOffset: prelude.declarations.length });
const ts = emitTypeScriptModule(checked.artifact, { sourceFile: src, sourceText: fs.readFileSync(src, "utf8"), userDeclarationOffset: prelude.declarations.length });
assert.equal(js.emitted.length, 3);
assert.match(js.js, /module\.exports/);
assert.match(ts.ts, /export default/);
assert.equal(js.emitted.some((x) => x.name === "default"), true);
assert.equal(js.emitted.some((x) => x.name === "class"), true);
console.log("BACKEND_TYPESCRIPT_REFACTOR_CHARACTERIZATION=PASS");
```

- [ ] **Step 2: Run characterization before extraction**

Run:

```bash
npm run build -- --pretty false
node tools/backend-typescript-refactor-characterization-tests.ts
```

Expected: PASS before moving code.

- [ ] **Step 3: Move name and analysis functions**

Move `sanitizeName` and `buildSanitizedNameMap` to `names.ts`. Move `flattenPi`, `flattenApp`, `natCtorValue`, `containsConstName`, `termHeadConstName`, `collectConstructors`, `collectSimpleRecursors`, `collectSimpleProjections`, and `userDeclarations` to `analysis.ts`. Keep exports typed exactly as used by `index.ts`.

- [ ] **Step 4: Run verification**

Run:

```bash
npm run build -- --pretty false
node tools/backend-typescript-refactor-characterization-tests.ts
npm run test:pslive:build-ts
npm run test:pslive:reserved-identifiers
npm run test:pslive:js-name-collision
npm run test:standalone-small
node tools/pskernel.ts status --json
```

Expected: all pass; JS/TS collision behavior unchanged.

- [ ] **Step 5: Commit**

```bash
git add packages/backend-typescript/src/index.ts packages/backend-typescript/src/names.ts packages/backend-typescript/src/analysis.ts tools/backend-typescript-refactor-characterization-tests.ts package.json
git commit -m "refactor(backend-typescript): split naming and declaration analysis"
```

---

### Task 7: Split TypeScript backend term emitter and templates

**Files:**
- Create: `packages/backend-typescript/src/emit-term.ts`
- Create: `packages/backend-typescript/src/templates.ts`
- Modify: `packages/backend-typescript/src/index.ts`
- Test: `tools/backend-typescript-refactor-characterization-tests.ts`

**Interfaces:**
- Consumes: helpers from Task 6.
- Produces: `emitTerm(term, locals, ctx, target)`, `renderJavaScriptModule(parts)`, `renderTypeScriptModule(parts)`.

- [ ] **Step 1: Extend characterization test with executable output**

Modify `tools/backend-typescript-refactor-characterization-tests.ts` to write JS output and import it:

```js
const out = path.join(dir, "out.js");
fs.writeFileSync(out, js.js);
const api = (await import(pathToFileURL(out).href)).default;
assert.equal(api.seven, 7n);
```

Also import `pathToFileURL` at the top:

```js
import { pathToFileURL } from "node:url";
```

- [ ] **Step 2: Run characterization before extraction**

Run:

```bash
npm run build -- --pretty false
node tools/backend-typescript-refactor-characterization-tests.ts
```

Expected: PASS before moving code.

- [ ] **Step 3: Move term emission and templates**

Move `emitTerm` and its private helpers into `emit-term.ts`. Move JS/TS wrapper string assembly into `templates.ts`. Keep `emitJavaScriptModule` and `emitTypeScriptModule` in `index.ts` as public facades that call analysis, term emission, and templates.

- [ ] **Step 4: Run verification**

Run:

```bash
npm run build -- --pretty false
node tools/backend-typescript-refactor-characterization-tests.ts
npm run test:pslive:language-fast
npm run test:pslive:build-ts
npm run test:standalone-small
node tools/pskernel.ts status --json
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add packages/backend-typescript/src/index.ts packages/backend-typescript/src/emit-term.ts packages/backend-typescript/src/templates.ts tools/backend-typescript-refactor-characterization-tests.ts
git commit -m "refactor(backend-typescript): split term emitter and templates"
```

---

### Task 8: Split runtime capabilities, values, and source templates

**Files:**
- Create: `packages/runtime/src/capabilities.ts`
- Create: `packages/runtime/src/values.ts`
- Create: `packages/runtime/src/source-template.ts`
- Modify: `packages/runtime/src/index.ts`
- Test: `tools/runtime-refactor-characterization-tests.ts`
- Modify: `package.json`

**Interfaces:**
- Produces unchanged public exports: `PSC1_TRUST_LABEL`, `PSC1_IMPLEMENTATION_PROFILE`, `PSC1_SUPPORTED_FEATURES`, `PSC1_FAIL_CLOSED_FEATURES`, `PsNat`, `PsBool`, `PsUnit`, `PsStructValue`, `Struct_mk`, `Struct_ctor`, `Struct_proj`, `Struct_rec`, `Inductive_rec`, `psNat`, `Nat_succ`, `Nat_add`, `Nat_mul`, `Nat_rec`, `psc1RuntimeStatus`, `psc1RuntimeSource`, `psc1RuntimeTypeScriptSource`.

- [ ] **Step 1: Write runtime export characterization test**

Create `tools/runtime-refactor-characterization-tests.ts`:

```js
#!/usr/bin/env node
import './register-local-workspace.cts';
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const rt = require("../packages/runtime/dist/index.js");

assert.match(rt.PSC1_TRUST_LABEL, /trusted-boundary/);
assert.equal(rt.psNat(3), 3n);
assert.equal(rt.Nat_succ(3n), 4n);
assert.equal(rt.Nat_add(2n)(5n), 7n);
assert.equal(rt.Nat_mul(2n)(5n), 10n);
assert.equal(rt.Nat_rec("z")(() => (ih) => `s(${ih})`)(2n), "s(s(z))");
const status = rt.psc1RuntimeStatus();
assert.equal(status.requiresLean4, false);
assert.match(rt.psc1RuntimeSource(status), /Nat_mul/);
assert.match(rt.psc1RuntimeTypeScriptSource(status), /export type PsNat = bigint/);
console.log("RUNTIME_REFACTOR_CHARACTERIZATION=PASS");
```

- [ ] **Step 2: Run characterization before extraction**

Run:

```bash
npm run build -- --pretty false
node tools/runtime-refactor-characterization-tests.ts
```

Expected: PASS.

- [ ] **Step 3: Move runtime code**

Move trust/profile arrays into `capabilities.ts`. Move runtime values/functions into `values.ts`. Move source-string emitters into `source-template.ts`. Re-export all public names from `index.ts`.

- [ ] **Step 4: Run verification**

Run:

```bash
npm run build -- --pretty false
node tools/runtime-refactor-characterization-tests.ts
npm run test:pslive:language-fast
npm run test:pslive:build-ts
npm run test:standalone-small
node tools/pskernel.ts status --json
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add packages/runtime/src/index.ts packages/runtime/src/capabilities.ts packages/runtime/src/values.ts packages/runtime/src/source-template.ts tools/runtime-refactor-characterization-tests.ts package.json
git commit -m "refactor(runtime): split capabilities values and templates"
```

---

### Task 9: Fix or quarantine reference-governance JSON hang

**Files:**
- Modify: `tools/reference-language-governance-smoke.ts`
- Create: `tools/reference-governance-json-timeout-tests.ts`
- Modify: `package.json`
- Modify: `docs/reports/p4/PRODUCTION_P4_75_CLEANUP_REFACTOR_ROADMAP_REPORT.md`

**Interfaces:**
- Consumes: existing `npm run test:reference-governance:json` behavior.
- Produces: bounded completion: command exits 0 on PASS or nonzero on failure within a defined timeout. It must not print PASS and then hang indefinitely.

- [ ] **Step 1: Write timeout regression test**

Create `tools/reference-governance-json-timeout-tests.ts`:

```js
#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const started = Date.now();
const result = spawnSync(process.execPath, ["tools/reference-language-governance-smoke.ts", "--json"], {
  encoding: "utf8",
  timeout: 20000,
});
const elapsedMs = Date.now() - started;
if (result.error && result.error.code === "ETIMEDOUT") {
  console.error(JSON.stringify({ status: "FAIL", reason: "timeout", elapsedMs }, null, 2));
  process.exit(1);
}
if (result.status !== 0) {
  console.error(JSON.stringify({ status: "FAIL", exitCode: result.status, stdout: result.stdout, stderr: result.stderr }, null, 2));
  process.exit(1);
}
const parsed = JSON.parse(result.stdout);
if (parsed.status !== "PASS") {
  console.error(JSON.stringify({ status: "FAIL", parsed }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ status: "PASS", elapsedMs }, null, 2));
```

- [ ] **Step 2: Run test to reproduce current hang or confirm current state**

Run:

```bash
node tools/reference-governance-json-timeout-tests.ts
```

Expected before fix in the current container: FAIL with timeout or nonzero error. If it passes, record the elapsed time and keep the regression test.

- [ ] **Step 3: Fix process containment**

In `tools/reference-language-governance-smoke.ts`, ensure every child process is invoked with bounded `timeout`, no inherited long-lived stdio handles, and explicit result collection. Replace unbounded child calls with this helper:

```js
import { spawnSync } from "node:child_process";

function runBoundedNode(args, options = {}) {
  const result = spawnSync(process.execPath, args, {
    encoding: "utf8",
    timeout: options.timeoutMs ?? 15000,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, ...options.env },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`node ${args.join(" ")} failed with ${result.status}: ${result.stderr || result.stdout}`);
  }
  return result.stdout;
}
```

If a child process is intentionally optional, mark it as `unsupported` in JSON rather than hanging.

- [ ] **Step 4: Run verification**

Run:

```bash
npm run build -- --pretty false
node tools/reference-governance-json-timeout-tests.ts
npm run test:reference-governance:json
npm run test:governance
node tools/pskernel.ts status --json
```

Expected: all pass without timeout.

- [ ] **Step 5: Commit**

```bash
git add tools/reference-language-governance-smoke.ts tools/reference-governance-json-timeout-tests.ts package.json docs/reports/p4/PRODUCTION_P4_75_CLEANUP_REFACTOR_ROADMAP_REPORT.md
git commit -m "fix(tools): bound reference governance json smoke"
```

---

### Task 10: Add import-boundary guard for trust-sensitive packages

**Files:**
- Modify: `tools/check-boundaries.ts`
- Create: `tools/check-boundaries-trust-tests.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: filesystem source tree.
- Produces: boundary check that rejects backend/runtime/plugin imports into kernel internals.

- [ ] **Step 1: Write failing trust-boundary test fixture**

Create `tools/check-boundaries-trust-tests.ts`:

```js
#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "boundary-trust-test-"));
const kernelFile = path.join(dir, "packages/kernel/src/Bad.ts");
fs.mkdirSync(path.dirname(kernelFile), { recursive: true });
fs.writeFileSync(kernelFile, `import { Nat_add } from "@proofscript/runtime";\nexport const bad = Nat_add;\n`);

const result = spawnSync(process.execPath, ["tools/check-boundaries.ts", "--root", dir], { encoding: "utf8" });
if (result.status === 0) {
  console.error("expected check-boundaries to reject kernel importing runtime");
  process.exit(1);
}
if (!/kernel.*runtime|runtime.*kernel/i.test(result.stderr + result.stdout)) {
  console.error(result.stderr || result.stdout);
  process.exit(1);
}
console.log("CHECK_BOUNDARIES_TRUST_TEST=PASS");
```

- [ ] **Step 2: Run test to verify it fails or errors before guard support**

Run:

```bash
node tools/check-boundaries-trust-tests.ts
```

Expected: FAIL if `--root` or the kernel/runtime boundary rule is missing.

- [ ] **Step 3: Implement boundary rule**

Update `tools/check-boundaries.ts` to support optional `--root <dir>` and reject these imports from any file under `packages/kernel/src`:

```txt
@proofscript/runtime
@proofscript/backend-typescript
@proofscript/plugin-api
@proofscript/plugin-host
../../runtime
../runtime
```

The error message must contain:

```txt
kernel must not import runtime/backend/plugin packages
```

- [ ] **Step 4: Run verification**

Run:

```bash
npm run build -- --pretty false
node tools/check-boundaries-trust-tests.ts
npm run test:architecture
npm run test:kernel:smoke
node tools/pskernel.ts status --json
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add tools/check-boundaries.ts tools/check-boundaries-trust-tests.ts package.json
git commit -m "test(architecture): guard kernel trust-boundary imports"
```

---

### Task 11: Package cleanup release candidate

**Files:**
- Create: `docs/reports/p4/PRODUCTION_P4_76_TO_P4_83_CLEANUP_EXECUTION_REPORT.md`
- Modify: `README.md`
- Modify: `kernel-status.json` only if profile text requires version bump, not status upgrade.
- Create: `P4_75_VERIFICATION_SUMMARY.json` or matching release summary for the actual release number.

**Interfaces:**
- Consumes: completed cleanup commits.
- Produces: zip archive with preserved K3-TB labels and current verification summary.

- [ ] **Step 1: Run Tier C release-candidate verification**

Run:

```bash
npm run build -- --pretty false
npm run test:kernel:typechecker
npm run test:kernel:smoke
npm run test:standalone-small
npm run test:governance
npm run test:pslive:nat-plus
npm run test:pslive:nat-mul
npm run test:pslive:lean-application
npm run test:pslive:by-sugar
npm run test:pslive:bool-if
npm run test:pslive:bool-operators
npm run test:pslive:build-ts
npm run test:pslive:js-name-collision
npm run test:pslive:reserved-identifiers
node tools/pskernel.ts status --json
```

Expected: all pass. Do not claim `verify:k3tb:publish` unless `PROOFSCRIPT_LEAN_BIN` is available and the command passes.

- [ ] **Step 2: Create verification summary JSON**

Create `P4_75_VERIFICATION_SUMMARY.json` with actual command results:

```json
{
  "status": "cleanup-release-candidate",
  "trustLabel": "K3-TB trusted-boundary; not fully formal K3; not Lean 4 equivalent",
  "formalLean4EquivalenceProvenObligations": 0,
  "commands": []
}
```

Fill `commands` with exact command, exit code, and result from Step 1.

- [ ] **Step 3: Package archive**

Run from the parent directory of the repo:

```bash
zip -qr proofscript-standalone-kernel-maturity-replacement-p4-cleanup.zip proofscript-standalone-kernel-maturity-replacement-p4-74
unzip -tq proofscript-standalone-kernel-maturity-replacement-p4-cleanup.zip
sha256sum proofscript-standalone-kernel-maturity-replacement-p4-cleanup.zip > proofscript-standalone-kernel-maturity-replacement-p4-cleanup.zip.sha256
```

- [ ] **Step 4: Fresh extracted smoke**

Extract the archive into a temporary directory and run:

```bash
npm run build -- --pretty false
npm run test:standalone-small
npm run test:kernel:smoke
node tools/pskernel.ts status --json
```

Expected: all pass; status remains trusted-boundary / not-proven.

- [ ] **Step 5: Commit release docs**

```bash
git add README.md docs/reports/p4 P4_75_VERIFICATION_SUMMARY.json kernel-status.json
git commit -m "chore: package p4 cleanup release candidate"
```

---

## Progress targets after cleanup

Cleanup does not significantly increase theorem-prover or Lean-equivalence percentages. It should increase maintainability and reduce future risk.

```txt
Standalone PSC-1 without Lean4:                 ~97.3% to ~97.5%
PSC-1 small complete programming language:      ~72.0% to ~72.5%
PSC-1 small theorem prover:                     ~62.1% to ~62.3%
Full ProofScript compiler:                      ~60.2% to ~61.0%
Full Lean-like ProofScript without Lean4:       ~13.8% to ~13.9%
Formal Lean 4 equivalence:                      0 proven obligations
Maintainability / anti-spaghetti score:         ~58% to ~75%
```

## Execution recommendation

Use this order:

1. P4.75 docs/verification-tier baseline.
2. P4.76 parser tokenizer + builders extraction.
3. P4.78 `pslive` core split.
4. P4.79 smoke harness consolidation.
5. P4.80 backend split.
6. P4.81 runtime split.
7. P4.82 reference-governance hang fix.
8. P4.83 trust-boundary import guard.
9. Only after that, resume adding language features.
