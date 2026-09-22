#!/usr/bin/env python3
from pathlib import Path
import sys, json
ROOT = Path(__file__).resolve().parents[1]
MAIN = ROOT / 'ProofScript_Language_Reference_v0.6.1_authoritative_draft.md'
REQ = [
  'README.md',
  'ProofScript_Language_Reference_v0.6.1_authoritative_draft.md',
  'appendices/A-complete-feature-registry.md',
  'appendices/B-lean-reference-coverage-map.md',
  'appendices/C-formal-proof-obligations.md',
  'appendices/D-typescript-runtime-profile.md',
  'appendices/E-error-and-diagnostic-catalog.md',
  'appendices/F-version-manifest-template.md',
  'appendices/G-conformance-suite.md',
  'appendices/H-implementation-milestone-plan.md',
  'appendices/I-parser-lowering-api-contract.md',
  'examples/01-basics.ps',
  'examples/02-structures.ps',
  'examples/03-inductives-and-match.ps',
  'examples/04-proofs.ps',
  'formal-plan/frontend-proof-roadmap.md',
  'formal-plan/parser-test-matrix.md',
  'formal-plan/lowering-theorem-matrix.md',
  'conformance/feature-registry.schema.json',
  'conformance/feature-registry.json',
  'conformance/cases/positive.jsonl',
  'conformance/cases/negative.jsonl',
  'conformance/cases/lowering.jsonl',
  'conformance/expected/positive-lowerings.lean',
  'VERIFICATION.md',
  'source-notes/proofscript-v0.6.1-soundness-goal-evaluation.md',
  'source-notes/proofscript-v0.6.1-compiler-ready-analysis.md',
  'CHANGELOG-v0.6.1.md',
]
missing = [p for p in REQ if not (ROOT / p).exists()]
if missing:
    print('FAIL missing files:', missing)
    sys.exit(1)
main = MAIN.read_text(encoding='utf-8')
registry_md = (ROOT/'appendices/A-complete-feature-registry.md').read_text(encoding='utf-8')
formal = (ROOT/'appendices/C-formal-proof-obligations.md').read_text(encoding='utf-8')
checks = {
    'baseline': 'Semantic baseline: **Lean 4.33.1**' in main,
    'version': 'v0.6.1' in main and 'v0.6.0' not in main[:1000],
    'slogan': 'TypeScript-friendly syntax where it helps; Lean semantics wherever it matters.' in main,
    'semantic equation': 'meaningPS(p) := meaningLean(lower(p))' in main,
    'S1 ceiling': 'S1 specified' in main and 'MUST NOT claim S2' in main,
    'category lifting': 'LIFT(P)' in main,
    'const alias': 'parameterless `def` alias' in main,
    'function alias': 'parameterized `def` alias' in main,
    'conformance chapter': 'conformance/feature-registry.json' in main,
    'feature registry aliases': all(s in registry_md for s in ['D-CONST-ALIAS','D-FUNCTION-ALIAS','E-IF-BRACE','X — Semantic Divergence']),
    'formal source theorem': 'parsed_derivable_source_has_lean_derivation' in formal,
    'conformance obligations': 'RegistryWellFormed' in formal,
}
failed = [k for k,v in checks.items() if not v]
if failed:
    print('FAIL checks:', failed)
    sys.exit(1)
reg = json.loads((ROOT/'conformance/feature-registry.json').read_text(encoding='utf-8'))
if reg.get('schema_version') != '0.6.1':
    print('FAIL registry version')
    sys.exit(1)
features = reg.get('features', [])
ids = [f.get('id') for f in features]
if len(ids) != len(set(ids)):
    print('FAIL duplicate feature ids')
    sys.exit(1)
required_ids = {'D-CALL','D-EXPLICIT-PARAMS','D-CONST-ALIAS','D-FUNCTION-ALIAS','E-IF-BRACE','E-STRUCT-BODY','E-CLASS-BODY','E-INDUCTIVE-BODY','E-MATCH-BODY','E-WHERE-BODY'}
missing_ids = required_ids - set(ids)
if missing_ids:
    print('FAIL registry missing ids:', sorted(missing_ids))
    sys.exit(1)
# Verify cases
allowed_negative_prefixes = ('X-',)
for filename in ['positive.jsonl','lowering.jsonl']:
    path = ROOT/'conformance/cases'/filename
    for n,line in enumerate(path.read_text(encoding='utf-8').splitlines(), start=1):
        if not line.strip():
            continue
        case = json.loads(line)
        if case.get('feature') not in ids:
            print(f'FAIL {filename}:{n} unknown feature {case.get("feature")}')
            sys.exit(1)
        if filename == 'lowering.jsonl' and not case.get('canonical_lean'):
            print(f'FAIL {filename}:{n} missing canonical_lean')
            sys.exit(1)
for n,line in enumerate((ROOT/'conformance/cases/negative.jsonl').read_text(encoding='utf-8').splitlines(), start=1):
    if not line.strip():
        continue
    case = json.loads(line)
    fid = case.get('feature')
    if fid not in ids and not fid.startswith(allowed_negative_prefixes):
        print(f'FAIL negative.jsonl:{n} unknown feature {fid}')
        sys.exit(1)
    if not case.get('reason'):
        print(f'FAIL negative.jsonl:{n} missing reason')
        sys.exit(1)
for path in ROOT.rglob('*.md'):
    text = path.read_text(encoding='utf-8')
    if 'TODO' in text or 'TBD' in text:
        print('FAIL placeholder:', path)
        sys.exit(1)
print('REFERENCE STATIC CHECK: PASS')
print('FEATURE REGISTRY CHECK: PASS')
print('DECLARATION ALIAS CHECK: PASS')
print('CONFORMANCE CORPUS CHECK: PASS')
print('CLAIM CEILING CHECK: PASS')
