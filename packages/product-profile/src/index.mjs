import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const CURRENT_PROOFSCRIPT_REFERENCE = "v0.6.1";
export const CURRENT_PRODUCT_PROFILE = "ps1-v061";

export const CURRENT_RUNTIME_PROFILE_FILE = "config/proofscript-runtime-profile-v1.json";
export const CURRENT_RUNTIME_PROFILE = "proofscript-js-runtime-v1";

export function readCurrentRuntimeProfile(root) {
  const file = path.join(root, CURRENT_RUNTIME_PROFILE_FILE);
  const bytes = fs.readFileSync(file);
  const profile = JSON.parse(bytes.toString("utf8"));
  if (
    profile?.schema !== "proofscript.runtime-profile/v1"
    || profile?.profileId !== CURRENT_RUNTIME_PROFILE
    || profile?.status !== "specified-bounded"
  ) {
    throw new Error("invalid current ProofScript runtime profile metadata");
  }
  return {
    profile,
    metadata: {
      schema: profile.schema,
      profileId: profile.profileId,
      status: profile.status,
      path: CURRENT_RUNTIME_PROFILE_FILE,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    },
  };
}

export function runtimeCertificateMetadata(root) {
  const runtime = readCurrentRuntimeProfile(root);
  return {
    runtimeProfile: runtime.metadata,
    correspondence: {
      runtimeRepresentationProfileBound: true,
      runtimeImplementationGated: runtime.profile.correspondence?.runtimeImplementationGated === true,
      backendArtifactBound: false,
      runtimeDifferentialTested: false,
      coreToBackendFormallyProved: false,
      backendToJavaScriptFormallyProved: false,
      endToEndVerifiedJavaScript: false,
    },
  };
}

export function verifyRuntimeCertificateMetadata(root, certificate) {
  if (!certificate?.runtimeProfile && !certificate?.correspondence) return;
  const expected = runtimeCertificateMetadata(root);
  if (
    !certificate.runtimeProfile
    || JSON.stringify(certificate.runtimeProfile) !== JSON.stringify(expected.runtimeProfile)
  ) {
    throw new Error("certificate runtime profile metadata does not match the current Product-v1 runtime profile");
  }
  const claims = certificate.correspondence;
  if (!claims || claims.runtimeRepresentationProfileBound !== true) {
    throw new Error("certificate runtime correspondence metadata is missing its runtime-profile binding claim");
  }
  for (const forbiddenClaim of [
    "runtimeDifferentialTested",
    "coreToBackendFormallyProved",
    "backendToJavaScriptFormallyProved",
    "endToEndVerifiedJavaScript",
  ]) {
    if (claims[forbiddenClaim] !== false) {
      throw new Error(`certificate correspondence claim '${forbiddenClaim}' is not established by structural certification`);
    }
  }
}

export function readCurrentProductProfile(root) {
  const file = path.join(root, "config", "product-profile.json");
  const profile = JSON.parse(fs.readFileSync(file, "utf8"));
  if (
    profile?.schema !== 1
    || profile?.proofscriptReference !== CURRENT_PROOFSCRIPT_REFERENCE
    || profile?.productProfile !== CURRENT_PRODUCT_PROFILE
  ) {
    throw new Error("invalid current ProofScript product profile metadata");
  }
  return profile;
}

export function validateCliProjectProfile(root, config) {
  const product = readCurrentProductProfile(root);
  if (
    config?.proofscriptReference !== undefined
    && config.proofscriptReference !== product.proofscriptReference
  ) {
    throw new Error(
      `unsupported ProofScript reference in proofscript.config.json: ${String(config.proofscriptReference)}`,
    );
  }
  if (
    config?.productProfile !== undefined
    && config.productProfile !== product.productProfile
  ) {
    throw new Error(
      `unsupported ProofScript product profile in proofscript.config.json: ${String(config.productProfile)}`,
    );
  }
  return product;
}

export function readCurrentStandardLibrary(root) {
  const packageFile = path.join(root, "packages", "std", "package.json");
  const manifestFile = path.join(root, "packages", "std", "bootstrap-manifest.json");
  const packageJson = JSON.parse(fs.readFileSync(packageFile, "utf8"));
  const manifestBytes = fs.readFileSync(manifestFile);
  const manifest = JSON.parse(manifestBytes.toString("utf8"));
  if (packageJson?.name !== "@proofscript/std" || !Array.isArray(manifest?.declarations)) {
    throw new Error("invalid current ProofScript standard-library metadata");
  }
  return {
    package: packageJson.name,
    version: packageJson.version ?? null,
    profileId: "proofscript-stdlib-v1",
    manifestPath: "packages/std/bootstrap-manifest.json",
    manifestSha256: createHash("sha256").update(manifestBytes).digest("hex"),
    bootstrapCoreSha256: manifest.coreSha256 ?? null,
    bootstrapSourceSha256: manifest.sourceSha256 ?? null,
    declarationCount: manifest.declarations.length,
    proofscriptReference: manifest.proofscriptReference ?? null,
    implementationProfile: manifest.implementationProfile ?? null,
  };
}

export function certificateMetadataForCore(root, artifact) {
  const product = readCurrentProductProfile(root);
  return {
    proofscriptReference: product.proofscriptReference,
    productProfile: product.productProfile,
    referenceConformance: product.conformance,
    coreCompatibility: coreCompatibilityForArtifact(artifact),
    standardLibrary: readCurrentStandardLibrary(root),
  };
}

export function verifyCertificateMetadataAgainstCore(root, certificate, coreArtifact) {
  if (
    !certificate?.proofscriptReference
    && !certificate?.productProfile
    && !certificate?.coreCompatibility
  ) return;

  const product = readCurrentProductProfile(root);
  if (certificate.proofscriptReference !== product.proofscriptReference) {
    throw new Error(
      `certificate ProofScript reference mismatch: expected ${product.proofscriptReference}, got ${String(certificate.proofscriptReference)}`,
    );
  }
  if (certificate.productProfile !== product.productProfile) {
    throw new Error(
      `certificate product profile mismatch: expected ${product.productProfile}, got ${String(certificate.productProfile)}`,
    );
  }
  const expected = coreCompatibilityForArtifact(coreArtifact);
  if (
    !certificate.coreCompatibility
    || JSON.stringify(certificate.coreCompatibility) !== JSON.stringify(expected)
  ) {
    throw new Error("certificate Core compatibility metadata does not match the bound Core artifact");
  }
  if (certificate.standardLibrary) {
    const standardLibrary = readCurrentStandardLibrary(root);
    if (JSON.stringify(certificate.standardLibrary) !== JSON.stringify(standardLibrary)) {
      throw new Error("certificate standard-library identity does not match the current checked bootstrap");
    }
  }
}

function coreCompatibilityForArtifact(artifact) {
  return {
    format: artifact?.format ?? null,
    formatVersion: artifact?.formatVersion ?? null,
    proofscriptReference: artifact?.proofscriptReference ?? null,
    leanSemanticBaseline: artifact?.leanSemanticBaseline ?? null,
    implementationProfile: artifact?.implementationProfile ?? null,
  };
}
