import { ProofScriptError } from "../../core/errors.js";
import type { ProofScriptPlugin } from "../../core/plugin-api.js";

function isCanonicalNatHAddEvidence(expr: IRExpr): boolean {
  if (expr.kind !== "call" || expr.callee !== "__psInstHAdd") return false;
  return expr.args.some((arg) => arg.kind === "var" && arg.name === "__psInstAddNat");
}
import type { IRDef, IRProgram, IRExpr } from "../../core/model.js";
import { isPropSort, isPropositionType } from "../../core/type-utils.js";


function containsRuntimeVar(expr: import("../../core/model.js").IRExpr, name: string): boolean {
  switch (expr.kind) {
    case "var": return expr.name === name;
    case "literal":
    case "type": return false;
    case "call":
      return expr.args.some((arg, index) => !(expr.erasedArgs?.[index] ?? false) && containsRuntimeVar(arg, name));
    case "apply":
      return containsRuntimeVar(expr.callee, name) || expr.args.some((arg) => containsRuntimeVar(arg, name));
    case "lambda":
    case "quantifier":
      return expr.params.some((param) => param.name === name) ? false : containsRuntimeVar(expr.body, name);
    case "op": return expr.args.some((arg) => containsRuntimeVar(arg, name));
    case "extension": {
      if (expr.op === "lean.if") {
        const payload = expr.payload as { decision?: string } | undefined;
        if (payload?.decision === "instance" && expr.args.length >= 4) {
          // The proposition itself is erased; runtime branching consumes the explicit Decidable tag.
          return expr.args.slice(1).some((arg) => containsRuntimeVar(arg, name));
        }
      }
      return expr.args.some((arg) => containsRuntimeVar(arg, name));
    }
  }
}

function typeContainsValueName(type: import("../../core/model.js").IRType, name: string): boolean {
  if (type.form === "term" && type.term) return containsRuntimeVar(type.term, name);
  if (type.form === "pi" && type.domain && type.codomain && type.binder) {
    return typeContainsValueName(type.domain, name) || (type.binder.name === name ? false : typeContainsValueName(type.codomain, name));
  }
  return (type.args ?? []).some((arg) => arg.kind === "type" ? typeContainsValueName(arg.value, name) : containsRuntimeVar(arg.value, name));
}

function emitDef(declaration: IRDef, context: Parameters<NonNullable<import("../../core/model.js").TargetSpec["emitProgram"]>>[1]): string[] {
  const lines: string[] = [];
  const defaultParam = declaration.params.find((param) => param.defaultValue !== undefined);
  if (defaultParam) {
    throw new ProofScriptError("PS3229", `TypeScript backend does not yet publish a correspondence rule for default parameter '${defaultParam.name}'; default insertion remains Lean-facing in v0.10.`);
  }
  const typeParams = declaration.params.filter((param) => param.isTypeParam);
  const propositionParams = typeParams.filter((param) => isPropSort(param.type));
  const runtimeTypeParams = typeParams.filter((param) => !isPropSort(param.type));
  const illegalPropRuntimeUse = propositionParams.find((param) => containsRuntimeVar(declaration.body, param.name));
  if (illegalPropRuntimeUse) {
    throw new ProofScriptError("PS3214", `TypeScript backend cannot erase proposition parameter '${illegalPropRuntimeUse.name}' as a runtime generic because it is used computationally.`);
  }
  const explicitTypeParam = runtimeTypeParams.find((param) => param.binderInfo === "explicit");
  if (explicitTypeParam) {
    throw new ProofScriptError("PS3210", `TypeScript backend does not preserve explicit Type-valued binder '${explicitTypeParam.name}'; use an implicit type parameter for the portable generic slice.`);
  }
  const valueParams = declaration.params.filter((param) => !param.isTypeParam);
  const erasedValueParams = valueParams.filter((param) => param.runtimeErased);
  const illegalErasure = erasedValueParams.find((param) => containsRuntimeVar(declaration.body, param.name));
  if (illegalErasure) {
    throw new ProofScriptError("PS3230", `Dependent index '${illegalErasure.name}' was classified compile-time-only but is used computationally by '${declaration.name}'; TypeScript erasure would change runtime semantics.`);
  }
  const runtimeValueParams = valueParams.filter((param) => !param.runtimeErased);
  const proofLikeParam = runtimeValueParams.find((param) => isPropositionType(param.type));
  if (proofLikeParam) {
    throw new ProofScriptError("PS3224", `TypeScript backend does not lower proof parameter '${proofLikeParam.name}' as runtime data.`);
  }
  if (isPropositionType(declaration.returnType)) {
    throw new ProofScriptError("PS3225", `TypeScript backend does not lower proposition-valued definitions as runtime values.`);
  }
  // ProofScript implicit/strict-implicit *runtime values* are elaborated away
  // before backend emission: every call site already carries the exact selected
  // value in argument order. TypeScript therefore represents them as ordinary
  // positional parameters. This is semantic erasure of source-level implicit
  // calling convention, not erasure of the runtime value itself.
  const generics = runtimeTypeParams.length > 0 ? `<${runtimeTypeParams.map((param) => param.name).join(", ")}>` : "";
  const params = runtimeValueParams.map((param) => `${param.name}: ${context.emitType(param.type)}`).join(", ");
  lines.push(`export function ${declaration.name}${generics}(${params}): ${context.emitType(declaration.returnType)} {`);
  lines.push(`  return ${context.emitExpr(declaration.body)};`);
  lines.push("}", "");
  return lines;
}

function emitProgram(program: IRProgram, context: Parameters<NonNullable<import("../../core/model.js").TargetSpec["emitProgram"]>>[1]): string {
  const lines = [
    "// Generated by ProofScript plugin MVP.",
    "// Nat and Int use bigint for range fidelity; Nat host boundaries must still preserve the non-negativity invariant.",
    "",
  ];
  const decidablePrelude = context.registry.getSemanticInfo<string>("typescript.decidablePrelude");
  if (decidablePrelude) lines.push(decidablePrelude, "");
  const typeclassPrelude = context.registry.getSemanticInfo<string>("typescript.typeclassPrelude");
  if (typeclassPrelude) lines.push(typeclassPrelude, "");
  const coercionPrelude = context.registry.getSemanticInfo<string>("typescript.coercionPrelude");
  if (coercionPrelude) lines.push(coercionPrelude, "");
  const negPrelude = context.registry.getSemanticInfo<string>("typescript.negPrelude");
  if (negPrelude) lines.push(negPrelude, "");
  const hArithmeticPrelude = context.registry.getSemanticInfo<string>("typescript.hArithmeticPrelude");
  if (hArithmeticPrelude) lines.push(hArithmeticPrelude, "");
  const orderPrelude = context.registry.getSemanticInfo<string>("typescript.orderPrelude");
  if (orderPrelude) lines.push(orderPrelude, "");
  const ordPrelude = context.registry.getSemanticInfo<string>("typescript.ordPrelude");
  if (ordPrelude) lines.push(ordPrelude, "");
  const orderingOpsPrelude = context.registry.getSemanticInfo<string>("typescript.orderingOpsPrelude");
  if (orderingOpsPrelude) lines.push(orderingOpsPrelude, "");
  const minmaxPrelude = context.registry.getSemanticInfo<string>("typescript.minmaxPrelude");
  if (minmaxPrelude) lines.push(minmaxPrelude, "");
  const decidableRelPrelude = context.registry.getSemanticInfo<string>("typescript.decidableRelPrelude");
  if (decidableRelPrelude) lines.push(decidableRelPrelude, "");
  const toStringPrelude = context.registry.getSemanticInfo<string>("typescript.toStringPrelude");
  if (toStringPrelude) lines.push(toStringPrelude, "");
  const uint8Prelude = context.registry.getSemanticInfo<string>("typescript.uint8Prelude");
  if (uint8Prelude) lines.push(uint8Prelude, "");
  const uint16Prelude = context.registry.getSemanticInfo<string>("typescript.uint16Prelude");
  if (uint16Prelude) lines.push(uint16Prelude, "");
  const uint32Prelude = context.registry.getSemanticInfo<string>("typescript.uint32Prelude");
  if (uint32Prelude) lines.push(uint32Prelude, "");
  const uint64Prelude = context.registry.getSemanticInfo<string>("typescript.uint64Prelude");
  if (uint64Prelude) lines.push(uint64Prelude, "");
  const int8Prelude = context.registry.getSemanticInfo<string>("typescript.int8Prelude");
  if (int8Prelude) lines.push(int8Prelude, "");
  const int16Prelude = context.registry.getSemanticInfo<string>("typescript.int16Prelude");
  if (int16Prelude) lines.push(int16Prelude, "");
  const int32Prelude = context.registry.getSemanticInfo<string>("typescript.int32Prelude");
  if (int32Prelude) lines.push(int32Prelude, "");
  const int64Prelude = context.registry.getSemanticInfo<string>("typescript.int64Prelude");
  if (int64Prelude) lines.push(int64Prelude, "");
  const toStringUInt8Prelude = context.registry.getSemanticInfo<string>("typescript.toStringUInt8Prelude");
  if (toStringUInt8Prelude) lines.push(toStringUInt8Prelude, "");
  const toStringUInt16Prelude = context.registry.getSemanticInfo<string>("typescript.toStringUInt16Prelude");
  if (toStringUInt16Prelude) lines.push(toStringUInt16Prelude, "");
  const toStringUInt32Prelude = context.registry.getSemanticInfo<string>("typescript.toStringUInt32Prelude");
  if (toStringUInt32Prelude) lines.push(toStringUInt32Prelude, "");
  const toStringUInt64Prelude = context.registry.getSemanticInfo<string>("typescript.toStringUInt64Prelude");
  if (toStringUInt64Prelude) lines.push(toStringUInt64Prelude, "");
  const toStringIntPrelude = context.registry.getSemanticInfo<string>("typescript.toStringIntPrelude");
  if (toStringIntPrelude) lines.push(toStringIntPrelude, "");
  const toStringInt8Prelude = context.registry.getSemanticInfo<string>("typescript.toStringInt8Prelude");
  if (toStringInt8Prelude) lines.push(toStringInt8Prelude, "");
  const toStringInt16Prelude = context.registry.getSemanticInfo<string>("typescript.toStringInt16Prelude");
  if (toStringInt16Prelude) lines.push(toStringInt16Prelude, "");
  const toStringInt32Prelude = context.registry.getSemanticInfo<string>("typescript.toStringInt32Prelude");
  if (toStringInt32Prelude) lines.push(toStringInt32Prelude, "");
  const toStringInt64Prelude = context.registry.getSemanticInfo<string>("typescript.toStringInt64Prelude");
  if (toStringInt64Prelude) lines.push(toStringInt64Prelude, "");
  const toStringIOErrorPrelude = context.registry.getSemanticInfo<string>("typescript.toStringIOErrorPrelude");
  if (toStringIOErrorPrelude) lines.push(toStringIOErrorPrelude, "");
  const filePathPrelude = context.registry.getSemanticInfo<string>("typescript.filePathPrelude");
  if (filePathPrelude) lines.push(filePathPrelude, "");
  const ioFsMetadataPrelude = context.registry.getSemanticInfo<string>("typescript.ioFsMetadataPrelude");
  if (ioFsMetadataPrelude) lines.push(ioFsMetadataPrelude, "");
  const nodeFsMetadataPrelude = context.registry.getSemanticInfo<string>("typescript.nodeFsMetadataPrelude");
  if (nodeFsMetadataPrelude) lines.push(nodeFsMetadataPrelude, "");
  const ioFsDirEntryPrelude = context.registry.getSemanticInfo<string>("typescript.ioFsDirEntryPrelude");
  if (ioFsDirEntryPrelude) lines.push(ioFsDirEntryPrelude, "");
  const nodeFsReadDirPrelude = context.registry.getSemanticInfo<string>("typescript.nodeFsReadDirPrelude");
  if (nodeFsReadDirPrelude) lines.push(nodeFsReadDirPrelude, "");
  const nodeFsWriteFilePrelude = context.registry.getSemanticInfo<string>("typescript.nodeFsWriteFilePrelude");
  if (nodeFsWriteFilePrelude) lines.push(nodeFsWriteFilePrelude, "");
  const nodeFsReadFilePrelude = context.registry.getSemanticInfo<string>("typescript.nodeFsReadFilePrelude");
  if (nodeFsReadFilePrelude) lines.push(nodeFsReadFilePrelude, "");
  const nodeFsCreateDirPrelude = context.registry.getSemanticInfo<string>("typescript.nodeFsCreateDirPrelude");
  if (nodeFsCreateDirPrelude) lines.push(nodeFsCreateDirPrelude, "");
  const nodeFsRemoveFilePrelude = context.registry.getSemanticInfo<string>("typescript.nodeFsRemoveFilePrelude");
  if (nodeFsRemoveFilePrelude) lines.push(nodeFsRemoveFilePrelude, "");
  const nodeFsRemoveDirPrelude = context.registry.getSemanticInfo<string>("typescript.nodeFsRemoveDirPrelude");
  if (nodeFsRemoveDirPrelude) lines.push(nodeFsRemoveDirPrelude, "");
  const nodeFsRenamePrelude = context.registry.getSemanticInfo<string>("typescript.nodeFsRenamePrelude");
  if (nodeFsRenamePrelude) lines.push(nodeFsRenamePrelude, "");
  const nodeFsRealPathPrelude = context.registry.getSemanticInfo<string>("typescript.nodeFsRealPathPrelude");
  if (nodeFsRealPathPrelude) lines.push(nodeFsRealPathPrelude, "");
  const nodeFsHardLinkPrelude = context.registry.getSemanticInfo<string>("typescript.nodeFsHardLinkPrelude");
  if (nodeFsHardLinkPrelude) lines.push(nodeFsHardLinkPrelude, "");
  const nodeProcessSetCurrentDirPrelude = context.registry.getSemanticInfo<string>("typescript.nodeProcessSetCurrentDirPrelude");
  if (nodeProcessSetCurrentDirPrelude) lines.push(nodeProcessSetCurrentDirPrelude, "");

  for (const declaration of program.declarations) {
    if (declaration.kind === "extension") {
      if (context.registry.getOperation(declaration.op).domain === "proof") continue;
      lines.push(context.emitDeclaration(declaration), "");
      continue;
    }
    if (declaration.kind === "mutual") {
      for (const member of declaration.members) lines.push(...emitDef(member, context));
      continue;
    }
    lines.push(...emitDef(declaration, context));
  }

  return lines.join("\n");
}

const plugin: ProofScriptPlugin = {
  id: "proofscript.backend.typescript",
  version: "0.91.0",
  kind: "backend",
  setup(registry) {
    registry.registerTarget({
      id: "typescript",
      displayName: "TypeScript",
      capabilities: new Set(["core.nat", "core.nat.add", "core.generic", "core.local.binding", "core.recursion", "core.equations", "core.do", "lean.hAdd", "lean.hSub", "lean.hMul"]),
      emitProgram,
    });

    registry.registerTargetTypeLowering("typescript", "Nat", () => "bigint");
    // Fin(n) is computationally a Nat plus a proof of the bound. The proof and
    // index are checked by ProofScript/Lean semantics and erased for runtime;
    // the retained payload uses the same bigint representation as Nat.
    registry.registerTargetTypeFamilyLowering("typescript", "core.fin", () => "bigint");
    registry.registerTargetTypeFamilyLowering("typescript", "core.typevar", (type) => type.displayName);
    registry.registerTargetTypeFamilyLowering("typescript", "core.pi", (type, context) => {
      if (!type.domain || !type.codomain || !type.binder) throw new ProofScriptError("PS3227", "Malformed Pi type in TypeScript lowering.");
      if (type.binder.binderInfo !== "explicit" || (type.binder.name !== "_" && typeContainsValueName(type.codomain, type.binder.name))) {
        throw new ProofScriptError("PS3228", `TypeScript backend only lowers non-dependent explicit function arrows; '${type.displayName}' retains dependent/binder semantics.`);
      }
      const binder = type.binder.name === "_" ? "arg" : type.binder.name;
      return `(${binder}: ${context.emitType(type.domain)}) => ${context.emitType(type.codomain)}`;
    });
    registry.registerTargetExprLowering("typescript", "core.nat.literal", (expr) => {
      if (expr.kind !== "literal") throw new ProofScriptError("PS3201", "Expected Nat literal IR node.");
      return `${expr.value}n`;
    });
    registry.registerTargetExprLowering("typescript", "core.nat.add", (expr, context) => {
      if (expr.kind !== "op") throw new ProofScriptError("PS3202", "Expected Nat add IR node.");
      return `(${context.emitExpr(expr.args[0]!)} + ${context.emitExpr(expr.args[1]!)})`;
    });
    for (const [operation, field] of [["lean.hAdd", "hAdd"], ["lean.hSub", "hSub"], ["lean.hMul", "hMul"]] as const) {
      registry.registerTargetExprLowering("typescript", operation, (expr, context) => {
        if (expr.kind !== "op" || expr.args.length !== 3) throw new ProofScriptError("PS32AR1", `Malformed ${operation} IR node.`);
        if (operation === "lean.hAdd" && expr.args[1]!.type.id === "Nat" && expr.args[2]!.type.id === "Nat" && expr.type.id === "Nat" && isCanonicalNatHAddEvidence(expr.args[0]!)) {
          return `(${context.emitExpr(expr.args[1]!)} + ${context.emitExpr(expr.args[2]!)})`;
        }
        return `${context.emitExpr(expr.args[0]!)}.${field}(${context.emitExpr(expr.args[1]!)}, ${context.emitExpr(expr.args[2]!)})`;
      });
    }
  },
};

export default plugin;
