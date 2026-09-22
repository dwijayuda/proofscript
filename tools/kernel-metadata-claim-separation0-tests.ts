#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

const kernelStatus = JSON.parse(fs.readFileSync('kernel-status.json', 'utf8'));
const implementationStatus = JSON.parse(fs.readFileSync('implementation-status.json', 'utf8'));
const readiness = fs.readFileSync('docs/PRODUCTION_READINESS_STATUS.md', 'utf8');
const kernelReport = fs.existsSync('docs/reports/p5/PRODUCTION_P5_75_METADATA_CLAIM_SEPARATION0_REPORT.md')
  ? fs.readFileSync('docs/reports/p5/PRODUCTION_P5_75_METADATA_CLAIM_SEPARATION0_REPORT.md', 'utf8')
  : '';

assert.equal(kernelStatus.fullKernelComplete, false, 'kernel-status must not use fullKernelComplete=true for K3-TB checklist completion');
assert.equal(kernelStatus.auditedK3TBChecklistComplete, true, 'kernel-status should retain audited K3-TB checklist completion under an explicit name');
assert.equal(kernelStatus.fullLean4KernelComplete, false, 'full Lean 4 kernel completion must remain false');
assert.equal(kernelStatus.sameTheoryAsLean4, false, 'same-theory claim must remain false');
assert.equal(kernelStatus.fullyFormalK3, false, 'fully formal K3 must remain false');
assert.equal(kernelStatus.fullLean4Equivalence, false, 'full Lean 4 equivalence must remain false');
assert.equal(kernelStatus.formalLean4EquivalenceProvenObligations, 0, 'formal Lean 4 equivalence proven obligations must remain 0');
assert.match(kernelStatus.fullKernelCompleteMeaning ?? '', /deprecated/i, 'ambiguous fullKernelComplete meaning should explicitly be deprecated');
assert.match(kernelStatus.auditedK3TBChecklistCompleteMeaning ?? '', /K3-TB/i, 'new checklist-completion meaning should name K3-TB');
assert.match(kernelStatus.auditedK3TBChecklistCompleteMeaning ?? '', /not.*Lean 4 equivalence/i, 'new checklist-completion meaning should reject equivalence interpretation');

assert.match(implementationStatus.release ?? '', /^P5\.(7[5-9]|[89]\d)$/, 'implementation-status should remain at P5.75 or a later P5 release while preserving metadata claim separation');
assert.equal(implementationStatus.claims?.fullKernelComplete, false, 'implementation fullKernelComplete claim must remain false');
assert.equal(implementationStatus.claims?.fullyFormalK3, false, 'implementation fullyFormalK3 claim must remain false');
assert.equal(implementationStatus.claims?.fullLeanCompatibility, false, 'implementation fullLeanCompatibility claim must remain false');
assert.equal(implementationStatus.claims?.formalLean4EquivalenceProvenObligations ?? 0, 0, 'implementation formal obligations must remain 0');
assert.match(implementationStatus.claims?.kernelChecklistCompletionKind ?? '', /audited K3-TB checklist/i, 'implementation should expose checklist completion with a precise label');

for (const text of [readiness, kernelReport]) {
  assert.doesNotMatch(text, /fullKernelComplete\s*:\s*true/, 'docs must not repeat ambiguous fullKernelComplete=true');
  assert.doesNotMatch(text, /same theory as Lean 4\s*:\s*YES/i, 'docs must not claim same theory');
  assert.doesNotMatch(text, /Full Lean 4 equivalence\s*:\s*YES/i, 'docs must not claim full equivalence');
}
assert.match(readiness, /P5\.75 Metadata Claim Separation/i, 'readiness doc should include P5.75 metadata claim separation');
assert.match(kernelReport, /fullKernelComplete is deprecated/i, 'P5.75 report should state the deprecation explicitly');

console.log('KERNEL_METADATA_CLAIM_SEPARATION0=PASS');
