#!/usr/bin/env node
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { verifyProofScriptDeliveryArchive } from './pskernel-kernel-delivery-archive-verify.ts';

function assert(condition, message, details = {}) {
  if (!condition) {
    process.stderr.write(`${message}\n${JSON.stringify(details, null, 2)}\n`);
    process.exit(1);
  }
}

const temp = mkdtempSync(resolve(tmpdir(), 'proofscript-delivery-archive-tests-'));
try {
  const missing = verifyProofScriptDeliveryArchive(resolve(temp, 'missing.zip'));
  assert(missing.status === 'rejected', 'missing delivery archive must reject', missing);
  assert(missing.requiredFailureCount > 0, 'missing delivery archive must report a required failure', missing);

  const fakeZip = resolve(temp, 'fake.zip');
  writeFileSync(fakeZip, 'not a zip');
  const fake = verifyProofScriptDeliveryArchive(fakeZip);
  assert(fake.status === 'rejected', 'malformed delivery archive must reject', fake);
  assert(fake.checks.some(check => check.id === 'delivery-archive.extract' && check.status === 'rejected'), 'malformed delivery archive must fail extraction', fake);

  process.stdout.write('DELIVERY_ARCHIVE_VERIFICATION_TESTS=PASS\n');
} finally {
  rmSync(temp, { recursive: true, force: true });
}
