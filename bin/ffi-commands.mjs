import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

function option(args, name) {
  const eq = args.find((arg) => arg.startsWith(name + "="));
  if (eq) return eq.slice(name.length + 1);
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function sha256File(file) {
  return createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

export function readFfiManifest(args, cwd = process.cwd()) {
  const file = option(args, "--ffi-manifest");
  if (!file) return undefined;
  const resolved = path.resolve(cwd, file);
  if (!fs.existsSync(resolved)) throw new Error(`FFI manifest is missing or unreadable: ${resolved}`);
  const bytes = fs.readFileSync(resolved);
  let parsed;
  try {
    parsed = JSON.parse(bytes.toString("utf8"));
  } catch (error) {
    throw new Error(`invalid FFI manifest JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (parsed?.schema !== "proofscript.ffi/v1") {
    throw new Error("FFI manifest schema must be 'proofscript.ffi/v1'");
  }
  if (!Array.isArray(parsed.bindings)) throw new Error("FFI manifest bindings must be an array");
  const bindings = parsed.bindings.map((binding, index) => {
    if (!binding || typeof binding !== "object") throw new Error(`FFI binding #${index} must be an object`);
    const normalized = {
      name: binding.name,
      module: binding.module,
      exportName: binding.exportName,
      trust: binding.trust,
    };
    if (typeof normalized.name !== "string" || normalized.name.length === 0) {
      throw new Error(`FFI binding #${index} requires name`);
    }
    if (typeof normalized.module !== "string" || normalized.module.length === 0) {
      throw new Error(`FFI binding '${normalized.name}' requires module`);
    }
    if (typeof normalized.exportName !== "string" || normalized.exportName.length === 0) {
      throw new Error(`FFI binding '${normalized.name}' requires exportName`);
    }
    if (normalized.trust !== "trusted-external") {
      throw new Error(`FFI binding '${normalized.name}' must declare trust='trusted-external'`);
    }
    return normalized;
  });
  return {
    schema: parsed.schema,
    resolved,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    bindings,
  };
}

function npmPackageName(specifier) {
  if (
    typeof specifier !== "string"
    || specifier.startsWith("node:")
    || specifier.startsWith(".")
    || specifier.startsWith("/")
    || specifier.startsWith("file:")
  ) return undefined;
  const parts = specifier.split("/");
  if (specifier.startsWith("@")) return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : undefined;
  return parts[0] || undefined;
}

function findPackageRoot(entryPath, packageName) {
  let current = fs.statSync(entryPath).isDirectory() ? entryPath : path.dirname(entryPath);
  while (true) {
    const packageJson = path.join(current, "package.json");
    if (fs.existsSync(packageJson)) {
      const parsed = JSON.parse(fs.readFileSync(packageJson, "utf8"));
      if (parsed?.name === packageName) return { root: fs.realpathSync(current), packageJson, parsed };
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  throw new Error(`unable to locate package.json for npm FFI dependency '${packageName}'`);
}

function hashInstalledPackageTree(root) {
  const files = [];
  let totalBytes = 0;
  const walk = (dir) => {
    for (const name of fs.readdirSync(dir).sort()) {
      if (name === "node_modules" || name === ".git") continue;
      const absolute = path.join(dir, name);
      const stat = fs.lstatSync(absolute);
      if (stat.isSymbolicLink()) {
        throw new Error(`npm FFI dependency identity rejects symbolic links inside package tree: ${absolute}`);
      }
      if (stat.isDirectory()) {
        walk(absolute);
        continue;
      }
      if (!stat.isFile()) continue;
      if (stat.size > 16 * 1024 * 1024) {
        throw new Error(`npm FFI dependency file exceeds 16 MiB identity limit: ${absolute}`);
      }
      totalBytes += stat.size;
      if (totalBytes > 64 * 1024 * 1024) {
        throw new Error("npm FFI dependency package exceeds 64 MiB identity limit");
      }
      files.push({
        path: path.relative(root, absolute).replace(/\\/g, "/"),
        bytes: stat.size,
        sha256: sha256File(absolute),
      });
      if (files.length > 2048) throw new Error("npm FFI dependency package exceeds 2048-file identity limit");
    }
  };
  walk(root);
  const digest = createHash("sha256");
  for (const file of files) {
    digest.update(file.path);
    digest.update("\0");
    digest.update(String(file.bytes));
    digest.update("\0");
    digest.update(file.sha256);
    digest.update("\n");
  }
  return {
    sha256: digest.digest("hex"),
    fileCount: files.length,
    totalBytes,
  };
}

export function ffiPackageDependencies(ffi) {
  if (!ffi) return [];
  const packageModules = new Map();
  for (const binding of ffi.bindings ?? []) {
    const packageName = npmPackageName(binding.module);
    if (!packageName) continue;
    const modules = packageModules.get(packageName) ?? new Set();
    modules.add(binding.module);
    packageModules.set(packageName, modules);
  }
  if (packageModules.size === 0) return [];

  const requireFromManifest = createRequire(ffi.resolved);
  const dependencies = [];
  for (const [packageName, modules] of [...packageModules.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    let entry;
    try {
      entry = requireFromManifest.resolve([...modules][0]);
    } catch (error) {
      throw new Error(
        `unable to resolve npm FFI dependency '${packageName}' relative to ${ffi.resolved}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    const located = findPackageRoot(entry, packageName);
    const version = located.parsed?.version;
    if (typeof version !== "string" || version.length === 0) {
      throw new Error(`npm FFI dependency '${packageName}' requires a package.json version`);
    }
    const tree = hashInstalledPackageTree(located.root);
    dependencies.push({
      schema: "proofscript.npm-dependency-identity/v1",
      package: packageName,
      version,
      modules: [...modules].sort(),
      packageJsonSha256: sha256File(located.packageJson),
      contentSha256: tree.sha256,
      fileCount: tree.fileCount,
      totalBytes: tree.totalBytes,
    });
  }
  return dependencies;
}

export function ffiBuildMetadata(ffi, outDir = process.cwd()) {
  if (!ffi) return undefined;
  return {
    schema: ffi.schema,
    path: path.relative(outDir, ffi.resolved).replace(/\\/g, "/"),
    sha256: ffi.sha256,
    trust: "trusted-external",
    bindings: ffi.bindings.map(({ name, module, exportName, trust }) => ({
      name,
      module,
      exportName,
      trust,
    })),
    dependencies: ffiPackageDependencies(ffi),
  };
}

export function certificateFfiMetadata(args, certificateOut, coreArtifact, cwd = process.cwd()) {
  const ffi = readFfiManifest(args, cwd);
  if (!ffi) return {};
  const axioms = new Set(
    (coreArtifact?.declarations ?? [])
      .filter((declaration) => declaration?.kind === "axiom")
      .map((declaration) => declaration.name),
  );
  for (const binding of ffi.bindings) {
    if (!axioms.has(binding.name)) {
      throw new Error(`FFI certificate binding '${binding.name}' does not target a Core axiom`);
    }
  }
  return {
    ffi: ffiBuildMetadata(ffi, path.dirname(certificateOut)),
  };
}

export function verifyCertificateFfiMetadata(certificatePath, certificate, coreArtifact) {
  if (!certificate?.ffi) {
    if (certificate?.trustBoundary?.trustedExternalCode === true) {
      throw new Error("certificate claims trusted external code without an FFI manifest binding");
    }
    return undefined;
  }
  if (
    certificate.ffi.schema !== "proofscript.ffi/v1"
    || certificate.ffi.trust !== "trusted-external"
  ) {
    throw new Error("certificate FFI metadata has an invalid schema or trust classification");
  }
  const manifestPath = path.resolve(path.dirname(certificatePath), certificate.ffi.path ?? "");
  if (!fs.existsSync(manifestPath)) throw new Error("certificate FFI manifest is missing or unreadable");
  if (!certificate.ffi.sha256 || sha256File(manifestPath) !== certificate.ffi.sha256) {
    throw new Error("certificate FFI manifest hash mismatch");
  }
  const parsed = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  if (parsed?.schema !== "proofscript.ffi/v1" || !Array.isArray(parsed.bindings)) {
    throw new Error("certificate FFI manifest content is invalid");
  }
  const normalized = parsed.bindings.map(({ name, module, exportName, trust }) => ({
    name,
    module,
    exportName,
    trust,
  }));
  if (JSON.stringify(normalized) !== JSON.stringify(certificate.ffi.bindings ?? [])) {
    throw new Error("certificate FFI bindings do not match the bound manifest");
  }
  const dependencyIdentity = ffiPackageDependencies({
    schema: parsed.schema,
    resolved: manifestPath,
    sha256: certificate.ffi.sha256,
    bindings: normalized,
  });
  if (JSON.stringify(dependencyIdentity) !== JSON.stringify(certificate.ffi.dependencies ?? [])) {
    throw new Error("certificate npm FFI dependency identity mismatch");
  }
  const axioms = new Set(
    (coreArtifact?.declarations ?? [])
      .filter((declaration) => declaration?.kind === "axiom")
      .map((declaration) => declaration.name),
  );
  for (const binding of normalized) {
    if (binding.trust !== "trusted-external") {
      throw new Error(`certificate FFI binding '${binding.name}' is not explicitly trusted-external`);
    }
    if (!axioms.has(binding.name)) {
      throw new Error(`certificate FFI binding '${binding.name}' does not target a Core axiom`);
    }
  }
  if (certificate.trustBoundary?.trustedExternalCode !== true) {
    throw new Error("certificate FFI metadata exists but trustedExternalCode is not true");
  }
  return {
    schema: certificate.ffi.schema,
    path: manifestPath,
    sha256: certificate.ffi.sha256,
    trust: certificate.ffi.trust,
    bindings: normalized,
    dependencies: dependencyIdentity,
  };
}
