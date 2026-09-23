#!/usr/bin/env node
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { resolveNpmInvocation } from "./ps3-npm-invocation.mjs";

const root = path.resolve(import.meta.dirname, "..");
const psc = path.join(root, "bin", "psc.mjs");
const require = createRequire(import.meta.url);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "proofscript-product-v1-apps-"));

function run(command: string, args: string[], cwd = root, expected = 0) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 32 * 1024 * 1024,
  });
  assert.equal(
    result.status,
    expected,
    `${command} ${args.join(" ")} exited ${result.status}, expected ${expected}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
  );
  return result;
}

function pscJson(args: string[], cwd = root, expected = 0) {
  const result = run(process.execPath, [psc, ...args, "--json"], cwd, expected);
  return JSON.parse(result.stdout);
}

async function main() {
  try {
    // 1. Representative CLI application.
    const cliSource = path.join(root, "examples", "product-v1", "cli-app", "Main.ps");
    const cliOut = path.join(tmp, "cli-app.js");
    assert.equal(pscJson(["check", cliSource]).status, "accepted");
    const cliBuild = pscJson(["build-js", cliSource, "--out", cliOut]);
    assert.equal(cliBuild.status, "accepted");
    assert.equal(cliBuild.target, "js");
    assert.ok(fs.existsSync(cliOut));
    const cliRun = pscJson([
      "run", cliSource,
      "--call", "loyaltyPrice",
      "--args", "100,true",
    ]);
    assert.equal(cliRun.status, "accepted");
    assert.equal(String(cliRun.result), "95");
    const cliModule = require(cliOut);
    assert.equal(cliModule.sample, 95n);
    assert.equal(cliModule.loyaltyPrice(100n)(true), 95n);

    // 2. Publishable generated library consumed by ordinary TypeScript.
    const runtimeLibrary = path.join(tmp, "runtime-library");
    fs.cpSync(path.join(root, "examples", "product-v1", "runtime-library"), runtimeLibrary, { recursive: true });
    const librarySource = path.join(runtimeLibrary, "src", "Math.ps");
    const libraryDist = path.join(runtimeLibrary, "dist");
    fs.mkdirSync(libraryDist, { recursive: true });
    const libraryJs = path.join(libraryDist, "index.js");
    const libraryTs = path.join(libraryDist, "index.ts");

    assert.equal(pscJson(["check", librarySource], runtimeLibrary).status, "accepted");
    assert.equal(pscJson(["build-js", librarySource, "--out", libraryJs], runtimeLibrary).status, "accepted");
    assert.equal(
      pscJson(["build-ts", librarySource, "--out", libraryTs, "--runtime", "bundled"], runtimeLibrary).status,
      "accepted",
    );

    const emittedTs = fs.readFileSync(libraryTs, "utf8");
    assert.match(emittedTs, /export const inc: \(arg0: bigint\) => bigint/u);
    assert.match(emittedTs, /export const twice: \(arg0: bigint\) => bigint/u);
    assert.match(emittedTs, /export const answer: bigint/u);
    assert.doesNotMatch(emittedTs, /export const inc: PsValue/u);

    const packInvocation = resolveNpmInvocation(["pack", "--dry-run", "--json"]);
    const packed = run(packInvocation.command, packInvocation.args, runtimeLibrary);
    const packedInfo = JSON.parse(packed.stdout)[0];
    const packedPaths = new Set((packedInfo.files ?? []).map((item: any) => item.path));
    assert.ok(packedPaths.has("dist/index.js"));
    assert.ok(packedPaths.has("dist/index.ts"));
    assert.ok(packedPaths.has("package.json"));

    const consumer = path.join(tmp, "ts-consumer");
    fs.mkdirSync(consumer, { recursive: true });
    fs.writeFileSync(path.join(consumer, "package.json"), JSON.stringify({
      name: "proofscript-product-v1-ts-consumer",
      version: "1.0.0",
      private: true,
      dependencies: {
        "@proofscript-example/runtime-math": "file:../runtime-library",
      },
    }, null, 2) + "\n");
    fs.writeFileSync(path.join(consumer, "consumer.ts"), [
      'import { inc, twice, answer } from "@proofscript-example/runtime-math";',
      "const values = {",
      "  inc: inc(41n),",
      "  twice: twice(21n),",
      "  answer,",
      "};",
      "process.stdout.write(JSON.stringify({",
      "  inc: values.inc.toString(),",
      "  twice: values.twice.toString(),",
      "  answer: values.answer.toString(),",
      "}));",
      "",
    ].join("\n"));

    const npmInstall = resolveNpmInvocation([
      "install",
      "--offline",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
    ]);
    run(npmInstall.command, npmInstall.args, consumer);

    const tsc = path.join(root, "node_modules", "typescript", "bin", "tsc");
    assert.ok(fs.existsSync(tsc), "repository-local TypeScript compiler must be installed");
    run(process.execPath, [
      tsc,
      "consumer.ts",
      "--target", "ES2022",
      "--module", "commonjs",
      "--moduleResolution", "node",
      "--strict",
      "--skipLibCheck",
      "--outDir", "compiled",
    ], consumer);
    const consumed = run(process.execPath, [path.join(consumer, "compiled", "consumer.js")], consumer);
    assert.deepEqual(JSON.parse(consumed.stdout), {
      inc: "42",
      twice: "42",
      answer: "42",
    });

    // 3. HTTP host adapter around checked ProofScript response-domain logic.
    const httpSource = path.join(root, "examples", "product-v1", "http-api", "domain.ps");
    const httpJs = path.join(tmp, "http-domain.js");
    assert.equal(pscJson(["check", httpSource]).status, "accepted");
    assert.equal(pscJson(["build-js", httpSource, "--out", httpJs]).status, "accepted");
    const domain = require(httpJs);
    assert.equal(domain.apiStatus(true), 200n);
    assert.equal(domain.apiStatus(false), 404n);

    const server = http.createServer((request, response) => {
      const ok = request.method === "GET" && request.url === "/health";
      response.statusCode = Number(domain.apiStatus(ok));
      response.setHeader("content-type", "application/json");
      response.end(domain.apiBody(ok));
    });
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", resolve);
    });
    try {
      const address = server.address();
      assert.ok(address && typeof address === "object");
      const base = `http://127.0.0.1:${address.port}`;

      const health = await fetch(base + "/health");
      assert.equal(health.status, 200);
      assert.deepEqual(await health.json(), { status: "ok", service: "proofscript" });

      const missing = await fetch(base + "/missing");
      assert.equal(missing.status, 404);
      assert.deepEqual(await missing.json(), { error: "not_found" });
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => error ? reject(error) : resolve())
      );
    }

    console.log("PRODUCT_V1_REPRESENTATIVE_APPS_TESTS=PASS");
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

await main();
