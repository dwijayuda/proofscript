#!/usr/bin/env node
import assert from "node:assert/strict";
import path from "node:path";
import { spawn } from "node:child_process";

const extensionRoot = path.resolve(process.argv[2] ?? "editors/vscode");
const server = path.join(extensionRoot, "server", "run-lsp.mjs");
const child = spawn(process.execPath, [server, "--diagnostics-debounce-ms=0"], {
  cwd: extensionRoot,
  stdio: ["pipe", "pipe", "pipe"],
});

let stdout = Buffer.alloc(0);
let stderr = "";
const waiters = [];

child.stdout.on("data", (chunk) => {
  stdout = Buffer.concat([stdout, chunk]);
  drain();
});
child.stderr.on("data", (chunk) => {
  stderr += chunk.toString("utf8");
});

function send(message) {
  const body = Buffer.from(JSON.stringify(message), "utf8");
  child.stdin.write(Buffer.from(`Content-Length: ${body.length}\r\n\r\n`, "utf8"));
  child.stdin.write(body);
}

function drain() {
  while (true) {
    const headerEnd = stdout.indexOf("\r\n\r\n");
    if (headerEnd < 0) return;
    const header = stdout.slice(0, headerEnd).toString("utf8");
    const match = /Content-Length:\s*(\d+)/i.exec(header);
    if (!match) throw new Error(`missing LSP Content-Length header: ${header}`);
    const length = Number(match[1]);
    const bodyStart = headerEnd + 4;
    if (stdout.length < bodyStart + length) return;
    const message = JSON.parse(stdout.slice(bodyStart, bodyStart + length).toString("utf8"));
    stdout = stdout.slice(bodyStart + length);
    const index = waiters.findIndex((waiter) => waiter.predicate(message));
    if (index >= 0) {
      const [waiter] = waiters.splice(index, 1);
      clearTimeout(waiter.timer);
      waiter.resolve(message);
    }
  }
}

function waitFor(predicate, label, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      const index = waiters.findIndex((waiter) => waiter.resolve === resolve);
      if (index >= 0) waiters.splice(index, 1);
      reject(new Error(`timeout waiting for ${label}; stderr=${stderr}`));
    }, timeoutMs);
    waiters.push({ predicate, resolve, reject, timer });
  });
}

const exitPromise = new Promise((resolve) => child.once("exit", resolve));

send({ jsonrpc: "2.0", id: 1, method: "initialize", params: { capabilities: {} } });
const initialized = await waitFor((message) => message.id === 1, "initialize response");
assert.equal(initialized.result?.serverInfo?.name, "ProofScript LSP");
assert.equal(initialized.result?.experimental?.proofscript?.protocolVersion, 1);
assert.deepEqual(initialized.result?.capabilities?.completionProvider?.triggerCharacters, [".", "{"]);

send({ jsonrpc: "2.0", method: "initialized", params: {} });
send({ jsonrpc: "2.0", id: 2, method: "shutdown", params: {} });
const shutdown = await waitFor((message) => message.id === 2, "shutdown response");
assert.equal(shutdown.result, null);
send({ jsonrpc: "2.0", method: "exit", params: {} });

const code = await Promise.race([
  exitPromise,
  new Promise((_, reject) => setTimeout(() => reject(new Error("LSP did not exit")), 5000)),
]);
assert.equal(code, 0, stderr);
console.log("VSCODE_BUNDLED_LSP_SMOKE=PASS");
