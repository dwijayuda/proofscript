import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  createMonadicLoweringBundle,
  createMonadicLeanPreflightBundle,
  readMonadicLoweringArtifact,
} from '../packages/monadic-lowering/src/index.mjs';

export { createMonadicLoweringBundle, createMonadicLeanPreflightBundle };

function has(args, name) { return args.includes(name); }
function opt(args, name) {
  const eq = args.find(arg => arg.startsWith(`${name}=`));
  if (eq) return eq.slice(name.length + 1);
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}
function positional(args) {
  const optionsWithValues = new Set(['--out', '--emit-lean', '--lean-cmd']);
  const out = [];
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const name = arg.includes('=') ? arg.slice(0, arg.indexOf('=')) : arg;
      if (optionsWithValues.has(name) && !arg.includes('=')) i += 1;
      continue;
    }
    out.push(arg);
  }
  return out;
}
function sha256File(file) {
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}
function writeJsonFile(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
}
function readJsonPath(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
function jsonOut(value, json) {
  if (json) console.log(JSON.stringify(value, null, 2));
  else if (value.status === 'accepted') console.log(`${value.command}: accepted`);
  else console.error(`${value.command}: ${value.status}: ${value.message ?? ''}`);
}
function rejectUsage(command, syntax, json) {
  jsonOut({ status: 'rejected', command, message: `usage: ${syntax}` }, json);
  process.exit(2);
}

export function monadicLoweringCommand(args, { version, cwd = process.cwd() } = {}) {
  const json = has(args, '--json');
  const pos = positional(args);
  const input = pos[0] ? path.resolve(cwd, pos[0]) : undefined;
  const out = opt(args, '--out');
  const emitLean = opt(args, '--emit-lean');
  if (!input || !out) rejectUsage('monadic-lowering', 'psc monadic-lowering <contracts.json> --out <lowering.json> [--emit-lean <out.lean>]', json);
  try {
    const contractArtifact = readJsonPath(input);
    const bundle = createMonadicLoweringBundle({
      contractArtifact,
      contractArtifactPath: path.relative(cwd, input).replace(/\\/g, '/'),
      contractArtifactSha256: sha256File(input),
      packageVersion: version,
      checkpoint: 'KA-146 Lean-checkable monadic skeleton preflight',
    });
    const resolvedOut = path.resolve(cwd, out);
    writeJsonFile(resolvedOut, bundle.artifact);
    let leanOut;
    if (emitLean) {
      leanOut = path.resolve(cwd, emitLean);
      fs.mkdirSync(path.dirname(leanOut), { recursive: true });
      fs.writeFileSync(leanOut, bundle.leanText);
      bundle.artifact.leanSkeleton = {
        path: path.relative(path.dirname(resolvedOut), leanOut).replace(/\\/g, '/'),
        sha256: sha256File(leanOut),
        checkableAsCompleteProof: false,
      };
      writeJsonFile(resolvedOut, bundle.artifact);
    }
    jsonOut({
      status: 'accepted',
      command: 'monadic-lowering',
      out: resolvedOut,
      outSha256: sha256File(resolvedOut),
      emitLean: leanOut,
      emitLeanSha256: leanOut ? sha256File(leanOut) : undefined,
      schema: bundle.artifact.schema,
      function: bundle.artifact.function?.name,
      stateModel: bundle.artifact.stateModel?.name,
      tripleSkeleton: bundle.artifact.tripleSkeleton,
      summary: bundle.artifact.summary,
      trustBoundary: bundle.artifact.trustBoundary,
    }, json);
  } catch (error) {
    jsonOut({ status: 'rejected', command: 'monadic-lowering', message: error instanceof Error ? error.message : String(error) }, json);
    process.exit(1);
  }
}

export function monadicVcRequestCommand(args, { cwd = process.cwd() } = {}) {
  const json = has(args, '--json');
  const pos = positional(args);
  const input = pos[0] ? path.resolve(cwd, pos[0]) : undefined;
  const out = opt(args, '--out');
  const emitLean = opt(args, '--emit-lean');
  if (!input || !out) rejectUsage('monadic-vc-request', 'psc monadic-vc-request <monadic-lowering.json> --out <request.json> [--emit-lean <request.lean>]', json);
  try {
    const { loweringArtifact } = readMonadicLoweringArtifact(input);
    const request = loweringArtifact.statefulVcRequest;
    if (!request || request.schema !== 'proofscript.stateful-vc-request/v1') {
      throw new Error('monadic lowering artifact does not contain proofscript.stateful-vc-request/v1');
    }
    const resolvedOut = path.resolve(cwd, out);
    writeJsonFile(resolvedOut, request);
    let resolvedLean;
    if (emitLean) {
      if (request.requestSourceReady !== true || !request.request?.source) {
        const reasons = (request.diagnostics ?? []).map(item => item.code).join(', ') || 'request source not ready';
        jsonOut({
          status: 'unsupported',
          command: 'monadic-vc-request',
          out: resolvedOut,
          outSha256: sha256File(resolvedOut),
          schema: request.schema,
          requestSourceReady: false,
          diagnostics: request.diagnostics ?? [],
          message: `Lean VC request source is not ready: ${reasons}`,
        }, json);
        process.exit(2);
      }
      resolvedLean = path.resolve(cwd, emitLean);
      fs.mkdirSync(path.dirname(resolvedLean), { recursive: true });
      fs.writeFileSync(resolvedLean, request.request.source);
    }
    jsonOut({
      status: 'accepted',
      command: 'monadic-vc-request',
      out: resolvedOut,
      outSha256: sha256File(resolvedOut),
      emitLean: resolvedLean,
      emitLeanSha256: resolvedLean ? sha256File(resolvedLean) : undefined,
      schema: request.schema,
      function: request.function,
      requestSourceReady: request.requestSourceReady,
      environment: request.environment,
      tactic: request.tactic,
      executionStatus: request.executionStatus,
      leanEnvironmentResolved: request.leanEnvironmentResolved,
      tacticExecuted: request.tacticExecuted,
      semanticVcDerivationComplete: request.semanticVcDerivationComplete,
      realVerificationConditionsGenerated: request.realVerificationConditionsGenerated,
      semanticProofDischarge: request.semanticProofDischarge,
      diagnostics: request.diagnostics,
    }, json);
  } catch (error) {
    jsonOut({ status: 'rejected', command: 'monadic-vc-request', message: error instanceof Error ? error.message : String(error) }, json);
    process.exit(1);
  }
}

function runLeanPreflightCommand(leanCmd, leanFile, cwd) {
  if (!leanCmd) return { status: 'skipped', reason: 'no --lean-cmd provided' };
  const result = spawnSync(leanCmd, [leanFile], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  return {
    status: (result.status ?? 1) === 0 ? 'passed' : 'failed',
    command: leanCmd,
    args: [leanFile],
    exitCode: result.status ?? 1,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

export function monadicPreflightCommand(args, { version, cwd = process.cwd() } = {}) {
  const json = has(args, '--json');
  const pos = positional(args);
  const input = pos[0] ? path.resolve(cwd, pos[0]) : undefined;
  const out = opt(args, '--out');
  const emitLean = opt(args, '--emit-lean');
  const leanCmd = opt(args, '--lean-cmd');
  if (!input || !out || !emitLean) rejectUsage('monadic-preflight', 'psc monadic-preflight <monadic-lowering.json> --out <preflight.json> --emit-lean <preflight.lean> [--lean-cmd <lean>]', json);
  try {
    const { loweringArtifact, loweringArtifactSha256 } = readMonadicLoweringArtifact(input);
    const resolvedOut = path.resolve(cwd, out);
    const resolvedLean = path.resolve(cwd, emitLean);
    const leanText = createMonadicLeanPreflightBundle({ loweringArtifact, packageVersion: version }).leanText;
    fs.mkdirSync(path.dirname(resolvedLean), { recursive: true });
    fs.writeFileSync(resolvedLean, leanText);
    const leanRun = runLeanPreflightCommand(leanCmd, resolvedLean, cwd);
    const bundle = createMonadicLeanPreflightBundle({
      loweringArtifact,
      loweringArtifactPath: path.relative(path.dirname(resolvedOut), input).replace(/\\/g, '/'),
      loweringArtifactSha256,
      preflightLeanPath: path.relative(path.dirname(resolvedOut), resolvedLean).replace(/\\/g, '/'),
      preflightLeanSha256: sha256File(resolvedLean),
      leanRun,
      packageVersion: version,
      checkpoint: 'KA-146 Lean-checkable monadic skeleton preflight',
    });
    writeJsonFile(resolvedOut, bundle.report);
    jsonOut({
      status: leanRun.status === 'failed' ? 'rejected' : 'accepted',
      command: 'monadic-preflight',
      out: resolvedOut,
      outSha256: sha256File(resolvedOut),
      emitLean: resolvedLean,
      emitLeanSha256: sha256File(resolvedLean),
      schema: bundle.report.schema,
      function: bundle.report.function,
      stateModel: bundle.report.stateModel,
      leanRun: bundle.report.leanRun,
      summary: bundle.report.summary,
      trustBoundary: bundle.report.trustBoundary,
    }, json);
    if (leanRun.status === 'failed') process.exit(1);
  } catch (error) {
    jsonOut({ status: 'rejected', command: 'monadic-preflight', message: error instanceof Error ? error.message : String(error) }, json);
    process.exit(1);
  }
}
