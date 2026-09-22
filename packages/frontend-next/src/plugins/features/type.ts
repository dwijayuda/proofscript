import { ProofScriptError } from "../../core/errors.js";
import type { IRUniverseLevel, SurfaceDecl } from "../../core/model.js";
import type { PluginManifest, ProofScriptPlugin } from "../../core/plugin-api.js";
import { makeSortType, universeDisplay } from "../../core/type-utils.js";

interface UniverseDeclPayload { readonly names: readonly string[]; }

function universePayload(decl: SurfaceDecl): UniverseDeclPayload {
  if (decl.kind !== "lean.universe") throw new ProofScriptError("PS4700", "Invalid declaration passed to universe feature.");
  return decl.payload as UniverseDeclPayload;
}

export const proofscriptManifest: PluginManifest = {
  schema: "proofscript.plugin/v1",
  id: "proofscript.feature.type",
  version: "0.91.0",
  kind: "feature",
  semanticIds: ["lean.sort", "lean.universe", "lean.type.term", "lean.pi"],
  proofscriptBaseline: "v0.1",
  leanBaseline: "4.33.1",
  lean: { assumptionPolicy: "none" },
};

const plugin: ProofScriptPlugin = {
  id: proofscriptManifest.id,
  version: proofscriptManifest.version,
  kind: "feature",
  setup(registry) {
    registry.registerTypeValue(makeSortType("Type"));

    registry.registerDeclarationSyntax({
      keyword: "universe",
      parse(cursor) {
        const names: string[] = [cursor.parseIdentifier()];
        while (cursor.peek(",")) {
          cursor.consume(",");
          names.push(cursor.parseIdentifier());
        }
        cursor.expect(";");
        return { kind: "lean.universe", payload: { names } satisfies UniverseDeclPayload };
      },
    });

    registry.registerDeclarationElaborator({
      kind: "lean.universe",
      declare(decl, context) {
        for (const name of universePayload(decl).names) context.declareUniverse(name);
      },
      elaborate(decl) {
        return { kind: "extension", op: "lean.universe.decl", payload: universePayload(decl) };
      },
    });

    registry.registerOperation("lean.universe.decl", {
      verification: { level: "kernel-checkable", notes: "Universe parameters are emitted as ordinary Lean universe declarations." },
      domain: "proof",
    });

    registry.registerLeanDeclarationLowering("lean.universe.decl", (declaration) => {
      const payload = declaration.payload as UniverseDeclPayload;
      return `universe ${payload.names.join(" ")}`;
    });

    registry.registerLeanTypeFamilyLowering("lean.sort", (type) => {
      if (type.form !== "sort" || !type.sortAlias) throw new ProofScriptError("PS4703", "Malformed universe sort in Semantic IR v6.");
      if (type.sortAlias === "Prop") return "Prop";
      const level: IRUniverseLevel | undefined = type.universe;
      if (!level) return type.sortAlias;
      if (type.sortAlias === "Type" && level.kind === "zero") return "Type";
      const rendered = universeDisplay(level);
      const atomic = level.kind === "zero" || level.kind === "param";
      return `${type.sortAlias} ${atomic ? rendered : `(${rendered})`}`;
    });

    registry.registerLeanTypeFamilyLowering("core.typevar", (type) => type.displayName);

    registry.registerLeanTypeFamilyLowering("core.type-term", (type, context) => {
      if (!type.term) throw new ProofScriptError("PS4701", "Malformed type-valued term in Semantic IR v6.");
      return context.emitExpr(type.term);
    });

    registry.registerLeanTypeFamilyLowering("core.pi", (type, context) => {
      if (!type.domain || !type.codomain || !type.binder) throw new ProofScriptError("PS4702", "Malformed Pi type in Semantic IR v6.");
      const domain = context.emitType(type.domain);
      const codomain = context.emitType(type.codomain);
      if (type.binder.name === "_" && type.binder.binderInfo === "explicit") return `(${domain} → ${codomain})`;
      switch (type.binder.binderInfo) {
        case "explicit": return `((${type.binder.name} : ${domain}) → ${codomain})`;
        case "implicit": return `({${type.binder.name} : ${domain}} → ${codomain})`;
        case "strictImplicit": return `(⦃${type.binder.name} : ${domain}⦄ → ${codomain})`;
        case "instance": return `([${type.binder.name} : ${domain}] → ${codomain})`;
      }
    });
  },
};

export default plugin;
