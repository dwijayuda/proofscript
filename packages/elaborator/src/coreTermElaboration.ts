import {
  Environment,
  Level,
  Term,
  infer,
  instantiate,
  defEq,
  kernelWhnf,
  levelParam,
} from "@proofscript/kernel";
import { ElaborationError, SurfaceTerm, UnsupportedFeature } from "@proofscript/syntax";
import { contextFromTypes } from "./coreUtils";
import { GlobalInfo, inferElaborationHeadType, resolveGlobalName } from "./globalEnvironment";
import { elabLevel } from "./primitiveSugarElaboration";
import { tryElabDottedStructureProjection, tryElabExpectedTypeConstructorShorthand } from "./structureSugarElaboration";
import {
  prettyTypeclassGoal,
  trySynthesizeExactGlobalInstance,
  trySynthesizeHiddenPrefixFirstOrder,
  validateInstanceBinderDomain,
} from "./typeclassSynthesis";

type ElabFn = (
  term: SurfaceTerm,
  locals: string[],
  localTypes: Term[],
  globals: Map<string, GlobalInfo>,
  available: Set<string>,
  kernelEnv: Environment,
  expectedType?: Term,
) => Term;

export function elabEqTerm(
  term: Extract<SurfaceTerm, { tag: "eq" }>,
  locals: string[],
  localTypes: Term[],
  globals: Map<string, GlobalInfo>,
  available: Set<string>,
  kernelEnv: Environment,
  elab: ElabFn,
): Term {
  if (!kernelEnv.get("Eq")) throw new UnsupportedFeature("K3c-section-vars0 propositional '=' requires the checked Eq foundation; use the standard prelude");
  const ctx = contextFromTypes(localTypes);
  const left = elab(term.left, locals, localTypes, globals, available, kernelEnv);
  const operandType = kernelWhnf(kernelEnv, infer(kernelEnv, ctx, left));
  const right = elab(term.right, locals, localTypes, globals, available, kernelEnv, operandType);
  const rightType = kernelWhnf(kernelEnv, infer(kernelEnv, ctx, right));
  if (!defEq(kernelEnv, ctx, rightType, operandType)) throw new ElaborationError("propositional equality operands do not have definitionally equal types");
  const typeSort = kernelWhnf(kernelEnv, infer(kernelEnv, ctx, operandType));
  if (typeSort.tag !== "sort") throw new ElaborationError("propositional equality operand type is not itself a type");
  let out: Term = { tag: "const", name: "Eq", levels: [typeSort.level] };
  for (const arg of [operandType, left, right]) out = { tag: "app", fn: out, arg };
  return out;
}

export function elabNameTerm(
  term: Extract<SurfaceTerm, { tag: "name" }>,
  locals: string[],
  localTypes: Term[],
  globals: Map<string, GlobalInfo>,
  available: Set<string>,
  kernelEnv: Environment,
  elab: ElabFn,
  expectedType?: Term,
): Term {
  for (let i = locals.length - 1; i >= 0; i--) {
    if (locals[i] === term.name) {
      if (term.levels?.length) throw new ElaborationError(`local '${term.name}' cannot take universe arguments`);
      return { tag: "bvar", index: locals.length - 1 - i };
    }
  }
  const resolvedName = resolveGlobalName(term.name, term.namespacePath, term.openNamespaces, globals);
  const info = resolvedName ? globals.get(resolvedName) : undefined;
  if (!info || !resolvedName) {
    const projected = tryElabDottedStructureProjection(term, locals, localTypes, globals, available, kernelEnv, elab);
    if (projected) return projected;
    const ctor = tryElabExpectedTypeConstructorShorthand(term, [], locals, localTypes, globals, available, kernelEnv, elab, expectedType);
    if (ctor) return ctor;
    if (term.name.startsWith("@@ih:")) {
      throw new UnsupportedFeature("K3c-section-vars0 recursive call is not on a recursive constructor field supported by the generated recursor");
    }
    throw new ElaborationError(`unknown identifier: ${term.name}`);
  }
  let levels: Level[];
  if (term.levels) levels = term.levels.map(l => elabLevel(l, available));
  else if (info.levelParams.length === 0) levels = [];
  else if (info.levelParams.every(p => available.has(p))) levels = info.levelParams.map(levelParam);
  else throw new ElaborationError(`universe inference for '${resolvedName}' is not implemented by K3c-section-vars0; use explicit ${resolvedName}.{...}`);
  if (levels.length !== info.levelParams.length) {
    throw new ElaborationError(`incorrect number of universe arguments for '${resolvedName}': expected ${info.levelParams.length}, got ${levels.length}`);
  }
  return { tag: "const", name: resolvedName, levels };
}

export function elabAppTerm(
  term: Extract<SurfaceTerm, { tag: "app" }>,
  locals: string[],
  localTypes: Term[],
  globals: Map<string, GlobalInfo>,
  available: Set<string>,
  kernelEnv: Environment,
  elab: ElabFn,
  expectedType?: Term,
): Term {
  const shorthand = term.fn.tag === "name"
    ? tryElabExpectedTypeConstructorShorthand(term.fn, term.args, locals, localTypes, globals, available, kernelEnv, elab, expectedType)
    : undefined;
  if (shorthand) return shorthand;
  let out = elab(term.fn, locals, localTypes, globals, available, kernelEnv);
  const ctx = contextFromTypes(localTypes);
  let fnType = inferElaborationHeadType(out, ctx, globals, kernelEnv);
  for (const arg of term.args) {
    if (!term.explicit) {
      while (true) {
        const headPi = kernelWhnf(kernelEnv, fnType);
        if (headPi.tag !== "pi" || (headPi.binderInfo ?? "explicit") === "explicit") break;
        if ((headPi.binderInfo ?? "explicit") === "instImplicit") {
          const instance = trySynthesizeExactGlobalInstance(headPi.domain, ctx, globals, kernelEnv);
          if (!instance) throw new ElaborationError(`failed to synthesize instance for ${prettyTypeclassGoal(headPi.domain)}`);
          out = { tag: "app", fn: out, arg: instance };
          fnType = instantiate(headPi.body, instance);
          continue;
        }
        const candidates = trySynthesizeHiddenPrefixFirstOrder(fnType, arg, locals, localTypes, globals, available, kernelEnv, elab);
        if (!candidates) {
          throw new UnsupportedFeature(`K3c-section-vars0 cannot solve omitted ${(headPi.binderInfo ?? "implicit")} argument(s) from the next explicit argument type; use explicit @f(...) application`);
        }
        for (const candidate of candidates) {
          const pi = kernelWhnf(kernelEnv, fnType);
          if (pi.tag !== "pi") throw new ElaborationError("internal: hidden synthesis exhausted function telescope");
          out = { tag: "app", fn: out, arg: candidate };
          fnType = instantiate(pi.body, candidate);
        }
      }
    }

    const pi = kernelWhnf(kernelEnv, fnType);
    if (pi.tag !== "pi") throw new ElaborationError(`application head is not a function; inferred ${JSON.stringify(pi)}`);
    const binderInfo = pi.binderInfo ?? "explicit";
    if (!term.explicit && binderInfo !== "explicit") {
      throw new UnsupportedFeature(`K3c-section-vars0 cannot consume hidden ${binderInfo} binder as a source positional argument`);
    }
    const argCore = elab(arg, locals, localTypes, globals, available, kernelEnv, pi.domain);
    const actual = kernelWhnf(kernelEnv, infer(kernelEnv, ctx, argCore));
    if (!defEq(kernelEnv, ctx, actual, pi.domain)) throw new ElaborationError("application argument does not have the expected Pi-domain type");
    out = { tag: "app", fn: out, arg: argCore };
    fnType = instantiate(pi.body, argCore);
  }
  return out;
}

export function elabLambdaTerm(
  term: Extract<SurfaceTerm, { tag: "lam" }>,
  locals: string[],
  localTypes: Term[],
  globals: Map<string, GlobalInfo>,
  available: Set<string>,
  kernelEnv: Environment,
  elab: ElabFn,
  expectedType?: Term,
): Term {
  const go = (i: number, names: string[], types: Term[], expected?: Term): Term => {
    if (i === term.binders.length) return elab(term.body, names, types, globals, available, kernelEnv, expected);
    const b = term.binders[i];
    const ctx = contextFromTypes(types);
    const expectedWhnf = expected ? kernelWhnf(kernelEnv, expected) : undefined;
    if (expectedWhnf && expectedWhnf.tag !== "pi") {
      throw new ElaborationError("lambda expression is used where the expected type is not a function");
    }

    const sourceBinderInfo = b.binderInfo ?? "explicit";
    if (expectedWhnf && (expectedWhnf.binderInfo ?? "explicit") !== sourceBinderInfo) {
      throw new ElaborationError("lambda binder kind does not match the expected Pi binder kind");
    }

    let domain: Term;
    if (b.type) {
      domain = elab(b.type, names, types, globals, available, kernelEnv);
      if (expectedWhnf && !defEq(kernelEnv, ctx, kernelWhnf(kernelEnv, domain), kernelWhnf(kernelEnv, expectedWhnf.domain))) {
        throw new ElaborationError(`lambda binder '${b.name}' type does not match the expected Pi domain`);
      }
    } else {
      if (!expectedWhnf || expectedWhnf.tag !== "pi") {
        throw new UnsupportedFeature(`untyped lambda binder '${b.name}' requires an expected function type`);
      }
      if (sourceBinderInfo !== "explicit") {
        throw new UnsupportedFeature("untyped lambda binders are currently supported only for explicit binders");
      }
      domain = expectedWhnf.domain;
    }

    validateInstanceBinderDomain(b, domain, globals, kernelEnv, ctx);
    return {
      tag: "lam",
      domain,
      body: go(i + 1, [...names, b.name], [...types, domain], expectedWhnf?.body),
      binderInfo: b.binderInfo,
    };
  };
  return go(0, locals, localTypes, expectedType);
}

export function elabPiTerm(
  term: Extract<SurfaceTerm, { tag: "pi" }>,
  locals: string[],
  localTypes: Term[],
  globals: Map<string, GlobalInfo>,
  available: Set<string>,
  kernelEnv: Environment,
  elab: ElabFn,
): Term {
  const domain = elab(term.binder.type, locals, localTypes, globals, available, kernelEnv);
  validateInstanceBinderDomain(term.binder, domain, globals, kernelEnv, contextFromTypes(localTypes));
  return { tag: "pi", domain, body: elab(term.body, [...locals, term.binder.name], [...localTypes, domain], globals, available, kernelEnv), binderInfo: term.binder.binderInfo };
}

export function elabLetTerm(
  term: Extract<SurfaceTerm, { tag: "let" }>,
  locals: string[],
  localTypes: Term[],
  globals: Map<string, GlobalInfo>,
  available: Set<string>,
  kernelEnv: Environment,
  elab: ElabFn,
): Term {
  const value = elab(term.value, locals, localTypes, globals, available, kernelEnv);
  let type: Term;
  if (term.type) type = elab(term.type, locals, localTypes, globals, available, kernelEnv);
  else {
    try {
      type = infer(kernelEnv, contextFromTypes(localTypes), value);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      throw new ElaborationError(`cannot infer type of local let '${term.name}': ${message}`);
    }
  }
  const body = elab(term.body, [...locals, term.name], [...localTypes, type], globals, available, kernelEnv);
  return { tag: "let", type, value, body, nondep: term.nondep };
}
