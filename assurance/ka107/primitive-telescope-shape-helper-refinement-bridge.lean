import Lean4Lean.Verify.Environment.Primitive.Basic

namespace Lean4Lean.PSKernelKA107
open Lean
open Lean4Lean
open Lean4Lean.Primitive
open Lean4Lean.TypeChecker
open Kernel

/-- KA-107 bridge: dropping `n` binders removes at most `n` context entries. -/
theorem translated_mlctx_dropN_toCtx_length_wf {n : Nat} {m : MLCtx} {hn : n ≤ m.length} :
    m.vlctx.toCtx.length ≤ n + (m.dropN n hn).vlctx.toCtx.length := by
  exact MLCtx.dropN_toCtx_length

/-- KA-107 bridge: a telescope whose counted head contributes one context entry opens with `vlam`. -/
theorem translated_mlctx_head_vlam_wf {n : Nat} {m : MLCtx} {hn : n + 1 ≤ m.length} {Bs : List VExpr}
    (hlen : Bs.length = n + 1)
    (hctx : m.vlctx.toCtx = Bs ++ (m.dropN (n + 1) hn).vlctx.toCtx) :
    ∃ x nm ty tyv bi m', m = .vlam x nm ty tyv bi m' := by
  exact MLCtx.head_vlam hlen hctx

/-- KA-107 bridge: telescope lambda construction is `VExpr.lams` when every counted binder contributes. -/
theorem translated_mlctx_mkLambda_eq_lams_wf {n : Nat} {m : MLCtx} {hn : n ≤ m.length} {Bs : List VExpr}
    {e' : VExpr} (hlen : Bs.length = n)
    (hctx : m.vlctx.toCtx = Bs ++ (m.dropN n hn).vlctx.toCtx) :
    m.mkLambda' n hn e' = VExpr.lams Bs.reverse e' := by
  exact MLCtx.mkLambda'_eq_lams hlen hctx

/-- KA-107 bridge: abstraction cannot create Nat binder types syntactically. -/
theorem translated_expr_natBinderTypes_of_abstract1_wf {e : Expr} {x : FVarId} {k : Nat} :
    (e.abstract1 x k).natBinderTypes = true → e.natBinderTypes = true := by
  exact Lean.Expr.natBinderTypes_of_abstract1

/-- KA-107 bridge: Nat-binder telescope guard recovers literal Nat domains. -/
theorem translated_mlctx_mkLambda_natBinderTypes_wf {env : VEnv} {Us : List Name} {n : Nat}
    {m : MLCtx} {hn : n ≤ m.length} {X : Expr} {Bs : List VExpr}
    (hwf : MLCtx.WF env Us m) (hlen : Bs.length = n)
    (hctx : m.vlctx.toCtx = Bs ++ (m.dropN n hn).vlctx.toCtx)
    (hX : (m.mkLambda n hn X).natBinderTypes = true) :
    Bs = List.replicate n .nat ∧ X.natBinderTypes = true := by
  exact MLCtx.mkLambda_natBinderTypes hwf hlen hctx hX

end Lean4Lean.PSKernelKA107
