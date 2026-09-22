import './register-local-workspace.cts';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const { checkProjectFile } = require('../packages/compiler/dist/index.js');
const { loadStandardBootstrap } = require('../packages/environment/dist/index.js');
const {
  emitJavaScriptModule,
  emitTypeScriptModule,
} = require('../packages/backend-typescript/dist/index.js');
const {
  PSC1_FAIL_CLOSED_FEATURES,
  PSC1_IMPLEMENTATION_PROFILE,
  PSC1_SUPPORTED_FEATURES,
  PSC1_TRUST_LABEL,
  psc1RuntimeStatus,
} = require('../packages/runtime/dist/index.js');

export {
  PSC1_FAIL_CLOSED_FEATURES,
  PSC1_IMPLEMENTATION_PROFILE,
  PSC1_SUPPORTED_FEATURES,
  PSC1_TRUST_LABEL,
};

export function sha256File(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

export function parseRunArg(raw) {
  const text = String(raw).trim();
  if (text === 'true') return true;
  if (text === 'false') return false;
  if (/^-?\d+$/.test(text)) return BigInt(text);
  throw new Error(`unsupported PSC-1 run argument ${JSON.stringify(raw)}; use Nat integer or Bool true/false`);
}

export function printableRunValue(value) {
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return String(value);
}

export function checkSmallSource(file) {
  const prelude = loadStandardBootstrap().artifact;
  return checkProjectFile(file, { prelude });
}

export function standardPreludeDeclarationCount() {
  return loadStandardBootstrap().artifact.declarations.length;
}

export function stripPreludeDeclarations(checked) {
  return checked.artifact.declarations.slice(standardPreludeDeclarationCount());
}

export function emitCheckedJavaScript(checked, sourceFile) {
  return emitJavaScriptModule(checked.artifact, {
    sourceFile,
    sourceText: fs.readFileSync(sourceFile, 'utf8'),
    userDeclarationOffset: standardPreludeDeclarationCount(),
  });
}

export function emitCheckedTypeScript(checked, sourceFile, options = {}) {
  return emitTypeScriptModule(checked.artifact, {
    sourceFile,
    sourceText: fs.readFileSync(sourceFile, 'utf8'),
    userDeclarationOffset: standardPreludeDeclarationCount(),
    runtimeMode: options.runtimeMode ?? 'bundled',
    runtimeImportPath: options.runtimeImportPath,
  });
}

export async function importCommonJsModule(file) {
  const mod = await import(pathToFileURL(file).href);
  return mod.default ?? mod;
}

export function getStatusResult() {
  return {
    ...psc1RuntimeStatus(),
    status: 'live-small-subset',
    supported: PSC1_SUPPORTED_FEATURES,
    failClosed: PSC1_FAIL_CLOSED_FEATURES,
  };
}

export function checkCommand(file, options = {}) {
  const checked = checkSmallSource(file);
  const emitCore = options.emitCore;
  if (emitCore) {
    fs.mkdirSync(path.dirname(emitCore), { recursive: true });
    fs.writeFileSync(emitCore, JSON.stringify(checked.artifact, null, 2) + '\n');
  }
  return {
    status: 'accepted',
    trustLabel: PSC1_TRUST_LABEL,
    declarations: checked.summary.declarations.length,
    userDeclarations: stripPreludeDeclarations(checked).map(d => ({ name: d.name, kind: d.kind })),
    semanticSha256: checked.summary.semanticSha256,
  };
}

export function buildJsCommand(file, out) {
  const checked = checkSmallSource(file);
  const emitted = emitCheckedJavaScript(checked, file);
  const resolvedOut = path.resolve(out);
  fs.mkdirSync(path.dirname(resolvedOut), { recursive: true });
  fs.writeFileSync(out, emitted.js);
  return {
    status: 'accepted',
    target: 'js',
    trustLabel: PSC1_TRUST_LABEL,
    outPath: resolvedOut,
    outputSha256: sha256File(out),
    emitted: emitted.emitted.map(x => ({ name: x.name, jsName: x.jsName, arity: x.arity })),
    skipped: emitted.skipped,
    semanticSha256: checked.summary.semanticSha256,
  };
}

export function buildTsCommand(file, out, options = {}) {
  const checked = checkSmallSource(file);
  const runtimeMode = options.runtimeMode ?? 'bundled';
  const runtimeFileName = options.runtimeFileName ?? 'proofscript-runtime.ts';
  const resolvedOut = path.resolve(out);
  const runtimeImportPath = runtimeMode === 'local' ? `./${path.basename(runtimeFileName, '.ts')}.js` : undefined;
  const emitted = emitCheckedTypeScript(checked, file, { runtimeMode, runtimeImportPath });
  fs.mkdirSync(path.dirname(resolvedOut), { recursive: true });
  fs.writeFileSync(out, emitted.ts);
  let runtimePath;
  let runtimeSha256;
  if (emitted.runtimeTs) {
    runtimePath = path.join(path.dirname(resolvedOut), runtimeFileName);
    fs.writeFileSync(runtimePath, emitted.runtimeTs);
    runtimeSha256 = sha256File(runtimePath);
  }
  return {
    status: 'accepted',
    target: 'ts',
    trustLabel: PSC1_TRUST_LABEL,
    outPath: resolvedOut,
    outputSha256: sha256File(out),
    runtime: {
      mode: emitted.runtimeMode,
      import: emitted.runtimeImport,
      path: runtimePath,
      sha256: runtimeSha256,
    },
    emitted: emitted.emitted.map(x => ({ name: x.name, jsName: x.jsName, arity: x.arity })),
    skipped: emitted.skipped,
    semanticSha256: checked.summary.semanticSha256,
  };
}

export async function runSmallSource(file, options) {
  const call = options?.call;
  if (!call) throw new Error('runSmallSource requires a call name');
  const rawArgs = options.args ?? [];
  const callArgs = rawArgs.map(parseRunArg);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'proofscript-live-run-'));
  const out = path.join(tmp, 'out.js');
  const checked = checkSmallSource(file);
  const emitted = emitCheckedJavaScript(checked, file);
  fs.writeFileSync(out, emitted.js);
  const api = await importCommonJsModule(out);
  let value = api[call];
  if (value === undefined) throw new Error(`export '${call}' not found in small-subset JS output`);
  for (const arg of callArgs) value = value(arg);
  return {
    status: 'accepted',
    call,
    args: callArgs.map(printableRunValue),
    result: printableRunValue(value),
    trustLabel: PSC1_TRUST_LABEL,
    implementationProfile: PSC1_IMPLEMENTATION_PROFILE,
  };
}
