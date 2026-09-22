#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { checkProject, compileProgram, materializeLean, validateProgramForTarget, verifyWithLean, type ProjectCheckResult } from "./core/compiler.js";
import { createPersistentModuleReuseProvider, incrementalIdentityMatches, leanArtifactDescriptor, moduleInterfaceHash, planIncrementalProject, probeExactCacheHit, readIncrementalSnapshot, validateCachedLeanArtifacts, writeIncrementalCache, type IncrementalPlan } from "./core/incremental.js";
import { ProofScriptError } from "./core/errors.js";
import { loadProjectConfig, loadRegistry } from "./core/plugin-loader.js";
import { DEFAULT_LEAN_TOOLCHAIN, LEAN_SEMANTIC_BASELINE, PROOFSCRIPT_IR_SCHEMA, PROOFSCRIPT_REFERENCE, PROOFSCRIPT_REFERENCE_REVISION, PROOFSCRIPT_VERSION } from "./core/baseline.js";

const VERSION = PROOFSCRIPT_VERSION;
const extensions: Readonly<Record<string, string>> = { typescript: "ts", rust: "rs" };

async function main(argv: readonly string[]): Promise<void> {
  const [command, subject = ".", ...rest] = argv;
  if (!command || !["check", "plan", "build", "emit-lean", "verify", "certify"].includes(command)) {
    printUsage();
    throw new ProofScriptError("PS0001", `Unknown command '${command ?? ""}'.`);
  }

  if (command === "verify" && subject.endsWith(".pscert")) {
    await verifyCertificate(resolve(process.cwd(), subject));
    return;
  }

  const projectDir = resolve(process.cwd(), subject);
  const { config, configPath } = await loadProjectConfig(projectDir);
  const registry = await loadRegistry(configPath, config.plugins);
  const buildDir = join(projectDir, "build");
  const target = option(rest, "--target");
  const noCache = rest.includes("--no-cache");

  // Exact no-change fast paths are deliberately narrow: they require the same
  // compiler/baseline/plugin provenance and byte-identical sources for every
  // module previously recorded in the successful cache snapshot. Fine-grained
  // partial reuse after a change still requires rehydrating semantic interfaces.
  if (!noCache && ((command === "check" && !target) || command === "emit-lean")) {
    const probe = await probeExactCacheHit(projectDir, buildDir, config.entry, registry);
    if (probe.hit && probe.snapshot) {
      if (command === "check") {
        console.log(`CACHE HIT ${config.entry}: ${probe.snapshot.modules.length} module(s), no elaboration required`);
        console.log(`plugins: ${registry.installedPluginIds().length}`);
        console.log("incremental plan: 0 rebuild / all cached");
        console.log("formal verification: not run");
        return;
      }
      if (await validateCachedLeanArtifacts(buildDir, probe.snapshot)) {
        console.log(`CACHE HIT Lean source: ${join(buildDir, "program.lean")}`);
        console.log(`Lake workspace: ${join(buildDir, "lean-workspace")}`);
        console.log(`toolchain: ${DEFAULT_LEAN_TOOLCHAIN}`);
        return;
      }
    }
  }

  const previousIncremental = await readIncrementalSnapshot(buildDir);
  const partialReuseAllowed = !noCache && !target && (command === "check" || command === "plan" || command === "emit-lean") &&
    previousIncremental !== undefined && incrementalIdentityMatches(previousIncremental, config.entry, registry);
  const reuseModule = partialReuseAllowed && previousIncremental
    ? createPersistentModuleReuseProvider(buildDir, projectDir, previousIncremental, registry)
    : undefined;
  const project = await checkProject(projectDir, config.entry, registry, reuseModule ? { reuseModule } : {});
  const incrementalPlan = planIncrementalProject(project, projectDir, config.entry, previousIncremental);
  const entry = project.entry;
  const sourcePath = entry.path;
  const source = entry.source;
  const assumptions = projectDeclaredAssumptions(project);
  const assumptionStatus = assumptions.length === 0 ? "axiom-free" : "declared-assumptions";

  if (command === "check") {
    if (target) validateProgramForTarget(entry.program, entry.registry, target);
    await mkdir(buildDir, { recursive: true });
    await writeIncrementalCache(buildDir, projectDir, project, config.entry);
    console.log(`CHECKED ${config.entry}: ${entry.program.declarations.length} declaration(s), ${project.modules.length} module(s)`);
    console.log(`plugins: ${entry.registry.installedPluginIds().length}`);
    printIncrementalPlan(incrementalPlan);
    printIncrementalExecution(project);
    if (target) console.log(`target capability check: ${target} ✓`);
    console.log("formal verification: not run");
    return;
  }

  if (command === "plan") {
    printIncrementalPlan(incrementalPlan, true);
    printIncrementalExecution(project);
    return;
  }

  if (command === "emit-lean") {
    await mkdir(buildDir, { recursive: true });
    const reusedSourceModules = new Set(project.reusedModules ?? []);
    const materialized = await materializeLean(entry.program, entry.registry, buildDir, {
      reuseEntry: reusedSourceModules.has(entry.module),
      reuseModules: new Set([...reusedSourceModules].filter((module) => module !== entry.module).map((module) => `ProofScriptGenerated.${module}`)),
    });
    await writeFile(join(buildDir, "program.lean"), materialized.leanSource, "utf8");
    await writeIncrementalCache(buildDir, projectDir, project, config.entry, leanArtifactDescriptor(project));
    printIncrementalPlan(incrementalPlan);
    printIncrementalExecution(project);
    const reusedLeanCount = (materialized.reusedModules?.length ?? 0) + (materialized.entryReused ? 1 : 0);
    if (reusedLeanCount > 0) console.log(`Lean artifact reuse: ${reusedLeanCount} module source file(s) reused / ${(project.modules.length) - reusedLeanCount} rewritten`);
    console.log(`Lean source: ${join(buildDir, "program.lean")}`);
    console.log(`Lake workspace: ${materialized.workspace}`);
    console.log(`toolchain: ${DEFAULT_LEAN_TOOLCHAIN}`);
    return;
  }

  if (command === "verify") {
    if (target) validateProgramForTarget(entry.program, entry.registry, target);
    await mkdir(buildDir, { recursive: true });
    const verification = await verifyWithLean(entry.program, entry.registry, buildDir);
    await persistVerification(buildDir, verification.leanSource, { ...verification.report, assumptionStatus, assumptions });
    await writeIncrementalCache(buildDir, projectDir, project, config.entry, leanArtifactDescriptor(project));
    printIncrementalPlan(incrementalPlan);
    console.log(`verification: ${verification.report.status}`);
    console.log(`assumptions: ${assumptionStatus}${assumptions.length ? ` (${assumptions.length})` : ""}`);
    console.log(`Lean workspace: ${verification.report.workspace ?? join(buildDir, "lean-workspace")}`);
    return;
  }


  if (command === "certify" && !target) {
    await mkdir(buildDir, { recursive: true });
    const verification = await verifyWithLean(entry.program, entry.registry, buildDir);
    await persistVerification(buildDir, verification.leanSource, { ...verification.report, assumptionStatus, assumptions });
    await writeIncrementalCache(buildDir, projectDir, project, config.entry, leanArtifactDescriptor(project));
    const moduleDescriptors = projectModuleDescriptors(project, buildDir);
    const cert = {
      schema: "proofscript.certificate/v2",
      proofscript: VERSION,
      language: {
        reference: PROOFSCRIPT_REFERENCE,
        revision: PROOFSCRIPT_REFERENCE_REVISION,
        leanSemanticBaseline: LEAN_SEMANTIC_BASELINE,
      },
      status: verification.report.status === "kernel-checked" ? "certified" : "incomplete",
      source: { path: relative(buildDir, sourcePath), sha256: sha256(source) },
      semanticIr: { schema: PROOFSCRIPT_IR_SCHEMA, sha256: projectSemanticHash(project) },
      modules: moduleDescriptors,
      plugins: entry.registry.installedPlugins(),
      lean: {
        toolchain: DEFAULT_LEAN_TOOLCHAIN,
        sourceSha256: sha256(verification.leanSource),
        status: verification.report.status,
        checker: verification.report.checker ?? "none",
        semanticFeatures: verification.report.semanticFeatures,
        assumptionStatus,
        assumptions,
        modules: verification.report.modules ?? [],
      },
    };
    const certFile = join(buildDir, "program.pscert");
    await writeFile(certFile, JSON.stringify(cert, null, 2) + "\n", "utf8");
    printIncrementalPlan(incrementalPlan);
    console.log(`verification: ${verification.report.status}`);
    console.log(`assumptions: ${assumptionStatus}${assumptions.length ? ` (${assumptions.length})` : ""}`);
    console.log(`certificate: ${certFile}`);
    console.log(`certification status: ${cert.status}`);
    return;
  }

  if (!target) throw new ProofScriptError("PS0002", `Command '${command}' requires '--target <target>'.`);
  const result = compileProgram(entry.program, entry.registry, target);
  await mkdir(buildDir, { recursive: true });
  const targetFile = join(buildDir, `program.${extensions[target] ?? "txt"}`);
  await writeFile(targetFile, result.targetSource, "utf8");
  await writeFile(join(buildDir, "manifest.json"), JSON.stringify({
    proofscript: VERSION,
    target,
    entry: config.entry,
    language: {
      reference: PROOFSCRIPT_REFERENCE,
      revision: PROOFSCRIPT_REFERENCE_REVISION,
      leanSemanticBaseline: LEAN_SEMANTIC_BASELINE,
    },
    modules: projectModuleDescriptors(project, buildDir),
    plugins: entry.registry.installedPlugins(),
  }, null, 2) + "\n", "utf8");
  console.log(`built ${target}: ${targetFile}`);

  const legacyVerify = rest.includes("--verify");
  if (command === "build" && !legacyVerify) return;

  const verification = await verifyWithLean(result.program, entry.registry, buildDir);
  await persistVerification(buildDir, verification.leanSource, { ...verification.report, assumptionStatus, assumptions });
  await writeIncrementalCache(buildDir, projectDir, project, config.entry, leanArtifactDescriptor(project));
  console.log(`verification: ${verification.report.status}`);

  if (command === "certify") {
    const cert = {
      schema: "proofscript.certificate/v2",
      proofscript: VERSION,
      language: {
        reference: PROOFSCRIPT_REFERENCE,
        revision: PROOFSCRIPT_REFERENCE_REVISION,
        leanSemanticBaseline: LEAN_SEMANTIC_BASELINE,
      },
      status: verification.report.status === "kernel-checked" ? "certified" : "incomplete",
      source: { path: relative(buildDir, sourcePath), sha256: sha256(source) },
      semanticIr: { schema: PROOFSCRIPT_IR_SCHEMA, sha256: projectSemanticHash(project) },
      modules: projectModuleDescriptors(project, buildDir),
      plugins: entry.registry.installedPlugins(),
      lean: {
        toolchain: DEFAULT_LEAN_TOOLCHAIN,
        sourceSha256: sha256(verification.leanSource),
        status: verification.report.status,
        checker: verification.report.checker ?? "none",
        semanticFeatures: verification.report.semanticFeatures,
        assumptionStatus,
        assumptions,
        modules: verification.report.modules ?? [],
      },
      target: {
        id: target,
        path: relative(buildDir, targetFile),
        outputSha256: sha256(result.targetSource),
        correspondence: "not-yet-mechanically-proved",
      },
    };
    const certFile = join(buildDir, "program.pscert");
    await writeFile(certFile, JSON.stringify(cert, null, 2) + "\n", "utf8");
    console.log(`certificate: ${certFile}`);
    console.log(`certification status: ${cert.status}`);
  }
}

async function persistVerification(buildDir: string, leanSource: string, report: unknown): Promise<void> {
  await writeFile(join(buildDir, "program.lean"), leanSource, "utf8");
  await writeFile(join(buildDir, "verification.json"), JSON.stringify(report, null, 2) + "\n", "utf8");
}

async function verifyCertificate(certPath: string): Promise<void> {
  const certDir = dirname(certPath);
  const cert = JSON.parse(await readFile(certPath, "utf8")) as any;
  if (cert.schema !== "proofscript.certificate/v2") throw new ProofScriptError("PS6001", "Unsupported certificate schema.");
  if (cert.semanticIr?.schema !== PROOFSCRIPT_IR_SCHEMA) throw new ProofScriptError("PS6009", `Certificate semantic IR schema mismatch: expected ${PROOFSCRIPT_IR_SCHEMA}.`);
  if (cert.language?.revision !== PROOFSCRIPT_REFERENCE_REVISION || cert.language?.leanSemanticBaseline !== LEAN_SEMANTIC_BASELINE) {
    throw new ProofScriptError("PS6008", `Certificate language baseline mismatch: expected ${PROOFSCRIPT_REFERENCE_REVISION}/Lean ${LEAN_SEMANTIC_BASELINE}.`);
  }
  const sourcePath = resolve(certDir, cert.source.path);
  const source = await readFile(sourcePath, "utf8");
  if (sha256(source) !== cert.source.sha256) throw new ProofScriptError("PS6002", "Certificate source hash does not match current source.");

  const projectDir = resolve(certDir, "..");
  const { config, configPath } = await loadProjectConfig(projectDir);
  const registry = await loadRegistry(configPath, config.plugins);
  const project = await checkProject(projectDir, config.entry, registry);
  if (JSON.stringify(project.entry.registry.installedPlugins()) !== JSON.stringify(cert.plugins ?? [])) {
    throw new ProofScriptError("PS6010", "Installed plugin provenance does not match the certificate.");
  }
  const currentModules = projectModuleDescriptors(project, certDir);
  const currentAssumptions = projectDeclaredAssumptions(project);
  const currentAssumptionStatus = currentAssumptions.length === 0 ? "axiom-free" : "declared-assumptions";
  if (cert.lean?.assumptionStatus !== currentAssumptionStatus || JSON.stringify(cert.lean?.assumptions ?? []) !== JSON.stringify(currentAssumptions)) {
    throw new ProofScriptError("PS6012", "Declared axiom/assumption manifest does not match the certificate.");
  }
  if (JSON.stringify(currentModules) !== JSON.stringify(cert.modules ?? [])) {
    throw new ProofScriptError("PS6011", "Project module dependency/source/IR metadata does not match the certificate.");
  }

  let rebuiltProgram = project.entry.program;
  if (cert.target) {
    const targetPath = resolve(certDir, cert.target.path);
    const targetArtifact = await readFile(targetPath, "utf8");
    if (sha256(targetArtifact) !== cert.target.outputSha256) throw new ProofScriptError("PS6003", "Certificate target hash does not match current target artifact.");
    const rebuilt = compileProgram(project.entry.program, project.entry.registry, cert.target.id);
    if (sha256(rebuilt.targetSource) !== cert.target.outputSha256) throw new ProofScriptError("PS6004", "Rebuilt target does not match certified target hash.");
    rebuiltProgram = rebuilt.program;
  }
  if (projectSemanticHash(project) !== cert.semanticIr.sha256) throw new ProofScriptError("PS6005", "Rebuilt project semantic IR does not match certificate.");
  const replay = await verifyWithLean(rebuiltProgram, project.entry.registry, join(certDir, "verify-replay"));
  if (sha256(replay.leanSource) !== cert.lean.sourceSha256) throw new ProofScriptError("PS6006", "Regenerated Lean source does not match certificate.");
  const certifiedModules = JSON.stringify(cert.lean.modules ?? []);
  const replayModules = JSON.stringify(replay.report.modules ?? []);
  if (certifiedModules !== replayModules) throw new ProofScriptError("PS6007", "Lean plugin/project module hashes do not match certificate.");
  console.log("certificate hashes: valid");
  console.log(`Lean replay: ${replay.report.status}`);
  console.log(`original certification: ${cert.status}`);
  console.log(`assumptions: ${currentAssumptionStatus}${currentAssumptions.length ? ` (${currentAssumptions.length})` : ""}`);
}

function projectDeclaredAssumptions(project: ProjectCheckResult): readonly unknown[] {
  return [...project.modules]
    .sort((a, b) => a.module.localeCompare(b.module))
    .flatMap((item) => item.program.declarations.flatMap((declaration) => {
      if (declaration.kind !== "extension" || !["lean.axiom.proof", "lean.axiom.runtime"].includes(declaration.op)) return [];
      const payload = declaration.payload as { name: string; params?: readonly unknown[]; returnType?: unknown };
      return [{ module: item.module, name: payload.name, operation: declaration.op, params: payload.params ?? [], returnType: payload.returnType }];
    }));
}

function projectSemanticHash(project: ProjectCheckResult): string {
  const payload = [...project.modules]
    .sort((a, b) => a.module.localeCompare(b.module))
    .map((item) => ({ module: item.module, program: item.program }));
  return sha256(JSON.stringify(payload));
}

function projectModuleDescriptors(project: ProjectCheckResult, relativeTo: string): readonly unknown[] {
  return [...project.modules]
    .sort((a, b) => a.module.localeCompare(b.module))
    .map((item) => ({
      module: item.module,
      path: relative(relativeTo, item.path),
      sourceSha256: sha256(item.source),
      semanticIrSha256: sha256(JSON.stringify(item.program)),
      publicInterfaceSha256: moduleInterfaceHash(item.interface, item.registry),
      privateInterfaceSha256: moduleInterfaceHash(item.privateInterface, item.registry),
      imports: item.imports,
    }));
}

function printIncrementalExecution(project: ProjectCheckResult): void {
  const reused = project.reusedModules?.length ?? 0;
  if (reused === 0) return;
  console.log(`incremental execution: ${reused} module(s) rehydrated from .psmi / ${project.modules.length - reused} elaborated`);
}

function printIncrementalPlan(plan: IncrementalPlan, verbose = false): void {
  console.log(`incremental plan: ${plan.rebuildCount} rebuild / ${plan.reuseCount} reusable`);
  if (!verbose && plan.rebuildCount === 0 && plan.removedModules.length === 0) return;
  for (const item of plan.modules) {
    if (!verbose && item.action === "reuse") continue;
    console.log(`  ${item.action.toUpperCase()} ${item.module}${item.reasons.length ? ` — ${item.reasons.join(", ")}` : ""}`);
  }
  for (const module of plan.removedModules) console.log(`  REMOVE ${module}`);
}

function option(args: readonly string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function sha256(text: string): string { return createHash("sha256").update(text).digest("hex"); }

function printUsage(): void {
  console.log([
    "Usage:",
    "  psc check <project-dir> [--target <target>] [--no-cache]",
    "  psc plan <project-dir>",
    "  psc build <project-dir> --target <target> [--verify]",
    "  psc emit-lean <project-dir> [--no-cache]",
    "  psc verify <project-dir> [--target <target>]",
    "  psc certify <project-dir> [--target <target>]",
    "  psc verify <certificate.pscert>",
  ].join("\n"));
}

main(process.argv.slice(2)).catch((error: unknown) => {
  if (error instanceof Error) console.error(error.message); else console.error(String(error));
  process.exitCode = 1;
});
