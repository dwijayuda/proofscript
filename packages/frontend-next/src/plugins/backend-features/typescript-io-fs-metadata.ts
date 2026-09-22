import { ProofScriptError } from "../../core/errors.js";
import type { IRExpr } from "../../core/model.js";
import type { ProofScriptPlugin } from "../../core/plugin-api.js";

const variants = ["dir", "file", "symlink", "other"] as const;

function containsVar(expr: IRExpr, name: string): boolean {
  switch (expr.kind) {
    case "var": return expr.name === name;
    case "literal": case "type": return false;
    case "call": case "op": case "extension": return expr.args.some((arg) => containsVar(arg, name));
    case "apply": return containsVar(expr.callee, name) || expr.args.some((arg) => containsVar(arg, name));
    case "lambda": case "quantifier": return expr.params.some((param) => param.name === name) ? false : containsVar(expr.body, name);
  }
}

const plugin: ProofScriptPlugin = {
  id: "proofscript.backend-feature.typescript-io-fs-metadata",
  version: "0.91.0",
  kind: "backend-feature",
  requires: [
    "proofscript.backend.typescript", "proofscript.feature.io-fs-metadata",
    "proofscript.backend-feature.typescript-int", "proofscript.backend-feature.typescript-uint32",
    "proofscript.backend-feature.typescript-uint64", "proofscript.feature.match",
  ],
  setup(registry) {
    registry.addTargetCapability("typescript", "core.io.fs.metadata.structural");
    registry.addTargetCapability("typescript", "core.io.fs.fileType.match");
    registry.registerSemanticInfo("typescript.ioFsMetadataPrelude", [
      `declare const __proofscriptIOFSFileTypeBrand: unique symbol;`,
      `declare const __proofscriptIOFSSystemTimeBrand: unique symbol;`,
      `declare const __proofscriptIOFSMetadataBrand: unique symbol;`,
      `export type IOFSFileType = { readonly [__proofscriptIOFSFileTypeBrand]: true; readonly tag: "dir" | "file" | "symlink" | "other" };`,
      `export type IOFSSystemTime = { readonly [__proofscriptIOFSSystemTimeBrand]: true; readonly sec: bigint; readonly nsec: UInt32 };`,
      `export type IOFSMetadata = { readonly [__proofscriptIOFSMetadataBrand]: true; readonly accessed: IOFSSystemTime; readonly modified: IOFSSystemTime; readonly byteSize: UInt64; readonly type: IOFSFileType; readonly numLinks: UInt64 };`,
      `export const __psFileType = (tag: IOFSFileType["tag"]): IOFSFileType => ({ tag } as IOFSFileType);`,
      `export const __psSystemTime = (sec: bigint, nsec: UInt32): IOFSSystemTime => ({ sec, nsec } as IOFSSystemTime);`,
      `export const __psMetadata = (accessed: IOFSSystemTime, modified: IOFSSystemTime, byteSize: UInt64, type: IOFSFileType, numLinks: UInt64): IOFSMetadata => ({ accessed, modified, byteSize, type, numLinks } as IOFSMetadata);`,
    ].join("\n"));

    registry.registerTargetTypeLowering("typescript", "IO.FS.FileType", () => "IOFSFileType");
    registry.registerTargetTypeLowering("typescript", "IO.FS.SystemTime", () => "IOFSSystemTime");
    registry.registerTargetTypeLowering("typescript", "IO.FS.Metadata", () => "IOFSMetadata");

    for (const name of variants) {
      registry.registerTargetExprLowering("typescript", `lean.io.fs.fileType.${name}`, (expr) => {
        if (expr.kind !== "op" || expr.args.length !== 0) throw new ProofScriptError("PS3M01", `Malformed IO.FS.FileType.${name} IR node.`);
        return `__psFileType("${name}")`;
      });
    }
    registry.registerTargetExprLowering("typescript", "lean.io.fs.fileType.match", (expr, context) => {
      if (expr.kind !== "extension") throw new ProofScriptError("PS3M02", "Expected IO.FS.FileType match extension node.");
      const payload = expr.payload as { cases: readonly { variant: string; binders: readonly string[] }[]; matchSyntax?: { readonly discriminantEqualityName?: string } };
      const [scrutinee, ...bodies] = expr.args;
      const equalityName = payload.matchSyntax?.discriminantEqualityName;
      if (equalityName && bodies.some((body) => containsVar(body, equalityName))) throw new ProofScriptError("PS3M03", `Pattern equality proof '${equalityName}' cannot be used computationally by TypeScript.`);
      const branches = payload.cases.map((item, index) => {
        if (!variants.includes(item.variant as typeof variants[number]) || item.binders.length !== 0) throw new ProofScriptError("PS3M04", `Invalid IO.FS.FileType branch '${item.variant}'.`);
        return `case "${item.variant}": return ${context.emitExpr(bodies[index]!)};`;
      }).join(" ");
      return `((__psm: IOFSFileType) => { switch (__psm.tag) { ${branches} } throw new Error("Invalid IO.FS.FileType tag"); })(${context.emitExpr(scrutinee!)})`;
    });

    registry.registerTargetExprLowering("typescript", "lean.io.fs.systemTime.mk", (expr, context) => {
      if (expr.kind !== "op" || expr.args.length !== 2) throw new ProofScriptError("PS3M05", "Malformed SystemTime.mk IR node.");
      return `__psSystemTime(${context.emitExpr(expr.args[0]!)}, ${context.emitExpr(expr.args[1]!)})`;
    });
    for (const [op, field] of [["lean.io.fs.systemTime.sec", "sec"], ["lean.io.fs.systemTime.nsec", "nsec"]] as const) {
      registry.registerTargetExprLowering("typescript", op, (expr, context) => {
        if (expr.kind !== "op" || expr.args.length !== 1) throw new ProofScriptError("PS3M06", `Malformed ${op} IR node.`);
        return `(${context.emitExpr(expr.args[0]!)}).${field}`;
      });
    }
    registry.registerTargetExprLowering("typescript", "lean.io.fs.metadata.mk", (expr, context) => {
      if (expr.kind !== "op" || expr.args.length !== 5) throw new ProofScriptError("PS3M07", "Malformed Metadata.mk IR node.");
      return `__psMetadata(${expr.args.map((arg) => context.emitExpr(arg)).join(", ")})`;
    });
    for (const field of ["accessed", "modified", "byteSize", "type", "numLinks"] as const) {
      registry.registerTargetExprLowering("typescript", `lean.io.fs.metadata.${field}`, (expr, context) => {
        if (expr.kind !== "op" || expr.args.length !== 1) throw new ProofScriptError("PS3M08", `Malformed Metadata.${field} IR node.`);
        return `(${context.emitExpr(expr.args[0]!)}).${field}`;
      });
    }
  },
};
export default plugin;
