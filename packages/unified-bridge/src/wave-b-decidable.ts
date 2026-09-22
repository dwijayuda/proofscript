import { levelOfNat, type BinderInfo, type CoreDeclaration, type Level, type Term } from "@proofscript/kernel";

export const WAVEB_FALSE = "False" as const;
export const WAVEB_TRUE = "True" as const;
export const WAVEB_NOT = "Not" as const;
export const WAVEB_DECIDABLE = "Decidable" as const;
export const WAVEB_DECIDABLE_IS_FALSE = "Decidable.isFalse" as const;
export const WAVEB_DECIDABLE_IS_TRUE = "Decidable.isTrue" as const;
export const WAVEB_NAT_DEC_EQ = "ProofScript.Core.WaveB.Nat.decEq" as const;
export const WAVEB_NAT_DEC_LE = "ProofScript.Core.WaveB.Nat.decLe" as const;
export const WAVEB_NAT_DEC_LT = "ProofScript.Core.WaveB.Nat.decLt" as const;

const L0 = levelOfNat(0);
const L1 = levelOfNat(1);

type NamedTerm =
  | { readonly kind: "var"; readonly name: string }
  | { readonly kind: "const"; readonly name: string; readonly levels: readonly Level[] }
  | { readonly kind: "sort"; readonly level: Level }
  | { readonly kind: "app"; readonly fn: NamedTerm; readonly arg: NamedTerm }
  | { readonly kind: "lam"; readonly name: string; readonly domain: NamedTerm; readonly body: NamedTerm; readonly binderInfo: BinderInfo }
  | { readonly kind: "pi"; readonly name: string; readonly domain: NamedTerm; readonly body: NamedTerm; readonly binderInfo: BinderInfo };

const v = (name: string): NamedTerm => ({ kind: "var", name });
const c = (name: string, levels: readonly Level[] = []): NamedTerm => ({ kind: "const", name, levels });
const sort = (level: Level): NamedTerm => ({ kind: "sort", level });
const app = (fn: NamedTerm, arg: NamedTerm): NamedTerm => ({ kind: "app", fn, arg });
const apps = (fn: NamedTerm, args: readonly NamedTerm[]): NamedTerm => args.reduce(app, fn);
const lam = (name: string, domain: NamedTerm, body: NamedTerm, binderInfo: BinderInfo = "explicit"): NamedTerm => ({ kind: "lam", name, domain, body, binderInfo });
const pi = (name: string, domain: NamedTerm, body: NamedTerm, binderInfo: BinderInfo = "explicit"): NamedTerm => ({ kind: "pi", name, domain, body, binderInfo });

function compile(term: NamedTerm, env: readonly string[] = []): Term {
  switch (term.kind) {
    case "var": {
      const position = env.lastIndexOf(term.name);
      if (position < 0) throw new Error(`internal WaveB named-term compiler: unbound '${term.name}'`);
      return { tag: "bvar", index: env.length - 1 - position };
    }
    case "const": return { tag: "const", name: term.name, levels: [...term.levels] };
    case "sort": return { tag: "sort", level: term.level };
    case "app": return { tag: "app", fn: compile(term.fn, env), arg: compile(term.arg, env) };
    case "lam": return { tag: "lam", domain: compile(term.domain, env), body: compile(term.body, [...env, term.name]), binderInfo: term.binderInfo };
    case "pi": return { tag: "pi", domain: compile(term.domain, env), body: compile(term.body, [...env, term.name]), binderInfo: term.binderInfo };
  }
}

function def(name: string, type: NamedTerm, value: NamedTerm, reducibility: "regular" | "abbrev" = "regular"): CoreDeclaration {
  return { kind: "definition", name, levelParams: [], type: compile(type), value: compile(value), reducibility };
}
function theorem(name: string, type: NamedTerm, value: NamedTerm): CoreDeclaration {
  return { kind: "theorem", name, levelParams: [], type: compile(type), value: compile(value) };
}
function inductive(name: string, type: NamedTerm, numParams: number, numIndices: number, constructors: readonly (readonly [string, NamedTerm])[]): CoreDeclaration {
  return { kind: "inductive", name, levelParams: [], type: compile(type), numParams, numIndices, constructors: constructors.map(([ctorName, ctorType]) => ({ name: ctorName, type: compile(ctorType) })) };
}

const nat = c("Nat");
const prop = sort(L0);
const type = sort(L1);
const zero = c("Nat.zero");
const succ = (n: NamedTerm): NamedTerm => app(c("Nat.succ"), n);
const le = (n: NamedTerm, m: NamedTerm): NamedTerm => apps(c("Nat.le"), [n, m]);
const eqNat = (a: NamedTerm, b: NamedTerm): NamedTerm => apps(c("Eq", [L1]), [nat, a, b]);
const not = (p: NamedTerm): NamedTerm => app(c(WAVEB_NOT), p);
const decidable = (p: NamedTerm): NamedTerm => app(c(WAVEB_DECIDABLE), p);
const isTrue = (p: NamedTerm, proof: NamedTerm): NamedTerm => apps(c(WAVEB_DECIDABLE_IS_TRUE), [p, proof]);
const isFalse = (p: NamedTerm, proof: NamedTerm): NamedTerm => apps(c(WAVEB_DECIDABLE_IS_FALSE), [p, proof]);
const eqRefl = (x: NamedTerm): NamedTerm => apps(c("Eq.refl", [L1]), [nat, x]);
const leRefl = (n: NamedTerm): NamedTerm => app(c("Nat.le.refl"), n);
const leStep = (n: NamedTerm, m: NamedTerm, proof: NamedTerm): NamedTerm => apps(c("Nat.le.step"), [n, m, proof]);
const trueIntro = c("True.intro");

const IS_ZERO = "ProofScript.Core.WaveB.Nat.isZeroProp";
const IS_SUCC = "ProofScript.Core.WaveB.Nat.isSuccProp";
const PRED = "ProofScript.Core.WaveB.Nat.pred";
const ZERO_LE = "ProofScript.Core.WaveB.Nat.zero_le";
const SUCC_LE_SUCC = "ProofScript.Core.WaveB.Nat.succ_le_succ";
const NOT_SUCC_LE_ZERO = "ProofScript.Core.WaveB.Nat.not_succ_le_zero";
const LE_PRED_STEP = "ProofScript.Core.WaveB.Nat.le_pred_step";
const PRED_LE_PRED = "ProofScript.Core.WaveB.Nat.pred_le_pred";
const LE_OF_SUCC = "ProofScript.Core.WaveB.Nat.le_of_succ_le_succ";
const NO_EQ_ZERO_SUCC = "ProofScript.Core.WaveB.Nat.noEqZeroSucc";
const NO_EQ_SUCC_ZERO = "ProofScript.Core.WaveB.Nat.noEqSuccZero";
const SUCC_CONGR = "ProofScript.Core.WaveB.Nat.succCongr";
const SUCC_INJECTIVE = "ProofScript.Core.WaveB.Nat.succInjective";

const pred = (n: NamedTerm): NamedTerm => app(c(PRED), n);
const isZeroProp = (n: NamedTerm): NamedTerm => app(c(IS_ZERO), n);
const isSuccProp = (n: NamedTerm): NamedTerm => app(c(IS_SUCC), n);

/**
 * Exact Lean 4.33.1 logical foundations required to carry Decidable evidence in
 * Core. They are ordinary untrusted library declarations; default Core v71 K3-TB
 * checks them before any program is accepted.
 */
function coreLogicalFoundation(): CoreDeclaration[] {
  return [
    inductive(WAVEB_FALSE, prop, 0, 0, []),
    inductive(WAVEB_TRUE, prop, 0, 0, [["True.intro", c(WAVEB_TRUE)]]),
    def(WAVEB_NOT, pi("p", prop, prop), lam("p", prop, pi("_h", v("p"), c(WAVEB_FALSE))), "regular"),
    inductive(WAVEB_DECIDABLE, pi("p", prop, type), 1, 0, [
      [WAVEB_DECIDABLE_IS_FALSE, pi("p", prop, pi("h", not(v("p")), decidable(v("p"))), "implicit")],
      [WAVEB_DECIDABLE_IS_TRUE, pi("p", prop, pi("h", v("p"), decidable(v("p"))), "implicit")],
    ]),
  ];
}

function coreNatProofHelpers(): CoreDeclaration[] {
  const isZero = def(IS_ZERO, pi("n", nat, prop), lam("n", nat,
    apps(c("Nat.rec", [L1]), [
      lam("_k", nat, prop), c(WAVEB_TRUE),
      lam("_k", nat, lam("_ih", prop, c(WAVEB_FALSE))), v("n"),
    ])));
  const isSucc = def(IS_SUCC, pi("n", nat, prop), lam("n", nat,
    apps(c("Nat.rec", [L1]), [
      lam("_k", nat, prop), c(WAVEB_FALSE),
      lam("_k", nat, lam("_ih", prop, c(WAVEB_TRUE))), v("n"),
    ])));
  const predDecl = def(PRED, pi("n", nat, nat), lam("n", nat,
    apps(c("Nat.rec", [L1]), [
      lam("_k", nat, nat), zero,
      lam("k", nat, lam("_ih", nat, v("k"))), v("n"),
    ])));
  const zeroLe = theorem(ZERO_LE, pi("m", nat, le(zero, v("m"))), lam("m", nat,
    apps(c("Nat.rec", [L0]), [
      lam("k", nat, le(zero, v("k"))), leRefl(zero),
      lam("k", nat, lam("ih", le(zero, v("k")), leStep(zero, v("k"), v("ih")))), v("m"),
    ])));
  const succLeSucc = theorem(SUCC_LE_SUCC,
    pi("n", nat, pi("m", nat, pi("h", le(v("n"), v("m")), le(succ(v("n")), succ(v("m")))))),
    lam("n", nat, lam("m", nat, lam("h", le(v("n"), v("m")),
      apps(c("Nat.le.rec"), [
        v("n"),
        lam("k", nat, lam("_hk", le(v("n"), v("k")), le(succ(v("n")), succ(v("k"))))),
        leRefl(succ(v("n"))),
        lam("k", nat, lam("_hk", le(v("n"), v("k")), lam("ih", le(succ(v("n")), succ(v("k"))), leStep(succ(v("n")), succ(v("k")), v("ih")))), "implicit"),
        v("m"), v("h"),
      ])))));
  const notSuccLeZero = theorem(NOT_SUCC_LE_ZERO,
    pi("n", nat, pi("h", le(succ(v("n")), zero), c(WAVEB_FALSE))),
    lam("n", nat, lam("h", le(succ(v("n")), zero),
      apps(c("Nat.le.rec"), [
        succ(v("n")),
        lam("k", nat, lam("_hk", le(succ(v("n")), v("k")), isSuccProp(v("k")))),
        trueIntro,
        lam("k", nat, lam("_hk", le(succ(v("n")), v("k")), lam("_ih", isSuccProp(v("k")), trueIntro)), "implicit"),
        zero, v("h"),
      ]))));
  const lePredStep = theorem(LE_PRED_STEP,
    pi("n", nat, pi("m", nat, pi("h", le(pred(v("n")), pred(v("m"))), le(pred(v("n")), v("m"))))),
    lam("n", nat, lam("m", nat,
      apps(c("Nat.rec", [L0]), [
        lam("k", nat, pi("_h", le(pred(v("n")), pred(v("k"))), le(pred(v("n")), v("k")))),
        lam("h", le(pred(v("n")), pred(zero)), v("h")),
        lam("k", nat, lam("_ih", pi("_h", le(pred(v("n")), pred(v("k"))), le(pred(v("n")), v("k"))),
          lam("h", le(pred(v("n")), pred(succ(v("k")))), leStep(pred(v("n")), v("k"), v("h"))))),
        v("m"),
      ]))));
  const predLePred = theorem(PRED_LE_PRED,
    pi("n", nat, pi("m", nat, pi("h", le(v("n"), v("m")), le(pred(v("n")), pred(v("m")))))),
    lam("n", nat, lam("m", nat, lam("h", le(v("n"), v("m")),
      apps(c("Nat.le.rec"), [
        v("n"),
        lam("k", nat, lam("_hk", le(v("n"), v("k")), le(pred(v("n")), pred(v("k"))))),
        leRefl(pred(v("n"))),
        lam("k", nat, lam("_hk", le(v("n"), v("k")), lam("ih", le(pred(v("n")), pred(v("k"))), apps(c(LE_PRED_STEP), [v("n"), v("k"), v("ih")]))), "implicit"),
        v("m"), v("h"),
      ])))));
  const leOfSucc = theorem(LE_OF_SUCC,
    pi("n", nat, pi("m", nat, pi("h", le(succ(v("n")), succ(v("m"))), le(v("n"), v("m"))))),
    lam("n", nat, lam("m", nat, lam("h", le(succ(v("n")), succ(v("m"))),
      apps(c(PRED_LE_PRED), [succ(v("n")), succ(v("m")), v("h")])))));
  const noEqZeroSucc = theorem(NO_EQ_ZERO_SUCC,
    pi("m", nat, pi("h", eqNat(zero, succ(v("m"))), c(WAVEB_FALSE))),
    lam("m", nat, lam("h", eqNat(zero, succ(v("m"))),
      apps(c("Eq.rec", [L0, L1]), [
        nat, zero,
        lam("y", nat, lam("_hy", eqNat(zero, v("y")), isZeroProp(v("y")))),
        trueIntro,
        succ(v("m")), v("h"),
      ]))));
  const noEqSuccZero = theorem(NO_EQ_SUCC_ZERO,
    pi("n", nat, pi("h", eqNat(succ(v("n")), zero), c(WAVEB_FALSE))),
    lam("n", nat, lam("h", eqNat(succ(v("n")), zero),
      apps(c("Eq.rec", [L0, L1]), [
        nat, succ(v("n")),
        lam("y", nat, lam("_hy", eqNat(succ(v("n")), v("y")), isSuccProp(v("y")))),
        trueIntro,
        zero, v("h"),
      ]))));
  const succCongr = theorem(SUCC_CONGR,
    pi("n", nat, pi("m", nat, pi("h", eqNat(v("n"), v("m")), eqNat(succ(v("n")), succ(v("m")))))),
    lam("n", nat, lam("m", nat, lam("h", eqNat(v("n"), v("m")),
      apps(c("Eq.rec", [L0, L1]), [
        nat, v("n"),
        lam("y", nat, lam("_hy", eqNat(v("n"), v("y")), eqNat(succ(v("n")), succ(v("y"))))),
        eqRefl(succ(v("n"))),
        v("m"), v("h"),
      ])))));
  const succInjective = theorem(SUCC_INJECTIVE,
    pi("n", nat, pi("m", nat, pi("h", eqNat(succ(v("n")), succ(v("m"))), eqNat(v("n"), v("m"))))),
    lam("n", nat, lam("m", nat, lam("h", eqNat(succ(v("n")), succ(v("m"))),
      apps(c("Eq.rec", [L0, L1]), [
        nat, succ(v("n")),
        lam("y", nat, lam("_hy", eqNat(succ(v("n")), v("y")), eqNat(v("n"), pred(v("y"))))),
        eqRefl(v("n")),
        succ(v("m")), v("h"),
      ])))));
  return [isZero, isSucc, predDecl, zeroLe, succLeSucc, notSuccLeZero, lePredStep, predLePred, leOfSucc, noEqZeroSucc, noEqSuccZero, succCongr, succInjective];
}

function decCase(p: NamedTerm, outP: NamedTerm, major: NamedTerm, onFalse: (h: NamedTerm) => NamedTerm, onTrue: (h: NamedTerm) => NamedTerm): NamedTerm {
  return apps(c("Decidable.rec", [L1]), [
    p,
    lam("_d", decidable(p), decidable(outP)),
    lam("hn", not(p), onFalse(v("hn"))),
    lam("hp", p, onTrue(v("hp"))),
    major,
  ]);
}

function coreNatDeciders(): CoreDeclaration[] {
  const decLe = def(WAVEB_NAT_DEC_LE,
    pi("n", nat, pi("m", nat, decidable(le(v("n"), v("m"))))),
    lam("n", nat,
      apps(c("Nat.rec", [L1]), [
        lam("k", nat, pi("m", nat, decidable(le(v("k"), v("m"))))),
        lam("m", nat, isTrue(le(zero, v("m")), app(c(ZERO_LE), v("m")))),
        lam("k", nat, lam("ih", pi("m", nat, decidable(le(v("k"), v("m")))), lam("m", nat,
          apps(c("Nat.rec", [L1]), [
            lam("j", nat, decidable(le(succ(v("k")), v("j")))),
            isFalse(le(succ(v("k")), zero), app(c(NOT_SUCC_LE_ZERO), v("k"))),
            lam("j", nat, lam("_prev", decidable(le(succ(v("k")), v("j"))),
              decCase(
                le(v("k"), v("j")),
                le(succ(v("k")), succ(v("j"))),
                app(v("ih"), v("j")),
                hn => isFalse(le(succ(v("k")), succ(v("j"))), lam("hss", le(succ(v("k")), succ(v("j"))), app(hn, apps(c(LE_OF_SUCC), [v("k"), v("j"), v("hss")])))),
                hp => isTrue(le(succ(v("k")), succ(v("j"))), apps(c(SUCC_LE_SUCC), [v("k"), v("j"), hp])),
              ))),
            v("m"),
          ])))),
        v("n"),
      ])));
  const decLt = def(WAVEB_NAT_DEC_LT,
    pi("n", nat, pi("m", nat, decidable(le(succ(v("n")), v("m"))))),
    lam("n", nat, lam("m", nat, apps(c(WAVEB_NAT_DEC_LE), [succ(v("n")), v("m")]))));
  const decEq = def(WAVEB_NAT_DEC_EQ,
    pi("n", nat, pi("m", nat, decidable(eqNat(v("n"), v("m"))))),
    lam("n", nat,
      apps(c("Nat.rec", [L1]), [
        lam("k", nat, pi("m", nat, decidable(eqNat(v("k"), v("m"))))),
        lam("m", nat, apps(c("Nat.rec", [L1]), [
          lam("j", nat, decidable(eqNat(zero, v("j")))),
          isTrue(eqNat(zero, zero), eqRefl(zero)),
          lam("j", nat, lam("_prev", decidable(eqNat(zero, v("j"))), isFalse(eqNat(zero, succ(v("j"))), app(c(NO_EQ_ZERO_SUCC), v("j"))))),
          v("m"),
        ])),
        lam("k", nat, lam("ih", pi("m", nat, decidable(eqNat(v("k"), v("m")))), lam("m", nat,
          apps(c("Nat.rec", [L1]), [
            lam("j", nat, decidable(eqNat(succ(v("k")), v("j")))),
            isFalse(eqNat(succ(v("k")), zero), app(c(NO_EQ_SUCC_ZERO), v("k"))),
            lam("j", nat, lam("_prev", decidable(eqNat(succ(v("k")), v("j"))),
              decCase(
                eqNat(v("k"), v("j")),
                eqNat(succ(v("k")), succ(v("j"))),
                app(v("ih"), v("j")),
                hn => isFalse(eqNat(succ(v("k")), succ(v("j"))), lam("hss", eqNat(succ(v("k")), succ(v("j"))), app(hn, apps(c(SUCC_INJECTIVE), [v("k"), v("j"), v("hss")])))),
                hp => isTrue(eqNat(succ(v("k")), succ(v("j"))), apps(c(SUCC_CONGR), [v("k"), v("j"), hp])),
              ))),
            v("m"),
          ])))),
        v("n"),
      ])));
  return [decLe, decLt, decEq];
}

export function coreWaveBDecidableDeclarations(): CoreDeclaration[] {
  return [...coreLogicalFoundation(), ...coreNatProofHelpers(), ...coreNatDeciders()];
}

export function waveBReservedCoreNames(): readonly string[] {
  const names: string[] = [];
  for (const declaration of coreWaveBDecidableDeclarations()) {
    names.push(declaration.name);
    if (declaration.kind === "inductive") names.push(...declaration.constructors.map(constructor => constructor.name));
  }
  return names;
}
