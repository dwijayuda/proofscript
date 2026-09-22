# npm publishing plan

Publish leaf packages first (`@proofscript/kernel`, syntax, plugin-api), then dependent packages, then the `proofscript` CLI/meta package. All packages carry an implementation version independent of the ProofScript language reference version.

A production release must publish a manifest binding package versions, ProofScript reference revision, Lean semantic baseline, kernel/core/certificate format versions, conformance corpus revision, and optional backend/oracle versions.
