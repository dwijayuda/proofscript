import type { PsStructValue } from "./types";

export function Struct_mk(inductive: string, ctor: number, fields: readonly unknown[]): PsStructValue {
  if (!Number.isSafeInteger(ctor) || ctor < 0) throw new Error(`ProofScript constructor index must be a nonnegative safe integer: ${ctor}`);
  return Object.freeze({ __psInductive: inductive, __psCtor: ctor, fields: Object.freeze([...fields]) });
}

export function Struct_ctor(inductive: string, ctor: number, arity: number): unknown {
  if (!Number.isSafeInteger(arity) || arity < 0) throw new Error(`ProofScript constructor arity must be a nonnegative safe integer: ${arity}`);
  const collect = (fields: readonly unknown[]): unknown => fields.length === arity
    ? Struct_mk(inductive, ctor, fields)
    : (value: unknown) => collect([...fields, value]);
  return collect([]);
}

function expectStructValue(value: unknown, operation: string): PsStructValue {
  const record = value as PsStructValue;
  if (!record || typeof record !== "object" || !Array.isArray(record.fields)) throw new Error(`ProofScript ${operation} expected a PSC-1 structure value`);
  return record;
}

export function Struct_proj(value: unknown): (index: number) => unknown {
  const record = expectStructValue(value, "projection");
  return (index: number) => {
    if (!Number.isSafeInteger(index) || index < 0 || index >= record.fields.length) throw new Error(`ProofScript projection index out of bounds: ${index}`);
    return record.fields[index];
  };
}

export function Struct_rec(inductive: string, ctor: number, arity: number): (branch: unknown) => (value: unknown) => unknown {
  if (!Number.isSafeInteger(ctor) || ctor < 0) throw new Error(`ProofScript constructor index must be a nonnegative safe integer: ${ctor}`);
  if (!Number.isSafeInteger(arity) || arity < 0) throw new Error(`ProofScript constructor arity must be a nonnegative safe integer: ${arity}`);
  return (branch) => (value) => {
    const record = expectStructValue(value, "structure recursor");
    if (record.__psInductive !== inductive || record.__psCtor !== ctor) throw new Error(`ProofScript structure recursor expected ${inductive}.${ctor}`);
    if (record.fields.length !== arity) throw new Error(`ProofScript structure recursor expected ${arity} field(s), got ${record.fields.length}`);
    let out = branch;
    for (const field of record.fields) {
      if (typeof out !== "function") throw new Error("ProofScript structure recursor branch is not fully curried");
      out = (out as (arg: unknown) => unknown)(field);
    }
    return out;
  };
}

export function Inductive_rec(inductive: string, arities: readonly number[], recursiveFieldPositions: readonly (readonly number[])[] = []): (branches: readonly unknown[]) => (value: unknown) => unknown {
  if (!Array.isArray(arities)) throw new Error("ProofScript inductive recursor arities must be an array");
  for (const arity of arities) {
    if (!Number.isSafeInteger(arity) || arity < 0) throw new Error(`ProofScript constructor arity must be a nonnegative safe integer: ${arity}`);
  }
  const recPositions = arities.map((_, ctorIndex) => new Set(recursiveFieldPositions[ctorIndex] ?? []));
  return (branches) => {
    const run = (value: unknown): unknown => {
      if (!Array.isArray(branches) || branches.length !== arities.length) throw new Error(`ProofScript inductive recursor expected ${arities.length} branch(es), got ${Array.isArray(branches) ? branches.length : "non-array"}`);
      const record = expectStructValue(value, "inductive recursor");
      if (record.__psInductive !== inductive) throw new Error(`ProofScript inductive recursor expected ${inductive}`);
      if (!Number.isSafeInteger(record.__psCtor) || record.__psCtor < 0 || record.__psCtor >= arities.length) throw new Error(`ProofScript inductive recursor constructor index out of bounds: ${record.__psCtor}`);
      const recursivePositions = recPositions[record.__psCtor] ?? new Set<number>();
      const expectedFieldCount = arities[record.__psCtor] - recursivePositions.size;
      if (record.fields.length !== expectedFieldCount) throw new Error(`ProofScript inductive recursor expected ${expectedFieldCount} field(s), got ${record.fields.length}`);
      let out = branches[record.__psCtor];
      record.fields.forEach((field, index) => {
        if (typeof out !== "function") throw new Error("ProofScript inductive recursor branch is not fully curried");
        out = (out as (arg: unknown) => unknown)(field);
        if (recursivePositions.has(index)) {
          if (typeof out !== "function") throw new Error("ProofScript inductive recursor branch is not fully curried for recursive IH");
          out = (out as (arg: unknown) => unknown)(run(field));
        }
      });
      return out;
    };
    return run;
  };
}
