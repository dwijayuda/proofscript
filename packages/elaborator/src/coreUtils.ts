import { Term } from "@proofscript/kernel";

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
