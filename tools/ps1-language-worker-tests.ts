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
worker.openDocument(uri, 1, "theorem overlay(P: Prop, h: P): P := h;\n", mainFile);

await worker.start();
const ping = await worker.ping();
assert.equal(ping.ok, true);
assert.ok(ping.pid > 0);

const first = await worker.analyze(uri);
assert.equal(first.status, "accepted");
assert.ok(first.declarations.some((declaration) => declaration.name === "overlay"));
assert.ok(!first.declarations.some((declaration) => declaration.name === "disk"));

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


await worker.restart("test state replay");
const afterRestart = await worker.analyze(uri);
assert.equal(afterRestart.status, "accepted");
assert.ok(afterRestart.declarations.some((declaration) => declaration.name === "replayed"));
assert.ok(worker.stats().stateReplays >= 1);

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
