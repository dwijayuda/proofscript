function normalizeSpaces(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function safeLeanName(name) {
  return String(name ?? 'x').replace(/[^A-Za-z0-9_]+/g, '_').replace(/^([0-9])/, '_$1') || 'x';
}

function programApplication(fn) {
  return [safeLeanName(fn?.name ?? 'program'), ...(fn?.params ?? []).map(param => safeLeanName(param.name))].join(' ');
}

export function createStatefulLeanSemanticEncoding(loweringArtifact) {
  if (!loweringArtifact || loweringArtifact.schema !== 'proofscript.monadic-lowering.v1') {
    throw new Error('stateful Lean semantic encoding requires proofscript.monadic-lowering.v1');
  }

  const wpBinding = loweringArtifact.statefulWpBinding;
  const programLowering = loweringArtifact.statefulProgramLowering;
  const stateModel = loweringArtifact.stateModel ?? {};
  const fn = loweringArtifact.function ?? {};
  if (!wpBinding || wpBinding.schema !== 'proofscript.stateful-wp-binding/v1') {
    throw new Error('stateful Lean semantic encoding requires proofscript.stateful-wp-binding/v1');
  }
  if (!programLowering || programLowering.schema !== 'proofscript.stateful-program-lowering/v1') {
    throw new Error('stateful Lean semantic encoding requires proofscript.stateful-program-lowering/v1');
  }

  const stateType = normalizeSpaces(stateModel.stateType);
  const resultType = normalizeSpaces(loweringArtifact.statefulPredicateElaboration?.binders?.result?.type ?? '');
  const triple = normalizeSpaces(wpBinding.wp?.triple);
  const sourceMonad = normalizeSpaces(stateModel.monad?.name);
  const leanMonad = normalizeSpaces(programLowering.stateModel?.leanMonad);
  const diagnostics = [];

  if (triple !== 'Std.Do.Triple') {
    diagnostics.push({
      code: 'stateful-lean-encoding-unsupported-triple',
      severity: 'error',
      triple,
      message: `bounded Lean semantic encoding currently requires Std.Do.Triple, found '${triple}'`,
    });
  }
  if (!stateType || !resultType) {
    diagnostics.push({
      code: 'stateful-lean-encoding-missing-binder-types',
      severity: 'error',
      stateType: stateType || null,
      resultType: resultType || null,
      message: 'state/result binder types must be known before Lean semantic encoding',
    });
  }
  if (programLowering.programLoweringReady !== true || !programLowering.leanDefinition) {
    diagnostics.push({
      code: 'stateful-lean-encoding-program-not-ready',
      severity: 'error',
      message: 'bounded Lean program lowering must be ready before semantic encoding',
    });
  }
  if (!leanMonad || !leanMonad.startsWith('StateM ')) {
    diagnostics.push({
      code: 'stateful-lean-encoding-unsupported-monad',
      severity: 'error',
      sourceMonad: sourceMonad || null,
      leanMonad: leanMonad || null,
      message: 'bounded Lean semantic encoding currently targets StateM',
    });
  }

  const logicalPrecondition = wpBinding.precondition?.body === 'True'
    ? '__ps_initial = __ps_entry'
    : `__ps_initial = __ps_entry ∧ (${wpBinding.precondition?.body ?? 'True'})`;
  const logicalPostcondition = wpBinding.postcondition?.body ?? 'True';

  const leanPrecondition = stateType
    ? `fun __ps_initial : ${stateType} => ⌜${logicalPrecondition}⌝`
    : null;
  const leanPostcondition = resultType && stateType
    ? `⇓ __ps_result __ps_final => ⌜${logicalPostcondition}⌝`
    : null;
  const application = programApplication(fn);
  const tripleTarget = leanPrecondition && leanPostcondition && triple
    ? `${triple} (${application}) (${leanPrecondition}) (${leanPostcondition})`
    : null;

  const encodingReady = diagnostics.length === 0
    && Boolean(tripleTarget)
    && wpBinding.bindingReady === true;

  return {
    schema: 'proofscript.stateful-lean-semantic-encoding/v1',
    profile: 'std-do-statem-pure-predicate0',
    sourceSchemas: {
      lowering: loweringArtifact.schema,
      wpBinding: wpBinding.schema,
      programLowering: programLowering.schema,
    },
    monad: {
      proofScript: sourceMonad || null,
      lean: leanMonad || null,
      stateType: stateType || null,
      resultType: resultType || null,
      mappingComplete: Boolean(sourceMonad && leanMonad),
    },
    triple: {
      identity: triple || null,
      preconditionAssertionType: stateType ? `Assertion (.arg ${stateType} .pure)` : null,
      postconditionType: resultType && stateType ? `PostCond ${resultType} (.arg ${stateType} .pure)` : null,
    },
    program: {
      application,
      leanDefinition: programLowering.leanDefinition,
      leanProgramTypechecked: false,
    },
    precondition: {
      logicalBody: logicalPrecondition,
      leanSource: leanPrecondition,
      pureEmbedding: '⌜...⌝',
    },
    postcondition: {
      logicalBody: logicalPostcondition,
      leanSource: leanPostcondition,
      returnNotation: '⇓ result state => ...',
      pureEmbedding: '⌜...⌝',
    },
    tripleTarget,
    diagnostics,
    encodingReady,
    leanEnvironmentResolved: false,
    leanProgramTypechecked: false,
    tripleTargetTypechecked: false,
    wpTripleSemanticEquivalenceChecked: false,
    stateModelAdequacyChecked: false,
    realVerificationConditionsGenerated: false,
    semanticProofDischarge: false,
  };
}
