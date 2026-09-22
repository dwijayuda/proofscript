import { ProofScriptError } from "../../core/errors.js";
import type { IRExpr, IRType } from "../../core/model.js";
import { isPropositionType } from "../../core/type-utils.js";
import type { ProofScriptPlugin } from "../../core/plugin-api.js";

interface IfIrPayload {
  readonly form: "if" | "bif";
  readonly decision: "bool" | "eq" | "instance";
  readonly binderName?: string;
}

function containsRuntimeVar(expr: IRExpr, name: string): boolean {
  switch (expr.kind) {
    case "var": return expr.name === name;
    case "literal":
    case "type": return false;
    case "call":
    case "op": return expr.args.some((arg) => containsRuntimeVar(arg, name));
    case "extension": {
      if ((expr.op === "core.local.let" || expr.op === "core.local.have") && expr.args.length === 2) {
        const payload = expr.payload as { name?: string; binderType?: IRType } | undefined;
        const value = expr.args[0]!;
        const body = expr.args[1]!;
        if (payload?.binderType && isPropositionType(payload.binderType)) {
          // Proof-valued local bindings are erased by the TypeScript local-binding backend.
          // Their proof value may therefore mention the named-if proof binder without
          // creating a runtime dependency.
          return payload.name === name ? false : containsRuntimeVar(body, name);
        }
        return containsRuntimeVar(value, name) || (payload?.name === name ? false : containsRuntimeVar(body, name));
      }
      return expr.args.some((arg) => containsRuntimeVar(arg, name));
    }
    case "apply": return containsRuntimeVar(expr.callee, name) || expr.args.some((arg) => containsRuntimeVar(arg, name));
    case "lambda":
    case "quantifier": return expr.params.some((param) => param.name === name) ? false : containsRuntimeVar(expr.body, name);
  }
}


function matchingDecidableEvidence(condition: IRExpr, evidence: IRExpr | undefined): boolean {
  if (!evidence || evidence.type.form !== "nominal" || evidence.type.family !== "lean.decidable" || evidence.type.args?.length !== 1 || evidence.type.args[0]?.kind !== "term") return false;
  return JSON.stringify(evidence.type.args[0].value) === JSON.stringify(condition);
}

function emitDecision(condition: IRExpr, context: import("../../core/model.js").EmitContext): string {
  if (condition.kind === "op" && condition.op === "proof.eq") {
    const left = condition.args[0];
    const right = condition.args[1];
    if (!left || !right || left.type.id !== right.type.id || !(left.type.id === "Nat" || left.type.id === "Bool")) {
      throw new ProofScriptError("PS3801", "TypeScript ordinary-if correspondence currently supports decidable Nat/Bool propositional equality only.");
    }
    return `(${context.emitExpr(left)} === ${context.emitExpr(right)})`;
  }
  if (condition.kind === "op" && (condition.op === "lean.lt" || condition.op === "lean.le")) {
    return context.emitExpr(condition);
  }
  throw new ProofScriptError("PS3802", "TypeScript ordinary-if correspondence does not know how to execute this Decidable proposition.");
}

const plugin: ProofScriptPlugin = {
  id: "proofscript.backend-feature.typescript-conditionals",
  version: "0.91.0",
  kind: "backend-feature",
  requires: ["proofscript.backend.typescript", "proofscript.feature.conditionals"],
  setup(registry) {
    registry.addTargetCapability("typescript", "core.conditional");
    registry.registerTargetTypeFamilyLowering("typescript", "lean.decidable", () => "ProofScriptDecidable");
    registry.registerSemanticInfo("typescript.decidablePrelude", `export type ProofScriptDecidable = Readonly<{ readonly tag: "isTrue" | "isFalse" }>;\nexport const __psDecidableIsTrue = (): ProofScriptDecidable => ({ tag: "isTrue" });\nexport const __psDecidableIsFalse = (): ProofScriptDecidable => ({ tag: "isFalse" });\nexport const __psDecidableEqNat = (left: bigint, right: bigint): ProofScriptDecidable => left === right ? __psDecidableIsTrue() : __psDecidableIsFalse();\nexport const __psDecidableLENat = (left: bigint, right: bigint): ProofScriptDecidable => left <= right ? __psDecidableIsTrue() : __psDecidableIsFalse();\nexport const __psDecidableLTNat = (left: bigint, right: bigint): ProofScriptDecidable => left < right ? __psDecidableIsTrue() : __psDecidableIsFalse();`);
    registry.registerTargetExprLowering("typescript", "lean.bif", (expr, context) => {
      if (expr.kind !== "extension") throw new ProofScriptError("PS3803", "Expected bif extension IR node.");
      const [condition, thenBranch, elseBranch] = expr.args;
      if (!condition || !thenBranch || !elseBranch) throw new ProofScriptError("PS3804", "Malformed bif IR node.");
      return `(${context.emitExpr(condition)} ? ${context.emitExpr(thenBranch)} : ${context.emitExpr(elseBranch)})`;
    });
    registry.registerTargetExprLowering("typescript", "lean.if", (expr, context) => {
      if (expr.kind !== "extension") throw new ProofScriptError("PS3805", "Expected if extension IR node.");
      const payload = expr.payload as IfIrPayload;
      const [condition, thenBranch, elseBranch, evidence] = expr.args;
      if (!condition || !thenBranch || !elseBranch) throw new ProofScriptError("PS3806", "Malformed if IR node.");
      const genericDecision = payload.decision === "instance" && !(condition.kind === "op" && (condition.op === "lean.lt" || condition.op === "lean.le"));
      if (genericDecision && !matchingDecidableEvidence(condition, evidence)) {
        throw new ProofScriptError("PS3808", "TypeScript generic Decidable(p) evidence does not exactly match the proposition being branched on.");
      }
      if (payload.binderName && (containsRuntimeVar(thenBranch, payload.binderName) || containsRuntimeVar(elseBranch, payload.binderName))) {
        throw new ProofScriptError("PS3807", `Dependent if proof binder '${payload.binderName}' is runtime-erased; the current TypeScript conditional lowering requires the proof binder to be computationally unused.`);
      }
      const decision = genericDecision ? `(${context.emitExpr(evidence!)}.tag === "isTrue")` : emitDecision(condition, context);
      return `(${decision} ? ${context.emitExpr(thenBranch)} : ${context.emitExpr(elseBranch)})`;
    });
  },
};

export default plugin;
