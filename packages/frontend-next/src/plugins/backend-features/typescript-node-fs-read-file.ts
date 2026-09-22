import { ProofScriptError } from "../../core/errors.js";
import type { ProofScriptPlugin } from "../../core/plugin-api.js";

const plugin: ProofScriptPlugin = {
  id: "proofscript.backend-feature.typescript-node-fs-read-file",
  version: "0.91.0",
  kind: "backend-feature",
  requires: [
    "proofscript.backend.typescript",
    "proofscript.feature.io-fs-read-file",
    "proofscript.backend-feature.typescript-filepath",
    "proofscript.backend-feature.typescript-io",
    "proofscript.backend-feature.typescript-io-error-structured",
    "proofscript.backend-feature.typescript-uint32",
    "proofscript.backend-feature.typescript-option",
    "proofscript.backend-feature.typescript-string",
  ],
  setup(registry) {
    registry.addTargetCapability("typescript", "core.io.fs.readFile");
    registry.registerSemanticInfo("typescript.nodeFsReadFilePrelude", `
const __psOpaqueHostIOErrorReadFile = (error: unknown) => ({ __proofscriptIOErrorBrand: "IO.Error", __proofscriptHostError: error } as { readonly __proofscriptIOErrorBrand: "IO.Error" });
const __psNodeReadFileError = (error: any, fname: SystemFilePath) => {
  const path = fname.toString;
  const platform = (globalThis as any).process?.platform;
  const arch = (globalThis as any).process?.arch;
  if (platform !== "linux" || arch !== "x64") return __psOpaqueHostIOErrorReadFile(error);
  switch (error?.code) {
    case "ENOENT":
      return ({ __proofscriptIOErrorBrand: "IO.Error", tag: "noFileOrDirectory", filename: path, osCode: __psUInt32(4294967294n), details: "no such file or directory" } as { readonly __proofscriptIOErrorBrand: "IO.Error" });
    case "EISDIR":
      return ({ __proofscriptIOErrorBrand: "IO.Error", tag: "inappropriateType", filename: ({ tag: "None" } as const), osCode: __psUInt32(21n), details: "Is a directory" } as { readonly __proofscriptIOErrorBrand: "IO.Error" });
    case "ENOTDIR":
      return ({ __proofscriptIOErrorBrand: "IO.Error", tag: "inappropriateType", filename: ({ tag: "Some", value: path } as const), osCode: __psUInt32(4294967276n), details: "not a directory" } as { readonly __proofscriptIOErrorBrand: "IO.Error" });
    default:
      return __psOpaqueHostIOErrorReadFile(error);
  }
};`.trim());
    registry.registerTargetExprLowering("typescript", "lean.io.fs.readFile", (expr, context) => {
      if (expr.kind !== "op" || expr.args.length !== 1) throw new ProofScriptError("PS3F20", "Malformed IO.FS.readFile IR node.");
      const fname = context.emitExpr(expr.args[0]!);
      return `(() => { const __ps_path = ${fname}; try { const __ps_fs = (globalThis as any).process?.getBuiltinModule?.("node:fs"); if (!__ps_fs || typeof __ps_fs.readFileSync !== "function") return ({ tag: "Error", error: __psOpaqueHostIOErrorReadFile(new Error("Node fs host unavailable")) } as const); const __ps_bytes = __ps_fs.readFileSync(__ps_path.toString); const __ps_TextDecoder = (globalThis as any).TextDecoder; if (typeof __ps_TextDecoder !== "function") return ({ tag: "Error", error: __psOpaqueHostIOErrorReadFile(new Error("TextDecoder host unavailable")) } as const); try { const __ps_text = new __ps_TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(__ps_bytes); return ({ tag: "Ok", value: __ps_text } as const); } catch { return ({ tag: "Error", error: ({ __proofscriptIOErrorBrand: "IO.Error", tag: "userError", msg: "Tried to read file '" + __ps_path.toString + "' containing non UTF-8 data.", __proofscriptUserErrorMessage: "Tried to read file '" + __ps_path.toString + "' containing non UTF-8 data." } as { readonly __proofscriptIOErrorBrand: "IO.Error" }) } as const); } } catch (__ps_error) { return ({ tag: "Error", error: __psNodeReadFileError(__ps_error, __ps_path) } as const); } })`;
    });
  },
};
export default plugin;
