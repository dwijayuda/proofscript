# Appendix F — Version Manifest Template

Status: **Normative manifest template v0.6.1**

Every verified release should include a machine-readable manifest equivalent to:

```json
{
  "proofscript_spec_version": "0.6.0",
  "proofscript_compiler_revision": "<git-sha>",
  "proofscript_frontend_revision": "<git-sha>",
  "surface_feature_registry_version": "0.6.0",
  "lean_version": "4.33.1",
  "lean_commit": "819816b2e0a3bf405af45ae5c7af2491d8f5bee6",
  "lean_reference_source": "leanlangref.7z latest-track archive, used for documentation study only",
  "formal_model": {
    "name": "<PSKernel-or-other>",
    "revision": "<git-sha-or-package-version>",
    "scope": "<declared-scope>"
  },
  "claim_level": "S1|S2|S3|S4|S5",
  "axiom_policy": {
    "allow_sorryAx": false,
    "allowed_axioms": ["propext", "Quot.sound", "Classical.choice"],
    "project_axioms": []
  },
  "runtime_profile": {
    "typescript": "<runtime-profile-version-or-null>"
  },
  "proof_artifacts": [
    "<paths-or-hashes>"
  ]
}
```

A release must not publish a higher claim level than this manifest supports.
