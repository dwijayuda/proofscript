#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  CancellationSource,
  ProofScriptLanguageService,
} from "@proofscript/language-service";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "proofscript-language-service-"));
fs.writeFileSync(path.join(tmp, "package.json"), JSON.stringify({ private: true }, null, 2) + "\n");
const srcDir = path.join(tmp, "src");
fs.mkdirSync(srcDir);
const mainFile = path.join(srcDir, "Main.ps");
fs.writeFileSync(mainFile, "theorem disk(P: Prop, h: P): P := h;\n");

const service = new ProofScriptLanguageService();
const uri = "proofscript-test://Main.ps";
const overlay = "theorem overlay(P: Prop, h: P): P := h;\n";
const opened = service.openDocument(uri, 1, overlay, mainFile);
assert.equal(opened.version, 1);
assert.equal(opened.text, overlay);
assert.equal(opened.filePath, path.resolve(mainFile));

const first = service.analyze(uri);
assert.equal(first.status, "accepted");
assert.ok(first.declarations.some((declaration) => declaration.name === "overlay"));
assert.ok(!first.declarations.some((declaration) => declaration.name === "disk"));
assert.equal(first.diagnostics.length, 0);

const cached = service.analyze(uri);
assert.equal(cached, first, "same document generation should reuse the cached analysis object");

assert.throws(
  () => service.replaceDocument(uri, 1, overlay),
  /document version must increase/,
  "stale/same document versions must be rejected",
);

const invalid = service.updateDocument(uri, 2, [{ text: "theorem broken" }]);
assert.equal(invalid.version, 2);
const broken = service.analyze(uri);
assert.notEqual(broken.status, "accepted");
assert.equal(broken.diagnostics.length, 1);
assert.match(broken.diagnostics[0]!.code, /^PSLS/);
assert.equal(broken.diagnostics[0]!.data.identity.schemaVersion, 1);
assert.ok(broken.diagnostics[0]!.data.identity.fingerprint.length >= 16);
assert.notEqual(broken.resultId, first.resultId);

const repairedSource = "theorem repaired(P: Prop, h: P): P := h;\n";
service.replaceDocument(uri, 3, repairedSource);
const repaired = service.analyze(uri);
assert.equal(repaired.status, "accepted");
assert.ok(repaired.declarations.some((declaration) => declaration.name === "repaired"));
assert.equal(repaired.diagnostics.length, 0);

const cancellation = new CancellationSource();
cancellation.cancel();
assert.throws(
  () => service.analyze(uri, true, cancellation.token),
  /request cancelled/,
  "cancelled analysis must stop before compiler work",
);

const diagnosticBundle = service.diagnostics(uri);
assert.equal(diagnosticBundle.version, 3);
assert.equal(diagnosticBundle.generation, service.getDocument(uri)!.generation);
assert.equal(diagnosticBundle.resultId, repaired.resultId);

service.closeDocument(uri);
assert.equal(service.getDocument(uri), undefined);
assert.throws(() => service.analyze(uri), /document is not open/);

console.log("PS1_LANGUAGE_SERVICE_TESTS=PASS");
