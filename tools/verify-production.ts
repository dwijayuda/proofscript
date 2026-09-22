#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const args = new Set(process.argv.slice(2));
const runBuild = !args.has('--no-build');

const gates = [
  'test:production-p6:string',
  'test:production-p5:namespaces',
  'test:production-p4:modules',
  'test:production-p3',
  'test:production-p3:int',
  'test:production-p3:except',
  'test:production-p3:list',
  'test:production-p3:closure',
  'test:production-p2',
  'test:production-p1',
  'test:wave-h', 'test:wave-g', 'test:wave-f', 'test:wave-e',
  'test:wave-d', 'test:wave-c', 'test:wave-b', 'test:wave-a',
  'test:integration:ui0', 'test:integration:ui1', 'test:integration:ui2',
  'test:integration:ui3', 'test:integration:ui4',
  'test:coverage', 'test:architecture', 'test:v71:k3tb-lean-env-doctor',
  'test:v71:k3tb-default-consistency',
  'test:v71:k3tb-ci-publish-parity',
  'test:v71:k3tb-one-command-doctor-guard',
  'test:conformance',
];

function npmRun(script) {
  console.log(`\n=== ${script} ===`);
  const r = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', script], {
    stdio: 'inherit',
    env: process.env,
  });
  if (r.error) throw r.error;
  if (r.status !== 0) process.exit(r.status ?? 1);
}

if (runBuild) npmRun('build');
for (const gate of gates) npmRun(gate);
console.log(`\n✓ production verification passed (${gates.length} gates${runBuild ? ' + build' : ''})`);
