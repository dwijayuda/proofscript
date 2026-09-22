import { CoreDeclaration } from "./Declaration";
import { Term } from "./Expr";
import { KernelUnsupportedError } from "./KernelError";
import { Level, LevelZero, levelParam, levelSucc } from "./Level";
import { expectedEqReflType, expectedEqType } from "./Quot";
import { Environment, checkAndAddDeclaration } from "./Environment";
import { ensureSort, infer } from "./TypeChecker";

export type PrimitiveFamily = "False" | "False.elim" | "True" | "Unit" | "Nat" | "Bool" | "String" | "UInt" | "Float" | "Eq" | "HEq" | "Nonempty" | "Classical.choice" | "Iff" | "Iff.mp" | "Iff.mpr" | "Iff.refl" | "Iff.symm" | "Iff.trans" | "propext" | "Quot";

const type0: Term = { tag: "sort", level: levelSucc(LevelZero) };
const prop: Term = { tag: "sort", level: LevelZero };

/** Small named-term helper used for Lean prelude axioms whose signatures are easier to audit with names. */
type PrimitiveNamedTerm =
  | { tag: "sort"; level: Level }
  | { tag: "var"; name: string }
  | { tag: "const"; name: string; levels: Level[] }
  | { tag: "app"; fn: PrimitiveNamedTerm; arg: PrimitiveNamedTerm }
  | { tag: "pi"; name: string; domain: PrimitiveNamedTerm; body: PrimitiveNamedTerm; binderInfo: "explicit" | "implicit" | "strictImplicit" | "instImplicit" }
  | { tag: "lam"; name: string; domain: PrimitiveNamedTerm; body: PrimitiveNamedTerm; binderInfo: "explicit" | "implicit" | "strictImplicit" | "instImplicit" };

const NS = (level: Level): PrimitiveNamedTerm => ({ tag: "sort", level });
const NV = (name: string): PrimitiveNamedTerm => ({ tag: "var", name });
const NC = (name: string, levels: Level[] = []): PrimitiveNamedTerm => ({ tag: "const", name, levels });
const NA = (fn: PrimitiveNamedTerm, arg: PrimitiveNamedTerm): PrimitiveNamedTerm => ({ tag: "app", fn, arg });
const NApps = (fn: PrimitiveNamedTerm, args: PrimitiveNamedTerm[]): PrimitiveNamedTerm => args.reduce((f, a) => NA(f, a), fn);
const NPi = (name: string, domain: PrimitiveNamedTerm, body: PrimitiveNamedTerm, binderInfo: "explicit" | "implicit" | "strictImplicit" | "instImplicit" = "explicit"): PrimitiveNamedTerm => ({ tag: "pi", name, domain, body, binderInfo });
const NLam = (name: string, domain: PrimitiveNamedTerm, body: PrimitiveNamedTerm, binderInfo: "explicit" | "implicit" | "strictImplicit" | "instImplicit" = "explicit"): PrimitiveNamedTerm => ({ tag: "lam", name, domain, body, binderInfo });
const NArrow = (domain: PrimitiveNamedTerm, body: PrimitiveNamedTerm): PrimitiveNamedTerm => NPi("_", domain, body, "explicit");

function lowerPrimitiveNamedTerm(term: PrimitiveNamedTerm, names: string[] = []): Term {
  switch (term.tag) {
    case "sort": return { tag: "sort", level: term.level };
    case "var": {
      for (let i = names.length - 1; i >= 0; i--) if (names[i] === term.name) return { tag: "bvar", index: names.length - 1 - i };
      throw new Error(`internal primitive generator: unbound variable ${term.name}`);
    }
    case "const": return { tag: "const", name: term.name, levels: term.levels };
    case "app": return { tag: "app", fn: lowerPrimitiveNamedTerm(term.fn, names), arg: lowerPrimitiveNamedTerm(term.arg, names) };
    case "pi": return { tag: "pi", domain: lowerPrimitiveNamedTerm(term.domain, names), body: lowerPrimitiveNamedTerm(term.body, [...names, term.name]), binderInfo: term.binderInfo };
    case "lam": return { tag: "lam", domain: lowerPrimitiveNamedTerm(term.domain, names), body: lowerPrimitiveNamedTerm(term.body, [...names, term.name]), binderInfo: term.binderInfo };
  }
}
const c = (name: string, levels: Level[] = []): Term => ({ tag: "const", name, levels });
const pi = (domain: Term, body: Term, binderInfo: "explicit" | "implicit" | "strictImplicit" | "instImplicit" = "explicit"): Term => ({ tag: "pi", domain, body, binderInfo });
const app = (fn: Term, arg: Term): Term => ({ tag: "app", fn, arg });
const apps = (fn: Term, args: Term[]): Term => args.reduce((f, a) => app(f, a), fn);


/** Lean-style empty proposition. Its generated recursor provides ex-falso elimination. */
export function falseDeclaration(): Extract<CoreDeclaration, { kind: "inductive" }> {
  return {
    kind: "inductive",
    name: "False",
    levelParams: [],
    type: prop,
    numParams: 0,
    numIndices: 0,
    constructors: [],
  };
}

/** Checked Lean-style theorem `False.elim`, derived from generated `False.rec`; not a new trusted axiom. */
export function falseElimDefinition(levelParamName = "u"): Extract<CoreDeclaration, { kind: "definition" }> {
  const u = levelParam(levelParamName);
  const C = NV("C");
  const falseTerm = NC("False");
  const type = NPi("C", NS(u), NArrow(falseTerm, C), "implicit");
  const motive = NLam("_", falseTerm, C);
  const value = NLam("C", NS(u), NLam("h", falseTerm, NApps(NC("False.rec", [u]), [motive, NV("h")])), "implicit");
  return {
    kind: "definition",
    name: "False.elim",
    levelParams: [levelParamName],
    type: lowerPrimitiveNamedTerm(type),
    value: lowerPrimitiveNamedTerm(value),
    reducibility: "regular",
  };
}


/** Lean-style true proposition. */
export function trueDeclaration(): Extract<CoreDeclaration, { kind: "inductive" }> {
  return {
    kind: "inductive",
    name: "True",
    levelParams: [],
    type: prop,
    numParams: 0,
    numIndices: 0,
    constructors: [{ name: "True.intro", type: c("True") }],
  };
}

/** Lean-style Unit primitive family as an ordinary trusted Core inductive declaration. */
export function generateUnitDeclaration(): Extract<CoreDeclaration, { kind: "inductive" }> {
  return {
    kind: "inductive",
    name: "Unit",
    levelParams: [],
    type: type0,
    numParams: 0,
    numIndices: 0,
    constructors: [{ name: "Unit.unit", type: c("Unit") }],
  };
}

/** Lean-style Bool primitive family as an ordinary trusted Core inductive declaration. */
export function generateBoolDeclaration(): Extract<CoreDeclaration, { kind: "inductive" }> {
  return {
    kind: "inductive",
    name: "Bool",
    levelParams: [],
    type: type0,
    numParams: 0,
    numIndices: 0,
    constructors: [
      { name: "Bool.false", type: c("Bool") },
      { name: "Bool.true", type: c("Bool") },
    ],
  };
}

/** Lean-style Nat primitive family as an ordinary trusted Core inductive declaration. */
export function generateNatDeclaration(): Extract<CoreDeclaration, { kind: "inductive" }> {
  const nat = c("Nat");
  return {
    kind: "inductive",
    name: "Nat",
    levelParams: [],
    type: type0,
    numParams: 0,
    numIndices: 0,
    constructors: [
      { name: "Nat.zero", type: nat },
      { name: "Nat.succ", type: pi(nat, nat) },
    ],
  };
}

/**
 * Lean-style Eq primitive family.  The shape intentionally matches the quotient
 * initializer guard in `Quot.ts`: one universe parameter, two uniform parameters
 * (`α`, lhs), one index (rhs), and constructor `Eq.refl`.
 */
export function generateEqDeclaration(levelParamName = "u"): Extract<CoreDeclaration, { kind: "inductive" }> {
  if (levelParamName !== "u") {
    const u = levelParam(levelParamName);
    const alpha: Term = { tag: "bvar", index: 0 };
    const a: Term = { tag: "bvar", index: 0 };
    const alphaFromTwoBinders: Term = { tag: "bvar", index: 1 };
    const eqAlphaAA = apps(c("Eq", [u]), [alphaFromTwoBinders, a, a]);
    return {
      kind: "inductive",
      name: "Eq",
      levelParams: [levelParamName],
      type: pi({ tag: "sort", level: u }, pi(alpha, pi(alpha, prop), "explicit"), "implicit"),
      numParams: 2,
      numIndices: 1,
      constructors: [{ name: "Eq.refl", type: pi({ tag: "sort", level: u }, pi(alpha, eqAlphaAA), "implicit") }],
    };
  }
  return {
    kind: "inductive",
    name: "Eq",
    levelParams: ["u"],
    type: expectedEqType("u"),
    numParams: 2,
    numIndices: 1,
    constructors: [{ name: "Eq.refl", type: expectedEqReflType("u") }],
  };
}

/**
 * Lean-style heterogeneous equality primitive family.  Lean 4.33.1 exposes
 * `HEq.{u} {α : Sort u} : α → {β : Sort u} → β → Prop` with the nullary
 * constructor `HEq.refl`; its generated recursor participates in RecursorVal.k
 * just like Eq for matching endpoints.
 */
export function generateHEqDeclaration(levelParamName = "u"): Extract<CoreDeclaration, { kind: "inductive" }> {
  const u = levelParam(levelParamName);
  const heq = c("HEq", [u]);
  const heqType = pi(
    { tag: "sort", level: u },
    pi(
      { tag: "bvar", index: 0 },
      pi(
        { tag: "sort", level: u },
        pi({ tag: "bvar", index: 0 }, prop, "explicit"),
        "implicit",
      ),
      "explicit",
    ),
    "implicit",
  );
  const reflResult = apps(heq, [
    { tag: "bvar", index: 1 },
    { tag: "bvar", index: 0 },
    { tag: "bvar", index: 1 },
    { tag: "bvar", index: 0 },
  ]);
  const reflType = pi(
    { tag: "sort", level: u },
    pi({ tag: "bvar", index: 0 }, reflResult, "explicit"),
    "implicit",
  );
  return {
    kind: "inductive",
    name: "HEq",
    levelParams: [levelParamName],
    type: heqType,
    numParams: 2,
    numIndices: 2,
    constructors: [{ name: "HEq.refl", type: reflType }],
  };
}


/**
 * Lean-style `Nonempty` primitive family. Lean 4.33.1 exposes it as an
 * impredicative proposition over an arbitrary universe: `Sort u → Prop`.
 * Its constructor has one implicit parameter and one data field, so the
 * generated recursor is Prop-elimination-only while `Classical.choice` below
 * is the explicit trusted axiom that can produce data from it.
 */
export function nonemptyDeclaration(levelParamName = "u"): Extract<CoreDeclaration, { kind: "inductive" }> {
  const u = levelParam(levelParamName);
  const alphaSort: Term = { tag: "sort", level: u };
  const alpha: Term = { tag: "bvar", index: 0 };
  const nonemptyAlpha: Term = apps(c("Nonempty", [u]), [{ tag: "bvar", index: 1 }]);
  return {
    kind: "inductive",
    name: "Nonempty",
    levelParams: [levelParamName],
    type: pi(alphaSort, prop),
    numParams: 1,
    numIndices: 0,
    constructors: [{ name: "Nonempty.intro", type: pi(alphaSort, pi(alpha, nonemptyAlpha), "implicit") }],
  };
}

/** Lean's classical choice axiom, pinned to Lean 4.33.1. */
export function classicalChoiceAxiom(levelParamName = "u"): Extract<CoreDeclaration, { kind: "axiom" }> {
  const u = levelParam(levelParamName);
  const a = NV("α");
  return {
    kind: "axiom",
    name: "Classical.choice",
    levelParams: [levelParamName],
    type: lowerPrimitiveNamedTerm(NPi("α", NS(u), NArrow(NApps(NC("Nonempty", [u]), [a]), a), "implicit")),
  };
}

/**
 * Lean-style propositional equivalence.  Lean 4.33.1 exposes `Iff` as a
 * proposition-valued structure with two parameters and constructor
 * `Iff.intro`.  It is required by the canonical `propext` axiom below.
 */
export function generateIffDeclaration(): Extract<CoreDeclaration, { kind: "inductive" }> {
  const a = NV("a"), b = NV("b"), mp = NArrow(a, b), mpr = NArrow(b, a);
  return {
    kind: "inductive",
    name: "Iff",
    levelParams: [],
    type: lowerPrimitiveNamedTerm(NArrow(NS(LevelZero), NArrow(NS(LevelZero), NS(LevelZero)))),
    numParams: 2,
    numIndices: 0,
    constructors: [{
      name: "Iff.intro",
      type: lowerPrimitiveNamedTerm(NPi("a", NS(LevelZero), NPi("b", NS(LevelZero), NPi("mp", mp, NPi("mpr", mpr, NApps(NC("Iff"), [a, b]), "explicit"), "explicit"), "implicit"), "implicit")),
    }],
  };
}

function iffMpTypeNamed(): PrimitiveNamedTerm {
  const a = NV("a"), b = NV("b");
  return NPi("a", NS(LevelZero), NPi("b", NS(LevelZero), NArrow(NApps(NC("Iff"), [a, b]), NArrow(a, b)), "implicit"), "implicit");
}

function iffMprTypeNamed(): PrimitiveNamedTerm {
  const a = NV("a"), b = NV("b");
  return NPi("a", NS(LevelZero), NPi("b", NS(LevelZero), NArrow(NApps(NC("Iff"), [a, b]), NArrow(b, a)), "implicit"), "implicit");
}

/** Checked Lean-style theorem `Iff.mp`, derived from the generated `Iff.rec`; not a new trusted axiom. */
export function iffMpDefinition(): Extract<CoreDeclaration, { kind: "theorem" }> {
  const a = NV("a"), b = NV("b");
  const iffAB = NApps(NC("Iff"), [a, b]);
  const mp = NArrow(a, b), mpr = NArrow(b, a);
  const motive = NLam("h", iffAB, mp);
  const minor = NLam("mp", mp, NLam("mpr", mpr, NV("mp")));
  const rec = NApps(NC("Iff.rec", [LevelZero]), [a, b, motive, minor, NV("h")]);
  const value = NLam("a", NS(LevelZero), NLam("b", NS(LevelZero), NLam("h", iffAB, NLam("hp", a, NA(rec, NV("hp"))))));
  return {
    kind: "theorem",
    name: "Iff.mp",
    levelParams: [],
    type: lowerPrimitiveNamedTerm(iffMpTypeNamed()),
    value: lowerPrimitiveNamedTerm(value),
  };
}

/** Checked Lean-style theorem `Iff.mpr`, derived from the generated `Iff.rec`; not a new trusted axiom. */
export function iffMprDefinition(): Extract<CoreDeclaration, { kind: "theorem" }> {
  const a = NV("a"), b = NV("b");
  const iffAB = NApps(NC("Iff"), [a, b]);
  const mp = NArrow(a, b), mpr = NArrow(b, a);
  const motive = NLam("h", iffAB, mpr);
  const minor = NLam("mp", mp, NLam("mpr", mpr, NV("mpr")));
  const rec = NApps(NC("Iff.rec", [LevelZero]), [a, b, motive, minor, NV("h")]);
  const value = NLam("a", NS(LevelZero), NLam("b", NS(LevelZero), NLam("h", iffAB, NLam("hq", b, NA(rec, NV("hq"))))));
  return {
    kind: "theorem",
    name: "Iff.mpr",
    levelParams: [],
    type: lowerPrimitiveNamedTerm(iffMprTypeNamed()),
    value: lowerPrimitiveNamedTerm(value),
  };
}


function iffReflTypeNamed(): PrimitiveNamedTerm {
  const a = NV("a");
  return NPi("a", NS(LevelZero), NApps(NC("Iff"), [a, a]), "explicit");
}

function iffSymmTypeNamed(): PrimitiveNamedTerm {
  const a = NV("a"), b = NV("b");
  return NPi("a", NS(LevelZero), NPi("b", NS(LevelZero), NArrow(NApps(NC("Iff"), [a, b]), NApps(NC("Iff"), [b, a])), "implicit"), "implicit");
}

function iffTransTypeNamed(): PrimitiveNamedTerm {
  const a = NV("a"), b = NV("b"), c = NV("c");
  return NPi("a", NS(LevelZero), NPi("b", NS(LevelZero), NPi("c", NS(LevelZero), NArrow(NApps(NC("Iff"), [a, b]), NArrow(NApps(NC("Iff"), [b, c]), NApps(NC("Iff"), [a, c]))), "implicit"), "implicit"), "implicit");
}

/** Checked Lean-style theorem `Iff.refl`, derived from `Iff.intro`; not a new trusted axiom. */
export function iffReflDefinition(): Extract<CoreDeclaration, { kind: "theorem" }> {
  const a = NV("a");
  const idA = NLam("h", a, NV("h"));
  const value = NLam("a", NS(LevelZero), NApps(NC("Iff.intro"), [a, a, idA, idA]));
  return {
    kind: "theorem",
    name: "Iff.refl",
    levelParams: [],
    type: lowerPrimitiveNamedTerm(iffReflTypeNamed()),
    value: lowerPrimitiveNamedTerm(value),
  };
}

/** Checked Lean-style theorem `Iff.symm`, derived from `Iff.intro`, `Iff.mp`, and `Iff.mpr`; not a new trusted axiom. */
export function iffSymmDefinition(): Extract<CoreDeclaration, { kind: "theorem" }> {
  const a = NV("a"), b = NV("b"), h = NV("h");
  const iffAB = NApps(NC("Iff"), [a, b]);
  const mpBA = NApps(NC("Iff.mpr"), [a, b, h]);
  const mprAB = NApps(NC("Iff.mp"), [a, b, h]);
  const value = NLam("a", NS(LevelZero), NLam("b", NS(LevelZero), NLam("h", iffAB, NApps(NC("Iff.intro"), [b, a, mpBA, mprAB])), "implicit"), "implicit");
  return {
    kind: "theorem",
    name: "Iff.symm",
    levelParams: [],
    type: lowerPrimitiveNamedTerm(iffSymmTypeNamed()),
    value: lowerPrimitiveNamedTerm(value),
  };
}

/** Checked Lean-style theorem `Iff.trans`, derived from `Iff.intro`, `Iff.mp`, and `Iff.mpr`; not a new trusted axiom. */
export function iffTransDefinition(): Extract<CoreDeclaration, { kind: "theorem" }> {
  const a = NV("a"), b = NV("b"), c0 = NV("c"), h1 = NV("h1"), h2 = NV("h2"), ha = NV("ha"), hc = NV("hc");
  const iffAB = NApps(NC("Iff"), [a, b]);
  const iffBC = NApps(NC("Iff"), [b, c0]);
  const mpAB = NApps(NC("Iff.mp"), [a, b, h1]);
  const mpBC = NApps(NC("Iff.mp"), [b, c0, h2]);
  const mprAB = NApps(NC("Iff.mpr"), [a, b, h1]);
  const mprBC = NApps(NC("Iff.mpr"), [b, c0, h2]);
  const forward = NLam("ha", a, NA(mpBC, NA(mpAB, ha)));
  const backward = NLam("hc", c0, NA(mprAB, NA(mprBC, hc)));
  const value = NLam("a", NS(LevelZero), NLam("b", NS(LevelZero), NLam("c", NS(LevelZero), NLam("h1", iffAB, NLam("h2", iffBC, NApps(NC("Iff.intro"), [a, c0, forward, backward]))), "implicit"), "implicit"), "implicit");
  return {
    kind: "theorem",
    name: "Iff.trans",
    levelParams: [],
    type: lowerPrimitiveNamedTerm(iffTransTypeNamed()),
    value: lowerPrimitiveNamedTerm(value),
  };
}

/** Lean's propositional extensionality axiom, pinned to Lean 4.33.1. */
export function propextAxiom(): Extract<CoreDeclaration, { kind: "axiom" }> {
  const a = NV("a"), b = NV("b");
  const iffAB = NApps(NC("Iff"), [a, b]);
  const eqAB = NApps(NC("Eq", [levelSucc(LevelZero)]), [NS(LevelZero), a, b]);
  return {
    kind: "axiom",
    name: "propext",
    levelParams: [],
    type: lowerPrimitiveNamedTerm(NPi("a", NS(LevelZero), NPi("b", NS(LevelZero), NArrow(iffAB, eqAB), "implicit"), "implicit")),
  };
}

/** Prelude slice sufficient for core smoke/replay and canonical quotient initialization. */
export function generateCorePrimitiveDeclarations(): CoreDeclaration[] {
  return [falseDeclaration(), falseElimDefinition(), trueDeclaration(), generateUnitDeclaration(), generateBoolDeclaration(), generateNatDeclaration(), generateEqDeclaration(), generateHEqDeclaration()];
}

/** Prelude slice plus Lean propositional extensionality support. */
export function generateCorePrimitiveDeclarationsWithPropext(): CoreDeclaration[] {
  return [...generateCorePrimitiveDeclarations(), generateIffDeclaration(), iffMpDefinition(), iffMprDefinition(), iffReflDefinition(), iffSymmDefinition(), iffTransDefinition(), propextAxiom()];
}

/** Prelude slice plus Lean classical choice support. */
export function generateCorePrimitiveDeclarationsWithClassical(options: { propext?: boolean } = {}): CoreDeclaration[] {
  const base = options.propext ? generateCorePrimitiveDeclarationsWithPropext() : generateCorePrimitiveDeclarations();
  return [...base, nonemptyDeclaration(), classicalChoiceAxiom()];
}

/** Prelude slice plus the explicit canonical Quot marker that installs quotient kernel primitives. */
export function generateCorePrimitiveDeclarationsWithQuot(options: { propext?: boolean; classical?: boolean } = {}): CoreDeclaration[] {
  const base = options.classical ? generateCorePrimitiveDeclarationsWithClassical({ propext: options.propext }) : (options.propext ? generateCorePrimitiveDeclarationsWithPropext() : generateCorePrimitiveDeclarations());
  return [...base, { kind: "quot", name: "Quot", levelParams: [] }];
}


export interface CorePrimitiveInstallOptions { quotients?: boolean; propext?: boolean; classical?: boolean; }

/**
 * Install the standalone primitive prelude into an Environment using the normal
 * declaration admission path.  This is deliberately small: it bootstraps only
 * False/False.elim/Unit/Bool/Nat/Eq/HEq and optionally propositional extensionality, classical choice, and the canonical quotient marker.
 */
export function installCorePrimitives(env: Environment, options: CorePrimitiveInstallOptions = {}): string[] {
  const decls = options.quotients ? generateCorePrimitiveDeclarationsWithQuot({ propext: options.propext, classical: options.classical }) : (options.classical ? generateCorePrimitiveDeclarationsWithClassical({ propext: options.propext }) : (options.propext ? generateCorePrimitiveDeclarationsWithPropext() : generateCorePrimitiveDeclarations()));
  const installed: string[] = [];
  for (const decl of decls) {
    if (decl.kind === "axiom" && (decl.name === "propext" || decl.name === "Classical.choice")) {
      ensureSort(env, [], infer(env, [], decl.type));
      const generated = env.addCoreDeclaration(decl, new Set());
      installed.push(decl.name, ...generated);
      continue;
    }
    if (decl.kind === "inductive" && decl.name === "False") {
      // The standalone default profile still rejects arbitrary user empty
      // inductives. `False` is a canonical trusted prelude primitive, so the
      // installer enables exactly the empty-inductive admission needed to
      // generate `False.rec`, then restores the caller's profile flags.
      const previous = env.options.allowEmptyInductives;
      (env.options as any).allowEmptyInductives = true;
      try {
        const result = checkAndAddDeclaration(env, decl);
        installed.push(decl.name, ...result.generated);
      } finally {
        (env.options as any).allowEmptyInductives = previous;
      }
      continue;
    }
    const result = checkAndAddDeclaration(env, decl);
    installed.push(decl.name, ...result.generated);
  }
  return installed;
}

export function requirePrimitiveImplemented(name: string): never {
  throw new KernelUnsupportedError(`primitive ${name} is not implemented in the pskernel TypeScript kernel slice yet`);
}

export const portStatus_PSKernel_Primitive = {
  source: "PSKernel/Primitive.lean",
  target: "packages/kernel/src/PSKernel/Primitive.ts",
  status: "partial",
  trustedBoundary: true,
  proofStatus: "not-proven",
} as const;
