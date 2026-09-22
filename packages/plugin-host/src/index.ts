import path from "node:path";
import { createRequire } from "node:module";
import {
  BackendPlugin,
  CURRENT_PRODUCT_PROFILE,
  CURRENT_PROOFSCRIPT_REFERENCE,
  OraclePlugin,
  PLUGIN_API_VERSION,
  PluginAPI,
  ProofScriptPlugin,
} from "@proofscript/plugin-api";
import { loadProjectConfig } from "@proofscript/project";

export const HOST_CAPABILITIES = Object.freeze(["backend:v1", "oracle:v1"]);

export class PluginHost {
  private backends = new Map<string, BackendPlugin>();
  private oracles = new Map<string, OraclePlugin>();
  readonly loaded: { specifier: string; plugin: ProofScriptPlugin }[] = [];

  private api: PluginAPI = Object.freeze({
    registerBackend: (backend: BackendPlugin) => {
      if (this.backends.has(backend.name)) throw new Error(`duplicate backend ${backend.name}`);
      this.backends.set(backend.name, Object.freeze(backend));
    },
    registerOracle: (oracle: OraclePlugin) => {
      if (this.oracles.has(oracle.name)) throw new Error(`duplicate oracle ${oracle.name}`);
      this.oracles.set(oracle.name, Object.freeze(oracle));
    },
  });

  async load(specifier: string, root: string, options?: unknown) {
    const req = createRequire(path.join(root, "package.json"));
    const resolved = specifier.startsWith(".") || specifier.startsWith("/")
      ? path.resolve(root, specifier)
      : req.resolve(specifier);
    const mod = req(resolved);
    const plugin: ProofScriptPlugin = mod.default ?? mod.plugin ?? mod;
    validatePlugin(plugin, specifier);
    await plugin.setup(this.api, options);
    this.loaded.push({ specifier, plugin });
  }

  getBackend(name: string) {
    return this.backends.get(name);
  }

  getOracle(name: string) {
    return this.oracles.get(name);
  }
}

export async function loadConfiguredPlugins(root: string) {
  const host = new PluginHost();
  const cfg = loadProjectConfig(root);
  for (const entry of cfg.plugins ?? []) {
    if (typeof entry === "string") await host.load(entry, root);
    else await host.load(entry.use, root, entry.options);
  }
  return host;
}

function validatePlugin(plugin: ProofScriptPlugin, specifier: string): void {
  if (!plugin || typeof plugin.setup !== "function" || !plugin.manifest) {
    throw new Error(`invalid ProofScript plugin ${specifier}`);
  }

  const manifest = plugin.manifest;
  if (manifest.pluginApi !== PLUGIN_API_VERSION) {
    throw new Error(`${manifest.name}: plugin API mismatch`);
  }

  const current =
    manifest.proofscriptReference === CURRENT_PROOFSCRIPT_REFERENCE
    && "productProfile" in manifest
    && manifest.productProfile === CURRENT_PRODUCT_PROFILE;

  const legacy =
    manifest.proofscriptReference === "v0.1"
    && "semanticBaseline" in manifest
    && manifest.semanticBaseline === "lean-4.33.1";

  if (!current && !legacy) {
    throw new Error(
      `${manifest.name}: product/compatibility metadata mismatch; expected `
      + `${CURRENT_PROOFSCRIPT_REFERENCE}/${CURRENT_PRODUCT_PROFILE} or legacy Plugin API v1 compatibility metadata`,
    );
  }

  for (const capability of manifest.requiresHostCapabilities ?? []) {
    if (!HOST_CAPABILITIES.includes(capability)) {
      throw new Error(`${manifest.name}: host capability '${capability}' is unsupported`);
    }
  }
}
