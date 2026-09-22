import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const gatePath = path.join(root, 'tools/kernel-v71-assurance-gate.ts');
const pkgPath = path.join(root, 'package.json');
const src = fs.readFileSync(gatePath, 'utf8');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

function fail(msg) {
  console.error(`FAIL KERNEL-v71-assurance-wrapper-streaming: ${msg}`);
  process.exit(1);
}
function must(cond, msg) { if (!cond) fail(msg); }

must(src.includes('function runStreaming('), 'gate all-mode must use a streaming runner for child parts');
must(src.includes("stdio: 'inherit'") || src.includes('stdio:"inherit"'), 'streaming runner must inherit stdio so long Lean parts do not appear hung');
must(src.includes('FINAL_VALIDATION_V71_FULL_LEAN_GATE.json'), 'full gate must write a durable final validation JSON artifact');
must(src.includes('writeFullGateSummary('), 'all-mode must write the final validation summary after all six parts pass');
must(src.includes("runStreaming(process.execPath,[self,`--part=${p}`]"), 'all-mode must invoke each part through the streaming runner');
must(pkg.scripts?.['test:v71:lean-gate'] === 'node tools/kernel-v71-assurance-gate.ts all', 'package.json must expose test:v71:lean-gate');
must(pkg.scripts?.['test:v71:wrapper-streaming'] === 'node tools/kernel-v71-assurance-wrapper-streaming-tests.ts', 'package.json must expose wrapper streaming regression');

console.log('PASS KERNEL-v71-assurance-wrapper-streaming: all-mode streams child parts and records final summary');
