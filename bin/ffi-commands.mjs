import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

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
  };
}
