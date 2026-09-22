#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { runSmoke } from './pslive-smoke-lib.ts';
import {
  buildJsCommand,
  buildTsCommand,
  checkCommand,
  getStatusResult,
  PSC1_TRUST_LABEL,
  runSmallSource,
} from './pslive-core.ts';

function usage() {
  console.error(`Usage:\n  node tools/pslive.ts status [--json]\n  node tools/pslive.ts check <file.ps> [--json] [--emit-core <out.json>]\n  node tools/pslive.ts build-js <file.ps> --out <out.js> [--json]\n  node tools/pslive.ts build-ts <file.ps> --out <out.ts> [--runtime local|package|bundled] [--bundle-runtime] [--json]\n  node tools/pslive.ts run <file.ps> --call <name> [--args a,b] [--json]\n  node tools/pslive.ts smoke [--json]`);
  process.exit(4);
}

const has = (args, name) => args.includes(name);
const opt = (args, name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };


function offsetToLineColumn(source: string, offset: number) {
  let line = 1;
  let column = 1;
  for (let i = 0; i < source.length && i < offset; i += 1) {
    if (source[i] === '\n') { line += 1; column = 1; }
    else column += 1;
  }
  return { line, column };
}
function formatSourceDiagnostic(file: string | undefined, message: string) {
  if (!file) return { text: `rejected: ${message}`, json: { status: 'rejected', message, trustLabel: PSC1_TRUST_LABEL } };
  const resolved = path.resolve(file);
  let source = '';
  try { source = fs.readFileSync(resolved, 'utf8'); }
  catch { return { text: `rejected: ${message}`, json: { status: 'rejected', message, file: resolved, trustLabel: PSC1_TRUST_LABEL } }; }
  const m = /offset (\d+)/u.exec(message);
  if (!m) return { text: `rejected: ${resolved}: ${message}`, json: { status: 'rejected', message, file: resolved, trustLabel: PSC1_TRUST_LABEL } };
  const offset = Number(m[1]);
  const { line, column } = offsetToLineColumn(source, offset);
  const lines = source.split(/\r?\n/u);
  const excerpt = lines[line - 1] ?? '';
  const gutter = `${line} | `;
  const caret = `${' '.repeat(gutter.length + Math.max(0, column - 1))}^`;
  const clean = message.replace(/ at offset \d+/u, '');
  const base = process.env.PROOFSCRIPT_USER_CWD || process.cwd();
  const rel = path.relative(base, resolved) || resolved;
  const text = `rejected: ${rel}:${line}:${column}\n${clean}\n${gutter}${excerpt}\n${caret}`;
  return {
    text,
    json: { status: 'rejected', message: clean, file: resolved, line, column, excerpt, trustLabel: PSC1_TRUST_LABEL },
  };
}

function runtimeMode(args) {
  if (has(args, '--bundle-runtime')) return 'bundled';
  const mode = opt(args, '--runtime');
  if (!mode) return 'bundled';
  if (!['local', 'package', 'bundled'].includes(mode)) throw new Error(`unsupported runtime mode '${mode}'; expected local, package, or bundled`);
  return mode;
}

function printResult(value, json, text) {
  if (json) console.log(JSON.stringify(value, null, 2));
  else console.log(text(value));
}

async function main() {
  const args = process.argv.slice(2);
  const cmd = args.shift();
  if (!cmd) usage();
  const json = has(args, '--json');
  try {
    if (cmd === 'status') {
      const result = getStatusResult();
      printResult(result, json, () => `ProofScript standalone small subset is live. requiresLean4=false. trust='${PSC1_TRUST_LABEL}'`);
      return;
    }
    if (cmd === 'check') {
      const file = args[0]; if (!file || file.startsWith('--')) usage();
      const result = checkCommand(file, { emitCore: opt(args, '--emit-core') });
      printResult(result, json, r => `accepted ${r.userDeclarations.length} user declaration(s); total checked=${r.declarations}; semantic=${r.semanticSha256}`);
      return;
    }
    if (cmd === 'build-js') {
      const file = args[0]; const out = opt(args, '--out'); if (!file || !out) usage();
      const result = buildJsCommand(file, out);
      printResult(result, json, r => `✓ built standalone JS: ${out}; emitted=${r.emitted.length}; skipped=${r.skipped.length}; sha256=${r.outputSha256}`);
      return;
    }
    if (cmd === 'build-ts') {
      const file = args[0]; const out = opt(args, '--out'); if (!file || !out) usage();
      const result = buildTsCommand(file, out, { runtimeMode: runtimeMode(args) });
      printResult(result, json, r => `✓ built TypeScript: ${out}; runtime=${r.runtime.mode}; emitted=${r.emitted.length}; skipped=${r.skipped.length}; sha256=${r.outputSha256}`);
      return;
    }
    if (cmd === 'run') {
      const file = args[0]; const call = opt(args, '--call'); if (!file || !call) usage();
      const callArgsRaw = opt(args, '--args') ?? '';
      const result = await runSmallSource(file, {
        call,
        args: callArgsRaw === '' ? [] : callArgsRaw.split(','),
      });
      printResult(result, json, r => `${call}(${r.args.join(',')}) = ${r.result}`);
      return;
    }
    if (cmd === 'smoke') { await runSmoke(json); return; }
    usage();
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const file = ['check', 'build-js', 'build-ts', 'run'].includes(cmd) && args[0] && !args[0].startsWith('--') ? args[0] : undefined;
    const diagnostic = formatSourceDiagnostic(file, message);
    if (json) console.log(JSON.stringify(diagnostic.json, null, 2)); else console.error(diagnostic.text);
    process.exit(1);
  }
}

main();
