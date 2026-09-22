import type { PsBool, PsInt } from "./types";

export function Int_neg(value: PsInt): PsInt {
  return -value;
}

export function Int_add(left: PsInt): (right: PsInt) => PsInt {
  return (right: PsInt) => left + right;
}

export function Int_sub(left: PsInt): (right: PsInt) => PsInt {
  return (right: PsInt) => left - right;
}

export function Int_beq(left: PsInt): (right: PsInt) => PsBool {
  return (right: PsInt) => left === right;
}
