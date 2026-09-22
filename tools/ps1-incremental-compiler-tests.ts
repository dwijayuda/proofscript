#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { IncrementalCompilerSession } from "@proofscript/compiler";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "proofscript-incremental-"));
fs.writeFileSync(path.join(root, "package.json"), "{\"private\":true}\n");
const src = path.join(root, "src");
fs.mkdirSync(src);
const lib = path.join(src, "Lib.ps");
const main = path.join(src, "Main.ps");
fs.writeFileSync(lib, "theorem libIdentity(P: Prop, h: P): P := h;\n");
fs.writeFileSync(main, "import Lib;\ntheorem mainIdentity(P: Prop, h: P): P := h;\n");

const session = new IncrementalCompilerSession();

const cold = session.checkProjectFile(main);
assert.deepEqual(cold.moduleReuse.reused, []);
assert.deepEqual(cold.moduleReuse.rebuilt, ["Lib", "Main"]);
assert.deepEqual(session.cachedModules(), ["Lib", "Main"]);

const warm = session.checkProjectFile(main);
assert.deepEqual(warm.moduleReuse.reused, ["Lib", "Main"]);
assert.deepEqual(warm.moduleReuse.rebuilt, []);
assert.deepEqual(
  warm.summary.declarations,
  cold.summary.declarations,
  "warm incremental reuse must preserve the checked summary",
);

const mainOverlay = "import Lib;\ntheorem mainChanged(P: Prop, h: P): P := h;\n";
const mainChanged = session.checkProjectFile(main, {
  sourceProvider: (filePath) => path.resolve(filePath) === path.resolve(main) ? mainOverlay : undefined,
});
assert.deepEqual(mainChanged.moduleReuse.reused, ["Lib"]);
assert.deepEqual(mainChanged.moduleReuse.rebuilt, ["Main"]);
assert.ok(mainChanged.summary.declarations.some((declaration) => declaration.name === "mainChanged"));

session.clear();
assert.deepEqual(session.cachedModules(), []);

const dependencySession = new IncrementalCompilerSession();
dependencySession.checkProjectFile(main);
const libOverlay = "theorem libChanged(P: Prop, h: P): P := h;\n";
const dependencyChanged = dependencySession.checkProjectFile(main, {
  sourceProvider: (filePath) => path.resolve(filePath) === path.resolve(lib) ? libOverlay : undefined,
});
assert.deepEqual(
  dependencyChanged.moduleReuse.rebuilt,
  ["Lib", "Main"],
  "a checked dependency environment change must conservatively rebuild dependents",
);
assert.deepEqual(dependencyChanged.moduleReuse.reused, []);

const stableAgain = dependencySession.checkProjectFile(main, {
  sourceProvider: (filePath) => path.resolve(filePath) === path.resolve(lib) ? libOverlay : undefined,
});
assert.deepEqual(stableAgain.moduleReuse.reused, ["Lib", "Main"]);
assert.deepEqual(stableAgain.moduleReuse.rebuilt, []);

console.log("PS1_INCREMENTAL_COMPILER_TESTS=PASS");
