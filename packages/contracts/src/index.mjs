import { createHash } from 'node:crypto';

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
export function parseAssertionsFromBody(bodyRaw) {
  const assertions = [];
  const bodyWithoutAssertions = String(bodyRaw).replace(/assert\s+([A-Za-z_][A-Za-z0-9_]*)\s*:\s*([^;]+);/g, (_all, name, proposition) => {
    assertions.push({ name, proposition: normalizeSpaces(proposition), kind: 'assert' });
    return '';
  });
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
      requirements.push({ name: m[1], proposition, kind: 'requires' });
      continue;
    }
    m = line.match(/^ensures\s+([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.+)$/);
    if (m) { ensures.push({ name: m[1], proposition: rewriteOldSnapshots(normalizeSpaces(m[2]), oldSnapshots), rawProposition: normalizeSpaces(m[2]), kind: 'ensures' }); continue; }
    m = line.match(/^ensures\s+(.+)$/);
    if (m) { const idx = ensures.length; ensures.push({ name: `ensures${idx}`, proposition: rewriteOldSnapshots(normalizeSpaces(m[1]), oldSnapshots), rawProposition: normalizeSpaces(m[1]), kind: 'ensures' }); continue; }
    m = line.match(/^ghost\s+([A-Za-z_][A-Za-z0-9_]*)\s*:\s*([^:=]+)\s*:=\s*(.+)$/);
    if (m) { ghosts.push({ name: m[1], type: normalizeSpaces(m[2]), expression: normalizeSpaces(m[3]), erasedFromRuntime: true }); continue; }
    throw new Error(`unsupported contract clause: ${line}`);
  }
  assertUniqueContractNames(params, requirements, ensures);
    for (const ghost of ghosts) {
    const bodyWithoutGhostDecls = body.replace(new RegExp(`ghost\\s+${ghost.name}\\b[^;]*;`, 'g'), '');
    if (new RegExp(`\\b${ghost.name}\\b`).test(bodyWithoutGhostDecls)) throw new Error(`ghost value '${ghost.name}' is used in runtime body; ghost erasure cannot be certified`);
  }
  if (/\bresult\b/.test(body)) throw new Error("'result' is only valid in ensures clauses");
  const { assertions, bodyWithoutAssertions } = parseAssertionsFromBody(body);
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
    const proposition = e.proposition.replace(/\bresult\b/g, resultExpr);
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
      functions: [{ name: contract.name, params: contract.params, returnType: contract.returnType, requirements: contract.requirements, ghosts: contract.ghosts, ensures: contract.ensures, assertions: contract.assertions, oldSnapshots: contract.oldSnapshots, loops: contract.loops, body: contract.body }],
      loops: contract.loops,
      ghosts: contract.ghosts,
      assertions: contract.assertions,
      oldSnapshots: contract.oldSnapshots,
      obligations,
      trustBoundary: { semanticProofChecking: false, hiddenAxioms: false, ghostErasureVerified: false, oldIsLogicalSnapshot: true, runtimeAssertionTrust: false, loopInvariantChecking: obligations.some(o => String(o.kind).startsWith('loop.')) ? 'structural-obligations-only' : undefined, vcgenConnected: false, fullLean4Equivalence: false },
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
  const reqs = contract.requirements.map(r => `(${r.name} : ${r.proposition})`).join(' ');
  const binders = [params, reqs].filter(Boolean).join(' ');
  const stateModel = contract.stateModel?.name ?? '<missing-state-model>';
  const operations = (contract.operations ?? []).map(op => `-- operation ${op.index}: ${op.text}`).join('\n');
  const oldSnapshots = (contract.oldSnapshots ?? []).map(s => `-- old snapshot ${s.name} := old(${s.expression})`).join('\n');
  const obligations = (contract.obligations ?? []).map(o => `-- monadic obligation ${o.name}\n${o.exactTheoremStatement ?? o.theoremStatement} := by\n  -- status: unproved; vcgen/mvcgen not connected in KA-144\n  admit`).join('\n\n');
  return `/- ProofScript KA-144 monadic/stateful contract skeleton.\n   Bound state model ${stateModel}. This is structural until vcgen/mvcgen is connected. -/\n\ndef ${contract.name}${binders ? ` ${binders}` : ''} : ${contract.returnType} := by\n  -- ProofScript monadic do body placeholder.\n  admit\n\n-- state model ${stateModel}\n${operations ? operations + '\n' : ''}${oldSnapshots ? oldSnapshots + '\n' : ''}${obligations}\n`;
}
export function makeMonadicContractsArtifact({ sourceText, sourcePath, sourceSha256, packageVersion, checkpoint = 'KA-144 state-model descriptor workflow', stateModel }) {
  const contract = parseMonadicContractSource(sourceText, sourcePath, stateModel);
  return {
    artifact: {
      schema: 'proofscript.contracts.v1',
      contractKind: 'monadic-stateful',
      checkpoint,
      packageVersion,
      source: sourcePath,
      sourceSha256,
      stateModel: { name: stateModel.name, path: stateModel.path, sha256: stateModel.sha256, stateType: stateModel.stateType, monad: stateModel.monad, vcgen: stateModel.vcgen },
      functions: [{ name: contract.name, contractKind: contract.contractKind, params: contract.params, returnType: contract.returnType, requirements: contract.requirements, modelRequirements: contract.modelRequirements, ensures: contract.ensures, oldSnapshots: contract.oldSnapshots, operations: contract.operations, body: contract.body, stateModel: { name: stateModel.name, stateType: stateModel.stateType, monad: stateModel.monad } }],
      operations: contract.operations,
      oldSnapshots: contract.oldSnapshots,
      obligations: contract.obligations,
      trustBoundary: { semanticProofChecking: false, hiddenAxioms: false, monadicContracts: 'state-model-descriptor-bound', stateModelDescriptorValidated: true, vcgenConnected: false, monadicProofDischarge: false, fullLean4Equivalence: false },
    },
    contract,
    leanText: leanForMonadicContract(contract),
  };
}

const __oldMakeContractsArtifact = makeContractsArtifact;
