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
const source=fs.readFileSync(path.join(root,'integration-fixtures/production-p3/int.ps'),'utf8');
const checked=checkUnifiedSource(source);
assert.ok(['PRODUCTION-P3-practical-profile', 'PRODUCTION-P4-project-modules', 'PRODUCTION-P5-module-namespaces', 'PRODUCTION-P6-bounded-string'].includes(checked.integrationProfile));
assert.equal(checked.integrationProfile,UNIFIED_INTEGRATION_PROFILE);
assert.equal(checked.kernelSummary.status,'accepted');
assertOnlyStandardBootstrapAssumptions(checked.kernelSummary.assumptions, "checked kernel summary");
const intDecl=checked.coreArtifact.declarations.find(d=>d.kind==='inductive'&&d.name==='Int');
assert.ok(intDecl&&intDecl.kind==='inductive');
assert.deepEqual(intDecl.constructors.map(c=>c.name),['Int.ofNat','Int.negSucc']);
for(const n of ['ProofScript.Core.P3.Int.neg','ProofScript.Core.P3.Int.toNat','ProofScript.Core.P3.Int.natAbs','ProofScript.Core.P3.Int.subNatNat','ProofScript.Core.P3.Int.add','pos','neg','posNat','negNat','absNeg','flipped','p7','n2','sumPP','sumPN','sumNP','sumNNAbs']) {
  assert.ok(checked.coreArtifact.declarations.some(d=>d.name===n),`missing ${n}`);
}
assert.match(checked.typescript,/export function pos\(\): bigint/);
assert.match(checked.typescript,/return 5n;/);
assert.match(checked.typescript,/return \(-\(2n \+ 1n\)\);/);

const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'ps-p3-int-'));
try {
  const artifact=path.join(tmp,'int.pscore.json'); fs.writeFileSync(artifact,JSON.stringify(checked.coreArtifact,null,2)+'\n');
  decodeArtifact(JSON.parse(fs.readFileSync(artifact,'utf8')));
  const replay=verifyFile(artifact,standardBootstrapAxiomSet()); assert.equal(replay.status,'accepted'); assert.equal(replay.projectPluginsLoaded,false);
  fs.writeFileSync(path.join(tmp,'int.ts'),checked.typescript+'\nconsole.log("POS="+posNat());\nconsole.log("NEG="+negNat());\nconsole.log("ABS="+absNeg());\nconsole.log("FLIP="+flipped());\nconsole.log("PP="+sumPP());\nconsole.log("PN="+sumPN());\nconsole.log("NP="+sumNP());\nconsole.log("NN="+sumNNAbs());\n');
  fs.writeFileSync(path.join(tmp,'package.json'),'{"type":"module"}\n');
  const tsc=spawnSync('tsc',['int.ts','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--skipLibCheck','--outDir','js'],{cwd:tmp,encoding:'utf8'}); assert.equal(tsc.status,0,tsc.stderr||tsc.stdout);
  const runtime=spawnSync(process.execPath,[path.join(tmp,'js/int.js')],{encoding:'utf8'}); assert.equal(runtime.status,0,runtime.stderr||runtime.stdout); assert.deepEqual(runtime.stdout.trim().split(/\r?\n/),['POS=5','NEG=0','ABS=3','FLIP=5','PP=12','PN=2','NP=2','NN=5']);

  const leanBin=process.env.PROOFSCRIPT_LEAN_BIN;
  if(leanBin){
    const ver=spawnSync(leanBin,['--version'],{encoding:'utf8'}); assert.equal(ver.status,0,ver.stderr||ver.stdout); assert.match(ver.stdout,/version 4\.33\.1,/); assert.match(ver.stdout,/819816b2e0a3bf405af45ae5c7af2491d8f5bee6/);
    const decoded=decodeArtifact(JSON.parse(fs.readFileSync(artifact,'utf8'))); const stripped=stripStandardBootstrap(decoded)??decoded;
    const leanPath=path.join(tmp,'int.lean'); fs.writeFileSync(leanPath,`${emitLeanArtifact(stripped)}\n#reduce posNat\n#reduce negNat\n#reduce absNeg\n#reduce flipped\n#reduce sumPP\n#reduce sumPN\n#reduce sumNP\n#reduce sumNNAbs\n`);
    const lean=spawnSync(leanBin,[leanPath],{encoding:'utf8',env:{...process.env,TERM:'xterm'}}); assert.equal(lean.status,0,lean.stderr||lean.stdout);
    const tail=lean.stdout.replace(/\x1b\[[0-9;]*[A-Za-z]/g,'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean).slice(-8); assert.deepEqual(tail,['5','Nat.zero','3','5','12','2','2','5']);
  }

  const tampered=structuredClone(checked.coreArtifact);
  const bad=tampered.declarations.find(d=>d.kind==='inductive'&&d.name==='Int'); assert.ok(bad&&bad.kind==='inductive');
  const negSucc=bad.constructors.find(c=>c.name==='Int.negSucc'); assert.ok(negSucc&&negSucc.type.tag==='pi'); negSucc.type.domain={tag:'const',name:'Bool',levels:[]};
  assertCoreDeclarationsRejected(checkCoreDeclarations(tampered.declarations,'KERNEL-level-instantiation-conformance1'), /type mismatch|expected|application|Int\.negSucc/i);
} finally { fs.rmSync(tmp,{recursive:true,force:true}); }
console.log('✓ Production P3 Int: canonical checked Int mirror + neg/toNat/natAbs + replay + exact Lean/TS + tamper rejection passed');
