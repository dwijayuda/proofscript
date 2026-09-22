#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
python3 scripts/verify_reference_static.py
python3 -m json.tool conformance/feature-registry.json >/dev/null
python3 -m json.tool conformance/feature-registry.schema.json >/dev/null
python3 - <<'PY'
from pathlib import Path
import json
for path in [Path('conformance/cases/positive.jsonl'), Path('conformance/cases/negative.jsonl'), Path('conformance/cases/lowering.jsonl')]:
    for n,line in enumerate(path.read_text(encoding='utf-8').splitlines(), start=1):
        if line.strip():
            json.loads(line)
print('JSONL CHECK: PASS')
PY
echo 'STATIC VERIFICATION: PASS'
