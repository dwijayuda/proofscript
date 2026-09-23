import {
  Environment,
  Term,
  defEq,
  infer,
  instantiate,
  kernelWhnf,
  levelDefEq,
  shift,
} from "@proofscript/kernel";
import { ElaborationError, SurfaceTerm, UnsupportedFeature } from "@proofscript/syntax";
import { contextFromTypes, flattenCoreApps } from "./coreUtils";
import { elabRwProof, elabSimpProof, elabSubstProof } from "./proofEqualityTactics";
import { elabCasesProof, elabConstructorProof, elabInductionProof } from "./proofInductiveTactics";
import { ProofStateSnapshot, observeProofState, proofStateLocals } from "./proofState";

type ProofSurfaceTerm = Extract<
  SurfaceTerm,
  | { tag: "rflProof" }
  | { tag: "exactProof" }
  | { tag: "assumptionProof" }
  | { tag: "applyProof" }
  | { tag: "introProof" }
  | { tag: "showProof" }
  | { tag: "haveProof" }
  | { tag: "rwProof" }
  | { tag: "substProof" }
  | { tag: "constructorProof" }
  | { tag: "casesProof" }
  | { tag: "inductionProof" }
  | { tag: "simpProof" }
>;

export interface ProofElaborationHost {
  elaborateTerm(term: SurfaceTerm, locals: string[], localTypes: Term[], expectedType?: Term): Term;
  inferHeadType(head: Term, ctx: Term[]): Term;
  recordProofState?(state: ProofStateSnapshot): void;
}

export function elabProofTerm(
  term: ProofSurfaceTerm,
  locals: string[],
  localTypes: Term[],
  kernelEnv: Environment,
  expectedType: Term | undefined,
  host: ProofElaborationHost,
): Term {
  if (
    expectedType
    && typeof term.sourceStartOffset === "number"
    && typeof term.sourceEndOffset === "number"
  ) {
    observeProofState(host, {
      kind: "tactic",
      tactic: proofTacticName(term.tag),
      startOffset: term.sourceStartOffset,
      endOffset: term.sourceEndOffset,
      goal: expectedType,
      locals: proofStateLocals(locals, localTypes),
    });
  }
  switch (term.tag) {
    case "rflProof": return elabRflProof(expectedType, localTypes, kernelEnv);
    case "exactProof": return elabExactProof(term.term, locals, localTypes, kernelEnv, expectedType, host);
    case "assumptionProof": return elabAssumptionProof(locals, localTypes, kernelEnv, expectedType);
    case "applyProof": return elabApplyProof(term.term, term.body, locals, localTypes, kernelEnv, expectedType, host);
    case "introProof": return elabIntroProof(term.names, term.body, locals, localTypes, kernelEnv, expectedType, host);
    case "showProof": return elabShowProof(term.type, term.body, locals, localTypes, kernelEnv, expectedType, host);
    case "haveProof": return elabHaveProof(term.name, term.type, term.value, term.body, locals, localTypes, kernelEnv, expectedType, host);
    case "rwProof": return elabRwProof(term.equality, term.reverse, term.body, locals, localTypes, kernelEnv, expectedType, host);
    case "substProof": return elabSubstProof(term.name, term.body, locals, localTypes, kernelEnv, expectedType, host);
    case "constructorProof": return elabConstructorProof(term.body, locals, localTypes, kernelEnv, expectedType, host);
    case "casesProof": return elabCasesProof(term.term, term.body, term.branches, locals, localTypes, kernelEnv, expectedType, host);
    case "inductionProof": return elabInductionProof(term.term, term.body, term.branches, locals, localTypes, kernelEnv, expectedType, host);
    case "simpProof": return elabSimpProof(locals, localTypes, kernelEnv, expectedType, host);
  }
}

function proofTacticName(tag: ProofSurfaceTerm["tag"]): string {
  switch (tag) {
    case "rflProof": return "rfl";
    case "exactProof": return "exact";
    case "assumptionProof": return "assumption";
    case "applyProof": return "apply";
    case "introProof": return "intro";
    case "showProof": return "show";
    case "haveProof": return "have";
    case "rwProof": return "rw";
    case "substProof": return "subst";
    case "constructorProof": return "constructor";
    case "casesProof": return "cases";
    case "inductionProof": return "induction";
    case "simpProof": return "simp";
  }
}

function elabRflProof(
  expectedType: Term | undefined,
  localTypes: Term[],
  kernelEnv: Environment,
): Term {
  if (!expectedType) {
    throw new UnsupportedFeature("PSC-1 standalone rfl requires an expected Eq target type");
  }
  if (!kernelEnv.get("Eq") || !kernelEnv.get("Eq.refl")) {
    throw new UnsupportedFeature("PSC-1 standalone rfl requires the checked Eq/Eq.refl bootstrap prelude");
  }
  const ctx = contextFromTypes(localTypes);
  const expected = kernelWhnf(kernelEnv, expectedType);
  const { head, args } = flattenCoreApps(expected);
  if (head.tag !== "const" || head.name !== "Eq" || head.levels.length !== 1 || args.length !== 3) {
    throw new UnsupportedFeature("PSC-1 standalone rfl currently proves only propositional equality goals");
  }
  const [operandType, left, right] = args;
  if (!defEq(kernelEnv, ctx, left, right)) {
    throw new ElaborationError("rfl failed: equality sides are not definitionally equal");
  }
  const typeSort = kernelWhnf(kernelEnv, infer(kernelEnv, ctx, operandType));
  if (typeSort.tag !== "sort") {
    throw new ElaborationError("rfl failed: equality operand type is not itself a type");
  }
  if (!levelDefEq(head.levels[0], typeSort.level)) {
    throw new ElaborationError("rfl failed: Eq universe does not match operand type universe");
  }
  let proof: Term = { tag: "const", name: "Eq.refl", levels: [typeSort.level] };
  for (const arg of [operandType, left]) proof = { tag: "app", fn: proof, arg };
  return proof;
}

function elabAssumptionProof(
  locals: readonly string[],
  localTypes: Term[],
  kernelEnv: Environment,
  expectedType: Term | undefined,
): Term {
  if (!expectedType) {
    throw new UnsupportedFeature("PSC-1 standalone assumption requires an expected proof goal type");
  }
  const ctx = contextFromTypes(localTypes);
  const expected = kernelWhnf(kernelEnv, expectedType);
  for (let i = localTypes.length - 1; i >= 0; i--) {
    const localType = kernelWhnf(kernelEnv, localTypes[i]);
    if (!defEq(kernelEnv, ctx, localType, expected)) continue;
    const proof: Term = { tag: "bvar", index: locals.length - 1 - i };
    const actual = kernelWhnf(kernelEnv, infer(kernelEnv, ctx, proof));
    if (!defEq(kernelEnv, ctx, actual, expected)) {
      throw new ElaborationError(`assumption internal check failed for local '${locals[i]}'`);
    }
    return proof;
  }
  throw new ElaborationError("assumption failed: no local hypothesis has the expected goal type");
}

function elabApplyProof(
  source: SurfaceTerm,
  body: SurfaceTerm | undefined,
  locals: string[],
  localTypes: Term[],
  kernelEnv: Environment,
  expectedType: Term | undefined,
  host: ProofElaborationHost,
): Term {
  if (!expectedType) {
    throw new UnsupportedFeature("PSC-1 standalone apply requires an expected proof goal type");
  }
  const ctx = contextFromTypes(localTypes);
  const candidate = host.elaborateTerm(source, locals, localTypes);
  const expected = kernelWhnf(kernelEnv, expectedType);
  const candidateType = kernelWhnf(kernelEnv, host.inferHeadType(candidate, ctx));
  if (defEq(kernelEnv, ctx, candidateType, expected)) {
    return candidate;
  }

  const pi = kernelWhnf(kernelEnv, candidateType);
  if (pi.tag !== "pi") {
    throw new ElaborationError("apply failed: supplied term is neither an exact proof nor a function/implication into the goal");
  }
  const binderInfo = pi.binderInfo ?? "explicit";
  if (binderInfo !== "explicit") {
    throw new UnsupportedFeature(`PSC-1 apply currently handles explicit premises only; got ${binderInfo}`);
  }
  if (!body) {
    throw new UnsupportedFeature("PSC-1 apply generated a proof subgoal; add a following tactic such as `; assumption` or `; exact h`");
  }

  const domainSort = kernelWhnf(kernelEnv, infer(kernelEnv, ctx, pi.domain));
  if (domainSort.tag !== "sort") {
    throw new ElaborationError("apply failed: generated premise is not a proposition/type");
  }
  const argumentProof = host.elaborateTerm(body, locals, localTypes, pi.domain);
  const argumentType = kernelWhnf(kernelEnv, infer(kernelEnv, ctx, argumentProof));
  if (!defEq(kernelEnv, ctx, argumentType, pi.domain)) {
    throw new ElaborationError("apply failed: following tactic did not solve the generated premise");
  }
  const applied: Term = { tag: "app", fn: candidate, arg: argumentProof };
  const resultType = kernelWhnf(kernelEnv, instantiate(pi.body, argumentProof));
  if (resultType.tag === "pi") {
    throw new UnsupportedFeature("PSC-1 apply currently supports one generated explicit subgoal; multi-goal apply is deferred");
  }
  if (!defEq(kernelEnv, ctx, resultType, expected)) {
    throw new ElaborationError("apply failed: function result is not definitionally equal to the goal");
  }
  const actual = kernelWhnf(kernelEnv, infer(kernelEnv, ctx, applied));
  if (!defEq(kernelEnv, ctx, actual, expected)) {
    throw new ElaborationError("apply internal check failed after constructing the proof application");
  }
  return applied;
}

function elabIntroProof(
  names: readonly string[],
  body: SurfaceTerm,
  locals: string[],
  localTypes: Term[],
  kernelEnv: Environment,
  expectedType: Term | undefined,
  host: ProofElaborationHost,
): Term {
  if (!expectedType) {
    throw new UnsupportedFeature("PSC-1 standalone intro requires an expected function/forall goal type");
  }
  if (names.length === 0) {
    throw new ElaborationError("intro failed: no names were provided");
  }
  let cursor = expectedType;
  const domains: Term[] = [];
  const binderInfos: ("explicit"|"implicit"|"strictImplicit"|"instImplicit"|undefined)[] = [];
  let namesNow = [...locals];
  let typesNow = [...localTypes];
  const ctx = () => contextFromTypes(typesNow);
  for (const name of names) {
    if (namesNow.includes(name)) throw new ElaborationError(`intro failed: local name '${name}' is already in scope`);
    const pi = kernelWhnf(kernelEnv, cursor);
    if (pi.tag !== "pi") {
      throw new ElaborationError("intro failed: goal is not a function/forall type");
    }
    const binderInfo = pi.binderInfo ?? "explicit";
    if (binderInfo !== "explicit") {
      throw new UnsupportedFeature(`PSC-1 intro currently introduces explicit binders only; got ${binderInfo}`);
    }
    const domainSort = kernelWhnf(kernelEnv, infer(kernelEnv, ctx(), pi.domain));
    if (domainSort.tag !== "sort") {
      throw new ElaborationError("intro failed: introduced binder domain is not a type");
    }
    domains.push(pi.domain);
    binderInfos.push(pi.binderInfo);
    namesNow = [...namesNow, name];
    typesNow = [...typesNow, pi.domain];
    cursor = pi.body;
  }
  let proof = host.elaborateTerm(body, namesNow, typesNow, cursor);
  for (let i = domains.length - 1; i >= 0; i--) {
    proof = { tag: "lam", domain: domains[i], body: proof, binderInfo: binderInfos[i] };
  }
  return proof;
}

function elabShowProof(
  shownTypeSource: SurfaceTerm,
  body: SurfaceTerm,
  locals: string[],
  localTypes: Term[],
  kernelEnv: Environment,
  expectedType: Term | undefined,
  host: ProofElaborationHost,
): Term {
  if (!expectedType) {
    throw new UnsupportedFeature("PSC-1 show requires an expected proof goal type");
  }
  const ctx = contextFromTypes(localTypes);
  const shownType = host.elaborateTerm(shownTypeSource, locals, localTypes);
  const shownSort = kernelWhnf(kernelEnv, infer(kernelEnv, ctx, shownType));
  if (shownSort.tag !== "sort") {
    throw new ElaborationError("show failed: displayed goal is not a proposition/type");
  }
  const expected = kernelWhnf(kernelEnv, expectedType);
  if (!defEq(kernelEnv, ctx, shownType, expected)) {
    throw new ElaborationError("show failed: displayed goal is not definitionally equal to the current goal");
  }
  const proof = host.elaborateTerm(body, locals, localTypes, shownType);
  const actual = kernelWhnf(kernelEnv, infer(kernelEnv, ctx, proof));
  if (!defEq(kernelEnv, ctx, actual, shownType)) {
    throw new ElaborationError("show failed: following proof does not solve the displayed goal");
  }
  return proof;
}

function elabHaveProof(
  name: string,
  declaredTypeSource: SurfaceTerm | undefined,
  valueSource: SurfaceTerm,
  body: SurfaceTerm,
  locals: string[],
  localTypes: Term[],
  kernelEnv: Environment,
  expectedType: Term | undefined,
  host: ProofElaborationHost,
): Term {
  if (!expectedType) {
    throw new UnsupportedFeature("PSC-1 proof-local have requires an expected proof goal type");
  }
  if (locals.includes(name)) {
    throw new ElaborationError(`have failed: local name '${name}' is already in scope`);
  }

  const ctx = contextFromTypes(localTypes);
  let declaredType: Term | undefined;
  if (declaredTypeSource) {
    declaredType = host.elaborateTerm(declaredTypeSource, locals, localTypes);
    const declaredSort = kernelWhnf(kernelEnv, infer(kernelEnv, ctx, declaredType));
    if (declaredSort.tag !== "sort") {
      throw new ElaborationError("have failed: declared hypothesis type is not a proposition/type");
    }
  }

  const value = host.elaborateTerm(valueSource, locals, localTypes, declaredType);
  const inferredValueType = kernelWhnf(kernelEnv, infer(kernelEnv, ctx, value));
  const hypothesisType = declaredType ?? inferredValueType;
  const hypothesisSort = kernelWhnf(kernelEnv, infer(kernelEnv, ctx, hypothesisType));
  if (hypothesisSort.tag !== "sort") {
    throw new ElaborationError("have failed: inferred hypothesis type is not a proposition/type");
  }
  if (!defEq(kernelEnv, ctx, inferredValueType, hypothesisType)) {
    throw new ElaborationError("have failed: supplied proof does not have the declared hypothesis type");
  }

  const liftedGoal = shift(expectedType, 1, 0);
  const bodyProof = host.elaborateTerm(
    body,
    [...locals, name],
    [...localTypes, hypothesisType],
    liftedGoal,
  );
  const proof: Term = {
    tag: "let",
    type: hypothesisType,
    value,
    body: bodyProof,
    nondep: true,
  };

  const actual = kernelWhnf(kernelEnv, infer(kernelEnv, ctx, proof));
  const expected = kernelWhnf(kernelEnv, expectedType);
  if (!defEq(kernelEnv, ctx, actual, expected)) {
    throw new ElaborationError("have internal check failed: constructed proof does not solve the original goal");
  }
  return proof;
}

function elabExactProof(
  source: SurfaceTerm,
  locals: string[],
  localTypes: Term[],
  kernelEnv: Environment,
  expectedType: Term | undefined,
  host: ProofElaborationHost,
): Term {
  if (!expectedType) {
    throw new UnsupportedFeature("PSC-1 standalone exact requires an expected proof goal type");
  }
  const proof = host.elaborateTerm(source, locals, localTypes, expectedType);
  const ctx = contextFromTypes(localTypes);
  const actual = kernelWhnf(kernelEnv, infer(kernelEnv, ctx, proof));
  const expected = kernelWhnf(kernelEnv, expectedType);
  if (!defEq(kernelEnv, ctx, actual, expected)) {
    throw new ElaborationError("exact failed: supplied term does not have the expected goal type");
  }
  return proof;
}
