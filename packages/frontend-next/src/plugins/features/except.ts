import { ProofScriptError } from "../../core/errors.js";
import type { IRType, SurfaceExpr } from "../../core/model.js";
import type { PluginManifest, ProofScriptPlugin } from "../../core/plugin-api.js";
import { expectTypeArgument, nominalType, typeArgument } from "../../core/type-utils.js";
import { familyMatchableKey, type MatchableDescriptor } from "./matchable.js";
import type { PatternMatchSyntaxMetadata } from "./pattern-engine.js";

interface Payload { readonly value: SurfaceExpr; }

export function exceptOf(error: IRType, value: IRType): IRType {
  return nominalType(
    `core.except(${error.id},${value.id})`,
    `Except(${error.displayName}, ${value.displayName})`,
    "core.except",
    [typeArgument(error), typeArgument(value)],
  );
}

export function exceptArgs(type: IRType): readonly [IRType, IRType] | undefined {
  const e = type.args?.[0];
  const a = type.args?.[1];
  return e?.kind === "type" && a?.kind === "type" ? [e.value, a.value] : undefined;
}

export const proofscriptManifest: PluginManifest = {
  schema: "proofscript.plugin/v1",
  id: "proofscript.feature.except",
  version: "0.91.0",
  kind: "feature",
  semanticIds: ["core.except.ok", "core.except.error", "core.except.match"],
  proofscriptBaseline: "v0.1",
  leanBaseline: "4.33.1",
  lean: { assumptionPolicy: "none" },
};

const plugin: ProofScriptPlugin = {
  id: proofscriptManifest.id,
  version: proofscriptManifest.version,
  kind: "feature",
  setup(registry) {
    registry.registerTypeFamily("Except", {
      params: [{ kind: "type" }, { kind: "type" }],
      resolve(args) {
        if (args.length !== 2) throw new ProofScriptError("PS2B01", `Except expects error and value type arguments, got ${args.length}.`);
        return exceptOf(expectTypeArgument(args[0]!, "Except error"), expectTypeArgument(args[1]!, "Except value"));
      },
    });

    registry.registerSemanticInfo(familyMatchableKey("core.except"), {
      matchOperation: "core.except.match",
      variantsFor(type) {
        const args = exceptArgs(type);
        if (!args) throw new ProofScriptError("PS2B02", "Malformed Except type for matching.");
        const [error, value] = args;
        return [
          { name: "error", fields: [error] },
          { name: "ok", fields: [value] },
        ];
      },
    } satisfies MatchableDescriptor);

    for (const keyword of [".ok", ".error"] as const) {
      registry.registerExpressionSyntax({
        keyword,
        owner: `core.except.${keyword.slice(1)}.syntax`,
        parse(cursor) {
          cursor.expect("(");
          const value = cursor.parseExpression();
          cursor.expect(")");
          return { kind: "extension", owner: `core.except.${keyword.slice(1)}.syntax`, payload: { value } satisfies Payload };
        },
      });
    }

    registry.registerExpressionElaborator({
      owner: "core.except.ok.syntax",
      elaborate(expr, expected, context) {
        if (expr.kind !== "extension") throw new ProofScriptError("PS2B03", "Except.ok elaborator received non-extension syntax.");
        const args = expected && expected.family === "core.except" ? exceptArgs(expected) : undefined;
        if (!args) throw new ProofScriptError("PS2B04", ".ok(...) requires an expected Except(E, A) type so the error type is known.");
        const value = context.elaborateExpression((expr.payload as Payload).value, args[1]);
        if (!context.typesDefinitionallyEqual(value.type, args[1])) {
          throw new ProofScriptError("PS2B05", `.ok(...) value has type '${value.type.displayName}', expected '${args[1].displayName}'.`);
        }
        return { kind: "extension", op: "core.except.ok", args: [value], payload: {}, type: expected! };
      },
    });

    registry.registerExpressionElaborator({
      owner: "core.except.error.syntax",
      elaborate(expr, expected, context) {
        if (expr.kind !== "extension") throw new ProofScriptError("PS2B06", "Except.error elaborator received non-extension syntax.");
        const args = expected && expected.family === "core.except" ? exceptArgs(expected) : undefined;
        if (!args) throw new ProofScriptError("PS2B07", ".error(...) requires an expected Except(E, A) type so the value type is known.");
        const value = context.elaborateExpression((expr.payload as Payload).value, args[0]);
        if (!context.typesDefinitionallyEqual(value.type, args[0])) {
          throw new ProofScriptError("PS2B08", `.error(...) value has type '${value.type.displayName}', expected '${args[0].displayName}'.`);
        }
        return { kind: "extension", op: "core.except.error", args: [value], payload: {}, type: expected! };
      },
    });

    for (const [op, capability, notes] of [
      ["core.except.ok", "core.except", "Lean Except.ok constructor."],
      ["core.except.error", "core.except", "Lean Except.error constructor."],
      ["core.except.match", "core.except.match", "Lean pattern matching over Except."],
    ] as const) {
      registry.registerOperation(op, {
        requiredCapabilities: [capability],
        verification: { level: "kernel-checkable", notes },
      });
    }

    registry.registerLeanTypeFamilyLowering("core.except", (type, context) => {
      const args = exceptArgs(type);
      if (!args) throw new ProofScriptError("PS4B01", "Malformed Except IR type.");
      return `(Except ${context.emitType(args[0])} ${context.emitType(args[1])})`;
    });
    registry.registerLeanExprLowering("core.except.ok", (expr, context) => {
      if (expr.kind !== "extension") throw new ProofScriptError("PS4B02", "Expected Except.ok extension node.");
      return `(Except.ok ${context.emitExpr(expr.args[0]!)})`;
    });
    registry.registerLeanExprLowering("core.except.error", (expr, context) => {
      if (expr.kind !== "extension") throw new ProofScriptError("PS4B03", "Expected Except.error extension node.");
      return `(Except.error ${context.emitExpr(expr.args[0]!)})`;
    });
    registry.registerLeanExprLowering("core.except.match", (expr, context) => {
      if (expr.kind !== "extension") throw new ProofScriptError("PS4B04", "Expected Except.match extension node.");
      const payload = expr.payload as { cases: readonly { variant: string; binders: readonly string[] }[]; matchSyntax?: PatternMatchSyntaxMetadata };
      const [scrutinee, ...bodies] = expr.args;
      const branches = payload.cases.map((item, index) => {
        const binders = item.binders.join(" ");
        return `| Except.${item.variant}${binders ? ` ${binders}` : ""} => ${context.emitExpr(bodies[index]!)}`;
      });
      const options: string[] = [];
      if (payload.matchSyntax?.generalizing !== undefined) options.push(`(generalizing := ${payload.matchSyntax.generalizing ? "true" : "false"})`);
      if (payload.matchSyntax?.motive) options.push(`(motive := ${context.emitType(payload.matchSyntax.motive)})`);
      const discr = payload.matchSyntax?.discriminantEqualityName
        ? `${payload.matchSyntax.discriminantEqualityName} : ${context.emitExpr(scrutinee!)}`
        : context.emitExpr(scrutinee!);
      return `(match${options.length ? ` ${options.join(" ")}` : ""} ${discr} with ${branches.join(" ")})`;
    });
  },
};

export default plugin;
