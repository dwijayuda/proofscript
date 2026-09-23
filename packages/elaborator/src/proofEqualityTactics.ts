import {
  Environment,
  Term,
  defEq,
  infer,
  kernelWhnf,
  sameTerm,
  shift,
} from "@proofscript/kernel";
import { ElaborationError, SurfaceTerm, UnsupportedFeature } from "@proofscript/syntax";
import { contextFromTypes, flattenCoreApps } from "./coreUtils";

export interface EqualityTacticHost {
  elaborateTerm(term: SurfaceTerm, locals: string[], localTypes: Term[], expectedType?: Term): Term;
}

interface EqualityShape {
  proof: Term;
  operandType: Term;
  left: Term;
  right: Term;
  eqLevel: Extract<Term, { tag: "const" }>["levels"][number];
}

interface ReplaceResult {
  term: Term;
  changed: boolean;
}

function mkApp(fn: Term, arg: Term): Term {
  return { tag: "app", fn, arg };
}

function mkApps(fn: Term, args: readonly Term[]): Term {
  return args.reduce((out, arg) => mkApp(out, arg), fn);
}

function replaceScoped(term: Term, needle: Term, replacement: Term, depth = 0): ReplaceResult {
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
      const fn = replaceScoped(term.fn, needle, replacement, depth);
      const arg = replaceScoped(term.arg, needle, replacement, depth);
      return {
        term: fn.changed || arg.changed ? { tag: "app", fn: fn.term, arg: arg.term } : term,
        changed: fn.changed || arg.changed,
      };
    }
    case "lam": {
      const domain = replaceScoped(term.domain, needle, replacement, depth);
      const body = replaceScoped(term.body, needle, replacement, depth + 1);
      return {
        term: domain.changed || body.changed
          ? { tag: "lam", domain: domain.term, body: body.term, binderInfo: term.binderInfo }
          : term,
        changed: domain.changed || body.changed,
      };
    }
    case "pi": {
      const domain = replaceScoped(term.domain, needle, replacement, depth);
      const body = replaceScoped(term.body, needle, replacement, depth + 1);
      return {
        term: domain.changed || body.changed
          ? { tag: "pi", domain: domain.term, body: body.term, binderInfo: term.binderInfo }
          : term,
        changed: domain.changed || body.changed,
      };
    }
    case "let": {
      const type = replaceScoped(term.type, needle, replacement, depth);
      const value = replaceScoped(term.value, needle, replacement, depth);
      const body = replaceScoped(term.body, needle, replacement, depth + 1);
      return {
        term: type.changed || value.changed || body.changed
          ? { tag: "let", type: type.term, value: value.term, body: body.term, nondep: term.nondep }
          : term,
        changed: type.changed || value.changed || body.changed,
      };
    }
    case "proj": {
      const expr = replaceScoped(term.expr, needle, replacement, depth);
      return {
        term: expr.changed ? { tag: "proj", typeName: term.typeName, index: term.index, expr: expr.term } : term,
        changed: expr.changed,
      };
    }
  }
}

function containsScoped(term: Term, needle: Term): boolean {
  return replaceScoped(term, needle, needle).changed;
}

function equalityShapeFromProof(
  proof: Term,
  localTypes: Term[],
  kernelEnv: Environment,
): EqualityShape {
  const ctx = contextFromTypes(localTypes);
  const proofType = kernelWhnf(kernelEnv, infer(kernelEnv, ctx, proof));
  const { head, args } = flattenCoreApps(proofType);
  if (head.tag !== "const" || head.name !== "Eq" || head.levels.length !== 1 || args.length !== 3) {
    throw new ElaborationError("rw failed: supplied term is not a propositional equality proof");
  }
  return {
    proof,
    operandType: args[0],
    left: args[1],
    right: args[2],
    eqLevel: head.levels[0],
  };
}

function equalityShapeFromSource(
  source: SurfaceTerm,
  locals: string[],
  localTypes: Term[],
  kernelEnv: Environment,
  host: EqualityTacticHost,
): EqualityShape {
  const proof = host.elaborateTerm(source, locals, localTypes);
  return equalityShapeFromProof(proof, localTypes, kernelEnv);
}

function buildRewriteTransport(
  shape: EqualityShape,
  reverse: boolean,
  originalGoal: Term,
  rewrittenGoal: Term,
  localTypes: Term[],
  kernelEnv: Environment,
): Term {
  const ctx = contextFromTypes(localTypes);
  const goalSort = kernelWhnf(kernelEnv, infer(kernelEnv, ctx, originalGoal));
  if (goalSort.tag !== "sort") {
    throw new ElaborationError("rw failed: current goal is not a proposition/type");
  }
  const operandSort = kernelWhnf(kernelEnv, infer(kernelEnv, ctx, shape.operandType));
  if (operandSort.tag !== "sort") {
    throw new ElaborationError("rw failed: equality operand is not a type");
  }
  const recEntry = kernelEnv.get("Eq.rec");
  if (!recEntry || recEntry.declaration.kind !== "recursor") {
    throw new UnsupportedFeature("rw requires the checked Eq.rec bootstrap recursor");
  }

  const eqUnderB = mkApps(
    { tag: "const", name: "Eq", levels: [shape.eqLevel] },
    [shift(shape.operandType, 1), shift(shape.left, 1), { tag: "bvar", index: 0 }],
  );

  let motiveBody: Term;
  let reflCaseDomain: Term;
  if (!reverse) {
    const liftedGoal = shift(originalGoal, 2);
    const replaced = replaceScoped(
      liftedGoal,
      shift(shape.left, 2),
      { tag: "bvar", index: 1 },
    );
    if (!replaced.changed) {
      throw new ElaborationError("rw failed: equality left-hand side does not occur in the current goal");
    }
    motiveBody = {
      tag: "pi",
      domain: replaced.term,
      body: shift(originalGoal, 3),
      binderInfo: "explicit",
    };
    reflCaseDomain = originalGoal;
  } else {
    const liftedGoal = shift(originalGoal, 2);
    const replaced = replaceScoped(
      liftedGoal,
      shift(shape.right, 2),
      { tag: "bvar", index: 1 },
    );
    if (!replaced.changed) {
      throw new ElaborationError("rw failed: equality right-hand side does not occur in the current goal");
    }
    motiveBody = {
      tag: "pi",
      domain: shift(rewrittenGoal, 2),
      body: shift(replaced.term, 1),
      binderInfo: "explicit",
    };
    reflCaseDomain = rewrittenGoal;
  }

  const motive: Term = {
    tag: "lam",
    domain: shape.operandType,
    binderInfo: "explicit",
    body: {
      tag: "lam",
      domain: eqUnderB,
      binderInfo: "explicit",
      body: motiveBody,
    },
  };
  const reflCase: Term = {
    tag: "lam",
    domain: reflCaseDomain,
    binderInfo: "explicit",
    body: { tag: "bvar", index: 0 },
  };

  let rec: Term = {
    tag: "const",
    name: "Eq.rec",
    levels: [goalSort.level, operandSort.level],
  };
  for (const arg of [
    shape.operandType,
    shape.left,
    motive,
    reflCase,
    shape.right,
    shape.proof,
  ]) {
    rec = mkApp(rec, arg);
  }
  return rec;
}

function elabRwWithShape(
  shape: EqualityShape,
  reverse: boolean,
  body: SurfaceTerm,
  locals: string[],
  localTypes: Term[],
  kernelEnv: Environment,
  expectedType: Term | undefined,
  host: EqualityTacticHost,
): Term {
  if (!expectedType) {
    throw new UnsupportedFeature("rw requires an expected proof goal type");
  }
  const ctx = contextFromTypes(localTypes);
  const from = reverse ? shape.right : shape.left;
  const to = reverse ? shape.left : shape.right;
  const rewritten = replaceScoped(expectedType, from, to);
  if (!rewritten.changed) {
    throw new ElaborationError(
      reverse
        ? "rw failed: equality right-hand side does not occur in the current goal"
        : "rw failed: equality left-hand side does not occur in the current goal",
    );
  }

  const bodyProof = host.elaborateTerm(body, locals, localTypes, rewritten.term);
  const bodyType = kernelWhnf(kernelEnv, infer(kernelEnv, ctx, bodyProof));
  if (!defEq(kernelEnv, ctx, bodyType, rewritten.term)) {
    throw new ElaborationError("rw failed: following tactic did not solve the rewritten goal");
  }

  const transport = buildRewriteTransport(
    shape,
    reverse,
    expectedType,
    rewritten.term,
    localTypes,
    kernelEnv,
  );
  const proof = mkApp(transport, bodyProof);
  const actual = kernelWhnf(kernelEnv, infer(kernelEnv, ctx, proof));
  const expected = kernelWhnf(kernelEnv, expectedType);
  if (!defEq(kernelEnv, ctx, actual, expected)) {
    throw new ElaborationError("rw internal check failed: Eq.rec transport did not reconstruct the original goal");
  }
  return proof;
}

export function elabRwProof(
  equality: SurfaceTerm,
  reverse: boolean,
  body: SurfaceTerm,
  locals: string[],
  localTypes: Term[],
  kernelEnv: Environment,
  expectedType: Term | undefined,
  host: EqualityTacticHost,
): Term {
  const shape = equalityShapeFromSource(equality, locals, localTypes, kernelEnv, host);
  return elabRwWithShape(shape, reverse, body, locals, localTypes, kernelEnv, expectedType, host);
}

export function elabSubstProof(
  name: string,
  body: SurfaceTerm,
  locals: string[],
  localTypes: Term[],
  kernelEnv: Environment,
  expectedType: Term | undefined,
  host: EqualityTacticHost,
): Term {
  if (!expectedType) {
    throw new UnsupportedFeature("subst requires an expected proof goal type");
  }
  const localIndex = locals.lastIndexOf(name);
  if (localIndex < 0) {
    throw new ElaborationError(`subst failed: unknown local '${name}'`);
  }
  const variable: Term = { tag: "bvar", index: locals.length - 1 - localIndex };
  if (!containsScoped(expectedType, variable)) {
    throw new ElaborationError(`subst failed: local '${name}' does not occur in the current goal`);
  }

  for (let i = localTypes.length - 1; i >= 0; i--) {
    if (i === localIndex) continue;
    const proof: Term = { tag: "bvar", index: locals.length - 1 - i };
    let shape: EqualityShape;
    try {
      shape = equalityShapeFromProof(proof, localTypes, kernelEnv);
    } catch {
      continue;
    }
    if (sameTerm(shape.left, variable) && !containsScoped(shape.right, variable)) {
      return elabRwWithShape(shape, false, body, locals, localTypes, kernelEnv, expectedType, host);
    }
    if (sameTerm(shape.right, variable) && !containsScoped(shape.left, variable)) {
      return elabRwWithShape(shape, true, body, locals, localTypes, kernelEnv, expectedType, host);
    }
  }
  throw new ElaborationError(`subst failed: no local equality directly solves '${name}'`);
}

function tryRfl(
  expectedType: Term,
  localTypes: Term[],
  kernelEnv: Environment,
): Term | undefined {
  if (!kernelEnv.get("Eq") || !kernelEnv.get("Eq.refl")) return undefined;
  const ctx = contextFromTypes(localTypes);
  const expected = kernelWhnf(kernelEnv, expectedType);
  const { head, args } = flattenCoreApps(expected);
  if (head.tag !== "const" || head.name !== "Eq" || head.levels.length !== 1 || args.length !== 3) {
    return undefined;
  }
  const [operandType, left, right] = args;
  if (!defEq(kernelEnv, ctx, left, right)) return undefined;
  const operandSort = kernelWhnf(kernelEnv, infer(kernelEnv, ctx, operandType));
  if (operandSort.tag !== "sort") return undefined;
  return mkApps(
    { tag: "const", name: "Eq.refl", levels: [operandSort.level] },
    [operandType, left],
  );
}

function tryAssumption(
  locals: readonly string[],
  localTypes: Term[],
  kernelEnv: Environment,
  expectedType: Term,
): Term | undefined {
  const ctx = contextFromTypes(localTypes);
  const expected = kernelWhnf(kernelEnv, expectedType);
  for (let i = localTypes.length - 1; i >= 0; i--) {
    const proof: Term = { tag: "bvar", index: locals.length - 1 - i };
    try {
      const actual = kernelWhnf(kernelEnv, infer(kernelEnv, ctx, proof));
      if (defEq(kernelEnv, ctx, actual, expected)) return proof;
    } catch {
      // Ignore non-proof locals and continue the bounded search.
    }
  }
  return undefined;
}

export function elabSimpProof(
  locals: string[],
  localTypes: Term[],
  kernelEnv: Environment,
  expectedType: Term | undefined,
  host: EqualityTacticHost,
): Term {
  if (!expectedType) {
    throw new UnsupportedFeature("simp requires an expected proof goal type");
  }
  const directRfl = tryRfl(expectedType, localTypes, kernelEnv);
  if (directRfl) return directRfl;
  const directAssumption = tryAssumption(locals, localTypes, kernelEnv, expectedType);
  if (directAssumption) return directAssumption;

  for (let i = localTypes.length - 1; i >= 0; i--) {
    const proof: Term = { tag: "bvar", index: locals.length - 1 - i };
    let shape: EqualityShape;
    try {
      shape = equalityShapeFromProof(proof, localTypes, kernelEnv);
    } catch {
      continue;
    }
    for (const reverse of [false, true]) {
      for (const terminal of [
        { tag: "rflProof" } as SurfaceTerm,
        { tag: "assumptionProof" } as SurfaceTerm,
      ]) {
        try {
          return elabRwWithShape(
            shape,
            reverse,
            terminal,
            locals,
            localTypes,
            kernelEnv,
            expectedType,
            host,
          );
        } catch {
          // simp-lite intentionally performs only this bounded local attempt.
        }
      }
    }
  }

  throw new ElaborationError(
    "simp failed: bounded simp-lite found no definitional reflexivity, matching assumption, or one-step local equality rewrite",
  );
}
