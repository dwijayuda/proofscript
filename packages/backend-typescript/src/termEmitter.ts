import type { Term } from "@proofscript/kernel";
import type { AppShape, EmitContext, EmitTarget, PiShape } from "./types";

export function flattenPi(type: Term): PiShape {
  const domains: Term[] = [];
  let cur: Term = type;
  while (cur.tag === "pi") {
    domains.push(cur.domain);
    cur = cur.body;
  }
  return { domains, codomain: cur };
}

export function productV1PublicType(term: Term, depth = 0): string | undefined {
  if (term.tag === "const") {
    switch (term.name) {
      case "Nat":
      case "Int":
        return "bigint";
      case "Bool":
        return "boolean";
      case "String":
        return "string";
      case "Unit":
        return "null";
      default:
        return undefined;
    }
  }
  if (term.tag === "pi") {
    if ((term.binderInfo ?? "explicit") !== "explicit") return undefined;
    const domain = productV1PublicType(term.domain, depth + 1);
    const codomain = productV1PublicType(term.body, depth + 1);
    if (!domain || !codomain) return undefined;
    return `(arg${depth}: ${domain}) => ${codomain}`;
  }
  return undefined;
}

export function flattenApp(term: Term): AppShape {
  const args: Term[] = [];
  let head: Term = term;
  while (head.tag === "app") {
    args.unshift(head.arg);
    head = head.fn;
  }
  return { head, args };
}

function natCtorValue(term: Term): number | undefined {
  if (term.tag === "lit" && term.literal?.tag === "nat") return term.literal.value;
  if (term.tag === "const" && term.name === "Nat.zero") return 0;
  if (term.tag === "app" && term.fn.tag === "const" && term.fn.name === "Nat.succ") {
    const n = natCtorValue(term.arg);
    return n === undefined ? undefined : n + 1;
  }
  return undefined;
}

export function containsConstName(term: Term, name: string): boolean {
  switch (term.tag) {
    case "const":
      return term.name === name;
    case "app":
      return containsConstName(term.fn, name) || containsConstName(term.arg, name);
    case "lam":
    case "pi":
      return containsConstName(term.domain, name) || containsConstName(term.body, name);
    case "let":
      return containsConstName(term.type, name) || containsConstName(term.value, name) || containsConstName(term.body, name);
    case "proj":
      return containsConstName(term.expr, name);
    case "bvar":
    case "sort":
    case "lit":
      return false;
  }
}

export function emitTerm(term: Term, locals: readonly string[], ctx: EmitContext, target: EmitTarget = "js"): string {
  const nat = natCtorValue(term);
  if (nat !== undefined) return `${nat}n`;

  switch (term.tag) {
    case "bvar": {
      const name = locals[locals.length - 1 - term.index];
      if (!name) throw new Error(`unsupported executable Core: loose bvar #${term.index}`);
      return name;
    }
    case "const": {
      if (term.name === "Nat.zero") return "0n";
      if (term.name === "Nat.succ") return "__ps.Nat_succ";
      if (term.name === "Nat.add") return "__ps.Nat_add";
      if (term.name === "Nat.mul") return "__ps.Nat_mul";
      if (term.name === "Nat.pred") return "__ps.Nat_pred";
      if (term.name === "Nat.sub") return "__ps.Nat_sub";
      if (term.name === "Nat.beq") return "__ps.Nat_beq";
      if (term.name === "Nat.leb") return "__ps.Nat_leb";
      if (term.name === "Nat.ltb") return "__ps.Nat_ltb";
      if (term.name === "Int.neg") return "__ps.Int_neg";
      if (term.name === "Int.add") return "__ps.Int_add";
      if (term.name === "Int.sub") return "__ps.Int_sub";
      if (term.name === "Int.beq") return "__ps.Int_beq";
      if (term.name === "Array.size") return "__ps.Array_size";
      if (term.name === "Array.range") return "__ps.Array_range";
      if (term.name === "Array.replicate") return "__ps.Array_replicate";
      if (term.name === "Array.singleton") return "__ps.Array_singleton";
      if (term.name === "Array.toList") return "__ps.Array_toList";
      if (term.name === "Array.get?") return "__ps.Array_getOpt";
      if (term.name === "Array.take") return "__ps.Array_take";
      if (term.name === "Array.takeWhile") return "__ps.Array_takeWhile";
      if (term.name === "Array.dropWhile") return "__ps.Array_dropWhile";
      if (term.name === "Array.drop") return "__ps.Array_drop";
      if (term.name === "Array.head?") return "__ps.Array_headOpt";
      if (term.name === "Array.last?") return "__ps.Array_lastOpt";
      if (term.name === "Array.tail?") return "__ps.Array_tailOpt";
      if (term.name === "Array.map") return "__ps.Array_map";
      if (term.name === "Array.foldl") return "__ps.Array_foldl";
      if (term.name === "Array.filter") return "__ps.Array_filter";
      if (term.name === "Array.append") return "__ps.Array_append";
      if (term.name === "Array.isEmpty") return "__ps.Array_isEmpty";
      if (term.name === "Array.reverse") return "__ps.Array_reverse";
      if (term.name === "Array.any") return "__ps.Array_any";
      if (term.name === "Array.all") return "__ps.Array_all";
      if (term.name === "Array.find?") return "__ps.Array_findOpt";
      if (term.name === "Array.countP") return "__ps.Array_countP";
      if (term.name === "List.map") return "__ps.List_map";
      if (term.name === "List.foldl") return "__ps.List_foldl";
      if (term.name === "List.filter") return "__ps.List_filter";
      if (term.name === "List.append") return "__ps.List_append";
      if (term.name === "List.length") return "__ps.List_length";
      if (term.name === "List.range") return "__ps.List_range";
      if (term.name === "List.replicate") return "__ps.List_replicate";
      if (term.name === "List.singleton") return "__ps.List_singleton";
      if (term.name === "List.toArray") return "__ps.List_toArrayValue";
      if (term.name === "List.isEmpty") return "__ps.List_isEmpty";
      if (term.name === "List.head?") return "__ps.List_headOpt";
      if (term.name === "List.get?") return "__ps.List_getOpt";
      if (term.name === "List.take") return "__ps.List_take";
      if (term.name === "List.takeWhile") return "__ps.List_takeWhile";
      if (term.name === "List.dropWhile") return "__ps.List_dropWhile";
      if (term.name === "List.drop") return "__ps.List_drop";
      if (term.name === "List.last?") return "__ps.List_lastOpt";
      if (term.name === "List.tail?") return "__ps.List_tailOpt";
      if (term.name === "List.reverse") return "__ps.List_reverse";
      if (term.name === "List.any") return "__ps.List_any";
      if (term.name === "List.all") return "__ps.List_all";
      if (term.name === "List.find?") return "__ps.List_findOpt";
      if (term.name === "List.countP") return "__ps.List_countP";
      if (term.name === "Option.isSome") return "__ps.Option_isSome";
      if (term.name === "Option.isNone") return "__ps.Option_isNone";
      if (term.name === "Option.getD") return "__ps.Option_getD";
      if (term.name === "Option.orElse") return "__ps.Option_orElse";
      if (term.name === "Option.fold") return "__ps.Option_fold";
      if (term.name === "Option.any") return "__ps.Option_any";
      if (term.name === "Option.toList") return "__ps.Option_toList";
      if (term.name === "Option.toArray") return "__ps.Option_toArray";
      if (term.name === "Option.filter") return "__ps.Option_filter";
      if (term.name === "Option.flatten") return "__ps.Option_flatten";
      if (term.name === "Option.toExcept") return "__ps.Option_toExcept";
      if (term.name === "Except.isOk") return "__ps.Except_isOk";
      if (term.name === "Except.isError") return "__ps.Except_isError";
      if (term.name === "Except.getD") return "__ps.Except_getD";
      if (term.name === "Except.orElse") return "__ps.Except_orElse";
      if (term.name === "Except.toOption") return "__ps.Except_toOption";
      if (term.name === "Except.toError") return "__ps.Except_toError";
      if (term.name === "Except.getErrorD") return "__ps.Except_getErrorD";
      if (term.name === "Except.swap") return "__ps.Except_swap";
      if (term.name === "Except.fold") return "__ps.Except_fold";
      if (term.name === "Except.bimap") return "__ps.Except_bimap";
      if (term.name === "Except.toList") return "__ps.Except_toList";
      if (term.name === "Except.toArray") return "__ps.Except_toArray";
      if (term.name === "Except.mapError") return "__ps.Except_mapError";
      if (term.name === "Except.flatten") return "__ps.Except_flatten";
      if (term.name === "Option.map") return "__ps.Option_map";
      if (term.name === "Except.map") return "__ps.Except_map";
      if (term.name === "Option.bind") return "__ps.Option_bind";
      if (term.name === "Except.bind") return "__ps.Except_bind";
      if (term.name === "Bool.true") return "true";
      if (term.name === "Bool.false") return "false";
      if (term.name === "Bool.not") return "__ps.Bool_not";
      if (term.name === "Bool.xor") return "__ps.Bool_xor";
      if (term.name === "Unit.unit") return "null";
      const ctor = ctx.constructors.get(term.name);
      if (ctor) {
        if (ctor.paramArity !== 0) throw new Error(`unsupported executable Core constructor '${term.name}': missing erased parameter argument(s)`);
        if (ctor.arity === 0) return `__ps.Struct_mk(${JSON.stringify(ctor.owner)}, ${ctor.ctorIndex}, [])`;
        return `__ps.Struct_ctor(${JSON.stringify(ctor.owner)}, ${ctor.ctorIndex}, ${ctor.arity})`;
      }
      const mapped = ctx.nameMap.get(term.name);
      if (mapped) return mapped;
      throw new Error(`unsupported executable Core constant '${term.name}'`);
    }
    case "lit": {
      if (term.literal?.tag === "nat") return `${term.literal.value}n`;
      if (term.literal?.tag === "int") return `${term.literal.value}n`;
      if (term.literal?.tag === "str") return JSON.stringify(term.literal.value);
      throw new Error("unsupported executable Core literal: only Nat, Int, and String literals are live in PSC-1");
    }
    case "lam": {
      const arg = `x${locals.length}`;
      const runtimeType = productV1PublicType(term.domain) ?? "PsValue";
      const binding = target === "ts" ? `${arg}: ${runtimeType}` : arg;
      return `((${binding}) => ${emitTerm(term.body, [...locals, arg], ctx, target)})`;
    }
    case "app": {
      const { head, args } = flattenApp(term);
      if (head.tag === "const" && head.name === "Nat.succ" && args.length === 1) {
        return `__ps.Nat_succ(${emitTerm(args[0], locals, ctx, target)})`;
      }
      if (head.tag === "const" && head.name === "Nat.add" && args.length === 2) {
        return `__ps.Nat_add(${emitTerm(args[0], locals, ctx, target)})(${emitTerm(args[1], locals, ctx, target)})`;
      }
      if (head.tag === "const" && head.name === "Nat.mul" && args.length === 2) {
        return `__ps.Nat_mul(${emitTerm(args[0], locals, ctx, target)})(${emitTerm(args[1], locals, ctx, target)})`;
      }
      if (head.tag === "const" && head.name === "Nat.pred" && args.length === 1) {
        return `__ps.Nat_pred(${emitTerm(args[0], locals, ctx, target)})`;
      }
      if (head.tag === "const" && head.name === "Nat.sub" && args.length === 2) {
        return `__ps.Nat_sub(${emitTerm(args[0], locals, ctx, target)})(${emitTerm(args[1], locals, ctx, target)})`;
      }
      if (head.tag === "const" && head.name === "Nat.beq" && args.length === 2) {
        return `__ps.Nat_beq(${emitTerm(args[0], locals, ctx, target)})(${emitTerm(args[1], locals, ctx, target)})`;
      }
      if (head.tag === "const" && head.name === "Nat.leb" && args.length === 2) {
        return `__ps.Nat_leb(${emitTerm(args[0], locals, ctx, target)})(${emitTerm(args[1], locals, ctx, target)})`;
      }
      if (head.tag === "const" && head.name === "Nat.ltb" && args.length === 2) {
        return `__ps.Nat_ltb(${emitTerm(args[0], locals, ctx, target)})(${emitTerm(args[1], locals, ctx, target)})`;
      }
      if (head.tag === "const" && head.name === "Int.neg" && args.length === 1) {
        return `__ps.Int_neg(${emitTerm(args[0], locals, ctx, target)})`;
      }
      if (head.tag === "const" && head.name === "Int.add" && args.length === 2) {
        return `__ps.Int_add(${emitTerm(args[0], locals, ctx, target)})(${emitTerm(args[1], locals, ctx, target)})`;
      }
      if (head.tag === "const" && head.name === "Int.sub" && args.length === 2) {
        return `__ps.Int_sub(${emitTerm(args[0], locals, ctx, target)})(${emitTerm(args[1], locals, ctx, target)})`;
      }
      if (head.tag === "const" && head.name === "Int.beq" && args.length === 2) {
        return `__ps.Int_beq(${emitTerm(args[0], locals, ctx, target)})(${emitTerm(args[1], locals, ctx, target)})`;
      }
      if (head.tag === "const" && head.name === "Array.size" && args.length === 2) {
        return `__ps.Array_size(${emitTerm(args[1], locals, ctx, target)})`;
      }
      if (head.tag === "const" && head.name === "Array.range" && args.length === 1) {
        return `__ps.Array_range(${emitTerm(args[0], locals, ctx, target)})`;
      }
      if (head.tag === "const" && head.name === "Array.replicate" && args.length === 3) {
        return `__ps.Array_replicate(${emitTerm(args[1], locals, ctx, target)})(${emitTerm(args[2], locals, ctx, target)})`;
      }
      if (head.tag === "const" && head.name === "Array.singleton" && args.length === 2) {
        return `__ps.Array_singleton(${emitTerm(args[1], locals, ctx, target)})`;
      }
      if (head.tag === "const" && head.name === "Array.toList" && args.length === 2) {
        return `__ps.Array_toList(${emitTerm(args[1], locals, ctx, target)})`;
      }
      if (head.tag === "const" && head.name === "Array.get?" && args.length === 3) {
        return `__ps.Array_getOpt(${emitTerm(args[1], locals, ctx, target)})(${emitTerm(args[2], locals, ctx, target)})`;
      }
      if (head.tag === "const" && head.name === "Array.take" && args.length === 3) {
        return `__ps.Array_take(${emitTerm(args[1], locals, ctx, target)})(${emitTerm(args[2], locals, ctx, target)})`;
      }
      if (head.tag === "const" && head.name === "Array.drop" && args.length === 3) {
        return `__ps.Array_drop(${emitTerm(args[1], locals, ctx, target)})(${emitTerm(args[2], locals, ctx, target)})`;
      }
      if (head.tag === "const" && head.name === "Array.head?" && args.length === 2) {
        return `__ps.Array_headOpt(${emitTerm(args[1], locals, ctx, target)})`;
      }
      if (head.tag === "const" && head.name === "Array.last?" && args.length === 2) {
        return `__ps.Array_lastOpt(${emitTerm(args[1], locals, ctx, target)})`;
      }
      if (head.tag === "const" && head.name === "Array.tail?" && args.length === 2) {
        return `__ps.Array_tailOpt(${emitTerm(args[1], locals, ctx, target)})`;
      }
      if (head.tag === "const" && head.name === "Array.map" && args.length === 4) {
        return `__ps.Array_map(${emitTerm(args[2], locals, ctx, target)})(${emitTerm(args[3], locals, ctx, target)})`;
      }
      if (head.tag === "const" && head.name === "Array.foldl" && args.length === 5) {
        return `__ps.Array_foldl(${emitTerm(args[2], locals, ctx, target)})(${emitTerm(args[3], locals, ctx, target)})(${emitTerm(args[4], locals, ctx, target)})`;
      }
      if (head.tag === "const" && head.name === "Array.filter" && args.length === 3) {
        return `__ps.Array_filter(${emitTerm(args[1], locals, ctx, target)})(${emitTerm(args[2], locals, ctx, target)})`;
      }
      if (head.tag === "const" && head.name === "Array.append" && args.length === 3) {
        return `__ps.Array_append(${emitTerm(args[1], locals, ctx, target)})(${emitTerm(args[2], locals, ctx, target)})`;
      }
      if (head.tag === "const" && head.name === "Array.isEmpty" && args.length === 2) {
        return `__ps.Array_isEmpty(${emitTerm(args[1], locals, ctx, target)})`;
      }
      if (head.tag === "const" && head.name === "Array.reverse" && args.length === 2) {
        return `__ps.Array_reverse(${emitTerm(args[1], locals, ctx, target)})`;
      }
      if (head.tag === "const" && head.name === "Array.any" && args.length === 3) {
        return `__ps.Array_any(${emitTerm(args[1], locals, ctx, target)})(${emitTerm(args[2], locals, ctx, target)})`;
      }
      if (head.tag === "const" && head.name === "Array.all" && args.length === 3) {
        return `__ps.Array_all(${emitTerm(args[1], locals, ctx, target)})(${emitTerm(args[2], locals, ctx, target)})`;
      }
      if (head.tag === "const" && head.name === "Array.find?" && args.length === 3) {
        return `__ps.Array_findOpt(${emitTerm(args[1], locals, ctx, target)})(${emitTerm(args[2], locals, ctx, target)})`;
      }
      if (head.tag === "const" && head.name === "Array.countP" && args.length === 3) {
        return `__ps.Array_countP(${emitTerm(args[1], locals, ctx, target)})(${emitTerm(args[2], locals, ctx, target)})`;
      }
      if (head.tag === "const" && head.name === "Array.takeWhile" && args.length === 3) {
        return `__ps.Array_takeWhile(${emitTerm(args[1], locals, ctx, target)})(${emitTerm(args[2], locals, ctx, target)})`;
      }
      if (head.tag === "const" && head.name === "Array.dropWhile" && args.length === 3) {
        return `__ps.Array_dropWhile(${emitTerm(args[1], locals, ctx, target)})(${emitTerm(args[2], locals, ctx, target)})`;
      }
      if (head.tag === "const" && head.name === "List.map" && args.length === 4) {
        return `__ps.List_map(${emitTerm(args[2], locals, ctx, target)})(${emitTerm(args[3], locals, ctx, target)})`;
      }
      if (head.tag === "const" && head.name === "List.foldl" && args.length === 5) {
        return `__ps.List_foldl(${emitTerm(args[2], locals, ctx, target)})(${emitTerm(args[3], locals, ctx, target)})(${emitTerm(args[4], locals, ctx, target)})`;
      }
      if (head.tag === "const" && head.name === "List.filter" && args.length === 3) {
        return `__ps.List_filter(${emitTerm(args[1], locals, ctx, target)})(${emitTerm(args[2], locals, ctx, target)})`;
      }
      if (head.tag === "const" && head.name === "List.append" && args.length === 3) {
        return `__ps.List_append(${emitTerm(args[1], locals, ctx, target)})(${emitTerm(args[2], locals, ctx, target)})`;
      }
      if (head.tag === "const" && head.name === "List.length" && args.length === 2) {
        return `__ps.List_length(${emitTerm(args[1], locals, ctx, target)})`;
      }
      if (head.tag === "const" && head.name === "List.range" && args.length === 1) {
        return `__ps.List_range(${emitTerm(args[0], locals, ctx, target)})`;
      }
      if (head.tag === "const" && head.name === "List.replicate" && args.length === 3) {
        return `__ps.List_replicate(${emitTerm(args[1], locals, ctx, target)})(${emitTerm(args[2], locals, ctx, target)})`;
      }
      if (head.tag === "const" && head.name === "List.singleton" && args.length === 2) {
        return `__ps.List_singleton(${emitTerm(args[1], locals, ctx, target)})`;
      }
      if (head.tag === "const" && head.name === "List.toArray" && args.length === 2) {
        return `__ps.List_toArrayValue(${emitTerm(args[1], locals, ctx, target)})`;
      }
      if (head.tag === "const" && head.name === "List.isEmpty" && args.length === 2) {
        return `__ps.List_isEmpty(${emitTerm(args[1], locals, ctx, target)})`;
      }
      if (head.tag === "const" && head.name === "List.head?" && args.length === 2) {
        return `__ps.List_headOpt(${emitTerm(args[1], locals, ctx, target)})`;
      }
      if (head.tag === "const" && head.name === "List.get?" && args.length === 3) {
        return `__ps.List_getOpt(${emitTerm(args[1], locals, ctx, target)})(${emitTerm(args[2], locals, ctx, target)})`;
      }
      if (head.tag === "const" && head.name === "List.take" && args.length === 3) {
        return `__ps.List_take(${emitTerm(args[1], locals, ctx, target)})(${emitTerm(args[2], locals, ctx, target)})`;
      }
      if (head.tag === "const" && head.name === "List.drop" && args.length === 3) {
        return `__ps.List_drop(${emitTerm(args[1], locals, ctx, target)})(${emitTerm(args[2], locals, ctx, target)})`;
      }
      if (head.tag === "const" && head.name === "List.last?" && args.length === 2) {
        return `__ps.List_lastOpt(${emitTerm(args[1], locals, ctx, target)})`;
      }
      if (head.tag === "const" && head.name === "List.tail?" && args.length === 2) {
        return `__ps.List_tailOpt(${emitTerm(args[1], locals, ctx, target)})`;
      }
      if (head.tag === "const" && head.name === "List.reverse" && args.length === 2) {
        return `__ps.List_reverse(${emitTerm(args[1], locals, ctx, target)})`;
      }
      if (head.tag === "const" && head.name === "List.any" && args.length === 3) {
        return `__ps.List_any(${emitTerm(args[1], locals, ctx, target)})(${emitTerm(args[2], locals, ctx, target)})`;
      }
      if (head.tag === "const" && head.name === "List.all" && args.length === 3) {
        return `__ps.List_all(${emitTerm(args[1], locals, ctx, target)})(${emitTerm(args[2], locals, ctx, target)})`;
      }
      if (head.tag === "const" && head.name === "List.find?" && args.length === 3) {
        return `__ps.List_findOpt(${emitTerm(args[1], locals, ctx, target)})(${emitTerm(args[2], locals, ctx, target)})`;
      }
      if (head.tag === "const" && head.name === "List.countP" && args.length === 3) {
        return `__ps.List_countP(${emitTerm(args[1], locals, ctx, target)})(${emitTerm(args[2], locals, ctx, target)})`;
      }
      if (head.tag === "const" && head.name === "List.takeWhile" && args.length === 3) {
        return `__ps.List_takeWhile(${emitTerm(args[1], locals, ctx, target)})(${emitTerm(args[2], locals, ctx, target)})`;
      }
      if (head.tag === "const" && head.name === "List.dropWhile" && args.length === 3) {
        return `__ps.List_dropWhile(${emitTerm(args[1], locals, ctx, target)})(${emitTerm(args[2], locals, ctx, target)})`;
      }
      if (head.tag === "const" && head.name === "Option.isSome" && args.length === 2) {
        return `__ps.Option_isSome(${emitTerm(args[1], locals, ctx, target)})`;
      }
      if (head.tag === "const" && head.name === "Option.isNone" && args.length === 2) {
        return `__ps.Option_isNone(${emitTerm(args[1], locals, ctx, target)})`;
      }
      if (head.tag === "const" && head.name === "Option.getD" && args.length === 3) {
        return `__ps.Option_getD(${emitTerm(args[1], locals, ctx, target)})(${emitTerm(args[2], locals, ctx, target)})`;
      }
      if (head.tag === "const" && head.name === "Option.orElse" && args.length === 3) {
        return `__ps.Option_orElse(${emitTerm(args[1], locals, ctx, target)})(${emitTerm(args[2], locals, ctx, target)})`;
      }
      if (head.tag === "const" && head.name === "Option.fold" && args.length === 5) {
        return `__ps.Option_fold(${emitTerm(args[2], locals, ctx, target)})(${emitTerm(args[3], locals, ctx, target)})(${emitTerm(args[4], locals, ctx, target)})`;
      }
      if (head.tag === "const" && head.name === "Option.any" && args.length === 3) {
        return `__ps.Option_any(${emitTerm(args[1], locals, ctx, target)})(${emitTerm(args[2], locals, ctx, target)})`;
      }
      if (head.tag === "const" && head.name === "Option.toList" && args.length === 2) {
        return `__ps.Option_toList(${emitTerm(args[1], locals, ctx, target)})`;
      }
      if (head.tag === "const" && head.name === "Option.toArray" && args.length === 2) {
        return `__ps.Option_toArray(${emitTerm(args[1], locals, ctx, target)})`;
      }
      if (head.tag === "const" && head.name === "Option.filter" && args.length === 3) {
        return `__ps.Option_filter(${emitTerm(args[1], locals, ctx, target)})(${emitTerm(args[2], locals, ctx, target)})`;
      }
      if (head.tag === "const" && head.name === "Option.flatten" && args.length === 2) {
        return `__ps.Option_flatten(${emitTerm(args[1], locals, ctx, target)})`;
      }
      if (head.tag === "const" && head.name === "Option.toExcept" && args.length === 4) {
        return `__ps.Option_toExcept(${emitTerm(args[2], locals, ctx, target)})(${emitTerm(args[3], locals, ctx, target)})`;
      }
      if (head.tag === "const" && head.name === "Except.isOk" && args.length === 3) {
        return `__ps.Except_isOk(${emitTerm(args[2], locals, ctx, target)})`;
      }
      if (head.tag === "const" && head.name === "Except.isError" && args.length === 3) {
        return `__ps.Except_isError(${emitTerm(args[2], locals, ctx, target)})`;
      }
      if (head.tag === "const" && head.name === "Except.getD" && args.length === 4) {
        return `__ps.Except_getD(${emitTerm(args[2], locals, ctx, target)})(${emitTerm(args[3], locals, ctx, target)})`;
      }
      if (head.tag === "const" && head.name === "Except.orElse" && args.length === 4) {
        return `__ps.Except_orElse(${emitTerm(args[2], locals, ctx, target)})(${emitTerm(args[3], locals, ctx, target)})`;
      }
      if (head.tag === "const" && head.name === "Except.toOption" && args.length === 3) {
        return `__ps.Except_toOption(${emitTerm(args[2], locals, ctx, target)})`;
      }
      if (head.tag === "const" && head.name === "Except.toError" && args.length === 3) {
        return `__ps.Except_toError(${emitTerm(args[2], locals, ctx, target)})`;
      }
      if (head.tag === "const" && head.name === "Except.getErrorD" && args.length === 4) {
        return `__ps.Except_getErrorD(${emitTerm(args[2], locals, ctx, target)})(${emitTerm(args[3], locals, ctx, target)})`;
      }
      if (head.tag === "const" && head.name === "Except.swap" && args.length === 3) {
        return `__ps.Except_swap(${emitTerm(args[2], locals, ctx, target)})`;
      }
      if (head.tag === "const" && head.name === "Except.fold" && args.length === 6) {
        return `__ps.Except_fold(${emitTerm(args[3], locals, ctx, target)})(${emitTerm(args[4], locals, ctx, target)})(${emitTerm(args[5], locals, ctx, target)})`;
      }
      if (head.tag === "const" && head.name === "Except.bimap" && args.length === 7) {
        return `__ps.Except_bimap(${emitTerm(args[4], locals, ctx, target)})(${emitTerm(args[5], locals, ctx, target)})(${emitTerm(args[6], locals, ctx, target)})`;
      }
      if (head.tag === "const" && head.name === "Except.toList" && args.length === 3) {
        return `__ps.Except_toList(${emitTerm(args[2], locals, ctx, target)})`;
      }
      if (head.tag === "const" && head.name === "Except.toArray" && args.length === 3) {
        return `__ps.Except_toArray(${emitTerm(args[2], locals, ctx, target)})`;
      }
      if (head.tag === "const" && head.name === "Except.mapError" && args.length === 5) {
        return `__ps.Except_mapError(${emitTerm(args[3], locals, ctx, target)})(${emitTerm(args[4], locals, ctx, target)})`;
      }
      if (head.tag === "const" && head.name === "Except.flatten" && args.length === 3) {
        return `__ps.Except_flatten(${emitTerm(args[2], locals, ctx, target)})`;
      }
      if (head.tag === "const" && head.name === "Option.map" && args.length === 4) {
        return `__ps.Option_map(${emitTerm(args[2], locals, ctx, target)})(${emitTerm(args[3], locals, ctx, target)})`;
      }
      if (head.tag === "const" && head.name === "Except.map" && args.length === 5) {
        return `__ps.Except_map(${emitTerm(args[3], locals, ctx, target)})(${emitTerm(args[4], locals, ctx, target)})`;
      }
      if (head.tag === "const" && head.name === "Option.bind" && args.length === 4) {
        return `__ps.Option_bind(${emitTerm(args[2], locals, ctx, target)})(${emitTerm(args[3], locals, ctx, target)})`;
      }
      if (head.tag === "const" && head.name === "Except.bind" && args.length === 5) {
        return `__ps.Except_bind(${emitTerm(args[3], locals, ctx, target)})(${emitTerm(args[4], locals, ctx, target)})`;
      }
      if (head.tag === "const" && head.name === "Bool.not" && args.length === 1) {
        return `__ps.Bool_not(${emitTerm(args[0], locals, ctx, target)})`;
      }
      if (head.tag === "const" && head.name === "Bool.xor" && args.length === 2) {
        return `__ps.Bool_xor(${emitTerm(args[0], locals, ctx, target)})(${emitTerm(args[1], locals, ctx, target)})`;
      }
      if (head.tag === "const" && head.name === "Bool.rec" && args.length === 4) {
        const [_motive, falseBranch, trueBranch, condition] = args;
        return `((${emitTerm(condition, locals, ctx, target)}) ? (${emitTerm(trueBranch, locals, ctx, target)}) : (${emitTerm(falseBranch, locals, ctx, target)}))`;
      }
      if (head.tag === "const" && head.name === "Nat.rec" && args.length === 4) {
        const [_motive, zeroBranch, succBranch, scrutinee] = args;
        return `__ps.Nat_rec(${emitTerm(zeroBranch, locals, ctx, target)})(${emitTerm(succBranch, locals, ctx, target)})(${emitTerm(scrutinee, locals, ctx, target)})`;
      }
      if (head.tag === "const") {
        const projection = ctx.projections.get(head.name);
        if (projection) {
          if (args.length < projection.paramArity + 1) throw new Error(`unsupported executable Core projection '${head.name}': expected ${projection.paramArity} erased parameter argument(s) and a structure value`);
          let out = `__ps.Struct_proj(${emitTerm(args[projection.paramArity], locals, ctx, target)})(${projection.fieldIndex})`;
          for (const arg of args.slice(projection.paramArity + 1)) out = `${out}(${emitTerm(arg, locals, ctx, target)})`;
          return out;
        }
      }
      if (head.tag === "const") {
        const recursor = ctx.recursors.get(head.name);
        if (recursor) {
          const expectedArgCount = recursor.paramArity + 1 + recursor.arities.length + 1;
          if (args.length !== expectedArgCount) throw new Error(`unsupported executable Core recursor '${head.name}': expected ${recursor.paramArity} erased parameter(s), motive, ${recursor.arities.length} branch(es), and scrutinee`);
          const branchStart = recursor.paramArity + 1;
          const branches = args.slice(branchStart, branchStart + recursor.arities.length);
          const scrutinee = args[args.length - 1];
          const hasRecursiveFields = recursor.recursiveFieldPositions.some(positions => positions.length > 0);
          if (recursor.arities.length === 1 && !hasRecursiveFields) {
            return `__ps.Struct_rec(${JSON.stringify(recursor.owner)}, 0, ${recursor.arities[0]})(${emitTerm(branches[0], locals, ctx, target)})(${emitTerm(scrutinee, locals, ctx, target)})`;
          }
          return `__ps.Inductive_rec(${JSON.stringify(recursor.owner)}, [${recursor.arities.join(", ")}], ${JSON.stringify(recursor.recursiveFieldPositions)})([${branches.map(branch => emitTerm(branch, locals, ctx, target)).join(", ")}])(${emitTerm(scrutinee, locals, ctx, target)})`;
        }
      }
      if (head.tag === "const") {
        const ctor = ctx.constructors.get(head.name);
        if (ctor) {
          const expectedArgCount = ctor.paramArity + ctor.arity;
          if (args.length === expectedArgCount) {
            const fieldArgs = args.slice(ctor.paramArity);
            return `__ps.Struct_mk(${JSON.stringify(ctor.owner)}, ${ctor.ctorIndex}, [${fieldArgs.map(arg => emitTerm(arg, locals, ctx, target)).join(", ")}])`;
          }
          if (args.length === ctor.paramArity && ctor.arity > 0) {
            return `__ps.Struct_ctor(${JSON.stringify(ctor.owner)}, ${ctor.ctorIndex}, ${ctor.arity})`;
          }
        }
      }
      return args.reduce((acc, arg) => `${acc}(${emitTerm(arg, locals, ctx, target)})`, emitTerm(head, locals, ctx, target));
    }
    case "let": {
      const v = `x${locals.length}`;
      return `((() => { const ${v} = ${emitTerm(term.value, locals, ctx, target)}; return ${emitTerm(term.body, [...locals, v], ctx, target)}; })())`;
    }
    case "proj":
      return `__ps.Struct_proj(${emitTerm(term.expr, locals, ctx, target)})(${term.index})`;
    case "sort":
    case "pi":
      throw new Error(`unsupported executable Core term '${term.tag}' in PSC-1 standalone JS subset`);
  }
}

export function termHeadConstName(term: Term): string | undefined {
  const { head } = flattenApp(term);
  return head.tag === "const" ? head.name : undefined;
}
