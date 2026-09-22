export type ArenaStatus = "accepted" | "rejected" | "unsupported";
export type ArenaExitCode = 0 | 1 | 2;

export interface ArenaResult {
  status: ArenaStatus;
  exitCode: ArenaExitCode;
  checker: "proofscript-arena-adapter0";
  trustBoundary: "K3-TB trusted-boundary only";
  fullLean4Equivalence: false;
  fullyFormalK3: false;
  formalLean4EquivalenceProvenObligations: 0;
  message?: string;
  recordsRead: number;
  translatedDeclarations: number;
  acceptedDeclarations?: number;
  unsupportedRecordKind?: string;
}

export function accepted(recordsRead: number, translatedDeclarations: number, acceptedDeclarations: number): ArenaResult {
  return {
    status: "accepted",
    exitCode: 0,
    checker: "proofscript-arena-adapter0",
    trustBoundary: "K3-TB trusted-boundary only",
    fullLean4Equivalence: false,
    fullyFormalK3: false,
    formalLean4EquivalenceProvenObligations: 0,
    recordsRead,
    translatedDeclarations,
    acceptedDeclarations,
  };
}

export function rejected(message: string, recordsRead = 0, translatedDeclarations = 0): ArenaResult {
  return {
    status: "rejected",
    exitCode: 1,
    checker: "proofscript-arena-adapter0",
    trustBoundary: "K3-TB trusted-boundary only",
    fullLean4Equivalence: false,
    fullyFormalK3: false,
    formalLean4EquivalenceProvenObligations: 0,
    message,
    recordsRead,
    translatedDeclarations,
  };
}

export function unsupported(message: string, recordsRead: number, translatedDeclarations = 0, unsupportedRecordKind?: string): ArenaResult {
  return {
    status: "unsupported",
    exitCode: 2,
    checker: "proofscript-arena-adapter0",
    trustBoundary: "K3-TB trusted-boundary only",
    fullLean4Equivalence: false,
    fullyFormalK3: false,
    formalLean4EquivalenceProvenObligations: 0,
    message,
    recordsRead,
    translatedDeclarations,
    unsupportedRecordKind,
  };
}
