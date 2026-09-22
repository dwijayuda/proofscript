#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const read = (relOrAbs: string) => fs.readFileSync(path.isAbsolute(relOrAbs) ? relOrAbs : path.join(root, relOrAbs), 'utf8');
const exists = (relOrAbs: string) => fs.existsSync(path.isAbsolute(relOrAbs) ? relOrAbs : path.join(root, relOrAbs));
const readJson = (rel: string) => JSON.parse(read(rel));
const writeJson = (rel: string, value: unknown) => fs.writeFileSync(path.join(root, rel), JSON.stringify(value, null, 2) + '\n');
const ensureDir = (rel: string) => fs.mkdirSync(path.join(root, rel), { recursive: true });
const countMatches = (text: string, re: RegExp) => [...text.matchAll(re)].length;

const CHECKPOINT = 'proofscript-v1-ka32-feature-equivalence-audit0';
const VERSION = '1.0.0-pskernel.35';
const BASELINE = 'proofscript-v1-ka31-example-env-aggregate-bridge0';
const FORMAL_OBLIGATIONS = 56;

const UPLOADED_LEAN4LEAN = '/mnt/data/ka32-lean4lean-upload/lean4lean-master';
const CACHED_LEAN4LEAN = '/mnt/data/pskernel-ka11-offline-lean4lean-build/lean4lean-src/lean4lean-master';
function findLean4LeanRoot(): string {
  for (const candidate of [UPLOADED_LEAN4LEAN, CACHED_LEAN4LEAN]) {
    if (exists(path.join(candidate, 'Lean4Lean/Theory/Typing/Env.lean')) && exists(path.join(candidate, 'Lean4Lean/TypeChecker.lean'))) return candidate;
  }
  throw new Error('Lean4Lean source root not found; expected uploaded lean4lean-master(10).zip extraction or KA11 cached Lean4Lean source');
}
function hasAll(base: string, rels: string[]): boolean { return rels.every(r => exists(path.join(base, r))); }
function hasAnyText(base: string, rels: string[], patterns: RegExp[]): boolean {
  return rels.some(r => exists(path.join(base, r)) && patterns.some(p => p.test(read(path.join(base, r)))));
}
function sampleSymbols(base: string, rels: string[], patterns: RegExp[]): string[] {
  const out = new Set<string>();
  for (const r of rels) if (exists(path.join(base, r))) {
    const text = read(path.join(base, r));
    for (const p of patterns) for (const m of text.matchAll(p)) out.add(m[1] ?? m[0]);
  }
  return [...out].sort().slice(0, 40);
}

type FeatureStatus = 'bridged' | 'implemented-source' | 'partial' | 'missing-formal-bridge' | 'missing';
type Feature = {
  id: string;
  lean4KernelFeature: string;
  lean4leanEvidence: string[];
  pskernelEvidence: string[];
  status: FeatureStatus;
  formalBridgeStatus: string;
  requiredToClaimLeanEquivalence: string;
  nextMilestone: string;
};

function buildMatrix(leanRoot: string) {
  const psRoot = path.join(root, 'packages/kernel/src/PSKernel');
  assert.ok(exists(psRoot), 'PSKernel source root missing');
  const lean = (...rels: string[]) => rels;
  const ps = (...rels: string[]) => rels.map(r => `packages/kernel/src/PSKernel/${r}`);
  const ka = (n: string) => [`assurance/${n}`];

  const features: Feature[] = [
    {
      id: 'levels-universe-normalization',
      lean4KernelFeature: 'Universe levels: zero/succ/max/imax/param normalization, instantiation, comparison.',
      lean4leanEvidence: lean('Lean4Lean/Level.lean', 'Lean4Lean/Theory/VLevel.lean'),
      pskernelEvidence: ps('Level.ts', 'Theory/VLevel.ts', 'Verify/Level.ts'),
      status: hasAll(root, ps('Level.ts', 'Theory/VLevel.ts')) ? 'implemented-source' : 'missing',
      formalBridgeStatus: 'source-present; earlier V71/KA gates exist, but no full executable Lean4Lean refinement theorem for the TS level engine is counted here.',
      requiredToClaimLeanEquivalence: 'Prove PSKernel level normalization/comparison refines Lean4Lean/Lean kernel level equivalence for every level expression accepted by the codec.',
      nextMilestone: 'KA33-level-executable-refinement',
    },
    {
      id: 'core-vexpr-six-constructor-theory',
      lean4KernelFeature: 'Small formal expression theory: bvar/sort/const/app/lam/forallE used by current VExpr bridge.',
      lean4leanEvidence: lean('Lean4Lean/Theory/VExpr.lean'),
      pskernelEvidence: ps('Theory/VExpr.ts', 'Expr.ts', 'Verify/Expr.ts'),
      status: hasAll(root, ps('Theory/VExpr.ts')) ? 'bridged' : 'missing',
      formalBridgeStatus: 'covered by KA12+ translation surface and KA13..KA31 environment bridge obligations for the supported ordinary/quot slices.',
      requiredToClaimLeanEquivalence: 'Preserve this bridge while extending to all kernel expression tags or document sound erasure/blocking rules.',
      nextMilestone: 'KA36-full-expression-tag-coverage',
    },
    {
      id: 'full-lean-expression-tags',
      lean4KernelFeature: 'Full Lean Expr tags include fvar/mvar/let/lit/mdata/proj plus kernel expression operations.',
      lean4leanEvidence: lean('Lean4Lean/Expr.lean', 'Lean4Lean/TypeChecker.lean', 'Lean4Lean/Inductive/Reduce.lean'),
      pskernelEvidence: ps('Expr.ts', 'TypeChecker.ts', 'Inductive/Reduce.ts'),
      status: 'partial',
      formalBridgeStatus: 'KA12 explicitly blocked fvar/mvar/let/lit/proj from the formal translation slice; runtime/source support exists for more tags but not full formal coverage.',
      requiredToClaimLeanEquivalence: 'Add formal translation and bridge obligations for letE, literals, projections, fvar/mvar policy, and metadata erasure.',
      nextMilestone: 'KA36-full-expression-tag-coverage',
    },
    {
      id: 'ordinary-declarations',
      lean4KernelFeature: 'Axiom, definition, theorem, opaque, and example declaration admission.',
      lean4leanEvidence: lean('Lean4Lean/Declaration.lean', 'Lean4Lean/Environment.lean', 'Lean4Lean/Theory/VDecl.lean', 'Lean4Lean/Theory/Typing/Env.lean'),
      pskernelEvidence: ps('Declaration.ts', 'Environment.ts', 'Theory/VDecl.ts', 'Theory/VEnv.ts'),
      status: 'bridged',
      formalBridgeStatus: 'KA13..KA25 and KA30..KA31 provide conditional VDecl.WF, VEnv.WF, VEnv.LE, lookup, freshness, and defeq aggregate bridges for ordinary declarations.',
      requiredToClaimLeanEquivalence: 'Connect these conditional bridge facts to the executable PSKernel checker and codec, not just hand-constructed bridge witnesses.',
      nextMilestone: 'KA35-executable-typechecker-refinement',
    },
    {
      id: 'quot-declaration',
      lean4KernelFeature: 'Quotient declaration admission and quotient constants/defeq insertion.',
      lean4leanEvidence: lean('Lean4Lean/Quot.lean', 'Lean4Lean/Theory/Quot.lean', 'Lean4Lean/Theory/Typing/QuotLemmas.lean'),
      pskernelEvidence: ps('Quot.ts', 'Theory/Quot.ts'),
      status: 'bridged',
      formalBridgeStatus: 'KA26..KA29 prove conditional environment bridges for addQuot lookup, freshness/no-overwrite, defeq preservation, and aggregate packaging.',
      requiredToClaimLeanEquivalence: 'Prove quotient semantic soundness and executable refinement, not only environment-shape preservation.',
      nextMilestone: 'KA37-quotient-semantic-soundness',
    },
    {
      id: 'mutual-definitions',
      lean4KernelFeature: 'Mutual definition block admission: add constants first, then add defining equations after block checking.',
      lean4leanEvidence: lean('Lean4Lean/Environment.lean', 'Lean4Lean/Theory/Typing/Env.lean', 'Lean4Lean/Theory/Typing/EnvLemmas.lean'),
      pskernelEvidence: ps('Environment.ts', 'Theory/VDecl.ts', 'Theory/VEnv.ts'),
      status: hasAnyText(root, ps('Theory/VDecl.ts', 'Environment.ts'), [/mutualDef/, /addDefEqs/, /addConsts/]) ? 'partial' : 'missing',
      formalBridgeStatus: 'Lean4Lean has VDecl.WF.mutualDef and helper lemmas; PSKernel has source-level surfaces, but no KA counted mutualDef bridge obligations yet.',
      requiredToClaimLeanEquivalence: 'Prove VDecl.WF/VEnv.WF/VEnv.LE/lookup/defeq preservation for mutualDef blocks and then connect to executable checking.',
      nextMilestone: 'KA34-mutual-def-env-bridge',
    },
    {
      id: 'inductive-declarations',
      lean4KernelFeature: 'Inductive and mutual/nested inductive admission: parameters, constructors, positivity, recursor generation, K/large-elim/structure behavior.',
      lean4leanEvidence: lean('Lean4Lean/Inductive/Add.lean', 'Lean4Lean/Inductive/Reduce.lean', 'Lean4Lean/Theory/Inductive.lean', 'Lean4Lean/Theory/Typing/InductiveLemmas.lean'),
      pskernelEvidence: ps('Inductive/Add.ts', 'Inductive/Reduce.ts', 'Theory/Inductive.ts'),
      status: hasAll(root, ps('Inductive/Add.ts', 'Inductive/Reduce.ts')) ? 'missing-formal-bridge' : 'missing',
      formalBridgeStatus: 'PSKernel has substantial source/runtime inductive code and older V71 assurance checkpoints, but KA12..KA31 deliberately excluded inductive/mutual/nested from the Lean4Lean bridge count.',
      requiredToClaimLeanEquivalence: 'Prove addInduct/VInductDecl.WF bridge, constructor/recursor environment effects, positivity/nested preprocessing soundness, and recursor reduction correspondence.',
      nextMilestone: 'KA33-inductive-env-bridge',
    },
    {
      id: 'recursor-reduction-iota-eta-k',
      lean4KernelFeature: 'Recursor reduction, iota rules, K-like reductions, structure eta/projection behavior.',
      lean4leanEvidence: lean('Lean4Lean/Inductive/Reduce.lean', 'Lean4Lean/TypeChecker.lean', 'Lean4Lean/Verify/TypeChecker/Reduce.lean', 'Lean4Lean/Verify/TypeChecker/WHNF.lean'),
      pskernelEvidence: ps('Inductive/Reduce.ts', 'TypeChecker.ts', 'Verify/TypeChecker.ts'),
      status: 'partial',
      formalBridgeStatus: 'Runtime/source and arena evidence exist, but no full formal reduction/refinement theorem counted against Lean4Lean here.',
      requiredToClaimLeanEquivalence: 'Prove WHNF/reduction/refiner correspondence for recursor cases and projections under Lean4Lean semantics.',
      nextMilestone: 'KA38-recursor-whnf-refinement',
    },
    {
      id: 'type-inference-checking',
      lean4KernelFeature: 'Kernel inferType/check/checkType/ensureSort/ensureForall and declaration body checking.',
      lean4leanEvidence: lean('Lean4Lean/TypeChecker.lean', 'Lean4Lean/Verify/TypeChecker/InferType.lean', 'Lean4Lean/Verify/TypeChecker/Basic.lean'),
      pskernelEvidence: ps('TypeChecker.ts', 'Verify/TypeChecker.ts'),
      status: 'implemented-source',
      formalBridgeStatus: 'Implemented/source-bound but not proved as an executable refinement of Lean4Lean TypeChecker across all expression/declaration classes.',
      requiredToClaimLeanEquivalence: 'Prove executable PSKernel TypeScript checker accepts/rejects exactly the Lean4Lean checker for the declared kernel feature subset.',
      nextMilestone: 'KA35-executable-typechecker-refinement',
    },
    {
      id: 'defeq-conversion-whnf',
      lean4KernelFeature: 'Definitional equality, WHNF, delta/beta/zeta/iota/projection/quotient reductions with fuel/resource behavior.',
      lean4leanEvidence: lean('Lean4Lean/TypeChecker.lean', 'Lean4Lean/Verify/TypeChecker/IsDefEq.lean', 'Lean4Lean/Verify/TypeChecker/WHNF.lean', 'Lean4Lean/Verify/TypeChecker/Reduce.lean'),
      pskernelEvidence: ps('TypeChecker.ts', 'EquivManager.ts', 'Verify/EquivManager.ts'),
      status: 'partial',
      formalBridgeStatus: 'Runtime/source and arena evidence exist; full algorithmic conversion equivalence is not proven.',
      requiredToClaimLeanEquivalence: 'Prove PSKernel conversion/WHNF refines Lean4Lean including all supported reductions and conservative decline/error policy.',
      nextMilestone: 'KA39-defeq-whnf-refinement',
    },
    {
      id: 'environment-extension-ordering',
      lean4KernelFeature: 'Environment contains constants/defeqs and extension order LE, with addConst/addDefEq/addQuot/addInduct/addDecl effects.',
      lean4leanEvidence: lean('Lean4Lean/Theory/VEnv.lean', 'Lean4Lean/Theory/Typing/Env.lean', 'Lean4Lean/Theory/Typing/EnvLemmas.lean'),
      pskernelEvidence: ps('Theory/VEnv.ts', 'Environment.ts', 'Verify/Environment.ts'),
      status: 'bridged',
      formalBridgeStatus: 'Strongly bridged for ordinary declarations and quotient; missing formal inductive/mutual block coverage.',
      requiredToClaimLeanEquivalence: 'Complete environment bridge for inductive and mutualDef, then connect bridge to executable addDecl.',
      nextMilestone: 'KA33-inductive-env-bridge',
    },
    {
      id: 'primitive-axioms-literals',
      lean4KernelFeature: 'Primitive constants, allowed axioms, Nat/String literals, and primitive checking policy.',
      lean4leanEvidence: lean('Lean4Lean/Primitive.lean', 'Lean4Lean/Verify/Axioms.lean', 'Lean4Lean/Verify/Primitive.lean', 'Lean4Lean/Expr.lean'),
      pskernelEvidence: ps('Primitive.ts', 'Verify/Axioms.ts', 'Verify/Primitive.ts', 'Expr.ts'),
      status: 'partial',
      formalBridgeStatus: 'Source present; formal bridge for literals/primitive policy is not complete in KA counted obligations.',
      requiredToClaimLeanEquivalence: 'Prove literal expansion and primitive/axiom policy agree with Lean4Lean/Lean for all accepted exports.',
      nextMilestone: 'KA40-primitive-literal-policy-bridge',
    },
    {
      id: 'kernel-codec-export-arena',
      lean4KernelFeature: 'External proof object / lean4export ingestion and kernel-result classification.',
      lean4leanEvidence: lean('Lean4Lean/Replay.lean', 'Lean4Lean/Verify.lean', 'Main.lean'),
      pskernelEvidence: ['packages/kernel-codec/src/index.ts', 'packages/arena-checker/src/translate.ts', 'packages/arena-checker/src/classify.ts'],
      status: 'partial',
      formalBridgeStatus: 'Arena evidence exists and classifier gates pass, but codec/parser correctness is not formally connected to Lean4Lean semantics.',
      requiredToClaimLeanEquivalence: 'Prove/validate codec translation preserves declarations, levels, expressions, and decline/error semantics against Lean4Lean replay.',
      nextMilestone: 'KA41-codec-replay-refinement',
    },
    {
      id: 'resource-fuel-error-semantics',
      lean4KernelFeature: 'Fuel/resource bounded checking and distinguishing reject/decline/error from semantic rejection.',
      lean4leanEvidence: lean('Lean4Lean/FuelConfig.lean', 'Lean4Lean/KernelError.lean', 'Lean4Lean/TypeChecker.lean'),
      pskernelEvidence: ps('FuelConfig.ts', 'KernelError.ts'),
      status: 'implemented-source',
      formalBridgeStatus: 'Source present; full semantic proof of resource-policy conservativity is still open.',
      requiredToClaimLeanEquivalence: 'Prove resource exhaustion never becomes an unsound accept/reject and is classified conservatively.',
      nextMilestone: 'KA42-resource-error-conservativity',
    },
    {
      id: 'metatheory-typing-relations',
      lean4KernelFeature: 'Lean4Lean theory layer: VExpr typing, environment WF, Church-Rosser, injectivity, unique typing, strong typing lemmas.',
      lean4leanEvidence: lean('Lean4Lean/Theory/Typing/Basic.lean', 'Lean4Lean/Theory/Typing/ChurchRosser.lean', 'Lean4Lean/Theory/Typing/Injectivity.lean', 'Lean4Lean/Theory/Typing/UniqueTyping.lean', 'Lean4Lean/Theory/Typing/Strong.lean'),
      pskernelEvidence: ps('Theory.ts', 'Theory/VExpr.ts', 'Theory/VEnv.ts'),
      status: 'partial',
      formalBridgeStatus: 'KA13..KA31 import slices of this theory, but no global theorem states PSKernel implements the full theory.',
      requiredToClaimLeanEquivalence: 'Systematically connect every executable kernel rule to the corresponding Lean4Lean metatheory relation.',
      nextMilestone: 'KA43-theory-wide-refinement-map',
    },
  ];

  const sourceAudit = {
    lean4leanRoot: leanRoot,
    leanToolchain: exists(path.join(leanRoot, 'lean-toolchain')) ? read(path.join(leanRoot, 'lean-toolchain')).trim() : null,
    lean4leanFileCount: (() => {
      const walk = (d: string): string[] => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => {
        const p = path.join(d, e.name);
        return e.isDirectory() ? walk(p) : [p];
      });
      return walk(path.join(leanRoot, 'Lean4Lean')).filter(p => p.endsWith('.lean')).length;
    })(),
    pskernelFileCount: (() => {
      const walk = (d: string): string[] => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => {
        const p = path.join(d, e.name);
        return e.isDirectory() ? walk(p) : [p];
      });
      return walk(path.join(root, 'packages/kernel/src/PSKernel')).filter(p => p.endsWith('.ts')).length;
    })(),
    lean4leanKeySymbols: {
      vdeclConstructors: sampleSymbols(leanRoot, ['Lean4Lean/Theory/VDecl.lean'], [/\|\s+(axiom|def|opaque|example|quot|induct|mutualDef)\b/g]),
      venvOps: sampleSymbols(leanRoot, ['Lean4Lean/Theory/VEnv.lean', 'Lean4Lean/Theory/Typing/Env.lean', 'Lean4Lean/Theory/Quot.lean', 'Lean4Lean/Theory/Inductive.lean'], [/def\s+VEnv\.(add\w+)/g]),
      typecheckerOps: sampleSymbols(leanRoot, ['Lean4Lean/TypeChecker.lean'], [/def\s+(inferType|isDefEq|whnf|ensureSortCore|ensureForallCore|inferConstant|checkType)/g]),
    },
    pskernelKeySymbols: {
      hasInductiveSource: hasAll(root, ps('Inductive/Add.ts', 'Inductive/Reduce.ts')),
      hasTheorySource: hasAll(root, ps('Theory/VDecl.ts', 'Theory/VEnv.ts', 'Theory/VExpr.ts', 'Theory/VLevel.ts')),
      hasRuntimeCheckerSource: hasAll(root, ps('TypeChecker.ts', 'Environment.ts', 'EquivManager.ts')),
    },
  };

  const matrixSummary = {
    total: features.length,
    bridged: features.filter(f => f.status === 'bridged').length,
    implementedSource: features.filter(f => f.status === 'implemented-source').length,
    partial: features.filter(f => f.status === 'partial').length,
    missingFormalBridge: features.filter(f => f.status === 'missing-formal-bridge').length,
    missing: features.filter(f => f.status === 'missing').length,
    greenOrBridged: features.filter(f => f.status === 'bridged' || f.status === 'implemented-source').length,
    gaps: features.filter(f => f.status !== 'bridged').length,
  };
  return { features, sourceAudit, matrixSummary };
}

function markdown(matrix: ReturnType<typeof buildMatrix>, result: any): string {
  const rows = matrix.features.map(f => `| ${f.id} | ${f.status} | ${f.formalBridgeStatus.replace(/\|/g, '/')} | ${f.nextMilestone} |`).join('\n');
  const gaps = matrix.features.filter(f => f.status !== 'bridged').map((f, i) => `${i+1}. **${f.id}** → ${f.requiredToClaimLeanEquivalence}`).join('\n');
  return `# KA-32 Lean4/PSKernel Feature-Equivalence Audit\n\n` +
`**Checkpoint:** ${result.checkpoint}  \n` +
`**Version:** ${result.publicVersion}  \n` +
`**Baseline:** ${result.baseline}  \n` +
`**Core format:** ${result.coreFormat}  \n` +
`**Formal Lean4Lean bridge obligations counted:** ${FORMAL_OBLIGATIONS}\n\n` +
`## Conclusion\n\n` +
`PSKernel is **not yet feature-equivalent to the full Lean4 kernel**. It has a strong and growing source/assurance surface, and KA-13 through KA-31 provide ${FORMAL_OBLIGATIONS} counted conditional Lean4Lean bridge obligations for ordinary declarations, examples, and quotients. However, full equivalence still requires inductive/mutual declarations, full expression tag coverage, executable TypeChecker/WHNF/defeq refinement, primitive/literal policy proof, codec/replay correctness, and resource/error conservativity.\n\n` +
`## Source audit\n\n` +
`- Lean4Lean source root: \`${matrix.sourceAudit.lean4leanRoot}\`\n` +
`- Lean4Lean toolchain: \`${matrix.sourceAudit.leanToolchain}\`\n` +
`- Lean4Lean .lean files audited: ${matrix.sourceAudit.lean4leanFileCount}\n` +
`- PSKernel .ts files audited: ${matrix.sourceAudit.pskernelFileCount}\n` +
`- Lean4Lean VDecl constructors observed: ${matrix.sourceAudit.lean4leanKeySymbols.vdeclConstructors.join(', ')}\n` +
`- Lean4Lean VEnv operations observed: ${matrix.sourceAudit.lean4leanKeySymbols.venvOps.join(', ')}\n` +
`- Lean4Lean TypeChecker operations observed: ${matrix.sourceAudit.lean4leanKeySymbols.typecheckerOps.join(', ')}\n\n` +
`## Matrix summary\n\n` +
`- Total feature groups: ${matrix.matrixSummary.total}\n` +
`- Bridged: ${matrix.matrixSummary.bridged}\n` +
`- Implemented/source-present but not fully bridged: ${matrix.matrixSummary.implementedSource}\n` +
`- Partial: ${matrix.matrixSummary.partial}\n` +
`- Missing formal bridge: ${matrix.matrixSummary.missingFormalBridge}\n` +
`- Missing: ${matrix.matrixSummary.missing}\n` +
`- Gap groups still blocking a full Lean-equivalence claim: ${matrix.matrixSummary.gaps}\n\n` +
`| Feature group | Status | Current evidence boundary | Next milestone |\n|---|---:|---|---|\n${rows}\n\n` +
`## Required work before PSKernel can claim Lean4 kernel feature equivalence\n\n${gaps}\n\n` +
`## Claim boundary\n\n` +
`- Full Lean4 equivalence: **no**\n` +
`- Same theory as full Lean4: **no**\n` +
`- Fully formal K3: **no**\n` +
`- Executable PSKernel refinement proof: **no**\n` +
`- Core format changed: **no**, still 71\n` +
`- Kernel codec changed: **no**\n` +
`- Trusted PSKernel semantic change: **no**\n`;
}

export function runKA32FeatureEquivalenceAuditGate(options: { strict?: boolean; soft?: boolean } = {}) {
  ensureDir('assurance/ka32');
  const pkg = readJson('package.json');
  const lock = readJson('package-lock.json');
  const versions = readJson('versions.json');
  const ka31 = readJson('assurance/ka31/KA31_RELEASE_GATE.json');
  assert.equal(pkg.version, VERSION);
  assert.equal(lock.version, VERSION);
  assert.equal(lock.packages[''].version, VERSION);
  assert.equal(versions.implementation, VERSION);
  assert.equal(versions.packageVersion, VERSION);
  assert.equal(versions.proofscriptPublicVersion, VERSION);
  assert.equal(versions.latestLocalLineageCheckpoint, CHECKPOINT);
  assert.equal(versions.kernelArtifactFormat, 71);
  assert.equal(versions.certificateFormat, 2);
  assert.equal(versions.formalLean4EquivalenceProvenObligations, FORMAL_OBLIGATIONS);
  assert.equal(ka31.checkpoint, BASELINE);
  assert.equal(ka31.claimBoundary?.formalLean4EquivalenceProvenObligations, FORMAL_OBLIGATIONS);

  const leanRoot = findLean4LeanRoot();
  const matrix = buildMatrix(leanRoot);
  const claimBoundary = {
    trustedKernelSemanticChange: false,
    kernelCodecChange: false,
    newTrustedComputationRule: false,
    fullLean4Equivalence: false,
    sameTheoryAsFullLean4: false,
    fullyFormalK3: false,
    executablePSKernelRefinementProof: false,
    quotientSemanticSoundness: false,
    formalLean4EquivalenceProvenObligations: FORMAL_OBLIGATIONS,
  };
  const requiredNextMilestones = [...new Set(matrix.features.filter(f => f.status !== 'bridged').map(f => f.nextMilestone))].sort();
  const overclaimGuards: string[] = [];
  if (claimBoundary.fullLean4Equivalence) overclaimGuards.push('full_lean4_equivalence_overclaimed');
  if (claimBoundary.sameTheoryAsFullLean4) overclaimGuards.push('same_theory_overclaimed');
  if (claimBoundary.executablePSKernelRefinementProof) overclaimGuards.push('executable_refinement_overclaimed');
  if (matrix.matrixSummary.gaps === 0 && !claimBoundary.fullLean4Equivalence) overclaimGuards.push('matrix_claim_inconsistent');

  const result = {
    checkpoint: CHECKPOINT,
    publicVersion: VERSION,
    baseline: BASELINE,
    coreFormat: 71,
    certificateFormat: 2,
    actualLean4LeanSourceAudited: true,
    pskernelSourceAudited: true,
    featureMatrixGenerated: true,
    strictAuditPassed: overclaimGuards.length === 0,
    sourceAudit: matrix.sourceAudit,
    matrixSummary: matrix.matrixSummary,
    requiredNextMilestones,
    overclaimGuards,
    claimBoundary,
  };
  const parity = {
    checkpoint: CHECKPOINT,
    publicVersion: VERSION,
    baseline: BASELINE,
    generatedAtUtc: '2026-09-19T02:35:00Z',
    sourceAudit: matrix.sourceAudit,
    matrixSummary: matrix.matrixSummary,
    features: matrix.features,
    requiredNextMilestones,
    claimBoundary,
  };
  writeJson('assurance/ka32/lean4-pskernel-feature-parity-matrix.json', parity);
  fs.writeFileSync(path.join(root, 'assurance/ka32/LEAN4_PSKERNEL_FEATURE_PARITY_ANALYSIS.md'), markdown(matrix, result));
  writeJson('assurance/ka32/KA32_RELEASE_GATE.json', {
    checkpoint: CHECKPOINT,
    publicVersion: VERSION,
    baseline: BASELINE,
    kernel: { activeKernel: 'PSKernel', coreFormat: 71, certificateFormat: 2 },
    featureEquivalenceAudit: {
      actualLean4LeanSourceAudited: true,
      pskernelSourceAudited: true,
      totalFeatureGroups: matrix.matrixSummary.total,
      bridgedFeatureGroups: matrix.matrixSummary.bridged,
      gapFeatureGroups: matrix.matrixSummary.gaps,
      requiredNextMilestones,
    },
    claimBoundary,
    blockedReasons: overclaimGuards,
  });
  writeJson('assurance/ka32/KA32_VERIFICATION_SUMMARY.json', {
    checkpoint: CHECKPOINT,
    publicVersion: VERSION,
    requiredCommands: {
      'npm run test:pskernel:ka32': 'pending-current-run',
      'npm run assurance:ka32': 'pending-current-run',
      'npm run build -- --pretty false': 'pending-current-run',
    },
    matrixSummary: matrix.matrixSummary,
    claimBoundary,
  });
  fs.writeFileSync(path.join(root, 'assurance/ka32/KA32_REPORT.md'), `# KA-32 Feature-Equivalence Audit Report\n\nSee \`assurance/ka32/LEAN4_PSKERNEL_FEATURE_PARITY_ANALYSIS.md\` for the detailed feature-parity matrix.\n\n- Checkpoint: ${CHECKPOINT}\n- Public version: ${VERSION}\n- Baseline: ${BASELINE}\n- Formal Lean4Lean bridge obligations counted: ${FORMAL_OBLIGATIONS}\n- Full Lean4 equivalence: no\n- Same theory as full Lean4: no\n- Executable refinement proof: no\n`);

  if (options.strict) assert.deepEqual(overclaimGuards, []);
  return result;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const strict = process.argv.includes('--strict');
  const soft = process.argv.includes('--soft');
  try {
    const result = runKA32FeatureEquivalenceAuditGate({ strict, soft });
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    if (soft) {
      console.log(JSON.stringify({ status: 'soft-failed', error: err instanceof Error ? err.message : String(err) }, null, 2));
      process.exit(0);
    }
    throw err;
  }
}
