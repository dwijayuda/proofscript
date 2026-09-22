import { ProofScriptError } from "../../core/errors.js";
import type { PluginManifest, ProofScriptPlugin } from "../../core/plugin-api.js";
import type { SurfaceExpr } from "../../core/model.js";

interface CoercionPayload { readonly value: SurfaceExpr; }

export const proofscriptManifest: PluginManifest = {
  schema: "proofscript.plugin/v1",
  id: "proofscript.feature.coercion",
  version: "0.91.0",
  kind: "feature",
  semanticIds: ["lean.coercion.explicit", "lean.coercion.insert", "lean.coercion.apply"],
  proofscriptBaseline: "v0.1",
  leanBaseline: "4.33.1",
  lean: { assumptionPolicy: "none" },
};

const plugin: ProofScriptPlugin = {
  id: proofscriptManifest.id,
  version: proofscriptManifest.version,
  kind: "feature",
  requires: ["proofscript.feature.typeclass"],
  setup(registry) {
    registry.registerExpressionSyntax({
      keyword: "↑",
      owner: "lean.coercion",
      parse(cursor) {
        // Coercion binds as a prefix term.  A high minimum precedence keeps
        // `↑x + y` from being parsed as `↑(x + y)` in this initial slice.
        return { kind: "extension", owner: "lean.coercion", payload: { value: cursor.parseExpression(100) } satisfies CoercionPayload };
      },
    });

    registry.registerExpressionElaborator({
      owner: "lean.coercion",
      elaborate(expr, expected, context) {
        if (!expected) {
          throw new ProofScriptError("PS2601", "Explicit coercion '↑e' requires an expected target type in the v0.15 coercion slice.");
        }
        if (expr.kind !== "extension" || expr.owner !== "lean.coercion") throw new ProofScriptError("PS2600", "Malformed coercion expression.");
        const payload = expr.payload as CoercionPayload;
        const source = context.elaborateExpression(payload.value);
        return context.coerceExpression(source, expected);
      },
    });
  },
};

export default plugin;
