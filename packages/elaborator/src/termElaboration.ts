import { Environment, Term, infer, kernelWhnf } from "@proofscript/kernel";
import { SurfaceTerm, UnsupportedFeature } from "@proofscript/syntax";
import { elabProofTerm } from "./proofElaborator";
import { elaborateMatchTerm } from "./matchElaborator";
import { elabArrayLiteral, elabDo } from "./arrayDoElaboration";
import { contextFromTypes } from "./coreUtils";
import { GlobalInfo, inferElaborationHeadType } from "./globalEnvironment";
import { elaborateStructureInstanceCore, elaborateStructureUpdateCore } from "./structureSugarElaboration";
import { elabBif, elabBinaryOp, elabLevel, elabPrimitiveLiteral } from "./primitiveSugarElaboration";
import { elabAppTerm, elabEqTerm, elabLambdaTerm, elabLetTerm, elabNameTerm, elabPiTerm } from "./coreTermElaboration";
import { ProofElaborationObserver, ProofStateSnapshot } from "./proofState";

/**
 * Recursive SurfaceTerm -> Core Term dispatcher.
 *
 * The public index now owns only package-level API wiring. This module owns the
 * central term-case split and delegates every nontrivial feature to the small
 * elaboration modules introduced through P5.50-P5.60.
 */
export function elabTerm(
  term: SurfaceTerm,
  locals: string[],
  localTypes: Term[],
  globals: Map<string, GlobalInfo>,
  available: Set<string>,
  kernelEnv: Environment,
  expectedType?: Term,
  observer?: ProofElaborationObserver,
): Term {
  switch (term.tag) {
    case "sort": return { tag: "sort", level: elabLevel(term.level, available) };
    case "boolLit":
    case "stringLit":
    case "intLit":
    case "natLit":
      return elabPrimitiveLiteral(term, localTypes, kernelEnv, expectedType);
    case "tuple":
      throw new UnsupportedFeature("Lean tuple syntax is parsed for v0.6.1 surface conformance but tuple Core elaboration is not implemented yet");
    case "arrayLit":
      return elabArrayLiteral(term, locals, localTypes, globals, available, kernelEnv, elabTerm, expectedType);
    case "do":
      return elabDo(term, locals, localTypes, globals, available, kernelEnv, elabTerm, expectedType);
    case "binaryOp":
      return elabBinaryOp(term, locals, localTypes, kernelEnv, expectedType, (source, nextLocals, nextLocalTypes, nextExpectedType) =>
        elabTerm(source, nextLocals, nextLocalTypes, globals, available, kernelEnv, nextExpectedType));
    case "bif": return elabBif(term, locals, localTypes, kernelEnv, expectedType, (source, nextLocals, nextLocalTypes, nextExpectedType) =>
      elabTerm(source, nextLocals, nextLocalTypes, globals, available, kernelEnv, nextExpectedType));
    case "rflProof":
    case "exactProof":
    case "assumptionProof":
    case "applyProof":
    case "introProof":
    case "showProof":
    case "haveProof":
    case "rwProof":
    case "substProof":
    case "constructorProof":
    case "casesProof":
    case "inductionProof":
    case "simpProof":
      return elabProofTerm(term, locals, localTypes, kernelEnv, expectedType, {
        elaborateTerm: (source, nextLocals, nextLocalTypes, nextExpectedType) =>
          elabTerm(source, nextLocals, nextLocalTypes, globals, available, kernelEnv, nextExpectedType, observer),
        inferHeadType: (head, ctx) => inferElaborationHeadType(head, ctx, globals, kernelEnv),
        ...(observer ? { recordProofState: (state: ProofStateSnapshot) => observer.recordProofState(state) } : {}),
      });
    case "eq":
      return elabEqTerm(term, locals, localTypes, globals, available, kernelEnv, elabTerm);
    case "name":
      return elabNameTerm(term, locals, localTypes, globals, available, kernelEnv, elabTerm, expectedType);
    case "app":
      return elabAppTerm(term, locals, localTypes, globals, available, kernelEnv, elabTerm, expectedType);
    case "lam":
      return elabLambdaTerm(term, locals, localTypes, globals, available, kernelEnv, elabTerm, expectedType);
    case "pi":
      return elabPiTerm(term, locals, localTypes, globals, available, kernelEnv, elabTerm);
    case "structUpdate": {
      const ctx = contextFromTypes(localTypes);
      const base = elabTerm(term.base, locals, localTypes, globals, available, kernelEnv);
      const baseType = kernelWhnf(kernelEnv, infer(kernelEnv, ctx, base));
      const out = elaborateStructureUpdateCore(base, baseType, term.fields, locals, localTypes, globals, available, kernelEnv, elabTerm, expectedType);
      // The final reconstructed structure is checked again before returning so
      // source update sugar remains a frontend transformation into kernel Core,
      // not an unchecked backend record mutation.
      infer(kernelEnv, ctx, out);
      return out;
    }
    case "structInst":
      return elaborateStructureInstanceCore(term, locals, localTypes, globals, available, kernelEnv, elabTerm, expectedType);
    case "match":
      return elaborateMatchTerm(term, locals, localTypes, kernelEnv, expectedType, {
        elaborateTerm: (surface, scopedLocals, scopedTypes, scopedExpected) => elabTerm(surface, scopedLocals, scopedTypes, globals, available, kernelEnv, scopedExpected),
      });
    case "let":
      return elabLetTerm(term, locals, localTypes, globals, available, kernelEnv, elabTerm);
  }
}
