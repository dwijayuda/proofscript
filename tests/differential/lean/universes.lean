universe u v

theorem polymorphicProof (A : Type u) (P : A → Prop) (x : A) (h : P x) : P x := h
theorem reusePolymorphic (A : Type u) (P : A → Prop) (x : A) (h : P x) : P x :=
  polymorphicProof.{u} A P x h
theorem maxZero (P : Sort (max u 0) → Prop) (x : Sort u) (h : P x) : P x := h
theorem imaxZero (P : Sort (imax u 0)) (h : P) : P := h
theorem imaxSucc (P : Sort (imax u (v + 1)) → Prop) (x : Sort (max u (v + 1))) (h : P x) : P x := h
