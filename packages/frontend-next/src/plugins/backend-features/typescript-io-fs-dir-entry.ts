import { ProofScriptError } from "../../core/errors.js";
import type { ProofScriptPlugin } from "../../core/plugin-api.js";

const plugin: ProofScriptPlugin = {
  id: "proofscript.backend-feature.typescript-io-fs-dir-entry",
  version: "0.91.0",
  kind: "backend-feature",
  requires: ["proofscript.backend.typescript", "proofscript.feature.io-fs-read-dir", "proofscript.backend-feature.typescript-filepath", "proofscript.backend-feature.typescript-string"],
  setup(registry) {
    registry.addTargetCapability("typescript", "core.io.fs.dirEntry.structural");
    registry.registerSemanticInfo("typescript.ioFsDirEntryPrelude", [
      `declare const __proofscriptIOFSDirEntryBrand: unique symbol;`,
      `export type IOFSDirEntry = { readonly [__proofscriptIOFSDirEntryBrand]: true; readonly root: SystemFilePath; readonly fileName: string };`,
      `export const __psDirEntry = (root: SystemFilePath, fileName: string): IOFSDirEntry => ({ root, fileName } as IOFSDirEntry);`,
    ].join("\n"));
    registry.registerTargetTypeLowering("typescript", "IO.FS.DirEntry", () => "IOFSDirEntry");
    registry.registerTargetExprLowering("typescript", "lean.io.fs.dirEntry.mk", (expr, context) => {
      if (expr.kind !== "op" || expr.args.length !== 2) throw new ProofScriptError("PS3R01", "Malformed IO.FS.DirEntry.mk IR node.");
      return `__psDirEntry(${context.emitExpr(expr.args[0]!)}, ${context.emitExpr(expr.args[1]!)})`;
    });
    registry.registerTargetExprLowering("typescript", "lean.io.fs.dirEntry.root", (expr, context) => {
      if (expr.kind !== "op" || expr.args.length !== 1) throw new ProofScriptError("PS3R02", "Malformed IO.FS.DirEntry.root IR node.");
      return `(${context.emitExpr(expr.args[0]!)}).root`;
    });
    registry.registerTargetExprLowering("typescript", "lean.io.fs.dirEntry.fileName", (expr, context) => {
      if (expr.kind !== "op" || expr.args.length !== 1) throw new ProofScriptError("PS3R03", "Malformed IO.FS.DirEntry.fileName IR node.");
      return `(${context.emitExpr(expr.args[0]!)}).fileName`;
    });
  },
};
export default plugin;
