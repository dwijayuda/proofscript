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
import { checkUnifiedProject, UNIFIED_INTEGRATION_PROFILE } from '@proofscript/unified-bridge';
import { assertCoreDeclarationsRejected, assertOnlyStandardBootstrapAssumptions, standardBootstrapAxiomSet } from "./bootstrap-assumptions.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const projectRoot = path.join(root, 'integration-fixtures/production-p4/modules');
const hex64 = /^[0-9a-f]{64}$/;
const pinnedTsc = path.join(root, 'node_modules', 'typescript', 'lib', 'tsc.js');

function compileTypeScript(args, cwd) {
  const result = spawnSync(process.execPath, [pinnedTsc, ...args], {
    cwd,
    encoding: 'utf8',
  });
  assert.equal(
    result.status,
    0,
    `pinned TypeScript compilation failed${result.error ? `\nERROR:\n${result.error.message}` : ''}\nSTDOUT:\n${result.stdout ?? ''}\nSTDERR:\n${result.stderr ?? ''}`,
  );
  return result;
}

function writeProject(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ps-p4-project-'));
  for (const [rel, source] of Object.entries(files)) {
    const file = path.join(dir, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, source);
  }
  return dir;
}

async function expectProjectRuntime(projectDir, entry, expectedLine) {
  const out = await checkUnifiedProject(projectDir, entry);
  assert.equal(out.integrationProfile, UNIFIED_INTEGRATION_PROFILE);
  assert.equal(out.kernelSummary.status, 'accepted');
  assertOnlyStandardBootstrapAssumptions(out.kernelSummary.assumptions, "project module kernel summary");
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ps-p4-runtime-'));
  try {
    fs.writeFileSync(path.join(tmp, 'project.ts'), `${out.typescript}\nconsole.log("R=" + result());\n`);
    fs.writeFileSync(path.join(tmp, 'package.json'), '{"type":"module"}\n');
    compileTypeScript(
      ['project.ts', '--target', 'ES2022', '--module', 'NodeNext', '--moduleResolution', 'NodeNext', '--skipLibCheck', '--outDir', 'js'],
      tmp,
    );
    const rt = spawnSync(process.execPath, [path.join(tmp, 'js/project.js')], { encoding: 'utf8' });
    assert.equal(rt.status, 0, rt.stderr || rt.stdout);
    assert.equal(rt.stdout.trim(), expectedLine);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  return out;
}

const checked = await checkUnifiedProject(projectRoot, 'Main.ps');
assert.equal(checked.integrationProfile, UNIFIED_INTEGRATION_PROFILE);
assert.ok(['PRODUCTION-P4-project-modules', 'PRODUCTION-P5-module-namespaces', 'PRODUCTION-P6-bounded-string','PRODUCTION-P3-practical-profile'].includes(checked.integrationProfile));
assert.deepEqual(checked.modules, ['Lib.Math', 'Main']);
assert.equal(checked.entry, 'Main');
assert.match(checked.projectSourceSha256, hex64);
assert.match(checked.projectInterfaceSha256, hex64);
assert.equal(checked.moduleInterfaces.length, 2);
for (const iface of checked.moduleInterfaces) {
  assert.match(iface.sourceSha256, hex64);
  assert.match(iface.semanticIrSha256, hex64);
  assert.match(iface.publicInterfaceSha256, hex64);
  assert.match(iface.privateInterfaceSha256, hex64);
}
const libMathIface = checked.moduleInterfaces.find((item) => item.module === 'Lib.Math');
assert.ok(libMathIface);
assert.notEqual(libMathIface.publicInterfaceSha256, libMathIface.privateInterfaceSha256, 'import all fixture must expose a distinct private interface fingerprint');
assert.equal(checked.kernelSummary.status, 'accepted');
assertOnlyStandardBootstrapAssumptions(checked.kernelSummary.assumptions, "checked kernel summary");
for (const name of ['inc','twice','result']) assert.ok(checked.coreArtifact.declarations.some((d) => d.name === name), `missing ${name}`);
assert.match(checked.typescript, /export function inc/);
assert.match(checked.typescript, /export function twice/);
assert.match(checked.typescript, /export function result/);
assert.doesNotMatch(checked.typescript, /Cannot redeclare|duplicate/i);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ps-p4-modules-'));
try {
  const artifact = path.join(tmp, 'project.pscore.json');
  fs.writeFileSync(artifact, JSON.stringify(checked.coreArtifact, null, 2) + '\n');
  decodeArtifact(JSON.parse(fs.readFileSync(artifact, 'utf8')));
  const replay = verifyFile(artifact, standardBootstrapAxiomSet());
  assert.equal(replay.status, 'accepted');
  assert.equal(replay.projectPluginsLoaded, false);

  fs.writeFileSync(path.join(tmp, 'project.ts'), `${checked.typescript}\nconsole.log("R=" + result());\n`);
  fs.writeFileSync(path.join(tmp, 'package.json'), '{"type":"module"}\n');
  compileTypeScript(
    ['project.ts', '--target', 'ES2022', '--module', 'NodeNext', '--moduleResolution', 'NodeNext', '--skipLibCheck', '--outDir', 'js'],
    tmp,
  );
  const rt = spawnSync(process.execPath, [path.join(tmp, 'js/project.js')], { encoding: 'utf8' });
  assert.equal(rt.status, 0, rt.stderr || rt.stdout);
  assert.deepEqual(rt.stdout.trim().split(/\r?\n/), ['R=6']);

  const leanBin = process.env.PROOFSCRIPT_LEAN_BIN;
  if (leanBin) {
    const v = spawnSync(leanBin, ['--version'], { encoding: 'utf8' });
    assert.equal(v.status, 0, v.stderr || v.stdout);
    assert.match(v.stdout, /version 4\.33\.1,/);
    assert.match(v.stdout, /819816b2e0a3bf405af45ae5c7af2491d8f5bee6/);
    const decoded = decodeArtifact(JSON.parse(fs.readFileSync(artifact, 'utf8')));
    const stripped = stripStandardBootstrap(decoded) ?? decoded;
    const leanPath = path.join(tmp, 'project.lean');
    fs.writeFileSync(leanPath, `${emitLeanArtifact(stripped)}\n#reduce result\n`);
    const lean = spawnSync(leanBin, [leanPath], { encoding: 'utf8', env: { ...process.env, TERM: 'xterm' } });
    assert.equal(lean.status, 0, lean.stderr || lean.stdout);
    const tail = lean.stdout.replace(/\x1b\[[0-9;]*[A-Za-z]/g, '').split(/\r?\n/).map((x) => x.trim()).filter(Boolean).slice(-1);
    assert.deepEqual(tail, ['6']);
  }

  const tampered = structuredClone(checked.coreArtifact);
  const inc = tampered.declarations.find((d) => d.kind === 'definition' && d.name === 'inc');
  assert.ok(inc);
  inc.type = { tag: 'const', name: 'Bool', levels: [] };
  assertCoreDeclarationsRejected(checkCoreDeclarations(tampered.declarations, 'KERNEL-level-instantiation-conformance1'), /type mismatch|expected|definition/i);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

const visibilityDir = writeProject({
  'Lib/Api.ps': 'module;\npublic def pub(x: Nat): Nat := { x + 1 }\ndef hidden(x: Nat): Nat := { x + 99 }\n',
  'Reexport.ps': 'module;\npublic import Lib.Api;\n',
  'Main.ps': 'module;\nimport Reexport;\ndef result: Nat := { pub(5) }\n',
  'MainBad.ps': 'module;\nimport Reexport;\ndef result: Nat := { hidden(5) }\n',
  'MainAll.ps': 'module;\nimport all Lib.Api;\ndef result: Nat := { hidden(5) }\n',
});
try {
  const reexport = await expectProjectRuntime(visibilityDir, 'Main.ps', 'R=6');
  assert.deepEqual(reexport.modules, ['Lib.Api', 'Reexport', 'Main']);
  const api = reexport.moduleInterfaces.find((item) => item.module === 'Lib.Api');
  assert.ok(api);
  assert.notEqual(api.publicInterfaceSha256, api.privateInterfaceSha256, 'public/private interface hashes must distinguish hidden declarations');
  const reexportIface = reexport.moduleInterfaces.find((item) => item.module === 'Reexport');
  assert.ok(reexportIface);
  assert.deepEqual(reexportIface.imports, [{ module: 'Lib.Api', public: true }]);
  await assert.rejects(() => checkUnifiedProject(visibilityDir, 'MainBad.ps'), /Unknown function|hidden|PS2106/);
  await expectProjectRuntime(visibilityDir, 'MainAll.ps', 'R=104');
} finally { fs.rmSync(visibilityDir, { recursive: true, force: true }); }

console.log('✓ Production P4 modules: multi-file import-all, public re-export visibility, interface fingerprints, replay, exact Lean/TS and tamper rejection passed');
