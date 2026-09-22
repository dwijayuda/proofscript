import { ProofScriptError } from "../../core/errors.js";
import type { ProofScriptPlugin } from "../../core/plugin-api.js";

const plugin: ProofScriptPlugin = {
  id: "proofscript.backend-feature.typescript-filepath",
  version: "0.91.0",
  kind: "backend-feature",
  requires: ["proofscript.backend.typescript", "proofscript.feature.filepath", "proofscript.backend-feature.typescript-string"],
  setup(registry) {
    registry.addTargetCapability("typescript", "core.filepath");
    registry.registerSemanticInfo("typescript.filePathPrelude", [
      `declare const __proofscriptFilePathBrand: unique symbol;`,
      `export type SystemFilePath = { readonly [__proofscriptFilePathBrand]: true; readonly toString: string };`,
      `export const __psFilePath = (toString: string): SystemFilePath => ({ toString } as SystemFilePath);`,
    ].join("\n"));
    registry.registerTargetTypeLowering("typescript", "System.FilePath", () => "SystemFilePath");
    registry.registerTargetExprLowering("typescript", "lean.filepath.mk", (expr, context) => {
      if (expr.kind !== "op" || expr.args.length !== 1) throw new ProofScriptError("PS3F01", "Malformed System.FilePath.mk IR node.");
      return `__psFilePath(${context.emitExpr(expr.args[0]!)})`;
    });
    registry.registerTargetExprLowering("typescript", "lean.filepath.toString", (expr, context) => {
      if (expr.kind !== "op" || expr.args.length !== 1) throw new ProofScriptError("PS3F02", "Malformed System.FilePath.toString IR node.");
      return `(${context.emitExpr(expr.args[0]!)}).toString`;
    });
  },
};
export default plugin;
