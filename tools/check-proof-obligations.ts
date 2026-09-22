#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
let ledgerArg = null;
let jsonOut = false;
for (let i = 0; i < args.length; i += 1) {
  if (args[i] === '--ledger') {
    ledgerArg = args[i + 1];
    i += 1;
  } else if (args[i] === '--json') {
    jsonOut = true;
  }
}

const ledgerPath = ledgerArg ? path.resolve(root, ledgerArg) : path.join(root, 'config', 'proof-obligations-ledger.json');
const packageJsonPath = path.join(root, 'package.json');
const failures = [];
const validAreas = new Set(['kernel', 'core', 'elaborator', 'stdlib', 'backend', 'runtime', 'artifacts', 'governance', 'lean-oracle', 'architecture']);
const validStates = new Set(['open', 'evidence-only', 'blocked-external-lean', 'proved']);
const validCurrentClaims = new Set(['not-proven', 'engineering-evidence-only', 'trusted-boundary', 'blocked-on-lean-oracle']);

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

const ledger = loadJson(ledgerPath);
const packageJson = loadJson(packageJsonPath);
if (!ledger || !packageJson) {
  console.error(failures.join('\n'));
  process.exit(1);
}

if (ledger.schemaVersion !== 1) failures.push(`proof obligation ledger schemaVersion must be 1, got ${ledger.schemaVersion}`);
if (!/^P\d+(?:\.\d+)+$/.test(ledger.release ?? '')) failures.push(`proof obligation ledger release must be a production release id like P5.6, got ${ledger.release}`);
if (ledger.trustClaim?.label !== 'K3-TB trusted-boundary') failures.push('proof obligation ledger trust claim label must remain K3-TB trusted-boundary');
if (ledger.trustClaim?.fullyFormalK3 !== false) failures.push('proof obligation ledger must not mark fullyFormalK3 true');
if (ledger.trustClaim?.lean4Equivalent !== false) failures.push('proof obligation ledger must not mark lean4Equivalent true');
if (ledger.trustClaim?.formalLean4EquivalenceProvenObligations !== 0) failures.push('proof obligation ledger formal Lean 4 equivalence obligations must remain 0 until actually proven');
if (!ledger.purpose || !/proof|obligation|overclaim/i.test(ledger.purpose)) failures.push('proof obligation ledger purpose must explain proof obligations / overclaim prevention');

for (const doc of stringArray(ledger.requiredDocs ?? [], 'requiredDocs')) {
  if (!existsRelative(doc)) failures.push(`required proof-obligation doc is missing: ${doc}`);
}

for (const state of ['open', 'evidence-only', 'blocked-external-lean', 'proved']) {
  if (!ledger.states?.[state]) failures.push(`proof obligation ledger must define state ${state}`);
}

const allowedClaims = new Set(stringArray(ledger.rules?.allowedCurrentClaims ?? [], 'rules.allowedCurrentClaims'));
for (const claim of validCurrentClaims) {
  if (!allowedClaims.has(claim)) failures.push(`rules.allowedCurrentClaims missing ${claim}`);
}

const canonicalFormalObligations = stringArray(ledger.canonicalFormalObligations ?? [], 'canonicalFormalObligations');
if (canonicalFormalObligations.length < 6) failures.push(`proof obligation ledger needs at least 6 canonical formal obligations, got ${canonicalFormalObligations.length}`);

if (!Array.isArray(ledger.obligations) || ledger.obligations.length === 0) failures.push('proof obligation ledger must list obligations');
const seen = new Set();
let requiredForFormalLean4Equivalence = 0;
let provedFormalLean4EquivalenceObligations = 0;
const stateCounts = {};
const areaCounts = {};

for (const obligation of ledger.obligations ?? []) {
  if (!obligation?.id) {
    failures.push('every proof obligation needs id');
    continue;
  }
  if (seen.has(obligation.id)) failures.push(`duplicate proof obligation id ${obligation.id}`);
  seen.add(obligation.id);
  if (!obligation.title) failures.push(`${obligation.id}: missing title`);
  if (!validAreas.has(obligation.area)) failures.push(`${obligation.id}: invalid area ${obligation.area}`);
  if (!validStates.has(obligation.state)) failures.push(`${obligation.id}: invalid state ${obligation.state}`);
  if (!validCurrentClaims.has(obligation.currentClaim)) failures.push(`${obligation.id}: invalid currentClaim ${obligation.currentClaim}`);
  if (typeof obligation.requiredForFormalLean4Equivalence !== 'boolean') failures.push(`${obligation.id}: requiredForFormalLean4Equivalence must be boolean`);
  if (obligation.requiredForFormalLean4Equivalence) requiredForFormalLean4Equivalence += 1;
  if (obligation.requiredForFormalLean4Equivalence && obligation.state === 'proved') provedFormalLean4EquivalenceObligations += 1;
  stateCounts[obligation.state] = (stateCounts[obligation.state] ?? 0) + 1;
  areaCounts[obligation.area] = (areaCounts[obligation.area] ?? 0) + 1;

  for (const ref of stringArray(obligation.evidenceFiles ?? [], `${obligation.id}.evidenceFiles`)) {
    if (!existsRelative(ref)) failures.push(`${obligation.id}: evidence file is missing: ${ref}`);
  }
  const commands = stringArray(obligation.verificationCommands ?? [], `${obligation.id}.verificationCommands`, { allowEmpty: obligation.state !== 'proved' });
  for (const command of commands) {
    if (!packageJson.scripts?.[command]) failures.push(`${obligation.id}: verification command is not a package script: ${command}`);
  }
  for (const step of stringArray(obligation.nextProofWork ?? [], `${obligation.id}.nextProofWork`)) {
    if (!/prove|formal|spec|define|map|write|pin|document|separate|require|replace|expand/i.test(step)) {
      failures.push(`${obligation.id}: nextProofWork item should be concrete proof/spec work: ${step}`);
    }
  }
  const proofArtifacts = obligation.proofArtifacts ?? [];
  if (!Array.isArray(proofArtifacts)) failures.push(`${obligation.id}: proofArtifacts must be an array when present`);
  if (obligation.state === 'proved') {
    if (!proofArtifacts.length) failures.push(`${obligation.id}: proved obligations need proofArtifacts`);
    if (!commands.length) failures.push(`${obligation.id}: proved obligations need verificationCommands`);
    for (const ref of proofArtifacts) {
      if (typeof ref !== 'string' || ref.length === 0) failures.push(`${obligation.id}: proofArtifacts contains invalid item`);
      else if (!existsRelative(ref)) failures.push(`${obligation.id}: proof artifact is missing: ${ref}`);
    }
  } else if (proofArtifacts.length) {
    failures.push(`${obligation.id}: non-proved obligations must not list proofArtifacts as completed proof evidence`);
  }
  if (obligation.state !== 'proved' && /proved|equivalent to lean|fully formal/i.test(obligation.currentClaim)) {
    failures.push(`${obligation.id}: non-proved obligation currentClaim must not overclaim: ${obligation.currentClaim}`);
  }
}

for (const canonical of canonicalFormalObligations) {
  if (!seen.has(canonical)) failures.push(`missing canonical proof obligation ${canonical}`);
}
for (const needed of ['kernel-lean4-equivalence', 'core-type-soundness', 'elaborator-elaboration-soundness', 'backend-semantic-preservation', 'runtime-observable-semantics', 'artifact-replay-soundness']) {
  if (!seen.has(needed)) failures.push(`missing canonical proof obligation ${needed}`);
}
if (requiredForFormalLean4Equivalence < 6) failures.push(`need at least 6 obligations required for formal Lean 4 equivalence, got ${requiredForFormalLean4Equivalence}`);
if (provedFormalLean4EquivalenceObligations !== ledger.trustClaim.formalLean4EquivalenceProvenObligations) {
  failures.push(`trust claim proven obligation count (${ledger.trustClaim.formalLean4EquivalenceProvenObligations}) must equal actually proved required obligations (${provedFormalLean4EquivalenceObligations})`);
}
if (provedFormalLean4EquivalenceObligations > 0) failures.push(`${ledger.release} must not mark any formal Lean 4 equivalence obligations as proved without reviewed formal artifacts`);

const docPath = path.join(root, 'docs', 'PRODUCTION_PROOF_OBLIGATION_LEDGER.md');
if (fs.existsSync(docPath)) {
  const doc = fs.readFileSync(docPath, 'utf8');
  for (const needle of ['Production Proof Obligation Ledger', 'K3-TB', 'What This Proves', 'What This Does Not Prove', 'How to Upgrade an Obligation']) {
    if (!doc.includes(needle)) failures.push(`docs/PRODUCTION_PROOF_OBLIGATION_LEDGER.md missing section/text: ${needle}`);
  }
} else {
  failures.push('missing docs/PRODUCTION_PROOF_OBLIGATION_LEDGER.md');
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

const summary = {
  release: ledger.release,
  trustClaim: ledger.trustClaim,
  obligations: ledger.obligations.length,
  requiredForFormalLean4Equivalence,
  provedFormalLean4EquivalenceObligations,
  stateCounts,
  areaCounts,
};

if (jsonOut) {
  console.log(JSON.stringify(summary, null, 2));
} else {
  console.log(`✓ proof obligation ledger holds (${summary.obligations} obligations; requiredForFormalLean4Equivalence=${requiredForFormalLean4Equivalence}; proved=${provedFormalLean4EquivalenceObligations})`);
  console.log(JSON.stringify({
    release: summary.release,
    trustClaim: summary.trustClaim.label,
    formalLean4EquivalenceProvenObligations: summary.trustClaim.formalLean4EquivalenceProvenObligations,
    stateCounts: summary.stateCounts,
  }, null, 2));
}
