import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import type { ProjectCheckResult, CheckedProjectModule, ProjectModuleReuseContext, ReusableProjectModuleData } from "./compiler.js";
import type { ModuleImportDescriptor, ProofScriptModuleInterface, SerializedProofScriptModuleInterface, IRProgram } from "./model.js";
import { rehydrateModuleInterface, serializeModuleInterface } from "./module-interface.js";
import type { Registry } from "./registry.js";
import { LEAN_SEMANTIC_BASELINE, PROOFSCRIPT_IR_SCHEMA, PROOFSCRIPT_REFERENCE_REVISION, PROOFSCRIPT_VERSION } from "./baseline.js";

export const INCREMENTAL_CACHE_SCHEMA = "proofscript.incremental-cache/v3" as const;
export const MODULE_SNAPSHOT_SCHEMA = "proofscript.module-snapshot/v3" as const;

export interface IncrementalLeanArtifacts {
  readonly programLeanSha256: string;
  readonly modules: readonly { readonly module: string; readonly sha256: string }[];
}

export interface IncrementalModuleSnapshot {
  readonly module: string;
  readonly path: string;
  readonly sourceSha256: string;
  readonly semanticIrSha256: string;
  readonly publicInterfaceSha256: string;
  readonly privateInterfaceSha256: string;
  readonly leanSourceSha256: string;
  readonly imports: readonly ModuleImportDescriptor[];
}

export interface IncrementalProjectSnapshot {
  readonly schema: typeof INCREMENTAL_CACHE_SCHEMA;
  readonly proofscript: string;
  readonly semanticIrSchema: string;
  readonly referenceRevision: string;
  readonly leanSemanticBaseline: string;
  readonly entry: string;
  readonly pluginsSha256: string;
  readonly modules: readonly IncrementalModuleSnapshot[];
  readonly leanArtifacts?: IncrementalLeanArtifacts;
}

export interface IncrementalChangeFlags {
  readonly sourceChanged: boolean;
  readonly semanticIrChanged: boolean;
  readonly publicInterfaceChanged: boolean;
  readonly privateInterfaceChanged: boolean;
}

export interface IncrementalPlanEntry {
  readonly module: string;
  readonly action: "rebuild" | "reuse";
  readonly reasons: readonly string[];
  readonly changes: IncrementalChangeFlags;
}

export interface IncrementalPlan {
  readonly cold: boolean;
  readonly identityChanged: boolean;
  readonly rebuildCount: number;
  readonly reuseCount: number;
  readonly removedModules: readonly string[];
  readonly modules: readonly IncrementalPlanEntry[];
}

export interface IncrementalCacheProbe {
  readonly hit: boolean;
  readonly reason: string;
  readonly snapshot?: IncrementalProjectSnapshot;
}

export interface PersistentModuleSnapshot {
  readonly schema: typeof MODULE_SNAPSHOT_SCHEMA;
  readonly proofscript: string;
  readonly semanticIrSchema: string;
  readonly module: IncrementalModuleSnapshot;
  readonly program: IRProgram;
  readonly publicInterface: SerializedProofScriptModuleInterface;
  readonly privateInterface: SerializedProofScriptModuleInterface;
  readonly leanSource: string;
}

export interface RehydratedModuleSnapshot {
  readonly persistent: PersistentModuleSnapshot;
  readonly publicInterface: ProofScriptModuleInterface;
  readonly privateInterface: ProofScriptModuleInterface;
}

export function stableSerializable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableSerializable);
  if (value && typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      const item = (value as Record<string, unknown>)[key];
      output[key] = typeof item === "function" ? "<plugin-resolver>" : stableSerializable(item);
    }
    return output;
  }
  if (typeof value === "function") return "<plugin-resolver>";
  return value;
}

export function stableJson(value: unknown): string { return JSON.stringify(stableSerializable(value)); }
export function sha256(text: string): string { return createHash("sha256").update(text).digest("hex"); }
export function moduleInterfaceHash(iface: ProofScriptModuleInterface, registry?: Registry): string { return sha256(JSON.stringify(serializeModuleInterface(iface, registry))); }
export function pluginSetHash(registry: Registry): string { return sha256(stableJson(registry.installedPlugins())); }

export function moduleSnapshot(module: CheckedProjectModule, projectDir: string): IncrementalModuleSnapshot {
  return {
    module: module.module,
    path: relative(resolve(projectDir), module.path),
    sourceSha256: sha256(module.source),
    semanticIrSha256: sha256(stableJson(module.program)),
    publicInterfaceSha256: moduleInterfaceHash(module.interface, module.registry),
    privateInterfaceSha256: moduleInterfaceHash(module.privateInterface, module.registry),
    leanSourceSha256: sha256(module.leanSource),
    imports: module.imports,
  };
}

export function createIncrementalSnapshot(
  project: ProjectCheckResult,
  projectDir: string,
  entryRelativePath: string,
  leanArtifacts?: IncrementalLeanArtifacts,
): IncrementalProjectSnapshot {
  return {
    schema: INCREMENTAL_CACHE_SCHEMA,
    proofscript: PROOFSCRIPT_VERSION,
    semanticIrSchema: PROOFSCRIPT_IR_SCHEMA,
    referenceRevision: PROOFSCRIPT_REFERENCE_REVISION,
    leanSemanticBaseline: LEAN_SEMANTIC_BASELINE,
    entry: entryRelativePath,
    pluginsSha256: pluginSetHash(project.entry.registry),
    modules: [...project.modules].map((item) => moduleSnapshot(item, projectDir)).sort((a, b) => a.module.localeCompare(b.module)),
    ...(leanArtifacts ? { leanArtifacts } : {}),
  };
}

function sameIdentity(previous: IncrementalProjectSnapshot, entry: string, registry: Registry): boolean {
  return previous.schema === INCREMENTAL_CACHE_SCHEMA &&
    previous.proofscript === PROOFSCRIPT_VERSION &&
    previous.semanticIrSchema === PROOFSCRIPT_IR_SCHEMA &&
    previous.referenceRevision === PROOFSCRIPT_REFERENCE_REVISION &&
    previous.leanSemanticBaseline === LEAN_SEMANTIC_BASELINE &&
    previous.entry === entry &&
    previous.pluginsSha256 === pluginSetHash(registry);
}

export function incrementalIdentityMatches(previous: IncrementalProjectSnapshot, entry: string, registry: Registry): boolean {
  return sameIdentity(previous, entry, registry);
}

export function planIncrementalProject(
  project: ProjectCheckResult,
  projectDir: string,
  entryRelativePath: string,
  previous?: IncrementalProjectSnapshot,
): IncrementalPlan {
  const current = createIncrementalSnapshot(project, projectDir, entryRelativePath);
  const previousByModule = new Map((previous?.modules ?? []).map((item) => [item.module, item] as const));
  const currentByModule = new Map(current.modules.map((item) => [item.module, item] as const));
  const identityChanged = previous ? !sameIdentity(previous, entryRelativePath, project.entry.registry) : false;
  const cold = !previous;
  const entries: IncrementalPlanEntry[] = [];

  for (const item of current.modules) {
    const prior = previousByModule.get(item.module);
    const changes: IncrementalChangeFlags = {
      sourceChanged: !prior || prior.sourceSha256 !== item.sourceSha256,
      semanticIrChanged: !prior || prior.semanticIrSha256 !== item.semanticIrSha256,
      publicInterfaceChanged: !prior || prior.publicInterfaceSha256 !== item.publicInterfaceSha256,
      privateInterfaceChanged: !prior || prior.privateInterfaceSha256 !== item.privateInterfaceSha256,
    };
    const reasons: string[] = [];
    if (cold) reasons.push("cold-cache");
    else if (identityChanged) reasons.push("compiler-plugin-or-baseline-changed");
    else if (!prior) reasons.push("new-module");
    else {
      if (changes.sourceChanged) reasons.push("source-changed");
      // An unchanged source can be reused only if every imported semantic
      // interface it sees is unchanged. `all` consumes the private interface;
      // every other import form consumes only the public interface (possibly
      // promoted into meta phase).
      for (const edge of item.imports) {
        const depNow = currentByModule.get(edge.module);
        const depBefore = previousByModule.get(edge.module);
        if (!depNow || !depBefore) {
          reasons.push(`dependency-added-or-removed:${edge.module}`);
          continue;
        }
        if (edge.all) {
          if (depNow.privateInterfaceSha256 !== depBefore.privateInterfaceSha256) reasons.push(`dependency-private-interface-changed:${edge.module}`);
        } else if (depNow.publicInterfaceSha256 !== depBefore.publicInterfaceSha256) {
          reasons.push(`dependency-public-interface-changed:${edge.module}`);
        }
      }
    }
    entries.push({ module: item.module, action: reasons.length > 0 ? "rebuild" : "reuse", reasons, changes });
  }

  const removedModules = [...previousByModule.keys()].filter((name) => !currentByModule.has(name)).sort();
  const rebuildCount = entries.filter((item) => item.action === "rebuild").length;
  return {
    cold,
    identityChanged,
    rebuildCount,
    reuseCount: entries.length - rebuildCount,
    removedModules,
    modules: entries,
  };
}

export async function readIncrementalSnapshot(buildDir: string): Promise<IncrementalProjectSnapshot | undefined> {
  try {
    const parsed = JSON.parse(await readFile(join(buildDir, "incremental-state.json"), "utf8")) as IncrementalProjectSnapshot;
    return parsed.schema === INCREMENTAL_CACHE_SCHEMA ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export async function writeIncrementalCache(
  buildDir: string,
  projectDir: string,
  project: ProjectCheckResult,
  entryRelativePath: string,
  leanArtifacts?: IncrementalLeanArtifacts,
): Promise<IncrementalProjectSnapshot> {
  const snapshot = createIncrementalSnapshot(project, projectDir, entryRelativePath, leanArtifacts);
  const modulesDir = join(buildDir, "module-cache");
  // The state file is authoritative. Clear stale module snapshots so removed
  // modules cannot be mistaken for current cache entries by tooling.
  await rm(modulesDir, { recursive: true, force: true });
  await mkdir(modulesDir, { recursive: true });
  for (const item of project.modules) {
    const descriptor = moduleSnapshot(item, projectDir);
    const path = join(modulesDir, ...item.module.split(".")) + ".psmi.json";
    await mkdir(dirname(path), { recursive: true });
    const persistent: PersistentModuleSnapshot = {
      schema: MODULE_SNAPSHOT_SCHEMA,
      proofscript: PROOFSCRIPT_VERSION,
      semanticIrSchema: PROOFSCRIPT_IR_SCHEMA,
      module: descriptor,
      program: item.program,
      publicInterface: serializeModuleInterface(item.interface, item.registry),
      privateInterface: serializeModuleInterface(item.privateInterface, item.registry),
      leanSource: item.leanSource,
    };
    await writeFile(path, JSON.stringify(persistent, null, 2) + "\n", "utf8");
  }
  await writeFile(join(buildDir, "incremental-state.json"), JSON.stringify(snapshot, null, 2) + "\n", "utf8");
  return snapshot;
}

export async function readPersistentModuleSnapshot(buildDir: string, module: string): Promise<PersistentModuleSnapshot | undefined> {
  const path = join(buildDir, "module-cache", ...module.split(".")) + ".psmi.json";
  try {
    const parsed = JSON.parse(await readFile(path, "utf8")) as PersistentModuleSnapshot;
    if (parsed.schema !== MODULE_SNAPSHOT_SCHEMA || parsed.proofscript !== PROOFSCRIPT_VERSION || parsed.semanticIrSchema !== PROOFSCRIPT_IR_SCHEMA) return undefined;
    return parsed;
  } catch { return undefined; }
}

export async function rehydratePersistentModuleSnapshot(buildDir: string, module: string, registry?: Registry): Promise<RehydratedModuleSnapshot | undefined> {
  const persistent = await readPersistentModuleSnapshot(buildDir, module);
  if (!persistent) return undefined;
  try {
    return {
      persistent,
      publicInterface: rehydrateModuleInterface(persistent.publicInterface, registry),
      privateInterface: rehydrateModuleInterface(persistent.privateInterface, registry),
    };
  } catch { return undefined; }
}

export function createPersistentModuleReuseProvider(
  buildDir: string,
  projectDir: string,
  previous: IncrementalProjectSnapshot,
  registry: Registry,
): (context: ProjectModuleReuseContext) => Promise<ReusableProjectModuleData | undefined> {
  const previousByModule = new Map(previous.modules.map((item) => [item.module, item] as const));
  return async (context) => {
    const prior = previousByModule.get(context.module);
    if (!prior) return undefined;
    if (sha256(context.source) !== prior.sourceSha256) return undefined;
    if (JSON.stringify(context.imports) !== JSON.stringify(prior.imports)) return undefined;
    const relativePath = relative(resolve(projectDir), resolve(context.path));
    if (relativePath !== prior.path) return undefined;

    // A module is reusable only when the exact semantic interface it consumes
    // from each dependency is unchanged. Ordinary/public/meta edges consume the
    // public interface; `all` consumes the private interface.
    for (const edge of context.imports) {
      const depPrior = previousByModule.get(edge.module);
      const depNow = context.dependencies.get(edge.module);
      if (!depPrior || !depNow) return undefined;
      const currentHash = edge.all ? moduleInterfaceHash(depNow.privateInterface, depNow.registry) : moduleInterfaceHash(depNow.interface, depNow.registry);
      const previousHash = edge.all ? depPrior.privateInterfaceSha256 : depPrior.publicInterfaceSha256;
      if (currentHash !== previousHash) return undefined;
    }

    const rehydrated = await rehydratePersistentModuleSnapshot(buildDir, context.module, registry);
    if (!rehydrated) return undefined;
    const { persistent, publicInterface, privateInterface } = rehydrated;
    if (persistent.module.module !== context.module || persistent.module.sourceSha256 !== prior.sourceSha256) return undefined;
    if (sha256(stableJson(persistent.program)) !== prior.semanticIrSha256) return undefined;
    if (moduleInterfaceHash(publicInterface, registry) !== prior.publicInterfaceSha256) return undefined;
    if (moduleInterfaceHash(privateInterface, registry) !== prior.privateInterfaceSha256) return undefined;
    if (sha256(persistent.leanSource) !== prior.leanSourceSha256) return undefined;
    return {
      program: persistent.program,
      interface: publicInterface,
      privateInterface,
      imports: persistent.module.imports,
      leanSource: persistent.leanSource,
    };
  };
}

export async function probeExactCacheHit(
  projectDir: string,
  buildDir: string,
  entryRelativePath: string,
  registry: Registry,
): Promise<IncrementalCacheProbe> {
  const snapshot = await readIncrementalSnapshot(buildDir);
  if (!snapshot) return { hit: false, reason: "no-cache" };
  if (!sameIdentity(snapshot, entryRelativePath, registry)) return { hit: false, reason: "identity-changed", snapshot };
  const root = resolve(projectDir);
  for (const item of snapshot.modules) {
    const path = resolve(root, item.path);
    const rel = relative(root, path);
    if (rel === ".." || rel.startsWith(`..${sep}`)) return { hit: false, reason: `invalid-cached-path:${item.module}`, snapshot };
    try {
      const source = await readFile(path, "utf8");
      if (sha256(source) !== item.sourceSha256) return { hit: false, reason: `source-changed:${item.module}`, snapshot };
    } catch {
      return { hit: false, reason: `source-missing:${item.module}`, snapshot };
    }
  }
  return { hit: true, reason: "exact-source-plugin-baseline-match", snapshot };
}

export async function validateCachedLeanArtifacts(buildDir: string, snapshot: IncrementalProjectSnapshot): Promise<boolean> {
  if (!snapshot.leanArtifacts) return false;
  try {
    const programLean = await readFile(join(buildDir, "program.lean"), "utf8");
    if (sha256(programLean) !== snapshot.leanArtifacts.programLeanSha256) return false;
    for (const item of snapshot.leanArtifacts.modules) {
      const path = join(buildDir, "lean-workspace", ...item.module.split(".")) + ".lean";
      const source = await readFile(path, "utf8");
      if (sha256(source) !== item.sha256) return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function leanArtifactDescriptor(project: ProjectCheckResult): IncrementalLeanArtifacts {
  return {
    programLeanSha256: sha256(project.entry.leanSource),
    modules: [...project.modules]
      .filter((item) => item.module !== project.entry.module)
      .map((item) => ({ module: `ProofScriptGenerated.${item.module}`, sha256: sha256(item.leanSource) }))
      .sort((a, b) => a.module.localeCompare(b.module)),
  };
}
