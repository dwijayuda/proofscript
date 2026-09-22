import { parseBinderGroups } from "../../core/binders.js";
import { ProofScriptError } from "../../core/errors.js";
import type { DeclarationElaborationContext, ParserCursor, PluginManifest, ProofScriptPlugin } from "../../core/plugin-api.js";
import type { IRExpr, IRParam, IRType, SurfaceDecl, SurfaceExpr, SurfaceParam } from "../../core/model.js";
import { isSortType, makeTypeVariable } from "../../core/type-utils.js";
import { collectSurfaceExprNames, collectSurfaceParamTypeNames, explicitBinderNames } from "../../core/surface-names.js";

interface TheoremSurfacePayload {
  readonly name: string;
  readonly params: readonly SurfaceParam[];
  readonly proposition: SurfaceExpr;
  readonly proof: string;
}
interface TheoremIrPayload {
  readonly name: string;
  readonly sourceName: string;
  readonly params: readonly IRParam[];
  readonly proof: string;
}
interface Telescope {
  readonly params: readonly IRParam[];
  readonly typeLocals: ReadonlyMap<string, IRType>;
  readonly valueLocals: ReadonlyMap<string, IRType>;
  readonly instanceLocals: ReadonlyMap<string, IRType>;
}
function surfacePayload(decl: SurfaceDecl): TheoremSurfacePayload {
  if (decl.kind !== "lean.theorem") throw new ProofScriptError("PS2601", "Invalid declaration passed to theorem plugin.");
  return decl.payload as TheoremSurfacePayload;
}
function elaborateTelescope(surface: TheoremSurfacePayload, context: DeclarationElaborationContext, extraReferenced: ReadonlySet<string> = new Set()): Telescope {
  const referenced = new Set<string>();
  collectSurfaceParamTypeNames(surface.params, referenced);
  collectSurfaceExprNames(surface.proposition, referenced);
  for (const name of extraReferenced) referenced.add(name);
  const sectionParams = context.selectSectionVariables(referenced, explicitBinderNames(surface.params));
  const params: IRParam[] = [...sectionParams];
  const typeLocals = new Map<string, IRType>();
  const valueLocals = new Map<string, IRType>();
  const instanceLocals = new Map<string, IRType>();
  for (const param of sectionParams) {
    if (param.isTypeParam) typeLocals.set(param.name, makeTypeVariable(param.name, param.type));
    else {
      valueLocals.set(param.name, param.type);
      if (param.binderInfo === "instance") instanceLocals.set(param.name, param.type);
    }
  }
  for (const param of surface.params) {
    const type = context.withTypeLocals(typeLocals, () => context.withLocals(valueLocals, () => context.resolveTypeExpression(param.type)));
    const isTypeParam = isSortType(type);
    params.push({ name: param.name, type, binderInfo: param.binderInfo, ...(isTypeParam ? { isTypeParam: true } : {}) });
    if (isTypeParam) typeLocals.set(param.name, makeTypeVariable(param.name, type));
    else {
      valueLocals.set(param.name, type);
      if (param.binderInfo === "instance") instanceLocals.set(param.name, type);
    }
  }
  return { params, typeLocals, valueLocals, instanceLocals };
}

export const proofscriptManifest: PluginManifest = {
  schema: "proofscript.plugin/v1",
  id: "proofscript.feature.theorem",
  version: "0.91.0",
  kind: "feature",
  semanticIds: ["lean.theorem"],
  proofscriptBaseline: "v0.1",
  leanBaseline: "4.33.1",
  lean: { assumptionPolicy: "none" },
};

const plugin: ProofScriptPlugin = {
  id: proofscriptManifest.id,
  version: proofscriptManifest.version,
  kind: "feature",
  requires: ["proofscript.feature.prop-eq"],
  setup(registry) {
    registry.registerDeclarationSyntax({
      keyword: "theorem",
      parse(cursor: ParserCursor) {
        const name = cursor.parseIdentifier();
        const params = parseBinderGroups(cursor);
        cursor.expect(":");
        const proposition = cursor.parseExpression();
        cursor.expect(":=");
        cursor.expect("by");
        cursor.expect("{");
        const proofTokens: string[] = [];
        while (!cursor.peek("}")) proofTokens.push(cursor.consume());
        cursor.expect("}");
        if (cursor.peek(";")) cursor.consume(";");
        if (proofTokens.length === 0) throw new ProofScriptError("PS2603", "The MVP theorem slice requires a non-empty tactic proof body.");
        return { kind: "lean.theorem", payload: { name, params, proposition, proof: proofTokens.join(" ") } satisfies TheoremSurfacePayload };
      },
    });

    registry.registerDeclarationElaborator({
      kind: "lean.theorem",
      declare() {},
      elaborate(decl, context) {
        const surface = surfacePayload(decl);
        const preliminary = elaborateTelescope(surface, context);
        const usage = context.captureSectionInstanceUsage(() => context.withTypeLocals(preliminary.typeLocals, () =>
          context.withInstanceLocals(preliminary.instanceLocals, () =>
            context.withLocals(preliminary.valueLocals, () => context.elaborateExpression(surface.proposition, context.resolveType("Prop"))),
          ),
        ));
        const telescope = elaborateTelescope(surface, context, usage.usedNames);
        const proposition = context.withTypeLocals(telescope.typeLocals, () =>
          context.withInstanceLocals(telescope.instanceLocals, () =>
            context.withLocals(telescope.valueLocals, () => context.elaborateExpression(surface.proposition, context.resolveType("Prop"))),
          ),
        );
        return {
          kind: "extension",
          op: "lean.theorem",
          args: [proposition],
          payload: { name: context.qualifyName(surface.name), sourceName: surface.name, params: telescope.params, proof: surface.proof } satisfies TheoremIrPayload,
        };
      },
    });

    registry.registerOperation("lean.theorem", {
      verification: { level: "kernel-checkable", notes: "Theorem declaration is emitted as an ordinary Lean theorem and accepted only if Lean checks its proof." },
      domain: "proof",
    });
    registry.registerLeanDeclarationLowering("lean.theorem", (declaration, context) => {
      const payload = declaration.payload as TheoremIrPayload;
      const proposition = declaration.args?.[0] as IRExpr | undefined;
      if (!proposition) throw new ProofScriptError("PS4601", "Malformed theorem declaration: missing proposition argument.");
      const params = payload.params.map((param) => renderLeanBinder(param, context.emitType(param.type))).join(" ");
      return [
        `theorem ${payload.sourceName}${params ? ` ${params}` : ""} : ${context.emitExpr(proposition)} := by`,
        `  ${payload.proof}`,
      ].join("\n");
    });
  },
};

function renderLeanBinder(param: IRParam, type: string): string {
  switch (param.binderInfo) {
    case "explicit": return `(${param.name} : ${type})`;
    case "implicit": return `{${param.name} : ${type}}`;
    case "strictImplicit": return `⦃${param.name} : ${type}⦄`;
    case "instance": return `[${param.name} : ${type}]`;
  }
}

export default plugin;
