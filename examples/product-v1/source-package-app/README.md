# Product-v1 source package consumer

This app installs a local npm package that carries ProofScript source and then
imports its module with ordinary ProofScript syntax:

```proofscript
import Example.Math;
```

Resolution authority is `@proofscript/project`:

1. the app's declared npm dependencies are inspected;
2. only dependencies with explicit `package.json.proofscript.sourceRoot` join
   the ProofScript source environment;
3. the source root must remain inside the installed package;
4. module names still resolve deterministically as `A.B -> A/B.ps`;
5. missing, duplicate, ambiguous, or escaping roots fail closed.
