import { Level, Term, levelDefEq } from "@proofscript/kernel";

/** Elaborator-only first-order pattern language. MVars never enter kernel Core. */
export type MetaPattern =
  | { tag: "mvar"; id: number }
  | { tag: "sort"; level: Level }
  | { tag: "bvar"; index: number }
  | { tag: "const"; name: string; levels: Level[] }
  | { tag: "app"; fn: MetaPattern; arg: MetaPattern };

export interface ScopedMeta { id: number; scopeDepth: number; assignment?: MetaPattern; }

export class MetaContext {
  private nextId = 0;
  private metas = new Map<number, ScopedMeta>();
  fresh(scopeDepth: number): ScopedMeta {
    const m={id:this.nextId++,scopeDepth};this.metas.set(m.id,m);return m;
  }
  get(id:number):ScopedMeta { const m=this.metas.get(id); if(!m)throw new Error(`internal: unknown metavariable ?m${id}`); return m; }
  assign(id:number,value:MetaPattern):void {
    const m=this.get(id); if(occurs(id,value,this))throw new Error(`occurs check failed for ?m${id}`); m.assignment=value;
  }
  deref(p:MetaPattern):MetaPattern {
    if(p.tag!=="mvar")return p;const a=this.get(p.id).assignment;return a?this.deref(a):p;
  }
}

/** Convert a Core type under N hidden binders into a pattern whose hidden BVars are metas. */
export function hiddenDomainPattern(term:Term, metas:readonly ScopedMeta[]):MetaPattern|undefined {
  const n=metas.length;
  const go=(t:Term):MetaPattern|undefined=>{
    switch(t.tag){
      case"sort":return{tag:"sort",level:t.level};
      case"const":return{tag:"const",name:t.name,levels:t.levels};
      case"app":{const fn=go(t.fn),arg=go(t.arg);return fn&&arg?{tag:"app",fn,arg}:undefined;}
      case"bvar":{
        if(t.index<n)return{tag:"mvar",id:metas[n-1-t.index].id};
        return{tag:"bvar",index:t.index-n};
      }
      case"lam":case"pi":case"let":return undefined;
    }
  };
  return go(term);
}

export function coreAsPattern(term:Term):MetaPattern|undefined {
  switch(term.tag){
    case"sort":return{tag:"sort",level:term.level};
    case"bvar":return{tag:"bvar",index:term.index};
    case"const":return{tag:"const",name:term.name,levels:term.levels};
    case"app":{const fn=coreAsPattern(term.fn),arg=coreAsPattern(term.arg);return fn&&arg?{tag:"app",fn,arg}:undefined;}
    case"lam":case"pi":case"let":return undefined;
  }
}

export function unifyFirstOrder(left:MetaPattern,right:MetaPattern,metas:MetaContext):boolean {
  left=metas.deref(left);right=metas.deref(right);
  if(left.tag==="mvar")return bind(left.id,right,metas);
  if(right.tag==="mvar")return bind(right.id,left,metas);
  if(left.tag!==right.tag)return false;
  switch(left.tag){
    case"sort":return right.tag==="sort"&&levelDefEq(left.level,right.level);
    case"bvar":return right.tag==="bvar"&&left.index===right.index;
    case"const":return right.tag==="const"&&left.name===right.name&&left.levels.length===right.levels.length&&left.levels.every((l,i)=>levelDefEq(l,right.levels[i]));
    case"app":return right.tag==="app"&&unifyFirstOrder(left.fn,right.fn,metas)&&unifyFirstOrder(left.arg,right.arg,metas);
  }
}

function bind(id:number,value:MetaPattern,metas:MetaContext):boolean {
  const current=metas.get(id).assignment;
  if(current)return patternEq(metas.deref(current),metas.deref(value),metas);
  if(occurs(id,value,metas))return false;
  metas.assign(id,value);return true;
}

function occurs(id:number,p:MetaPattern,metas:MetaContext):boolean {
  p=metas.deref(p);
  switch(p.tag){case"mvar":return p.id===id;case"app":return occurs(id,p.fn,metas)||occurs(id,p.arg,metas);default:return false;}
}
function patternEq(a:MetaPattern,b:MetaPattern,metas:MetaContext):boolean {
  a=metas.deref(a);b=metas.deref(b);if(a.tag!==b.tag)return false;
  switch(a.tag){case"mvar":return b.tag==="mvar"&&a.id===b.id;case"sort":return b.tag==="sort"&&levelDefEq(a.level,b.level);case"bvar":return b.tag==="bvar"&&a.index===b.index;case"const":return b.tag==="const"&&a.name===b.name&&a.levels.length===b.levels.length&&a.levels.every((l,i)=>levelDefEq(l,b.levels[i]));case"app":return b.tag==="app"&&patternEq(a.fn,b.fn,metas)&&patternEq(a.arg,b.arg,metas);}
}

export function solvedCore(meta:ScopedMeta,metas:MetaContext):Term|undefined {
  const a=meta.assignment?metas.deref(meta.assignment):undefined;if(!a)return undefined;return patternToCore(a,metas);
}
function patternToCore(p:MetaPattern,metas:MetaContext):Term|undefined {
  p=metas.deref(p);switch(p.tag){case"mvar":return undefined;case"sort":return{tag:"sort",level:p.level};case"bvar":return{tag:"bvar",index:p.index};case"const":return{tag:"const",name:p.name,levels:p.levels};case"app":{const fn=patternToCore(p.fn,metas),arg=patternToCore(p.arg,metas);return fn&&arg?{tag:"app",fn,arg}:undefined;}}
}
