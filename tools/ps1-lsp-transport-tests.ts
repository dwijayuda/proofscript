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
assert.equal(initialized.result.capabilities.hoverProvider, undefined);
assert.equal(initialized.result.capabilities.completionProvider, undefined);
assert.equal(initialized.result.experimental.proofscript.duplicateParser, false);

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

const fixed = "theorem fixed(P: Prop, h: P): P := h;\n";
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

send({ jsonrpc: "2.0", id: 4, method: "shutdown", params: null });
const shutdown = await waitFor((message) => message.id === 4, "shutdown response");
assert.equal(shutdown.result, null);
send({ jsonrpc: "2.0", method: "exit", params: null });

const exitCode = await Promise.race([
  exitPromise,
  new Promise((_, reject) => setTimeout(() => reject(new Error(`LSP did not exit\nstderr=${stderr}`)), 10000)),
]);
assert.equal(exitCode, 0, `LSP exited with code ${exitCode}\nstderr=${stderr}`);

console.log("PS1_LSP_TRANSPORT_TESTS=PASS");
