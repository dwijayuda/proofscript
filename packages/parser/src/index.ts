import {ParseError,UnsupportedFeature,Token,SurfaceBinder,SurfaceDeclaration,SurfaceLevel,SurfacePattern,SurfaceTerm} from "@proofscript/syntax";
import {TokenCursor} from "./tokenCursor";
import {makeBoolIf} from "./sugar";
import {parseDeclaration} from "./declarationParser";
import {parseProofTerm} from "./proofParser";
import {ScopeCommandHost,parseImportCommand,parseNamespaceCommand,parseOpenCommand,parseSectionCommand,parseUniverseCommand} from "./scopeCommandParser";
import {BinderParserHost,canStartValueBinder as binderCanStartValueBinder,parseExplicitBinderGroup as parseExplicitBinderGroupFromHost,parseValueBinderGroup as parseValueBinderGroupFromHost} from "./binderParser";
import {LevelParserHost,canStartOptionalTypeLevel as levelCanStartOptionalTypeLevel,parseLevel as parseLevelFromHost} from "./levelParser";
import {ExpressionParserHost,parseTermFromHost} from "./expressionParser";
import {PatternParserHost,parsePatternFromHost} from "./patternParser";
import {StructureTermParserHost,parseStructureInstanceFromHost} from "./structureTermParser";
import {WhereBodyParserHost,parseWhereBodyFromHost} from "./whereBodyParser";
import {shouldParseBracedDefinitionBodyAsTerm} from "./definitionBodyParser";

type SectionVariablePolicy="default"|"include"|"omit";
interface SectionVariableEntry{binder:SurfaceBinder;dependencies:string[];policy:SectionVariablePolicy;}
export interface ParserState{commandIndex:number;grammarRevision:number;universeParams:string[];}
export interface ParseOptions{knownGlobalNames?:readonly string[];validateOpenNamespaces?:boolean;}
export interface ParseResult{imports:string[];declarations:SurfaceDeclaration[];finalState:ParserState;}
export function parseSource(source:string,initial:ParserState={commandIndex:0,grammarRevision:0,universeParams:[]},options:ParseOptions={}):ParseResult{return new Parser(tokenize(source),initial,options).parseFile();}

export {tokenize} from "./tokenize";
import {tokenize} from "./tokenize";



function countLeadingSurfacePis(term:SurfaceTerm):number{let n=0,cur=term;while(cur.tag==="pi"){n++;cur=cur.body;}return n;}

class Parser extends TokenCursor{
  private state:ParserState;private namespaceStack:string[]=[];private openedNamespaces:string[]=[];private knownNamespaces=new Set<string>();private sectionVariables:SectionVariableEntry[]=[];private readonly validateOpenNamespaces:boolean;
  constructor(tokens:Token[],initial:ParserState,options:ParseOptions){
    super(tokens);
    this.state={...initial,universeParams:[...initial.universeParams]};
    this.validateOpenNamespaces=options.validateOpenNamespaces??false;
    for(const name of options.knownGlobalNames??[])this.registerNameNamespaces(name);
  }
  parseFile():ParseResult{
    const imports:string[]=[];const declarations:SurfaceDeclaration[]=[];let bodyStarted=false;
    while(!this.at("<eof>")){
      if(this.atId("import")){
        if(bodyStarted)throw new ParseError(`import declarations must appear before all non-import commands (offset ${this.peek().offset})`);
        const name=parseImportCommand(this.makeScopeCommandHost());
        if(imports.includes(name))throw new ParseError(`duplicate import '${name}'`);
        imports.push(name);
        this.bumpCommand();
      }else{
        bodyStarted=true;this.parseNonImportCommand(declarations);
      }
    }
    return{imports,declarations,finalState:this.state};
  }
  private parseNonImportCommand(declarations:SurfaceDeclaration[]):void{
    if(this.atId("import"))throw new ParseError(`import declarations must appear before all non-import commands (offset ${this.peek().offset})`);
    if(this.atId("universe"))parseUniverseCommand(this.makeScopeCommandHost());
    else if(this.atId("namespace"))parseNamespaceCommand(this.makeScopeCommandHost(),declarations);
    else if(this.atId("section"))parseSectionCommand(this.makeScopeCommandHost(),declarations);
    else if(this.atId("open"))parseOpenCommand(this.makeScopeCommandHost());
    else if(this.atId("variable"))this.parseVariableCommand();
    else if(this.atId("include"))this.parseSectionPolicyCommand("include");
    else if(this.atId("omit"))this.parseSectionPolicyCommand("omit");
    else {const decl=this.applySectionVariables(this.withNamespace(this.parseAnyDeclaration()));declarations.push(decl);this.registerDeclarationNamespaces(decl);}
    this.bumpCommand();
  }
  private cloneSectionVariables():SectionVariableEntry[]{return this.sectionVariables.map(v=>({binder:{...v.binder},dependencies:[...v.dependencies],policy:v.policy}));}
  private parseVariableCommand():void{
    this.expectId("variable");
    if(!this.canStartValueBinder())throw new ParseError("variable requires at least one typed binder group");
    let count=0;
    while(this.canStartValueBinder()){
      const group=this.parseValueBinderGroup();
      for(const binder of group){
        if((binder.binderInfo??"explicit")==="instImplicit")throw new UnsupportedFeature("K3c-section-vars0 defers section instance variables until scoped/local typeclass visibility is implemented");
        if(this.sectionVariables.some(v=>v.binder.name===binder.name))throw new UnsupportedFeature(`K3c-section-vars0 does not yet implement rebinding active section variable '${binder.name}'`);
        const deps=[...this.collectSectionRefs(binder.type,new Set())];
        this.sectionVariables.push({binder,dependencies:this.sectionVariables.filter(v=>deps.includes(v.binder.name)).map(v=>v.binder.name),policy:"default"});
        count++;
      }
    }
    if(count===0)throw new ParseError("variable requires at least one typed binder");
    this.expect(";");
  }
  private parseSectionPolicyCommand(policy:"include"|"omit"):void{
    this.expectId(policy);let count=0;
    while(!this.at(";")){
      if(this.at("[")||this.atId("in"))throw new UnsupportedFeature(`K3c-section-vars0 currently supports only named '${policy} x;' commands; instance-by-type and '${policy} ... in' are deferred`);
      const token=this.expectKind("id",`${policy} variable name`);
      const entry=[...this.sectionVariables].reverse().find(v=>v.binder.name===token.text);
      if(!entry)throw new ParseError(`invalid '${policy}', variable '${token.text}' has not been declared in the current scope`);
      entry.policy=policy;count++;
    }
    if(count===0)throw new ParseError(`${policy} requires at least one section variable`);
    this.expect(";");
  }
  private applySectionVariables(decl:SurfaceDeclaration):SurfaceDeclaration{
    if(this.sectionVariables.length===0)return decl;
    const valueLike=decl.kind==="theorem"||decl.kind==="axiom"||decl.kind==="definition"||decl.kind==="equationDefinition"||decl.kind==="abbrev"||decl.kind==="opaque"||decl.kind==="example";
    if(!valueLike){
      const refs=this.collectSectionRefsFromNonValueDeclaration(decl);
      if(refs.size>0)throw new UnsupportedFeature(`K3c-section-vars0 currently generalizes section variables only for value declarations; '${decl.kind} ${decl.name}' requires section variable(s): ${[...refs].join(", ")}`);
      return decl;
    }
    const explicitBinders=decl.binders;
    const headerRefs=this.collectHeaderSectionRefs(explicitBinders,decl.type);
    let required=new Set<string>(headerRefs);
    if(decl.kind==="theorem"){
      for(const v of this.sectionVariables)if(v.policy==="include")required.add(v.binder.name);
      required=this.closeSectionDependencies(required,true);
      const bodyRefs=this.collectSectionRefs(decl.value,new Set(explicitBinders.map(b=>b.name)));
      for(const name of bodyRefs)if(!required.has(name))throw new ParseError(`unknown identifier '${name}' in theorem proof: section variable is not present in the theorem header and is not included`);
    }else if(decl.kind==="axiom"){
      required=this.closeSectionDependencies(required,false);
    }else{
      const bodyRefs=new Set<string>();
      const bound=new Set(explicitBinders.map(b=>b.name));
      if(decl.kind==="equationDefinition")for(const eq of decl.equations){const caseBound=new Set(bound);if(eq.pattern.tag==="ctor")for(const b of eq.pattern.binders)caseBound.add(b);for(const r of this.collectSectionRefs(eq.body,caseBound))bodyRefs.add(r);}
      else for(const r of this.collectSectionRefs(decl.value,bound))bodyRefs.add(r);
      for(const r of bodyRefs)required.add(r);
      required=this.closeSectionDependencies(required,false);
    }
    const sectionBinders=this.sectionVariables.filter(v=>required.has(v.binder.name)).map(v=>({...v.binder}));
    if(sectionBinders.length===0)return decl;
    return{...decl,binders:[...sectionBinders,...explicitBinders]} as SurfaceDeclaration;
  }
  private collectHeaderSectionRefs(binders:SurfaceBinder[],type:SurfaceTerm):Set<string>{
    const refs=new Set<string>();const bound=new Set<string>();
    for(const binder of binders){for(const r of this.collectSectionRefs(binder.type,bound))refs.add(r);bound.add(binder.name);}
    for(const r of this.collectSectionRefs(type,bound))refs.add(r);return refs;
  }
  private closeSectionDependencies(seed:Set<string>,enforceOmit:boolean):Set<string>{
    const out=new Set(seed);let changed=true;
    while(changed){changed=false;for(const v of this.sectionVariables){if(!out.has(v.binder.name))continue;if(enforceOmit&&v.policy==="omit")throw new ParseError(`cannot omit referenced section variable '${v.binder.name}'`);for(const d of v.dependencies)if(!out.has(d)){out.add(d);changed=true;}}}
    if(enforceOmit)for(const name of out){const v=this.sectionVariables.find(v=>v.binder.name===name);if(v?.policy==="omit")throw new ParseError(`cannot omit referenced section variable '${name}'`);}
    return out;
  }
  private collectSectionRefsFromNonValueDeclaration(decl:SurfaceDeclaration):Set<string>{
    const refs=new Set<string>();
    const add=(t:SurfaceTerm,bound=new Set<string>())=>{for(const r of this.collectSectionRefs(t,bound))refs.add(r);};
    if(decl.kind==="structure"){for(const f of decl.fields)add(f.type);}
    else if(decl.kind==="class"){const bound=new Set<string>();for(const p of decl.params){add(p.type,bound);bound.add(p.name);}for(const f of decl.fields)add(f.type,bound);}
    else if(decl.kind==="inductive"){const bound=new Set<string>();for(const p of decl.params){add(p.type,bound);bound.add(p.name);}add(decl.type,bound);for(const c of decl.constructors){const cb=new Set(bound);for(const b of c.binders){add(b.type,cb);cb.add(b.name);}if(c.result)add(c.result,cb);}}
    else if(decl.kind==="instance"){const bound=new Set<string>();for(const b of decl.binders){add(b.type,bound);bound.add(b.name);}add(decl.type,bound);add(decl.value,bound);}
    return refs;
  }
  private collectSectionRefs(term:SurfaceTerm,bound:Set<string>):Set<string>{
    const sectionNames=new Set(this.sectionVariables.map(v=>v.binder.name));const out=new Set<string>();
    const visit=(t:SurfaceTerm,scope:Set<string>)=>{switch(t.tag){
      case "name":if(sectionNames.has(t.name)&&!scope.has(t.name))out.add(t.name);break;
      case "sort":case "natLit":case "intLit":case "stringLit":case "boolLit":case "rflProof":case "assumptionProof":break;
      case "bif":visit(t.condition,scope);visit(t.thenBranch,scope);visit(t.elseBranch,scope);break;
      case "exactProof":visit(t.term,scope);break;
      case "applyProof":visit(t.term,scope);if(t.body)visit(t.body,scope);break;
      case "introProof":{const s=new Set(scope);for(const name of t.names)s.add(name);visit(t.body,s);break;}
      case "eq":visit(t.left,scope);visit(t.right,scope);break;
      case "app":visit(t.fn,scope);for(const a of t.args)visit(a,scope);break;
      case "lam":{const s=new Set(scope);for(const b of t.binders){if(b.type)visit(b.type,s);s.add(b.name);}visit(t.body,s);break;}
      case "pi":visit(t.binder.type,scope);{const s=new Set(scope);s.add(t.binder.name);visit(t.body,s);}break;
      case "let":if(t.type)visit(t.type,scope);visit(t.value,scope);{const s=new Set(scope);s.add(t.name);visit(t.body,s);}break;
      case "match":visit(t.scrutinee,scope);for(const c of t.cases){const s=new Set(scope);if(c.pattern.tag==="ctor")for(const b of c.pattern.binders)s.add(b);visit(c.body,s);}break;
      case "structInst":for(const f of t.fields)visit(f.value,scope);break;
      case "do":{const s=new Set(scope);for(const b of t.binds){visit(b.value,s);s.add(b.name);}visit(t.body,s);break;}
      case "structUpdate":visit(t.base,scope);for(const f of t.fields)visit(f.value,scope);break;
    }};visit(term,new Set(bound));return out;
  }

  private registerNameNamespaces(name:string):void{const parts=name.startsWith("_root_.")?name.slice(7).split("."):name.split(".");for(let i=1;i<parts.length;i++)this.knownNamespaces.add(parts.slice(0,i).join("."));}
  private registerDeclarationNamespaces(decl:SurfaceDeclaration):void{
    const q=decl.name.startsWith("_root_.")?decl.name.slice(7):(decl.namespacePath?.length?`${decl.namespacePath.join(".")}.${decl.name}`:decl.name);
    this.registerNameNamespaces(q);
    if(decl.kind==="inductive"||decl.kind==="structure"||decl.kind==="class")this.knownNamespaces.add(q);
  }
  private withNamespace<T extends SurfaceDeclaration>(decl:T):T{return{...decl,namespacePath:[...this.namespaceStack]};}
  private currentNamespace():string[]{return[...this.namespaceStack];}
  private currentOpenNamespaces():string[]{return[...this.openedNamespaces];}
  private bumpCommand():void{this.state={...this.state,commandIndex:this.state.commandIndex+1};}

  private makeScopeCommandHost():ScopeCommandHost<SectionVariableEntry[]>{return{
    at:(text)=>this.at(text),
    atId:(text)=>this.atId(text),
    peek:(ahead=0)=>this.peek(ahead),
    next:()=>this.next(),
    expect:(text)=>this.expect(text),
    expectId:(text)=>this.expectId(text),
    expectKind:(kind,what)=>this.expectKind(kind,what),
    parseNonImportCommand:(declarations)=>this.parseNonImportCommand(declarations),
    cloneSectionVariables:()=>this.cloneSectionVariables(),
    restoreSectionVariables:(snapshot)=>{this.sectionVariables=snapshot;},
    namespaceStack:()=>[...this.namespaceStack],
    setNamespaceStack:(stack)=>{this.namespaceStack=[...stack];},
    openedNamespaces:()=>[...this.openedNamespaces],
    setOpenedNamespaces:(names)=>{this.openedNamespaces=[...names];},
    state:()=>this.state,
    setState:(state)=>{this.state={...state,universeParams:[...state.universeParams]};},
    hasKnownNamespace:(name)=>this.knownNamespaces.has(name),
    addKnownNamespace:(name)=>{this.knownNamespaces.add(name);},
    validateOpenNamespaces:()=>this.validateOpenNamespaces
  };}
  private parseAnyDeclaration():SurfaceDeclaration{return parseDeclaration({
    peek:()=>this.peek(),
    parseInductiveDeclaration:()=>this.parseInductiveDeclaration(),
    parseStructureDeclaration:()=>this.parseStructureDeclaration(),
    parseClassDeclaration:()=>this.parseClassDeclaration(),
    parseInstanceDeclaration:()=>this.parseInstanceDeclaration(),
    parseDefinition:()=>this.parseDefinition(),
    parseFunctionAliasDeclaration:()=>this.parseFunctionAliasDeclaration(),
    parseConstAliasDeclaration:()=>this.parseConstAliasDeclaration(),
    parseTransparentLikeDeclaration:(kind)=>this.parseTransparentLikeDeclaration(kind),
    parseExampleDeclaration:()=>this.parseExampleDeclaration(),
    parseTheoremOrAxiomDeclaration:(kind)=>this.parseTheoremOrAxiomDeclaration(kind)
  });}
  private parseTheoremOrAxiomDeclaration(kind:"theorem"|"axiom"):SurfaceDeclaration{
    this.expectId(kind);const name=this.expectKind("id","declaration name").text;const binders:SurfaceBinder[]=[];while(this.canStartValueBinder())binders.push(...this.parseValueBinderGroup());
    this.expect(":");const type=this.parseTerm();const availableLevels=[...this.state.universeParams];
    if(kind==="axiom"){this.expect(";");return{kind:"axiom",name,binders,type,availableLevels};}
    this.expect(":=");const byBlock=this.atId("by");const value=this.parseProofExpression();this.closeProofDeclaration(byBlock);return{kind:"theorem",name,binders,type,value,availableLevels};
  }
  private parseTransparentLikeDeclaration(kind:"opaque"|"abbrev"):SurfaceDeclaration{
    this.expectId(kind);const name=this.expectKind("id",`${kind} name`).text;const binders:SurfaceBinder[]=[];while(this.canStartValueBinder())binders.push(...this.parseValueBinderGroup());
    if(!this.at(":"))throw new UnsupportedFeature(`K3c-section-vars0 currently requires an explicit result type on ${kind}`);this.expect(":");const type=this.parseTerm();
    this.expect(":=");if(this.atId("by"))throw new UnsupportedFeature("K3c-section-vars0 does not implement tactic syntax ('by'); use a direct term");const value=this.parseTerm();this.expect(";");
    return{kind,name,binders,type,value,availableLevels:[...this.state.universeParams]};
  }
  private parseExampleDeclaration():SurfaceDeclaration{
    this.expectId("example");const binders:SurfaceBinder[]=[];while(this.canStartValueBinder())binders.push(...this.parseValueBinderGroup());
    this.expect(":");const type=this.parseTerm();this.expect(":=");const byBlock=this.atId("by");const value=this.parseProofExpression();this.closeProofDeclaration(byBlock);
    return{kind:"example",name:`__example_${this.state.commandIndex}`,binders,type,value,availableLevels:[...this.state.universeParams]};
  }
  private closeProofDeclaration(selfDelimited:boolean):void{
    if(selfDelimited){
      if(this.at(";"))throw new ParseError("canonical ProofScript v0.2.x theorem/example by-blocks are self-delimited and must not end with a command-level ';'");
      return;
    }
    if(this.at(";")){this.next();return;}
    throw new ParseError("inline theorem/example proof terms require a command terminator; self-delimited by-block proofs close at their final '}'");
  }
  private parseProofExpression():SurfaceTerm{return parseProofTerm({
    at:(text:string)=>this.at(text),
    atId:(text:string)=>this.atId(text),
    next:()=>this.next(),
    expect:(text:string)=>this.expect(text),
    parseTerm:()=>this.parseTerm(),
    peek:()=>this.peek()
  });}
  private parseDefinition():SurfaceDeclaration{
    this.expectId("def");const name=this.expectKind("id","definition name").text;const binders:SurfaceBinder[]=[];while(this.canStartValueBinder())binders.push(...this.parseValueBinderGroup());
    if(!this.at(":"))throw new UnsupportedFeature("K3c-section-vars0 requires an explicit result type on def");this.expect(":");const type=this.parseTerm();
    if(this.at(":=")){
      this.next();const value=this.parseDefinitionValueAfterAssign();
      return{kind:"definition",name,binders,type,value,availableLevels:[...this.state.universeParams]};
    }
    if(this.at("|")){
      const equations:{pattern:SurfacePattern;body:SurfaceTerm}[]=[];
      while(this.at("|")){this.next();const pattern=this.parsePattern("equation");if(this.at(","))throw new UnsupportedFeature("K3c-section-vars0 currently supports exactly one pattern argument per equation clause");this.expect("=>");equations.push({pattern,body:this.parseTerm()});}
      if(this.at(";"))this.next();
      if(equations.length===0)throw new ParseError("equation definition requires at least one clause");
      if(equations.some((c,i)=>c.pattern.tag==="wildcard"&&i!==equations.length-1))throw new UnsupportedFeature("K3c-section-vars0 currently requires wildcard equation pattern '_' to be the final clause");
      return{kind:"equationDefinition",name,binders,type,equations,availableLevels:[...this.state.universeParams]};
    }
    throw new ParseError(`expected ':=' or equation clause '|' after definition type at offset ${this.peek().offset}`);
  }
  private parseFunctionAliasDeclaration():SurfaceDeclaration{
    this.expectId("function");const name=this.expectKind("id","function name").text;const binders:SurfaceBinder[]=[];while(this.canStartValueBinder())binders.push(...this.parseValueBinderGroup());
    if(binders.length===0)throw new ParseError("ProofScript function alias requires at least one typed binder and expands to def");
    if(!this.at(":"))throw new UnsupportedFeature("PSC-1 function alias currently requires an explicit result type before expansion to def");this.expect(":");const type=this.parseTerm();
    this.expect(":=");const value=this.parseDefinitionValueAfterAssign();
    return{kind:"definition",name,binders,type,value,availableLevels:[...this.state.universeParams]};
  }
  private parseConstAliasDeclaration():SurfaceDeclaration{
    this.expectId("const");const name=this.expectKind("id","const name").text;
    if(this.canStartValueBinder())throw new ParseError("ProofScript const alias is binderless at top level; use def/function for functions");
    if(!this.at(":"))throw new UnsupportedFeature("PSC-1 const alias currently requires an explicit result type before expansion to def");this.expect(":");const type=this.parseTerm();
    this.expect(":=");const value=this.parseDefinitionValueAfterAssign();
    return{kind:"definition",name,binders:[],type,value,availableLevels:[...this.state.universeParams]};
  }
  private parseDefinitionValueAfterAssign():SurfaceTerm{
    if(this.at("{")&&shouldParseBracedDefinitionBodyAsTerm(this.tokens,this.i)){
      const value=this.parseTerm();
      if(this.atId("where"))return parseWhereBodyFromHost(this.makeWhereBodyParserHost(),value);
      this.expect(";");
      return value;
    }
    if(this.at("{")){this.next();const value=this.parseDefBodySequence();this.expect("}");if(this.at(";"))this.next();return value;}
    if(this.atId("let")||this.atId("have"))throw new UnsupportedFeature("PSC-1 v0.6.1 expression-bodied declarations use one term; wrap local let/have sequences in the current checked block form");
    const value=this.parseTerm();
    if(this.atId("where"))return parseWhereBodyFromHost(this.makeWhereBodyParserHost(),value);
    this.expect(";");return value;
  }
  private parseDefBodySequence():SurfaceTerm{
    if(this.atId("let"))return this.parseDefBodyBinding(false);
    if(this.atId("have"))return this.parseDefBodyBinding(true);
    const value=this.parseTerm();
    if(this.at(";"))throw new ParseError("ProofScript v0.1 def-body final term must not have a trailing body-level semicolon");
    return value;
  }
  private parseDefBodyBinding(nondep:boolean):SurfaceTerm{
    this.expectId(nondep?"have":"let");
    if(this.atId("rec"))throw new UnsupportedFeature("K3c-section-vars0 does not implement local recursion 'let rec' yet");
    const name=this.expectKind("id","local let name").text;
    if(this.at("("))throw new UnsupportedFeature("K3c-section-vars0 does not implement local function binder sugar yet");
    let type:SurfaceTerm|undefined;
    if(this.at(":")){this.next();type=this.parseTerm();}
    this.expect(":=");const value=this.parseTerm();
    this.expect(";");
    return{tag:"let",name,type,value,body:this.parseDefBodySequence(),nondep};
  }

  private makeWhereBodyParserHost():WhereBodyParserHost{return{
    at:(text)=>this.at(text),
    atId:(text)=>this.atId(text),
    next:()=>this.next(),
    expect:(text)=>this.expect(text),
    expectId:(text)=>this.expectId(text),
    expectKind:(kind,what)=>this.expectKind(kind,what),
    canStartValueBinder:()=>this.canStartValueBinder(),
    parseValueBinderGroup:()=>this.parseValueBinderGroup(),
    parseTerm:()=>this.parseTerm(),
  };}


  private parseClassDeclaration():SurfaceDeclaration{
    this.expectId("class");const name=this.expectKind("id","class name").text;
    const params:SurfaceBinder[]=[];while(this.at("("))params.push(...this.parseExplicitBinderGroup());
    if(this.at(":")){this.next();const declaredType=this.parseTerm();if(declaredType.tag!=="sort")throw new UnsupportedFeature("PSC-1 class result type must be Type/Sort in the current reference-governed slice");}
    if(this.atId("where"))this.next();
    if(this.at("{")===false&&(this.at("⦃")||this.at("[")||this.atId("extends")))throw new UnsupportedFeature("K3c-section-vars0 currently implements explicit class parameters only and no extends/class-inductive/class-abbrev forms");
    this.expect("{");const fields:{name:string;type:SurfaceTerm}[]=[];
    while(!this.at("}")){const fieldName=this.expectKind("id","class field name").text;if(this.at("("))throw new UnsupportedFeature("K3c-section-vars0 does not yet implement class method binder sugar; write an explicit function type after ':'");this.expect(":");const type=this.parseTerm();this.expect(";");if(fields.some(f=>f.name===fieldName))throw new ParseError(`duplicate class field '${fieldName}'`);fields.push({name:fieldName,type});}
    this.expect("}");if(this.at(";"))this.next();if(fields.length===0)throw new UnsupportedFeature("K3c-section-vars0 does not yet implement empty classes");
    return{kind:"class",name,params,fields,availableLevels:[...this.state.universeParams]};
  }
  private parseInstanceDeclaration():SurfaceDeclaration{
    this.expectId("instance");let priority=1000;
    if(this.at("(")){this.next();this.expectId("priority");this.expect(":=");const p=this.expectKind("num","instance priority");priority=Number(p.text);if(!Number.isSafeInteger(priority)||priority<0)throw new ParseError("instance priority must be a nonnegative safe integer");this.expect(")");}
    const binders:SurfaceBinder[]=[];
    const takeInstanceBinder=()=>{const group=this.parseValueBinderGroup();for(const b of group){const info=b.binderInfo??"explicit";if(info!=="implicit"&&info!=="strictImplicit"&&info!=="instImplicit")throw new UnsupportedFeature("K3c-section-vars0 instance declarations support hidden type binders and instance-implicit prerequisites only");binders.push(b);}};
    while(this.canStartValueBinder()&&!this.at("("))takeInstanceBinder();
    let name:string;let anonymous=false;
    if(this.at(":")){anonymous=true;name=`__inst_${this.state.commandIndex}`;}else{name=this.expectKind("id","instance name").text;while(this.at("{")||this.at("⦃")||this.at("["))takeInstanceBinder();}
    this.expect(":");const type=this.parseTerm();this.expect(":=");const value=this.parseTerm();if(this.at(";"))this.next();
    return{kind:"instance",name,binders,type,value,priority,anonymous,availableLevels:[...this.state.universeParams]};
  }

  private parseStructureDeclaration():SurfaceDeclaration{
    this.expectId("structure");const name=this.expectKind("id","structure name").text;
    if(this.at("("))throw new UnsupportedFeature("K3c-section-vars0 does not yet implement structure parameters");
    if(this.at(":")){this.next();const declaredType=this.parseTerm();if(declaredType.tag!=="sort")throw new UnsupportedFeature("PSC-1 structure result type must be Type/Sort in the current reference-governed slice");}
    if(this.atId("where"))this.next();
    // K2c deliberately starts with parameterless structures. The following
    // brace is the field block, not an implicit parameter binder.
    this.expect("{");const fields:{name:string;type:SurfaceTerm;binderInfo?:"explicit"|"implicit"|"strictImplicit"|"instImplicit"}[]=[];
    while(!this.at("}")){
      if(this.at("{")){
        const implicitFields=this.parseValueBinderGroup();
        this.expect(";");
        for(const field of implicitFields){
          if(fields.some(f=>f.name===field.name))throw new ParseError(`duplicate structure field '${field.name}'`);
          fields.push({name:field.name,type:field.type,binderInfo:field.binderInfo});
        }
        continue;
      }
      const fieldName=this.expectKind("id","structure field name").text;this.expect(":");const type=this.parseTerm();this.expect(";");
      if(fields.some(f=>f.name===fieldName))throw new ParseError(`duplicate structure field '${fieldName}'`);
      fields.push({name:fieldName,type,binderInfo:"explicit"});
    }
    this.expect("}");if(this.at(";"))this.next();
    if(fields.length===0)throw new UnsupportedFeature("K3c-section-vars0 does not yet implement empty structures");
    return{kind:"structure",name,fields,availableLevels:[...this.state.universeParams]};
  }
  private parseInductiveDeclaration():SurfaceDeclaration{
    this.expectId("inductive");const name=this.expectKind("id","inductive name").text;
    const params:SurfaceBinder[]=[];while(this.at("("))params.push(...this.parseExplicitBinderGroup());
    if(this.at("{")||this.at("⦃")||this.at("["))throw new UnsupportedFeature("K3c-section-vars0 currently implements explicit inductive parameters only");
    let type:SurfaceTerm={tag:"sort",level:{tag:"succ",of:{tag:"zero"}}};if(this.at(":")){this.next();type=this.parseTerm();}
    const numIndices=countLeadingSurfacePis(type);
    if(this.atId("where"))this.next();
    this.expect("{");const constructors:{name:string;binders:SurfaceBinder[];result?:SurfaceTerm}[]=[];
    while(!this.at("}")){
      this.expect("|");const ctorName=this.expectKind("id","constructor name").text;const binders:SurfaceBinder[]=[];while(this.at("("))binders.push(...this.parseExplicitBinderGroup());
      let result:SurfaceTerm|undefined;if(this.at(":")){this.next();result=this.parseTerm();}
      else if(numIndices>0)throw new UnsupportedFeature("K3c-section-vars0 requires an explicit constructor result for indexed inductives");
      if(this.at(";"))this.next();
      constructors.push({name:ctorName,binders,result});
    }
    this.expect("}");if(this.at(";"))this.next();if(constructors.length===0)throw new UnsupportedFeature("K3c-section-vars0 does not yet implement empty inductives");
    return{kind:"inductive",name,params,type,constructors,availableLevels:[...this.state.universeParams]};
  }
  private makeBinderParserHost():BinderParserHost{return{
    at:(text)=>this.at(text),
    peek:(ahead=0)=>this.peek(ahead),
    next:()=>this.next(),
    expect:(text)=>this.expect(text),
    expectKind:(kind,what)=>this.expectKind(kind,what),
    parseTerm:()=>this.parseTerm(),
    commandIndex:()=>this.state.commandIndex,
    cursorIndex:()=>this.i
  };}
  private parseExplicitBinderGroup():SurfaceBinder[]{return parseExplicitBinderGroupFromHost(this.makeBinderParserHost());}
  private canStartValueBinder():boolean{return binderCanStartValueBinder(this.makeBinderParserHost());}
  private parseValueBinderGroup():SurfaceBinder[]{return parseValueBinderGroupFromHost(this.makeBinderParserHost());}
  private parseTerm():SurfaceTerm{return parseTermFromHost(this.makeExpressionParserHost());}
  private makeExpressionParserHost():ExpressionParserHost{return{
    at:(text)=>this.at(text),
    atId:(text)=>this.atId(text),
    peek:(ahead=0)=>this.peek(ahead),
    next:()=>this.next(),
    expect:(text)=>this.expect(text),
    tokens:()=>this.tokens,
    cursorIndex:()=>this.i,
    parseSpecialTerm:()=>{
      if(this.atId("match"))return this.parseMatch();
      if(this.atId("bif"))return this.parseBif();
      if(this.atId("if"))return this.parseBoolIf();
      if(this.atId("fun"))return this.parseLambda();
      if(this.atId("do"))return this.parseDoBlock();
      if(this.at("∀")||this.atId("forall"))return this.parseForall();
      return undefined;
    },
    parseAtom:()=>this.parseAtom()
  };}

  private parseDoBlock():SurfaceTerm{
    this.expectId("do");this.expect("{");
    const binds:{name:string;value:SurfaceTerm}[]=[];const seen=new Set<string>();
    while(this.peek().kind==="id"&&(this.peek(1).text==="<-"||this.peek(1).text==="←")){
      const name=this.next().text;
      if(seen.has(name))throw new UnsupportedFeature(`PSC-1 P5.17 do-notation does not yet support rebinding do variable '${name}'`);
      seen.add(name);this.next();
      const value=this.parseTerm();this.expect(";");binds.push({name,value});
    }
    if(binds.length===0)throw new UnsupportedFeature("PSC-1 P5.17 do-notation requires at least one monadic bind statement");
    const body=this.parseTerm();
    if(this.at(";"))throw new ParseError("PSC-1 P5.17 do-notation final expression must not have a trailing semicolon");
    this.expect("}");
    return{tag:"do",binds,body};
  }

  private parseBoolIf():SurfaceTerm{
    this.expectId("if");
    if(this.at("(")){
      this.next();const condition=this.parseTerm();this.expect(")");
      if(this.at("{")){
        this.next();const thenBranch=this.parseDefBodySequence();this.expect("}");
        if(!this.atId("else"))throw new ParseError("PSC-1 v0.6.1 braced if requires `else` after the then branch");
        this.expectId("else");this.expect("{");const elseBranch=this.parseDefBodySequence();this.expect("}");
        return makeBoolIf(condition,thenBranch,elseBranch);
      }
      if(!this.atId("then"))throw new ParseError("PSC-1 Boolean if requires `then` after a parenthesized condition unless using `if (c) { t } else { e }`");
      this.expectId("then");const thenBranch=this.parseTerm();
      if(!this.atId("else"))throw new ParseError("PSC-1 Boolean if requires `else` after the then-branch; use `if b then t else e`");
      this.expectId("else");const elseBranch=this.parseTerm();
      return makeBoolIf(condition,thenBranch,elseBranch);
    }
    const condition=this.parseTerm();
    if(!this.atId("then"))throw new ParseError("PSC-1 Boolean if requires `then` after the condition; use `if b then t else e`");
    this.expectId("then");const thenBranch=this.parseTerm();
    if(!this.atId("else"))throw new ParseError("PSC-1 Boolean if requires `else` after the then-branch; use `if b then t else e`");
    this.expectId("else");const elseBranch=this.parseTerm();
    return makeBoolIf(condition,thenBranch,elseBranch);
  }

  private parseBif():SurfaceTerm{
    this.expectId("bif");this.expect("(");const condition=this.parseTerm();this.expect(")");
    this.expect("{");const thenBranch=this.parseDefBodySequence();this.expect("}");
    this.expectId("else");this.expect("{");const elseBranch=this.parseDefBodySequence();this.expect("}");
    return makeBoolIf(condition,thenBranch,elseBranch);
  }
  private parseMatch():SurfaceTerm{
    this.expectId("match");
    let scrutinee:SurfaceTerm;
    if(this.at("(")){
      this.next();scrutinee=this.parseTerm();this.expect(")");
    }else{
      scrutinee=this.parseTerm();
      if(!this.atId("with"))throw new ParseError("PSC-1 v0.6.1 match requires `with` after an unparenthesized scrutinee; legacy form is `match (x) { ... }`");
      this.expectId("with");
    }
    this.expect("{");
    const cases:{pattern:SurfacePattern;body:SurfaceTerm}[]=[];
    while(!this.at("}")){
      this.expect("|");const pattern=this.parsePattern("match");
      this.expect("=>");const body=this.parseTerm();
      if(this.at(";"))this.next();
      cases.push({pattern,body});
    }
    this.expect("}");if(cases.length===0)throw new ParseError("match requires at least one alternative");
    if(cases.some((c,i)=>c.pattern.tag==="wildcard"&&i!==cases.length-1))throw new UnsupportedFeature("K3c-section-vars0 currently requires wildcard match pattern '_' to be the final alternative");
    return{tag:"match",scrutinee,cases};
  }
  private parsePattern(where:"match"|"equation"):SurfacePattern{return parsePatternFromHost(this.makePatternParserHost(),where);}
  private makePatternParserHost():PatternParserHost{return{
    at:(text)=>this.at(text),
    peek:(ahead=0)=>this.peek(ahead),
    next:()=>this.next(),
    expectKind:(kind,what)=>this.expectKind(kind,what),
    currentNamespace:()=>this.currentNamespace(),
    currentOpenNamespaces:()=>this.currentOpenNamespaces()
  };}

  private parseLambda():SurfaceTerm{this.next();const binders:{name:string;type?:SurfaceTerm;binderInfo?:"explicit"|"implicit"|"strictImplicit"|"instImplicit"}[]=[];while(true){if(this.canStartValueBinder()){binders.push(...this.parseValueBinderGroup());continue;}if(this.peek().kind==="id"){binders.push({name:this.next().text,binderInfo:"explicit"});continue;}break;}if(binders.length===0)throw new ParseError("canonical ProofScript lambda requires at least one binder");this.expect("=>");return{tag:"lam",binders,body:this.parseTerm()};}
  private parseForall():SurfaceTerm{this.next();if(!this.canStartValueBinder())throw new ParseError("forall requires at least one binder");const binders:SurfaceBinder[]=[];while(this.canStartValueBinder())binders.push(...this.parseValueBinderGroup());this.expect(",");let body=this.parseTerm();for(let i=binders.length-1;i>=0;i--)body={tag:"pi",binder:binders[i],body};return body;}
  private parseAtom():SurfaceTerm{
    const t=this.peek();if(t.text==="("){this.next();const inner=this.parseTerm();this.expect(")");return inner;}
    if(t.text==="[")return this.parseArrayLiteral();
    if(t.text==="{")return this.parseStructureInstance();
    if(t.kind==="id"){
      this.next();if(t.text==="Prop")return{tag:"sort",level:{tag:"zero"}};
      if(t.text==="Type"){const level=this.canStartOptionalTypeLevel()?{tag:"succ",of:this.parseLevel()} as SurfaceLevel:{tag:"succ",of:{tag:"zero"}} as SurfaceLevel;return{tag:"sort",level};}
      if(t.text==="Sort")return{tag:"sort",level:this.parseLevel()};
      if(t.text==="true")return{tag:"boolLit",value:true};
      if(t.text==="false")return{tag:"boolLit",value:false};
      if(t.text==="by")throw new UnsupportedFeature("K3c-section-vars0 does not implement tactic syntax ('by')");if(["then","else"].includes(t.text))throw new ParseError(`unexpected ${t.text} without matching if-expression`);if(["let","have","return"].includes(t.text))throw new UnsupportedFeature(`K3c-section-vars0 does not implement ProofScript term '${t.text}' yet`);
      let levels:SurfaceLevel[]|undefined;if(this.at(".")&&this.peek(1).text==="{"){this.next();this.next();levels=[];if(this.at("}"))throw new ParseError("explicit universe application cannot be empty");while(true){levels.push(this.parseLevel());if(!this.at(","))break;this.next();}this.expect("}");}
      return{tag:"name",name:t.text,levels,namespacePath:this.currentNamespace(),openNamespaces:this.currentOpenNamespaces()};
    }
    if(t.kind==="num"){this.next();const value=Number(t.text);if(!Number.isSafeInteger(value))throw new UnsupportedFeature("K3c-section-vars0 numeric literal exceeds the safe parser integer range");return{tag:"natLit",value};}
    if(t.kind==="str"){this.next();return{tag:"stringLit",value:t.text};}
    throw new ParseError(`expected term at offset ${t.offset}, found '${t.text}'`);
  }
  private parseArrayLiteral():SurfaceTerm{
    this.expect("[");const items:SurfaceTerm[]=[];
    if(!this.at("]")){
      while(true){
        items.push(this.parseTerm());
        if(!this.at(","))break;
        this.next();
        if(this.at("]"))break;
      }
    }
    this.expect("]");return{tag:"arrayLit",items};
  }
  private parseStructureInstance():SurfaceTerm{return parseStructureInstanceFromHost(this.makeStructureTermParserHost());}
  private makeStructureTermParserHost():StructureTermParserHost{return{
    at:(text)=>this.at(text),
    atId:(text)=>this.atId(text),
    peek:(ahead=0)=>this.peek(ahead),
    next:()=>this.next(),
    expect:(text)=>this.expect(text),
    expectId:(text)=>this.expectId(text),
    expectKind:(kind,what)=>this.expectKind(kind,what),
    parseTerm:()=>this.parseTerm(),
    currentNamespace:()=>this.currentNamespace(),
    currentOpenNamespaces:()=>this.currentOpenNamespaces()
  };}
  private makeLevelParserHost():LevelParserHost{return{
    at:(text)=>this.at(text),
    peek:(ahead=0)=>this.peek(ahead),
    next:()=>this.next(),
    expectKind:(kind,what)=>this.expectKind(kind,what),
    universeParams:()=>this.state.universeParams
  };}
  private canStartOptionalTypeLevel():boolean{return levelCanStartOptionalTypeLevel(this.makeLevelParserHost());}
  private parseLevel():SurfaceLevel{return parseLevelFromHost(this.makeLevelParserHost());}
}
