import {
  Environment,
  RecursorMetadata,
  Term,
  defEq,
  infer,
  instantiate,
  kernelWhnf,
  shift,
} from "@proofscript/kernel";
import { ElaborationError, SurfaceTerm, UnsupportedFeature } from "@proofscript/syntax";
import { contextFromTypes, flattenCoreApps, replaceCoreScoped } from "./coreUtils";

export interface InductiveTacticHost {
  elaborateTerm(term: SurfaceTerm, locals: string[], localTypes: Term[], expectedType?: Term): Term;
}

function mkApp(fn: Term, arg: Term): Term {
  return { tag: "app", fn, arg };
}

function freshGeneratedLocal(locals: readonly string[], prefix: string): string {
  const used = new Set(locals);
  if (!used.has(prefix)) return prefix;
  for (let i = 1; ; i++) {
    const candidate = `${prefix}_${i}`;
    if (!used.has(candidate)) return candidate;
  }
}

function inferWhnf(
  term: Term,
  localTypes: readonly Term[],
  kernelEnv: Environment,
): Term {
  return kernelWhnf(kernelEnv, infer(kernelEnv, contextFromTypes(localTypes), term));
}

function requireGoalSort(
  expectedType: Term | undefined,
  localTypes: Term[],
  kernelEnv: Environment,
  tactic: string,
): Extract<Term, { tag: "sort" }> {
  if (!expectedType) {
    throw new UnsupportedFeature(`${tactic} requires an expected proof goal type`);
  }
  const sort = inferWhnf(expectedType, localTypes, kernelEnv);
  if (sort.tag !== "sort") {
    throw new ElaborationError(`${tactic} failed: current goal is not a proposition/type`);
  }
  return sort;
}

function elaborateRepeatedMinor(
  minorType: Term,
  binderCount: number,
  body: SurfaceTerm,
  branchIndex: number,
  locals: string[],
  localTypes: Term[],
  kernelEnv: Environment,
  host: InductiveTacticHost,
): Term {
  let cursor = minorType;
  const domains: Term[] = [];
  const binderInfos: Array<"explicit" | "implicit" | "strictImplicit" | "instImplicit" | undefined> = [];
  let namesNow = [...locals];
  let typesNow = [...localTypes];

  for (let i = 0; i < binderCount; i++) {
    const pi = kernelWhnf(kernelEnv, cursor);
    if (pi.tag !== "pi") {
      throw new ElaborationError(
        `generated proof-state branch ${branchIndex + 1} ended before its expected ${binderCount} binder(s)`,
      );
    }
    const name = freshGeneratedLocal(namesNow, `__ps_case_${branchIndex + 1}_${i + 1}`);
    domains.push(pi.domain);
    binderInfos.push(pi.binderInfo);
    namesNow.push(name);
    typesNow.push(pi.domain);
    cursor = pi.body;
  }

  const proofBody = host.elaborateTerm(body, namesNow, typesNow, cursor);
  const actual = inferWhnf(proofBody, typesNow, kernelEnv);
  if (!defEq(kernelEnv, contextFromTypes(typesNow), actual, cursor)) {
    throw new ElaborationError(
      `generated proof-state branch ${branchIndex + 1} did not solve its goal`,
    );
  }

  let proof = proofBody;
  for (let i = domains.length - 1; i >= 0; i--) {
    proof = {
      tag: "lam",
      domain: domains[i],
      body: proof,
      binderInfo: binderInfos[i],
    };
  }
  return proof;
}

function recursorDataForScrutinee(
  scrutinee: Term,
  localTypes: Term[],
  kernelEnv: Environment,
  tactic: string,
) {
  const scrutineeType = inferWhnf(scrutinee, localTypes, kernelEnv);
  const { head, args } = flattenCoreApps(scrutineeType);
  if (head.tag !== "const") {
    throw new ElaborationError(`${tactic} failed: scrutinee type has no inductive head`);
  }
  const typeEntry = kernelEnv.get(head.name);
  if (!typeEntry || typeEntry.declaration.kind !== "inductive") {
    throw new ElaborationError(`${tactic} failed: '${head.name}' is not a supported inductive`);
  }
  if (typeEntry.declaration.numIndices !== 0) {
    throw new UnsupportedFeature(`${tactic} currently supports non-indexed inductives only`);
  }
  if (args.length !== typeEntry.declaration.numParams) {
    throw new ElaborationError(
      `${tactic} failed: '${head.name}' expected ${typeEntry.declaration.numParams} parameter argument(s), got ${args.length}`,
    );
  }
  const recEntry = kernelEnv.get(`${head.name}.rec`);
  if (!recEntry || recEntry.declaration.kind !== "recursor") {
    throw new UnsupportedFeature(`${tactic} requires the checked recursor for '${head.name}'`);
  }
  const metadata = recEntry.declaration.metadata as RecursorMetadata;
  if (!metadata || metadata.rules.length === 0) {
    throw new UnsupportedFeature(`${tactic} currently requires an inductive with at least one recursor rule`);
  }
  return {
    scrutineeType,
    typeHead: head,
    typeArgs: args,
    recEntry,
    metadata,
  };
}

function elaborateRecursorProof(
  mode: "cases" | "induction",
  scrutinee: Term,
  body: SurfaceTerm,
  locals: string[],
  localTypes: Term[],
  kernelEnv: Environment,
  expectedType: Term | undefined,
  host: InductiveTacticHost,
): Term {
  const goalSort = requireGoalSort(expectedType, localTypes, kernelEnv, mode);
  const goal = expectedType!;
  const data = recursorDataForScrutinee(scrutinee, localTypes, kernelEnv, mode);

  if (
    mode === "cases"
    && data.metadata.rules.some(rule => rule.recursiveFields.some(Boolean))
  ) {
    throw new UnsupportedFeature(
      "cases currently handles nonrecursive inductives only; use induction for recursive inductives",
    );
  }

  let motiveBody = shift(goal, 1);
  if (mode === "induction") {
    const abstracted = replaceCoreScoped(
      motiveBody,
      shift(scrutinee, 1),
      { tag: "bvar", index: 0 },
    );
    motiveBody = abstracted.term;
  }
  const motive: Term = {
    tag: "lam",
    domain: data.scrutineeType,
    body: motiveBody,
    binderInfo: "explicit",
  };

  // PSKernel simple recursors declare universes as [motive, ...family].
  const recLevels = [goalSort.level, ...data.typeHead.levels];
  let recursor: Term = {
    tag: "const",
    name: data.recEntry.declaration.name,
    levels: recLevels,
  };
  for (const arg of data.typeArgs) recursor = mkApp(recursor, arg);
  recursor = mkApp(recursor, motive);

  for (let i = 0; i < data.metadata.rules.length; i++) {
    const rule = data.metadata.rules[i];
    const currentType = inferWhnf(recursor, localTypes, kernelEnv);
    if (currentType.tag !== "pi") {
      throw new ElaborationError(
        `${mode} internal error: recursor minor ${i + 1} is not a function domain`,
      );
    }
    const ihCount = mode === "induction"
      ? rule.recursiveFields.filter(Boolean).length
      : 0;
    const binderCount = rule.nfields + ihCount;
    const minor = elaborateRepeatedMinor(
      currentType.domain,
      binderCount,
      body,
      i,
      locals,
      localTypes,
      kernelEnv,
      host,
    );
    recursor = mkApp(recursor, minor);
  }

  const proof = mkApp(recursor, scrutinee);
  const actual = inferWhnf(proof, localTypes, kernelEnv);
  if (!defEq(kernelEnv, contextFromTypes(localTypes), actual, goal)) {
    throw new ElaborationError(
      `${mode} internal check failed: generated recursor proof does not solve the original goal`,
    );
  }
  return proof;
}

export function elabConstructorProof(
  body: SurfaceTerm | undefined,
  locals: string[],
  localTypes: Term[],
  kernelEnv: Environment,
  expectedType: Term | undefined,
  host: InductiveTacticHost,
): Term {
  requireGoalSort(expectedType, localTypes, kernelEnv, "constructor");
  const goal = expectedType!;
  const { head, args } = flattenCoreApps(kernelWhnf(kernelEnv, goal));
  if (head.tag !== "const") {
    throw new ElaborationError("constructor failed: goal has no inductive head");
  }
  const typeEntry = kernelEnv.get(head.name);
  if (!typeEntry || typeEntry.declaration.kind !== "inductive") {
    throw new ElaborationError(`constructor failed: '${head.name}' is not an inductive goal`);
  }
  if (typeEntry.declaration.numIndices !== 0) {
    throw new UnsupportedFeature("constructor currently supports non-indexed inductive goals only");
  }
  if (args.length !== typeEntry.declaration.numParams) {
    throw new ElaborationError(
      `constructor failed: expected ${typeEntry.declaration.numParams} parameter argument(s), got ${args.length}`,
    );
  }
  if (typeEntry.declaration.constructors.length !== 1) {
    throw new UnsupportedFeature(
      `constructor currently requires exactly one constructor; '${head.name}' has ${typeEntry.declaration.constructors.length}`,
    );
  }

  const ctorName = typeEntry.declaration.constructors[0].name;
  const ctorEntry = kernelEnv.get(ctorName);
  if (!ctorEntry || ctorEntry.declaration.kind !== "constructor") {
    throw new ElaborationError(`constructor failed: missing checked constructor '${ctorName}'`);
  }

  let proof: Term = { tag: "const", name: ctorName, levels: [...head.levels] };
  let cursor = ctorEntry.declaration.type;
  for (const param of args) {
    const pi = kernelWhnf(kernelEnv, cursor);
    if (pi.tag !== "pi") {
      throw new ElaborationError("constructor failed: parameter telescope ended early");
    }
    proof = mkApp(proof, param);
    cursor = instantiate(pi.body, param);
  }

  let generated = 0;
  while (true) {
    const pi = kernelWhnf(kernelEnv, cursor);
    if (pi.tag !== "pi") break;
    const binderInfo = pi.binderInfo ?? "explicit";
    if (binderInfo !== "explicit") {
      throw new UnsupportedFeature(
        `constructor currently solves explicit constructor fields only; got ${binderInfo}`,
      );
    }
    if (!body) {
      throw new UnsupportedFeature(
        "constructor generated proof subgoals; add a continuation such as `constructor; assumption`",
      );
    }
    const argument = host.elaborateTerm(body, locals, localTypes, pi.domain);
    const argumentType = inferWhnf(argument, localTypes, kernelEnv);
    if (!defEq(kernelEnv, contextFromTypes(localTypes), argumentType, pi.domain)) {
      throw new ElaborationError(`constructor subgoal ${generated + 1} was not solved`);
    }
    proof = mkApp(proof, argument);
    cursor = instantiate(pi.body, argument);
    generated++;
    if (generated > 64) {
      throw new UnsupportedFeature("constructor exceeded the bounded 64-subgoal limit");
    }
  }

  if (!defEq(kernelEnv, contextFromTypes(localTypes), cursor, goal)) {
    throw new ElaborationError("constructor failed: selected constructor result does not match the goal");
  }
  const actual = inferWhnf(proof, localTypes, kernelEnv);
  if (!defEq(kernelEnv, contextFromTypes(localTypes), actual, goal)) {
    throw new ElaborationError("constructor internal check failed after constructing the proof");
  }
  return proof;
}

export function elabCasesProof(
  source: SurfaceTerm,
  body: SurfaceTerm,
  locals: string[],
  localTypes: Term[],
  kernelEnv: Environment,
  expectedType: Term | undefined,
  host: InductiveTacticHost,
): Term {
  const scrutinee = host.elaborateTerm(source, locals, localTypes);
  return elaborateRecursorProof(
    "cases",
    scrutinee,
    body,
    locals,
    localTypes,
    kernelEnv,
    expectedType,
    host,
  );
}

export function elabInductionProof(
  source: SurfaceTerm,
  body: SurfaceTerm,
  locals: string[],
  localTypes: Term[],
  kernelEnv: Environment,
  expectedType: Term | undefined,
  host: InductiveTacticHost,
): Term {
  const scrutinee = host.elaborateTerm(source, locals, localTypes);
  return elaborateRecursorProof(
    "induction",
    scrutinee,
    body,
    locals,
    localTypes,
    kernelEnv,
    expectedType,
    host,
  );
}
