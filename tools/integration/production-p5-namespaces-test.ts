import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { checkCoreDeclarations } from '@proofscript/kernel';
import { decodeArtifact } from '@proofscript/kernel-codec';
import { verifyFile } from '@proofscript/verifier';
import { stripStandardBootstrap } from '@proofscript/environment';
import { emitLeanArtifact } from '@proofscript/lean-export';
import { checkUnifiedProject, checkUnifiedSource, UNIFIED_INTEGRATION_PROFILE } from '@proofscript/unified-bridge';
import { assertCoreDeclarationsRejected, assertOnlyStandardBootstrapAssumptions, standardBootstrapAxiomSet } from "./bootstrap-assumptions.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const projectRoot = path.join(root, 'integration-fixtures/production-p5/namespaces');

function runTs(source, probes) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ps-p5-ts-'));
  try {
    fs.writeFileSync(path.join(tmp, 'program.ts'), `${source}\n${probes}\n`);
    fs.writeFileSync(path.join(tmp, 'package.json'), '{"type":"module"}\n');
    const tsc = spawnSync('tsc', ['program.ts', '--target', 'ES2022', '--module', 'NodeNext', '--moduleResolution', 'NodeNext', '--skipLibCheck', '--outDir', 'js'], { cwd: tmp, encoding: 'utf8' });
    assert.equal(tsc.status, 0, tsc.stderr || tsc.stdout);
    const node = spawnSync(process.execPath, [path.join(tmp, 'js/program.js')], { encoding: 'utf8' });
    assert.equal(node.status, 0, node.stderr || node.stdout);
    return node.stdout.trim().split(/\r?\n/).filter(Boolean);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}

async function checkLean(artifact, reductions, expected) {
  const leanBin = process.env.PROOFSCRIPT_LEAN_BIN;
  if (!leanBin) return;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ps-p5-lean-'));
  try {
    const v = spawnSync(leanBin, ['--version'], { encoding: 'utf8' });
    assert.equal(v.status, 0, v.stderr || v.stdout);
    assert.match(v.stdout, /version 4\.33\.1,/);
    assert.match(v.stdout, /819816b2e0a3bf405af45ae5c7af2491d8f5bee6/);
    const stripped = stripStandardBootstrap(artifact) ?? artifact;
    const leanPath = path.join(tmp, 'program.lean');
    fs.writeFileSync(leanPath, `${emitLeanArtifact(stripped)}\n${reductions.map((name) => `#reduce ${name}`).join('\n')}\n`);
    const lean = spawnSync(leanBin, [leanPath], { encoding: 'utf8', env: { ...process.env, TERM: 'xterm' } });
    assert.equal(lean.status, 0, lean.stderr || lean.stdout);
    const tail = lean.stdout.replace(/\x1b\[[0-9;]*[A-Za-z]/g, '').split(/\r?\n/).map((x) => x.trim()).filter(Boolean).slice(-expected.length);
    assert.deepEqual(tail, expected);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}

const single = checkUnifiedSource(`namespace Local { def inc(x: Nat): Nat := { x + 1 } }\nopen Local;\ndef result: Nat := { inc(8) }\n`);
assert.equal(single.integrationProfile, UNIFIED_INTEGRATION_PROFILE);
assert.equal(single.kernelSummary.status, 'accepted');
assertOnlyStandardBootstrapAssumptions(single.kernelSummary.assumptions, "single-file namespace kernel summary");
assert.ok(single.coreArtifact.declarations.some((d) => d.name === 'Local.inc'));
assert.match(single.typescript, /export function Local__inc/);
assert.doesNotMatch(single.typescript, /export function Local\.inc/);
assert.deepEqual(runTs(single.typescript, 'console.log("S=" + result());'), ['S=9']);
await checkLean(single.coreArtifact, ['result'], ['9']);

const checked = await checkUnifiedProject(projectRoot, 'Main.ps');
assert.equal(checked.integrationProfile, UNIFIED_INTEGRATION_PROFILE);
assert.equal(checked.kernelSummary.status, 'accepted');
assertOnlyStandardBootstrapAssumptions(checked.kernelSummary.assumptions, "checked kernel summary");
assert.deepEqual(checked.modules, ['Lib.Api', 'Reexport', 'Main']);
for (const name of ['Math.inc', 'Math.add2', 'Extra.doubleInc', 'result', 'qualified']) {
  assert.ok(checked.coreArtifact.declarations.some((d) => d.name === name), `missing checked Core declaration ${name}`);
}
assert.match(checked.typescript, /export function Math__inc/);
assert.match(checked.typescript, /export function Extra__doubleInc/);
assert.doesNotMatch(checked.typescript, /export function Math\.inc/);
assert.doesNotMatch(checked.typescript, /export function Extra\.doubleInc/);
assert.deepEqual(runTs(checked.typescript, 'console.log("R=" + result());\nconsole.log("Q=" + qualified());'), ['R=5', 'Q=5']);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ps-p5-replay-'));
try {
  const artifactPath = path.join(tmp, 'project.pscore.json');
  fs.writeFileSync(artifactPath, JSON.stringify(checked.coreArtifact, null, 2) + '\n');
  const artifact = decodeArtifact(JSON.parse(fs.readFileSync(artifactPath, 'utf8')));
  const replay = verifyFile(artifactPath, standardBootstrapAxiomSet());
  assert.equal(replay.status, 'accepted');
  assert.equal(replay.projectPluginsLoaded, false);
  await checkLean(artifact, ['result', 'qualified'], ['5', '5']);

  const tampered = structuredClone(checked.coreArtifact);
  const inc = tampered.declarations.find((d) => d.kind === 'definition' && d.name === 'Math.inc');
  assert.ok(inc);
  inc.type = { tag: 'const', name: 'Bool', levels: [] };
  const tamperedSummary = checkCoreDeclarations(tampered.declarations, 'KERNEL-level-instantiation-conformance1');
  assert.equal(tamperedSummary.status, 'rejected');
  assert.match(tamperedSummary.message ?? '', /type mismatch|expected|definition/i);
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }

const badDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ps-p5-bad-'));
try {
  fs.mkdirSync(path.join(badDir, 'Lib'), { recursive: true });
  fs.writeFileSync(path.join(badDir, 'Lib', 'Api.ps'), 'module;\nnamespace Math { def hidden(x: Nat): Nat := { x + 99 } }\n');
  fs.writeFileSync(path.join(badDir, 'Main.ps'), 'module;\nimport Lib.Api;\ndef result: Nat := { Math.hidden(1) }\n');
  await assert.rejects(() => checkUnifiedProject(badDir, 'Main.ps'), /Unknown function|hidden|PS2106/);
} finally { fs.rmSync(badDir, { recursive: true, force: true }); }

console.log('✓ Production P5 namespaces: namespace/open/export environment commands, safe TS name mangling, project replay, exact Lean/TS, visibility and tamper rejection passed');
