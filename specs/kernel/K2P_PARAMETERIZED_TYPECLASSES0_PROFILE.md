# K2p-parameterized-typeclasses0 implementation profile

K2p is an implementation-coverage profile of ProofScript Language Reference v0.1 targeting Lean 4.33.1 semantics. It is not a language fork.

## Added coverage

- `class C(A: Type) { field: T; }` with explicit class parameters.
- Classes lower to ordinary checked non-indexed parameterized inductives with one constructor.
- The kernel generically generates a parameterized recursor for nonrecursive constructor fields; class projections are ordinary definitions built from that recursor.
- Concrete named/anonymous global instances may target fully applied class types such as `C(Nat)`.
- Exact-goal synthesis supports fully known class applications. Candidate ranking remains priority-descending then declaration-order-descending; ineligible parameter instantiations are skipped.
- The selected candidate is kernel-inferred and definitionally compared to the requested class goal before explicit Core insertion.
- No search, metavariable, or class-specific logical rule enters serialized Core or the kernel.

## v10 environment metadata

Class metadata records the parameter count plus source parameter names/BinderInfo and closed field types. The isolated verifier cross-checks this metadata against independently decoded inductive/constructor/projection declarations. Instance metadata still records name, class head, priority, declaration order, scope and anonymity; the checked instance definition type must fully apply the registered class.

## Deliberately unsupported

- class `extends`, `class inductive`, `class abbrev`;
- class method binder sugar (write an explicit function type in this slice);
- polymorphic instance declaration binders;
- recursive instance prerequisites;
- local/scoped instances;
- `outParam`, `semiOutParam`, default instances;
- search tabling/cycle/diamond parity.
