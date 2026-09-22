import { ConstantInfo } from "./Declaration";
import { BinderInfo, Prop, Term, binderInfoOf, getAppArgs, getAppFn, instantiate, instantiateTermLevels, literalToConstructorTerm, literalTypeName, pretty, sameTerm, shift } from "./Expr";
import { defaultFuelConfig, FuelConfig, FuelMeter } from "./FuelConfig";
import { KernelTypeError, KernelUnsupportedError } from "./KernelError";
import { Level, LevelZero, assertNoLevelMVar, levelDefEq, levelDefEqList, levelGeq, levelIMax, levelSucc, isNeverZero } from "./Level";
import { LocalContext, extendLocalContext, extendLocalDefinition, lookupBVar, lookupBVarDecl } from "./LocalContext";
import { tryInductiveReduceRec } from "./Inductive/Reduce";
import { tryQuotReduce } from "./Quot";
import { EnvironmentCore } from "./Environment/Basic";
import { EquivManager } from "./EquivManager";

/** Public compatibility context: old ProofScript represents local context as de Bruijn types. */
export type Context = Term[];

export type TransparencyMode = "reducible" | "default" | "all";

export interface TypeCheckerContext {
  env: EnvironmentCore;
  lctx: LocalContext;
  transparency: TransparencyMode;
  fuel: FuelMeter;
  equiv: EquivManager;
}

export interface TypeCheckerOptions { fuel?: FuelConfig; transparency?: TransparencyMode; }

function asLocalContext(ctx: Context | LocalContext): LocalContext {
  if (ctx.length === 0) return [];
  const first = ctx[0] as unknown as { type?: Term };
  if (first && typeof first === "object" && "type" in first && "binderInfo" in first) return ctx as LocalContext;
  return (ctx as Term[]).map((type, i) => ({ name: `_x${i}`, type, binderInfo: "explicit" as BinderInfo }));
}

export class TypeChecker {
  readonly tc: TypeCheckerContext;
  constructor(readonly env: EnvironmentCore, options: TypeCheckerOptions = {}) {
    this.tc = { env, lctx: [], transparency: options.transparency ?? "default", fuel: new FuelMeter(options.fuel ?? defaultFuelConfig), equiv: new EquivManager() };
  }
  infer(term: Term, ctx: Context | LocalContext = []): Term { return inferCore(this.env, asLocalContext(ctx), term, this.tc.fuel, this.tc.transparency); }
  check(term: Term, expected: Term, ctx: Context | LocalContext = []): void { return checkCore(this.env, asLocalContext(ctx), term, expected, this.tc.fuel, this.tc.transparency); }
  whnf(term: Term, ctx: Context | LocalContext = []): Term { return whnfCore(this.env, asLocalContext(ctx), term, this.tc.fuel, this.tc.transparency); }
  isDefEq(left: Term, right: Term, ctx: Context | LocalContext = []): boolean { return isDefEqCore(this.env, asLocalContext(ctx), left, right, this.tc.fuel, this.tc.equiv, this.tc.transparency); }
}

function constantType(info: ConstantInfo): Term | undefined {
  switch (info.kind) {
    case "axiomInfo":
    case "defnInfo":
    case "thmInfo":
    case "opaqueInfo":
    case "inductInfo":
    case "ctorInfo":
    case "recInfo": return info.type;
    case "quotInfo": return info.type;
  }
}

function constantValue(info: ConstantInfo, transparency: TransparencyMode = "default"): Term | undefined {
  switch (info.kind) {
    case "defnInfo":
      if (info.hints.kind === "abbrev") return info.value;
      return transparency === "default" || transparency === "all" ? info.value : undefined;
    case "thmInfo":
      return transparency === "default" || transparency === "all" ? info.value : undefined;
    default:
      return undefined;
  }
}

export function deltaValue(info: ConstantInfo, transparency: TransparencyMode = "default"): Term | undefined {
  return constantValue(info, transparency);
}

function sortOfSort(level: Level): Term { return { tag: "sort", level: levelSucc(level) }; }

function inferCore(env: EnvironmentCore, lctx: LocalContext, term: Term, fuel: FuelMeter, transparency: TransparencyMode = "default", allowPropDataProjectionInTypes = false): Term {
  fuel.tick("inferType");
  switch (term.tag) {
    case "sort":
      assertNoLevelMVar(term.level);
      return sortOfSort(term.level);
    case "bvar": {
      const type = lookupBVar(lctx, term.index);
      if (!type) throw new KernelTypeError(`unbound de Bruijn variable #${term.index}`);
      return shift(type, term.index + 1);
    }
    case "lit": {
      const typeName = literalTypeName(term.literal);
      if (!env.findConstant(typeName)) throw new KernelTypeError(`literal ${pretty(term)} requires primitive ${typeName} in the trusted environment`);
      return { tag: "const", name: typeName, levels: [] };
    }
    case "const": {
      const info = env.getConstant(term.name);
      for (const level of term.levels) assertNoLevelMVar(level);
      const type = constantType(info);
      if (!type) throw new KernelUnsupportedError(`constant ${term.name} has no implemented type`);
      if (info.levelParams.length !== term.levels.length) throw new KernelTypeError(`universe arity mismatch for ${term.name}: expected ${info.levelParams.length}, got ${term.levels.length}`);
      return instantiateTermLevels(type, info.levelParams, term.levels);
    }
    case "app": {
      const fnType = ensureForallCore(env, lctx, inferCore(env, lctx, term.fn, fuel, transparency, allowPropDataProjectionInTypes), fuel, transparency);
      checkCore(env, lctx, term.arg, fnType.domain, fuel, transparency, allowPropDataProjectionInTypes);
      return instantiate(fnType.body, term.arg);
    }
    case "lam": {
      ensureSortCore(env, lctx, inferCore(env, lctx, term.domain, fuel, transparency, allowPropDataProjectionInTypes), fuel, transparency);
      const bodyType = inferCore(env, extendLocalContext(lctx, term.domain, "_", binderInfoOf(term)), term.body, fuel, transparency, allowPropDataProjectionInTypes);
      return { tag: "pi", domain: term.domain, body: bodyType, binderInfo: binderInfoOf(term) };
    }
    case "pi": {
      const s1 = ensureSortCore(env, lctx, inferCore(env, lctx, term.domain, fuel, transparency, allowPropDataProjectionInTypes), fuel, transparency);
      const lctx2 = extendLocalContext(lctx, term.domain, "_", binderInfoOf(term));
      const s2 = ensureSortCore(env, lctx2, inferCore(env, lctx2, term.body, fuel, transparency, allowPropDataProjectionInTypes), fuel, transparency);
      if (s1.level.tag === "zero" && s2.level.tag === "zero") return Prop;
      return { tag: "sort", level: levelIMax(s1.level, s2.level) };
    }
    case "let": {
      ensureSortCore(env, lctx, inferCore(env, lctx, term.type, fuel, transparency, allowPropDataProjectionInTypes), fuel, transparency);
      checkCore(env, lctx, term.value, term.type, fuel, transparency, allowPropDataProjectionInTypes);
      const bodyType = inferCore(env, extendLocalDefinition(lctx, term.type, term.value), term.body, fuel, transparency, allowPropDataProjectionInTypes);
      return instantiate(bodyType, term.value);
    }
    case "proj": return inferProjectionCore(env, lctx, term, fuel, transparency, allowPropDataProjectionInTypes);
  }
}

function ensureSortCore(env: EnvironmentCore, lctx: LocalContext, term: Term, fuel: FuelMeter, transparency: TransparencyMode = "default"): Extract<Term, { tag: "sort" }> {
  const reduced = whnfCore(env, lctx, term, fuel, transparency);
  if (reduced.tag !== "sort") throw new KernelTypeError(`expected sort, got ${pretty(reduced)}`);
  return reduced;
}

function ensureForallCore(env: EnvironmentCore, lctx: LocalContext, term: Term, fuel: FuelMeter, transparency: TransparencyMode = "default"): Extract<Term, { tag: "pi" }> {
  const reduced = whnfCore(env, lctx, term, fuel, transparency);
  if (reduced.tag !== "pi") throw new KernelTypeError(`expected function type, got ${pretty(reduced)}`);
  return reduced;
}

function intLiteralValue(term: Term): number | undefined {
  return term.tag === "lit" && term.literal.tag === "int" ? term.literal.value : undefined;
}

function boolConst(value: boolean): Term {
  return { tag: "const", name: value ? "Bool.true" : "Bool.false", levels: [] };
}

function boolValue(term: Term): boolean | undefined {
  if (term.tag !== "const" || term.levels.length !== 0) return undefined;
  if (term.name === "Bool.true") return true;
  if (term.name === "Bool.false") return false;
  return undefined;
}

function mkCoreApps(fn: Term, args: readonly Term[]): Term {
  return args.reduce((acc, arg) => ({ tag: "app", fn: acc, arg }), fn);
}

function natValue(term: Term): number | undefined {
  if (term.tag === "lit" && term.literal.tag === "nat") return term.literal.value;
  const head = getAppFn(term);
  const args = getAppArgs(term);
  if (head.tag === "const" && head.name === "Nat.zero" && args.length === 0) return 0;
  if (head.tag === "const" && head.name === "Nat.succ" && args.length === 1) {
    const pred = natValue(args[0]);
    return pred === undefined ? undefined : pred + 1;
  }
  return undefined;
}

function constApp(term: Term): { head: Extract<Term, { tag: "const" }>; args: Term[] } | undefined {
  const head = getAppFn(term);
  return head.tag === "const" ? { head, args: getAppArgs(term) } : undefined;
}

function readCheckedListElements(env: EnvironmentCore, lctx: LocalContext, elementType: Term, list: Term, fuel: FuelMeter, transparency: TransparencyMode): Term[] | undefined {
  const elements: Term[] = [];
  let cursor = list;
  for (let depth = 0; depth < 100_000; depth++) {
    const reduced = whnfCore(env, lctx, cursor, fuel, transparency);
    const app = constApp(reduced);
    if (!app) return undefined;
    if (app.head.name === "List.nil" && app.args.length === 1) {
      if (!isDefEqCore(env, lctx, app.args[0], elementType, fuel, new EquivManager(), transparency)) return undefined;
      return elements;
    }
    if (app.head.name === "List.cons" && app.args.length === 3) {
      if (!isDefEqCore(env, lctx, app.args[0], elementType, fuel, new EquivManager(), transparency)) return undefined;
      elements.push(app.args[1]);
      cursor = app.args[2];
      continue;
    }
    return undefined;
  }
  throw new KernelUnsupportedError("PSC-1 Array primitive reduction exceeded the bounded List payload limit");
}

function mkCheckedList(elementType: Term, elements: readonly Term[]): Term {
  let list: Term = mkCoreApps({ tag: "const", name: "List.nil", levels: [] }, [elementType]);
  for (let i = elements.length - 1; i >= 0; i--) {
    list = mkCoreApps({ tag: "const", name: "List.cons", levels: [] }, [elementType, elements[i], list]);
  }
  return list;
}

/**
 * P5.19-P5.41 trusted-boundary List.map/List.foldl/List.filter/List.append/List.length/List.range/List.replicate/List.toArray/List.isEmpty/List.head?/List.get?/List.last?/List.tail?/List.reverse/List.any/List.all/List.find?/List.countP/List.take/List.takeWhile/List.dropWhile/List.drop primitive reduction.
 *
 * The types are checked in the bootstrap prelude. Reduction fires
 * only for checked applications over finite constructor-shaped List payloads;
 * open or non-constructor lists remain stuck.
 */
function tryListPrimitiveReduce(env: EnvironmentCore, lctx: LocalContext, term: Term, fuel: FuelMeter, transparency: TransparencyMode): Term | undefined {
  const head = getAppFn(term);
  if (head.tag !== "const" || head.levels.length !== 0) return undefined;
  const args = getAppArgs(term);

  if (head.name === "List.range" && args.length === 1) {
    if (!isCheckedConstantApplication(env, lctx, head.name, head.levels, args, fuel, transparency)) return undefined;
    const countValue = natValue(whnfCore(env, lctx, args[0], fuel, transparency));
    if (countValue === undefined) return undefined;
    if (countValue > 100_000) throw new KernelUnsupportedError("PSC-1 List.range primitive reduction exceeded the bounded finite payload limit");
    const natType = { tag: "const", name: "Nat", levels: [] } satisfies Term;
    return mkCheckedList(natType, Array.from({ length: countValue }, (_, value) => ({ tag: "lit", literal: { tag: "nat", value } } satisfies Term)));
  }

  if (head.name === "List.replicate" && args.length === 3) {
    if (!isCheckedConstantApplication(env, lctx, head.name, head.levels, args, fuel, transparency)) return undefined;
    const [elementType, count, value] = args;
    const countValue = natValue(whnfCore(env, lctx, count, fuel, transparency));
    if (countValue === undefined) return undefined;
    if (countValue > 100_000) throw new KernelUnsupportedError("PSC-1 List.replicate primitive reduction exceeded the bounded finite payload limit");
    return mkCheckedList(elementType, Array.from({ length: countValue }, () => value));
  }

  if (head.name === "List.toArray" && args.length === 2) {
    if (!isCheckedConstantApplication(env, lctx, head.name, head.levels, args, fuel, transparency)) return undefined;
    const [elementType, list] = args;
    const elements = readCheckedListElements(env, lctx, elementType, list, fuel, transparency);
    if (!elements) return undefined;
    return mkCoreApps({ tag: "const", name: "Array.mk", levels: [] }, [elementType, mkCheckedList(elementType, elements)]);
  }

  if (head.name === "List.map" && args.length === 4) {
    if (!isCheckedConstantApplication(env, lctx, head.name, head.levels, args, fuel, transparency)) return undefined;
    const [sourceType, targetType, fn, list] = args;
    const elements = readCheckedListElements(env, lctx, sourceType, list, fuel, transparency);
    if (!elements) return undefined;
    return mkCheckedList(targetType, elements.map(value => ({ tag: "app", fn, arg: value })));
  }

  if (head.name === "List.filter" && args.length === 3) {
    if (!isCheckedConstantApplication(env, lctx, head.name, head.levels, args, fuel, transparency)) return undefined;
    const [elementType, predicate, list] = args;
    const elements = readCheckedListElements(env, lctx, elementType, list, fuel, transparency);
    if (!elements) return undefined;
    const kept: Term[] = [];
    for (const value of elements) {
      const keep = boolValue(whnfCore(env, lctx, { tag: "app", fn: predicate, arg: value }, fuel, transparency));
      if (keep === undefined) return undefined;
      if (keep) kept.push(value);
    }
    return mkCheckedList(elementType, kept);
  }

  if (head.name === "List.foldl" && args.length === 5) {
    if (!isCheckedConstantApplication(env, lctx, head.name, head.levels, args, fuel, transparency)) return undefined;
    const [sourceType, _accumulatorType, fn, init, list] = args;
    const elements = readCheckedListElements(env, lctx, sourceType, list, fuel, transparency);
    if (!elements) return undefined;
    let acc = init;
    for (const value of elements) {
      acc = mkCoreApps(fn, [acc, value]);
    }
    return acc;
  }

  if (head.name === "List.append" && args.length === 3) {
    if (!isCheckedConstantApplication(env, lctx, head.name, head.levels, args, fuel, transparency)) return undefined;
    const [elementType, left, right] = args;
    const leftElements = readCheckedListElements(env, lctx, elementType, left, fuel, transparency);
    if (!leftElements) return undefined;
    const rightElements = readCheckedListElements(env, lctx, elementType, right, fuel, transparency);
    if (!rightElements) return undefined;
    return mkCheckedList(elementType, [...leftElements, ...rightElements]);
  }

  if (head.name === "List.length" && args.length === 2) {
    if (!isCheckedConstantApplication(env, lctx, head.name, head.levels, args, fuel, transparency)) return undefined;
    const [elementType, list] = args;
    const elements = readCheckedListElements(env, lctx, elementType, list, fuel, transparency);
    if (!elements) return undefined;
    return { tag: "lit", literal: { tag: "nat", value: elements.length } };
  }

  if (head.name === "List.isEmpty" && args.length === 2) {
    if (!isCheckedConstantApplication(env, lctx, head.name, head.levels, args, fuel, transparency)) return undefined;
    const [elementType, list] = args;
    const elements = readCheckedListElements(env, lctx, elementType, list, fuel, transparency);
    if (!elements) return undefined;
    return boolConst(elements.length === 0);
  }

  if (head.name === "List.head?" && args.length === 2) {
    if (!isCheckedConstantApplication(env, lctx, head.name, head.levels, args, fuel, transparency)) return undefined;
    const [elementType, list] = args;
    const elements = readCheckedListElements(env, lctx, elementType, list, fuel, transparency);
    if (!elements) return undefined;
    return elements.length === 0
      ? mkCoreApps({ tag: "const", name: "Option.none", levels: [] }, [elementType])
      : mkCoreApps({ tag: "const", name: "Option.some", levels: [] }, [elementType, elements[0]]);
  }


  if (head.name === "List.get?" && args.length === 3) {
    if (!isCheckedConstantApplication(env, lctx, head.name, head.levels, args, fuel, transparency)) return undefined;
    const [elementType, list, index] = args;
    const elements = readCheckedListElements(env, lctx, elementType, list, fuel, transparency);
    if (!elements) return undefined;
    const indexValue = natValue(whnfCore(env, lctx, index, fuel, transparency));
    if (indexValue === undefined) return undefined;
    if (indexValue < 0 || indexValue >= elements.length) {
      return mkCoreApps({ tag: "const", name: "Option.none", levels: [] }, [elementType]);
    }
    return mkCoreApps({ tag: "const", name: "Option.some", levels: [] }, [elementType, elements[indexValue]]);
  }

  if (head.name === "List.take" && args.length === 3) {
    if (!isCheckedConstantApplication(env, lctx, head.name, head.levels, args, fuel, transparency)) return undefined;
    const [elementType, list, count] = args;
    const elements = readCheckedListElements(env, lctx, elementType, list, fuel, transparency);
    if (!elements) return undefined;
    const countValue = natValue(whnfCore(env, lctx, count, fuel, transparency));
    if (countValue === undefined) return undefined;
    return mkCheckedList(elementType, elements.slice(0, countValue));
  }


  if (head.name === "List.takeWhile" && args.length === 3) {
    if (!isCheckedConstantApplication(env, lctx, head.name, head.levels, args, fuel, transparency)) return undefined;
    const [elementType, predicate, list] = args;
    const elements = readCheckedListElements(env, lctx, elementType, list, fuel, transparency);
    if (!elements) return undefined;
    const kept: Term[] = [];
    for (const value of elements) {
      const keep = boolValue(whnfCore(env, lctx, { tag: "app", fn: predicate, arg: value }, fuel, transparency));
      if (keep === undefined) return undefined;
      if (!keep) break;
      kept.push(value);
    }
    return mkCheckedList(elementType, kept);
  }

  if (head.name === "List.dropWhile" && args.length === 3) {
    if (!isCheckedConstantApplication(env, lctx, head.name, head.levels, args, fuel, transparency)) return undefined;
    const [elementType, predicate, list] = args;
    const elements = readCheckedListElements(env, lctx, elementType, list, fuel, transparency);
    if (!elements) return undefined;
    let dropCount = 0;
    for (const value of elements) {
      const keepDropping = boolValue(whnfCore(env, lctx, { tag: "app", fn: predicate, arg: value }, fuel, transparency));
      if (keepDropping === undefined) return undefined;
      if (!keepDropping) break;
      dropCount++;
    }
    return mkCheckedList(elementType, elements.slice(dropCount));
  }

  if (head.name === "List.drop" && args.length === 3) {
    if (!isCheckedConstantApplication(env, lctx, head.name, head.levels, args, fuel, transparency)) return undefined;
    const [elementType, list, count] = args;
    const elements = readCheckedListElements(env, lctx, elementType, list, fuel, transparency);
    if (!elements) return undefined;
    const countValue = natValue(whnfCore(env, lctx, count, fuel, transparency));
    if (countValue === undefined) return undefined;
    return mkCheckedList(elementType, elements.slice(countValue));
  }

  if (head.name === "List.last?" && args.length === 2) {
    if (!isCheckedConstantApplication(env, lctx, head.name, head.levels, args, fuel, transparency)) return undefined;
    const [elementType, list] = args;
    const elements = readCheckedListElements(env, lctx, elementType, list, fuel, transparency);
    if (!elements) return undefined;
    return elements.length === 0
      ? mkCoreApps({ tag: "const", name: "Option.none", levels: [] }, [elementType])
      : mkCoreApps({ tag: "const", name: "Option.some", levels: [] }, [elementType, elements[elements.length - 1]]);
  }

  if (head.name === "List.tail?" && args.length === 2) {
    if (!isCheckedConstantApplication(env, lctx, head.name, head.levels, args, fuel, transparency)) return undefined;
    const [elementType, list] = args;
    const elements = readCheckedListElements(env, lctx, elementType, list, fuel, transparency);
    if (!elements) return undefined;
    const listType = mkCoreApps({ tag: "const", name: "List", levels: [] }, [elementType]);
    return elements.length === 0
      ? mkCoreApps({ tag: "const", name: "Option.none", levels: [] }, [listType])
      : mkCoreApps({ tag: "const", name: "Option.some", levels: [] }, [listType, mkCheckedList(elementType, elements.slice(1))]);
  }

  if (head.name === "List.reverse" && args.length === 2) {
    if (!isCheckedConstantApplication(env, lctx, head.name, head.levels, args, fuel, transparency)) return undefined;
    const [elementType, list] = args;
    const elements = readCheckedListElements(env, lctx, elementType, list, fuel, transparency);
    if (!elements) return undefined;
    return mkCheckedList(elementType, [...elements].reverse());
  }

  if ((head.name === "List.any" || head.name === "List.all" || head.name === "List.find?" || head.name === "List.countP") && args.length === 3) {
    if (!isCheckedConstantApplication(env, lctx, head.name, head.levels, args, fuel, transparency)) return undefined;
    const [elementType, predicate, list] = args;
    const elements = readCheckedListElements(env, lctx, elementType, list, fuel, transparency);
    if (!elements) return undefined;
    if (head.name === "List.any") {
      for (const value of elements) {
        const keep = boolValue(whnfCore(env, lctx, { tag: "app", fn: predicate, arg: value }, fuel, transparency));
        if (keep === undefined) return undefined;
        if (keep) return boolConst(true);
      }
      return boolConst(false);
    }
    if (head.name === "List.find?") {
      for (const value of elements) {
        const keep = boolValue(whnfCore(env, lctx, { tag: "app", fn: predicate, arg: value }, fuel, transparency));
        if (keep === undefined) return undefined;
        if (keep) return mkCoreApps({ tag: "const", name: "Option.some", levels: [] }, [elementType, value]);
      }
      return mkCoreApps({ tag: "const", name: "Option.none", levels: [] }, [elementType]);
    }
    if (head.name === "List.countP") {
      let count = 0;
      for (const value of elements) {
        const keep = boolValue(whnfCore(env, lctx, { tag: "app", fn: predicate, arg: value }, fuel, transparency));
        if (keep === undefined) return undefined;
        if (keep) count++;
      }
      return { tag: "lit", literal: { tag: "nat", value: count } };
    }
    for (const value of elements) {
      const keep = boolValue(whnfCore(env, lctx, { tag: "app", fn: predicate, arg: value }, fuel, transparency));
      if (keep === undefined) return undefined;
      if (!keep) return boolConst(false);
    }
    return boolConst(true);
  }

  return undefined;
}

function readCheckedArrayElements(env: EnvironmentCore, lctx: LocalContext, elementType: Term, array: Term, fuel: FuelMeter, transparency: TransparencyMode): Term[] | undefined {
  const arrayValue = whnfCore(env, lctx, array, fuel, transparency);
  const arrayApp = constApp(arrayValue);
  if (!arrayApp || arrayApp.head.name !== "Array.mk" || arrayApp.args.length !== 2) return undefined;
  if (!isDefEqCore(env, lctx, arrayApp.args[0], elementType, fuel, new EquivManager(), transparency)) return undefined;
  return readCheckedListElements(env, lctx, elementType, arrayApp.args[1], fuel, transparency);
}

function tryArrayPrimitiveReduce(env: EnvironmentCore, lctx: LocalContext, term: Term, fuel: FuelMeter, transparency: TransparencyMode): Term | undefined {
  const head = getAppFn(term);
  if (head.tag !== "const" || head.levels.length !== 0) return undefined;
  const args = getAppArgs(term);
  const isSize = head.name === "Array.size" && args.length === 2;
  const isRange = head.name === "Array.range" && args.length === 1;
  const isReplicate = head.name === "Array.replicate" && args.length === 3;
  const isToList = head.name === "Array.toList" && args.length === 2;
  const isGet = head.name === "Array.get?" && args.length === 3;
  const isHead = head.name === "Array.head?" && args.length === 2;
  const isTail = head.name === "Array.tail?" && args.length === 2;
  const isLast = head.name === "Array.last?" && args.length === 2;
  const isMap = head.name === "Array.map" && args.length === 4;
  const isFoldl = head.name === "Array.foldl" && args.length === 5;
  const isFilter = head.name === "Array.filter" && args.length === 3;
  const isAppend = head.name === "Array.append" && args.length === 3;
  const isEmpty = head.name === "Array.isEmpty" && args.length === 2;
  const isReverse = head.name === "Array.reverse" && args.length === 2;
  const isAny = head.name === "Array.any" && args.length === 3;
  const isAll = head.name === "Array.all" && args.length === 3;
  const isFind = head.name === "Array.find?" && args.length === 3;
  const isCountP = head.name === "Array.countP" && args.length === 3;
  const isTake = head.name === "Array.take" && args.length === 3;
  const isTakeWhile = head.name === "Array.takeWhile" && args.length === 3;
  const isDropWhile = head.name === "Array.dropWhile" && args.length === 3;
  const isDrop = head.name === "Array.drop" && args.length === 3;
  if (!isRange && !isReplicate && !isToList && !isSize && !isGet && !isHead && !isLast && !isTail && !isMap && !isFoldl && !isFilter && !isAppend && !isEmpty && !isReverse && !isAny && !isAll && !isFind && !isCountP && !isTake && !isTakeWhile && !isDropWhile && !isDrop) return undefined;
  if (!isCheckedConstantApplication(env, lctx, head.name, head.levels, args, fuel, transparency)) return undefined;
  if (isRange) {
    const countValue = natValue(whnfCore(env, lctx, args[0], fuel, transparency));
    if (countValue === undefined) return undefined;
    if (countValue > 100_000) throw new KernelUnsupportedError("PSC-1 Array.range primitive reduction exceeded the bounded finite payload limit");
    const natType = { tag: "const", name: "Nat", levels: [] } satisfies Term;
    return mkCoreApps({ tag: "const", name: "Array.mk", levels: [] }, [
      natType,
      mkCheckedList(natType, Array.from({ length: countValue }, (_, value) => ({ tag: "lit", literal: { tag: "nat", value } } satisfies Term))),
    ]);
  }
  if (isReplicate) {
    const [elementType, count, value] = args;
    const countValue = natValue(whnfCore(env, lctx, count, fuel, transparency));
    if (countValue === undefined) return undefined;
    if (countValue > 100_000) throw new KernelUnsupportedError("PSC-1 Array.replicate primitive reduction exceeded the bounded finite payload limit");
    return mkCoreApps({ tag: "const", name: "Array.mk", levels: [] }, [
      elementType,
      mkCheckedList(elementType, Array.from({ length: countValue }, () => value)),
    ]);
  }
  const elementType = args[0];
  if (isAppend) {
    const leftElements = readCheckedArrayElements(env, lctx, elementType, args[1], fuel, transparency);
    if (!leftElements) return undefined;
    const rightElements = readCheckedArrayElements(env, lctx, elementType, args[2], fuel, transparency);
    if (!rightElements) return undefined;
    return mkCoreApps({ tag: "const", name: "Array.mk", levels: [] }, [
      elementType,
      mkCheckedList(elementType, [...leftElements, ...rightElements]),
    ]);
  }
  const arrayArgIndex = isMap ? 3 : isFoldl ? 4 : isFilter || isAny || isAll || isFind || isCountP || isTakeWhile || isDropWhile ? 2 : 1;
  const elements = readCheckedArrayElements(env, lctx, elementType, args[arrayArgIndex], fuel, transparency);
  if (!elements) return undefined;
  if (isSize) return { tag: "lit", literal: { tag: "nat", value: elements.length } };
  if (isToList) return mkCheckedList(elementType, elements);
  if (isHead) {
    return elements.length === 0
      ? mkCoreApps({ tag: "const", name: "Option.none", levels: [] }, [elementType])
      : mkCoreApps({ tag: "const", name: "Option.some", levels: [] }, [elementType, elements[0]]);
  }
  if (isLast) {
    return elements.length === 0
      ? mkCoreApps({ tag: "const", name: "Option.none", levels: [] }, [elementType])
      : mkCoreApps({ tag: "const", name: "Option.some", levels: [] }, [elementType, elements[elements.length - 1]]);
  }
  if (isTail) {
    const arrayType = mkCoreApps({ tag: "const", name: "Array", levels: [] }, [elementType]);
    return elements.length === 0
      ? mkCoreApps({ tag: "const", name: "Option.none", levels: [] }, [arrayType])
      : mkCoreApps({ tag: "const", name: "Option.some", levels: [] }, [arrayType, mkCoreApps({ tag: "const", name: "Array.mk", levels: [] }, [elementType, mkCheckedList(elementType, elements.slice(1))])]);
  }
  if (isEmpty) return boolConst(elements.length === 0);
  if (isReverse) {
    return mkCoreApps({ tag: "const", name: "Array.mk", levels: [] }, [
      elementType,
      mkCheckedList(elementType, [...elements].reverse()),
    ]);
  }
  if (isTake) {
    const countValue = natValue(whnfCore(env, lctx, args[2], fuel, transparency));
    if (countValue === undefined) return undefined;
    return mkCoreApps({ tag: "const", name: "Array.mk", levels: [] }, [
      elementType,
      mkCheckedList(elementType, elements.slice(0, countValue)),
    ]);
  }

  if (isTakeWhile) {
    const predicate = args[1];
    const kept: Term[] = [];
    for (const value of elements) {
      const keep = boolValue(whnfCore(env, lctx, { tag: "app", fn: predicate, arg: value }, fuel, transparency));
      if (keep === undefined) return undefined;
      if (!keep) break;
      kept.push(value);
    }
    return mkCoreApps({ tag: "const", name: "Array.mk", levels: [] }, [
      elementType,
      mkCheckedList(elementType, kept),
    ]);
  }

  if (isDropWhile) {
    const predicate = args[1];
    let dropCount = 0;
    for (const value of elements) {
      const keepDropping = boolValue(whnfCore(env, lctx, { tag: "app", fn: predicate, arg: value }, fuel, transparency));
      if (keepDropping === undefined) return undefined;
      if (!keepDropping) break;
      dropCount++;
    }
    return mkCoreApps({ tag: "const", name: "Array.mk", levels: [] }, [
      elementType,
      mkCheckedList(elementType, elements.slice(dropCount)),
    ]);
  }

  if (isDrop) {
    const countValue = natValue(whnfCore(env, lctx, args[2], fuel, transparency));
    if (countValue === undefined) return undefined;
    return mkCoreApps({ tag: "const", name: "Array.mk", levels: [] }, [
      elementType,
      mkCheckedList(elementType, elements.slice(countValue)),
    ]);
  }
  if (isAny || isAll || isFind || isCountP) {
    const predicate = args[1];
    if (isAny) {
      for (const value of elements) {
        const keep = boolValue(whnfCore(env, lctx, { tag: "app", fn: predicate, arg: value }, fuel, transparency));
        if (keep === undefined) return undefined;
        if (keep) return boolConst(true);
      }
      return boolConst(false);
    }
    if (isFind) {
      for (const value of elements) {
        const keep = boolValue(whnfCore(env, lctx, { tag: "app", fn: predicate, arg: value }, fuel, transparency));
        if (keep === undefined) return undefined;
        if (keep) return mkCoreApps({ tag: "const", name: "Option.some", levels: [] }, [elementType, value]);
      }
      return mkCoreApps({ tag: "const", name: "Option.none", levels: [] }, [elementType]);
    }
    if (isCountP) {
      let count = 0;
      for (const value of elements) {
        const keep = boolValue(whnfCore(env, lctx, { tag: "app", fn: predicate, arg: value }, fuel, transparency));
        if (keep === undefined) return undefined;
        if (keep) count++;
      }
      return { tag: "lit", literal: { tag: "nat", value: count } };
    }
    for (const value of elements) {
      const keep = boolValue(whnfCore(env, lctx, { tag: "app", fn: predicate, arg: value }, fuel, transparency));
      if (keep === undefined) return undefined;
      if (!keep) return boolConst(false);
    }
    return boolConst(true);
  }
  if (isMap) {
    const targetType = args[1];
    const fn = args[2];
    return mkCoreApps({ tag: "const", name: "Array.mk", levels: [] }, [
      targetType,
      mkCheckedList(targetType, elements.map(value => ({ tag: "app", fn, arg: value }))),
    ]);
  }
  if (isFilter) {
    const predicate = args[1];
    const kept: Term[] = [];
    for (const value of elements) {
      const keep = boolValue(whnfCore(env, lctx, { tag: "app", fn: predicate, arg: value }, fuel, transparency));
      if (keep === undefined) return undefined;
      if (keep) kept.push(value);
    }
    return mkCoreApps({ tag: "const", name: "Array.mk", levels: [] }, [
      elementType,
      mkCheckedList(elementType, kept),
    ]);
  }
  if (isFoldl) {
    const fn = args[2];
    let acc = args[3];
    for (const value of elements) {
      acc = mkCoreApps(fn, [acc, value]);
    }
    return acc;
  }
  const indexValue = natValue(whnfCore(env, lctx, args[2], fuel, transparency));
  if (indexValue === undefined) return undefined;
  if (indexValue < 0 || indexValue >= elements.length) {
    return mkCoreApps({ tag: "const", name: "Option.none", levels: [] }, [elementType]);
  }
  return mkCoreApps({ tag: "const", name: "Option.some", levels: [] }, [elementType, elements[indexValue]]);
}

/**
 * P5.15/P5.16 trusted-boundary Option.map/bind and Except.map/bind primitive reduction.
 *
 * The declarations are checked in the bootstrap prelude. These reductions fire
 * only for checked applications and checked constructor-shaped majors; open or
 * non-constructor values remain stuck. This keeps the executable JS/TS helper
 * behavior aligned with kernel reduction instead of bypassing Core checking.
 */
function tryOptionExceptMapBindPrimitiveReduce(env: EnvironmentCore, lctx: LocalContext, term: Term, fuel: FuelMeter, transparency: TransparencyMode): Term | undefined {
  const head = getAppFn(term);
  if (head.tag !== "const" || head.levels.length !== 0) return undefined;
  const args = getAppArgs(term);

  if (head.name === "Option.map" && args.length === 4) {
    if (!isCheckedConstantApplication(env, lctx, head.name, head.levels, args, fuel, transparency)) return undefined;
    const [sourceType, targetType, fn, value] = args;
    const reducedValue = whnfCore(env, lctx, value, fuel, transparency);
    const app = constApp(reducedValue);
    if (!app) return undefined;
    if (app.head.name === "Option.none" && app.args.length === 1) {
      if (!isDefEqCore(env, lctx, app.args[0], sourceType, fuel, new EquivManager(), transparency)) return undefined;
      return mkCoreApps({ tag: "const", name: "Option.none", levels: [] }, [targetType]);
    }
    if (app.head.name === "Option.some" && app.args.length === 2) {
      if (!isDefEqCore(env, lctx, app.args[0], sourceType, fuel, new EquivManager(), transparency)) return undefined;
      return mkCoreApps({ tag: "const", name: "Option.some", levels: [] }, [targetType, { tag: "app", fn, arg: app.args[1] }]);
    }
    return undefined;
  }



  if (head.name === "Option.bind" && args.length === 4) {
    if (!isCheckedConstantApplication(env, lctx, head.name, head.levels, args, fuel, transparency)) return undefined;
    const [sourceType, targetType, value, fn] = args;
    const reducedValue = whnfCore(env, lctx, value, fuel, transparency);
    const app = constApp(reducedValue);
    if (!app) return undefined;
    if (app.head.name === "Option.none" && app.args.length === 1) {
      if (!isDefEqCore(env, lctx, app.args[0], sourceType, fuel, new EquivManager(), transparency)) return undefined;
      return mkCoreApps({ tag: "const", name: "Option.none", levels: [] }, [targetType]);
    }
    if (app.head.name === "Option.some" && app.args.length === 2) {
      if (!isDefEqCore(env, lctx, app.args[0], sourceType, fuel, new EquivManager(), transparency)) return undefined;
      return { tag: "app", fn, arg: app.args[1] };
    }
    return undefined;
  }

  if (head.name === "Except.map" && args.length === 5) {
    if (!isCheckedConstantApplication(env, lctx, head.name, head.levels, args, fuel, transparency)) return undefined;
    const [errorType, sourceType, targetType, fn, value] = args;
    const reducedValue = whnfCore(env, lctx, value, fuel, transparency);
    const app = constApp(reducedValue);
    if (!app) return undefined;
    if (app.head.name === "Except.error" && app.args.length === 3) {
      if (!isDefEqCore(env, lctx, app.args[0], errorType, fuel, new EquivManager(), transparency)) return undefined;
      if (!isDefEqCore(env, lctx, app.args[1], sourceType, fuel, new EquivManager(), transparency)) return undefined;
      return mkCoreApps({ tag: "const", name: "Except.error", levels: [] }, [errorType, targetType, app.args[2]]);
    }
    if (app.head.name === "Except.ok" && app.args.length === 3) {
      if (!isDefEqCore(env, lctx, app.args[0], errorType, fuel, new EquivManager(), transparency)) return undefined;
      if (!isDefEqCore(env, lctx, app.args[1], sourceType, fuel, new EquivManager(), transparency)) return undefined;
      return mkCoreApps({ tag: "const", name: "Except.ok", levels: [] }, [errorType, targetType, { tag: "app", fn, arg: app.args[2] }]);
    }
  }

  if (head.name === "Except.bind" && args.length === 5) {
    if (!isCheckedConstantApplication(env, lctx, head.name, head.levels, args, fuel, transparency)) return undefined;
    const [errorType, sourceType, targetType, value, fn] = args;
    const reducedValue = whnfCore(env, lctx, value, fuel, transparency);
    const app = constApp(reducedValue);
    if (!app) return undefined;
    if (app.head.name === "Except.error" && app.args.length === 3) {
      if (!isDefEqCore(env, lctx, app.args[0], errorType, fuel, new EquivManager(), transparency)) return undefined;
      if (!isDefEqCore(env, lctx, app.args[1], sourceType, fuel, new EquivManager(), transparency)) return undefined;
      return mkCoreApps({ tag: "const", name: "Except.error", levels: [] }, [errorType, targetType, app.args[2]]);
    }
    if (app.head.name === "Except.ok" && app.args.length === 3) {
      if (!isDefEqCore(env, lctx, app.args[0], errorType, fuel, new EquivManager(), transparency)) return undefined;
      if (!isDefEqCore(env, lctx, app.args[1], sourceType, fuel, new EquivManager(), transparency)) return undefined;
      return { tag: "app", fn, arg: app.args[2] };
    }
  }


  return undefined;
}

/**
 * P5.10 trusted-boundary Int primitive reduction.
 *
 * PSC-1 does not yet model Lean's full Int constructors/API. These reductions
 * are deliberately bounded: they fire only for checked applications of the
 * explicitly declared Int primitive constants where all computational arguments
 * reduce to Core `lit.int` values. Non-literal/general Int terms remain stuck.
 */
function tryIntPrimitiveReduce(env: EnvironmentCore, lctx: LocalContext, term: Term, fuel: FuelMeter, transparency: TransparencyMode): Term | undefined {
  const head = getAppFn(term);
  if (head.tag !== "const" || head.levels.length !== 0) return undefined;
  const args = getAppArgs(term);
  const reduceArg = (arg: Term) => whnfCore(env, lctx, arg, fuel, transparency);
  if (head.name === "Int.neg" && args.length === 1) {
    if (!isCheckedConstantApplication(env, lctx, head.name, head.levels, args, fuel, transparency)) return undefined;
    const value = intLiteralValue(reduceArg(args[0]));
    return value === undefined ? undefined : { tag: "lit", literal: { tag: "int", value: -value } };
  }
  if ((head.name === "Int.add" || head.name === "Int.sub" || head.name === "Int.beq") && args.length === 2) {
    if (!isCheckedConstantApplication(env, lctx, head.name, head.levels, args, fuel, transparency)) return undefined;
    const left = intLiteralValue(reduceArg(args[0]));
    const right = intLiteralValue(reduceArg(args[1]));
    if (left === undefined || right === undefined) return undefined;
    if (head.name === "Int.add") return { tag: "lit", literal: { tag: "int", value: left + right } };
    if (head.name === "Int.sub") return { tag: "lit", literal: { tag: "int", value: left - right } };
    return boolConst(left === right);
  }
  return undefined;
}

const whnfCache = new WeakMap<FuelMeter, Map<string, Term>>();

function whnfCacheKey(env: EnvironmentCore, lctx: LocalContext, term: Term, transparency: TransparencyMode): string | undefined {
  try {
    const key = JSON.stringify([env.cacheRevision, transparency, lctx, term]);
    return key.length <= 200_000 ? key : undefined;
  } catch {
    return undefined;
  }
}

export function whnfCore(env: EnvironmentCore, lctx: LocalContext, term: Term, fuel: FuelMeter = new FuelMeter(), transparency: TransparencyMode = "default"): Term {
  const key = whnfCacheKey(env, lctx, term, transparency);
  let cache: Map<string, Term> | undefined;
  if (key !== undefined) {
    cache = whnfCache.get(fuel);
    if (!cache) { cache = new Map(); whnfCache.set(fuel, cache); }
    const cached = cache.get(key);
    if (cached !== undefined) return cached;
  }
  const result = whnfCoreUncached(env, lctx, term, fuel, transparency);
  if (cache && key !== undefined) {
    if (cache.size >= 4096) cache.delete(cache.keys().next().value!);
    cache.set(key, result);
  }
  return result;
}

function whnfCoreUncached(env: EnvironmentCore, lctx: LocalContext, term: Term, fuel: FuelMeter, transparency: TransparencyMode): Term {
  fuel.tick("whnf");
  switch (term.tag) {
    case "bvar": {
      const value = lookupBVarDecl(lctx, term.index)?.value;
      return value === undefined ? term : whnfCore(env, lctx, shift(value, term.index + 1), fuel, transparency);
    }
    case "let": return whnfCore(env, lctx, instantiate(term.body, term.value), fuel, transparency);
    case "app": {
      const listReduced = tryListPrimitiveReduce(env, lctx, term, fuel, transparency);
      if (listReduced) return whnfCore(env, lctx, listReduced, fuel, transparency);
      const arrayReduced = tryArrayPrimitiveReduce(env, lctx, term, fuel, transparency);
      if (arrayReduced) return whnfCore(env, lctx, arrayReduced, fuel, transparency);
      const mapBindReduced = tryOptionExceptMapBindPrimitiveReduce(env, lctx, term, fuel, transparency);
      if (mapBindReduced) return whnfCore(env, lctx, mapBindReduced, fuel, transparency);
      const intReduced = tryIntPrimitiveReduce(env, lctx, term, fuel, transparency);
      if (intReduced) return whnfCore(env, lctx, intReduced, fuel, transparency);
      const quotientReduced = tryQuotReduce(
        env,
        term,
        major => whnfCore(env, lctx, major, fuel, transparency),
        (quotName, quotLevels, args) => isCheckedConstantApplication(env, lctx, quotName, quotLevels, args, fuel, transparency),
        (left, right) => isDefEqCore(env, lctx, left, right, new FuelMeter({ maxDepth: fuel.config.maxDepth, maxSteps: Math.max(fuel.config.maxSteps, 250_000) }), new EquivManager(), transparency),
      );
      if (quotientReduced) return whnfCore(env, lctx, quotientReduced, fuel, transparency);
      const recursorReduced = tryInductiveReduceRec(
        env,
        term,
        major => whnfCore(env, lctx, major, fuel, transparency),
        (recursorName, recursorLevels, args) => isCheckedRecursorApplication(
          env,
          lctx,
          recursorName,
          recursorLevels,
          args,
          new FuelMeter({ maxDepth: fuel.config.maxDepth, maxSteps: Math.max(fuel.config.maxSteps, 250_000) }),
          transparency,
        ),
        (left, right) => isDefEqCore(env, lctx, left, right, new FuelMeter({ maxDepth: fuel.config.maxDepth, maxSteps: Math.max(fuel.config.maxSteps, 250_000) }), new EquivManager(), transparency),
        (term: Term) => {
          try { return whnfCore(env, lctx, inferCore(env, lctx, term, new FuelMeter({ maxDepth: fuel.config.maxDepth, maxSteps: Math.max(fuel.config.maxSteps, 250_000) }), transparency), new FuelMeter({ maxDepth: fuel.config.maxDepth, maxSteps: Math.max(fuel.config.maxSteps, 250_000) }), transparency); }
          catch { return undefined; }
        },
      );
      if (recursorReduced) return whnfCore(env, lctx, recursorReduced, fuel, transparency);
      const fn = whnfCore(env, lctx, term.fn, fuel, transparency);
      if (fn.tag === "lam") return whnfCore(env, lctx, instantiate(fn.body, term.arg), fuel, transparency);
      return fn === term.fn ? term : { tag: "app", fn, arg: term.arg };
    }
    case "lit": {
      if (term.literal.tag !== "nat") return term;
      if (!env.findConstant("Nat")) return term;
      return whnfCore(env, lctx, literalToConstructorTerm(term.literal), fuel, transparency);
    }
    case "const": {
      const info = env.findConstant(term.name);
      if (!info) return term;
      if (term.levels.length !== info.levelParams.length) return term;
      const value = constantValue(info, transparency);
      if (!value) return term;
      return whnfCore(env, lctx, instantiateTermLevels(value, info.levelParams, term.levels), fuel, transparency);
    }
    case "proj": {
      const reduced = tryProjectCore(env, lctx, term, fuel, transparency);
      if (reduced) return whnfCore(env, lctx, reduced, fuel, transparency);
      const expr = whnfCore(env, lctx, term.expr, fuel, transparency);
      return expr === term.expr ? term : { ...term, expr };
    }
    default: return term;
  }
}


function constructorDomains(type: Term): Term[] {
  const domains: Term[] = [];
  let cursor = type;
  while (cursor.tag === "pi") { domains.push(cursor.domain); cursor = cursor.body; }
  return domains;
}

/** Whether the immediately enclosing binder occurs, accounting for nested binders. */
function usesProjectionBinder(term: Term, depth = 0): boolean {
  switch (term.tag) {
    case "bvar": return term.index === depth;
    case "sort": case "const": case "lit": return false;
    case "app": return usesProjectionBinder(term.fn, depth) || usesProjectionBinder(term.arg, depth);
    case "lam": case "pi": return usesProjectionBinder(term.domain, depth) || usesProjectionBinder(term.body, depth + 1);
    case "let": return usesProjectionBinder(term.type, depth) || usesProjectionBinder(term.value, depth) || usesProjectionBinder(term.body, depth + 1);
    case "proj": return usesProjectionBinder(term.expr, depth);
  }
}


/** Whether a constructor field domain mentions an earlier constructor field.
 * For the domain of field j, de Bruijn index 0 names field j-1, index
 * j-1-i names prior field i. Nested binders shift that target by depth.
 */
function fieldDomainDependsOnPriorField(term: Term, currentFieldIndex: number, priorFieldIndex: number, depth = 0): boolean {
  if (priorFieldIndex < 0 || priorFieldIndex >= currentFieldIndex) return false;
  const targetIndex = depth + (currentFieldIndex - 1 - priorFieldIndex);
  switch (term.tag) {
    case "bvar": return term.index === targetIndex;
    case "sort": case "const": case "lit": return false;
    case "app": return fieldDomainDependsOnPriorField(term.fn, currentFieldIndex, priorFieldIndex, depth) || fieldDomainDependsOnPriorField(term.arg, currentFieldIndex, priorFieldIndex, depth);
    case "lam": case "pi": return fieldDomainDependsOnPriorField(term.domain, currentFieldIndex, priorFieldIndex, depth) || fieldDomainDependsOnPriorField(term.body, currentFieldIndex, priorFieldIndex, depth + 1);
    case "let": return fieldDomainDependsOnPriorField(term.type, currentFieldIndex, priorFieldIndex, depth) || fieldDomainDependsOnPriorField(term.value, currentFieldIndex, priorFieldIndex, depth) || fieldDomainDependsOnPriorField(term.body, currentFieldIndex, priorFieldIndex, depth + 1);
    case "proj": return fieldDomainDependsOnPriorField(term.expr, currentFieldIndex, priorFieldIndex, depth);
  }
}

function hasIntermediateFieldDependingOn(fieldDomains: readonly Term[], priorFieldIndex: number, beforeFieldIndex: number): boolean {
  for (let current = priorFieldIndex + 1; current < beforeFieldIndex; current++) {
    if (fieldDomainDependsOnPriorField(fieldDomains[current], current, priorFieldIndex)) return true;
  }
  return false;
}

function inferProjectionCore(env: EnvironmentCore, lctx: LocalContext, term: Extract<Term, { tag: "proj" }>, fuel: FuelMeter, transparency: TransparencyMode, allowPropDataProjectionInTypes = false): Term {
  const projectionOptions = (env as { options?: { allowProjections?: boolean; allowIndexedProjections?: boolean } }).options;
  if (!projectionOptions?.allowProjections) throw new KernelUnsupportedError("projection expressions unavailable in this kernel profile");
  const familyInfo = env.findConstant(term.typeName);
  if (!familyInfo || familyInfo.kind !== "inductInfo") throw new KernelUnsupportedError(`projection ${term.typeName}.${term.index} targets an unknown or non-inductive family`);
  if (familyInfo.numIndices !== 0 && !projectionOptions?.allowIndexedProjections) throw new KernelUnsupportedError(`indexed projections are unsupported by this kernel profile`);
  if (familyInfo.constructors.length !== 1) throw new KernelUnsupportedError(`projection typing for non-structure family ${term.typeName} is not implemented in the trusted kernel slice yet`);
  const ctorInfo = env.findConstant(familyInfo.constructors[0]);
  if (!ctorInfo || ctorInfo.kind !== "ctorInfo") throw new KernelUnsupportedError(`projection ${term.typeName}.${term.index} has no constructor metadata`);
  const domains = constructorDomains(ctorInfo.type);
  const fieldDomains = domains.slice(familyInfo.numParams);
  const fieldCount = domains.length - familyInfo.numParams;
  if (fieldCount < 0) throw new KernelUnsupportedError(`projection ${term.typeName}.${term.index} has malformed constructor telescope metadata`);
  if (term.index < 0 || term.index >= fieldCount) throw new KernelTypeError(`projection index ${term.index} out of range for ${term.typeName}; field count is ${fieldCount}`);

  const majorType = whnfCore(env, lctx, inferCore(env, lctx, term.expr, fuel, transparency), fuel, transparency);
  const head = getAppFn(majorType);
  if (head.tag !== "const" || head.name !== term.typeName) throw new KernelTypeError(`projection ${term.typeName}.${term.index} major premise has type ${pretty(majorType)}, not ${term.typeName}`);
  const majorArgs = getAppArgs(majorType);
  const expectedMajorArgs = familyInfo.numParams + familyInfo.numIndices;
  if (majorArgs.length !== expectedMajorArgs) throw new KernelUnsupportedError(`projection typing for ${term.typeName} expected ${expectedMajorArgs} family parameters/indices, got ${majorArgs.length} arguments`);
  if (head.levels.length !== familyInfo.levelParams.length) {
    throw new KernelTypeError(`projection ${term.typeName}.${term.index} major premise uses ${head.levels.length} universe levels, expected ${familyInfo.levelParams.length}`);
  }
  // Port of PSKernel.TypeChecker.Inner.inferProj: instantiate the constructor
  // telescope in order, replacing earlier fields by projections of this major.
  let cursor = instantiateTermLevels(ctorInfo.type, ctorInfo.levelParams, head.levels);
  for (const arg of majorArgs.slice(0, familyInfo.numParams)) {
    const binder = ensureForallCore(env, lctx, cursor, fuel, transparency);
    cursor = instantiate(binder.body, arg);
  }
  const familySort = ensureSortCore(env, lctx, inferCore(env, lctx, majorType, fuel, transparency), fuel, transparency);
  const maybeProp = !isNeverZero(familySort.level);
  for (let i = 0; i <= term.index; i++) {
    const binder = ensureForallCore(env, lctx, cursor, fuel, transparency);
    // Projection from a Prop-valued major may not expose the selected field
    // when that field is data-valued. However, Lean raw projection types may
    // still mention earlier fields while typing a later proof-valued field
    // (for example `w.2 : Pred w.1`). Therefore the safety check applies to
    // the selected projection, not to every earlier dependency used only in
    // the result type of a later proof projection.
    if (maybeProp && !allowPropDataProjectionInTypes && i < term.index) {
      const fieldSort = ensureSortCore(env, lctx, inferCore(env, lctx, binder.domain, fuel, transparency, true), fuel, transparency);
      if (!levelDefEq(fieldSort.level, LevelZero) && hasIntermediateFieldDependingOn(fieldDomains, i, term.index)) {
        throw new KernelTypeError(`projection ${term.typeName}.${term.index} cannot occur after dependent non-proposition field ${i} in a possibly proposition-valued structure`);
      }
    }
    if (maybeProp && i === term.index) {
      const fieldSort = ensureSortCore(env, lctx, inferCore(env, lctx, binder.domain, fuel, transparency, true), fuel, transparency);
      if (!allowPropDataProjectionInTypes && !levelDefEq(fieldSort.level, LevelZero)) throw new KernelTypeError(`projection ${term.typeName}.${i} cannot extract a non-proposition field from a possibly proposition-valued structure`);
    }
    if (i === term.index) return binder.domain;
    cursor = instantiate(binder.body, { tag: "proj", typeName: term.typeName, index: i, expr: term.expr });
  }
  throw new KernelTypeError(`projection index ${term.index} out of range for ${term.typeName}`);
}

function tryProjectCore(env: EnvironmentCore, lctx: LocalContext, term: Extract<Term, { tag: "proj" }>, fuel: FuelMeter, transparency: TransparencyMode): Term | undefined {
  try {
    inferProjectionCore(env, lctx, term, fuel, transparency);
  } catch (e) {
    if (e instanceof KernelTypeError || e instanceof KernelUnsupportedError) return undefined;
    throw e;
  }
  const familyInfo = env.findConstant(term.typeName);
  if (!familyInfo || familyInfo.kind !== "inductInfo" || familyInfo.constructors.length !== 1) return undefined;
  const major = whnfCore(env, lctx, term.expr, fuel, transparency);
  const head = getAppFn(major);
  if (head.tag !== "const" || head.name !== familyInfo.constructors[0]) return undefined;
  const args = getAppArgs(major);
  const ctorInfo = env.findConstant(familyInfo.constructors[0]);
  if (!ctorInfo || ctorInfo.kind !== "ctorInfo") return undefined;
  const fieldCount = constructorDomains(ctorInfo.type).length - familyInfo.numParams;
  if (args.length !== familyInfo.numParams + fieldCount) return undefined;
  return args[familyInfo.numParams + term.index];
}

const checkedConstantApplicationCache = new WeakMap<FuelMeter, Map<string, boolean>>();

function checkedConstantApplicationKey(env: EnvironmentCore, lctx: LocalContext, constantName: string, constantLevels: readonly Level[], args: readonly Term[], transparency: TransparencyMode): string | undefined {
  try {
    const key = JSON.stringify([env.cacheRevision, transparency, lctx, constantName, constantLevels, args]);
    return key.length <= 200_000 ? key : undefined;
  } catch {
    return undefined;
  }
}

function isCheckedConstantApplication(env: EnvironmentCore, lctx: LocalContext, constantName: string, constantLevels: readonly Level[], args: readonly Term[], fuel: FuelMeter, transparency: TransparencyMode): boolean {
  const key = checkedConstantApplicationKey(env, lctx, constantName, constantLevels, args, transparency);
  let cache: Map<string, boolean> | undefined;
  if (key !== undefined) {
    cache = checkedConstantApplicationCache.get(fuel);
    if (!cache) { cache = new Map(); checkedConstantApplicationCache.set(fuel, cache); }
    const cached = cache.get(key);
    if (cached !== undefined) return cached;
  }
  const result = computeCheckedConstantApplication(env, lctx, constantName, constantLevels, args, fuel, transparency);
  if (cache && key !== undefined) {
    if (cache.size >= 2048) cache.delete(cache.keys().next().value!);
    cache.set(key, result);
  }
  return result;
}

function computeCheckedConstantApplication(env: EnvironmentCore, lctx: LocalContext, constantName: string, constantLevels: readonly Level[], args: readonly Term[], fuel: FuelMeter, transparency: TransparencyMode): boolean {
  const info = env.findConstant(constantName);
  const type = info ? constantType(info) : undefined;
  if (!info || !type) return false;
  if (info.levelParams.length !== constantLevels.length) return false;
  let cursor = instantiateTermLevels(type, info.levelParams, constantLevels);
  try {
    for (const arg of args) {
      const pi = ensureForallCore(env, lctx, cursor, fuel, transparency);
      checkCore(env, lctx, arg, pi.domain, fuel, transparency);
      cursor = instantiate(pi.body, arg);
    }
    return true;
  } catch (e) {
    if (e instanceof KernelTypeError || e instanceof KernelUnsupportedError) return false;
    throw e;
  }
}

function isCheckedRecursorApplication(env: EnvironmentCore, lctx: LocalContext, recursorName: string, recursorLevels: readonly Level[], args: readonly Term[], fuel: FuelMeter, transparency: TransparencyMode): boolean {
  const info = env.findConstant(recursorName);
  if (!info || info.kind !== "recInfo") return false;
  return isCheckedConstantApplication(env, lctx, recursorName, recursorLevels, args, fuel, transparency);
}


export function isDefEqCore(env: EnvironmentCore, lctx: LocalContext, left: Term, right: Term, fuel: FuelMeter = new FuelMeter(), equiv: EquivManager = new EquivManager(), transparency: TransparencyMode = "default", proofIrrelevance = true): boolean {
  return equiv.withQuery(() => isDefEqCoreCached(env, lctx, left, right, fuel, equiv, transparency, proofIrrelevance));
}

function isDefEqCoreCached(env: EnvironmentCore, lctx: LocalContext, left: Term, right: Term, fuel: FuelMeter, equiv: EquivManager, transparency: TransparencyMode, proofIrrelevance: boolean): boolean {
  fuel.tick("isDefEq");
  // PSKernel.quickIsDefEq resolves structural reflexivity before WHNF.
  if (sameTerm(left, right)) return true;
  const scope = { environment: env, environmentRevision: env.cacheRevision, context: lctx, transparency, proofIrrelevance };
  const cached = equiv.get(left, right, scope);
  if (cached !== undefined) return cached;
  const l = whnfCore(env, lctx, left, fuel, transparency);
  const r = whnfCore(env, lctx, right, fuel, transparency);
  let result = false;
  if (l.tag === "sort" && r.tag === "sort") result = levelDefEq(l.level, r.level);
  else if (l.tag === "const" && r.tag === "const") result = l.name === r.name && levelDefEqList(l.levels, r.levels);
  else if (sameTerm(l, r)) result = true;
  else if (l.tag === "app" && r.tag === "app") result = isDefEqCore(env, lctx, l.fn, r.fn, fuel, equiv, transparency, proofIrrelevance) && isDefEqCore(env, lctx, l.arg, r.arg, fuel, equiv, transparency, proofIrrelevance);
  else if (l.tag === "proj" && r.tag === "proj") result = l.typeName === r.typeName && l.index === r.index && isDefEqCore(env, lctx, l.expr, r.expr, fuel, equiv, transparency, proofIrrelevance);
  else if (l.tag === "pi" && r.tag === "pi") result = isDefEqCore(env, lctx, l.domain, r.domain, fuel, equiv, transparency, proofIrrelevance) && isDefEqCore(env, extendLocalContext(lctx, l.domain), l.body, r.body, fuel, equiv, transparency, proofIrrelevance);
  else if (l.tag === "lam" && r.tag === "lam") result = isDefEqCore(env, lctx, l.domain, r.domain, fuel, equiv, transparency, proofIrrelevance) && isDefEqCore(env, extendLocalContext(lctx, l.domain), l.body, r.body, fuel, equiv, transparency, proofIrrelevance);
  if (!result) result = tryFunctionEtaDefEq(env, lctx, l, r, fuel, equiv, transparency, proofIrrelevance);
  if (!result) result = trySimpleStructureEtaDefEq(env, lctx, l, r, fuel, equiv, transparency, proofIrrelevance);
  if (!result && proofIrrelevance) result = isProofIrrelevantDefEq(env, lctx, l, r, fuel, transparency);
  if (!result) result = isDefEqUnitLike(env, lctx, l, r, fuel, equiv, transparency, proofIrrelevance);
  equiv.set(left, right, result, scope);
  return result;
}

/** Port of PSKernel.Inner.isDefEqUnitLike for the admitted nonindexed slice.
 * A constructor with no fields cannot contain recursive field occurrences. */
function isDefEqUnitLike(env: EnvironmentCore, lctx: LocalContext, left: Term, right: Term, fuel: FuelMeter, equiv: EquivManager, transparency: TransparencyMode, proofIrrelevance: boolean): boolean {
  try {
    const type = whnfCore(env, lctx, inferCore(env, lctx, left, fuel, transparency), fuel, transparency);
    const head = getAppFn(type);
    if (head.tag !== "const") return false;
    const family = env.findConstant(head.name);
    if (!family || family.kind !== "inductInfo" || family.numIndices !== 0 || family.constructors.length !== 1) return false;
    const ctor = env.findConstant(family.constructors[0]);
    if (!ctor || ctor.kind !== "ctorInfo" || constructorDomains(ctor.type).length !== family.numParams) return false;
    return isDefEqCore(env, lctx, type, inferCore(env, lctx, right, fuel, transparency), fuel, equiv, transparency, proofIrrelevance);
  } catch (e) {
    if (e instanceof KernelTypeError || e instanceof KernelUnsupportedError) return false;
    throw e;
  }
}


/** PSKernel.tryEtaExpansion adapted from free variables to de Bruijn Core. */
function tryFunctionEtaDefEq(env: EnvironmentCore, lctx: LocalContext, left: Term, right: Term, fuel: FuelMeter, equiv: EquivManager, transparency: TransparencyMode, proofIrrelevance: boolean): boolean {
  const lambda = left.tag === "lam" ? left : right.tag === "lam" ? right : undefined;
  const fn = left.tag === "lam" ? right : left;
  if (!lambda || fn.tag === "lam") return false;
  try {
    const fnType = whnfCore(env, lctx, inferCore(env, lctx, fn, fuel, transparency), fuel, transparency);
    if (fnType.tag !== "pi") return false;
    const expanded: Term = {
      tag: "lam", domain: fnType.domain, binderInfo: binderInfoOf(fnType),
      body: { tag: "app", fn: shift(fn, 1), arg: { tag: "bvar", index: 0 } },
    };
    return isDefEqCore(env, lctx, lambda, expanded, fuel, equiv, transparency, proofIrrelevance);
  } catch (e) {
    if (e instanceof KernelTypeError || e instanceof KernelUnsupportedError) return false;
    throw e;
  }
}


function getConstApp(term: Term): { head: Extract<Term, { tag: "const" }>; args: Term[] } | undefined {
  const head = getAppFn(term);
  return head.tag === "const" ? { head, args: getAppArgs(term) } : undefined;
}

function tryEtaAgainstConstructorExpansion(
  env: EnvironmentCore,
  lctx: LocalContext,
  major: Term,
  candidateExpansion: Term,
  fuel: FuelMeter,
  equiv: EquivManager,
  transparency: TransparencyMode,
  proofIrrelevance: boolean,
): boolean {
  const candidateApp = getConstApp(candidateExpansion);
  if (!candidateApp) return false;
  const ctorInfo = env.findConstant(candidateApp.head.name);
  if (!ctorInfo || ctorInfo.kind !== "ctorInfo") return false;
  const familyInfo = env.findConstant(ctorInfo.inductive);
  if (!familyInfo || familyInfo.kind !== "inductInfo") return false;
  if (familyInfo.numIndices !== 0) return false;
  if (familyInfo.constructors.length !== 1 || familyInfo.constructors[0] !== ctorInfo.name) return false;
  if (candidateApp.head.levels.length !== ctorInfo.levelParams.length) return false;
  // PSKernel.tryEtaStructCore requires a nonrecursive structure. In this
  // admitted slice, recursive field flags are generated with the recursor.
  const recursor = env.find(`${familyInfo.name}.rec`)?.declaration;
  if (!recursor || recursor.kind !== "recursor") return false;
  const rule = recursor.metadata.rules.find(r => r.ctor === ctorInfo.name);
  if (!rule || rule.recursiveFields.some(Boolean)) return false;

  const domains = constructorDomains(ctorInfo.type);
  const fieldDomains = domains.slice(familyInfo.numParams);
  const fieldCount = domains.length - familyInfo.numParams;
  if (fieldCount < 0) return false;
  if (candidateApp.args.length !== familyInfo.numParams + fieldCount) return false;

  try {
    const majorType = whnfCore(env, lctx, inferCore(env, lctx, major, fuel, transparency), fuel, transparency);
    const majorTypeApp = getConstApp(majorType);
    if (!majorTypeApp || majorTypeApp.head.name !== familyInfo.name) return false;
    if (majorTypeApp.head.levels.length !== familyInfo.levelParams.length) return false;
    if (!levelDefEqList(majorTypeApp.head.levels, candidateApp.head.levels)) return false;
    if (majorTypeApp.args.length !== familyInfo.numParams) return false;

    for (let i = 0; i < familyInfo.numParams; i++) {
      if (!isDefEqCore(env, lctx, candidateApp.args[i], majorTypeApp.args[i], fuel, equiv, transparency, proofIrrelevance)) return false;
    }

    const candidateType = whnfCore(env, lctx, inferCore(env, lctx, candidateExpansion, fuel, transparency), fuel, transparency);
    const candidateTypeApp = getConstApp(candidateType);
    if (!candidateTypeApp || candidateTypeApp.head.name !== familyInfo.name) return false;
    if (!levelDefEqList(candidateTypeApp.head.levels, majorTypeApp.head.levels)) return false;
    if (candidateTypeApp.args.length !== majorTypeApp.args.length) return false;
    for (let i = 0; i < majorTypeApp.args.length; i++) {
      if (!isDefEqCore(env, lctx, candidateTypeApp.args[i], majorTypeApp.args[i], fuel, equiv, transparency, proofIrrelevance)) return false;
    }

    for (let fieldIndex = 0; fieldIndex < fieldCount; fieldIndex++) {
      const actualField = candidateApp.args[familyInfo.numParams + fieldIndex];
      const projectedField: Term = { tag: "proj", typeName: familyInfo.name, index: fieldIndex, expr: major };
      if (!isDefEqCore(env, lctx, actualField, projectedField, fuel, equiv, transparency, proofIrrelevance)) return false;
    }
    return true;
  } catch (e) {
    if (e instanceof KernelTypeError || e instanceof KernelUnsupportedError) return false;
    throw e;
  }
}

function trySimpleStructureEtaDefEq(
  env: EnvironmentCore,
  lctx: LocalContext,
  left: Term,
  right: Term,
  fuel: FuelMeter,
  equiv: EquivManager,
  transparency: TransparencyMode,
  proofIrrelevance: boolean,
): boolean {
  return tryEtaAgainstConstructorExpansion(env, lctx, left, right, fuel, equiv, transparency, proofIrrelevance)
    || tryEtaAgainstConstructorExpansion(env, lctx, right, left, fuel, equiv, transparency, proofIrrelevance);
}

function isProofIrrelevantDefEq(env: EnvironmentCore, lctx: LocalContext, left: Term, right: Term, fuel: FuelMeter, transparency: TransparencyMode): boolean {
  try {
    const leftType = inferCore(env, lctx, left, fuel, transparency);
    const rightType = inferCore(env, lctx, right, fuel, transparency);
    if (!isDefEqCore(env, lctx, leftType, rightType, fuel, new EquivManager(), transparency, false)) return false;
    const typeSort = ensureSortCore(env, lctx, inferCore(env, lctx, leftType, fuel, transparency), fuel, transparency);
    return levelDefEq(typeSort.level, LevelZero);
  } catch (e) {
    if (e instanceof KernelTypeError || e instanceof KernelUnsupportedError) return false;
    throw e;
  }
}

function isAssignableCore(env: EnvironmentCore, lctx: LocalContext, actual: Term, expected: Term, fuel: FuelMeter, transparency: TransparencyMode): boolean {
  if (isDefEqCore(env, lctx, actual, expected, fuel, new EquivManager(), transparency)) return true;
  const actualWhnf = whnfCore(env, lctx, actual, fuel, transparency);
  const expectedWhnf = whnfCore(env, lctx, expected, fuel, transparency);
  return actualWhnf.tag === "sort" && expectedWhnf.tag === "sort" && levelGeq(expectedWhnf.level, actualWhnf.level);
}

function checkCore(env: EnvironmentCore, lctx: LocalContext, term: Term, expected: Term, fuel: FuelMeter, transparency: TransparencyMode = "default", allowPropDataProjectionInTypes = false): void {
  const actual = inferCore(env, lctx, term, fuel, transparency, allowPropDataProjectionInTypes);
  if (!isAssignableCore(env, lctx, actual, expected, fuel, transparency)) throw new KernelTypeError(`type mismatch: inferred ${pretty(actual)}, expected ${pretty(expected)}`);
}

export function infer(env: EnvironmentCore, ctx: Context | LocalContext, term: Term): Term {
  return inferCore(env, asLocalContext(ctx), term, new FuelMeter(), "default");
}

export function check(env: EnvironmentCore, ctx: Context | LocalContext, term: Term, expected: Term): void {
  return checkCore(env, asLocalContext(ctx), term, expected, new FuelMeter(), "default");
}

export function whnf(env: EnvironmentCore, ctx: Context | LocalContext, term: Term): Term {
  return whnfCore(env, asLocalContext(ctx), term, new FuelMeter(), "default");
}

export function kernelWhnf(env: EnvironmentCore, term: Term): Term {
  return whnfCore(env, [], term, new FuelMeter(), "default");
}

export function defEq(env: EnvironmentCore, ctx: Context | LocalContext, left: Term, right: Term): boolean {
  return isDefEqCore(env, asLocalContext(ctx), left, right, new FuelMeter(), new EquivManager(), "default");
}

export function ensureSort(env: EnvironmentCore, ctx: Context | LocalContext, term: Term): Extract<Term, { tag: "sort" }> {
  return ensureSortCore(env, asLocalContext(ctx), term, new FuelMeter(), "default");
}

export function ensureForall(env: EnvironmentCore, ctx: Context | LocalContext, term: Term): Extract<Term, { tag: "pi" }> {
  return ensureForallCore(env, asLocalContext(ctx), term, new FuelMeter(), "default");
}


export function inferType(env: EnvironmentCore, ctx: Context | LocalContext, term: Term): Term { return infer(env, ctx, term); }
export function checkType(env: EnvironmentCore, ctx: Context | LocalContext, term: Term): Term { return infer(env, ctx, term); }
export function whnfWithTransparency(env: EnvironmentCore, ctx: Context | LocalContext, term: Term, transparency: TransparencyMode): Term { return whnfCore(env, asLocalContext(ctx), term, new FuelMeter(), transparency); }
export function defEqWithTransparency(env: EnvironmentCore, ctx: Context | LocalContext, left: Term, right: Term, transparency: TransparencyMode): boolean { return isDefEqCore(env, asLocalContext(ctx), left, right, new FuelMeter(), new EquivManager(), transparency); }
export function isDefEq(env: EnvironmentCore, ctx: Context | LocalContext, left: Term, right: Term): boolean { return defEq(env, ctx, left, right); }
export function unfoldDefinition(env: EnvironmentCore, term: Term): Term {
  if (term.tag !== "const") return term;
  const info = env.findConstant(term.name);
  if (!info || term.levels.length !== info.levelParams.length) return term;
  const value = deltaValue(info);
  return value ? instantiateTermLevels(value, info.levelParams, term.levels) : term;
}

export const portStatus_PSKernel_TypeChecker = {
  source: "PSKernel/TypeChecker.lean",
  target: "packages/kernel/src/PSKernel/TypeChecker.ts",
  status: "partial",
  trustedBoundary: true,
  proofStatus: "not-proven",
} as const;
