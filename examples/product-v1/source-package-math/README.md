# @proofscript-example/source-math

Product-v1 source-package fixture.

The package advertises:

```json
{
  "proofscript": {
    "sourceRoot": "proofscript"
  }
}
```

ProofScript module names are derived from paths under that source root. The
fixture therefore exposes module `Example.Math` from
`proofscript/Example/Math.ps`.

This is intentionally **not** JavaScript-style source resolution. ProofScript
source imports stay module-name based and deterministic.
