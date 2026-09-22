function normalizeSpaces(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function splitTopLevelArrowType(typeText) {
  const source = normalizeSpaces(typeText);
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

function inferSimpleArgumentType(sourceText, contract) {
  const source = normalizeSpaces(sourceText);
  const parameter = (contract.params ?? []).find(param => param.name === source);
  if (parameter) return { status: 'known', type: parameter.type, evidence: 'program-parameter' };
  if (/^[0-9]+$/.test(source)) return { status: 'known', type: 'Nat', evidence: 'nat-literal' };
  if (/^(true|false)$/.test(source)) return { status: 'known', type: 'Bool', evidence: 'bool-literal' };
  if (/^"(?:[^"\\]|\\.)*"$/.test(source)) return { status: 'known', type: 'String', evidence: 'string-literal' };
  return { status: 'unknown', type: null, evidence: null };
}

function parseOperationSignature(operation, stateModel) {
  const parts = splitTopLevelArrowType(operation?.type ?? '');
  if (parts.length < 1) {
    return {
      valid: false,
      inputTypes: [],
      returnType: null,
      monadicReturn: false,
      error: 'operation type is empty',
    };
  }
  const returnType = parts.at(-1) ?? null;
  const inputTypes = parts.slice(0, -1);
  const monadName = normalizeSpaces(stateModel?.monad?.name ?? '');
  const monadicReturn = Boolean(monadName)
    && (normalizeSpaces(returnType) === monadName || normalizeSpaces(returnType).startsWith(monadName + ' '));
  return {
    valid: Boolean(returnType) && monadicReturn,
    inputTypes,
    returnType,
    monadicReturn,
    error: monadicReturn ? null : `operation return type must be in selected monad '${monadName}'`,
  };
}

export function statefulOperationElaborationForContract(contract, stateModel = contract.stateModel) {
  const modelByName = new Map((stateModel?.operations ?? []).map(operation => [operation.name, operation]));
  const diagnostics = [];

  const operations = (contract.operations ?? []).map(call => {
    const modelOperation = modelByName.get(call.operation) ?? null;
    if (!modelOperation) {
      const item = {
        code: 'state-operation-undeclared',
        severity: 'error',
        operation: call.operation,
        operationIndex: call.index,
        message: `state operation '${call.operation}' is not declared by the selected state model`,
      };
      diagnostics.push(item);
      return {
        index: call.index,
        operation: call.operation,
        source: call.text,
        args: call.args ?? [],
        signature: null,
        argumentsTyped: [],
        typingStatus: 'error',
        diagnostics: [item],
      };
    }

    const signature = parseOperationSignature(modelOperation, stateModel);
    const localDiagnostics = [];
    if (!signature.valid) {
      localDiagnostics.push({
        code: 'state-operation-signature-invalid',
        severity: 'error',
        operation: call.operation,
        operationIndex: call.index,
        message: signature.error,
      });
    }

    const args = call.args ?? [];
    if (args.length !== signature.inputTypes.length) {
      localDiagnostics.push({
        code: 'state-operation-arity-mismatch',
        severity: 'error',
        operation: call.operation,
        operationIndex: call.index,
        expected: signature.inputTypes.length,
        actual: args.length,
        message: `state operation '${call.operation}' expects ${signature.inputTypes.length} arguments but received ${args.length}`,
      });
    }

    const argumentsTyped = args.map((source, argumentIndex) => {
      const expectedType = signature.inputTypes[argumentIndex] ?? null;
      const inferred = inferSimpleArgumentType(source, contract);
      const typeMatches = inferred.status !== 'known' || expectedType === null
        ? null
        : normalizeSpaces(inferred.type) === normalizeSpaces(expectedType);
      if (typeMatches === false) {
        localDiagnostics.push({
          code: 'state-operation-argument-type-mismatch',
          severity: 'error',
          operation: call.operation,
          operationIndex: call.index,
          argumentIndex,
          expression: source,
          expectedType,
          actualType: inferred.type,
          message: `state operation '${call.operation}' argument ${argumentIndex + 1} expects ${expectedType} but '${source}' has type ${inferred.type}`,
        });
      }
      return {
        index: argumentIndex,
        source,
        expectedType,
        inferredType: inferred.type,
        inferenceStatus: inferred.status,
        evidence: inferred.evidence,
        typeMatches,
      };
    });

    diagnostics.push(...localDiagnostics);
    const hasErrors = localDiagnostics.some(item => item.severity === 'error');
    const allKnown = argumentsTyped.every(argument => argument.inferenceStatus === 'known');
    return {
      index: call.index,
      operation: call.operation,
      source: call.text,
      args,
      signature: {
        type: modelOperation.type,
        inputTypes: signature.inputTypes,
        returnType: signature.returnType,
        monadicReturn: signature.monadicReturn,
      },
      tripleTheorem: modelOperation.verification?.tripleTheorem ?? null,
      argumentsTyped,
      typingStatus: hasErrors ? 'error' : (allKnown ? 'complete' : 'partial'),
      diagnostics: localDiagnostics,
    };
  });

  const hasTypeErrors = diagnostics.some(item => item.severity === 'error');
  const typingComplete = !hasTypeErrors && operations.every(operation => operation.typingStatus === 'complete');

  return {
    schema: 'proofscript.stateful-operation-elaboration/v1',
    stateModel: {
      name: stateModel?.name ?? null,
      stateType: stateModel?.stateType ?? null,
      monad: stateModel?.monad?.name ?? null,
      descriptorPath: stateModel?.path ?? null,
      descriptorSha256: stateModel?.sha256 ?? null,
    },
    operations,
    diagnostics,
    hasTypeErrors,
    typingComplete,
    semanticOperationTheoremsChecked: false,
    programLoweringComplete: false,
    semanticProofDischarge: false,
  };
}
