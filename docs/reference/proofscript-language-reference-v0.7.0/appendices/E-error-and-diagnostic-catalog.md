# Appendix E — Error and Diagnostic Catalog

Status: **Initial diagnostic appendix v0.7.0**

ProofScript diagnostics should explain both the `.ps` surface error and the Lean concept underneath.

| Code | Condition | Suggested diagnostic |
|---|---|---|
| PS1001 | `const` has explicit parameters | `const` is a parameterless `def` alias. Use `function` or `def` for declarations with parameters. |
| PS1002 | `function` lacks explicit parameter group | `function` is a parameterized `def` alias. Use `const` or `def` for parameterless declarations. |
| PS1101 | D-CALL adjacency broken by whitespace/comment | This is not ProofScript call syntax. `f(x)` is a call; `f (x)` defers to Lean. |
| PS1201 | Braced `if` branch contains multiple semicolon-separated terms | A braced `if` branch is one expression, not a JavaScript statement block. Use `do` for sequencing. |
| PS1301 | Pattern uses unadmitted call syntax | Patterns remain Lean-native in v0.7.0. Use `.some x`, not `.some(x)`. |
| PS1401 | Unregistered D/E collision | This source form overlaps a ProofScript-owned context but has no registered compatibility rule. |
| PS1501 | Production/reference mismatch | The shipped frontend output differs from the reference frontend under the declared equality relation. |
| PS1601 | Lean version mismatch | The verification manifest does not match the pinned Lean semantic baseline. |

Diagnostics should include canonical Lean when it helps:

```text
ProofScript:
  function add(x : Nat, y : Nat) : Nat := x + y;
Canonical Lean:
  def add (x : Nat) (y : Nat) : Nat := x + y
```
