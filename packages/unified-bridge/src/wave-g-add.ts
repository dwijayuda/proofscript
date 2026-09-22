import { levelOfNat, type CoreDeclaration, type Term } from "@proofscript/kernel";
import { WAVEF_HADD_MK } from "./wave-f-hadd.js";

export const WAVEG_ADD = "Add" as const;
export const WAVEG_ADD_MK = "Add.mk" as const;
export const WAVEG_ADD_FIELD = "Add.add" as const;

const S1: Term = { tag: "sort", level: levelOfNat(1) };
const B = (index: number): Term => ({ tag: "bvar", index });
const C = (name: string): Term => ({ tag: "const", name, levels: [] });
const App = (fn: Term, arg: Term): Term => ({ tag: "app", fn, arg });
const Apps = (fn: Term, args: Term[]): Term => args.reduce(App, fn);
const Pi = (domain: Term, body: Term): Term => ({ tag: "pi", domain, body, binderInfo: "explicit" });
const Lam = (domain: Term, body: Term): Term => ({ tag: "lam", domain, body, binderInfo: "explicit" });

/** Restricted Type-0 Add class value; ordinary checked Core, not a kernel primitive. */
export function coreWaveGAddDeclarations(): CoreDeclaration[] {
  const addFn = Pi(B(0), Pi(B(1), B(2))); // under A
  const inductive: CoreDeclaration = {
    kind: "inductive",
    name: WAVEG_ADD,
    levelParams: [],
    type: Pi(S1, S1),
    numParams: 1,
    numIndices: 0,
    constructors: [{
      name: WAVEG_ADD_MK,
      type: Pi(S1, Pi(addFn, Apps(C(WAVEG_ADD), [B(1)]))),
    }],
  };
  const instanceType = Apps(C(WAVEG_ADD), [B(0)]); // under A
  const projection: CoreDeclaration = {
    kind: "definition",
    name: WAVEG_ADD_FIELD,
    levelParams: [],
    type: Pi(S1, Pi(instanceType, Pi(B(1), Pi(B(2), B(3))))),
    value: Lam(S1, Lam(instanceType, { tag: "proj", typeName: WAVEG_ADD, index: 0, expr: B(0) })),
    reducibility: "regular",
  };
  return [inductive, projection];
}

export function coreWaveGNatAddDictionary(): Term {
  return Apps(C(WAVEG_ADD_MK), [C("Nat"), C("Nat.add")]);
}

/** Build HAdd A A A from a checked Add A dictionary via the checked Add.add projection. */
export function coreWaveGHAddFromAdd(typeArg: Term, addDictionary: Term): Term {
  const addFn = Apps(C(WAVEG_ADD_FIELD), [typeArg, addDictionary]);
  return Apps(C(WAVEF_HADD_MK), [typeArg, typeArg, typeArg, addFn]);
}
