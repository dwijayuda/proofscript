# K2a-bindings0 implementation profile

This profile is implementation coverage of **ProofScript Language Reference v0.1**, not a new language version.

## Added core binding slice

The core term representation adds a local binding node corresponding to Lean's `letE` observation:

```text
Let(type, value, body, nondep)
```

- `nondep = false` represents the ordinary local `let` slice.
- `nondep = true` preserves the nondependent local-binding observation used by source `have`.
- the trusted kernel checks the declared local type and value and performs zeta reduction by substituting the value into the continuation;
- the current kernel does not use `nondep` as a new logical rule.

## Implemented source slice

Inside a standard braced `def` body:

```ts
def f(...): T := {
  let x: A := value;
  let y := other;
  have h: P := proof;
  finalTerm
}
```

Each intermediate binding prefix requires a literal `;`; the final body term has no body-level trailing semicolon. Untyped binding values are typed by the standalone ProofScript kernel in the current local/global environment.

## Deliberately unsupported

This profile does not claim full Lean 4.33.1 local-binding elaboration. Deferred areas include modern `let`/`have` options, pattern/anaphoric bindings, instance bindings, local function sugar, `let rec`, `let mut`, general term-level binding syntax, and full transparency/zeta-option observational parity.
