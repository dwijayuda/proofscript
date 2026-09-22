#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = path.resolve(import.meta.dirname, "..");
const psc = path.join(root, "bin", "psc.mjs");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "proofscript-cli-project-profile-"));

function run(args: string[], cwd = root) {
  return spawnSync(process.execPath, [psc, ...args], {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function init(template: "software" | "crud", name: string): string {
  const app = path.join(tmp, name);
  const result = run(["init", app, "--template", template, "--json"]);
  assert.equal(result.status, 0, result.stderr + result.stdout);
  const config = JSON.parse(fs.readFileSync(path.join(app, "proofscript.config.json"), "utf8"));
  assert.equal(config.schemaVersion, 1);
  assert.equal(config.proofscriptReference, "v0.6.1");
  assert.equal(config.productProfile, "ps1-v061");
  assert.equal(config.profile, "proofscript-software-v0");
  return app;
}

try {
  const software = init("software", "software-app");
  const softwareCheck = run(["check", "--json"], software);
  assert.equal(softwareCheck.status, 0, softwareCheck.stderr + softwareCheck.stdout);

  const staleProfile = JSON.parse(fs.readFileSync(path.join(software, "proofscript.config.json"), "utf8"));
  staleProfile.productProfile = "stale-profile";
  fs.writeFileSync(path.join(software, "proofscript.config.json"), JSON.stringify(staleProfile, null, 2) + "\n");
  const staleProfileCheck = run(["check", "--json"], software);
  assert.equal(staleProfileCheck.status, 1, staleProfileCheck.stderr + staleProfileCheck.stdout);
  assert.match(staleProfileCheck.stdout + staleProfileCheck.stderr, /unsupported ProofScript product profile/i);

  const crud = init("crud", "crud-app");
  const staleReference = JSON.parse(fs.readFileSync(path.join(crud, "proofscript.config.json"), "utf8"));
  staleReference.proofscriptReference = "v0.1";
  fs.writeFileSync(path.join(crud, "proofscript.config.json"), JSON.stringify(staleReference, null, 2) + "\n");
  const staleReferenceCheck = run(["check", "--json"], crud);
  assert.equal(staleReferenceCheck.status, 1, staleReferenceCheck.stderr + staleReferenceCheck.stdout);
  assert.match(staleReferenceCheck.stdout + staleReferenceCheck.stderr, /unsupported ProofScript reference/i);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

console.log("PS2_CLI_PROJECT_PROFILE_TESTS=PASS");
