import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
let manifestArg = null;
for (let i = 0; i < args.length; i += 1) {
  if (args[i] === "--manifest") {
    manifestArg = args[i + 1];
    i += 1;
  }
}
const manifestPath = manifestArg ? path.resolve(root, manifestArg) : path.join(root, "config", "package-classification.json");
const failures = [];
const validTiers = new Set(["trusted", "language", "execution", "product", "plugin-infra", "bridge", "experimental"]);
const validLifecycles = new Set(["canonical", "supported", "experimental", "legacy", "deprecated"]);
const stableAllowedTiers = new Set(["trusted", "language", "execution"]);

function normalize(p) {
  return path.resolve(p);
}

function isInside(child, parent) {
  const rel = path.relative(normalize(parent), normalize(child));
  return rel === "" || (!!rel && !rel.startsWith("..") && !path.isAbsolute(rel));
}

function listWorkspacePackageDirs() {
  const bases = ["packages", "plugins/official", "plugins/examples"];
  const dirs = [];
  for (const base of bases) {
    const absBase = path.join(root, base);
    if (!fs.existsSync(absBase)) continue;
    for (const entry of fs.readdirSync(absBase, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const pkgDir = path.join(absBase, entry.name);
      if (fs.existsSync(path.join(pkgDir, "package.json"))) dirs.push(path.relative(root, pkgDir).split(path.sep).join("/"));
    }
  }
  return dirs.sort();
}

function listTsSourceFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return listTsSourceFiles(full);
    return full.endsWith(".ts") ? [full] : [];
  });
}

function readImports(file) {
  const source = fs.readFileSync(file, "utf8");
  const imports = [];
  const patterns = [
    /\bimport\s+(?:type\s+)?(?:[^"'()]+?\s+from\s+)?["']([^"']+)["']/g,
    /\bexport\s+(?:type\s+)?[^"']*?\s+from\s+["']([^"']+)["']/g,
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
    /\brequire\s*\(\s*["']([^"']+)["']\s*\)/g,
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) imports.push(match[1]);
  }
  return [...new Set(imports)];
}

function proofscriptAliasName(specifier) {
  const match = /^@proofscript\/([^/]+)/.exec(specifier);
  return match ? `@proofscript/${match[1]}` : null;
}

function packageFromPath(absPath) {
  for (const base of ["packages", "plugins/official", "plugins/examples"]) {
    const absBase = path.join(root, base);
    if (!fs.existsSync(absBase) || !isInside(absPath, absBase)) continue;
    const rel = path.relative(absBase, absPath).split(path.sep);
    if (rel[0]) return `${base}/${rel[0]}`;
  }
  return null;
}

function relativeTargetPackage(file, specifier) {
  if (!specifier.startsWith(".")) return null;
  const resolved = path.resolve(path.dirname(file), specifier);
  return packageFromPath(resolved);
}

function formatEdge(file, specifier, targetPath) {
  const filePart = path.relative(root, file).split(path.sep).join("/");
  return targetPath ? `${filePart} -> ${specifier} (${targetPath})` : `${filePart} -> ${specifier}`;
}

function loadJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    failures.push(`failed to read JSON ${path.relative(root, file)}: ${error.message}`);
    return null;
  }
}

const manifest = loadJson(manifestPath);
if (!manifest) {
  console.error(failures.join("\n"));
  process.exit(1);
}

if (manifest.schemaVersion !== 1) failures.push(`package classification schemaVersion must be 1, got ${manifest.schemaVersion}`);
if (manifest.trustClaim?.label !== "K3-TB trusted-boundary") failures.push("trust claim label must remain K3-TB trusted-boundary");
if (manifest.trustClaim?.fullyFormalK3 !== false) failures.push("trust claim must not mark fullyFormalK3 true");
if (manifest.trustClaim?.lean4Equivalent !== false) failures.push("trust claim must not mark lean4Equivalent true");
if (manifest.trustClaim?.formalLean4EquivalenceProvenObligations !== 0) failures.push("formal Lean 4 equivalence obligations must remain 0 until actually proven");
if (!Array.isArray(manifest.packages)) failures.push("manifest.packages must be an array");
if (!Array.isArray(manifest.stablePsc1Path)) failures.push("manifest.stablePsc1Path must be an array");

const entries = Array.isArray(manifest.packages) ? manifest.packages : [];
const rootPackage = loadJson(path.join(root, "package.json"));
const byPath = new Map();
const byName = new Map();
for (const entry of entries) {
  if (!entry?.path) failures.push("every package classification entry needs path");
  if (!entry?.npmName) failures.push(`classification entry ${entry?.path ?? "<unknown>"} needs npmName`);
  if (!validTiers.has(entry?.tier)) failures.push(`classification entry ${entry?.path ?? "<unknown>"} has invalid tier ${entry?.tier}`);
  if (!validLifecycles.has(entry?.lifecycle)) failures.push(`classification entry ${entry?.path ?? "<unknown>"} has invalid lifecycle ${entry?.lifecycle}`);
  if (!entry?.trustBoundary) failures.push(`classification entry ${entry?.path ?? "<unknown>"} needs trustBoundary`);
  if (!entry?.productionRole) failures.push(`classification entry ${entry?.path ?? "<unknown>"} needs productionRole`);
  if (!Array.isArray(entry?.allowedDependencies)) failures.push(`classification entry ${entry?.path ?? "<unknown>"} needs allowedDependencies array`);
  if (entry?.path) {
    if (byPath.has(entry.path)) failures.push(`duplicate classification path ${entry.path}`);
    byPath.set(entry.path, entry);
  }
  if (entry?.npmName) {
    if (byName.has(entry.npmName)) failures.push(`duplicate classification npmName ${entry.npmName}`);
    byName.set(entry.npmName, entry);
  }
}

const discovered = listWorkspacePackageDirs();
for (const pkgPath of discovered) {
  const entry = byPath.get(pkgPath);
  if (!entry) {
    failures.push(`workspace package is not classified: ${pkgPath}`);
    continue;
  }
  const pkgJson = loadJson(path.join(root, pkgPath, "package.json"));
  if (pkgJson && pkgJson.name !== entry.npmName) {
    failures.push(`${pkgPath} package.json name ${pkgJson.name} does not match classification npmName ${entry.npmName}`);
  }
  if (pkgJson?.name && rootPackage?.name && pkgJson.name === rootPackage.name) {
    failures.push(`${pkgPath} reuses root package name ${rootPackage.name}; the root package must be the sole public owner of that npm identity`);
  }
}
for (const pkgPath of byPath.keys()) {
  if (!discovered.includes(pkgPath)) failures.push(`classification references missing workspace package: ${pkgPath}`);
}

for (const stablePath of manifest.stablePsc1Path ?? []) {
  const entry = byPath.get(stablePath);
  if (!entry) {
    failures.push(`stable PSC-1 path entry is not classified: ${stablePath}`);
    continue;
  }
  if (!stableAllowedTiers.has(entry.tier)) failures.push(`stable PSC-1 path package ${stablePath} has non-stable tier ${entry.tier}`);
  if (entry.lifecycle !== "canonical") failures.push(`stable PSC-1 path package ${stablePath} must be canonical, got ${entry.lifecycle}`);
}

function checkAllowedDependency(sourcePath, targetPath, where) {
  if (!sourcePath || !targetPath || sourcePath === targetPath) return;
  const source = byPath.get(sourcePath);
  if (!source) return;
  if (!byPath.has(targetPath)) failures.push(`${where} targets unclassified package ${targetPath}`);
  if (!source.allowedDependencies.includes(targetPath)) {
    failures.push(`${sourcePath} has undeclared package dependency on ${targetPath}: ${where}`);
  }
}

for (const sourcePath of discovered) {
  const entry = byPath.get(sourcePath);
  if (!entry) continue;
  const packageJson = loadJson(path.join(root, sourcePath, "package.json"));
  const packageDeps = {
    ...packageJson?.dependencies,
    ...packageJson?.peerDependencies,
    ...packageJson?.optionalDependencies,
  };
  for (const depName of Object.keys(packageDeps ?? {})) {
    const depEntry = byName.get(depName);
    if (depEntry) checkAllowedDependency(sourcePath, depEntry.path, `${sourcePath}/package.json dependency ${depName}`);
  }

  const tsconfigPath = path.join(root, sourcePath, "tsconfig.json");
  if (fs.existsSync(tsconfigPath)) {
    const tsconfig = loadJson(tsconfigPath);
    for (const ref of tsconfig?.references ?? []) {
      if (!ref?.path) continue;
      const targetPath = packageFromPath(path.resolve(path.dirname(tsconfigPath), ref.path));
      if (targetPath) checkAllowedDependency(sourcePath, targetPath, `${sourcePath}/tsconfig.json reference ${ref.path}`);
    }
  }

  for (const file of listTsSourceFiles(path.join(root, sourcePath, "src"))) {
    for (const specifier of readImports(file)) {
      const aliasName = proofscriptAliasName(specifier);
      if (aliasName) {
        const targetEntry = byName.get(aliasName);
        if (targetEntry) checkAllowedDependency(sourcePath, targetEntry.path, formatEdge(file, specifier, targetEntry.path));
        continue;
      }
      const relPkg = relativeTargetPackage(file, specifier);
      if (relPkg) checkAllowedDependency(sourcePath, relPkg, formatEdge(file, specifier, relPkg));
    }
  }
}

const productionPackageDoc = path.join(root, "docs", "PRODUCTION_PACKAGE_CLASSIFICATION.md");
if (!fs.existsSync(productionPackageDoc)) failures.push("missing docs/PRODUCTION_PACKAGE_CLASSIFICATION.md");

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

const tierCounts = entries.reduce((acc, entry) => {
  acc[entry.tier] = (acc[entry.tier] ?? 0) + 1;
  return acc;
}, {});
console.log(`✓ package classification holds (${entries.length} packages; stable PSC-1 path=${manifest.stablePsc1Path.length})`);
console.log(JSON.stringify({ tierCounts, trustClaim: manifest.trustClaim.label, formalLean4EquivalenceProvenObligations: manifest.trustClaim.formalLean4EquivalenceProvenObligations }, null, 2));
