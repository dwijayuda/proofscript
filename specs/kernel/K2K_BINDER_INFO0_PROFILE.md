# K2m-unification0 implementation profile

Status: **implemented subset; not full ProofScript v0.1 or Lean 4.33.1 conformance**.

K2k extends K2j by preserving binder classes as an explicit compatibility observation. It changes the serialized Core schema but does not add a new logical rule.

## Added coverage

- explicit `(x: A)` BinderInfo;
- implicit `{x: A}` BinderInfo;
- strict implicit `⦃x: A⦄` BinderInfo;
- named instance implicit `[inst: A]` and anonymous instance implicit `[A]` BinderInfo in the implemented value-declaration/lambda/forall slice;
- Core `Pi` and `Lam` carry BinderInfo (explicit is the default/omittable representation);
- Lean export preserves binder delimiters;
- `@f(...)` enters explicit-application mode and consumes hidden binders as written.

## Trust boundary

BinderInfo influences elaboration/observability, not the current kernel conversion rules. Kernel type checking still checks the same domain/body terms. Legacy artifacts through v7 contain no BinderInfo field and decode those binders as explicit.

## Deliberate limits

- ordinary application does not yet synthesize omitted implicit/strict/instance arguments;
- encountering a hidden binder in ordinary application returns `unsupported` rather than consuming the next explicit source argument incorrectly;
- optional/default binders and auto parameters are not implemented;
- typeclass search is not implemented, so instance implicit binders can only be supplied explicitly with `@` in this profile;
- implicit inductive parameters and exact generated-recursor BinderInfo parity remain deferred.
