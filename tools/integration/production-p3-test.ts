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
const source=fs.readFileSync(path.join(root,'integration-fixtures/production-p3/option.ps'),'utf8');
const checked=checkUnifiedSource(source);
assert.ok(['PRODUCTION-P3-practical-profile', 'PRODUCTION-P4-project-modules', 'PRODUCTION-P5-module-namespaces', 'PRODUCTION-P6-bounded-string'].includes(checked.integrationProfile));
assert.equal(checked.integrationProfile,UNIFIED_INTEGRATION_PROFILE);
assert.equal(checked.kernelSummary.status,'accepted');
assertOnlyStandardBootstrapAssumptions(checked.kernelSummary.assumptions, "checked kernel summary");
const names=new Set(checked.coreArtifact.declarations.map(d=>d.name));
for(const n of ['ProofScript.Core.P3.Option','optionMap','unwrap','mappedSome','mappedNone','plusOne','mappedNamed']) assert.ok(names.has(n),`missing ${n}`);
const optionDecl=checked.coreArtifact.declarations.find(d=>d.name==='ProofScript.Core.P3.Option'&&d.kind==='inductive'); assert.ok(optionDecl&&optionDecl.kind==='inductive');
assert.deepEqual(optionDecl.constructors.map(c=>c.name),['ProofScript.Core.P3.Option.none','ProofScript.Core.P3.Option.some']);
assert.match(checked.typescript,/export function optionMap<A, B>/);
assert.match(checked.typescript,/tag: "Some"/);
assert.match(checked.typescript,/tag: "None"/);
assert.match(checked.typescript,/optionMap\(\(\(x: bigint\) => plusOne\(x\)\),/);

const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'ps-p3-'));
try {
  const artifact=path.join(tmp,'p3.pscore.json'); fs.writeFileSync(artifact,JSON.stringify(checked.coreArtifact,null,2)+'\n');
  decodeArtifact(JSON.parse(fs.readFileSync(artifact,'utf8')));
  const replay=verifyFile(artifact,standardBootstrapAxiomSet()); assert.equal(replay.status,'accepted'); assert.equal(replay.projectPluginsLoaded,false);
  fs.writeFileSync(path.join(tmp,'p3.ts'),checked.typescript+'\nconsole.log("SOME="+mappedSome());\nconsole.log("NONE="+mappedNone());\nconsole.log("NAMED="+mappedNamed());\n');
  fs.writeFileSync(path.join(tmp,'package.json'),'{'+'"type":"module"'+'}\n');
  const tsc=spawnSync('tsc',['p3.ts','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--skipLibCheck','--outDir','js'],{cwd:tmp,encoding:'utf8'}); assert.equal(tsc.status,0,tsc.stderr||tsc.stdout);
  const runtime=spawnSync(process.execPath,[path.join(tmp,'js/p3.js')],{encoding:'utf8'}); assert.equal(runtime.status,0,runtime.stderr||runtime.stdout); assert.deepEqual(runtime.stdout.trim().split(/\r?\n/),['SOME=9','NONE=0','NAMED=11']);
  const leanBin=process.env.PROOFSCRIPT_LEAN_BIN;
  if(leanBin){
    const ver=spawnSync(leanBin,['--version'],{encoding:'utf8'}); assert.equal(ver.status,0,ver.stderr||ver.stdout); assert.match(ver.stdout,/version 4\.33\.1,/); assert.match(ver.stdout,/819816b2e0a3bf405af45ae5c7af2491d8f5bee6/);
    const decoded=decodeArtifact(JSON.parse(fs.readFileSync(artifact,'utf8'))); const stripped=stripStandardBootstrap(decoded) ?? decoded;
    const leanPath=path.join(tmp,'p3.lean'); fs.writeFileSync(leanPath,`${emitLeanArtifact(stripped)}\n#reduce mappedSome\n#reduce mappedNone\n#reduce mappedNamed\n`);
    const lean=spawnSync(leanBin,[leanPath],{encoding:'utf8',env:{...process.env,TERM:'xterm'}}); assert.equal(lean.status,0,lean.stderr||lean.stdout);
    const clean=lean.stdout.replace(/\x1b\[[0-9;]*[A-Za-z]/g,''); const obs=clean.split(/\r?\n/).map(x=>x.trim()).filter(x=>/^[0-9]+$/.test(x)); const tail=clean.split(/\r?\n/).map(x=>x.trim()).filter(Boolean).slice(-3); assert.deepEqual(tail,['9','Nat.zero','11']);
  }
  assert.throws(() => checkUnifiedSource(`
def identity{A: Type}(x: A): A := { x }
def applyNat(f: Nat -> Nat, x: Nat): Nat := { f(x) }
def genericNamed: Nat := { applyNat(identity, 4) }
`), /Unknown local 'identity'|first-class|polymorphic/i);

  const tampered=structuredClone(checked.coreArtifact);
  const some=tampered.declarations.find(d=>d.name==='ProofScript.Core.P3.Option.some'&&d.kind==='inductive');
  // Constructor declarations live inside the inductive; mutate the payload domain to Bool.
  const opt=tampered.declarations.find(d=>d.name==='ProofScript.Core.P3.Option'&&d.kind==='inductive'); assert.ok(opt&&opt.kind==='inductive');
  const ctor=opt.constructors.find(c=>c.name==='ProofScript.Core.P3.Option.some'); assert.ok(ctor);
  const outer=ctor.type; assert.equal(outer.tag,'pi'); assert.equal(outer.body.tag,'pi'); outer.body.domain={tag:'const',name:'Bool',levels:[]};
  assertCoreDeclarationsRejected(checkCoreDeclarations(tampered.declarations,'KERNEL-level-instantiation-conformance1'), /type mismatch|expected|constructor|application/i);
} finally { fs.rmSync(tmp,{recursive:true,force:true}); }
console.log('✓ Production P3 Option: checked Core datatype + generic map/match + replay + exact Lean/TS + tamper rejection passed');
