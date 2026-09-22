import { readFileSync } from "node:fs";
import { ProofScriptError } from "../../core/errors.js";
import type { PluginManifest, ProofScriptPlugin } from "../../core/plugin-api.js";
import type { IRType, SurfaceExpr } from "../../core/model.js";
import { expectTypeArgument, nominalType, typeArgument, sameType } from "../../core/type-utils.js";
import { familyMatchableKey, type MatchableDescriptor } from "./matchable.js";
import type { PatternMatchSyntaxMetadata } from "./pattern-engine.js";

const optionLeanSource = readFileSync(new URL("./lean/option.lean", import.meta.url), "utf8");

interface SomePayload { readonly value: SurfaceExpr; }

function optionOf(inner: IRType): IRType {
  return nominalType(
    `core.option(${inner.id})`,
    `Option(${inner.displayName})`,
    "core.option",
    [typeArgument(inner)],
  );
}

function optionInner(type: IRType): IRType | undefined {
  const argument = type.args?.[0];
  return argument?.kind === "type" ? argument.value : undefined;
}

export const proofscriptManifest: PluginManifest = {
  schema: "proofscript.plugin/v1",
  id: "proofscript.feature.option",
  version: "0.91.0",
  kind: "feature",
  semanticIds: ["core.option.some", "core.option.none", "core.option.match"],
  lean: { sources: ["lean/option.lean"], assumptionPolicy: "none" },
};

const plugin: ProofScriptPlugin = {
  id: proofscriptManifest.id,
  version: proofscriptManifest.version,
  kind: "feature",
  setup(registry) {
    registry.registerTypeFamily("Option", {
      params: [{ kind: "type" }],
      resolve(args) {
        if (args.length !== 1) throw new ProofScriptError("PS2301", `Option expects one type argument, got ${args.length}.`);
        return optionOf(expectTypeArgument(args[0]!, "Option"));
      },
    });
    registry.registerSemanticInfo("proofscript.do.monad:core.option", {
      family: "core.option",
      sourceName: "Option",
      typeArgumentIndex: 0,
      patternFailure: "alternative",
    });

    registry.registerSemanticInfo(familyMatchableKey("core.option"), {
      matchOperation: "core.option.match",
      variantsFor(type) {
        const inner = optionInner(type);
        if (!inner) throw new ProofScriptError("PS2304", "Malformed Option type for matching.");
        return [
          { name: "some", fields: [inner] },
          { name: "none", fields: [] },
        ];
      },
    } satisfies MatchableDescriptor);

    registry.registerExpressionSyntax({
      keyword: ".some",
      owner: "core.option.some.syntax",
      parse(cursor) {
        cursor.expect("(");
        const value = cursor.parseExpression();
        cursor.expect(")");
        return { kind: "extension", owner: "core.option.some.syntax", payload: { value } satisfies SomePayload };
      },
    });

    registry.registerExpressionSyntax({
      keyword: ".none",
      owner: "core.option.none.syntax",
      parse(_cursor) {
        return { kind: "extension", owner: "core.option.none.syntax", payload: {} };
      },
    });

    registry.registerExpressionElaborator({
      owner: "core.option.some.syntax",
      elaborate(expr, expected, context) {
        if (expr.kind !== "extension") throw new ProofScriptError("PS2398", "Option elaborator received non-extension syntax.");
        const payload = expr.payload as SomePayload;
        let innerExpected: IRType | undefined;
        if (expected?.family === "core.option") innerExpected = optionInner(expected);
        const value = context.elaborateExpression(payload.value, innerExpected);
        const result = optionOf(value.type);
        if (expected && !sameType(expected, result)) {
          throw new ProofScriptError("PS2302", `.some(...) inferred '${result.displayName}', expected '${expected.displayName}'.`);
        }
        return { kind: "extension", op: "core.option.some", args: [value], payload: {}, type: result };
      },
    });

    registry.registerExpressionElaborator({
      owner: "core.option.none.syntax",
      elaborate(_expr, expected) {
        if (!expected || expected.family !== "core.option" || !optionInner(expected)) {
          throw new ProofScriptError("PS2303", ".none requires an expected Option(A) type in this MVP.");
        }
        return { kind: "extension", op: "core.option.none", args: [], payload: {}, type: expected };
      },
    });

    registry.registerOperation("core.option.some", {
      requiredCapabilities: ["core.option"],
      verification: { level: "kernel-checkable", notes: "Mapped to Lean Option.some." },
    });
    registry.registerOperation("core.option.none", {
      requiredCapabilities: ["core.option"],
      verification: { level: "kernel-checkable", notes: "Mapped to Lean Option.none." },
    });
    registry.registerOperation("core.option.match", {
      requiredCapabilities: ["core.option.match"],
      verification: { level: "kernel-checkable", notes: "Mapped to Lean pattern matching over Option." },
    });

    registry.registerLeanTypeFamilyLowering("core.option", (type, context) => {
      const inner = optionInner(type);
      if (!inner) throw new ProofScriptError("PS4301", "Malformed Option IR type.");
      return `(Option ${context.emitType(inner)})`;
    });

    registry.registerLeanModule("ProofScript.Feature.Option", optionLeanSource);

    registry.registerLeanExprLowering("core.option.some", (expr, context) => {
      if (expr.kind !== "extension") throw new ProofScriptError("PS4302", "Expected Option.some extension IR node.");
      return `(psOptionSome ${context.emitExpr(expr.args[0]!)})`;
    });
    registry.registerLeanExprLowering("core.option.none", (expr) => {
      if (expr.kind !== "extension") throw new ProofScriptError("PS4303", "Expected Option.none extension IR node.");
      return "psOptionNone";
    });
    registry.registerLeanExprLowering("core.option.match", (expr, context) => {
      if (expr.kind !== "extension") throw new ProofScriptError("PS4310", "Expected Option match extension IR node.");
      const payload = expr.payload as { cases: readonly { variant: string; binders: readonly string[] }[]; matchSyntax?: PatternMatchSyntaxMetadata };
      const [scrutinee, ...bodies] = expr.args;
      const branches = payload.cases.map((item, index) => {
        const leanVariant = item.variant;
        const binders = item.binders.join(" ");
        return `| ${leanVariant}${binders ? ` ${binders}` : ""} => ${context.emitExpr(bodies[index]!)}`;
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
