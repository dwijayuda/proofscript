import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assurance = path.join(root, 'assurance/lean4331');
const evidence = path.join(assurance, 'evidence');
const expectedLeanVersion = '4.33.1';
const expectedLeanCommit = '819816b2e0a3bf405af45ae5c7af2491d8f5bee6';

function fail(msg) {
  console.error(`FAIL KERNEL-v71-assurance-finalize: ${msg}`);
  process.exit(1);
}
function sha256(p) { return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'); }
function run(cmd, args) { return spawnSync(cmd, args, { cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, env: process.env }); }
function which(name) {
  const r = run('bash', ['-lc', `command -v ${name}`]);
  return r.status === 0 ? r.stdout.trim() : null;
}

const versions = JSON.parse(fs.readFileSync(path.join(root, 'versions.json'), 'utf8'));
if (versions.kernelArtifactFormat !== 71) fail('versions.json is not Core format 71');
if (versions.leanSemanticBaseline !== expectedLeanVersion || versions.leanReleaseCommit !== expectedLeanCommit) fail('wrong Lean baseline identity');

const lean = process.env.PROOFSCRIPT_LEAN_BIN || which('lean');
if (!lean) fail('Lean executable unavailable; set PROOFSCRIPT_LEAN_BIN');
const leanVersion = run(lean, ['--version']);
if (leanVersion.status !== 0 || !leanVersion.stdout.includes(`version ${expectedLeanVersion}`) || !leanVersion.stdout.includes(expectedLeanCommit)) {
  fail(`wrong Lean executable: ${leanVersion.stdout}\n${leanVersion.stderr}`);
}

const partSummaries = [];
for (const part of [1,2,3,4,5,6]) {
  const logPath = path.join(evidence, `v71-gate-part${part}.out`);
  if (!fs.existsSync(logPath)) fail(`missing part log: ${path.relative(root, logPath)}`);
  const log = fs.readFileSync(logPath, 'utf8');
  const marker = `KERNEL v71 ASSURANCE GATE PART ${part}/6: PASS`;
  if (!log.includes(`KERNEL v71 ASSURANCE GATE PART ${part}/6: PASS`)) fail(`part ${part}/6 missing exact pass marker`);
  if (!log.includes(`exact Lean executable ${expectedLeanVersion}/${expectedLeanCommit.slice(0, 12)}`)) fail(`part ${part}/6 log missing pinned Lean identity`);
  if (!log.includes('EXIT_CODE=0')) fail(`part ${part}/6 log missing clean exit footer`);
  partSummaries.push({ part, marker, log: path.relative(root, logPath), sha256: sha256(logPath), bytes: fs.statSync(logPath).size });
}

const out = path.join(assurance, 'FINAL_VALIDATION_V71_FULL_LEAN_GATE.json');
const summary = {
  schema: 'proofscript.kernel.v71.full-lean-gate-final-validation/v1',
  generatedAtUtc: new Date().toISOString(),
  status: 'PASS',
  coreFormat: 71,
  implementationProfile: versions.implementationProfile,
  leanSemanticBaseline: expectedLeanVersion,
  leanReleaseCommit: expectedLeanCommit,
  leanExecutable: lean,
  leanVersionOutput: leanVersion.stdout.trim(),
  partCount: partSummaries.length,
  parts: partSummaries,
  assuranceClaim: 'All six v71 Lean-backed assurance gate parts passed against pinned Lean 4.33.1 using persisted per-part logs.',
  formalWholeKernelEquivalence: 'IN_PROGRESS_NOT_YET_K3',
  caveat: 'This is an executable assurance and conformance checkpoint. It is not yet a completed machine-checked whole-kernel equivalence theorem.'
};
fs.writeFileSync(out, JSON.stringify(summary, null, 2) + '\n');

const md = path.join(assurance, 'KERNEL_V71_ASSURANCE_CHECKPOINT_FULL_LEAN_GATE1.md');
fs.writeFileSync(md, `# ProofScript Kernel v71 Full Lean Gate Checkpoint\n\n` +
  `Status: **PASS**\n\n` +
  `Lean: \`${leanVersion.stdout.trim()}\`\n\n` +
  `This checkpoint finalizes six persisted per-part logs for the v71 Lean-backed assurance gate. ` +
  `It strengthens the previous local-only merged checkpoint by recording a reproducible end-to-end gate result without requiring one long uninterrupted process.\n\n` +
  `Formal whole-kernel equivalence remains **in progress / not yet K3**.\n\n` +
  partSummaries.map(p => `- Part ${p.part}/6: \`${p.log}\` (${p.bytes} bytes, sha256 ${p.sha256})`).join('\n') +
  `\n\nSummary JSON: \`${path.relative(root, out)}\`\n`);

console.log(`PASS KERNEL-v71-assurance-finalize: wrote ${path.relative(root, out)}`);
console.log(`PASS KERNEL-v71-assurance-finalize: wrote ${path.relative(root, md)}`);
