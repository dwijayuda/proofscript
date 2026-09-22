import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { decodeArtifact } from '@proofscript/kernel-codec';
import { verifyFile } from '@proofscript/verifier';
import { checkUnifiedSource, UNIFIED_INTEGRATION_PROFILE } from '@proofscript/unified-bridge';
import { stripStandardBootstrap } from '@proofscript/environment';
import { emitLeanArtifact } from '@proofscript/lean-export';
import { assertCoreDeclarationsRejected, assertOnlyStandardBootstrapAssumptions, standardBootstrapAxiomSet } from "./bootstrap-assumptions.ts";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const source=fs.readFileSync(path.join(root,'integration-fixtures/production-p3/closure.ps'),'utf8');
const checked=checkUnifiedSource(source);
assert.ok(['PRODUCTION-P3-practical-profile', 'PRODUCTION-P4-project-modules', 'PRODUCTION-P5-module-namespaces', 'PRODUCTION-P6-bounded-string'].includes(checked.integrationProfile));
assert.equal(checked.integrationProfile,UNIFIED_INTEGRATION_PROFILE);
assert.equal(checked.kernelSummary.status,'accepted'); assertOnlyStandardBootstrapAssumptions(checked.kernelSummary.assumptions, "checked kernel summary");
for(const n of ['makeAdder','add5','closureResult']) assert.ok(checked.coreArtifact.declarations.some(d=>d.name===n),`missing ${n}`);
assert.match(checked.typescript,/export function makeAdder\(x: bigint\): \(arg: bigint\) => bigint/);
assert.match(checked.typescript,/return \(\(y: bigint\) => \(x \+ y\)\)/);
assert.match(checked.typescript,/return add5\(\)\(7n\)/);
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'ps-p3-closure-'));
try {
  const artifact=path.join(tmp,'closure.pscore.json'); fs.writeFileSync(artifact,JSON.stringify(checked.coreArtifact,null,2)+'\n');
  decodeArtifact(JSON.parse(fs.readFileSync(artifact,'utf8'))); const replay=verifyFile(artifact,standardBootstrapAxiomSet()); assert.equal(replay.status,'accepted'); assert.equal(replay.projectPluginsLoaded,false);
  fs.writeFileSync(path.join(tmp,'closure.ts'),checked.typescript+'\nconsole.log("R="+closureResult());\n'); fs.writeFileSync(path.join(tmp,'package.json'),'{'+'"type":"module"'+'}\n');
  const tsc=spawnSync('tsc',['closure.ts','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--skipLibCheck','--outDir','js'],{cwd:tmp,encoding:'utf8'}); assert.equal(tsc.status,0,tsc.stderr||tsc.stdout);
  const rt=spawnSync(process.execPath,[path.join(tmp,'js/closure.js')],{encoding:'utf8'}); assert.equal(rt.status,0,rt.stderr||rt.stdout); assert.equal(rt.stdout.trim(),'R=12');
  const leanBin=process.env.PROOFSCRIPT_LEAN_BIN;
  if(leanBin){ const v=spawnSync(leanBin,['--version'],{encoding:'utf8'}); assert.equal(v.status,0,v.stderr||v.stdout); assert.match(v.stdout,/version 4\.33\.1,/); const decoded=decodeArtifact(JSON.parse(fs.readFileSync(artifact,'utf8'))); const stripped=stripStandardBootstrap(decoded)??decoded; const lp=path.join(tmp,'closure.lean'); fs.writeFileSync(lp,`${emitLeanArtifact(stripped)}\n#reduce closureResult\n`); const lean=spawnSync(leanBin,[lp],{encoding:'utf8',env:{...process.env,TERM:'xterm'}}); assert.equal(lean.status,0,lean.stderr||lean.stdout); const tail=lean.stdout.replace(/\x1b\[[0-9;]*[A-Za-z]/g,'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean).slice(-1); assert.deepEqual(tail,['12']); }
  assert.throws(()=>checkUnifiedSource(`def poly{A: Type}(x:A):A := { x }\ndef bad: Nat -> Nat := { poly }`),/Unknown local 'poly'|first-class|polymorphic/i);
} finally { fs.rmSync(tmp,{recursive:true,force:true}); }
console.log('✓ Production P3 closures: captured lambda + function-valued global application + replay + exact Lean/TS + polymorphic fail-closed passed');
