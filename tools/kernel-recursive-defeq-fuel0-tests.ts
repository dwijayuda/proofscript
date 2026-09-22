import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { checkSource } from '@proofscript/frontend-next';
import { createUnifiedRegistry, lowerProgramToCore } from '../packages/unified-bridge/dist/index.js';
import { loadStandardBootstrap } from '@proofscript/environment';
import { Environment, checkAndAddDeclaration, kernelWhnf, pretty, sameTerm } from '../packages/kernel/dist/index.js';

const C = (name: string, levels: any[] = []) => ({ tag: 'const', name, levels } as const);
const App = (fn: any, arg: any) => ({ tag: 'app', fn, arg } as const);
const nat = (n: number): any => n === 0 ? C('Nat.zero') : App(C('Nat.succ'), nat(n - 1));

const source = fs.readFileSync(path.join(process.cwd(), 'integration-fixtures/wave-b/decidable-control.ps'), 'utf8');
const semanticIR = checkSource(source, createUnifiedRegistry()).program;
const standard = loadStandardBootstrap().artifact;
const owned = lowerProgramToCore(semanticIR);
const ownedByName = new Map(owned.map((d: any) => [d.name, d]));
const inserted = new Set<string>();
const declarations: any[] = [];
for (const d of standard.declarations as any[]) {
  const replacement = ownedByName.get(d.name) as any;
  if (replacement?.kind === 'inductive' && d.kind === 'inductive') {
    declarations.push(replacement);
    inserted.add(replacement.name);
  } else declarations.push(d);
}
for (const d of owned as any[]) if (!inserted.has(d.name)) declarations.push(d);

const env = new Environment({ implementationProfile: 'KERNEL-level-instantiation-conformance1' } as any);
for (const d of declarations) {
  if (d.name === 'answer_eq_7') break;
  checkAndAddDeclaration(env, d);
}

const reduced = kernelWhnf(env, C('answer'));
assert.ok(sameTerm(reduced, nat(7)), `Wave B answer must reduce to 7 under default fuel\nactual: ${pretty(reduced)}`);
console.log('KERNEL_RECURSIVE_DEFEQ_FUEL0=PASS');
