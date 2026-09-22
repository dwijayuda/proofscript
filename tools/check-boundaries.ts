import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

function normalize(p) {
  return path.resolve(p);
}

function isInside(child, parent) {
  const rel = path.relative(normalize(parent), normalize(child));
  return rel === "" || (!!rel && !rel.startsWith("..") && !path.isAbsolute(rel));
}

function listTsFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return listTsFiles(full);
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

function proofscriptAliasPackage(specifier) {
  const match = /^@proofscript\/([^/]+)/.exec(specifier);
  return match ? match[1] : null;
}

function packageFromPath(absPath) {
  const packagesDir = path.join(root, "packages");
  const pluginsOfficialDir = path.join(root, "plugins", "official");
  const pluginsExamplesDir = path.join(root, "plugins", "examples");

  if (isInside(absPath, packagesDir)) {
    const rel = path.relative(packagesDir, absPath).split(path.sep);
    return rel[0] ? `packages/${rel[0]}` : null;
  }
  if (isInside(absPath, pluginsOfficialDir)) {
    const rel = path.relative(pluginsOfficialDir, absPath).split(path.sep);
    return rel[0] ? `plugins/official/${rel[0]}` : "plugins/official";
  }
  if (isInside(absPath, pluginsExamplesDir)) {
    const rel = path.relative(pluginsExamplesDir, absPath).split(path.sep);
    return rel[0] ? `plugins/examples/${rel[0]}` : "plugins/examples";
  }
  return null;
}

function relativeTargetPackage(file, specifier) {
  if (!specifier.startsWith(".")) return null;
  const resolved = path.resolve(path.dirname(file), specifier);
  return packageFromPath(resolved);
}

function sourcePackage(file) {
  return packageFromPath(file);
}

function sourceArea(packageName) {
  return path.join(root, packageName, "src");
}

function formatEdge(file, specifier) {
  return `${path.relative(root, file)} -> ${specifier}`;
}

function checkSelfContainedSource(file, specifier, packageName, label) {
  if (!specifier.startsWith(".")) return;
  const resolved = path.resolve(path.dirname(file), specifier);
  if (!isInside(resolved, sourceArea(packageName))) {
    failures.push(`${label} forbidden relative dependency outside ${packageName}/src: ${formatEdge(file, specifier)} resolves to ${path.relative(root, resolved)}`);
  }
}

function checkTrustedBoundary(file, specifier) {
  const src = sourcePackage(file);
  const alias = proofscriptAliasPackage(specifier);
  const relPkg = relativeTargetPackage(file, specifier);
  const target = alias ? `packages/${alias}` : relPkg;

  if (src === "packages/kernel") {
    if (alias) failures.push(`kernel must have zero ProofScript-package imports: ${formatEdge(file, specifier)}`);
    checkSelfContainedSource(file, specifier, "packages/kernel", "kernel");
    return;
  }

  if (src === "packages/verifier") {
    const allowed = new Set(["kernel", "kernel-codec", "certificates"]);
    if (alias && !allowed.has(alias)) failures.push(`verifier forbidden ProofScript dependency: ${formatEdge(file, specifier)}`);
    if (relPkg && relPkg !== "packages/verifier") failures.push(`verifier forbidden relative dependency outside verifier/src: ${formatEdge(file, specifier)} resolves into ${relPkg}`);
    return;
  }

  if (src === "packages/kernel-codec") {
    const allowed = new Set(["kernel"]);
    if (alias && !allowed.has(alias)) failures.push(`kernel-codec forbidden ProofScript dependency: ${formatEdge(file, specifier)}`);
    if (relPkg && relPkg !== "packages/kernel-codec") failures.push(`kernel-codec forbidden relative dependency outside kernel-codec/src: ${formatEdge(file, specifier)} resolves into ${relPkg}`);
    return;
  }

  if (src === "packages/certificates") {
    if (alias) failures.push(`certificates must not import ProofScript packages: ${formatEdge(file, specifier)}`);
    if (relPkg && relPkg !== "packages/certificates") failures.push(`certificates forbidden relative dependency outside certificates/src: ${formatEdge(file, specifier)} resolves into ${relPkg}`);
    return;
  }

  if (src === "packages/plugin-api") {
    if (alias === "kernel" || specifier.startsWith("@proofscript/kernel/")) failures.push(`plugin-api imports trusted kernel: ${formatEdge(file, specifier)}`);
    if (relPkg === "packages/kernel") failures.push(`plugin-api reaches trusted kernel by relative import: ${formatEdge(file, specifier)}`);
    return;
  }

  if (src?.startsWith("plugins/")) {
    if (alias === "kernel" || specifier.startsWith("@proofscript/kernel/")) failures.push(`plugin imports trusted kernel: ${formatEdge(file, specifier)}`);
    if (relPkg === "packages/kernel") failures.push(`plugin reaches trusted kernel by relative import: ${formatEdge(file, specifier)}`);
    return;
  }

  // Generic high-value guard: no trusted package may reach execution or plugin layers by any path.
  const trustedSources = new Set(["packages/kernel", "packages/verifier", "packages/kernel-codec", "packages/certificates"]);
  const forbiddenTargets = new Set(["packages/runtime", "packages/backend-typescript", "packages/plugin-api", "packages/plugin-host"]);
  if (trustedSources.has(src) && target && forbiddenTargets.has(target)) {
    failures.push(`trusted-boundary forbidden dependency: ${formatEdge(file, specifier)} resolves into ${target}`);
  }
}

const checkedRoots = [
  "packages/kernel/src",
  "packages/verifier/src",
  "packages/kernel-codec/src",
  "packages/certificates/src",
  "packages/plugin-api/src",
  "plugins/official",
  "plugins/examples",
];

for (const checkedRoot of checkedRoots) {
  for (const file of listTsFiles(path.join(root, checkedRoot))) {
    for (const specifier of readImports(file)) checkTrustedBoundary(file, specifier);
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("✓ architecture dependency boundaries hold");
