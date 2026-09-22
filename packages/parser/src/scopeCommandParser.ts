import {ParseError,UnsupportedFeature,Token,SurfaceDeclaration} from "@proofscript/syntax";
import type {ParserState} from "./index";

const DOTTED_IDENTIFIER=/^[A-Za-z_][A-Za-z0-9_']*(?:\.[A-Za-z_][A-Za-z0-9_']*)*$/;

export interface ScopeCommandHost<SectionSnapshot>{
  at(text:string):boolean;
  atId(text:string):boolean;
  peek(ahead?:number):Token;
  next():Token;
  expect(text:string):Token;
  expectId(text:string):Token;
  expectKind(kind:Token["kind"],what:string):Token;
  parseNonImportCommand(declarations:SurfaceDeclaration[]):void;
  cloneSectionVariables():SectionSnapshot;
  restoreSectionVariables(snapshot:SectionSnapshot):void;
  namespaceStack():string[];
  setNamespaceStack(stack:string[]):void;
  openedNamespaces():string[];
  setOpenedNamespaces(names:string[]):void;
  state():ParserState;
  setState(state:ParserState):void;
  hasKnownNamespace(name:string):boolean;
  addKnownNamespace(name:string):void;
  validateOpenNamespaces():boolean;
}

export function parseImportCommand(host:ScopeCommandHost<unknown>):string{
  host.expectId("import");
  if(host.atId("all"))throw new UnsupportedFeature("K3c-section-vars0 does not implement 'import all'");
  const token=host.expectKind("id","module name");
  const name=token.text;
  if(!DOTTED_IDENTIFIER.test(name))throw new ParseError(`invalid module name '${name}' at offset ${token.offset}`);
  host.expect(";");
  return name;
}

export function parseUniverseCommand(host:ScopeCommandHost<unknown>):void{
  host.next();
  const names:string[]=[];
  const state=host.state();
  while(true){
    const n=host.expectKind("id","universe parameter").text;
    if(names.includes(n)||state.universeParams.includes(n))throw new ParseError(`duplicate universe parameter '${n}'`);
    names.push(n);
    if(!host.at(","))break;
    host.next();
  }
  host.expect(";");
  host.setState({...state,universeParams:[...state.universeParams,...names]});
}

export function parseNamespaceCommand<SectionSnapshot>(host:ScopeCommandHost<SectionSnapshot>,declarations:SurfaceDeclaration[]):void{
  host.expectId("namespace");
  const token=host.expectKind("id","namespace name");
  if(!DOTTED_IDENTIFIER.test(token.text))throw new ParseError(`invalid namespace name '${token.text}' at offset ${token.offset}`);
  host.expect("{");
  const previousNamespace=host.namespaceStack();
  const previousUniverses=[...host.state().universeParams];
  const previousOpens=host.openedNamespaces();
  const previousSectionVariables=host.cloneSectionVariables();
  const nextNamespace=[...previousNamespace,...token.text.split(".")];
  host.setNamespaceStack(nextNamespace);
  host.addKnownNamespace(nextNamespace.join("."));
  while(!host.at("}")){
    if(host.at("<eof>"))throw new ParseError(`unterminated namespace '${token.text}'`);
    host.parseNonImportCommand(declarations);
  }
  host.expect("}");
  if(host.at(";"))host.next();
  host.setNamespaceStack(previousNamespace);
  host.setOpenedNamespaces(previousOpens);
  host.restoreSectionVariables(previousSectionVariables);
  host.setState({...host.state(),universeParams:previousUniverses});
}

export function parseSectionCommand<SectionSnapshot>(host:ScopeCommandHost<SectionSnapshot>,declarations:SurfaceDeclaration[]):void{
  host.expectId("section");
  let label:string|undefined;
  if(host.peek().kind==="id")label=host.next().text;
  host.expect("{");
  const previousUniverses=[...host.state().universeParams];
  const previousOpens=host.openedNamespaces();
  const previousSectionVariables=host.cloneSectionVariables();
  while(!host.at("}")){
    if(host.at("<eof>"))throw new ParseError(`unterminated section${label?` '${label}'`:""}`);
    host.parseNonImportCommand(declarations);
  }
  host.expect("}");
  if(host.at(";"))host.next();
  host.setOpenedNamespaces(previousOpens);
  host.restoreSectionVariables(previousSectionVariables);
  host.setState({...host.state(),universeParams:previousUniverses});
}

export function parseOpenCommand(host:ScopeCommandHost<unknown>):void{
  host.expectId("open");
  if(host.atId("scoped"))throw new UnsupportedFeature("K3c-section-vars0 does not yet implement 'open scoped'");
  let count=0;
  while(!host.at(";")){
    if(host.at("(")||host.atId("hiding")||host.atId("renaming")||host.atId("in"))throw new UnsupportedFeature("K3c-section-vars0 currently implements only ordinary namespace 'open A B;' without selective/hiding/renaming/in forms");
    const token=host.expectKind("id","namespace name after open");
    const resolved=resolveNamespaceAtCommand(host,token.text);
    const opened=host.openedNamespaces();
    if(!opened.includes(resolved))host.setOpenedNamespaces([...opened,resolved]);
    count++;
  }
  if(count===0)throw new ParseError("open requires at least one namespace");
  host.expect(";");
}

export function resolveNamespaceAtCommand(host:ScopeCommandHost<unknown>,name:string):string{
  const raw=name.startsWith("_root_.")?name.slice("_root_.".length):name;
  if(name.startsWith("_root_.")){
    if(host.validateOpenNamespaces()&&!host.hasKnownNamespace(raw))throw new ParseError(`unknown namespace '${name}'`);
    return raw;
  }
  const candidates:string[]=[];
  const namespaceStack=host.namespaceStack();
  for(let i=namespaceStack.length;i>=0;i--){
    const prefix=namespaceStack.slice(0,i).join(".");
    candidates.push(prefix?`${prefix}.${raw}`:raw);
  }
  const found=candidates.find(c=>host.hasKnownNamespace(c));
  if(found)return found;
  if(host.validateOpenNamespaces())throw new ParseError(`unknown namespace '${name}'`);
  return candidates[0];
}
