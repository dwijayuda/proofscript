function normalizeSpaces(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function splitTopLevelCommaList(text) {
  const source = String(text ?? '');
  const parts = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === '(' || ch === '[' || ch === '{') depth += 1;
    else if (ch === ')' || ch === ']' || ch === '}') depth = Math.max(0, depth - 1);
    else if (depth === 0 && ch === ',') {
      parts.push(normalizeSpaces(source.slice(start, i)));
      start = i + 1;
    }
  }
  const tail = normalizeSpaces(source.slice(start));
  if (tail || parts.length > 0) parts.push(tail);
  return parts.filter(Boolean);
}

function splitTopLevelArrowType(text) {
  const source = normalizeSpaces(text);
  const parts = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === '(' || ch === '[' || ch === '{') depth += 1;
    else if (ch === ')' || ch === ']' || ch === '}') depth = Math.max(0, depth - 1);
    else if (depth === 0 && ch === '-' && source[i + 1] === '>') {
      parts.push(normalizeSpaces(source.slice(start, i)));
      start = i + 2;
      i += 1;
    }
  }
  parts.push(normalizeSpaces(source.slice(start)));
  return parts.filter(Boolean);
}

function observationSignature(observation, stateModel) {
  const parts = splitTopLevelArrowType(observation?.type ?? '');
  const allInputs = parts.slice(0, -1);
  const stateInputType = allInputs.at(-1) ?? null;
  const outputType = parts.at(-1) ?? null;
  const inputTypes = allInputs.slice(0, -1);
  const valid = parts.length >= 2
    && normalizeSpaces(stateInputType) === normalizeSpaces(stateModel?.stateType ?? '')
    && (observation?.stateArgument ?? 'last') === 'last';
  return {
    name: observation?.name,
    type: observation?.type,
    stateArgument: observation?.stateArgument ?? 'last',
    inputTypes,
    stateInputType,
    outputType,
    valid,
  };
}

function stateMonadResultType(returnType, stateModel) {
  const source = normalizeSpaces(returnType);
  const monadName = normalizeSpaces(stateModel?.monad?.name ?? '');
  if (monadName && source.startsWith(monadName + ' ')) {
    const resultType = normalizeSpaces(source.slice(monadName.length));
    return resultType || null;
  }
  const stateType = normalizeSpaces(stateModel?.stateType ?? '');
  const fallbackPrefix = stateType ? `State ${stateType} ` : '';
  if (fallbackPrefix && source.startsWith(fallbackPrefix)) {
    const resultType = normalizeSpaces(source.slice(fallbackPrefix.length));
    return resultType || null;
  }
  return null;
}

function inferSimpleValueType(expression, contract, signatures, depth = 0) {
  const source = normalizeSpaces(expression);
  if (!source || depth > 8) return { status: 'unknown', type: null, source };
  const parameter = (contract.params ?? []).find(param => param.name === source);
  if (parameter) return { status: 'known', type: parameter.type, source, evidence: 'program-parameter' };
  if (/^[0-9]+$/.test(source)) return { status: 'known', type: 'Nat', source, evidence: 'nat-literal' };
  if (/^(true|false)$/.test(source)) return { status: 'known', type: 'Bool', source, evidence: 'bool-literal' };
  if (/^"(?:[^"\\]|\\.)*"$/.test(source)) return { status: 'known', type: 'String', source, evidence: 'string-literal' };
  const call = source.match(/^([A-Za-z_][A-Za-z0-9_.]*)\s*\(([\s\S]*)\)$/);
  if (call) {
    const signature = signatures.get(call[1]);
    if (!signature?.valid) return { status: 'unknown', type: null, source };
    const args = splitTopLevelCommaList(call[2]);
    if (args.length !== signature.inputTypes.length) return { status: 'unknown', type: null, source };
    return { status: 'known', type: signature.outputType, source, evidence: 'state-observation-result' };
  }
  return { status: 'unknown', type: null, source };
}

function typedObservationReference(reference, contract, signatures) {
  const signature = signatures.get(reference.name);
  const diagnostics = [];
  if (!signature?.valid) {
    diagnostics.push({
      code: 'state-observation-signature-invalid',
      severity: 'error',
      observation: reference.name,
      message: `state observation '${reference.name}' has no valid descriptor signature`,
    });
    return { ...reference, signature: signature ?? null, argumentsTyped: [], typingStatus: 'error', diagnostics };
  }

  const args = splitTopLevelCommaList(reference.arguments);
  if (args.length !== signature.inputTypes.length) {
    diagnostics.push({
      code: 'state-observation-arity-mismatch',
      severity: 'error',
      observation: reference.name,
      expected: signature.inputTypes.length,
      actual: args.length,
      message: `state observation '${reference.name}' expects ${signature.inputTypes.length} non-state arguments but received ${args.length}`,
    });
  }

  const argumentsTyped = args.map((source, index) => {
    const expectedType = signature.inputTypes[index] ?? null;
    const inferred = inferSimpleValueType(source, contract, signatures);
    const typeMatches = inferred.status !== 'known' || expectedType === null
      ? null
      : normalizeSpaces(inferred.type) === normalizeSpaces(expectedType);
    if (typeMatches === false) {
      diagnostics.push({
        code: 'state-observation-argument-type-mismatch',
        severity: 'error',
        observation: reference.name,
        argumentIndex: index,
        expression: source,
        expectedType,
        actualType: inferred.type,
        message: `state observation '${reference.name}' argument ${index + 1} expects ${expectedType} but '${source}' has type ${inferred.type}`,
      });
    }
    return {
      index,
      source,
      expectedType,
      inferredType: inferred.type,
      inferenceStatus: inferred.status,
      evidence: inferred.evidence ?? null,
      typeMatches,
    };
  });

  const hasErrors = diagnostics.some(item => item.severity === 'error');
  const allKnown = argumentsTyped.every(argument => argument.inferenceStatus === 'known');
  return {
    ...reference,
    signature: {
      type: signature.type,
      inputTypes: signature.inputTypes,
      stateInputType: signature.stateInputType,
      outputType: signature.outputType,
      stateArgument: signature.stateArgument,
    },
    argumentsTyped,
    resultType: signature.outputType,
    typingStatus: hasErrors ? 'error' : (allKnown ? 'complete' : 'partial'),
    diagnostics,
  };
}

export function statefulPredicateElaborationForContract(contract, stateModel, postconditionIR) {
  if (!postconditionIR || postconditionIR.schema !== 'proofscript.stateful-postcondition-ir/v1') {
    throw new Error('typed stateful predicate elaboration requires proofscript.stateful-postcondition-ir/v1');
  }

  const signatures = new Map((stateModel?.observations ?? []).map(observation => {
    const signature = observationSignature(observation, stateModel);
    return [observation.name, signature];
  }));
  const diagnostics = [];
  const resultType = stateMonadResultType(contract.returnType, stateModel);

  if (!resultType) {
    diagnostics.push({
      code: 'state-return-type-mismatch',
      severity: 'error',
      returnType: contract.returnType,
      monad: stateModel?.monad?.name ?? null,
      stateType: stateModel?.stateType ?? null,
      message: 'monadic return type does not match the selected state-model monad/state type',
    });
  }

  for (const signature of [...signatures.values()].filter(item => !item.valid)) {
    diagnostics.push({
      code: 'state-observation-signature-invalid',
      severity: 'error',
      observation: signature.name,
      type: signature.type,
      stateInputType: signature.stateInputType,
      expectedStateType: stateModel?.stateType ?? null,
      message: `state observation '${signature.name}' does not take the selected state type as its final input`,
    });
  }

  const clauses = (postconditionIR.clauses ?? []).map(clause => {
    const clauseDiagnostics = [];
    const oldReferences = (clause.oldReferences ?? []).map(oldReference => {
      const observationReferences = (oldReference.observationReferences ?? []).map(reference =>
        typedObservationReference(reference, contract, signatures)
      );
      for (const reference of observationReferences) clauseDiagnostics.push(...reference.diagnostics);
      const inferred = inferSimpleValueType(oldReference.expression, contract, signatures);
      return {
        expression: oldReference.expression,
        stateRole: 'entry-state',
        inferredType: inferred.type,
        inferenceStatus: inferred.status,
        observationReferences,
        typingStatus: observationReferences.some(reference => reference.typingStatus === 'error')
          ? 'error'
          : (inferred.status === 'known' && observationReferences.every(reference => reference.typingStatus === 'complete') ? 'complete' : 'partial'),
      };
    });

    const finalStateObservationReferences = (clause.finalStateObservationReferences ?? []).map(reference =>
      typedObservationReference(reference, contract, signatures)
    );
    for (const reference of finalStateObservationReferences) clauseDiagnostics.push(...reference.diagnostics);

    const resultReferences = (clause.resultReferences ?? []).map(reference => ({
      ...reference,
      binderRole: 'result',
      type: resultType,
      typingStatus: resultType ? 'complete' : 'error',
    }));

    diagnostics.push(...clauseDiagnostics);
    const referenceTypingComplete = oldReferences.every(reference => reference.typingStatus === 'complete')
      && finalStateObservationReferences.every(reference => reference.typingStatus === 'complete')
      && resultReferences.every(reference => reference.typingStatus === 'complete');

    return {
      name: clause.name,
      source: clause.source,
      normalizedPredicate: clause.normalizedPredicate,
      oldReferences,
      resultReferences,
      finalStateObservationReferences,
      diagnostics: clauseDiagnostics,
      referenceTypingComplete,
    };
  });

  const hasTypeErrors = diagnostics.some(item => item.severity === 'error');
  const referenceTypingComplete = !hasTypeErrors && clauses.every(clause => clause.referenceTypingComplete);

  return {
    schema: 'proofscript.stateful-predicate-elaboration/v1',
    sourceIRSchema: postconditionIR.schema,
    scope: 'binder-and-state-observation-typing',
    stateModel: {
      name: stateModel?.name ?? null,
      stateType: stateModel?.stateType ?? null,
      descriptorPath: stateModel?.path ?? null,
      descriptorSha256: stateModel?.sha256 ?? null,
    },
    binders: {
      entryState: { name: '__ps_entry', role: 'entry-state', type: stateModel?.stateType ?? null },
      result: { name: '__ps_result', role: 'result', type: resultType },
      finalState: { name: '__ps_final', role: 'final-state', type: stateModel?.stateType ?? null },
    },
    parameters: (contract.params ?? []).map(param => ({ name: param.name, type: param.type })),
    observations: [...signatures.values()],
    clauses,
    diagnostics,
    hasTypeErrors,
    referenceTypingComplete,
    wholePredicateTypeCheckingComplete: false,
    wpTripleSemanticBindingComplete: false,
    stateModelAdequacyChecked: false,
    verificationConditionsGenerated: false,
    semanticElaborationComplete: false,
    vcgenConnected: false,
    semanticProofDischarge: false,
  };
}
