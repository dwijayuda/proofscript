import { BinderInfo, CoreDeclaration, Prop, Term } from "./core";
import { Level, LevelZero, levelParam } from "./level";

export type QuotientPrimitiveKind = "type" | "mk" | "lift" | "ind";
export interface QuotientPrimitive {
  name: "Quot" | "Quot.mk" | "Quot.lift" | "Quot.ind";
  levelParams: string[];
  type: Term;
  quotKind: QuotientPrimitiveKind;
}

type NTerm =
  | { tag:"sort"; level:Level }
  | { tag:"var"; name:string }
  | { tag:"const"; name:string; levels:Level[] }
  | { tag:"app"; fn:NTerm; arg:NTerm }
  | { tag:"pi"; name:string; domain:NTerm; body:NTerm; binderInfo:BinderInfo };

const S=(level:Level):NTerm=>({tag:"sort",level});
const V=(name:string):NTerm=>({tag:"var",name});
const C=(name:string,levels:Level[]=[]):NTerm=>({tag:"const",name,levels});
const A=(fn:NTerm,arg:NTerm):NTerm=>({tag:"app",fn,arg});
const Apps=(fn:NTerm,args:NTerm[]):NTerm=>args.reduce((f,a)=>A(f,a),fn);
const Pi=(name:string,domain:NTerm,body:NTerm,binderInfo:BinderInfo="explicit"):NTerm=>({tag:"pi",name,domain,body,binderInfo});
const Arrow=(domain:NTerm,body:NTerm):NTerm=>Pi("_",domain,body,"explicit");

function lower(term:NTerm,names:string[]=[]):Term{
  switch(term.tag){
    case"sort":return{tag:"sort",level:term.level};
    case"var":{
      for(let i=names.length-1;i>=0;i--)if(names[i]===term.name)return{tag:"bvar",index:names.length-1-i};
      throw new Error(`internal quotient generator: unbound variable ${term.name}`);
    }
    case"const":return{tag:"const",name:term.name,levels:term.levels};
    case"app":return{tag:"app",fn:lower(term.fn,names),arg:lower(term.arg,names)};
    case"pi":return{tag:"pi",domain:lower(term.domain,names),body:lower(term.body,[...names,term.name]),binderInfo:term.binderInfo};
  }
}

/** Exact Lean 4.33.1 Eq type expected by environment::add_quot. */
export function expectedEqType(levelParamName="u"):Term{
  const u=levelParam(levelParamName), alpha=V("α");
  return lower(Pi("α",S(u),Arrow(alpha,Arrow(alpha,S(LevelZero))),"implicit"));
}

/** Exact Lean 4.33.1 Eq.refl constructor type expected by environment::add_quot. */
export function expectedEqReflType(levelParamName="u"):Term{
  const u=levelParam(levelParamName), alpha=V("α"), a=V("a");
  return lower(Pi("α",S(u),Pi("a",alpha,Apps(C("Eq",[u]),[alpha,a,a]),"explicit"),"implicit"));
}

/** Generate the four kernel quotient constants installed by Lean's Quot declaration. */
export function generateQuotientPrimitives():QuotientPrimitive[]{
  const u=levelParam("u"),v=levelParam("v");
  const alpha=V("α"),r=V("r"),a=V("a"),b=V("b"),beta=V("β"),f=V("f"),q=V("q");
  const rel=Arrow(alpha,Arrow(alpha,S(LevelZero)));
  const quotR=Apps(C("Quot",[u]),[alpha,r]);
  const mkA=Apps(C("Quot.mk",[u]),[alpha,r,a]);

  const quotType=lower(Pi("α",S(u),Pi("r",rel,S(u),"explicit"),"implicit"));
  const quotMkType=lower(Pi("α",S(u),Pi("r",rel,Pi("a",alpha,quotR,"explicit"),"explicit"),"implicit"));

  const fa=Apps(f,[a]),fb=Apps(f,[b]);
  const fEq=Apps(C("Eq",[v]),[beta,fa,fb]);
  const sanity=Pi("a",alpha,Pi("b",alpha,Arrow(Apps(r,[a,b]),fEq),"explicit"),"explicit");
  const quotLiftType=lower(
    Pi("α",S(u),
      Pi("r",rel,
        Pi("β",S(v),
          Pi("f",Arrow(alpha,beta),
            Pi("sound",sanity,
              Pi("q",quotR,beta,"explicit"),"explicit"),"explicit"),"implicit"),"implicit"),"implicit")
  );

  const motive=Arrow(quotR,S(LevelZero));
  const allMk=Pi("a",alpha,Apps(beta,[mkA]),"explicit");
  const quotIndType=lower(
    Pi("α",S(u),
      Pi("r",rel,
        Pi("β",motive,
          Pi("mk",allMk,
            Pi("q",quotR,Apps(beta,[q]),"explicit"),"explicit"),"implicit"),"implicit"),"implicit")
  );

  return[
    {name:"Quot",levelParams:["u"],type:quotType,quotKind:"type"},
    {name:"Quot.mk",levelParams:["u"],type:quotMkType,quotKind:"mk"},
    {name:"Quot.lift",levelParams:["u","v"],type:quotLiftType,quotKind:"lift"},
    {name:"Quot.ind",levelParams:["u"],type:quotIndType,quotKind:"ind"},
  ];
}

/** Lean's library axiom Quot.sound; it is not part of the kernel Quot declaration. */
export function quotientSoundAxiom():Extract<CoreDeclaration,{kind:"axiom"}>{
  const u=levelParam("u"),alpha=V("α"),r=V("r"),a=V("a"),b=V("b");
  const rel=Arrow(alpha,Arrow(alpha,S(LevelZero)));
  const mkA=Apps(C("Quot.mk",[u]),[alpha,r,a]);
  const mkB=Apps(C("Quot.mk",[u]),[alpha,r,b]);
  const premise=Apps(r,[a,b]);
  const equality=Apps(C("Eq",[u]),[Apps(C("Quot",[u]),[alpha,r]),mkA,mkB]);
  const type=lower(
    Pi("α",S(u),Pi("r",rel,Pi("a",alpha,Pi("b",alpha,Arrow(premise,equality),"implicit"),"implicit"),"implicit"),"implicit")
  );
  return{kind:"axiom",name:"Quot.sound",levelParams:["u"],type};
}
