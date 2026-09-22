import fs from "node:fs";
import path from "node:path";

export const CURRENT_PROOFSCRIPT_REFERENCE = "v0.6.1";
export const CURRENT_PRODUCT_PROFILE = "ps1-v061";

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

export function certificateMetadataForCore(root, artifact) {
  const product = readCurrentProductProfile(root);
  return {
    proofscriptReference: product.proofscriptReference,
    productProfile: product.productProfile,
    referenceConformance: product.conformance,
    coreCompatibility: coreCompatibilityForArtifact(artifact),
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
