# KERNEL-mutual-nested-deeper0 profile

Core format: **56**. Semantic baseline: **Lean 4.33.1**.

This profile extends v55 with one bounded trusted preprocessing rule for a mutual block containing exactly one closed linear nested recursive path of arbitrary finite depth >= 2. The block is monomorphic, every original member has zero parameters and zero indices, all original/helper families live in the same `Type` (Sort 1) or `Prop` (Sort 0), and every nested container is already checked, monomorphic, one-parameter and zero-index.

The kernel synthesizes one private helper member for every nested specialization, in outermost-to-innermost order after the original mutual members, then rechecks the complete synthetic mutual block. Public helper recursors are restored as `<firstMember>.rec_1`, `.rec_2`, ... with linked iota metadata derived from the checked synthetic block. No artifact field controls helper count/order.

Explicitly unsupported in this profile: shared/dependent mutual parameters in a deep path, original mutual indices, explicit universe-polymorphic deep composition, multiple deep recursive fields, indexed/dependent deep containers, or mixed nonlinear deep graphs. These require later profiles rather than approximation.
