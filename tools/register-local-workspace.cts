'use strict';

const Module = require('node:module');
const fs = require('node:fs');
const path = require('node:path');

if (!globalThis.__proofscriptLocalWorkspaceResolutionRegistered) {
  globalThis.__proofscriptLocalWorkspaceResolutionRegistered = true;
  const repoRoot = path.resolve(__dirname, '..');
  const originalResolveFilename = Module._resolveFilename;

  function localPackageEntry(request) {
    if (!request.startsWith('@proofscript/')) return undefined;
    const rest = request.slice('@proofscript/'.length);
    const [pkg, ...subpathParts] = rest.split('/');
    const packageDir = path.join(repoRoot, 'packages', pkg);
    if (!fs.existsSync(packageDir)) return undefined;
    if (subpathParts.join('/') === 'package.json') {
      const packageJsonPath = path.join(packageDir, 'package.json');
      if (fs.existsSync(packageJsonPath)) return packageJsonPath;
    }
    if (subpathParts.length > 0) {
      const distSubpath = path.join(packageDir, 'dist', ...subpathParts);
      for (const candidate of [distSubpath, `${distSubpath}.js`, path.join(distSubpath, 'index.js')]) {
        if (fs.existsSync(candidate)) return candidate;
      }
    }
    const packageJsonPath = path.join(packageDir, 'package.json');
    let main = 'dist/index.js';
    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        if (typeof packageJson.main === 'string' && packageJson.main.length > 0) main = packageJson.main;
      } catch {
        main = 'dist/index.js';
      }
    }
    const mainPath = path.join(packageDir, main);
    if (fs.existsSync(mainPath)) return mainPath;
    const fallback = path.join(packageDir, 'dist', 'index.js');
    if (fs.existsSync(fallback)) return fallback;
    return undefined;
  }

  Module._resolveFilename = function proofscriptResolveFilename(request, parent, isMain, options) {
    try {
      return originalResolveFilename.call(this, request, parent, isMain, options);
    } catch (error) {
      if (error && error.code === 'MODULE_NOT_FOUND') {
        const local = localPackageEntry(request);
        if (local) return local;
      }
      throw error;
    }
  };
}
