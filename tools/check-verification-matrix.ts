#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
let matrixArg = null;
let jsonOut = false;
for (let i = 0; i < args.length; i += 1) {
  if (args[i] === '--matrix') {
    matrixArg = args[i + 1];
    i += 1;
  } else if (args[i] === '--json') {
    jsonOut = true;
  }
}

const matrixPath = matrixArg ? path.resolve(root, matrixArg) : path.join(root, 'config', 'verification-matrix.json');
const packageJsonPath = path.join(root, 'package.json');
const failures = [];
const validClaimTypes = new Set(['build', 'architecture', 'feature-support', 'language-smoke', 'governance', 'kernel-trust-boundary', 'artifact-integrity', 'release', 'oracle-optional']);
const validTrustImpacts = new Set([
  'engineering-evidence',
  'trusted-boundary-enforcement',
  'explainability-and-boundary-discipline',
  'feature-promotion-discipline',
  'claim-to-evidence-discipline',
  'end-to-end-regression-evidence',
  'language-reference-discipline',
  'trusted-boundary-kernel-evidence',
  'execution-after-core-evidence',
  'delivery-integrity-evidence',
  'optional-external-oracle-evidence',
]);

function rel(p) {
  return path.relative(root, p).split(path.sep).join('/');
}

function loadJson(file, label = rel(file)) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    failures.push(`failed to read ${label}: ${error.message}`);
    return null;
  }
}

function existsRelative(ref) {
  return fs.existsSync(path.join(root, ref));
}

function stringArray(value, label, { allowEmpty = false } = {}) {
  if (value == null) return [];
  if (!Array.isArray(value)) {
    failures.push(`${label} must be an array`);
    return [];
  }
  if (!allowEmpty && value.length === 0) failures.push(`${label} must not be empty`);
  for (const item of value) {
    if (typeof item !== 'string' || item.length === 0) failures.push(`${label} contains a non-string/empty item`);
  }
  return value;
}

const matrix = loadJson(matrixPath);
const packageJson = loadJson(packageJsonPath);
if (!matrix || !packageJson) {
  console.error(failures.join('\n'));
  process.exit(1);
}

if (matrix.schemaVersion !== 1) failures.push(`verification matrix schemaVersion must be 1, got ${matrix.schemaVersion}`);
if (matrix.trustClaim?.label !== 'K3-TB trusted-boundary') failures.push('verification matrix trust claim label must remain K3-TB trusted-boundary');
if (matrix.trustClaim?.fullyFormalK3 !== false) failures.push('verification matrix must not mark fullyFormalK3 true');
if (matrix.trustClaim?.lean4Equivalent !== false) failures.push('verification matrix must not mark lean4Equivalent true');
if (matrix.trustClaim?.formalLean4EquivalenceProvenObligations !== 0) failures.push('verification matrix formal Lean 4 equivalence obligations must remain 0 until actually proven');
if (!matrix.purpose || !/command evidence|required|claim/i.test(matrix.purpose)) failures.push('verification matrix purpose must explain claim-to-command evidence');

const allowPrefixes = stringArray(matrix.rules?.allowedRawCommandPrefixes ?? [], 'rules.allowedRawCommandPrefixes', { allowEmpty: false });
for (const doc of stringArray(matrix.requiredDocs ?? [], 'requiredDocs', { allowEmpty: false })) {
  if (!existsRelative(doc)) failures.push(`required verification matrix doc is missing: ${doc}`);
}

const claimTypes = stringArray(matrix.claimTypes ?? [], 'claimTypes', { allowEmpty: false });
for (const claimType of claimTypes) {
  if (!validClaimTypes.has(claimType)) failures.push(`invalid claimTypes entry ${claimType}`);
}

if (!Array.isArray(matrix.claims) || matrix.claims.length === 0) failures.push('verification matrix must list claims');
const seen = new Set();
let requiredClaims = 0;
let commandCount = 0;
let rawCommandCount = 0;
let optionalClaims = 0;
let leanOptionalClaims = 0;

function rawCommandAllowed(command) {
  return allowPrefixes.some((prefix) => command.startsWith(prefix));
}

for (const claim of matrix.claims ?? []) {
  if (!claim?.id) {
    failures.push('every verification claim needs id');
    continue;
  }
  if (seen.has(claim.id)) failures.push(`duplicate verification claim id ${claim.id}`);
  seen.add(claim.id);
  if (!claim.title) failures.push(`${claim.id}: missing title`);
  if (!validClaimTypes.has(claim.claimType)) failures.push(`${claim.id}: invalid claimType ${claim.claimType}`);
  if (!validTrustImpacts.has(claim.trustImpact)) failures.push(`${claim.id}: invalid trustImpact ${claim.trustImpact}`);
  if (typeof claim.requiredForRelease !== 'boolean') failures.push(`${claim.id}: requiredForRelease must be boolean`);
  if (claim.requiredForRelease) requiredClaims += 1;
  else optionalClaims += 1;
  if (claim.claimType === 'oracle-optional') leanOptionalClaims += 1;

  const commands = stringArray(claim.commands ?? [], `${claim.id}.commands`, { allowEmpty: true });
  const rawCommands = stringArray(claim.rawCommands ?? [], `${claim.id}.rawCommands`, { allowEmpty: true });
  commandCount += commands.length;
  rawCommandCount += rawCommands.length;

  if (claim.requiredForRelease && commands.length === 0 && rawCommands.length === 0) {
    failures.push(`${claim.id}: requiredForRelease claims need commands or allowlisted rawCommands`);
  }
  for (const script of commands) {
    if (!packageJson.scripts?.[script]) failures.push(`${claim.id}: missing package script ${script}`);
  }
  for (const rawCommand of rawCommands) {
    if (!rawCommandAllowed(rawCommand)) failures.push(`${claim.id}: raw command is not allowlisted: ${rawCommand}`);
  }
  for (const ref of stringArray(claim.evidenceFiles ?? [], `${claim.id}.evidenceFiles`, { allowEmpty: true })) {
    if (!existsRelative(ref)) failures.push(`${claim.id}: evidence file is missing: ${ref}`);
  }
  for (const ref of stringArray(claim.docs ?? [], `${claim.id}.docs`, { allowEmpty: false })) {
    if (!existsRelative(ref)) failures.push(`${claim.id}: doc reference is missing: ${ref}`);
  }

  if (claim.requiredForRelease && claim.claimType === 'oracle-optional') failures.push(`${claim.id}: oracle-optional claims must not be requiredForRelease`);
  if (claim.requiredForRelease && /if-available|publish/i.test(commands.join(' '))) {
    failures.push(`${claim.id}: required release claims must not depend on if-available/publish-only commands`);
  }
}

if (requiredClaims < 5) failures.push(`verification matrix needs at least 5 required claims, got ${requiredClaims}`);
if (leanOptionalClaims < 1) failures.push('verification matrix should include one oracle-optional Lean/PROOFSCRIPT_LEAN_BIN claim');
for (const needed of ['build-integrity', 'trust-boundary-architecture', 'feature-promotion-enforced', 'kernel-smoke-and-status']) {
  if (!seen.has(needed)) failures.push(`verification matrix missing required canonical claim ${needed}`);
}

const docPath = path.join(root, 'docs', 'PRODUCTION_VERIFICATION_MATRIX.md');
if (fs.existsSync(docPath)) {
  const doc = fs.readFileSync(docPath, 'utf8');
  for (const needle of ['Production Verification Matrix', 'Claims to Commands', 'K3-TB', 'What This Does Not Prove']) {
    if (!doc.includes(needle)) failures.push(`docs/PRODUCTION_VERIFICATION_MATRIX.md missing section/text: ${needle}`);
  }
} else {
  failures.push('missing docs/PRODUCTION_VERIFICATION_MATRIX.md');
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

const summary = {
  release: matrix.release,
  trustClaim: matrix.trustClaim,
  claims: matrix.claims.length,
  requiredClaims,
  optionalClaims,
  commandCount,
  rawCommandCount,
  claimTypes: [...new Set(matrix.claims.map((claim) => claim.claimType))].sort(),
};

if (jsonOut) {
  console.log(JSON.stringify(summary, null, 2));
} else {
  console.log(`✓ verification matrix holds (${summary.claims} claims; required=${requiredClaims}; commands=${commandCount}; raw=${rawCommandCount})`);
  console.log(JSON.stringify({
    release: summary.release,
    trustClaim: summary.trustClaim.label,
    formalLean4EquivalenceProvenObligations: summary.trustClaim.formalLean4EquivalenceProvenObligations,
    claimTypes: summary.claimTypes,
  }, null, 2));
}
