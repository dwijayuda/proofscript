import type { SurfaceFeatureId } from "@proofscript/syntax";

/**
 * Canonical Lean text for the bounded v0.6.1 ProofScript-owned surface overlays.
 *
 * This module is production-side lowering only. Parsing/acceptance remains owned
 * by the production parser; callers must not use this function as a validator.
 */
export function lowerOwnedSourceToCanonicalLean(source:string,feature:SurfaceFeatureId):string{
  const text=source.trim();
  switch(feature){
    case "D-CONST-ALIAS":return lowerValueDeclaration(text,"const");
    case "D-FUNCTION-ALIAS":return lowerValueDeclaration(text,"function");
    case "D-EXPLICIT-PARAMS":return lowerValueDeclaration(text,"def");
    case "D-CALL":return lowerCall(text);
    case "D-DECL-SEMI":return stripSemi(text);
    case "E-IF-BRACE":return lowerIf(text);
    case "E-STRUCT-BODY":return lowerRecordBody(text,"structure");
    case "E-CLASS-BODY":return lowerRecordBody(text,"class");
    case "E-INDUCTIVE-BODY":return lowerInductive(text);
    case "E-MATCH-BODY":return lowerMatch(text);
    case "E-WHERE-BODY":return lowerWhere(text);
  }
}

type ValueKeyword="const"|"function"|"def";
interface ValueDecl{name:string;binders:string[];type:string;value:string;whereBody?:string;}

function lowerValueDeclaration(source:string,keyword:ValueKeyword):string{
  const d=parseValueDecl(source,keyword);
  return `def ${d.name}${emitBinders(d.binders)} : ${leanFragment(d.type)} := ${leanFragment(d.value)}`;
}

function lowerWhere(source:string):string{
  const d=parseValueDecl(source,"def");
  if(d.whereBody===undefined)throw new Error("production canonical lowering expected a where body");
  const helpers=splitTop(d.whereBody,";").map(x=>x.trim()).filter(Boolean).map(parseLocal);
  const body=`def ${d.name}${emitBinders(d.binders)} : ${leanFragment(d.type)} := ${leanFragment(d.value)} where`;
  return [body,...helpers.map(h=>`  ${h.name}${emitBinders(h.binders)} : ${leanFragment(h.type)} := ${leanFragment(h.value)}`)].join("\n");
}

function parseValueDecl(source:string,keyword:ValueKeyword):ValueDecl{
  let rest=source.trim();
  if(!rest.startsWith(keyword))throw new Error(`expected ${keyword}`);
  rest=rest.slice(keyword.length).trimStart();
  const m=/^([\p{ID_Start}_][\p{ID_Continue}_'?.]*)/u.exec(rest);
  if(!m)throw new Error(`expected declaration name after ${keyword}`);
  const name=m[1];rest=rest.slice(name.length).trimStart();
  const binders:string[]=[];
  while(rest.startsWith("(")){
    const g=balanced(rest,0,"(",")");
    for(const item of splitTop(g.inner,",")){const b=item.trim();if(b)binders.push(b);}
    rest=rest.slice(g.end).trimStart();
  }
  if(!rest.startsWith(":"))throw new Error(`expected ':' in ${keyword}`);
  rest=rest.slice(1);
  const assign=findTop(rest,":=");
  if(assign<0)throw new Error(`expected ':=' in ${keyword}`);
  const type=rest.slice(0,assign).trim();
  let value=rest.slice(assign+2).trim();
  let whereBody:string|undefined;
  const wi=findWordTop(value,"where");
  if(wi>=0){
    const before=value.slice(0,wi).trim();
    const after=value.slice(wi+5).trimStart();
    const block=balanced(after,0,"{","}");
    if(stripSemi(after.slice(block.end).trim()))throw new Error("unexpected source after where block");
    value=before;whereBody=block.inner;
  }else value=stripSemi(value);
  return{name,binders,type,value,...(whereBody!==undefined?{whereBody}:{})};
}

function parseLocal(source:string):ValueDecl{
  let rest=source.trim();
  const m=/^([\p{ID_Start}_][\p{ID_Continue}_'?.]*)/u.exec(rest);
  if(!m)throw new Error("invalid where helper");
  const name=m[1];rest=rest.slice(name.length).trimStart();
  const binders:string[]=[];
  while(rest.startsWith("(")){
    const g=balanced(rest,0,"(",")");
    for(const item of splitTop(g.inner,",")){const b=item.trim();if(b)binders.push(b);}
    rest=rest.slice(g.end).trimStart();
  }
  if(!rest.startsWith(":"))throw new Error("where helper requires type");
  rest=rest.slice(1);
  const assign=findTop(rest,":=");
  if(assign<0)throw new Error("where helper requires :=");
  return{name,binders,type:rest.slice(0,assign).trim(),value:rest.slice(assign+2).trim()};
}

function emitBinders(binders:readonly string[]):string{return binders.map(b=>` (${leanBinder(b)})`).join("");}
function leanBinder(source:string):string{
  const at=findTop(source,":");
  if(at<0)return leanFragment(source);
  const left=norm(source.slice(0,at));
  const right=leanFragment(source.slice(at+1));
  return `${left} : ${right}`;
}

function lowerCall(source:string):string{
  const open=outerCallOpen(source);
  if(open<1)throw new Error("invalid ProofScript call");
  const group=balanced(source,open,"(",")");
  if(group.end!==source.length)throw new Error("unexpected suffix after ProofScript call");
  const fn=leanFragment(source.slice(0,open));
  const args=splitTop(group.inner,",").map(x=>x.trim());
  if(args.length===1&&args[0].startsWith("(")&&wholeBalanced(args[0],"(",")")){
    const tuple=balanced(args[0],0,"(",")");
    const items=splitTop(tuple.inner,",");
    if(items.length>1)return `${fn} (${items.map(leanFragment).join(", ")})`;
  }
  if(args.length===1&&args[0]==="")return `${fn} ()`;
  return [fn,...args.map(leanFragment)].join(" ");
}

function lowerIf(source:string):string{
  let rest=source.trim().slice(2).trimStart();
  const condition=balanced(rest,0,"(",")");rest=rest.slice(condition.end).trimStart();
  const yes=balanced(rest,0,"{","}");rest=rest.slice(yes.end).trimStart();
  if(!rest.startsWith("else"))throw new Error("expected else");
  rest=rest.slice(4).trimStart();
  const no=balanced(rest,0,"{","}");
  return `if ${leanFragment(condition.inner)} then ${leanFragment(yes.inner)} else ${leanFragment(no.inner)}`;
}

function lowerRecordBody(source:string,keyword:"structure"|"class"):string{
  const {head,body}=whereBlock(source,keyword);
  const members=splitTop(body,";").map(x=>x.trim()).filter(Boolean);
  const lines=members.map(member=>{
    if(member.startsWith("{")&&wholeBalanced(member,"{","}")){
      return `  {${leanFragment(balanced(member,0,"{","}").inner)}}`;
    }
    return `  ${leanFragment(member)}`;
  });
  return `${keyword} ${leanHead(head)} where\n${lines.join("\n")}`;
}

function lowerInductive(source:string):string{
  const {head,body}=whereBlock(source,"inductive");
  const ctors=splitTop(body,";").map(x=>x.trim()).filter(Boolean).map(raw=>{
    if(!raw.startsWith("|"))throw new Error("constructor must start with |");
    let rest=raw.slice(1).trimStart();
    const m=/^([\p{ID_Start}_][\p{ID_Continue}_'?.]*)/u.exec(rest);if(!m)throw new Error("invalid constructor");
    const name=m[1];rest=rest.slice(name.length).trimStart();
    const binders:string[]=[];
    while(rest.startsWith("(")){
      const g=balanced(rest,0,"(",")");
      for(const item of splitTop(g.inner,",")){const b=item.trim();if(b)binders.push(b);}
      rest=rest.slice(g.end).trimStart();
    }
    return `  | ${name}${emitBinders(binders)}${rest?` ${leanFragment(rest)}`:""}`;
  });
  return `inductive ${leanHead(head)} where\n${ctors.join("\n")}`;
}

function lowerMatch(source:string):string{
  let rest=source.trim().slice("match".length).trimStart();
  const wi=findWordTop(rest,"with");if(wi<0)throw new Error("match requires with");
  const scrutinee=rest.slice(0,wi).trim();rest=rest.slice(wi+4).trimStart();
  const body=balanced(rest,0,"{","}").inner;
  const cases=splitTop(body,";").map(x=>x.trim()).filter(Boolean).map(raw=>{
    if(!raw.startsWith("|"))throw new Error("match case must start with |");
    const arrow=findTop(raw,"=>");if(arrow<0)throw new Error("match case requires =>");
    const pattern=norm(raw.slice(1,arrow));
    return `  | ${pattern} => ${leanFragment(raw.slice(arrow+2))}`;
  });
  return `match ${leanFragment(scrutinee)} with\n${cases.join("\n")}`;
}

function whereBlock(source:string,keyword:"structure"|"class"|"inductive"):{head:string;body:string}{
  let rest=source.trim().slice(keyword.length).trimStart();
  const wi=findWordTop(rest,"where");if(wi<0)throw new Error(`${keyword} requires where`);
  const head=rest.slice(0,wi).trim();rest=rest.slice(wi+5).trimStart();
  const block=balanced(rest,0,"{","}");
  return{head,body:block.inner};
}

function leanHead(source:string):string{
  let rest=source.trim();
  const m=/^([\p{ID_Start}_][\p{ID_Continue}_'?.]*)/u.exec(rest);if(!m)return leanFragment(rest);
  const name=m[1];rest=rest.slice(name.length).trimStart();
  const binders:string[]=[];
  while(rest.startsWith("(")){
    const g=balanced(rest,0,"(",")");
    for(const item of splitTop(g.inner,",")){const b=item.trim();if(b)binders.push(b);}
    rest=rest.slice(g.end).trimStart();
  }
  return `${name}${emitBinders(binders)}${rest?` ${leanFragment(rest)}`:""}`;
}

function leanFragment(source:string):string{
  let text=source.trim();
  if(!text)return text;
  if(/^if\b/u.test(text)&&text.includes("{"))return lowerIf(text);
  if(/^match\b/u.test(text)&&text.includes("{"))return lowerMatch(text);
  if(isAdjacentCall(text))return lowerCall(text);
  text=rewriteNestedCalls(text);
  return normOps(text);
}

function rewriteNestedCalls(source:string):string{
  let out="";
  for(let i=0;i<source.length;){
    const m=/^([\p{ID_Start}_][\p{ID_Continue}_'?.]*)/u.exec(source.slice(i));
    if(!m){out+=source[i++];continue;}
    const name=m[1],after=i+name.length;
    if(source[after]==="("){
      const g=balanced(source,after,"(",")");
      out+=lowerCall(source.slice(i,g.end));i=g.end;continue;
    }
    out+=name;i=after;
  }
  return out;
}

function isAdjacentCall(source:string):boolean{
  const open=outerCallOpen(source);if(open<1||/\s/u.test(source[open-1]??""))return false;
  try{return balanced(source,open,"(",")").end===source.length;}catch{return false;}
}
function outerCallOpen(source:string):number{
  let depth=0;
  for(let i=source.length-1;i>=0;i--){
    if(source[i]===")")depth++;
    else if(source[i]==="("){depth--;if(depth===0)return i;}
  }
  return-1;
}

function normOps(source:string):string{return norm(source.replace(/\s*(->|:=|=>|>=|<=|==|!=|\+|\*|>|<)\s*/gu," $1 "));}
function norm(source:string):string{return source.trim().replace(/\s+/gu," ");}
function stripSemi(source:string):string{const t=source.trim();return t.endsWith(";")?t.slice(0,-1).trimEnd():t;}
function wholeBalanced(source:string,open:string,close:string):boolean{try{return balanced(source.trim(),0,open,close).end===source.trim().length;}catch{return false;}}

function balanced(source:string,start:number,open:string,close:string):{inner:string;end:number}{
  if(!source.startsWith(open,start))throw new Error(`expected ${open}`);
  let depth=0;
  for(let i=start;i<source.length;i++){
    if(source.startsWith(open,i)){depth++;i+=open.length-1;continue;}
    if(source.startsWith(close,i)){depth--;if(depth===0)return{inner:source.slice(start+open.length,i),end:i+close.length};i+=close.length-1;}
  }
  throw new Error(`unterminated ${open}`);
}

function splitTop(source:string,delimiter:string):string[]{
  const out:string[]=[];let start=0,p=0,b=0,s=0;
  for(let i=0;i<source.length;i++){
    const ch=source[i];if(ch==="(")p++;else if(ch===")")p--;else if(ch==="{")b++;else if(ch==="}")b--;else if(ch==="[")s++;else if(ch==="]")s--;
    if(p===0&&b===0&&s===0&&source.startsWith(delimiter,i)){out.push(source.slice(start,i));start=i+delimiter.length;i+=delimiter.length-1;}
  }
  out.push(source.slice(start));return out;
}
function findTop(source:string,needle:string):number{
  let p=0,b=0,s=0;
  for(let i=0;i<=source.length-needle.length;i++){
    const ch=source[i];if(ch==="(")p++;else if(ch===")")p--;else if(ch==="{")b++;else if(ch==="}")b--;else if(ch==="[")s++;else if(ch==="]")s--;
    if(p===0&&b===0&&s===0&&source.startsWith(needle,i))return i;
  }
  return-1;
}
function findWordTop(source:string,word:string):number{
  for(let at=source.indexOf(word);at>=0;at=source.indexOf(word,at+word.length)){
    if(findTop(source.slice(0,at+word.length),word)!==at)continue;
    const before=source[at-1],after=source[at+word.length];
    if((!before||!/[\p{ID_Continue}_'?.]/u.test(before))&&(!after||!/[\p{ID_Continue}_'?.]/u.test(after)))return at;
  }
  return-1;
}
