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
const targetModule = 'ProofScriptKernelEquivalence.InductiveNestedFormedEnvironment';
const targetRel = 'assurance/lean4331/formal/ProofScriptKernelEquivalence/InductiveNestedFormedEnvironment.lean';
const expectedLeanVersion = '4.33.1';
const expectedLeanCommit = '819816b2e0a3bf405af45ae5c7af2491d8f5bee6';
const lean = process.env.PROOFSCRIPT_LEAN_BIN;

if (!lean) {
  console.error('PROOFSCRIPT_LEAN_BIN is required for v71 nested formed-environment certificate tests');
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

// Compile the formal formed-nested environment target in a fresh Lake project.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ps-v71-nested-formed-env-formal-'));
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
  text(formalRun),
].join('\n');
const formalLog = path.join(evidence, 'v71-nested-formed-env-formal1.out');
fs.writeFileSync(formalLog, formalText);
console.log('NESTED_FORMAL_COMPILE_DONE');
assert.equal(formalRun.status, 0, `formal nested formed-env build failed; see ${rel(formalLog)}\n${formalText}`);
const formalNeedles = [
  'ProofScriptKernelEquivalence.InductiveNestedFormedEnvironment.PSNestedPackage.has_nonempty_helper_chain',
  'ProofScriptKernelEquivalence.InductiveNestedFormedEnvironment.PSNestedPackage.install_preserves',
  'ProofScriptKernelEquivalence.InductiveNestedFormedEnvironment.installNestedPackages_preserves',
  'ProofScriptKernelEquivalence.InductiveNestedFormedEnvironment.directEnvSound_afterNestedPackages',
  'ProofScriptKernelEquivalence.InductiveNestedFormedEnvironment.deltaEnvExact_afterNestedPackages',
  'ProofScriptKernelEquivalence.InductiveNestedFormedEnvironment.typeLookup_afterNestedPackages_exact',
  'ProofScriptKernelEquivalence.InductiveNestedFormedEnvironment.unfoldLookup_afterNestedPackages_exact',
  'ProofScriptKernelEquivalence.InductiveNestedFormedEnvironment.formedNestedWholeEnvironment_sound',
];
for (const name of formalNeedles) {
  const needle = `${name}'`;
  assert.ok(formalText.includes(needle), `formal theorem ${name}: missing ${needle}`);
}
assert.match(formalText, /does not depend on any axioms|depends on axioms/, 'formal theorem axiom reports missing');
assert.doesNotMatch(formalText, /sorryAx/, 'formal nested formed-env target unexpectedly depends on sorryAx');
assert.doesNotMatch(formalText, /SORRY_FOUND|declaration uses 'sorry'/, 'formal nested formed-env target has sorry marker');

// Static audit for the actual one-level nested preprocessing implementation slice.
const kernelPath = path.join(root, 'packages/kernel/src/kernel.ts');
const kernelSource = fs.readFileSync(kernelPath, 'utf8');
const start = kernelSource.indexOf('function tryCheckNestedInductive(');
const end = kernelSource.indexOf('function containsBVar(', start);
assert.ok(start >= 0 && end > start, 'could not locate tryCheckNestedInductive implementation slice');
const nestedSlice = kernelSource.slice(start, end);
const obligations = [
  ['feature gate', /allowNestedInductives/],
  ['parameter gate', /allowNestedParameters/],
  ['index gate', /allowNestedIndices/],
  ['deeper dispatcher v37', /tryCheckNestedInductiveV37/],
  ['deeper generalized dispatcher v38', /tryCheckNestedInductiveV38/],
  ['dependent container parameter dispatcher v45', /tryCheckNestedInductiveV45\(env,decl,true\)/],
  ['nested occurrence detection', /nestedSpecialization\(field,decl\.name,totalOuterArgs\)/],
  ['single container boundary', /nested slice admits exactly one nested container type former/],
  ['monomorphic outer boundary', /nested slice requires a monomorphic outer inductive/],
  ['duplicate outer rejection', /duplicate declaration: \$\{decl\.name\}/],
  ['recursor-name freshness', /nested recursor name already exists/],
  ['outer telescope check', /nested outer telescope shorter than parameters \+ indices/],
  ['outer Type boundary', /nested slice requires an outer family in Type/],
  ['checked container lookup', /nested container \$\{containerName\} is not an already-checked inductive/],
  ['container shape check', /must be monomorphic with exactly one parameter and no indices/],
  ['container returns Type', /must return Type/],
  ['container parameter Type', /container \$\{containerName\} parameter must be Type/],
  ['captured index mode', /mode=\{kind:"captured"/],
  ['closed index mode', /mode=\{kind:"closed"/],
  ['index expression projection', /projectNestedIndexToParamContext/],
  ['recursive field admissibility', /nested slice only admits direct \$\{decl\.name\} or \$\{containerName\}/],
  ['fresh helper name', /let auxName=`_nested\.\$\{decl\.name\}\.aux`/],
  ['outer constructors rewritten', /rewriteNestedSpecializationToAux\(ctor\.type/],
  ['container constructors restored', /ctorRestore\.set\(syntheticName,ctor\.name\)/],
  ['synthetic mutual block', /kind:"mutualInductive"/],
  ['trusted mutual checker reuse', /checkDirectMutualInductive\(transformed,synthetic\)/],
  ['transformed environment clone', /const transformed=env\.clone\(\)/],
  ['restore public outer declaration', /final\.add\(\{declaration:decl,assumptions,generated\}\)/],
  ['helper recursor aliasing', /const helperName=`\$\{decl\.name\}\.rec_1`/],
  ['atomic final environment', /const final=env\.clone\(\)/],
  ['replace only at end', /env\.replaceWith\(final\)/],
];
const missingObligations = obligations.filter(([, re]) => !re.test(nestedSlice));
assert.deepEqual(missingObligations, [], `missing nested source obligations: ${missingObligations.map(([x]) => x).join(', ')}`);
const sourceAudit = {
  path: 'packages/kernel/src/kernel.ts#tryCheckNestedInductive',
  sha256: sha256Text(nestedSlice),
  obligations: obligations.length,
  missing: missingObligations.length,
};

const nestedTests = [
  ['base', 'tools/kernel-nested-inductives-tests.ts', /nested preprocessing.*exact Lean observations passed.*exact Lean differential/],
  ['parameters', 'tools/kernel-nested-parameters-tests.ts', /parameterized\/dependent nested preprocessing.*exact Lean observations passed.*exact Lean differential/],
  ['indices', 'tools/kernel-nested-indices-tests.ts', /indexed nested preprocessing.*exact Lean observations passed.*exact Lean differential/],
  ['index-expressions', 'tools/kernel-nested-index-expressions-tests.ts', /nested index expressions.*exact Lean/],
  ['multiple-specializations', 'tools/kernel-nested-multiple-specializations-tests.ts', /nested multiple specializations.*exact Lean observations passed.*exact Lean differential/],
  ['polymorphic', 'tools/kernel-nested-polymorphic-tests.ts', /polymorphic nested preprocessing.*exact Lean observations passed.*exact Lean differential/],
  ['indexed-containers', 'tools/kernel-nested-indexed-containers-tests.ts', /indexed nested-container preprocessing.*exact Lean observations passed.*exact Lean differential/],
  ['deeper-generalization', 'tools/kernel-nested-deeper-generalization-tests.ts', /arbitrary closed linear-depth nested preprocessing.*exact Lean observations passed.*exact Lean differential/],
  ['deep-multiparam-generalization', 'tools/kernel-nested-deeper-multi-parameter-generalization-tests.ts', /generalized multi-parameter nested graphs.*exact Lean observations passed.*exact Lean/],
];
const testLogs = [];
for (const [label, script, regex] of nestedTests) {
  const r = run(process.execPath, [script], {
    timeoutMs: 10 * 60 * 1000,
    env: { PROOFSCRIPT_LEAN_BIN: lean, PATH: `${leanBinDir}:${process.env.PATH ?? ''}` },
  });
  const out = text(r);
  const log = path.join(evidence, `v71-nested-${label}-exact-lean1.out`);
  fs.writeFileSync(log, out);
  assert.equal(r.status, 0, `${script} failed; see ${rel(log)}\n${out}`);
  expect(out, regex, `${label} nested exact Lean differential`);
  testLogs.push({ label, script, log: rel(log), sha256: sha256File(log) });
  console.log(`NESTED_SUITE_DONE ${label}`);
}


const previousMutual = JSON.parse(fs.readFileSync(path.join(assurance, 'CHECKPOINT_V71_MUTUAL_FORMED_ENV_CERT1.json'), 'utf8'));
assert.equal(previousMutual.status, 'PASS');
assert.equal(previousMutual.formal.reportedSorryAx, 0);
assert.equal(previousMutual.executable.failures, 0);

const formalStackFiles = fs.readdirSync(path.join(formalRoot, 'ProofScriptKernelEquivalence'))
  .filter(f => f.endsWith('.lean'))
  .sort();
const checkpoint = {
  schema: 'proofscript.kernel-assurance.checkpoint/v1',
  checkpoint: 'V71_NESTED_FORMED_ENV_CERT1',
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
    theoremBoundary: 'formed nested preprocessing package installation preserves Core→Lean environment translation, direct-typing lookup, and ordinary-delta lookup',
  },
  executable: {
    sourceAudit,
    exactLeanNestedSuites: testLogs,
    suiteCount: nestedTests.length,
    failures: 0,
  },
  inherited: {
    mutualFormedEnvironment: 'PASS',
    mutualFormalFiles: previousMutual.formal.totalFormalLeanFiles,
    tsClassifierImplementationTrace: previousMutual.inherited.tsClassifierImplementationTrace,
    fullLeanGateParts: previousMutual.inherited.fullLeanGateParts,
  },
  scope: {
    claim: 'formed nested O-DECL environment preservation plus exact Lean-backed executable nested preprocessing coverage',
    notClaimed: {
      fullNestedPositivityTheorem: true,
      fullNestedPreprocessingCompleteness: true,
      fullNestedAdmissionBidirectionalCompleteness: true,
      formalNestedRecursorRhsCorrespondence: true,
      mutualNestedFinalGeneralizationCertificate: true,
      fullK3WholeKernelEquivalence: true,
    },
  },
  status: 'PASS',
};
const checkpointPath = path.join(assurance, 'CHECKPOINT_V71_NESTED_FORMED_ENV_CERT1.json');
fs.writeFileSync(checkpointPath, JSON.stringify(checkpoint, null, 2) + '\n');

const mdPath = path.join(assurance, 'KERNEL_V71_ASSURANCE_CHECKPOINT_NESTED_FORMED_ENV_CERT1.md');
fs.writeFileSync(mdPath, `# ProofScript Kernel v71 Nested Formed-Environment Certificate\n\n` +
  `Status: **PASS**\n\n` +
  `Lean: \`${versionOut.trim()}\`\n\n` +
  `This checkpoint adds \`${targetRel}\`, a formed-environment theorem for nested-inductive preprocessing packages.  It proves that once the executable checker has atomically produced the public outer family, helper families, restored constructors, recursors and auxiliary entries for a nested preprocessing package, installing those entries preserves the Core→Lean environment translation, direct constant-typing lookup and ordinary delta lookup.\n\n` +
  `## Executable evidence\n\n` +
  `The checkpoint reruns ${nestedTests.length} exact Lean-backed nested suites covering one-level nested preprocessing, parameters, indices, index expressions, multiple specializations, polymorphism, indexed containers, deeper linear nesting and generalized multi-parameter nested graphs.  The source audit covers \`${sourceAudit.path}\` with ${sourceAudit.obligations} obligations and zero missing obligations.\n\n` +
  `## Evidence files\n\n` +
  `- Formal Lean target: \`${rel(formalLog)}\`\n` +
  testLogs.map(t => `- ${t.label} nested suite: \`${t.log}\``).join('\n') + `\n` +
  `- Checkpoint JSON: \`${rel(checkpointPath)}\`\n\n` +
  `## Claim boundary\n\n` +
  `This is not a full nested positivity/preprocessing completeness theorem and not a formal nested recursor RHS correspondence theorem.  It closes the formed nested O-DECL environment-preservation layer and binds it to exact Lean-backed executable evidence for the current v71 nested preprocessing slices.\n`);

const shaRecord = {
  schema: 'proofscript.artifact.sha256/v1',
  artifact: 'V71_NESTED_FORMED_ENV_CERT1',
  generatedAtUtc: new Date().toISOString(),
  files: {
    [targetRel]: sha256File(path.join(root, targetRel)),
    [rel(formalLog)]: sha256File(formalLog),
    [rel(checkpointPath)]: sha256File(checkpointPath),
    [rel(mdPath)]: sha256File(mdPath),
    ...Object.fromEntries(testLogs.map(t => [t.log, t.sha256])),
  },
};
const shaPath = path.join(root, 'V71_NESTED_FORMED_ENV_CERT1_SHA256.json');
fs.writeFileSync(shaPath, JSON.stringify(shaRecord, null, 2) + '\n');

console.log(`NESTED_FORMED_ENV_FORMAL_TARGET=PASS THEOREMS=8 SORRYAX=0 FORMAL_FILES=${formalStackFiles.length}`);
console.log(`NESTED_SOURCE_AUDIT=PASS OBLIGATIONS=${sourceAudit.obligations} MISSING=0`);
console.log(`NESTED_EXACT_LEAN_SUITES=${nestedTests.length} FAILURES=0`);
console.log('NESTED_FORMED_ENV_BOUNDARY=FORMED_O_DECL_NOT_FULL_NESTED_ADMISSION');
console.log('PASS KERNEL-v71-nested-formed-env-certificate');
