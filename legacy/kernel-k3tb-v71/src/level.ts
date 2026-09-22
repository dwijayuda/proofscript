/**
 * Lean 4.33.1-compatible universe levels for the canonical ProofScript Core.
 *
 * ProofScript deliberately excludes unresolved universe metavariables from its
 * serialized trusted Core. The normalization/equivalence code below is a
 * no-mvar transcription of the pinned Lean 4.33.1 `Lean.Level` algorithms.
 */
export type Level =
  | { tag: "zero" }
  | { tag: "succ"; of: Level }
  | { tag: "max"; left: Level; right: Level }
  | { tag: "imax"; left: Level; right: Level }
  | { tag: "param"; name: string };

export const LevelZero: Level = { tag: "zero" };

export function levelParam(name: string): Level { return { tag: "param", name }; }
export function levelSucc(of: Level): Level { return { tag: "succ", of }; }
export function levelMax(left: Level, right: Level): Level { return { tag: "max", left, right }; }
export function levelIMax(left: Level, right: Level): Level { return { tag: "imax", left, right }; }

export function levelOfNat(n: number): Level {
  if (!Number.isSafeInteger(n) || n < 0) throw new Error(`invalid universe numeral: ${n}`);
  let out: Level = LevelZero;
  for (let i = 0; i < n; i++) out = levelSucc(out);
  return out;
}

export function levelStructuralEq(a: Level, b: Level): boolean {
  if (a.tag !== b.tag) return false;
  switch (a.tag) {
    case "zero": return true;
    case "param": return b.tag === "param" && a.name === b.name;
    case "succ": return b.tag === "succ" && levelStructuralEq(a.of, b.of);
    case "max": return b.tag === "max" && levelStructuralEq(a.left, b.left) && levelStructuralEq(a.right, b.right);
    case "imax": return b.tag === "imax" && levelStructuralEq(a.left, b.left) && levelStructuralEq(a.right, b.right);
  }
}

export function levelParams(level: Level, out = new Set<string>()): Set<string> {
  switch (level.tag) {
    case "zero": return out;
    case "param": out.add(level.name); return out;
    case "succ": return levelParams(level.of, out);
    case "max":
    case "imax":
      levelParams(level.left, out);
      levelParams(level.right, out);
      return out;
  }
}

export function mapLevel(level: Level, f: (name: string) => Level | undefined): Level {
  switch (level.tag) {
    case "zero": return level;
    case "param": return f(level.name) ?? level;
    case "succ": return levelSucc(mapLevel(level.of, f));
    case "max": return levelMax(mapLevel(level.left, f), mapLevel(level.right, f));
    case "imax": return levelIMax(mapLevel(level.left, f), mapLevel(level.right, f));
  }
}

function hasParam(level: Level): boolean {
  switch (level.tag) {
    case "zero": return false;
    case "param": return true;
    case "succ": return hasParam(level.of);
    case "max":
    case "imax": return hasParam(level.left) || hasParam(level.right);
  }
}

/** Lean 4.33.1 `Level.isExplicit` on the no-mvar ProofScript level domain. */
function isExplicitLevel(level: Level): boolean {
  return toOffset(level).base.tag === "zero";
}

/** Lean 4.33.1 `mkLevelMax'`: raw max plus the kernel's cheap simplifications. */
function mkLevelMaxPrime(u: Level, v: Level): Level {
  const subsumes = (a: Level, b: Level): boolean => {
    if (isExplicitLevel(b) && toOffset(a).offset >= toOffset(b).offset) return true;
    if (a.tag === "max") return levelStructuralEq(b, a.left) || levelStructuralEq(b, a.right);
    return false;
  };
  if (levelStructuralEq(u, v)) return u;
  if (u.tag === "zero") return v;
  if (v.tag === "zero") return u;
  if (subsumes(u, v)) return u;
  if (subsumes(v, u)) return v;
  const ou = toOffset(u), ov = toOffset(v);
  if (levelStructuralEq(ou.base, ov.base)) return ou.offset >= ov.offset ? u : v;
  return levelMax(u, v);
}

/** Lean 4.33.1 `mkLevelIMax'`: raw imax plus the kernel's cheap simplifications. */
function mkLevelIMaxPrime(u: Level, v: Level): Level {
  if (isNeverZero(v)) return mkLevelMaxPrime(u, v);
  if (v.tag === "zero") return v;
  if (u.tag === "zero") return v;
  if (levelStructuralEq(u, v)) return u;
  return levelIMax(u, v);
}

/**
 * Lean 4.33.1 `Level.instantiateParams` on the no-mvar trusted Core domain.
 *
 * Trusted declaration checking requires exact universe arity. Lean's raw helper
 * truncates mismatched parameter/value lists, but a well-formed kernel constant
 * application never reaches this function with mismatched arity. We retain the
 * explicit ProofScript rejection and otherwise mirror Lean's `substParams`,
 * including `mkLevelMax'` / `mkLevelIMax'` cheap simplification when a level
 * containing parameters is rebuilt.
 */
export function instantiateLevel(level: Level, params: readonly string[], args: readonly Level[]): Level {
  if (params.length !== args.length) throw new Error(`universe arity mismatch: expected ${params.length}, got ${args.length}`);
  const subst = new Map<string, Level>();
  // Lean's paired lookup chooses the first occurrence. Trusted declarations also
  // reject duplicate universe parameters, but preserving first-wins makes this
  // primitive itself match the pinned helper on that dimension.
  for (let i = 0; i < params.length; i++) if (!subst.has(params[i])) subst.set(params[i], args[i]);

  const go = (u: Level): Level => {
    switch (u.tag) {
      case "zero": return u;
      case "param": return subst.get(u.name) ?? u;
      case "succ": return hasParam(u) ? levelSucc(go(u.of)) : u;
      case "max": return hasParam(u) ? mkLevelMaxPrime(go(u.left), go(u.right)) : u;
      case "imax": return hasParam(u) ? mkLevelIMaxPrime(go(u.left), go(u.right)) : u;
    }
  };
  return go(level);
}

/** Lean 4.33.1 `Level.isNeverZero`, specialized to the no-mvar Core. */
export function isNeverZero(level: Level): boolean {
  switch (level.tag) {
    case "zero":
    case "param": return false;
    case "succ": return true;
    case "max": return isNeverZero(level.left) || isNeverZero(level.right);
    case "imax": return isNeverZero(level.right);
  }
}

/** Lean 4.33.1 `Level.isAlwaysZero`, specialized to the no-mvar Core. */
export function normalizesToZero(level: Level): boolean {
  switch (level.tag) {
    case "zero": return true;
    case "param":
    case "succ": return false;
    case "max": return normalizesToZero(level.left) && normalizesToZero(level.right);
    case "imax": return normalizesToZero(level.right);
  }
}

export function isAlwaysZero(level: Level): boolean { return normalizesToZero(level); }

interface OffsetLevel { base: Level; offset: number }

/** Lean `getLevelOffset` + `getOffset`. */
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

/** Lean 4.33.1 `isAlreadyNormalizedCheap`, with mvars absent. */
function isAlreadyNormalizedCheap(level: Level): boolean {
  switch (level.tag) {
    case "zero":
    case "param": return true;
    case "succ": return isAlreadyNormalizedCheap(level.of);
    case "max":
    case "imax": return false;
  }
}

/** Constructor rank used by Lean 4.33.1 `Level.normLtAux` (mvar rank 2 is absent). */
function ctorToNat(level: Level): number {
  switch (level.tag) {
    case "zero": return 0;
    case "param": return 1;
    case "succ": return 3;
    case "max": return 4;
    case "imax": return 5;
  }
}

/**
 * Lean 4.33.1 `Name.lt` for the canonical universe-parameter spelling used by
 * ProofScript. Ordinary source universe parameters are strings; lexical string
 * order matches Lean for simple string-name components. A later assurance gate
 * separately covers the exact string->Lean.Name adapter for exotic names.
 */
function nameLt(a: string, b: string): boolean { return a < b; }

/** Lean 4.33.1 `Level.normLtAux`, no-mvar transcription. */
function normLtAux(l1: Level, k1: number, l2: Level, k2: number): boolean {
  if (l1.tag === "succ") return normLtAux(l1.of, k1 + 1, l2, k2);
  if (l2.tag === "succ") return normLtAux(l1, k1, l2.of, k2 + 1);

  if (l1.tag === "max" && l2.tag === "max") {
    if (levelStructuralEq(l1, l2)) return k1 < k2;
    if (!levelStructuralEq(l1.left, l2.left)) return normLtAux(l1.left, 0, l2.left, 0);
    return normLtAux(l1.right, 0, l2.right, 0);
  }
  if (l1.tag === "imax" && l2.tag === "imax") {
    if (levelStructuralEq(l1, l2)) return k1 < k2;
    if (!levelStructuralEq(l1.left, l2.left)) return normLtAux(l1.left, 0, l2.left, 0);
    return normLtAux(l1.right, 0, l2.right, 0);
  }
  if (l1.tag === "param" && l2.tag === "param") {
    if (l1.name === l2.name) return k1 < k2;
    return nameLt(l1.name, l2.name);
  }
  if (levelStructuralEq(l1, l2)) return k1 < k2;
  return ctorToNat(l1) < ctorToNat(l2);
}

function normLt(a: Level, b: Level): boolean { return normLtAux(a, 0, b, 0); }

/** Lean 4.33.1 `mkIMaxAux`, after recursive normalization. */
function mkIMaxAux(left: Level, right: Level): Level {
  if (right.tag === "zero") return LevelZero;
  if (left.tag === "zero") return right;
  if (left.tag === "succ" && left.of.tag === "zero") return right;
  if (levelStructuralEq(left, right)) return left;
  return levelIMax(left, right);
}

/** Lean 4.33.1 `getMaxArgsAux`. */
function getMaxArgsAux(level: Level, alreadyNormalized: boolean, out: Level[]): void {
  if (level.tag === "max") {
    getMaxArgsAux(level.left, alreadyNormalized, out);
    getMaxArgsAux(level.right, alreadyNormalized, out);
  } else if (!alreadyNormalized) {
    getMaxArgsAux(normalizeLevel(level), true, out);
  } else {
    out.push(level);
  }
}

function accMax(result: Level, prev: Level, offset: number): Level {
  const item = addSucc(prev, offset);
  return result.tag === "zero" ? item : levelMax(result, item);
}

function skipExplicit(levels: readonly Level[], start: number): number {
  let i = start;
  while (i < levels.length && toOffset(levels[i]).base.tag === "zero") i++;
  return i;
}

function isExplicitSubsumed(levels: readonly Level[], firstNonExplicit: number): boolean {
  if (firstNonExplicit === 0) return false;
  const maxExplicit = toOffset(levels[firstNonExplicit - 1]).offset;
  for (let i = firstNonExplicit; i < levels.length; i++) {
    if (toOffset(levels[i]).offset >= maxExplicit) return true;
  }
  return false;
}

/**
 * Exact Lean 4.33.1 `Level.normalize` algorithm on ProofScript's no-mvar level
 * domain. This intentionally preserves Lean's accumulator association/order,
 * because `Level.isEquiv` compares normalized syntax.
 */
export function normalizeLevel(level: Level): Level {
  if (isAlreadyNormalizedCheap(level)) return level;

  const outer = toOffset(level);
  const k = outer.offset;
  const root = outer.base;

  if (root.tag === "max") {
    const levels: Level[] = [];
    getMaxArgsAux(root.left, false, levels);
    getMaxArgsAux(root.right, false, levels);
    levels.sort((a, b) => levelStructuralEq(a, b) ? 0 : (normLt(a, b) ? -1 : 1));
    if (levels.length === 0) throw new Error("internal: max normalization produced no arguments");

    const firstNonExplicit = skipExplicit(levels, 0);
    const start = isExplicitSubsumed(levels, firstNonExplicit)
      ? firstNonExplicit
      : Math.max(0, firstNonExplicit - 1);

    let prev = toOffset(levels[start]).base;
    let prevK = toOffset(levels[start]).offset;
    let result: Level = LevelZero;

    for (let i = start + 1; i < levels.length; i++) {
      const current = toOffset(levels[i]);
      if (levelStructuralEq(current.base, prev)) {
        prev = current.base;
        prevK = current.offset;
      } else {
        result = accMax(result, prev, k + prevK);
        prev = current.base;
        prevK = current.offset;
      }
    }
    return accMax(result, prev, k + prevK);
  }

  if (root.tag === "imax") {
    // This branch is deliberately before recursive normalization of the two
    // operands, exactly as in Lean 4.33.1. The previous v68 code used only a
    // smartMax here and missed canonical max normalization.
    if (isNeverZero(root.right)) {
      return addSucc(normalizeLevel(levelMax(root.left, root.right)), k);
    }
    const left = normalizeLevel(root.left);
    const right = normalizeLevel(root.right);
    return addSucc(mkIMaxAux(left, right), k);
  }

  throw new Error("internal: non max/imax normalization root");
}

/** Lean 4.33.1 universe definitional equivalence on canonical Core levels. */
export function levelDefEq(a: Level, b: Level): boolean {
  return levelStructuralEq(a, b) || levelStructuralEq(normalizeLevel(a), normalizeLevel(b));
}

/** Lean 4.33.1 `Level.geq`, no-mvar transcription. */
function levelGeqCore(left: Level, right: Level): boolean {
  if (levelStructuralEq(left, right)) return true;

  const fallback = (): boolean => {
    if (right.tag === "imax") {
      return levelGeqCore(left, right.left) && levelGeqCore(left, right.right);
    }
    const l = toOffset(left);
    const r = toOffset(right);
    return (levelStructuralEq(l.base, r.base) || r.base.tag === "zero") && l.offset >= r.offset;
  };

  if (right.tag === "zero") return true;
  if (right.tag === "max") return levelGeqCore(left, right.left) && levelGeqCore(left, right.right);
  if (left.tag === "max") {
    return levelGeqCore(left.left, right) || levelGeqCore(left.right, right) || fallback();
  }
  // Lean's pattern order is significant when both sides are imax: the left
  // imax case wins before the right-imax fallback.
  if (left.tag === "imax") return levelGeqCore(left.right, right);
  if (left.tag === "succ" && right.tag === "succ") return levelGeqCore(left.of, right.of);
  return fallback();
}

/** True iff Lean's universe algebra proves `a >= b` for every parameter assignment. */
export function levelGeq(a: Level, b: Level): boolean {
  return levelGeqCore(normalizeLevel(a), normalizeLevel(b));
}

/** Backward-compatible spelling: true iff `a <= b`. */
export function levelLeq(a: Level, b: Level): boolean { return levelGeq(b, a); }

export function prettyLevel(level: Level): string {
  const n = normalizeLevel(level);
  const nat = levelToNat(n);
  if (nat !== undefined) return String(nat);
  switch (n.tag) {
    case "zero": return "0";
    case "param": return n.name;
    case "succ": return `${prettyLevel(n.of)} + 1`;
    case "max": return `max ${prettyLevel(n.left)} ${prettyLevel(n.right)}`;
    case "imax": return `imax ${prettyLevel(n.left)} ${prettyLevel(n.right)}`;
  }
}

export function levelToNat(level: Level): number | undefined {
  const p = toOffset(level);
  return p.base.tag === "zero" ? p.offset : undefined;
}
