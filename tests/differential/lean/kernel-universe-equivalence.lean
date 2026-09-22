universe u v

def imaxOne (A : Sort (imax 1 u)) : Sort u := A
def imaxSelf (A : Sort (imax u u)) : Sort u := A
def maxOffset (A : Sort (max u (u + 1))) : Sort (u + 1) := A
def maxAbsorbExplicit (A : Sort (max 1 (u + 1))) : Sort (u + 1) := A
def maxComm (A : Sort (max u v)) : Sort (max v u) := A
