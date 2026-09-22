#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = process.env.PROOFSCRIPT_RELEASE_OUT_DIR || '/mnt/data';
const name = 'proofscript-standalone-kernel-maturity-replacement-p5-94-arena-nested-helper-target-validation0';
const stageRoot = path.join(outDir, `${name}-stage`);
const stage = path.join(stageRoot, name);
const outZip = path.join(outDir, `${name}.zip`);
const outSha = `${outZip}.sha256`;
fs.rmSync(stageRoot, { recursive: true, force: true });
fs.rmSync(outZip, { force: true });
fs.rmSync(outSha, { force: true });
fs.mkdirSync(stage, { recursive: true });

const excludedDirNames = new Set(['node_modules', 'dist']);
const excludedTopDirs = new Set(['artifacts']);
function shouldSkip(relative, dirent) {
  const parts = relative.split(path.sep).filter(Boolean);
  if (!parts.length) return false;
  if (excludedTopDirs.has(parts[0])) return true;
  if (excludedDirNames.has(dirent.name)) return true;
  if (relative === path.join('examples', 'basic', 'proof') || relative.startsWith(path.join('examples', 'basic', 'proof') + path.sep)) return true;
  if (relative === path.join('examples', 'basic', 'dist') || relative.startsWith(path.join('examples', 'basic', 'dist') + path.sep)) return true;
  if (dirent.isFile() && (/\.tsbuildinfo$/.test(dirent.name) || /\.zip$/.test(dirent.name))) return true;
  if (dirent.isFile() && /\.tgz$/.test(dirent.name) && !(parts[0] === 'vendor' && parts[1] === 'npm')) return true;
  return false;
}
function copyTree(src, dst, rel = '') {
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const r = path.join(rel, entry.name);
    if (shouldSkip(r, entry)) continue;
    const sp = path.join(src, entry.name);
    const dp = path.join(dst, entry.name);
    if (entry.isDirectory()) { fs.mkdirSync(dp, { recursive: true }); copyTree(sp, dp, r); }
    else if (entry.isFile()) fs.copyFileSync(sp, dp);
    else if (entry.isSymbolicLink()) fs.symlinkSync(fs.readlinkSync(sp), dp);
  }
}
copyTree(root, stage);

const residue = {
  node_modules: 0,
  dist: 0,
  tsbuildinfo: 0,
  tgz: 0,
  vendoredNpmTgz: 0,
  zip: 0,
};
function scan(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') residue.node_modules++;
      if (entry.name === 'dist') residue.dist++;
      scan(p);
    } else if (entry.isFile()) {
      if (entry.name.endsWith('.tsbuildinfo')) residue.tsbuildinfo++;
      if (entry.name.endsWith('.tgz')) { if (p.includes(`${path.sep}vendor${path.sep}npm${path.sep}`)) residue.vendoredNpmTgz++; else residue.tgz++; }
      if (entry.name.endsWith('.zip')) residue.zip++;
    }
  }
}
scan(stage);
for (const [key, value] of Object.entries(residue)) {
  if (key !== 'vendoredNpmTgz' && value !== 0) throw new Error(`source release contains ${key} residue: ${value}`);
}
const zip = spawnSync('zip', ['-X', '-q', '-r', outZip, name], { cwd: stageRoot, encoding: 'utf8' });
if (zip.status !== 0) {
  console.error(zip.stdout); console.error(zip.stderr); process.exit(zip.status ?? 1);
}
const bytes = fs.readFileSync(outZip);
const sha = crypto.createHash('sha256').update(bytes).digest('hex');
fs.writeFileSync(outSha, `${sha}  ${path.basename(outZip)}\n`);
console.log(JSON.stringify({ release: 'P5.94', archive: outZip, sha256: sha, residue }, null, 2));
