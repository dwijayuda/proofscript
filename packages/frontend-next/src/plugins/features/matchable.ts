import type { IRExpr, IRParam, IRType } from "../../core/model.js";

export interface MatchableConstructorParam {
  /** Collision-free placeholder used inside field/refinement types returned by the descriptor. */
  readonly placeholder: string;
  /** Original constructor-binder name, retained for diagnostics/audit metadata. */
  readonly sourceName: string;
  readonly type: IRType;
  readonly binderInfo: IRParam["binderInfo"];
  readonly isTypeParam?: boolean;
  /** Index into pattern-visible `fields` for explicit runtime/source fields. */
  readonly visibleFieldIndex?: number;
}

export interface MatchableValueRefinement {
  /** Existing scrutinee-index local refined by this constructor branch. */
  readonly name: string;
  /** Constructor-specific value for that index. May mention constructor-param placeholders. */
  readonly value: IRExpr;
}

export interface MatchableVariant {
  readonly name: string;
  /** Pattern-visible constructor fields after any index refinement/substitution. */
  readonly fields: readonly IRType[];
  /** Runtime/source field names corresponding to `fields`, when known. */
  readonly fieldNames?: readonly string[];
  /**
   * General dependent-pattern metadata.  When present, the pattern compiler
   * alpha-renames constructor placeholders per branch, refines the enclosing
   * expected type using `valueRefinements`, and records the refinement in IR.
   */
  readonly constructorParams?: readonly MatchableConstructorParam[];
  readonly valueRefinements?: readonly MatchableValueRefinement[];
}

export interface MatchableDescriptor {
  readonly matchOperation: string;
  /**
   * Returns the constructors that are possible for this instantiated scrutinee
   * type. Indexed families may return only constructors whose result indices
   * unify with the scrutinee indices. For a general indexed scrutinee, a
   * constructor may instead carry branch-local refinement metadata describing
   * how an outer index variable is refined by that constructor.
   */
  readonly variantsFor: (type: IRType) => readonly MatchableVariant[];
}

export function exactMatchableKey(typeId: string): string { return `proofscript.matchable.type:${typeId}`; }
export function familyMatchableKey(family: string): string { return `proofscript.matchable.family:${family}`; }
