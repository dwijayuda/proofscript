# Reference migration: v0.6.1 → v0.7.0

Status: **candidate migration plan**.

Production source-language authority remains v0.6.1 until activation is deliberate.

Before switching authority:
1. v0.7 static package validation passes;
2. the v0.6.1 conformance corpus is replayed under the v0.7 registry with no unexplained regression;
3. production parser/lowering tests are rebound to v0.7 paths;
4. Lean oracle metadata is 4.34.0 stable;
5. governance and verification-matrix references are migrated in reviewed commits;
6. historical v0.6.1 reports/certificates remain immutable;
7. any semantic change receives a focused regression/conformance case.

The initial v0.7 candidate intentionally does not add new D/E syntax.
