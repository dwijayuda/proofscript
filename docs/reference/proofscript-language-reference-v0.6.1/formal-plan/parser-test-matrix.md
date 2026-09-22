# Parser Test Matrix

## D-CALL

| Source | Expected owner |
|---|---|
| `f(x)` | D-CALL |
| `f(x,y)` | D-CALL |
| `f()` | D-CALL Unit application |
| `f (x)` | DEFER |
| `f (x,y)` | DEFER |
| `f/*comment*/(x)` | DEFER |
| `f(x)(y)` | nested D-CALL |
| `f(x) y` | D-CALL followed by Lean/deferred application if valid |
| `fun x => f(x)` | Lean lambda with recursive D-CALL child |
| `g(f(x), h(y))` | nested D-CALL |

## Declaration aliases

| Source | Expected result |
|---|---|
| `const answer : Nat := 42;` | D-CONST-ALIAS |
| `const increment : Nat -> Nat := fun x => x + 1;` | D-CONST-ALIAS |
| `function add(x : Nat, y : Nat) : Nat := x + y;` | D-FUNCTION-ALIAS |
| `function identity {α : Type}(x : α) : α := x;` | D-FUNCTION-ALIAS |
| `function answer : Nat := 42;` | reject |
| `const add(x : Nat, y : Nat) : Nat := x + y;` | reject |

## E-IF-BRACE

| Source | Expected result |
|---|---|
| `if (c) {t} else {e}` | E-IF-BRACE |
| `if c then t else e` | DEFER/native Lean |
| `if (c) {f(x)} else {g(y)}` | E-IF-BRACE with recursive D-CALL children |
| `if (c) {x; y} else {z}` | reject unless branch is a sequencing construct |
