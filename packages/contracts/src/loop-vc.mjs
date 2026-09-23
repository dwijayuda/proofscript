function normalize(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

class LoopVcError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "LoopVcError";
    this.code = code;
  }
}

function tokenize(sourceText) {
  const source = String(sourceText ?? "");
  const tokens = [];
  let i = 0;
  while (i < source.length) {
    const ch = source[i];
    if (/\s/u.test(ch)) {
      i += 1;
      continue;
    }
    const two = source.slice(i, i + 2);
    if ([">=", "<=", "==", "!="].includes(two)) {
      tokens.push({ kind: "operator", text: two });
      i += 2;
      continue;
    }
    if (["=", ">", "<", "+", "-", "(", ")"].includes(ch)) {
      tokens.push({
        kind: ["(", ")"].includes(ch) ? "punctuation" : "operator",
        text: ch,
      });
      i += 1;
      continue;
    }
    if (ch === "*" || ch === "/" || ch === "%") {
      throw new LoopVcError(
        "loop-vc-nonlinear-or-unsupported-arithmetic",
        `operator '${ch}' is outside loop-vc0 linear Nat arithmetic`,
      );
    }
    if (/[0-9]/u.test(ch)) {
      let end = i + 1;
      while (/[0-9]/u.test(source[end] ?? "")) end += 1;
      tokens.push({ kind: "number", text: source.slice(i, end) });
      i = end;
      continue;
    }
    if (/[A-Za-z_]/u.test(ch)) {
      let end = i + 1;
      while (/[A-Za-z0-9_]/u.test(source[end] ?? "")) end += 1;
      tokens.push({ kind: "identifier", text: source.slice(i, end) });
      i = end;
      continue;
    }
    throw new LoopVcError(
      "loop-vc-unsupported-token",
      `unsupported token '${ch}' in loop-vc0 expression`,
    );
  }
  tokens.push({ kind: "eof", text: "" });
  return tokens;
}

class Parser {
  constructor(source, identifiers) {
    this.source = normalize(source);
    this.tokens = tokenize(this.source);
    this.identifiers = identifiers;
    this.index = 0;
  }

  current() {
    return this.tokens[this.index];
  }

  consume(text) {
    if (this.current()?.text !== text) return false;
    this.index += 1;
    return true;
  }

  expect(text) {
    if (!this.consume(text)) {
      throw new LoopVcError(
        "loop-vc-syntax-error",
        `expected '${text}' but found '${this.current()?.text ?? "<eof>"}'`,
      );
    }
  }

  parseExpression() {
    let left = this.parsePrimary();
    while (["+", "-"].includes(this.current()?.text)) {
      const operator = this.current().text;
      this.index += 1;
      const right = this.parsePrimary();
      left = { kind: "binary", operator, left, right, type: "Nat" };
    }
    return left;
  }

  parsePrimary() {
    const token = this.current();
    if (token.kind === "number") {
      this.index += 1;
      return { kind: "literal", value: token.text, type: "Nat" };
    }
    if (token.kind === "identifier") {
      this.index += 1;
      if (!this.identifiers.has(token.text)) {
        throw new LoopVcError(
          "loop-vc-unknown-identifier",
          `unknown identifier '${token.text}' in loop-vc0 expression`,
        );
      }
      return { kind: "identifier", name: token.text, type: "Nat" };
    }
    if (this.consume("(")) {
      const expression = this.parseExpression();
      this.expect(")");
      return { kind: "group", expression, type: "Nat" };
    }
    throw new LoopVcError(
      "loop-vc-syntax-error",
      `expected Nat expression but found '${token?.text ?? "<eof>"}'`,
    );
  }

  parseCompleteExpression() {
    const result = this.parseExpression();
    if (this.current()?.kind !== "eof") {
      throw new LoopVcError(
        "loop-vc-unsupported-expression",
        `unsupported trailing syntax '${this.current()?.text}' in loop-vc0 expression`,
      );
    }
    return result;
  }

  parsePredicate() {
    const left = this.parseExpression();
    const operator = this.current()?.text;
    if (!["=", "==", "!=", ">", ">=", "<", "<="].includes(operator)) {
      throw new LoopVcError(
        "loop-vc-predicate-relation-required",
        "loop-vc0 predicates must use one Nat relation",
      );
    }
    this.index += 1;
    const right = this.parseExpression();
    if (this.current()?.kind !== "eof") {
      throw new LoopVcError(
        "loop-vc-unsupported-predicate",
        `unsupported trailing syntax '${this.current()?.text}' in loop-vc0 predicate`,
      );
    }
    return { kind: "relation", operator, left, right, type: "Prop" };
  }
}

function parseExpression(source, identifiers) {
  return new Parser(source, identifiers).parseCompleteExpression();
}

function parsePredicate(source, identifiers) {
  return new Parser(source, identifiers).parsePredicate();
}

function cloneAst(ast) {
  return JSON.parse(JSON.stringify(ast));
}

function substitute(ast, replacements) {
  if (!ast || typeof ast !== "object") return ast;
  if (ast.kind === "identifier" && replacements.has(ast.name)) {
    return cloneAst(replacements.get(ast.name));
  }
  if (ast.kind === "binary" || ast.kind === "relation") {
    return {
      ...ast,
      left: substitute(ast.left, replacements),
      right: substitute(ast.right, replacements),
    };
  }
  if (ast.kind === "group") {
    return { ...ast, expression: substitute(ast.expression, replacements) };
  }
  return cloneAst(ast);
}

function precedence(ast) {
  if (!ast) return 99;
  if (ast.kind === "relation") return 1;
  if (ast.kind === "binary" && ["+", "-"].includes(ast.operator)) return 2;
  return 3;
}

function renderExpression(ast, parentPrecedence = 0) {
  if (ast.kind === "literal") return ast.value;
  if (ast.kind === "identifier") return ast.name;
  if (ast.kind === "group") return `(${renderExpression(ast.expression)})`;
  if (ast.kind === "binary") {
    const p = precedence(ast);
    const body = `${renderExpression(ast.left, p)} ${ast.operator} ${renderExpression(ast.right, p + (ast.operator === "-" ? 1 : 0))}`;
    return p < parentPrecedence ? `(${body})` : body;
  }
  throw new LoopVcError("loop-vc-render-expression", `cannot render AST kind '${ast.kind}' as Nat expression`);
}

function renderPredicate(ast) {
  if (ast.kind !== "relation") {
    throw new LoopVcError("loop-vc-render-predicate", "expected relation predicate");
  }
  const operator = ast.operator === "==" ? "=" : ast.operator === "!=" ? "≠" : ast.operator;
  return `${renderExpression(ast.left)} ${operator} ${renderExpression(ast.right)}`;
}

function parameterEnvironment(contract) {
  const ids = new Set();
  for (const parameter of contract.params ?? []) {
    if (normalize(parameter.type) !== "Nat") {
      throw new LoopVcError(
        "loop-vc-non-nat-parameter",
        `loop-vc0 requires Nat parameters; '${parameter.name}' has type ${parameter.type}`,
      );
    }
    ids.add(parameter.name);
  }
  if (normalize(contract.returnType) !== "Nat") {
    throw new LoopVcError(
      "loop-vc-non-nat-return",
      `loop-vc0 requires Nat return type; found ${contract.returnType}`,
    );
  }
  return ids;
}

function parseRuntimeShell(contract, parameterIds) {
  let source = normalize(contract.body);
  const locals = [];
  const initEnvironment = new Map();

  while (/^let mut\b/u.test(source)) {
    const match = source.match(/^let mut\s+([A-Za-z_][A-Za-z0-9_]*)\s*:\s*Nat\s*:=\s*([^;]+);\s*/u);
    if (!match) {
      throw new LoopVcError(
        "loop-vc-local-declaration",
        "loop-vc0 admits only 'let mut <name>: Nat := <linear-expr>;' before the loop",
      );
    }
    const name = match[1];
    if (parameterIds.has(name) || initEnvironment.has(name)) {
      throw new LoopVcError("loop-vc-duplicate-local", `duplicate or shadowing mutable local '${name}'`);
    }
    const identifiers = new Set([...parameterIds, ...initEnvironment.keys()]);
    const parsedInit = parseExpression(match[2], identifiers);
    const loweredInit = substitute(parsedInit, initEnvironment);
    initEnvironment.set(name, loweredInit);
    locals.push({ name, type: "Nat", initializer: normalize(match[2]), initializerAst: parsedInit });
    source = source.slice(match[0].length).trim();
  }

  if (locals.length === 0) {
    throw new LoopVcError("loop-vc-no-mutable-locals", "loop-vc0 requires at least one mutable Nat local");
  }
  if (!source || source.includes(";")) {
    throw new LoopVcError(
      "loop-vc-runtime-shell",
      "after removing the single while loop, loop-vc0 requires exactly one final Nat result expression",
    );
  }

  const allIds = new Set([...parameterIds, ...locals.map((item) => item.name)]);
  const resultAst = parseExpression(source, allIds);
  return { locals, initEnvironment, resultExpression: source, resultAst, allIds };
}

function parseAssignments(loopBody, allIds, mutableNames) {
  const statements = String(loopBody ?? "")
    .split(";")
    .map((value) => normalize(value))
    .filter(Boolean);
  if (statements.length === 0) {
    throw new LoopVcError("loop-vc-empty-body", "loop-vc0 requires at least one loop assignment");
  }

  const current = new Map([...mutableNames].map((name) => [name, { kind: "identifier", name, type: "Nat" }]));
  const assignments = [];

  for (const statement of statements) {
    const match = statement.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*:=\s*(.+)$/u);
    if (!match) {
      throw new LoopVcError(
        "loop-vc-assignment-shape",
        `loop-vc0 admits only sequential assignments; found '${statement}'`,
      );
    }
    const target = match[1];
    if (!mutableNames.has(target)) {
      throw new LoopVcError(
        "loop-vc-assignment-target",
        `loop-vc0 assignment target '${target}' is not a declared mutable local`,
      );
    }
    const parsed = parseExpression(match[2], allIds);
    const lowered = substitute(parsed, current);
    current.set(target, lowered);
    assignments.push({ target, expression: normalize(match[2]), expressionAst: parsed, loweredAst: lowered });
  }

  return { assignments, postState: current };
}

function requirementHypotheses(contract, parameterIds) {
  return (contract.requirements ?? []).map((requirement) => ({
    name: requirement.name,
    source: requirement.proposition,
    ast: parsePredicate(requirement.proposition, parameterIds),
  }));
}

function binders(items) {
  return items.map((item) => `(${item.name} : ${item.type})`).join(" ");
}

function theorem(name, binderText, hypothesisText, target, tactic = "omega") {
  const allBinders = [binderText, hypothesisText].filter(Boolean).join(" ");
  return {
    theoremName: name,
    theoremStatement: `theorem ${name}${allBinders ? ` ${allBinders}` : ""} : ${target}`,
    source: `theorem ${name}${allBinders ? ` ${allBinders}` : ""} : ${target} := by\n  ${tactic}`,
  };
}

function hypothesisBinder(name, proposition) {
  return `(${name} : ${proposition})`;
}

function buildLoopVc(contract) {
  if ((contract.loops ?? []).length !== 1) {
    throw new LoopVcError("loop-vc-loop-count", "loop-vc0 requires exactly one while loop");
  }
  if ((contract.ghosts ?? []).length > 0 || (contract.assertions ?? []).length > 0 || (contract.oldSnapshots ?? []).length > 0) {
    throw new LoopVcError(
      "loop-vc-proof-feature-composition",
      "loop-vc0 does not yet compose ghost/assert/old with loop semantics",
    );
  }

  const loop = contract.loops[0];
  if ((loop.invariants ?? []).length === 0) {
    throw new LoopVcError("loop-vc-invariant-required", "loop-vc0 requires at least one invariant");
  }
  if ((loop.decreases ?? []).length !== 1) {
    throw new LoopVcError("loop-vc-decreases-required", "loop-vc0 requires exactly one decreases measure");
  }

  const parameterIds = parameterEnvironment(contract);
  const shell = parseRuntimeShell(contract, parameterIds);
  const mutableNames = new Set(shell.locals.map((item) => item.name));
  const body = parseAssignments(loop.body, shell.allIds, mutableNames);
  const requirements = requirementHypotheses(contract, parameterIds);
  const conditionAst = parsePredicate(loop.condition, shell.allIds);
  const invariants = loop.invariants.map((invariant) => ({
    ...invariant,
    ast: parsePredicate(invariant.proposition, shell.allIds),
  }));
  const measure = {
    ...loop.decreases[0],
    ast: parseExpression(loop.decreases[0].expression, shell.allIds),
  };

  const parameterBinders = binders((contract.params ?? []).map((item) => ({ name: item.name, type: "Nat" })));
  const localBinders = binders(shell.locals.map((item) => ({ name: item.name, type: "Nat" })));
  const requirementBinders = requirements.map((item) =>
    hypothesisBinder(item.name, renderPredicate(item.ast))
  );
  const invariantBinders = invariants.map((item) =>
    hypothesisBinder(`hinv_${item.name}`, renderPredicate(item.ast))
  );
  const conditionSource = renderPredicate(conditionAst);
  const conditionBinder = hypothesisBinder("hloop_cond", conditionSource);
  const notConditionBinder = hypothesisBinder("hloop_exit", `¬ (${conditionSource})`);

  const vcs = [];

  for (const invariant of invariants) {
    const initTarget = renderPredicate(substitute(invariant.ast, shell.initEnvironment));
    const built = theorem(
      `${contract.name}_loop0_${invariant.name}_init`,
      parameterBinders,
      requirementBinders.join(" "),
      initTarget,
    );
    vcs.push({
      id: `${contract.name}.loop.invariant.init.0.${invariant.name}`,
      kind: "loop.invariant.init",
      label: `0.invariant.${invariant.name}.init`,
      invariant: invariant.name,
      target: initTarget,
      ...built,
    });

    const preserveTarget = renderPredicate(substitute(invariant.ast, body.postState));
    const builtPreserve = theorem(
      `${contract.name}_loop0_${invariant.name}_preserve`,
      [parameterBinders, localBinders].filter(Boolean).join(" "),
      [...requirementBinders, ...invariantBinders, conditionBinder].join(" "),
      preserveTarget,
    );
    vcs.push({
      id: `${contract.name}.loop.invariant.preserve.0.${invariant.name}`,
      kind: "loop.invariant.preserve",
      label: `0.invariant.${invariant.name}.preserve`,
      invariant: invariant.name,
      target: preserveTarget,
      ...builtPreserve,
    });
  }

  const beforeMeasure = renderExpression(measure.ast);
  const afterMeasure = renderExpression(substitute(measure.ast, body.postState));
  const decreaseTarget = `${afterMeasure} < ${beforeMeasure}`;
  const decreaseTheorem = theorem(
    `${contract.name}_loop0_${measure.name}_decreases`,
    [parameterBinders, localBinders].filter(Boolean).join(" "),
    [...requirementBinders, ...invariantBinders, conditionBinder].join(" "),
    decreaseTarget,
  );
  vcs.push({
    id: `${contract.name}.loop.decreases.0.${measure.name}`,
    kind: "loop.decreases",
    label: `0.decreases.${measure.name}`,
    decreases: measure.name,
    target: decreaseTarget,
    beforeMeasure,
    afterMeasure,
    ...decreaseTheorem,
  });

  const resultReplacements = new Map([["result", shell.resultAst]]);
  for (const ensure of contract.ensures ?? []) {
    const raw = ensure.rawProposition ?? ensure.proposition;
    const ensureIds = new Set([...shell.allIds, "result"]);
    const ensureAst = parsePredicate(raw, ensureIds);
    const exitTarget = renderPredicate(substitute(ensureAst, resultReplacements));
    const exitTheorem = theorem(
      `${contract.name}_loop0_${ensure.name}_exit`,
      [parameterBinders, localBinders].filter(Boolean).join(" "),
      [...requirementBinders, ...invariantBinders, notConditionBinder].join(" "),
      exitTarget,
    );
    vcs.push({
      id: `${contract.name}.loop.exit.0.${ensure.name}`,
      kind: "loop.exit",
      label: `0.exit.${ensure.name}`,
      ensures: ensure.name,
      target: exitTarget,
      ...exitTheorem,
    });
  }

  const leanSource = [
    "import Lean",
    "",
    "namespace ProofScript.Generated.LoopVC",
    "",
    ...vcs.flatMap((vc) => [vc.source, ""]),
    "end ProofScript.Generated.LoopVC",
    "",
  ].join("\n");

  return {
    schema: "proofscript.loop-vc/v1",
    profile: "loop-vc0",
    ready: true,
    sourceFunction: contract.name,
    loopIndex: 0,
    parameters: contract.params,
    locals: shell.locals,
    resultExpression: shell.resultExpression,
    condition: { source: loop.condition, lean: conditionSource, ast: conditionAst },
    invariants: invariants.map((item) => ({
      name: item.name,
      source: item.proposition,
      lean: renderPredicate(item.ast),
      ast: item.ast,
    })),
    decreases: {
      name: measure.name,
      source: measure.expression,
      lean: beforeMeasure,
      ast: measure.ast,
    },
    assignments: body.assignments,
    vcs,
    obligations: vcs.map((vc) => ({
      id: vc.kind === "loop.exit"
        ? `${contract.name}.ensures.${vc.ensures}`
        : vc.id,
      name: vc.theoremName,
      label: vc.kind === "loop.exit" ? vc.ensures : vc.label,
      kind: vc.kind === "loop.exit" ? "ensures" : vc.kind,
      loopVcKind: vc.kind,
      sourceFunction: contract.name,
      loopIndex: 0,
      proposition: vc.target,
      statement: vc.target,
      exactTheoremStatement: vc.theoremStatement,
      theoremStatement: vc.theoremStatement,
      proofPoint: vc.kind === "loop.exit" ? `loop exit establishes ensures ${vc.ensures}` : vc.kind,
      vcgenLoweringStatus: "semantic-loop-vc-generated",
      leanCheckable: true,
      status: "unproved",
    })),
    lean: {
      import: "Lean",
      tactic: "omega",
      source: leanSource,
    },
    claims: {
      semanticLoopVcGenerationComplete: true,
      leanSourceGenerated: true,
      leanTypechecked: false,
      semanticProofDischarge: false,
      sourceRuntimeCorrespondenceChecked: false,
    },
  };
}

export function createLoopVerificationArtifact(contract) {
  if ((contract?.loops ?? []).length === 0) {
    return {
      schema: "proofscript.loop-vc/v1",
      profile: null,
      ready: false,
      reasons: ["loop-vc-no-loop"],
      claims: {
        semanticLoopVcGenerationComplete: false,
        leanSourceGenerated: false,
        leanTypechecked: false,
        semanticProofDischarge: false,
        sourceRuntimeCorrespondenceChecked: false,
      },
    };
  }
  try {
    return buildLoopVc(contract);
  } catch (error) {
    if (!(error instanceof LoopVcError)) throw error;
    return {
      schema: "proofscript.loop-vc/v1",
      profile: "loop-vc0",
      ready: false,
      reasons: [error.code],
      diagnostic: error.message,
      claims: {
        semanticLoopVcGenerationComplete: false,
        leanSourceGenerated: false,
        leanTypechecked: false,
        semanticProofDischarge: false,
        sourceRuntimeCorrespondenceChecked: false,
      },
    };
  }
}
