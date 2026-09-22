# Appendix F — Version manifest template

ProofScript keeps source-spec, module-format, kernel-API, and Lean-semantic versions distinct.

```json
{
  "proofscriptSpecVersion": "0.7.0",
  "compilerRevision": "<git commit>",
  "moduleFormatVersion": "proofscript-module@1",
  "pskernelApiVersion": "0.1.0",
  "leanSemantics": {
    "version": "4.34.0",
    "commit": "293d5d0c0c3f3dded4688b3ccd6a33939ac5102b",
    "normative": true
  },
  "nextLeanWatch": {
    "version": "4.35.0-rc2",
    "commit": "11acb17ec6b07a8f9e9173e6845197929540936b",
    "normative": false
  },
  "implementationProfile": "reference-lean | standalone-pskernel",
  "featureRegistryVersion": "0.7.0",
  "claimLevel": "S1",
  "axiomPolicy": "<policy>",
  "runtimeProfileRevision": "<revision>"
}
```

Release evidence SHOULD also identify corpus fingerprints, exact checker revisions, runtime/compiler revisions, and known open assurance gates.
