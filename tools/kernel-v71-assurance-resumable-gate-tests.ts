import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

function fail(msg) {
  console.error(`FAIL KERNEL-v71-assurance-resumable-gate: ${msg}`);
  process.exit(1);
}
function must(cond, msg) { if (!cond) fail(msg); }

const runner = path.join(root, 'tools/kernel-v71-assurance-run-part.ts');
const finalizer = path.join(root, 'tools/kernel-v71-assurance-finalize.ts');
must(fs.existsSync(runner), 'missing per-part runner');
must(fs.existsSync(finalizer), 'missing finalizer');

const runnerSrc = fs.readFileSync(runner, 'utf8');
const finalizerSrc = fs.readFileSync(finalizer, 'utf8');
must(runnerSrc.includes('v71-gate-part${part}.out'), 'runner must persist each part log under assurance evidence');
must(runnerSrc.includes("stdio: ['ignore', 'pipe', 'pipe']"), 'runner must stream while capturing stdout/stderr to log');
must(finalizerSrc.includes('FINAL_VALIDATION_V71_FULL_LEAN_GATE.json'), 'finalizer must emit durable full Lean-gate JSON');
must(finalizerSrc.includes('KERNEL v71 ASSURANCE GATE PART ${part}/6: PASS'), 'finalizer must require all six exact pass markers');
for (const part of [1,2,3,4,5,6]) {
  must(pkg.scripts?.[`test:v71:lean-gate:part${part}`] === `node tools/kernel-v71-assurance-run-part.ts --part=${part}`, `package script missing for part ${part}`);
}
must(pkg.scripts?.['test:v71:lean-gate:finalize'] === 'node tools/kernel-v71-assurance-finalize.ts', 'package script missing for finalizer');
must(pkg.scripts?.['test:v71:resumable-gate'] === 'node tools/kernel-v71-assurance-resumable-gate-tests.ts', 'package script missing for resumable gate regression');

console.log('PASS KERNEL-v71-assurance-resumable-gate: per-part logs plus finalizer are wired');
