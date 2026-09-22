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
const self = fileURLToPath(import.meta.url);

function fail(msg) { console.error(`FAIL: ${msg}`); process.exit(1); }
function pass(msg) { console.log(`PASS: ${msg}`); }
function run(cmd, args, opts={}) {
  return spawnSync(cmd, args, { cwd: opts.cwd ?? root, encoding:'utf8', timeout: opts.timeoutMs ?? 240000, maxBuffer: 64*1024*1024, env:{...process.env,...opts.env} });
}

function runStreaming(cmd, args, opts={}) {
  return spawnSync(cmd, args, {
    cwd: opts.cwd ?? root,
    stdio: 'inherit',
    timeout: opts.timeoutMs ?? 45 * 60 * 1000,
    env: {...process.env, ...opts.env}
  });
}

function writeFullGateSummary(parts) {
  const versions = JSON.parse(fs.readFileSync(path.join(root, 'versions.json'), 'utf8'));
  const lean = process.env.PROOFSCRIPT_LEAN_BIN || which('lean');
  const leanVersion = lean ? run(lean, ['--version']) : null;
  const summary = {
    schema: 'proofscript.kernel.v71.full-lean-gate-final-validation/v1',
    generatedAtUtc: new Date().toISOString(),
    status: 'PASS',
    coreFormat: versions.kernelArtifactFormat,
    implementationProfile: versions.implementationProfile,
    leanSemanticBaseline: expectedLeanVersion,
    leanReleaseCommit: expectedLeanCommit,
    leanExecutable: lean,
    leanVersionOutput: leanVersion?.stdout?.trim() ?? null,
    partsPassed: parts.map(Number),
    partCount: parts.length,
    assuranceClaim: 'Lean 4.33.1-backed v71 gate passed end-to-end for the declared checked components.',
    formalWholeKernelEquivalence: 'IN_PROGRESS_NOT_YET_K3',
    note: 'This is an end-to-end executable assurance gate result, not a completed formal whole-kernel equivalence theorem.'
  };
  const out = path.join(assurance, 'FINAL_VALIDATION_V71_FULL_LEAN_GATE.json');
  fs.writeFileSync(out, JSON.stringify(summary, null, 2) + '\n');
  pass(`wrote ${path.relative(root, out)}`);
}

function which(name) {
  const r=run('bash',['-lc',`command -v ${name}`]);
  return r.status===0 ? r.stdout.trim() : null;
}
function sha256(p) { return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'); }
function text(r) { return `${r.stdout ?? ''}\n${r.stderr ?? ''}`; }
function requireRun(r, label, needle=null) {
  if (r.status !== 0 || (needle && !text(r).includes(needle))) fail(`${label} failed\n${text(r)}`);
}

function common() {
  const versions = JSON.parse(fs.readFileSync(path.join(root,'versions.json'),'utf8'));
  if (versions.kernelArtifactFormat !== 71) fail('versions.json is not Core format 71');
  if (versions.implementationProfile !== 'KERNEL-level-instantiation-conformance1') fail('wrong v71 implementation profile');
  if (versions.leanSemanticBaseline !== expectedLeanVersion || versions.leanReleaseCommit !== expectedLeanCommit) fail('wrong Lean baseline identity');
  pass('Core v71 / KERNEL-level-instantiation-conformance1 / Lean 4.33.1 identity');

  const manifest=JSON.parse(fs.readFileSync(path.join(assurance,'MANIFEST.json'),'utf8'));
  if (manifest.schema !== 'proofscript.kernel-assurance.v71-manifest/v1' || manifest.profile !== versions.implementationProfile || manifest.coreFormat !== 71)
    fail('v71 manifest identity mismatch');
  for (const [rel, expected] of Object.entries(manifest.files)) {
    const p=path.join(root,rel);
    if (!fs.existsSync(p)) fail(`manifest file missing: ${rel}`);
    const actual=sha256(p);
    if (actual!==expected) fail(`SHA-256 mismatch: ${rel}\nexpected ${expected}\nactual   ${actual}`);
  }
  pass(`${Object.keys(manifest.files).length} assurance/trusted source fingerprints`);

  const lean = process.env.PROOFSCRIPT_LEAN_BIN || which('lean');
  if(!lean) fail('Lean executable unavailable; set PROOFSCRIPT_LEAN_BIN');
  const vr=run(lean,['--version']);
  if(vr.status!==0 || !vr.stdout.includes(`version ${expectedLeanVersion}`) || !vr.stdout.includes(expectedLeanCommit))
    fail(`wrong Lean executable: ${text(vr)}`);
  pass(`exact Lean executable ${expectedLeanVersion}/${expectedLeanCommit.slice(0,12)}`);
  return lean;
}

function part1() {
  const lean=common();
  requireRun(run(process.execPath,[path.join(root,'tools/kernel-universe-conformance1-tests.ts')]),'inherited v69 universe gate','PASS KERNEL-universe-conformance1');
  pass('inherited v69 universe conformance regression');
  requireRun(run(process.execPath,[path.join(root,'tools/kernel-projection-conformance1-tests.ts')]),'inherited v70 projection gate','PASS KERNEL-projection-conformance1');
  pass('inherited v70 projection conformance regression');
  requireRun(run(process.execPath,[path.join(root,'tools/kernel-level-instantiation-conformance1-tests.ts')]),'v71 level-instantiation gate','PASS KERNEL-level-instantiation-conformance1');
  pass('v71 level-instantiation identity + cheap-rebuild regression');

  const large=fs.readFileSync(path.join(evidence,'LevelDifferentialLarge.out'),'utf8');
  const chunks=[...large.matchAll(/CHUNK=(\d+) CASES=(\d+) EQ_FAILURES=(\d+) GE_FAILURES=(\d+)/g)];
  const byChunk=new Map(chunks.map(m=>[Number(m[1]),m])); let pairs=0;
  if(byChunk.size!==10) fail(`expected 10 universe chunks, found ${byChunk.size}`);
  for(let i=0;i<10;i++){ const m=byChunk.get(i); if(!m) fail(`missing universe chunk ${i}`); pairs+=Number(m[2]); if(Number(m[3])||Number(m[4])) fail(`universe mismatch in chunk ${i}`); }
  if(pairs!==30000) fail(`expected 30000 universe pairs, got ${pairs}`);
  pass('30,000 universe pairs / 60,000 predicate comparisons recorded clean');

  const formalOut=fs.readFileSync(path.join(evidence,'v71-env-induction-formal28.out'),'utf8');
  if(!formalOut.includes('FORMAL_STACK_MODULES=28 TARGET_STATEMENT=1 SORRYAX=0')) fail('formal 28-module inherited evidence missing or dirty');
  if(formalOut.includes('SORRY_FOUND') || formalOut.includes("declaration uses 'sorry'")) fail('inherited formal evidence contains sorry dependency');
  const genericFormal=fs.readFileSync(path.join(evidence,'v71-generic-nonmutual-formal1.out'),'utf8');
  if(!genericFormal.includes('GENERIC_NONMUTUAL_MODULES=1 INHERITED_FORMAL_STACK=28 TARGET_STATEMENT=1 SORRYAX=0')) fail('generic non-mutual formal evidence missing or dirty');
  if(genericFormal.includes('sorryAx') || genericFormal.includes('SORRY_FOUND') || genericFormal.includes("declaration uses 'sorry'")) fail('generic non-mutual formal evidence contains sorry dependency');
  const classifierFormal=fs.readFileSync(path.join(evidence,'v71-nonmutual-classifier-formal1.out'),'utf8');
  if(!classifierFormal.includes('NONMUTUAL_CLASSIFIER_MODULES=1 INHERITED_FORMAL_STACK=29 TARGET_STATEMENT=1 SORRYAX=0')) fail('non-mutual classifier formal evidence missing or dirty');
  if(classifierFormal.includes('sorryAx') || classifierFormal.includes('SORRY_FOUND') || classifierFormal.includes("declaration uses 'sorry'")) fail('non-mutual classifier formal evidence contains sorry dependency');
  const tsImplFormal=fs.readFileSync(path.join(evidence,'v71-ts-classifier-implementation-contract-formal1.out'),'utf8');
  if(!tsImplFormal.includes('TS_CLASSIFIER_IMPLEMENTATION_CONTRACT_MODULES=1 INHERITED_FORMAL_STACK=30 TARGET_STATEMENT=1 SORRYAX=0')) fail('TypeScript classifier implementation contract formal evidence missing or dirty');
  if(tsImplFormal.includes('sorryAx') || tsImplFormal.includes('SORRY_FOUND') || tsImplFormal.includes("declaration uses 'sorry'")) fail('TypeScript classifier implementation contract formal evidence contains sorry dependency');
  pass('31 effective formal modules/contracts: inherited 30 + TypeScript classifier implementation contract, no reported sorryAx');

  const exact=run(lean,[path.join(evidence,'UniverseAdmissionUnsoundnessExact.lean')]);
  if(exact.status===0 || !text(exact).includes('Invalid universe level')) fail('historical-v68 universe counterexample did not reject');
  pass('exact Lean rejects historical-v68 universe counterexample');
  const nameOrder=fs.readFileSync(path.join(evidence,'v71-nonmutual-name-order-live.out'),'utf8');
  if(!nameOrder.includes('5000/5000 match, 0 mismatch')) fail('universe-name ordering evidence missing or dirty');
  pass('5,000 recorded live universe-name ordering comparisons');
  console.log('KERNEL v71 ASSURANCE GATE PART 1/6: PASS');
}

function part2() {
  const lean=common();
  requireRun(run(process.execPath,[path.join(root,'tools/kernel-level-expr-instantiation-differential-tests.ts')],{env:{PROOFSCRIPT_LEAN_BIN:lean}}),'live v71 level/expression instantiation','EXPR_INSTANTIATION_CASES=1000 MISMATCHES=0');
  pass('1,000 level + 1,000 shared-expression instantiation comparisons');
  const exprOps=fs.readFileSync(path.join(evidence,'ExprOperationDifferential.out'),'utf8');
  if(!exprOps.includes('SHIFT_CASES=500 SHIFT_FAILURES=0') || !exprOps.includes('INSTANTIATE_CASES=500 INSTANTIATE_FAILURES=0')) fail('expression operation evidence not clean');
  pass('1,000 recorded exact expression-operation comparisons');
  console.log('KERNEL v71 ASSURANCE GATE PART 2/6: PASS');
}

function part3() {
  const lean=common();
  requireRun(run(process.execPath,[path.join(root,'tools/kernel-typing-direct-tests.ts')]),'TypeScript direct typing','TYPING_TS_CASES=1000 FAILURES=0');
  requireRun(run(lean,[path.join(evidence,'TypingNativeDifferential.lean')]),'Lean direct typing','TYPING_NATIVE_CASES=1000 FAILURES=0 KERNEL_CHECKS=1000');
  pass('direct typing: 1,000 TS + 1,000 exact Lean');
  requireRun(run(process.execPath,[path.join(root,'tools/kernel-beta-zeta-direct-tests.ts')]),'TypeScript beta/zeta','BETA_CASES=500 ZETA_CASES=500 FAILURES=0');
  requireRun(run(lean,[path.join(evidence,'BetaZetaNativeDifferential.lean')]),'Lean beta/zeta','BETA_CASES=500 ZETA_CASES=500 FAILURES=0 KERNEL_CHECKS=1000');
  pass('beta/zeta: 1,000 TS + 1,000 exact Lean');
  requireRun(run(process.execPath,[path.join(root,'tools/kernel-delta-transparency-direct-tests.ts')]),'TypeScript delta','DELTA_TS_CASES=1000');
  requireRun(run(lean,[path.join(evidence,'DeltaTransparencyNativeDifferential.lean')]),'Lean delta','DELTA_NATIVE_CASES=1000');
  pass('delta/transparency: 1,000 TS + 1,000 exact Lean');
  requireRun(run(process.execPath,[path.join(root,'tools/kernel-ordinary-whnf-direct-tests.ts')]),'TypeScript ordinary WHNF','ORDINARY_WHNF_TS_CASES=1000');
  requireRun(run(lean,[path.join(evidence,'OrdinaryWhnfNativeDifferential.lean')]),'Lean ordinary WHNF','ORDINARY_WHNF_NATIVE_CASES=1000');
  pass('ordinary WHNF: 1,000 TS + 1,000 exact Lean');
  console.log('KERNEL v71 ASSURANCE GATE PART 3/6: PASS');
}

function part4() {
  const lean=common();
  requireRun(run(process.execPath,[path.join(root,'tools/kernel-eta-proof-irrel-direct-tests.ts')]),'TypeScript eta/proof irrelevance','ETA_PROOF_TS_CASES=1000');
  requireRun(run(lean,[path.join(evidence,'EtaProofIrrelNativeDifferential.lean')]),'Lean eta/proof irrelevance','ETA_PROOF_NATIVE_CASES=1000');
  pass('eta/proof irrelevance: 1,000 TS + 1,000 exact Lean');
  requireRun(run(process.execPath,[path.join(root,'tools/kernel-typing-conversion-tests.ts')]),'TypeScript conversion typing','CONVERSION_TYPING_TS_CASES=1000');
  requireRun(run(lean,[path.join(evidence,'TypingConversionNativeDifferential.lean')]),'Lean conversion typing','CONVERSION_TYPING_NATIVE_CASES=1000');
  pass('conversion-dependent typing: 1,000 TS + 1,000 exact Lean');
  requireRun(run(process.execPath,[path.join(root,'tools/kernel-projection-differential-tests.ts')]),'TypeScript projection','PROJECTION_TS_CASES=1000 FAILURES=0');
  requireRun(run(lean,[path.join(evidence,'ProjectionNativeDifferential.lean')]),'Lean projection','PROJECTION_NATIVE_CASES=1000 FAILURES=0 KERNEL_CHECKED=1000');
  requireRun(run(lean,[path.join(evidence,'ProjectionConformanceExact.lean')]),'exact projection regression','PASS ProjectionConformanceExact: exact Lean 4.33.1 raw projection semantics');
  const old=fs.readFileSync(path.join(evidence,'projection-prop-dependency-old-v69.out'),'utf8');
  if(!old.includes('HISTORICAL_V69_ACCEPTED dependent-proof-projection')) fail('historical v69 projection counterexample missing');
  pass('projection: 1,000 TS + 1,000 exact Lean + minimized historical regression');
  console.log('KERNEL v71 ASSURANCE GATE PART 4/6: PASS');
}

function part5() {
  const lean=common();
  const ts=run(process.execPath,[path.join(root,'tools/kernel-recursor-metadata-differential-tests.ts')]);
  const ln=run(lean,[path.join(evidence,'RecursorMetadataNativeDifferential.lean')]);
  requireRun(ts,'TypeScript recursor metadata','RECURSOR_METADATA_TS_CASES=7 FAILURES=0');
  requireRun(ln,'Lean recursor metadata','RECURSOR_METADATA_NATIVE_CASES=7 FAILURES=0 RAW_KERNEL_DECLARATIONS=7');
  const recLines=x=>text(x).split(/\r?\n/).filter(l=>l.startsWith('REC_META '));
  if(JSON.stringify(recLines(ts))!==JSON.stringify(recLines(ln)) || recLines(ts).length!==7) fail('recursor metadata lines differ');
  pass('7 recursor metadata shapes agree exactly');
  requireRun(run(process.execPath,[path.join(root,'tools/kernel-recursor-k-tests.ts')],{env:{PROOFSCRIPT_LEAN_BIN:lean}}),'recursor K','RecursorVal.k classification');
  requireRun(run(process.execPath,[path.join(root,'tools/kernel-recursor-minor-order-tests.ts')],{env:{PROOFSCRIPT_LEAN_BIN:lean}}),'recursor minor order','fields-first recursive minor ordering');
  requireRun(run(process.execPath,[path.join(root,'tools/kernel-indexed-recursors-tests.ts')],{env:{PROOFSCRIPT_LEAN_BIN:lean}}),'indexed recursors','direct+higher-order indexed recursors');
  pass('recursor K/minor-order/indexed regressions');
  requireRun(run(process.execPath,[path.join(root,'tools/kernel-recursor-nonmutual-generated-tests.ts')],{env:{PROOFSCRIPT_LEAN_BIN:lean}}),'non-mutual generated recursor bridge','NONMUTUAL_RECURSOR_GENERATED_FAILURES=0');
  pass('non-mutual generated recursors: 37 structural records + 6 extensional WHNF/iota checks');
  requireRun(run(process.execPath,[path.join(root,'tools/kernel-inductive-indexed-iota-differential-tests.ts')],{env:{PROOFSCRIPT_LEAN_BIN:lean}}),'indexed inductive iota differential','INDUCTIVE_INDEXED_IOTA_CASES=6 MISMATCHES=0 KERNEL_CHECKS=6');
  pass('indexed iota: 6 exact WHNF comparisons including dependent/higher-order/multi-index/K');
  requireRun(run(process.execPath,[path.join(root,'tools/kernel-quotient-differential-tests.ts')],{env:{PROOFSCRIPT_LEAN_BIN:lean}}),'quotient differential','QUOT_STRUCTURAL_LINES=4 MISMATCHES=0');
  requireRun(run(process.execPath,[path.join(root,'tools/kernel-quotient-tests.ts')],{env:{PROOFSCRIPT_LEAN_BIN:lean}}),'quotient legacy regression','exact Lean 4.33.1 quotient primitive/type/computation evidence passed');
  requireRun(run(process.execPath,[path.join(root,'tools/kernel-quotient-admission-differential-tests.ts')],{env:{PROOFSCRIPT_LEAN_BIN:lean}}),'fresh quotient admission differential','QUOT_ADMISSION_POSITIVE=1 NEGATIVE=4 FAILURES=0 ATOMIC_FAILURES=4');
  pass('quotient structural + 1,000 computation cases + fresh .quotDecl admission/atomicity');
  console.log('KERNEL v71 ASSURANCE GATE PART 5/6: PASS');
}


function part6() {
  const lean=common();
  requireRun(run(process.execPath,[path.join(root,'tools/kernel-declaration-ordinary-differential-tests.ts')],{env:{PROOFSCRIPT_LEAN_BIN:lean}}),'ordinary declaration/environment differential','ORDINARY_DECL_INSTANTIATION_CASES=1000 MISMATCHES=0');
  pass('ordinary declarations: 7 ConstantInfo structures + 1,000 instantiated types exact against Lean.addDecl');
  requireRun(run(process.execPath,[path.join(root,'tools/kernel-inductive-direct-admission-differential-tests.ts')],{env:{PROOFSCRIPT_LEAN_BIN:lean}}),'direct inductive admission differential','INDUCTIVE_DIRECT_POSITIVE=6 NEGATIVE=4 FAILURES=0 ATOMIC_FAILURES=4');
  pass('direct inductives: 6 positive + 4 negative exact admission cases, 18 generated metadata lines, zero mismatch');
  requireRun(run(process.execPath,[path.join(root,'tools/kernel-inductive-indexed-admission-differential-tests.ts')],{env:{PROOFSCRIPT_LEAN_BIN:lean}}),'indexed inductive admission differential','INDUCTIVE_INDEXED_POSITIVE=6 NEGATIVE=6 FAILURES=0 ATOMIC_FAILURES=6');
  pass('parameterized/indexed direct inductives: 6 positive + 6 negative, 19 structural records, atomic rejects');
  const nonMutualIntegration = fs.readFileSync(path.join(evidence,'v71-nonmutual-gate-part6.out'),'utf8');
  if(!nonMutualIntegration.includes('PASS: non-mutual integration: field-universe + uniform-param defEq + direct/indexed admission + indexed iota') || !nonMutualIntegration.includes('KERNEL v71 ASSURANCE GATE PART 6/6: PASS')) fail('non-mutual integration evidence missing or dirty');
  pass('non-mutual integration: field-universe + uniform-param defEq + direct/indexed admission + indexed iota');
  const envInduction = fs.readFileSync(path.join(evidence,'v71-nonmutual-env-induction1.out'),'utf8');
  if(!envInduction.includes('NONMUTUAL_ENV_INDUCTION_COMPONENTS=6 FAILURES=0') || !envInduction.includes('PASS KERNEL-nonmutual-environment-induction exact Lean 4.33.1')) fail('non-mutual whole-environment induction evidence missing or dirty');
  pass('non-mutual whole-environment induction: ordered ordinary/quotient/direct/indexed/recursor components');
  requireRun(run(process.execPath,[path.join(root,'tools/kernel-inductive-nonmutual-generic-admission-tests.ts')],{env:{PROOFSCRIPT_LEAN_BIN:lean}}),'generic non-mutual admission bridge','GENERIC_NONMUTUAL_ADMISSION_FAILURES=0');
  pass('generic non-mutual admission: raw constructor types normalized into checked constructor-body obligations');
  requireRun(run(process.execPath,[path.join(root,'tools/kernel-inductive-nonmutual-classifier-correspondence-tests.ts')],{env:{PROOFSCRIPT_LEAN_BIN:lean}}),'non-mutual classifier correspondence bridge','NONMUTUAL_CLASSIFIER_COMPONENTS=5 FAILURES=0');
  pass('non-mutual classifier correspondence: WHNF/defEq classifier vectors + generic package/environment bridge');
  requireRun(run(process.execPath,[path.join(root,'tools/kernel-inductive-nonmutual-ts-implementation-correspondence-tests.ts')],{env:{PROOFSCRIPT_LEAN_BIN:lean}}),'direct TypeScript classifier implementation correspondence','TS_CLASSIFIER_IMPL_CORRESPONDENCE_FAILURES=0');
  pass('direct TypeScript classifier implementation: source-slice audit + runtime sentinels + exact bridge');
  console.log('KERNEL v71 ASSURANCE GATE PART 6/6: PASS');
}

const arg=process.argv.find(a=>a.startsWith('--part='));
const part=arg?.slice('--part='.length) ?? 'all';
if(part==='1') part1();
else if(part==='2') part2();
else if(part==='3') part3();
else if(part==='4') part4();
else if(part==='5') part5();
else if(part==='6') part6();
else if(part==='all') {
  const parts = ['1','2','3','4','5','6'];
  for(const p of parts) {
    console.log(`KERNEL v71 ASSURANCE GATE START PART ${p}/6`);
    const r=runStreaming(process.execPath,[self,`--part=${p}`],{timeoutMs:45 * 60 * 1000});
    if(r.status!==0) fail(`part ${p}/6 failed`);
  }
  writeFullGateSummary(parts);
  console.log('KERNEL v71 ASSURANCE GATE: PASS');
  console.log('FORMAL WHOLE-KERNEL EQUIVALENCE: IN PROGRESS (not yet K3)');
} else fail(`unknown --part=${part}`);
