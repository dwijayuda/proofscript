import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { checkUnifiedSource, UNIFIED_INTEGRATION_PROFILE } from "@proofscript/unified-bridge";
import { decodeArtifact } from "@proofscript/kernel-codec";
import { verifyFile } from "@proofscript/verifier";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const sourcePath=path.join(root,"integration-fixtures/ui0/basic.ps");
const outDir=path.join(root,".integration/ui0");
fs.rmSync(outDir,{recursive:true,force:true}); fs.mkdirSync(outDir,{recursive:true});
const source=fs.readFileSync(sourcePath,"utf8");
const checked=checkUnifiedSource(source);
if(checked.kernelSummary.status!=="accepted")throw new Error(`kernel status ${checked.kernelSummary.status}`);
const artifactPath=path.join(outDir,"basic.pscore.json");
fs.writeFileSync(artifactPath,JSON.stringify(checked.coreArtifact,null,2)+"\n");
const decoded=decodeArtifact(JSON.parse(fs.readFileSync(artifactPath,"utf8")));
if(decoded.formatVersion!==68||decoded.implementationProfile!=="KERNEL-level-instantiation-conformance1")throw new Error("not Core v71 K3-TB resource-bounds profile");
const verified=verifyFile(artifactPath,new Set());
if(verified.status!=="accepted")throw new Error(`psverify rejected: ${verified.status} ${verified.message??""}`);
const tsPath=path.join(outDir,"basic.ts");
fs.writeFileSync(tsPath,checked.typescript+"\nconsole.log(`UI0_RESULT=${result().toString()}`);\n");
console.log(JSON.stringify({
  integrationProfile:UNIFIED_INTEGRATION_PROFILE,
  coreFormat:decoded.formatVersion,
  kernelProfile:decoded.implementationProfile,
  kernelStatus:checked.kernelSummary.status,
  verifierStatus:verified.status,
  declarations:checked.kernelSummary.declarations.map(d=>d.name).slice(-3),
  assumptions:checked.kernelSummary.assumptions,
  artifactPath,
  tsPath
},null,2));
