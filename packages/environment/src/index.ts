import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { CoreArtifact, Environment, TypeclassEnvironmentMetadata, checkAndAddDeclaration } from "@proofscript/kernel";
import { decodeArtifact } from "@proofscript/kernel-codec";

export interface ElaborationGlobalInfo { name:string; levelParams:string[]; }
export interface PreparedCoreEnvironment { artifact:CoreArtifact; globals:ElaborationGlobalInfo[]; typeclasses:TypeclassEnvironmentMetadata; }

export function prepareCoreEnvironment(artifact:CoreArtifact):PreparedCoreEnvironment{
  // PSC-1 bootstrap artifacts include recursive parameterized/indexed prelude
  // declarations.  Replaying them through the legacy default profile is too
  // weak; use the active kernel-conformance profile for frontend/elaboration
  // preparation while preserving the artifact's own replay metadata elsewhere.
  const env=new Environment({ implementationProfile: "KERNEL-level-instantiation-conformance1" });
  for(const decl of artifact.declarations)checkAndAddDeclaration(env,decl);
  const globals=env.all().map(entry=>({name:entry.declaration.name,levelParams:[...entry.declaration.levelParams]}));
  return{artifact,globals,typeclasses:artifact.typeclasses};
}

export function loadStandardBootstrap():PreparedCoreEnvironment{
  const req=createRequire(__filename);
  const pkg=req.resolve("@proofscript/std/package.json");
  const filename=path.join(path.dirname(pkg),"core","bootstrap.pscore.json");
  const artifact=decodeArtifact(JSON.parse(fs.readFileSync(filename,"utf8")));
  return prepareCoreEnvironment(artifact);
}

function matchesStandardBootstrapPrefix(actual: CoreArtifact["declarations"][number], expected: CoreArtifact["declarations"][number]): boolean {
  if (JSON.stringify(actual) === JSON.stringify(expected)) return true;
  // Some production profiles replace a bootstrap token inductive with a more
  // precise checked mirror at the same canonical name, e.g. P3's executable
  // Int mirror.  It is still a bootstrap-position declaration for Lean export:
  // the emitted Lean source must rely on Lean's built-in Int rather than
  // redeclaring it.
  return actual.kind === "inductive" && expected.kind === "inductive" && actual.name === expected.name;
}

export function stripStandardBootstrap(artifact:CoreArtifact):CoreArtifact | undefined {
  const standard=loadStandardBootstrap().artifact;
  if(artifact.declarations.length < standard.declarations.length)return undefined;
  for(let i=0;i<standard.declarations.length;i++){
    if(!matchesStandardBootstrapPrefix(artifact.declarations[i]!,standard.declarations[i]!))return undefined;
  }
  const {modules: _modules, ...withoutModules}=artifact;
  return {...withoutModules,declarations:artifact.declarations.slice(standard.declarations.length)};
}
