import { createHash } from 'node:crypto';
import { statefulPredicateElaborationForContract } from './stateful-predicate-elaboration.mjs';
import { createStatefulPredicateAstForContract } from './stateful-predicate-ast.mjs';
import { statefulOperationElaborationForContract } from './stateful-operation-elaboration.mjs';

export { statefulPredicateElaborationForContract, createStatefulPredicateAstForContract, statefulOperationElaborationForContract };

export const PURE_VERIFICATION_REFERENCE = '0.7.0-alpha.2-draft';
export const PURE_VERIFICATION_PROFILE = 'ps3-pure-contracts0';
export const MONADIC_VERIFICATION_REFERENCE = '0.7.0-alpha.2-draft';
export const MONADIC_VERIFICATION_PROFILE = 'ps3-monadic-contracts0';
export const PURE_VERIFICATION_FEATURE_ORDER = Object.freeze([
  'V-REQUIRES',
  'V-ENSURES',
  'V-RESULT',
  'V-ASSERT',
  'V-GHOST',
  'V-OLD',
]);

export function sha256Text(text) {
  return createHash('sha256').update(String(text)).digest('hex');
}
export function normalizeSpaces(s) { return String(s).replace(/\s+/g, ' ').trim(); }
export function parseParams(paramsText) {
  if (!String(paramsText).trim()) return [];
  return String(paramsText).split(',').map(part => {
    const m = part.trim().match(/^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.+)$/);
    if (!m) throw new Error(`unsupported parameter syntax '${part.trim()}'`);
    return { name: m[1], type: normalizeSpaces(m[2]) };
  });
}
export function snapshotName(expression, index) {
  const stem = String(expression).replace(/[^A-Za-z0-9_]+/g, '_').replace(/^_+|_+$/g, '') || 'value';
  return `__old_${stem}_${index}`;
}
export function rewriteOldSnapshots(text, snapshots) {
  const seen = new Map(snapshots.map(s => [s.expression, s.name]));
  return String(text).replace(/old\(([^()]+)\)/g, (_all, exprRaw) => {
    const expression = normalizeSpaces(exprRaw);
    let name = seen.get(expression);
    if (!name) {
      name = snapshotName(expression, snapshots.length);
      snapshots.push({ name, expression, kind: 'old', meaning: 'pre-state/source-scope logical snapshot' });
      seen.set(expression, name);
    }
    return name;
  });
}

export function rewritePureOldSnapshots(text, snapshots) {
  const seen = new Map(snapshots.map(s => [s.expression, s.name]));
  const rewritten = String(text).replace(/old\(([^()]+)\)/g, (_all, exprRaw) => {
    const expression = normalizeSpaces(exprRaw);
    if (/\bresult\b/.test(expression)) throw new Error("'result' is not valid inside old(...)");
    let name = seen.get(expression);
    if (!name) {
      name = snapshotName(expression, snapshots.length);
      snapshots.push({
        name,
        expression,
        kind: 'old',
        meaning: 'pure-function entry value; proposition lowering inlines the entry expression',
      });
      seen.set(expression, name);
    }
    return `(${expression})`;
  });
  if (/\bold\s*\(/.test(rewritten)) {
    throw new Error("unsupported old syntax in ps3-pure-contracts0: nested parentheses are not admitted");
  }
  return normalizeSpaces(rewritten);
}

export function scanOldReferences(text) {
  const source = String(text);
  const out = [];
  const re = /\bold\s*\(/g;
  let match;
  while ((match = re.exec(source)) !== null) {
    const open = source.indexOf('(', match.index);
    let depth = 1;
    let i = open + 1;
    for (; i < source.length && depth > 0; i += 1) {
      if (source[i] === '(') depth += 1;
      else if (source[i] === ')') depth -= 1;
    }
    if (depth !== 0) throw new Error("unterminated old(...) expression");
    const end = i;
    const expression = normalizeSpaces(source.slice(open + 1, end - 1));
    if (!expression) throw new Error("old(...) requires a non-empty expression");
    out.push({
      expression,
      startOffset: match.index,
      endOffset: end,
      expressionStartOffset: open + 1,
      expressionEndOffset: end - 1,
      stateRole: 'entry-state',
    });
    re.lastIndex = end;
  }
  return out;
}

export function scanResultReferences(text) {
  return [...String(text).matchAll(/\bresult\b/g)].map(match => ({
    startOffset: match.index,
    endOffset: match.index + match[0].length,
    binderRole: 'result',
  }));
}

function escapeRegExp(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function scanCallHeads(text) {
  return [...String(text).matchAll(/\b([A-Za-z_][A-Za-z0-9_.]*)\s*\(/g)].map(match => match[1]);
}

export function scanStateObservationReferences(text, observations, stateRole, offsetBase = 0) {
  const source = String(text);
  const out = [];
  for (const observation of observations ?? []) {
    if (!observation?.name) continue;
    const re = new RegExp(`\\b${escapeRegExp(observation.name)}\\s*\\(`, 'g');
    let match;
    while ((match = re.exec(source)) !== null) {
      const open = source.indexOf('(', match.index);
      let depth = 1;
      let i = open + 1;
      for (; i < source.length && depth > 0; i += 1) {
        if (source[i] === '(') depth += 1;
        else if (source[i] === ')') depth -= 1;
      }
      if (depth !== 0) throw new Error(`unterminated state observation call '${observation.name}(...)'`);
      const end = i;
      out.push({
        name: observation.name,
        arguments: normalizeSpaces(source.slice(open + 1, end - 1)),
        type: observation.type,
        stateArgument: observation.stateArgument ?? 'last',
        stateRole,
        startOffset: offsetBase + match.index,
        endOffset: offsetBase + end,
      });
      re.lastIndex = end;
    }
  }
  return out.sort((a, b) => a.startOffset - b.startOffset || a.endOffset - b.endOffset);
}

function rangeIsInside(range, outer) {
  return range.startOffset >= outer.startOffset && range.endOffset <= outer.endOffset;
}

function isIdentifierChar(char) {
  return typeof char === 'string' && /^[A-Za-z0-9_]$/.test(char);
}

export function rewriteStateObservationCalls(text, observations, stateBinder) {
  const source = String(text);
  const sorted = [...(observations ?? [])].filter(observation => observation?.name).sort((a, b) => b.name.length - a.name.length);
  let out = '';
  let i = 0;
  while (i < source.length) {
    let matched = false;
    for (const observation of sorted) {
      const name = observation.name;
      if (!source.startsWith(name, i)) continue;
      if (i > 0 && isIdentifierChar(source[i - 1])) continue;
      const afterName = i + name.length;
      if (afterName < source.length && isIdentifierChar(source[afterName])) continue;
      let open = afterName;
      while (/\s/.test(source[open] ?? '')) open += 1;
      if (source[open] !== '(') continue;
      let depth = 1;
      let end = open + 1;
      for (; end < source.length && depth > 0; end += 1) {
        if (source[end] === '(') depth += 1;
        else if (source[end] === ')') depth -= 1;
      }
      if (depth !== 0) throw new Error("unterminated state observation call '" + name + "(...)'");
      const args = source.slice(open + 1, end - 1);
      const rewrittenArgs = rewriteStateObservationCalls(args, observations, stateBinder);
      out += name + '(' + rewrittenArgs + (normalizeSpaces(rewrittenArgs) ? ', ' : '') + stateBinder + ')';
      i = end;
      matched = true;
      break;
    }
    if (!matched) {
      out += source[i];
      i += 1;
    }
  }
  return normalizeSpaces(out);
}

export function normalizeStatefulPostcondition(sourceText, observations) {
  const source = String(sourceText);
  const oldReferences = scanOldReferences(source);
  const replacements = [];
  let rewritten = source;
  for (let index = oldReferences.length - 1; index >= 0; index -= 1) {
    const oldReference = oldReferences[index];
    if (/\bresult\b/.test(oldReference.expression)) {
      throw new Error("'result' is not valid inside stateful old(...)");
    }
    const token = '__PS_OLD_' + index + '__';
    const entryExpression = rewriteStateObservationCalls(oldReference.expression, observations, '__ps_entry');
    replacements.unshift({ token, expression: '(' + entryExpression + ')' });
    rewritten = rewritten.slice(0, oldReference.startOffset) + token + rewritten.slice(oldReference.endOffset);
  }
  rewritten = rewriteStateObservationCalls(rewritten, observations, '__ps_final');
  rewritten = rewritten.replace(/\bresult\b/g, '__ps_result');
  for (const replacement of replacements) rewritten = rewritten.replace(replacement.token, replacement.expression);
  return normalizeSpaces(rewritten);
}
export function statefulPostconditionIRForContract(contract, stateModel = contract.stateModel) {
  const observations = stateModel?.observations ?? [];
  return {
    schema: 'proofscript.stateful-postcondition-ir/v1',
    binders: {
      entryState: { role: 'entry-state', suggestedName: '__ps_entry' },
      result: { role: 'result', suggestedName: '__ps_result' },
      finalState: { role: 'final-state', suggestedName: '__ps_final' },
    },
    defaultExpressionState: 'final-state',
    modelObservations: observations.map(observation => ({
      name: observation.name,
      type: observation.type,
      stateArgument: observation.stateArgument ?? 'last',
    })),
    clauses: (contract.ensures ?? []).map(ensure => {
      const source = ensure.rawProposition ?? ensure.proposition ?? '';
      const observationNames = new Set(observations.map(observation => observation.name));
      const oldReferences = scanOldReferences(source).map(oldReference => {
        const callHeads = scanCallHeads(oldReference.expression);
        const undeclaredCallHeads = callHeads.filter(name => !observationNames.has(name));
        return {
          ...oldReference,
          callHeads,
          undeclaredCallHeads,
          observationCoverageComplete: undeclaredCallHeads.length === 0,
          observationReferences: scanStateObservationReferences(
            oldReference.expression,
            observations,
            'entry-state',
            oldReference.expressionStartOffset,
          ),
        };
      });
      const allFinalObservations = scanStateObservationReferences(source, observations, 'final-state');
      const finalStateObservationReferences = allFinalObservations.filter(
        observationReference => !oldReferences.some(oldReference => rangeIsInside(observationReference, oldReference)),
      );
      return {
        name: ensure.name,
        source,
        normalizedPredicate: normalizeStatefulPostcondition(source, observations),
        oldReferences,
        resultReferences: scanResultReferences(source),
        finalStateObservationReferences,
      };
    }),
    observationBindingStatus: observations.length > 0 ? 'descriptor-bound' : 'none-declared',
    predicateNormalizationComplete: true,
    loweringStatus: 'normalized-proofscript-predicate-with-explicit-state-binders',
    semanticElaborationComplete: false,
  };
}

export function rewriteGhostReferences(text, ghosts) {
  let out = String(text);
  for (const ghost of ghosts) {
    out = out.replace(new RegExp(`\\b${ghost.name}\\b`, 'g'), `(${ghost.expression})`);
  }
  return normalizeSpaces(out);
}

export function assertValidGhostDefinitions(params, requirements, ghosts) {
  const reserved = new Set([
    "result",
    ...params.map(param => param.name),
    ...requirements.map(requirement => requirement.name),
  ]);
  const names = new Set();
  for (const ghost of ghosts) {
    if (reserved.has(ghost.name)) throw new Error(`ghost name '${ghost.name}' collides with a reserved, parameter, or requires name`);
    if (names.has(ghost.name)) throw new Error(`duplicate ghost name '${ghost.name}'`);
    names.add(ghost.name);
  }
  for (const ghost of ghosts) {
    if (/\bresult\b/.test(ghost.expression)) throw new Error("'result' is not valid in ghost expressions");
    if (/\bold\s*\(/.test(ghost.expression)) throw new Error("'old' is not valid in ghost expressions in ps3-pure-contracts0");
    for (const name of names) {
      if (new RegExp(`\\b${name}\\b`).test(ghost.expression)) {
        throw new Error(`ghost expression '${ghost.name}' may not depend on ghost '${name}' in ps3-pure-contracts0`);
      }
    }
  }
}
export function parseAssertionsFromBody(bodyRaw) {
  const assertions = [];
  const names = new Set();
  const bodyWithoutAssertions = String(bodyRaw).replace(/assert\s+([A-Za-z_][A-Za-z0-9_]*)\s*:\s*([^;]+);/g, (_all, name, proposition) => {
    if (names.has(name)) throw new Error(`duplicate assert name '${name}'`);
    names.add(name);
    assertions.push({ name, proposition: normalizeSpaces(proposition), kind: 'assert' });
    return '';
  });
  if (/(^|[;\n])\s*assert\b/m.test(bodyWithoutAssertions)) {
    throw new Error("unsupported assert syntax: expected 'assert <name>: <proposition>;'");
  }
  return { assertions, bodyWithoutAssertions };
}
export function parseLoopSpecsFromBody(bodyRaw) {
  const loops = [];
  const source = String(bodyRaw);
  const loopRe = /while\s*\(([^)]*)\)\s*([\s\S]*?)\s*\{([\s\S]*?)\}/g;
  let match;
  let index = 0;
  while ((match = loopRe.exec(source)) !== null) {
    const condition = normalizeSpaces(match[1]);
    const specBlock = match[2];
    const body = normalizeSpaces(match[3]);
    const invariants = [];
    const decreases = [];
    for (const rawLine of specBlock.split(/\r?\n/).map(x => x.trim()).filter(Boolean)) {
      let m = rawLine.match(/^invariant\s+([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.+)$/);
      if (m) { invariants.push({ name: m[1], proposition: normalizeSpaces(m[2]) }); continue; }
      m = rawLine.match(/^invariant\s+(.+)$/);
      if (m) { invariants.push({ name: `invariant${invariants.length}`, proposition: normalizeSpaces(m[1]) }); continue; }
      m = rawLine.match(/^decreases\s+([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.+)$/);
      if (m) { decreases.push({ name: m[1], expression: normalizeSpaces(m[2]) }); continue; }
      m = rawLine.match(/^decreases\s+(.+)$/);
      if (m) { decreases.push({ name: `decreases${decreases.length}`, expression: normalizeSpaces(m[1]) }); continue; }
      throw new Error(`unsupported loop specification clause: ${rawLine}`);
    }
    if (invariants.length === 0) throw new Error(`unsupported: while loop ${index} requires at least one invariant in this alpha`);
    loops.push({ index, condition, invariants, decreases, body, proofWorkflow: 'structural-obligations-only', vcgenConnected: false });
    index += 1;
  }
  return loops;
}
export function safeLeanName(name) { return String(name).replace(/[^A-Za-z0-9_]+/g, '_').replace(/^([0-9])/, '_$1'); }
export function loopObligationName(functionName, loop, suffix) { return `${functionName}_loop${loop.index}_${safeLeanName(suffix)}`; }
export function loopObligationsForContract(functionName, params, requirements, loops, ensures) {
  const obligations = [];
  for (const loop of loops) {
    for (const invariant of loop.invariants) {
      obligations.push({
        name: loopObligationName(functionName, loop, `invariant_${invariant.name}_init`),
        label: `${loop.index}.invariant.${invariant.name}.init`,
        kind: 'loop.invariant.init',
        proposition: invariant.proposition,
        statement: invariant.proposition,
        exactTheoremStatement: exactTheoremStatement(functionName, loopObligationName(functionName, loop, `invariant_${invariant.name}_init`), params, requirements, invariant.proposition),
        sourceFunction: functionName,
        loopIndex: loop.index,
        condition: loop.condition,
        vcgenLoweringStatus: 'not-implemented',
        leanCheckable: false,
        invariant: invariant.name,
        proofWorkflow: 'structural-obligations-only',
        proofPoint: 'before loop',
      });
      obligations.push({
        name: loopObligationName(functionName, loop, `invariant_${invariant.name}_preserve`),
        label: `${loop.index}.invariant.${invariant.name}.preserve`,
        kind: 'loop.invariant.preserve',
        proposition: invariant.proposition,
        statement: invariant.proposition,
        exactTheoremStatement: exactTheoremStatement(functionName, loopObligationName(functionName, loop, `invariant_${invariant.name}_preserve`), params, requirements, invariant.proposition),
        sourceFunction: functionName,
        loopIndex: loop.index,
        condition: loop.condition,
        vcgenLoweringStatus: 'not-implemented',
        leanCheckable: false,
        invariant: invariant.name,
        proofWorkflow: 'structural-obligations-only',
        proofPoint: 'loop body preserves invariant',
      });
    }
    for (const dec of loop.decreases) {
      const statement = `${dec.expression} decreases on each iteration of while (${loop.condition})`;
      obligations.push({
        name: loopObligationName(functionName, loop, `decreases_${dec.name}`),
        label: `${loop.index}.decreases.${dec.name}`,
        kind: 'loop.decreases',
        proposition: statement,
        statement,
        exactTheoremStatement: exactTheoremStatement(functionName, loopObligationName(functionName, loop, `decreases_${dec.name}`), params, requirements, statement),
        sourceFunction: functionName,
        loopIndex: loop.index,
        condition: loop.condition,
        vcgenLoweringStatus: 'not-implemented',
        leanCheckable: false,
        decreases: dec.name,
        proofWorkflow: 'structural-obligations-only',
        proofPoint: 'loop termination measure',
      });
    }
    const postLabels = ensures.length ? ensures.map(e => e.name).join(', ') : 'postconditions';
    const exitStatement = `loop ${loop.index} exits from while (${loop.condition}) and re-establishes postcondition scope ${postLabels}`;
    obligations.push({
      name: loopObligationName(functionName, loop, 'exit_postcondition_scope'),
      label: `${loop.index}.exit`,
      kind: 'loop.exit',
      proposition: exitStatement,
      statement: exitStatement,
      exactTheoremStatement: exactTheoremStatement(functionName, loopObligationName(functionName, loop, 'exit_postcondition_scope'), params, requirements, exitStatement),
      sourceFunction: functionName,
      loopIndex: loop.index,
      condition: loop.condition,
      vcgenLoweringStatus: 'not-implemented',
      leanCheckable: false,
      proofWorkflow: 'structural-obligations-only',
      proofPoint: 'after loop',
    });
  }
  return obligations;
}
export function theoremBinderText(params, requirements) {
  const p = params.map(x => `(${x.name} : ${x.type})`);
  const r = requirements.map(x => `(${x.name} : ${x.proposition})`);
  return [...p, ...r].join(' ');
}
export function exactTheoremStatement(functionName, theoremName, params, requirements, proposition) {
  const binders = theoremBinderText(params, requirements);
  return `theorem ${theoremName}${binders ? ` ${binders}` : ''} : ${proposition}`;
}
export function stableObligationId(sourceFunction, kind, label) {
  return `${sourceFunction}.${kind}.${label}`;
}

export function assertUniqueContractNames(params, requirements, ensures) {
  const parameterNames = new Set();
  for (const param of params) {
    if (parameterNames.has(param.name)) throw new Error(`duplicate contract parameter name '${param.name}'`);
    parameterNames.add(param.name);
  }

  const requirementNames = new Set();
  for (const requirement of requirements) {
    if (parameterNames.has(requirement.name)) {
      throw new Error(`requires name '${requirement.name}' collides with a function parameter`);
    }
    if (requirementNames.has(requirement.name)) {
      throw new Error(`duplicate requires name '${requirement.name}'`);
    }
    requirementNames.add(requirement.name);
  }

  const ensureNames = new Set();
  for (const ensure of ensures) {
    if (ensureNames.has(ensure.name)) throw new Error(`duplicate ensures name '${ensure.name}'`);
    ensureNames.add(ensure.name);
  }
}

export function assertUniqueObligationIds(obligations) {
  const ids = new Set();
  for (const obligation of obligations) {
    if (ids.has(obligation.id)) throw new Error(`duplicate generated obligation id '${obligation.id}'`);
    ids.add(obligation.id);
  }
}
export function enrichContractObligation(o, params, requirements) {
  const statement = o.statement ?? o.proposition;
  const exact = o.exactTheoremStatement ?? exactTheoremStatement(o.functionName ?? 'contract', o.name, params, requirements, statement);
  return {
    ...o,
    statement,
    exactTheoremStatement: exact,
    theoremStatement: exact,
    id: o.id ?? stableObligationId(o.sourceFunction ?? o.functionName ?? 'contract', o.kind, o.label ?? o.name),
    sourceFunction: o.sourceFunction ?? o.functionName,
    statementSha256: sha256Text(statement),
    theoremSha256: sha256Text(exact),
    status: 'unproved',
  };
}
export function parsePureContractSource(text, sourcePath = '<memory>') {
  const match = String(text).match(/function\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]*)\)\s*:\s*([^\n]+)\n([\s\S]*?):=\s*\{([\s\S]*)\}\s*$/m);
  if (!match) throw new Error('unsupported contract syntax: expected function name(params): ReturnType ... := { body }');
  const name = match[1];
  const params = parseParams(match[2]);
  if (params.some(p => p.name === 'result')) throw new Error("contract parameter name 'result' is reserved for postconditions");
  const returnType = normalizeSpaces(match[3]);
  const spec = match[4];
  let body = match[5].trim();
  const requirements = [];
  const ensures = [];
  const ghosts = [];
  const oldSnapshots = [];
  for (const line of spec.split(/\r?\n/).map(x => x.trim()).filter(Boolean)) {
    let m = line.match(/^requires\s+([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.+)$/);
    if (m) {
      const proposition = normalizeSpaces(m[2]);
      if (/\bresult\b/.test(proposition)) throw new Error("'result' is only valid in ensures clauses");
      if (/\bold\s*\(/.test(proposition)) throw new Error("'old' is only valid in pure ensures clauses");
      requirements.push({ name: m[1], proposition, kind: 'requires' });
      continue;
    }
    m = line.match(/^ensures\s+([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.+)$/);
    if (m) { ensures.push({ name: m[1], proposition: rewritePureOldSnapshots(normalizeSpaces(m[2]), oldSnapshots), rawProposition: normalizeSpaces(m[2]), kind: 'ensures' }); continue; }
    m = line.match(/^ensures\s+(.+)$/);
    if (m) { const idx = ensures.length; ensures.push({ name: `ensures${idx}`, proposition: rewritePureOldSnapshots(normalizeSpaces(m[1]), oldSnapshots), rawProposition: normalizeSpaces(m[1]), kind: 'ensures' }); continue; }
    m = line.match(/^ghost\s+([A-Za-z_][A-Za-z0-9_]*)\s*:\s*([^:=]+)\s*:=\s*(.+)$/);
    if (m) { ghosts.push({ name: m[1], type: normalizeSpaces(m[2]), expression: normalizeSpaces(m[3]), erasedFromRuntime: true }); continue; }
    throw new Error(`unsupported contract clause: ${line}`);
  }
  assertUniqueContractNames(params, requirements, ensures);
  assertValidGhostDefinitions(params, requirements, ghosts);
  if (/\bresult\b/.test(body)) throw new Error("'result' is only valid in ensures clauses");
  if (/\bold\s*\(/.test(body)) throw new Error("'old' is only valid in pure ensures clauses");
  const { assertions, bodyWithoutAssertions } = parseAssertionsFromBody(body);

  for (const requirement of requirements) {
    requirement.proposition = rewriteGhostReferences(requirement.proposition, ghosts);
  }
  for (const ensure of ensures) {
    ensure.proposition = rewriteGhostReferences(ensure.proposition, ghosts);
  }
  for (const assertion of assertions) {
    assertion.proposition = rewriteGhostReferences(assertion.proposition, ghosts);
  }

  for (const ghost of ghosts) {
    if (new RegExp(`\\b${ghost.name}\\b`).test(bodyWithoutAssertions)) {
      throw new Error(`ghost value '${ghost.name}' is used in runtime body; ghost erasure cannot be certified`);
    }
  }
  const loops = parseLoopSpecsFromBody(bodyWithoutAssertions);
  const runtimeBody = normalizeSpaces(bodyWithoutAssertions.replace(/while\s*\([^)]*\)\s*[\s\S]*?\s*\{[\s\S]*?\}/g, ''));
  const assertObligations = assertions.map(a => ({
    name: `${name}_assert_${a.name}`,
    kind: 'assert',
    label: a.name,
    sourceFunction: name,
    proposition: a.proposition,
    statement: a.proposition,
    exactTheoremStatement: exactTheoremStatement(name, `${name}_assert_${a.name}`, params, requirements, a.proposition),
    proofPoint: `assert ${a.name}`,
  }));
  const ensuresObligations = ensures.map(e => {
    const resultExpr = `${name} ${params.map(p => p.name).join(' ')}`.trim();
    const proposition = e.proposition.replace(/\bresult\b/g, `(${resultExpr})`);
    return {
      name: `${name}_ensures_${e.name}`,
      kind: 'ensures',
      label: e.name,
      sourceFunction: name,
      proposition,
      rawProposition: e.rawProposition,
      statement: proposition,
      exactTheoremStatement: exactTheoremStatement(name, `${name}_ensures_${e.name}`, params, requirements, proposition),
      proofPoint: `ensures ${e.name}`,
    };
  });
  const loopObligations = loopObligationsForContract(name, params, requirements, loops, ensures);
  const obligations = [...assertObligations, ...ensuresObligations].map(o => enrichContractObligation(o, params, requirements)).concat(loopObligations.map(o => enrichContractObligation(o, params, requirements)));
  assertUniqueObligationIds(obligations);
  return { name, params, returnType, requirements, ensures, ghosts, assertions, oldSnapshots, loops, obligations, body: runtimeBody, sourcePath };
}
export function leanForContract(contract) {
  const params = contract.params.map(p => `(${p.name} : ${p.type})`).join(' ');
  const defLine = `def ${contract.name}${params ? ` ${params}` : ''} : ${contract.returnType} := by\n  -- ProofScript contract body placeholder for emitted obligation file.\n  admit`;
  const ghosts = (contract.ghosts ?? []).map(g => `-- ghost ${g.name} : ${g.type} := ${g.expression} (erased from runtime)`).join('\n');
  const oldSnapshots = (contract.oldSnapshots ?? []).map(s => `-- old snapshot ${s.name} := old(${s.expression})`).join('\n');
  const loopNotes = (contract.loops ?? []).map(loop => {
    const invs = loop.invariants.map(i => `-- loop invariant ${i.name}: ${i.proposition}`).join('\n');
    const decs = loop.decreases.map(d => `-- loop decreases ${d.name}: ${d.expression}`).join('\n');
    return `-- loop ${loop.index}: while (${loop.condition})\n${invs}${invs && decs ? '\n' : ''}${decs}\n-- loop proof workflow: structural obligations only; vcgen/mvcgen not connected in KA-143`;
  }).join('\n');
  const obligations = (contract.obligations ?? []).map(o => {
    const prefix = o.kind === 'assert' ? `-- assert obligation ${o.name}\n` : (o.kind === 'ensures' ? `-- ensures obligation ${o.name}\n` : `-- obligation ${o.name} (${o.kind})\n`);
    return `${prefix}${o.exactTheoremStatement ?? o.theoremStatement} := by\n  -- status: unproved\n  admit`;
  }).join('\n\n');
  return `${defLine}\n\n${ghosts ? ghosts + '\n' : ''}${oldSnapshots ? oldSnapshots + '\n' : ''}${loopNotes ? loopNotes + '\n' : ''}${obligations}\n`;
}
export function verificationFeaturesForContract(contract) {
  const used = new Set();
  if ((contract.requirements ?? []).length) used.add('V-REQUIRES');
  if ((contract.ensures ?? []).length) used.add('V-ENSURES');
  if ((contract.ensures ?? []).some(ensure => /\bresult\b/.test(ensure.rawProposition ?? ensure.proposition ?? ''))) used.add('V-RESULT');
  if ((contract.assertions ?? []).length) used.add('V-ASSERT');
  if ((contract.ghosts ?? []).length) used.add('V-GHOST');
  if ((contract.oldSnapshots ?? []).length) used.add('V-OLD');
  return PURE_VERIFICATION_FEATURE_ORDER.filter(feature => used.has(feature));
}

export function verificationProfileForContract(contract) {
  const features = verificationFeaturesForContract(contract);
  if ((contract.loops ?? []).length > 0) {
    const prototypeFeatures = ['KA142-INVARIANT'];
    if ((contract.loops ?? []).some(loop => (loop.decreases ?? []).length > 0)) prototypeFeatures.push('KA142-DECREASES');
    return {
      schema: 'proofscript.verification-profile/v1',
      reference: null,
      profile: 'ka142-loop-prototype',
      features,
      prototypeFeatures,
      claim: 'prototype-only',
    };
  }
  return {
    schema: 'proofscript.verification-profile/v1',
    reference: PURE_VERIFICATION_REFERENCE,
    profile: PURE_VERIFICATION_PROFILE,
    features,
    prototypeFeatures: [],
    claim: 'specified-alpha',
  };
}

export function makeContractsArtifact({ sourceText, sourcePath, sourceSha256, packageVersion, checkpoint = 'KA-143 verification package extraction' }) {
  const contract = parsePureContractSource(sourceText, sourcePath);
  const obligations = contract.obligations ?? [];
  return {
    artifact: {
      schema: 'proofscript.contracts.v1',
      checkpoint,
      packageVersion,
      source: sourcePath,
      sourceSha256,
      verification: verificationProfileForContract(contract),
      functions: [{ name: contract.name, params: contract.params, returnType: contract.returnType, requirements: contract.requirements, ghosts: contract.ghosts, ensures: contract.ensures, assertions: contract.assertions, oldSnapshots: contract.oldSnapshots, loops: contract.loops, body: contract.body }],
      loops: contract.loops,
      ghosts: contract.ghosts,
      assertions: contract.assertions,
      oldSnapshots: contract.oldSnapshots,
      obligations,
      trustBoundary: { semanticProofChecking: false, hiddenAxioms: false, ghostErasureChecked: true, ghostNonInterference: 'syntactic-no-runtime-reference', ghostErasureVerified: false, oldIsLogicalSnapshot: true, runtimeAssertionTrust: false, loopInvariantChecking: obligations.some(o => String(o.kind).startsWith('loop.')) ? 'structural-obligations-only' : undefined, vcgenConnected: false, fullLean4Equivalence: false },
    },
    contract,
    leanText: leanForContract(contract),
  };
}

export function isMonadicContractSource(text) {
  return /function\s+[A-Za-z_][A-Za-z0-9_]*\s*\([^)]*\)\s*:\s*State\b[\s\S]*?:=\s*do\s*\{/.test(String(text));
}
export function parseMonadicOperations(bodyRaw) {
  return String(bodyRaw).split(/;\s*/).map(x => normalizeSpaces(x)).filter(Boolean).map((line, index) => {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*\((.*)\)$/);
    return { index, text: line, operation: m ? m[1] : line.split(/\s+/)[0], args: m ? m[2].split(',').map(a => normalizeSpaces(a)).filter(Boolean) : [] };
  });
}
export function parseMonadicContractSource(text, sourcePath = '<memory>', stateModelBinding) {
  if (!stateModelBinding) throw new Error('unsupported: monadic/stateful contracts require a state model descriptor via --state-model <proofscript.state-model.v1.json>');
  const match = String(text).match(/function\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]*)\)\s*:\s*([^\n]+)\n([\s\S]*?):=\s*do\s*\{([\s\S]*)\}\s*$/m);
  if (!match) throw new Error('unsupported monadic contract syntax: expected function name(params): State ... specs := do { body }');
  const name = match[1];
  const params = parseParams(match[2]);
  if (params.some(p => p.name === 'result')) throw new Error("contract parameter name 'result' is reserved for postconditions");
  const returnType = normalizeSpaces(match[3]);
  if (!/^State\b/.test(returnType)) throw new Error('unsupported monadic contract syntax: return type must be State ... in this alpha');
  const spec = match[4];
  const body = normalizeSpaces(match[5]);
  const requirements = [];
  const ensures = [];
  const oldSnapshots = [];
  for (const line of spec.split(/\r?\n/).map(x => x.trim()).filter(Boolean)) {
    let m = line.match(/^requires\s+([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.+)$/);
    if (m) { requirements.push({ name: m[1], proposition: normalizeSpaces(m[2]), kind: 'requires' }); continue; }
    m = line.match(/^ensures\s+([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.+)$/);
    if (m) { ensures.push({ name: m[1], proposition: rewriteOldSnapshots(normalizeSpaces(m[2]), oldSnapshots), rawProposition: normalizeSpaces(m[2]), kind: 'ensures' }); continue; }
    m = line.match(/^ensures\s+(.+)$/);
    if (m) { const idx = ensures.length; ensures.push({ name: `ensures${idx}`, proposition: rewriteOldSnapshots(normalizeSpaces(m[1]), oldSnapshots), rawProposition: normalizeSpaces(m[1]), kind: 'ensures' }); continue; }
    throw new Error(`unsupported monadic contract clause: ${line}`);
  }
  assertUniqueContractNames(params, requirements, ensures);
  const operations = parseMonadicOperations(body);
  const stateModelName = stateModelBinding.name;
  const modelRequirements = [{ name: `h${stateModelName}_adequate`, proposition: stateModelBinding.semantics?.adequacyTheorem ?? `${stateModelName}.adequate`, kind: 'state-model-adequacy' }];
  const allRequirements = [...requirements];
  const obligations = [];
  for (const op of operations) {
    const statement = `operation ${op.text} is specified by state model ${stateModelName}`;
    const namePart = safeLeanName(`${op.index}_${op.operation}`);
    obligations.push(enrichContractObligation({
      name: `${name}_monadic_operation_${namePart}`,
      kind: 'monadic.operation.spec',
      label: `${op.index}.${op.operation}`,
      sourceFunction: name,
      proposition: statement,
      statement,
      exactTheoremStatement: exactTheoremStatement(name, `${name}_monadic_operation_${namePart}`, params, allRequirements, statement),
      proofPoint: `operation ${op.text}`,
      vcgenLoweringStatus: 'not-implemented',
      leanCheckable: false,
      stateModel: stateModelName,
    }, params, allRequirements));
  }
  for (const e of ensures) {
    const statement = `monadic postcondition ${e.proposition} under state model ${stateModelName}`;
    obligations.push(enrichContractObligation({
      name: `${name}_monadic_ensures_${e.name}`,
      kind: 'monadic.ensures',
      label: e.name,
      sourceFunction: name,
      proposition: statement,
      rawProposition: e.rawProposition,
      statement,
      exactTheoremStatement: exactTheoremStatement(name, `${name}_monadic_ensures_${e.name}`, params, allRequirements, statement),
      proofPoint: `ensures ${e.name}`,
      vcgenLoweringStatus: 'not-implemented',
      leanCheckable: false,
      stateModel: stateModelName,
    }, params, allRequirements));
  }
  return { name, contractKind: 'monadic-stateful', params, returnType, requirements, modelRequirements, ensures, ghosts: [], assertions: [], oldSnapshots, loops: [], operations, obligations, body, sourcePath, stateModel: stateModelBinding };
}
export function leanForMonadicContract(contract) {
  const params = contract.params.map(p => `(${p.name} : ${p.type})`).join(' ');
  const stateModel = contract.stateModel?.name ?? '<missing-state-model>';
  const operations = (contract.operations ?? []).map(op => `-- operation ${op.index}: ${op.text}`).join('\n');
  const oldSnapshots = (contract.oldSnapshots ?? []).map(s => `-- old snapshot ${s.name} := old(${s.expression})`).join('\n');
  const obligations = (contract.obligations ?? []).map(o => `-- monadic obligation ${o.name}\n${o.exactTheoremStatement ?? o.theoremStatement} := by\n  -- status: unproved; vcgen/mvcgen not connected in KA-144\n  admit`).join('\n\n');
  return `/- ProofScript KA-144 monadic/stateful contract skeleton.\n   Bound state model ${stateModel}. This is structural until vcgen/mvcgen is connected. -/\n\ndef ${contract.name}${params ? ` ${params}` : ''} : ${contract.returnType} := by\n  -- ProofScript monadic do body placeholder.\n  admit\n\n-- state model ${stateModel}\n${operations ? operations + '\n' : ''}${oldSnapshots ? oldSnapshots + '\n' : ''}${obligations}\n`;
}
export function monadicVerificationProfile(
  contract,
  stateModel,
  postconditionIR = statefulPostconditionIRForContract(contract, stateModel),
  predicateElaboration = statefulPredicateElaborationForContract(contract, stateModel, postconditionIR),
  predicateAst = createStatefulPredicateAstForContract(contract, predicateElaboration),
  operationElaboration = statefulOperationElaborationForContract(contract, stateModel),
) {
  const stateModelOperations = stateModel.operations ?? [];
  const declaredOperations = new Set(stateModelOperations.map(op => op.name));
  const stateModelOperationByName = new Map(stateModelOperations.map(op => [op.name, op]));
  const unknownOperations = (contract.operations ?? [])
    .filter(op => !declaredOperations.has(op.operation))
    .map(op => op.operation);
  const operationsMissingTripleTheorem = (contract.operations ?? [])
    .filter(op => {
      const theorem = stateModelOperationByName.get(op.operation)?.verification?.tripleTheorem;
      return declaredOperations.has(op.operation) && !(typeof theorem === 'string' && theorem.trim().length > 0);
    })
    .map(op => op.operation);
  const unsupported = [];
  const oldReferences = postconditionIR.clauses.flatMap(clause => clause.oldReferences ?? []);
  const resultReferences = postconditionIR.clauses.flatMap(clause => clause.resultReferences ?? []);
  const requirementsUseStateObservation = (contract.requirements ?? []).some(requirement =>
    scanStateObservationReferences(requirement.proposition ?? '', stateModel.observations ?? [], 'entry-state').length > 0
  );
  if (oldReferences.some(oldReference => oldReference.observationCoverageComplete !== true)) {
    unsupported.push('stateful-old-unclassified-call');
  }
  if (postconditionIR.predicateNormalizationComplete !== true) unsupported.push('stateful-postcondition-not-normalized');
  if (predicateElaboration.hasTypeErrors === true) unsupported.push('stateful-predicate-type-mismatch');
  if (predicateAst.unsupportedSyntax === true) unsupported.push('stateful-predicate-ast-unsupported');
  if (predicateAst.hasTypeErrors === true) unsupported.push('stateful-predicate-ast-type-mismatch');
  for (const diagnostic of operationElaboration.diagnostics ?? []) {
    if (diagnostic.code === 'state-operation-arity-mismatch') unsupported.push('state-operation-arity-mismatch');
    else if (diagnostic.code === 'state-operation-argument-type-mismatch') unsupported.push('state-operation-argument-type-mismatch');
    else if (diagnostic.code === 'state-operation-signature-invalid') unsupported.push('state-operation-signature-invalid');
  }
  if (operationElaboration.typingComplete !== true) unsupported.push('state-operation-typing-incomplete');
  if ((contract.requirements ?? []).some(r => /\bold\s*\(/.test(r.proposition ?? ''))) unsupported.push('old-in-requires');
  if ((contract.requirements ?? []).some(r => /\bresult\b/.test(r.proposition ?? ''))) unsupported.push('result-in-requires');
  if (requirementsUseStateObservation) unsupported.push('stateful-requires-observation-not-modeled');
  if (unknownOperations.length > 0) unsupported.push('undeclared-state-operation');
  if (operationsMissingTripleTheorem.length > 0) unsupported.push('state-operation-triple-theorem-unbound');

  if (unsupported.length === 0) {
    const features = ['V-MONADIC-CONTRACT'];
    if (oldReferences.length > 0) features.push('V-OLD');
    if (resultReferences.length > 0) features.push('V-RESULT');
    return {
      schema: 'proofscript.verification-profile/v1',
      reference: MONADIC_VERIFICATION_REFERENCE,
      profile: MONADIC_VERIFICATION_PROFILE,
      features,
      prototypeFeatures: [],
      claim: 'specified-structural-alpha',
      unknownOperations: [],
      operationsMissingTripleTheorem: [],
      stateOperationTypingComplete: true,
    };
  }

  return {
    schema: 'proofscript.verification-profile/v1',
    reference: null,
    profile: 'ka144-monadic-prototype',
    features: [],
    prototypeFeatures: unsupported,
    claim: 'prototype-only',
    unknownOperations,
    operationsMissingTripleTheorem,
    stateOperationTypingComplete: operationElaboration.typingComplete === true,
  };
}

export function assertVerificationProfile(artifact, requestedProfile) {
  if (!requestedProfile) return artifact;
  const actualProfile = artifact?.verification?.profile ?? null;
  if (actualProfile !== requestedProfile) {
    const reasons = artifact?.verification?.prototypeFeatures ?? [];
    const suffix = reasons.length ? `; prototype reasons: ${reasons.join(', ')}` : '';
    throw new Error(`verification profile mismatch: requested '${requestedProfile}', classified as '${actualProfile ?? 'none'}'${suffix}`);
  }
  return artifact;
}

export function makeMonadicContractsArtifact({ sourceText, sourcePath, sourceSha256, packageVersion, checkpoint = 'KA-144 state-model descriptor workflow', stateModel }) {
  const contract = parseMonadicContractSource(sourceText, sourcePath, stateModel);
  const statefulPostconditionIR = statefulPostconditionIRForContract(contract, stateModel);
  const statefulPredicateElaboration = statefulPredicateElaborationForContract(contract, stateModel, statefulPostconditionIR);
  const statefulPredicateAST = createStatefulPredicateAstForContract(contract, statefulPredicateElaboration);
  const statefulOperationElaboration = statefulOperationElaborationForContract(contract, stateModel);
  const verification = monadicVerificationProfile(
    contract,
    stateModel,
    statefulPostconditionIR,
    statefulPredicateElaboration,
    statefulPredicateAST,
    statefulOperationElaboration,
  );
  return {
    artifact: {
      schema: 'proofscript.contracts.v1',
      contractKind: 'monadic-stateful',
      checkpoint,
      packageVersion,
      source: sourcePath,
      sourceSha256,
      verification,
      statefulPostconditionIR,
      statefulPredicateElaboration,
      statefulPredicateAST,
      statefulOperationElaboration,
      stateModel: { name: stateModel.name, path: stateModel.path, sha256: stateModel.sha256, stateType: stateModel.stateType, monad: stateModel.monad, wp: stateModel.wp, semantics: stateModel.semantics, lean: stateModel.lean, operations: stateModel.operations, observations: stateModel.observations ?? [], laws: stateModel.laws, vcgen: stateModel.vcgen },
      functions: [{ name: contract.name, contractKind: contract.contractKind, params: contract.params, returnType: contract.returnType, requirements: contract.requirements, modelRequirements: contract.modelRequirements, ensures: contract.ensures, oldSnapshots: contract.oldSnapshots, operations: contract.operations, body: contract.body, stateModel: { name: stateModel.name, stateType: stateModel.stateType, monad: stateModel.monad } }],
      operations: contract.operations,
      oldSnapshots: contract.oldSnapshots,
      obligations: contract.obligations,
      trustBoundary: { semanticProofChecking: false, hiddenAxioms: false, monadicContracts: 'state-model-descriptor-bound', verificationProfile: verification.profile, specifiedStructuralProfile: verification.profile === MONADIC_VERIFICATION_PROFILE, stateModelDescriptorValidated: true, statefulReferenceTypingComplete: statefulPredicateElaboration.referenceTypingComplete, normalizedPredicateAstTypeCheckingComplete: statefulPredicateAST.typeCheckingComplete, stateOperationTypingComplete: statefulOperationElaboration.typingComplete, wholePredicateTypeCheckingComplete: false, stateModelAdequacyChecked: false, vcgenConnected: false, monadicProofDischarge: false, fullLean4Equivalence: false },
    },
    contract,
    leanText: leanForMonadicContract(contract),
  };
}

const __oldMakeContractsArtifact = makeContractsArtifact;
