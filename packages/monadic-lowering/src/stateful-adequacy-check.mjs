import { createHash } from 'node:crypto';

function sha256Text(text) {
  return createHash('sha256').update(String(text)).digest('hex');
}

function uniqueStrings(values) {
  return [...new Set(
    (values ?? [])
      .filter(value => typeof value === 'string' && value.trim().length > 0)
      .map(value => value.trim()),
  )];
}

function normalizeSpaces(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

export function createStatefulAdequacyCheck(loweringArtifact) {
  if (!loweringArtifact || loweringArtifact.schema !== 'proofscript.monadic-lowering.v1') {
    throw new Error('stateful adequacy check requires proofscript.monadic-lowering.v1');
  }

  const stateModel = loweringArtifact.stateModel ?? {};
  const wpBinding = loweringArtifact.statefulWpBinding ?? {};
  const request = loweringArtifact.statefulVcRequest ?? {};
  const stateType = stateModel.stateType ?? null;
  const runner = wpBinding.semantics?.runner ?? stateModel.semantics?.runner ?? null;
  const adequacyTheorem = wpBinding.semantics?.adequacyTheorem
    ?? stateModel.semantics?.adequacyTheorem
    ?? null;
  const monadTypeConstructor = stateModel.lean?.monadTypeConstructor ?? null;
  const expectedMonad = stateType ? `StateM ${stateType}` : null;
  const allImports = uniqueStrings(request.environment?.allImports ?? stateModel.lean?.imports);
  const openNamespaces = uniqueStrings([
    'Std.Do',
    ...(request.environment?.openNamespaces ?? stateModel.lean?.openNamespaces ?? []),
  ]);
  const diagnostics = [];

  if (!stateType) {
    diagnostics.push({
      code: 'stateful-adequacy-state-type-unbound',
      severity: 'error',
      message: 'state model stateType must be bound before adequacy can be checked',
    });
  }
  if (!runner) {
    diagnostics.push({
      code: 'stateful-adequacy-runner-unbound',
      severity: 'error',
      message: 'state model semantics.runner must be bound before adequacy can be checked',
    });
  }
  if (!adequacyTheorem) {
    diagnostics.push({
      code: 'stateful-adequacy-theorem-unbound',
      severity: 'error',
      message: 'state model semantics.adequacyTheorem must be bound before adequacy can be checked',
    });
  }
  if (!monadTypeConstructor) {
    diagnostics.push({
      code: 'stateful-adequacy-monad-unbound',
      severity: 'error',
      message: 'state model lean.monadTypeConstructor must be bound before adequacy can be checked',
    });
  } else if (expectedMonad && normalizeSpaces(monadTypeConstructor) !== normalizeSpaces(expectedMonad)) {
    diagnostics.push({
      code: 'stateful-adequacy-unsupported-monad-shape',
      severity: 'error',
      message: `current adequacy checker supports '${expectedMonad}', found '${monadTypeConstructor}'`,
    });
  }
  if (allImports.length === 0) {
    diagnostics.push({
      code: 'stateful-adequacy-imports-unbound',
      severity: 'error',
      message: 'Lean imports must be bound before adequacy can be checked',
    });
  }

  const ready = diagnostics.length === 0;
  const theoremName = '__ps_state_model_adequacy_check';
  const source = ready
    ? `${allImports.map(moduleName => `import ${moduleName}`).join('\n')}

${openNamespaces.map(namespaceName => `open ${namespaceName}`).join('\n')}

namespace ProofScript.Generated.AdequacyCheck

/--
Checks that the descriptor-bound runner and adequacy theorem implement the
StateM WP-to-run-result bridge expected by the current stateful verification profile.
-/
theorem ${theoremName}
    {α : Type}
    {result : α × ${stateType}}
    {program : ${monadTypeConstructor} α}
    {initial : ${stateType}}
    (hRun : ${runner} program initial = result)
    (P : α × ${stateType} → Prop)
    (hWp : (⊢ₛ wp⟦program⟧ (⇓ value final => ⌜P (value, final)⌝) initial)) :
    P result := by
  exact ${adequacyTheorem} hRun P hWp

end ProofScript.Generated.AdequacyCheck
`
    : null;

  return {
    schema: 'proofscript.stateful-adequacy-check/v1',
    expectedShape: 'stateM-wp-run-result/v1',
    ready,
    stateModel: {
      name: stateModel.name ?? null,
      stateType,
    },
    semantics: {
      runner,
      adequacyTheorem,
      monadTypeConstructor,
    },
    environment: {
      allImports,
      openNamespaces,
    },
    check: {
      theoremName,
      source,
      sha256: source ? sha256Text(source) : null,
    },
    diagnostics,
    checkedInLean: false,
    stateModelAdequacyChecked: false,
  };
}
