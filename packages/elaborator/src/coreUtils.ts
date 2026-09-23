import { Term, sameTerm, shift } from "@proofscript/kernel";

/**
 * Kernel local contexts are stored oldest-to-newest.  De Bruijn index 0 points
 * at the newest local, but the kernel APIs still receive the context in this
 * stable oldest-to-newest order.
 */
export function contextFromTypes(localTypes: readonly Term[]): Term[] {
  return [...localTypes];
}

export function flattenCoreApps(term: Term): { head: Term; args: Term[] } {
  const args: Term[] = [];
  let head = term;
  while (head.tag === "app") {
    args.unshift(head.arg);
    head = head.fn;
  }
  return { head, args };
}

export function splitCorePi(term: Term): { domains: Term[]; codomain: Term } {
  const domains: Term[] = [];
  let cur = term;
  while (cur.tag === "pi") {
    domains.push(cur.domain);
    cur = cur.body;
  }
  return { domains, codomain: cur };
}

export function splitCorePiDomains(term: Term): Term[] {
  return splitCorePi(term).domains;
}

export function containsAnyBVar(term: Term): boolean {
  switch (term.tag) {
    case "bvar": return true;
    case "sort": case "const": case "lit": return false;
    case "app": return containsAnyBVar(term.fn) || containsAnyBVar(term.arg);
    case "lam": case "pi": return containsAnyBVar(term.domain) || containsAnyBVar(term.body);
    case "let": return containsAnyBVar(term.type) || containsAnyBVar(term.value) || containsAnyBVar(term.body);
    case "proj": return containsAnyBVar(term.expr);
  }
}


export interface CoreReplaceResult {
  term: Term;
  changed: boolean;
}

/**
 * Replace occurrences of a term originating in the current outer context while
 * respecting de Bruijn shifts under binders.
 */
export function replaceCoreScoped(
  term: Term,
  needle: Term,
  replacement: Term,
  depth = 0,
): CoreReplaceResult {
  if (sameTerm(term, shift(needle, depth))) {
    return { term: shift(replacement, depth), changed: true };
  }
  switch (term.tag) {
    case "sort":
    case "bvar":
    case "const":
    case "lit":
      return { term, changed: false };
    case "app": {
      const fn = replaceCoreScoped(term.fn, needle, replacement, depth);
      const arg = replaceCoreScoped(term.arg, needle, replacement, depth);
      return {
        term: fn.changed || arg.changed ? { tag: "app", fn: fn.term, arg: arg.term } : term,
        changed: fn.changed || arg.changed,
      };
    }
    case "lam": {
      const domain = replaceCoreScoped(term.domain, needle, replacement, depth);
      const body = replaceCoreScoped(term.body, needle, replacement, depth + 1);
      return {
        term: domain.changed || body.changed
          ? { tag: "lam", domain: domain.term, body: body.term, binderInfo: term.binderInfo }
          : term,
        changed: domain.changed || body.changed,
      };
    }
    case "pi": {
      const domain = replaceCoreScoped(term.domain, needle, replacement, depth);
      const body = replaceCoreScoped(term.body, needle, replacement, depth + 1);
      return {
        term: domain.changed || body.changed
          ? { tag: "pi", domain: domain.term, body: body.term, binderInfo: term.binderInfo }
          : term,
        changed: domain.changed || body.changed,
      };
    }
    case "let": {
      const type = replaceCoreScoped(term.type, needle, replacement, depth);
      const value = replaceCoreScoped(term.value, needle, replacement, depth);
      const body = replaceCoreScoped(term.body, needle, replacement, depth + 1);
      return {
        term: type.changed || value.changed || body.changed
          ? { tag: "let", type: type.term, value: value.term, body: body.term, nondep: term.nondep }
          : term,
        changed: type.changed || value.changed || body.changed,
      };
    }
    case "proj": {
      const expr = replaceCoreScoped(term.expr, needle, replacement, depth);
      return {
        term: expr.changed
          ? { tag: "proj", typeName: term.typeName, index: term.index, expr: expr.term }
          : term,
        changed: expr.changed,
      };
    }
  }
}

export function coreContainsScoped(term: Term, needle: Term): boolean {
  return replaceCoreScoped(term, needle, needle).changed;
}
