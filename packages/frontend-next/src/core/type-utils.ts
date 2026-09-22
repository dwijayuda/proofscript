import type { BinderInfo, IRExpr, IRParam, IRType, IRTypeArgument, IRUniverseLevel } from "./model.js";


export function zeroUniverse(): IRUniverseLevel { return { kind: "zero" }; }

export function makeSortType(alias: "Prop" | "Sort" | "Type", level?: IRUniverseLevel): IRType {
  const sourceLevel = alias === "Prop" ? zeroUniverse() : (level ?? zeroUniverse());
  const rendered = alias === "Prop" ? "Prop" : `${alias}${level ? ` ${universeDisplay(level)}` : ""}`;
  return {
    form: "sort",
    id: `lean.sort:${alias}:${universeKey(sourceLevel)}`,
    displayName: rendered,
    family: "lean.sort",
    universe: sourceLevel,
    sortAlias: alias,
  };
}

export function isSortType(type: IRType): boolean { return type.form === "sort" && type.family === "lean.sort"; }
export function isPropSort(type: IRType): boolean { return isSortType(type) && type.sortAlias === "Prop"; }

export function universeKey(level: IRUniverseLevel): string {
  switch (level.kind) {
    case "zero": return "0";
    case "param": return level.name;
    case "succ": return `succ(${universeKey(level.base)},${level.amount})`;
    case "max": return `max(${universeKey(level.left)},${universeKey(level.right)})`;
    case "imax": return `imax(${universeKey(level.left)},${universeKey(level.right)})`;
  }
}

export function universeDisplay(level: IRUniverseLevel): string {
  switch (level.kind) {
    case "zero": return "0";
    case "param": return level.name;
    case "succ": return `${universeDisplay(level.base)} + ${level.amount}`;
    case "max": return `max ${universeDisplay(level.left)} ${universeDisplay(level.right)}`;
    case "imax": return `imax ${universeDisplay(level.left)} ${universeDisplay(level.right)}`;
  }
}

export function substituteUniverseLevel(level: IRUniverseLevel, substitutions: ReadonlyMap<string, IRUniverseLevel>): IRUniverseLevel {
  switch (level.kind) {
    case "zero": return level;
    case "param": return substitutions.get(level.name) ?? level;
    case "succ": return { kind: "succ", base: substituteUniverseLevel(level.base, substitutions), amount: level.amount };
    case "max": return { kind: "max", left: substituteUniverseLevel(level.left, substitutions), right: substituteUniverseLevel(level.right, substitutions) };
    case "imax": return { kind: "imax", left: substituteUniverseLevel(level.left, substitutions), right: substituteUniverseLevel(level.right, substitutions) };
  }
}

function semanticSortLevel(type: IRType): IRUniverseLevel | undefined {
  if (!isSortType(type)) return undefined;
  const level = type.universe ?? zeroUniverse();
  if (type.sortAlias === "Prop" || type.sortAlias === "Sort") return level;
  return { kind: "succ", base: level, amount: 1 };
}

function sameUniverse(left: IRUniverseLevel, right: IRUniverseLevel): boolean { return universeKey(left) === universeKey(right); }

export function nominalType(id: string, displayName = id, family?: string, args?: readonly IRTypeArgument[]): IRType {
  return {
    form: "nominal",
    id,
    displayName,
    ...(family === undefined ? {} : { family }),
    ...(args === undefined ? {} : { args }),
  };
}

export function makeTypeVariable(name: string, sort?: IRType): IRType {
  return { ...nominalType(`core.typevar:${name}`, name, "core.typevar"), ...(sort ? { typeVarSort: sort } : {}) };
}

export function isTypeVariable(type: IRType): boolean {
  return type.family === "core.typevar";
}

export function typeVariableName(type: IRType): string | undefined {
  return isTypeVariable(type) ? type.displayName : undefined;
}

export function isPropositionType(type: IRType): boolean {
  if (isTypeVariable(type)) return type.typeVarSort ? isPropSort(type.typeVarSort) : false;
  if (type.form === "term" && type.term) return isPropSort(type.term.type);
  return false;
}

export function typeArgument(value: IRType): IRTypeArgument { return { kind: "type", value }; }
export function termArgument(value: IRExpr): IRTypeArgument { return { kind: "term", value }; }

export function expectTypeArgument(argument: IRTypeArgument, context: string): IRType {
  if (argument.kind !== "type") throw new Error(`${context} expects a type argument.`);
  return argument.value;
}

export function expectTermArgument(argument: IRTypeArgument, context: string): IRExpr {
  if (argument.kind !== "term") throw new Error(`${context} expects a term argument.`);
  return argument.value;
}

export function makeTypeTerm(term: IRExpr): IRType {
  return {
    form: "term",
    id: `core.type-term:${exprKey(term)}`,
    displayName: exprDisplay(term),
    family: "core.type-term",
    term,
  };
}

/** Reduce the small, kernel-faithful beta fragment needed when a type-valued
 * function (notably CoeFun's γ) is applied to a value. This does not pretend
 * to be a general evaluator; it only exposes an IR `type` result after direct
 * lambda beta-reduction. */
export function reduceTypeValuedExpr(expr: IRExpr): IRType | undefined {
  if (expr.kind === "type") return expr.value;
  if (expr.kind === "apply" && expr.callee.kind === "lambda" && expr.callee.params.length === expr.args.length) {
    const values = new Map<string, IRExpr>();
    expr.callee.params.forEach((param, index) => values.set(param.name, expr.args[index]!));
    return reduceTypeValuedExpr(substituteExpr(expr.callee.body, new Map(), values));
  }
  return undefined;
}

export function makePiType(
  binder: { readonly name: string; readonly binderInfo: BinderInfo } | undefined,
  domain: IRType,
  codomain: IRType,
): IRType {
  const param: IRParam = {
    name: binder?.name ?? "_",
    type: domain,
    binderInfo: binder?.binderInfo ?? "explicit",
  };
  const binderKey = binder ? `${binder.binderInfo}:${binder.name}` : "arrow";
  return {
    form: "pi",
    id: `core.pi:${binderKey}:${typeKey(domain)}:${typeKey(codomain)}`,
    displayName: binder
      ? `${binderOpen(binder.binderInfo)}${binder.name}: ${domain.displayName}${binderClose(binder.binderInfo)} → ${codomain.displayName}`
      : `${domain.displayName} → ${codomain.displayName}`,
    family: "core.pi",
    binder: param,
    domain,
    codomain,
  };
}

export function sameType(left: IRType, right: IRType): boolean {
  if (left.id === right.id) return true;
  if (isTypeVariable(left) || isTypeVariable(right)) return false;
  if (isSortType(left) && isSortType(right)) {
    const ll = semanticSortLevel(left);
    const rl = semanticSortLevel(right);
    return ll !== undefined && rl !== undefined && sameUniverse(ll, rl);
  }
  if (left.form !== right.form) return false;
  if (left.form === "nominal" && right.form === "nominal") {
    if (!left.family && !right.family) return false; // distinct nullary nominal constants require exact id equality (handled above)
    if (left.family !== right.family) return false;
  } else if (left.family !== right.family) return false;
  if (left.form === "term" || right.form === "term") {
    return left.term !== undefined && right.term !== undefined && exprKey(left.term) === exprKey(right.term);
  }
  if (left.form === "pi" || right.form === "pi") {
    if (!left.domain || !right.domain || !left.codomain || !right.codomain || !left.binder || !right.binder) return false;
    return left.binder.binderInfo === right.binder.binderInfo
      && sameType(left.domain, right.domain)
      && sameType(left.codomain, right.codomain);
  }
  const la = left.args ?? [];
  const ra = right.args ?? [];
  if (la.length !== ra.length) return false;
  return la.every((item, index) => sameTypeArgument(item, ra[index]!));
}

function sameTypeArgument(left: IRTypeArgument, right: IRTypeArgument): boolean {
  if (left.kind !== right.kind) return false;
  if (left.kind === "type" && right.kind === "type") return sameType(left.value, right.value);
  if (left.kind === "term" && right.kind === "term") return exprKey(left.value) === exprKey(right.value);
  return false;
}

export function containsTypeVariable(type: IRType): boolean {
  if (isTypeVariable(type)) return true;
  if (isSortType(type)) return false;
  if (type.form === "pi") return !!type.domain && !!type.codomain && (containsTypeVariable(type.domain) || containsTypeVariable(type.codomain));
  if (type.form === "term") return type.term ? exprContainsTypeVariable(type.term) : false;
  return (type.args ?? []).some((arg) => arg.kind === "type" ? containsTypeVariable(arg.value) : exprContainsTypeVariable(arg.value));
}

export function substituteUniversesInType(type: IRType, substitutions: ReadonlyMap<string, IRUniverseLevel>): IRType {
  if (substitutions.size === 0) return type;
  if (isTypeVariable(type)) {
    const sort = type.typeVarSort ? substituteUniversesInType(type.typeVarSort, substitutions) : undefined;
    return sort === type.typeVarSort ? type : { ...type, ...(sort ? { typeVarSort: sort } : {}) };
  }
  if (isSortType(type)) {
    const level = substituteUniverseLevel(type.universe ?? zeroUniverse(), substitutions);
    return makeSortType(type.sortAlias ?? "Sort", level);
  }
  if (type.form === "term" && type.term) return makeTypeTerm(substituteUniversesInExpr(type.term, substitutions));
  if (type.form === "pi" && type.domain && type.codomain && type.binder) {
    const domain = substituteUniversesInType(type.domain, substitutions);
    const codomain = substituteUniversesInType(type.codomain, substitutions);
    return makePiType({ name: type.binder.name, binderInfo: type.binder.binderInfo }, domain, codomain);
  }
  if (!type.args || type.args.length === 0) return type;
  const args = type.args.map((arg) => arg.kind === "type"
    ? typeArgument(substituteUniversesInType(arg.value, substitutions))
    : termArgument(substituteUniversesInExpr(arg.value, substitutions)));
  return rebuildNominal(type, args);
}

export function substituteUniversesInExpr(expr: IRExpr, substitutions: ReadonlyMap<string, IRUniverseLevel>): IRExpr {
  if (substitutions.size === 0) return expr;
  const type = substituteUniversesInType(expr.type, substitutions);
  switch (expr.kind) {
    case "var": return { ...expr, type };
    case "type": return { ...expr, value: substituteUniversesInType(expr.value, substitutions), type };
    case "literal": return { ...expr, type };
    case "call": return {
      ...expr,
      args: expr.args.map((arg) => substituteUniversesInExpr(arg, substitutions)),
      ...(expr.universeArgs ? { universeArgs: expr.universeArgs.map((level) => substituteUniverseLevel(level, substitutions)) } : {}),
      type,
    };
    case "apply": return { ...expr, callee: substituteUniversesInExpr(expr.callee, substitutions), args: expr.args.map((arg) => substituteUniversesInExpr(arg, substitutions)), type };
    case "lambda":
    case "quantifier": return {
      ...expr,
      params: expr.params.map((param) => ({ ...param, type: substituteUniversesInType(param.type, substitutions), ...(param.defaultValue ? { defaultValue: substituteUniversesInExpr(param.defaultValue, substitutions) } : {}) })),
      body: substituteUniversesInExpr(expr.body, substitutions),
      type,
    };
    case "op":
    case "extension": return { ...expr, args: expr.args.map((arg) => substituteUniversesInExpr(arg, substitutions)), type };
  }
}


/** Kernel-faithful direct beta normalization for IR applications whose callee
 * is already an explicit lambda. This is intentionally not a general evaluator;
 * it only exposes beta-redexes needed by dependent type/proposition comparison. */
export function reduceDirectBetaExpr(expr: IRExpr): IRExpr {
  const recur = (item: IRExpr): IRExpr => reduceDirectBetaExpr(item);
  switch (expr.kind) {
    case "var":
    case "literal":
    case "type": return expr;
    case "call": return { ...expr, args: expr.args.map(recur) };
    case "lambda":
    case "quantifier": return { ...expr, body: recur(expr.body) };
    case "op":
    case "extension": return { ...expr, args: expr.args.map(recur) };
    case "apply": {
      const callee = recur(expr.callee);
      const args = expr.args.map(recur);
      if (callee.kind !== "lambda" || args.length < callee.params.length) return { ...expr, callee, args };
      const values = new Map<string, IRExpr>();
      callee.params.forEach((param, index) => values.set(param.name, args[index]!));
      const body = recur(substituteExpr(callee.body, new Map(), values));
      const rest = args.slice(callee.params.length);
      return rest.length === 0 ? body : recur({ kind: "apply", callee: body, args: rest, type: expr.type });
    }
  }
}

export function substituteType(
  type: IRType,
  typeSubstitutions: ReadonlyMap<string, IRType>,
  valueSubstitutions: ReadonlyMap<string, IRExpr> = new Map(),
): IRType {
  const variable = typeVariableName(type);
  if (variable) return typeSubstitutions.get(variable) ?? type;

  if (isSortType(type)) return type;

  if (type.form === "term" && type.term) {
    const term = reduceDirectBetaExpr(substituteExpr(type.term, typeSubstitutions, valueSubstitutions));
    const reduced = reduceTypeValuedExpr(term);
    if (reduced) return substituteType(reduced, typeSubstitutions, valueSubstitutions);
    const args = type.args?.map((arg) => substituteTypeArgument(arg, typeSubstitutions, valueSubstitutions));
    const termUnchanged = exprKey(term) === exprKey(type.term);
    const argsUnchanged = !args || !type.args || args.every((arg, index) => sameTypeArgument(arg, type.args![index]!));
    if (termUnchanged && argsUnchanged) return type;
    // Plugin-owned dependent propositions/classes may use a term-form IR type
    // while still carrying a semantic family plus hidden term indices.  Do not
    // collapse those to anonymous `core.type-term` during substitution: doing
    // so would erase dictionary/index identity and can make proof evidence
    // reusable under the wrong selected instances.
    if (type.family && type.family !== "core.type-term") {
      const rebuiltArgs = args ?? type.args ?? [];
      const base = type.displayName.split("(")[0]!;
      const rendered = rebuiltArgs.map(typeArgumentDisplay).join(",");
      return {
        ...type,
        id: `${type.family}:${rebuiltArgs.map(typeArgumentKey).join(",")}:${exprKey(term)}`,
        displayName: rendered ? `${base}(${rendered})` : base,
        args: rebuiltArgs,
        term,
      };
    }
    return makeTypeTerm(term);
  }

  if (type.form === "pi" && type.domain && type.codomain && type.binder) {
    const domain = substituteType(type.domain, typeSubstitutions, valueSubstitutions);
    const narrowedValues = new Map(valueSubstitutions);
    narrowedValues.delete(type.binder.name);
    const codomain = substituteType(type.codomain, typeSubstitutions, narrowedValues);
    if (domain === type.domain && codomain === type.codomain) return type;
    return makePiType({ name: type.binder.name, binderInfo: type.binder.binderInfo }, domain, codomain);
  }

  if (!type.args || type.args.length === 0) return type;
  const args = type.args.map((arg) => substituteTypeArgument(arg, typeSubstitutions, valueSubstitutions));
  if (args.every((arg, index) => sameTypeArgument(arg, type.args![index]!))) return type;
  return rebuildNominal(type, args);
}

function substituteTypeArgument(
  argument: IRTypeArgument,
  typeSubstitutions: ReadonlyMap<string, IRType>,
  valueSubstitutions: ReadonlyMap<string, IRExpr>,
): IRTypeArgument {
  return argument.kind === "type"
    ? typeArgument(substituteType(argument.value, typeSubstitutions, valueSubstitutions))
    : termArgument(substituteExpr(argument.value, typeSubstitutions, valueSubstitutions));
}

function rebuildNominal(type: IRType, args: readonly IRTypeArgument[]): IRType {
  const base = type.family?.startsWith("core.adt:")
    ? type.family.slice("core.adt:".length)
    : type.family === "core.option" ? "Option" : type.displayName.split("(")[0]!;
  const rendered = args.map(typeArgumentDisplay).join(",");
  return nominalType(
    rendered ? `${base}(${args.map(typeArgumentKey).join(",")})` : base,
    rendered ? `${base}(${rendered})` : base,
    type.family,
    args,
  );
}

function unifyUniversePattern(
  pattern: IRUniverseLevel,
  actual: IRUniverseLevel,
  substitutions: Map<string, IRUniverseLevel>,
): boolean {
  if (pattern.kind === "param") {
    const prior = substitutions.get(pattern.name);
    if (prior) return sameUniverse(prior, actual);
    substitutions.set(pattern.name, actual);
    return true;
  }
  if (pattern.kind !== actual.kind) return false;
  switch (pattern.kind) {
    case "zero": return true;
    case "succ": return actual.kind === "succ" && pattern.amount === actual.amount && unifyUniversePattern(pattern.base, actual.base, substitutions);
    case "max": return actual.kind === "max" && unifyUniversePattern(pattern.left, actual.left, substitutions) && unifyUniversePattern(pattern.right, actual.right, substitutions);
    case "imax": return actual.kind === "imax" && unifyUniversePattern(pattern.left, actual.left, substitutions) && unifyUniversePattern(pattern.right, actual.right, substitutions);
  }
}

export function unifyTypePattern(
  pattern: IRType,
  actual: IRType,
  substitutions: Map<string, IRType>,
  valueSubstitutions: Map<string, IRExpr> = new Map(),
  inferableValueNames: ReadonlySet<string> = new Set(),
  universeSubstitutions: Map<string, IRUniverseLevel> = new Map(),
): boolean {
  const variable = typeVariableName(pattern);
  if (variable) {
    const prior = substitutions.get(variable);
    if (prior) return sameType(prior, actual);
    substitutions.set(variable, actual);
    return true;
  }
  if (isSortType(pattern) || isSortType(actual)) {
    if (!isSortType(pattern) || !isSortType(actual)) return false;
    const patternLevel = semanticSortLevel(pattern);
    const actualLevel = semanticSortLevel(actual);
    return patternLevel !== undefined && actualLevel !== undefined
      && unifyUniversePattern(patternLevel, actualLevel, universeSubstitutions);
  }
  if (pattern.form !== actual.form) return false;
  if (pattern.form === "term" && actual.form === "term" && pattern.term && actual.term) {
    return unifyExprPattern(pattern.term, actual.term, valueSubstitutions, inferableValueNames, substitutions, universeSubstitutions);
  }
  if (pattern.form === "term" || actual.form === "term") return false;
  if (pattern.form === "pi" || actual.form === "pi") {
    if (pattern.form !== "pi" || actual.form !== "pi" || !pattern.domain || !actual.domain || !pattern.codomain || !actual.codomain || !pattern.binder || !actual.binder) return false;
    if (pattern.binder.binderInfo !== actual.binder.binderInfo) return false;
    return unifyTypePattern(pattern.domain, actual.domain, substitutions, valueSubstitutions, inferableValueNames, universeSubstitutions)
      && unifyTypePattern(pattern.codomain, actual.codomain, substitutions, valueSubstitutions, inferableValueNames, universeSubstitutions);
  }
  // Nominal heads are identified by semantic family when one exists, and by
  // the nominal id otherwise. The previous conjunction accidentally treated
  // any two family-less nominal types (for example Int and Nat) as the same
  // head because both families were undefined. That is unsound for instance
  // selection and became observable with heterogeneous HAdd/HSub/HMul.
  const patternHead = pattern.family ?? pattern.id;
  const actualHead = actual.family ?? actual.id;
  if (patternHead !== actualHead) return false;
  const pa = pattern.args ?? [];
  const aa = actual.args ?? [];
  if (pa.length !== aa.length) return false;
  return pa.every((item, index) => {
    const other = aa[index]!;
    if (item.kind !== other.kind) return false;
    if (item.kind === "type" && other.kind === "type") return unifyTypePattern(item.value, other.value, substitutions, valueSubstitutions, inferableValueNames, universeSubstitutions);
    if (item.kind === "term" && other.kind === "term") return unifyExprPattern(item.value, other.value, valueSubstitutions, inferableValueNames, substitutions, universeSubstitutions);
    return false;
  });
}

function unifyExprPattern(
  pattern: IRExpr,
  actual: IRExpr,
  substitutions: Map<string, IRExpr>,
  inferableNames: ReadonlySet<string>,
  typeSubstitutions: Map<string, IRType> = new Map(),
  universeSubstitutions: Map<string, IRUniverseLevel> = new Map(),
): boolean {
  if (pattern.kind === "var" && inferableNames.has(pattern.name)) {
    // Dependent signatures often reveal an implicit type only through the type
    // of an inferred term argument (for example `h : Eq a b`, where `a : A`).
    // Match those types before committing the term substitution so generic
    // parameters are inferred from proof/evidence arguments as Lean does.
    if (!unifyTypePattern(pattern.type, actual.type, typeSubstitutions, substitutions, inferableNames, universeSubstitutions)) return false;
    const prior = substitutions.get(pattern.name);
    if (prior) return exprKey(prior) === exprKey(actual);
    substitutions.set(pattern.name, actual);
    return true;
  }
  if (pattern.kind !== actual.kind) return false;
  if (pattern.kind === "var" && actual.kind === "var") return pattern.name === actual.name;
  if (pattern.kind === "type" && actual.kind === "type") return sameType(pattern.value, actual.value);
  if (pattern.kind === "literal" && actual.kind === "literal") return pattern.op === actual.op && pattern.value === actual.value;
  if (pattern.kind === "call" && actual.kind === "call") {
    return pattern.callee === actual.callee
      && pattern.args.length === actual.args.length
      && pattern.args.every((arg, index) => unifyExprPattern(arg, actual.args[index]!, substitutions, inferableNames, typeSubstitutions, universeSubstitutions));
  }
  if (pattern.kind === "apply" && actual.kind === "apply") {
    return pattern.args.length === actual.args.length
      && unifyExprPattern(pattern.callee, actual.callee, substitutions, inferableNames, typeSubstitutions, universeSubstitutions)
      && pattern.args.every((arg, index) => unifyExprPattern(arg, actual.args[index]!, substitutions, inferableNames, typeSubstitutions, universeSubstitutions));
  }
  if (pattern.kind === "op" && actual.kind === "op") {
    return pattern.op === actual.op
      && pattern.args.length === actual.args.length
      && pattern.args.every((arg, index) => unifyExprPattern(arg, actual.args[index]!, substitutions, inferableNames, typeSubstitutions, universeSubstitutions));
  }
  if (pattern.kind === "extension" && actual.kind === "extension") {
    return pattern.op === actual.op
      && pattern.args.length === actual.args.length
      && pattern.args.every((arg, index) => unifyExprPattern(arg, actual.args[index]!, substitutions, inferableNames, typeSubstitutions, universeSubstitutions));
  }
  return exprKey(pattern) === exprKey(actual);
}

export function typeKey(type: IRType): string {
  if (isTypeVariable(type)) return `typevar(${type.displayName}:${type.typeVarSort ? typeKey(type.typeVarSort) : "?"})`;
  if (isSortType(type)) return `sort(${universeKey(semanticSortLevel(type) ?? zeroUniverse())})`;
  if (type.form === "term" && type.term) return `term(${exprKey(type.term)})`;
  if (type.form === "pi" && type.domain && type.codomain && type.binder) {
    return `pi(${type.binder.binderInfo},${typeKey(type.domain)},${typeKey(type.codomain)})`;
  }
  return `${type.family ?? type.id}(${(type.args ?? []).map(typeArgumentKey).join(",")})`;
}

export function typeArgumentKey(argument: IRTypeArgument): string {
  return argument.kind === "type" ? `T:${typeKey(argument.value)}` : `E:${exprKey(argument.value)}`;
}

export function typeArgumentDisplay(argument: IRTypeArgument): string {
  return argument.kind === "type" ? argument.value.displayName : exprDisplay(argument.value);
}

export function exprKey(expr: IRExpr): string {
  switch (expr.kind) {
    case "var": return `v:${expr.name}`;
    case "type": return `t:${typeKey(expr.value)}`;
    case "literal": return `l:${expr.op}:${expr.value}`;
    case "call": return `c:${expr.explicitMode ? "@" : ""}${expr.callee}${expr.universeArgs?.length ? `.{${expr.universeArgs.map(universeKey).join(",")}}` : ""}(${expr.args.map((arg, index) => `${expr.argumentNames?.[index] ?? ""}:${exprKey(arg)}`).join(",")})`;
    case "apply": return `a:${exprKey(expr.callee)}(${expr.args.map(exprKey).join(",")})`;
    case "lambda": return `lam:${expr.params.map((p) => `${p.binderInfo}:${p.name}:${typeKey(p.type)}`).join(";")}=>${exprKey(expr.body)}`;
    case "quantifier": return `${expr.quantifier}:${expr.params.map((p) => `${p.binderInfo}:${p.name}:${typeKey(p.type)}`).join(";")},${exprKey(expr.body)}`;
    case "op": return `o:${expr.op}(${expr.args.map(exprKey).join(",")})`;
    case "extension": return `x:${expr.op}(${expr.args.map(exprKey).join(",")})`;
  }
}

export function exprDisplay(expr: IRExpr): string {
  switch (expr.kind) {
    case "var": return expr.name;
    case "type": return expr.value.displayName;
    case "literal": return expr.value;
    case "call": return `${expr.explicitMode ? "@" : ""}${expr.callee}${expr.universeArgs?.length ? `.{${expr.universeArgs.map(universeDisplay).join(", ")}}` : ""}(${expr.args.map((arg, index) => expr.argumentNames?.[index] ? `${expr.argumentNames[index]} := ${exprDisplay(arg)}` : exprDisplay(arg)).join(", ")})`;
    case "apply": return `${exprDisplay(expr.callee)}(${expr.args.map(exprDisplay).join(", ")})`;
    case "lambda": return `fun ${expr.params.map((p) => `${p.name}: ${p.type.displayName}`).join(", ")} => ${exprDisplay(expr.body)}`;
    case "quantifier": return `${expr.quantifier === "forall" ? "∀" : "∃"} ${expr.params.map((p) => `${p.name}: ${p.type.displayName}`).join(", ")}, ${exprDisplay(expr.body)}`;
    case "op": return `${expr.op}(${expr.args.map(exprDisplay).join(", ")})`;
    case "extension": return `${expr.op}(${expr.args.map(exprDisplay).join(", ")})`;
  }
}

export function substituteExpr(
  expr: IRExpr,
  typeSubstitutions: ReadonlyMap<string, IRType>,
  valueSubstitutions: ReadonlyMap<string, IRExpr>,
): IRExpr {
  if (expr.kind === "var") {
    const replacement = valueSubstitutions.get(expr.name);
    if (replacement) return replacement;
    const type = substituteType(expr.type, typeSubstitutions, valueSubstitutions);
    return type === expr.type ? expr : { ...expr, type };
  }
  const type = substituteType(expr.type, typeSubstitutions, valueSubstitutions);
  if (expr.kind === "type") {
    const value = substituteType(expr.value, typeSubstitutions, valueSubstitutions);
    return { ...expr, value, type };
  }
  if (expr.kind === "literal") return type === expr.type ? expr : { ...expr, type };
  if (expr.kind === "lambda" || expr.kind === "quantifier") {
    const narrowedValues = new Map(valueSubstitutions);
    const narrowedTypes = new Map(typeSubstitutions);
    const params = expr.params.map((param) => {
      narrowedValues.delete(param.name);
      narrowedTypes.delete(param.name);
      return { ...param, type: substituteType(param.type, narrowedTypes, narrowedValues) };
    });
    const body = substituteExpr(expr.body, narrowedTypes, narrowedValues);
    return { ...expr, params, body, type };
  }
  if (expr.kind === "apply") {
    return {
      ...expr,
      callee: substituteExpr(expr.callee, typeSubstitutions, valueSubstitutions),
      args: expr.args.map((arg) => substituteExpr(arg, typeSubstitutions, valueSubstitutions)),
      type,
    };
  }
  const args = expr.args.map((arg) => substituteExpr(arg, typeSubstitutions, valueSubstitutions));
  return { ...expr, args, type };
}

function exprContainsTypeVariable(expr: IRExpr): boolean {
  if (containsTypeVariable(expr.type)) return true;
  if (expr.kind === "type") return containsTypeVariable(expr.value);
  if (expr.kind === "apply") return exprContainsTypeVariable(expr.callee) || expr.args.some(exprContainsTypeVariable);
  if (expr.kind === "lambda" || expr.kind === "quantifier") {
    return expr.params.some((param) => containsTypeVariable(param.type)) || exprContainsTypeVariable(expr.body);
  }
  return expr.kind === "call" || expr.kind === "op" || expr.kind === "extension"
    ? expr.args.some(exprContainsTypeVariable)
    : false;
}

function binderOpen(info: BinderInfo): string {
  switch (info) {
    case "explicit": return "(";
    case "implicit": return "{";
    case "strictImplicit": return "⦃";
    case "instance": return "[";
  }
}
function binderClose(info: BinderInfo): string {
  switch (info) {
    case "explicit": return ")";
    case "implicit": return "}";
    case "strictImplicit": return "⦄";
    case "instance": return "]";
  }
}
