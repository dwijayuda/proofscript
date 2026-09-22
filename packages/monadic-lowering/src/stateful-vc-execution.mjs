import { createHash } from 'node:crypto';

function sha256Text(text) {
  return createHash('sha256').update(String(text)).digest('hex');
}

export function classifyLeanResidualGoals(output) {
  const text = String(output ?? '');
  const unsolved = /unsolved goals?/iu.test(text);
  const lines = text.split(/\r?\n/u);
  const goalLines = lines
    .map(line => line.trimEnd())
    .filter(line => /(?:^|\s)⊢\s/u.test(line));
  const traceBlocks = [];
  let current = [];
  let collecting = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^case\s+\S+/u.test(trimmed) || /(?:^|\s)⊢\s/u.test(line)) {
      collecting = true;
    }
    if (collecting) current.push(line);
    if (collecting && trimmed === '') {
      const block = current.join('\n').trim();
      if (block) traceBlocks.push(block);
      current = [];
      collecting = false;
    }
  }

  const tail = current.join('\n').trim();
  if (tail) traceBlocks.push(tail);

  return {
    detected: unsolved || goalLines.length > 0 || traceBlocks.length > 0,
    unsolvedMarker: unsolved,
    goalLines,
    traceBlocks,
    rawOutputSha256: sha256Text(text),
  };
}

export function firstStatefulVcFailedStage(checks, residual) {
  if (checks.modelBuild.exitCode !== 0) return 'lean-model-build';
  if (checks.programCheck.exitCode !== 0) return 'lean-program-typecheck';
  if (checks.tripleCheck.exitCode !== 0) return 'lean-triple-target-typecheck';
  if (checks.requestRun.exitCode === 0) return null;
  if (residual.detected) return 'vc-residual-goals';
  return 'vc-request-execution';
}

export function createStatefulVcGoalArtifact({
  functionName,
  request,
  residual,
  tacticReached,
  semanticProofDischarge,
}) {
  const traceBlocks = residual.traceBlocks ?? [];
  const goals = traceBlocks.map((trace, index) => {
    const traceSha256 = sha256Text(trace);
    return {
      id: `${functionName}.stateful.vc.${String(index + 1).padStart(3, '0')}.${traceSha256.slice(0, 12)}`,
      index,
      trace,
      traceSha256,
      discharged: false,
    };
  });

  return {
    schema: 'proofscript.stateful-vc-goals/v1',
    function: functionName,
    requestTheoremName: request.request?.theoremName ?? null,
    requestTarget: request.request?.target ?? null,
    tactic: request.tactic?.name ?? null,
    tacticReached,
    sourceOutputSha256: residual.rawOutputSha256,
    goals,
    summary: {
      goalCount: goals.length,
      residualGoalsPresent: goals.length > 0,
      semanticProofDischarge,
    },
    generatedFromLeanExecution: tacticReached,
    semanticProofDischarge,
  };
}

export function analyzeStatefulVcExecution({
  functionName,
  request,
  checks,
}) {
  for (const name of ['modelBuild', 'programCheck', 'tripleCheck', 'requestRun']) {
    if (!checks?.[name] || typeof checks[name].exitCode !== 'number') {
      throw new Error(`stateful VC execution analysis requires numeric checks.${name}.exitCode`);
    }
  }

  const requestOutput = `${checks.requestRun.stdout ?? ''}\n${checks.requestRun.stderr ?? ''}`;
  const residual = classifyLeanResidualGoals(requestOutput);
  const tacticReached = checks.tripleCheck.exitCode === 0
    && (checks.requestRun.exitCode === 0 || residual.detected);
  const semanticVcDerivationComplete = tacticReached;
  const realVerificationConditionsGenerated = tacticReached;
  const semanticProofDischarge = checks.requestRun.exitCode === 0
    && checks.modelBuild.exitCode === 0
    && checks.programCheck.exitCode === 0
    && checks.tripleCheck.exitCode === 0;
  const failedStage = firstStatefulVcFailedStage(checks, residual);

  const goalArtifact = createStatefulVcGoalArtifact({
    functionName,
    request,
    residual,
    tacticReached,
    semanticProofDischarge,
  });

  return {
    status: semanticProofDischarge
      ? 'proved'
      : (realVerificationConditionsGenerated ? 'vcs-generated' : 'failed'),
    failedStage,
    residualGoals: residual,
    goalArtifact,
    claims: {
      leanEnvironmentResolved: checks.modelBuild.exitCode === 0,
      leanModelTypechecked: checks.modelBuild.exitCode === 0,
      leanProgramTypechecked: checks.modelBuild.exitCode === 0 && checks.programCheck.exitCode === 0,
      tripleTargetTypechecked: checks.modelBuild.exitCode === 0
        && checks.programCheck.exitCode === 0
        && checks.tripleCheck.exitCode === 0,
      tacticExecuted: tacticReached,
      semanticVcDerivationComplete,
      realVerificationConditionsGenerated,
      stateModelAdequacyChecked: false,
      sourceToLeanProgramEquivalenceChecked: false,
      exceptionalPathsCovered: false,
      semanticProofDischarge,
    },
  };
}
