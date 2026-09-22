#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
let root = defaultRoot;
let manifestArg = null;
let jsonOut = false;
for (let i = 0; i < args.length; i += 1) {
  if (args[i] === '--root') {
    root = path.resolve(args[i + 1]);
    i += 1;
  } else if (args[i] === '--manifest') {
    manifestArg = args[i + 1];
    i += 1;
  } else if (args[i] === '--json') {
    jsonOut = true;
  }
}

const manifestPath = manifestArg
  ? path.resolve(root, manifestArg)
  : path.join(root, 'config', 'package-classification.json');
const failures = [];
const requiredHeadings = [
  '## Production Role',
  '## Trust Boundary',
  '## Extension Points',
  '## Verification',
  '## Non-Claims',
];

function rel(file) {
  return path.relative(root, file).split(path.sep).join('/');
}

function loadJson(file, label = rel(file)) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    failures.push(`failed to read ${label}: ${error.message}`);
    return null;
  }
}

function requireContains(text, needle, label) {
  if (!text.includes(needle)) failures.push(`${label} missing required text: ${needle}`);
}

const manifest = loadJson(manifestPath, 'package classification manifest');
if (!manifest) {
  console.error(failures.join('\n'));
  process.exit(1);
}

if (manifest.trustClaim?.label !== 'K3-TB trusted-boundary') failures.push('package docs gate requires K3-TB trusted-boundary trust label');
if (manifest.trustClaim?.fullyFormalK3 !== false) failures.push('package docs gate must not allow fullyFormalK3 true');
if (manifest.trustClaim?.lean4Equivalent !== false) failures.push('package docs gate must not allow lean4Equivalent true');
if (manifest.trustClaim?.formalLean4EquivalenceProvenObligations !== 0) failures.push('formal Lean 4 equivalence obligations must remain 0 until actually proven');

const stablePath = Array.isArray(manifest.stablePsc1Path) ? manifest.stablePsc1Path : [];
const packages = Array.isArray(manifest.packages) ? manifest.packages : [];
const byPath = new Map(packages.map((entry) => [entry.path, entry]));
let docsChecked = 0;
const tierCounts = {};

for (const packagePath of stablePath) {
  const entry = byPath.get(packagePath);
  if (!entry) {
    failures.push(`stable PSC-1 package is not classified: ${packagePath}`);
    continue;
  }
  if (entry.lifecycle !== 'canonical') failures.push(`${packagePath} must be canonical to require canonical docs`);
  if (!['trusted', 'language', 'execution'].includes(entry.tier)) failures.push(`${packagePath} has invalid canonical tier ${entry.tier}`);
  tierCounts[entry.tier] = (tierCounts[entry.tier] ?? 0) + 1;

  const readmePath = path.join(root, packagePath, 'README.md');
  if (!fs.existsSync(readmePath)) {
    failures.push(`missing canonical package README: ${packagePath}/README.md`);
    continue;
  }
  docsChecked += 1;
  const readme = fs.readFileSync(readmePath, 'utf8');
  const label = `${packagePath}/README.md`;

  requireContains(readme, `# ${entry.npmName}`, label);
  for (const heading of requiredHeadings) requireContains(readme, heading, label);
  requireContains(readme, entry.productionRole, label);
  requireContains(readme, entry.trustBoundary, label);
  requireContains(readme, `Tier: ${entry.tier}`, label);
  requireContains(readme, `Lifecycle: ${entry.lifecycle}`, label);
  requireContains(readme, 'K3-TB trusted-boundary', label);
  requireContains(readme, 'not fully formal K3', label);
  requireContains(readme, 'not proven equivalent to Lean 4', label);
  requireContains(readme, 'feature promotion gate', label);
  requireContains(readme, 'npm run test:architecture', label);

  if (entry.tier === 'trusted') {
    requireContains(readme, 'TCB-adjacent', label);
    requireContains(readme, 'must not import runtime, backend, product, plugin, bridge, or experimental layers', label);
  }
  if (entry.tier === 'execution') {
    requireContains(readme, 'must not validate proofs', label);
  }
}

const guidePath = path.join(root, 'docs', 'PRODUCTION_CANONICAL_PACKAGE_GUIDE.md');
if (!fs.existsSync(guidePath)) {
  failures.push('missing docs/PRODUCTION_CANONICAL_PACKAGE_GUIDE.md');
} else {
  const guide = fs.readFileSync(guidePath, 'utf8');
  for (const needle of ['Canonical Package Guide', 'Package Responsibilities', 'How to Add a Feature', 'What This Does Not Prove', 'K3-TB']) {
    requireContains(guide, needle, 'docs/PRODUCTION_CANONICAL_PACKAGE_GUIDE.md');
  }
  for (const packagePath of stablePath) requireContains(guide, packagePath, 'docs/PRODUCTION_CANONICAL_PACKAGE_GUIDE.md');
}

if (failures.length) {
  if (jsonOut) {
    console.log(JSON.stringify({ ok: false, failures, docsChecked, stablePathCount: stablePath.length, tierCounts }, null, 2));
  } else {
    console.error(failures.join('\n'));
  }
  process.exit(1);
}

const summary = {
  ok: true,
  release: manifest.release,
  trustClaim: manifest.trustClaim.label,
  formalLean4EquivalenceProvenObligations: manifest.trustClaim.formalLean4EquivalenceProvenObligations,
  stablePathCount: stablePath.length,
  docsChecked,
  requiredHeadings,
  tierCounts,
};

if (jsonOut) console.log(JSON.stringify(summary, null, 2));
else {
  console.log(`✓ canonical package docs hold (${docsChecked}/${stablePath.length} canonical packages documented)`);
  console.log(JSON.stringify({
    trustClaim: summary.trustClaim,
    formalLean4EquivalenceProvenObligations: summary.formalLean4EquivalenceProvenObligations,
    tierCounts,
  }, null, 2));
}
