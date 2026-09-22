// Paired, hand-authored kernel terms and Lean declarations. This is a bounded
// conformance corpus, not a general Core-to-Lean compiler or an equivalence proof.
const C = name => ({ tag: 'const', name, levels: [] });
const S = n => ({ tag: 'sort', level: n === 0 ? { tag: 'zero' } : { tag: 'succ', of: S(n - 1).level } });
const V = index => ({ tag: 'bvar', index });
const App = (fn, arg) => ({ tag: 'app', fn, arg });
const Pi = (domain, body, binderInfo = 'explicit') => ({ tag: 'pi', domain, body, binderInfo });
const Lam = (domain, body, binderInfo = 'explicit') => ({ tag: 'lam', domain, body, binderInfo });
const Proj = (typeName, index, expr) => ({ tag: 'proj', typeName, index, expr });
const Let = (type, value, body) => ({ tag: 'let', type, value, body, nondep: false });
const A = C('PortA'), a = C('porta'), f = C('portf'), fnType = Pi(A, A);
const ax = (name, type) => ({ kind: 'axiom', name, type, levelParams: [] });
export const declarations = [
  ax('PortA', S(1)), ax('porta', A), ax('portb', A), ax('portf', fnType),
  ax('PortB', Pi(A, S(1))), ax('portdf', Pi(A, App(C('PortB'), V(0)))),
  { kind: 'inductive', name: 'PortOne', type: S(1), levelParams: [], numParams: 0, numIndices: 0,
    constructors: [{ name: 'PortOne.mk', type: C('PortOne') }] },
  ax('portone1', C('PortOne')), ax('portone2', C('PortOne')),
  { kind: 'inductive', name: 'PortPack', type: S(2), levelParams: [], numParams: 0, numIndices: 0,
    constructors: [{ name: 'PortPack.mk', type: Pi(S(1), Pi(V(0), C('PortPack'))) }] },
  ax('portpack', C('PortPack')),
  { kind: 'inductive', name: 'PortBox', type: S(1), levelParams: [], numParams: 0, numIndices: 0,
    constructors: [{ name: 'PortBox.mk', type: Pi(A, C('PortBox')) }] },
  ax('portboxFn', Pi(A, C('PortBox'))),
];
export const leanPrelude = `import Lean
axiom PortA : Type
axiom porta : PortA
axiom portb : PortA
axiom portf : PortA → PortA
axiom PortB : PortA → Type
axiom portdf : (x : PortA) → PortB x
inductive PortOne : Type where | mk : PortOne
axiom portone1 : PortOne
axiom portone2 : PortOne
structure PortPack : Type 1 where
  Carrier : Type
  value : Carrier
axiom portpack : PortPack
structure PortBox : Type where
  value : PortA
axiom portboxFn : PortA → PortBox
def portImplicitId {x : PortA} : PortA := x
`;
export const cases = [
  { id: 'function-eta', kind: 'defeq', type: fnType, left: f, right: Lam(A, App(f, V(0))), expected: 'accepted',
    lean: 'example : portf = (fun x => portf x) := rfl' },
  { id: 'local-function-eta', kind: 'defeq', type: Pi(fnType, fnType),
    left: Lam(fnType, V(0)), right: Lam(fnType, Lam(A, App(V(1), V(0)))), expected: 'accepted',
    lean: 'example : (fun (g : PortA → PortA) => g) = (fun g x => g x) := rfl' },
  { id: 'dependent-function-eta', kind: 'defeq', type: Pi(A, App(C('PortB'), V(0))),
    left: C('portdf'), right: Lam(A, App(C('portdf'), V(0))), expected: 'accepted',
    lean: 'example : portdf = (fun x => portdf x) := rfl' },
  { id: 'binder-annotations', kind: 'defeq', type: fnType,
    left: Lam(A, V(0)), right: Lam(A, V(0), 'implicit'), expected: 'accepted',
    lean: 'example : (fun (x : PortA) => x) = @portImplicitId := rfl' },
  { id: 'let-type-alias', kind: 'check', type: A,
    term: Let(S(1), A, App(Lam(V(0), V(0)), a)), expected: 'accepted',
    lean: 'def portCase : PortA := let T : Type := PortA; (fun (x : T) => x) porta' },
  { id: 'nested-let-type-alias', kind: 'check', type: A,
    term: Let(S(1), A, Let(S(1), V(0), App(Lam(V(0), V(0)), a))), expected: 'accepted',
    lean: 'def portCase : PortA := let T : Type := PortA; let U : Type := T; (fun (x : U) => x) porta' },
  { id: 'unit-like-equality', kind: 'defeq', type: C('PortOne'), left: C('portone1'), right: C('portone2'), expected: 'accepted',
    lean: 'example : portone1 = portone2 := rfl' },
  { id: 'dependent-projection', kind: 'check', type: Proj('PortPack', 0, C('portpack')),
    term: Proj('PortPack', 1, C('portpack')), expected: 'accepted',
    lean: 'def portCase : portpack.Carrier := portpack.value' },
  { id: 'projection-congruence', kind: 'defeq', type: A,
    left: Proj('PortBox', 0, App(C('portboxFn'), App(Lam(A, V(0)), a))),
    right: Proj('PortBox', 0, App(C('portboxFn'), a)), expected: 'accepted',
    lean: 'example : (portboxFn ((fun x => x) porta)).value = (portboxFn porta).value := rfl' },
  { id: 'distinct-abstract-values', kind: 'defeq', type: A, left: a, right: C('portb'), expected: 'rejected',
    lean: 'example : porta = portb := rfl' },
  { id: 'wrong-function-type', kind: 'check', type: fnType, term: a, expected: 'rejected',
    lean: 'def portCase : PortA → PortA := porta' },
];

export function runTypeScriptCorpus(kernel) {
  const env = new kernel.Environment();
  for (const declaration of declarations) kernel.checkAndAddDeclaration(env, declaration);
  return cases.map(c => {
    try {
      let accepted;
      if (c.kind === 'check') { kernel.check(env, [], c.term, c.type); accepted = true; }
      else {
        kernel.check(env, [], c.left, c.type);
        kernel.check(env, [], c.right, c.type);
        accepted = kernel.defEq(env, [], c.left, c.right);
      }
      return { id: c.id, status: accepted ? 'accepted' : 'rejected', expected: c.expected };
    } catch (e) {
      const status = e.code === 'kernel_type_error' ? 'rejected' : e.code === 'kernel_unsupported' ? 'unsupported' : e.code === 'kernel_resource_limit' ? 'resource-limit' : 'error';
      return { id: c.id, status, expected: c.expected, message: e.message };
    }
  });
}

// Keep the original surface examples available for separate elaborator checks.
// Axioms have no executable implementation; these definitions only test typing.
export function elaboratedLeanSource(c) {
  return `${leanPrelude}\n${c.lean.replace(/^def /, 'noncomputable def ')}\n`;
}

function leanName(name) {
  return name.split('.').reduce((prefix, part) => `(Lean.Name.str ${prefix} ${JSON.stringify(part)})`, 'Lean.Name.anonymous');
}
function leanLevel(level) {
  switch (level.tag) {
    case 'zero': return 'Lean.Level.zero';
    case 'succ': return `(Lean.Level.succ ${leanLevel(level.of)})`;
    case 'param': return `(Lean.Level.param ${leanName(level.name)})`;
    case 'max': case 'imax': return `(Lean.Level.${level.tag} ${leanLevel(level.left)} ${leanLevel(level.right)})`;
    default: throw new Error(`unsupported reference level: ${level.tag}`);
  }
}
// Serialize this bounded corpus's checked Core expressions, preserving de Bruijn
// indices and binder annotations. This is not a source-language translator.
function leanExpr(t) {
  switch (t.tag) {
    case 'sort': return `(Lean.Expr.sort ${leanLevel(t.level)})`;
    case 'bvar': return `(Lean.Expr.bvar ${t.index})`;
    case 'const': return `(Lean.Expr.const ${leanName(t.name)} [${t.levels.map(leanLevel).join(', ')}])`;
    case 'app': return `(Lean.Expr.app ${leanExpr(t.fn)} ${leanExpr(t.arg)})`;
    case 'lam': case 'pi': {
      const binder = t.binderInfo === undefined || t.binderInfo === 'explicit' ? 'default' : t.binderInfo;
      return `(Lean.Expr.${t.tag === 'pi' ? 'forallE' : 'lam'} Lean.Name.anonymous ${leanExpr(t.domain)} ${leanExpr(t.body)} Lean.BinderInfo.${binder})`;
    }
    case 'let': return `(Lean.Expr.letE Lean.Name.anonymous ${leanExpr(t.type)} ${leanExpr(t.value)} ${leanExpr(t.body)} ${t.nondep})`;
    case 'proj': return `(Lean.Expr.proj ${leanName(t.typeName)} ${t.index} ${leanExpr(t.expr)})`;
    default: throw new Error(`unsupported reference expression: ${t.tag}`);
  }
}

export function leanSource(c) {
  const terms = c.kind === 'check' ? [c.term] : [c.left, c.right];
  const checks = terms.map((t, i) => `    let inferred${i} ← Lean.Kernel.check env {} ${leanExpr(t)}
    if !(← Lean.Kernel.isDefEq env {} inferred${i} ${leanExpr(c.type)}) then return false`).join('\n');
  const decision = c.kind === 'check' ? '    pure true' : `    Lean.Kernel.isDefEq env {} ${leanExpr(c.left)} ${leanExpr(c.right)}`;
  return `${leanPrelude}
-- Compare the kernel decision, independently of Meta.isDefEq / rfl elaboration.
open Lean Elab Command in
elab "ps_kernel_probe" : command => do
  let env ← getEnv
  let result : Except Lean.Kernel.Exception Bool := do
${checks}
${decision}
  match result with
  | .ok true => liftIO <| IO.println "PS_KERNEL_RESULT:${c.id}:accepted"
  | .ok false => liftIO <| IO.println "PS_KERNEL_RESULT:${c.id}:rejected"
  | .error _ => liftIO <| IO.println "PS_KERNEL_RESULT:${c.id}:error"
ps_kernel_probe
`;
}
