import { ProofScriptError } from "../../core/errors.js";
import type { PluginManifest, ProofScriptPlugin } from "../../core/plugin-api.js";
import type { IRType, SurfaceExpr } from "../../core/model.js";
import { expectTypeArgument, nominalType, typeArgument, sameType } from "../../core/type-utils.js";
import { familyMatchableKey, type MatchableDescriptor } from "./matchable.js";
import type { PatternMatchSyntaxMetadata } from "./pattern-engine.js";

interface ConsPayload { readonly head: SurfaceExpr; readonly tail: SurfaceExpr; }

function listOf(inner: IRType): IRType {
  return nominalType(`core.list(${inner.id})`, `List(${inner.displayName})`, "core.list", [typeArgument(inner)]);
}
function listInner(type: IRType): IRType | undefined {
  const argument=type.args?.[0]; return argument?.kind === "type" ? argument.value : undefined;
}

export const proofscriptManifest: PluginManifest = {
  schema:"proofscript.plugin/v1", id:"proofscript.feature.list", version:"0.91.0", kind:"feature",
  semanticIds:["core.list.nil","core.list.cons","core.list.match"],
  lean:{assumptionPolicy:"none"},
};

const plugin: ProofScriptPlugin = {
  id:proofscriptManifest.id, version:proofscriptManifest.version, kind:"feature",
  setup(registry) {
    registry.registerTypeFamily("List", {
      params:[{kind:"type"}],
      resolve(args) {
        if(args.length!==1) throw new ProofScriptError("PS2L01",`List expects one type argument, got ${args.length}.`);
        return listOf(expectTypeArgument(args[0]!,"List"));
      },
    });
    registry.registerSemanticInfo(familyMatchableKey("core.list"), {
      matchOperation:"core.list.match",
      variantsFor(type) {
        const inner=listInner(type); if(!inner) throw new ProofScriptError("PS2L04","Malformed List type for matching.");
        return [{name:"nil",fields:[]},{name:"cons",fields:[inner,type]}];
      },
    } satisfies MatchableDescriptor);

    registry.registerExpressionSyntax({ keyword:".nil", owner:"core.list.nil.syntax", parse(){ return {kind:"extension",owner:"core.list.nil.syntax",payload:{}}; } });
    registry.registerExpressionSyntax({ keyword:".cons", owner:"core.list.cons.syntax", parse(cursor){ cursor.expect("("); const head=cursor.parseExpression(); cursor.expect(","); const tail=cursor.parseExpression(); cursor.expect(")"); return {kind:"extension",owner:"core.list.cons.syntax",payload:{head,tail} satisfies ConsPayload}; } });

    registry.registerExpressionElaborator({
      owner:"core.list.nil.syntax",
      elaborate(_expr,expected) {
        if(!expected || expected.family!=="core.list" || !listInner(expected)) throw new ProofScriptError("PS2L02",".nil requires an expected List(A) type.");
        return {kind:"extension",op:"core.list.nil",args:[],payload:{},type:expected};
      },
    });
    registry.registerExpressionElaborator({
      owner:"core.list.cons.syntax",
      elaborate(expr,expected,context) {
        if(expr.kind!=="extension") throw new ProofScriptError("PS2L98","List cons elaborator received non-extension syntax.");
        const payload=expr.payload as ConsPayload;
        const expectedInner=expected?.family==="core.list"?listInner(expected):undefined;
        const head=context.elaborateExpression(payload.head,expectedInner);
        const inferredList=listOf(head.type);
        const listType=expected ?? inferredList;
        if(listType.family!=="core.list" || !sameType(listType,inferredList)) throw new ProofScriptError("PS2L03",`.cons head inferred '${inferredList.displayName}', expected '${listType.displayName}'.`);
        const tail=context.elaborateExpression(payload.tail,listType);
        if(!sameType(tail.type,listType)) throw new ProofScriptError("PS2L05",`.cons tail has '${tail.type.displayName}', expected '${listType.displayName}'.`);
        return {kind:"extension",op:"core.list.cons",args:[head,tail],payload:{},type:listType};
      },
    });

    for(const [id,cap] of [["core.list.nil","core.list"],["core.list.cons","core.list"],["core.list.match","core.list.match"]] as const) registry.registerOperation(id,{requiredCapabilities:[cap],verification:{level:"kernel-checkable",notes:`Mapped to Lean ${id}.`}});
    registry.registerLeanTypeFamilyLowering("core.list",(type,context)=>{const inner=listInner(type);if(!inner)throw new ProofScriptError("PS4L01","Malformed List IR type.");return `(List ${context.emitType(inner)})`;});
    registry.registerLeanExprLowering("core.list.nil",()=>"List.nil");
    registry.registerLeanExprLowering("core.list.cons",(expr,context)=>{if(expr.kind!=="extension"||expr.args.length!==2)throw new ProofScriptError("PS4L02","Malformed List.cons IR node.");return `(List.cons ${context.emitExpr(expr.args[0]!)} ${context.emitExpr(expr.args[1]!)})`;});
    registry.registerLeanExprLowering("core.list.match",(expr,context)=>{
      if(expr.kind!=="extension")throw new ProofScriptError("PS4L03","Expected List match extension IR node.");
      const payload=expr.payload as {cases:readonly {variant:string;binders:readonly string[]}[];matchSyntax?:PatternMatchSyntaxMetadata};
      const [scrutinee,...bodies]=expr.args;
      const branches=payload.cases.map((item,index)=>`| ${item.variant}${item.binders.length?` ${item.binders.join(" ")}`:""} => ${context.emitExpr(bodies[index]!)}`);
      return `(match ${context.emitExpr(scrutinee!)} with ${branches.join(" ")})`;
    });
  },
};
export default plugin;
