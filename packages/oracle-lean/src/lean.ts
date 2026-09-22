import {spawnSync} from "node:child_process";

export const PINNED_LEAN_VERSION="4.33.1" as const;
export const PINNED_LEAN_RELEASE_COMMIT="819816b2e0a3bf405af45ae5c7af2491d8f5bee6" as const;

export interface LeanProbeAccepted { status:"accepted"; binary:string; version:string; commit:string; output:string; }
export interface LeanProbeUnsupported { status:"unsupported"; binary:string; version?:string; commit?:string; output?:string; message:string; }
export type LeanProbe=LeanProbeAccepted|LeanProbeUnsupported;

export function parseLeanVersion(text:string):string|undefined{
  return String(text??"").match(/\bversion\s+([0-9]+\.[0-9]+\.[0-9]+)\b/i)?.[1];
}
export function parseLeanCommit(text:string):string|undefined{
  return String(text??"").match(/\bcommit\s+([0-9a-f]{7,40})\b/i)?.[1]?.toLowerCase();
}

export function probeLean(binary="lean"):LeanProbe{
  const r=spawnSync(binary,["--version"],{encoding:"utf8"});
  if(r.error||r.status!==0)return{status:"unsupported",binary,message:r.error?.message??(r.stderr||r.stdout||`unable to execute ${binary}`).trim()};
  const output=(r.stdout||r.stderr||"").trim();
  const version=parseLeanVersion(output);const commit=parseLeanCommit(output);
  if(!version)return{status:"unsupported",binary,output,message:`unable to parse Lean version from: ${output}`};
  if(version!==PINNED_LEAN_VERSION)return{status:"unsupported",binary,version,commit,output,message:`Lean oracle requires pinned ${PINNED_LEAN_VERSION}, found ${version}`};
  if(!commit)return{status:"unsupported",binary,version,output,message:`Lean oracle requires official ${PINNED_LEAN_VERSION} release commit ${PINNED_LEAN_RELEASE_COMMIT.slice(0,8)}, but --version did not report a commit`};
  if(commit!==PINNED_LEAN_RELEASE_COMMIT)return{status:"unsupported",binary,version,commit,output,message:`Lean oracle requires official ${PINNED_LEAN_VERSION} release commit ${PINNED_LEAN_RELEASE_COMMIT.slice(0,8)}, found ${commit.slice(0,8)}`};
  return{status:"accepted",binary,version,commit,output};
}
