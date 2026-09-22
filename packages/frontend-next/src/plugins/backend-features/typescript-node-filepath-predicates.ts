import { ProofScriptError } from "../../core/errors.js";
import type { ProofScriptPlugin } from "../../core/plugin-api.js";

const plugin: ProofScriptPlugin = {
  id: "proofscript.backend-feature.typescript-node-filepath-predicates",
  version: "0.91.0",
  kind: "backend-feature",
  requires: [
    "proofscript.backend.typescript",
    "proofscript.feature.filepath-predicates",
    "proofscript.backend-feature.typescript-filepath",
    "proofscript.backend-feature.typescript-io",
    "proofscript.backend-feature.typescript-bool-beq",
  ],
  setup(registry) {
    registry.addTargetCapability("typescript", "core.filepath.isDir");
    registry.addTargetCapability("typescript", "core.filepath.pathExists");
    registry.registerTargetExprLowering("typescript", "lean.filepath.isDir", (expr, context) => {
      if (expr.kind !== "op" || expr.args.length !== 1) throw new ProofScriptError("PS3F74", "Malformed System.FilePath.isDir IR node.");
      const p = context.emitExpr(expr.args[0]!);
      return `(() => { try { const __ps_fs=(globalThis as any).process?.getBuiltinModule?.("node:fs"); if(!__ps_fs||typeof __ps_fs.statSync!=="function") return false; return !!__ps_fs.statSync((${p}).toString).isDirectory(); } catch { return false; } })`;
    });
    registry.registerTargetExprLowering("typescript", "lean.filepath.pathExists", (expr, context) => {
      if (expr.kind !== "op" || expr.args.length !== 1) throw new ProofScriptError("PS3F75", "Malformed System.FilePath.pathExists IR node.");
      const p = context.emitExpr(expr.args[0]!);
      return `(() => { try { const __ps_fs=(globalThis as any).process?.getBuiltinModule?.("node:fs"); if(!__ps_fs||typeof __ps_fs.statSync!=="function") return false; __ps_fs.statSync((${p}).toString); return true; } catch { return false; } })`;
    });
  },
};
export default plugin;
