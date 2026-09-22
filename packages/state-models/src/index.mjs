import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

export function sha256Text(text) {
  return createHash('sha256').update(String(text)).digest('hex');
}
export function sha256File(file) {
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}
function normalizeSpaces(s) {
  return String(s ?? '').replace(/\s+/g, ' ').trim();
}
function nonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}
function asArray(value) {
  return Array.isArray(value) ? value : [];
}
function requireField(errors, descriptor, field, message) {
  if (!nonEmptyString(descriptor[field])) errors.push({ field, message });
}
function requireNested(errors, descriptor, dotted, message) {
  const parts = dotted.split('.');
  let value = descriptor;
  for (const part of parts) value = value?.[part];
  if (!nonEmptyString(value)) errors.push({ field: dotted, message });
}

export function splitTopLevelArrowType(typeText) {
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

export function parseStateObservationSignature(typeText, stateType) {
  const parts = splitTopLevelArrowType(typeText);
  if (parts.length < 2) {
    return {
      valid: false,
      inputTypes: [],
      stateInputType: null,
      outputType: null,
      error: 'observation type must accept the state argument and return a result',
    };
  }
  const allInputs = parts.slice(0, -1);
  const stateInputType = allInputs.at(-1) ?? null;
  const outputType = parts.at(-1) ?? null;
  const inputTypes = allInputs.slice(0, -1);
  const expectedStateType = normalizeSpaces(stateType);
  const valid = Boolean(stateInputType) && normalizeSpaces(stateInputType) === expectedStateType;
  return {
    valid,
    inputTypes,
    stateInputType,
    outputType,
    error: valid ? null : `final observation input type must be stateType '${expectedStateType}'`,
  };
}

export function validateStateModelDescriptor(descriptor, { descriptorPath, descriptorSha256, packageVersion, checkpoint = 'KA-144 state-model descriptor workflow' } = {}) {
  const errors = [];
  if (!descriptor || typeof descriptor !== 'object' || Array.isArray(descriptor)) {
    throw new Error('state model descriptor must be a JSON object');
  }
  if (descriptor.schema !== 'proofscript.state-model.v1') errors.push({ field: 'schema', message: 'expected proofscript.state-model.v1' });
  requireField(errors, descriptor, 'name', 'model name is required');
  requireField(errors, descriptor, 'stateType', 'stateType is required');
  requireNested(errors, descriptor, 'monad.name', 'monad.name is required');
  requireNested(errors, descriptor, 'monad.typeConstructor', 'monad.typeConstructor is required');
  requireNested(errors, descriptor, 'wp.triple', 'wp.triple is required');
  requireNested(errors, descriptor, 'wp.precondition', 'wp.precondition is required');
  requireNested(errors, descriptor, 'wp.postcondition', 'wp.postcondition is required');
  requireNested(errors, descriptor, 'semantics.runner', 'semantics.runner is required');
  requireNested(errors, descriptor, 'semantics.adequacyTheorem', 'semantics.adequacyTheorem is required');
  const laws = asArray(descriptor.laws);
  if (laws.length === 0) errors.push({ field: 'laws', message: 'at least one law/theorem name is required' });
  for (const [i, law] of laws.entries()) {
    if (!nonEmptyString(law?.name)) errors.push({ field: `laws[${i}].name`, message: 'law name is required' });
    if (!nonEmptyString(law?.statement)) errors.push({ field: `laws[${i}].statement`, message: 'law statement is required' });
  }
  const operations = asArray(descriptor.operations);
  const operationNames = new Set();
  for (const [i, op] of operations.entries()) {
    if (!nonEmptyString(op?.name)) errors.push({ field: `operations[${i}].name`, message: 'operation name is required' });
    else if (operationNames.has(op.name)) errors.push({ field: `operations[${i}].name`, message: `duplicate operation name '${op.name}'` });
    else operationNames.add(op.name);
    if (!nonEmptyString(op?.type)) errors.push({ field: `operations[${i}].type`, message: 'operation type is required' });
    if (!nonEmptyString(op?.spec)) errors.push({ field: `operations[${i}].spec`, message: 'operation spec is required' });
  }
  const observations = asArray(descriptor.observations);
  const observationNames = new Set();
  for (const [i, observation] of observations.entries()) {
    if (!nonEmptyString(observation?.name)) errors.push({ field: `observations[${i}].name`, message: 'observation name is required' });
    else if (observationNames.has(observation.name)) errors.push({ field: `observations[${i}].name`, message: `duplicate observation name '${observation.name}'` });
    else observationNames.add(observation.name);
    if (!nonEmptyString(observation?.type)) errors.push({ field: `observations[${i}].type`, message: 'observation type is required' });
    if (!nonEmptyString(observation?.spec)) errors.push({ field: `observations[${i}].spec`, message: 'observation spec is required' });
    const stateArgument = observation?.stateArgument ?? 'last';
    if (stateArgument !== 'last') errors.push({ field: `observations[${i}].stateArgument`, message: "stateArgument must be 'last' in this alpha" });
    if (nonEmptyString(observation?.type) && nonEmptyString(descriptor.stateType)) {
      const signature = parseStateObservationSignature(observation.type, descriptor.stateType);
      if (!signature.valid) errors.push({ field: `observations[${i}].type`, message: signature.error });
    }
  }
  const vcgenStatus = descriptor.vcgen?.status ?? 'not-connected';
  if (!['not-connected', 'planned', 'connected'].includes(vcgenStatus)) errors.push({ field: 'vcgen.status', message: 'vcgen.status must be not-connected, planned, or connected' });
  const accepted = errors.length === 0;
  return {
    schema: 'proofscript.state-model-validation.v1',
    checkpoint,
    packageVersion,
    status: accepted ? 'accepted' : 'rejected',
    descriptor: {
      path: descriptorPath,
      sha256: descriptorSha256,
      name: descriptor.name,
      stateType: descriptor.stateType,
      monad: descriptor.monad?.name,
    },
    capabilities: {
      monadicContracts: accepted,
      statefulVerification: accepted,
      vcgenConnected: vcgenStatus === 'connected',
      semanticProofChecking: false,
    },
    requirements: {
      stateType: descriptor.stateType,
      monad: descriptor.monad,
      wp: descriptor.wp,
      semantics: descriptor.semantics,
      laws: laws.map(l => ({ name: l.name, statementSha256: nonEmptyString(l.statement) ? sha256Text(normalizeSpaces(l.statement)) : undefined })),
      operations: operations.map(o => ({ name: o.name, type: o.type, specSha256: nonEmptyString(o.spec) ? sha256Text(normalizeSpaces(o.spec)) : undefined })),
      observations: observations.map(o => ({ name: o.name, type: o.type, stateArgument: o.stateArgument ?? 'last', specSha256: nonEmptyString(o.spec) ? sha256Text(normalizeSpaces(o.spec)) : undefined })),
    },
    errors,
    trustBoundary: {
      descriptorValidatedStructurally: accepted,
      semanticProofChecking: false,
      vcgenConnected: vcgenStatus === 'connected',
      adequacyTheoremTrustedOnlyAfterLeanCheck: true,
      hiddenAxiomsIntroduced: false,
      fullLean4Equivalence: false,
    },
  };
}

export function readStateModelDescriptor(file) {
  const resolved = path.resolve(process.cwd(), file);
  const descriptor = JSON.parse(fs.readFileSync(resolved, 'utf8'));
  const validation = validateStateModelDescriptor(descriptor, {
    descriptorPath: path.relative(process.cwd(), resolved).replace(/\\/g, '/'),
    descriptorSha256: sha256File(resolved),
  });
  return { descriptor, validation, resolved, sha256: sha256File(resolved) };
}

export function buildStateModelBinding(descriptor, { descriptorPath, descriptorSha256 }) {
  const validation = validateStateModelDescriptor(descriptor, { descriptorPath, descriptorSha256 });
  if (validation.status !== 'accepted') {
    const error = new Error('state model descriptor rejected');
    error.validation = validation;
    throw error;
  }
  return {
    schema: descriptor.schema,
    name: descriptor.name,
    path: descriptorPath,
    sha256: descriptorSha256,
    stateType: descriptor.stateType,
    monad: descriptor.monad,
    wp: descriptor.wp,
    semantics: descriptor.semantics,
    laws: descriptor.laws ?? [],
    operations: descriptor.operations ?? [],
    observations: descriptor.observations ?? [],
    vcgen: descriptor.vcgen ?? { status: 'not-connected' },
    validation,
  };
}
