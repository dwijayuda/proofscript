import { ProofScriptError } from "../../core/errors.js";
import type { ProofScriptPlugin } from "../../core/plugin-api.js";
import type { AdtConstructPayload, AdtDeclPayload, AdtMatchPayload } from "../features/adt.js";

const plugin: ProofScriptPlugin = {
  id: "proofscript.backend-feature.rust-adt",
  version: "0.91.0",
  kind: "backend-feature",
  requires: ["proofscript.backend.rust", "proofscript.feature.adt", "proofscript.feature.match"],
  setup(registry) {
    registry.addTargetCapability("rust", "core.adt");
    registry.addTargetCapability("rust", "core.adt.match");
    registry.registerTargetTypeFamilyLowering("rust", "core.adt", (type, context) => {
      const family = type.family ?? "";
      const name = family.startsWith("core.adt:") ? family.slice("core.adt:".length) : type.displayName;
      const args = (type.args ?? []).map((arg) => context.emitTypeArgument(arg)).join(", ");
      return args ? `${name}<${args}>` : name;
    });

    registry.registerTargetDeclarationLowering("rust", "lean.inductive.decl", (declaration, context) => {
      const payload = declaration.payload as AdtDeclPayload;
      const generics = payload.params.length > 0 ? `<${payload.params.map((param) => param.name).join(", ")}>` : "";
      const lines = [`pub enum ${payload.name}${generics} {`];
      for (const variant of payload.variants) {
        const fields = variant.fields.map((field) => context.emitType(field.type)).join(", ");
        lines.push(`    ${variant.name}${fields ? `(${fields})` : ""},`);
      }
      lines.push("}");
      return lines.join("\n");
    });

    registry.registerTargetExprLowering("rust", "lean.inductive.construct", (expr, context) => {
      if (expr.kind !== "op") throw new ProofScriptError("PS3331", "Expected inductive constructor op.");
      const payload = expr.payload as AdtConstructPayload;
      const args = expr.args.map((arg) => context.emitExpr(arg)).join(", ");
      return `${payload.typeName}::${payload.variant}${expr.args.length > 0 ? `(${args})` : ""}`;
    });

    registry.registerTargetExprLowering("rust", "lean.inductive.match", (expr, context) => {
      if (expr.kind !== "extension") throw new ProofScriptError("PS3332", "Expected inductive match extension.");
      const payload = expr.payload as AdtMatchPayload;
      const [scrutinee, ...bodies] = expr.args;
      const branches = payload.cases.map((item, index) => {
        const binders = item.binders.join(", ");
        const pattern = `${payload.typeName}::${item.variant}${item.binders.length > 0 ? `(${binders})` : ""}`;
        return `${pattern} => ${context.emitExpr(bodies[index]!)}`;
      });
      return `match ${context.emitExpr(scrutinee!)} { ${branches.join(", ")} }`;
    });
  },
};

export default plugin;
