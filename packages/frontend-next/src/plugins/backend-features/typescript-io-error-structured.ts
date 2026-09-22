import { ProofScriptError } from "../../core/errors.js";
import type { IRExpr } from "../../core/model.js";
import type { ProofScriptPlugin } from "../../core/plugin-api.js";

interface CtorSpec { readonly name: string; readonly fields: readonly string[]; }
const constructors: readonly CtorSpec[] = [
  {name:"alreadyExists",fields:["filename","osCode","details"]},
  {name:"otherError",fields:["osCode","details"]},
  {name:"resourceBusy",fields:["osCode","details"]},
  {name:"resourceVanished",fields:["osCode","details"]},
  {name:"unsupportedOperation",fields:["osCode","details"]},
  {name:"hardwareFault",fields:["osCode","details"]},
  {name:"unsatisfiedConstraints",fields:["osCode","details"]},
  {name:"illegalOperation",fields:["osCode","details"]},
  {name:"protocolError",fields:["osCode","details"]},
  {name:"timeExpired",fields:["osCode","details"]},
  {name:"interrupted",fields:["filename","osCode","details"]},
  {name:"noFileOrDirectory",fields:["filename","osCode","details"]},
  {name:"invalidArgument",fields:["filename","osCode","details"]},
  {name:"permissionDenied",fields:["filename","osCode","details"]},
  {name:"resourceExhausted",fields:["filename","osCode","details"]},
  {name:"inappropriateType",fields:["filename","osCode","details"]},
  {name:"noSuchThing",fields:["filename","osCode","details"]},
  {name:"unexpectedEof",fields:[]},
  {name:"userError",fields:["msg"]},
] as const;
const ctorByName = new Map(constructors.map((c) => [c.name, c]));

function containsVar(expr: IRExpr, name: string): boolean {
  switch (expr.kind) {
    case "var": return expr.name === name;
    case "literal": case "type": return false;
    case "call": case "op": case "extension": return expr.args.some((arg) => containsVar(arg, name));
    case "apply": return containsVar(expr.callee, name) || expr.args.some((arg) => containsVar(arg, name));
    case "lambda": case "quantifier": return expr.params.some((param) => param.name === name) ? false : containsVar(expr.body, name);
  }
}

const plugin: ProofScriptPlugin = {
  id: "proofscript.backend-feature.typescript-io-error-structured",
  version: "0.91.0",
  kind: "backend-feature",
  requires: [
    "proofscript.backend.typescript", "proofscript.feature.io-error-structured",
    "proofscript.backend-feature.typescript-io", "proofscript.backend-feature.typescript-option",
    "proofscript.backend-feature.typescript-uint32", "proofscript.feature.match",
  ],
  setup(registry) {
    registry.addTargetCapability("typescript", "core.io.error.structural");
    registry.addTargetCapability("typescript", "core.io.error.match");

    for (const ctor of constructors.filter((c) => c.name !== "userError" && c.name !== "unexpectedEof")) {
      registry.registerTargetExprLowering("typescript", `lean.io.error.${ctor.name}`, (expr, context) => {
        if (expr.kind !== "op") throw new ProofScriptError("PS3D01", `Expected IO.Error.${ctor.name} operation node.`);
        const fields = ctor.fields.map((field, index) => `${field}: ${context.emitExpr(expr.args[index]!)}`);
        return `({ __proofscriptIOErrorBrand: "IO.Error", tag: "${ctor.name}"${fields.length ? `, ${fields.join(", ")}` : ""} } as { readonly __proofscriptIOErrorBrand: "IO.Error" })`;
      });
    }

    registry.registerTargetExprLowering("typescript", "lean.io.error.unexpectedEof", (expr) => {
      if (expr.kind !== "extension") throw new ProofScriptError("PS3D00", "Expected IO.Error.unexpectedEof extension node.");
      return `({ __proofscriptIOErrorBrand: "IO.Error", tag: "unexpectedEof" } as { readonly __proofscriptIOErrorBrand: "IO.Error" })`;
    });

    registry.registerTargetExprLowering("typescript", "lean.io.error.match", (expr, context) => {
      if (expr.kind !== "extension") throw new ProofScriptError("PS3D02", "Expected IO.Error match extension node.");
      const payload = expr.payload as { cases: readonly { variant: string; binders: readonly string[] }[]; matchSyntax?: { readonly discriminantEqualityName?: string } };
      const [scrutinee, ...bodies] = expr.args;
      const equalityName = payload.matchSyntax?.discriminantEqualityName;
      if (equalityName && bodies.some((body) => containsVar(body, equalityName))) {
        throw new ProofScriptError("PS3D03", `Pattern equality proof '${equalityName}' is compile-time evidence and cannot be used computationally by the TypeScript target.`);
      }
      const cases = payload.cases.map((item, index) => {
        const ctor = ctorByName.get(item.variant);
        if (!ctor) throw new ProofScriptError("PS3D04", `Unknown IO.Error match constructor '${item.variant}'.`);
        if (item.binders.length !== ctor.fields.length) throw new ProofScriptError("PS3D05", `IO.Error.${item.variant} pattern expects ${ctor.fields.length} binder(s).`);
        const args = item.binders.map((binder, fieldIndex) => `__psm.${ctor.fields[fieldIndex]}`);
        const invoke = item.binders.length
          ? `((${item.binders.join(", ")}) => ${context.emitExpr(bodies[index]!)})(${args.join(", ")})`
          : context.emitExpr(bodies[index]!);
        return `case "${item.variant}": return ${invoke};`;
      }).join(" ");
      // Host adapters from older IO tranches intentionally do not fabricate a
      // Lean constructor when the platform failure has not yet been mapped.
      return `((__psm: any) => { switch (__psm.tag) { ${cases} default: throw new Error("Unmapped host IO.Error cannot be structurally matched"); } })(${context.emitExpr(scrutinee!)})`;
    });
  },
};
export default plugin;
