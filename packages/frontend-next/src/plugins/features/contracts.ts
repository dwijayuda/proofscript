import { ProofScriptError } from "../../core/errors.js";
import type { PluginManifest, ProofScriptPlugin } from "../../core/plugin-api.js";
import type { IRAnnotation, IRDef, IRExpr, IRParam, SurfaceClause, SurfaceExpr } from "../../core/model.js";
import { makeTypeTerm } from "../../core/type-utils.js";
import { collectSurfaceExprNames } from "../../core/surface-names.js";

interface SurfaceRequirement {
  readonly name: string;
  readonly predicate: SurfaceExpr;
}

interface SurfaceEnsure {
  readonly predicate: SurfaceExpr;
  readonly proof: string;
}

interface ContractSurfacePayload {
  readonly mode: "value";
  readonly requirements: readonly SurfaceRequirement[];
  readonly ensures: readonly SurfaceEnsure[];
}

interface ContractRequirement {
  readonly name: string;
  readonly argIndex: number;
}

interface ContractEnsure {
  readonly argIndex: number;
  readonly proof: string;
}

interface ContractIrPayload {
  readonly mode: "value";
  readonly requirements: readonly ContractRequirement[];
  readonly ensures: readonly ContractEnsure[];
  /** Fully qualified semantic owner, attached by the def elaborator. */
  readonly ownerName?: string;
}

function payloadOf(clause: SurfaceClause): ContractSurfacePayload {
  return clause.payload as ContractSurfacePayload;
}

function containsResult(expr: SurfaceExpr): boolean {
  switch (expr.kind) {
    case "identifier": return expr.name === "result";
    case "call": return expr.args.some(containsResult);
    case "lambda": return containsResult(expr.body);
    case "quantifier": return containsResult(expr.body);
    case "binary": return containsResult(expr.left) || containsResult(expr.right);
    case "extension": return false;
    case "number": return false;
    case "string": return false;
  }
}

function contractPayload(annotation: IRAnnotation): ContractIrPayload {
  if (annotation.op !== "proof.contract.value") throw new ProofScriptError("PS4501", "Malformed value contract annotation.");
  return annotation.payload as ContractIrPayload;
}

function predicate(annotation: IRAnnotation, index: number): IRExpr {
  const arg = annotation.args[index];
  if (!arg) throw new ProofScriptError("PS4502", "Malformed contract predicate index.");
  return arg;
}

export const proofscriptManifest: PluginManifest = {
  schema: "proofscript.plugin/v1",
  id: "proofscript.feature.contracts",
  version: "0.91.0",
  kind: "feature",
  semanticIds: ["proof.contract.value"],
  lean: { assumptionPolicy: "none" },
};

const plugin: ProofScriptPlugin = {
  id: proofscriptManifest.id,
  version: proofscriptManifest.version,
  kind: "feature",
  requires: ["proofscript.feature.prop-eq"],
  setup(registry) {
    registry.registerLeanPrelude([
      'macro "proofscript_contract" : tactic =>',
      '  `(tactic| first | assumption | rfl | simp)',
    ].join("\n"));

    // `contract` is the only top-level verification-extension introducer in the v0.1 reference.
    registry.registerDeclarationClauseSyntax({
      keyword: "contract",
      owner: "proof.contract.value.syntax",
      parse(cursor) {
        let mode: "value" = "value";
        if (cursor.peek("value")) cursor.consume("value");
        cursor.expect("{");
        const requirements: SurfaceRequirement[] = [];
        const ensures: SurfaceEnsure[] = [];
        while (!cursor.peek("}")) {
          if (cursor.peek("requires")) {
            cursor.consume("requires");
            const name = cursor.parseIdentifier();
            cursor.expect(":");
            const predicate = cursor.parseExpression();
            if (containsResult(predicate)) throw new ProofScriptError("PS2503", "A requires clause cannot reference the post-state result binder.");
            cursor.expect(";");
            requirements.push({ name, predicate });
            continue;
          }
          if (cursor.peek("ensures")) {
            cursor.consume("ensures");
            cursor.expect("(");
            const resultName = cursor.parseIdentifier();
            if (resultName !== "result") throw new ProofScriptError("PS2504", "Canonical ProofScript v0.1 uses '(result)' as the ensures result binder.");
            cursor.expect(")");
            cursor.expect("=>");
            const predicate = cursor.parseExpression();
            cursor.expect(":=");
            cursor.expect("by");
            cursor.expect("{");
            const proofTokens: string[] = [];
            while (!cursor.peek("}")) proofTokens.push(cursor.consume());
            cursor.expect("}");
            cursor.expect(";");
            if (proofTokens.length === 0) throw new ProofScriptError("PS2505", "An ensures clause requires an explicit proof body in this MVP.");
            ensures.push({ predicate, proof: proofTokens.join(" ") });
            continue;
          }
          throw new ProofScriptError("PS2506", "Expected 'requires' or 'ensures' inside contract value block.");
        }
        cursor.expect("}");
        if (requirements.length === 0 && ensures.length === 0) throw new ProofScriptError("PS2507", "A contract block must contain at least one clause.");
        return { owner: "proof.contract.value.syntax", payload: { mode, requirements, ensures } satisfies ContractSurfacePayload };
      },
    });

    registry.registerDeclarationClauseElaborator({
      owner: "proof.contract.value.syntax",
      scope: "params+result",
      collectReferencedNames(clause) {
        const payload = payloadOf(clause);
        const names = new Set<string>();
        for (const item of payload.requirements) collectSurfaceExprNames(item.predicate, names);
        for (const item of payload.ensures) collectSurfaceExprNames(item.predicate, names);
        names.delete("result");
        return [...names];
      },
      elaborate(clause, context, scope) {
        const payload = payloadOf(clause);
        const prop = context.resolveType("Prop");
        const args: IRExpr[] = [];
        const requirements: ContractRequirement[] = [];
        const ensures: ContractEnsure[] = [];
        const proofParams: IRParam[] = [];
        const activeLocals = new Map(scope.params);

        // Requirements are genuine ordered proof binders. Later requirements,
        // postconditions, and the declaration body may refer to earlier proofs.
        for (const requirement of payload.requirements) {
          const predicateExpr = context.withLocals(activeLocals, () =>
            context.elaborateExpression(requirement.predicate, prop),
          );
          const argIndex = args.length;
          args.push(predicateExpr);
          requirements.push({ name: requirement.name, argIndex });

          const proofParam: IRParam = {
            name: requirement.name,
            type: makeTypeTerm(predicateExpr),
            binderInfo: "explicit",
            isProofParam: true,
            isAutoParam: true,
          };
          proofParams.push(proofParam);
          activeLocals.set(requirement.name, proofParam.type);
        }

        for (const item of payload.ensures) {
          const ensureLocals = new Map(activeLocals);
          ensureLocals.set("result", scope.resultType);
          const predicateExpr = context.withLocals(ensureLocals, () =>
            context.elaborateExpression(item.predicate, prop),
          );
          const argIndex = args.length;
          args.push(predicateExpr);
          ensures.push({ argIndex, proof: item.proof });
        }
        return {
          op: "proof.contract.value",
          args,
          payload: { mode: payload.mode, requirements, ensures } satisfies ContractIrPayload,
          ...(proofParams.length === 0 ? {} : { proofParams }),
        };
      },
    });

    registry.registerOperation("proof.contract.value", {
      verification: { level: "kernel-checkable", notes: "Value contract lowers to ordinary proof parameters and postcondition theorems; it is not a kernel declaration kind." },
      domain: "proof",
    });

    registry.registerLeanDefBinderContributor((declaration, context) => {
      const annotation = declaration.annotations?.find((item) => item.op === "proof.contract.value");
      if (!annotation) return [];
      const payload = contractPayload(annotation);
      return payload.requirements.map((item) => {
        const pred = context.emitExpr(predicate(annotation, item.argIndex));
        // Conservative v0.1-oriented automation hook. Explicit proof passing remains the semantic model.
        return `(${item.name} : ${pred} := by proofscript_contract)`;
      });
    });

    registry.registerLeanAnnotationLowering("proof.contract.value", (annotation, declaration, context) => {
      const payload = contractPayload(annotation);
      const params = declaration.params.map((param) => `(${param.name} : ${context.emitType(param.type)})`);
      const hypotheses = payload.requirements.map((item) => `(${item.name} : ${context.emitExpr(predicate(annotation, item.argIndex))})`);
      const valueArgs = declaration.params.map((param) => param.name);
      const proofArgs = payload.requirements.map((item) => item.name);
      const callArgs = [...valueArgs, ...proofArgs].join(" ");
      const call = callArgs ? `(${declaration.name} ${callArgs})` : declaration.name;
      return payload.ensures.map((item, index) => {
        const goal = context.emitExpr(predicate(annotation, item.argIndex));
        return [
          `theorem ${declaration.name}.__ensures_${index + 1} ${[...params, ...hypotheses].join(" ")} :`,
          `    (let result : ${context.emitType(declaration.returnType)} := ${call}; ${goal}) := by`,
          `  ${item.proof}`,
        ].join("\n");
      }).join("\n\n");
    });
  },
};

export default plugin;
