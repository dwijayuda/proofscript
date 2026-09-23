#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  LanguageWorkerCancelledError,
  LanguageWorkerClient,
} from "@proofscript/language-worker";

process.env.PROOFSCRIPT_WORKER_TESTING = "1";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "proofscript-language-worker-"));
fs.writeFileSync(path.join(tmp, "package.json"), JSON.stringify({ private: true }, null, 2) + "\n");
const srcDir = path.join(tmp, "src");
fs.mkdirSync(srcDir);
const mainFile = path.join(srcDir, "Main.ps");
fs.writeFileSync(mainFile, "theorem disk(P: Prop, h: P): P := h;\n");

const worker = new LanguageWorkerClient({ hardCancelGraceMs: 25 });
const uri = "proofscript-worker-test://Main.ps";
worker.openDocument(uri, 1, "theorem overlay(P: Prop, h: P): P := by { assumption }\n", mainFile);

await worker.start();
const ping = await worker.ping();
assert.equal(ping.ok, true);
assert.ok(ping.pid > 0);

const first = await worker.analyze(uri);
assert.equal(first.status, "accepted");
assert.ok(first.declarations.some((declaration) => declaration.name === "overlay"));
assert.ok(!first.declarations.some((declaration) => declaration.name === "disk"));

const firstGoals = await worker.goals(uri, { line: 0, character: 47 });
assert.equal(firstGoals.tacticStateAvailable, true);
assert.equal(firstGoals.tacticState?.tactic, "assumption");
assert.equal(firstGoals.tacticState?.goal, "P");
assert.equal(firstGoals.tacticState?.sourceStatus, "checked");
assert.deepEqual(firstGoals.tacticState?.locals.map((local) => local.name), ["P", "h"]);
assert.equal(firstGoals.declarationGoal?.origin, "compiler-theorem");
assert.equal(firstGoals.declarationGoal?.name, "overlay");
assert.equal(firstGoals.verification.status, "unavailable");

const partialFile = path.join(srcDir, "Partial.ps");
const partialUri = "proofscript-worker-test://Partial.ps";
const partialSource = "theorem partial(P: Prop, h: P): P := by { exact missing }\n";
fs.writeFileSync(partialFile, partialSource);
worker.openDocument(partialUri, 1, partialSource, partialFile);
const partialAnalysis = await worker.analyze(partialUri);
assert.equal(partialAnalysis.status, "rejected");
assert.ok(partialAnalysis.proofStates.some((state) => state.tactic === "exact"));
const partialGoals = await worker.goals(partialUri, { line: 0, character: partialSource.indexOf("exact") + 1 });
assert.equal(partialGoals.tacticStateAvailable, true);
assert.equal(partialGoals.tacticState?.tactic, "exact");
assert.equal(partialGoals.tacticState?.goal, "P");
assert.equal(partialGoals.tacticState?.sourceStatus, "rejected-prefix");
assert.deepEqual(partialGoals.tacticState?.locals.map((local) => local.name), ["P", "h"]);
assert.equal(partialGoals.declarationGoal, null);
worker.closeDocument(partialUri);
fs.unlinkSync(partialFile);

const incompleteFile = path.join(srcDir, "Incomplete.ps");
const incompleteUri = "proofscript-worker-test://Incomplete.ps";
const incompleteSource = "theorem incomplete(P: Prop, h: P): P := by { assumption\n";
fs.writeFileSync(incompleteFile, incompleteSource);
worker.openDocument(incompleteUri, 1, incompleteSource, incompleteFile);
const incompleteAnalysis = await worker.analyze(incompleteUri);
assert.equal(incompleteAnalysis.status, "rejected");
assert.ok(incompleteAnalysis.proofStates.some((state) =>
  state.tactic === "assumption" && state.sourceStatus === "syntax-incomplete"
));
const incompleteGoals = await worker.goals(
  incompleteUri,
  { line: 0, character: incompleteSource.indexOf("assumption") + 1 },
);
assert.equal(incompleteGoals.tacticStateAvailable, true);
assert.equal(incompleteGoals.tacticState?.tactic, "assumption");
assert.equal(incompleteGoals.tacticState?.goal, "P");
assert.equal(incompleteGoals.tacticState?.sourceStatus, "syntax-incomplete");
assert.deepEqual(incompleteGoals.tacticState?.locals.map((local) => local.name), ["P", "h"]);
assert.equal(incompleteGoals.declarationGoal, null);
worker.closeDocument(incompleteUri);
fs.unlinkSync(incompleteFile);

worker.replaceDocument(uri, 2, "theorem broken");
const broken = await worker.diagnostics(uri);
assert.equal(broken.version, 2);
assert.equal(broken.diagnostics.length, 1);

worker.replaceDocument(uri, 3, "theorem replayed(P: Prop, h: P): P := h;\n");
const beforeRestart = await worker.analyze(uri);
assert.equal(beforeRestart.status, "accepted");
assert.ok(beforeRestart.declarations.some((declaration) => declaration.name === "replayed"));
const replayedCompletion = await worker.completion(uri, { line: 0, character: 11 });
assert.ok(replayedCompletion.some((item) => item.label === "replayed"));


worker.replaceDocument(uri, 4, "def workerBase: Nat := 1;\ndef workerUse: Nat := workerBase;\n");
const workerNavigation = await worker.analyze(uri);
assert.equal(workerNavigation.status, "accepted");
assert.ok(workerNavigation.sourceReferences.some((reference) => reference.resolvedName === "workerBase"));
const workerDefinition = await worker.definition(uri, { line: 1, character: 25 });
assert.ok(workerDefinition);
assert.deepEqual(workerDefinition.range.start, { line: 0, character: 4 });
const workerReferences = await worker.references(uri, { line: 1, character: 25 }, true);
assert.equal(workerReferences.length, 2);
const workerRename = await worker.rename(uri, { line: 1, character: 25 }, "workerRenamed");
assert.equal(workerRename.changes[uri]?.length, 2);
const workerTokens = await worker.semanticTokens(uri);
assert.equal(workerTokens.length, 3);
assert.equal(workerTokens.filter((token) => token.modifiers.includes("declaration")).length, 2);


await worker.restart("test state replay");
const afterRestart = await worker.analyze(uri);
assert.equal(afterRestart.status, "accepted");
assert.ok(afterRestart.declarations.some((declaration) => declaration.name === "workerBase"));
assert.ok(afterRestart.declarations.some((declaration) => declaration.name === "workerUse"));
const afterRestartDefinition = await worker.definition(uri, { line: 1, character: 25 });
assert.ok(afterRestartDefinition);
assert.ok(worker.stats().stateReplays >= 1);
worker.replaceDocument(uri, 5, "def   workerFormatted : Nat:={1+2};\n");
const workerFormatEdits = await worker.formatDocument(uri);
assert.equal(workerFormatEdits.length, 1);
assert.match(workerFormatEdits[0].newText, /def workerFormatted: Nat := \{1 \+ 2\};/u);
worker.replaceDocument(uri, 6, workerFormatEdits[0].newText);
assert.deepEqual(await worker.formatDocument(uri), []);
worker.replaceDocument(uri, 7, "-- keep\ndef   x : Nat:={1+2};\n");
const workerCommentFormat = await worker.formatDocument(uri);
assert.equal(workerCommentFormat.length, 1);
assert.match(workerCommentFormat[0].newText, /-- keep/u);
assert.match(workerCommentFormat[0].newText, /def x: Nat := \{1 \+ 2\};/u);

worker.replaceDocument(uri, 8, "def missing: Nat := 1\n");
const workerMissing = await worker.diagnostics(uri);
assert.equal(workerMissing.diagnostics[0]?.code, "PSLS1001");
const workerActions = await worker.codeActions(uri, workerMissing.diagnostics[0]?.range);
assert.equal(workerActions.length, 1);
assert.equal(workerActions[0].kind, "quickfix");
assert.equal(workerActions[0].edit.changes[uri]?.[0]?.newText, ";");

const owner = "cancel-me";
const blocked = worker.request("__debugBlock", { ms: 500 }, owner);
await new Promise((resolve) => setTimeout(resolve, 20));
assert.equal(worker.cancelOwner(owner, 25), true);
await assert.rejects(
  blocked,
  (error: unknown) => error instanceof LanguageWorkerCancelledError || (error instanceof Error && /cancel/i.test(error.message)),
);

const recoveredPing = await worker.ping();
assert.equal(recoveredPing.ok, true);

await worker.stop();
console.log("PS1_LANGUAGE_WORKER_TESTS=PASS");
