import { Term, binderInfoOf } from "./Expr";
import { Level } from "./Level";
import { LocalContext } from "./LocalContext";

export interface EquivScope {
  environment: object;
  environmentRevision?: string;
  context: LocalContext;
  transparency: string;
  proofIrrelevance: boolean;
}

class KeyBudgetExceeded extends Error {}
interface KeyBudget { remaining: number; }
function spend(budget: KeyBudget): void {
  if (--budget.remaining < 0) throw new KeyBudgetExceeded();
}

function levelData(level: Level, budget: KeyBudget): unknown {
  spend(budget);
  switch (level.tag) {
    case "zero": return ["zero"];
    case "param": case "mvar": return [level.tag, level.name];
    case "succ": return ["succ", levelData(level.of, budget)];
    case "max": case "imax": return [level.tag, levelData(level.left, budget), levelData(level.right, budget)];
  }
}

/** Structural tuples, never presentation strings. No term-identity memoization:
 * the compatibility API exposes mutable plain objects. */
function termData(term: Term, budget: KeyBudget): unknown {
  spend(budget);
  switch (term.tag) {
    case "sort": return ["sort", levelData(term.level, budget)];
    case "bvar": return ["bvar", term.index];
    case "const": return ["const", term.name, term.levels.map(level => levelData(level, budget))];
    case "app": return ["app", termData(term.fn, budget), termData(term.arg, budget)];
    case "pi": case "lam": return [term.tag, binderInfoOf(term), termData(term.domain, budget), termData(term.body, budget)];
    case "let": return ["let", term.nondep, termData(term.type, budget), termData(term.value, budget), termData(term.body, budget)];
    case "lit": return ["lit", term.literal.tag, term.literal.value];
    case "proj": return ["proj", term.typeName, term.index, termData(term.expr, budget)];
  }
}

export class EquivManager {
  private cache = new Map<string, boolean>();
  private environments = new WeakMap<object, number>();
  private nextEnvironment = 0;
  private queryDepth = 0;

  constructor(readonly maxEntries = 4096, readonly maxKeyLength = 65536, readonly maxKeyNodes = 10000) {
    if (!Number.isSafeInteger(maxEntries) || maxEntries < 1 || !Number.isSafeInteger(maxKeyLength) || maxKeyLength < 1 || !Number.isSafeInteger(maxKeyNodes) || maxKeyNodes < 1) {
      throw new RangeError("equality cache bounds must be positive safe integers");
    }
  }

  /** A synchronous outer equality query owns the cache. Environment changes
   * between queries cannot reuse prior results; recursive calls share it. */
  withQuery<T>(action: () => T): T {
    if (this.queryDepth === 0) this.clear();
    this.queryDepth++;
    try { return action(); }
    finally { if (--this.queryDepth === 0) this.clear(); }
  }

  clear(): void {
    this.cache.clear();
    this.environments = new WeakMap();
    this.nextEnvironment = 0;
  }

  private key(left: Term, right: Term, scope?: EquivScope): string | undefined {
    let environment = -1;
    if (scope) {
      let id = this.environments.get(scope.environment);
      if (id === undefined) { id = this.nextEnvironment++; this.environments.set(scope.environment, id); }
      environment = id;
    }
    try {
      const budget: KeyBudget = { remaining: this.maxKeyNodes };
      const a = JSON.stringify(termData(left, budget)), b = JSON.stringify(termData(right, budget));
      const context = scope?.context.map(d => [termData(d.type, budget), d.value === undefined ? null : termData(d.value, budget)]);
      const key = JSON.stringify([environment, scope?.environmentRevision, context, scope?.transparency, scope?.proofIrrelevance, a < b ? [a, b] : [b, a]]);
      return key.length <= this.maxKeyLength ? key : undefined;
    } catch (e) {
      if (e instanceof KeyBudgetExceeded || e instanceof RangeError) return undefined;
      throw e;
    }
  }
  get(left: Term, right: Term, scope?: EquivScope): boolean | undefined {
    const key = this.key(left, right, scope);
    return key === undefined ? undefined : this.cache.get(key);
  }
  set(left: Term, right: Term, value: boolean, scope?: EquivScope): void {
    const key = this.key(left, right, scope);
    if (key === undefined) return;
    if (!this.cache.has(key) && this.cache.size >= this.maxEntries) this.cache.delete(this.cache.keys().next().value!);
    this.cache.set(key, value);
  }
}

export const portStatus_PSKernel_EquivManager = {
  source: "PSKernel/EquivManager.lean",
  target: "packages/kernel/src/PSKernel/EquivManager.ts",
  status: "partial",
  trustedBoundary: true,
  proofStatus: "not-proven",
} as const;
