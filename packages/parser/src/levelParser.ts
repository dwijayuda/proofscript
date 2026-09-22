import {ParseError,SurfaceLevel,Token} from "@proofscript/syntax";

/**
 * Narrow host for universe-level parsing.
 *
 * Level parsing is intentionally independent from terms, binders,
 * declarations, and namespace state. The host only exposes tokens and the
 * currently declared universe parameters.
 */
export interface LevelParserHost{
  at(text:string):boolean;
  peek(ahead?:number):Token;
  next():Token;
  expectKind(kind:Token["kind"],what:string):Token;
  universeParams():readonly string[];
}

export function canStartOptionalTypeLevel(host:LevelParserHost):boolean{
  const t=host.peek();
  return t.text==="("||t.kind==="num"||(t.kind==="id"&&(host.universeParams().includes(t.text)||t.text==="max"||t.text==="imax"));
}

export function parseLevel(host:LevelParserHost):SurfaceLevel{
  let out:SurfaceLevel;
  const t=host.peek();
  if(t.text==="("){
    host.next();
    out=parseLevel(host);
    if(!host.at(")"))throw new ParseError(`expected ')' after universe level at offset ${host.peek().offset}, found '${host.peek().text}'`);
    host.next();
  }else if(t.kind==="num"){
    host.next();
    out=levelOfNat(Number(t.text));
  }else if(t.kind==="id"&&t.text==="max"){
    host.next();
    out={tag:"max",left:parseLevel(host),right:parseLevel(host)};
  }else if(t.kind==="id"&&t.text==="imax"){
    host.next();
    out={tag:"imax",left:parseLevel(host),right:parseLevel(host)};
  }else if(t.kind==="id"&&host.universeParams().includes(t.text)){
    host.next();
    out={tag:"param",name:t.text};
  }else{
    throw new ParseError(`expected universe level at offset ${t.offset}, found '${t.text}'`);
  }
  while(host.at("+")){
    host.next();
    const n=host.expectKind("num","universe successor offset");
    for(let i=0;i<Number(n.text);i++)out={tag:"succ",of:out};
  }
  return out;
}

function levelOfNat(n:number):SurfaceLevel{
  let out:SurfaceLevel={tag:"zero"};
  for(let i=0;i<n;i++)out={tag:"succ",of:out};
  return out;
}
