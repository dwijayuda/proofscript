import {spawnSync} from "node:child_process";

export const PINNED_LEAN_VERSION="4.33.1";
export const PINNED_LEAN_RELEASE="v4.33.1";
export const PINNED_LEAN_RELEASE_COMMIT="819816b2e0a3bf405af45ae5c7af2491d8f5bee6";
export const PINNED_LEAN_RELEASE_COMMIT_SHORT="819816b";
export const PINNED_LEAN_LINUX_TAR_ZST_SHA256="890afd185370f85666025b883914ab4f4b339136f8c96167b69cfb62aecaf235";
export const PINNED_LEAN_LINUX_ZIP_SHA256="0376ac87487246b40dd077268c097e701f552e94c6d020d2373b50c7444fa22f";

export function parseLeanVersion(text){
  const match=String(text??"").match(/\bversion\s+([0-9]+\.[0-9]+\.[0-9]+)\b/i);
  return match?.[1];
}
export function parseLeanCommit(text){
  const match=String(text??"").match(/\bcommit\s+([0-9a-f]{7,40})\b/i);
  return match?.[1]?.toLowerCase();
}

export function probeLean(binary="lean"){
  const r=spawnSync(binary,["--version"],{encoding:"utf8"});
  if(r.error||r.status!==0){
    return {status:"unsupported",binary,message:r.error?.message??(r.stderr||r.stdout||`unable to execute ${binary}`).trim()};
  }
  const output=(r.stdout||r.stderr||"").trim();
  const version=parseLeanVersion(output);
  const commit=parseLeanCommit(output);
  if(!version)return{status:"unsupported",binary,output,message:`unable to parse Lean version from: ${output}`};
  if(version!==PINNED_LEAN_VERSION)return{status:"unsupported",binary,version,commit,output,message:`pinned Lean ${PINNED_LEAN_VERSION} required, found ${version}`};
  if(!commit)return{status:"unsupported",binary,version,output,message:`pinned Lean ${PINNED_LEAN_VERSION} release commit ${PINNED_LEAN_RELEASE_COMMIT_SHORT} required, but --version did not report a commit`};
  if(commit!==PINNED_LEAN_RELEASE_COMMIT)return{status:"unsupported",binary,version,commit,output,message:`pinned Lean ${PINNED_LEAN_VERSION} release commit ${PINNED_LEAN_RELEASE_COMMIT_SHORT} required, found ${commit.slice(0,8)}`};
  return{status:"accepted",binary,version,commit,output};
}
