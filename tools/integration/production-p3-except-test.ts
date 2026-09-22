import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { checkCoreDeclarations } from '@proofscript/kernel';
import { decodeArtifact } from '@proofscript/kernel-codec';
import { verifyFile } from '@proofscript/verifier';
import { checkUnifiedSource, UNIFIED_INTEGRATION_PROFILE } from '@proofscript/unified-bridge';
import { stripStandardBootstrap } from '@proofscript/environment';
import { emitLeanArtifact } from '@proofscript/lean-export';
import { assertCoreDeclarationsRejected, assertOnlyStandardBootstrapAssumptions, standardBootstrapAxiomSet } from "./bootstrap-assumptions.ts";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const source=fs.readFileSync(path.join(root,'integration-fixtures/production-p3/except.ps'),'utf8');
const checked=checkUnifiedSource(source);
assert.ok(['PRODUCTION-P3-practical-profile', 'PRODUCTION-P4-project-modules', 'PRODUCTION-P5-module-namespaces', 'PRODUCTION-P6-bounded-string'].includes(checked.integrationProfile));
assert.equal(checked.integrationProfile,UNIFIED_INTEGRATION_PROFILE);
assert.equal(checked.kernelSummary.status,'accepted'); assertOnlyStandardBootstrapAssumptions(checked.kernelSummary.assumptions, "checked kernel summary");
const ex=checked.coreArtifact.declarations.find(d=>d.kind==='inductive'&&d.name==='ProofScript.Core.P3.Except'); assert.ok(ex&&ex.kind==='inductive');
assert.deepEqual(ex.constructors.map(c=>c.name),['ProofScript.Core.P3.Except.error','ProofScript.Core.P3.Except.ok']);
for(const n of ['exceptMap','unwrapExcept','exceptOk','exceptErr']) assert.ok(checked.coreArtifact.declarations.some(d=>d.name===n),`missing ${n}`);
assert.match(checked.typescript,/export function exceptMap<E, A, B>/); assert.match(checked.typescript,/tag: "error"/); assert.match(checked.typescript,/tag: "ok"/);
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'ps-p3-except-'));
try {
  const artifact=path.join(tmp,'except.pscore.json'); fs.writeFileSync(artifact,JSON.stringify(checked.coreArtifact,null,2)+'\n');
  decodeArtifact(JSON.parse(fs.readFileSync(artifact,'utf8'))); const replay=verifyFile(artifact,standardBootstrapAxiomSet()); assert.equal(replay.status,'accepted'); assert.equal(replay.projectPluginsLoaded,false);
  fs.writeFileSync(path.join(tmp,'except.ts'),checked.typescript+'\nconsole.log("OK="+exceptOk());\nconsole.log("ERR="+exceptErr());\n'); fs.writeFileSync(path.join(tmp,'package.json'),'{"type":"module"}\n');
  const tsc=spawnSync('tsc',['except.ts','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--skipLibCheck','--outDir','js'],{cwd:tmp,encoding:'utf8'}); assert.equal(tsc.status,0,tsc.stderr||tsc.stdout);
  const rt=spawnSync(process.execPath,[path.join(tmp,'js/except.js')],{encoding:'utf8'}); assert.equal(rt.status,0,rt.stderr||rt.stdout); assert.deepEqual(rt.stdout.trim().split(/\r?\n/),['OK=9','ERR=4']);
  const leanBin=process.env.PROOFSCRIPT_LEAN_BIN;
  if(leanBin){ const v=spawnSync(leanBin,['--version'],{encoding:'utf8'}); assert.equal(v.status,0,v.stderr||v.stdout); assert.match(v.stdout,/version 4\.33\.1,/); assert.match(v.stdout,/819816b2e0a3bf405af45ae5c7af2491d8f5bee6/); const decoded=decodeArtifact(JSON.parse(fs.readFileSync(artifact,'utf8'))); const stripped=stripStandardBootstrap(decoded)??decoded; const lp=path.join(tmp,'except.lean'); fs.writeFileSync(lp,`${emitLeanArtifact(stripped)}\n#reduce exceptOk\n#reduce exceptErr\n`); const lean=spawnSync(leanBin,[lp],{encoding:'utf8',env:{...process.env,TERM:'xterm'}}); assert.equal(lean.status,0,lean.stderr||lean.stdout); const tail=lean.stdout.replace(/\x1b\[[0-9;]*[A-Za-z]/g,'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean).slice(-2); assert.deepEqual(tail,['9','4']); }
  const tampered=structuredClone(checked.coreArtifact); const bad=tampered.declarations.find(d=>d.kind==='inductive'&&d.name==='ProofScript.Core.P3.Except'); assert.ok(bad&&bad.kind==='inductive'); const ok=bad.constructors.find(c=>c.name==='ProofScript.Core.P3.Except.ok'); assert.ok(ok&&ok.type.tag==='pi'&&ok.type.body.tag==='pi'&&ok.type.body.body.tag==='pi'); ok.type.body.body.domain={tag:'const',name:'Bool',levels:[]}; assertCoreDeclarationsRejected(checkCoreDeclarations(tampered.declarations,'KERNEL-level-instantiation-conformance1'), /type mismatch|expected|constructor|application/i);
} finally { fs.rmSync(tmp,{recursive:true,force:true}); }
console.log('✓ Production P3 Except: checked two-parameter datatype + generic map/match + replay + exact Lean/TS + tamper rejection passed');
