#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";

const root = path.resolve(import.meta.dirname, "..");
const bin = path.join(root, "packages", "lsp", "dist", "bin.js");

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "proofscript-lsp-"));
fs.writeFileSync(path.join(tmp, "package.json"), JSON.stringify({ private: true }, null, 2) + "\n");
const srcDir = path.join(tmp, "src");
fs.mkdirSync(srcDir);
const mainFile = path.join(srcDir, "Main.ps");
fs.writeFileSync(mainFile, "theorem disk(P: Prop, h: P): P := h;\n");
const uri = pathToFileURL(mainFile).href;

const child = spawn(process.execPath, [bin, "--diagnostics-debounce-ms=0"], {
  cwd: root,
  env: { ...process.env, PROOFSCRIPT_WORKER_TESTING: "1" },
  stdio: ["pipe", "pipe", "pipe"],
});

let stderr = "";
child.stderr.on("data", (chunk) => { stderr += chunk.toString("utf8"); });

let output = Buffer.alloc(0);
const queued = [];
const waiters = [];

child.stdout.on("data", (chunk) => {
  output = Buffer.concat([output, chunk]);
  drain();
});

function drain() {
  while (true) {
    const headerEnd = output.indexOf("\r\n\r\n");
    if (headerEnd < 0) return;
    const header = output.slice(0, headerEnd).toString("utf8");
    const match = /Content-Length:\s*(\d+)/i.exec(header);
    assert.ok(match, `missing Content-Length header: ${header}`);
    const length = Number(match[1]);
    const bodyStart = headerEnd + 4;
    if (output.length < bodyStart + length) return;
    const body = output.slice(bodyStart, bodyStart + length).toString("utf8");
    output = output.slice(bodyStart + length);
    publish(JSON.parse(body));
  }
}

function publish(message) {
  const index = waiters.findIndex((waiter) => waiter.predicate(message));
  if (index >= 0) {
    const [waiter] = waiters.splice(index, 1);
    clearTimeout(waiter.timer);
    waiter.resolve(message);
  } else {
    queued.push(message);
  }
}

function waitFor(predicate, label, timeoutMs = 15000) {
  const existing = queued.findIndex(predicate);
  if (existing >= 0) return Promise.resolve(queued.splice(existing, 1)[0]);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      const index = waiters.findIndex((waiter) => waiter.resolve === resolve);
      if (index >= 0) waiters.splice(index, 1);
      reject(new Error(`timeout waiting for ${label}\nstderr=${stderr}\nqueued=${JSON.stringify(queued, null, 2)}`));
    }, timeoutMs);
    waiters.push({ predicate, resolve, reject, timer });
  });
}

function send(message) {
  const body = JSON.stringify(message);
  child.stdin.write(`Content-Length: ${Buffer.byteLength(body, "utf8")}\r\n\r\n${body}`);
}

const exitPromise = new Promise((resolve) => child.on("exit", (code) => resolve(code)));

send({ jsonrpc: "2.0", id: 1, method: "initialize", params: { capabilities: {} } });
const initialized = await waitFor((message) => message.id === 1, "initialize response");
assert.equal(initialized.result.serverInfo.name, "ProofScript LSP");
assert.ok(initialized.result.capabilities.diagnosticProvider);
assert.equal(initialized.result.capabilities.hoverProvider, true);
assert.equal(initialized.result.capabilities.documentSymbolProvider, true);
assert.ok(initialized.result.capabilities.completionProvider);
assert.equal(initialized.result.capabilities.completionProvider.resolveProvider, false);
assert.equal(initialized.result.capabilities.definitionProvider, true);
assert.equal(initialized.result.capabilities.referencesProvider, true);
assert.equal(initialized.result.capabilities.renameProvider, true);
assert.equal(initialized.result.capabilities.documentFormattingProvider, true);
assert.deepEqual(
  initialized.result.capabilities.codeActionProvider.codeActionKinds,
  ["quickfix", "source.format.proofscript"],
);
assert.equal(initialized.result.capabilities.semanticTokensProvider.full, true);
assert.deepEqual(
  initialized.result.capabilities.semanticTokensProvider.legend.tokenTypes,
  ["function", "enum", "struct", "class", "variable"],
);
assert.equal(initialized.result.experimental.proofscript.duplicateParser, false);
assert.equal(initialized.result.experimental.proofscript.surfaceFeatureRequest, "proofscript/surfaceFeatures");
assert.equal(initialized.result.experimental.proofscript.documentStatusRequest, "proofscript/documentStatus");
assert.equal(initialized.result.experimental.proofscript.semanticInfoRequest, "proofscript/semanticInfo");
assert.equal(initialized.result.experimental.proofscript.goalsRequest, "proofscript/goals");
assert.equal(initialized.result.experimental.proofscript.goalPresentationAvailable, true);
assert.equal(initialized.result.experimental.proofscript.proofStateAvailable, true);

send({ jsonrpc: "2.0", method: "initialized", params: {} });

send({
  jsonrpc: "2.0",
  method: "textDocument/didOpen",
  params: {
    textDocument: {
      uri,
      languageId: "proofscript",
      version: 1,
      text: "theorem broken",
    },
  },
});

const pushedBroken = await waitFor(
  (message) => message.method === "textDocument/publishDiagnostics"
    && message.params?.uri === uri
    && message.params?.version === 1,
  "version 1 push diagnostics",
);
assert.equal(pushedBroken.params.diagnostics.length, 1);
assert.match(pushedBroken.params.diagnostics[0].code, /^PSLS/);

send({
  jsonrpc: "2.0",
  id: 2,
  method: "textDocument/diagnostic",
  params: { textDocument: { uri } },
});
const pulledBroken = await waitFor((message) => message.id === 2, "pull diagnostics response");
assert.equal(pulledBroken.result.kind, "full");
assert.equal(pulledBroken.result.items.length, 1);
assert.ok(typeof pulledBroken.result.resultId === "string");

const fixed = "theorem fixed(P: Prop, h: P): P := by { assumption }\n";
send({
  jsonrpc: "2.0",
  method: "textDocument/didChange",
  params: {
    textDocument: { uri, version: 2 },
    contentChanges: [{ text: fixed }],
  },
});

const pushedFixed = await waitFor(
  (message) => message.method === "textDocument/publishDiagnostics"
    && message.params?.uri === uri
    && message.params?.version === 2,
  "version 2 push diagnostics",
);
assert.equal(pushedFixed.params.diagnostics.length, 0);

send({
  jsonrpc: "2.0",
  id: 3,
  method: "textDocument/diagnostic",
  params: { textDocument: { uri } },
});
const pulledFixed = await waitFor((message) => message.id === 3, "pull diagnostics after repair");
assert.equal(pulledFixed.result.items.length, 0);

send({
  jsonrpc: "2.0",
  id: 4,
  method: "proofscript/surfaceFeatures",
  params: { textDocument: { uri } },
});
const surfaceFeatures = await waitFor((message) => message.id === 4, "surface feature response");
assert.equal(surfaceFeatures.result.version, 2);
assert.ok(typeof surfaceFeatures.result.resultId === "string");
const explicitParams = surfaceFeatures.result.features.find((feature) => feature.feature === "D-EXPLICIT-PARAMS");
assert.ok(explicitParams, "LSP must expose compiler-owned surface features");
assert.deepEqual(explicitParams.range.start, { line: 0, character: 0 });

send({
  jsonrpc: "2.0",
  id: 5,
  method: "proofscript/serverInfo",
  params: {},
});
const serverInfo = await waitFor((message) => message.id === 5, "server info response");
assert.equal(serverInfo.result.protocolVersion, 1);
assert.equal(serverInfo.result.compilerBacked, true);
assert.equal(serverInfo.result.duplicateParser, false);
assert.equal(serverInfo.result.proofStateAvailable, true);

send({
  jsonrpc: "2.0",
  id: 6,
  method: "proofscript/documentStatus",
  params: { textDocument: { uri } },
});
const documentStatus = await waitFor((message) => message.id === 6, "document status response");
assert.equal(documentStatus.result.status, "accepted");
assert.equal(documentStatus.result.compilerBacked, true);
assert.equal(documentStatus.result.proofStateAvailable, true);

send({
  jsonrpc: "2.0",
  id: 7,
  method: "proofscript/semanticInfo",
  params: { textDocument: { uri }, position: { line: 0, character: 10 } },
});
const semanticInfo = await waitFor((message) => message.id === 7, "semantic info response");
assert.equal(semanticInfo.result.status, "accepted");
assert.equal(semanticInfo.result.symbol.name, "fixed");
assert.equal(semanticInfo.result.proofStateAvailable, true);

send({
  jsonrpc: "2.0",
  id: 8,
  method: "textDocument/documentSymbol",
  params: { textDocument: { uri } },
});
const documentSymbols = await waitFor((message) => message.id === 8, "document symbol response");
assert.equal(documentSymbols.result.length, 1);
assert.equal(documentSymbols.result[0].name, "fixed");

send({
  jsonrpc: "2.0",
  id: 9,
  method: "textDocument/hover",
  params: { textDocument: { uri }, position: { line: 0, character: 10 } },
});
const hover = await waitFor((message) => message.id === 9, "hover response");
assert.match(hover.result.contents.value, /fixed/u);

send({
  jsonrpc: "2.0",
  id: 10,
  method: "textDocument/completion",
  params: { textDocument: { uri }, position: { line: 0, character: 13 } },
});
const completion = await waitFor((message) => message.id === 10, "completion response");
assert.equal(completion.result.isIncomplete, false);
assert.ok(completion.result.items.some((item) => item.label === "fixed"));

send({
  jsonrpc: "2.0",
  id: 11,
  method: "proofscript/goals",
  params: { textDocument: { uri }, position: { line: 0, character: 45 } },
});
const goals = await waitFor((message) => message.id === 11, "proof goals response");
assert.equal(goals.result.tacticStateAvailable, true);
assert.equal(goals.result.tacticState.kind, "tactic");
assert.equal(goals.result.tacticState.tactic, "assumption");
assert.equal(goals.result.tacticState.goal, "P");
assert.equal(goals.result.tacticState.sourceStatus, "checked");
assert.deepEqual(goals.result.tacticState.locals.map((local) => local.name), ["P", "h"]);
assert.equal(goals.result.tacticState.locals.find((local) => local.name === "h")?.type, "P");
assert.equal(goals.result.declarationGoal.origin, "compiler-theorem");
assert.equal(goals.result.declarationGoal.name, "fixed");
assert.equal(goals.result.declarationGoal.status, "checked");
assert.equal(goals.result.verification.status, "unavailable");

const partialFile = path.join(srcDir, "Partial.ps");
const partialUri = pathToFileURL(partialFile).href;
const partialSource = "theorem partial(P: Prop, h: P): P := by { exact missing }\n";
fs.writeFileSync(partialFile, partialSource);
send({
  jsonrpc: "2.0",
  method: "textDocument/didOpen",
  params: {
    textDocument: {
      uri: partialUri,
      languageId: "proofscript",
      version: 1,
      text: partialSource,
    },
  },
});
const pushedPartial = await waitFor(
  (message) => message.method === "textDocument/publishDiagnostics"
    && message.params?.uri === partialUri
    && message.params?.version === 1,
  "partial proof diagnostics",
);
assert.equal(pushedPartial.params.diagnostics.length, 1);

send({
  jsonrpc: "2.0",
  id: 101,
  method: "proofscript/goals",
  params: {
    textDocument: { uri: partialUri },
    position: { line: 0, character: partialSource.indexOf("exact") + 1 },
  },
});
const partialGoals = await waitFor((message) => message.id === 101, "partial proof goals response");
assert.equal(partialGoals.result.tacticStateAvailable, true);
assert.equal(partialGoals.result.tacticState.kind, "tactic");
assert.equal(partialGoals.result.tacticState.tactic, "exact");
assert.equal(partialGoals.result.tacticState.goal, "P");
assert.equal(partialGoals.result.tacticState.sourceStatus, "rejected-prefix");
assert.deepEqual(partialGoals.result.tacticState.locals.map((local) => local.name), ["P", "h"]);
assert.equal(partialGoals.result.declarationGoal, null);

send({
  jsonrpc: "2.0",
  method: "textDocument/didClose",
  params: { textDocument: { uri: partialUri } },
});
const partialClosed = await waitFor(
  (message) => message.method === "textDocument/publishDiagnostics"
    && message.params?.uri === partialUri
    && message.params?.version === undefined,
  "partial close diagnostics clear",
);
assert.deepEqual(partialClosed.params.diagnostics, []);
fs.unlinkSync(partialFile);

const incompleteFile = path.join(srcDir, "Incomplete.ps");
const incompleteUri = pathToFileURL(incompleteFile).href;
const incompleteSource = "theorem incomplete(P: Prop, h: P): P := by { assumption\n";
fs.writeFileSync(incompleteFile, incompleteSource);
send({
  jsonrpc: "2.0",
  method: "textDocument/didOpen",
  params: {
    textDocument: {
      uri: incompleteUri,
      languageId: "proofscript",
      version: 1,
      text: incompleteSource,
    },
  },
});
const pushedIncomplete = await waitFor(
  (message) => message.method === "textDocument/publishDiagnostics"
    && message.params?.uri === incompleteUri
    && message.params?.version === 1,
  "syntax-incomplete proof diagnostics",
);
assert.equal(pushedIncomplete.params.diagnostics.length, 1);
assert.equal(pushedIncomplete.params.diagnostics[0].code, "PSLS1001");

send({
  jsonrpc: "2.0",
  id: 102,
  method: "proofscript/goals",
  params: {
    textDocument: { uri: incompleteUri },
    position: { line: 0, character: incompleteSource.indexOf("assumption") + 1 },
  },
});
const incompleteGoals = await waitFor((message) => message.id === 102, "syntax-incomplete proof goals response");
assert.equal(incompleteGoals.result.tacticStateAvailable, true);
assert.equal(incompleteGoals.result.tacticState.kind, "tactic");
assert.equal(incompleteGoals.result.tacticState.tactic, "assumption");
assert.equal(incompleteGoals.result.tacticState.goal, "P");
assert.equal(incompleteGoals.result.tacticState.sourceStatus, "syntax-incomplete");
assert.deepEqual(incompleteGoals.result.tacticState.locals.map((local) => local.name), ["P", "h"]);
assert.equal(incompleteGoals.result.declarationGoal, null);

send({
  jsonrpc: "2.0",
  method: "textDocument/didClose",
  params: { textDocument: { uri: incompleteUri } },
});
const incompleteClosed = await waitFor(
  (message) => message.method === "textDocument/publishDiagnostics"
    && message.params?.uri === incompleteUri
    && message.params?.version === undefined,
  "syntax-incomplete close diagnostics clear",
);
assert.deepEqual(incompleteClosed.params.diagnostics, []);
fs.unlinkSync(incompleteFile);

const emptyGoalFile = path.join(srcDir, "EmptyGoal.ps");
const emptyGoalUri = pathToFileURL(emptyGoalFile).href;
const emptyGoalSource = "axiom P: Prop; theorem emptyGoal(h: P): P := by {";
fs.writeFileSync(emptyGoalFile, emptyGoalSource);
send({
  jsonrpc: "2.0",
  method: "textDocument/didOpen",
  params: {
    textDocument: {
      uri: emptyGoalUri,
      languageId: "proofscript",
      version: 1,
      text: emptyGoalSource,
    },
  },
});
const pushedEmptyGoal = await waitFor(
  (message) => message.method === "textDocument/publishDiagnostics"
    && message.params?.uri === emptyGoalUri
    && message.params?.version === 1,
  "empty proof goal diagnostics",
);
assert.equal(pushedEmptyGoal.params.diagnostics.length, 1);
assert.equal(pushedEmptyGoal.params.diagnostics[0].code, "PSLS1001");

send({
  jsonrpc: "2.0",
  id: 103,
  method: "proofscript/goals",
  params: {
    textDocument: { uri: emptyGoalUri },
    position: { line: 0, character: emptyGoalSource.length },
  },
});
const emptyGoalResponse = await waitFor((message) => message.id === 103, "empty proof initial goal response");
assert.equal(emptyGoalResponse.result.tacticStateAvailable, true);
assert.equal(emptyGoalResponse.result.tacticState.kind, "goal");
assert.equal(emptyGoalResponse.result.tacticState.tactic, "by");
assert.equal(emptyGoalResponse.result.tacticState.goal, "P");
assert.equal(emptyGoalResponse.result.tacticState.sourceStatus, "syntax-incomplete");
assert.deepEqual(emptyGoalResponse.result.tacticState.locals.map((local) => local.name), ["h"]);
assert.equal(emptyGoalResponse.result.tacticState.locals[0].type, "P");
assert.equal(emptyGoalResponse.result.declarationGoal, null);

send({
  jsonrpc: "2.0",
  id: 104,
  method: "textDocument/completion",
  params: {
    textDocument: { uri: emptyGoalUri },
    position: { line: 0, character: emptyGoalSource.length },
  },
});
const emptyGoalCompletion = await waitFor((message) => message.id === 104, "empty proof tactic completion response");
assert.equal(emptyGoalCompletion.result.isIncomplete, false);
const assumptionCompletion = emptyGoalCompletion.result.items.find((item) => item.label === "assumption");
assert.ok(assumptionCompletion);
assert.equal(assumptionCompletion.kind, 14, "tactic completions must use the LSP Keyword kind");
assert.match(assumptionCompletion.detail, /canonical elaboration/u);
assert.ok(emptyGoalCompletion.result.items.some((item) => item.label === "induction" && item.kind === 14));

send({
  jsonrpc: "2.0",
  method: "textDocument/didClose",
  params: { textDocument: { uri: emptyGoalUri } },
});
const emptyGoalClosed = await waitFor(
  (message) => message.method === "textDocument/publishDiagnostics"
    && message.params?.uri === emptyGoalUri
    && message.params?.version === undefined,
  "empty proof close diagnostics clear",
);
assert.deepEqual(emptyGoalClosed.params.diagnostics, []);
fs.unlinkSync(emptyGoalFile);

const navigationSource = "def navBase: Nat := 1;\ndef navUse: Nat := navBase;\n";
send({
  jsonrpc: "2.0",
  method: "textDocument/didChange",
  params: {
    textDocument: { uri, version: 3 },
    contentChanges: [{ text: navigationSource }],
  },
});
const pushedNavigation = await waitFor(
  (message) => message.method === "textDocument/publishDiagnostics"
    && message.params?.uri === uri
    && message.params?.version === 3,
  "version 3 navigation diagnostics",
);
assert.equal(pushedNavigation.params.diagnostics.length, 0);

send({
  jsonrpc: "2.0",
  id: 12,
  method: "textDocument/definition",
  params: { textDocument: { uri }, position: { line: 1, character: 21 } },
});
const definition = await waitFor((message) => message.id === 12, "definition response");
assert.equal(definition.result.uri, uri);
assert.deepEqual(definition.result.range.start, { line: 0, character: 4 });
assert.deepEqual(definition.result.range.end, { line: 0, character: 11 });

send({
  jsonrpc: "2.0",
  id: 13,
  method: "textDocument/references",
  params: {
    textDocument: { uri },
    position: { line: 1, character: 21 },
    context: { includeDeclaration: true },
  },
});
const references = await waitFor((message) => message.id === 13, "references response");
assert.equal(references.result.length, 2);

send({
  jsonrpc: "2.0",
  id: 14,
  method: "textDocument/rename",
  params: {
    textDocument: { uri },
    position: { line: 1, character: 21 },
    newName: "renamedBase",
  },
});
const rename = await waitFor((message) => message.id === 14, "rename response");
assert.equal(rename.result.changes[uri].length, 2);
assert.ok(rename.result.changes[uri].every((edit) => edit.newText === "renamedBase"));

send({
  jsonrpc: "2.0",
  id: 15,
  method: "textDocument/semanticTokens/full",
  params: { textDocument: { uri } },
});
const semanticTokens = await waitFor((message) => message.id === 15, "semantic tokens response");
assert.ok(typeof semanticTokens.result.resultId === "string");
assert.equal(semanticTokens.result.data.length, 15);
assert.deepEqual(semanticTokens.result.data.slice(0, 5), [0, 4, 7, 0, 3]);

const messyFormattingSource = "def   formatted : Nat:={1+2};\n";
send({
  jsonrpc: "2.0",
  method: "textDocument/didChange",
  params: {
    textDocument: { uri, version: 4 },
    contentChanges: [{ text: messyFormattingSource }],
  },
});
const pushedFormatting = await waitFor(
  (message) => message.method === "textDocument/publishDiagnostics"
    && message.params?.uri === uri
    && message.params?.version === 4,
  "version 4 formatting diagnostics",
);
assert.equal(pushedFormatting.params.diagnostics.length, 0);

send({
  jsonrpc: "2.0",
  id: 16,
  method: "textDocument/formatting",
  params: {
    textDocument: { uri },
    options: { tabSize: 2, insertSpaces: true },
  },
});
const formatting = await waitFor((message) => message.id === 16, "formatting response");
assert.equal(formatting.result.length, 1);
assert.match(formatting.result[0].newText, /def formatted: Nat := \{1 \+ 2\};/u);

const commentedSource = "-- keep\ndef   x : Nat:={1+2};\n";
send({
  jsonrpc: "2.0",
  method: "textDocument/didChange",
  params: {
    textDocument: { uri, version: 5 },
    contentChanges: [{ text: commentedSource }],
  },
});
const pushedCommented = await waitFor(
  (message) => message.method === "textDocument/publishDiagnostics"
    && message.params?.uri === uri
    && message.params?.version === 5,
  "version 5 commented diagnostics",
);
assert.equal(pushedCommented.params.diagnostics.length, 0);

send({
  jsonrpc: "2.0",
  id: 17,
  method: "textDocument/formatting",
  params: {
    textDocument: { uri },
    options: { tabSize: 2, insertSpaces: true },
  },
});
const commentedFormatting = await waitFor((message) => message.id === 17, "comment formatting response");
assert.equal(commentedFormatting.result.length, 1);
assert.match(commentedFormatting.result[0].newText, /-- keep/u);
assert.match(commentedFormatting.result[0].newText, /def x: Nat := \{1 \+ 2\};/u);

const missingSemicolonSource = "def missing: Nat := 1\n";
send({
  jsonrpc: "2.0",
  method: "textDocument/didChange",
  params: {
    textDocument: { uri, version: 6 },
    contentChanges: [{ text: missingSemicolonSource }],
  },
});
const pushedMissingSemicolon = await waitFor(
  (message) => message.method === "textDocument/publishDiagnostics"
    && message.params?.uri === uri
    && message.params?.version === 6,
  "version 6 missing-semicolon diagnostics",
);
assert.equal(pushedMissingSemicolon.params.diagnostics.length, 1);
assert.equal(pushedMissingSemicolon.params.diagnostics[0].code, "PSLS1001");
assert.match(pushedMissingSemicolon.params.diagnostics[0].data.rawMessage, /^expected ';' at offset \d+, found '/u);

send({
  jsonrpc: "2.0",
  id: 18,
  method: "textDocument/codeAction",
  params: {
    textDocument: { uri },
    range: pushedMissingSemicolon.params.diagnostics[0].range,
    context: {
      diagnostics: pushedMissingSemicolon.params.diagnostics,
    },
  },
});
const codeActions = await waitFor((message) => message.id === 18, "code action response");
assert.equal(codeActions.result.length, 1);
assert.equal(codeActions.result[0].title, "Insert missing ';'");
assert.equal(codeActions.result[0].kind, "quickfix");
assert.equal(codeActions.result[0].isPreferred, true);
assert.equal(codeActions.result[0].edit.changes[uri][0].newText, ";");

send({
  jsonrpc: "2.0",
  method: "textDocument/didClose",
  params: { textDocument: { uri } },
});
const closed = await waitFor(
  (message) => message.method === "textDocument/publishDiagnostics"
    && message.params?.uri === uri
    && message.params?.version === undefined,
  "close diagnostics clear",
);
assert.deepEqual(closed.params.diagnostics, []);

send({ jsonrpc: "2.0", id: 19, method: "shutdown", params: null });
const shutdown = await waitFor((message) => message.id === 19, "shutdown response");
assert.equal(shutdown.result, null);
send({ jsonrpc: "2.0", method: "exit", params: null });

const exitCode = await Promise.race([
  exitPromise,
  new Promise((_, reject) => setTimeout(() => reject(new Error(`LSP did not exit\nstderr=${stderr}`)), 10000)),
]);
assert.equal(exitCode, 0, `LSP exited with code ${exitCode}\nstderr=${stderr}`);

console.log("PS1_LSP_TRANSPORT_TESTS=PASS");
