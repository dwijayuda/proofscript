import { leanIdentifier, leanParameterBinders } from './lean-syntax.mjs';

function normalizeSpaces(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}


function programArgs(params) {
  return (params ?? []).map(param => leanIdentifier(param.name));
}

function leanArgument(source) {
  const value = normalizeSpaces(source);
  if (/^[A-Za-z_][A-Za-z0-9_.]*$/.test(value)) return leanIdentifier(value);
  if (/^[0-9]+$/.test(value)) return value;
  if (/^(true|false)$/.test(value)) return value;
  if (/^"(?:[^"\\]|\\.)*"$/.test(value)) return value;
  return null;
}

function monadUnitType(stateModel) {
  const monadName = normalizeSpaces(stateModel?.monad?.name ?? '');
  return monadName ? `${monadName} Unit` : null;
}

function leanReturnType(sourceReturnType, stateModel) {
  const source = normalizeSpaces(sourceReturnType);
  const sourceMonad = normalizeSpaces(stateModel?.monad?.name ?? '');
  const stateType = normalizeSpaces(stateModel?.stateType ?? '');
  const configuredLeanMonad = normalizeSpaces(stateModel?.lean?.monadTypeConstructor ?? '');
  const inferredLeanMonad = sourceMonad === `State ${stateType}` && stateType
    ? `StateM ${stateType}`
    : '';
  const leanMonad = configuredLeanMonad || inferredLeanMonad;
  if (!sourceMonad || !leanMonad || !source.startsWith(sourceMonad + ' ')) {
    return {
      sourceReturnType: source,
      leanReturnType: null,
      sourceMonad,
      leanMonad: leanMonad || null,
      mapped: false,
    };
  }
  const resultType = normalizeSpaces(source.slice(sourceMonad.length));
  return {
    sourceReturnType: source,
    leanReturnType: `${leanMonad} ${resultType}`,
    sourceMonad,
    leanMonad,
    resultType,
    mapped: true,
  };
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
  const returnTypeMapping = leanReturnType(fn.returnType, stateModel);
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
      ? [leanIdentifier(operation.operation), ...renderedArgs].join(' ')
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
  if (returnTypeMapping.mapped !== true) {
    diagnostics.push({
      code: 'stateful-program-lowering-lean-monad-unbound',
      severity: 'error',
      sourceReturnType: fn.returnType,
      sourceMonad: returnTypeMapping.sourceMonad,
      leanMonad: returnTypeMapping.leanMonad,
      message: 'ProofScript state monad return type is not bound to a Lean monad type constructor',
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
  const binders = leanParameterBinders(fn.params ?? []);
  const leanDefinition = programLoweringReady
    ? `def ${leanIdentifier(fn.name)}${binders ? ` ${binders}` : ''} : ${returnTypeMapping.leanReturnType} := ${leanBody}`
    : null;

  return {
    schema: 'proofscript.stateful-program-lowering/v1',
    grammarProfile: 'stateful-flat-operation-sequence0',
    function: {
      name: fn.name,
      params: fn.params ?? [],
      returnType: fn.returnType,
      leanReturnType: returnTypeMapping.leanReturnType,
      argumentNames: programArgs(fn.params ?? []),
    },
    stateModel: {
      name: stateModel.name ?? null,
      stateType: stateModel.stateType ?? null,
      monad: stateModel.monad?.name ?? null,
      leanMonad: returnTypeMapping.leanMonad,
      monadMappingComplete: returnTypeMapping.mapped,
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
