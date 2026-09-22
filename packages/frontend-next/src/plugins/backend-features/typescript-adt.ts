import { ProofScriptError } from "../../core/errors.js";
import type { IRParam } from "../../core/model.js";
import type { ProofScriptPlugin } from "../../core/plugin-api.js";
import type { AdtConstructPayload, AdtDeclPayload, AdtMatchPayload, AdtMutualDeclPayload } from "../features/adt.js";

function runtimeVariantParams(declaration: AdtDeclPayload | undefined, variantName: string): readonly IRParam[] {
  return declaration?.variants.find((item) => item.name === variantName)?.params.filter((param) => !param.isTypeParam && param.binderInfo === "explicit") ?? [];
}

function containsVar(expr: import("../../core/model.js").IRExpr, name: string): boolean {
  switch (expr.kind) {
    case "var": return expr.name === name;
    case "literal": case "type": return false;
    case "call": case "op": case "extension": return expr.args.some((arg) => containsVar(arg, name));
    case "apply": return containsVar(expr.callee, name) || expr.args.some((arg) => containsVar(arg, name));
    case "lambda": case "quantifier": return expr.params.some((param) => param.name === name) ? false : containsVar(expr.body, name);
  }
}

const plugin: ProofScriptPlugin = {
  id: "proofscript.backend-feature.typescript-adt",
  version: "0.91.0",
  kind: "backend-feature",
  requires: ["proofscript.backend.typescript", "proofscript.feature.adt", "proofscript.feature.match"],
  setup(registry) {
    registry.addTargetCapability("typescript", "core.adt");
    registry.addTargetCapability("typescript", "core.adt.indexed");
    registry.addTargetCapability("typescript", "core.adt.match");
    registry.registerTargetTypeFamilyLowering("typescript", "core.adt", (type, context) => {
      const family = type.family ?? "";
      const name = family.startsWith("core.adt:") ? family.slice("core.adt:".length) : type.displayName;
      // ProofScript indices and uniform term parameters are compile-time refinements.
      // The TypeScript runtime representation keeps only type arguments; value
      // indices have already been checked by the frontend and are erased here.
      const retained = (type.args ?? []).filter((arg) => arg.kind === "type");
      const args = retained.map((arg) => context.emitTypeArgument(arg)).join(", ");
      return args ? `${name}<${args}>` : name;
    });

    const lowerDeclaration = (declarationNode: import("../../core/model.js").IRExtensionDecl, context: import("../../core/model.js").EmitContext) => {
      const payload = declarationNode.payload as AdtDeclPayload;
      const typeParams = payload.params.filter((param) => param.isTypeParam);
      const generics = typeParams.length > 0 ? `<${typeParams.map((param) => param.name).join(", ")}>` : "";
      const variants = payload.variants.map((variant) => {
        const fields = runtimeVariantParams(payload, variant.name).map((param) => `${param.name}: ${context.emitType(param.type)}`).join("; ");
        return `{ tag: \"${variant.name}\"${fields ? `; ${fields}` : ""} }`;
      });
      return `export type ${payload.name}${generics} = ${variants.length ? variants.join(" | ") : "never"};`;
    };
    registry.registerTargetDeclarationLowering("typescript", "lean.inductive.decl", lowerDeclaration);
    registry.registerTargetDeclarationLowering("typescript", "lean.inductive.indexed.decl", lowerDeclaration);
    registry.addTargetCapability("typescript", "core.adt.mutual");
    registry.registerTargetDeclarationLowering("typescript", "lean.inductive.mutual.decl", (declaration, context) => {
      const payload = declaration.payload as AdtMutualDeclPayload;
      return payload.members.map((member) => lowerDeclaration({ ...declaration, payload: member }, context)).join("\n");
    });

    const lowerConstruct = (expr: import("../../core/model.js").IRExpr, context: import("../../core/model.js").EmitContext) => {
      if (expr.kind !== "op") throw new ProofScriptError("PS3321", "Expected inductive constructor op.");
      const payload = expr.payload as AdtConstructPayload;
      const declaration = context.registry.getSemanticInfo<AdtDeclPayload>(`adt.decl:${payload.typeName}`);
      const variant = declaration?.variants.find((item) => item.name === payload.variant);
      // Constructor expression args correspond to constructor-local params.
      // Uniform family parameters (for example `A` in `Box(A)`) are carried
      // by the result type and are not duplicated in `expr.args`.
      const constructorParams = variant?.params ?? [];
      const runtimeArgs = expr.args.flatMap((arg, index) => {
        const param = constructorParams[index];
        return param && !param.isTypeParam && param.binderInfo === "explicit" ? [[param.name, arg] as const] : [];
      });
      const fields = runtimeArgs.map(([name, arg]) => `${name}: ${context.emitExpr(arg)}`).join(", ");
      return `({ tag: \"${payload.variant}\"${fields ? `, ${fields}` : ""} } as ${context.emitType(expr.type)})`;
    };
    registry.registerTargetExprLowering("typescript", "lean.inductive.construct", lowerConstruct);
    registry.registerTargetExprLowering("typescript", "lean.inductive.indexed.construct", lowerConstruct);

    registry.registerTargetExprLowering("typescript", "lean.inductive.match", (expr, context) => {
      if (expr.kind !== "extension") throw new ProofScriptError("PS3322", "Expected inductive match extension.");
      const payload = expr.payload as AdtMatchPayload;
      const declaration = context.registry.getSemanticInfo<AdtDeclPayload>(`adt.decl:${payload.typeName}`);
      const [scrutinee, ...bodies] = expr.args;
      const equalityName = payload.matchSyntax?.discriminantEqualityName;
      if (equalityName && bodies.some((body) => containsVar(body, equalityName))) {
        throw new ProofScriptError("PS3323", `Pattern equality proof '${equalityName}' is compile-time evidence and cannot be used computationally by the TypeScript target.`);
      }
      let fallback = "(() => { throw new Error(\"unreachable ProofScript match\"); })()";
      for (let index = payload.cases.length - 1; index >= 0; index -= 1) {
        const item = payload.cases[index]!;
        const body = context.emitExpr(bodies[index]!);
        const visibleFields = runtimeVariantParams(declaration, item.variant);
        const binderArgs = item.binders.map((_, binderIndex) => `_psm.${item.fieldNames?.[binderIndex] ?? visibleFields[binderIndex]?.name ?? `field${binderIndex + 1}`}`).join(", ");
        const branch = item.binders.length > 0
          ? `((${item.binders.join(", ")}) => ${body})(${binderArgs})`
          : body;
        fallback = `_psm.tag === \"${item.variant}\" ? ${branch} : (${fallback})`;
      }
      return `((_psm: ${context.emitType(scrutinee!.type)}) => ${fallback})(${context.emitExpr(scrutinee!)})`;
    });
  },
};

export default plugin;
