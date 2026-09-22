import { levelOfNat, type CoreDeclaration, type Term } from "@proofscript/kernel";

export const WAVEF_HADD = "HAdd" as const;
export const WAVEF_HADD_MK = "HAdd.mk" as const;
export const WAVEF_HADD_FIELD = "HAdd.hAdd" as const;

const S1: Term = { tag: "sort", level: levelOfNat(1) };
const B = (index: number): Term => ({ tag: "bvar", index });
const C = (name: string): Term => ({ tag: "const", name, levels: [] });
const App = (fn: Term, arg: Term): Term => ({ tag: "app", fn, arg });
const Apps = (fn: Term, args: Term[]): Term => args.reduce(App, fn);
const Pi = (domain: Term, body: Term): Term => ({ tag: "pi", domain, body, binderInfo: "explicit" });
const Lam = (domain: Term, body: Term): Term => ({ tag: "lam", domain, body, binderInfo: "explicit" });

/**
 * Restricted Type-0 HAdd class value for the unified bridge.
 *
 * This is ordinary checked Core data, not a kernel primitive.  It mirrors the
 * Lean class shape needed by the current portable Type-0 slice:
 *
 *   class HAdd (A B C : Type) where hAdd : A -> B -> C
 *
 * The field function is exposed by a checked raw-projection-backed definition.
 */
export function coreWaveFHAddDeclarations(): CoreDeclaration[] {
  const hAddType = Pi(B(2), Pi(B(2), B(2))); // under A,B,C
  const inductive: CoreDeclaration = {
    kind: "inductive",
    name: WAVEF_HADD,
    levelParams: [],
    type: Pi(S1, Pi(S1, Pi(S1, S1))),
    numParams: 3,
    numIndices: 0,
    constructors: [{
      name: WAVEF_HADD_MK,
      type: Pi(S1, Pi(S1, Pi(S1, Pi(
        hAddType,
        Apps(C(WAVEF_HADD), [B(3), B(2), B(1)]),
      )))),
    }],
  };

  const instanceType = Apps(C(WAVEF_HADD), [B(2), B(1), B(0)]); // under A,B,C
  const fieldType = Pi(S1, Pi(S1, Pi(S1, Pi(
    instanceType,
    Pi(B(3), Pi(B(3), B(3))), // under A,B,C,h
  ))));
  const fieldValue = Lam(S1, Lam(S1, Lam(S1, Lam(
    instanceType,
    { tag: "proj", typeName: WAVEF_HADD, index: 0, expr: B(0) },
  ))));
  const projection: CoreDeclaration = {
    kind: "definition",
    name: WAVEF_HADD_FIELD,
    levelParams: [],
    type: fieldType,
    value: fieldValue,
    reducibility: "regular",
  };
  return [inductive, projection];
}

export function coreWaveFNatHAddDictionary(): Term {
  return Apps(C(WAVEF_HADD_MK), [C("Nat"), C("Nat"), C("Nat"), C("Nat.add")]);
}
