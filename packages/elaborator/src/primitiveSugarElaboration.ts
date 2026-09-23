import {
  Environment,
  Level,
  Term,
  defEq,
  infer,
  kernelWhnf,
  levelIMax,
  levelMax,
  levelParam,
  levelSucc,
  shift,
} from "@proofscript/kernel";
import { ElaborationError, SurfaceLevel, SurfaceTerm, UnsupportedFeature } from "@proofscript/syntax";
import { contextFromTypes } from "./coreUtils";
import type { GlobalInfo } from "./globalEnvironment";

export type TermElaborator = (
  term: SurfaceTerm,
  locals: string[],
  localTypes: Term[],
  expectedType?: Term,
) => Term;

export function elabBif(
  term: Extract<SurfaceTerm, { tag: "bif" }>,
  locals: string[],
  localTypes: Term[],
  kernelEnv: Environment,
  expectedType: Term | undefined,
  elaborateTerm: TermElaborator,
): Term {
  if (!expectedType) {
    throw new UnsupportedFeature("PSC-1 standalone bif requires an expected result type; general branch type synthesis is deferred");
  }
  if (!kernelEnv.get("Bool") || !kernelEnv.get("Bool.rec") || !kernelEnv.get("Bool.false") || !kernelEnv.get("Bool.true")) {
    throw new UnsupportedFeature("PSC-1 standalone bif requires the checked Bool/Bool.rec bootstrap prelude");
  }
  const ctx = contextFromTypes(localTypes);
  const boolType: Term = { tag: "const", name: "Bool", levels: [] };
  const cond = elaborateTerm(term.condition, locals, localTypes, boolType);
  const condType = kernelWhnf(kernelEnv, infer(kernelEnv, ctx, cond));
  if (!defEq(kernelEnv, ctx, condType, boolType)) {
    throw new ElaborationError("bif condition does not have type Bool");
  }
  const resultType = kernelWhnf(kernelEnv, expectedType);
  const resultSort = kernelWhnf(kernelEnv, infer(kernelEnv, ctx, resultType));
  if (resultSort.tag !== "sort") {
    throw new ElaborationError("bif expected result type is not itself a type");
  }
  const thenCore = elaborateTerm(term.thenBranch, locals, localTypes, resultType);
  const elseCore = elaborateTerm(term.elseBranch, locals, localTypes, resultType);
  const thenType = kernelWhnf(kernelEnv, infer(kernelEnv, ctx, thenCore));
  const elseType = kernelWhnf(kernelEnv, infer(kernelEnv, ctx, elseCore));
  if (!defEq(kernelEnv, ctx, thenType, resultType)) throw new ElaborationError("bif then branch does not have the expected result type");
  if (!defEq(kernelEnv, ctx, elseType, resultType)) throw new ElaborationError("bif else branch does not have the expected result type");

  const motive: Term = { tag: "lam", domain: boolType, body: shift(resultType, 1, 0) };
  let out: Term = { tag: "const", name: "Bool.rec", levels: [resultSort.level] };
  for (const arg of [motive, elseCore, thenCore, cond]) out = { tag: "app", fn: out, arg };
  const actual = kernelWhnf(kernelEnv, infer(kernelEnv, ctx, out));
  if (!defEq(kernelEnv, ctx, actual, resultType)) {
    throw new ElaborationError("bif internal check failed after constructing Bool.rec application");
  }
  return out;
}

export function requireLiteralExpectedType(
  label: "Nat" | "Bool" | "String" | "Int",
  intrinsicType: Term,
  expectedType: Term | undefined,
  localTypes: Term[],
  kernelEnv: Environment,
): void {
  if (!kernelEnv.get(label)) throw new UnsupportedFeature(`K3c-section-vars0 requires the checked ${label} bootstrap`);
  if (!expectedType) return; // K2i has exactly one supported semantic target for each literal class.
  const ctx = contextFromTypes(localTypes);
  if (!defEq(kernelEnv, ctx, kernelWhnf(kernelEnv, expectedType), intrinsicType)) {
    throw new UnsupportedFeature(`K3c-section-vars0 supports this literal only at expected type ${label}; general Lean literal/typeclass elaboration is deferred`);
  }
}

export function elabPrimitiveLiteral(
  term: Extract<SurfaceTerm, { tag: "boolLit" | "stringLit" | "intLit" | "natLit" }>,
  localTypes: Term[],
  kernelEnv: Environment,
  expectedType?: Term,
): Term {
  switch (term.tag) {
    case "boolLit": {
      const boolType: Term = { tag: "const", name: "Bool", levels: [] };
      requireLiteralExpectedType("Bool", boolType, expectedType, localTypes, kernelEnv);
      const ctor = term.value ? "Bool.true" : "Bool.false";
      if (!kernelEnv.get(ctor)) throw new UnsupportedFeature(`K3c-section-vars0 requires the checked Bool bootstrap to elaborate '${term.value}'`);
      return { tag: "const", name: ctor, levels: [] };
    }
    case "stringLit": {
      const stringType: Term = { tag: "const", name: "String", levels: [] };
      requireLiteralExpectedType("String", stringType, expectedType, localTypes, kernelEnv);
      if (!kernelEnv.get("String")) throw new UnsupportedFeature("K3c-section-vars0 requires the checked String bootstrap to elaborate string literals");
      return { tag: "lit", literal: { tag: "str", value: term.value } };
    }
    case "intLit": {
      if (!Number.isSafeInteger(term.value)) throw new ElaborationError("Int literal must be a safe integer in PSC-1");
      const intType: Term = { tag: "const", name: "Int", levels: [] };
      requireLiteralExpectedType("Int", intType, expectedType, localTypes, kernelEnv);
      if (!kernelEnv.get("Int")) throw new UnsupportedFeature("K3c-section-vars0 requires the checked Int bootstrap to elaborate integer literals");
      return { tag: "lit", literal: { tag: "int", value: term.value } };
    }
    case "natLit": {
      if (!Number.isSafeInteger(term.value) || term.value < 0) throw new ElaborationError("Nat literal must be a nonnegative safe integer");
      const intType: Term = { tag: "const", name: "Int", levels: [] };
      if (expectedType && defEq(kernelEnv, contextFromTypes(localTypes), kernelWhnf(kernelEnv, expectedType), intType)) {
        if (!kernelEnv.get("Int")) throw new UnsupportedFeature("K3c-section-vars0 requires the checked Int bootstrap to elaborate integer literals");
        return { tag: "lit", literal: { tag: "int", value: term.value } };
      }
      if (term.value > 4096) throw new UnsupportedFeature("K3c-section-vars0 currently expands Nat numerals through Nat.succ and limits source numerals to 4096; efficient OfNat/literal elaboration is deferred");
      const natType: Term = { tag: "const", name: "Nat", levels: [] };
      requireLiteralExpectedType("Nat", natType, expectedType, localTypes, kernelEnv);
      if (!kernelEnv.get("Nat.zero") || !kernelEnv.get("Nat.succ")) throw new UnsupportedFeature("K3c-section-vars0 requires the checked Nat bootstrap to elaborate numeric literals");
      let out: Term = { tag: "const", name: "Nat.zero", levels: [] };
      const succ: Term = { tag: "const", name: "Nat.succ", levels: [] };
      for (let i = 0; i < term.value; i++) out = { tag: "app", fn: succ, arg: out };
      return out;
    }
  }
}

function coreTypeIsName(kernelEnv: Environment, type: Term | undefined, name: "Nat" | "Int" | "Bool"): boolean {
  if (!type) return false;
  const normalized = kernelWhnf(kernelEnv, type);
  return normalized.tag === "const" && normalized.name === name && normalized.levels.length === 0;
}

function surfaceMentionsInt(term: SurfaceTerm): boolean {
  switch (term.tag) {
    case "intLit":
      return true;
    case "name":
      return term.name === "Int" || term.name.startsWith("Int.");
    case "app":
      return surfaceMentionsInt(term.fn) || term.args.some(surfaceMentionsInt);
    case "binaryOp":
      return surfaceMentionsInt(term.left) || surfaceMentionsInt(term.right);
    case "eq":
      return surfaceMentionsInt(term.left) || surfaceMentionsInt(term.right);
    case "bif":
      return surfaceMentionsInt(term.condition) || surfaceMentionsInt(term.thenBranch) || surfaceMentionsInt(term.elseBranch);
    case "lam":
      return term.binders.some(b => b.type ? surfaceMentionsInt(b.type) : false) || surfaceMentionsInt(term.body);
    case "pi":
      return surfaceMentionsInt(term.binder.type) || surfaceMentionsInt(term.body);
    case "let":
      return (term.type ? surfaceMentionsInt(term.type) : false) || surfaceMentionsInt(term.value) || surfaceMentionsInt(term.body);
    case "match":
      return surfaceMentionsInt(term.scrutinee) || term.cases.some(c => surfaceMentionsInt(c.body));
    case "structInst":
      return term.fields.some(f => surfaceMentionsInt(f.value));
    case "arrayLit":
    case "tuple":
      return term.items.some(surfaceMentionsInt);
    case "do":
      return term.binds.some(b => surfaceMentionsInt(b.value)) || surfaceMentionsInt(term.body);
    case "structUpdate":
      return surfaceMentionsInt(term.base) || term.fields.some(f => surfaceMentionsInt(f.value));
    case "sort":
    case "natLit":
    case "stringLit":
    case "boolLit":
    case "rflProof":
    case "exactProof":
    case "assumptionProof":
    case "applyProof":
    case "introProof":
      return false;
    case "showProof":
      return surfaceMentionsInt(term.type) || surfaceMentionsInt(term.body);
    case "haveProof":
      return (term.type ? surfaceMentionsInt(term.type) : false)
        || surfaceMentionsInt(term.value)
        || surfaceMentionsInt(term.body);
  }
}

function tryInferSurfaceTypeName(
  term: SurfaceTerm,
  locals: string[],
  localTypes: Term[],
  kernelEnv: Environment,
  elaborateTerm: TermElaborator,
): "Nat" | "Int" | "Bool" | undefined {
  try {
    const ctx = contextFromTypes(localTypes);
    const core = elaborateTerm(term, locals, localTypes);
    const type = kernelWhnf(kernelEnv, infer(kernelEnv, ctx, core));
    if (type.tag === "const" && type.levels.length === 0 && (type.name === "Nat" || type.name === "Int" || type.name === "Bool")) {
      return type.name;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

function elabNamedBinaryApp(
  name: string,
  left: SurfaceTerm,
  right: SurfaceTerm,
  locals: string[],
  localTypes: Term[],
  expectedType: Term | undefined,
  elaborateTerm: TermElaborator,
): Term {
  return elaborateTerm({
    tag: "app",
    fn: { tag: "name", name, namespacePath: [], openNamespaces: [] },
    args: [left, right],
  }, locals, localTypes, expectedType);
}

export function elabBinaryOp(
  term: Extract<SurfaceTerm, { tag: "binaryOp" }>,
  locals: string[],
  localTypes: Term[],
  kernelEnv: Environment,
  expectedType: Term | undefined,
  elaborateTerm: TermElaborator,
): Term {
  const expectedNat = coreTypeIsName(kernelEnv, expectedType, "Nat");
  const expectedInt = coreTypeIsName(kernelEnv, expectedType, "Int");
  const hasIntSyntax = surfaceMentionsInt(term.left) || surfaceMentionsInt(term.right);
  const inferredLeft = hasIntSyntax || expectedNat || expectedInt ? undefined : tryInferSurfaceTypeName(term.left, locals, localTypes, kernelEnv, elaborateTerm);
  const useInt = !expectedNat && (expectedInt || hasIntSyntax || inferredLeft === "Int");

  if (term.op === "add" || term.op === "sub") {
    return elabNamedBinaryApp(useInt ? `Int.${term.op}` : `Nat.${term.op}`, term.left, term.right, locals, localTypes, expectedType, elaborateTerm);
  }
  if (term.op === "mul") {
    if (useInt) throw new UnsupportedFeature("PSC-1 P5.11 supports overloaded +, -, and == for Int; Int multiplication operator is deferred");
    return elabNamedBinaryApp("Nat.mul", term.left, term.right, locals, localTypes, expectedType, elaborateTerm);
  }
  if (term.op === "beq") {
    const inferredRight = hasIntSyntax || inferredLeft === "Int" ? undefined : tryInferSurfaceTypeName(term.right, locals, localTypes, kernelEnv, elaborateTerm);
    const eqUsesInt = hasIntSyntax || inferredLeft === "Int" || inferredRight === "Int";
    return elabNamedBinaryApp(eqUsesInt ? "Int.beq" : "Nat.beq", term.left, term.right, locals, localTypes, expectedType, elaborateTerm);
  }

  if (useInt) throw new UnsupportedFeature("PSC-1 Int ordering operators are deferred; P5.11 only overloads +, -, and ==");
  const opName = term.op === "lt" ? "Nat.ltb"
    : term.op === "le" ? "Nat.leb"
      : term.op === "gt" ? "Nat.ltb"
        : "Nat.leb";
  const left = term.op === "gt" || term.op === "ge" ? term.right : term.left;
  const right = term.op === "gt" || term.op === "ge" ? term.left : term.right;
  return elabNamedBinaryApp(opName, left, right, locals, localTypes, expectedType, elaborateTerm);
}

export function elabLevel(level: SurfaceLevel, available: Set<string>): Level {
  switch (level.tag) {
    case "zero": return { tag: "zero" };
    case "param":
      if (!available.has(level.name)) throw new ElaborationError(`unknown universe parameter: ${level.name}`);
      return levelParam(level.name);
    case "succ": return levelSucc(elabLevel(level.of, available));
    case "max": return levelMax(elabLevel(level.left, available), elabLevel(level.right, available));
    case "imax": return levelIMax(elabLevel(level.left, available), elabLevel(level.right, available));
  }
}
