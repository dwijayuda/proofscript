#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== 'object') return value;
  const out = {};
  for (const key of Object.keys(value).sort()) out[key] = canonicalize(value[key]);
  return out;
}
function stableStringify(value) { return JSON.stringify(canonicalize(value)); }
function sha256(value) { return createHash('sha256').update(typeof value === 'string' ? value : stableStringify(value)).digest('hex'); }
function readJson(path) { return JSON.parse(readFileSync(path, 'utf8')); }
function ok(id, message, details = {}) { return { id, status: 'accepted', message, details }; }
function reject(id, message, details = {}) { return { id, status: 'rejected', message, details }; }
function warn(id, message, details = {}) { return { id, status: 'warning', message, details }; }
function walkFiles(dir, predicate = () => true) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walkFiles(full, predicate));
    else if (predicate(full)) out.push(full);
  }
  return out;
}
function pkg(path) { return readJson(resolve(repoRoot, path, 'package.json')); }

function scanForbiddenImports(packageDir, forbidden) {
  const files = walkFiles(resolve(repoRoot, packageDir, 'src'), f => f.endsWith('.ts'));
  const hits = [];
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    for (const item of forbidden) {
      const needle = `from "${item}"`;
      const needle2 = `from '${item}'`;
      if (text.includes(needle) || text.includes(needle2)) hits.push({ file: relative(repoRoot, file), forbidden: item });
    }
  }
  return hits;
}

export function runGovernanceCheck(options = {}) {
  const checks = [];
  const add = c => checks.push(c);

  const constitutionFiles = [
    'docs/constitution/00_PROJECT_CONSTITUTION.md',
    'docs/constitution/01_GOVERNANCE_MODEL.md',
    'docs/constitution/02_LANGUAGE_PROFILE_GOVERNANCE.md',
    'docs/constitution/03_ARCHITECTURE_CONSTITUTION.md',
    'docs/constitution/04_TRUST_BOUNDARY_AND_PROOF_POLICY.md',
    'docs/constitution/05_DEVELOPMENT_WORKFLOW_FAST_SMOKE.md',
    'docs/constitution/06_RELEASE_AND_CONFORMANCE_GATES.md',
    'docs/constitution/07_PACKAGE_AND_MODULE_RULES.md',
    'docs/constitution/08_ROADMAP_GATES_PSC1_TO_FULL_LEAN.md',
    'docs/constitution/09_DECISION_RECORD_TEMPLATE.md',
    'docs/constitution/10_PROOF_OBLIGATION_TEMPLATE.md',
    'docs/constitution/11_AGENT_EXECUTION_PROTOCOL.md',
  ];
  const missingConstitution = constitutionFiles.filter(f => !existsSync(resolve(repoRoot, f)));
  add(missingConstitution.length === 0
    ? ok('governance.constitution.present', 'Governance/constitution bundle is checked into docs/constitution', { files: constitutionFiles.length })
    : reject('governance.constitution.present', 'Governance/constitution docs are missing', { missingConstitution }));

  const referenceFiles = [
    'docs/reference/ProofScript_Language_Reference_v0.6.1_authoritative_draft.md',
    'docs/reference/ProofScript_Parser_Lowering_API_Contract_v0.6.1.md',
  ];
  const missingReference = referenceFiles.filter(f => !existsSync(resolve(repoRoot, f)));
  add(missingReference.length === 0
    ? ok('governance.reference.present', 'Authoritative ProofScript v0.6.1 reference files are checked into docs/reference', { files: referenceFiles.length })
    : reject('governance.reference.present', 'Reference files are missing from docs/reference', { missingReference }));
  if (missingReference.length === 0) {
    const lang = readFileSync(resolve(repoRoot, referenceFiles[0]), 'utf8');
    const grammar = readFileSync(resolve(repoRoot, referenceFiles[1]), 'utf8');
    const pinned = '819816b2e0a3bf405af45ae5c7af2491d8f5bee6';
    add(lang.includes('Authoritative draft v0.6.1') && lang.includes('Lean 4.33.1') && lang.includes(pinned) && grammar.includes('Parser and Lowering API Contract')
      ? ok('governance.reference.pinned', 'Reference v0.6.1 pins Lean 4.33.1 and the expected source revision')
      : reject('governance.reference.pinned', 'Reference files do not pin the expected Lean 4.33.1 source revision'));
    add(lang.includes('TypeScript-friendly syntax where it helps; Lean semantics wherever it matters') && grammar.includes('D-CONST-ALIAS')
      ? ok('governance.reference.semantic-and-parser-rules', 'Reference v0.6.1 records semantic identity and parser/lowering feature IDs')
      : reject('governance.reference.semantic-and-parser-rules', 'Reference files lack required semantic/parser governance text'));
  }

  const root = readJson(resolve(repoRoot, 'package.json'));
  for (const script of ['build', 'test:kernel:smoke', 'test:standalone-small', 'test:governance', 'test:reference-governance', 'test:fast-smoke']) {
    add(root.scripts?.[script]
      ? ok(`governance.script.${script}`, `Required fast-development script '${script}' exists`)
      : reject(`governance.script.${script}`, `Required fast-development script '${script}' is missing`));
  }

  for (const packageDir of ['packages/kernel', 'packages/runtime', 'packages/backend-typescript', 'packages/frontend', 'packages/parser', 'packages/elaborator', 'packages/verifier']) {
    add(existsSync(resolve(repoRoot, packageDir, 'package.json'))
      ? ok(`governance.package.${packageDir}`, `${packageDir} exists as a separated package boundary`)
      : reject(`governance.package.${packageDir}`, `${packageDir} is missing`));
  }

  const rootRefs = new Set((readJson(resolve(repoRoot, 'tsconfig.json')).references ?? []).map(r => r.path));
  for (const ref of ['./packages/runtime', './packages/backend-typescript']) {
    add(rootRefs.has(ref)
      ? ok(`governance.tsconfig.${ref}`, `${ref} participates in the root build`)
      : reject(`governance.tsconfig.${ref}`, `${ref} is missing from root tsconfig references`));
  }

  const activeKernelPackages = walkFiles(resolve(repoRoot, 'packages'), f => f.endsWith('package.json'))
    .map(file => ({ file, data: readJson(file) }))
    .filter(x => x.data.name === '@proofscript/kernel')
    .map(x => relative(repoRoot, x.file));
  add(activeKernelPackages.length === 1 && activeKernelPackages[0] === 'packages/kernel/package.json'
    ? ok('governance.kernel.single-active', 'Exactly one active @proofscript/kernel package exists')
    : reject('governance.kernel.single-active', 'There must be exactly one active @proofscript/kernel package', { activeKernelPackages }));

  const kernelForbidden = scanForbiddenImports('packages/kernel', [
    '@proofscript/parser', '@proofscript/compiler', '@proofscript/runtime', '@proofscript/lsp', '@proofscript/frontend', '@proofscript/backend-typescript', '@proofscript/cli'
  ]);
  add(kernelForbidden.length === 0
    ? ok('governance.kernel.no-forbidden-imports', 'Kernel has no parser/compiler/runtime/frontend/backend/LSP imports')
    : reject('governance.kernel.no-forbidden-imports', 'Kernel imports forbidden higher-level packages', { hits: kernelForbidden }));

  const runtimeForbidden = scanForbiddenImports('packages/runtime', ['@proofscript/kernel', '@proofscript/parser', '@proofscript/frontend', '@proofscript/compiler']);
  add(runtimeForbidden.length === 0
    ? ok('governance.runtime.no-trusted-imports', 'Runtime does not import kernel/parser/frontend/compiler')
    : reject('governance.runtime.no-trusted-imports', 'Runtime imports forbidden trusted/frontend packages', { hits: runtimeForbidden }));

  const parserForbidden = scanForbiddenImports('packages/parser', ['@proofscript/backend-typescript', '@proofscript/runtime', '@proofscript/compiler', '@proofscript/kernel']);
  add(parserForbidden.length === 0
    ? ok('governance.parser.no-backend-kernel-imports', 'Parser has no backend/runtime/compiler/kernel imports')
    : reject('governance.parser.no-backend-kernel-imports', 'Parser imports forbidden backend/kernel packages', { hits: parserForbidden }));

  const backendPkg = existsSync(resolve(repoRoot, 'packages/backend-typescript/package.json')) ? pkg('packages/backend-typescript') : undefined;
  const backendDeps = Object.keys(backendPkg?.dependencies ?? {});
  const backendForbiddenDeps = backendDeps.filter(dep => ['@proofscript/parser', '@proofscript/frontend', '@proofscript/elaborator', '@proofscript/cli'].includes(dep));
  add(backendForbiddenDeps.length === 0
    ? ok('governance.backend-typescript.no-frontend-deps', 'TypeScript backend does not depend on parser/frontend/elaborator/CLI')
    : reject('governance.backend-typescript.no-frontend-deps', 'TypeScript backend depends on frontend layers', { backendForbiddenDeps }));

  const psliveText = readFileSync(resolve(repoRoot, 'tools/pslive.ts'), 'utf8');
  const psliveGodMarkers = ['function emitTerm(', 'function natCtorValue(', 'function emitJsModule(', 'const TRUST_LABEL ='];
  const remainingMarkers = psliveGodMarkers.filter(marker => psliveText.includes(marker));
  add(remainingMarkers.length === 0
    ? ok('governance.pslive.thin-cli', 'pslive is a thin CLI wrapper; backend/runtime logic moved to packages')
    : reject('governance.pslive.thin-cli', 'pslive still contains backend/runtime god-file markers', { remainingMarkers }));

  const psliveLines = psliveText.split(/\r?\n/).length;
  add(psliveLines <= 180
    ? ok('governance.pslive.size', 'pslive CLI remains small enough to audit quickly', { lines: psliveLines })
    : warn('governance.pslive.size', 'pslive CLI is still larger than the preferred audit target; split more command parsing later', { lines: psliveLines, target: 180 }));

  const legacyDir = resolve(repoRoot, 'legacy/kernel-k3tb-v71/src');
  const activeLegacyDistHits = walkFiles(resolve(repoRoot, 'packages/kernel/dist'), f => /(?:^|\/)(core|kernel|runner|level)\.(?:js|d\.ts)$/.test(f.replace(/\\/g, '/')));
  add(existsSync(legacyDir) && activeLegacyDistHits.length === 0
    ? ok('governance.legacy.quarantined', 'Old compact K3-TB kernel is legacy-only and absent from active dist')
    : reject('governance.legacy.quarantined', 'Old kernel quarantine or active-dist cleanup is invalid', { legacyExists: existsSync(legacyDir), activeLegacyDistHits: activeLegacyDistHits.map(f => relative(repoRoot, f)) }));

  const requiredFailures = checks.filter(c => c.status === 'rejected');
  const warnings = checks.filter(c => c.status === 'warning');
  const result = {
    status: requiredFailures.length === 0 ? 'accepted' : 'rejected',
    trustLabel: 'trusted-boundary standalone small subset; not fully formally equivalent to Lean 4 yet',
    policy: 'ProofScript project governance/constitution compliance smoke gate',
    checkCount: checks.length,
    warningCount: warnings.length,
    requiredFailureCount: requiredFailures.length,
    checks,
  };
  const withHash = { ...result, governanceSha256: sha256(result) };
  if (options.writeDocs) {
    const out = resolve(repoRoot, 'docs/GOVERNANCE_COMPLIANCE_SMOKE.json');
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, JSON.stringify(withHash, null, 2) + '\n');
  }
  return withHash;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const result = runGovernanceCheck({ writeDocs: args.includes('--write-docs') });
  if (args.includes('--json') || args.includes('--write-docs')) process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  else {
    process.stdout.write(`PROOFSCRIPT_GOVERNANCE=${result.status === 'accepted' ? 'PASS' : 'FAIL'}\n`);
    process.stdout.write(`checks=${result.checkCount} warnings=${result.warningCount} failures=${result.requiredFailureCount}\n`);
    process.stdout.write(`governanceSha256=${result.governanceSha256}\n`);
  }
  process.exitCode = result.status === 'accepted' ? 0 : 1;
}
