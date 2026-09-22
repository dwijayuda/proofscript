function safeLeanName(name) {
  return String(name ?? 'x').replace(/[^A-Za-z0-9_]+/g, '_').replace(/^([0-9])/, '_$1') || 'x';
}

function parameterBinders(params) {
  return (params ?? []).map(param => `(${safeLeanName(param.name)} : ${param.type})`).join(' ');
}

function uniqueStrings(values) {
  return [...new Set((values ?? []).filter(value => typeof value === 'string' && value.trim().length > 0).map(value => value.trim()))];
}

export function createStatefulVcRequest(loweringArtifact) {
  if (!loweringArtifact || loweringArtifact.schema !== 'proofscript.monadic-lowering.v1') {
    throw new Error('stateful VC request requires proofscript.monadic-lowering.v1');
  }

  const vcPlan = loweringArtifact.statefulVcPlan;
  const programLowering = loweringArtifact.statefulProgramLowering;
  const stateModel = loweringArtifact.stateModel ?? {};
  if (!vcPlan || vcPlan.schema !== 'proofscript.stateful-vc-plan/v1') {
    throw new Error('stateful VC request requires proofscript.stateful-vc-plan/v1');
  }
  if (!programLowering || programLowering.schema !== 'proofscript.stateful-program-lowering/v1') {
    throw new Error('stateful VC request requires proofscript.stateful-program-lowering/v1');
  }

  const declaredImports = uniqueStrings(stateModel.lean?.imports);
  const openNamespaces = uniqueStrings(['Std.Do', ...(stateModel.lean?.openNamespaces ?? [])]);
  const standardImports = ['Std.Tactic.Do'];
  const allImports = uniqueStrings([...standardImports, ...declaredImports]);
  const tactic = stateModel.vcgen?.tactic === 'mvcgen' ? 'mvcgen' : 'vcgen';
  const specTheorems = uniqueStrings((vcPlan.operationGoals ?? []).map(goal => goal.tripleTheorem));
  const diagnostics = [];

  if (declaredImports.length === 0) {
    diagnostics.push({
      code: 'stateful-vc-request-model-imports-unbound',
      severity: 'error',
      message: 'state model must declare lean.imports before a real Lean VC derivation request can be generated',
    });
  }
  if (programLowering.programLoweringReady !== true || !programLowering.leanDefinition) {
    diagnostics.push({
      code: 'stateful-vc-request-program-lowering-not-ready',
      severity: 'error',
      message: 'stateful program lowering must be ready before Lean VC derivation can be requested',
    });
  }
  if (vcPlan.planningReady !== true) {
    diagnostics.push({
      code: 'stateful-vc-request-plan-not-ready',
      severity: 'error',
      message: 'stateful VC plan must be ready before Lean VC derivation can be requested',
    });
  }
  if (specTheorems.length !== (vcPlan.operationGoals ?? []).length) {
    diagnostics.push({
      code: 'stateful-vc-request-spec-theorems-unbound',
      severity: 'error',
      message: 'every planned operation goal must have a bound Triple theorem identity',
    });
  }

  const fn = loweringArtifact.function ?? {};
  const requestName = `${safeLeanName(fn.name ?? 'program')}_vc_request`;
  const binders = [
    parameterBinders(fn.params ?? []),
    `(__ps_entry : ${stateModel.stateType ?? 'σ'})`,
  ].filter(Boolean).join(' ');
  const target = vcPlan.tripleGoal?.target ?? null;
  const requestSourceReady = diagnostics.length === 0 && Boolean(target);

  const leanSource = requestSourceReady
    ? `${allImports.map(moduleName => `import ${moduleName}`).join('\n')}

${openNamespaces.map(namespaceName => `open ${namespaceName}`).join('\n')}

namespace ProofScript.Generated.VCRequest

${programLowering.leanDefinition}

/-
This theorem is a VC-derivation request, not a completed proof artifact.
The runner is expected to invoke ${tactic}, capture any generated goals, and
record the result separately. Unsolved goals are expected at this stage.
-/
theorem ${requestName}${binders ? ` ${binders}` : ''} : ${target} := by
  ${tactic}${specTheorems.length ? ` [${specTheorems.join(', ')}]` : ''}
  all_goals trace_state

end ProofScript.Generated.VCRequest
`
    : null;

  return {
    schema: 'proofscript.stateful-vc-request/v1',
    function: fn.name ?? null,
    sourcePlanSchema: vcPlan.schema,
    sourceProgramLoweringSchema: programLowering.schema,
    environment: {
      standardImports,
      modelImports: declaredImports,
      allImports,
      openNamespaces,
      bindingsDeclared: declaredImports.length > 0,
      resolvedInLean: false,
    },
    tactic: {
      name: tactic,
      specificationTheorems: specTheorems,
      checkedAvailableInLean: false,
    },
    request: {
      theoremName: requestName,
      binders,
      target,
      source: leanSource,
    },
    diagnostics,
    requestSourceReady,
    executionStatus: 'not-run',
    leanEnvironmentResolved: false,
    tacticExecuted: false,
    semanticVcDerivationComplete: false,
    realVerificationConditionsGenerated: false,
    generatedGoals: [],
    stateModelAdequacyChecked: false,
    semanticProofDischarge: false,
  };
}
