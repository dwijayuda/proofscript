import {ParseError,UnsupportedFeature,SurfaceTerm,Token} from "@proofscript/syntax";

/**
 * Narrow interface required by PSC-1 proof parsing.
 *
 * The proof parser deliberately knows nothing about declaration parsing,
 * namespaces, sections, or command-level state. It only consumes tokens and
 * asks the host to parse ordinary terms where proof forms need one.
 */
export interface ProofParserHost{
  at(text:string):boolean;
  atId(text:string):boolean;
  next():Token;
  expect(text:string):Token;
  parseTerm():SurfaceTerm;
  peek():Token;
}

/** Parse a theorem/example proof term after `:=`. */
export function parseProofTerm(host:ProofParserHost):SurfaceTerm{
  if(!host.atId("by"))return host.parseTerm();
  host.next();
  if(!host.at("{"))return parseProofStep(host);
  host.expect("{");
  const proof=parseProofStep(host);
  if(host.at(";"))throw new ParseError("PSC-1 proof blocks do not use a trailing tactic semicolon in the current canonical slice");
  host.expect("}");
  return proof;
}

function parseProofStep(host:ProofParserHost):SurfaceTerm{
  if(host.atId("rfl")){
    host.next();
    return{tag:"rflProof"};
  }
  if(host.atId("exact")){
    host.next();
    if(host.atId("rfl")){
      host.next();
      return{tag:"rflProof"};
    }
    return{tag:"exactProof",term:host.parseTerm()};
  }
  if(host.atId("assumption")){
    host.next();
    return{tag:"assumptionProof"};
  }
  if(host.atId("apply")){
    host.next();
    const term=host.parseTerm();
    if(host.at(";")){
      host.next();
      return{tag:"applyProof",term,body:parseProofStep(host)};
    }
    return{tag:"applyProof",term};
  }
  if(host.atId("intro")){
    host.next();
    const names:string[]=[];
    while(host.peek().kind==="id"&&!host.atId("exact")&&!host.atId("rfl")&&!host.atId("assumption")&&!host.atId("apply"))names.push(host.next().text);
    if(names.length===0)throw new ParseError("PSC-1 intro requires at least one introduced name");
    host.expect(";");
    return{tag:"introProof",names,body:parseProofStep(host)};
  }
  throw new UnsupportedFeature("PSC-1 standalone proof block currently supports `by { rfl }`, `by { exact term }`, `by { assumption }`, `by { apply term; ... }`, and `by { intro x; ... }`");
}
