import { createHash } from 'node:crypto';

function sha256Text(text) {
  return createHash('sha256').update(String(text)).digest('hex');
}

function obligationForOperation(contractArtifact, operation) {
  return (contractArtifact.obligations ?? []).find(obligation =>
    obligation.kind === 'monadic.operation.spec'
    && obligation.label === `${operation.index}.${operation.operation}`
  ) ?? null;
}

function obligationForPostcondition(contractArtifact, clause) {
  return (contractArtifact.obligations ?? []).find(obligation =>
    obligation.kind === 'monadic.ensures'
    && obligation.label === clause.name
  ) ?? null;
}

function programApplication(fn) {
  return `${fn.name}${(fn.params ?? []).map(param => ` ${param.name}`).join('')}`;
}

export function createStatefulVcPlan({ contractArtifact, wpBinding, programLowering, tripleTheoremName, tripleTheoremStatement } = {}) {
  if (!contractArtifact || contractArtifact.schema !== 'proofscript.contracts.v1') {
    throw new Error('stateful VC plan requires proofscript.contracts.v1');
  }
  if (!wpBinding || wpBinding.schema !== 'proofscript.stateful-wp-binding/v1') {
    throw new Error('stateful VC plan requires proofscript.stateful-wp-binding/v1');
  }
  if (!programLowering || programLowering.schema !== 'proofscript.stateful-program-lowering/v1') {
    throw new Error('stateful VC plan requires proofscript.stateful-program-lowering/v1');
  }
  if (!Array.isArray(contractArtifact.functions) || contractArtifact.functions.length !== 1) {
    throw new Error('stateful VC plan expects exactly one function in this alpha');
  }

  const fn = contractArtifact.functions[0];
  const ast = contractArtifact.statefulPredicateAST;
  if (!ast || ast.schema !== 'proofscript.stateful-predicate-ast/v1') {
    throw new Error('stateful VC plan requires proofscript.stateful-predicate-ast/v1');
  }

  const operationGoals = (fn.operations ?? []).map(operation => {
    const binding = (wpBinding.operations ?? []).find(candidate =>
      candidate.index === operation.index && candidate.operation === operation.operation
    ) ?? null;
    const obligation = obligationForOperation(contractArtifact, operation);
    return {
      id: obligation?.id ?? `${fn.name}.monadic.operation.spec.${operation.index}.${operation.operation}`,
      kind: 'operation-triple-theorem-application',
      operationIndex: operation.index,
      operation: operation.operation,
      call: operation.text,
      args: operation.args ?? [],
      tripleTheorem: binding?.tripleTheorem ?? null,
      theoremIdentityBound: binding?.identityBound === true,
      theoremChecked: false,
      sourceObligation: obligation ? {
        id: obligation.id,
        statementSha256: obligation.statementSha256,
        theoremSha256: obligation.theoremSha256,
      } : null,
      semanticDerivationComplete: false,
      discharged: false,
    };
  });

  const postconditionGoals = (ast.clauses ?? []).map(clause => {
    const obligation = obligationForPostcondition(contractArtifact, clause);
    return {
      id: obligation?.id ?? `${fn.name}.monadic.ensures.${clause.name}`,
      kind: 'typed-postcondition-goal',
      clause: clause.name,
      normalizedPredicate: clause.normalizedPredicate,
      inferredType: clause.inferredType,
      typeCheckingComplete: clause.typeCheckingComplete,
      sourceObligation: obligation ? {
        id: obligation.id,
        statementSha256: obligation.statementSha256,
        theoremSha256: obligation.theoremSha256,
      } : null,
      semanticDerivationComplete: false,
      discharged: false,
    };
  });

  const tripleTarget = `${wpBinding.wp.triple} (${programApplication(fn)}) (${wpBinding.precondition.functionSource}) (${wpBinding.postcondition.functionSource})`;
  const tripleGoal = {
    id: `${fn.name}.stateful.triple`,
    kind: 'overall-triple-goal',
    theoremName: tripleTheoremName ?? null,
    theoremStatement: tripleTheoremStatement ?? null,
    target: tripleTarget,
    targetSha256: sha256Text(tripleTarget),
    preconditionSha256: wpBinding.precondition.sha256,
    postconditionSha256: wpBinding.postcondition.sha256,
    semanticDerivationComplete: false,
    discharged: false,
  };

  const operationTheoremIdentitiesBound = operationGoals.every(goal => goal.theoremIdentityBound);
  const typedGoalsReady = postconditionGoals.every(goal =>
    goal.typeCheckingComplete === true && goal.inferredType === 'Prop'
  );
  const sourceObligationsBound = [...operationGoals, ...postconditionGoals].every(goal => Boolean(goal.sourceObligation));
  const programLoweringReady = programLowering.programLoweringReady === true;
  const planningReady = wpBinding.bindingReady === true
    && programLoweringReady
    && operationTheoremIdentitiesBound
    && typedGoalsReady
    && sourceObligationsBound;

  return {
    schema: 'proofscript.stateful-vc-plan/v1',
    function: fn.name,
    sourceSchemas: {
      contract: contractArtifact.schema,
      wpBinding: wpBinding.schema,
      programLowering: programLowering.schema,
      predicateAST: ast.schema,
    },
    provenance: {
      stateModel: wpBinding.stateModel,
      predicateAstSha256: wpBinding.predicateAstSha256,
      programLeanDefinitionSha256: programLowering.leanDefinition ? sha256Text(programLowering.leanDefinition) : null,
      preconditionSha256: wpBinding.precondition.sha256,
      postconditionSha256: wpBinding.postcondition.sha256,
    },
    tripleGoal,
    operationGoals,
    postconditionGoals,
    summary: {
      operationGoals: operationGoals.length,
      postconditionGoals: postconditionGoals.length,
      totalPlannedGoals: operationGoals.length + postconditionGoals.length + 1,
      programLoweringReady,
      operationTheoremIdentitiesBound,
      typedGoalsReady,
      sourceObligationsBound,
      planningReady,
    },
    planningReady,
    semanticVcDerivationComplete: false,
    realVerificationConditionsGenerated: false,
    exceptionalPathsCovered: false,
    vcgenConnected: false,
    semanticProofDischarge: false,
  };
}
