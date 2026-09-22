#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const NODE_TS_FLAGS = [
  '--experimental-strip-types',
  '--disable-warning=ExperimentalWarning',
  '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON',
];
const defaultGates = [
  ['software-profile-consistency', 'tools/software-profile-consistency-tests.ts'],
] as const;
const fullExtraGates = [
  ['software-profile-executable-examples', 'tools/software-profile-executable-examples-tests.ts'],
  ['psc-adapter', 'tools/psc-cli-adapter-tests.ts'],
  ['psc-simple-commands', 'tools/psc-simple-commands-tests.ts'],
  ['psc-professional-build', 'tools/psc-professional-build-tests.ts'],
  ['psc-windows-simple-setup', 'tools/psc-windows-simple-setup-tests.ts'],
  ['psc-runtime-import-crud', 'tools/psc-runtime-import-crud-tests.ts'],
  ['psc-crud-template', 'tools/psc-crud-app-template-tests.ts'],
] as const;
const full = process.argv.includes('--full');
const gates = full ? [...defaultGates, ...fullExtraGates] : defaultGates;
function tail(text: string, maxLines = 80): string {
  const lines = text.trimEnd().split(/\r?\n/u);
  return lines.slice(Math.max(0, lines.length - maxLines)).join('\n');
}
for (const [name, script] of gates) {
  console.log(`[verify:profile:software] ${name}`);
  const started = Date.now();
  const result = spawnSync(process.execPath, [...NODE_TS_FLAGS, path.join(repoRoot, script)], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: { ...process.env },
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 180_000,
    maxBuffer: 32 * 1024 * 1024,
  });
  const combined = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  if (combined.trim()) console.log(tail(combined));
  if (result.error || (result.status ?? 1) !== 0) {
    console.error(`[verify:profile:software] ${name}=FAIL status=${result.status ?? 'null'} signal=${result.signal ?? 'none'} error=${result.error?.message ?? 'none'}`);
    process.exit(result.status ?? 1);
  }
  console.log(`[verify:profile:software] ${name}=PASS ${Date.now() - started}ms`);
}
console.log(full ? 'PROOFSCRIPT_SOFTWARE_PROFILE_V0_FULL_VERIFY=PASS' : 'PROOFSCRIPT_SOFTWARE_PROFILE_V0_VERIFY=PASS');
