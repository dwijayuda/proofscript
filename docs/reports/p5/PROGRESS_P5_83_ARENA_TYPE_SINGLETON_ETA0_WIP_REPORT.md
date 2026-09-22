# P5.83 Arena Type Singleton Eta0 WIP Report

Status: WIP / not frozen.

## Purpose

Improve Lean Kernel Arena agreement without shortcutting tutorial names. This checkpoint adds a derived singleton-recursive recursor eta rule for one-constructor inductive families whose constructor has no non-parameter fields.

## Semantic rule

When reducing a generated recursor application whose major premise is neutral, the kernel may reconstruct the unique nullary constructor only if the family has exactly one constructor, the constructor has no non-parameter fields, the recursor/family parameter counts match, and the inferred type of the reconstructed constructor is definitionally equal to the actual major-premise type.

This follows the Arena/Lean observation that `NewSingleton.rec true x` reduces to `true` even when `x` is a variable. It is not a hard-coded test-name shortcut and does not allow invalid Eq/Acc K tests to accept.

## TDD

RED: `tutorial/075_typeSingletonRecReduction` exited 2 unsupported on P5.82.

GREEN: `npm run test:arena:type-singleton-eta` passes after implementation.

## Current measured delta

P5.82: 89 accepted good, 44 rejected bad, 7 declined, 0 wrong accepts, 0 wrong rejects.

P5.83 expected delta after directly verified 075: 90 accepted good, 44 rejected bad, 6 declined, 0 wrong accepts, 0 wrong rejects. A full 140-test rerun still needs to complete before freeze.

## Trust boundary

K3-TB trusted-boundary only. Not fully formal K3. Not full Lean 4 equivalence. Formal Lean 4 equivalence proven obligations remain 0.
