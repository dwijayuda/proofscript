import { ProofScriptError } from "../../core/errors.js";
import type { IRExpr } from "../../core/model.js";
import type { ProofScriptPlugin } from "../../core/plugin-api.js";

/**
 * Decode the deliberately small portable string-literal subset used by the
 * TypeScript runtime correspondence. Lean emission preserves the original
 * literal spelling, while unsupported Lean-only escape forms fail closed for
 * TypeScript instead of being reinterpreted with JavaScript rules.
 */
function leanCharOfNat(value: number): string {
  // Lean Char.ofNat maps invalid Unicode scalar values (including UTF-16
  // surrogates) to U+0000 rather than preserving an invalid code unit.
  const valid = value < 0xd800 || (value > 0xdfff && value < 0x110000);
  return String.fromCodePoint(valid ? value : 0);
}

function decodePortableStringLiteral(raw: string): string {
  if (raw.length < 2 || raw[0] !== '"' || raw.at(-1) !== '"') {
    throw new ProofScriptError("PS3B01", "Malformed String literal in Semantic IR.");
  }
  let out = "";
  for (let i = 1; i < raw.length - 1; i += 1) {
    const ch = raw[i]!;
    if (ch !== "\\") { out += ch; continue; }
    i += 1;
    if (i >= raw.length - 1) throw new ProofScriptError("PS3B02", "Incomplete String escape in Semantic IR.");
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
        if (!/^[0-9A-Fa-f]{2}$/.test(digits)) throw new ProofScriptError("PS3B03", "Malformed Lean \\xHH String escape.");
        out += leanCharOfNat(Number.parseInt(digits, 16));
        i += 2;
        break;
      }
      case "u": {
        const digits = raw.slice(i + 1, i + 5);
        if (!/^[0-9A-Fa-f]{4}$/.test(digits)) throw new ProofScriptError("PS3B03", "Malformed Lean \\uHHHH String escape.");
        out += leanCharOfNat(Number.parseInt(digits, 16));
        i += 4;
        break;
      }
      default:
        // This path should normally be rejected by the lexer too; keep the
        // backend check as a defense against malformed/forged Semantic IR.
        throw new ProofScriptError("PS3B03", `TypeScript String runtime correspondence does not support invalid Lean escape '\\${esc}'.`);
    }
  }
  return out;
}


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

function decodedPortableStringIsEmpty(raw: string): boolean {
  return decodePortableStringLiteral(raw).length === 0;
}


function isAsciiDecimalNat(value: string): boolean {
  return value.length > 0 && Array.from(value).every((ch) => ch >= "0" && ch <= "9");
}

function literalStringValue(expr: IRExpr, feature: string): string {
  if (expr.kind === "literal" && expr.op === "core.string.literal" && typeof expr.value === "string") return decodePortableStringLiteral(expr.value);
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
  throw new ProofScriptError("PS3B09", `TypeScript P6 ${feature} supports only literal operands.`);
}

function literalNatValue(expr: IRExpr, feature: string): bigint {
  if (expr.kind === "literal" && expr.op === "core.nat.literal" && typeof expr.value === "string") return BigInt(expr.value);
  if (expr.kind === "op" && expr.op === "core.string.length.literal" && expr.args.length === 1) {
    return BigInt(Array.from(literalStringValue(expr.args[0]!, "String.length")).length);
  }
  if (expr.kind === "op" && expr.op === "core.string.utf8ByteSize.literal" && expr.args.length === 1) {
    return BigInt(utf8ByteSizeOfDecodedString(literalStringValue(expr.args[0]!, "String.utf8ByteSize")));
  }
  throw new ProofScriptError("PS3B14", `TypeScript P6 ${feature} supports only literal Nat operands.`);
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

function requireLiteralStringArg(expr: IRExpr, feature: string): string {
  return literalStringValue(expr, feature);
}

function literalIsPrefixOf(prefix: IRExpr, subject: IRExpr): boolean {
  return literalStringValue(subject, "String.isPrefixOf").startsWith(literalStringValue(prefix, "String.isPrefixOf"));
}

function literalBeq(left: IRExpr, right: IRExpr): boolean {
  return literalStringValue(left, "String.beq") === literalStringValue(right, "String.beq");
}

const plugin: ProofScriptPlugin = {
  id: "proofscript.backend-feature.typescript-string",
  version: "0.91.0",
  kind: "backend-feature",
  requires: ["proofscript.backend.typescript", "proofscript.feature.string"],
  setup(registry) {
    registry.addTargetCapability("typescript", "core.string");
    registry.registerTargetTypeLowering("typescript", "String", () => "string");
    registry.registerTargetExprLowering("typescript", "core.string.literal", (expr) => {
      if (expr.kind !== "literal") throw new ProofScriptError("PS3B04", "Expected String literal IR node.");
      return JSON.stringify(decodePortableStringLiteral(expr.value));
    });
    registry.registerTargetExprLowering("typescript", "core.string.append.literal", (expr) => {
      if (expr.kind !== "op" || expr.args.length !== 2) throw new ProofScriptError("PS3B15", "Malformed String.append IR node.");
      return JSON.stringify(literalStringValue(expr, "String.append"));
    });
    registry.registerTargetExprLowering("typescript", "core.string.take.literal", (expr) => {
      if (expr.kind !== "op" || expr.args.length !== 2) throw new ProofScriptError("PS3B16", "Malformed String.take IR node.");
      return JSON.stringify(literalTake(expr.args[0]!, expr.args[1]!));
    });
    registry.registerTargetExprLowering("typescript", "core.string.drop.literal", (expr) => {
      if (expr.kind !== "op" || expr.args.length !== 2) throw new ProofScriptError("PS3B17", "Malformed String.drop IR node.");
      return JSON.stringify(literalDrop(expr.args[0]!, expr.args[1]!));
    });
    registry.registerTargetExprLowering("typescript", "core.string.takeRight.literal", (expr) => {
      if (expr.kind !== "op" || expr.args.length !== 2) throw new ProofScriptError("PS3B18", "Malformed String.takeRight IR node.");
      return JSON.stringify(literalTakeRight(expr.args[0]!, expr.args[1]!));
    });
    registry.registerTargetExprLowering("typescript", "core.string.dropRight.literal", (expr) => {
      if (expr.kind !== "op" || expr.args.length !== 2) throw new ProofScriptError("PS3B19", "Malformed String.dropRight IR node.");
      return JSON.stringify(literalDropRight(expr.args[0]!, expr.args[1]!));
    });
    registry.registerTargetExprLowering("typescript", "core.string.stripPrefix.literal", (expr) => {
      if (expr.kind !== "op" || expr.args.length !== 2) throw new ProofScriptError("PS3B22", "Malformed String.stripPrefix IR node.");
      return JSON.stringify(literalStripPrefix(expr.args[0]!, expr.args[1]!));
    });
    registry.registerTargetExprLowering("typescript", "core.string.stripSuffix.literal", (expr) => {
      if (expr.kind !== "op" || expr.args.length !== 2) throw new ProofScriptError("PS3B23", "Malformed String.stripSuffix IR node.");
      return JSON.stringify(literalStripSuffix(expr.args[0]!, expr.args[1]!));
    });
    registry.registerTargetExprLowering("typescript", "core.string.length.literal", (expr) => {
      if (expr.kind !== "op" || expr.args.length !== 1) throw new ProofScriptError("PS3B05", "Malformed String.length IR node.");
      return `${Array.from(literalStringValue(expr.args[0]!, "String.length")).length}n`;
    });
    registry.registerTargetExprLowering("typescript", "core.string.utf8ByteSize.literal", (expr) => {
      if (expr.kind !== "op" || expr.args.length !== 1) throw new ProofScriptError("PS3B13", "Malformed String.utf8ByteSize IR node.");
      return `${utf8ByteSizeOfDecodedString(literalStringValue(expr.args[0]!, "String.utf8ByteSize"))}n`;
    });
    registry.registerTargetExprLowering("typescript", "core.string.isEmpty.literal", (expr) => {
      if (expr.kind !== "op" || expr.args.length !== 1) throw new ProofScriptError("PS3B07", "Malformed String.isEmpty IR node.");
      return literalStringValue(expr.args[0]!, "String.isEmpty").length === 0 ? "true" : "false";
    });
    registry.registerTargetExprLowering("typescript", "core.string.isNat.literal", (expr) => {
      if (expr.kind !== "op" || expr.args.length !== 1) throw new ProofScriptError("PS3B24", "Malformed String.isNat IR node.");
      return isAsciiDecimalNat(literalStringValue(expr.args[0]!, "String.isNat")) ? "true" : "false";
    });
    registry.registerTargetExprLowering("typescript", "core.string.startsWith.literal", (expr) => {
      if (expr.kind !== "op" || expr.args.length !== 2) throw new ProofScriptError("PS3B10", "Malformed String.startsWith IR node.");
      return requireLiteralStringArg(expr.args[0]!, "String.startsWith").startsWith(requireLiteralStringArg(expr.args[1]!, "String.startsWith")) ? "true" : "false";
    });
    registry.registerTargetExprLowering("typescript", "core.string.endsWith.literal", (expr) => {
      if (expr.kind !== "op" || expr.args.length !== 2) throw new ProofScriptError("PS3B11", "Malformed String.endsWith IR node.");
      return requireLiteralStringArg(expr.args[0]!, "String.endsWith").endsWith(requireLiteralStringArg(expr.args[1]!, "String.endsWith")) ? "true" : "false";
    });
    registry.registerTargetExprLowering("typescript", "core.string.contains.literal", (expr) => {
      if (expr.kind !== "op" || expr.args.length !== 2) throw new ProofScriptError("PS3B12", "Malformed String.contains IR node.");
      return requireLiteralStringArg(expr.args[0]!, "String.contains").includes(requireLiteralStringArg(expr.args[1]!, "String.contains")) ? "true" : "false";
    });
    registry.registerTargetExprLowering("typescript", "core.string.isPrefixOf.literal", (expr) => {
      if (expr.kind !== "op" || expr.args.length !== 2) throw new ProofScriptError("PS3B21", "Malformed String.isPrefixOf IR node.");
      return literalIsPrefixOf(expr.args[0]!, expr.args[1]!) ? "true" : "false";
    });
    registry.registerTargetExprLowering("typescript", "core.string.beq.literal", (expr) => {
      if (expr.kind !== "op" || expr.args.length !== 2) throw new ProofScriptError("PS3B20", "Malformed String.beq IR node.");
      return literalBeq(expr.args[0]!, expr.args[1]!) ? "true" : "false";
    });
  },
};

export default plugin;
