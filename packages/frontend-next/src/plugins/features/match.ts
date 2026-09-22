import { ProofScriptError } from "../../core/errors.js";
import type { PluginManifest, ProofScriptPlugin } from "../../core/plugin-api.js";
import type { IRType, SurfaceExpr, SurfaceTypeExpr } from "../../core/model.js";
import {
  compilePatternAlternatives,
  parsePatternSequence,
  type PatternMatchSyntaxMetadata,
  type SurfacePatternAlternative,
} from "./pattern-engine.js";

interface MatchDiscriminantSurface {
  readonly expression: SurfaceExpr;
  readonly equalityName?: string;
}

interface MatchPayload {
  readonly discriminants: readonly MatchDiscriminantSurface[];
  readonly alternatives: readonly SurfacePatternAlternative[];
  readonly motive?: SurfaceTypeExpr;
  /** Present only when the option was explicitly written. */
  readonly generalizing?: boolean;
}

interface NatPatternMatchPayload {
  readonly patterns: readonly ({ readonly kind: "number"; readonly value: string } | { readonly kind: "catchall"; readonly binder?: string })[];
  readonly matchSyntax?: PatternMatchSyntaxMetadata;
}

function parseBooleanOption(cursor: import("../../core/plugin-api.js").ParserCursor, name: string): boolean {
  cursor.expect("(");
  cursor.expect(name);
  cursor.expect(":=");
  const text = cursor.consume();
  if (text !== "true" && text !== "false") throw new ProofScriptError("PS2942", `Match option '${name}' expects true or false.`);
  cursor.expect(")");
  return text === "true";
}

function renderLeanMatchHead(scrutinee: import("../../core/model.js").IRExpr, syntax: PatternMatchSyntaxMetadata | undefined, context: import("../../core/model.js").EmitContext): string {
  const options: string[] = [];
  if (syntax?.generalizing !== undefined) options.push(`(generalizing := ${syntax.generalizing ? "true" : "false"})`);
  if (syntax?.motive) options.push(`(motive := ${context.emitType(syntax.motive)})`);
  const discriminant = syntax?.discriminantEqualityName
    ? `${syntax.discriminantEqualityName} : ${context.emitExpr(scrutinee)}`
    : context.emitExpr(scrutinee);
  return `match${options.length ? ` ${options.join(" ")}` : ""} ${discriminant} with`;
}

function containsVar(expr: import("../../core/model.js").IRExpr, name: string): boolean {
  switch (expr.kind) {
    case "var": return expr.name === name;
    case "literal":
    case "type": return false;
    case "call":
    case "op":
    case "extension": return expr.args.some((arg) => containsVar(arg, name));
    case "apply": return containsVar(expr.callee, name) || expr.args.some((arg) => containsVar(arg, name));
    case "lambda":
    case "quantifier": return expr.params.some((param) => param.name === name) ? false : containsVar(expr.body, name);
  }
}

export const proofscriptManifest: PluginManifest = {
  schema: "proofscript.plugin/v1",
  id: "proofscript.feature.match",
  version: "0.91.0",
  kind: "feature",
};

const plugin: ProofScriptPlugin = {
  id: proofscriptManifest.id,
  version: proofscriptManifest.version,
  kind: "feature",
  setup(registry) {
    registry.registerExpressionSyntax({
      keyword: "match",
      owner: "lean.match.syntax",
      parse(cursor) {
        let motive: SurfaceTypeExpr | undefined;
        let generalizing: boolean | undefined;
        while (cursor.peek("(") && (cursor.peekAhead(1, "motive") || cursor.peekAhead(1, "generalizing"))) {
          if (cursor.peekAhead(1, "generalizing")) {
            if (generalizing !== undefined) throw new ProofScriptError("PS2943", "Match option 'generalizing' may be specified only once.");
            generalizing = parseBooleanOption(cursor, "generalizing");
            continue;
          }
          cursor.expect("(");
          cursor.expect("motive");
          cursor.expect(":=");
          if (motive) throw new ProofScriptError("PS2944", "Match option 'motive' may be specified only once.");
          motive = cursor.parseTypeExpression();
          cursor.expect(")");
        }

        cursor.expect("(");
        const discriminants: MatchDiscriminantSurface[] = [];
        while (true) {
          if (cursor.currentToken().kind === "identifier" && cursor.peekAhead(1, ":")) {
            const equalityName = cursor.parseIdentifier();
            cursor.consume(":");
            discriminants.push({ equalityName, expression: cursor.parseExpression() });
          } else {
            discriminants.push({ expression: cursor.parseExpression() });
          }
          if (cursor.peek(",")) { cursor.consume(","); continue; }
          break;
        }
        cursor.expect(")");
        cursor.expect("{");
        const alternatives: SurfacePatternAlternative[] = [];
        while (!cursor.peek("}")) {
          cursor.expect("|");
          const sequences = [parsePatternSequence(cursor)];
          while (cursor.peek("|")) {
            cursor.consume("|");
            sequences.push(parsePatternSequence(cursor));
          }
          cursor.expect("=>");
          const body = cursor.parseExpression();
          if (cursor.peek(",") || cursor.peek(";")) {
            throw new ProofScriptError("PS2410", "ProofScript match alternatives are separated by '|', not branch-level ',' or ';'.");
          }
          alternatives.push({ sequences, body });
        }
        cursor.expect("}");
        return {
          kind: "extension",
          owner: "lean.match.syntax",
          payload: {
            discriminants,
            alternatives,
            ...(motive ? { motive } : {}),
            ...(generalizing !== undefined ? { generalizing } : {}),
          } satisfies MatchPayload,
        };
      },
    });

    registry.registerExpressionElaborator({
      owner: "lean.match.syntax",
      elaborate(expr, expected, context) {
        if (expr.kind !== "extension") throw new ProofScriptError("PS2411", "Match elaborator received non-extension syntax.");
        const payload = expr.payload as MatchPayload;
        const discriminants = payload.discriminants.map((item) => context.elaborateExpression(item.expression));
        const motive: IRType | undefined = payload.motive ? context.resolveTypeExpression(payload.motive) : undefined;
        return compilePatternAlternatives(discriminants, payload.alternatives, expected, context, {
          ...(motive ? { motive } : {}),
          generalizing: payload.generalizing ?? true,
          ...(payload.generalizing !== undefined ? { sourceGeneralizing: payload.generalizing } : {}),
          discriminantEqualityNames: payload.discriminants.map((item) => item.equalityName),
        }).expression;
      },
    });

    registry.registerOperation("core.pattern.natMatch", {
      requiredCapabilities: ["core.nat"],
      verification: { level: "kernel-checkable", notes: "Nat literal/catch-all pattern matrix compiled to ordinary Lean matching." },
      domain: "runtime",
    });
    registry.registerLeanExprLowering("core.pattern.natMatch", (expr, emit) => {
      if (expr.kind !== "extension") throw new ProofScriptError("PS4811", "Expected Nat pattern-match IR expression.");
      const payload = expr.payload as NatPatternMatchPayload;
      const [scrutinee, ...branchBodies] = expr.args;
      const branches = payload.patterns.map((pattern, index) => `| ${pattern.kind === "number" ? pattern.value : (pattern.binder ?? "_")} => ${emit.emitExpr(branchBodies[index]!)}`);
      return `(${renderLeanMatchHead(scrutinee!, payload.matchSyntax, emit)} ${branches.join(" ")})`;
    });
    registry.registerTargetExprLowering("typescript", "core.pattern.natMatch", (expr, emit) => {
      if (expr.kind !== "extension") throw new ProofScriptError("PS3811", "Expected Nat pattern-match IR expression.");
      const payload = expr.payload as NatPatternMatchPayload;
      const [scrutinee, ...branchBodies] = expr.args;
      const equalityName = payload.matchSyntax?.discriminantEqualityName;
      if (equalityName && branchBodies.some((body) => containsVar(body, equalityName))) {
        throw new ProofScriptError("PS3812", `Pattern equality proof '${equalityName}' is compile-time evidence and cannot be used computationally by the TypeScript target.`);
      }
      let fallback = "(() => { throw new Error(\"unreachable ProofScript Nat pattern match\"); })()";
      for (let index = payload.patterns.length - 1; index >= 0; index -= 1) {
        const pattern = payload.patterns[index]!;
        const branch = emit.emitExpr(branchBodies[index]!);
        fallback = pattern.kind === "catchall" ? branch : `_psn === ${pattern.value}n ? ${branch} : (${fallback})`;
      }
      return `((_psn: bigint) => ${fallback})(${emit.emitExpr(scrutinee!)})`;
    });
  },
};

export default plugin;
