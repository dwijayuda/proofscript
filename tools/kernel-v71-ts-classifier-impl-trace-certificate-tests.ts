import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assurance = path.join(root, 'assurance/lean4331');
const evidence = path.join(assurance, 'evidence');
const formalRoot = path.join(assurance, 'formal');
const targetModule = 'ProofScriptKernelEquivalence.InductiveClassifierImplementationTrace';
const targetRel = 'assurance/lean4331/formal/ProofScriptKernelEquivalence/InductiveClassifierImplementationTrace.lean';
const expectedLeanVersion = '4.33.1';
const expectedLeanCommit = '819816b2e0a3bf405af45ae5c7af2491d8f5bee6';
const lean = process.env.PROOFSCRIPT_LEAN_BIN;

if (!lean) {
  console.error('PROOFSCRIPT_LEAN_BIN is required for v71 TypeScript classifier implementation trace certificate tests');
  process.exit(1);
}

fs.mkdirSync(evidence, { recursive: true });

function sha256File(p) {
  return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
}
function sha256Text(s) {
  return crypto.createHash('sha256').update(s).digest('hex');
}
function rel(p) {
  return path.relative(root, p).replaceAll(path.sep, '/');
}
function run(cmd, args, opts = {}) {
  return spawnSync(cmd, args, {
    cwd: opts.cwd ?? root,
    encoding: 'utf8',
    timeout: opts.timeoutMs ?? 240_000,
    maxBuffer: opts.maxBuffer ?? 128 * 1024 * 1024,
    env: { ...process.env, ...(opts.env ?? {}) },
  });
}
function text(r) {
  return `${r.stdout ?? ''}\n${r.stderr ?? ''}`;
}
function assertCleanRun(r, label) {
  assert.equal(r.status, 0, `${label} failed\n${text(r)}`);
  return text(r);
}
function expect(haystack, needle, label) {
  assert.match(haystack, needle, `${label}: missing ${needle}`);
}

const versionOut = assertCleanRun(run(lean, ['--version']), 'Lean version');
expect(versionOut, /version 4\.33\.1/, 'Lean version');
expect(versionOut, new RegExp(expectedLeanCommit), 'Lean version');

const versions = JSON.parse(fs.readFileSync(path.join(root, 'versions.json'), 'utf8'));
assert.equal(versions.kernelArtifactFormat, 71);
assert.equal(versions.leanSemanticBaseline, expectedLeanVersion);
assert.equal(versions.leanReleaseCommit, expectedLeanCommit);

// Compile the full formal dependency chain in an isolated temporary Lake project.
// This avoids relying on stale .olean files and turns the implementation trace
// module into fresh Lean 4.33.1 evidence.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ps-v71-impl-trace-formal-'));
const tmpFormal = path.join(tmp, 'ProofScriptKernelEquivalence');
fs.cpSync(path.join(formalRoot, 'ProofScriptKernelEquivalence'), tmpFormal, { recursive: true });
fs.writeFileSync(path.join(tmp, 'lakefile.lean'), `import Lake\nopen Lake DSL\n\npackage proofScriptKernelEquivalence where\n\nlean_lib ProofScriptKernelEquivalence where\n  srcDir := "."\n`);
const leanBinDir = path.dirname(lean);
const lake = path.join(leanBinDir, 'lake');
const lakeCmd = fs.existsSync(lake) ? lake : 'lake';
const formalRun = run(lakeCmd, ['build', targetModule], {
  cwd: tmp,
  timeoutMs: 10 * 60 * 1000,
  maxBuffer: 256 * 1024 * 1024,
  env: { PATH: `${leanBinDir}:${process.env.PATH ?? ''}` },
});
const formalText = [
  `TARGET=${targetModule}`,
  `LEAN=${versionOut.trim()}`,
  `SOURCE=${targetRel}`,
  `SOURCE_SHA256=${sha256File(path.join(root, targetRel))}`,
  '',
  text(formalRun),
].join('\n');
const formalLog = path.join(evidence, 'v71-ts-classifier-implementation-trace-formal1.out');
fs.writeFileSync(formalLog, formalText);
assert.equal(formalRun.status, 0, `formal implementation trace did not compile; see ${rel(formalLog)}\n${formalText}`);
expect(formalText, /Build completed successfully \(31 jobs\)/, 'formal implementation trace');
for (const name of [
  'constructorTrace_to_witness',
  'constructorTrace_to_genericAdmission',
  'constructorTrace_sound',
  'familyTrace_to_genericAdmission',
  'familyTrace_sound',
  'implementationPackage_rawAdmission_sound',
  'implementationPackage_install_preserves',
  'implementationPackages_wholeEnvironment_sound',
]) expect(formalText, new RegExp(`InductiveClassifierImplementationTrace\\.${name}' depends on axioms`), `formal theorem ${name}`);
assert.doesNotMatch(formalText, /sorryAx/, 'formal implementation trace unexpectedly depends on sorryAx');
assert.doesNotMatch(formalText, /SORRY_FOUND|declaration uses 'sorry'/, 'formal implementation trace has sorry marker');

const implRun = run(process.execPath, ['tools/kernel-inductive-nonmutual-ts-implementation-correspondence-tests.ts'], {
  timeoutMs: 6 * 60 * 1000,
  env: { PROOFSCRIPT_LEAN_BIN: lean },
});
const implText = text(implRun);
const implLog = path.join(evidence, 'v71-ts-classifier-implementation-correspondence2.out');
fs.writeFileSync(implLog, implText);
assert.equal(implRun.status, 0, `TypeScript implementation correspondence failed; see ${rel(implLog)}\n${implText}`);
expect(implText, /TS_CLASSIFIER_SOURCE_FUNCTIONS=6/, 'implementation source audit');
expect(implText, /TS_CLASSIFIER_SOURCE_OBLIGATIONS=46 MISSING=0/, 'implementation source audit');
expect(implText, /TS_CLASSIFIER_RUNTIME_ACCEPTED=5 REJECTED=4 ATOMIC=4/, 'implementation runtime vectors');
expect(implText, /TS_CLASSIFIER_OPTION_SENTINELS=4 PASS/, 'implementation option sentinels');
expect(implText, /TS_CLASSIFIER_EXISTING_EXACT_BRIDGE=PASS/, 'implementation exact bridge');
expect(implText, /TS_CLASSIFIER_IMPL_CORRESPONDENCE_FAILURES=0/, 'implementation correspondence');

const previousCert = JSON.parse(fs.readFileSync(path.join(assurance, 'CHECKPOINT_V71_NONMUTUAL_DECL_ENV_CERT1.json'), 'utf8'));
assert.equal(previousCert.status, 'PASS');
assert.equal(previousCert.formal.reportedSorryAx, 0);
assert.equal(previousCert.executable.fullLeanGateParts, 6);

const sourceHash = sha256File(path.join(root, targetRel));
const checkpoint = {
  schema: 'proofscript.kernel-assurance.checkpoint/v1',
  checkpoint: 'V71_TS_CLASSIFIER_IMPL_TRACE_CERT1',
  coreFormat: 71,
  profile: versions.implementationProfile,
  semanticChange: false,
  lean: { version: expectedLeanVersion, commit: expectedLeanCommit, executable: lean, versionOutput: versionOut.trim() },
  formal: {
    newTarget: targetModule,
    compiledJobs: 31,
    inheritedEffectiveStackFromNonMutualDeclEnvCert: 31,
    effectiveModulesOrContractsAfterTrace: 32,
    targetStatements: 8,
    reportedSorryAx: 0,
    log: rel(formalLog),
    source: targetRel,
    sourceSha256: sourceHash,
    theoremBoundary: 'implementation trace exposes PSCtorClassifierWitness/PSFamilyClassifierWitness and inherits generic admission plus whole-environment soundness',
  },
  executable: {
    sourceFunctions: 6,
    sourceObligations: 46,
    sourceMissing: 0,
    runtimeAcceptedFamilies: 5,
    runtimeRejectedFamilies: 4,
    atomicRejections: 4,
    optionSentinels: 4,
    exactBridge: 'PASS',
    failures: 0,
    log: rel(implLog),
  },
  inherited: {
    nonmutualDeclEnvCertificate: 'PASS',
    fullLeanGateParts: previousCert.executable.fullLeanGateParts,
    localMergedComponents: previousCert.executable.localMergedComponents,
  },
  scope: {
    claim: 'stronger implementation trace certificate for the non-mutual TypeScript classifier path',
    notClaimed: {
      javascriptRuntimeSemanticsFormalized: true,
      completeTypeScriptLanguageSemantics: true,
      mutualOrNestedInductiveAdmission: true,
      fullK3WholeKernelEquivalence: true,
    },
  },
  status: 'PASS',
};
const checkpointPath = path.join(assurance, 'CHECKPOINT_V71_TS_CLASSIFIER_IMPL_TRACE_CERT1.json');
fs.writeFileSync(checkpointPath, JSON.stringify(checkpoint, null, 2) + '\n');

const mdPath = path.join(assurance, 'KERNEL_V71_ASSURANCE_CHECKPOINT_TS_CLASSIFIER_IMPL_TRACE_CERT1.md');
fs.writeFileSync(mdPath, `# ProofScript Kernel v71 TypeScript Classifier Implementation Trace Certificate\n\n` +
  `Status: **PASS**\n\n` +
  `Lean: \`${versionOut.trim()}\`\n\n` +
  `This checkpoint fixes and validates \`${targetRel}\`, making the implementation-trace formal target compile under pinned Lean 4.33.1 without \`sorryAx\`.\n\n` +
  `The certificate strengthens the previous TypeScript classifier implementation contract by connecting the concrete implementation-trace boundary to the already-proved classifier witness, generic admission, and non-mutual whole-environment preservation theorems.\n\n` +
  `## Evidence\n\n` +
  `- Formal trace target: \`${rel(formalLog)}\`\n` +
  `- TypeScript source/runtime implementation correspondence: \`${rel(implLog)}\`\n` +
  `- Checkpoint JSON: \`${rel(checkpointPath)}\`\n\n` +
  `## Claim boundary\n\n` +
  `This is not a formal semantics for all JavaScript/TypeScript execution and not a full K3 whole-kernel equivalence theorem. It certifies the current non-mutual classifier implementation-trace interface.\n`);

const shaRecord = {
  schema: 'proofscript.artifact.sha256/v1',
  artifact: 'V71_TS_CLASSIFIER_IMPL_TRACE_CERT1',
  generatedAtUtc: new Date().toISOString(),
  files: {
    [targetRel]: sourceHash,
    [rel(formalLog)]: sha256File(formalLog),
    [rel(implLog)]: sha256File(implLog),
    [rel(checkpointPath)]: sha256File(checkpointPath),
    [rel(mdPath)]: sha256File(mdPath),
  },
  aggregate: sha256Text(JSON.stringify(checkpoint) + formalText + implText),
};
fs.writeFileSync(path.join(root, 'V71_TS_CLASSIFIER_IMPL_TRACE_CERT1_SHA256.json'), JSON.stringify(shaRecord, null, 2) + '\n');

console.log('TS_CLASSIFIER_IMPL_TRACE_FORMAL_TARGET=PASS JOBS=31 TARGET_STATEMENTS=8 SORRYAX=0');
console.log('TS_CLASSIFIER_IMPL_TRACE_EXECUTABLE_SOURCE=6_FUNCTIONS_46_OBLIGATIONS_0_MISSING');
console.log('TS_CLASSIFIER_IMPL_TRACE_RUNTIME=5_ACCEPTED_4_REJECTED_4_ATOMIC_4_OPTIONS');
console.log('TS_CLASSIFIER_IMPL_TRACE_EXACT_BRIDGE=PASS');
console.log('TS_CLASSIFIER_IMPL_TRACE_EFFECTIVE_STACK=32');
console.log('PASS KERNEL-v71-ts-classifier-impl-trace-certificate');
