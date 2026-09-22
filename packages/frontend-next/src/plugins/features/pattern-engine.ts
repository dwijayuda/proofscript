import { ProofScriptError } from "../../core/errors.js";
import type { DeclarationElaborationContext, ParserCursor } from "../../core/plugin-api.js";
import type { IREquationPattern, IRExpr, IRParam, IRType, SurfaceExpr } from "../../core/model.js";
import { exprKey, makeTypeTerm, makeTypeVariable, sameType, substituteExpr, substituteType } from "../../core/type-utils.js";
import { exactMatchableKey, familyMatchableKey, type MatchableDescriptor, type MatchableVariant } from "./matchable.js";

export type SurfacePattern =
  | { readonly kind: "constructor"; readonly variant: string; readonly fields: readonly SurfacePattern[] }
  | { readonly kind: "number"; readonly value: string }
  | { readonly kind: "wildcard" }
  | { readonly kind: "variable"; readonly name: string }
  | { readonly kind: "inaccessible"; readonly term: SurfaceExpr }
  | { readonly kind: "named"; readonly name: string; readonly equalityName?: string; readonly pattern: SurfacePattern };

export interface SurfacePatternAlternative {
  readonly sequences: readonly (readonly SurfacePattern[])[];
  readonly body: SurfaceExpr;
}

export interface PatternCompileOptions {
  /** Explicit Lean motive function type, already elaborated. */
  readonly motive?: IRType;
  /** Context-local generalization. Explicit match passes Lean's default `true` when omitted. */
  readonly generalizing?: boolean;
  /** Preserve whether the source wrote the option so Lean emission can retain it. */
  readonly sourceGeneralizing?: boolean;
  /** Equality-evidence names from named discriminants, one per original discriminant. */
  readonly discriminantEqualityNames?: readonly (string | undefined)[];
}

export interface PatternMatchSyntaxMetadata {
  readonly motive?: IRType;
  readonly generalizing?: boolean;
  readonly discriminantEqualityName?: string;
}

interface PendingEquality {
  readonly sourceName: string;
  readonly wholeName?: string;
  readonly preserveName?: boolean;
}

interface InaccessibleCheck {
  readonly term: SurfaceExpr;
  readonly scrutinee: IRExpr;
}

interface Binding {
  readonly type: IRType;
  readonly value: IRExpr;
}

interface PatternRow {
  readonly patterns: readonly SurfacePattern[];
  readonly body: SurfaceExpr;
  readonly bindings: ReadonlyMap<string, Binding>;
  /** Outer value-index locals refined by constructors on the path to this row. */
  readonly valueRefinements: ReadonlyMap<string, IRExpr>;
  /** Runtime/discriminant variables refined to concrete constructor/literal branch terms. */
  readonly termRefinements: ReadonlyMap<string, IRExpr>;
  /** Original discriminants progressively specialized to branch values. */
  readonly branchDiscriminants: readonly IRExpr[];
  /** Equality requests discovered while normalizing named patterns/discriminants. */
  readonly pendingEqualities: ReadonlyMap<string, readonly PendingEquality[]>;
  /** Source proof names rewritten to generated named-discriminant proof binders. */
  readonly proofAliases: ReadonlyMap<string, string>;
  /** Inaccessible-pattern constraints checked after later patterns refine the branch. */
  readonly inaccessibleChecks: readonly InaccessibleCheck[];
  /** Synthetic constructor-local term indices required only for dependent typing. */
  readonly hiddenLocals: ReadonlyMap<string, IRType>;
  /** Synthetic constructor-local type parameters required by dependent field types. */
  readonly hiddenTypeLocals: ReadonlyMap<string, IRType>;
}

interface CompileState {
  resultType?: IRType;
  generated: number;
  readonly generalizing: boolean;
}

export interface CompiledPatternAlternatives {
  readonly expression: IRExpr;
  readonly resultType: IRType;
}

export function parsePattern(cursor: ParserCursor): SurfacePattern {
  if (cursor.peek(".")) {
    cursor.consume(".");
    if (cursor.peek("(")) {
      cursor.consume("(");
      const term = cursor.parseExpression();
      cursor.expect(")");
      return { kind: "inaccessible", term };
    }
    const variant = cursor.parseIdentifier();
    const fields: SurfacePattern[] = [];
    if (cursor.peek("(")) {
      cursor.consume("(");
      if (!cursor.peek(")")) {
        while (true) {
          fields.push(parsePattern(cursor));
          if (cursor.peek(",")) { cursor.consume(","); continue; }
          break;
        }
      }
      cursor.expect(")");
    }
    return { kind: "constructor", variant, fields };
  }

  const token = cursor.currentToken();
  if (token.kind === "number") return { kind: "number", value: cursor.consume() };
  if (token.kind === "identifier") {
    const name = cursor.parseIdentifier();
    if (name === "_") return { kind: "wildcard" };
    if (cursor.peek("@")) {
      cursor.consume("@");
      if (cursor.currentToken().kind === "identifier" && cursor.peekAhead(1, ":")) {
        const equalityName = cursor.parseIdentifier();
        cursor.consume(":");
        return { kind: "named", name, equalityName, pattern: parsePattern(cursor) };
      }
      return { kind: "named", name, pattern: parsePattern(cursor) };
    }
    if (cursor.peek("(")) {
      cursor.consume("(");
      const fields: SurfacePattern[] = [];
      if (!cursor.peek(")")) {
        while (true) {
          fields.push(parsePattern(cursor));
          if (cursor.peek(",")) { cursor.consume(","); continue; }
          break;
        }
      }
      cursor.expect(")");
      return { kind: "constructor", variant: name, fields };
    }
    return { kind: "variable", name };
  }
  if (cursor.peek("(")) {
    throw new ProofScriptError("PS2903", "Tuple/parenthesized patterns are reference-defined but require the Product pattern family, which remains deferred in v0.36.");
  }
  throw new ProofScriptError("PS2904", `Unsupported pattern '${token.text}' in the v0.36 dependent-pattern tranche.`);
}

export function parsePatternSequence(cursor: ParserCursor): readonly SurfacePattern[] {
  const patterns: SurfacePattern[] = [parsePattern(cursor)];
  while (cursor.peek(",")) {
    cursor.consume(",");
    patterns.push(parsePattern(cursor));
  }
  return patterns;
}

export function patternBoundNames(pattern: SurfacePattern, result: Set<string> = new Set()): Set<string> {
  switch (pattern.kind) {
    case "variable": result.add(pattern.name); break;
    case "named":
      result.add(pattern.name);
      if (pattern.equalityName) result.add(pattern.equalityName);
      patternBoundNames(pattern.pattern, result);
      break;
    case "constructor": for (const field of pattern.fields) patternBoundNames(field, result); break;
    case "inaccessible":
    case "number":
    case "wildcard": break;
  }
  return result;
}

export function toIRPattern(pattern: SurfacePattern): IREquationPattern {
  switch (pattern.kind) {
    case "constructor": return { kind: "constructor", variant: pattern.variant, fields: pattern.fields.map(toIRPattern) };
    case "number": return { kind: "number", value: pattern.value };
    case "wildcard": return { kind: "wildcard" };
    case "variable": return { kind: "variable", name: pattern.name };
    case "inaccessible": throw new ProofScriptError("PS2932", "Inaccessible patterns require elaboration context before they can be converted to Semantic IR.");
    case "named": return { kind: "named", name: pattern.name, ...(pattern.equalityName ? { equalityName: pattern.equalityName } : {}), pattern: toIRPattern(pattern.pattern) };
  }
}

export function renderPattern(pattern: IREquationPattern): string {
  switch (pattern.kind) {
    case "constructor": {
      const fields = pattern.fields.map(renderPattern).join(", ");
      return `.${pattern.variant}${pattern.fields.length ? `(${fields})` : ""}`;
    }
    case "number": return pattern.value;
    case "wildcard": return "_";
    case "variable": return pattern.name;
    case "inaccessible": return `.(<term>)`;
    case "named": return `${pattern.name} @ ${pattern.equalityName ? `${pattern.equalityName}: ` : ""}${renderPattern(pattern.pattern)}`;
  }
}

export function isPatternIrrefutable(pattern: SurfacePattern, type: IRType, context: DeclarationElaborationContext): boolean {
  switch (pattern.kind) {
    case "wildcard":
    case "variable": return true;
    case "named": return isPatternIrrefutable(pattern.pattern, type, context);
    case "number":
    case "inaccessible": return false;
    case "constructor": {
      const descriptor = descriptorFor(type, context);
      if (!descriptor) return false;
      const variants = descriptor.variantsFor(type);
      if (variants.length !== 1) return false;
      const variant = variants[0]!;
      if (variant.name !== pattern.variant || variant.fields.length !== pattern.fields.length) return false;
      return pattern.fields.every((field, index) => isPatternIrrefutable(field, variant.fields[index]!, context));
    }
  }
}

function descriptorFor(type: IRType, context: DeclarationElaborationContext): MatchableDescriptor | undefined {
  return context.getSemanticInfo<MatchableDescriptor>(exactMatchableKey(type.id))
    ?? (type.family ? context.getSemanticInfo<MatchableDescriptor>(familyMatchableKey(type.family)) : undefined);
}

function typeName(type: IRType): string {
  return type.family?.startsWith("core.adt:") ? type.family.slice("core.adt:".length) : type.displayName;
}

function addBinding(bindings: ReadonlyMap<string, Binding>, name: string, type: IRType, value: IRExpr): ReadonlyMap<string, Binding> {
  if (bindings.has(name)) throw new ProofScriptError("PS2905", `Pattern variable '${name}' is bound more than once in one pattern sequence.`);
  const next = new Map(bindings);
  next.set(name, { type, value });
  return next;
}

function appendPendingEquality(
  pending: ReadonlyMap<string, readonly PendingEquality[]>,
  key: string,
  equality: PendingEquality,
): ReadonlyMap<string, readonly PendingEquality[]> {
  const next = new Map(pending);
  next.set(key, [...(next.get(key) ?? []), equality]);
  return next;
}

function normalizePattern(
  pattern: SurfacePattern,
  scrutinee: IRExpr,
  state: {
    bindings: ReadonlyMap<string, Binding>;
    pendingEqualities: ReadonlyMap<string, readonly PendingEquality[]>;
    inaccessibleChecks: readonly InaccessibleCheck[];
  },
): { pattern: SurfacePattern; bindings: ReadonlyMap<string, Binding>; pendingEqualities: ReadonlyMap<string, readonly PendingEquality[]>; inaccessibleChecks: readonly InaccessibleCheck[] } {
  if (pattern.kind === "variable") {
    return { ...state, pattern: { kind: "wildcard" }, bindings: addBinding(state.bindings, pattern.name, scrutinee.type, scrutinee) };
  }
  if (pattern.kind === "inaccessible") {
    return { ...state, pattern: { kind: "wildcard" }, inaccessibleChecks: [...state.inaccessibleChecks, { term: pattern.term, scrutinee }] };
  }
  if (pattern.kind === "named") {
    const withName = addBinding(state.bindings, pattern.name, scrutinee.type, scrutinee);
    const pendingEqualities = pattern.equalityName
      ? appendPendingEquality(state.pendingEqualities, exprKey(scrutinee), { sourceName: pattern.equalityName, wholeName: pattern.name })
      : state.pendingEqualities;
    return normalizePattern(pattern.pattern, scrutinee, { ...state, bindings: withName, pendingEqualities });
  }
  return { ...state, pattern };
}

function normalizeRow(row: PatternRow, scrutinees: readonly IRExpr[]): PatternRow {
  let bindings = row.bindings;
  let pendingEqualities = row.pendingEqualities;
  let inaccessibleChecks = row.inaccessibleChecks;
  const patterns = row.patterns.map((pattern, index) => {
    const scrutinee = scrutinees[index];
    if (!scrutinee) throw new ProofScriptError("PS2906", "Pattern row/discriminant arity mismatch during elaboration.");
    const normalized = normalizePattern(pattern, scrutinee, { bindings, pendingEqualities, inaccessibleChecks });
    bindings = normalized.bindings;
    pendingEqualities = normalized.pendingEqualities;
    inaccessibleChecks = normalized.inaccessibleChecks;
    return normalized.pattern;
  });
  return { ...row, patterns, bindings, pendingEqualities, inaccessibleChecks };
}

function withExtendedLocals<T>(
  context: DeclarationElaborationContext,
  locals: ReadonlyMap<string, IRType>,
  fn: () => T,
): T {
  const entries = [...locals.entries()];
  const visit = (index: number): T => {
    const entry = entries[index];
    if (!entry) return fn();
    return context.withLocal(entry[0], entry[1], () => visit(index + 1));
  };
  return visit(0);
}

function withExtendedTypeLocals<T>(
  context: DeclarationElaborationContext,
  locals: ReadonlyMap<string, IRType>,
  fn: () => T,
): T {
  const entries = [...locals.entries()];
  const visit = (index: number): T => {
    const entry = entries[index];
    if (!entry) return fn();
    return context.withTypeLocal(entry[0], entry[1], () => visit(index + 1));
  };
  return visit(0);
}

interface InstantiatedVariant {
  readonly fields: readonly IRType[];
  readonly fieldExprs: readonly IRExpr[];
  readonly binders: readonly string[];
  readonly valueRefinements: ReadonlyMap<string, IRExpr>;
  readonly hiddenLocals: ReadonlyMap<string, IRType>;
  readonly hiddenTypeLocals: ReadonlyMap<string, IRType>;
}

function instantiateVariant(variant: MatchableVariant, state: CompileState): InstantiatedVariant {
  const binders = variant.fields.map((_, fieldIndex) => `__ps_pat_${state.generated++}_${fieldIndex}`);
  const valueSubs = new Map<string, IRExpr>();
  const typeSubs = new Map<string, IRType>();
  const hiddenLocals = new Map<string, IRType>();
  const hiddenTypeLocals = new Map<string, IRType>();
  const fieldExprs: IRExpr[] = new Array(variant.fields.length);

  for (const param of variant.constructorParams ?? []) {
    const paramType = substituteType(param.type, typeSubs, valueSubs);
    if (param.isTypeParam) {
      const fresh = `__ps_typeidx_${state.generated++}_${param.sourceName}`;
      const variable = makeTypeVariable(fresh, paramType);
      typeSubs.set(param.placeholder, variable);
      hiddenTypeLocals.set(fresh, paramType);
      continue;
    }
    if (param.visibleFieldIndex !== undefined) {
      const binder = binders[param.visibleFieldIndex]!;
      const value: IRExpr = { kind: "var", name: binder, type: paramType };
      valueSubs.set(param.placeholder, value);
      fieldExprs[param.visibleFieldIndex] = value;
      continue;
    }
    const fresh = `__ps_idx_${state.generated++}_${param.sourceName}`;
    const value: IRExpr = { kind: "var", name: fresh, type: paramType };
    valueSubs.set(param.placeholder, value);
    hiddenLocals.set(fresh, paramType);
  }

  const fields = variant.fields.map((type) => substituteType(type, typeSubs, valueSubs));
  for (let index = 0; index < fields.length; index += 1) {
    if (!fieldExprs[index]) fieldExprs[index] = { kind: "var", name: binders[index]!, type: fields[index]! };
    else fieldExprs[index] = { ...fieldExprs[index]!, type: fields[index]! };
  }
  const valueRefinements = new Map<string, IRExpr>();
  for (const refinement of variant.valueRefinements ?? []) {
    valueRefinements.set(refinement.name, substituteExpr(refinement.value, typeSubs, valueSubs));
  }
  return { fields, fieldExprs, binders, valueRefinements, hiddenLocals, hiddenTypeLocals };
}

function mergeRefinements(base: ReadonlyMap<string, IRExpr>, extra: ReadonlyMap<string, IRExpr>): Map<string, IRExpr> {
  const merged = new Map(base);
  for (const [name, value] of extra) {
    const prior = merged.get(name);
    if (prior && exprKey(prior) !== exprKey(value)) {
      throw new ProofScriptError("PS2930", `Dependent pattern refinements disagree for index '${name}'.`);
    }
    merged.set(name, value);
  }
  return merged;
}

function mergeTermRefinements(base: ReadonlyMap<string, IRExpr>, extra: ReadonlyMap<string, IRExpr>): Map<string, IRExpr> {
  const merged = new Map(base);
  for (const [name, value] of extra) {
    const prior = merged.get(name);
    if (prior && exprKey(prior) !== exprKey(value)) throw new ProofScriptError("PS2933", `Dependent term refinements disagree for '${name}'.`);
    merged.set(name, value);
  }
  return merged;
}

function combinedRefinements(row: PatternRow): Map<string, IRExpr> {
  return mergeTermRefinements(row.valueRefinements, row.termRefinements);
}

function refineExpected(type: IRType | undefined, refinements: ReadonlyMap<string, IRExpr>): IRType | undefined {
  return type && refinements.size > 0 ? substituteType(type, new Map(), refinements) : type;
}

function applyMotiveType(motive: IRType, discriminants: readonly IRExpr[]): IRType {
  let current = motive;
  for (let index = 0; index < discriminants.length; index += 1) {
    const discriminant = discriminants[index]!;
    if (current.form !== "pi" || !current.domain || !current.codomain || !current.binder) {
      throw new ProofScriptError("PS2934", `Explicit match motive expects at least ${discriminants.length} discriminant parameter(s).`);
    }
    if (!sameType(current.domain, discriminant.type)) {
      throw new ProofScriptError("PS2935", `Explicit match motive parameter ${index + 1} expects '${current.domain.displayName}', got '${discriminant.type.displayName}'.`);
    }
    current = substituteType(current.codomain, new Map(), new Map([[current.binder.name, discriminant]]));
  }
  return current;
}

function refinedExpressionType(expr: IRExpr, refinements: ReadonlyMap<string, IRExpr>): IRExpr {
  const type = substituteType(expr.type, new Map(), refinements);
  return type === expr.type ? expr : { ...expr, type } as IRExpr;
}

function equalityType(left: IRExpr, right: IRExpr, context: DeclarationElaborationContext): IRType {
  if (!sameType(left.type, right.type)) throw new ProofScriptError("PS2936", `Pattern equality evidence compares '${left.type.displayName}' with '${right.type.displayName}'.`);
  const prop = context.resolveType("Prop");
  return makeTypeTerm({ kind: "op", op: "proof.eq", args: [left, right], type: prop });
}

function constructorBranchValue(variant: MatchableVariant, instantiated: InstantiatedVariant, scrutinee: IRExpr, refinements: ReadonlyMap<string, IRExpr>): IRExpr {
  const type = substituteType(scrutinee.type, new Map(), refinements);
  return { kind: "call", callee: `.${variant.name}`, args: instantiated.fieldExprs, type };
}

function updateBranchDiscriminants(row: PatternRow, scrutinee: IRExpr, replacement: IRExpr): readonly IRExpr[] {
  const key = exprKey(scrutinee);
  return row.branchDiscriminants.map((item) => exprKey(item) === key ? replacement : item);
}

function elaborateLeaf(row: PatternRow, expected: IRType | undefined, context: DeclarationElaborationContext, state: CompileState): IRExpr {
  const refinements = combinedRefinements(row);
  const baseLocals = state.generalizing ? context.currentLocals() : new Map<string, IRType>();
  const locals = new Map<string, IRType>();
  if (state.generalizing) {
    for (const [name, type] of baseLocals) locals.set(name, substituteType(type, new Map(), refinements));
  }
  for (const [name, type] of row.hiddenLocals) locals.set(name, substituteType(type, new Map(), refinements));

  const substitutions = new Map<string, IRExpr>();
  for (const [name, binding] of row.bindings) {
    const refinedType = refineExpected(binding.type, refinements) ?? binding.type;
    const refinedValue = refinedExpressionType(binding.value, refinements);
    locals.set(name, refinedType);
    substitutions.set(name, refinedValue);
  }
  for (const [sourceName, targetName] of row.proofAliases) {
    const proofType = locals.get(targetName);
    if (!proofType) throw new ProofScriptError("PS2937", `Missing generated equality evidence '${targetName}' for source binder '${sourceName}'.`);
    locals.set(sourceName, proofType);
    substitutions.set(sourceName, { kind: "var", name: targetName, type: proofType });
  }

  const globalTarget = state.resultType ?? expected;
  if (!globalTarget && refinements.size > 0) {
    throw new ProofScriptError("PS2931", "A general dependent indexed match currently requires an expected result type or explicit motive.");
  }
  const target = refineExpected(globalTarget, refinements);

  const elaborateUnderLocals = () => {
    for (const check of row.inaccessibleChecks) {
      const actual = substituteExpr(check.scrutinee, new Map(), refinements);
      const requiredRaw = context.elaborateExpression(check.term, actual.type);
      const required = substitutions.size ? substituteExpr(requiredRaw, new Map(), substitutions) : requiredRaw;
      if (exprKey(required) !== exprKey(actual)) {
        throw new ProofScriptError("PS2938", `Inaccessible pattern is not forced by branch refinements: expected '${exprKey(actual)}', got '${exprKey(required)}'.`);
      }
    }
    return context.elaborateExpression(row.body, target);
  };
  const raw = withExtendedTypeLocals(context, row.hiddenTypeLocals, () => state.generalizing
    ? context.withLocals(locals, elaborateUnderLocals)
    : withExtendedLocals(context, locals, elaborateUnderLocals));
  const body = substitutions.size ? substituteExpr(raw, new Map(), substitutions) : raw;
  state.resultType ??= expected ?? body.type;
  if (target && !sameType(body.type, target)) {
    throw new ProofScriptError("PS2907", `Pattern branch has type '${body.type.displayName}', expected refined motive '${target.displayName}'.`);
  }
  return body;
}

function pendingEqualitiesFor(row: PatternRow, scrutinee: IRExpr): readonly PendingEquality[] {
  return row.pendingEqualities.get(exprKey(scrutinee)) ?? [];
}

function equalityBinderFor(rows: readonly PatternRow[], scrutinee: IRExpr, state: CompileState): string | undefined {
  const requests = rows.flatMap((row) => pendingEqualitiesFor(row, scrutinee));
  if (requests.length === 0) return undefined;
  const preserved = [...new Set(requests.filter((item) => item.preserveName).map((item) => item.sourceName))];
  if (preserved.length > 1) throw new ProofScriptError("PS2939", `Named discriminant equality binders disagree: ${preserved.join(", ")}.`);
  return preserved[0] ?? `__ps_match_eq_${state.generated++}`;
}

function addBranchEquality(
  row: PatternRow,
  scrutinee: IRExpr,
  branchValue: IRExpr,
  equalityBinder: string | undefined,
  context: DeclarationElaborationContext,
): PatternRow {
  if (!equalityBinder) return row;
  const key = exprKey(scrutinee);
  const requests = row.pendingEqualities.get(key) ?? [];
  const pendingEqualities = new Map(row.pendingEqualities);
  pendingEqualities.delete(key);
  const refinements = combinedRefinements(row);
  const wholeNames = [...new Set(requests.map((request) => request.wholeName).filter((name): name is string => !!name))];
  const wholeName = wholeNames.length === 1 ? wholeNames[0] : undefined;
  const wholeBinding = wholeName ? row.bindings.get(wholeName) : undefined;
  const left = wholeName && wholeBinding
    ? { kind: "var", name: wholeName, type: refineExpected(wholeBinding.type, refinements) ?? wholeBinding.type } as IRExpr
    : refinedExpressionType(scrutinee, refinements);
  const sourceFieldSubstitutions = new Map<string, IRExpr>();
  if (wholeName) {
    for (const [sourceName, binding] of row.bindings) {
      if (sourceName === wholeName || binding.value.kind !== "var") continue;
      const sourceType = refineExpected(binding.type, refinements) ?? binding.type;
      sourceFieldSubstitutions.set(binding.value.name, { kind: "var", name: sourceName, type: sourceType });
    }
  }
  const branchWithSourceNames = sourceFieldSubstitutions.size
    ? substituteExpr(branchValue, new Map(), sourceFieldSubstitutions)
    : branchValue;
  const right = refinedExpressionType(substituteExpr(branchWithSourceNames, new Map(), refinements), refinements);
  const proofType = equalityType(left, right, context);
  const hiddenLocals = new Map(row.hiddenLocals);
  hiddenLocals.set(equalityBinder, proofType);
  const proofAliases = new Map(row.proofAliases);
  for (const request of requests) {
    if (request.sourceName !== equalityBinder) proofAliases.set(request.sourceName, equalityBinder);
  }
  return { ...row, pendingEqualities, hiddenLocals, proofAliases };
}

function compileRows(
  sourceRows: readonly PatternRow[],
  scrutinees: readonly IRExpr[],
  expected: IRType | undefined,
  context: DeclarationElaborationContext,
  state: CompileState,
): IRExpr {
  if (sourceRows.length === 0) throw new ProofScriptError("PS2908", "Non-exhaustive pattern matrix.");
  const rows = sourceRows.map((row) => normalizeRow(row, scrutinees));
  const firstAllWildcard = rows[0]!.patterns.every((pattern) => pattern.kind === "wildcard");
  if (firstAllWildcard) return elaborateLeaf(rows[0]!, expected, context, state);

  let column = -1;
  for (let index = 0; index < scrutinees.length; index += 1) {
    if (rows.some((row) => row.patterns[index]?.kind !== "wildcard")) { column = index; break; }
  }
  if (column < 0) return elaborateLeaf(rows[0]!, expected, context, state);

  const scrutinee = scrutinees[column]!;
  const columnPatterns = rows.map((row) => row.patterns[column]!).filter(Boolean);
  const hasConstructor = columnPatterns.some((pattern) => pattern.kind === "constructor");
  const hasNumber = columnPatterns.some((pattern) => pattern.kind === "number");
  if (hasConstructor && hasNumber) throw new ProofScriptError("PS2909", "Constructor and numeric patterns cannot be mixed for one discriminant.");

  if (hasConstructor) {
    const descriptor = descriptorFor(scrutinee.type, context);
    if (!descriptor) throw new ProofScriptError("PS2910", `Type '${scrutinee.type.displayName}' is not matchable by an installed feature.`);
    const variants = descriptor.variantsFor(scrutinee.type);
    if (variants.length === 0) {
      throw new ProofScriptError("PS2924", `Indexed match on '${scrutinee.type.displayName}' cannot refine any constructor with the current dependent-pattern solver.`);
    }
    const cases: { variant: string; binders: readonly string[]; fieldNames?: readonly string[]; indexRefinements?: readonly { name: string; value: IRExpr }[] }[] = [];
    const bodies: IRExpr[] = [];
    const equalityBinder = equalityBinderFor(rows, scrutinee, state);

    for (let variantIndex = 0; variantIndex < variants.length; variantIndex += 1) {
      const variant = variants[variantIndex]!;
      const instantiated = instantiateVariant(variant, state);
      const binders = instantiated.binders;
      const fieldExprs = instantiated.fieldExprs;
      const specialized: PatternRow[] = [];
      for (const row of rows) {
        const pattern = row.patterns[column]!;
        let replacement: readonly SurfacePattern[] | undefined;
        if (pattern.kind === "wildcard") {
          replacement = instantiated.fields.map(() => ({ kind: "wildcard" } as const));
        } else if (pattern.kind === "constructor") {
          if (pattern.variant !== variant.name) continue;
          if (pattern.fields.length !== instantiated.fields.length) {
            throw new ProofScriptError("PS2911", `Constructor '.${pattern.variant}' expects ${instantiated.fields.length} field pattern(s), got ${pattern.fields.length}.`);
          }
          replacement = pattern.fields;
        } else {
          throw new ProofScriptError("PS2912", `Pattern '${pattern.kind}' is incompatible with constructor-matched type '${scrutinee.type.displayName}'.`);
        }
        const branchRefinements = mergeRefinements(row.valueRefinements, instantiated.valueRefinements);
        const baseCombined = mergeTermRefinements(branchRefinements, row.termRefinements);
        const branchValue = constructorBranchValue(variant, instantiated, scrutinee, baseCombined);
        const addedTerms = scrutinee.kind === "var" ? new Map([[scrutinee.name, branchValue]]) : new Map<string, IRExpr>();
        const termRefinements = mergeTermRefinements(row.termRefinements, addedTerms);
        const branchLocals = new Map([...row.hiddenLocals, ...instantiated.hiddenLocals]);
        if (scrutinee.kind === "var" && branchRefinements.size > 0) {
          branchLocals.set(scrutinee.name, substituteType(scrutinee.type, new Map(), mergeTermRefinements(branchRefinements, termRefinements)));
        }
        let specializedRow: PatternRow = {
          ...row,
          patterns: [...row.patterns.slice(0, column), ...replacement, ...row.patterns.slice(column + 1)],
          valueRefinements: branchRefinements,
          termRefinements,
          branchDiscriminants: updateBranchDiscriminants(row, scrutinee, branchValue),
          hiddenLocals: branchLocals,
          hiddenTypeLocals: new Map([...row.hiddenTypeLocals, ...instantiated.hiddenTypeLocals]),
        };
        specializedRow = addBranchEquality(specializedRow, scrutinee, branchValue, equalityBinder, context);
        specialized.push(specializedRow);
      }
      if (specialized.length === 0) {
        throw new ProofScriptError("PS2913", `Non-exhaustive pattern match on '${scrutinee.type.displayName}'; missing constructor '.${variant.name}'.`);
      }
      const nestedScrutinees = [...scrutinees.slice(0, column), ...fieldExprs, ...scrutinees.slice(column + 1)];
      cases.push({ variant: variant.name, binders, ...(variant.fieldNames ? { fieldNames: variant.fieldNames } : {}), ...(instantiated.valueRefinements.size ? { indexRefinements: [...instantiated.valueRefinements].map(([name, value]) => ({ name, value })) } : {}) });
      bodies.push(compileRows(specialized, nestedScrutinees, expected, context, state));
    }

    return {
      kind: "extension",
      op: descriptor.matchOperation,
      args: [scrutinee, ...bodies],
      payload: { typeName: typeName(scrutinee.type), instantiatedTypeName: scrutinee.type.displayName, cases, ...(equalityBinder ? { matchSyntax: { discriminantEqualityName: equalityBinder } satisfies PatternMatchSyntaxMetadata } : {}) },
      type: state.resultType ?? expected ?? bodies[0]!.type,
    };
  }

  if (hasNumber) {
    if (scrutinee.type.id !== "Nat") throw new ProofScriptError("PS2914", `Numeric patterns currently require Nat; got '${scrutinee.type.displayName}'.`);
    const literals: string[] = [];
    for (const row of rows) {
      const pattern = row.patterns[column]!;
      if (pattern.kind === "number" && !literals.includes(pattern.value)) literals.push(pattern.value);
      if (pattern.kind !== "number" && pattern.kind !== "wildcard") {
        throw new ProofScriptError("PS2915", `Pattern '${pattern.kind}' is incompatible with Nat literal matching.`);
      }
    }
    const equalityBinder = equalityBinderFor(rows, scrutinee, state);
    const branchBodies: IRExpr[] = [];
    const payloadPatterns: ({ kind: "number"; value: string } | { kind: "catchall"; binder?: string })[] = [];
    for (const literal of literals) {
      const branchValue = context.elaborateExpression({ kind: "number", text: literal }, scrutinee.type);
      const specialized = rows.filter((row) => {
        const pattern = row.patterns[column]!;
        return pattern.kind === "wildcard" || (pattern.kind === "number" && pattern.value === literal);
      }).map((row) => {
        const termRefinements = scrutinee.kind === "var"
          ? mergeTermRefinements(row.termRefinements, new Map([[scrutinee.name, branchValue]]))
          : new Map(row.termRefinements);
        let next: PatternRow = {
          ...row,
          patterns: [...row.patterns.slice(0, column), ...row.patterns.slice(column + 1)],
          termRefinements,
          branchDiscriminants: updateBranchDiscriminants(row, scrutinee, branchValue),
        };
        next = addBranchEquality(next, scrutinee, branchValue, equalityBinder, context);
        return next;
      });
      payloadPatterns.push({ kind: "number", value: literal });
      branchBodies.push(compileRows(specialized, [...scrutinees.slice(0, column), ...scrutinees.slice(column + 1)], expected, context, state));
    }
    const catchallBinder = equalityBinder ? `__ps_nat_${state.generated++}` : undefined;
    const catchallValue: IRExpr | undefined = catchallBinder ? { kind: "var", name: catchallBinder, type: scrutinee.type } : undefined;
    const defaults = rows.filter((row) => row.patterns[column]!.kind === "wildcard")
      .map((row) => {
        if (!catchallValue) return { ...row, patterns: [...row.patterns.slice(0, column), ...row.patterns.slice(column + 1)] };
        const termRefinements = scrutinee.kind === "var"
          ? mergeTermRefinements(row.termRefinements, new Map([[scrutinee.name, catchallValue]]))
          : new Map(row.termRefinements);
        const hiddenLocals = new Map(row.hiddenLocals);
        hiddenLocals.set(catchallBinder!, scrutinee.type);
        let next: PatternRow = {
          ...row,
          patterns: [...row.patterns.slice(0, column), ...row.patterns.slice(column + 1)],
          termRefinements,
          branchDiscriminants: updateBranchDiscriminants(row, scrutinee, catchallValue),
          hiddenLocals,
        };
        next = addBranchEquality(next, scrutinee, catchallValue, equalityBinder, context);
        return next;
      });
    if (defaults.length === 0) throw new ProofScriptError("PS2916", "Nat pattern matching requires a wildcard/variable catch-all for exhaustiveness in the current tranche.");
    payloadPatterns.push({ kind: "catchall", ...(catchallBinder ? { binder: catchallBinder } : {}) });
    branchBodies.push(compileRows(defaults, [...scrutinees.slice(0, column), ...scrutinees.slice(column + 1)], expected, context, state));
    return {
      kind: "extension",
      op: "core.pattern.natMatch",
      args: [scrutinee, ...branchBodies],
      payload: { patterns: payloadPatterns, ...(equalityBinder ? { matchSyntax: { discriminantEqualityName: equalityBinder } satisfies PatternMatchSyntaxMetadata } : {}) },
      type: state.resultType ?? expected ?? branchBodies[0]!.type,
    };
  }

  throw new ProofScriptError("PS2917", `No supported refutable pattern exists for discriminant type '${scrutinee.type.displayName}'.`);
}


export interface ElaboratedPatternSequenceBody {
  readonly body: IRExpr;
  readonly patterns: readonly IREquationPattern[];
}

export interface PatternSequenceContextResult<T> {
  readonly value: T;
  readonly patterns: readonly IREquationPattern[];
  readonly refinedExpected: IRType;
}

/**
 * Elaborate an arbitrary callback under the same branch-local refinement
 * environment used by ordinary `match`. This is the shared bridge used by
 * `do match`, whose RHS is a doSeq rather than an ordinary term.
 */
export function withPatternSequenceContext<T>(
  discriminants: readonly IRExpr[],
  patterns: readonly SurfacePattern[],
  expected: IRType,
  context: DeclarationElaborationContext,
  elaborate: (refinedExpected: IRType) => T,
): PatternSequenceContextResult<T> {
  if (patterns.length !== discriminants.length) throw new ProofScriptError("PS2922", `Pattern sequence has arity ${patterns.length}, expected ${discriminants.length}.`);
  const locals = new Map<string, IRType>();
  const hiddenTypeLocals = new Map<string, IRType>();
  let refinements = new Map<string, IRExpr>();
  const equalityRequests: { readonly name: string; readonly leftName?: string; readonly left: IRExpr; readonly right: IRExpr }[] = [];
  const branchState: CompileState = { resultType: expected, generated: 100000, generalizing: false };

  const bind = (name: string, type: IRType) => {
    if (locals.has(name)) throw new ProofScriptError("PS2905", `Pattern variable '${name}' is bound more than once in one pattern sequence.`);
    locals.set(name, type);
  };

  const visit = (pattern: SurfacePattern, scrutinee: IRExpr): IRExpr => {
    const type = substituteType(scrutinee.type, new Map(), refinements);
    const refinedScrutinee = { ...scrutinee, type } as IRExpr;
    switch (pattern.kind) {
      case "wildcard": return refinedScrutinee;
      case "variable": {
        bind(pattern.name, type);
        return { kind: "var", name: pattern.name, type };
      }
      case "inaccessible": return refinedScrutinee;
      case "named": {
        bind(pattern.name, type);
        const branchValue = visit(pattern.pattern, refinedScrutinee);
        if (pattern.equalityName) {
          equalityRequests.push({
            name: pattern.equalityName,
            leftName: pattern.name,
            left: { kind: "var", name: pattern.name, type },
            right: branchValue,
          });
        }
        return branchValue;
      }
      case "number": {
        if (type.id !== "Nat") throw new ProofScriptError("PS2914", `Numeric patterns currently require Nat; got '${type.displayName}'.`);
        const literal: IRExpr = { kind: "literal", op: "core.nat.literal", value: pattern.value, type };
        if (scrutinee.kind === "var") refinements = mergeTermRefinements(refinements, new Map([[scrutinee.name, literal]]));
        return literal;
      }
      case "constructor": {
        const descriptor = descriptorFor(type, context);
        if (!descriptor) throw new ProofScriptError("PS2910", `Type '${type.displayName}' is not matchable by an installed feature.`);
        const variant = descriptor.variantsFor(type).find((item) => item.name === pattern.variant);
        if (!variant) throw new ProofScriptError("PS2923", `Unknown constructor '.${pattern.variant}' for '${type.displayName}'.`);
        const instantiated = instantiateVariant(variant, branchState);
        if (instantiated.fields.length !== pattern.fields.length) throw new ProofScriptError("PS2911", `Constructor '.${pattern.variant}' expects ${instantiated.fields.length} field pattern(s), got ${pattern.fields.length}.`);
        refinements = mergeRefinements(refinements, instantiated.valueRefinements);
        for (const [name, hiddenType] of instantiated.hiddenTypeLocals) hiddenTypeLocals.set(name, hiddenType);
        for (const [name, hiddenType] of instantiated.hiddenLocals) locals.set(name, hiddenType);
        if (scrutinee.kind === "var" && instantiated.valueRefinements.size > 0) {
          locals.set(scrutinee.name, substituteType(scrutinee.type, new Map(), refinements));
        }
        const fieldValues = pattern.fields.map((field, index) => visit(field, instantiated.fieldExprs[index]!));
        const refinedType = substituteType(scrutinee.type, new Map(), refinements);
        return { kind: "call", callee: `.${variant.name}`, args: fieldValues, type: refinedType };
      }
    }
  };

  patterns.forEach((pattern, index) => visit(pattern, discriminants[index]!));
  const target = substituteType(expected, new Map(), refinements);
  const refinedLocals = new Map<string, IRType>();
  for (const [name, type] of locals) refinedLocals.set(name, substituteType(type, new Map(), refinements));

  for (const request of equalityRequests) {
    const leftType = request.leftName ? refinedLocals.get(request.leftName) : undefined;
    const left = request.leftName && leftType ? { kind: "var", name: request.leftName, type: leftType } as IRExpr : refinedExpressionType(request.left, refinements);
    const right = refinedExpressionType(substituteExpr(request.right, new Map(), refinements), refinements);
    refinedLocals.set(request.name, equalityType(left, right, context));
  }

  const elaborateEquationPatterns = (): readonly IREquationPattern[] => {
    let irRefinements = new Map<string, IRExpr>();
    const irState: CompileState = { resultType: expected, generated: 100000, generalizing: false };
    const convert = (pattern: SurfacePattern, scrutinee: IRExpr): IREquationPattern => {
      const type = substituteType(scrutinee.type, new Map(), irRefinements);
      switch (pattern.kind) {
        case "wildcard": return { kind: "wildcard" };
        case "variable": return { kind: "variable", name: pattern.name };
        case "number": {
          if (scrutinee.kind === "var") {
            const literal: IRExpr = { kind: "literal", op: "core.nat.literal", value: pattern.value, type };
            irRefinements = mergeTermRefinements(irRefinements, new Map([[scrutinee.name, literal]]));
          }
          return { kind: "number", value: pattern.value };
        }
        case "inaccessible": {
          const term = context.elaborateExpression(pattern.term, type);
          return { kind: "inaccessible", term };
        }
        case "named": return {
          kind: "named",
          name: pattern.name,
          ...(pattern.equalityName ? { equalityName: pattern.equalityName } : {}),
          pattern: convert(pattern.pattern, { ...scrutinee, type }),
        };
        case "constructor": {
          const descriptor = descriptorFor(type, context);
          if (!descriptor) throw new ProofScriptError("PS2910", `Type '${type.displayName}' is not matchable by an installed feature.`);
          const variant = descriptor.variantsFor(type).find((item) => item.name === pattern.variant);
          if (!variant) throw new ProofScriptError("PS2923", `Unknown constructor '.${pattern.variant}' for '${type.displayName}'.`);
          const instantiated = instantiateVariant(variant, irState);
          irRefinements = mergeRefinements(irRefinements, instantiated.valueRefinements);
          return {
            kind: "constructor",
            variant: pattern.variant,
            fields: pattern.fields.map((field, index) => convert(field, instantiated.fieldExprs[index]!)),
          };
        }
      }
    };
    return patterns.map((pattern, index) => convert(pattern, discriminants[index]!));
  };

  return withExtendedTypeLocals(context, hiddenTypeLocals, () => withExtendedLocals(context, refinedLocals, () => ({
    value: elaborate(target),
    patterns: elaborateEquationPatterns(),
    refinedExpected: target,
  })));
}

export function elaboratePatternSequenceBody(
  discriminants: readonly IRExpr[],
  patterns: readonly SurfacePattern[],
  body: SurfaceExpr,
  expected: IRType,
  context: DeclarationElaborationContext,
): ElaboratedPatternSequenceBody {
  const result = withPatternSequenceContext(discriminants, patterns, expected, context, (target) => context.elaborateExpression(body, target));
  return { body: result.value, patterns: result.patterns };
}

export function validateSingleDiscriminantPatternCoverage(
  discriminant: IRExpr,
  alternatives: readonly { readonly sequences: readonly (readonly SurfacePattern[])[] }[],
  context: DeclarationElaborationContext,
): void {
  const firstPatterns = alternatives.flatMap((alternative) => alternative.sequences.map((sequence) => {
    if (sequence.length !== 1) throw new ProofScriptError("PS2940", `v0.50 do-match currently supports one discriminant; got pattern sequence arity ${sequence.length}.`);
    let pattern = sequence[0]!;
    while (pattern.kind === "named") pattern = pattern.pattern;
    return pattern;
  }));
  if (firstPatterns.some((pattern) => pattern.kind === "wildcard" || pattern.kind === "variable")) return;
  if (discriminant.type.id === "Nat") {
    throw new ProofScriptError("PS2916", "Nat do-match requires a wildcard/variable catch-all for exhaustiveness in the current tranche.");
  }
  const descriptor = descriptorFor(discriminant.type, context);
  if (!descriptor) throw new ProofScriptError("PS2910", `Type '${discriminant.type.displayName}' is not matchable by an installed feature.`);
  const required = new Set(descriptor.variantsFor(discriminant.type).map((variant) => variant.name));
  for (const pattern of firstPatterns) if (pattern.kind === "constructor") required.delete(pattern.variant);
  if (required.size > 0) {
    throw new ProofScriptError("PS2913", `Non-exhaustive do-match on '${discriminant.type.displayName}'; missing constructor(s): ${[...required].map((name) => `.${name}`).join(", ")}.`);
  }
}

export function compilePatternAlternatives(
  discriminants: readonly IRExpr[],
  alternatives: readonly SurfacePatternAlternative[],
  expected: IRType | undefined,
  context: DeclarationElaborationContext,
  options: PatternCompileOptions = {},
): CompiledPatternAlternatives {
  if (discriminants.length === 0) throw new ProofScriptError("PS2918", "Pattern matching requires at least one discriminant.");
  const rows: PatternRow[] = [];
  for (const alternative of alternatives) {
    if (alternative.sequences.length === 0) throw new ProofScriptError("PS2919", "A pattern alternative requires at least one pattern sequence.");
    for (const sequence of alternative.sequences) {
      if (sequence.length !== discriminants.length) {
        throw new ProofScriptError("PS2920", `Pattern sequence has arity ${sequence.length}, expected ${discriminants.length}.`);
      }
      const names = new Set<string>();
      for (const pattern of sequence) {
        for (const name of patternBoundNames(pattern)) {
          if (names.has(name)) throw new ProofScriptError("PS2905", `Pattern variable '${name}' is bound more than once in one pattern sequence.`);
          names.add(name);
        }
      }
      let pendingEqualities = new Map<string, readonly PendingEquality[]>();
      for (let index = 0; index < discriminants.length; index += 1) {
        const equalityName = options.discriminantEqualityNames?.[index];
        if (!equalityName) continue;
        pendingEqualities = new Map(appendPendingEquality(pendingEqualities, exprKey(discriminants[index]!), { sourceName: equalityName, preserveName: true }));
      }
      rows.push({
        patterns: sequence,
        body: alternative.body,
        bindings: new Map(),
        valueRefinements: new Map(),
        termRefinements: new Map(),
        branchDiscriminants: discriminants,
        pendingEqualities,
        proofAliases: new Map(),
        inaccessibleChecks: [],
        hiddenLocals: new Map(),
        hiddenTypeLocals: new Map(),
      });
    }
  }
  if ((options.motive || options.sourceGeneralizing !== undefined || options.discriminantEqualityNames?.some(Boolean)) && discriminants.length !== 1) {
    throw new ProofScriptError("PS2940", "v0.38 match motive/generalizing/equality-evidence surface options currently require exactly one discriminant; multi-discriminant dependent controls remain fail-closed.");
  }
  const motiveResult = options.motive ? applyMotiveType(options.motive, discriminants) : undefined;
  if (expected && motiveResult && !sameType(expected, motiveResult)) {
    throw new ProofScriptError("PS2941", `Explicit match motive yields '${motiveResult.displayName}', but context expects '${expected.displayName}'.`);
  }
  const effectiveExpected = motiveResult ?? expected;
  const state: CompileState = { ...(effectiveExpected ? { resultType: effectiveExpected } : {}), generated: 0, generalizing: options.generalizing ?? false };
  let expression = compileRows(rows, discriminants, effectiveExpected, context, state);
  if (!state.resultType) throw new ProofScriptError("PS2921", "Could not determine pattern-match result type.");
  if (expression.kind === "extension" && (options.motive || options.sourceGeneralizing !== undefined)) {
    const payload = expression.payload as Record<string, unknown>;
    const previous = (payload.matchSyntax ?? {}) as PatternMatchSyntaxMetadata;
    expression = {
      ...expression,
      payload: {
        ...payload,
        matchSyntax: {
          ...previous,
          ...(options.motive ? { motive: options.motive } : {}),
          ...(options.sourceGeneralizing !== undefined ? { generalizing: options.sourceGeneralizing } : {}),
        } satisfies PatternMatchSyntaxMetadata,
      },
    };
  }
  return { expression, resultType: state.resultType };
}
