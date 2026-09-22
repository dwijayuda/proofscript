import { Level, LevelZero, instantiateLevel, levelStructuralEq, levelParams, prettyLevel } from "./Level";
import { Name } from "./Name";
import { KernelTypeError } from "./KernelError";

export type BinderInfo = "explicit" | "implicit" | "strictImplicit" | "instImplicit";
export type Literal = { tag: "nat"; value: number } | { tag: "int"; value: number } | { tag: "str"; value: string };
export type FVarId = string;
export type MVarId = string;
export type MData = Record<string, unknown>;

/** Current ProofScript Core term shape retained as the public compatibility surface. */
export type Term =
  | { tag: "sort"; level: Level }
  | { tag: "bvar"; index: number }
  | { tag: "const"; name: Name; levels: Level[] }
  | { tag: "app"; fn: Term; arg: Term }
  | { tag: "lam"; domain: Term; body: Term; binderInfo?: BinderInfo }
  | { tag: "pi"; domain: Term; body: Term; binderInfo?: BinderInfo }
  | { tag: "let"; type: Term; value: Term; body: Term; nondep: boolean }
  | { tag: "lit"; literal: Literal }
  | { tag: "proj"; typeName: Name; index: number; expr: Term };

/** PSKernel expression tags for new mirror-facing code. */
export type Expr =
  | { tag: "bvar"; index: number }
  | { tag: "fvar"; fvarId: FVarId }
  | { tag: "mvar"; mvarId: MVarId }
  | { tag: "sort"; level: Level }
  | { tag: "const"; name: Name; levels: Level[] }
  | { tag: "app"; fn: Expr; arg: Expr }
  | { tag: "lam"; name: Name; type: Expr; body: Expr; binderInfo: BinderInfo }
  | { tag: "forallE"; name: Name; type: Expr; body: Expr; binderInfo: BinderInfo }
  | { tag: "letE"; name: Name; type: Expr; value: Expr; body: Expr; nondep: boolean }
  | { tag: "lit"; literal: Literal }
  | { tag: "mdata"; data: MData; expr: Expr }
  | { tag: "proj"; structName: Name; idx: number; expr: Expr };

export const Prop: Term = { tag: "sort", level: LevelZero };
export const Type: Term = { tag: "sort", level: { tag: "succ", of: LevelZero } };
export const ExprProp: Expr = { tag: "sort", level: LevelZero };
export function exprArrow(domain: Expr, body: Expr): Expr { return { tag: "forallE", name: "a", type: domain, body, binderInfo: "explicit" }; }
export function exprLam0(type: Expr, body: Expr): Expr { return { tag: "lam", name: "_", type, body, binderInfo: "explicit" }; }

export function binderInfoOf(term: { binderInfo?: BinderInfo }): BinderInfo { return term.binderInfo ?? "explicit"; }

export function exprToTerm(expr: Expr): Term {
  switch (expr.tag) {
    case "bvar": return { tag: "bvar", index: expr.index };
    case "sort": return { tag: "sort", level: expr.level };
    case "const": return { tag: "const", name: expr.name, levels: expr.levels };
    case "app": return { tag: "app", fn: exprToTerm(expr.fn), arg: exprToTerm(expr.arg) };
    case "lam": return { tag: "lam", domain: exprToTerm(expr.type), body: exprToTerm(expr.body), binderInfo: expr.binderInfo };
    case "forallE": return { tag: "pi", domain: exprToTerm(expr.type), body: exprToTerm(expr.body), binderInfo: expr.binderInfo };
    case "letE": return { tag: "let", type: exprToTerm(expr.type), value: exprToTerm(expr.value), body: exprToTerm(expr.body), nondep: expr.nondep };
    case "lit": return { tag: "lit", literal: expr.literal };
    case "mdata": return exprToTerm(expr.expr);
    case "proj": return { tag: "proj", typeName: expr.structName, index: expr.idx, expr: exprToTerm(expr.expr) };
    case "fvar": throw new KernelTypeError(`free variable ${expr.fvarId} cannot enter trusted Core`);
    case "mvar": throw new KernelTypeError(`metavariable ${expr.mvarId} cannot enter trusted Core`);
  }
}

export function termToExpr(term: Term, name = "_"): Expr {
  switch (term.tag) {
    case "sort": return { tag: "sort", level: term.level };
    case "bvar": return { tag: "bvar", index: term.index };
    case "const": return { tag: "const", name: term.name, levels: term.levels };
    case "app": return { tag: "app", fn: termToExpr(term.fn), arg: termToExpr(term.arg) };
    case "lam": return { tag: "lam", name, type: termToExpr(term.domain), body: termToExpr(term.body), binderInfo: binderInfoOf(term) };
    case "pi": return { tag: "forallE", name, type: termToExpr(term.domain), body: termToExpr(term.body), binderInfo: binderInfoOf(term) };
    case "let": return { tag: "letE", name, type: termToExpr(term.type), value: termToExpr(term.value), body: termToExpr(term.body), nondep: term.nondep };
    case "lit": return { tag: "lit", literal: term.literal };
    case "proj": return { tag: "proj", structName: term.typeName, idx: term.index, expr: termToExpr(term.expr) };
  }
}


export function getAppFn(term: Term): Term {
  let head = term;
  while (head.tag === "app") head = head.fn;
  return head;
}

export function getAppArgs(term: Term): Term[] {
  const args: Term[] = [];
  let head = term;
  while (head.tag === "app") { args.unshift(head.arg); head = head.fn; }
  return args;
}

export function replaceNoCacheTerm(term: Term, f: (term: Term) => Term | undefined): Term {
  const replacement = f(term);
  if (replacement) return replacement;
  switch (term.tag) {
    case "sort":
    case "bvar":
    case "const":
    case "lit": return term;
    case "app": return { tag: "app", fn: replaceNoCacheTerm(term.fn, f), arg: replaceNoCacheTerm(term.arg, f) };
    case "lam": return { tag: "lam", domain: replaceNoCacheTerm(term.domain, f), body: replaceNoCacheTerm(term.body, f), binderInfo: term.binderInfo };
    case "pi": return { tag: "pi", domain: replaceNoCacheTerm(term.domain, f), body: replaceNoCacheTerm(term.body, f), binderInfo: term.binderInfo };
    case "let": return { tag: "let", type: replaceNoCacheTerm(term.type, f), value: replaceNoCacheTerm(term.value, f), body: replaceNoCacheTerm(term.body, f), nondep: term.nondep };
    case "proj": return { tag: "proj", typeName: term.typeName, index: term.index, expr: replaceNoCacheTerm(term.expr, f) };
  }
}

export function replaceNoCacheExpr(expr: Expr, f: (expr: Expr) => Expr | undefined): Expr {
  const replacement = f(expr);
  if (replacement) return replacement;
  switch (expr.tag) {
    case "bvar":
    case "fvar":
    case "mvar":
    case "sort":
    case "const":
    case "lit": return expr;
    case "app": return { tag: "app", fn: replaceNoCacheExpr(expr.fn, f), arg: replaceNoCacheExpr(expr.arg, f) };
    case "lam": return { tag: "lam", name: expr.name, type: replaceNoCacheExpr(expr.type, f), body: replaceNoCacheExpr(expr.body, f), binderInfo: expr.binderInfo };
    case "forallE": return { tag: "forallE", name: expr.name, type: replaceNoCacheExpr(expr.type, f), body: replaceNoCacheExpr(expr.body, f), binderInfo: expr.binderInfo };
    case "letE": return { tag: "letE", name: expr.name, type: replaceNoCacheExpr(expr.type, f), value: replaceNoCacheExpr(expr.value, f), body: replaceNoCacheExpr(expr.body, f), nondep: expr.nondep };
    case "mdata": return { tag: "mdata", data: expr.data, expr: replaceNoCacheExpr(expr.expr, f) };
    case "proj": return { tag: "proj", structName: expr.structName, idx: expr.idx, expr: replaceNoCacheExpr(expr.expr, f) };
  }
}

export const natZeroExpr: Expr = { tag: "const", name: "Nat.zero", levels: [] };
export const natSuccExpr: Expr = { tag: "const", name: "Nat.succ", levels: [] };
export const natZeroTerm: Term = { tag: "const", name: "Nat.zero", levels: [] };
export const natSuccTerm: Term = { tag: "const", name: "Nat.succ", levels: [] };
export function natLitToConstructorTerm(n: number): Term {
  if (!Number.isSafeInteger(n) || n < 0) throw new KernelTypeError(`invalid Nat literal: ${n}`);
  let result: Term = natZeroTerm;
  for (let i = 0; i < n; i++) result = { tag: "app", fn: natSuccTerm, arg: result };
  return result;
}
export function natLitToConstructorExpr(n: number): Expr { return termToExpr(natLitToConstructorTerm(n)); }
export function literalToConstructorTerm(literal: Literal): Term {
  if (literal.tag === "nat") return natLitToConstructorTerm(literal.value);
  throw new KernelTypeError(`${literal.tag === "int" ? "Int" : "String"} literal constructor expansion is not implemented in the trusted Core slice yet`);
}
export function literalToConstructorExpr(literal: Literal): Expr { return termToExpr(literalToConstructorTerm(literal)); }
export function literalTypeName(literal: Literal): Name { return literal.tag === "nat" ? "Nat" : literal.tag === "int" ? "Int" : "String"; }

export function shift(term: Term, delta: number, cutoff = 0): Term {
  switch (term.tag) {
    case "sort":
    case "const":
    case "lit": return term;
    case "bvar": {
      if (term.index < cutoff) return term;
      const index = term.index + delta;
      if (index < 0) throw new KernelTypeError("internal: negative de Bruijn index after shift");
      return { tag: "bvar", index };
    }
    case "app": return { tag: "app", fn: shift(term.fn, delta, cutoff), arg: shift(term.arg, delta, cutoff) };
    case "lam": return { tag: "lam", domain: shift(term.domain, delta, cutoff), body: shift(term.body, delta, cutoff + 1), binderInfo: term.binderInfo };
    case "pi": return { tag: "pi", domain: shift(term.domain, delta, cutoff), body: shift(term.body, delta, cutoff + 1), binderInfo: term.binderInfo };
    case "let": return { tag: "let", type: shift(term.type, delta, cutoff), value: shift(term.value, delta, cutoff), body: shift(term.body, delta, cutoff + 1), nondep: term.nondep };
    case "proj": return { tag: "proj", typeName: term.typeName, index: term.index, expr: shift(term.expr, delta, cutoff) };
  }
}

function subst(term: Term, index: number, replacement: Term, depth = 0): Term {
  switch (term.tag) {
    case "sort":
    case "const":
    case "lit": return term;
    case "bvar": return term.index === index + depth ? shift(replacement, depth) : term;
    case "app": return { tag: "app", fn: subst(term.fn, index, replacement, depth), arg: subst(term.arg, index, replacement, depth) };
    case "lam": return { tag: "lam", domain: subst(term.domain, index, replacement, depth), body: subst(term.body, index, replacement, depth + 1), binderInfo: term.binderInfo };
    case "pi": return { tag: "pi", domain: subst(term.domain, index, replacement, depth), body: subst(term.body, index, replacement, depth + 1), binderInfo: term.binderInfo };
    case "let": return { tag: "let", type: subst(term.type, index, replacement, depth), value: subst(term.value, index, replacement, depth), body: subst(term.body, index, replacement, depth + 1), nondep: term.nondep };
    case "proj": return { tag: "proj", typeName: term.typeName, index: term.index, expr: subst(term.expr, index, replacement, depth) };
  }
}

export function instantiate(body: Term, arg: Term): Term { return shift(subst(body, 0, shift(arg, 1)), -1); }

export function instantiateTermLevels(term: Term, params: readonly Name[], args: readonly Level[]): Term {
  switch (term.tag) {
    case "sort": return { tag: "sort", level: instantiateLevel(term.level, params, args) };
    case "bvar":
    case "lit": return term;
    case "const": return { tag: "const", name: term.name, levels: term.levels.map(l => instantiateLevel(l, params, args)) };
    case "app": return { tag: "app", fn: instantiateTermLevels(term.fn, params, args), arg: instantiateTermLevels(term.arg, params, args) };
    case "lam": return { tag: "lam", domain: instantiateTermLevels(term.domain, params, args), body: instantiateTermLevels(term.body, params, args), binderInfo: term.binderInfo };
    case "pi": return { tag: "pi", domain: instantiateTermLevels(term.domain, params, args), body: instantiateTermLevels(term.body, params, args), binderInfo: term.binderInfo };
    case "let": return { tag: "let", type: instantiateTermLevels(term.type, params, args), value: instantiateTermLevels(term.value, params, args), body: instantiateTermLevels(term.body, params, args), nondep: term.nondep };
    case "proj": return { tag: "proj", typeName: term.typeName, index: term.index, expr: instantiateTermLevels(term.expr, params, args) };
  }
}

export function collectTermLevelParams(term: Term, out = new Set<Name>()): Set<Name> {
  switch (term.tag) {
    case "sort": for (const p of levelParams(term.level)) out.add(p); return out;
    case "bvar":
    case "lit": return out;
    case "const": for (const l of term.levels) for (const p of levelParams(l)) out.add(p); return out;
    case "app": collectTermLevelParams(term.fn, out); collectTermLevelParams(term.arg, out); return out;
    case "lam":
    case "pi": collectTermLevelParams(term.domain, out); collectTermLevelParams(term.body, out); return out;
    case "let": collectTermLevelParams(term.type, out); collectTermLevelParams(term.value, out); collectTermLevelParams(term.body, out); return out;
    case "proj": collectTermLevelParams(term.expr, out); return out;
  }
}

export function hasMVarOrFVar(term: Term): boolean {
  switch (term.tag) {
    case "sort":
    case "bvar":
    case "const":
    case "lit": return false;
    case "app": return hasMVarOrFVar(term.fn) || hasMVarOrFVar(term.arg);
    case "lam":
    case "pi": return hasMVarOrFVar(term.domain) || hasMVarOrFVar(term.body);
    case "let": return hasMVarOrFVar(term.type) || hasMVarOrFVar(term.value) || hasMVarOrFVar(term.body);
    case "proj": return hasMVarOrFVar(term.expr);
  }
}

export function sameTerm(a: Term, b: Term): boolean {
  if (a.tag !== b.tag) return false;
  switch (a.tag) {
    case "sort": return b.tag === "sort" && levelStructuralEq(a.level, b.level);
    case "bvar": return b.tag === "bvar" && a.index === b.index;
    case "const": return b.tag === "const" && a.name === b.name && a.levels.length === b.levels.length && a.levels.every((l, i) => levelStructuralEq(l, b.levels[i]));
    case "lit": return b.tag === "lit" && a.literal.tag === b.literal.tag && a.literal.value === b.literal.value;
    case "app": return b.tag === "app" && sameTerm(a.fn, b.fn) && sameTerm(a.arg, b.arg);
    case "lam": return b.tag === "lam" && binderInfoOf(a) === binderInfoOf(b) && sameTerm(a.domain, b.domain) && sameTerm(a.body, b.body);
    case "pi": return b.tag === "pi" && binderInfoOf(a) === binderInfoOf(b) && sameTerm(a.domain, b.domain) && sameTerm(a.body, b.body);
    case "let": return b.tag === "let" && a.nondep === b.nondep && sameTerm(a.type, b.type) && sameTerm(a.value, b.value) && sameTerm(a.body, b.body);
    case "proj": return b.tag === "proj" && a.typeName === b.typeName && a.index === b.index && sameTerm(a.expr, b.expr);
  }
}

export function pretty(term: Term): string {
  switch (term.tag) {
    case "sort": return prettyLevel(term.level);
    case "bvar": return `#${term.index}`;
    case "const": return term.levels.length ? `${term.name}.{${term.levels.map(prettyLevel).join(",")}}` : term.name;
    case "lit": return term.literal.tag === "nat" || term.literal.tag === "int" ? String(term.literal.value) : JSON.stringify(term.literal.value);
    case "app": return `(${pretty(term.fn)} ${pretty(term.arg)})`;
    case "lam": return `(fun (${pretty(term.domain)}) => ${pretty(term.body)})`;
    case "pi": return `(Pi (${pretty(term.domain)}) -> ${pretty(term.body)})`;
    case "let": return `(let : ${pretty(term.type)} := ${pretty(term.value)}; ${pretty(term.body)})`;
    case "proj": return `(${pretty(term.expr)}.${term.index})`;
  }
}

export function containsLooseBVar(term: Term, depth = 0): boolean {
  switch (term.tag) {
    case "sort":
    case "const":
    case "lit": return false;
    case "bvar": return term.index >= depth;
    case "app": return containsLooseBVar(term.fn, depth) || containsLooseBVar(term.arg, depth);
    case "lam":
    case "pi": return containsLooseBVar(term.domain, depth) || containsLooseBVar(term.body, depth + 1);
    case "let": return containsLooseBVar(term.type, depth) || containsLooseBVar(term.value, depth) || containsLooseBVar(term.body, depth + 1);
    case "proj": return containsLooseBVar(term.expr, depth);
  }
}

export function collectConstNames(term: Term, out = new Set<Name>()): Set<Name> {
  switch (term.tag) {
    case "const": out.add(term.name); return out;
    case "lit": out.add(literalTypeName(term.literal)); return out;
    case "app": collectConstNames(term.fn, out); collectConstNames(term.arg, out); return out;
    case "lam":
    case "pi": collectConstNames(term.domain, out); collectConstNames(term.body, out); return out;
    case "let": collectConstNames(term.type, out); collectConstNames(term.value, out); collectConstNames(term.body, out); return out;
    case "proj": collectConstNames(term.expr, out); return out;
    case "sort":
    case "bvar": return out;
  }
}

export const portStatus_PSKernel_Expr = {
  source: "PSKernel/Expr.lean",
  target: "packages/kernel/src/PSKernel/Expr.ts",
  status: "partial",
  trustedBoundary: true,
  proofStatus: "not-proven",
} as const;
