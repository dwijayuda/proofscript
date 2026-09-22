import {
  PSC1_FAIL_CLOSED_FEATURES,
  PSC1_IMPLEMENTATION_PROFILE,
  PSC1_SUPPORTED_FEATURES,
  PSC1_TRUST_LABEL,
} from "./profile";

export function psc1RuntimeStatus() {
  return Object.freeze({
    status: "psc1-runtime-live",
    requiresLean4: false,
    natRepresentation: "nonnegative-bigint",
    boolRepresentation: "boolean",
    unitRepresentation: "null",
    implementationProfile: PSC1_IMPLEMENTATION_PROFILE,
    trustLabel: PSC1_TRUST_LABEL,
    supported: PSC1_SUPPORTED_FEATURES,
    failClosed: PSC1_FAIL_CLOSED_FEATURES,
  });
}
