import { createHash } from 'node:crypto';

export function sha256Text(text) { return createHash('sha256').update(String(text)).digest('hex'); }
export function stableObligationId(sourceFunction, kind, label) {
  return `${sourceFunction}.${kind}.${label}`;
}
export function normalizeObligationsForWorkflow(contractArtifact, contractArtifactPath, { packageVersion, checkpoint = 'KA-143 verification package extraction' } = {}) {
  const functions = contractArtifact.functions ?? [];
  const functionName = functions[0]?.name ?? 'contract';
  const source = contractArtifact.source;
  const obligations = (contractArtifact.obligations ?? []).map(o => {
    const statement = o.statement ?? o.proposition ?? '';
    const exact = o.exactTheoremStatement ?? o.theoremStatement ?? `theorem ${o.name} : ${statement}`;
    const id = o.id ?? stableObligationId(o.sourceFunction ?? functionName, o.kind, o.label ?? o.name);
    return {
      id,
      source,
      function: functionName,
      name: o.name,
      label: o.label,
      kind: o.kind,
      proofPoint: o.proofPoint,
      sourceFunction: o.sourceFunction,
      vcgenLoweringStatus: o.vcgenLoweringStatus,
      leanCheckable: o.leanCheckable,
      loopIndex: o.loopIndex,
      condition: o.condition,
      statement,
      proposition: o.proposition ?? statement,
      exactTheoremStatement: exact,
      theoremStatement: exact,
      statementSha256: o.statementSha256 ?? sha256Text(statement),
      theoremSha256: o.theoremSha256 ?? sha256Text(exact),
      status: o.status ?? 'unproved',
      proofRequired: o.proofRequired ?? true,
      sourceSha256: contractArtifact.sourceSha256,
      trustBoundary: { semanticProofChecking: false, structuralOnly: true, vcgenConnected: false },
    };
  });
  return {
    schema: 'proofscript.obligations.v1',
    checkpoint,
    packageVersion: packageVersion ?? contractArtifact.packageVersion,
    source: { path: source, sha256: contractArtifact.sourceSha256 },
    contractArtifact: { path: contractArtifactPath, schema: contractArtifact.schema },
    contracts: { path: contractArtifactPath, sha256: contractArtifact.contractsSha256 },
    verification: contractArtifact.verification,
    obligations,
    summary: { total: obligations.length, checked: obligations.filter(o => o.status === 'checked').length, proved: obligations.filter(o => o.status === 'checked').length, unproved: obligations.filter(o => o.status !== 'checked').length },
    trustBoundary: { semanticProofChecking: false, staleProofDetection: true, hiddenAxiomsIntroduced: false, loopInvariantChecking: obligations.some(o => String(o.kind).startsWith('loop.')) ? 'structural-obligations-only' : undefined, vcgenConnected: false, fullLean4Equivalence: false },
  };
}
