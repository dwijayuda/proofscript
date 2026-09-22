#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const root = process.cwd();
const checker = path.join(root, 'packages/arena-checker/dist/main.js');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'proofscript-arena-safety-'));
const fixtures = {
  unsafe: `{"meta":{"exporter":{"name":"lean4export","version":"3.1.0"},"format":{"version":"3.1.0"},"lean":{"githash":"f72c35b3f637c8c6571d353742168ab66cc22c00","version":"4.29.1"}}}
{"in":1,"str":{"pre":0,"str":"False"}}
{"ie":0,"sort":0}
{"in":2,"str":{"pre":1,"str":"rec"}}
{"in":3,"str":{"pre":0,"str":"u"}}
{"il":1,"param":3}
{"in":4,"str":{"pre":0,"str":"motive"}}
{"in":5,"str":{"pre":0,"str":"t"}}
{"const":{"name":1,"us":[]},"ie":1}
{"ie":2,"sort":1}
{"forallE":{"binderInfo":"default","body":2,"name":5,"type":1},"ie":3}
{"bvar":1,"ie":4}
{"bvar":0,"ie":5}
{"app":{"arg":5,"fn":4},"ie":6}
{"forallE":{"binderInfo":"default","body":6,"name":5,"type":1},"ie":7}
{"forallE":{"binderInfo":"default","body":7,"name":4,"type":3},"ie":8}
{"inductive":{"ctors":[],"recs":[{"all":[1],"isUnsafe":false,"k":false,"levelParams":[3],"name":2,"numIndices":0,"numMinors":0,"numMotives":1,"numParams":0,"rules":[],"type":8}],"types":[{"all":[1],"ctors":[],"isRec":false,"isReflexive":false,"isUnsafe":false,"levelParams":[],"name":1,"numIndices":0,"numNested":0,"numParams":0,"type":0}]}}
{"in":6,"str":{"pre":0,"str":"unsafeLoop"}}
{"const":{"name":6,"us":[]},"ie":9}
{"def":{"all":[6],"hints":"opaque","levelParams":[],"name":6,"safety":"unsafe","type":1,"value":9}}
{"in":7,"str":{"pre":0,"str":"falseFromUnsafe"}}
{"thm":{"all":[7],"levelParams":[],"name":7,"type":1,"value":9}}
`,
  partial: `{"meta":{"exporter":{"name":"lean4export","version":"3.1.0"},"format":{"version":"3.1.0"},"lean":{"githash":"f72c35b3f637c8c6571d353742168ab66cc22c00","version":"4.29.1"}}}
{"in":1,"str":{"pre":0,"str":"False"}}
{"ie":0,"sort":0}
{"in":2,"str":{"pre":1,"str":"rec"}}
{"in":3,"str":{"pre":0,"str":"u"}}
{"il":1,"param":3}
{"in":4,"str":{"pre":0,"str":"motive"}}
{"in":5,"str":{"pre":0,"str":"t"}}
{"const":{"name":1,"us":[]},"ie":1}
{"ie":2,"sort":1}
{"forallE":{"binderInfo":"default","body":2,"name":5,"type":1},"ie":3}
{"bvar":1,"ie":4}
{"bvar":0,"ie":5}
{"app":{"arg":5,"fn":4},"ie":6}
{"forallE":{"binderInfo":"default","body":6,"name":5,"type":1},"ie":7}
{"forallE":{"binderInfo":"default","body":7,"name":4,"type":3},"ie":8}
{"inductive":{"ctors":[],"recs":[{"all":[1],"isUnsafe":false,"k":false,"levelParams":[3],"name":2,"numIndices":0,"numMinors":0,"numMotives":1,"numParams":0,"rules":[],"type":8}],"types":[{"all":[1],"ctors":[],"isRec":false,"isReflexive":false,"isUnsafe":false,"levelParams":[],"name":1,"numIndices":0,"numNested":0,"numParams":0,"type":0}]}}
{"in":6,"str":{"pre":0,"str":"partialLoop"}}
{"const":{"name":6,"us":[]},"ie":9}
{"def":{"all":[6],"hints":"opaque","levelParams":[],"name":6,"safety":"partial","type":1,"value":9}}
{"in":7,"str":{"pre":0,"str":"falseFromPartial"}}
{"thm":{"all":[7],"levelParams":[],"name":7,"type":1,"value":9}}
`,
};

function fixturePath(label, source) {
  const file = path.join(dir, `${label}.ndjson`);
  fs.writeFileSync(file, source);
  return file;
}

function run(file) {
  const res = spawnSync(process.execPath, [checker, file], { cwd: root, encoding: 'utf8' });
  const stdout = (res.stdout || '').trim();
  let parsed;
  try { parsed = JSON.parse(stdout); } catch (err) { throw new Error(`checker did not print JSON for ${file}: ${stdout}
${res.stderr}`); }
  return { status: res.status, parsed, stderr: res.stderr };
}

try {
  for (const [label, source] of Object.entries(fixtures)) {
    const result = run(fixturePath(label, source));
    assert.equal(result.status, 1, `${label} tutorial attack must be rejected with Arena exit 1, not declined`);
    assert.equal(result.parsed.status, 'rejected', `${label} tutorial attack must report rejected`);
    assert.match(result.parsed.message, /unsafe|partial|logical kernel|safe/i, `${label} diagnostic should explain logical safety rejection`);
  }

const nonStructureProjection = '/mnt/data/arena-corpus-20260915/bad/tutorial/088_projNotStruct.ndjson';
if (fs.existsSync(nonStructureProjection)) {
  const result = run(nonStructureProjection);
  assert.equal(result.status, 1, 'invalid non-structure projection must be rejected with Arena exit 1, not declined');
  assert.equal(result.parsed.status, 'rejected', 'invalid non-structure projection must report rejected');
  assert.match(result.parsed.message, /projection|non-structure|structure/i, 'projection diagnostic should explain invalid projection rejection');
}

  console.log('ARENA_UNSAFE_PARTIAL_REJECT0=PASS');
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}
