#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
python3 scripts/verify_reference_static.py
python3 - <<'PY'
import json
from pathlib import Path
for p in Path('conformance/cases').glob('*.jsonl'):
    for n,line in enumerate(p.read_text(encoding='utf-8').splitlines(),1):
        if line.strip(): json.loads(line)
print('JSONL CHECK: PASS')
PY
