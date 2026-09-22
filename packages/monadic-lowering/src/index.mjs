import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createStatefulWpBinding } from './stateful-wp-binding.mjs';
import { createStatefulProgramLowering } from './stateful-program-lowering.mjs';
import { createStatefulVcPlan } from './stateful-vc-plan.mjs';
import { createStatefulLeanSemanticEncoding } from './stateful-lean-semantic-encoding.mjs';
import { createStatefulVcRequest } from './stateful-vc-request.mjs';
import {
  analyzeStatefulVcExecution,
  classifyLeanResidualGoals,
  createStatefulVcGoalArtifact,
  firstStatefulVcFailedStage,
} from './stateful-vc-execution.mjs';
import {
  MINIMUM_STATEFUL_LEAN_VERSION,
  classifyLeanCompatibilityOutput,
  compareLeanCompatibilityVersions,
  parseLeanCompatibilityVersion,
} from './lean-compatibility.mjs';

export {
  createStatefulWpBinding,
  createStatefulProgramLowering,
  createStatefulVcPlan,
  createStatefulLeanSemanticEncoding,
  createStatefulVcRequest,
  analyzeStatefulVcExecution,
  classifyLeanResidualGoals,
  createStatefulVcGoalArtifact,
  firstStatefulVcFailedStage,
  MINIMUM_STATEFUL_LEAN_VERSION,
  classifyLeanCompatibilityOutput,
  compareLeanCompatibilityVersions,
  parseLeanCompatibilityVersion,
};

export function sha256Text(text) {
  return createHash('sha256').update(String(text)).digest('hex');
}
export function sha256File(file) {
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}
function normalizeSpaces(s) { return String(s ?? '').replace(/\s+/g, ' ').trim(); }
function safeLeanName(name) {
  return String(name ?? 'x').replace(/[^A-Za-z0-9_]+/g, '_').replace(/^([0-9])/, '_$1') || 'x';
}
function programParameterBinderText(params) {
  return (params ?? []).map(x => `(${x.name} : ${x.type})`).join(' ');
}
function monadNameFromStateModel(stateModel) {
  return stateModel?.monad?.name ?? stateModel?.monad?.typeConstructor ?? 'State';
}
function tripleNameFromStateModel(stateModel) {
  return stateModel?.wp?.triple ?? 'Std.Do.Triple';
}
function preconditionFromStateModel(stateModel) {
  return stateModel?.wp?.precondition ?? `${stateModel?.stateType ?? 'σ'} -> Prop`;
}
function postconditionFromStateModel(stateModel) {
  return stateModel?.wp?.postcondition ?? `α -> ${stateModel?.stateType ?? 'σ'} -> Prop`;
}
function stateModelFromArtifact(artifact) {
  const sm = artifact?.stateModel;
  if (!sm || typeof sm !== 'object') throw new Error('monadic lowering requires a bound stateModel object in the contract artifact');
  return sm;
}
function contractFunctionFromArtifact(artifact) {
  if (!artifact || artifact.schema !== 'proofscript.contracts.v1') throw new Error('expected proofscript.contracts.v1 artifact');
  if (artifact.contractKind !== 'monadic-stateful') throw new Error('monadic lowering requires a monadic-stateful contract artifact');
  if (!Array.isArray(artifact.functions) || artifact.functions.length !== 1) throw new Error('monadic lowering expects exactly one function in this alpha');
  return artifact.functions[0];
}
function logicalPrecondition(fn) {
  const reqs = (fn.requirements ?? []).map(r => r.proposition).filter(Boolean);
  return normalizeSpaces(reqs.join(' ∧ ') || 'True');
}
function logicalPostcondition(fn, postconditionIR) {
  const normalized = (postconditionIR?.clauses ?? []).map(clause => clause.normalizedPredicate).filter(Boolean);
  if (normalized.length > 0) return normalizeSpaces(normalized.join(' ∧ '));
  const ensures = (fn.ensures ?? []).map(e => e.proposition ?? e.rawProposition).filter(Boolean);
  return normalizeSpaces(ensures.join(' ∧ ') || 'True');
}
function operationSkeletons(fn, stateModel) {
  return (fn.operations ?? []).map(op => ({
    index: op.index,
    operation: op.operation,
    text: op.text,
    args: op.args ?? [],
    stateModelOperation: (stateModel.operations ?? []).find(candidate => candidate.name === op.operation) ?? null,
    loweringStatus: 'operation-spec-bound-structurally',
    vcgenLoweringStatus: 'not-connected',
  }));
}

export function createMonadicLoweringArtifact({ contractArtifact, contractArtifactPath, contractArtifactSha256, packageVersion, checkpoint = 'KA-145 monadic contract lowering skeleton' } = {}) {
  const fn = contractFunctionFromArtifact(contractArtifact);
  const stateModel = stateModelFromArtifact(contractArtifact);
  const statefulWpBinding = createStatefulWpBinding(contractArtifact);
  if (contractArtifact.verification?.profile === 'ps3-monadic-contracts0' && statefulWpBinding.bindingReady !== true) {
    throw new Error('strict monadic profile invariant violated: typed predicate is not ready for WP/Triple identity binding');
  }
  const statefulProgramLowering = createStatefulProgramLowering(contractArtifact);
  if (contractArtifact.verification?.profile === 'ps3-monadic-contracts0' && statefulProgramLowering.programLoweringReady !== true) {
    throw new Error('strict monadic profile invariant violated: modeled operation sequence is not ready for Lean program lowering');
  }
  const parameterBinders = programParameterBinderText(fn.params ?? []);
  const entryStateBinder = `(__ps_entry : ${stateModel.stateType})`;
  const binders = [parameterBinders, entryStateBinder].filter(Boolean).join(' ');
  const theoremName = `${safeLeanName(fn.name)}_triple`;
  const triple = tripleNameFromStateModel(stateModel);
  const preconditionBody = statefulWpBinding.precondition.body;
  const precondition = statefulWpBinding.precondition.functionSource;
  const postconditionBody = statefulWpBinding.postcondition.body;
  const postcondition = statefulWpBinding.postcondition.functionSource;
  const monad = monadNameFromStateModel(stateModel);
  const programName = safeLeanName(fn.name);
  const statement = `theorem ${theoremName}${binders ? ` ${binders}` : ''} : ${triple} (${programName}${(fn.params ?? []).map(p => ` ${p.name}`).join(' ')}) (${precondition}) (${postcondition})`;
  const statefulVcPlan = createStatefulVcPlan({
    contractArtifact,
    wpBinding: statefulWpBinding,
    programLowering: statefulProgramLowering,
    tripleTheoremName: theoremName,
    tripleTheoremStatement: statement,
  });
  if (contractArtifact.verification?.profile === 'ps3-monadic-contracts0' && statefulVcPlan.planningReady !== true) {
    throw new Error('strict monadic profile invariant violated: stateful VC planning inputs are incomplete');
  }
  const operations = operationSkeletons(fn, stateModel);
  const obligations = (contractArtifact.obligations ?? []).map(o => ({
    id: o.id,
    name: o.name,
    kind: o.kind,
    statement: o.statement ?? o.proposition,
    theoremStatement: o.exactTheoremStatement ?? o.theoremStatement,
    loweringRole: String(o.kind ?? '').startsWith('monadic.operation') ? 'operation-specification' : 'postcondition',
    vcgenLoweringStatus: 'not-connected',
    leanCheckable: false,
  }));
  const artifact = {
    schema: 'proofscript.monadic-lowering.v1',
    checkpoint,
    packageVersion,
    source: contractArtifact.source ? { path: contractArtifact.source, sha256: contractArtifact.sourceSha256 } : undefined,
    contractsArtifact: { path: contractArtifactPath, sha256: contractArtifactSha256 },
    verification: contractArtifact.verification,
    statefulPostconditionIR: contractArtifact.statefulPostconditionIR,
    statefulPredicateElaboration: contractArtifact.statefulPredicateElaboration,
    statefulPredicateAST: contractArtifact.statefulPredicateAST,
    statefulOperationElaboration: contractArtifact.statefulOperationElaboration,
    statefulWpBinding,
    statefulProgramLowering,
    statefulVcPlan,
    contractKind: 'monadic-stateful',
    function: { name: fn.name, params: fn.params ?? [], returnType: fn.returnType, body: fn.body },
    stateModel: {
      name: stateModel.name,
      path: stateModel.path,
      sha256: stateModel.sha256,
      stateType: stateModel.stateType,
      monad: stateModel.monad,
      wp: stateModel.wp,
      semantics: stateModel.semantics,
      lean: stateModel.lean,
      operations: stateModel.operations ?? [],
      observations: stateModel.observations ?? [],
      laws: stateModel.laws ?? [],
      vcgen: stateModel.vcgen ?? { status: 'not-connected' },
    },
    tripleSkeleton: {
      theoremName,
      theoremStatement: statement,
      theoremSha256: sha256Text(statement),
      triple,
      monad,
      entryStateBinder: { name: '__ps_entry', type: stateModel.stateType },
      preconditionBody,
      postconditionBody,
      precondition,
      postcondition,
      preconditionKind: preconditionFromStateModel(stateModel),
      postconditionKind: postconditionFromStateModel(stateModel),
      modelAdequacyTheorem: stateModel?.semantics?.adequacyTheorem ?? null,
      modelAdequacyChecked: false,
      loweringStatus: 'std-do-triple-skeleton',
      vcgenLoweringStatus: 'not-connected',
      leanCheckable: false,
    },
    operations,
    obligations,
    summary: {
      operations: operations.length,
      obligations: obligations.length,
      hasStdDoTripleSkeleton: true,
      statefulReferenceTypingComplete: contractArtifact.statefulPredicateElaboration?.referenceTypingComplete === true,
      normalizedPredicateAstTypeCheckingComplete: contractArtifact.statefulPredicateAST?.typeCheckingComplete === true,
      stateOperationTypingComplete: contractArtifact.statefulOperationElaboration?.typingComplete === true,
      statefulWpIdentityBindingReady: statefulWpBinding.bindingReady === true,
      statefulProgramLoweringReady: statefulProgramLowering.programLoweringReady === true,
      statefulVcPlanningReady: statefulVcPlan.planningReady === true,
      semanticVcDerivationComplete: false,
      realVerificationConditionsGenerated: false,
      wholePredicateTypeCheckingComplete: false,
      vcgenConnected: false,
      semanticProofDischarge: false,
    },
    trustBoundary: {
      descriptorBound: true,
      modelAdequacyTheoremBound: Boolean(stateModel?.semantics?.adequacyTheorem),
      modelAdequacyChecked: false,
      verificationProfile: contractArtifact.verification?.profile ?? null,
      specifiedStructuralProfile: contractArtifact.verification?.profile === 'ps3-monadic-contracts0',
      stdDoTripleSkeletonGenerated: true,
      statefulReferenceTypingComplete: contractArtifact.statefulPredicateElaboration?.referenceTypingComplete === true,
      normalizedPredicateAstTypeCheckingComplete: contractArtifact.statefulPredicateAST?.typeCheckingComplete === true,
      stateOperationTypingComplete: contractArtifact.statefulOperationElaboration?.typingComplete === true,
      statefulProgramLoweringReady: statefulProgramLowering.programLoweringReady === true,
      sourceToLeanProgramEquivalenceChecked: false,
      leanProgramTypechecked: false,
      wpTripleIdentityBindingComplete: statefulWpBinding.wpTripleIdentityBindingComplete === true,
      statefulVcPlanningReady: statefulVcPlan.planningReady === true,
      semanticVcDerivationComplete: false,
      realVerificationConditionsGenerated: false,
      wpTripleSemanticEquivalenceChecked: false,
      stateModelAdequacyChecked: false,
      wholePredicateTypeCheckingComplete: false,
      semanticProofChecking: false,
      vcgenConnected: false,
      monadicProofDischarge: false,
      hiddenAxiomsIntroduced: false,
      fullLean4Equivalence: false,
    },
  };
  const statefulLeanSemanticEncoding = createStatefulLeanSemanticEncoding(artifact);
  artifact.statefulLeanSemanticEncoding = statefulLeanSemanticEncoding;
  artifact.summary.statefulLeanSemanticEncodingReady = statefulLeanSemanticEncoding.encodingReady === true;
  artifact.trustBoundary.statefulLeanSemanticEncodingReady = statefulLeanSemanticEncoding.encodingReady === true;
  artifact.trustBoundary.tripleTargetTypecheckedInLean = false;
  const statefulVcRequest = createStatefulVcRequest(artifact);
  artifact.statefulVcRequest = statefulVcRequest;
  artifact.summary.statefulVcRequestSourceReady = statefulVcRequest.requestSourceReady === true;
  artifact.summary.leanVcEnvironmentResolved = false;
  artifact.trustBoundary.statefulVcRequestSourceReady = statefulVcRequest.requestSourceReady === true;
  artifact.trustBoundary.leanVcEnvironmentResolved = false;
  artifact.trustBoundary.vcgenExecuted = false;
  return artifact;
}

export function leanForMonadicLoweringArtifact(artifact) {
  const fn = artifact.function;
  const stateModel = artifact.stateModel;
  const triple = artifact.tripleSkeleton;
  const programLowering = artifact.statefulProgramLowering;
  const params = (fn.params ?? []).map(p => `(${p.name} : ${p.type})`).join(' ');
  const operations = (artifact.operations ?? []).map(op => `-- operation ${op.index}: ${op.text}\n--   model spec: ${op.stateModelOperation?.spec ?? 'not found in descriptor'}`).join('\n');
  const obligations = (artifact.obligations ?? []).map(o => `-- obligation ${o.name}\n--   kind: ${o.kind}\n--   statement: ${o.statement}`).join('\n');
  return `/-
ProofScript KA-145 monadic/stateful lowering skeleton.

This file is intentionally a skeleton. It records the planned Lean Std.Do.Triple-style
shape for a monadic ProofScript contract. The bounded modeled operation sequence is
lowered deterministically to a Lean do body, but this file still does not claim that
program declaration or the Triple proof has been checked in the selected Lean environment.
A later checkpoint must typecheck the semantic program and derive real verification conditions.
-/

-- import Std.Do.Triple  -- intended Lean-side dependency when the selected Lean lane supports it

namespace ProofScript.Generated

/-- State model: ${stateModel.name}
    state type: ${stateModel.stateType}
    monad: ${stateModel.monad?.name ?? stateModel.monad?.typeConstructor ?? '<missing>'}
    triple: ${triple.triple}
    vcgen status: ${stateModel.vcgen?.status ?? 'not-connected'} -/

-- Deterministic lowering of the bounded modeled operation sequence.
-- This declaration is the semantic program target for future Lean VC derivation,
-- but this KA-145 skeleton does not itself typecheck it in the selected Lean environment.
${programLowering?.leanDefinition ?? `-- stateful program lowering unavailable for ${safeLeanName(fn.name)}`}

/-- Planned Hoare/Triple skeleton. Not checked as a completed proof in KA-145. -/
${triple.theoremStatement} := by
  -- precondition kind: ${triple.preconditionKind}
  -- postcondition kind: ${triple.postconditionKind}
  -- vcgen/mvcgen connection: not connected in KA-145
  admit

${operations ? operations + '\n\n' : ''}${obligations ? obligations + '\n\n' : ''}end ProofScript.Generated
`;
}

export function createMonadicLoweringBundle({ contractArtifact, contractArtifactPath, contractArtifactSha256, packageVersion, checkpoint }) {
  const artifact = createMonadicLoweringArtifact({ contractArtifact, contractArtifactPath, contractArtifactSha256, packageVersion, checkpoint });
  return { artifact, leanText: leanForMonadicLoweringArtifact(artifact) };
}

export function readMonadicLoweringInput(file) {
  const resolved = path.resolve(process.cwd(), file);
  const contractArtifact = JSON.parse(fs.readFileSync(resolved, 'utf8'));
  const contractArtifactSha256 = sha256File(resolved);
  return { resolved, contractArtifact, contractArtifactSha256 };
}

const LEAN_BUILTIN_TYPE_NAMES = new Set(['Nat', 'Int', 'Bool', 'String', 'Unit', 'Prop', 'Type', 'Sort', 'State']);
function leanIdentifier(name) { return safeLeanName(name); }
function collectTypeTokens(text) {
  return [...String(text ?? '').matchAll(/\b[A-Z][A-Za-z0-9_]*\b/g)].map(m => m[0]);
}
function collectCustomTypesForPreflight(artifact) {
  const out = new Set();
  for (const p of artifact?.function?.params ?? []) for (const t of collectTypeTokens(p.type)) out.add(t);
  for (const t of collectTypeTokens(artifact?.function?.returnType)) out.add(t);
  for (const op of artifact?.stateModel?.operations ?? []) for (const t of collectTypeTokens(op.type ?? op.spec ?? '')) out.add(t);
  for (const t of collectTypeTokens(artifact?.stateModel?.stateType)) out.add(t);
  for (const t of [...out]) if (LEAN_BUILTIN_TYPE_NAMES.has(t)) out.delete(t);
  return [...out].sort();
}
function parseOperationType(typeText) {
  const pieces = String(typeText ?? '').split('->').map(s => s.trim()).filter(Boolean);
  if (pieces.length <= 1) return { args: [], returnType: typeText || 'Unit' };
  return { args: pieces.slice(0, -1), returnType: pieces.at(-1) };
}
function leanArgBinders(prefix, argTypes) {
  return argTypes.map((type, i) => `(${prefix}${i + 1} : ${type})`).join(' ');
}
function preflightOperationDefs(stateModel) {
  return (stateModel?.operations ?? []).map(op => {
    const parsed = parseOperationType(op.type);
    const binders = leanArgBinders('x', parsed.args);
    const ret = parsed.returnType || 'Unit';
    return `/-- Preflight stub for state operation ${op.name}. Not a semantic implementation. -/\ndef ${leanIdentifier(op.name)}${binders ? ` ${binders}` : ''} : ${ret} := ps_pure ()`;
  }).join('\n\n');
}
function preflightParams(fn) {
  return (fn?.params ?? []).map(p => `(${leanIdentifier(p.name)} : ${p.type})`).join(' ');
}
function preflightProgramArgs(fn) {
  return (fn?.params ?? []).map(p => ` ${leanIdentifier(p.name)}`).join('');
}
function preflightStateType(artifact) {
  return artifact?.stateModel?.stateType ?? 'σ';
}
function preflightReturnType(artifact) {
  return artifact?.function?.returnType ?? `State ${preflightStateType(artifact)} Unit`;
}

export function leanPreflightForMonadicLoweringArtifact(artifact) {
  if (!artifact || artifact.schema !== 'proofscript.monadic-lowering.v1') throw new Error('expected proofscript.monadic-lowering.v1 artifact');
  const fn = artifact.function ?? {};
  const stateModel = artifact.stateModel ?? {};
  const customTypeAxioms = collectCustomTypesForPreflight(artifact).map(t => `axiom ${leanIdentifier(t)} : Type`).join('\n');
  const params = preflightParams(fn);
  const programArgs = preflightProgramArgs(fn);
  const theoremName = `${leanIdentifier(artifact.tripleSkeleton?.theoremName ?? `${fn.name ?? 'program'}_triple`)}_preflight`;
  const returnType = preflightReturnType(artifact);
  const stateType = preflightStateType(artifact);
  const operations = preflightOperationDefs(stateModel);
  const originalTheorem = artifact.tripleSkeleton?.theoremStatement ?? '<missing theorem statement>';
  const obligationComments = (artifact.obligations ?? []).map(o => `-- obligation ${o.name}: ${o.statement ?? o.theoremStatement ?? '<missing>'}`).join('\n');
  return `/-
ProofScript KA-146 Lean-checkable monadic skeleton preflight.

This file is a preflight stub, not a semantic proof. It intentionally replaces the
state model, operations, program body, precondition, and postcondition with explicit
Lean constants/definitions that make the skeleton shape checkable. The original
planned theorem is preserved as a comment below and remains the semantic target for
a future vcgen/mvcgen checkpoint.

Original planned theorem:
${originalTheorem}
-/

set_option autoImplicit false

namespace ProofScript.Generated.Preflight

${customTypeAxioms || '-- no custom type stubs required'}

abbrev State (σ : Type) (α : Type) : Type := σ -> (α × σ)

def ps_pure {σ : Type} {α : Type} (a : α) : State σ α := fun s => (a, s)

def Triple {σ : Type} {α : Type} (_program : State σ α) (_pre : σ -> Prop) (_post : α -> σ -> Prop) : Prop := True

${operations || '-- no operation stubs declared by the state model'}

/-- Preflight program body stub. Not the executable or semantic body. -/
def ${leanIdentifier(fn.name ?? 'program')}${params ? ` ${params}` : ''} : ${returnType} := ps_pure ()

/-- Preflight theorem stub. This checks the plumbing shape only. -/
theorem ${theoremName}${params ? ` ${params}` : ''} :
    Triple (${leanIdentifier(fn.name ?? 'program')}${programArgs}) (fun _s : ${stateType} => True) (fun _result _s => True) := by
  trivial

${obligationComments || '-- no obligations recorded'}

end ProofScript.Generated.Preflight
`;
}

export function createMonadicLeanPreflightArtifact({ loweringArtifact, loweringArtifactPath, loweringArtifactSha256, preflightLeanPath, preflightLeanSha256, leanRun, packageVersion, checkpoint = 'KA-146 Lean-checkable monadic skeleton preflight' } = {}) {
  if (!loweringArtifact || loweringArtifact.schema !== 'proofscript.monadic-lowering.v1') throw new Error('expected proofscript.monadic-lowering.v1 artifact');
  const originalStatement = loweringArtifact.tripleSkeleton?.theoremStatement ?? '';
  const report = {
    schema: 'proofscript.monadic-preflight.v1',
    checkpoint,
    packageVersion,
    command: 'monadic-preflight',
    loweringArtifact: { path: loweringArtifactPath, sha256: loweringArtifactSha256 },
    verification: loweringArtifact.verification,
    statefulPostconditionIR: loweringArtifact.statefulPostconditionIR,
    statefulPredicateElaboration: loweringArtifact.statefulPredicateElaboration,
    statefulPredicateAST: loweringArtifact.statefulPredicateAST,
    statefulOperationElaboration: loweringArtifact.statefulOperationElaboration,
    statefulWpBinding: loweringArtifact.statefulWpBinding,
    statefulProgramLowering: loweringArtifact.statefulProgramLowering,
    statefulVcPlan: loweringArtifact.statefulVcPlan,
    statefulLeanSemanticEncoding: loweringArtifact.statefulLeanSemanticEncoding,
    statefulVcRequest: loweringArtifact.statefulVcRequest,
    function: loweringArtifact.function?.name,
    stateModel: loweringArtifact.stateModel?.name,
    originalTripleSkeleton: {
      theoremName: loweringArtifact.tripleSkeleton?.theoremName,
      theoremSha256: loweringArtifact.tripleSkeleton?.theoremSha256,
      theoremStatement: originalStatement,
    },
    leanPreflightStub: preflightLeanPath ? { path: preflightLeanPath, sha256: preflightLeanSha256, checkableAsSemanticProof: false } : undefined,
    staticChecks: {
      schemaAccepted: true,
      hasTripleSkeleton: Boolean(loweringArtifact.tripleSkeleton),
      hasStateModelBinding: Boolean(loweringArtifact.stateModel),
      hasStatefulPostconditionIR: Boolean(loweringArtifact.statefulPostconditionIR),
      hasStatefulPredicateElaboration: Boolean(loweringArtifact.statefulPredicateElaboration),
      hasStatefulPredicateAST: Boolean(loweringArtifact.statefulPredicateAST),
      statefulReferenceTypingComplete: loweringArtifact.statefulPredicateElaboration?.referenceTypingComplete === true,
      normalizedPredicateAstTypeCheckingComplete: loweringArtifact.statefulPredicateAST?.typeCheckingComplete === true,
      hasStatefulOperationElaboration: Boolean(loweringArtifact.statefulOperationElaboration),
      stateOperationTypingComplete: loweringArtifact.statefulOperationElaboration?.typingComplete === true,
      hasStatefulWpBinding: Boolean(loweringArtifact.statefulWpBinding),
      hasStatefulProgramLowering: Boolean(loweringArtifact.statefulProgramLowering),
      statefulProgramLoweringReady: loweringArtifact.statefulProgramLowering?.programLoweringReady === true,
      leanProgramTypechecked: loweringArtifact.statefulProgramLowering?.leanProgramTypechecked === true,
      statefulWpIdentityBindingReady: loweringArtifact.statefulWpBinding?.bindingReady === true,
      hasStatefulVcPlan: Boolean(loweringArtifact.statefulVcPlan),
      statefulVcPlanningReady: loweringArtifact.statefulVcPlan?.planningReady === true,
      hasStatefulLeanSemanticEncoding: Boolean(loweringArtifact.statefulLeanSemanticEncoding),
      statefulLeanSemanticEncodingReady: loweringArtifact.statefulLeanSemanticEncoding?.encodingReady === true,
      tripleTargetTypecheckedInLean: loweringArtifact.statefulLeanSemanticEncoding?.tripleTargetTypechecked === true,
      hasStatefulVcRequest: Boolean(loweringArtifact.statefulVcRequest),
      statefulVcRequestSourceReady: loweringArtifact.statefulVcRequest?.requestSourceReady === true,
      leanVcEnvironmentResolved: loweringArtifact.statefulVcRequest?.leanEnvironmentResolved === true,
      vcgenExecuted: loweringArtifact.statefulVcRequest?.tacticExecuted === true,
      semanticVcDerivationComplete: loweringArtifact.statefulVcPlan?.semanticVcDerivationComplete === true,
      realVerificationConditionsGenerated: loweringArtifact.statefulVcPlan?.realVerificationConditionsGenerated === true,
      wholePredicateTypeCheckingComplete: loweringArtifact.statefulPredicateElaboration?.wholePredicateTypeCheckingComplete === true,
      statefulPostconditionSemanticElaborationComplete: loweringArtifact.statefulPostconditionIR?.semanticElaborationComplete === true,
      hasExplicitStubBoundary: true,
      originalTheoremPreservedAsComment: Boolean(originalStatement),
      preflightUsesTrueTripleStub: true,
      hiddenSemanticProofClaims: false,
    },
    leanRun: leanRun ?? { status: 'skipped', reason: 'no --lean-cmd provided' },
    summary: {
      preflightStubGenerated: Boolean(preflightLeanPath),
      leanCommandRan: Boolean(leanRun && leanRun.status !== 'skipped'),
      leanCommandPassed: leanRun?.status === 'passed',
      semanticProofDischarge: false,
      vcgenConnected: false,
    },
    trustBoundary: {
      preflightOnly: true,
      verificationProfile: loweringArtifact.verification?.profile ?? null,
      specifiedStructuralProfile: loweringArtifact.verification?.profile === 'ps3-monadic-contracts0',
      statefulReferenceTypingComplete: loweringArtifact.statefulPredicateElaboration?.referenceTypingComplete === true,
      normalizedPredicateAstTypeCheckingComplete: loweringArtifact.statefulPredicateAST?.typeCheckingComplete === true,
      stateOperationTypingComplete: loweringArtifact.statefulOperationElaboration?.typingComplete === true,
      statefulProgramLoweringReady: loweringArtifact.statefulProgramLowering?.programLoweringReady === true,
      sourceToLeanProgramEquivalenceChecked: false,
      leanProgramTypechecked: false,
      wpTripleIdentityBindingComplete: loweringArtifact.statefulWpBinding?.wpTripleIdentityBindingComplete === true,
      statefulVcPlanningReady: loweringArtifact.statefulVcPlan?.planningReady === true,
      statefulLeanSemanticEncodingReady: loweringArtifact.statefulLeanSemanticEncoding?.encodingReady === true,
      tripleTargetTypecheckedInLean: false,
      statefulVcRequestSourceReady: loweringArtifact.statefulVcRequest?.requestSourceReady === true,
      leanVcEnvironmentResolved: false,
      vcgenExecuted: false,
      semanticVcDerivationComplete: false,
      realVerificationConditionsGenerated: false,
      wpTripleSemanticEquivalenceChecked: false,
      stateModelAdequacyChecked: false,
      wholePredicateTypeCheckingComplete: false,
      explicitStubs: true,
      preflightStubAxioms: true,
      checkableAsCompleteSemanticProof: false,
      semanticProofChecking: false,
      monadicProofDischarge: false,
      vcgenConnected: false,
      fullLean4Equivalence: false,
    },
  };
  return report;
}

export function createMonadicLeanPreflightBundle({ loweringArtifact, loweringArtifactPath, loweringArtifactSha256, preflightLeanPath, preflightLeanSha256, leanRun, packageVersion, checkpoint } = {}) {
  const leanText = leanPreflightForMonadicLoweringArtifact(loweringArtifact);
  const report = createMonadicLeanPreflightArtifact({ loweringArtifact, loweringArtifactPath, loweringArtifactSha256, preflightLeanPath, preflightLeanSha256, leanRun, packageVersion, checkpoint });
  return { leanText, report };
}

export function readMonadicLoweringArtifact(file) {
  const resolved = path.resolve(process.cwd(), file);
  const loweringArtifact = JSON.parse(fs.readFileSync(resolved, 'utf8'));
  const loweringArtifactSha256 = sha256File(resolved);
  if (loweringArtifact.schema !== 'proofscript.monadic-lowering.v1') throw new Error('expected proofscript.monadic-lowering.v1 artifact');
  return { resolved, loweringArtifact, loweringArtifactSha256 };
}
