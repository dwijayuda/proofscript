# Appendix D — TypeScript Runtime Profile

Status: **Design appendix v0.6.1**

The TypeScript backend is not the semantic foundation. It is an executable artifact whose correctness is measured against the Lean executable meaning for a supported subset.

## D.1 Runtime goals

The runtime should make emitted TypeScript predictable, inspectable, and close to Lean's executable behavior.

A backend claim has this shape:

```text
For every executable ProofScript expression e in subset S,
runTS(emitTS(e)) observes the same result as evalLean(lower(e)),
under the declared runtime assumptions.
```

## D.2 Required representation policies

| Lean / ProofScript type | TypeScript profile must specify |
|---|---|
| `Nat` | nonnegative arbitrary-precision or checked representation; no silent unsafe JS number overflow |
| `Int` | arbitrary-precision or declared bounded profile |
| `Bool` | exact true/false mapping; no truthiness |
| `String` | Unicode/JS string assumptions documented |
| `Unit` | exact singleton representation |
| `Option α` | tagged representation; not implicit `null`/`undefined` |
| `List α` | representation and equality behavior |
| structures | object/tag layout and field mapping |
| inductives | tagged union layout and constructor mapping |
| equality/BEq | Lean/BEq correspondence; no JS `==` semantics |
| effects/IO | declared host-effect boundary |

## D.3 Runtime boundaries

The runtime may be trusted for execution, but not for theorem acceptance. Proof claims come from emitted Lean/checker artifacts. Runtime claims require separate tests, models, or proofs.
