import type { PsNat } from "./types";

export function psNat(value: number | bigint): PsNat {
  const bigintValue = typeof value === "bigint" ? value : BigInt(value);
  if (bigintValue < 0n) throw new Error(`ProofScript Nat cannot be negative: ${bigintValue}`);
  return bigintValue;
}

export function Nat_succ(value: PsNat): PsNat {
  return psNat(value + 1n);
}

export function Nat_add(left: PsNat): (right: PsNat) => PsNat {
  return (right: PsNat) => psNat(left + right);
}

export function Nat_pred(value: PsNat): PsNat {
  const n = psNat(value);
  return n === 0n ? 0n : n - 1n;
}

export function Nat_sub(left: PsNat): (right: PsNat) => PsNat {
  return (right: PsNat) => {
    const a = psNat(left);
    const b = psNat(right);
    return a <= b ? 0n : a - b;
  };
}

export function Nat_mul(left: PsNat): (right: PsNat) => PsNat {
  return (right: PsNat) => psNat(left * right);
}

export function Nat_beq(left: PsNat): (right: PsNat) => boolean {
  return (right: PsNat) => psNat(left) === psNat(right);
}

export function Nat_leb(left: PsNat): (right: PsNat) => boolean {
  return (right: PsNat) => psNat(left) <= psNat(right);
}

export function Nat_ltb(left: PsNat): (right: PsNat) => boolean {
  return (right: PsNat) => psNat(left) < psNat(right);
}

export function Nat_rec<T>(zeroBranch: T): (succBranch: (pred: PsNat) => (ih: T) => T) => (scrutinee: PsNat) => T {
  return (succBranch) => (scrutinee) => {
    const n = psNat(scrutinee);
    let acc = zeroBranch;
    for (let i = 0n; i < n; i += 1n) acc = succBranch(i)(acc);
    return acc;
  };
}
