import { ProofScriptError } from "../../core/errors.js";
import type { ProofScriptPlugin } from "../../core/plugin-api.js";

const plugin: ProofScriptPlugin = {
  id:"proofscript.backend-feature.typescript-list", version:"0.91.0", kind:"backend-feature",
  requires:["proofscript.backend.typescript","proofscript.feature.list","proofscript.feature.match"],
  setup(registry) {
    registry.addTargetCapability("typescript","core.list");
    registry.addTargetCapability("typescript","core.list.match");
    registry.registerTargetTypeFamilyLowering("typescript","core.list",(type,context)=>{
      const inner=type.args?.[0]; if(!inner||inner.kind!=="type") throw new ProofScriptError("PS3L01","Malformed List IR type.");
      return `ReadonlyArray<${context.emitType(inner.value)}>`;
    });
    registry.registerTargetExprLowering("typescript","core.list.nil",()=>"([] as const)");
    registry.registerTargetExprLowering("typescript","core.list.cons",(expr,context)=>{
      if(expr.kind!=="extension"||expr.args.length!==2) throw new ProofScriptError("PS3L02","Malformed List.cons IR node.");
      return `([${context.emitExpr(expr.args[0]!)}, ...${context.emitExpr(expr.args[1]!)}] as const)`;
    });
    registry.registerTargetExprLowering("typescript","core.list.match",(expr,context)=>{
      if(expr.kind!=="extension") throw new ProofScriptError("PS3L03","Expected List.match extension IR node.");
      const payload=expr.payload as {cases:readonly {variant:string;binders:readonly string[]}[]};
      const [scrutinee,...bodies]=expr.args;
      const nilIndex=payload.cases.findIndex(x=>x.variant==="nil"), consIndex=payload.cases.findIndex(x=>x.variant==="cons");
      if(nilIndex<0||consIndex<0) throw new ProofScriptError("PS3L04","List match requires nil/cons cases.");
      const [head,tail]=payload.cases[consIndex]!.binders; if(!head||!tail) throw new ProofScriptError("PS3L05","List cons case requires head/tail binders.");
      return `((_psl) => _psl.length === 0 ? ${context.emitExpr(bodies[nilIndex]!)} : ((${head}, ${tail}) => ${context.emitExpr(bodies[consIndex]!) })(_psl[0]!, _psl.slice(1)))(${context.emitExpr(scrutinee!)})`;
    });
  },
};
export default plugin;
