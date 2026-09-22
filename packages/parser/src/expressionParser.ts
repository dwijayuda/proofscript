import {ParseError,UnsupportedFeature,Token,SurfaceTerm} from "@proofscript/syntax";
import {makeApp,makeBoolAnd,makeBoolNot,makeBoolOr,makeBinaryOp} from "./sugar";

/**
 * Narrow host used by the expression-precedence parser.
 *
 * The host keeps namespace-aware atoms and special forms in the main Parser,
 * while this module owns the expression precedence chain and application sugar.
 */
export interface ExpressionParserHost{
  at(text:string):boolean;
  atId(text:string):boolean;
  peek(ahead?:number):Token;
  next():Token;
  expect(text:string):Token;
  tokens():readonly Token[];
  cursorIndex():number;
  parseSpecialTerm():SurfaceTerm|undefined;
  parseAtom():SurfaceTerm;
}

export function parseTermFromHost(host:ExpressionParserHost):SurfaceTerm{
  if(looksLikeArrowOnlyLambda(host.tokens(),host.cursorIndex()))throw new ParseError("ProofScript rejects arrow-only lambda syntax; use Lean-compatible `fun (x: T) => body`");
  const special=host.parseSpecialTerm();
  if(special)return special;
  return parseArrow(host);
}

export function looksLikeArrowOnlyLambda(tokens:readonly Token[],cursorIndex:number):boolean{
  if(tokens[cursorIndex]?.text!=="(")return false;
  let j=cursorIndex+1;let sawBinder=false;
  while(tokens[j]?.kind==="id"){
    j++;
    if(tokens[j]?.text!==":")return false;
    j++;
    let depth=0;
    while(j<tokens.length){
      const text=tokens[j]?.text;
      if(text==="("||text==="{"||text==="[")depth++;
      else if(text===")"||text==="}"||text==="]"){
        if(depth===0)break;
        depth--;
      }else if(text===","&&depth===0)break;
      j++;
    }
    sawBinder=true;
    if(tokens[j]?.text===","){
      j++;
      continue;
    }
    break;
  }
  return sawBinder&&tokens[j]?.text===")"&&tokens[j+1]?.text==="=>";
}

function parseArrow(host:ExpressionParserHost):SurfaceTerm{
  const left=parseEquality(host);
  if(host.at("→")||host.at("->")){
    host.next();
    return{tag:"pi",binder:{name:"_",type:left},body:parseTermFromHost(host)};
  }
  return left;
}

function parseEquality(host:ExpressionParserHost):SurfaceTerm{
  const left=parseBoolOr(host);
  if(host.at("=")){
    host.next();
    const right=parseBoolOr(host);
    if(host.at("="))throw new ParseError("chained propositional equality requires parentheses in K3c-section-vars0");
    return{tag:"eq",left,right};
  }
  if(host.at("==")){
    host.next();
    const right=parseBoolOr(host);
    if(host.at("==")||host.at("<")||host.at("<=")||host.at(">")||host.at(">="))throw new ParseError("chained Nat comparison requires parentheses in PSC-1");
    return makeBinaryOp("beq",left,right);
  }
  if(host.at("≠")||host.at("!="))throw new UnsupportedFeature("K3c-section-vars0 does not yet implement propositional/Boolean inequality terms");
  return left;
}

function parseBoolOr(host:ExpressionParserHost):SurfaceTerm{
  let term=parseBoolAnd(host);
  while(host.at("||")){
    host.next();
    const rhs=parseBoolAnd(host);
    term=makeBoolOr(term,rhs);
  }
  return term;
}

function parseBoolAnd(host:ExpressionParserHost):SurfaceTerm{
  let term=parseNatComparison(host);
  while(host.at("&&")){
    host.next();
    const rhs=parseNatComparison(host);
    term=makeBoolAnd(term,rhs);
  }
  return term;
}

function parseNatComparison(host:ExpressionParserHost):SurfaceTerm{
  const left=parseNatAddition(host);
  if(host.at("<")||host.at("<=")||host.at(">")||host.at(">=")){
    const op=host.next().text;
    const right=parseNatAddition(host);
    if(host.at("<")||host.at("<=")||host.at(">")||host.at(">=")||host.at("=="))throw new ParseError("chained Nat comparison requires parentheses in PSC-1");
    if(op==="<")return makeBinaryOp("lt",left,right);
    if(op==="<=")return makeBinaryOp("le",left,right);
    if(op===">")return makeBinaryOp("gt",left,right);
    return makeBinaryOp("ge",left,right);
  }
  return left;
}

function parseNatAddition(host:ExpressionParserHost):SurfaceTerm{
  let term=parseNatMultiplication(host);
  while(host.at("+")||host.at("-")){
    const op=host.next().text;
    const rhs=parseNatMultiplication(host);
    term=op==="+"?makeBinaryOp("add",term,rhs):makeBinaryOp("sub",term,rhs);
  }
  return term;
}

function parseNatMultiplication(host:ExpressionParserHost):SurfaceTerm{
  let term=parseUnary(host);
  while(host.at("*")){
    host.next();
    const rhs=parseUnary(host);
    term=makeBinaryOp("mul",term,rhs);
  }
  return term;
}

function parseUnary(host:ExpressionParserHost):SurfaceTerm{
  if(host.at("-")&&host.peek(1).kind==="num"){
    host.next();
    const t=host.next();
    const value=Number(t.text);
    if(!Number.isSafeInteger(value))throw new UnsupportedFeature("K3c-section-vars0 integer literal exceeds the safe parser integer range");
    return{tag:"intLit",value:-value};
  }
  if(host.at("!")){
    const token=host.next();
    const next=host.peek();
    if(next.kind==="eof"||["}",")",",",";","then","else","in","with"].includes(next.text))throw new ParseError(`prefix ! expects a following expression at offset ${token.offset}`);
    return makeBoolNot(parseUnary(host));
  }
  return parsePostfix(host);
}

function parsePostfix(host:ExpressionParserHost):SurfaceTerm{
  let term=parseCallPostfix(host);
  while(canStartJuxtaposedArgument(host)){
    const arg=parseCallPostfix(host);
    term=makeApp(term,[arg]);
  }
  return term;
}

function parseCallPostfix(host:ExpressionParserHost):SurfaceTerm{
  let explicit=false;
  if(host.at("@")){
    host.next();
    explicit=true;
  }
  let term=host.parseAtom();
  let applied=false;
  while(host.at("(")){
    host.next();
    if(host.at(")"))throw new ParseError("ProofScript v0.1 rejects empty source calls f()");
    const args:SurfaceTerm[]=[];
    while(true){
      if(host.peek().kind==="id"&&host.peek(1).text===":=")throw new UnsupportedFeature("K3c-section-vars0 does not implement named arguments yet");
      args.push(parseTermFromHost(host));
      if(!host.at(","))break;
      host.next();
      if(host.at(")"))break;
    }
    host.expect(")");
    term=makeApp(term,args,explicit);
    explicit=false;
    applied=true;
  }
  if(explicit&&!applied)throw new UnsupportedFeature("K3c-section-vars0 explicit application '@' currently requires a following argument list");
  return term;
}

export function canStartJuxtaposedArgument(host:Pick<ExpressionParserHost,"peek">):boolean{
  const t=host.peek();
  if(t.kind==="num"||t.kind==="str")return true;
  if(t.kind==="id"){
    if(["then","else","in","with","where","by","rfl","exact","assumption","apply","intro"].includes(t.text))return false;
    return true;
  }
  return t.text==="("||t.text==="@";
}
