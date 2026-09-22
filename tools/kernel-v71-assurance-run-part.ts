import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const evidence = path.join(root, 'assurance/lean4331/evidence');
const partArg = process.argv.find(a => a.startsWith('--part='));
const part = partArg?.slice('--part='.length);

function fail(msg) {
  console.error(`FAIL KERNEL-v71-assurance-run-part: ${msg}`);
  process.exit(1);
}

if (!/^[1-6]$/.test(part ?? '')) fail('expected --part=N where N is 1..6');
fs.mkdirSync(evidence, { recursive: true });

const logPath = path.join(evidence, `v71-gate-part${part}.out`);
const gatePath = path.join(root, 'tools/kernel-v71-assurance-gate.ts');
const startedAtUtc = new Date().toISOString();
const header = [
  `KERNEL_V71_ASSURANCE_PART=${part}`,
  `STARTED_AT_UTC=${startedAtUtc}`,
  `COMMAND=${process.execPath} ${gatePath} --part=${part}`,
  ''
].join('\n');

const chunks = [Buffer.from(header)];
process.stdout.write(header);

const child = spawn(process.execPath, [gatePath, `--part=${part}`], {
  cwd: root,
  env: process.env,
  stdio: ['ignore', 'pipe', 'pipe']
});

child.stdout.on('data', chunk => {
  chunks.push(Buffer.from(chunk));
  process.stdout.write(chunk);
});
child.stderr.on('data', chunk => {
  chunks.push(Buffer.from(chunk));
  process.stderr.write(chunk);
});

const result = await new Promise(resolve => {
  child.on('error', error => resolve({ code: null, signal: null, error }));
  child.on('close', (code, signal) => resolve({ code, signal, error: null }));
});

const footer = [
  '',
  `FINISHED_AT_UTC=${new Date().toISOString()}`,
  `EXIT_CODE=${result.code}`,
  `SIGNAL=${result.signal ?? ''}`,
  ''
].join('\n');
chunks.push(Buffer.from(footer));
process.stdout.write(footer);

const output = Buffer.concat(chunks).toString('utf8');
fs.writeFileSync(logPath, output);

if (result.error) fail(String(result.error.stack ?? result.error));
if (result.code !== 0) fail(`part ${part}/6 failed; see ${path.relative(root, logPath)}`);
const marker = `KERNEL v71 ASSURANCE GATE PART ${part}/6: PASS`;
if (!output.includes(marker)) fail(`part ${part}/6 did not print exact pass marker; see ${path.relative(root, logPath)}`);
console.log(`PASS KERNEL-v71-assurance-run-part: part ${part}/6 log saved to ${path.relative(root, logPath)}`);
