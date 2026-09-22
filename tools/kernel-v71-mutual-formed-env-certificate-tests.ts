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
const targetModule = 'ProofScriptKernelEquivalence.InductiveMutualFormedEnvironment';
const targetRel = 'assurance/lean4331/formal/ProofScriptKernelEquivalence/InductiveMutualFormedEnvironment.lean';
const expectedLeanVersion = '4.33.1';
const expectedLeanCommit = '819816b2e0a3bf405af45ae5c7af2491d8f5bee6';
const lean = process.env.PROOFSCRIPT_LEAN_BIN;

if (!lean) {
  console.error('PROOFSCRIPT_LEAN_BIN is required for v71 mutual formed-environment certificate tests');
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
    timeout: opts.timeoutMs ?? 300_000,
    maxBuffer: opts.maxBuffer ?? 256 * 1024 * 1024,
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

assert.ok(fs.existsSync(path.join(root, targetRel)), `missing ${targetRel}`);

const versionOut = assertCleanRun(run(lean, ['--version']), 'Lean version');
expect(versionOut, /version 4\.33\.1/, 'Lean version');
expect(versionOut, new RegExp(expectedLeanCommit), 'Lean commit');

const versions = JSON.parse(fs.readFileSync(path.join(root, 'versions.json'), 'utf8'));
assert.equal(versions.kernelArtifactFormat, 71);
assert.equal(versions.leanSemanticBaseline, expectedLeanVersion);
assert.equal(versions.leanReleaseCommit, expectedLeanCommit);

// Compile the formal formed-mutual environment target in a fresh Lake project.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ps-v71-mutual-formed-env-formal-'));
fs.cpSync(path.join(formalRoot, 'ProofScriptKernelEquivalence'), path.join(tmp, 'ProofScriptKernelEquivalence'), { recursive: true });
fs.writeFileSync(path.join(tmp, 'lakefile.lean'), `import Lake\nopen Lake DSL\n\npackage proofScriptKernelEquivalence where\n\nlean_lib ProofScriptKernelEquivalence where\n  srcDir := "."\n`);
const leanBinDir = path.dirname(lean);
const lake = path.join(leanBinDir, 'lake');
const lakeCmd = fs.existsSync(lake) ? lake : 'lake';
const formalRun = run(lakeCmd, ['build', targetModule], {
  cwd: tmp,
  timeoutMs: 10 * 60 * 1000,
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
const formalLog = path.join(evidence, 'v71-mutual-formed-env-formal1.out');
fs.writeFileSync(formalLog, formalText);
assert.equal(formalRun.status, 0, `formal mutual formed-env target did not compile; see ${rel(formalLog)}\n${formalText}`);
expect(formalText, /Build completed successfully \((\d+) jobs\)/, 'formal mutual formed-env build');
for (const name of [
  'PSMutualPackage.has_at_least_two_members',
  'PSMutualPackage.install_preserves',
  'installMutualPackages_preserves',
  'directEnvSound_afterMutualPackages',
  'deltaEnvExact_afterMutualPackages',
  'typeLookup_afterMutualPackages_exact',
  'unfoldLookup_afterMutualPackages_exact',
  'formedMutualWholeEnvironment_sound',
]) {
  const needle = `ProofScriptKernelEquivalence.InductiveMutualFormedEnvironment.${name}'`;
  assert.ok(formalText.includes(needle), `formal theorem ${name}: missing ${needle}`);
}
assert.match(formalText, /does not depend on any axioms|depends on axioms/, 'formal theorem axiom reports missing');
assert.doesNotMatch(formalText, /sorryAx/, 'formal mutual formed-env target unexpectedly depends on sorryAx');
assert.doesNotMatch(formalText, /SORRY_FOUND|declaration uses 'sorry'/, 'formal mutual formed-env target has sorry marker');

// Static audit for the actual direct mutual admission implementation slice.
const kernelPath = path.join(root, 'packages/kernel/src/kernel.ts');
const kernelSource = fs.readFileSync(kernelPath, 'utf8');
const start = kernelSource.indexOf('function checkDirectMutualInductive(');
const end = kernelSource.indexOf('/** Return the fully-applied outer-family argument tuple. */', start);
assert.ok(start >= 0 && end > start, 'could not locate checkDirectMutualInductive implementation slice');
const mutualSlice = kernelSource.slice(start, end);
const obligations = [
  ['feature gate', /allowMutualInductives/],
  ['at least two members', /mutual block requires at least two inductive members/],
  ['member uniqueness', /duplicate mutual inductive member/],
  ['index feature gate', /mutual indices are outside this kernel profile/],
  ['shared parameter count', /all mutually inductive types must have the same number of parameters/],
  ['parameter feature gate', /allowMutualParameters/],
  ['duplicate family rejection', /duplicate declaration: \$\{m\.name\}/],
  ['duplicate recursor rejection', /duplicate declaration: \$\{m\.name\}\.rec/],
  ['duplicate constructor rejection', /duplicate declaration: \$\{c\.name\}/],
  ['fresh staged clone', /const pre=env\.clone\(\)/],
  ['member type sort check', /mutual inductive type is not a type/],
  ['parameter telescope check', /mutual parameter telescope shorter than numParams/],
  ['parameter family-dependency rejection', /mutual parameter types may not depend on the families being defined/],
  ['shared parameter defeq', /mutual parameter \$\{pi\} is not definitionally equal to the shared parameter telescope/],
  ['index telescope check', /mutual index telescope shorter than numIndices/],
  ['index family-dependency rejection', /mutual index types may not depend on the families being defined/],
  ['sort terminal check', /mutual parameter\/index telescope must end in a Sort/],
  ['mutual prop gate', /mutual Prop families are outside this kernel profile/],
  ['same universe check', /mutually inductive types must live in the same universe/],
  ['staged environment', /const staged=env\.clone\(\)/],
  ['pre-expose member decls', /staged\.add\(\{declaration:m/],
  ['constructor type sort', /constructor type is not a type/],
  ['constructor uniform params', /missing uniform mutual parameter/],
  ['constructor parameter defeq', /parameter \$\{pi\} is not uniform with the mutual block/],
  ['field universe check', /checkConstructorFieldUniverse\(staged,ctx,field,resultLevel/],
  ['recursive occurrence detection', /containsAnyConst\(whField,memberNames\)/],
  ['positive mutual classifier', /positiveMutualRecursiveFieldType\(/],
  ['higher-order gate', /allowHigherOrderMutualRecursion/],
  ['recursive target recording', /recursiveTargets\.push\(positive\.targetName\)/],
  ['constructor result target check', /constructor result must target \$\{m\.name\}/],
  ['universe instantiation check', /constructor result uses incompatible universe instantiation/],
  ['uniform result parameter check', /constructor result parameter \$\{pi\} is not the corresponding uniform mutual parameter/],
  ['result index no family occurrence', /constructor result indices may not contain a mutual family occurrence/],
  ['constructor staged add', /kind:"constructor"/],
  ['mutual recursor generation', /generateDirectMutualRecursors\(/],
  ['generated recursor sort check', /generated mutual recursor type is not a type/],
  ['generated recursor staged add', /kind:"recursor"/],
  ['atomic final clone', /const final=env\.clone\(\)/],
  ['environment replace only at end', /env\.replaceWith\(final\)/],
];
const missingObligations = obligations.filter(([, re]) => !re.test(mutualSlice));
assert.deepEqual(missingObligations, [], `missing mutual source obligations: ${missingObligations.map(([x]) => x).join(', ')}`);
const sourceAudit = {
  path: 'packages/kernel/src/kernel.ts#checkDirectMutualInductive',
  sha256: sha256Text(mutualSlice),
  obligations: obligations.length,
  missing: missingObligations.length,
};

const mutualTests = [
  ['direct', 'tools/kernel-mutual-inductives-tests.ts', /bounded direct mutual inductives.*exact Lean differential/],
  ['parameters', 'tools/kernel-mutual-parameters-tests.ts', /shared\/dependent mutual parameters.*exact Lean differential/],
  ['indices', 'tools/kernel-mutual-indices-tests.ts', /mutual indices.*exact Lean differential/],
  ['higher-order', 'tools/kernel-mutual-higher-order-tests.ts', /higher-order positive mutual recursion.*exact Lean differential/],
  ['prop', 'tools/kernel-mutual-prop-tests.ts', /mutual Prop admission.*exact Lean differential/],
];
const testLogs = [];
for (const [label, script, regex] of mutualTests) {
  const r = run(process.execPath, [script], {
    timeoutMs: 10 * 60 * 1000,
    env: { PROOFSCRIPT_LEAN_BIN: lean, PATH: `${leanBinDir}:${process.env.PATH ?? ''}` },
  });
  const out = text(r);
  const log = path.join(evidence, `v71-mutual-${label}-exact-lean1.out`);
  fs.writeFileSync(log, out);
  assert.equal(r.status, 0, `${script} failed; see ${rel(log)}\n${out}`);
  expect(out, regex, `${label} mutual exact Lean differential`);
  testLogs.push({ label, script, log: rel(log), sha256: sha256File(log) });
}

const previousTrace = JSON.parse(fs.readFileSync(path.join(assurance, 'CHECKPOINT_V71_TS_CLASSIFIER_IMPL_TRACE_CERT1.json'), 'utf8'));
assert.equal(previousTrace.status, 'PASS');
assert.equal(previousTrace.formal.reportedSorryAx, 0);
assert.equal(previousTrace.executable.failures, 0);

const formalStackFiles = fs.readdirSync(path.join(formalRoot, 'ProofScriptKernelEquivalence'))
  .filter(f => f.endsWith('.lean'))
  .sort();
const checkpoint = {
  schema: 'proofscript.kernel-assurance.checkpoint/v1',
  checkpoint: 'V71_MUTUAL_FORMED_ENV_CERT1',
  coreFormat: 71,
  profile: versions.implementationProfile,
  semanticChange: false,
  lean: { version: expectedLeanVersion, commit: expectedLeanCommit, executable: lean, versionOutput: versionOut.trim() },
  formal: {
    newTarget: targetModule,
    targetSource: targetRel,
    targetSourceSha256: sha256File(path.join(root, targetRel)),
    targetTheorems: 8,
    reportedSorryAx: 0,
    log: rel(formalLog),
    totalFormalLeanFiles: formalStackFiles.length,
    theoremBoundary: 'formed mutual package installation preserves Core→Lean environment translation, direct-typing lookup, and ordinary-delta lookup',
  },
  executable: {
    sourceAudit,
    exactLeanMutualSuites: testLogs,
    suiteCount: mutualTests.length,
    failures: 0,
  },
  inherited: {
    tsClassifierImplementationTrace: 'PASS',
    tsClassifierEffectiveStack: previousTrace.formal.effectiveModulesOrContractsAfterTrace,
    fullLeanGateParts: previousTrace.inherited.fullLeanGateParts,
  },
  scope: {
    claim: 'formed mutual O-DECL environment preservation plus exact Lean-backed executable mutual coverage',
    notClaimed: {
      fullMutualPositivityTheorem: true,
      fullMutualAdmissionBidirectionalCompleteness: true,
      formalMutualRecursorRhsCorrespondence: true,
      nestedInductivePreprocessingCertificate: true,
      fullK3WholeKernelEquivalence: true,
    },
  },
  status: 'PASS',
};
const checkpointPath = path.join(assurance, 'CHECKPOINT_V71_MUTUAL_FORMED_ENV_CERT1.json');
fs.writeFileSync(checkpointPath, JSON.stringify(checkpoint, null, 2) + '\n');

const mdPath = path.join(assurance, 'KERNEL_V71_ASSURANCE_CHECKPOINT_MUTUAL_FORMED_ENV_CERT1.md');
fs.writeFileSync(mdPath, `# ProofScript Kernel v71 Mutual Formed-Environment Certificate\n\n` +
  `Status: **PASS**\n\n` +
  `Lean: \`${versionOut.trim()}\`\n\n` +
  `This checkpoint adds \`${targetRel}\`, a formed-environment theorem for mutual inductive packages.  It proves that once the executable checker has atomically produced the family, constructor, recursor and auxiliary entries for a mutual block, installing those entries preserves the Core→Lean environment translation, direct constant-typing lookup and ordinary delta lookup.\n\n` +
  `## Executable evidence\n\n` +
  `The checkpoint reruns five exact Lean-backed mutual suites: direct mutual families, shared/dependent parameters, indices, higher-order mutual recursion, and mutual Prop behavior.  The source audit covers \`${sourceAudit.path}\` with ${sourceAudit.obligations} obligations and zero missing obligations.\n\n` +
  `## Evidence files\n\n` +
  `- Formal Lean target: \`${rel(formalLog)}\`\n` +
  testLogs.map(t => `- ${t.label} mutual suite: \`${t.log}\``).join('\n') + `\n` +
  `- Checkpoint JSON: \`${rel(checkpointPath)}\`\n\n` +
  `## Claim boundary\n\n` +
  `This is not a full mutual positivity/admission theorem and not a formal mutual recursor RHS correspondence theorem.  It closes the formed mutual O-DECL environment-preservation layer and binds it to exact Lean-backed executable evidence for the current v71 mutual slices.\n`);

const shaRecord = {
  schema: 'proofscript.artifact.sha256/v1',
  artifact: 'V71_MUTUAL_FORMED_ENV_CERT1',
  generatedAtUtc: new Date().toISOString(),
  files: {
    [targetRel]: sha256File(path.join(root, targetRel)),
    [rel(formalLog)]: sha256File(formalLog),
    [rel(checkpointPath)]: sha256File(checkpointPath),
    [rel(mdPath)]: sha256File(mdPath),
    ...Object.fromEntries(testLogs.map(t => [t.log, t.sha256])),
  },
  aggregate: sha256Text(JSON.stringify(checkpoint) + formalText + JSON.stringify(testLogs)),
};
fs.writeFileSync(path.join(root, 'V71_MUTUAL_FORMED_ENV_CERT1_SHA256.json'), JSON.stringify(shaRecord, null, 2) + '\n');

console.log(`MUTUAL_FORMED_ENV_FORMAL_TARGET=PASS THEOREMS=8 SORRYAX=0 FORMAL_FILES=${formalStackFiles.length}`);
console.log(`MUTUAL_SOURCE_AUDIT=PASS OBLIGATIONS=${sourceAudit.obligations} MISSING=0`);
console.log(`MUTUAL_EXACT_LEAN_SUITES=${mutualTests.length} FAILURES=0`);
console.log('MUTUAL_FORMED_ENV_BOUNDARY=FORMED_O_DECL_NOT_FULL_MUTUAL_ADMISSION');
console.log('PASS KERNEL-v71-mutual-formed-env-certificate');
