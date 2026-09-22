import { Environment, Term, defEq, infer, kernelWhnf, shift } from "@proofscript/kernel";
import { ElaborationError, SurfaceTerm, UnsupportedFeature } from "@proofscript/syntax";
import { contextFromTypes, flattenCoreApps } from "./coreUtils";
import { GlobalInfo } from "./globalEnvironment";

export type ElaborateTerm = (
  term: SurfaceTerm,
  locals: string[],
  localTypes: Term[],
  globals: Map<string, GlobalInfo>,
  available: Set<string>,
  kernelEnv: Environment,
  expectedType?: Term,
) => Term;

function coreTypeIsAppliedName(kernelEnv: Environment, type: Term | undefined, name: string): { head: Term; args: Term[] } | undefined {
  if (!type) return undefined;
  const normalized = kernelWhnf(kernelEnv, type);
  const app = flattenCoreApps(normalized);
  if (app.head.tag !== "const" || app.head.name !== name) return undefined;
  return { head: app.head, args: app.args };
}

function appCore(fn: Term, args: readonly Term[]): Term {
  let out = fn;
  for (const arg of args) out = { tag: "app", fn: out, arg };
  return out;
}

export function elabArrayLiteral(
  term: Extract<SurfaceTerm, { tag: "arrayLit" }>,
  locals: string[],
  localTypes: Term[],
  globals: Map<string, GlobalInfo>,
  available: Set<string>,
  kernelEnv: Environment,
  elaborateTerm: ElaborateTerm,
  expectedType?: Term,
): Term {
  if (!kernelEnv.get("Array") || !kernelEnv.get("Array.mk") || !kernelEnv.get("List") || !kernelEnv.get("List.nil") || !kernelEnv.get("List.cons")) {
    throw new UnsupportedFeature("PSC-1 P5.12 array literals require the checked Array/List bootstrap");
  }
  const expectedArray = coreTypeIsAppliedName(kernelEnv, expectedType, "Array");
  if (!expectedArray || expectedArray.args.length !== 1) {
    throw new UnsupportedFeature("PSC-1 P5.12 array literals require expected type Array(A)");
  }
  if (expectedArray.head.tag !== "const" || expectedArray.head.levels.length !== 0) {
    throw new UnsupportedFeature("PSC-1 P5.12 array literals currently support monomorphic checked Array(A) bootstrap only");
  }
  const elementType = expectedArray.args[0];
  const ctx = contextFromTypes(localTypes);
  const elementTypeSort = kernelWhnf(kernelEnv, infer(kernelEnv, ctx, elementType));
  if (elementTypeSort.tag !== "sort") throw new ElaborationError("array literal element type is not itself a type");
  const elements = term.items.map((item, index) => {
    const core = elaborateTerm(item, locals, localTypes, globals, available, kernelEnv, elementType);
    const actual = kernelWhnf(kernelEnv, infer(kernelEnv, ctx, core));
    if (!defEq(kernelEnv, ctx, actual, elementType)) throw new ElaborationError(`array literal item ${index + 1} does not have the expected element type`);
    return core;
  });
  let list: Term = appCore({ tag: "const", name: "List.nil", levels: [] }, [elementType]);
  for (let i = elements.length - 1; i >= 0; i--) {
    list = appCore({ tag: "const", name: "List.cons", levels: [] }, [elementType, elements[i], list]);
  }
  const out = appCore({ tag: "const", name: "Array.mk", levels: [] }, [elementType, list]);
  const actual = kernelWhnf(kernelEnv, infer(kernelEnv, ctx, out));
  if (!defEq(kernelEnv, ctx, actual, expectedType!)) throw new ElaborationError("array literal internal lowering produced the wrong type");
  return out;
}

function monadExpectedShape(
  kernelEnv: Environment,
  expectedType: Term | undefined,
): { kind: "Option"; targetType: Term } | { kind: "Except"; errorType: Term; targetType: Term } | undefined {
  const option = coreTypeIsAppliedName(kernelEnv, expectedType, "Option");
  if (option) {
    if (option.args.length !== 1) return undefined;
    return { kind: "Option", targetType: option.args[0] };
  }
  const except = coreTypeIsAppliedName(kernelEnv, expectedType, "Except");
  if (except) {
    if (except.args.length !== 2) return undefined;
    return { kind: "Except", errorType: except.args[0], targetType: except.args[1] };
  }
  return undefined;
}

export function elabDo(
  term: Extract<SurfaceTerm, { tag: "do" }>,
  locals: string[],
  localTypes: Term[],
  globals: Map<string, GlobalInfo>,
  available: Set<string>,
  kernelEnv: Environment,
  elaborateTerm: ElaborateTerm,
  expectedType?: Term,
): Term {
  if (!expectedType) {
    throw new UnsupportedFeature("PSC-1 P5.17 do-notation requires an expected Option(A) or Except(E, A) result type");
  }
  if (term.binds.length === 0) return elaborateTerm(term.body, locals, localTypes, globals, available, kernelEnv, expectedType);
  if (!kernelEnv.get("Option.bind") || !kernelEnv.get("Except.bind")) {
    throw new UnsupportedFeature("PSC-1 P5.17 do-notation requires the checked Option.bind/Except.bind bootstrap");
  }

  const ctx = contextFromTypes(localTypes);
  const expected = monadExpectedShape(kernelEnv, expectedType);
  if (!expected) {
    throw new UnsupportedFeature("PSC-1 P5.17 do-notation currently supports only expected Option(A) or Except(E, A) results");
  }

  const [headBind, ...restBinds] = term.binds;
  const value = elaborateTerm(headBind.value, locals, localTypes, globals, available, kernelEnv);
  const valueType = kernelWhnf(kernelEnv, infer(kernelEnv, ctx, value));
  const valueOption = coreTypeIsAppliedName(kernelEnv, valueType, "Option");
  const valueExcept = coreTypeIsAppliedName(kernelEnv, valueType, "Except");
  const bodySurface: SurfaceTerm = restBinds.length === 0
    ? term.body
    : { tag: "do", binds: restBinds, body: term.body };

  if (expected.kind === "Option") {
    if (!valueOption || valueOption.args.length !== 1) {
      throw new ElaborationError("Option do-bind expects a checked Option(A) value");
    }
    const sourceType = valueOption.args[0];
    const body = elaborateTerm(bodySurface, [...locals, headBind.name], [...localTypes, sourceType], globals, available, kernelEnv, expectedType);
    const fn: Term = { tag: "lam", domain: sourceType, body };
    const out = appCore({ tag: "const", name: "Option.bind", levels: [] }, [sourceType, expected.targetType, value, fn]);
    const actual = kernelWhnf(kernelEnv, infer(kernelEnv, ctx, out));
    if (!defEq(kernelEnv, ctx, actual, expectedType)) throw new ElaborationError("Option do-notation internal lowering produced the wrong type");
    return out;
  }

  if (!valueExcept || valueExcept.args.length !== 2) {
    throw new ElaborationError("Except do-bind expects a checked Except(E, A) value");
  }
  const errorType = valueExcept.args[0];
  const sourceType = valueExcept.args[1];
  if (!defEq(kernelEnv, ctx, errorType, expected.errorType)) {
    throw new ElaborationError("Except do-bind error type does not match the expected Except(E, A) result");
  }
  const body = elaborateTerm(bodySurface, [...locals, headBind.name], [...localTypes, sourceType], globals, available, kernelEnv, expectedType);
  const fn: Term = { tag: "lam", domain: sourceType, body };
  const out = appCore({ tag: "const", name: "Except.bind", levels: [] }, [expected.errorType, sourceType, expected.targetType, value, fn]);
  const actual = kernelWhnf(kernelEnv, infer(kernelEnv, ctx, out));
  if (!defEq(kernelEnv, ctx, actual, expectedType)) throw new ElaborationError("Except do-notation internal lowering produced the wrong type");
  return out;
}
