import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const ignoredDirNames = new Set(['node_modules', 'dist', 'coverage', '.git']);
const generatedPathFragments = ['/generated/', '/artifacts/'];
const forbiddenExts = new Set(['.js', '.mjs', '.cjs']);
const allowedSuffixes = [
  // Compiled package output and vendored tarball contents are intentionally out of source-tree migration scope.
  '/package-lock.json',
  // P5.97: root bin shim must be plain JavaScript so `psc` can bootstrap TypeScript-stripping flags cross-platform before TS tools load.
  'bin/psc.mjs',
];

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(root, full).split(path.sep).join('/');
    if (entry.isDirectory()) {
      if (ignoredDirNames.has(entry.name)) continue;
      if (generatedPathFragments.some(fragment => `/${rel}/`.includes(fragment))) continue;
      walk(full, out);
    } else if (entry.isFile()) {
      if (allowedSuffixes.some(suffix => rel.endsWith(suffix))) continue;
      if (forbiddenExts.has(path.extname(entry.name))) out.push(rel);
    }
  }
  return out;
}

const offenders = walk(root).sort();
if (offenders.length !== 0) {
  console.error('Repository-owned JavaScript files remain outside generated/vendor scope:');
  for (const offender of offenders.slice(0, 200)) console.error(`- ${offender}`);
  if (offenders.length > 200) console.error(`... ${offenders.length - 200} more`);
  process.exit(1);
}
console.log('TYPESCRIPT_MIGRATION_AUDIT=PASS');
