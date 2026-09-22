import {ParseError,UnsupportedFeature,SurfaceStructInstField,SurfaceTerm,Token} from "@proofscript/syntax";

export interface StructureTermParserHost{
  at(text:string):boolean;
  atId(text:string):boolean;
  peek(ahead?:number):Token;
  next():Token;
  expect(text:string):Token;
  expectId(text:string):Token;
  expectKind(kind:Token["kind"],what:string):Token;
  parseTerm():SurfaceTerm;
  currentNamespace():string[];
  currentOpenNamespaces():string[];
}

function punnedFieldValue(host:StructureTermParserHost,name:string):SurfaceTerm{
  return{tag:"name",name,namespacePath:host.currentNamespace(),openNamespaces:host.currentOpenNamespaces()};
}

export function parseStructureInstanceFromHost(host:StructureTermParserHost):SurfaceTerm{
  host.expect("{");
  if(host.at("}"))throw new UnsupportedFeature("K3c-section-vars0 does not yet implement empty structure instances");

  // PSC-1 structure update accepts the original simple identifier base and
  // a bounded parenthesized checked base expression. The parenthesized form
  // avoids making `with` a general term-level stop token while still allowing
  // updates of checked projections such as `{(box.p) with x := 7}`.
  if(host.peek().kind==="id"&&host.peek(1).kind==="id"&&host.peek(1).text==="with"){
    const baseName=host.next().text;
    host.expectId("with");
    const fields=parseStructureUpdateFieldsFromHost(host);
    return{tag:"structUpdate",base:{tag:"name",name:baseName,namespacePath:host.currentNamespace(),openNamespaces:host.currentOpenNamespaces()},fields};
  }

  if(host.at("(")){
    host.next();
    const base=host.parseTerm();
    host.expect(")");
    if(!host.atId("with"))throw new UnsupportedFeature("PSC-1 parenthesized structure update base requires `with` after the closing parenthesis");
    host.expectId("with");
    const fields=parseStructureUpdateFieldsFromHost(host);
    return{tag:"structUpdate",base,fields};
  }

  const fields:SurfaceStructInstField[]=[];
  while(true){
    const name=host.expectKind("id","structure instance field").text;
    if(fields.some(f=>f.name===name))throw new ParseError(`duplicate structure instance field '${name}'`);
    if(host.at(":=")){
      host.next();
      fields.push({name,value:host.parseTerm()});
    }else{
      // PSC-1 Lean-style structure literal field punning: `{x, y}` is
      // frontend syntax for `{x := x, y := y}`. The punned value is still
      // resolved and type-checked normally by the elaborator.
      fields.push({name,value:punnedFieldValue(host,name)});
    }
    if(!host.at(","))break;
    host.next();
    if(host.at("}"))break;
  }
  host.expect("}");
  return{tag:"structInst",fields};
}

export function parseStructureUpdateFieldsFromHost(host:StructureTermParserHost):SurfaceStructInstField[]{
  const fields:SurfaceStructInstField[]=[];
  while(true){
    const name=host.expectKind("id","structure update field").text;
    if(fields.some(f=>f.name===name))throw new ParseError(`duplicate structure update field '${name}'`);
    if(host.at(":=")){
      host.next();
      fields.push({name,value:host.parseTerm()});
    }else{
      fields.push({name,value:punnedFieldValue(host,name)});
    }
    if(!host.at(","))break;
    host.next();
    if(host.at("}"))break;
  }
  host.expect("}");
  if(fields.length===0)throw new ParseError("structure update requires at least one updated field");
  return fields;
}
