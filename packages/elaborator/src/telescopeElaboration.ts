import { Environment, Level, Term } from "@proofscript/kernel";
import { SurfaceBinder, SurfaceTerm } from "@proofscript/syntax";
import { contextFromTypes } from "./coreUtils";
import { GlobalInfo } from "./globalEnvironment";
import { validateInstanceBinderDomain } from "./typeclassSynthesis";

export type ElaborateTermFn = (
  term: SurfaceTerm,
  locals: string[],
  localTypes: Term[],
  globals: Map<string, GlobalInfo>,
  available: Set<string>,
  kernelEnv: Environment,
  expectedType?: Term,
) => Term;

export function countCorePis(term: Term): number {
  let n = 0, cur = term;
  while (cur.tag === "pi") { n++; cur = cur.body; }
  return n;
}

export function elabConstructorType(
  params: SurfaceBinder[],
  binders: SurfaceBinder[],
  result: SurfaceTerm | undefined,
  selfName: string,
  selfLevels: Level[],
  globals: Map<string, GlobalInfo>,
  available: Set<string>,
  kernelEnv: Environment,
  elaborateTerm: ElaborateTermFn,
): Term {
  const all = [...params, ...binders];
  const go = (i: number, names: string[], types: Term[]): Term => {
    if (i === all.length) {
      if (result) return elaborateTerm(result, names, types, globals, available, kernelEnv);
      let out: Term = { tag: "const", name: selfName, levels: selfLevels };
      for (const p of params) out = { tag: "app", fn: out, arg: elaborateTerm({ tag: "name", name: p.name }, names, types, globals, available, kernelEnv) };
      return out;
    }
    const b = all[i];
    const domain = elaborateTerm(b.type, names, types, globals, available, kernelEnv);
    validateInstanceBinderDomain(b, domain, globals, kernelEnv, contextFromTypes(types));
    return { tag: "pi", domain, body: go(i + 1, [...names, b.name], [...types, domain]), binderInfo: b.binderInfo };
  };
  return go(0, [], []);
}

export function elabTelescopeType(
  binders: SurfaceBinder[],
  result: SurfaceTerm,
  locals: string[],
  localTypes: Term[],
  globals: Map<string, GlobalInfo>,
  available: Set<string>,
  kernelEnv: Environment,
  elaborateTerm: ElaborateTermFn,
): Term {
  const go = (i: number, names: string[], types: Term[]): Term => {
    if (i === binders.length) return elaborateTerm(result, names, types, globals, available, kernelEnv);
    const b = binders[i];
    const domain = elaborateTerm(b.type, names, types, globals, available, kernelEnv);
    return { tag: "pi", domain, body: go(i + 1, [...names, b.name], [...types, domain]), binderInfo: b.binderInfo };
  };
  return go(0, locals, localTypes);
}

export interface ElaboratedTelescopeGoal {
  readonly locals: string[];
  readonly localTypes: Term[];
  readonly goal: Term;
}

/**
 * Elaborate only a declaration's binder telescope and result type.
 *
 * This is the same binder walk used by value elaboration, including instance
 * binder validation, but deliberately creates no proof/value term. Editor
 * tooling can therefore inspect a real initial proof context without
 * synthesizing a placeholder proof.
 */
export function elabTelescopeGoal(
  binders: SurfaceBinder[],
  result: SurfaceTerm,
  locals: string[],
  localTypes: Term[],
  globals: Map<string, GlobalInfo>,
  available: Set<string>,
  kernelEnv: Environment,
  elaborateTerm: ElaborateTermFn,
): ElaboratedTelescopeGoal {
  const go = (i: number, names: string[], types: Term[]): ElaboratedTelescopeGoal => {
    if (i === binders.length) {
      return {
        locals: [...names],
        localTypes: [...types],
        goal: elaborateTerm(result, names, types, globals, available, kernelEnv),
      };
    }
    const b = binders[i];
    const domain = elaborateTerm(b.type, names, types, globals, available, kernelEnv);
    validateInstanceBinderDomain(b, domain, globals, kernelEnv, contextFromTypes(types));
    return go(i + 1, [...names, b.name], [...types, domain]);
  };
  return go(0, locals, localTypes);
}

export function elabTelescopeValue(
  binders: SurfaceBinder[],
  value: SurfaceTerm,
  expectedResult: SurfaceTerm,
  locals: string[],
  localTypes: Term[],
  globals: Map<string, GlobalInfo>,
  available: Set<string>,
  kernelEnv: Environment,
  elaborateTerm: ElaborateTermFn,
): Term {
  const go = (i: number, names: string[], types: Term[]): Term => {
    if (i === binders.length) {
      const expected = elaborateTerm(expectedResult, names, types, globals, available, kernelEnv);
      return elaborateTerm(value, names, types, globals, available, kernelEnv, expected);
    }
    const b = binders[i];
    const domain = elaborateTerm(b.type, names, types, globals, available, kernelEnv);
    validateInstanceBinderDomain(b, domain, globals, kernelEnv, contextFromTypes(types));
    return { tag: "lam", domain, body: go(i + 1, [...names, b.name], [...types, domain]), binderInfo: b.binderInfo };
  };
  return go(0, locals, localTypes);
}
