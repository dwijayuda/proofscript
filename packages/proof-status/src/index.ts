import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";

export type AnyRecord = Record<string, any>;

export function sha256Text(text: unknown): string { return crypto.createHash("sha256").update(String(text)).digest("hex"); }
export function sha256File(file: string): string { return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex"); }

export function readProofClaims(file?: string): AnyRecord {
  if (!file) return { schema: "proofscript.lean-proofs.v1", proofs: [] };
  const raw = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), file), "utf8")) as AnyRecord;
  if (raw.schema !== "proofscript.lean-proofs.v1") throw new Error("expected proofscript.lean-proofs.v1 proofs artifact");
  return raw;
}
export function proofForObligation(proofsArtifact: AnyRecord | undefined, obligation: AnyRecord): AnyRecord | undefined {
  const rawProofs = proofsArtifact?.proofs ?? [];
  const proofs: AnyRecord[] = Array.isArray(rawProofs)
    ? rawProofs
    : Object.entries(rawProofs).map(([id, value]) => ({ id, ...(value && typeof value === "object" ? value as object : { body: String(value) }) }));
  return proofs.find(p => p.id === obligation.id || p.name === obligation.name || p.theorem === obligation.name);
}
export function leanProofBody(proof?: AnyRecord): string {
  if (!proof) return "";
  if (typeof proof.body === "string") return proof.body.trim();
  if (typeof proof.proof === "string") return proof.proof.trim();
  return "";
}
export function leanCheckTextFromProofs(obligations: AnyRecord, proofsArtifact: AnyRecord): {text:string;checked:number} {
  const lines = [
    "/- ProofScript Lean obligation check file.",
    "   This file checks only user-supplied Lean proof bodies for exact generated theorem statements. -/",
    "",
  ];
  let checked = 0;
  for (const o of obligations.obligations ?? []) {
    const proof = proofForObligation(proofsArtifact, o);
    const body = leanProofBody(proof);
    if (!body) continue;
    if (/\b(admit|sorry|axiom)\b/.test(body)) throw new Error(`proof body for ${o.id} uses forbidden admit/sorry/axiom`);
    const theorem = o.exactTheoremStatement ?? o.theoremStatement;
    if (typeof theorem !== "string" || !theorem.startsWith("theorem ")) throw new Error(`obligation ${o.id} does not have an exact theorem statement`);
    lines.push(`-- obligation ${o.id}`, `${theorem} := ${body}`, "");
    checked += 1;
  }
  return { text: lines.join("\n"), checked };
}
export function runLeanObligationCheck({ leanCmd, leanFile }: {leanCmd:string;leanFile:string}): AnyRecord {
  const result = spawnSync(leanCmd, [leanFile], { cwd: process.cwd(), encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], shell: false });
  return { exitCode: result.status ?? 1, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}
export function createProofStatusArtifact(args: AnyRecord): AnyRecord {
  const { obligations, obligationsPath, outPath, proofsArtifact, leanCmd, leanOut, packageVersion, checkpoint = "KA-143 verification package extraction" } = args;
  if (obligations.schema !== "proofscript.obligations.v1") throw new Error("expected proofscript.obligations.v1 artifact");
  let leanCheck: AnyRecord = { status: "skipped", reason: "no --lean-cmd provided", checked: 0 };
  const checkedIds = new Set<string>();
  if (leanCmd) {
    const generated = leanCheckTextFromProofs(obligations, proofsArtifact);
    fs.mkdirSync(path.dirname(leanOut), { recursive: true });
    fs.writeFileSync(leanOut, generated.text);
    const run = runLeanObligationCheck({ leanCmd, leanFile: leanOut });
    if (run.exitCode !== 0) throw Object.assign(new Error(`Lean obligation check failed with exit ${run.exitCode}`), { leanResult: { leanCmd, leanFile: leanOut, leanExitCode: run.exitCode, stdout: run.stdout, stderr: run.stderr } });
    for (const o of obligations.obligations ?? []) if (leanProofBody(proofForObligation(proofsArtifact, o))) checkedIds.add(o.id);
    leanCheck = {
      status: "accepted", command: leanCmd,
      file: path.relative(path.dirname(outPath), leanOut).replace(/\\/g, "/"),
      sha256: sha256File(leanOut), checked: generated.checked,
      stdoutSha256: sha256Text(run.stdout), stderrSha256: sha256Text(run.stderr),
    };
  }
  const items = (obligations.obligations ?? []).map((o: AnyRecord) => {
    const body = leanProofBody(proofForObligation(proofsArtifact, o)), checked = checkedIds.has(o.id);
    return { id:o.id,name:o.name,kind:o.kind,statementSha256:o.statementSha256,theoremSha256:o.theoremSha256,status:checked?"checked":"unproved",proof:body?{language:"lean",bodySha256:sha256Text(body),checkedByLean:checked}:null,stale:false };
  });
  const checkedCount = items.filter((o: AnyRecord) => o.status === "checked").length;
  return {
    schema:"proofscript.proof-status.v1",checkpoint,packageVersion,source:obligations.source,
    obligationsArtifact:{path:path.relative(path.dirname(outPath),obligationsPath).replace(/\\/g,"/"),sha256:sha256File(obligationsPath)},
    leanCheck,obligations:items,
    summary:{total:items.length,checked:checkedCount,proved:checkedCount,unproved:items.length-checkedCount},
    trustBoundary:{semanticProofChecking:checkedCount>0,leanBackedChecking:Boolean(leanCmd),staleProofDetection:true,loopInvariantChecking:items.some((o:AnyRecord)=>String(o.kind).startsWith("loop."))?"structural-obligations-only":undefined,vcgenConnected:false,hiddenAxiomsIntroduced:false,fullLean4Equivalence:false},
  };
}
export function verifyProofStatusArtifact({ artifact, artifactPath }: {artifact:AnyRecord;artifactPath:string}): AnyRecord {
  const sourcePath = artifact.source?.path ? path.resolve(process.cwd(), artifact.source.path) : undefined;
  if (!sourcePath || !fs.existsSync(sourcePath)) throw new Error("proof-status source is missing or unreadable");
  const actualSource = sha256File(sourcePath);
  if (actualSource !== artifact.source.sha256) throw Object.assign(new Error("source hash mismatch; proof-status is stale"), { expected:artifact.source.sha256,actual:actualSource });
  const obligationsPath = artifact.obligationsArtifact?.path ? path.resolve(path.dirname(artifactPath), artifact.obligationsArtifact.path) : undefined;
  if (!obligationsPath || !fs.existsSync(obligationsPath)) throw new Error("bound obligations artifact is missing or unreadable");
  const actualObligations = sha256File(obligationsPath);
  if (actualObligations !== artifact.obligationsArtifact.sha256) throw Object.assign(new Error("obligations hash mismatch; proof-status is stale"), { expected:artifact.obligationsArtifact.sha256,actual:actualObligations });
  const result: AnyRecord = { source:{path:sourcePath,sha256:actualSource},obligationsArtifact:{path:obligationsPath,sha256:actualObligations},summary:artifact.summary };
  if (artifact.leanCheck?.file && artifact.leanCheck?.sha256) {
    const leanCheckPath = path.resolve(path.dirname(artifactPath), artifact.leanCheck.file);
    if (!fs.existsSync(leanCheckPath)) throw new Error("bound Lean check file is missing or unreadable");
    const actualLeanCheck = sha256File(leanCheckPath);
    if (actualLeanCheck !== artifact.leanCheck.sha256) throw Object.assign(new Error("Lean check hash mismatch; proof-status is stale"), { expected:artifact.leanCheck.sha256,actual:actualLeanCheck });
    result.leanCheck = { ...artifact.leanCheck, path: leanCheckPath, sha256: actualLeanCheck };
  }
  return result;
}
