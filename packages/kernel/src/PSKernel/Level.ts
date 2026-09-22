import { Name, nameLt } from "./Name";
import { KernelTypeError } from "./KernelError";

/** PSKernel-shaped universe level domain, with the current ProofScript trusted Core excluding unresolved mvars by default. */
export type Level =
  | { tag: "zero" }
  | { tag: "succ"; of: Level }
  | { tag: "max"; left: Level; right: Level }
  | { tag: "imax"; left: Level; right: Level }
  | { tag: "param"; name: Name }
  | { tag: "mvar"; name: Name };

export const LevelZero: Level = { tag: "zero" };
export function levelParam(name: Name): Level { return { tag: "param", name }; }
export function levelMVar(name: Name): Level { return { tag: "mvar", name }; }
export function levelSucc(of: Level): Level { return { tag: "succ", of }; }
export function levelMax(left: Level, right: Level): Level { return { tag: "max", left, right }; }
export function levelIMax(left: Level, right: Level): Level { return { tag: "imax", left, right }; }


/** Mirrors Lean.Level.forEach: visit a level and, when the visitor returns true, recurse into children. */
export function forEachLevel(level: Level, visit: (level: Level) => boolean | void): void {
  const keepGoing = visit(level);
  if (keepGoing === false) return;
  switch (level.tag) {
    case "succ": forEachLevel(level.of, visit); break;
    case "max":
    case "imax": forEachLevel(level.left, visit); forEachLevel(level.right, visit); break;
    case "zero":
    case "param":
    case "mvar": break;
  }
}

/** Return a universe parameter that appears in `level` but is absent from `params`, if one exists. */
export function getUndefParam(level: Level, params: readonly Name[]): Name | undefined {
  const allowed = new Set(params);
  let found: Name | undefined;
  forEachLevel(level, u => {
    if (found !== undefined) return false;
    if (u.tag === "param" && !allowed.has(u.name)) { found = u.name; return false; }
    return true;
  });
  return found;
}

export function levelOfNat(n: number): Level {
  if (!Number.isSafeInteger(n) || n < 0) throw new KernelTypeError(`invalid universe numeral: ${n}`);
  let out: Level = LevelZero;
  for (let i = 0; i < n; i++) out = levelSucc(out);
  return out;
}

export function levelStructuralEq(a: Level, b: Level): boolean {
  if (a.tag !== b.tag) return false;
  switch (a.tag) {
    case "zero": return true;
    case "param": return b.tag === "param" && a.name === b.name;
    case "mvar": return b.tag === "mvar" && a.name === b.name;
    case "succ": return b.tag === "succ" && levelStructuralEq(a.of, b.of);
    case "max": return b.tag === "max" && levelStructuralEq(a.left, b.left) && levelStructuralEq(a.right, b.right);
    case "imax": return b.tag === "imax" && levelStructuralEq(a.left, b.left) && levelStructuralEq(a.right, b.right);
  }
}

export function levelParams(level: Level, out = new Set<Name>()): Set<Name> {
  switch (level.tag) {
    case "zero": return out;
    case "param": out.add(level.name); return out;
    case "mvar": return out;
    case "succ": return levelParams(level.of, out);
    case "max":
    case "imax":
      levelParams(level.left, out);
      levelParams(level.right, out);
      return out;
  }
}

export function levelHasMVar(level: Level): boolean {
  switch (level.tag) {
    case "zero":
    case "param": return false;
    case "mvar": return true;
    case "succ": return levelHasMVar(level.of);
    case "max":
    case "imax": return levelHasMVar(level.left) || levelHasMVar(level.right);
  }
}

export function mapLevel(level: Level, f: (name: Name) => Level | undefined): Level {
  switch (level.tag) {
    case "zero": return level;
    case "param": return f(level.name) ?? level;
    case "mvar": return level;
    case "succ": return levelSucc(mapLevel(level.of, f));
    case "max": return levelMax(mapLevel(level.left, f), mapLevel(level.right, f));
    case "imax": return levelIMax(mapLevel(level.left, f), mapLevel(level.right, f));
  }
}

function hasParam(level: Level): boolean {
  switch (level.tag) {
    case "zero": return false;
    case "param": return true;
    case "mvar": return false;
    case "succ": return hasParam(level.of);
    case "max":
    case "imax": return hasParam(level.left) || hasParam(level.right);
  }
}

export interface OffsetLevel { base: Level; offset: number }
function toOffset(level: Level): OffsetLevel {
  let offset = 0;
  let base = level;
  while (base.tag === "succ") { offset++; base = base.of; }
  return { base, offset };
}

function addSucc(level: Level, count: number): Level {
  let out = level;
  for (let i = 0; i < count; i++) out = levelSucc(out);
  return out;
}

export function isNeverZero(level: Level): boolean {
  switch (level.tag) {
    case "zero":
    case "param": return false;
    case "mvar": return false;
    case "succ": return true;
    case "max": return isNeverZero(level.left) || isNeverZero(level.right);
    case "imax": return isNeverZero(level.right);
  }
}

export function normalizesToZero(level: Level): boolean {
  switch (level.tag) {
    case "zero": return true;
    case "param":
    case "mvar":
    case "succ": return false;
    case "max": return normalizesToZero(level.left) && normalizesToZero(level.right);
    case "imax": return normalizesToZero(level.right);
  }
}
export function isAlwaysZero(level: Level): boolean { return normalizesToZero(level); }

function isExplicitLevel(level: Level): boolean { return toOffset(normalizeLevel(level)).base.tag === "zero"; }

function mkLevelMaxPrime(u: Level, v: Level): Level {
  if (levelStructuralEq(u, v)) return u;
  if (u.tag === "zero") return v;
  if (v.tag === "zero") return u;
  // Lean's max simplifier treats explicit 1 as dominated by any level
  // that is known to be nonzero, e.g. max 1 (u+1) = u+1.
  if (levelStructuralEq(u, levelSucc(LevelZero)) && isNeverZero(v)) return v;
  if (levelStructuralEq(v, levelSucc(LevelZero)) && isNeverZero(u)) return u;
  const ou = toOffset(u), ov = toOffset(v);
  if (isExplicitLevel(u) && isExplicitLevel(v)) return ou.offset >= ov.offset ? u : v;
  if (levelStructuralEq(ou.base, ov.base)) return ou.offset >= ov.offset ? u : v;
  return levelMax(u, v);
}

function mkLevelIMaxPrime(u: Level, v: Level): Level {
  if (v.tag === "zero") return LevelZero;
  if (u.tag === "zero") return v;
  // Lean's mk_imax cheap simplification includes imax 1 v = v.
  // Semantically: if v=0 the result is 0; if v is nonzero, max 1 v = v.
  if (levelStructuralEq(u, levelSucc(LevelZero))) return v;
  if (isNeverZero(v)) return normalizeLevel(mkLevelMaxPrime(u, v));
  if (levelStructuralEq(u, v)) return u;
  return levelIMax(u, v);
}

export function instantiateLevel(level: Level, params: readonly Name[], args: readonly Level[]): Level {
  if (params.length !== args.length) throw new KernelTypeError(`universe arity mismatch: expected ${params.length}, got ${args.length}`);
  const subst = new Map<Name, Level>();
  for (let i = 0; i < params.length; i++) if (!subst.has(params[i])) subst.set(params[i], args[i]);
  const go = (u: Level): Level => {
    switch (u.tag) {
      case "zero": return u;
      case "param": return subst.get(u.name) ?? u;
      case "mvar": return u;
      case "succ": return hasParam(u) ? levelSucc(go(u.of)) : u;
      case "max": return hasParam(u) ? mkLevelMaxPrime(go(u.left), go(u.right)) : u;
      case "imax": return hasParam(u) ? mkLevelIMaxPrime(go(u.left), go(u.right)) : u;
    }
  };
  return go(level);
}

function ctorRank(level: Level): number {
  switch (level.tag) {
    case "zero": return 0;
    case "param": return 1;
    case "mvar": return 2;
    case "succ": return 3;
    case "max": return 4;
    case "imax": return 5;
  }
}

function normLtAux(l1: Level, k1: number, l2: Level, k2: number): boolean {
  if (l1.tag === "succ") return normLtAux(l1.of, k1 + 1, l2, k2);
  if (l2.tag === "succ") return normLtAux(l1, k1, l2.of, k2 + 1);
  if ((l1.tag === "param" || l1.tag === "mvar") && l1.tag === l2.tag) return l1.name === (l2 as typeof l1).name ? k1 < k2 : nameLt(l1.name, (l2 as typeof l1).name);
  if (levelStructuralEq(l1, l2)) return k1 < k2;
  if (l1.tag === "max" && l2.tag === "max") {
    if (!levelStructuralEq(l1.left, l2.left)) return normLtAux(l1.left, 0, l2.left, 0);
    return normLtAux(l1.right, 0, l2.right, 0);
  }
  if (l1.tag === "imax" && l2.tag === "imax") {
    if (!levelStructuralEq(l1.left, l2.left)) return normLtAux(l1.left, 0, l2.left, 0);
    return normLtAux(l1.right, 0, l2.right, 0);
  }
  return ctorRank(l1) < ctorRank(l2);
}
function normLt(a: Level, b: Level): boolean { return normLtAux(a, 0, b, 0); }

function getMaxArgs(level: Level, out: Level[] = []): Level[] {
  if (level.tag === "max") { getMaxArgs(level.left, out); getMaxArgs(level.right, out); }
  else out.push(level);
  return out;
}

function mkMaxFromArgs(args: Level[]): Level {
  if (args.length === 0) return LevelZero;
  args.sort((a, b) => normLt(a, b) ? -1 : normLt(b, a) ? 1 : 0);
  const kept: Level[] = [];
  for (const arg of args) {
    if (!kept.some(k => levelStructuralEq(k, arg))) kept.push(arg);
  }
  return kept.reduce((acc, next) => mkLevelMaxPrime(acc, next), LevelZero as Level);
}

export function normalizeLevel(level: Level): Level {
  switch (level.tag) {
    case "zero":
    case "param":
    case "mvar": return level;
    case "succ": { const inner = normalizeLevel(level.of); return inner.tag === "max" ? normalizeLevel(levelMax(levelSucc(inner.left), levelSucc(inner.right))) : levelSucc(inner); }
    case "imax": return mkLevelIMaxPrime(normalizeLevel(level.left), normalizeLevel(level.right));
    case "max": return mkMaxFromArgs(getMaxArgs(level).map(normalizeLevel));
  }
}

export function levelDefEq(a: Level, b: Level): boolean { return levelStructuralEq(normalizeLevel(a), normalizeLevel(b)); }
export function levelDefEqList(left: readonly Level[], right: readonly Level[]): boolean { return left.length === right.length && left.every((u, i) => levelDefEq(u, right[i])); }
export function levelGeq(a: Level, b: Level): boolean {
  const na0 = normalizeLevel(a), nb0 = normalizeLevel(b);
  // Universe levels are natural-number-valued expressions: every level is at
  // least 0, and every level known to be nonzero is at least 1.  Lean relies on
  // these facts when checking polymorphic inductives such as `RBTree.{u}` whose
  // result universe is `u+1` and whose constructors contain ordinary `Type 0`
  // fields.  This is a general universe-ordering rule, not an Arena-name
  // shortcut.
  if (normalizesToZero(nb0)) return true;
  if (levelDefEq(nb0, levelSucc(LevelZero)) && isNeverZero(na0)) return true;
  const an = levelToNat(na0), bn = levelToNat(nb0);
  if (an !== undefined && bn !== undefined) return an >= bn;
  const oa = toOffset(na0), ob = toOffset(nb0);
  if (levelStructuralEq(oa.base, ob.base)) return oa.offset >= ob.offset;
  if (levelDefEq(na0, nb0)) return true;
  if (na0.tag === "imax") return levelGeq(na0.left, nb0) || levelGeq(na0.right, nb0);
  return na0.tag === "max" && (levelGeq(na0.left, nb0) || levelGeq(na0.right, nb0));
}
export function levelLeq(a: Level, b: Level): boolean { return levelGeq(b, a); }

export function levelToNat(level: Level): number | undefined {
  const n = normalizeLevel(level);
  const off = toOffset(n);
  return off.base.tag === "zero" ? off.offset : undefined;
}

export function prettyLevel(level: Level): string {
  const nat = levelToNat(level);
  if (nat !== undefined) return nat === 0 ? "Prop" : `Type ${nat - 1}`;
  switch (level.tag) {
    case "zero": return "0";
    case "param": return level.name;
    case "mvar": return level.name;
    case "succ": return `succ(${prettyLevel(level.of)})`;
    case "max": return `max(${prettyLevel(level.left)}, ${prettyLevel(level.right)})`;
    case "imax": return `imax(${prettyLevel(level.left)}, ${prettyLevel(level.right)})`;
  }
}

export function assertNoLevelMVar(level: Level): void {
  if (levelHasMVar(level)) throw new KernelTypeError(`unsupported universe metavariable in trusted kernel level: ${prettyLevel(level)}`);
}

export const portStatus_PSKernel_Level = {
  source: "PSKernel/Level.lean",
  target: "packages/kernel/src/PSKernel/Level.ts",
  status: "partial",
  trustedBoundary: true,
  proofStatus: "not-proven",
} as const;
