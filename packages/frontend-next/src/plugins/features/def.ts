import { parseBinderGroups } from "../../core/binders.js";
import { ProofScriptError } from "../../core/errors.js";
import type { DeclarationElaborationContext, ParserCursor, ProofScriptPlugin } from "../../core/plugin-api.js";
import type { IRDef, IRMutualDefGroup, IREquationClause, IREquationPattern, IRExpr, IRParam, IRTerminationJustification, IRType, SurfaceClause, SurfaceDecl, SurfaceExpr, SurfaceParam, SurfaceTypeExpr } from "../../core/model.js";
import { isSortType, makeTypeVariable, sameType } from "../../core/type-utils.js";
import { collectSurfaceExprNames, collectSurfaceParamTypeNames, collectSurfaceTypeNames } from "../../core/surface-names.js";
import { compilePatternAlternatives, elaboratePatternSequenceBody, parsePatternSequence, patternBoundNames, type SurfacePattern, type SurfacePatternAlternative } from "./pattern-engine.js";
import { exactMatchableKey, familyMatchableKey, type MatchableDescriptor } from "./matchable.js";

type SurfaceEquationPattern = SurfacePattern;

interface SurfaceEquationClause extends SurfacePatternAlternative {}

type SurfaceTermination =
  | { readonly kind: "structural"; readonly parameter: string }
  | { readonly kind: "wellFounded"; readonly measure?: SurfaceExpr; readonly binders?: readonly string[]; readonly decreasingBy?: string; readonly inferred: boolean; readonly suggest?: boolean };

interface LocalWhereHelperSurface {
  readonly name: string;
  readonly params: readonly SurfaceParam[];
  readonly returnType: SurfaceTypeExpr;
  readonly body: SurfaceExpr;
  readonly termination?: SurfaceTermination;
}

interface DefPayload {
  readonly name: string;
  readonly universeParams: readonly string[];
  readonly params: readonly SurfaceParam[];
  readonly returnType: SurfaceTypeExpr;
  readonly clauses: readonly SurfaceClause[];
  readonly body?: SurfaceExpr;
  readonly equations?: readonly SurfaceEquationClause[];
  readonly equationParamNames?: readonly string[];
  /** Trailing implicit dependent indices that may be erased by executable
   * backends iff their elaborated bodies have no computational use. */
  readonly runtimeErasedParamNames?: readonly string[];
  readonly sourceForm: "def" | "function" | "const";
  readonly termination?: SurfaceTermination;
  readonly whereHelpers?: readonly LocalWhereHelperSurface[];
}

interface MutualDefPayload {
  readonly members: readonly DefPayload[];
}

interface Telescope {
  readonly params: readonly IRParam[];
  readonly resultType: IRType;
  readonly typeLocals: ReadonlyMap<string, IRType>;
  readonly valueLocals: ReadonlyMap<string, IRType>;
}

interface NormalizedDefClauses {
  readonly annotations: readonly import("../../core/model.js").IRAnnotation[];
  readonly proofParams: readonly IRParam[];
  readonly usedSectionInstances?: readonly string[];
}

function payloadOf(decl: SurfaceDecl): DefPayload {
  if (decl.kind !== "core.def") throw new ProofScriptError("PS2201", "Invalid declaration passed to def plugin.");
  return decl.payload as DefPayload;
}

function elaborateTelescope(payload: DefPayload, context: DeclarationElaborationContext, extraReferenced: ReadonlySet<string> = new Set()): Telescope {
  const typeLocals = new Map<string, IRType>();
  const valueLocals = new Map<string, IRType>();
  const shadowed = new Set(payload.params.map((param) => param.name));
  const referenced = referencedSectionNames(payload, context);
  for (const name of extraReferenced) referenced.add(name);
  const sectionParams = context.selectSectionVariables(referenced, shadowed);
  const params: IRParam[] = [...sectionParams];
  for (const param of sectionParams) {
    if (param.isTypeParam) typeLocals.set(param.name, makeTypeVariable(param.name, param.type));
    else valueLocals.set(param.name, param.type);
  }

  for (const surface of payload.params) {
    const type = context.withTypeLocals(typeLocals, () =>
      context.withLocals(valueLocals, () => context.resolveTypeExpression(surface.type)),
    );
    const isTypeParam = isSortType(type);
    let defaultValue;
    if (surface.defaultValue) {
      if (isTypeParam) throw new ProofScriptError("PS2212", `Optional/default Type-valued parameter '${surface.name}' is deferred beyond the v0.10 slice.`);
      defaultValue = context.withTypeLocals(typeLocals, () =>
        context.withLocals(valueLocals, () => context.elaborateExpression(surface.defaultValue!, type)),
      );
    }
    const runtimeErased = !isTypeParam && payload.runtimeErasedParamNames?.includes(surface.name) === true;
    params.push({
      name: surface.name,
      type,
      binderInfo: surface.binderInfo,
      ...(isTypeParam ? { isTypeParam: true } : {}),
      ...(runtimeErased ? { runtimeErased: true } : {}),
      ...(defaultValue ? { defaultValue } : {}),
    });
    if (isTypeParam) {
      if (surface.binderInfo === "instance") {
        throw new ProofScriptError("PS2210", `Type parameter '${surface.name}' cannot use an instance binder.`);
      }
      typeLocals.set(surface.name, makeTypeVariable(surface.name, type));
    } else {
      valueLocals.set(surface.name, type);
    }
  }

  const resultType = context.withTypeLocals(typeLocals, () =>
    context.withLocals(valueLocals, () => context.resolveTypeExpression(payload.returnType)),
  );
  return { params, resultType, typeLocals, valueLocals };
}

function parseTacticBlock(cursor: ParserCursor, label: string): string {
  cursor.expect("{");
  const tokens: string[] = [];
  let depth = 1;
  while (depth > 0) {
    if (cursor.peek("<eof>")) throw new ProofScriptError("PS2281", `Unterminated ${label} tactic block.`);
    if (cursor.peek("{")) { depth += 1; tokens.push(cursor.consume()); continue; }
    if (cursor.peek("}")) {
      depth -= 1;
      if (depth === 0) { cursor.consume("}"); break; }
      tokens.push(cursor.consume());
      continue;
    }
    tokens.push(cursor.consume());
  }
  if (tokens.length === 0) throw new ProofScriptError("PS2282", `${label} tactic block must not be empty.`);
  return tokens.join(" ");
}

function parseTerminationTail(cursor: ParserCursor, consumeTrailingSemicolon = true): SurfaceTermination | undefined {
  let termination: SurfaceTermination | undefined;
  if (cursor.peek("termination_by")) {
    cursor.consume("termination_by");
    if (cursor.peek("?")) {
      cursor.consume("?");
      termination = { kind: "wellFounded", inferred: true, suggest: true };
    } else if (cursor.peek("structural")) {
      cursor.consume("structural");
      termination = { kind: "structural", parameter: cursor.parseIdentifier() };
      if (cursor.peek("=>")) {
        throw new ProofScriptError("PS2238", "Explicit termination binders for unnamed equation parameters remain deferred; use a named declaration parameter or omit the structural clause.");
      }
    } else {
      const first = cursor.parseExpression();
      if (cursor.peek("=>")) {
        throw new ProofScriptError("PS2283", "Explicit termination binders before '=>' remain deferred; name the parameters in the declaration header and write the measure directly.");
      }
      termination = { kind: "wellFounded", measure: first, inferred: false };
    }
    if (consumeTrailingSemicolon && cursor.peek(";")) cursor.consume(";");
  }
  if (cursor.peek("decreasing_by")) {
    cursor.consume("decreasing_by");
    const proof = parseTacticBlock(cursor, "decreasing_by");
    if (consumeTrailingSemicolon && cursor.peek(";")) cursor.consume(";");
    if (termination?.kind === "structural") {
      throw new ProofScriptError("PS2284", "'decreasing_by' is a well-founded-recursion proof clause and cannot accompany 'termination_by structural'.");
    }
    termination = termination?.kind === "wellFounded"
      ? { ...termination, decreasingBy: proof }
      : { kind: "wellFounded", inferred: true, decreasingBy: proof };
  }
  if (consumeTrailingSemicolon && cursor.peek(";")) cursor.consume(";");
  return termination;
}

function parseRhsBody(cursor: ParserCursor): { readonly body: SurfaceExpr; readonly termination?: SurfaceTermination } {
  cursor.expect(":=");
  cursor.expect("{");
  const body = cursor.parseExpression();
  if (cursor.peek(";")) throw new ProofScriptError("PS2203", "The final term of a ProofScript def body must not have a body-level trailing ';'.");
  cursor.expect("}");
  const termination = parseTerminationTail(cursor);
  return { body, ...(termination ? { termination } : {}) };
}

function parseWhereHelpers(cursor: ParserCursor): readonly LocalWhereHelperSurface[] {
  cursor.consume("where");
  cursor.expect("{");
  const helpers: LocalWhereHelperSurface[] = [];
  while (!cursor.peek("}")) {
    const name = cursor.parseIdentifier();
    const params = parseBinderGroups(cursor);
    cursor.expect(":");
    const returnType = cursor.parseTypeExpression();
    if (!cursor.peek(":=")) throw new ProofScriptError("PS2243", `v0.33 local where helper '${name}' requires a simple ':= { ... }' body; local helper equations remain deferred.`);
    cursor.consume(":=");
    cursor.expect("{");
    const body = cursor.parseExpression();
    if (cursor.peek(";")) throw new ProofScriptError("PS2244", `The final term of local where helper '${name}' must not have a body-level trailing ';'.`);
    cursor.expect("}");
    const termination = parseTerminationTail(cursor, false);
    if (!cursor.peek(";")) throw new ProofScriptError("PS2246", `Local where helper '${name}' requires a trailing ';' after its body/termination clauses.`);
    cursor.consume(";");
    helpers.push({ name, params, returnType, body, ...(termination ? { termination } : {}) });
  }
  cursor.expect("}");
  if (cursor.peek("finally")) throw new ProofScriptError("PS2247", "Lean 4.33 local 'where ... finally' is reference-defined but remains deferred beyond the v0.33 local-helper slice.");
  return helpers;
}

function wrapWhereHelpers(payload: DefPayload, body: SurfaceExpr): SurfaceExpr {
  let result = body;
  for (const helper of [...(payload.whereHelpers ?? [])].reverse()) {
    result = {
      kind: "extension",
      owner: "core.local.binding",
      payload: helper.params.length === 0
        ? {
            bindingKind: "let",
            name: helper.name,
            annotation: helper.returnType,
            value: helper.body,
            body: result,
          }
        : {
            bindingKind: "letRec",
            name: helper.name,
            params: helper.params,
            returnType: helper.returnType,
            value: helper.body,
            body: result,
            ...(helper.termination ? { termination: helper.termination } : {}),
          },
    };
  }
  return result;
}

function parseEquationBody(cursor: ParserCursor): readonly SurfaceEquationClause[] {
  const equations: SurfaceEquationClause[] = [];
  while (cursor.peek("|")) {
    cursor.consume("|");
    const sequences: (readonly SurfaceEquationPattern[])[] = [parsePatternSequence(cursor)];
    while (cursor.peek("|")) {
      cursor.consume("|");
      sequences.push(parsePatternSequence(cursor));
    }
    cursor.expect("=>");
    equations.push({ sequences, body: cursor.parseExpression() });
  }
  if (equations.length === 0) throw new ProofScriptError("PS2232", "Equation-body definition requires at least one '| pattern => body' clause.");
  return equations;
}

function splitEquationType(type: SurfaceTypeExpr): {
  readonly params: readonly SurfaceParam[];
  readonly equationParamNames: readonly string[];
  readonly resultType: SurfaceTypeExpr;
} {
  const params: SurfaceParam[] = [];
  const equationParamNames: string[] = [];
  let generated = 0;
  let current = type;
  while (true) {
    if (current.kind === "arrow") {
      const name = `$eq${generated++}`;
      params.push({ name, type: current.domain, binderInfo: "explicit" });
      equationParamNames.push(name);
      current = current.codomain;
      continue;
    }
    if (current.kind === "pi") {
      for (const param of current.params) {
        params.push(param);
        // Equation clauses pattern-match only the explicit value binders from
        // the trailing function telescope. Implicit/instance binders are
        // preserved as ordinary declaration binders so later explicit binder
        // types can depend on them without inventing source patterns.
        if (param.binderInfo === "explicit") equationParamNames.push(param.name);
      }
      current = current.codomain;
      continue;
    }
    break;
  }
  if (equationParamNames.length === 0) throw new ProofScriptError("PS2234", "Equation-body definitions require at least one explicit trailing function argument in the declared result type.");
  return { params, equationParamNames, resultType: current };
}

function parseDefLike(cursor: ParserCursor, sourceForm: DefPayload["sourceForm"]): SurfaceDecl {
  const name = cursor.parseIdentifier();
  const universeParams: string[] = [];
  if (cursor.peek(".") && cursor.peekAhead(1, "{")) {
    cursor.consume("."); cursor.consume("{"); universeParams.push(cursor.parseIdentifier());
    while (cursor.peek(",")) { cursor.consume(","); universeParams.push(cursor.parseIdentifier()); }
    cursor.expect("}");
  }
  const declaredParams = sourceForm === "const" ? [] : parseBinderGroups(cursor, { allowDefaults: true });
  if (sourceForm === "function" && declaredParams.length === 0) throw new ProofScriptError("PS2204", "The 'function' alias requires at least one declaration binder.");
  if (sourceForm === "const" && ["(", "{", "⦃", "["].some((token) => cursor.peek(token))) {
    throw new ProofScriptError("PS2205", "The 'const' alias is restricted to binderless top-level definitions; use 'function' or canonical 'def' for declaration binders.");
  }
  cursor.expect(":");
  const declaredReturnType = cursor.parseTypeExpression();
  const clauses = cursor.parseDeclarationClauses();
  if (cursor.peek(":=")) {
    const { body, termination } = parseRhsBody(cursor);
    const whereHelpers = cursor.peek("where") ? parseWhereHelpers(cursor) : undefined;
    return { kind: "core.def", payload: { name, universeParams, params: declaredParams, returnType: declaredReturnType, clauses, body, sourceForm, ...(termination ? { termination } : {}), ...(whereHelpers?.length ? { whereHelpers } : {}) } satisfies DefPayload };
  }
  if (!cursor.peek("|")) throw new ProofScriptError("PS2235", "A def must use either ':= { ... }' or equation clauses beginning with '|'.");
  if (sourceForm !== "def") throw new ProofScriptError("PS2236", `The '${sourceForm}' alias does not accept equation bodies; use canonical 'def'.`);
  const split = splitEquationType(declaredReturnType);
  const equations = parseEquationBody(cursor);
  const runtimeErasedParamNames = split.params
    .filter((param) => param.binderInfo === "implicit" || param.binderInfo === "strictImplicit")
    .map((param) => param.name);
  const termination = parseTerminationTail(cursor);
  if (cursor.peek("where")) throw new ProofScriptError("PS2248", "Local where helpers after equation-body definitions are reference-defined but deferred beyond the v0.33 simple-body helper slice.");
  return {
    kind: "core.def",
    payload: {
      name, universeParams,
      params: [...declaredParams, ...split.params],
      returnType: split.resultType,
      clauses,
      equations,
      equationParamNames: split.equationParamNames,
      ...(runtimeErasedParamNames.length ? { runtimeErasedParamNames } : {}),
      sourceForm,
      ...(termination ? { termination } : {}),
    } satisfies DefPayload,
  };
}

function parseMutual(cursor: ParserCursor): SurfaceDecl {
  cursor.expect("{");
  const declarations: SurfaceDecl[] = [];
  while (!cursor.peek("}")) declarations.push(cursor.parseNestedDeclaration());
  cursor.expect("}");
  if (declarations.length < 2) throw new ProofScriptError("PS2260", "A mutual group requires at least two declarations.");

  if (declarations.every((member) => member.kind === "core.def")) {
    const members: DefPayload[] = [];
    const names = new Set<string>();
    for (const member of declarations) {
      const payload = payloadOf(member);
      if (names.has(payload.name)) throw new ProofScriptError("PS2259", `Duplicate definition '${payload.name}' in mutual group.`);
      names.add(payload.name);
      members.push(payload);
    }
    return { kind: "core.mutual.defs", payload: { members } satisfies MutualDefPayload };
  }

  if (declarations.every((member) => member.kind === "lean.inductive")) {
    return { kind: "lean.mutual.inductives", payload: { members: declarations } };
  }

  throw new ProofScriptError("PS2258", "A mutual group must contain declarations from one supported mutual family; mixing def and inductive declarations is not supported.");
}

function mutualPayloadOf(decl: SurfaceDecl): MutualDefPayload {
  if (decl.kind !== "core.mutual.defs") throw new ProofScriptError("PS2261", "Invalid declaration passed to mutual-def elaborator.");
  return decl.payload as MutualDefPayload;
}

function referencedSectionNames(payload: DefPayload, context: DeclarationElaborationContext): Set<string> {
  const names = new Set<string>();
  collectSurfaceParamTypeNames(payload.params, names);
  collectSurfaceTypeNames(payload.returnType, names);
  if (payload.body) collectSurfaceExprNames(payload.body, names);
  for (const helper of payload.whereHelpers ?? []) {
    collectSurfaceParamTypeNames(helper.params, names);
    collectSurfaceTypeNames(helper.returnType, names);
    const local = new Set<string>();
    collectSurfaceExprNames(helper.body, local);
    local.delete(helper.name);
    for (const param of helper.params) local.delete(param.name);
    for (const name of local) names.add(name);
  }
  for (const helper of payload.whereHelpers ?? []) names.delete(helper.name);
  for (const equation of payload.equations ?? []) {
    for (const sequence of equation.sequences) {
      const local = new Set<string>();
      collectSurfaceExprNames(equation.body, local);
      for (const pattern of sequence) for (const bound of patternBoundNames(pattern)) local.delete(bound);
      for (const name of local) names.add(name);
    }
  }
  for (const clause of payload.clauses) for (const name of context.collectClauseReferencedNames(clause)) names.add(name);
  return names;
}

interface MatchIrPayload {
  readonly cases: readonly { readonly variant: string; readonly binders: readonly string[] }[];
}

interface LocalBindingIrPayload {
  readonly bindingKind: "let" | "have";
  readonly name: string;
}

interface ElaboratedDefBody {
  readonly body: IRExpr;
  readonly equations?: readonly IREquationClause[];
}

interface EquationMatchPayload {
  readonly typeName: string;
  readonly instantiatedTypeName: string;
  readonly cases: readonly { readonly variant: string; readonly binders: readonly string[] }[];
}

interface NatEquationMatchPayload {
  readonly patterns: readonly ({ readonly kind: "number"; readonly value: string } | { readonly kind: "catchall" })[];
}

function elaborateEquationBody(
  payload: DefPayload,
  locals: ReadonlyMap<string, IRType>,
  resultType: IRType,
  context: DeclarationElaborationContext,
): ElaboratedDefBody {
  const equations = payload.equations;
  const equationParamNames = payload.equationParamNames ?? [];
  if (!equations || equationParamNames.length === 0) throw new ProofScriptError("PS2240", "Malformed equation definition metadata.");
  const discriminants = equationParamNames.map((name) => {
    const type = locals.get(name);
    if (!type) throw new ProofScriptError("PS2241", `Missing equation discriminant '${name}' from declaration telescope.`);
    return { kind: "var", name, type } as IRExpr;
  });
  const compiled = compilePatternAlternatives(discriminants, equations, resultType, context);
  const elaboratedEquations: IREquationClause[] = [];
  for (const equation of equations) {
    for (const sequence of equation.sequences) {
      const elaborated = elaboratePatternSequenceBody(discriminants, sequence, equation.body, resultType, context);
      elaboratedEquations.push({ patterns: elaborated.patterns, body: elaborated.body });
    }
  }
  return { body: compiled.expression, equations: elaboratedEquations };
}

function elaborateDefBody(payload: DefPayload, locals: ReadonlyMap<string, IRType>, resultType: IRType, context: DeclarationElaborationContext): ElaboratedDefBody {
  if (payload.equations) return elaborateEquationBody(payload, locals, resultType, context);
  if (!payload.body) throw new ProofScriptError("PS2257", `Definition '${payload.name}' has no body.`);
  return { body: context.elaborateExpression(wrapWhereHelpers(payload, payload.body), resultType) };
}

function descriptorFor(type: IRType, context: DeclarationElaborationContext): MatchableDescriptor | undefined {
  return context.getSemanticInfo<MatchableDescriptor>(exactMatchableKey(type.id))
    ?? (type.family ? context.getSemanticInfo<MatchableDescriptor>(familyMatchableKey(type.family)) : undefined);
}

export function containsRecursiveCall(expr: IRExpr, semanticName: string): boolean {
  if (expr.kind === "call" && expr.callee === semanticName) return true;
  if (expr.kind === "apply" && expr.callee.kind === "var" && expr.callee.name === semanticName) return true;
  if (expr.kind === "apply") return containsRecursiveCall(expr.callee, semanticName) || expr.args.some((arg) => containsRecursiveCall(arg, semanticName));
  if (expr.kind === "lambda" || expr.kind === "quantifier") return containsRecursiveCall(expr.body, semanticName);
  if (expr.kind === "call" || expr.kind === "op" || expr.kind === "extension") return expr.args.some((arg) => containsRecursiveCall(arg, semanticName));
  return false;
}

function elaborateWellFoundedTermination(
  surface: Extract<SurfaceTermination, { readonly kind: "wellFounded" }>,
  body: IRExpr,
  semanticName: string,
  context: DeclarationElaborationContext,
): IRTerminationJustification {
  if (!containsRecursiveCall(body, semanticName)) {
    throw new ProofScriptError("PS2285", `Well-founded termination was supplied, but '${semanticName}' is not recursive.`);
  }
  const measure = surface.measure ? context.elaborateExpression(surface.measure) : undefined;
  return {
    kind: "wellFounded",
    ...(measure ? { measure } : {}),
    ...(surface.binders?.length ? { binders: surface.binders } : {}),
    ...(surface.decreasingBy ? { decreasingBy: surface.decreasingBy } : {}),
    inferred: surface.inferred,
    ...(surface.suggest ? { suggest: true } : {}),
  };
}

/** Prove the v0.29 structural-recursion criterion over already elaborated IR.
 *
 * A variable becomes structurally smaller than root parameter `xs` only when it
 * is bound to a constructor field whose instantiated type is exactly the type
 * of a scrutinee already rooted at `xs`. Every recursive call must pass such a
 * variable at one common declaration-parameter position. This is deliberately
 * narrower than Lean's complete termination elaborator, but never accepts an
 * arbitrary computed decrease as structural recursion.
 */
export function analyzeStructuralRecursion(
  body: IRExpr,
  semanticName: string,
  params: readonly IRParam[],
  requested: Extract<SurfaceTermination, { readonly kind: "structural" }> | undefined,
  context: DeclarationElaborationContext,
): { readonly kind: "structural"; readonly parameter: string; readonly inferred: boolean } | undefined {
  const paramNames = new Set(params.filter((param) => !param.isTypeParam && !param.isProofParam).map((param) => param.name));
  const callCandidates: Set<string>[] = [];

  const cloneSmaller = (source: ReadonlyMap<string, ReadonlySet<string>>): Map<string, Set<string>> =>
    new Map([...source].map(([name, roots]) => [name, new Set(roots)]));

  const rootsOfVar = (name: string, smaller: ReadonlyMap<string, ReadonlySet<string>>): Set<string> => {
    const roots = new Set(smaller.get(name) ?? []);
    if (paramNames.has(name)) roots.add(name);
    return roots;
  };

  const visit = (expr: IRExpr, smaller: ReadonlyMap<string, ReadonlySet<string>>): void => {
    if (expr.kind === "call") {
      if (expr.callee === semanticName) {
        const candidates = new Set<string>();
        const named = new Map<string, IRExpr>();
        const positional: IRExpr[] = [];
        expr.args.forEach((arg, index) => {
          const argumentName = expr.argumentNames?.[index] ?? null;
          if (argumentName) named.set(argumentName, arg);
          else positional.push(arg);
        });
        const positionalParams = expr.explicitMode
          ? params.filter((param) => !param.isProofParam)
          : params.filter((param) => param.binderInfo === "explicit" && !param.isProofParam && !param.isTypeParam);
        params.forEach((param) => {
          if (param.isTypeParam || param.isProofParam) return;
          const positionalIndex = positionalParams.findIndex((candidate) => candidate.name === param.name);
          const arg = named.get(param.name) ?? (positionalIndex >= 0 ? positional[positionalIndex] : undefined);
          if (arg?.kind !== "var") return;
          if (smaller.get(arg.name)?.has(param.name)) candidates.add(param.name);
        });
        if (candidates.size === 0) {
          throw new ProofScriptError("PS2222", `Recursive call to '${semanticName}' is not on a recognized structurally smaller constructor field.`);
        }
        callCandidates.push(candidates);
      }
      for (const arg of expr.args) visit(arg, smaller);
      return;
    }
    if (expr.kind === "apply") {
      if (expr.callee.kind === "var" && expr.callee.name === semanticName) {
        const candidates = new Set<string>();
        params.forEach((param, index) => {
          if (param.isTypeParam || param.isProofParam || param.binderInfo !== "explicit") return;
          const arg = expr.args[index];
          if (arg?.kind !== "var") return;
          if (smaller.get(arg.name)?.has(param.name)) candidates.add(param.name);
        });
        if (candidates.size === 0) {
          throw new ProofScriptError("PS2222", `Recursive call to '${semanticName}' is not on a recognized structurally smaller constructor field.`);
        }
        callCandidates.push(candidates);
      }
      visit(expr.callee, smaller);
      for (const arg of expr.args) visit(arg, smaller);
      return;
    }
    if (expr.kind === "lambda" || expr.kind === "quantifier") {
      const nested = cloneSmaller(smaller);
      for (const param of expr.params) nested.delete(param.name);
      visit(expr.body, nested);
      return;
    }
    if (expr.kind === "extension" && (expr.op === "lean.inductive.match" || expr.op === "core.option.match" || expr.op === "core.list.match")) {
      const [scrutinee, ...bodies] = expr.args;
      if (!scrutinee) return;
      visit(scrutinee, smaller);
      const payload = expr.payload as MatchIrPayload;
      const descriptor = descriptorFor(scrutinee.type, context);
      const variants = descriptor?.variantsFor(scrutinee.type) ?? [];
      const roots = scrutinee.kind === "var" ? rootsOfVar(scrutinee.name, smaller) : new Set<string>();
      for (let branchIndex = 0; branchIndex < payload.cases.length; branchIndex += 1) {
        const caseInfo = payload.cases[branchIndex]!;
        const branchBody = bodies[branchIndex];
        if (!branchBody) continue;
        const nested = cloneSmaller(smaller);
        for (const binder of caseInfo.binders) nested.delete(binder);
        const variant = variants.find((item) => item.name === caseInfo.variant);
        if (variant && roots.size > 0) {
          caseInfo.binders.forEach((binder, fieldIndex) => {
            const fieldType = variant.fields[fieldIndex];
            if (!fieldType) return;
            const recursivelySmaller = sameType(fieldType, scrutinee.type)
              || (!!fieldType.family && fieldType.family === scrutinee.type.family);
            if (!recursivelySmaller) return;
            nested.set(binder, new Set(roots));
          });
        }
        visit(branchBody, nested);
      }
      return;
    }
    if (expr.kind === "extension" && (expr.op === "core.local.let" || expr.op === "core.local.have")) {
      const value = expr.args[0];
      const continuation = expr.args[1];
      if (value) visit(value, smaller);
      if (!continuation) return;
      const payload = expr.payload as LocalBindingIrPayload;
      const nested = cloneSmaller(smaller);
      nested.delete(payload.name);
      if (payload.bindingKind === "let" && value?.kind === "var") {
        const roots = smaller.get(value.name);
        if (roots?.size) nested.set(payload.name, new Set(roots));
      }
      visit(continuation, nested);
      return;
    }
    if (expr.kind === "op" || expr.kind === "extension") {
      for (const arg of expr.args) visit(arg, smaller);
      return;
    }
  };

  visit(body, new Map());
  if (callCandidates.length === 0) {
    if (requested) throw new ProofScriptError("PS2223", `'termination_by structural ${requested.parameter}' was supplied, but '${semanticName}' is not recursive.`);
    return undefined;
  }

  let common = new Set(callCandidates[0]!);
  for (const candidates of callCandidates.slice(1)) common = new Set([...common].filter((name) => candidates.has(name)));
  if (common.size === 0) {
    throw new ProofScriptError("PS2224", `Recursive calls to '${semanticName}' do not decrease one common structural parameter.`);
  }
  if (requested) {
    if (!paramNames.has(requested.parameter)) throw new ProofScriptError("PS2225", `Structural termination parameter '${requested.parameter}' is not a value parameter of '${semanticName}'.`);
    if (!common.has(requested.parameter)) throw new ProofScriptError("PS2226", `Recursive calls to '${semanticName}' are not structurally decreasing on requested parameter '${requested.parameter}'.`);
    return { kind: "structural", parameter: requested.parameter, inferred: false };
  }
  const selected = params.find((param) => common.has(param.name));
  if (!selected) throw new ProofScriptError("PS2227", `Could not select a structural recursion parameter for '${semanticName}'.`);
  return { kind: "structural", parameter: selected.name, inferred: true };
}


interface MutualMemberForAnalysis {
  readonly surface: DefPayload;
  readonly def: IRDef;
}

function analyzeMutualStructuralRecursion(
  members: readonly MutualMemberForAnalysis[],
  context: DeclarationElaborationContext,
): { readonly structuralIndex: number; readonly terminations: ReadonlyMap<string, { readonly kind: "structural"; readonly parameter: string; readonly inferred: boolean }> } {
  const byName = new Map(members.map((member) => [member.def.semanticName ?? member.def.name, member] as const));
  const valueParams = new Map([...byName].map(([name, member]) => [name, member.def.params.filter((param) => !param.isTypeParam && !param.isProofParam)] as const));
  const arities = new Set([...valueParams.values()].map((params) => params.length));
  if (arities.size !== 1) throw new ProofScriptError("PS2262", "v0.34 mutual structural recursion requires every group member to have the same number of value parameters.");
  const valueArity = [...arities][0] ?? 0;
  if (valueArity === 0) throw new ProofScriptError("PS2263", "v0.34 mutual structural recursion requires at least one value parameter per group member.");

  const callCandidates: Set<number>[] = [];
  const cloneSmaller = (source: ReadonlyMap<string, ReadonlySet<number>>): Map<string, Set<number>> =>
    new Map([...source].map(([name, roots]) => [name, new Set(roots)]));

  const descriptorForType = (type: IRType): MatchableDescriptor | undefined => descriptorFor(type, context);

  const analyzeBody = (callerName: string, body: IRExpr): void => {
    const caller = byName.get(callerName)!;
    const callerValues = valueParams.get(callerName)!;
    const callerRootIndex = new Map(callerValues.map((param, index) => [param.name, index] as const));
    const initial = new Map<string, Set<number>>();

    const callArgs = (expr: Extract<IRExpr, { kind: "call" }>, calleeParams: readonly IRParam[]): readonly (IRExpr | undefined)[] => {
      const named = new Map<string, IRExpr>();
      const positional: IRExpr[] = [];
      expr.args.forEach((arg, index) => {
        const argName = expr.argumentNames?.[index] ?? null;
        if (argName) named.set(argName, arg); else positional.push(arg);
      });
      const positionalParams = expr.explicitMode
        ? calleeParams.filter((param) => !param.isProofParam)
        : calleeParams.filter((param) => param.binderInfo === "explicit" && !param.isProofParam && !param.isTypeParam);
      return calleeParams.filter((param) => !param.isTypeParam && !param.isProofParam).map((param) => {
        const index = positionalParams.findIndex((candidate) => candidate.name === param.name);
        return named.get(param.name) ?? (index >= 0 ? positional[index] : undefined);
      });
    };

    const recordCall = (calleeName: string, args: readonly (IRExpr | undefined)[], smaller: ReadonlyMap<string, ReadonlySet<number>>): void => {
      const calleeValues = valueParams.get(calleeName)!;
      const candidates = new Set<number>();
      for (let index = 0; index < Math.min(args.length, calleeValues.length, callerValues.length); index += 1) {
        const arg = args[index];
        if (arg?.kind !== "var") continue;
        if (!smaller.get(arg.name)?.has(index)) continue;
        if (!sameType(callerValues[index]!.type, calleeValues[index]!.type)) continue;
        candidates.add(index);
      }
      if (candidates.size === 0) {
        throw new ProofScriptError("PS2264", `Mutual recursive call from '${callerName}' to '${calleeName}' is not on a recognized structurally smaller argument at a common parameter position.`);
      }
      callCandidates.push(candidates);
    };

    const visit = (expr: IRExpr, smaller: ReadonlyMap<string, ReadonlySet<number>>): void => {
      if (expr.kind === "call") {
        if (byName.has(expr.callee)) recordCall(expr.callee, callArgs(expr, byName.get(expr.callee)!.def.params), smaller);
        for (const arg of expr.args) visit(arg, smaller);
        return;
      }
      if (expr.kind === "apply") {
        if (expr.callee.kind === "var" && byName.has(expr.callee.name)) {
          const calleeValues = valueParams.get(expr.callee.name)!;
          recordCall(expr.callee.name, calleeValues.map((_, index) => expr.args[index]), smaller);
        }
        visit(expr.callee, smaller);
        for (const arg of expr.args) visit(arg, smaller);
        return;
      }
      if (expr.kind === "lambda" || expr.kind === "quantifier") {
        const nested = cloneSmaller(smaller);
        for (const param of expr.params) nested.delete(param.name);
        visit(expr.body, nested);
        return;
      }
      if (expr.kind === "extension" && (expr.op === "lean.inductive.match" || expr.op === "core.option.match" || expr.op === "core.list.match")) {
        const [scrutinee, ...bodies] = expr.args;
        if (!scrutinee) return;
        visit(scrutinee, smaller);
        const payload = expr.payload as MatchIrPayload;
        const desc = descriptorForType(scrutinee.type);
        const variants = desc?.variantsFor(scrutinee.type) ?? [];
        const roots = new Set<number>();
        if (scrutinee.kind === "var") {
          for (const root of smaller.get(scrutinee.name) ?? []) roots.add(root);
          const directRoot = callerRootIndex.get(scrutinee.name);
          if (directRoot !== undefined) roots.add(directRoot);
        }
        for (let branchIndex = 0; branchIndex < payload.cases.length; branchIndex += 1) {
          const caseInfo = payload.cases[branchIndex]!;
          const branchBody = bodies[branchIndex];
          if (!branchBody) continue;
          const nested = cloneSmaller(smaller);
          for (const binder of caseInfo.binders) nested.delete(binder);
          const variant = variants.find((item) => item.name === caseInfo.variant);
          if (variant && roots.size > 0) {
            caseInfo.binders.forEach((binder, fieldIndex) => {
              const fieldType = variant.fields[fieldIndex];
              if (!fieldType) return;
              const recursivelySmaller = sameType(fieldType, scrutinee.type)
                || (!!fieldType.family && fieldType.family === scrutinee.type.family);
              if (recursivelySmaller) nested.set(binder, new Set(roots));
            });
          }
          visit(branchBody, nested);
        }
        return;
      }
      if (expr.kind === "extension" && (expr.op === "core.local.let" || expr.op === "core.local.have")) {
        const value = expr.args[0];
        const continuation = expr.args[1];
        if (value) visit(value, smaller);
        if (!continuation) return;
        const payload = expr.payload as LocalBindingIrPayload;
        const nested = cloneSmaller(smaller);
        nested.delete(payload.name);
        if (payload.bindingKind === "let" && value?.kind === "var") {
          const roots = smaller.get(value.name);
          if (roots?.size) nested.set(payload.name, new Set(roots));
        }
        visit(continuation, nested);
        return;
      }
      if (expr.kind === "op" || expr.kind === "extension") {
        for (const arg of expr.args) visit(arg, smaller);
      }
    };
    visit(body, initial);
  };

  for (const [name, member] of byName) analyzeBody(name, member.def.body);
  if (callCandidates.length === 0) throw new ProofScriptError("PS2265", "A mutual group must contain at least one recursive call in the v0.34 structural-recursion slice.");
  let common = new Set(callCandidates[0]!);
  for (const candidates of callCandidates.slice(1)) common = new Set([...common].filter((index) => candidates.has(index)));
  if (common.size === 0) throw new ProofScriptError("PS2266", "Mutual recursive calls do not decrease one common value-parameter position across the group.");

  let requestedIndex: number | undefined;
  for (const member of members) {
    if (!member.surface.termination) continue;
    if (member.surface.termination.kind !== "structural") throw new ProofScriptError("PS2286", "Mutual well-founded recursion remains deferred.");
    const requested = member.surface.termination;
    const values = valueParams.get(member.def.semanticName ?? member.def.name)!;
    const index = values.findIndex((param) => param.name === requested.parameter);
    if (index < 0) throw new ProofScriptError("PS2267", `Structural termination parameter '${requested.parameter}' is not a value parameter of '${member.def.name}'.`);
    if (requestedIndex !== undefined && requestedIndex !== index) throw new ProofScriptError("PS2268", "Mutual definitions request different structural parameter positions.");
    requestedIndex = index;
  }
  const structuralIndex = requestedIndex ?? [...common].sort((a, b) => a - b)[0]!;
  if (!common.has(structuralIndex)) throw new ProofScriptError("PS2269", `Mutual recursive calls are not structurally decreasing at requested parameter position ${structuralIndex + 1}.`);
  const baseType = valueParams.get(members[0]!.def.semanticName ?? members[0]!.def.name)![structuralIndex]!.type;
  for (const member of members.slice(1)) {
    const param = valueParams.get(member.def.semanticName ?? member.def.name)![structuralIndex];
    if (!param || !sameType(param.type, baseType)) throw new ProofScriptError("PS2270", "v0.34 mutual structural recursion requires the selected decreasing parameter position to have the same type in every group member.");
  }

  const terminations = new Map<string, { readonly kind: "structural"; readonly parameter: string; readonly inferred: boolean }>();
  for (const member of members) {
    const name = member.def.semanticName ?? member.def.name;
    const param = valueParams.get(name)![structuralIndex]!;
    terminations.set(name, { kind: "structural", parameter: param.name, inferred: member.surface.termination === undefined });
  }
  return { structuralIndex, terminations };
}

const plugin: ProofScriptPlugin = {
  id: "proofscript.feature.def",
  version: "0.91.0",
  kind: "feature",
  setup(registry) {
    registry.registerDeclarationSyntax({ keyword: "def", parse: (cursor) => parseDefLike(cursor, "def") });
    registry.registerDeclarationSyntax({ keyword: "mutual", parse: parseMutual });
    registry.registerDeclarationSyntax({ keyword: "function", parse: (cursor) => parseDefLike(cursor, "function") });
    registry.registerDeclarationSyntax({ keyword: "const", parse: (cursor) => parseDefLike(cursor, "const") });

    registry.registerOperation("core.recursion.mutual", {
      requiredCapabilities: ["core.recursion"],
      verification: { level: "kernel-checkable", notes: "Mutual recursive group whose cross-calls share one frontend-justified structural decrease position and are preserved to Lean mutual definitions." },
      domain: "runtime",
    });

    registry.registerOperation("core.recursion.structural", {
      requiredCapabilities: ["core.recursion"],
      verification: { level: "kernel-checkable", notes: "Frontend-justified structural recursion; generated Lean carries an explicit termination_by structural parameter." },
      domain: "runtime",
    });

    registry.registerOperation("core.recursion.wellFounded", {
      requiredCapabilities: ["core.recursion", "core.recursion.wellFounded"],
      verification: { level: "kernel-checkable", notes: "Well-founded termination measure/decrease proof is preserved to Lean. ProofScript does not treat the source annotation itself as a proof; Lean must accept the generated well-founded construction." },
      domain: "runtime",
    });

    registry.registerOperation("core.definition.equations", {
      requiredCapabilities: ["core.equations"],
      verification: { level: "kernel-checkable", notes: "Definition equation clauses are retained in Semantic IR and emitted through Lean's equation-compiler source form." },
      domain: "runtime",
    });

    registry.registerOperation("core.nat.equationMatch", {
      requiredCapabilities: ["core.nat", "core.equations"],
      verification: { level: "kernel-checkable", notes: "Equation-compiler Nat literal/catch-all matching preserved to Lean pattern matching." },
      domain: "runtime",
    });

    registry.registerLeanExprLowering("core.nat.equationMatch", (expr, emit) => {
      if (expr.kind !== "extension") throw new ProofScriptError("PS4801", "Expected Nat equation-match IR expression.");
      const payload = expr.payload as NatEquationMatchPayload;
      const [scrutinee, ...branchBodies] = expr.args;
      const branches = payload.patterns.map((pattern, index) => `| ${pattern.kind === "number" ? pattern.value : "_"} => ${emit.emitExpr(branchBodies[index]!)}`);
      return `(match ${emit.emitExpr(scrutinee!)} with ${branches.join(" ")})`;
    });
    registry.registerTargetExprLowering("typescript", "core.nat.equationMatch", (expr, emit) => {
      if (expr.kind !== "extension") throw new ProofScriptError("PS3801", "Expected Nat equation-match IR expression.");
      const payload = expr.payload as NatEquationMatchPayload;
      const [scrutinee, ...branchBodies] = expr.args;
      let fallback = "(() => { throw new Error(\"unreachable ProofScript Nat equation match\"); })()";
      for (let index = payload.patterns.length - 1; index >= 0; index -= 1) {
        const pattern = payload.patterns[index]!;
        const branch = emit.emitExpr(branchBodies[index]!);
        fallback = pattern.kind === "catchall" ? branch : `_pse === ${pattern.value}n ? ${branch} : (${fallback})`;
      }
      return `((_pse: bigint) => ${fallback})(${emit.emitExpr(scrutinee!)})`;
    });

    registry.registerDeclarationElaborator({
      kind: "core.mutual.defs",
      declare(decl, context) {
        const group = mutualPayloadOf(decl);
        const preliminaries = new Map<string, { telescope: Telescope; proofParams: readonly IRParam[] }>();
        // First pass: every function head becomes available before any group body is elaborated.
        for (const payload of group.members) {
          for (const universe of payload.universeParams) {
            if (!context.hasUniverse(universe)) throw new ProofScriptError("PS2213", `Declaration universe parameter '${universe}' must be introduced by 'universe ${universe};'.`);
          }
          const telescope = elaborateTelescope(payload, context);
          const semanticName = context.qualifyName(payload.name);
          const normalized = context.withTypeLocals(telescope.typeLocals, () => {
            const annotations = context.elaborateClauses(payload.clauses, telescope.valueLocals, telescope.resultType);
            return { proofParams: annotations.flatMap((annotation) => annotation.proofParams ?? []) };
          });
          context.declareFunction(semanticName, [...telescope.params, ...normalized.proofParams], telescope.resultType, { universeParams: payload.universeParams });
          preliminaries.set(semanticName, { telescope, proofParams: normalized.proofParams });
        }
        // Second pass: exact section-instance usage may inspect any mutually registered head.
        for (const payload of group.members) {
          const semanticName = context.qualifyName(payload.name);
          const preliminary = preliminaries.get(semanticName)!;
          const usage = context.captureSectionInstanceUsage(() => context.withTypeLocals(preliminary.telescope.typeLocals, () => {
            const annotations = context.elaborateClauses(payload.clauses, preliminary.telescope.valueLocals, preliminary.telescope.resultType);
            const proofParams = annotations.flatMap((annotation) => annotation.proofParams ?? []);
            const bodyLocals = new Map(preliminary.telescope.valueLocals);
            for (const proofParam of proofParams) bodyLocals.set(proofParam.name, proofParam.type);
            const instanceLocals = new Map(preliminary.telescope.params.filter((param) => param.binderInfo === "instance").map((param) => [param.name, param.type] as const));
            context.withInstanceLocals(instanceLocals, () => context.withLocals(bodyLocals, () => elaborateDefBody(payload, bodyLocals, preliminary.telescope.resultType, context)));
            return { annotations, proofParams };
          }));
          const usedSectionInstances = new Set(usage.usedNames);
          const telescope = elaborateTelescope(payload, context, usedSectionInstances);
          const normalized = context.withTypeLocals(telescope.typeLocals, () => {
            const annotations = context.elaborateClauses(payload.clauses, telescope.valueLocals, telescope.resultType);
            const proofParams = annotations.flatMap((annotation) => annotation.proofParams ?? []);
            return { annotations, proofParams, ...(usedSectionInstances.size ? { usedSectionInstances: [...usedSectionInstances] } : {}) } satisfies NormalizedDefClauses;
          });
          context.setElaborationInfo(`def.normalized:${semanticName}`, normalized);
          context.updateFunctionSignature(semanticName, [...telescope.params, ...normalized.proofParams], telescope.resultType, { universeParams: payload.universeParams });
        }
      },
      elaborate(decl, context) {
        const group = mutualPayloadOf(decl);
        const provisional: MutualMemberForAnalysis[] = group.members.map((payload) => {
          const semanticName = context.qualifyName(payload.name);
          const normalized = context.getElaborationInfo<NormalizedDefClauses>(`def.normalized:${semanticName}`);
          if (!normalized) throw new ProofScriptError("PS2271", `Missing normalized mutual declaration clauses for '${payload.name}'.`);
          const telescope = elaborateTelescope(payload, context, new Set(normalized.usedSectionInstances ?? []));
          return context.withTypeLocals(telescope.typeLocals, () => {
            const bodyLocals = new Map(telescope.valueLocals);
            for (const proofParam of normalized.proofParams) bodyLocals.set(proofParam.name, proofParam.type);
            const instanceLocals = new Map(telescope.params.filter((param) => param.binderInfo === "instance").map((param) => [param.name, param.type] as const));
            const elaboratedBody = context.withInstanceLocals(instanceLocals, () => context.withLocals(bodyLocals, () => elaborateDefBody(payload, bodyLocals, telescope.resultType, context)));
            const annotations = normalized.annotations.map((annotation) => annotation.op === "proof.contract.value"
              ? { ...annotation, payload: { ...(annotation.payload as Record<string, unknown>), ownerName: semanticName } }
              : annotation);
            const member: IRDef = {
              kind: "def",
              name: payload.name,
              ...(semanticName === payload.name ? {} : { semanticName }),
              ...(payload.universeParams.length ? { universeParams: payload.universeParams } : {}),
              params: telescope.params,
              returnType: telescope.resultType,
              body: elaboratedBody.body,
              ...(payload.equations ? { sourceForm: "equations", equationParamNames: payload.equationParamNames ?? [], equations: elaboratedBody.equations ?? [] } : {}),
              ...(normalized.proofParams.length ? { proofParams: normalized.proofParams } : {}),
              ...(annotations.length ? { annotations } : {}),
            };
            return { surface: payload, def: member };
          });
        });
        for (const member of group.members) {
          if (member.termination?.kind === "wellFounded") {
            throw new ProofScriptError("PS2286", "Well-founded termination is implemented for single definitions/local recursion; mutual well-founded recursion remains deferred.");
          }
        }
        const analyzed = analyzeMutualStructuralRecursion(provisional, context);
        const members = provisional.map(({ def }) => ({ ...def, termination: analyzed.terminations.get(def.semanticName ?? def.name)! }));
        return { kind: "mutual", members, structuralIndex: analyzed.structuralIndex } satisfies IRMutualDefGroup;
      },
    });

    registry.registerDeclarationElaborator({
      kind: "core.def",
      declare(decl, context) {
        const payload = payloadOf(decl);
        for (const universe of payload.universeParams) {
          if (!context.hasUniverse(universe)) throw new ProofScriptError("PS2213", `Declaration universe parameter '${universe}' must be introduced by 'universe ${universe};' in the v0.10 slice.`);
        }
        const preliminary = elaborateTelescope(payload, context);
        const semanticName = context.qualifyName(payload.name);
        const preliminaryNormalized = context.withTypeLocals(preliminary.typeLocals, () => {
          const annotations = context.elaborateClauses(payload.clauses, preliminary.valueLocals, preliminary.resultType);
          const proofParams = annotations.flatMap((annotation) => annotation.proofParams ?? []);
          return { annotations, proofParams };
        });
        // Register the declaration head before elaborating its body so direct
        // recursive calls resolve through the same ordinary application path.
        context.declareFunction(semanticName, [...preliminary.params, ...preliminaryNormalized.proofParams], preliminary.resultType, { universeParams: payload.universeParams });
        const usage = context.captureSectionInstanceUsage(() => context.withTypeLocals(preliminary.typeLocals, () => {
          // Re-elaborate clauses inside the usage capture so section instances
          // referenced only by specifications remain part of the exact telescope.
          const annotations = context.elaborateClauses(payload.clauses, preliminary.valueLocals, preliminary.resultType);
          const proofParams = annotations.flatMap((annotation) => annotation.proofParams ?? []);
          const bodyLocals = new Map(preliminary.valueLocals);
          for (const proofParam of proofParams) bodyLocals.set(proofParam.name, proofParam.type);
          const instanceLocals = new Map(preliminary.params.filter((param) => param.binderInfo === "instance").map((param) => [param.name, param.type] as const));
          context.withInstanceLocals(instanceLocals, () => context.withLocals(bodyLocals, () => {
            elaborateDefBody(payload, bodyLocals, preliminary.resultType, context);
            if (payload.termination?.kind === "wellFounded" && payload.termination.measure) context.elaborateExpression(payload.termination.measure);
          }));
          return { annotations, proofParams };
        }));
        const usedSectionInstances = new Set(usage.usedNames);
        const telescope = elaborateTelescope(payload, context, usedSectionInstances);
        const normalized = context.withTypeLocals(telescope.typeLocals, () => {
          const annotations = context.elaborateClauses(payload.clauses, telescope.valueLocals, telescope.resultType);
          const proofParams = annotations.flatMap((annotation) => annotation.proofParams ?? []);
          return { annotations, proofParams, ...(usedSectionInstances.size ? { usedSectionInstances: [...usedSectionInstances] } : {}) } satisfies NormalizedDefClauses;
        });
        context.setElaborationInfo(`def.normalized:${semanticName}`, normalized);
        context.updateFunctionSignature(semanticName, [...telescope.params, ...normalized.proofParams], telescope.resultType, { universeParams: payload.universeParams });
      },
      elaborate(decl, context) {
        const payload = payloadOf(decl);
        const semanticName = context.qualifyName(payload.name);
        const normalized = context.getElaborationInfo<NormalizedDefClauses>(`def.normalized:${semanticName}`);
        const telescope = elaborateTelescope(payload, context, new Set(normalized?.usedSectionInstances ?? []));
        if (!normalized) throw new ProofScriptError("PS2211", `Missing normalized declaration clauses for '${payload.name}'.`);
        return context.withTypeLocals(telescope.typeLocals, () => {
          const bodyLocals = new Map(telescope.valueLocals);
          for (const proofParam of normalized.proofParams) bodyLocals.set(proofParam.name, proofParam.type);
          const instanceLocals = new Map(telescope.params.filter((param) => param.binderInfo === "instance").map((param) => [param.name, param.type] as const));
          const elaborated = context.withInstanceLocals(instanceLocals, () =>
            context.withLocals(bodyLocals, () => {
              const elaboratedBody = elaborateDefBody(payload, bodyLocals, telescope.resultType, context);
              const termination = payload.termination?.kind === "wellFounded"
                ? elaborateWellFoundedTermination(payload.termination, elaboratedBody.body, semanticName, context)
                : analyzeStructuralRecursion(
                    elaboratedBody.body,
                    semanticName,
                    [...telescope.params, ...normalized.proofParams],
                    payload.termination,
                    context,
                  );
              return { elaboratedBody, termination };
            }),
          );
          const elaboratedBody = elaborated.elaboratedBody;
          const body = elaboratedBody.body;
          const termination = elaborated.termination;
          const annotations = normalized.annotations.map((annotation) => annotation.op === "proof.contract.value"
            ? { ...annotation, payload: { ...(annotation.payload as Record<string, unknown>), ownerName: semanticName } }
            : annotation);
          return {
            kind: "def" as const,
            name: payload.name,
            ...(semanticName === payload.name ? {} : { semanticName }),
            ...(payload.universeParams.length ? { universeParams: payload.universeParams } : {}),
            params: telescope.params,
            returnType: telescope.resultType,
            body,
            ...(payload.equations ? { sourceForm: "equations" as const, equationParamNames: payload.equationParamNames ?? [], equations: elaboratedBody.equations ?? [] } : {}),
            ...(termination ? { termination } : {}),
            ...(normalized.proofParams.length === 0 ? {} : { proofParams: normalized.proofParams }),
            ...(annotations.length === 0 ? {} : { annotations }),
          };
        });
      },
    });
  },
};

export default plugin;
