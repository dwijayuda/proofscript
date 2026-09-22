export class ProofScriptError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(`${code}: ${message}`);
    this.name = "ProofScriptError";
    this.code = code;
  }
}
