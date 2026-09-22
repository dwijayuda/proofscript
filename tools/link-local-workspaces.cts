#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const repoRoot = path.resolve(__dirname, '..');
const packagesRoot = path.join(repoRoot, 'packages');
const scopeRoot = path.join(repoRoot, 'node_modules', '@proofscript');

function sha256(value) {
  return crypto.createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
}
function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== 'object') return value;
  const out = {};
  for (const key of Object.keys(value).sort()) out[key] = canonicalize(value[key]);
  return out;
}
function stableSha256(value) { return sha256(JSON.stringify(canonicalize(value))); }
function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function printJson(value) { process.stdout.write(`${JSON.stringify(value, null, 2)}\n`); }
function rel(p) { return path.relative(repoRoot, p).split(path.sep).join('/'); }

function discoverWorkspacePackages() {
  if (!fs.existsSync(packagesRoot)) return [];
  return fs.readdirSync(packagesRoot, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => {
      const packageDir = path.join(packagesRoot, entry.name);
      const packageJsonPath = path.join(packageDir, 'package.json');
      if (!fs.existsSync(packageJsonPath)) return undefined;
      const packageJson = readJson(packageJsonPath);
      if (typeof packageJson.name !== 'string' || !packageJson.name.startsWith('@proofscript/')) return undefined;
      return { name: packageJson.name, packageDir, packageJsonPath };
    })
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name));
}

function safeUnlink(target) {
  try {
    const st = fs.lstatSync(target);
    if (st.isSymbolicLink()) { fs.unlinkSync(target); return; }
    // npm may leave a real directory behind when a previous Windows fallback copied a package.
    // It is safe to remove only under node_modules/@proofscript, never arbitrary paths.
    const scopePrefix = `${scopeRoot}${path.sep}`;
    if (target.startsWith(scopePrefix) && st.isDirectory()) {
      fs.rmSync(target, { recursive: true, force: true });
      return;
    }
    throw new Error(`${rel(target)} exists but is not a managed workspace link; refusing to overwrite`);
  } catch (error) {
    if (error && error.code === 'ENOENT') return;
    throw error;
  }
}

function copyDirectoryWithoutBuildResidue(source, target) {
  fs.mkdirSync(target, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    if (['node_modules', '.tsbuildinfo'].includes(entry.name)) continue;
    const from = path.join(source, entry.name);
    const to = path.join(target, entry.name);
    if (entry.isDirectory()) copyDirectoryWithoutBuildResidue(from, to);
    else if (entry.isFile()) fs.copyFileSync(from, to);
  }
}

function isRecoverableLinkError(error) {
  return Boolean(error && ['EPERM', 'EACCES', 'EXDEV', 'EINVAL', 'UNKNOWN'].includes(error.code));
}
function shouldForceCopyFallback() {
  return process.env.PROOFSCRIPT_FORCE_WORKSPACE_LINK_COPY === '1' || process.argv.includes('--force-copy-fallback');
}
function shouldSimulateSymlinkFailure() {
  return process.env.PROOFSCRIPT_TEST_SYMLINK_EPERM === '1' || process.argv.includes('--simulate-symlink-eperm');
}
function createCopyFallback(packageDir, linkPath, forced = false) {
  copyDirectoryWithoutBuildResidue(packageDir, linkPath);
  return { mode: forced ? 'copy-fallback-forced' : 'copy-fallback', target: rel(packageDir) };
}
function createManagedWorkspaceLink(packageDir, linkPath) {
  if (shouldForceCopyFallback()) return createCopyFallback(packageDir, linkPath, true);
  const symlinkType = process.platform === 'win32' ? 'junction' : 'dir';
  const symlinkTarget = process.platform === 'win32' ? path.resolve(packageDir) : path.relative(path.dirname(linkPath), packageDir);
  try {
    if (shouldSimulateSymlinkFailure()) {
      const simulated = new Error('simulated EPERM creating workspace symlink');
      simulated.code = 'EPERM';
      throw simulated;
    }
    // Node requires an absolute target for Windows junction points. Junctions avoid the
    // common EPERM failure users see when ordinary directory symlinks are disabled.
    fs.symlinkSync(symlinkTarget, linkPath, symlinkType);
    return { mode: process.platform === 'win32' ? 'junction' : 'symlink', target: rel(packageDir) };
  } catch (error) {
    if (!isRecoverableLinkError(error)) throw error;
    // Last-resort fallback for locked-down Windows, cross-device, or otherwise
    // symlink-restricted environments. Build still operates on packages/* directly
    // via tsconfig references; this copy satisfies bare @proofscript/* resolution.
    safeUnlink(linkPath);
    return createCopyFallback(packageDir, linkPath, false);
  }
}

function linkLocalWorkspaces() {
  const packages = discoverWorkspacePackages();
  fs.mkdirSync(scopeRoot, { recursive: true });
  const links = [];
  for (const pkg of packages) {
    const shortName = pkg.name.slice('@proofscript/'.length);
    const linkPath = path.join(scopeRoot, shortName);
    safeUnlink(linkPath);
    const created = createManagedWorkspaceLink(pkg.packageDir, linkPath);
    links.push({ name: pkg.name, link: rel(linkPath), target: created.target, mode: created.mode });
  }
  const evidence = {
    schema: 'proofscript-local-workspace-links/v1',
    status: 'accepted',
    generatedAt: new Date(0).toISOString(),
    packageCount: links.length,
    links,
  };
  return { ...evidence, workspaceLinksSha256: stableSha256(evidence) };
}

if (require.main === module) {
  try {
    const result = linkLocalWorkspaces();
    if (process.argv.includes('--json')) printJson(result);
    else process.stdout.write(`PROOFSCRIPT_LOCAL_WORKSPACE_LINKS=PASS packages=${result.packageCount} workspaceLinksSha256=${result.workspaceLinksSha256}\n`);
  } catch (error) {
    const result = {
      schema: 'proofscript-local-workspace-links/v1',
      status: 'rejected',
      message: error instanceof Error ? error.message : String(error),
    };
    printJson(result);
    process.exitCode = 1;
  }
}

module.exports = { linkLocalWorkspaces };
