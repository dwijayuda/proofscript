import { cp, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
const assets = [
  ['packages/frontend-next/src/plugins/features/lean/option.lean','packages/frontend-next/dist/plugins/features/lean/option.lean'],
  ['packages/frontend-next/src/plugins/features/lean/rust-black-box.lean','packages/frontend-next/dist/plugins/features/lean/rust-black-box.lean'],
  ['docs/TRUST_BOUNDARY.md','packages/kernel/docs/TRUST_BOUNDARY.md'],
  ['docs/PROOF_OBLIGATIONS.md','packages/kernel/docs/PROOF_OBLIGATIONS.md'],
  ['docs/PSKERNEL_TS_PORTING_MAP.md','packages/kernel/docs/PSKERNEL_TS_PORTING_MAP.md'],
  ['docs/PSKERNEL_TS_PHASE_PLAN.md','packages/kernel/docs/PSKERNEL_TS_PHASE_PLAN.md'],
  ['docs/PSKERNEL_TS_RELEASE_PREFLIGHT.json','packages/kernel/docs/PSKERNEL_TS_RELEASE_PREFLIGHT.json'],
  ['docs/PSKERNEL_TS_PROOF_OBLIGATIONS.json','packages/kernel/docs/PSKERNEL_TS_PROOF_OBLIGATIONS.json'],
  ['docs/PSKERNEL_TS_PACKAGE_AUDIT.json','packages/kernel/docs/PSKERNEL_TS_PACKAGE_AUDIT.json'],
  ['docs/PSKERNEL_TS_TARBALL_SMOKE.json','packages/kernel/docs/PSKERNEL_TS_TARBALL_SMOKE.json'],
  ['docs/PSKERNEL_TS_RELEASE_ARCHIVE.json','packages/kernel/docs/PSKERNEL_TS_RELEASE_ARCHIVE.json'],
  ['docs/PSKERNEL_TS_DELIVERY_BOOTSTRAP.json','packages/kernel/docs/PSKERNEL_TS_DELIVERY_BOOTSTRAP.json'],
  ['docs/PSKERNEL_TS_DELIVERY_ARCHIVE_VERIFICATION.json','packages/kernel/docs/PSKERNEL_TS_DELIVERY_ARCHIVE_VERIFICATION.json'],
];
for (const [src,dst] of assets) { await mkdir(dirname(dst), {recursive:true}); await cp(src,dst); }
console.log(`copied ${assets.length} static assets`);
