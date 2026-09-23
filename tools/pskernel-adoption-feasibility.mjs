import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

const require=createRequire(import.meta.url);
const {checkSource}=require('@proofscript/compiler');
const {emitJavaScriptModule,emitTypeScriptModule}=require('@proofscript/backend-typescript');

let pk;
try {
  pk=await import('lean-ts-kernel');
} catch (error) {
  console.error('FAIL: external lean-ts-kernel package is not installed.');
  console.error('Install a packed PSKernel feasibility build without saving it:');
  console.error('  # in the pskernel feasibility checkout: npm pack');
  console.error('  # in this ProofScript checkout: npm install --no-save ../pskernel/lean-ts-kernel-0.1.0.tgz');
  throw error;
}

function fail(message){throw new Error(message);}
function mapBinderInfo(value){
  switch(value??'explicit'){
    case 'explicit': return 'default';
    case 'implicit': return 'implicit';
    case 'strictImplicit': return 'strictImplicit';
    case 'instImplicit': return 'instImplicit';
    default: return fail('unsupported ProofScript binder info: '+String(value));
  }
}
function mapLevel(level){
  switch(level.tag){
    case 'zero': return pk.levelZero;
    case 'succ': return pk.levelSucc(mapLevel(level.of));
    case 'max': return pk.mkMax(mapLevel(level.left),mapLevel(level.right));
    case 'imax': return pk.mkIMax(mapLevel(level.left),mapLevel(level.right));
    case 'param': return pk.levelParam(pk.nameFromDotted(level.name));
    case 'mvar': return fail('unresolved universe metavariable cannot cross the external-kernel boundary');
    default: return fail('unsupported ProofScript universe level');
  }
}
function mapLiteral(literal){
  switch(literal.tag){
    case 'nat': return {kind:'nat',value:BigInt(literal.value)};
    case 'str': return {kind:'string',value:literal.value};
    case 'int': return fail('Int literal is outside the first external-kernel feasibility slice');
    default: return fail('unsupported ProofScript literal');
  }
}
function mapTerm(term){
  switch(term.tag){
    case 'sort': return {kind:'sort',level:mapLevel(term.level)};
    case 'bvar': return {kind:'bvar',index:term.index};
    case 'const': return {kind:'const',name:pk.nameFromDotted(term.name),levels:term.levels.map(mapLevel)};
    case 'app': return {kind:'app',fn:mapTerm(term.fn),arg:mapTerm(term.arg)};
    case 'lam': return {kind:'lam',name:pk.anonymous,type:mapTerm(term.domain),body:mapTerm(term.body),binderInfo:mapBinderInfo(term.binderInfo)};
    case 'pi': return {kind:'forall',name:pk.anonymous,type:mapTerm(term.domain),body:mapTerm(term.body),binderInfo:mapBinderInfo(term.binderInfo)};
    case 'let': return {kind:'let',name:pk.anonymous,type:mapTerm(term.type),value:mapTerm(term.value),body:mapTerm(term.body)};
    case 'lit': return {kind:'lit',literal:mapLiteral(term.literal)};
    case 'proj': return {kind:'proj',typeName:pk.nameFromDotted(term.typeName),index:term.index,expr:mapTerm(term.expr)};
    default: return fail('unsupported ProofScript Core term in external-kernel feasibility slice: '+String(term.tag));
  }
}
function admitDefinition(declaration){
  if(declaration.kind!=='definition') fail('first feasibility slice accepts exactly one definition');
  const environment=new pk.Environment();
  const kernel=new pk.Kernel(environment);
  const name=pk.nameFromDotted(declaration.name);
  kernel.addDefinition({
    kind:'definition',
    name,
    levelParams:declaration.levelParams.map(pk.nameFromDotted),
    type:mapTerm(declaration.type),
    value:mapTerm(declaration.value),
    hints:declaration.reducibility==='abbrev'?{kind:'abbrev'}:{kind:'regular',height:0n},
    safety:'safe',
  });
  const admitted=environment.find(name);
  if(admitted?.kind!=='definition') fail('external PSKernel did not retain the admitted definition');
  return Object.freeze({
    kind:'proofscript-external-pskernel-admission/v1',
    declarationName:declaration.name,
    environment,
    admitted,
  });
}
function executeCommonJs(source){
  const module={exports:{}};
  const context={
    module,
    exports:module.exports,
    require,
    console,
    Object,
    BigInt,
  };
  vm.runInNewContext(source,context,{filename:'proofscript-feasibility.generated.cjs'});
  return module.exports;
}
function invokeCurried(fn,arity,value){
  let current=fn;
  for(let i=0;i<arity;i++){
    if(typeof current!=='function') fail('generated identity stopped being callable before declared arity');
    current=current(i===arity-1?value:null);
  }
  return current;
}

const source='function identity {α : Type}(x : α) : α := x;';
const checked=checkSource(source);
const user=checked.artifact.declarations.find((decl)=>decl.name==='identity');
if(!user) fail('canonical ProofScript frontend did not produce identity declaration');

const baselineJs=emitJavaScriptModule(checked.artifact,{sourceText:source});
const baselineTs=emitTypeScriptModule(checked.artifact,{sourceText:source});

const external=admitDefinition(user);

// The first spike deliberately keeps the mature ProofScript backend unchanged.
// Re-admission is a mandatory extra gate: emission occurs only after it succeeds.
const gatedJs=emitJavaScriptModule(checked.artifact,{sourceText:source});
const gatedTs=emitTypeScriptModule(checked.artifact,{sourceText:source});

if(gatedJs.js!==baselineJs.js) fail('external admission changed existing JavaScript emission');
if(gatedTs.ts!==baselineTs.ts) fail('external admission changed existing TypeScript emission');

const emitted=gatedJs.emitted.find((item)=>item.name==='identity');
if(!emitted) fail('identity was not emitted by the existing ProofScript backend');
const jsModule=executeCommonJs(gatedJs.js);
const jsResult=invokeCurried(jsModule.identity,emitted.arity,42n);
if(jsResult!==42n) fail('generated JavaScript identity did not return its runtime input');

const temp=fs.mkdtempSync(path.join(os.tmpdir(),'proofscript-pskernel-spike-'));
const tsPath=path.join(temp,'identity.ts');
fs.writeFileSync(tsPath,gatedTs.ts);
const tsc=path.resolve('node_modules/typescript/bin/tsc');
const compile=spawnSync(process.execPath,[tsc,tsPath,'--target','ES2022','--module','CommonJS','--moduleResolution','Node','--skipLibCheck','--outDir',temp],{encoding:'utf8'});
if(compile.status!==0){
  console.error(compile.stdout);
  console.error(compile.stderr);
  fail('generated TypeScript failed to compile');
}

console.log(JSON.stringify({
  status:'PASS',
  source,
  proofscriptDeclaration:user.name,
  externalKernelDeclaration:pk.nameToString(external.admitted.name),
  externalKernelPackage:'lean-ts-kernel',
  externalKernelCommit:'393919ca34eab3a42ae83dc8c296e120b4503d6f',
  javascriptByteStable:true,
  typescriptByteStable:true,
  runtimeResult:String(jsResult),
  emittedArity:emitted.arity,
},null,2));
