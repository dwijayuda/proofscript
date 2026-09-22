import { ProofScriptError } from "../../core/errors.js";
import type { IRParam, IRType } from "../../core/model.js";
import type { PluginManifest, ProofScriptPlugin } from "../../core/plugin-api.js";
import { nominalType, typeArgument } from "../../core/type-utils.js";
import { exactMatchableKey, type MatchableDescriptor } from "./matchable.js";
import type { PatternMatchSyntaxMetadata } from "./pattern-engine.js";

function valueParam(name: string, type: IRType): IRParam { return { name, type, binderInfo: "explicit" }; }
function optionOf(inner: IRType): IRType {
  return nominalType(`core.option(${inner.id})`, `Option(${inner.displayName})`, "core.option", [typeArgument(inner)]);
}

const stringType = nominalType("String", "String");
const uint32Type = nominalType("UInt32", "UInt32");
const optionString = optionOf(stringType);
const ioError = nominalType("lean.io.error", "IO.Error", "lean.io.error");

interface CtorSpec { readonly name: string; readonly fields: readonly { readonly name: string; readonly type: IRType }[]; }
const constructors: readonly CtorSpec[] = [
  { name: "alreadyExists", fields: [{name:"filename",type:optionString},{name:"osCode",type:uint32Type},{name:"details",type:stringType}] },
  { name: "otherError", fields: [{name:"osCode",type:uint32Type},{name:"details",type:stringType}] },
  { name: "resourceBusy", fields: [{name:"osCode",type:uint32Type},{name:"details",type:stringType}] },
  { name: "resourceVanished", fields: [{name:"osCode",type:uint32Type},{name:"details",type:stringType}] },
  { name: "unsupportedOperation", fields: [{name:"osCode",type:uint32Type},{name:"details",type:stringType}] },
  { name: "hardwareFault", fields: [{name:"osCode",type:uint32Type},{name:"details",type:stringType}] },
  { name: "unsatisfiedConstraints", fields: [{name:"osCode",type:uint32Type},{name:"details",type:stringType}] },
  { name: "illegalOperation", fields: [{name:"osCode",type:uint32Type},{name:"details",type:stringType}] },
  { name: "protocolError", fields: [{name:"osCode",type:uint32Type},{name:"details",type:stringType}] },
  { name: "timeExpired", fields: [{name:"osCode",type:uint32Type},{name:"details",type:stringType}] },
  { name: "interrupted", fields: [{name:"filename",type:stringType},{name:"osCode",type:uint32Type},{name:"details",type:stringType}] },
  { name: "noFileOrDirectory", fields: [{name:"filename",type:stringType},{name:"osCode",type:uint32Type},{name:"details",type:stringType}] },
  { name: "invalidArgument", fields: [{name:"filename",type:optionString},{name:"osCode",type:uint32Type},{name:"details",type:stringType}] },
  { name: "permissionDenied", fields: [{name:"filename",type:optionString},{name:"osCode",type:uint32Type},{name:"details",type:stringType}] },
  { name: "resourceExhausted", fields: [{name:"filename",type:optionString},{name:"osCode",type:uint32Type},{name:"details",type:stringType}] },
  { name: "inappropriateType", fields: [{name:"filename",type:optionString},{name:"osCode",type:uint32Type},{name:"details",type:stringType}] },
  { name: "noSuchThing", fields: [{name:"filename",type:optionString},{name:"osCode",type:uint32Type},{name:"details",type:stringType}] },
  { name: "unexpectedEof", fields: [] },
  { name: "userError", fields: [{name:"msg",type:stringType}] },
] as const;

// `userError` is registered by the base IO feature so it remains available
// without this structural plugin. This plugin owns all remaining constructors.
const constructorsOwnedHere = constructors.filter((c) => c.name !== "userError" && c.name !== "unexpectedEof");

export const proofscriptManifest: PluginManifest = {
  schema: "proofscript.plugin/v1",
  id: "proofscript.feature.io-error-structured",
  version: "0.91.0",
  kind: "feature",
  semanticIds: [
    ...constructorsOwnedHere.map((c) => `lean.io.error.${c.name}`),
    "lean.io.error.match",
  ],
  proofscriptBaseline: "v0.1",
  leanBaseline: "4.33.1",
  lean: { assumptionPolicy: "none" },
};

const plugin: ProofScriptPlugin = {
  id: proofscriptManifest.id,
  version: proofscriptManifest.version,
  kind: "feature",
  requires: ["proofscript.feature.io", "proofscript.feature.option", "proofscript.feature.uint32", "proofscript.feature.match"],
  setup(registry) {
    registry.registerSemanticInfo(exactMatchableKey(ioError.id), {
      matchOperation: "lean.io.error.match",
      variantsFor(type) {
        if (type.id !== ioError.id) throw new ProofScriptError("PS2D01", `Expected IO.Error match type, got '${type.displayName}'.`);
        return constructors.map((ctor) => ({
          name: ctor.name,
          fields: ctor.fields.map((field) => field.type),
          fieldNames: ctor.fields.map((field) => field.name),
        }));
      },
    } satisfies MatchableDescriptor);

    registry.registerExpressionSyntax({
      keyword: ".unexpectedEof",
      owner: "lean.io.error.unexpectedEof.syntax",
      parse(_cursor) { return { kind: "extension", owner: "lean.io.error.unexpectedEof.syntax", payload: {} }; },
    });
    registry.registerExpressionElaborator({
      owner: "lean.io.error.unexpectedEof.syntax",
      elaborate(expr, expected) {
        if (expr.kind !== "extension") throw new ProofScriptError("PS2D02", "IO.Error.unexpectedEof elaborator received non-extension syntax.");
        if (!expected || expected.id !== ioError.id) throw new ProofScriptError("PS2D03", ".unexpectedEof requires expected type IO.Error.");
        return { kind: "extension", op: "lean.io.error.unexpectedEof", args: [], payload: {}, type: ioError };
      },
    });
    registry.registerOperation("lean.io.error.unexpectedEof", {
      requiredCapabilities: ["core.io.error.structural"],
      verification: { level: "kernel-checkable", notes: "Lean IO.Error.unexpectedEof constructor." },
    });
    registry.registerLeanExprLowering("lean.io.error.unexpectedEof", (expr) => {
      if (expr.kind !== "extension") throw new ProofScriptError("PS4D00", "Expected IO.Error.unexpectedEof extension node.");
      return "IO.Error.unexpectedEof";
    });

    for (const ctor of constructorsOwnedHere) {
      registry.registerBuiltinFunction(`IO.Error.${ctor.name}`, {
        params: ctor.fields.map((field) => valueParam(field.name, field.type)),
        result: ioError,
        operation: `lean.io.error.${ctor.name}`,
      });
      registry.registerOperation(`lean.io.error.${ctor.name}`, {
        requiredCapabilities: ["core.io.error.structural"],
        verification: { level: "kernel-checkable", notes: `Lean IO.Error.${ctor.name} constructor.` },
      });
      registry.registerLeanExprLowering(`lean.io.error.${ctor.name}`, (expr, context) => {
        if (expr.kind !== "op") throw new ProofScriptError("PS4D01", `Expected IO.Error.${ctor.name} operation node.`);
        return `(IO.Error.${ctor.name} ${expr.args.map((arg) => context.emitExpr(arg)).join(" ")})`;
      });
    }

    registry.registerOperation("lean.io.error.match", {
      requiredCapabilities: ["core.io.error.match"],
      verification: { level: "kernel-checkable", notes: "Lean exhaustive pattern matching over IO.Error." },
    });
    registry.registerLeanExprLowering("lean.io.error.match", (expr, context) => {
      if (expr.kind !== "extension") throw new ProofScriptError("PS4D02", "Expected IO.Error match extension node.");
      const payload = expr.payload as { cases: readonly { variant: string; binders: readonly string[] }[]; matchSyntax?: PatternMatchSyntaxMetadata };
      const [scrutinee, ...bodies] = expr.args;
      const branches = payload.cases.map((item, index) => {
        const binders = item.binders.join(" ");
        return `| IO.Error.${item.variant}${binders ? ` ${binders}` : ""} => ${context.emitExpr(bodies[index]!)}`;
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
