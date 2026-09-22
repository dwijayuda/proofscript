import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const dir=fs.mkdtempSync(path.join(os.tmpdir(),"proofscript-diff-harness-"));
try{
  const fakeLean=path.join(dir,"lean");
  fs.writeFileSync(fakeLean,`#!/bin/sh
if [ "$1" = "--version" ]; then
  echo 'Lean (version 4.33.1, fake-harness-only, commit 819816b2e0a3bf405af45ae5c7af2491d8f5bee6, Release)'
  exit 0
fi
file="$1"
case "$file" in
  *reject-type-mismatch*|*reject-equality-type-mismatch*|*reject-opaque-no-delta*)
    echo 'synthetic Lean rejection for harness-control-flow test' >&2
    exit 1
    ;;
esac
cat "$file"
case "$file" in
  *reduction-recursion*) echo 'PSDIFF doubleNat3=6' ;;
  *structure-recursor-projection*) echo 'PSDIFF pair=3,4' ;;
  *typeclass-selection*) echo 'PSDIFF automaticBoxTag=8' ;;
  *module-diamond-environment*) echo 'PSDIFF modules=0,0' ;;
  *equation-patterns*) echo 'PSDIFF patterns=true,false,true' ;;
  *literals*) echo 'PSDIFF literals=3,true,false,3' ;;
  *implicit-unification*) echo 'PSDIFF implicit-unification=0,0' ;;
  *recursive-typeclass*) echo 'PSDIFF recursive-instance=3' ;;
  *gap-higher-order-inference*) echo 'PSDIFF gap-higher-order=0' ;;
esac
exit 0
`);
  fs.chmodSync(fakeLean,0o755);
  const report=path.join(dir,"report.json");
  const r=spawnSync(process.execPath,[path.join(root,"tools/lean-differential.ts"),"--lean",fakeLean,"--report",report],{cwd:root,encoding:"utf8"});
  if(r.status!==0)throw new Error(`fake-oracle harness self-test failed (${r.status})\n${r.stdout}\n${r.stderr}`);
  const evidence=JSON.parse(fs.readFileSync(report,"utf8"));
  assert.equal(evidence.schema,2);
  assert.equal(evidence.status,"accepted");
  assert.equal(evidence.summary.total,25);
  assert.equal(evidence.summary.semanticEquivalence,20);
  assert.equal(evidence.summary.negativeAgreement,3);
  assert.equal(evidence.summary.capabilityGaps,2);
  assert.equal(evidence.summary.accepted,25);
  assert.equal(evidence.summary.rejected,0);
  assert.equal(evidence.summary.unsupported,0);
  assert.equal(Object.keys(evidence.coverage).length,15);
  for(const [dimension,coverage] of Object.entries(evidence.coverage))assert.equal(coverage.status,"accepted",`fake harness did not exercise ${dimension}`);
  for(const id of ["reject-type-mismatch","reject-equality-type-mismatch","reject-opaque-no-delta"]){
    const c=evidence.cases.find(x=>x.id===id);assert.equal(c.classification,"negative-agreement");assert.equal(c.status,"accepted");assert.equal(c.leanReferenceObservation.exitCode,1);
  }
  for(const id of ["gap-higher-order-inference","gap-dependent-instance-target"]){
    const c=evidence.cases.find(x=>x.id===id);assert.equal(c.classification,"capability-gap");assert.equal(c.status,"accepted");assert.equal(c.proofscriptResult.status,"unsupported");assert.equal(c.leanReferenceObservation.exitCode,0);
  }
  console.log("✓ differential harness schema-2 control flow covers equivalence, negative agreement, capability gaps, and all required dimensions (fake oracle; not semantic evidence)");
}finally{fs.rmSync(dir,{recursive:true,force:true});}
