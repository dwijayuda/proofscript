import {ParseError,UnsupportedFeature,SurfaceBinder,SurfaceTerm,Token} from "@proofscript/syntax";

/**
 * Parser/lowering support for the v0.6.1 E-WHERE-BODY surface form.
 *
 * The admitted PSC-1 slice is intentionally non-recursive: a where helper may
 * reference earlier helpers, but not itself or later helpers. The parser lowers
 * the local where region to ordinary nested SurfaceTerm let/lambda nodes so the
 * existing elaborator/kernel/backend path remains unchanged.
 */
export interface WhereBodyParserHost{
  at(text:string):boolean;
  atId(text:string):boolean;
  next():Token;
  expect(text:string):Token;
  expectId(text:string):Token;
  expectKind(kind:Token["kind"],what:string):Token;
  canStartValueBinder():boolean;
  parseValueBinderGroup():SurfaceBinder[];
  parseTerm():SurfaceTerm;
}

interface WhereHelper{name:string;type:SurfaceTerm;value:SurfaceTerm;}

export function parseWhereBodyFromHost(host:WhereBodyParserHost,body:SurfaceTerm):SurfaceTerm{
  host.expectId("where");
  host.expect("{");
  const helpers:WhereHelper[]=[];
  const helperNames=new Set<string>();
  while(!host.at("}")){
    if(host.atId("def")||host.atId("function"))host.next();
    const name=host.expectKind("id","where helper name").text;
    if(helperNames.has(name))throw new ParseError(`duplicate where helper '${name}'`);
    const binders:SurfaceBinder[]=[];
    while(host.canStartValueBinder())binders.push(...host.parseValueBinderGroup());
    if(!host.at(":"))throw new UnsupportedFeature("PSC-1 v0.6.1 where helpers require an explicit result type");
    host.expect(":");
    const resultType=host.parseTerm();
    host.expect(":=");
    const helperBody=host.parseTerm();
    if(host.atId("where"))throw new UnsupportedFeature("PSC-1 v0.6.1 where helpers do not yet support nested where bodies");
    host.expect(";");
    const type=buildFunctionType(binders,resultType);
    const value:SurfaceTerm=binders.length===0?helperBody:{tag:"lam",binders,body:helperBody};
    helpers.push({name,type,value});
    helperNames.add(name);
  }
  host.expect("}");
  if(host.at(";"))host.next();
  if(helpers.length===0)throw new ParseError("PSC-1 v0.6.1 where body requires at least one local helper declaration");
  rejectRecursiveWhereHelpers(helpers);
  let out=body;
  for(let i=helpers.length-1;i>=0;i--){
    const h=helpers[i];
    out={tag:"let",name:h.name,type:h.type,value:h.value,body:out,nondep:false};
  }
  return out;
}

function buildFunctionType(binders:SurfaceBinder[],resultType:SurfaceTerm):SurfaceTerm{
  let out=resultType;
  for(let i=binders.length-1;i>=0;i--)out={tag:"pi",binder:binders[i],body:out};
  return out;
}

function rejectRecursiveWhereHelpers(helpers:WhereHelper[]):void{
  const laterOrSelf=new Set(helpers.map(h=>h.name));
  for(const helper of helpers){
    const refs=new Set<string>();
    collectNameRefs(helper.value,refs,new Set(helper.value.tag==="lam"?helper.value.binders.map(b=>b.name):[]));
    for(const name of refs){
      if(laterOrSelf.has(name))throw new UnsupportedFeature(`PSC-1 v0.6.1 where helper '${helper.name}' may not reference where helper '${name}' yet; local recursive/mutual where helpers are deferred`);
    }
    laterOrSelf.delete(helper.name);
  }
}

function collectNameRefs(term:SurfaceTerm,out:Set<string>,bound:Set<string>):void{
  switch(term.tag){
    case "name":
      if(!bound.has(term.name))out.add(term.name);
      break;
    case "sort":case "natLit":case "intLit":case "stringLit":case "boolLit":case "rflProof":case "assumptionProof":
      break;
    case "arrayLit":
      for(const item of term.items)collectNameRefs(item,out,bound);
      break;
    case "do":{
      const scoped=new Set(bound);
      for(const b of term.binds){collectNameRefs(b.value,out,scoped);scoped.add(b.name);}
      collectNameRefs(term.body,out,scoped);
      break;
    }
    case "bif":
      collectNameRefs(term.condition,out,bound);collectNameRefs(term.thenBranch,out,bound);collectNameRefs(term.elseBranch,out,bound);
      break;
    case "exactProof":
      collectNameRefs(term.term,out,bound);
      break;
    case "applyProof":
      collectNameRefs(term.term,out,bound);if(term.body)collectNameRefs(term.body,out,bound);
      break;
    case "introProof":{
      const scoped=new Set(bound);for(const name of term.names)scoped.add(name);collectNameRefs(term.body,out,scoped);
      break;
    }
    case "eq":
      collectNameRefs(term.left,out,bound);collectNameRefs(term.right,out,bound);
      break;
    case "binaryOp":
      collectNameRefs(term.left,out,bound);collectNameRefs(term.right,out,bound);
      break;
    case "app":
      collectNameRefs(term.fn,out,bound);for(const arg of term.args)collectNameRefs(arg,out,bound);
      break;
    case "lam":{
      const scoped=new Set(bound);
      for(const binder of term.binders){collectNameRefs(binder.type,out,scoped);scoped.add(binder.name);}
      collectNameRefs(term.body,out,scoped);
      break;
    }
    case "pi":{
      collectNameRefs(term.binder.type,out,bound);const scoped=new Set(bound);scoped.add(term.binder.name);collectNameRefs(term.body,out,scoped);
      break;
    }
    case "let":{
      collectNameRefs(term.value,out,bound);if(term.type)collectNameRefs(term.type,out,bound);const scoped=new Set(bound);scoped.add(term.name);collectNameRefs(term.body,out,scoped);
      break;
    }
    case "match":
      collectNameRefs(term.scrutinee,out,bound);
      for(const c of term.cases){const scoped=new Set(bound);if(c.pattern.tag==="ctor")for(const b of c.pattern.binders)scoped.add(b);collectNameRefs(c.body,out,scoped);}
      break;
    case "structInst":
      for(const f of term.fields)collectNameRefs(f.value,out,bound);
      break;
    case "structUpdate":
      collectNameRefs(term.base,out,bound);for(const f of term.fields)collectNameRefs(f.value,out,bound);
      break;
  }
}
