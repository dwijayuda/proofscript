axiom P : Prop
axiom h : P
opaque HiddenP : Prop := P
theorem badOpaqueUse : HiddenP := h
