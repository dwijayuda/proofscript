import { ProofScriptError } from "../../core/errors.js";
import type { IRExpr, IRParam, IRType, SurfaceExpr } from "../../core/model.js";
import type { PluginManifest, ProofScriptPlugin } from "../../core/plugin-api.js";


function leanCharOfNat(value: number): string {
  const valid = value < 0xd800 || (value > 0xdfff && value < 0x110000);
  return String.fromCodePoint(valid ? value : 0);
}

function decodePortableStringLiteral(raw: string): string {
  if (raw.length < 2 || raw[0] !== '"' || raw.at(-1) !== '"') {
    throw new ProofScriptError("PS2B02", "Malformed String literal in String ++.");
  }
  let out = "";
  for (let i = 1; i < raw.length - 1; i += 1) {
    const ch = raw[i]!;
    if (ch !== "\\") { out += ch; continue; }
    i += 1;
    if (i >= raw.length - 1) throw new ProofScriptError("PS2B02", "Incomplete String escape in String ++.");
    const esc = raw[i]!;
    switch (esc) {
      case "\\": out += "\\"; break;
      case '"': out += '"'; break;
      case "'": out += "'"; break;
      case "n": out += "\n"; break;
      case "r": out += "\r"; break;
      case "t": out += "\t"; break;
      case "x": {
        const digits = raw.slice(i + 1, i + 3);
        if (!/^[0-9A-Fa-f]{2}$/.test(digits)) throw new ProofScriptError("PS2B02", "Malformed Lean \\xHH String escape in String ++.");
        out += leanCharOfNat(Number.parseInt(digits, 16));
        i += 2;
        break;
      }
      case "u": {
        const digits = raw.slice(i + 1, i + 5);
        if (!/^[0-9A-Fa-f]{4}$/.test(digits)) throw new ProofScriptError("PS2B02", "Malformed Lean \\uHHHH String escape in String ++.");
        out += leanCharOfNat(Number.parseInt(digits, 16));
        i += 4;
        break;
      }
      default:
        throw new ProofScriptError("PS2B02", `String ++ does not support invalid Lean escape '\\${esc}'.`);
    }
  }
  return out;
}

function encodePortableStringLiteral(value: string): string {
  let out = '"';
  for (const ch of value) {
    const cp = ch.codePointAt(0)!;
    switch (ch) {
      case "\\": out += "\\\\"; break;
      case '"': out += '\\"'; break;
      case "\n": out += "\\n"; break;
      case "\r": out += "\\r"; break;
      case "\t": out += "\\t"; break;
      default:
        if (cp < 0x20 || cp === 0x7f) out += `\\x${cp.toString(16).padStart(2, "0")}`;
        else out += ch;
    }
  }
  return `${out}"`;
}


function valueParam(name: string, type: IRType): IRParam { return { name, type, binderInfo: "explicit" }; }

function decodedPortableStringLength(raw: string): number {
  return Array.from(decodePortableStringLiteral(raw)).length;
}

function utf8ByteSizeOfDecodedString(value: string): number {
  let bytes = 0;
  for (const ch of value) {
    const cp = ch.codePointAt(0)!;
    bytes += cp <= 0x7f ? 1 : cp <= 0x7ff ? 2 : cp <= 0xffff ? 3 : 4;
  }
  return bytes;
}

function decodedPortableStringUtf8ByteSize(raw: string): number {
  return utf8ByteSizeOfDecodedString(decodePortableStringLiteral(raw));
}

function literalStringValue(expr: IRExpr, feature: string): string {
  if (expr.kind === "literal" && expr.op === "core.string.literal") return decodePortableStringLiteral(expr.value);
  if (expr.kind === "op" && expr.op === "core.string.append.literal" && expr.args.length === 2) {
    return literalStringValue(expr.args[0]!, feature) + literalStringValue(expr.args[1]!, feature);
  }
  if (expr.kind === "op" && expr.op === "core.string.take.literal" && expr.args.length === 2) {
    return literalTake(expr.args[0]!, expr.args[1]!);
  }
  if (expr.kind === "op" && expr.op === "core.string.drop.literal" && expr.args.length === 2) {
    return literalDrop(expr.args[0]!, expr.args[1]!);
  }
  if (expr.kind === "op" && expr.op === "core.string.takeRight.literal" && expr.args.length === 2) {
    return literalTakeRight(expr.args[0]!, expr.args[1]!);
  }
  if (expr.kind === "op" && expr.op === "core.string.dropRight.literal" && expr.args.length === 2) {
    return literalDropRight(expr.args[0]!, expr.args[1]!);
  }
  if (expr.kind === "op" && expr.op === "core.string.stripPrefix.literal" && expr.args.length === 2) {
    return literalStripPrefix(expr.args[0]!, expr.args[1]!);
  }
  if (expr.kind === "op" && expr.op === "core.string.stripSuffix.literal" && expr.args.length === 2) {
    return literalStripSuffix(expr.args[0]!, expr.args[1]!);
  }
  throw new ProofScriptError("PS2B09", `${feature} currently supports only literal String operands in the bounded P6 portable slice.`);
}

function literalNatValue(expr: IRExpr, feature: string): bigint {
  if (expr.kind === "literal" && expr.op === "core.nat.literal") return BigInt(expr.value);
  if (expr.kind === "op" && expr.op === "core.string.length.literal" && expr.args.length === 1) {
    return BigInt(literalLength(expr.args[0]!));
  }
  if (expr.kind === "op" && expr.op === "core.string.utf8ByteSize.literal" && expr.args.length === 1) {
    return BigInt(literalUtf8ByteSize(expr.args[0]!));
  }
  throw new ProofScriptError("PS2B10", `${feature} currently supports only literal Nat operands in the bounded P6 portable slice.`);
}

function literalTake(subject: IRExpr, count: IRExpr): string {
  const chars = Array.from(literalStringValue(subject, "String.take"));
  const n = literalNatValue(count, "String.take");
  return n >= BigInt(chars.length) ? chars.join("") : chars.slice(0, Number(n)).join("");
}

function literalDrop(subject: IRExpr, count: IRExpr): string {
  const chars = Array.from(literalStringValue(subject, "String.drop"));
  const n = literalNatValue(count, "String.drop");
  return n >= BigInt(chars.length) ? "" : chars.slice(Number(n)).join("");
}

function literalTakeRight(subject: IRExpr, count: IRExpr): string {
  const chars = Array.from(literalStringValue(subject, "String.takeRight"));
  const n = literalNatValue(count, "String.takeRight");
  return n >= BigInt(chars.length) ? chars.join("") : chars.slice(chars.length - Number(n)).join("");
}

function literalDropRight(subject: IRExpr, count: IRExpr): string {
  const chars = Array.from(literalStringValue(subject, "String.dropRight"));
  const n = literalNatValue(count, "String.dropRight");
  return n >= BigInt(chars.length) ? "" : chars.slice(0, chars.length - Number(n)).join("");
}

function literalStripPrefix(subject: IRExpr, prefix: IRExpr): string {
  const value = literalStringValue(subject, "String.stripPrefix");
  const prefixValue = literalStringValue(prefix, "String.stripPrefix");
  return value.startsWith(prefixValue) ? value.slice(prefixValue.length) : value;
}

function literalStripSuffix(subject: IRExpr, suffix: IRExpr): string {
  const value = literalStringValue(subject, "String.stripSuffix");
  const suffixValue = literalStringValue(suffix, "String.stripSuffix");
  return value.endsWith(suffixValue) ? value.slice(0, value.length - suffixValue.length) : value;
}

function literalLength(expr: IRExpr): number {
  return Array.from(literalStringValue(expr, "String.length")).length;
}

function literalUtf8ByteSize(expr: IRExpr): number {
  return utf8ByteSizeOfDecodedString(literalStringValue(expr, "String.utf8ByteSize"));
}

function literalIsEmpty(expr: IRExpr): boolean {
  return literalStringValue(expr, "String.isEmpty").length === 0;
}

function isAsciiDecimalNat(value: string): boolean {
  return value.length > 0 && Array.from(value).every((ch) => ch >= "0" && ch <= "9");
}

function literalIsNat(expr: IRExpr): boolean {
  return isAsciiDecimalNat(literalStringValue(expr, "String.isNat"));
}

function literalStartsWith(subject: IRExpr, prefix: IRExpr): boolean {
  return literalStringValue(subject, "String.startsWith").startsWith(literalStringValue(prefix, "String.startsWith"));
}

function literalEndsWith(subject: IRExpr, suffix: IRExpr): boolean {
  return literalStringValue(subject, "String.endsWith").endsWith(literalStringValue(suffix, "String.endsWith"));
}

function literalContains(subject: IRExpr, needle: IRExpr): boolean {
  return literalStringValue(subject, "String.contains").includes(literalStringValue(needle, "String.contains"));
}

function literalIsPrefixOf(prefix: IRExpr, subject: IRExpr): boolean {
  return literalStringValue(subject, "String.isPrefixOf").startsWith(literalStringValue(prefix, "String.isPrefixOf"));
}

function literalBeq(left: IRExpr, right: IRExpr): boolean {
  return literalStringValue(left, "String.beq") === literalStringValue(right, "String.beq");
}

function isStringLiteral(expr: SurfaceExpr): expr is Extract<SurfaceExpr, { readonly kind: "string" }> {
  return expr.kind === "string";
}

function literalConcat(left: SurfaceExpr, right: SurfaceExpr, stringType: IRType): IRExpr {
  if (!isStringLiteral(left) || !isStringLiteral(right)) {
    throw new ProofScriptError("PS2B02", "String ++ currently supports only literal operands in the bounded P6 portable slice.");
  }
  return {
    kind: "literal",
    op: "core.string.literal",
    value: encodePortableStringLiteral(decodePortableStringLiteral(left.text) + decodePortableStringLiteral(right.text)),
    type: stringType,
  };
}

export const proofscriptManifest: PluginManifest = {
  schema: "proofscript.plugin/v1",
  id: "proofscript.feature.string",
  version: "0.91.0",
  kind: "feature",
  semanticIds: ["core.string.literal", "core.string.concat.literal", "core.string.append.literal", "core.string.take.literal", "core.string.drop.literal", "core.string.takeRight.literal", "core.string.dropRight.literal", "core.string.stripPrefix.literal", "core.string.stripSuffix.literal", "core.string.length.literal", "core.string.utf8ByteSize.literal", "core.string.isEmpty.literal", "core.string.isNat.literal", "core.string.startsWith.literal", "core.string.endsWith.literal", "core.string.contains.literal", "core.string.isPrefixOf.literal", "core.string.beq.literal"],
  proofscriptBaseline: "v0.1",
  leanBaseline: "4.33.1",
  lean: { assumptionPolicy: "none" },
};

const plugin: ProofScriptPlugin = {
  id: proofscriptManifest.id,
  version: proofscriptManifest.version,
  kind: "feature",
  requires: ["proofscript.feature.nat"],
  setup(registry) {
    registry.registerType("String", "String");
    const stringType: IRType = { form: "nominal", id: "String", displayName: "String" };
    const natType: IRType = { form: "nominal", id: "Nat", displayName: "Nat" };
    registry.registerOperation("core.string.literal", {
      requiredCapabilities: ["core.string"],
      verification: { level: "kernel-checkable", notes: "Lean String literal semantics; the raw literal spelling is preserved for Lean emission." },
    });
    registry.registerOperation("core.string.append.literal", {
      requiredCapabilities: ["core.string"],
      verification: { level: "kernel-checkable", notes: "P6 literal-only String.append folds decoded portable Lean String literals before Core lowering." },
    });
    registry.registerOperation("core.string.take.literal", {
      requiredCapabilities: ["core.string", "core.nat"],
      verification: { level: "kernel-checkable", notes: "P6 literal-only String.take folds decoded portable Lean String literals and literal Nat counts before Core lowering." },
    });
    registry.registerOperation("core.string.drop.literal", {
      requiredCapabilities: ["core.string", "core.nat"],
      verification: { level: "kernel-checkable", notes: "P6 literal-only String.drop folds decoded portable Lean String literals and literal Nat counts before Core lowering." },
    });
    registry.registerOperation("core.string.takeRight.literal", {
      requiredCapabilities: ["core.string", "core.nat"],
      verification: { level: "kernel-checkable", notes: "P6 literal-only String.takeRight folds decoded portable Lean String literals and literal Nat counts before Core lowering." },
    });
    registry.registerOperation("core.string.dropRight.literal", {
      requiredCapabilities: ["core.string", "core.nat"],
      verification: { level: "kernel-checkable", notes: "P6 literal-only String.dropRight folds decoded portable Lean String literals and literal Nat counts before Core lowering." },
    });
    registry.registerOperation("core.string.stripPrefix.literal", {
      requiredCapabilities: ["core.string"],
      verification: { level: "kernel-checkable", notes: "P6 literal-only String.stripPrefix folds decoded portable Lean String literals before Core lowering." },
    });
    registry.registerOperation("core.string.stripSuffix.literal", {
      requiredCapabilities: ["core.string"],
      verification: { level: "kernel-checkable", notes: "P6 literal-only String.stripSuffix folds decoded portable Lean String literals before Core lowering." },
    });
    registry.registerOperation("core.string.length.literal", {
      requiredCapabilities: ["core.string", "core.nat"],
      verification: { level: "kernel-checkable", notes: "P6 literal-only String.length folds decoded portable Lean String literals to Nat before Core lowering." },
    });
    registry.registerOperation("core.string.utf8ByteSize.literal", {
      requiredCapabilities: ["core.string", "core.nat"],
      verification: { level: "kernel-checkable", notes: "P6 literal-only String.utf8ByteSize folds decoded portable Lean String literals to Nat before Core lowering." },
    });
    registry.registerOperation("core.string.isEmpty.literal", {
      requiredCapabilities: ["core.string", "core.bool"],
      verification: { level: "kernel-checkable", notes: "P6 literal-only String.isEmpty folds decoded portable Lean String literals to Bool before Core lowering." },
    });
    registry.registerOperation("core.string.isNat.literal", {
      requiredCapabilities: ["core.string", "core.bool"],
      verification: { level: "kernel-checkable", notes: "P6 literal-only String.isNat folds decoded portable Lean String literals to Bool before Core lowering." },
    });
    registry.registerOperation("core.string.startsWith.literal", {
      requiredCapabilities: ["core.string", "core.bool"],
      verification: { level: "kernel-checkable", notes: "P6 literal-only String.startsWith folds decoded portable Lean String literals to Bool before Core lowering." },
    });
    registry.registerOperation("core.string.endsWith.literal", {
      requiredCapabilities: ["core.string", "core.bool"],
      verification: { level: "kernel-checkable", notes: "P6 literal-only String.endsWith folds decoded portable Lean String literals to Bool before Core lowering." },
    });
    registry.registerOperation("core.string.contains.literal", {
      requiredCapabilities: ["core.string", "core.bool"],
      verification: { level: "kernel-checkable", notes: "P6 literal-only String.contains folds decoded portable Lean String literals to Bool before Core lowering." },
    });
    registry.registerOperation("core.string.isPrefixOf.literal", {
      requiredCapabilities: ["core.string", "core.bool"],
      verification: { level: "kernel-checkable", notes: "P6 literal-only String.isPrefixOf folds decoded portable Lean String literals to Bool before Core lowering, using Lean's prefix-first argument order." },
    });
    registry.registerOperation("core.string.beq.literal", {
      requiredCapabilities: ["core.string", "core.bool"],
      verification: { level: "kernel-checkable", notes: "P6 literal-only String.beq folds decoded portable Lean String literals to Bool before Core lowering." },
    });
    registry.registerBuiltinFunction("String.append", {
      params: [valueParam("s", stringType), valueParam("t", stringType)],
      result: stringType,
      operation: "core.string.append.literal",
    });
    registry.registerBuiltinFunction("String.take", {
      params: [valueParam("s", stringType), valueParam("n", natType)],
      result: stringType,
      operation: "core.string.take.literal",
    });
    registry.registerBuiltinFunction("String.drop", {
      params: [valueParam("s", stringType), valueParam("n", natType)],
      result: stringType,
      operation: "core.string.drop.literal",
    });
    registry.registerBuiltinFunction("String.takeRight", {
      params: [valueParam("s", stringType), valueParam("n", natType)],
      result: stringType,
      operation: "core.string.takeRight.literal",
    });
    registry.registerBuiltinFunction("String.dropRight", {
      params: [valueParam("s", stringType), valueParam("n", natType)],
      result: stringType,
      operation: "core.string.dropRight.literal",
    });
    registry.registerBuiltinFunction("String.stripPrefix", {
      params: [valueParam("s", stringType), valueParam("pre", stringType)],
      result: stringType,
      operation: "core.string.stripPrefix.literal",
    });
    registry.registerBuiltinFunction("String.stripSuffix", {
      params: [valueParam("s", stringType), valueParam("suff", stringType)],
      result: stringType,
      operation: "core.string.stripSuffix.literal",
    });
    registry.registerBuiltinFunction("String.length", {
      params: [valueParam("s", stringType)],
      result: natType,
      operation: "core.string.length.literal",
    });
    registry.registerBuiltinFunction("String.utf8ByteSize", {
      params: [valueParam("s", stringType)],
      result: natType,
      operation: "core.string.utf8ByteSize.literal",
    });
    registry.registerBuiltinFunction("String.isEmpty", {
      params: [valueParam("s", stringType)],
      result: { form: "nominal", id: "Bool", displayName: "Bool" },
      operation: "core.string.isEmpty.literal",
    });
    registry.registerBuiltinFunction("String.isNat", {
      params: [valueParam("s", stringType)],
      result: { form: "nominal", id: "Bool", displayName: "Bool" },
      operation: "core.string.isNat.literal",
    });
    registry.registerBuiltinFunction("String.startsWith", {
      params: [valueParam("s", stringType), valueParam("prefix", stringType)],
      result: { form: "nominal", id: "Bool", displayName: "Bool" },
      operation: "core.string.startsWith.literal",
    });
    registry.registerBuiltinFunction("String.endsWith", {
      params: [valueParam("s", stringType), valueParam("suffix", stringType)],
      result: { form: "nominal", id: "Bool", displayName: "Bool" },
      operation: "core.string.endsWith.literal",
    });
    registry.registerBuiltinFunction("String.contains", {
      params: [valueParam("s", stringType), valueParam("needle", stringType)],
      result: { form: "nominal", id: "Bool", displayName: "Bool" },
      operation: "core.string.contains.literal",
    });
    registry.registerBuiltinFunction("String.isPrefixOf", {
      params: [valueParam("prefix", stringType), valueParam("s", stringType)],
      result: { form: "nominal", id: "Bool", displayName: "Bool" },
      operation: "core.string.isPrefixOf.literal",
    });
    registry.registerBuiltinFunction("String.beq", {
      params: [valueParam("s", stringType), valueParam("t", stringType)],
      result: { form: "nominal", id: "Bool", displayName: "Bool" },
      operation: "core.string.beq.literal",
    });
    registry.registerInfixSyntax({ operator: "++", precedence: 65 });
    registry.registerBinaryElaborator({
      operator: "++",
      elaborateSurface(left, right, expected, context) {
        const stringType = context.resolveType("String");
        if (expected && expected.id !== stringType.id) {
          throw new ProofScriptError("PS2B02", `String ++ cannot inhabit '${expected.displayName}'.`);
        }
        return literalConcat(left, right, stringType);
      },
      elaborate() { throw new ProofScriptError("PS2B02", "String ++ requires literal surface operands."); },
    });
    registry.registerLiteralElaborator({
      literalKind: "string",
      supports(expected, resolveType) {
        const stringType = resolveType("String");
        return expected === undefined || expected.id === stringType.id;
      },
      elaborate(text, expected, resolveType) {
        const stringType = resolveType("String");
        if (expected && expected.id !== stringType.id) {
          throw new ProofScriptError("PS2B01", `String literal ${text} cannot inhabit '${expected.displayName}'.`);
        }
        return { kind: "literal", op: "core.string.literal", value: text, type: stringType };
      },
    });
    registry.registerLeanTypeLowering("String", () => "String");
    registry.registerLeanExprLowering("core.string.literal", (expr) => {
      if (expr.kind !== "literal") throw new ProofScriptError("PS4B01", "Expected String literal IR node.");
      return expr.value;
    });
    registry.registerLeanExprLowering("core.string.append.literal", (expr) => {
      if (expr.kind !== "op" || expr.args.length !== 2) throw new ProofScriptError("PS4B08", "Malformed String.append IR node.");
      return encodePortableStringLiteral(literalStringValue(expr, "String.append"));
    });
    registry.registerLeanExprLowering("core.string.take.literal", (expr) => {
      if (expr.kind !== "op" || expr.args.length !== 2) throw new ProofScriptError("PS4B09", "Malformed String.take IR node.");
      return encodePortableStringLiteral(literalTake(expr.args[0]!, expr.args[1]!));
    });
    registry.registerLeanExprLowering("core.string.drop.literal", (expr) => {
      if (expr.kind !== "op" || expr.args.length !== 2) throw new ProofScriptError("PS4B10", "Malformed String.drop IR node.");
      return encodePortableStringLiteral(literalDrop(expr.args[0]!, expr.args[1]!));
    });
    registry.registerLeanExprLowering("core.string.takeRight.literal", (expr) => {
      if (expr.kind !== "op" || expr.args.length !== 2) throw new ProofScriptError("PS4B11", "Malformed String.takeRight IR node.");
      return encodePortableStringLiteral(literalTakeRight(expr.args[0]!, expr.args[1]!));
    });
    registry.registerLeanExprLowering("core.string.dropRight.literal", (expr) => {
      if (expr.kind !== "op" || expr.args.length !== 2) throw new ProofScriptError("PS4B12", "Malformed String.dropRight IR node.");
      return encodePortableStringLiteral(literalDropRight(expr.args[0]!, expr.args[1]!));
    });
    registry.registerLeanExprLowering("core.string.stripPrefix.literal", (expr) => {
      if (expr.kind !== "op" || expr.args.length !== 2) throw new ProofScriptError("PS4B15", "Malformed String.stripPrefix IR node.");
      return encodePortableStringLiteral(literalStripPrefix(expr.args[0]!, expr.args[1]!));
    });
    registry.registerLeanExprLowering("core.string.stripSuffix.literal", (expr) => {
      if (expr.kind !== "op" || expr.args.length !== 2) throw new ProofScriptError("PS4B16", "Malformed String.stripSuffix IR node.");
      return encodePortableStringLiteral(literalStripSuffix(expr.args[0]!, expr.args[1]!));
    });
    registry.registerLeanExprLowering("core.string.length.literal", (expr) => {
      if (expr.kind !== "op" || expr.args.length !== 1) throw new ProofScriptError("PS4B02", "Malformed String.length IR node.");
      return String(literalLength(expr.args[0]!));
    });
    registry.registerLeanExprLowering("core.string.utf8ByteSize.literal", (expr) => {
      if (expr.kind !== "op" || expr.args.length !== 1) throw new ProofScriptError("PS4B07", "Malformed String.utf8ByteSize IR node.");
      return String(literalUtf8ByteSize(expr.args[0]!));
    });
    registry.registerLeanExprLowering("core.string.isEmpty.literal", (expr) => {
      if (expr.kind !== "op" || expr.args.length !== 1) throw new ProofScriptError("PS4B03", "Malformed String.isEmpty IR node.");
      return literalIsEmpty(expr.args[0]!) ? "true" : "false";
    });
    registry.registerLeanExprLowering("core.string.isNat.literal", (expr) => {
      if (expr.kind !== "op" || expr.args.length !== 1) throw new ProofScriptError("PS4B17", "Malformed String.isNat IR node.");
      return literalIsNat(expr.args[0]!) ? "true" : "false";
    });
    registry.registerLeanExprLowering("core.string.startsWith.literal", (expr) => {
      if (expr.kind !== "op" || expr.args.length !== 2) throw new ProofScriptError("PS4B04", "Malformed String.startsWith IR node.");
      return literalStartsWith(expr.args[0]!, expr.args[1]!) ? "true" : "false";
    });
    registry.registerLeanExprLowering("core.string.endsWith.literal", (expr) => {
      if (expr.kind !== "op" || expr.args.length !== 2) throw new ProofScriptError("PS4B05", "Malformed String.endsWith IR node.");
      return literalEndsWith(expr.args[0]!, expr.args[1]!) ? "true" : "false";
    });
    registry.registerLeanExprLowering("core.string.contains.literal", (expr) => {
      if (expr.kind !== "op" || expr.args.length !== 2) throw new ProofScriptError("PS4B06", "Malformed String.contains IR node.");
      return literalContains(expr.args[0]!, expr.args[1]!) ? "true" : "false";
    });
    registry.registerLeanExprLowering("core.string.isPrefixOf.literal", (expr) => {
      if (expr.kind !== "op" || expr.args.length !== 2) throw new ProofScriptError("PS4B14", "Malformed String.isPrefixOf IR node.");
      return literalIsPrefixOf(expr.args[0]!, expr.args[1]!) ? "true" : "false";
    });
    registry.registerLeanExprLowering("core.string.beq.literal", (expr) => {
      if (expr.kind !== "op" || expr.args.length !== 2) throw new ProofScriptError("PS4B13", "Malformed String.beq IR node.");
      return literalBeq(expr.args[0]!, expr.args[1]!) ? "true" : "false";
    });
  },
};

export default plugin;
