#!/usr/bin/env python3
from pathlib import Path
import json

ROOT=Path(__file__).resolve().parents[1]
MAIN=ROOT/'ProofScript_Language_Reference_v0.7.0_authoritative_draft.md'
REG=ROOT/'conformance'/'feature-registry.json'
text=MAIN.read_text(encoding='utf-8')
assert 'Lean 4.34.0' in text
assert '293d5d0c0c3f3dded4688b3ccd6a33939ac5102b' in text
assert 'Lean 4.35.0-rc2' in text and 'non-normative' in text
assert '## 33. Conformance artifacts and implementation readiness' in text
r=json.loads(REG.read_text(encoding='utf-8'))
assert r['schema_version']=='0.7.0'
assert r['semantic_baseline']['version']=='4.34.0'
assert r['semantic_baseline']['normative'] is True
assert r['compatibility_watch']['normative'] is False
assert set(r['implementation_profiles'])=={'reference-lean','standalone-pskernel'}
print('REFERENCE STATIC CHECK: PASS')
