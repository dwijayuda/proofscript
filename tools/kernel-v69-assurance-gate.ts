import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const expectedLeanVersion = '4.33.1';
const expectedLeanCommit = '819816b2e0a3bf405af45ae5c7af2491d8f5bee6';
const assurance = path.join(root, 'assurance/lean4331');
const evidence = path.join(assurance, 'evidence');
const formal = path.join(assurance, 'formal');

function fail(msg) { console.error(`FAIL: ${msg}`); process.exit(1); }
function pass(msg) { console.log(`PASS: ${msg}`); }
function run(cmd, args, opts={}) {
  return spawnSync(cmd, args, { cwd: opts.cwd ?? root, encoding:'utf8', env:{...process.env,...opts.env} });
}
function which(name) {
  const r=run('bash',['-lc',`command -v ${name}`]);
  return r.status===0 ? r.stdout.trim() : null;
}
function sha256(p) { return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'); }

const versions = JSON.parse(fs.readFileSync(path.join(root,'versions.json'),'utf8'));
if (versions.kernelArtifactFormat !== 69) fail('versions.json is not Core format 69');
if (versions.implementationProfile !== 'KERNEL-universe-conformance1') fail('wrong v69 implementation profile');
if (versions.leanSemanticBaseline !== expectedLeanVersion || versions.leanReleaseCommit !== expectedLeanCommit) fail('wrong Lean baseline identity');
pass('Core v69 / KERNEL-universe-conformance1 / Lean 4.33.1 identity');

const manifestPath=path.join(assurance,'MANIFEST.json');
const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
for (const [rel, expected] of Object.entries(manifest.files)) {
  const p=path.join(root,rel);
  if (!fs.existsSync(p)) fail(`manifest file missing: ${rel}`);
  const actual=sha256(p);
  if (actual!==expected) fail(`SHA-256 mismatch: ${rel}\nexpected ${expected}\nactual   ${actual}`);
}
pass(`${Object.keys(manifest.files).length} assurance/trusted source fingerprints`);

const jsGate=run(process.execPath,[path.join(root,'tools/kernel-universe-conformance1-tests.ts')]);
if(jsGate.status!==0) fail(`v69 universe gate failed\n${jsGate.stdout}\n${jsGate.stderr}`);
pass('v69 universe identity/codec/counterexample regression');

const large=fs.readFileSync(path.join(evidence,'LevelDifferentialLarge.out'),'utf8');
const chunks=[...large.matchAll(/CHUNK=(\d+) CASES=(\d+) EQ_FAILURES=(\d+) GE_FAILURES=(\d+)/g)];
const byChunk=new Map(chunks.map(m=>[Number(m[1]),m]));
if(byChunk.size!==10) fail(`expected 10 unique large-differential chunks, found ${byChunk.size}`);
let pairs=0;
for(let i=0;i<10;i++){
  const m=byChunk.get(i); if(!m) fail(`missing differential chunk ${i}`);
  pairs+=Number(m[2]);
  if(Number(m[3])!==0||Number(m[4])!==0) fail(`universe mismatch recorded in chunk ${i}`);
}
if(pairs!==30000) fail(`expected 30000 differential pairs, got ${pairs}`);
pass('30,000 generated pairs / 60,000 exact universe predicate comparisons recorded clean');

const nameOrder=fs.readFileSync(path.join(evidence,'NameLtAsciiDifferential.out'),'utf8');
if(!nameOrder.includes('5000/5000 match, 0 mismatch')) fail('ASCII universe-name ordering evidence is not clean');
pass('5,000 valid ASCII universe-name ordering comparisons');

const lean = process.env.PROOFSCRIPT_LEAN_BIN || which('lean');
if(!lean) fail('Lean executable unavailable; set PROOFSCRIPT_LEAN_BIN');
const vr=run(lean,['--version']);
if(vr.status!==0 || !vr.stdout.includes(`version ${expectedLeanVersion}`) || !vr.stdout.includes(expectedLeanCommit)) {
  fail(`wrong Lean executable: ${vr.stdout}${vr.stderr}`);
}
pass(`exact Lean executable ${expectedLeanVersion}/${expectedLeanCommit.slice(0,12)}`);

const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'ps-v69-formal-'));
try {
  const outDir=path.join(tmp,'ProofScriptKernelEquivalence'); fs.mkdirSync(outDir,{recursive:true});
  const modules=['LevelSemantics','LevelLeanCorrespondence','ExprTranslation','ExprOperations','TypingDirect','ReductionBetaZeta','DeltaTransparency','ReductionOrdinary','DefEqOrdinary','TypingConversion'];
  let leanPath='';
  for(const mod of modules){
    const src=path.join(formal,'ProofScriptKernelEquivalence',`${mod}.lean`);
    const out=path.join(outDir,`${mod}.olean`);
    const r=run(lean,['-o',out,src],{env:{LEAN_PATH:tmp}});
    const text=`${r.stdout}\n${r.stderr}`;
    if(r.status!==0) fail(`formal module ${mod} failed\n${text}`);
    if(text.includes('sorryAx')||text.includes("declaration uses 'sorry'")) fail(`formal module ${mod} contains sorry dependency`);
    leanPath=tmp;
  }
  const statement=run(lean,[path.join(formal,'ProofScriptKernelEquivalence','Statement.lean')],{env:{LEAN_PATH:tmp}});
  if(statement.status!==0) fail(`formal target statement failed\n${statement.stdout}\n${statement.stderr}`);
  pass('formal Lean bridge compiles with no reported sorryAx');

  const exact=run(lean,[path.join(evidence,'UniverseAdmissionUnsoundnessExact.lean')]);
  const exactText=`${exact.stdout}\n${exact.stderr}`;
  if(exact.status===0 || !exactText.includes('Invalid universe level')) fail('exact Lean counterexample did not reject as required');
  pass('exact Lean 4.33.1 rejects historical-v68 universe counterexample');

  const nameTest=run(lean,['--run',path.join(evidence,'NameLtAsciiDifferential.lean')]);
  if(nameTest.status!==0 || !nameTest.stdout.includes('5000/5000 match, 0 mismatch')) fail(`name-order differential failed\n${nameTest.stdout}\n${nameTest.stderr}`);
  pass('live ASCII universe-name ordering differential');

  const exprOps=fs.readFileSync(path.join(evidence,'ExprOperationDifferential.out'),'utf8');
  const shift=/SHIFT_CASES=(\d+) SHIFT_FAILURES=(\d+)/.exec(exprOps);
  const inst=/INSTANTIATE_CASES=(\d+) INSTANTIATE_FAILURES=(\d+)/.exec(exprOps);
  if(!shift || !inst) fail('expression-operation differential evidence is malformed');
  if(Number(shift[1])!==500 || Number(shift[2])!==0 || Number(inst[1])!==500 || Number(inst[2])!==0)
    fail('expression-operation differential evidence is not clean');
  pass('1,000 exact native expression-operation comparisons recorded clean');


  const typingNative=fs.readFileSync(path.join(evidence,'TypingNativeDifferential.out'),'utf8');
  if(!typingNative.includes('TYPING_NATIVE_CASES=1000 FAILURES=0 KERNEL_CHECKS=1000'))
    fail('exact Lean native typing evidence is not clean');
  pass('1,000 exact Lean native inference + kernel-check typing cases recorded clean');

  const typingTs=fs.readFileSync(path.join(evidence,'TypingTSDirect.out'),'utf8');
  if(!typingTs.includes('TYPING_TS_CASES=1000 FAILURES=0'))
    fail('TypeScript direct typing evidence is not clean');
  const liveTypingTs=run(process.execPath,[path.join(root,'tools/kernel-typing-direct-tests.ts')]);
  if(liveTypingTs.status!==0 || !liveTypingTs.stdout.includes('TYPING_TS_CASES=1000 FAILURES=0'))
    fail(`live TypeScript direct typing regression failed\n${liveTypingTs.stdout}\n${liveTypingTs.stderr}`);
  pass('1,000 live TypeScript direct typing cases');

  const liveTypingNative=run(lean,[path.join(evidence,'TypingNativeDifferential.lean')]);
  if(liveTypingNative.status!==0 || !(`${liveTypingNative.stdout}\n${liveTypingNative.stderr}`).includes('TYPING_NATIVE_CASES=1000 FAILURES=0 KERNEL_CHECKS=1000'))
    fail(`live exact Lean typing differential failed\n${liveTypingNative.stdout}\n${liveTypingNative.stderr}`);
  pass('1,000 live exact-Lean native typing cases');


  const bzNative=fs.readFileSync(path.join(evidence,'BetaZetaNativeDifferential.out'),'utf8');
  if(!bzNative.includes('BETA_CASES=500 ZETA_CASES=500 FAILURES=0 KERNEL_CHECKS=1000'))
    fail('exact Lean beta/zeta evidence is not clean');
  const bzTs=fs.readFileSync(path.join(evidence,'BetaZetaTSDirect.out'),'utf8');
  if(!bzTs.includes('BETA_CASES=500 ZETA_CASES=500 FAILURES=0'))
    fail('TypeScript beta/zeta evidence is not clean');
  const liveBzTs=run(process.execPath,[path.join(root,'tools/kernel-beta-zeta-direct-tests.ts')]);
  if(liveBzTs.status!==0 || !liveBzTs.stdout.includes('BETA_CASES=500 ZETA_CASES=500 FAILURES=0'))
    fail(`live TypeScript beta/zeta regression failed\n${liveBzTs.stdout}\n${liveBzTs.stderr}`);
  const liveBzNative=run(lean,[path.join(evidence,'BetaZetaNativeDifferential.lean')]);
  if(liveBzNative.status!==0 || !(`${liveBzNative.stdout}\n${liveBzNative.stderr}`).includes('BETA_CASES=500 ZETA_CASES=500 FAILURES=0 KERNEL_CHECKS=1000'))
    fail(`live exact Lean beta/zeta differential failed\n${liveBzNative.stdout}\n${liveBzNative.stderr}`);
  pass('1,000 TypeScript + 1,000 exact-Lean beta/zeta head-reduction cases');

  const deltaNative=fs.readFileSync(path.join(evidence,'DeltaTransparencyNativeDifferential.out'),'utf8');
  if(!deltaNative.includes('DELTA_NATIVE_CASES=1000 REGULAR=400 ABBREV=200 OPAQUE=200 THEOREM_OPAQUE=200 FAILURES=0 KERNEL_CHECKS=1000'))
    fail('exact Lean delta/transparency evidence is not clean');
  const deltaTs=fs.readFileSync(path.join(evidence,'DeltaTransparencyTSDirect.out'),'utf8');
  if(!deltaTs.includes('DELTA_TS_CASES=1000 REGULAR=400 ABBREV=200 OPAQUE=200 THEOREM_OPAQUE=200 FAILURES=0'))
    fail('TypeScript delta/transparency evidence is not clean');
  const liveDeltaTs=run(process.execPath,[path.join(root,'tools/kernel-delta-transparency-direct-tests.ts')]);
  if(liveDeltaTs.status!==0 || !liveDeltaTs.stdout.includes('DELTA_TS_CASES=1000 REGULAR=400 ABBREV=200 OPAQUE=200 THEOREM_OPAQUE=200 FAILURES=0'))
    fail(`live TypeScript delta/transparency regression failed\n${liveDeltaTs.stdout}\n${liveDeltaTs.stderr}`);
  const liveDeltaNative=run(lean,[path.join(evidence,'DeltaTransparencyNativeDifferential.lean')]);
  if(liveDeltaNative.status!==0 || !(`${liveDeltaNative.stdout}\n${liveDeltaNative.stderr}`).includes('DELTA_NATIVE_CASES=1000 REGULAR=400 ABBREV=200 OPAQUE=200 THEOREM_OPAQUE=200 FAILURES=0 KERNEL_CHECKS=1000'))
    fail(`live exact Lean delta/transparency differential failed\n${liveDeltaNative.stdout}\n${liveDeltaNative.stderr}`);
  pass('1,000 TypeScript + 1,000 exact-Lean delta/transparency cases');

  const ordinaryNative=fs.readFileSync(path.join(evidence,'OrdinaryWhnfNativeDifferential.out'),'utf8');
  if(!ordinaryNative.includes('ORDINARY_WHNF_NATIVE_CASES=1000 REGULAR=500 ABBREV=250 OPAQUE=250 FAILURES=0 KERNEL_CHECKS=1000'))
    fail('exact Lean ordinary-WHNF evidence is not clean');
  const ordinaryTs=fs.readFileSync(path.join(evidence,'OrdinaryWhnfTSDirect.out'),'utf8');
  if(!ordinaryTs.includes('ORDINARY_WHNF_TS_CASES=1000 REGULAR=500 ABBREV=250 OPAQUE=250 FAILURES=0'))
    fail('TypeScript ordinary-WHNF evidence is not clean');
  const liveOrdinaryTs=run(process.execPath,[path.join(root,'tools/kernel-ordinary-whnf-direct-tests.ts')]);
  if(liveOrdinaryTs.status!==0 || !liveOrdinaryTs.stdout.includes('ORDINARY_WHNF_TS_CASES=1000 REGULAR=500 ABBREV=250 OPAQUE=250 FAILURES=0'))
    fail(`live TypeScript ordinary-WHNF regression failed\n${liveOrdinaryTs.stdout}\n${liveOrdinaryTs.stderr}`);
  const liveOrdinaryNative=run(lean,[path.join(evidence,'OrdinaryWhnfNativeDifferential.lean')]);
  if(liveOrdinaryNative.status!==0 || !(`${liveOrdinaryNative.stdout}\n${liveOrdinaryNative.stderr}`).includes('ORDINARY_WHNF_NATIVE_CASES=1000 REGULAR=500 ABBREV=250 OPAQUE=250 FAILURES=0 KERNEL_CHECKS=1000'))
    fail(`live exact Lean ordinary-WHNF differential failed\n${liveOrdinaryNative.stdout}\n${liveOrdinaryNative.stderr}`);
  pass('1,000 TypeScript + 1,000 exact-Lean transparent-head ordinary-WHNF cases');

  const etaProofNative=fs.readFileSync(path.join(evidence,'EtaProofIrrelNativeDifferential.out'),'utf8');
  if(!etaProofNative.includes('ETA_PROOF_NATIVE_CASES=1000 ETA_TRUE=250 ETA_FALSE=250 PROOF_TRUE=250 PROOF_FALSE=250 FAILURES=0 KERNEL_CHECKS=2000'))
    fail('exact Lean eta/proof-irrelevance evidence is not clean');
  const etaProofTs=fs.readFileSync(path.join(evidence,'EtaProofIrrelTSDirect.out'),'utf8');
  if(!etaProofTs.includes('ETA_PROOF_TS_CASES=1000 ETA_TRUE=250 ETA_FALSE=250 PROOF_TRUE=250 PROOF_FALSE=250 FAILURES=0'))
    fail('TypeScript eta/proof-irrelevance evidence is not clean');
  const liveEtaProofTs=run(process.execPath,[path.join(root,'tools/kernel-eta-proof-irrel-direct-tests.ts')]);
  if(liveEtaProofTs.status!==0 || !liveEtaProofTs.stdout.includes('ETA_PROOF_TS_CASES=1000 ETA_TRUE=250 ETA_FALSE=250 PROOF_TRUE=250 PROOF_FALSE=250 FAILURES=0'))
    fail(`live TypeScript eta/proof-irrelevance regression failed\n${liveEtaProofTs.stdout}\n${liveEtaProofTs.stderr}`);
  const liveEtaProofNative=run(lean,[path.join(evidence,'EtaProofIrrelNativeDifferential.lean')]);
  if(liveEtaProofNative.status!==0 || !(`${liveEtaProofNative.stdout}\n${liveEtaProofNative.stderr}`).includes('ETA_PROOF_NATIVE_CASES=1000 ETA_TRUE=250 ETA_FALSE=250 PROOF_TRUE=250 PROOF_FALSE=250 FAILURES=0 KERNEL_CHECKS=2000'))
    fail(`live exact Lean eta/proof-irrelevance differential failed\n${liveEtaProofNative.stdout}\n${liveEtaProofNative.stderr}`);
  pass('1,000 TypeScript + 1,000 exact-Lean eta/proof-irrelevance decisions with negative controls');

  const convNative=fs.readFileSync(path.join(evidence,'TypingConversionNativeDifferential.out'),'utf8');
  if(!convNative.includes('CONVERSION_TYPING_NATIVE_CASES=1000 ETA_TRUE=200 ETA_FALSE=100 PROOF_TRUE=200 PROOF_FALSE=100 BETA=150 ZETA=150 DELTA=100 FAILURES=0 KERNEL_CHECKS=2000'))
    fail('exact Lean conversion-typing evidence is not clean');
  const convTs=fs.readFileSync(path.join(evidence,'TypingConversionTSDirect.out'),'utf8');
  if(!convTs.includes('CONVERSION_TYPING_TS_CASES=1000 ETA_TRUE=200 ETA_FALSE=100 PROOF_TRUE=200 PROOF_FALSE=100 BETA=150 ZETA=150 DELTA=100 FAILURES=0'))
    fail('TypeScript conversion-typing evidence is not clean');
  const liveConvTs=run(process.execPath,[path.join(root,'tools/kernel-typing-conversion-tests.ts')]);
  if(liveConvTs.status!==0 || !liveConvTs.stdout.includes('CONVERSION_TYPING_TS_CASES=1000 ETA_TRUE=200 ETA_FALSE=100 PROOF_TRUE=200 PROOF_FALSE=100 BETA=150 ZETA=150 DELTA=100 FAILURES=0'))
    fail(`live TypeScript conversion-typing regression failed\n${liveConvTs.stdout}\n${liveConvTs.stderr}`);
  const liveConvNative=run(lean,[path.join(evidence,'TypingConversionNativeDifferential.lean')]);
  if(liveConvNative.status!==0 || !(`${liveConvNative.stdout}\n${liveConvNative.stderr}`).includes('CONVERSION_TYPING_NATIVE_CASES=1000 ETA_TRUE=200 ETA_FALSE=100 PROOF_TRUE=200 PROOF_FALSE=100 BETA=150 ZETA=150 DELTA=100 FAILURES=0 KERNEL_CHECKS=2000'))
    fail(`live exact Lean conversion-typing differential failed\n${liveConvNative.stdout}\n${liveConvNative.stderr}`);
  pass('1,000 TypeScript + 1,000 exact-Lean ordinary conversion-dependent typing cases');
} finally {
  fs.rmSync(tmp,{recursive:true,force:true});
}

console.log('KERNEL v69 ASSURANCE GATE: PASS');
console.log('FORMAL WHOLE-KERNEL EQUIVALENCE: IN PROGRESS (not yet K3)');
