function normalizeSpaces(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

const NUMERIC_TYPES = new Set([
  'Nat', 'Int', 'UInt8', 'UInt16', 'UInt32', 'UInt64', 'USize', 'Float',
]);

class PredicateAstError extends Error {
  constructor(code, message, offset) {
    super(message);
    this.name = 'PredicateAstError';
    this.code = code;
    this.offset = offset;
  }
}

function tokenize(sourceText) {
  const source = String(sourceText ?? '');
  const tokens = [];
  let i = 0;
  while (i < source.length) {
    const ch = source[i];
    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }

    const two = source.slice(i, i + 2);
    if (['>=', '<=', '==', '!='].includes(two)) {
      tokens.push({ kind: 'operator', text: two, start: i, end: i + 2 });
      i += 2;
      continue;
    }

    if (['=', '>', '<', '+', '-', '*', '(', ')', ','].includes(ch)) {
      const kind = ['(', ')', ','].includes(ch) ? 'punctuation' : 'operator';
      tokens.push({ kind, text: ch, start: i, end: i + 1 });
      i += 1;
      continue;
    }

    if (/[0-9]/.test(ch)) {
      let end = i + 1;
      while (/[0-9]/.test(source[end] ?? '')) end += 1;
      tokens.push({ kind: 'number', text: source.slice(i, end), start: i, end });
      i = end;
      continue;
    }

    if (ch === '"') {
      let end = i + 1;
      let escaped = false;
      for (; end < source.length; end += 1) {
        const current = source[end];
        if (escaped) {
          escaped = false;
          continue;
        }
        if (current === '\\') {
          escaped = true;
          continue;
        }
        if (current === '"') {
          end += 1;
          break;
        }
      }
      if (end > source.length || source[end - 1] !== '"') {
        throw new PredicateAstError('stateful-predicate-ast-unterminated-string', 'unterminated string literal', i);
      }
      tokens.push({ kind: 'string', text: source.slice(i, end), start: i, end });
      i = end;
      continue;
    }

    if (/[A-Za-z_]/.test(ch)) {
      let end = i + 1;
      while (/[A-Za-z0-9_.]/.test(source[end] ?? '')) end += 1;
      tokens.push({ kind: 'identifier', text: source.slice(i, end), start: i, end });
      i = end;
      continue;
    }

    throw new PredicateAstError(
      'stateful-predicate-ast-unsupported-syntax',
      `unsupported token '${ch}' in normalized stateful predicate`,
      i,
    );
  }

  tokens.push({ kind: 'eof', text: '', start: source.length, end: source.length });
  return tokens;
}

function environmentFrom(contract, elaboration) {
  const identifiers = new Map();
  for (const parameter of contract?.params ?? []) {
    identifiers.set(parameter.name, { type: parameter.type, role: 'program-parameter' });
  }
  for (const binder of Object.values(elaboration?.binders ?? {})) {
    if (binder?.name) identifiers.set(binder.name, { type: binder.type, role: binder.role });
  }
  identifiers.set('True', { type: 'Prop', role: 'proposition-constant' });
  identifiers.set('False', { type: 'Prop', role: 'proposition-constant' });

  const observations = new Map();
  for (const observation of elaboration?.observations ?? []) {
    observations.set(observation.name, {
      name: observation.name,
      inputTypes: [...(observation.inputTypes ?? []), observation.stateInputType].filter(Boolean),
      outputType: observation.outputType,
      stateArgument: observation.stateArgument,
      valid: observation.valid === true,
    });
  }
  return { identifiers, observations };
}

function diagnostic(code, message, node, extra = {}) {
  return {
    code,
    severity: 'error',
    message,
    startOffset: node?.start ?? null,
    endOffset: node?.end ?? null,
    ...extra,
  };
}

class Parser {
  constructor(source, contract, elaboration) {
    this.source = source;
    this.tokens = tokenize(source);
    this.index = 0;
    this.contract = contract;
    this.elaboration = elaboration;
    this.environment = environmentFrom(contract, elaboration);
    this.diagnostics = [];
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
    const token = this.current();
    if (token?.text !== text) {
      throw new PredicateAstError(
        'stateful-predicate-ast-syntax-error',
        `expected '${text}' but found '${token?.text ?? '<eof>'}'`,
        token?.start ?? this.source.length,
      );
    }
    this.index += 1;
    return token;
  }

  parse() {
    const root = this.parseComparison();
    const token = this.current();
    if (token.kind !== 'eof') {
      throw new PredicateAstError(
        'stateful-predicate-ast-unsupported-syntax',
        `unsupported trailing syntax starting at '${token.text}'`,
        token.start,
      );
    }
    if (root.type !== 'Prop') {
      this.diagnostics.push(diagnostic(
        'stateful-predicate-root-not-prop',
        `stateful postcondition must have type Prop, found ${root.type ?? 'unknown'}`,
        root,
        { actualType: root.type ?? null },
      ));
    }
    return root;
  }

  parseComparison() {
    let left = this.parseAdditive();
    const token = this.current();
    if (!['=', '==', '!=', '>', '>=', '<', '<='].includes(token.text)) return left;

    this.index += 1;
    const right = this.parseAdditive();
    const node = {
      kind: 'relation',
      operator: token.text,
      left,
      right,
      type: 'Prop',
      start: left.start,
      end: right.end,
    };

    if (!left.type || !right.type) {
      this.diagnostics.push(diagnostic(
        'stateful-predicate-relation-unknown-type',
        `cannot type relation '${token.text}' because an operand type is unknown`,
        node,
        { leftType: left.type ?? null, rightType: right.type ?? null },
      ));
      return node;
    }

    if (normalizeSpaces(left.type) !== normalizeSpaces(right.type)) {
      this.diagnostics.push(diagnostic(
        'stateful-predicate-ast-type-mismatch',
        `relation '${token.text}' compares ${left.type} with ${right.type}`,
        node,
        { leftType: left.type, rightType: right.type },
      ));
      return node;
    }

    if (!['=', '==', '!='].includes(token.text) && !NUMERIC_TYPES.has(normalizeSpaces(left.type))) {
      this.diagnostics.push(diagnostic(
        'stateful-predicate-nonnumeric-ordering',
        `ordering relation '${token.text}' requires a numeric type, found ${left.type}`,
        node,
        { operandType: left.type },
      ));
    }
    return node;
  }

  parseAdditive() {
    let left = this.parseMultiplicative();
    while (['+', '-'].includes(this.current().text)) {
      const token = this.current();
      this.index += 1;
      const right = this.parseMultiplicative();
      const node = {
        kind: 'binary',
        operator: token.text,
        left,
        right,
        type: left.type ?? right.type ?? null,
        start: left.start,
        end: right.end,
      };
      this.checkArithmetic(node);
      left = node;
    }
    return left;
  }

  parseMultiplicative() {
    let left = this.parsePrimary();
    while (this.current().text === '*') {
      const token = this.current();
      this.index += 1;
      const right = this.parsePrimary();
      const node = {
        kind: 'binary',
        operator: token.text,
        left,
        right,
        type: left.type ?? right.type ?? null,
        start: left.start,
        end: right.end,
      };
      this.checkArithmetic(node);
      left = node;
    }
    return left;
  }

  checkArithmetic(node) {
    const leftType = node.left.type;
    const rightType = node.right.type;
    if (!leftType || !rightType) {
      node.type = null;
      this.diagnostics.push(diagnostic(
        'stateful-predicate-arithmetic-unknown-type',
        `cannot type arithmetic operator '${node.operator}' because an operand type is unknown`,
        node,
        { leftType: leftType ?? null, rightType: rightType ?? null },
      ));
      return;
    }
    if (normalizeSpaces(leftType) !== normalizeSpaces(rightType)) {
      node.type = null;
      this.diagnostics.push(diagnostic(
        'stateful-predicate-ast-type-mismatch',
        `arithmetic operator '${node.operator}' combines ${leftType} with ${rightType}`,
        node,
        { leftType, rightType },
      ));
      return;
    }
    if (!NUMERIC_TYPES.has(normalizeSpaces(leftType))) {
      node.type = null;
      this.diagnostics.push(diagnostic(
        'stateful-predicate-nonnumeric-arithmetic',
        `arithmetic operator '${node.operator}' requires numeric operands, found ${leftType}`,
        node,
        { operandType: leftType },
      ));
      return;
    }
    node.type = leftType;
  }

  parsePrimary() {
    const token = this.current();

    if (token.kind === 'number') {
      this.index += 1;
      return { kind: 'literal', literalKind: 'Nat', value: token.text, type: 'Nat', start: token.start, end: token.end };
    }

    if (token.kind === 'string') {
      this.index += 1;
      return { kind: 'literal', literalKind: 'String', value: token.text, type: 'String', start: token.start, end: token.end };
    }

    if (token.kind === 'identifier') {
      this.index += 1;
      if (token.text === 'true' || token.text === 'false') {
        return { kind: 'literal', literalKind: 'Bool', value: token.text, type: 'Bool', start: token.start, end: token.end };
      }
      if (this.consume('(')) return this.parseCall(token);
      const binding = this.environment.identifiers.get(token.text);
      if (!binding) {
        const node = { kind: 'identifier', name: token.text, type: null, role: 'unknown', start: token.start, end: token.end };
        this.diagnostics.push(diagnostic(
          'stateful-predicate-unknown-identifier',
          `unknown identifier '${token.text}' in normalized stateful predicate`,
          node,
          { identifier: token.text },
        ));
        return node;
      }
      return {
        kind: 'identifier',
        name: token.text,
        type: binding.type,
        role: binding.role,
        start: token.start,
        end: token.end,
      };
    }

    if (this.consume('(')) {
      const start = token.start;
      const inner = this.parseComparison();
      const close = this.expect(')');
      return { kind: 'group', expression: inner, type: inner.type, start, end: close.end };
    }

    throw new PredicateAstError(
      'stateful-predicate-ast-syntax-error',
      `expected predicate term but found '${token.text || '<eof>'}'`,
      token.start,
    );
  }

  parseCall(calleeToken) {
    const args = [];
    let close;
    if (this.consume(')')) {
      close = this.tokens[this.index - 1];
    } else {
      while (true) {
        args.push(this.parseComparison());
        if (this.consume(')')) {
          close = this.tokens[this.index - 1];
          break;
        }
        this.expect(',');
      }
    }

    const signature = this.environment.observations.get(calleeToken.text);
    const node = {
      kind: 'call',
      callee: calleeToken.text,
      args,
      type: signature?.outputType ?? null,
      role: signature ? 'state-observation' : 'unknown-call',
      start: calleeToken.start,
      end: close.end,
    };

    if (!signature?.valid) {
      this.diagnostics.push(diagnostic(
        'stateful-predicate-unknown-call',
        `call '${calleeToken.text}' is not a valid descriptor-bound state observation`,
        node,
        { callee: calleeToken.text },
      ));
      return node;
    }

    if (args.length !== signature.inputTypes.length) {
      this.diagnostics.push(diagnostic(
        'stateful-predicate-call-arity-mismatch',
        `state observation '${calleeToken.text}' expects ${signature.inputTypes.length} arguments after normalization but received ${args.length}`,
        node,
        { expected: signature.inputTypes.length, actual: args.length },
      ));
    }

    for (let i = 0; i < Math.min(args.length, signature.inputTypes.length); i += 1) {
      const actualType = args[i].type;
      const expectedType = signature.inputTypes[i];
      if (actualType && normalizeSpaces(actualType) !== normalizeSpaces(expectedType)) {
        this.diagnostics.push(diagnostic(
          'stateful-predicate-ast-type-mismatch',
          `state observation '${calleeToken.text}' argument ${i + 1} expects ${expectedType} but has type ${actualType}`,
          args[i],
          { callee: calleeToken.text, argumentIndex: i, expectedType, actualType },
        ));
      }
    }

    return node;
  }
}

function parsePredicateRecord({ kind, name, source, normalizedPredicate }, contract, predicateElaboration, diagnostics) {
  try {
    const parser = new Parser(normalizedPredicate, contract, predicateElaboration);
    const root = parser.parse();
    const scopedDiagnostics = parser.diagnostics.map(item => ({ ...item, scope: kind, name }));
    diagnostics.push(...scopedDiagnostics);
    return {
      kind,
      name,
      source,
      normalizedPredicate,
      root,
      inferredType: root.type,
      diagnostics: scopedDiagnostics,
      typeCheckingComplete: scopedDiagnostics.length === 0 && root.type === 'Prop',
    };
  } catch (error) {
    if (!(error instanceof PredicateAstError)) throw error;
    const item = {
      code: error.code,
      severity: 'error',
      scope: kind,
      name,
      message: error.message,
      startOffset: error.offset,
      endOffset: error.offset,
    };
    diagnostics.push(item);
    return {
      kind,
      name,
      source,
      normalizedPredicate,
      root: null,
      inferredType: null,
      diagnostics: [item],
      typeCheckingComplete: false,
    };
  }
}

export function createStatefulPredicateAstForContract(contract, predicateElaboration) {
  if (!predicateElaboration || predicateElaboration.schema !== 'proofscript.stateful-predicate-elaboration/v1') {
    throw new Error('typed predicate AST requires proofscript.stateful-predicate-elaboration/v1');
  }

  const diagnostics = [];
  const requirements = (contract.requirements ?? []).map(requirement =>
    parsePredicateRecord({
      kind: 'requires',
      name: requirement.name,
      source: requirement.proposition,
      normalizedPredicate: requirement.proposition,
    }, contract, predicateElaboration, diagnostics)
  );
  const clauses = (predicateElaboration.clauses ?? []).map(clause =>
    parsePredicateRecord({
      kind: 'ensures',
      name: clause.name,
      source: clause.source,
      normalizedPredicate: clause.normalizedPredicate,
    }, contract, predicateElaboration, diagnostics)
  );

  const unsupportedSyntax = diagnostics.some(item =>
    item.code === 'stateful-predicate-ast-unsupported-syntax'
    || item.code === 'stateful-predicate-ast-syntax-error'
  );
  const hasTypeErrors = diagnostics.some(item =>
    item.severity === 'error'
    && !['stateful-predicate-ast-unsupported-syntax', 'stateful-predicate-ast-syntax-error'].includes(item.code)
  );
  const requirementsTypeCheckingComplete = requirements.every(item => item.typeCheckingComplete);
  const postconditionsTypeCheckingComplete = clauses.every(item => item.typeCheckingComplete);
  const typeCheckingComplete = requirementsTypeCheckingComplete
    && postconditionsTypeCheckingComplete
    && diagnostics.length === 0;

  return {
    schema: 'proofscript.stateful-predicate-ast/v1',
    sourceElaborationSchema: predicateElaboration.schema,
    grammarProfile: 'stateful-predicate-expressions0',
    requirements,
    clauses,
    diagnostics,
    unsupportedSyntax,
    hasTypeErrors,
    requirementsTypeCheckingComplete,
    postconditionsTypeCheckingComplete,
    typeCheckingComplete,
    wpTripleSemanticBindingComplete: false,
    stateModelAdequacyChecked: false,
    verificationConditionsGenerated: false,
    semanticProofDischarge: false,
  };
}
