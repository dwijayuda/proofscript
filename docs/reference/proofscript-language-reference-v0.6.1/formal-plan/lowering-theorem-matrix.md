# Lowering Theorem Matrix

| Feature | Lowering target | Proof relation |
|---|---|---|
| D-CALL | nested Lean application | `SyntaxEq` |
| D-CALL empty | application to `Unit.unit` / `()` | `SyntaxEq` |
| D-EXPLICIT-PARAMS | ordered explicit Lean binders | `SyntaxEq` |
| D-CONST-ALIAS | Lean `def` with no explicit declaration params | `SyntaxEq` |
| D-FUNCTION-ALIAS | Lean `def` with explicit declaration params | `SyntaxEq` |
| D-DECL-SEMI | removed declaration terminator | `NormalizedSyntaxEq` or parser boundary theorem |
| E-IF-BRACE | Lean `if c then t else e` | `SyntaxEq` |
| E-STRUCT-BODY | native Lean structure body | `SyntaxEq` or command syntax equality |
| E-INDUCTIVE-BODY | native constructor sequence | `SyntaxEq` or command syntax equality |
| E-MATCH-BODY | native match alternatives | `SyntaxEq` |
| E-WHERE-BODY | native local declarations | likely `ElabEq` where syntax equality is too strong |
