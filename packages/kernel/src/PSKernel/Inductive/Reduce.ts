import { EnvironmentCore } from "../Environment/Basic";
import { getAppArgs, getAppFn, sameTerm, Term, instantiate, shift } from "../Expr";
import { KernelUnsupportedError } from "../KernelError";
import { Level, LevelZero, levelDefEqList } from "../Level";

interface SimpleRecursorRuleMetadata {
  ctor: string;
  nfields: number;
  recursiveFields: boolean[];
  recursiveFieldTypes?: Term[];
}

interface SimpleRecursorMetadata {
  trustedBoundary: true;
  status: "typed-simple-nonindexed" | "typed-simple-indexed";
  numParams?: number;
  numIndices?: number;
  rules: SimpleRecursorRuleMetadata[];
  mutual?: { familyNames: string[]; recursorNames: string[]; paramCount: number; indexCounts: number[]; ruleFamilies: string[]; targetFamily: string };
}

type DefEqTerm = (left: Term, right: Term) => boolean;
type InferWhnfTerm = (term: Term) => Term | undefined;



interface EqRecursorMetadata {
  trustedBoundary: true;
  status: "typed-eq-indexed";
  numParams?: number;
  numIndices?: number;
}

function isEqRecursorMetadata(value: unknown): value is EqRecursorMetadata {
  if (!value || typeof value !== "object") return false;
  const meta = value as { trustedBoundary?: unknown; status?: unknown; numParams?: unknown; numIndices?: unknown };
  return meta.trustedBoundary === true && meta.status === "typed-eq-indexed" && meta.numParams === 2 && meta.numIndices === 1;
}

function isSimpleRecursorMetadata(value: unknown): value is SimpleRecursorMetadata {
  if (!value || typeof value !== "object") return false;
  const meta = value as { trustedBoundary?: unknown; status?: unknown; rules?: unknown };
  return meta.trustedBoundary === true && (meta.status === "typed-simple-nonindexed" || meta.status === "typed-simple-indexed") && Array.isArray(meta.rules);
}

function mkApp(fn: Term, arg: Term): Term { return { tag: "app", fn, arg }; }
function mkApps(fn: Term, args: readonly Term[]): Term { return args.reduce((acc, arg) => mkApp(acc, arg), fn); }

function normalizeRecursorMatchTerm(term: Term, reduceWhnf: (term: Term) => Term, fuel = 64): Term {
  if (fuel <= 0) return term;
  switch (term.tag) {
    case "const":
    case "lit": {
      const reduced = reduceWhnf(term);
      return sameTerm(reduced, term) ? term : normalizeRecursorMatchTerm(reduced, reduceWhnf, fuel - 1);
    }
    case "let": return normalizeRecursorMatchTerm(instantiate(term.body, term.value), reduceWhnf, fuel - 1);
    case "app": {
      const fn = normalizeRecursorMatchTerm(term.fn, reduceWhnf, fuel - 1);
      const arg = normalizeRecursorMatchTerm(term.arg, reduceWhnf, fuel - 1);
      if (fn.tag === "lam") return normalizeRecursorMatchTerm(instantiate(fn.body, arg), reduceWhnf, fuel - 1);
      return mkApp(fn, arg);
    }
    case "lam": return { tag: "lam", domain: normalizeRecursorMatchTerm(term.domain, reduceWhnf, fuel - 1), body: normalizeRecursorMatchTerm(term.body, reduceWhnf, fuel - 1), binderInfo: term.binderInfo };
    case "pi": return { tag: "pi", domain: normalizeRecursorMatchTerm(term.domain, reduceWhnf, fuel - 1), body: normalizeRecursorMatchTerm(term.body, reduceWhnf, fuel - 1), binderInfo: term.binderInfo };
    case "proj": return { tag: "proj", typeName: term.typeName, index: term.index, expr: normalizeRecursorMatchTerm(term.expr, reduceWhnf, fuel - 1) };
    case "sort":
    case "bvar": return term;
  }
}

function sameAfterWhnf(a: Term, b: Term, reduceWhnf: (term: Term) => Term): boolean {
  return sameTerm(a, b) || sameTerm(normalizeRecursorMatchTerm(a, reduceWhnf), normalizeRecursorMatchTerm(b, reduceWhnf));
}

function instantiateConstructorContext(term: Term, valuesOldToNew: readonly Term[], depth = 0): Term {
  switch (term.tag) {
    case "sort":
    case "const":
    case "lit": return term;
    case "bvar": {
      const relative = term.index - depth;
      if (relative >= 0 && relative < valuesOldToNew.length) return shift(valuesOldToNew[valuesOldToNew.length - 1 - relative], depth);
      return term;
    }
    case "app": return { tag: "app", fn: instantiateConstructorContext(term.fn, valuesOldToNew, depth), arg: instantiateConstructorContext(term.arg, valuesOldToNew, depth) };
    case "lam": return { tag: "lam", domain: instantiateConstructorContext(term.domain, valuesOldToNew, depth), body: instantiateConstructorContext(term.body, valuesOldToNew, depth + 1), binderInfo: term.binderInfo };
    case "pi": return { tag: "pi", domain: instantiateConstructorContext(term.domain, valuesOldToNew, depth), body: instantiateConstructorContext(term.body, valuesOldToNew, depth + 1), binderInfo: term.binderInfo };
    case "let": return instantiateConstructorContext(instantiate(term.body, term.value), valuesOldToNew, depth);
    case "proj": return { tag: "proj", typeName: term.typeName, index: term.index, expr: instantiateConstructorContext(term.expr, valuesOldToNew, depth) };
  }
}

function buildRecursiveIH(
  recursor: Extract<Term, { tag: "const" }>,
  recursivePrefix: readonly Term[],
  field: Term,
  recursiveFieldType: Term | undefined,
  metadata: SimpleRecursorMetadata,
  reduceWhnf: (term: Term) => Term,
): Term | undefined {
  if (!recursiveFieldType || !metadata.numIndices) return mkApps(recursor, [...recursivePrefix, field]);
  const go = (type: Term, value: Term): Term | undefined => {
    const reducedType = reduceWhnf(type);
    const head = getAppFn(reducedType);
    if (head.tag === "const") {
      const appArgs = getAppArgs(reducedType);
      if (appArgs.length < (metadata.numParams ?? 0) + (metadata.numIndices ?? 0)) return undefined;
      const indices = appArgs.slice((metadata.numParams ?? 0), (metadata.numParams ?? 0) + (metadata.numIndices ?? 0));
      return mkApps(recursor, [...recursivePrefix, ...indices, value]);
    }
    if (reducedType.tag === "pi") {
      const bodyIH = go(reducedType.body, mkApp(shift(value, 1), { tag: "bvar", index: 0 }));
      return bodyIH ? { tag: "lam", domain: reducedType.domain, body: bodyIH, binderInfo: reducedType.binderInfo } : undefined;
    }
    return undefined;
  };
  return go(recursiveFieldType, field);
}




function buildRecursiveMutualIHWithRecursor(
  recursorLevels: readonly Level[],
  recursivePrefix: readonly Term[],
  field: Term,
  recursiveFieldType: Term | undefined,
  metadata: SimpleRecursorMetadata,
  reduceWhnf: (term: Term) => Term,
): Term | undefined {
  const mutual = metadata.mutual;
  if (!mutual || !recursiveFieldType) return undefined;
  const familyIndex = new Map<string, number>();
  mutual.familyNames.forEach((name, index) => familyIndex.set(name, index));
  const paramCount = mutual.paramCount;
  const go = (type: Term, value: Term): Term | undefined => {
    const reducedType = reduceWhnf(type);
    const head = getAppFn(reducedType);
    if (head.tag === "const") {
      const idx = familyIndex.get(head.name);
      if (idx === undefined) return undefined;
      const indexCount = mutual.indexCounts[idx] ?? 0;
      const appArgs = getAppArgs(reducedType);
      if (appArgs.length < paramCount + indexCount) return undefined;
      const indices = appArgs.slice(paramCount, paramCount + indexCount);
      const recursorName = mutual.recursorNames[idx];
      if (!recursorName) return undefined;
      return mkApps({ tag: "const", name: recursorName, levels: [...recursorLevels] }, [...recursivePrefix, ...indices, value]);
    }
    if (reducedType.tag === "pi") {
      const bodyIH = go(reducedType.body, mkApp(shift(value, 1), { tag: "bvar", index: 0 }));
      return bodyIH ? { tag: "lam", domain: reducedType.domain, body: bodyIH, binderInfo: reducedType.binderInfo } : undefined;
    }
    return undefined;
  };
  return go(recursiveFieldType, field);
}

function recursorFamilyName(recursorName: string): string | undefined {
  return recursorName.endsWith(".rec") ? recursorName.slice(0, -4) : undefined;
}

function constructorCodomain(type: Term): Term {
  let cursor = type;
  while (cursor.tag === "pi") cursor = cursor.body;
  return cursor;
}

function constructorDomains(type: Term): Term[] {
  const domains: Term[] = [];
  let cursor = type;
  while (cursor.tag === "pi") { domains.push(cursor.domain); cursor = cursor.body; }
  return domains;
}

function isSortZero(term: Term): boolean {
  return term.tag === "sort" && levelDefEqList([term.level], [LevelZero]);
}


function familySupportsSingletonEta(env: EnvironmentCore, familyName: string): { ctor: string; numParams: number; numIndices: number } | undefined {
  const family = env.findConstant(familyName);
  if (!family || family.kind !== "inductInfo") return undefined;
  if (family.constructors.length !== 1) return undefined;
  // This eta rule is for unit-like data families.  For Prop-valued singleton
  // families, Lean's arbitrary-proof reduction is governed by RecursorVal.k;
  // historical profiles with K disabled must therefore remain stuck.
  if (isSortZero(constructorCodomain(family.type))) return undefined;
  const ctorName = family.constructors[0];
  const ctor = env.findConstant(ctorName);
  if (!ctor || ctor.kind !== "ctorInfo") return undefined;
  const domains = constructorDomains(ctor.type);
  // Lean's unit-like recursor eta rule is only derivable for a one-constructor
  // family whose constructor has no non-parameter fields.  This deliberately
  // does not trust exported recursor metadata: the kernel reconstructs the
  // candidate constructor and then checks that its inferred type is
  // definitionally equal to the actual major-premise type.
  if (domains.length !== family.numParams) return undefined;
  return { ctor: ctorName, numParams: family.numParams, numIndices: family.numIndices };
}

function trySingletonEtaMajor(
  env: EnvironmentCore,
  recursorName: string,
  recursorLevels: readonly Level[],
  expectedNumParams: number,
  expectedNumIndices: number,
  originalMajor: Term,
  reducedMajor: Term,
  args: readonly Term[],
  majorIndex: number,
  reduceWhnf: (term: Term) => Term,
  isDefEq?: DefEqTerm,
  inferWhnf?: InferWhnfTerm,
): Term | undefined {
  if (!inferWhnf || !isDefEq) return undefined;
  const familyName = recursorFamilyName(recursorName);
  if (!familyName) return undefined;
  const singleton = familySupportsSingletonEta(env, familyName);
  if (!singleton || singleton.numParams !== expectedNumParams || singleton.numIndices !== expectedNumIndices) return undefined;
  const reducedHead = getAppFn(reducedMajor);
  if (reducedHead.tag === "const" && reducedHead.name === singleton.ctor) return reducedMajor;

  const majorType = inferWhnf(originalMajor);
  if (!majorType) return undefined;
  const majorTypeHead = getAppFn(majorType);
  if (majorTypeHead.tag !== "const" || majorTypeHead.name !== familyName) return undefined;
  const majorTypeArgs = getAppArgs(majorType);
  if (majorTypeArgs.length !== singleton.numParams + singleton.numIndices) return undefined;
  if (majorIndex >= args.length) return undefined;
  const recursorParams = args.slice(0, singleton.numParams);
  for (let i = 0; i < singleton.numParams; i++) if (!isDefEq(recursorParams[i], majorTypeArgs[i])) return undefined;

  // For ordinary generated recursors the family universe levels follow the
  // motive universe.  If the recursor has a motive level, constructor levels
  // are the trailing family levels; monomorphic families simply have none.
  const familyLevelCount = Math.max(0, recursorLevels.length - 1);
  const ctorLevels = familyLevelCount === 0 ? [] : recursorLevels.slice(recursorLevels.length - familyLevelCount);
  const candidate = mkApps({ tag: "const", name: singleton.ctor, levels: [...ctorLevels] }, majorTypeArgs.slice(0, singleton.numParams));
  const candidateType = inferWhnf(candidate);
  if (!candidateType || !isDefEq(candidateType, majorType)) return undefined;
  return reduceWhnf(candidate);
}

function recursorKEnabled(env: EnvironmentCore): boolean {
  return ((env as unknown as { options?: { allowRecursorK?: unknown } }).options?.allowRecursorK === true);
}

function familySupportsK(env: EnvironmentCore, familyName: string): { ctor: string; numParams: number; numIndices: number } | undefined {
  const family = env.findConstant(familyName);
  if (!family || family.kind !== "inductInfo") return undefined;
  if (family.constructors.length !== 1) return undefined;
  const result = constructorCodomain(family.type);
  if (!isSortZero(result)) return undefined;
  const ctorName = family.constructors[0];
  const ctor = env.findConstant(ctorName);
  if (!ctor || ctor.kind !== "ctorInfo") return undefined;
  const domains = constructorDomains(ctor.type);
  if (domains.length !== family.numParams) return undefined;
  return { ctor: ctorName, numParams: family.numParams, numIndices: family.numIndices };
}

function tryRecursorKMajor(
  env: EnvironmentCore,
  recursorName: string,
  recursorLevels: readonly Level[],
  expectedNumParams: number,
  expectedNumIndices: number,
  originalMajor: Term,
  reducedMajor: Term,
  args: readonly Term[],
  majorIndex: number,
  reduceWhnf: (term: Term) => Term,
  isDefEq?: DefEqTerm,
  inferWhnf?: InferWhnfTerm,
): Term | undefined {
  if (!recursorKEnabled(env) || !inferWhnf || !isDefEq) return undefined;
  const familyName = recursorFamilyName(recursorName);
  if (!familyName) return undefined;
  const k = familySupportsK(env, familyName);
  if (!k || k.numParams !== expectedNumParams || k.numIndices !== expectedNumIndices) return undefined;
  const reducedHead = getAppFn(reducedMajor);
  if (reducedHead.tag === "const" && reducedHead.name === k.ctor) return reducedMajor;

  const majorType = inferWhnf(originalMajor);
  if (!majorType) return undefined;
  const majorTypeHead = getAppFn(majorType);
  if (majorTypeHead.tag !== "const" || majorTypeHead.name !== familyName) return undefined;
  const majorTypeArgs = getAppArgs(majorType);
  if (majorTypeArgs.length !== k.numParams + k.numIndices) return undefined;
  if (majorIndex >= args.length) return undefined;
  const recursorParams = args.slice(0, k.numParams);
  for (let i = 0; i < k.numParams; i++) {
    if (!isDefEq(recursorParams[i], majorTypeArgs[i])) return undefined;
  }

  const familyLevelCount = Math.max(0, recursorLevels.length - 1);
  const ctorLevels = familyLevelCount === 0 ? [] : recursorLevels.slice(recursorLevels.length - familyLevelCount);
  const candidate = mkApps({ tag: "const", name: k.ctor, levels: [...ctorLevels] }, majorTypeArgs.slice(0, k.numParams));
  const candidateType = inferWhnf(candidate);
  if (!candidateType || !isDefEq(candidateType, majorType)) return undefined;
  return reduceWhnf(candidate);
}

function tryEqRecReduce(
  env: EnvironmentCore,
  recursorName: string,
  recursorLevels: readonly Level[],
  args: readonly Term[],
  reduceWhnf: (term: Term) => Term,
  isDefEq?: DefEqTerm,
  inferWhnf?: InferWhnfTerm,
): Term | undefined {
  if (recursorName !== "Eq.rec") return undefined;
  if (args.length <= 5) return undefined;
  const [alpha, a, _motive, reflCase, b, h] = args;
  let major = reduceWhnf(h);
  major = tryRecursorKMajor(env, "Eq.rec", recursorLevels, 2, 1, h, major, args, 5, reduceWhnf, isDefEq, inferWhnf) ?? major;
  const majorHead = getAppFn(major);
  if (majorHead.tag !== "const" || majorHead.name !== "Eq.refl") return undefined;
  const reflArgs = getAppArgs(major);
  if (reflArgs.length !== 2) return undefined;
  const familyLevel = recursorLevels.length >= 2 ? recursorLevels[1] : recursorLevels[0];
  if (familyLevel === undefined || majorHead.levels.length !== 1 || !levelDefEqList([familyLevel], majorHead.levels)) return undefined;
  const same = (left: Term, right: Term) => sameTerm(left, right) || (isDefEq ? isDefEq(left, right) : sameAfterWhnf(left, right, reduceWhnf));
  if (!same(alpha, reflArgs[0])) return undefined;
  if (!same(a, reflArgs[1])) return undefined;
  if (!same(b, a)) return undefined;
  return mkApps(reflCase, args.slice(6));
}

/**
 * First conservative iota-reduction slice for pskernel-style generated recursors.
 *
 * Supported now:
 * - metadata status is `typed-simple-nonindexed`,
 * - recursor is fully applied to motive + one minor per constructor + major premise,
 * - major premise WHNF has a constructor head listed in the recursor metadata,
 * - constructor is fully applied to exactly the recorded field count,
 * - direct recursive fields receive recursive-call induction hypotheses.
 *
 * Unsupported indexed/parameterized/mutual/nested/dependent cases return `undefined`
 * and remain neutral/fail-closed elsewhere. This function never invents recursor
 * behavior for stubbed metadata.
 */
export function tryInductiveReduceRec(
  env: EnvironmentCore,
  term: Term,
  reduceWhnf: (term: Term) => Term,
  isTypeCorrectApplication?: (recursorName: string, recursorLevels: readonly Level[], args: readonly Term[]) => boolean,
  isDefEq?: DefEqTerm,
  inferWhnf?: InferWhnfTerm,
): Term | undefined {
  const head = getAppFn(term);
  if (head.tag !== "const") return undefined;
  const info = env.findConstant(head.name);
  if (!info || info.kind !== "recInfo") return undefined;

  const args = getAppArgs(term);
  if (isTypeCorrectApplication && !isTypeCorrectApplication(head.name, head.levels, args)) return undefined;
  if (isEqRecursorMetadata(info.metadata)) return tryEqRecReduce(env, head.name, head.levels, args, reduceWhnf, isDefEq, inferWhnf);
  if (!isSimpleRecursorMetadata(info.metadata)) return undefined;
  const rules = info.metadata.rules;
  const numParams = info.metadata.numParams ?? 0;
  const numIndices = info.metadata.numIndices ?? 0;
  const motiveCount = info.metadata.mutual?.familyNames.length ?? 1;
  const majorIndex = numParams + motiveCount + rules.length + numIndices;
  if (args.length <= majorIndex) return undefined;

  let major = reduceWhnf(args[majorIndex]);
  if (!info.metadata.mutual) {
    major = tryRecursorKMajor(env, head.name, head.levels, numParams, numIndices, args[majorIndex], major, args, majorIndex, reduceWhnf, isDefEq, inferWhnf)
      ?? trySingletonEtaMajor(env, head.name, head.levels, numParams, numIndices, args[majorIndex], major, args, majorIndex, reduceWhnf, isDefEq, inferWhnf)
      ?? major;
  }
  const majorHead = getAppFn(major);
  if (majorHead.tag !== "const") return undefined;
  const ruleIndex = rules.findIndex(rule => rule.ctor === majorHead.name);
  if (ruleIndex < 0) return undefined;

  const rule = rules[ruleIndex];
  const ctorArgs = getAppArgs(major);
  if (ctorArgs.length !== numParams + rule.nfields) return undefined;
  const sameParam = (left: Term, right: Term) => sameTerm(left, right) || (isDefEq ? isDefEq(left, right) : sameAfterWhnf(left, right, reduceWhnf));
  for (let i = 0; i < numParams; i++) if (!sameParam(args[i], ctorArgs[i])) return undefined;
  const fields = ctorArgs.slice(numParams);
  if (rule.recursiveFields.length !== rule.nfields) throw new KernelUnsupportedError(`malformed recursor metadata for ${head.name}: recursiveFields length mismatch`);

  const recursorPrefixArgs = args.slice(0, numParams + motiveCount + rules.length);
  const extraArgs = args.slice(majorIndex + 1);
  let result = args[numParams + motiveCount + ruleIndex];
  for (const field of fields) result = mkApp(result, field);
  const inductionHypotheses: Term[] = [];
  for (let i = 0; i < fields.length; i++) {
    if (!rule.recursiveFields[i]) continue;
    const field = fields[i];
    const contextValues = [...ctorArgs.slice(0, numParams), ...fields.slice(0, i)];
    const recursiveFieldType = rule.recursiveFieldTypes?.[i]
      ? instantiateConstructorContext(rule.recursiveFieldTypes[i], contextValues)
      : undefined;
    const ih = info.metadata.mutual
      ? buildRecursiveMutualIHWithRecursor(head.levels, recursorPrefixArgs, field, recursiveFieldType, info.metadata, reduceWhnf)
      : buildRecursiveIH(head, recursorPrefixArgs, field, recursiveFieldType, info.metadata, reduceWhnf);
    if (!ih) return undefined;
    inductionHypotheses.push(ih);
  }
  for (const ih of inductionHypotheses) result = mkApp(result, ih);
  return mkApps(result, extraArgs);
}

export function inductiveReduceRec(): never {
  throw new KernelUnsupportedError("general inductive recursor reduction is not implemented in this TypeScript slice yet; only typed-simple-nonindexed iota reduction is available through tryInductiveReduceRec");
}

export const portStatus_PSKernel_Inductive_Reduce = {
  source: "PSKernel/Inductive/Reduce.lean",
  target: "packages/kernel/src/PSKernel/Inductive/Reduce.ts",
  status: "partial",
  trustedBoundary: true,
  proofStatus: "not-proven",
} as const;
