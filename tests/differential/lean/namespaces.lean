def x : Nat := 0
namespace A
  def x : Bool := true
  def rootNat : Nat := _root_.x
  def localBool : Bool := x
  namespace B
    def nested : Bool := x
    def parent : Bool := A.x
  end B
end A
