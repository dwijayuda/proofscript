import type { PsBool } from "./types";

export function Bool_not(value: PsBool): PsBool {
  return !value;
}

export function Bool_xor(left: PsBool): (right: PsBool) => PsBool {
  return (right: PsBool) => left !== right;
}
