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
    while(
      host.peek().kind==="id"
      &&!host.atId("exact")
      &&!host.atId("rfl")
      &&!host.atId("assumption")
      &&!host.atId("apply")
      &&!host.atId("show")
      &&!host.atId("have")
      &&!host.atId("rw")
      &&!host.atId("subst")
      &&!host.atId("constructor")
      &&!host.atId("cases")
      &&!host.atId("induction")
      &&!host.atId("simp")
    )names.push(host.next().text);
    if(names.length===0)throw new ParseError("PSC-1 intro requires at least one introduced name");
    host.expect(";");
    return{tag:"introProof",names,body:parseProofStep(host)};
  }
  if(host.atId("show")){
    host.next();
    const type=host.parseTerm();
    host.expect(";");
    return{tag:"showProof",type,body:parseProofStep(host)};
  }
  if(host.atId("have")){
    host.next();
    const nameToken=host.next();
    if(nameToken.kind!=="id")throw new ParseError("PSC-1 have requires a local hypothesis name");
    let type:SurfaceTerm|undefined;
    if(host.at(":")){
      host.next();
      type=host.parseTerm();
    }
    host.expect(":=");
    const value=host.atId("by")?parseProofTerm(host):host.parseTerm();
    host.expect(";");
    return{tag:"haveProof",name:nameToken.text,type,value,body:parseProofStep(host)};
  }
  if(host.atId("rw")){
    host.next();
    let reverse=false;
    if(host.at("←")||host.at("<-")){
      host.next();
      reverse=true;
    }
    const equality=host.parseTerm();
    host.expect(";");
    return{tag:"rwProof",equality,reverse,body:parseProofStep(host)};
  }
  if(host.atId("subst")){
    host.next();
    const nameToken=host.next();
    if(nameToken.kind!=="id")throw new ParseError("PSC-1 subst requires a local variable name");
    host.expect(";");
    return{tag:"substProof",name:nameToken.text,body:parseProofStep(host)};
  }
  if(host.atId("constructor")){
    host.next();
    if(host.at(";")){
      host.next();
      return{tag:"constructorProof",body:parseProofStep(host)};
    }
    return{tag:"constructorProof"};
  }
  if(host.atId("cases")){
    host.next();
    const term=host.parseTerm();
    host.expect(";");
    return{tag:"casesProof",term,body:parseProofStep(host)};
  }
  if(host.atId("induction")){
    host.next();
    const term=host.parseTerm();
    host.expect(";");
    return{tag:"inductionProof",term,body:parseProofStep(host)};
  }
  if(host.atId("simp")){
    host.next();
    return{tag:"simpProof"};
  }
  throw new UnsupportedFeature("PSC-1 standalone proof block supports bounded `rfl`, `exact`, `assumption`, `apply`, `intro`, `show`, `have`, `rw`, `subst`, `constructor`, `cases`, `induction`, and `simp`");
}
