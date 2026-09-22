import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {probeLean,parseLeanVersion,parseLeanCommit,PINNED_LEAN_VERSION,PINNED_LEAN_RELEASE_COMMIT} from "./lib/lean-toolchain.ts";

assert.equal(parseLeanVersion("Lean (version 4.33.1, x86_64-unknown-linux-gnu, commit 819816b2e0a3bf405af45ae5c7af2491d8f5bee6, Release)"),"4.33.1");
assert.equal(parseLeanVersion("Lean version 4.33.10"),"4.33.10");
assert.equal(parseLeanVersion("not lean"),undefined);
assert.equal(parseLeanCommit("Lean (version 4.33.1, commit 819816b2e0a3bf405af45ae5c7af2491d8f5bee6, Release)"),PINNED_LEAN_RELEASE_COMMIT);
assert.equal(parseLeanCommit("Lean (version 4.33.1, Release)"),undefined);
const dir=fs.mkdtempSync(path.join(os.tmpdir(),"proofscript-lean-probe-"));
try{
  const mk=(name,version,commit)=>{const f=path.join(dir,name);fs.writeFileSync(f,`#!/bin/sh\necho 'Lean (version ${version}, fake, commit ${commit}, Release)'\n`);fs.chmodSync(f,0o755);return f;};
  const exact=probeLean(mk("lean-exact",PINNED_LEAN_VERSION,PINNED_LEAN_RELEASE_COMMIT));assert.equal(exact.status,"accepted");assert.equal(exact.version,PINNED_LEAN_VERSION);assert.equal(exact.commit,PINNED_LEAN_RELEASE_COMMIT);
  const near=probeLean(mk("lean-near","4.33.10",PINNED_LEAN_RELEASE_COMMIT));assert.equal(near.status,"unsupported");assert.match(near.message,/required, found 4\.33\.10/);
  const wrongCommit=probeLean(mk("lean-wrong-commit",PINNED_LEAN_VERSION,"0000000000000000000000000000000000000000"));assert.equal(wrongCommit.status,"unsupported");assert.match(wrongCommit.message,/release commit .* required, found 00000000/);
  const noCommit=path.join(dir,"lean-no-commit");fs.writeFileSync(noCommit,`#!/bin/sh\necho 'Lean (version ${PINNED_LEAN_VERSION}, fake, Release)'\n`);fs.chmodSync(noCommit,0o755);const missingCommit=probeLean(noCommit);assert.equal(missingCommit.status,"unsupported");assert.match(missingCommit.message,/did not report a commit/);
  const missing=probeLean(path.join(dir,"does-not-exist"));assert.equal(missing.status,"unsupported");
}finally{fs.rmSync(dir,{recursive:true,force:true});}
console.log("✓ pinned Lean toolchain parser requires exact 4.33.1 release version + commit and rejects substitutions");
