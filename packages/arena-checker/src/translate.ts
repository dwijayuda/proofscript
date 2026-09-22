import { CoreDeclaration, Level, LevelZero, RecursorKnownDefinition, Term, declarationToConstantInfo, getAppArgs, getAppFn, instantiate, instantiateTermLevels, levelDefEqList, levelIMax, levelMax, levelParam, levelSucc, sameTerm } from "@proofscript/kernel";
import { ArenaMalformedInputError, NdjsonRecord } from "./ndjson";

export class ArenaUnsupportedFeatureError extends Error {
  readonly kind: string;
  constructor(kind: string, message: string) {
    super(message);
    this.name = "ArenaUnsupportedFeatureError";
    this.kind = kind;
  }
}

export class ArenaSemanticRejectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ArenaSemanticRejectionError";
  }
}

export interface ArenaTranslation {
  declarations: CoreDeclaration[];
  recordsRead: number;
}

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function expectObject(value: unknown, path: string): JsonObject {
  if (!isObject(value)) throw new ArenaMalformedInputError(`${path} must be an object`);
  return value;
}

function expectArray(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) throw new ArenaMalformedInputError(`${path} must be an array`);
  return value;
}

function expectInt(value: unknown, path: string): number {
  if (!Number.isSafeInteger(value)) throw new ArenaMalformedInputError(`${path} must be a safe integer`);
  return Number(value);
}

function expectBool(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") throw new ArenaMalformedInputError(`${path} must be a boolean`);
  return value;
}

function expectString(value: unknown, path: string): string {
  if (typeof value !== "string") throw new ArenaMalformedInputError(`${path} must be a string`);
  return value;
}

function own(value: JsonObject, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function binderInfo(value: unknown, path: string): "explicit" | "implicit" | "strictImplicit" | "instImplicit" {
  if (value === "default") return "explicit";
  if (value === "implicit" || value === "strictImplicit" || value === "instImplicit") return value;
  throw new ArenaMalformedInputError(`${path} has unsupported binderInfo ${String(value)}`);
}

function declName(names: Map<number, string>, id: unknown, path: string): string {
  const index = expectInt(id, path);
  const name = names.get(index);
  if (name === undefined) throw new ArenaMalformedInputError(`${path} references unknown name ${index}`);
  if (name.length === 0) throw new ArenaMalformedInputError(`${path} cannot be anonymous`);
  return name;
}

function levelAt(levels: Map<number, Level>, id: unknown, path: string): Level {
  const index = expectInt(id, path);
  const level = levels.get(index);
  if (level === undefined) throw new ArenaMalformedInputError(`${path} references unknown level ${index}`);
  return level;
}

function exprAt(exprs: Map<number, Term>, id: unknown, path: string): Term {
  const index = expectInt(id, path);
  const expr = exprs.get(index);
  if (expr === undefined) throw new ArenaMalformedInputError(`${path} references unknown expression ${index}`);
  return expr;
}

function levelParamNames(names: Map<number, string>, raw: unknown, path: string): string[] {
  return expectArray(raw, path).map((entry, i) => declName(names, entry, `${path}[${i}]`));
}

function parseHints(value: unknown, path: string): "regular" | "abbrev" {
  if (value === "abbrev") return "abbrev";
  // lean4export `def` records may carry ReducibilityHints.opaque while still
  // being kernel-unfoldable definitions. A separate `opaque` record is the
  // actual non-unfolding declaration kind. Mapping def/hints=opaque to an
  // opaque Core declaration makes valid Arena beta/delta cases too restrictive.
  if (value === "opaque") return "regular";
  if (isObject(value) && own(value, "regular")) {
    expectInt(value.regular, `${path}.regular`);
    return "regular";
  }
  throw new ArenaMalformedInputError(`${path} has unsupported hints ${JSON.stringify(value)}`);
}


interface ExportedInductiveType {
  name: string;
  levelParams: string[];
  type: Term;
  numParams: number;
  numIndices: number;
  constructors: CoreDeclaration extends infer _ ? { name: string; type: Term }[] : never;
}

function expectNonnegativeInt(value: unknown, path: string): number {
  const n = expectInt(value, path);
  if (n < 0) throw new ArenaMalformedInputError(`${path} must be nonnegative`);
  return n;
}


function renameLevelParams(level: Level, names: Map<string, string>): Level {
  switch (level.tag) {
    case "zero": return level;
    case "param": return names.has(level.name) ? levelParam(names.get(level.name)!) : level;
    case "succ": return { tag: "succ", of: renameLevelParams(level.of, names) };
    case "max": return { tag: "max", left: renameLevelParams(level.left, names), right: renameLevelParams(level.right, names) };
    case "imax": return { tag: "imax", left: renameLevelParams(level.left, names), right: renameLevelParams(level.right, names) };
    case "mvar": return level;
  }
}

function renameTermLevelParams(term: Term, names: Map<string, string>): Term {
  switch (term.tag) {
    case "sort": return { tag: "sort", level: renameLevelParams(term.level, names) };
    case "const": return { tag: "const", name: term.name, levels: term.levels.map(level => renameLevelParams(level, names)) };
    case "bvar":
    case "lit": return term;
    case "app": return { tag: "app", fn: renameTermLevelParams(term.fn, names), arg: renameTermLevelParams(term.arg, names) };
    case "lam": return { tag: "lam", domain: renameTermLevelParams(term.domain, names), body: renameTermLevelParams(term.body, names), binderInfo: term.binderInfo };
    case "pi": return { tag: "pi", domain: renameTermLevelParams(term.domain, names), body: renameTermLevelParams(term.body, names), binderInfo: term.binderInfo };
    case "let": return { tag: "let", type: renameTermLevelParams(term.type, names), value: renameTermLevelParams(term.value, names), body: renameTermLevelParams(term.body, names), nondep: term.nondep };
    case "proj": return { tag: "proj", typeName: term.typeName, index: term.index, expr: renameTermLevelParams(term.expr, names) };
  }
}


function sameTermModuloBinderInfo(left: Term, right: Term): boolean {
  if (left.tag !== right.tag) return false;
  switch (left.tag) {
    case "sort": return right.tag === "sort" && levelDefEqList([left.level], [right.level]);
    case "const": return right.tag === "const" && left.name === right.name && levelDefEqList(left.levels, right.levels);
    case "bvar": return right.tag === "bvar" && left.index === right.index;
    case "lit": return right.tag === "lit" && JSON.stringify(left.literal) === JSON.stringify(right.literal);
    case "app": return right.tag === "app" && sameTermModuloBinderInfo(left.fn, right.fn) && sameTermModuloBinderInfo(left.arg, right.arg);
    case "lam": return right.tag === "lam" && sameTermModuloBinderInfo(left.domain, right.domain) && sameTermModuloBinderInfo(left.body, right.body);
    case "pi": return right.tag === "pi" && sameTermModuloBinderInfo(left.domain, right.domain) && sameTermModuloBinderInfo(left.body, right.body);
    case "let": return right.tag === "let" && left.nondep === right.nondep && sameTermModuloBinderInfo(left.type, right.type) && sameTermModuloBinderInfo(left.value, right.value) && sameTermModuloBinderInfo(left.body, right.body);
    case "proj": return right.tag === "proj" && left.typeName === right.typeName && left.index === right.index && sameTermModuloBinderInfo(left.expr, right.expr);
  }
}

function peelLambdas(term: Term, count: number): Term | undefined {
  let cursor = term;
  for (let i = 0; i < count; i++) {
    if (cursor.tag !== "lam") return undefined;
    cursor = cursor.body;
  }
  return cursor;
}

function piDomainAt(term: Term, index: number): Term | undefined {
  let cursor = term;
  for (let i = 0; i <= index; i++) {
    if (cursor.tag !== "pi") return undefined;
    if (i === index) return cursor.domain;
    cursor = cursor.body;
  }
  return undefined;
}

function piBinderCount(term: Term): number {
  let cursor = term;
  let count = 0;
  while (cursor.tag === "pi") {
    count++;
    cursor = cursor.body;
  }
  return count;
}

function validateRecursorRuleMinorHeadInvariant(
  recType: Term,
  recName: string,
  numParams: number,
  numMotives: number,
  numMinors: number,
  ruleIndex: number,
  nfields: number,
  rhs: Term,
  ctorName: string,
  line: number,
): void {
  const expectedPrefix = numParams + numMotives + numMinors + nfields;
  const body = peelLambdas(rhs, expectedPrefix);
  if (!body) {
    throw new ArenaSemanticRejectionError(`line ${line}.inductive ${recName} rule for ${ctorName} does not abstract the expected recursor prefix and constructor fields`);
  }
  const minorDomain = piDomainAt(recType, numParams + numMotives + ruleIndex);
  if (!minorDomain) {
    throw new ArenaSemanticRejectionError(`line ${line}.inductive ${recName} rule for ${ctorName} references missing minor premise ${ruleIndex}`);
  }
  const expectedArgCount = piBinderCount(minorDomain);
  const actualArgCount = getAppArgs(body).length;
  if (actualArgCount !== expectedArgCount) {
    throw new ArenaSemanticRejectionError(`line ${line}.inductive ${recName} rule for ${ctorName} applies its minor premise to ${actualArgCount} arguments, but the exported minor premise expects ${expectedArgCount}`);
  }
  const expectedMinorHead = nfields + (numMinors - 1 - ruleIndex);
  const head = getAppFn(body);
  if (head.tag !== "bvar" || head.index !== expectedMinorHead) {
    throw new ArenaSemanticRejectionError(`line ${line}.inductive ${recName} rule for ${ctorName} has malformed recursor rule RHS: expected minor premise ${ruleIndex} at de Bruijn index ${expectedMinorHead}`);
  }
}

function firstProjectionWithUnknownTarget(term: Term, knownInductiveNames: ReadonlySet<string>): { typeName: string; index: number } | undefined {
  switch (term.tag) {
    case "proj":
      if (!knownInductiveNames.has(term.typeName)) return { typeName: term.typeName, index: term.index };
      return firstProjectionWithUnknownTarget(term.expr, knownInductiveNames);
    case "app":
      return firstProjectionWithUnknownTarget(term.fn, knownInductiveNames) ?? firstProjectionWithUnknownTarget(term.arg, knownInductiveNames);
    case "lam":
    case "pi":
      return firstProjectionWithUnknownTarget(term.domain, knownInductiveNames) ?? firstProjectionWithUnknownTarget(term.body, knownInductiveNames);
    case "let":
      return firstProjectionWithUnknownTarget(term.type, knownInductiveNames) ?? firstProjectionWithUnknownTarget(term.value, knownInductiveNames) ?? firstProjectionWithUnknownTarget(term.body, knownInductiveNames);
    case "sort":
    case "const":
    case "bvar":
    case "lit":
      return undefined;
  }
}

function rejectNestedUnknownProjectionIfPresent(
  names: Map<number, string>,
  exprs: Map<number, Term>,
  ctors: JsonObject[],
  line: number,
  familyName: string,
  knownInductiveNames: ReadonlySet<string>,
): void {
  for (const [i, ctorRec] of ctors.entries()) {
    const ctorType = exprAt(exprs, ctorRec.type, `line ${line}.inductive.ctors[${i}].type`);
    const unknown = firstProjectionWithUnknownTarget(ctorType, knownInductiveNames);
    if (unknown) {
      throw new ArenaMalformedInputError(`${familyName} nested inductive constructor contains projection ${unknown.typeName}.${unknown.index} whose target is not an already validated inductive family; nested-inductive parameters must still be type-checked`);
    }
  }
}

interface NestedRecursorRuleShape {
  recIndex: number;
  ruleIndex: number;
  globalRuleIndex: number;
  recName: string;
  ctorName: string;
  nfields: number;
  rhs: Term;
}

interface NestedRecursorShape {
  recIndex: number;
  recName: string;
  type: Term;
  numParams: number;
  numMotives: number;
  numMinors: number;
  rules: NestedRecursorRuleShape[];
}

interface KnownConstructorInfo {
  familyName: string;
  nfields: number;
}

function nestedRecursorSuffix(name: string): number {
  const match = /\.rec_(\d+)$/.exec(name);
  return match ? Number(match[1]) : 0;
}

function validateNestedRecursorRuleMinorShape(
  nested: readonly NestedRecursorShape[],
  line: number,
): void {
  const totalRules = nested.reduce((count, rec) => count + rec.rules.length, 0);
  for (const rec of nested) {
    if (rec.numMinors !== totalRules) {
      throw new ArenaSemanticRejectionError(`line ${line}.inductive.recs[${rec.recIndex}].numMinors must equal total nested recursor rule count ${totalRules}`);
    }
    const recursorPrefixBinders = rec.numParams + rec.numMotives + rec.numMinors;
    for (const rule of rec.rules) {
      const body = peelLambdas(rule.rhs, recursorPrefixBinders + rule.nfields);
      if (!body) {
        throw new ArenaSemanticRejectionError(`line ${line}.inductive.recs[${rule.recIndex}].rules[${rule.ruleIndex}].rhs for ${rule.ctorName} does not abstract the expected nested recursor prefix and constructor fields`);
      }
      const minorDomain = piDomainAt(rec.type, rec.numParams + rec.numMotives + rule.globalRuleIndex);
      if (!minorDomain) {
        throw new ArenaSemanticRejectionError(`line ${line}.inductive.recs[${rule.recIndex}].type for ${rule.recName} does not contain nested minor premise ${rule.globalRuleIndex} for ${rule.ctorName}`);
      }
      const expectedMinorArgs = piBinderCount(minorDomain);
      const actualMinorArgs = getAppArgs(body).length;
      if (actualMinorArgs !== expectedMinorArgs) {
        throw new ArenaSemanticRejectionError(`line ${line}.inductive.recs[${rule.recIndex}].rules[${rule.ruleIndex}].rhs nested recursor rule for ${rule.ctorName} has argument count ${actualMinorArgs}, but exported nested minor premise ${rule.globalRuleIndex} expects ${expectedMinorArgs}; missing or extra nested induction arguments would make recursor reduction unsound`);
      }
      const expectedMinorIndex = rule.nfields + (rec.numMinors - 1 - rule.globalRuleIndex);
      const head = getAppFn(body);
      if (head.tag !== "bvar" || head.index !== expectedMinorIndex) {
        throw new ArenaSemanticRejectionError(`line ${line}.inductive.recs[${rule.recIndex}].rules[${rule.ruleIndex}].rhs nested recursor rule for ${rule.ctorName} does not match independently generated Lean-style nested rule: expected nested minor premise ${rule.globalRuleIndex} at de Bruijn index ${expectedMinorIndex}`);
      }
    }
  }
}

function validateNestedRecursorPreflight(
  names: Map<number, string>,
  exprs: Map<number, Term>,
  types: readonly JsonObject[],
  ctors: readonly JsonObject[],
  recs: readonly JsonObject[],
  line: number,
  knownConstructors: ReadonlyMap<string, KnownConstructorInfo>,
  knownFamilyConstructors: ReadonlyMap<string, ReadonlySet<string>>,
): { familyName: string; numNested: number; helperRecursors: string[]; totalRules: number } {
  if (types.length !== 1) throw new ArenaUnsupportedFeatureError("inductive.nested.mutual", "nested mutual inductive imports are outside arena-inductive-importer0");
  const typeRec = types[0];
  const indNameId = expectInt(typeRec.name, `line ${line}.inductive.types[0].name`);
  const familyName = declName(names, indNameId, `line ${line}.inductive.types[0].name`);
  const numNested = expectNonnegativeInt(typeRec.numNested, `line ${line}.inductive.types[0].numNested`);
  if (numNested <= 0) throw new ArenaMalformedInputError(`line ${line}.inductive.types[0].numNested must be positive for nested preflight`);

  const typeCtorIds = new Set(expectArray(typeRec.ctors, `line ${line}.inductive.types[0].ctors`).map((entry, i) => expectInt(entry, `line ${line}.inductive.types[0].ctors[${i}]`)));
  const currentCtorNames = new Set<string>();
  const currentCtorFieldCounts = new Map<string, number>();
  for (const [i, ctorRec] of ctors.entries()) {
    if (expectBool(ctorRec.isUnsafe, `line ${line}.inductive.ctors[${i}].isUnsafe`)) throw new ArenaUnsupportedFeatureError("inductive.ctor.unsafe", "unsafe nested-inductive constructors are outside arena-inductive-importer0");
    const ctorNameId = expectInt(ctorRec.name, `line ${line}.inductive.ctors[${i}].name`);
    if (!typeCtorIds.has(ctorNameId)) throw new ArenaMalformedInputError(`line ${line}.inductive.ctors[${i}] is not listed by the nested inductive type`);
    const induct = expectInt(ctorRec.induct, `line ${line}.inductive.ctors[${i}].induct`);
    if (induct !== indNameId) throw new ArenaMalformedInputError(`line ${line}.inductive.ctors[${i}].induct does not match the nested inductive type`);
    const ctorName = declName(names, ctorNameId, `line ${line}.inductive.ctors[${i}].name`);
    currentCtorNames.add(ctorName);
    currentCtorFieldCounts.set(ctorName, expectNonnegativeInt(ctorRec.numFields, `line ${line}.inductive.ctors[${i}].numFields`));
    exprAt(exprs, ctorRec.type, `line ${line}.inductive.ctors[${i}].type`);
  }
  if (currentCtorNames.size !== typeCtorIds.size) throw new ArenaMalformedInputError(`line ${line}.inductive.types[0].ctors does not match nested constructor records`);

  if (recs.length !== numNested + 1) {
    throw new ArenaMalformedInputError(`line ${line}.inductive.recs for nested ${familyName} must contain the outer recursor plus ${numNested} helper recursors, got ${recs.length}`);
  }
  const expectedRecNames = new Set<string>([`${familyName}.rec`]);
  for (let i = 1; i <= numNested; i++) expectedRecNames.add(`${familyName}.rec_${i}`);

  const seenRecNames = new Set<string>();
  const helperRecursors: string[] = [];
  const shapes: NestedRecursorShape[] = [];
  const helperTargetFamilies = new Map<string, Set<string>>();
  const helperTargetConstructors = new Map<string, Set<string>>();
  let totalRules = 0;
  for (const [i, rec] of recs.entries()) {
    if (expectBool(rec.isUnsafe, `line ${line}.inductive.recs[${i}].isUnsafe`)) throw new ArenaUnsupportedFeatureError("inductive.rec.unsafe", "unsafe nested-inductive recursors are outside arena-inductive-importer0");
    const recName = declName(names, rec.name, `line ${line}.inductive.recs[${i}].name`);
    if (!expectedRecNames.has(recName)) throw new ArenaMalformedInputError(`line ${line}.inductive.recs[${i}].name ${recName} is not an expected Lean nested recursor for ${familyName}`);
    if (seenRecNames.has(recName)) throw new ArenaMalformedInputError(`line ${line}.inductive.recs duplicates nested recursor ${recName}`);
    seenRecNames.add(recName);
    if (recName !== `${familyName}.rec`) helperRecursors.push(recName);
    const numParams = expectNonnegativeInt(rec.numParams, `line ${line}.inductive.recs[${i}].numParams`);
    if (numParams !== expectNonnegativeInt(typeRec.numParams, `line ${line}.inductive.types[0].numParams`)) throw new ArenaMalformedInputError(`line ${line}.inductive.recs[${i}].numParams does not match nested inductive numParams`);
    const numIndices = expectNonnegativeInt(rec.numIndices, `line ${line}.inductive.recs[${i}].numIndices`);
    if (numIndices !== expectNonnegativeInt(typeRec.numIndices, `line ${line}.inductive.types[0].numIndices`)) throw new ArenaMalformedInputError(`line ${line}.inductive.recs[${i}].numIndices does not match nested inductive numIndices`);
    const numMotives = expectNonnegativeInt(rec.numMotives, `line ${line}.inductive.recs[${i}].numMotives`);
    if (numMotives !== numNested + 1) throw new ArenaMalformedInputError(`line ${line}.inductive.recs[${i}].numMotives must equal outer motive plus ${numNested} nested helper motives`);
    const numMinors = expectNonnegativeInt(rec.numMinors, `line ${line}.inductive.recs[${i}].numMinors`);
    const all = expectArray(rec.all, `line ${line}.inductive.recs[${i}].all`).map((entry, j) => declName(names, entry, `line ${line}.inductive.recs[${i}].all[${j}]`));
    if (all.length !== 1 || all[0] !== familyName) throw new ArenaMalformedInputError(`line ${line}.inductive.recs[${i}].all must contain only ${familyName} for this nested preflight slice`);
    const recType = exprAt(exprs, rec.type, `line ${line}.inductive.recs[${i}].type`);
    const rules = expectArray(rec.rules, `line ${line}.inductive.recs[${i}].rules`);
    const ruleShapes: NestedRecursorRuleShape[] = [];
    shapes.push({ recIndex: i, recName, type: recType, numParams, numMotives, numMinors, rules: ruleShapes });
    totalRules += rules.length;
    if (recName === `${familyName}.rec`) {
      if (rules.length !== currentCtorNames.size) throw new ArenaMalformedInputError(`line ${line}.inductive.recs[${i}].rules must cover exactly the constructors of ${familyName}`);
    }
    for (const [j, ruleRaw] of rules.entries()) {
      const rule = expectObject(ruleRaw, `line ${line}.inductive.recs[${i}].rules[${j}]`);
      const ctorName = declName(names, rule.ctor, `line ${line}.inductive.recs[${i}].rules[${j}].ctor`);
      const nfields = expectNonnegativeInt(rule.nfields, `line ${line}.inductive.recs[${i}].rules[${j}].nfields`);
      const rhs = exprAt(exprs, rule.rhs, `line ${line}.inductive.recs[${i}].rules[${j}].rhs`);
      ruleShapes.push({ recIndex: i, ruleIndex: j, globalRuleIndex: -1, recName, ctorName, nfields, rhs });
      if (recName === `${familyName}.rec`) {
        const expected = currentCtorFieldCounts.get(ctorName);
        if (expected === undefined) throw new ArenaMalformedInputError(`line ${line}.inductive.recs[${i}].rules[${j}].ctor ${ctorName} is not a constructor of ${familyName}`);
        if (nfields !== expected) throw new ArenaMalformedInputError(`line ${line}.inductive.recs[${i}].rules[${j}].nfields for ${ctorName} does not match constructor field count`);
      } else {
        const known = knownConstructors.get(ctorName);
        if (!known) {
          throw new ArenaMalformedInputError(`line ${line}.inductive.recs[${i}].rules[${j}].ctor ${ctorName} is not an already validated container constructor for nested recursor ${recName}`);
        }
        if (nfields !== known.nfields) {
          throw new ArenaMalformedInputError(`line ${line}.inductive.recs[${i}].rules[${j}].nfields ${nfields} for ${ctorName} does not match validated constructor field count ${known.nfields}`);
        }
        const families = helperTargetFamilies.get(recName) ?? new Set<string>();
        families.add(known.familyName);
        helperTargetFamilies.set(recName, families);
        const constructors = helperTargetConstructors.get(recName) ?? new Set<string>();
        if (constructors.has(ctorName)) {
          throw new ArenaMalformedInputError(`line ${line}.inductive.recs[${i}].rules duplicate nested helper target constructor ${ctorName}`);
        }
        constructors.add(ctorName);
        helperTargetConstructors.set(recName, constructors);
      }
    }
  }
  if (seenRecNames.size !== expectedRecNames.size) throw new ArenaMalformedInputError(`line ${line}.inductive.recs does not contain the expected nested recursor set for ${familyName}`);
  for (const helperName of helperRecursors) {
    const families = helperTargetFamilies.get(helperName) ?? new Set<string>();
    if (families.size !== 1) {
      throw new ArenaMalformedInputError(`line ${line}.inductive nested helper recursor ${helperName} targets multiple constructor families or none: ${[...families].join(", ")}`);
    }
    const targetFamily = [...families][0];
    const expectedConstructors = knownFamilyConstructors.get(targetFamily);
    if (!expectedConstructors) {
      throw new ArenaMalformedInputError(`line ${line}.inductive nested helper recursor ${helperName} targets ${targetFamily}, but the target family constructor set is unavailable`);
    }
    const actualConstructors = helperTargetConstructors.get(helperName) ?? new Set<string>();
    const missing = [...expectedConstructors].filter(name => !actualConstructors.has(name));
    const extra = [...actualConstructors].filter(name => !expectedConstructors.has(name));
    if (missing.length !== 0 || extra.length !== 0 || actualConstructors.size !== expectedConstructors.size) {
      throw new ArenaMalformedInputError(`line ${line}.inductive nested helper recursor ${helperName} does not cover all constructors of target family ${targetFamily}; missing=[${missing.join(", ")}], extra=[${extra.join(", ")}]`);
    }
  }
  helperRecursors.sort((a, b) => nestedRecursorSuffix(a) - nestedRecursorSuffix(b));
  let globalRuleIndex = 0;
  for (const recName of [`${familyName}.rec`, ...helperRecursors]) {
    const shape = shapes.find(candidate => candidate.recName === recName);
    if (!shape) throw new ArenaMalformedInputError(`line ${line}.inductive.recs is missing nested recursor shape for ${recName}`);
    for (const rule of shape.rules) rule.globalRuleIndex = globalRuleIndex++;
  }
  if (globalRuleIndex !== totalRules) throw new ArenaMalformedInputError(`line ${line}.inductive.recs nested minor ordering accounted for ${globalRuleIndex} rules, expected ${totalRules}`);
  validateNestedRecursorRuleMinorShape(shapes, line);
  return { familyName, numNested, helperRecursors, totalRules };
}

function constructorCodomainLocal(type: Term): Term {
  let cursor = type;
  while (cursor.tag === "pi") cursor = cursor.body;
  return cursor;
}

function transparentNormalizeForArenaResultSort(
  term: Term,
  knownDefinitions: ReadonlyMap<string, RecursorKnownDefinition>,
  fuel = 64,
): Term {
  if (fuel <= 0) return term;
  switch (term.tag) {
    case "sort":
    case "bvar":
    case "lit": return term;
    case "const": {
      const known = knownDefinitions.get(term.name);
      if (!known) return term;
      const unfolded = instantiateTermLevels(known.value, known.levelParams, term.levels);
      return transparentNormalizeForArenaResultSort(unfolded, knownDefinitions, fuel - 1);
    }
    case "app": {
      const fn = transparentNormalizeForArenaResultSort(term.fn, knownDefinitions, fuel - 1);
      const arg = transparentNormalizeForArenaResultSort(term.arg, knownDefinitions, fuel - 1);
      if (fn.tag === "lam") return transparentNormalizeForArenaResultSort(instantiate(fn.body, arg), knownDefinitions, fuel - 1);
      return { tag: "app", fn, arg };
    }
    case "let": return transparentNormalizeForArenaResultSort(instantiate(term.body, term.value), knownDefinitions, fuel - 1);
    case "lam": return { tag: "lam", domain: transparentNormalizeForArenaResultSort(term.domain, knownDefinitions, fuel - 1), body: transparentNormalizeForArenaResultSort(term.body, knownDefinitions, fuel - 1), binderInfo: term.binderInfo };
    case "pi": return { tag: "pi", domain: transparentNormalizeForArenaResultSort(term.domain, knownDefinitions, fuel - 1), body: transparentNormalizeForArenaResultSort(term.body, knownDefinitions, fuel - 1), binderInfo: term.binderInfo };
    case "proj": return { tag: "proj", typeName: term.typeName, index: term.index, expr: transparentNormalizeForArenaResultSort(term.expr, knownDefinitions, fuel - 1) };
  }
}

function stuckRecursorResultSortHead(
  type: Term,
  knownDefinitions: ReadonlyMap<string, RecursorKnownDefinition>,
): { head: string; via: "raw" | "transparent" } | undefined {
  const result = constructorCodomainLocal(type);
  if (result.tag === "sort") return undefined;
  const rawHead = getAppFn(result);
  if (rawHead.tag === "const" && rawHead.name.endsWith(".rec")) return { head: rawHead.name, via: "raw" };
  const normalized = transparentNormalizeForArenaResultSort(result, knownDefinitions);
  if (normalized.tag === "sort") return undefined;
  const normalizedHead = getAppFn(normalized);
  return normalizedHead.tag === "const" && normalizedHead.name.endsWith(".rec") ? { head: normalizedHead.name, via: "transparent" } : undefined;
}

function isMaybePropImaxSort(type: Term): boolean {
  return type.tag === "sort" && type.level.tag === "imax" && levelDefEqList([type.level.right], [LevelZero]);
}

function rejectUnsupportedMutualIfItIsKnownImaxPropHazard(types: readonly JsonObject[], line: number): void {
  for (const [i, typeRec] of types.entries()) {
    const type = typeRec.__translatedType as Term | undefined;
    if (type && isMaybePropImaxSort(type)) {
      throw new ArenaSemanticRejectionError(`line ${line}.inductive.types[${i}] has imax result universe that may be Prop for some level assignments; projections from this mutual block are rejected until the importer can prove every projected field is Prop at Prop instantiations`);
    }
  }
}

function isLeanAnnotationWrapper(name: string): boolean {
  return name === "outParam" || name === "semiOutParam" || name === "optParam";
}

function eraseLeanAnnotationWrappers(term: Term): Term {
  switch (term.tag) {
    case "sort":
    case "bvar":
    case "lit": return term;
    case "const": return term;
    case "app": {
      const fn = eraseLeanAnnotationWrappers(term.fn);
      const arg = eraseLeanAnnotationWrappers(term.arg);
      const normalized = { tag: "app" as const, fn, arg };
      const head = getAppFn(normalized);
      if (head.tag === "const" && isLeanAnnotationWrapper(head.name)) {
        const args = getAppArgs(normalized);
        if (head.name === "optParam" && args.length >= 1) return args[0];
        if ((head.name === "outParam" || head.name === "semiOutParam") && args.length >= 1) return args[0];
      }
      return normalized;
    }
    case "lam": return { tag: "lam", domain: eraseLeanAnnotationWrappers(term.domain), body: eraseLeanAnnotationWrappers(term.body), binderInfo: term.binderInfo };
    case "pi": return { tag: "pi", domain: eraseLeanAnnotationWrappers(term.domain), body: eraseLeanAnnotationWrappers(term.body), binderInfo: term.binderInfo };
    case "let": return { tag: "let", type: eraseLeanAnnotationWrappers(term.type), value: eraseLeanAnnotationWrappers(term.value), body: eraseLeanAnnotationWrappers(term.body), nondep: term.nondep };
    case "proj": return { tag: "proj", typeName: term.typeName, index: term.index, expr: eraseLeanAnnotationWrappers(term.expr) };
  }
}

function sameTermModuloBinderInfoAndLeanAnnotations(left: Term, right: Term): boolean {
  return sameTermModuloBinderInfo(eraseLeanAnnotationWrappers(left), eraseLeanAnnotationWrappers(right));
}

function translateNonMutualInductive(names: Map<number, string>, exprs: Map<number, Term>, raw: unknown, line: number, knownPropFamilyArities: ReadonlyMap<string, number>, knownDefinitions: ReadonlyMap<string, RecursorKnownDefinition>, knownInductiveNames: ReadonlySet<string>, knownConstructors: ReadonlyMap<string, KnownConstructorInfo>, knownFamilyConstructors: ReadonlyMap<string, ReadonlySet<string>>): Extract<CoreDeclaration, { kind: "inductive" }> {
  const value = expectObject(raw, `line ${line}.inductive`);
  const types = expectArray(value.types, `line ${line}.inductive.types`).map((entry, i) => expectObject(entry, `line ${line}.inductive.types[${i}]`));
  const ctors = expectArray(value.ctors, `line ${line}.inductive.ctors`).map((entry, i) => expectObject(entry, `line ${line}.inductive.ctors[${i}]`));
  const recs = expectArray(value.recs, `line ${line}.inductive.recs`).map((entry, i) => expectObject(entry, `line ${line}.inductive.recs[${i}]`));
  for (const [i, typeRec] of types.entries()) {
    Object.defineProperty(typeRec, "__translatedType", { value: exprAt(exprs, typeRec.type, `line ${line}.inductive.types[${i}].type`), enumerable: false });
  }
  if (types.length !== 1) {
    rejectUnsupportedMutualIfItIsKnownImaxPropHazard(types, line);
    throw new ArenaUnsupportedFeatureError("inductive.mutual", `mutual inductive blocks with ${types.length} types are outside arena-inductive-importer0`);
  }
  const typeRec = types[0];
  if (expectBool(typeRec.isUnsafe, `line ${line}.inductive.types[0].isUnsafe`)) throw new ArenaUnsupportedFeatureError("inductive.unsafe", "unsafe inductive types are outside arena-inductive-importer0");
  const indNameId = expectInt(typeRec.name, `line ${line}.inductive.types[0].name`);
  const name = declName(names, indNameId, `line ${line}.inductive.types[0].name`);
  if (expectNonnegativeInt(typeRec.numNested, `line ${line}.inductive.types[0].numNested`) !== 0) {
    rejectNestedUnknownProjectionIfPresent(names, exprs, ctors, line, name, new Set([...knownInductiveNames, name]));
    const nested = validateNestedRecursorPreflight(names, exprs, types, ctors, recs, line, knownConstructors, knownFamilyConstructors);
    throw new ArenaUnsupportedFeatureError("inductive.nested.helper-iota", `validated nested recursor topology for ${nested.familyName} (${nested.numNested} helper families: ${nested.helperRecursors.join(", ")}; ${nested.totalRules} rules), but helper recursor derivation/iota is not implemented in arena-inductive-importer0`);
  }
  const levelParams = levelParamNames(names, typeRec.levelParams, `line ${line}.inductive.types[0].levelParams`);
  const decl: Extract<CoreDeclaration, { kind: "inductive" }> = {
    kind: "inductive",
    name,
    levelParams,
    type: exprAt(exprs, typeRec.type, `line ${line}.inductive.types[0].type`),
    numParams: expectNonnegativeInt(typeRec.numParams, `line ${line}.inductive.types[0].numParams`),
    numIndices: expectNonnegativeInt(typeRec.numIndices, `line ${line}.inductive.types[0].numIndices`),
    constructors: [],
  };
  const stuckResultSortRecursor = stuckRecursorResultSortHead(decl.type, knownDefinitions);
  if (stuckResultSortRecursor) {
    const via = stuckResultSortRecursor.via === "transparent" ? "transparently unfolded " : "";
    throw new ArenaSemanticRejectionError(`${decl.name} has a ${via}stuck recursor result sort headed by ${stuckResultSortRecursor.head}`);
  }
  const typeCtorIds = new Set(expectArray(typeRec.ctors, `line ${line}.inductive.types[0].ctors`).map((entry, i) => expectInt(entry, `line ${line}.inductive.types[0].ctors[${i}]`)));
  for (const [i, ctorRec] of ctors.entries()) {
    if (expectBool(ctorRec.isUnsafe, `line ${line}.inductive.ctors[${i}].isUnsafe`)) throw new ArenaUnsupportedFeatureError("inductive.ctor.unsafe", "unsafe inductive constructors are outside arena-inductive-importer0");
    const ctorNameId = expectInt(ctorRec.name, `line ${line}.inductive.ctors[${i}].name`);
    if (!typeCtorIds.has(ctorNameId)) throw new ArenaMalformedInputError(`line ${line}.inductive.ctors[${i}] is not listed by the inductive type`);
    const induct = expectInt(ctorRec.induct, `line ${line}.inductive.ctors[${i}].induct`);
    if (induct !== indNameId) throw new ArenaMalformedInputError(`line ${line}.inductive.ctors[${i}].induct does not match the single inductive type`);
    const ctorLevelParams = levelParamNames(names, ctorRec.levelParams, `line ${line}.inductive.ctors[${i}].levelParams`);
    if (ctorLevelParams.length !== levelParams.length || ctorLevelParams.some((p, j) => p !== levelParams[j])) throw new ArenaUnsupportedFeatureError("inductive.ctor.levelParams", "constructor-specific level parameter shapes are outside arena-inductive-importer0");
    const ctorNumParams = expectNonnegativeInt(ctorRec.numParams, `line ${line}.inductive.ctors[${i}].numParams`);
    if (ctorNumParams !== decl.numParams) throw new ArenaMalformedInputError(`line ${line}.inductive.ctors[${i}].numParams does not match inductive numParams`);
    decl.constructors.push({ name: declName(names, ctorNameId, `line ${line}.inductive.ctors[${i}].name`), type: exprAt(exprs, ctorRec.type, `line ${line}.inductive.ctors[${i}].type`) });
  }
  if (decl.constructors.length !== typeCtorIds.size) throw new ArenaMalformedInputError(`line ${line}.inductive.types[0].ctors does not match constructor records`);
  if (recs.length === 0) throw new ArenaMalformedInputError(`line ${line}.inductive.recs is empty; a valid non-mutual inductive export must include its recursor`);
  if (recs.length !== 1) {
    throw new ArenaMalformedInputError(`line ${line}.inductive.recs must contain exactly one recursor for a supported single non-mutual inductive export, got ${recs.length}`);
  }
  const rec = recs[0];
  if (expectBool(rec.isUnsafe, `line ${line}.inductive.recs[0].isUnsafe`)) throw new ArenaUnsupportedFeatureError("inductive.rec.unsafe", "unsafe recursors are outside arena-inductive-importer0");
  const expectedRecName = `${decl.name}.rec`;
  const recName = declName(names, rec.name, `line ${line}.inductive.recs[0].name`);
  if (recName !== expectedRecName) throw new ArenaMalformedInputError(`line ${line}.inductive.recs[0].name must be ${expectedRecName}`);
  const recLevelParams = levelParamNames(names, rec.levelParams, `line ${line}.inductive.recs[0].levelParams`);
  const recNumParams = expectNonnegativeInt(rec.numParams, `line ${line}.inductive.recs[0].numParams`);
  const recNumIndices = expectNonnegativeInt(rec.numIndices, `line ${line}.inductive.recs[0].numIndices`);
  const recNumMotives = expectNonnegativeInt(rec.numMotives, `line ${line}.inductive.recs[0].numMotives`);
  const recNumMinors = expectNonnegativeInt(rec.numMinors, `line ${line}.inductive.recs[0].numMinors`);
  if (recNumParams !== decl.numParams) throw new ArenaMalformedInputError(`line ${line}.inductive.recs[0].numParams does not match inductive numParams`);
  if (recNumIndices !== decl.numIndices) throw new ArenaMalformedInputError(`line ${line}.inductive.recs[0].numIndices does not match inductive numIndices`);
  if (recNumMotives !== 1) throw new ArenaMalformedInputError(`line ${line}.inductive.recs[0].numMotives must be 1 for a valid non-mutual inductive export`);
  if (recNumMinors !== decl.constructors.length) throw new ArenaMalformedInputError(`line ${line}.inductive.recs[0].numMinors does not match constructor count`);
  const rules = expectArray(rec.rules, `line ${line}.inductive.recs[0].rules`);
  if (rules.length !== decl.constructors.length) throw new ArenaMalformedInputError(`line ${line}.inductive.recs[0].rules does not match constructor count`);
  for (const [i, ruleRaw] of rules.entries()) {
    const rule = expectObject(ruleRaw, `line ${line}.inductive.recs[0].rules[${i}]`);
    const ctorName = declName(names, rule.ctor, `line ${line}.inductive.recs[0].rules[${i}].ctor`);
    const ctor = decl.constructors.find(c => c.name === ctorName);
    if (!ctor) throw new ArenaMalformedInputError(`line ${line}.inductive.recs[0].rules[${i}].ctor is not a constructor of ${decl.name}`);
    const exportedNFields = expectNonnegativeInt(rule.nfields, `line ${line}.inductive.recs[0].rules[${i}].nfields`);
    const recorded = expectObject(ctorRecShape(ctor.type, decl.numParams), `line ${line}.inductive.recs[0].rules[${i}].derived`);
    if (exportedNFields !== recorded.nfields) throw new ArenaMalformedInputError(`line ${line}.inductive.recs[0].rules[${i}].nfields does not match constructor field count`);
  }
  const exportedRecType = exprAt(exprs, rec.type, `line ${line}.inductive.recs[0].type`);
  // Validate the exported recursor rules against the exported recursor telescope
  // before independently synthesizing the recursor type. Some adversarial Arena
  // inputs deliberately make independent synthesis fail while the bogus exported
  // rule is already structurally malformed (for example, a recursive constructor
  // rule that drops an induction-hypothesis argument). Rejecting that trusted
  // metadata as malformed is safer than declining it as merely unsupported.
  for (const [i, ruleRaw] of rules.entries()) {
    const rule = expectObject(ruleRaw, `line ${line}.inductive.recs[0].rules[${i}]`);
    const ctorName = declName(names, rule.ctor, `line ${line}.inductive.recs[0].rules[${i}].ctor`);
    const exportedNFields = expectNonnegativeInt(rule.nfields, `line ${line}.inductive.recs[0].rules[${i}].nfields`);
    const rhs = exprAt(exprs, rule.rhs, `line ${line}.inductive.recs[0].rules[${i}].rhs`);
    validateRecursorRuleMinorHeadInvariant(exportedRecType, recName, recNumParams, recNumMotives, recNumMinors, i, exportedNFields, rhs, ctorName, line);
  }
  const generatedRec = declarationToConstantInfo(decl, { allowRecursorFamilyBinderInfo: true, knownPropFamilyArities, knownDefinitions }).find(info => info.kind === "recInfo" && info.name === expectedRecName);
  if (!generatedRec || generatedRec.kind !== "recInfo" || !generatedRec.type) throw new ArenaUnsupportedFeatureError("inductive.rec.synthesis", `could not synthesize recursor type for ${decl.name}`);
  if (recLevelParams.length !== generatedRec.levelParams.length) {
    throw new ArenaSemanticRejectionError(`recursor universe-parameter arity for ${decl.name} does not match independently derived recursor: exported ${recLevelParams.length}, derived ${generatedRec.levelParams.length}`);
  }
  const recLevelRename = new Map<string, string>();
  for (let i = 0; i < generatedRec.levelParams.length; i++) recLevelRename.set(generatedRec.levelParams[i], recLevelParams[i]);
  const generatedRecType = renameTermLevelParams(generatedRec.type, recLevelRename);
  if (!sameTerm(generatedRecType, exportedRecType) && !sameTermModuloBinderInfo(generatedRecType, exportedRecType) && !sameTermModuloBinderInfoAndLeanAnnotations(generatedRecType, exportedRecType)) {
    throw new ArenaUnsupportedFeatureError("inductive.rec.type", `derived recursor type for ${decl.name} is outside arena-inductive-importer0's exact validator`);
  }
  return decl;
}

function ctorRecShape(type: Term, numParams: number): { nfields: number } {
  let cursor = type;
  let domains = 0;
  while (cursor.tag === "pi") { domains++; cursor = cursor.body; }
  return { nfields: Math.max(0, domains - numParams) };
}

function propositionFamilyArity(type: Term): number | undefined {
  let cursor = type;
  let arity = 0;
  while (cursor.tag === "pi") {
    arity++;
    cursor = cursor.body;
  }
  return cursor.tag === "sort" && levelDefEqList([cursor.level], [LevelZero]) ? arity : undefined;
}

function rememberPropFamily(known: Map<string, number>, decl: CoreDeclaration): void {
  if (!("type" in decl)) return;
  const arity = propositionFamilyArity(decl.type);
  if (arity !== undefined) known.set(decl.name, arity);
}

function detectKind(obj: JsonObject): string | undefined {
  const kinds = ["meta", "str", "num", "succ", "max", "imax", "param", "bvar", "sort", "const", "app", "lam", "forallE", "letE", "proj", "natVal", "strVal", "mdata", "axiom", "def", "thm", "opaque", "quot", "inductive"];
  return kinds.find((kind) => own(obj, kind));
}

export function translateLean4ExportNdjson(records: NdjsonRecord[]): ArenaTranslation {
  const names = new Map<number, string>([[0, ""]]);
  const levels = new Map<number, Level>([[0, LevelZero]]);
  const exprs = new Map<number, Term>();
  const declarations: CoreDeclaration[] = [];
  let quotientPrimitiveInstalled = false;
  const knownPropFamilyArities = new Map<string, number>();
  const knownDefinitions = new Map<string, RecursorKnownDefinition>();
  const knownInductiveNames = new Set<string>();
  const knownConstructors = new Map<string, KnownConstructorInfo>();
  const knownFamilyConstructors = new Map<string, Set<string>>();

  for (const record of records) {
    const obj = expectObject(record.value, `line ${record.line}`);
    const kind = detectKind(obj);
    if (kind === undefined) throw new ArenaMalformedInputError(`line ${record.line} has no recognized lean4export record kind`);

    switch (kind) {
      case "meta": {
        const meta = expectObject(obj.meta, `line ${record.line}.meta`);
        const format = expectObject(meta.format, `line ${record.line}.meta.format`);
        const version = expectString(format.version, `line ${record.line}.meta.format.version`);
        if (version !== "3.1.0") throw new ArenaUnsupportedFeatureError("meta.format", `unsupported lean4export format ${version}; expected 3.1.0`);
        break;
      }
      case "str": {
        const value = expectObject(obj.str, `line ${record.line}.str`);
        const pre = expectInt(value.pre, `line ${record.line}.str.pre`);
        const str = expectString(value.str, `line ${record.line}.str.str`);
        const out = expectInt(obj.in, `line ${record.line}.in`);
        const prefix = names.get(pre);
        if (prefix === undefined) throw new ArenaMalformedInputError(`line ${record.line}.str.pre references unknown name ${pre}`);
        names.set(out, prefix.length === 0 ? str : `${prefix}.${str}`);
        break;
      }
      case "num": {
        const value = expectObject(obj.num, `line ${record.line}.num`);
        const pre = expectInt(value.pre, `line ${record.line}.num.pre`);
        const i = expectInt(value.i, `line ${record.line}.num.i`);
        const out = expectInt(obj.in, `line ${record.line}.in`);
        const prefix = names.get(pre);
        if (prefix === undefined) throw new ArenaMalformedInputError(`line ${record.line}.num.pre references unknown name ${pre}`);
        names.set(out, prefix.length === 0 ? String(i) : `${prefix}.${i}`);
        break;
      }
      case "succ": {
        levels.set(expectInt(obj.il, `line ${record.line}.il`), levelSucc(levelAt(levels, obj.succ, `line ${record.line}.succ`)));
        break;
      }
      case "max":
      case "imax": {
        const args = expectArray(obj[kind], `line ${record.line}.${kind}`);
        if (args.length !== 2) throw new ArenaMalformedInputError(`line ${record.line}.${kind} must have length 2`);
        const left = levelAt(levels, args[0], `line ${record.line}.${kind}[0]`);
        const right = levelAt(levels, args[1], `line ${record.line}.${kind}[1]`);
        levels.set(expectInt(obj.il, `line ${record.line}.il`), kind === "max" ? levelMax(left, right) : levelIMax(left, right));
        break;
      }
      case "param": {
        levels.set(expectInt(obj.il, `line ${record.line}.il`), levelParam(declName(names, obj.param, `line ${record.line}.param`)));
        break;
      }
      case "bvar": {
        exprs.set(expectInt(obj.ie, `line ${record.line}.ie`), { tag: "bvar", index: expectInt(obj.bvar, `line ${record.line}.bvar`) });
        break;
      }
      case "sort": {
        exprs.set(expectInt(obj.ie, `line ${record.line}.ie`), { tag: "sort", level: levelAt(levels, obj.sort, `line ${record.line}.sort`) });
        break;
      }
      case "const": {
        const value = expectObject(obj.const, `line ${record.line}.const`);
        const name = declName(names, value.name, `line ${record.line}.const.name`);
        const us = expectArray(value.us, `line ${record.line}.const.us`).map((entry, i) => levelAt(levels, entry, `line ${record.line}.const.us[${i}]`));
        exprs.set(expectInt(obj.ie, `line ${record.line}.ie`), { tag: "const", name, levels: us });
        break;
      }
      case "app": {
        const value = expectObject(obj.app, `line ${record.line}.app`);
        exprs.set(expectInt(obj.ie, `line ${record.line}.ie`), { tag: "app", fn: exprAt(exprs, value.fn, `line ${record.line}.app.fn`), arg: exprAt(exprs, value.arg, `line ${record.line}.app.arg`) });
        break;
      }
      case "lam":
      case "forallE": {
        const value = expectObject(obj[kind], `line ${record.line}.${kind}`);
        const term = {
          tag: kind === "lam" ? "lam" : "pi",
          domain: exprAt(exprs, value.type, `line ${record.line}.${kind}.type`),
          body: exprAt(exprs, value.body, `line ${record.line}.${kind}.body`),
          binderInfo: binderInfo(value.binderInfo, `line ${record.line}.${kind}.binderInfo`),
        } as Term;
        exprs.set(expectInt(obj.ie, `line ${record.line}.ie`), term);
        break;
      }
      case "letE": {
        const value = expectObject(obj.letE, `line ${record.line}.letE`);
        exprs.set(expectInt(obj.ie, `line ${record.line}.ie`), {
          tag: "let",
          type: exprAt(exprs, value.type, `line ${record.line}.letE.type`),
          value: exprAt(exprs, value.value, `line ${record.line}.letE.value`),
          body: exprAt(exprs, value.body, `line ${record.line}.letE.body`),
          nondep: expectBool(value.nondep, `line ${record.line}.letE.nondep`),
        });
        break;
      }
      case "proj": {
        const value = expectObject(obj.proj, `line ${record.line}.proj`);
        exprs.set(expectInt(obj.ie, `line ${record.line}.ie`), {
          tag: "proj",
          typeName: declName(names, value.typeName, `line ${record.line}.proj.typeName`),
          index: expectInt(value.idx, `line ${record.line}.proj.idx`),
          expr: exprAt(exprs, value.struct, `line ${record.line}.proj.struct`),
        });
        break;
      }
      case "natVal": {
        const raw = typeof obj.natVal === "string" ? Number(obj.natVal) : obj.natVal;
        exprs.set(expectInt(obj.ie, `line ${record.line}.ie`), { tag: "lit", literal: { tag: "nat", value: expectInt(raw, `line ${record.line}.natVal`) } });
        break;
      }
      case "strVal": {
        exprs.set(expectInt(obj.ie, `line ${record.line}.ie`), { tag: "lit", literal: { tag: "str", value: expectString(obj.strVal, `line ${record.line}.strVal`) } });
        break;
      }
      case "mdata": {
        const value = expectObject(obj.mdata, `line ${record.line}.mdata`);
        exprs.set(expectInt(obj.ie, `line ${record.line}.ie`), exprAt(exprs, value.expr, `line ${record.line}.mdata.expr`));
        break;
      }
      case "axiom": {
        const value = expectObject(obj.axiom, `line ${record.line}.axiom`);
        if (expectBool(value.isUnsafe, `line ${record.line}.axiom.isUnsafe`)) throw new ArenaUnsupportedFeatureError("axiom.unsafe", "unsafe axioms are not supported by arena-adapter0");
        const axiomName = declName(names, value.name, `line ${record.line}.axiom.name`);
        // The current ProofScript quotient initializer installs Lean's canonical
        // Quot.sound together with Quot/Quot.mk/Quot.lift/Quot.ind. Arena exports
        // Quot.sound as an axiom after the quot primitive records, so importing it
        // again would be a duplicate rather than a semantic declaration.
        if (quotientPrimitiveInstalled && axiomName === "Quot.sound") break;
        const decl = { kind: "axiom" as const, name: axiomName, levelParams: levelParamNames(names, value.levelParams, `line ${record.line}.axiom.levelParams`), type: exprAt(exprs, value.type, `line ${record.line}.axiom.type`) };
        declarations.push(decl);
        rememberPropFamily(knownPropFamilyArities, decl);
        break;
      }
      case "def": {
        const value = expectObject(obj.def, `line ${record.line}.def`);
        const safety = expectString(value.safety, `line ${record.line}.def.safety`);
        if (safety !== "safe") throw new ArenaSemanticRejectionError(`definition safety ${safety} cannot enter the logical kernel; unsafe/partial declarations must not justify theorems`);
        const hints = parseHints(value.hints, `line ${record.line}.def.hints`);
        const common = { name: declName(names, value.name, `line ${record.line}.def.name`), levelParams: levelParamNames(names, value.levelParams, `line ${record.line}.def.levelParams`), type: exprAt(exprs, value.type, `line ${record.line}.def.type`), value: exprAt(exprs, value.value, `line ${record.line}.def.value`) };
        const decl = { kind: "definition" as const, ...common, reducibility: hints };
        declarations.push(decl);
        rememberPropFamily(knownPropFamilyArities, decl);
        knownDefinitions.set(decl.name, { levelParams: decl.levelParams, value: decl.value });
        break;
      }
      case "thm": {
        const value = expectObject(obj.thm, `line ${record.line}.thm`);
        const decl = { kind: "theorem" as const, name: declName(names, value.name, `line ${record.line}.thm.name`), levelParams: levelParamNames(names, value.levelParams, `line ${record.line}.thm.levelParams`), type: exprAt(exprs, value.type, `line ${record.line}.thm.type`), value: exprAt(exprs, value.value, `line ${record.line}.thm.value`) };
        declarations.push(decl);
        rememberPropFamily(knownPropFamilyArities, decl);
        break;
      }
      case "opaque": {
        const value = expectObject(obj.opaque, `line ${record.line}.opaque`);
        if (expectBool(value.isUnsafe, `line ${record.line}.opaque.isUnsafe`)) throw new ArenaUnsupportedFeatureError("opaque.unsafe", "unsafe opaque declarations are not supported by arena-adapter0");
        const decl = { kind: "opaque" as const, name: declName(names, value.name, `line ${record.line}.opaque.name`), levelParams: levelParamNames(names, value.levelParams, `line ${record.line}.opaque.levelParams`), type: exprAt(exprs, value.type, `line ${record.line}.opaque.type`), value: exprAt(exprs, value.value, `line ${record.line}.opaque.value`) };
        declarations.push(decl);
        rememberPropFamily(knownPropFamilyArities, decl);
        break;
      }
      case "quot": {
        const value = expectObject(obj.quot, `line ${record.line}.quot`);
        const quotKind = expectString(value.kind, `line ${record.line}.quot.kind`);
        const quotName = declName(names, value.name, `line ${record.line}.quot.name`);
        const expectedNames: Record<string, string> = { type: "Quot", ctor: "Quot.mk", lift: "Quot.lift", ind: "Quot.ind" };
        const expectedName = expectedNames[quotKind];
        if (!expectedName) throw new ArenaUnsupportedFeatureError("quot.kind", `unsupported quotient primitive kind ${quotKind}`);
        if (quotName !== expectedName) throw new ArenaMalformedInputError(`line ${record.line}.quot.name for kind ${quotKind} must be ${expectedName}`);
        if (quotKind === "type") {
          if (quotientPrimitiveInstalled) throw new ArenaMalformedInputError(`line ${record.line}.quot duplicates quotient primitive installer`);
          declarations.push({ kind: "quot", name: "Quot", levelParams: [] });
          quotientPrimitiveInstalled = true;
        } else if (!quotientPrimitiveInstalled) {
          throw new ArenaMalformedInputError(`line ${record.line}.quot.${quotKind} appears before Quot type primitive`);
        }
        break;
      }
      case "inductive": {
        const decl = translateNonMutualInductive(names, exprs, obj.inductive, record.line, knownPropFamilyArities, knownDefinitions, knownInductiveNames, knownConstructors, knownFamilyConstructors);
        declarations.push(decl);
        knownInductiveNames.add(decl.name);
        const familyCtors = knownFamilyConstructors.get(decl.name) ?? new Set<string>();
        for (const ctor of decl.constructors) {
          const shape = ctorRecShape(ctor.type, decl.numParams);
          knownConstructors.set(ctor.name, { familyName: decl.name, nfields: shape.nfields });
          familyCtors.add(ctor.name);
        }
        knownFamilyConstructors.set(decl.name, familyCtors);
        rememberPropFamily(knownPropFamilyArities, decl);
        break;
      }
      default:
        throw new ArenaUnsupportedFeatureError(kind, `lean4export ${kind} records are not supported by arena-adapter0`);
    }
  }

  return { declarations, recordsRead: records.length };
}
