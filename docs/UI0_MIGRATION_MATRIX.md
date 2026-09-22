# UI0 Migration Matrix

| Frontend feature | Core v68 integration | Runtime TS after kernel | Status |
|---|---:|---:|---|
| `Nat` | yes | yes | integrated |
| ordinary nonrecursive `def` | yes | yes | integrated |
| local Nat parameters | yes | yes | integrated |
| calls to earlier integrated declarations | yes | yes | integrated |
| Nat literals `0..4096` | yes | yes | integrated with explicit adapter bound |
| canonical `Nat.add` | yes | yes | integrated |
| propositional `=` on integrated Nat terms | yes | proof-erased | integrated |
| theorem `by { rfl }` for equality | yes | proof-erased | integrated |
| `Nat.mul`, `Nat.sub` / generic `HMul`,`HSub` | no | frontend-only | fail closed |
| Bool / conditionals | no | frontend-only | next candidate |
| structures / classes / arbitrary typeclasses | no | frontend-only | not yet migrated |
| Int / fixed-width numeric families | no | frontend-only | not yet migrated |
| modules / incremental frontend state | no | frontend-only | not yet migrated |
| tactics other than exact `rfl` lowering | no | Lean-facing only | not independently migrated |

UI0 proves the architecture, not broad language coverage. Expansion must happen by
adding deterministic Core lowering plus kernel/verifier/oracle/runtime tests for
each feature family.
