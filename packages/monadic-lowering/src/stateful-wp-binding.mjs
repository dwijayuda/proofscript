import { createHash } from 'node:crypto';

function sha256Text(text) {
  return createHash('sha256').update(String(text)).digest('hex');
}

function normalizeSpaces(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function logicalPrecondition(fn) {
  const requirements = (fn?.requirements ?? []).map(item => item.proposition).filter(Boolean);
  return normalizeSpaces(requirements.join(' ∧ ') || 'True');
}

function logicalPostcondition(fn, postconditionIR) {
  const normalized = (postconditionIR?.clauses ?? []).map(clause => clause.normalizedPredicate).filter(Boolean);
  if (normalized.length > 0) return normalizeSpaces(normalized.join(' ∧ '));
  const ensures = (fn?.ensures ?? []).map(item => item.proposition ?? item.rawProposition).filter(Boolean);
  const frames = (fn?.frames ?? []).map(item => item.proposition ?? item.rawProposition).filter(Boolean);
  return normalizeSpaces([...ensures, ...frames].join(' ∧ ') || 'True');
}

export function createStatefulWpBinding(contractArtifact) {
  if (!contractArtifact || contractArtifact.schema !== 'proofscript.contracts.v1') {
    throw new Error('stateful WP binding requires proofscript.contracts.v1');
  }
  if (contractArtifact.contractKind !== 'monadic-stateful') {
    throw new Error('stateful WP binding requires a monadic-stateful contract artifact');
  }
  if (!Array.isArray(contractArtifact.functions) || contractArtifact.functions.length !== 1) {
    throw new Error('stateful WP binding expects exactly one monadic function in this alpha');
  }

  const fn = contractArtifact.functions[0];
  const stateModel = contractArtifact.stateModel ?? {};
  const ir = contractArtifact.statefulPostconditionIR;
  const elaboration = contractArtifact.statefulPredicateElaboration;
  const ast = contractArtifact.statefulPredicateAST;
  if (!ir || ir.schema !== 'proofscript.stateful-postcondition-ir/v1') {
    throw new Error('stateful WP binding requires proofscript.stateful-postcondition-ir/v1');
  }
  if (!elaboration || elaboration.schema !== 'proofscript.stateful-predicate-elaboration/v1') {
    throw new Error('stateful WP binding requires proofscript.stateful-predicate-elaboration/v1');
  }
  if (!ast || ast.schema !== 'proofscript.stateful-predicate-ast/v1') {
    throw new Error('stateful WP binding requires proofscript.stateful-predicate-ast/v1');
  }

  const stateType = stateModel.stateType ?? null;
  const triple = stateModel.wp?.triple ?? null;
  const preconditionKind = stateModel.wp?.precondition ?? null;
  const postconditionKind = stateModel.wp?.postcondition ?? null;
  const runner = stateModel.semantics?.runner ?? null;
  const adequacyTheorem = stateModel.semantics?.adequacyTheorem ?? null;
  const stateModelOperationByName = new Map((stateModel.operations ?? []).map(operation => [operation.name, operation]));
  const operationBindings = (fn.operations ?? []).map(operation => {
    const modelOperation = stateModelOperationByName.get(operation.operation);
    const tripleTheorem = modelOperation?.verification?.tripleTheorem ?? null;
    return {
      index: operation.index,
      operation: operation.operation,
      text: operation.text,
      tripleTheorem,
      identityBound: typeof tripleTheorem === 'string' && tripleTheorem.length > 0,
      theoremChecked: false,
    };
  });
  const operationTripleTheoremIdentitiesBound = operationBindings.every(operation => operation.identityBound);

  const preconditionBody = logicalPrecondition(fn);
  const preconditionFunction = preconditionBody === 'True'
    ? `fun __ps_initial : ${stateType} => __ps_initial = __ps_entry`
    : `fun __ps_initial : ${stateType} => __ps_initial = __ps_entry ∧ (${preconditionBody})`;
  const postconditionBody = logicalPostcondition(fn, ir);
  const postconditionFunction = `fun __ps_result __ps_final => ${postconditionBody}`;

  const requiredIdentitiesBound = [
    stateType,
    triple,
    preconditionKind,
    postconditionKind,
    runner,
    adequacyTheorem,
  ].every(value => typeof value === 'string' && value.length > 0);
  const typedRequirementsReady = ast.requirementsTypeCheckingComplete === true
    && (ast.requirements ?? []).every(requirement => requirement.typeCheckingComplete === true && requirement.inferredType === 'Prop');
  const typedPostconditionsReady = ast.postconditionsTypeCheckingComplete === true
    && (ast.clauses ?? []).every(clause => clause.typeCheckingComplete === true && clause.inferredType === 'Prop');
  const typedPredicateReady = ast.typeCheckingComplete === true
    && typedRequirementsReady
    && typedPostconditionsReady;
  const bindingReady = requiredIdentitiesBound
    && operationTripleTheoremIdentitiesBound
    && typedPredicateReady;

  return {
    schema: 'proofscript.stateful-wp-binding/v1',
    sourceSchemas: {
      contract: contractArtifact.schema,
      postconditionIR: ir.schema,
      predicateElaboration: elaboration.schema,
      predicateAST: ast.schema,
    },
    stateModel: {
      name: stateModel.name ?? null,
      path: stateModel.path ?? null,
      sha256: stateModel.sha256 ?? null,
      stateType,
    },
    wp: {
      triple,
      preconditionKind,
      postconditionKind,
    },
    semantics: {
      runner,
      adequacyTheorem,
      runnerIdentityBound: Boolean(runner),
      adequacyTheoremIdentityBound: Boolean(adequacyTheorem),
      adequacyTheoremChecked: false,
    },
    binders: {
      entryState: elaboration.binders?.entryState ?? null,
      result: elaboration.binders?.result ?? null,
      finalState: elaboration.binders?.finalState ?? null,
    },
    operations: operationBindings,
    precondition: {
      body: preconditionBody,
      functionSource: preconditionFunction,
      sha256: sha256Text(preconditionFunction),
      requirements: (ast.requirements ?? []).map(requirement => ({
        name: requirement.name,
        normalizedPredicate: requirement.normalizedPredicate,
        inferredType: requirement.inferredType,
        typeCheckingComplete: requirement.typeCheckingComplete,
      })),
      typeCheckingComplete: typedRequirementsReady,
      semanticType: preconditionKind,
    },
    postcondition: {
      body: postconditionBody,
      functionSource: postconditionFunction,
      sha256: sha256Text(postconditionFunction),
      clauses: (ast.clauses ?? []).map(clause => ({
        name: clause.name,
        kind: clause.kind ?? 'ensures',
        normalizedPredicate: clause.normalizedPredicate,
        inferredType: clause.inferredType,
        typeCheckingComplete: clause.typeCheckingComplete,
      })),
      typeCheckingComplete: typedPostconditionsReady,
      semanticType: postconditionKind,
    },
    predicateAstSha256: sha256Text(JSON.stringify(ast)),
    requiredIdentitiesBound,
    operationTripleTheoremIdentitiesBound,
    typedRequirementsReady,
    typedPostconditionsReady,
    typedPredicateReady,
    bindingReady,
    bindingStatus: bindingReady ? 'typed-predicate-bound-to-wp-identities' : 'blocked',
    wpTripleIdentityBindingComplete: bindingReady,
    wpTripleSemanticEquivalenceChecked: false,
    stateModelAdequacyChecked: false,
    exceptionalPathsCovered: false,
    verificationConditionsGenerated: false,
    vcgenConnected: false,
    semanticProofDischarge: false,
  };
}
