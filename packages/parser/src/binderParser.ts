import {ParseError,UnsupportedFeature,SurfaceBinder,SurfaceTerm,Token} from "@proofscript/syntax";

/**
 * Narrow host for PSC-1 binder parsing.
 *
 * Binder parsing needs token navigation, ordinary term parsing for binder
 * types, and read-only command/cursor indices for generated anonymous
 * instance binder names. It deliberately does not know about declarations,
 * namespaces, sections, or kernel elaboration.
 */
export interface BinderParserHost{
  at(text:string):boolean;
  peek(ahead?:number):Token;
  next():Token;
  expect(text:string):Token;
  expectKind(kind:Token["kind"],what:string):Token;
  parseTerm():SurfaceTerm;
  commandIndex():number;
  cursorIndex():number;
}

export function canStartValueBinder(host:BinderParserHost):boolean{
  return host.at("(")||host.at("{")||host.at("⦃")||host.at("[");
}

export function parseExplicitBinderGroup(host:BinderParserHost):SurfaceBinder[]{
  return parseDelimitedBinderGroup(host,"(",")","explicit");
}

export function parseValueBinderGroup(host:BinderParserHost):SurfaceBinder[]{
  if(host.at("("))return parseDelimitedBinderGroup(host,"(",")","explicit");
  if(host.at("{"))return parseDelimitedBinderGroup(host,"{","}","implicit");
  if(host.at("⦃"))return parseDelimitedBinderGroup(host,"⦃","⦄","strictImplicit");
  host.expect("[");
  if(host.at("]"))throw new ParseError("empty instance binder is not valid");
  if(host.peek().kind==="id"&&host.peek(1).text===":"){
    const name=host.next().text;
    host.expect(":");
    const type=host.parseTerm();
    host.expect("]");
    return[{name,type,binderInfo:"instImplicit"}];
  }
  const type=host.parseTerm();
  host.expect("]");
  return[{name:`_inst${host.commandIndex()}_${host.cursorIndex()}`,type,binderInfo:"instImplicit"}];
}

export function parseDelimitedBinderGroup(host:BinderParserHost,open:string,close:string,binderInfo:"explicit"|"implicit"|"strictImplicit"):SurfaceBinder[]{
  host.expect(open);
  if(host.at(close))throw new ParseError("empty binder group is not valid");
  const out:SurfaceBinder[]=[];
  while(true){
    const name=host.expectKind("id","binder name").text;
    if(!host.at(":"))throw new UnsupportedFeature("K3c-section-vars0 currently requires typed binder entries");
    host.expect(":");
    const type=host.parseTerm();
    if(host.at(":="))throw new UnsupportedFeature("K3c-section-vars0 does not yet implement optional/default binders");
    out.push({name,type,binderInfo});
    if(!host.at(","))break;
    host.next();
    if(host.at(close))break;
  }
  host.expect(close);
  return out;
}
