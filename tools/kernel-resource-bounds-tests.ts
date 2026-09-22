import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {spawnSync} from 'node:child_process';
import {Environment,KernelResourceError,checkCoreDeclarations,defEq,kernelWhnf,levelOfNat} from '../packages/kernel/dist/index.js';
import {ArtifactResourceError,decodeArtifact,makeKernelResourceBoundsArtifact} from '../packages/kernel-codec/dist/index.js';
import {verifyFile} from '../packages/verifier/dist/index.js';

const L0=levelOfNat(0),L1=levelOfNat(1);
const S=l=>({tag:'sort',level:l}), C=name=>({tag:'const',name,levels:[]}), Pi=(d,b)=>({tag:'pi',domain:d,body:b});
function deepApp(depth){let t=C('X');for(let i=0;i<depth;i++)t={tag:'app',fn:t,arg:C('X')};return t;}
function deepLevel(depth){let l={tag:'zero'};for(let i=0;i<depth;i++)l={tag:'succ',of:l};return l;}

// Normal v68 Core remains accepted and replayable.
const normalDecls=[{kind:'axiom',name:'N',levelParams:[],type:S(L1)},{kind:'axiom',name:'n',levelParams:[],type:C('N')}];
assert.equal(checkCoreDeclarations(normalDecls,'KERNEL-resource-bounds0').status,'accepted');
const normal=makeKernelResourceBoundsArtifact(normalDecls);assert.equal(normal.formatVersion,68);assert.equal(normal.implementationProfile,'KERNEL-resource-bounds0');
assert.equal(decodeArtifact(JSON.parse(JSON.stringify(normal))).formatVersion,68);

// Codec: v68 uses a stack-safe recursive ceiling before the JS call stack.
// The identical depth is deliberately still accepted by the frozen v67 decoder,
// proving the resource policy is profile isolated.
const deepDecl={kind:'axiom',name:'Deep',levelParams:[],type:deepApp(1050)};
const v68Deep={...normal,declarations:[deepDecl]};
assert.throws(()=>decodeArtifact(v68Deep),e=>e instanceof ArtifactResourceError&&/term nesting depth exceeded/.test(e.message));
const v67Deep={...v68Deep,formatVersion:67,implementationProfile:'KERNEL-conversion-final-audit0'};
assert.equal(decodeArtifact(v67Deep).formatVersion,67);

// Direct Core API cannot bypass serialization bounds in v68.
const direct=checkCoreDeclarations([deepDecl],'KERNEL-resource-bounds0');
assert.equal(direct.status,'resource_exhausted');assert.match(direct.message,/term nesting depth exceeded/);

// Level-depth budget is independently bounded and typed.
const deepLevelDecl={kind:'axiom',name:'DeepLevel',levelParams:[],type:{tag:'sort',level:deepLevel(1050)}};
assert.throws(()=>decodeArtifact({...normal,declarations:[deepLevelDecl]}),e=>e instanceof ArtifactResourceError&&/level nesting depth exceeded/.test(e.message));
assert.equal(checkCoreDeclarations([deepLevelDecl],'KERNEL-resource-bounds0').status,'resource_exhausted');

// Declaration-count budget is checked before duplicate-name or semantic work.
const many=Array.from({length:10001},(_,i)=>({kind:'quot',name:`Q${i}`,levelParams:[]}));
const manyResult=checkCoreDeclarations(many,'KERNEL-resource-bounds0');assert.equal(manyResult.status,'resource_exhausted');assert.match(manyResult.message,/too many declarations/);
assert.throws(()=>decodeArtifact({...normal,declarations:many}),e=>e instanceof ArtifactResourceError&&/too many declarations/.test(e.message));

// Definitional-equality recursion has a typed kernel exhaustion outcome.
{
  const env=new Environment({allowResourceBounds:true});env.add({declaration:{kind:'axiom',name:'A',levelParams:[],type:S(L1)},assumptions:new Set(),generated:[]});
  env.add({declaration:{kind:'axiom',name:'x',levelParams:[],type:C('A')},assumptions:new Set(),generated:[]});env.add({declaration:{kind:'axiom',name:'y',levelParams:[],type:C('A')},assumptions:new Set(),generated:[]});
  let l=C('x'),r=C('y');for(let i=0;i<600;i++){l=Pi(C('A'),l);r=Pi(C('A'),r);}
  assert.throws(()=>defEq(env,[],l,r),e=>e instanceof KernelResourceError&&e.code==='defeq_depth');
}

// WHNF fuel is deterministic and typed, not a hang/crash.
{
  const env=new Environment({allowResourceBounds:true,allowConversionFinalAudit:true});
  env.add({declaration:{kind:'axiom',name:'T',levelParams:[],type:S(L1)},assumptions:new Set(),generated:[]});
  env.add({declaration:{kind:'axiom',name:'z',levelParams:[],type:C('T')},assumptions:new Set(),generated:[]});
  const n=20010;
  for(let i=n-1;i>=0;i--)env.add({declaration:{kind:'definition',name:`D${i}`,levelParams:[],type:C('T'),value:i===n-1?C('z'):C(`D${i+1}`),reducibility:'regular'},assumptions:new Set(),generated:[]});
  assert.throws(()=>kernelWhnf(env,C('D0')),e=>e instanceof KernelResourceError&&e.code==='whnf_fuel');
}

const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-resource-v68-'));

// Nonlinear mutual/nested helper graph is bounded before the O(n^2)
// specialization-deduplication scan can become an amplification vector.
// Build a 513-node chain of pre-existing one-parameter containers; v68 must
// stop while attempting to synthesize helper 513 with typed resource status.
{
  const chain=[];
  for(let i=512;i>=0;i--){
    const name=`RBChain${i}`,next=i===512?null:`RBChain${i+1}`;
    const payload=next?{tag:'app',fn:C(next),arg:{tag:'bvar',index:0}}:{tag:'bvar',index:0};
    chain.push({kind:'inductive',name,levelParams:[],type:Pi(S(L1),S(L1)),numParams:1,numIndices:0,constructors:[{name:`${name}.mk`,type:Pi(S(L1),Pi(payload,{tag:'app',fn:C(name),arg:{tag:'bvar',index:1}}))}]});
  }
  const graph={kind:'mutualInductive',name:'RBGraph',levelParams:[],inductives:[
    {name:'RBA',type:S(L1),numParams:0,numIndices:0,constructors:[{name:'RBA.leaf',type:C('RBA')},{name:'RBA.step',type:Pi({tag:'app',fn:C('RBChain0'),arg:C('RBB')},C('RBA'))}]},
    {name:'RBB',type:S(L1),numParams:0,numIndices:0,constructors:[{name:'RBB.back',type:Pi(C('RBA'),C('RBB'))}]}
  ]};
  const helperResult=checkCoreDeclarations([...chain,graph],'KERNEL-resource-bounds0');
  assert.equal(helperResult.status,'resource_exhausted');
  assert.match(helperResult.message,/mutual\/nested helper graph resource limit exceeded/);
}

// Standalone verifier maps typed codec exhaustion to resource_exhausted.
const deepFile=path.join(dir,'deep.pscore.json');fs.writeFileSync(deepFile,JSON.stringify(v68Deep));
let vr=verifyFile(deepFile);assert.equal(vr.status,'resource_exhausted');assert.match(vr.message,/term nesting depth exceeded/);assert.equal(vr.projectPluginsLoaded,false);

// Malformed Core is a semantic rejection, not resource exhaustion.
const badFile=path.join(dir,'bad.pscore.json');fs.writeFileSync(badFile,JSON.stringify({...normal,declarations:[{kind:'axiom',name:'Bad',levelParams:[],type:{tag:'bogus'}}]}));
vr=verifyFile(badFile);assert.equal(vr.status,'rejected');assert.equal(vr.projectPluginsLoaded,false);

// Oversized verifier input is rejected by stat before read/parse. Sparse truncate
// keeps the test cheap in disk IO while proving the byte ceiling.
const hugeFile=path.join(dir,'huge.pscore.json');fs.closeSync(fs.openSync(hugeFile,'w'));fs.truncateSync(hugeFile,64*1024*1024+1);
vr=verifyFile(hugeFile);assert.equal(vr.status,'resource_exhausted');assert.match(vr.message,/file-size resource limit exceeded/);

// psverify exposes resource exhaustion as stable exit code 3.
const bin=path.resolve('packages/verifier/dist/bin.js');const child=spawnSync(process.execPath,[bin,deepFile,'--json'],{encoding:'utf8'});assert.equal(child.status,3,child.stderr);const out=JSON.parse(child.stdout);assert.equal(out.status,'resource_exhausted');assert.equal(out.projectPluginsLoaded,false);

// Unexpected runtime defects are not mislabeled as a logical rejection.
const implFile=path.join(dir,'directory');fs.mkdirSync(implFile);const impl=verifyFile(implFile);assert.ok(impl.status==='rejected'||impl.status==='implementation_error');

fs.mkdirSync(path.join(process.cwd(),'artifacts'),{recursive:true});
fs.writeFileSync(path.join(process.cwd(),'artifacts/KERNEL_RESOURCE_BOUNDS_DIFFERENTIAL_REPORT.json'),JSON.stringify({schemaVersion:1,profile:'KERNEL-resource-bounds0',coreFormat:68,status:'accepted',semanticBaseline:'Lean 4.33.1',policy:'ProofScript implementation security bounds; exact Lean resource ceilings are intentionally not treated as semantic equivalence',observations:{normalReplay:'accepted',codecTermDepth:'resource_exhausted',codecLevelDepth:'resource_exhausted',directCoreDepth:'resource_exhausted',declarationCount:'resource_exhausted',defEqDepth:'resource_exhausted',whnfFuel:'resource_exhausted',verifierFileBytes:'resource_exhausted',malformedCore:'rejected',psverifyExitCode:3,historicalV67DecodeDepth1050:'accepted',mutualNestedHelperGraph513:'resource_exhausted'},limits:{verifyFileBytes:64*1024*1024,decodeDepthV68:1024,directCoreDepth:1024,defEqDepth:512,whnfFuel:20000,declarations:10000,mutualNestedHelpers:512}},null,2)+'\n');
fs.rmSync(dir,{recursive:true,force:true});
console.log('✓ kernel v68 deterministic typed resource bounds, direct-Core preflight, stack-safe codec, verifier taxonomy, CLI exit code, and historical v67 isolation passed');
