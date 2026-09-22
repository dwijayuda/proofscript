#!/usr/bin/env python3
from pathlib import Path
import json

ROOT=Path(__file__).resolve().parents[1]
MAIN=ROOT/'ProofScript_Language_Reference_v0.7.0_authoritative_draft.md'
REG=ROOT/'conformance'/'feature-registry.json'
SCHEMA=ROOT/'conformance'/'feature-registry.schema.json'
DELTA=ROOT/'appendices'/'K-lean-4.34-stable-delta.md'

text=MAIN.read_text(encoding='utf-8')
assert 'Lean 4.34.0' in text
assert '293d5d0c0c3f3dded4688b3ccd6a33939ac5102b' in text
assert 'Lean 4.35.0-rc2' in text and 'non-normative' in text
assert 'Final Lean 4.34 removed' in text
assert 'erased' in text
assert '## 33. Conformance artifacts and implementation readiness' in text

r=json.loads(REG.read_text(encoding='utf-8'))
s=json.loads(SCHEMA.read_text(encoding='utf-8'))
assert r['schema_version']=='0.7.0'
assert r['semantic_baseline']=={
    'system':'Lean',
    'version':'4.34.0',
    'commit':'293d5d0c0c3f3dded4688b3ccd6a33939ac5102b',
    'normative':True,
}
assert r['compatibility_watch']['normative'] is False
assert set(r['implementation_profiles'])=={'reference-lean','standalone-pskernel'}
required_lean434_ids={
    'L-LEAN434-ERASED-DO',
    'L-LEAN434-MONOTONICITY-BY',
    'L-LEAN434-RECALL',
    'L-LEAN434-LIA-GROBNER-PARAMS',
}
feature_ids={f['id'] for f in r['features']}
assert required_lean434_ids <= feature_ids
baseline=s['properties']['semantic_baseline']
assert baseline['properties']['version']['const']=='4.34.0'
assert baseline['properties']['commit']['const']=='293d5d0c0c3f3dded4688b3ccd6a33939ac5102b'
assert baseline['properties']['normative']['const'] is True

delta=DELTA.read_text(encoding='utf-8')
assert '2a7175c74ba17b160299accd7e6ea6984d7ea86f' in delta
assert 'a714e8333f9d53bc26ba7568f23c59b1c1772946' in delta
print('REFERENCE STATIC CHECK: PASS')
