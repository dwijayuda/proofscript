import { ProofScriptError } from "../../core/errors.js";
import type { ProofScriptPlugin } from "../../core/plugin-api.js";

const plugin: ProofScriptPlugin = {
  id: "proofscript.backend-feature.typescript-node-fs-metadata",
  version: "0.91.0",
  kind: "backend-feature",
  requires: [
    "proofscript.backend.typescript", "proofscript.feature.io-fs-metadata",
    "proofscript.backend-feature.typescript-io-fs-metadata", "proofscript.backend-feature.typescript-filepath",
    "proofscript.backend-feature.typescript-io", "proofscript.backend-feature.typescript-io-error-structured",
    "proofscript.backend-feature.typescript-option", "proofscript.backend-feature.typescript-uint32",
    "proofscript.backend-feature.typescript-uint64",
  ],
  setup(registry) {
    registry.addTargetCapability("typescript", "core.io.fs.metadata");
    registry.addTargetCapability("typescript", "core.io.fs.symlinkMetadata");
    registry.registerSemanticInfo("typescript.nodeFsMetadataPrelude", `
const __psOpaqueHostIOErrorMetadata = (error: unknown) => ({ __proofscriptIOErrorBrand: "IO.Error", __proofscriptHostError: error } as { readonly __proofscriptIOErrorBrand: "IO.Error" });
const __psNodeMetadataError = (error: any, path: SystemFilePath) => {
  const p = path.toString;
  const platform = (globalThis as any).process?.platform;
  const arch = (globalThis as any).process?.arch;
  if (platform !== "linux" || arch !== "x64") return __psOpaqueHostIOErrorMetadata(error);
  switch (error?.code) {
    case "ENOENT": return ({ __proofscriptIOErrorBrand: "IO.Error", tag: "noFileOrDirectory", filename: p, osCode: __psUInt32(4294967294n), details: "no such file or directory" } as { readonly __proofscriptIOErrorBrand: "IO.Error" });
    case "ENOTDIR": return ({ __proofscriptIOErrorBrand: "IO.Error", tag: "inappropriateType", filename: ({ tag: "Some", value: p } as const), osCode: __psUInt32(4294967276n), details: "not a directory" } as { readonly __proofscriptIOErrorBrand: "IO.Error" });
    default: return __psOpaqueHostIOErrorMetadata(error);
  }
};
const __psSystemTimeFromNs = (ns: bigint): IOFSSystemTime => {
  const billion = 1000000000n;
  let sec = ns / billion;
  let rem = ns % billion;
  if (rem < 0n) { sec -= 1n; rem += billion; }
  return __psSystemTime(sec, __psUInt32(rem));
};
const __psFileTypeFromStats = (stats: any): IOFSFileType => {
  if (stats.isDirectory()) return __psFileType("dir");
  if (stats.isFile()) return __psFileType("file");
  if (stats.isSymbolicLink()) return __psFileType("symlink");
  return __psFileType("other");
};
const __psMetadataFromStats = (stats: any): IOFSMetadata => __psMetadata(
  __psSystemTimeFromNs(BigInt(stats.atimeNs)),
  __psSystemTimeFromNs(BigInt(stats.mtimeNs)),
  __psUInt64(BigInt(stats.size)),
  __psFileTypeFromStats(stats),
  __psUInt64(BigInt(stats.nlink)),
);
`.trim());

    const register = (op: "lean.io.fs.metadata" | "lean.io.fs.symlinkMetadata", method: "statSync" | "lstatSync", code: string) => {
      registry.registerTargetExprLowering("typescript", op, (expr, context) => {
        if (expr.kind !== "op" || expr.args.length !== 1) throw new ProofScriptError(code, `Malformed ${op} IR node.`);
        const path = context.emitExpr(expr.args[0]!);
        return `(() => { const __ps_path=${path}; try { const __ps_fs=(globalThis as any).process?.getBuiltinModule?.("node:fs"); if(!__ps_fs||typeof __ps_fs.${method}!=="function") return ({tag:"Error",error:__psOpaqueHostIOErrorMetadata(new Error("Node fs host unavailable"))} as const); const __ps_stats=__ps_fs.${method}(__ps_path.toString,{bigint:true}); return ({tag:"Ok",value:__psMetadataFromStats(__ps_stats)} as const); } catch(__ps_error){ return ({tag:"Error",error:__psNodeMetadataError(__ps_error,__ps_path)} as const); } })`;
      });
    };
    register("lean.io.fs.metadata", "statSync", "PS3M20");
    register("lean.io.fs.symlinkMetadata", "lstatSync", "PS3M21");
  },
};
export default plugin;
