import {ParseError,UnsupportedFeature,SurfacePattern,Token} from "@proofscript/syntax";

export interface PatternParserHost{
  at(text:string):boolean;
  peek(ahead?:number):Token;
  next():Token;
  expectKind(kind:Token["kind"],what:string):Token;
  currentNamespace():string[];
  currentOpenNamespaces():string[];
}

export function isReservedPatternBoundary(text:string):boolean{return text==="=>"||text==="|"||text===","||text==="}"||text==="<eof>";}

export function parsePatternFromHost(host:PatternParserHost,where:"match"|"equation"):SurfacePattern{
  const t=host.peek();
  if(t.kind==="num"){
    host.next();
    const value=Number(t.text);
    if(!Number.isSafeInteger(value)||value<0)throw new UnsupportedFeature(`K3c-section-vars0 numeric ${where} pattern exceeds the supported Nat literal range`);
    return value===0?{tag:"natZero"}:{tag:"natLit",value};
  }
  if(t.kind==="id"&&t.text==="_"){
    host.next();
    return{tag:"wildcard"};
  }

  let ctor:string;
  if(host.at(".")){
    host.next();
    ctor=`.${host.expectKind("id","constructor pattern").text}`;
  }else{
    ctor=host.expectKind("id","constructor pattern").text;
  }

  const binders:string[]=[];
  const pushPatternBinder=(b:string)=>{
    if(binders.includes(b))throw new ParseError(`duplicate pattern binder '${b}'`);
    binders.push(b);
  };

  if(host.at("(")){
    if(where==="match")throw new UnsupportedFeature("PSC-1 v0.6.1 match patterns remain Lean-spaced; constructor-call pattern sugar such as .some(x) is not admitted");
    host.next();
    if(!host.at(")")){
      while(true){
        pushPatternBinder(host.expectKind("id","pattern binder").text);
        if(!host.at(","))break;
        host.next();
      }
    }
    const close=host.peek();
    if(close.text!==")")throw new ParseError(`expected ')' at offset ${close.offset}, found '${close.text}'`);
    host.next();
  }else{
    while(host.peek().kind==="id"&&host.peek().text!=="_"&&!isReservedPatternBoundary(host.peek().text)){
      pushPatternBinder(host.next().text);
    }
  }

  return{tag:"ctor",ctor,binders,namespacePath:host.currentNamespace(),openNamespaces:host.currentOpenNamespaces()};
}
