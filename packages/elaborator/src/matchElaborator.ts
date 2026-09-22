import { CoreDeclaration, Environment, Term, defEq, infer, instantiate, kernelWhnf, levelParam } from "@proofscript/kernel";
import { ElaborationError, SurfaceDeclaration, SurfaceMatchCase, SurfacePattern, SurfaceTerm, UnsupportedFeature } from "@proofscript/syntax";
import { internalRecursionIHName } from "@proofscript/recursion";
import { contextFromTypes, containsAnyBVar, flattenCoreApps } from "./coreUtils";
import { namespaceCandidates } from "./globalEnvironment";

export interface MatchElaborationHost {
  elaborateTerm(term: SurfaceTerm, locals: string[], localTypes: Term[], expectedType?: Term): Term;
}


export function generateStructuralEquationTheorems(
  decl: Extract<SurfaceDeclaration, { kind: "definition" }>,
  core: Extract<CoreDeclaration, { kind: "definition" }>,
  sourceMatch: Extract<SurfaceTerm, { tag: "match" }>,
  kernelEnv: Environment,
  host: MatchElaborationHost,
): CoreDeclaration[] {
  if (decl.binders.length !== 1) throw new ElaborationError("internal: K2d equation generation expected one recursive parameter");
  const eqEntry = kernelEnv.get("Eq");
  const reflEntry = kernelEnv.get("Eq.refl");
  if (!eqEntry || !reflEntry) {
    throw new UnsupportedFeature("K3c-section-vars0 equation theorem generation requires the checked standard Eq foundation; use the standard prelude");
  }

  const inputType = host.elaborateTerm(decl.binders[0].type, [], []);
  const { head: typeHead, args: typeArgs } = flattenCoreApps(inputType);
  if (typeHead.tag !== "const") throw new ElaborationError("internal: recursive input type has no inductive head");
  const typeEntry = kernelEnv.get(typeHead.name);
  if (!typeEntry || typeEntry.declaration.kind !== "inductive") throw new ElaborationError(`internal: recursive input type '${typeHead.name}' is not an inductive`);
  if (typeArgs.length !== typeEntry.declaration.numParams) throw new ElaborationError(`internal: recursive input type '${typeHead.name}' expected ${typeEntry.declaration.numParams} parameter argument(s), got ${typeArgs.length}`);
  const recEntry = kernelEnv.get(`${typeHead.name}.rec`);
  if (!recEntry || recEntry.declaration.kind !== "recursor") throw new ElaborationError(`internal: missing recursor for ${typeHead.name}`);
  const rules = recEntry.declaration.metadata.rules;

  const byRule = resolveSurfaceCasesForRules(sourceMatch.cases, typeHead.name, rules);

  const equations: CoreDeclaration[] = [];
  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i];
    const c = byRule.get(i);
    if (!c) throw new ElaborationError(`internal: missing equation branch for ${rule.ctor}`);
    const ctorEntry = kernelEnv.get(rule.ctor);
    if (!ctorEntry || ctorEntry.declaration.kind !== "constructor") throw new ElaborationError(`internal: missing constructor ${rule.ctor}`);
    const fieldTypes = constructorFieldTypesForRule(ctorEntry.declaration.type, typeArgs, typeEntry.declaration.numParams, rule.nfields, kernelEnv);
    if (fieldTypes.some(containsAnyBVar)) throw new UnsupportedFeature("K2d equation theorems currently require nondependent constructor fields after uniform parameter instantiation");

    const names = patternNamesForRule(c.pattern, fieldTypes.length, i);
    const types = [...fieldTypes];
    const ctx = contextFromTypes(types);
    const rhs = host.elaborateTerm(c.body, names, types);
    const outputType = kernelWhnf(kernelEnv, infer(kernelEnv, ctx, rhs));
    if (containsAnyBVar(outputType)) throw new UnsupportedFeature("K2d equation theorems currently require a closed result type");
    const outputSort = kernelWhnf(kernelEnv, infer(kernelEnv, [], outputType));
    if (outputSort.tag !== "sort") throw new ElaborationError("internal: recursive equation output is not a type");

    let ctor: Term = { tag: "const", name: rule.ctor, levels: [...typeHead.levels] };
    for (const param of typeArgs) ctor = { tag: "app", fn: ctor, arg: param };
    for (let f = 0; f < fieldTypes.length; f++) {
      ctor = { tag: "app", fn: ctor, arg: { tag: "bvar", index: fieldTypes.length - 1 - f } };
    }
    const fn: Term = { tag: "const", name: core.name, levels: core.levelParams.map(levelParam) };
    const lhs: Term = { tag: "app", fn, arg: ctor };

    let eqType: Term = { tag: "const", name: "Eq", levels: [outputSort.level] };
    for (const arg of [outputType, lhs, rhs]) eqType = { tag: "app", fn: eqType, arg };
    let proof: Term = { tag: "const", name: "Eq.refl", levels: [outputSort.level] };
    for (const arg of [outputType, lhs]) proof = { tag: "app", fn: proof, arg };

    for (let f = fieldTypes.length - 1; f >= 0; f--) {
      eqType = { tag: "pi", domain: fieldTypes[f], body: eqType };
      proof = { tag: "lam", domain: fieldTypes[f], body: proof };
    }
    equations.push({
      kind: "theorem",
      name: `${core.name}.eq_${i + 1}`,
      levelParams: [...core.levelParams],
      type: eqType,
      value: proof,
    });
  }
  return equations;
}

export function elaborateMatchTerm(
  term: Extract<SurfaceTerm, { tag: "match" }>,
  locals: string[],
  localTypes: Term[],
  kernelEnv: Environment,
  expectedType: Term | undefined,
  host: MatchElaborationHost,
): Term {
  const scrutinee = host.elaborateTerm(term.scrutinee, locals, localTypes);
  const scrutineeType = kernelWhnf(kernelEnv, infer(kernelEnv, contextFromTypes(localTypes), scrutinee));
  const { head: typeHead, args: typeArgs } = flattenCoreApps(scrutineeType);
  if (typeHead.tag !== "const") throw new ElaborationError(`K2c match scrutinee must have an inductive/structure type, got ${JSON.stringify(scrutineeType)}`);
  const typeEntry = kernelEnv.get(typeHead.name);
  if (!typeEntry || typeEntry.declaration.kind !== "inductive") {
    throw new ElaborationError(`K2c match scrutinee type '${typeHead.name}' is not a supported inductive`);
  }
  if (typeEntry.declaration.numIndices !== 0) {
    throw new ElaborationError("K2c match currently supports only non-indexed inductives");
  }
  if (typeArgs.length !== typeEntry.declaration.numParams) {
    throw new ElaborationError(`K2c match scrutinee type '${typeHead.name}' expected ${typeEntry.declaration.numParams} parameter argument(s), got ${typeArgs.length}`);
  }
  if (typeHead.name === "Nat" && term.cases.some(c => c.pattern.tag === "natLit")) {
    return host.elaborateTerm(lowerNatLiteralMatch(term, locals), locals, localTypes, expectedType);
  }
  const recEntry = kernelEnv.get(`${typeHead.name}.rec`);
  if (!recEntry || recEntry.declaration.kind !== "recursor") throw new ElaborationError(`no supported recursor for ${typeHead.name}`);
  const rules = recEntry.declaration.metadata.rules;
  const resolved = new Map<number, { patternNames: string[]; fieldTypes: Term[]; body: SurfaceTerm }>();
  const caseRules = resolveSurfaceCasesForRules(term.cases, typeHead.name, rules);
  for (const [ruleIndex, c] of caseRules) {
    const rule = rules[ruleIndex];
    const ctorName = rule.ctor;
    const ctorEntry = kernelEnv.get(ctorName);
    if (!ctorEntry || ctorEntry.declaration.kind !== "constructor") throw new ElaborationError(`missing constructor metadata for ${ctorName}`);
    const fieldTypes = constructorFieldTypesForRule(ctorEntry.declaration.type, typeArgs, typeEntry.declaration.numParams, rule.nfields, kernelEnv);
    const patternNames = patternNamesForRule(c.pattern, rule.nfields, ruleIndex);
    resolved.set(ruleIndex, { patternNames, fieldTypes, body: c.body });
  }
  if (resolved.size !== rules.length) {
    const missing = rules.filter((_, i) => !resolved.has(i)).map(r => r.ctor).join(", ");
    throw new ElaborationError(`non-exhaustive K2c match; missing: ${missing}`);
  }

  let outputType: Term | undefined = expectedType;
  if (outputType && containsAnyBVar(outputType)) {
    throw new ElaborationError("K2d match currently requires a nondependent closed result type");
  }
  if (!outputType) {
    for (let i = 0; i < rules.length; i++) {
      const branch = resolved.get(i)!;
      const names = [...locals, ...branch.patternNames];
      const types = [...localTypes, ...branch.fieldTypes];
      const body = host.elaborateTerm(branch.body, names, types);
      const ty = kernelWhnf(kernelEnv, infer(kernelEnv, contextFromTypes(types), body));
      if (containsAnyBVar(ty)) throw new ElaborationError("K2d match currently requires a nondependent closed result type");
      if (!outputType) outputType = ty;
      else if (!defEq(kernelEnv, contextFromTypes(types), ty, outputType)) throw new ElaborationError("K2d match alternatives have different result types");
    }
  }
  if (!outputType) throw new ElaborationError("internal: empty match alternatives");
  const outputSort = kernelWhnf(kernelEnv, infer(kernelEnv, [], outputType));
  if (outputSort.tag !== "sort") throw new ElaborationError("K2c match result type is not a type");
  const motive: Term = { tag: "lam", domain: scrutineeType, body: outputType };
  const minors: Term[] = [];
  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i];
    const branch = resolved.get(i)!;
    const names = [...locals];
    const types = [...localTypes];
    const binderDomains: Term[] = [];
    for (let f = 0; f < branch.fieldTypes.length; f++) {
      names.push(branch.patternNames[f]); types.push(branch.fieldTypes[f]); binderDomains.push(branch.fieldTypes[f]);
      if (rule.recursiveFields[f]) {
        names.push(internalRecursionIHName(branch.patternNames[f])); types.push(outputType); binderDomains.push(outputType);
      }
    }
    let minor = host.elaborateTerm(branch.body, names, types, outputType);
    const minorBodyType = kernelWhnf(kernelEnv, infer(kernelEnv, contextFromTypes(types), minor));
    if (!defEq(kernelEnv, contextFromTypes(types), minorBodyType, outputType)) {
      throw new ElaborationError("K2d match alternative does not have the expected result type");
    }
    for (let b = binderDomains.length - 1; b >= 0; b--) minor = { tag: "lam", domain: binderDomains[b], body: minor };
    minors.push(minor);
  }
  const recLevels = [...typeHead.levels, outputSort.level];
  let out: Term = { tag: "const", name: recEntry.declaration.name, levels: recLevels };
  for (const arg of [...typeArgs, motive, ...minors, scrutinee]) out = { tag: "app", fn: out, arg };
  return out;
}


function constructorFieldTypesForRule(
  ctorType: Term,
  paramArgs: readonly Term[],
  numParams: number,
  nfields: number,
  kernelEnv: Environment,
): Term[] {
  let cursor = ctorType;
  for (let i = 0; i < numParams; i++) {
    const pi = kernelWhnf(kernelEnv, cursor);
    if (pi.tag !== "pi") throw new ElaborationError("constructor parameter telescope ended early during match elaboration");
    cursor = instantiate(pi.body, paramArgs[i]);
  }

  const fields: Term[] = [];
  for (let i = 0; i < nfields; i++) {
    const pi = kernelWhnf(kernelEnv, cursor);
    if (pi.tag !== "pi") throw new ElaborationError("constructor field telescope ended early during match elaboration");
    if (containsAnyBVar(pi.domain)) {
      throw new UnsupportedFeature("PSC-1 parameterized match currently requires constructor field types to depend only on already-instantiated uniform parameters");
    }
    fields.push(pi.domain);
    cursor = pi.body;
  }
  return fields;
}

function patternNamesForRule(pattern: SurfacePattern, nfields: number, ruleIndex: number): string[] {
  if (pattern.tag === "ctor") {
    if (pattern.binders.length !== nfields) {
      throw new ElaborationError(`constructor pattern expects ${nfields} binder(s), got ${pattern.binders.length}`);
    }
    return [...pattern.binders];
  }
  if (pattern.tag === "natLit") {
    throw new UnsupportedFeature("internal: Nat literal patterns above zero must be desugared before constructor-rule resolution");
  }
  if (pattern.tag === "natZero" && nfields !== 0) {
    throw new ElaborationError("Nat zero pattern unexpectedly resolved to a constructor with fields");
  }
  return Array.from({ length: nfields }, (_, i) => `@@wild:${ruleIndex}:${i}`);
}

function natPatternValue(pattern: SurfacePattern): number | undefined {
  if (pattern.tag === "natZero") return 0;
  if (pattern.tag === "natLit") return pattern.value;
  return undefined;
}

function freshNatPatternName(existingLocals: readonly string[], depth: number): string {
  const used = new Set(existingLocals);
  let candidate = `__ps_nat_match_pred_${depth}`;
  let suffix = 0;
  while (used.has(candidate)) candidate = `__ps_nat_match_pred_${depth}_${++suffix}`;
  return candidate;
}

function lowerNatLiteralMatch(term: Extract<SurfaceTerm, { tag: "match" }>, locals: readonly string[]): SurfaceTerm {
  const literalBodies = new Map<number, SurfaceTerm>();
  let wildcardBody: SurfaceTerm | undefined;
  for (let i = 0; i < term.cases.length; i++) {
    const c = term.cases[i];
    if (c.pattern.tag === "wildcard") {
      if (i !== term.cases.length - 1) throw new UnsupportedFeature("K3c-section-vars0 currently requires wildcard '_' to be the final alternative");
      wildcardBody = c.body;
      continue;
    }
    const value = natPatternValue(c.pattern);
    if (value === undefined) {
      throw new UnsupportedFeature("K3c-section-vars0 does not yet mix Nat numeric literal patterns above zero with constructor patterns in one match");
    }
    if (literalBodies.has(value)) throw new ElaborationError(`duplicate Nat numeric match alternative for ${value}`);
    literalBodies.set(value, c.body);
  }
  if (!wildcardBody) {
    throw new ElaborationError("non-exhaustive K2c Nat numeric-literal match; add a final '_' catch-all alternative");
  }
  const maxLiteral = Math.max(...literalBodies.keys());
  const maxSupportedLiteral = 64;
  if (maxLiteral > maxSupportedLiteral) {
    throw new UnsupportedFeature(`K3c-section-vars0 Nat numeric match literal ${maxLiteral} exceeds the bounded PSC-1 desugaring limit ${maxSupportedLiteral}`);
  }
  const build = (depth: number, scrutinee: SurfaceTerm): SurfaceTerm => {
    const zeroBody = literalBodies.get(depth) ?? wildcardBody!;
    if (depth >= maxLiteral) {
      return {
        tag: "match",
        scrutinee,
        cases: [
          { pattern: { tag: "natZero" }, body: zeroBody },
          { pattern: { tag: "wildcard" }, body: wildcardBody! },
        ],
      };
    }
    const pred = freshNatPatternName([...locals, ...Array.from({ length: depth }, (_, i) => `__ps_nat_match_pred_${i}`)], depth);
    return {
      tag: "match",
      scrutinee,
      cases: [
        { pattern: { tag: "natZero" }, body: zeroBody },
        {
          pattern: { tag: "ctor", ctor: ".succ", binders: [pred] },
          body: build(depth + 1, { tag: "name", name: pred, namespacePath: [], openNamespaces: [] }),
        },
      ],
    };
  };
  return build(0, term.scrutinee);
}

function resolveSurfaceCasesForRules(
  cases: readonly SurfaceMatchCase[],
  typeName: string,
  rules: readonly { ctor: string; nfields: number }[],
): Map<number, SurfaceMatchCase> {
  const resolved = new Map<number, SurfaceMatchCase>();
  for (let caseIndex = 0; caseIndex < cases.length; caseIndex++) {
    const c = cases[caseIndex];
    if (c.pattern.tag === "wildcard") {
      if (caseIndex !== cases.length - 1) {
        throw new UnsupportedFeature("K3c-section-vars0 currently requires wildcard '_' to be the final alternative");
      }
      for (let i = 0; i < rules.length; i++) if (!resolved.has(i)) resolved.set(i, c);
      continue;
    }
    if (c.pattern.tag === "natLit") {
      throw new UnsupportedFeature("internal: Nat literal patterns above zero must be desugared before constructor-rule resolution");
    }
    let ctorName: string;
    if (c.pattern.tag === "natZero") {
      if (typeName !== "Nat") throw new UnsupportedFeature("K3c-section-vars0 numeric pattern '0' is currently supported only for Nat");
      ctorName = "Nat.zero";
    } else {
      if (typeName === "Bool" && (c.pattern.ctor === "true" || c.pattern.ctor === "false")) {
        ctorName = `Bool.${c.pattern.ctor}`;
      } else if (c.pattern.ctor.startsWith(".")) ctorName = `${typeName}${c.pattern.ctor}`;
      else {
        const candidates = namespaceCandidates(c.pattern.ctor, c.pattern.namespacePath, c.pattern.openNamespaces);
        const typeScopedCandidate = c.pattern.ctor.includes(".") ? undefined : `${typeName}.${c.pattern.ctor}`;
        ctorName = candidates.find(candidate => rules.some(r => r.ctor === candidate))
          ?? (typeScopedCandidate && rules.some(r => r.ctor === typeScopedCandidate) ? typeScopedCandidate : candidates[0]);
      }
    }
    const ruleIndex = rules.findIndex(r => r.ctor === ctorName);
    if (ruleIndex < 0) throw new ElaborationError(`constructor pattern '${ctorName}' does not belong to ${typeName}`);
    if (resolved.has(ruleIndex)) throw new ElaborationError(`duplicate match alternative for ${ctorName}`);
    const rule = rules[ruleIndex];
    if (c.pattern.tag === "ctor" && c.pattern.binders.length !== rule.nfields) {
      throw new ElaborationError(`${ctorName} pattern expects ${rule.nfields} binder(s), got ${c.pattern.binders.length}`);
    }
    resolved.set(ruleIndex, c);
  }
  return resolved;
}
