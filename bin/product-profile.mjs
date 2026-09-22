import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export function currentProductProfile() {
  const file = path.join(ROOT, "config", "product-profile.json");
  let profile;
  try {
    profile = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    throw new Error(`could not read config/product-profile.json: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (profile?.schema !== 1 || profile?.proofscriptReference !== "v0.6.1" || profile?.productProfile !== "ps1-v061") {
    throw new Error("invalid current ProofScript product profile metadata");
  }
  return profile;
}

export function certificateMetadataForCore(artifact) {
  const product = currentProductProfile();
  return {
    proofscriptReference: product.proofscriptReference,
    productProfile: product.productProfile,
    referenceConformance: product.conformance,
    coreCompatibility: {
      format: artifact?.format ?? null,
      formatVersion: artifact?.formatVersion ?? null,
      proofscriptReference: artifact?.proofscriptReference ?? null,
      leanSemanticBaseline: artifact?.leanSemanticBaseline ?? null,
      implementationProfile: artifact?.implementationProfile ?? null,
    },
  };
}

export function verifyCertificateMetadataAgainstCore(certificate, coreArtifact) {
  if (!certificate?.proofscriptReference && !certificate?.productProfile && !certificate?.coreCompatibility) return;
  const product = currentProductProfile();
  if (certificate.proofscriptReference !== product.proofscriptReference) {
    throw new Error(`certificate ProofScript reference mismatch: expected ${product.proofscriptReference}, got ${String(certificate.proofscriptReference)}`);
  }
  if (certificate.productProfile !== product.productProfile) {
    throw new Error(`certificate product profile mismatch: expected ${product.productProfile}, got ${String(certificate.productProfile)}`);
  }
  const expected = certificateMetadataForCore(coreArtifact).coreCompatibility;
  if (!certificate.coreCompatibility || JSON.stringify(certificate.coreCompatibility) !== JSON.stringify(expected)) {
    throw new Error("certificate Core compatibility metadata does not match the bound Core artifact");
  }
}
