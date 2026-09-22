export type PsNat = bigint;
export type PsInt = bigint;
export type PsBool = boolean;
export type PsUnit = null;
export type PsValue = unknown;

export interface PsStructValue {
  readonly __psInductive: string;
  readonly __psCtor: number;
  readonly fields: readonly unknown[];
}

export interface Psc1RuntimeManifest {
  implementationProfile: string;
  trustLabel: string;
  supported: readonly string[];
  failClosed: readonly string[];
  sourceSha256: string;
  requiresLean4?: false;
}
