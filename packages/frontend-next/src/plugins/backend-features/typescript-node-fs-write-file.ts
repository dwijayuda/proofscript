import { ProofScriptError } from "../../core/errors.js";
import type { ProofScriptPlugin } from "../../core/plugin-api.js";

const plugin: ProofScriptPlugin = {
  id: "proofscript.backend-feature.typescript-node-fs-write-file",
  version: "0.91.0",
  kind: "backend-feature",
  requires: [
    "proofscript.backend.typescript",
    "proofscript.feature.io-fs-write-file",
    "proofscript.backend-feature.typescript-filepath",
    "proofscript.backend-feature.typescript-io",
    "proofscript.backend-feature.typescript-io-error-structured",
    "proofscript.backend-feature.typescript-uint32",
    "proofscript.backend-feature.typescript-option",
  ],
  setup(registry) {
    registry.addTargetCapability("typescript", "core.io.fs.writeFile");
    registry.registerSemanticInfo("typescript.nodeFsWriteFilePrelude", `
const __psOpaqueHostIOError = (error: unknown) => ({ __proofscriptIOErrorBrand: "IO.Error", __proofscriptHostError: error } as { readonly __proofscriptIOErrorBrand: "IO.Error" });
const __psNodeWriteFileError = (error: any, fname: SystemFilePath) => {
  const path = fname.toString;
  const platform = (globalThis as any).process?.platform;
  const arch = (globalThis as any).process?.arch;
  if (platform !== "linux" || arch !== "x64") return __psOpaqueHostIOError(error);
  switch (error?.code) {
    case "ENOENT":
      return ({ __proofscriptIOErrorBrand: "IO.Error", tag: "noFileOrDirectory", filename: path, osCode: __psUInt32(2n), details: "No such file or directory" } as { readonly __proofscriptIOErrorBrand: "IO.Error" });
    case "EISDIR":
      return ({ __proofscriptIOErrorBrand: "IO.Error", tag: "inappropriateType", filename: ({ tag: "Some", value: path } as const), osCode: __psUInt32(21n), details: "Is a directory" } as { readonly __proofscriptIOErrorBrand: "IO.Error" });
    case "ENOTDIR":
      return ({ __proofscriptIOErrorBrand: "IO.Error", tag: "inappropriateType", filename: ({ tag: "Some", value: path } as const), osCode: __psUInt32(20n), details: "Not a directory" } as { readonly __proofscriptIOErrorBrand: "IO.Error" });
    default:
      return __psOpaqueHostIOError(error);
  }
};`.trim());
    registry.registerTargetExprLowering("typescript", "lean.io.fs.writeFile", (expr, context) => {
      if (expr.kind !== "op" || expr.args.length !== 2) throw new ProofScriptError("PS3F10", "Malformed IO.FS.writeFile IR node.");
      const fname = context.emitExpr(expr.args[0]!);
      const content = context.emitExpr(expr.args[1]!);
      return `(() => { const __ps_path = ${fname}; try { const __ps_fs = (globalThis as any).process?.getBuiltinModule?.("node:fs"); if (!__ps_fs || typeof __ps_fs.writeFileSync !== "function") return ({ tag: "Error", error: __psOpaqueHostIOError(new Error("Node fs host unavailable")) } as const); __ps_fs.writeFileSync(__ps_path.toString, ${content}, { encoding: "utf8" }); return ({ tag: "Ok", value: undefined } as const); } catch (__ps_error) { return ({ tag: "Error", error: __psNodeWriteFileError(__ps_error, __ps_path) } as const); } })`;
    });
  },
};
export default plugin;
