import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { ProofScriptError } from "./errors.js";
import { LEAN_SEMANTIC_BASELINE, PROOFSCRIPT_REFERENCE_REVISION } from "./baseline.js";
import type { PluginManifest, ProofScriptPlugin } from "./plugin-api.js";
import { Registry } from "./registry.js";

export interface PluginReference {
  readonly specifier: string;
  readonly manifest?: string;
}

export interface ProjectConfig {
  readonly entry: string;
  readonly plugins: readonly (string | PluginReference)[];
  readonly lean?: { readonly toolchain?: string };
}

export async function loadProjectConfig(projectDir: string): Promise<{ config: ProjectConfig; configPath: string }> {
  const configPath = resolve(projectDir, "proofscript.config.json");
  const text = await readFile(configPath, "utf8");
  const parsed = JSON.parse(text) as Partial<ProjectConfig>;
  if (typeof parsed.entry !== "string" || !Array.isArray(parsed.plugins)) {
    throw new ProofScriptError("PS5001", `Invalid project config '${configPath}'.`);
  }
  for (const item of parsed.plugins) {
    if (typeof item === "string") continue;
    if (!item || typeof item !== "object" || typeof item.specifier !== "string") {
      throw new ProofScriptError("PS5002", `Every plugin reference must be a string or {specifier, manifest?} in '${configPath}'.`);
    }
  }
  const config: ProjectConfig = {
    entry: parsed.entry,
    plugins: parsed.plugins,
    ...(parsed.lean === undefined ? {} : { lean: parsed.lean }),
  };
  return { config, configPath };
}

export async function loadRegistry(configPath: string, plugins: readonly (string | PluginReference)[]): Promise<Registry> {
  const registry = new Registry();
  const baseDir = dirname(configPath);

  for (const reference of plugins) {
    const specifier = typeof reference === "string" ? reference : reference.specifier;
    const href = specifier.startsWith(".") || specifier.startsWith("/")
      ? pathToFileURL(resolve(baseDir, specifier)).href
      : specifier;
    const resolvedEntry = specifier.startsWith(".") || specifier.startsWith("/")
      ? href
      : import.meta.resolve(specifier);
    const module = (await import(href)) as {
      default?: ProofScriptPlugin;
      plugin?: ProofScriptPlugin;
      proofscriptManifest?: PluginManifest;
    };
    const plugin = module.default ?? module.plugin;
    if (!plugin) throw new ProofScriptError("PS5003", `Module '${specifier}' does not export a ProofScript plugin.`);

    let manifest = module.proofscriptManifest;
    if (typeof reference !== "string" && reference.manifest) {
      const manifestPath = resolve(baseDir, reference.manifest);
      manifest = JSON.parse(await readFile(manifestPath, "utf8")) as PluginManifest;
    }
    if (manifest) validateManifest(manifest, plugin, specifier);
    registry.install(plugin);
    registry.recordPluginProvenance(plugin.id, await provenanceFor(specifier, resolvedEntry));
  }

  return registry;
}

function validateManifest(manifest: PluginManifest, plugin: ProofScriptPlugin, specifier: string): void {
  if (manifest.schema !== "proofscript.plugin/v1") throw new ProofScriptError("PS5004", `Plugin '${specifier}' uses unsupported manifest schema.`);
  if (manifest.id !== plugin.id || manifest.version !== plugin.version || manifest.kind !== plugin.kind) {
    throw new ProofScriptError(
      "PS5005",
      `Plugin manifest mismatch for '${specifier}': manifest=${manifest.id}@${manifest.version}/${manifest.kind}, module=${plugin.id}@${plugin.version}/${plugin.kind}.`,
    );
  }
  if (manifest.proofscriptBaseline !== undefined && manifest.proofscriptBaseline !== PROOFSCRIPT_REFERENCE_REVISION) {
    throw new ProofScriptError("PS5006", `Plugin '${specifier}' targets ProofScript ${manifest.proofscriptBaseline}; this compiler profile is ${PROOFSCRIPT_REFERENCE_REVISION}.`);
  }
  if (manifest.leanBaseline !== undefined && manifest.leanBaseline !== LEAN_SEMANTIC_BASELINE) {
    throw new ProofScriptError("PS5007", `Plugin '${specifier}' targets Lean ${manifest.leanBaseline}; this compiler profile is Lean ${LEAN_SEMANTIC_BASELINE}.`);
  }
}

async function provenanceFor(specifier: string, resolvedEntry: string): Promise<{ readonly specifier: string; readonly resolvedEntry?: string; readonly entrySha256?: string }> {
  if (!resolvedEntry.startsWith("file:")) return { specifier, resolvedEntry };
  try {
    const path = fileURLToPath(resolvedEntry);
    const source = await readFile(path, "utf8");
    return {
      specifier,
      resolvedEntry,
      entrySha256: createHash("sha256").update(source).digest("hex"),
    };
  } catch {
    return { specifier, resolvedEntry };
  }
}
