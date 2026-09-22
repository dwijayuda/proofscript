function normalizeSpaces(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function safeLeanName(name) {
  return String(name ?? 'x').replace(/[^A-Za-z0-9_]+/g, '_').replace(/^([0-9])/, '_$1') || 'x';
}

function parameterBinders(params) {
  return (params ?? []).map(param => `(${safeLeanName(param.name)} : ${param.type})`).join(' ');
}

function programArgs(params) {
  return (params ?? []).map(param => safeLeanName(param.name));
}

function leanArgument(source) {
  const value = normalizeSpaces(source);
  if (/^[A-Za-z_][A-Za-z0-9_.]*$/.test(value)) return safeLeanName(value);
  if (/^[0-9]+$/.test(value)) return value;
  if (/^(true|false)$/.test(value)) return value;
  if (/^"(?:[^"\\]|\\.)*"$/.test(value)) return value;
  return null;
}

function monadUnitType(stateModel) {
  const monadName = normalizeSpaces(stateModel?.monad?.name ?? '');
  return monadName ? `${monadName} Unit` : null;
}

export function createStatefulProgramLowering(contractArtifact) {
  if (!contractArtifact || contractArtifact.schema !== 'proofscript.contracts.v1') {
    throw new Error('stateful program lowering requires proofscript.contracts.v1');
  }
  if (contractArtifact.contractKind !== 'monadic-stateful') {
    throw new Error('stateful program lowering requires a monadic-stateful contract artifact');
  }
  if (!Array.isArray(contractArtifact.functions) || contractArtifact.functions.length !== 1) {
    throw new Error('stateful program lowering expects exactly one function in this alpha');
  }

  const fn = contractArtifact.functions[0];
  const operationElaboration = contractArtifact.statefulOperationElaboration;
  const stateModel = contractArtifact.stateModel ?? {};
  if (!operationElaboration || operationElaboration.schema !== 'proofscript.stateful-operation-elaboration/v1') {
    throw new Error('stateful program lowering requires proofscript.stateful-operation-elaboration/v1');
  }

  const diagnostics = [];
  const operations = (operationElaboration.operations ?? []).map((operation, index, all) => {
    const renderedArgs = (operation.args ?? []).map(leanArgument);
    const unsupportedArgumentIndex = renderedArgs.findIndex(argument => argument === null);
    if (unsupportedArgumentIndex >= 0) {
      diagnostics.push({
        code: 'stateful-program-lowering-unsupported-argument',
        severity: 'error',
        operation: operation.operation,
        operationIndex: operation.index,
        argumentIndex: unsupportedArgumentIndex,
        source: operation.args?.[unsupportedArgumentIndex] ?? null,
        message: `operation '${operation.operation}' uses an argument outside the flat Lean-lowering subset`,
      });
    }

    const expectedReturnType = index === all.length - 1
      ? normalizeSpaces(fn.returnType)
      : monadUnitType(stateModel);
    const actualReturnType = normalizeSpaces(operation.signature?.returnType ?? '');
    const returnTypeMatches = Boolean(expectedReturnType)
      && actualReturnType === normalizeSpaces(expectedReturnType);
    if (!returnTypeMatches) {
      diagnostics.push({
        code: 'stateful-program-lowering-return-type-mismatch',
        severity: 'error',
        operation: operation.operation,
        operationIndex: operation.index,
        expectedReturnType,
        actualReturnType: actualReturnType || null,
        message: index === all.length - 1
          ? `final operation '${operation.operation}' must return the function return type ${expectedReturnType}`
          : `intermediate operation '${operation.operation}' must return ${expectedReturnType}`,
      });
    }

    const application = renderedArgs.every(argument => argument !== null)
      ? [safeLeanName(operation.operation), ...renderedArgs].join(' ')
      : null;

    return {
      index: operation.index,
      operation: operation.operation,
      source: operation.source,
      leanApplication: application,
      returnType: operation.signature?.returnType ?? null,
      expectedReturnType,
      returnTypeMatches,
      argumentsLowered: renderedArgs.every(argument => argument !== null),
      typingComplete: operation.typingStatus === 'complete',
      tripleTheorem: operation.tripleTheorem ?? null,
    };
  });

  if (operations.length === 0) {
    diagnostics.push({
      code: 'stateful-program-lowering-empty-body',
      severity: 'error',
      message: 'flat stateful program lowering requires at least one modeled operation',
    });
  }
  if (operationElaboration.typingComplete !== true) {
    diagnostics.push({
      code: 'stateful-program-lowering-operation-typing-incomplete',
      severity: 'error',
      message: 'operation-call typing must complete before stateful program lowering',
    });
  }

  const programLoweringReady = diagnostics.length === 0
    && operations.every(operation =>
      operation.leanApplication
      && operation.returnTypeMatches
      && operation.typingComplete
    );

  const leanBody = programLoweringReady
    ? `do\n${operations.map(operation => `  ${operation.leanApplication}`).join('\n')}`
    : null;
  const binders = parameterBinders(fn.params ?? []);
  const leanDefinition = programLoweringReady
    ? `def ${safeLeanName(fn.name)}${binders ? ` ${binders}` : ''} : ${fn.returnType} := ${leanBody}`
    : null;

  return {
    schema: 'proofscript.stateful-program-lowering/v1',
    grammarProfile: 'stateful-flat-operation-sequence0',
    function: {
      name: fn.name,
      params: fn.params ?? [],
      returnType: fn.returnType,
      argumentNames: programArgs(fn.params ?? []),
    },
    stateModel: {
      name: stateModel.name ?? null,
      stateType: stateModel.stateType ?? null,
      monad: stateModel.monad?.name ?? null,
    },
    operations,
    diagnostics,
    programLoweringReady,
    leanBody,
    leanDefinition,
    leanProgramTypechecked: false,
    sourceToLeanProgramEquivalenceChecked: false,
    exceptionalPathsCovered: false,
    semanticProofDischarge: false,
  };
}
