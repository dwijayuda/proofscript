def rootX : Nat := 0
namespace A
def x : Bool := true
end A
namespace B
def x : Nat := 0
end B
open A B
def openedFirst : Bool := x
namespace Outer
def x : Nat := 0
namespace N
def x : Bool := true
end N
namespace Inner
open N
def parentWins : Nat := x
end Inner
end Outer
section Scoped
namespace Local
def y : Nat := 0
end Local
open Local
def inside : Nat := y
end Scoped
def after : Nat := Local.y
