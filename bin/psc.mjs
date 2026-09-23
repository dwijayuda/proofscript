#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { assertVerificationProfile, makeContractsArtifact, makeMonadicContractsArtifact, leanForContract, leanForMonadicContract, parsePureContractSource, isMonadicContractSource } from '../packages/contracts/src/index.mjs';
import { normalizeObligationsForWorkflow } from '../packages/obligations/src/index.mjs';
import { readProofClaims, createProofStatusArtifact, verifyProofStatusArtifact } from '../packages/proof-status/src/index.mjs';
import { readStateModelDescriptor, validateStateModelDescriptor, buildStateModelBinding } from '../packages/state-models/src/index.mjs';
import {
  monadicLoweringCommand,
  monadicVcRequestCommand,
  monadicVcRunCommand,
  monadicPreflightCommand,
  createMonadicLoweringBundle,
  createMonadicLeanPreflightBundle,
} from './monadic-commands.mjs';
import {
  CURRENT_PRODUCT_PROFILE,
  CURRENT_PROOFSCRIPT_REFERENCE,
  certificateMetadataForCore,
  readCurrentProductProfile,
  runtimeCertificateMetadata,
  validateCliProjectProfile,
  verifyCertificateMetadataAgainstCore,
  verifyRuntimeCertificateMetadata,
} from '../packages/product-profile/src/index.mjs';
const require = createRequire(import.meta.url);

const VERSION = '1.0.0-pskernel.149';
const NODE_TS_FLAGS = [
  '--experimental-strip-types',
  '--disable-warning=ExperimentalWarning',
  '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON',
];
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OPTIONS_WITH_VALUES = new Set([
  '--args', '--call', '--core', '--emit-core', '--emit-lean', '--emit-lean-check', '--ffi-manifest', '--lean-cmd', '--lean-project', '--lake-cmd', '--name', '--out', '--out-dir', '--proofs', '--runtime', '--runtime-artifact', '--state-model', '--suffix', '--target', '--template', '--verification-profile',
]);

function has(args, name) { return args.includes(name); }
function opt(args, name) {
  const eq = args.find(a => a.startsWith(`${name}=`));
  if (eq) return eq.slice(name.length + 1);
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}
function positional(args) {
  const out = [];
  for (let i = 0; i < args.length; i += 1) {
    const a = args[i];
    if (a.startsWith('--')) {
      const name = a.includes('=') ? a.slice(0, a.indexOf('=')) : a;
      if (OPTIONS_WITH_VALUES.has(name) && !a.includes('=')) i += 1;
      continue;
    }
    out.push(a);
  }
  return out;
}
function usage(code = 0) {
  const text = `ProofScript ${VERSION}\n\nSimple project workflow:\n  psc init my-app\n  cd my-app\n  psc check\n  psc build\n  psc run sample\n\nCompiler setup workflow from the ProofScript source ZIP:\n  npm install --offline --no-audit --no-fund\n  npm run setup\n  npm link\n  psc doctor\n  psc clean [--json]\n\nCommands:\n  psc setup\n  psc init [dir] [--name <name>] [--template software|crud] [--force] [--json]\n  psc status [--json]\n  psc check [file.ps] [--json] [--emit-core <out.json>]\n  psc emit-core [file.ps] --out <out.pscore.json> [--json]\n  psc emit-lean <file.ps|core.json|contracts.json> --out <out.lean> [--json]\n  psc certify [file.ps] --core <core.json> --out <cert.json> [--runtime-artifact <out.ts|out.js>] [--ffi-manifest <proofscript.ffi.json>] [--json]\n  psc build-ts [file.ps] [--out <out.ts>] [--runtime local|package|bundled] [--bundle-runtime] [--ffi-manifest <proofscript.ffi.json>] [--json]\n  psc build-js [file.ps] [--out <out.js>] [--ffi-manifest <proofscript.ffi.json>] [--json]\n  psc build [file.ps] [--target ts|js] [--out <file>] [--runtime local|package|bundled] [--bundle-runtime] [--ffi-manifest <proofscript.ffi.json>] [--json]\n  psc compile [file.ps|dir] [--out-dir <dir>] [--suffix .generated] [--runtime local|package|bundled] [--bundle-runtime] [--json]\n  psc run [file.ps] [--call <name>] [--args a,b] [--ffi-manifest <proofscript.ffi.json>] [--json]\n  psc run <name> [--args a,b] [--json]\n  psc target list\n  psc language status [--json]
  psc state-model validate <model.json> [--out <validation.json>] [--json]\n  psc monadic-lowering <contracts.json> --out <lowering.json> [--emit-lean <out.lean>] [--json]\n  psc monadic-vc-request <monadic-lowering.json> --out <request.json> [--emit-lean <request.lean>] [--json]\n  psc monadic-vc-run <monadic-lowering.json> --lean-project <dir> --out <run.json> [--lake-cmd <lake>] [--json]\n  psc monadic-preflight <monadic-lowering.json> --out <preflight.json> --emit-lean <preflight.lean> [--lean-cmd <lean>] [--json]\n  psc doctor\n  psc clean [--json]\n\nDefaults inside a psc init project:\n  input file: src/Main.ps\n  source dir: src\n  output dir: dist\n\nTrust boundary:\n  This CLI is a wrapper over the PSC-1 software-profile path. It does not claim full Lean 4 equivalence or full backend execution-correspondence proof.\n`;
  (code === 0 ? console.log : console.error)(text);
  process.exit(code);
}
function runNodeTs(script, args, { capture = false, cwd = ROOT, timeout } = {}) {
  const result = spawnSync(process.execPath, [...NODE_TS_FLAGS, script, ...args], {
    cwd,
    encoding: 'utf8',
    stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    env: { ...process.env, PROOFSCRIPT_USER_CWD: process.cwd() },
    timeout,
  });
  if (capture) return result;
  process.exit(result.status ?? 1);
}
function runProcess(command, args, label) {
  const result = spawnSync(command, args, { cwd: ROOT, encoding: 'utf8', stdio: 'inherit', shell: false });
  if ((result.status ?? 1) !== 0) {
    console.error(`rejected: ${label} failed with exit ${result.status ?? 1}`);
    process.exit(result.status ?? 1);
  }
}
function runPslive(args, opts) {
  return runNodeTs(path.join(ROOT, 'tools', 'pslive.ts'), args, opts);
}

function ensureLocalWorkspacePackageLinks() {
  const scopeDir = path.join(ROOT, 'node_modules', '@proofscript');
  const packagesDir = path.join(ROOT, 'packages');
  if (!fs.existsSync(packagesDir)) return;
  fs.mkdirSync(scopeDir, { recursive: true });
  for (const entry of fs.readdirSync(packagesDir)) {
    const pkgDir = path.join(packagesDir, entry);
    const pkgJson = path.join(pkgDir, 'package.json');
    if (!fs.existsSync(pkgJson)) continue;
    let pkg;
    try { pkg = JSON.parse(fs.readFileSync(pkgJson, 'utf8')); } catch { continue; }
    if (typeof pkg.name !== 'string' || !pkg.name.startsWith('@proofscript/')) continue;
    const link = path.join(scopeDir, pkg.name.slice('@proofscript/'.length));
    if (fs.existsSync(link)) continue;
    try {
      fs.symlinkSync(pkgDir, link, 'junction');
    } catch {
      // Copy fallback for filesystems without symlink privileges. Keep it shallow
      // enough for npm package use: source/dist/package.json are all checked in.
      fs.cpSync(pkgDir, link, { recursive: true, force: false, errorOnExist: false });
    }
  }
}
function compilerLibs() {
  ensureLocalWorkspacePackageLinks();
  return {
    compiler: require('@proofscript/compiler'),
    environment: require('@proofscript/environment'),
    backendTypescript: require('@proofscript/backend-typescript'),
  };
}
function checkedProgram(file) {
  const { compiler, environment } = compilerLibs();
  const prelude = environment.loadStandardBootstrap().artifact;
  const checked = compiler.checkProjectFile(file, { prelude });
  return { checked, prelude, environment };
}
function userDeclarations(checked, prelude) {
  const offset = Array.isArray(prelude?.declarations) ? prelude.declarations.length : 0;
  return checked.artifact.declarations.slice(offset).map(d => ({ name: d.name, kind: d.kind }));
}
function readFfiManifest(args) {
  const file = opt(args, '--ffi-manifest');
  if (!file) return undefined;
  const resolved = path.resolve(process.cwd(), file);
  if (!fs.existsSync(resolved)) throw new Error(`FFI manifest is missing or unreadable: ${resolved}`);
  const bytes = fs.readFileSync(resolved);
  let parsed;
  try { parsed = JSON.parse(bytes.toString('utf8')); }
  catch (error) { throw new Error(`invalid FFI manifest JSON: ${error instanceof Error ? error.message : String(error)}`); }
  if (parsed?.schema !== 'proofscript.ffi/v1') throw new Error("FFI manifest schema must be 'proofscript.ffi/v1'");
  if (!Array.isArray(parsed.bindings)) throw new Error("FFI manifest bindings must be an array");
  const bindings = parsed.bindings.map((binding, index) => {
    if (!binding || typeof binding !== 'object') throw new Error(`FFI binding #${index} must be an object`);
    const normalized = {
      name: binding.name,
      module: binding.module,
      exportName: binding.exportName,
      trust: binding.trust,
    };
    if (typeof normalized.name !== 'string' || normalized.name.length === 0) throw new Error(`FFI binding #${index} requires name`);
    if (typeof normalized.module !== 'string' || normalized.module.length === 0) throw new Error(`FFI binding '${normalized.name}' requires module`);
    if (typeof normalized.exportName !== 'string' || normalized.exportName.length === 0) throw new Error(`FFI binding '${normalized.name}' requires exportName`);
    if (normalized.trust !== 'trusted-external') throw new Error(`FFI binding '${normalized.name}' must declare trust='trusted-external'`);
    return normalized;
  });
  return {
    schema: parsed.schema,
    resolved,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    bindings,
  };
}

function ffiBuildMetadata(ffi, outDir = process.cwd()) {
  if (!ffi) return undefined;
  return {
    schema: ffi.schema,
    path: path.relative(outDir, ffi.resolved).replace(/\\/g, '/'),
    sha256: ffi.sha256,
    trust: 'trusted-external',
    bindings: ffi.bindings.map(({ name, module, exportName, trust }) => ({ name, module, exportName, trust })),
  };
}

function checkDirect(file, emitCore) {
  const { checked, prelude } = checkedProgram(file);
  if (emitCore) {
    fs.mkdirSync(path.dirname(path.resolve(emitCore)), { recursive: true });
    fs.writeFileSync(path.resolve(emitCore), JSON.stringify(checked.artifact, null, 2) + '\n');
  }
  return {
    status: 'accepted',
    trustLabel: 'PSC-1 trusted-boundary standalone small subset',
    declarations: checked.summary.declarations.length,
    userDeclarations: userDeclarations(checked, prelude),
    semanticSha256: checked.summary.semanticSha256,
    fullLean4Equivalence: false,
    requiresLean4: false,
  };
}
function buildTsDirect(file, out, args) {
  const { checked, prelude } = checkedProgram(file);
  const { backendTypescript } = compilerLibs();
  const mode = runtimeMode(args);
  const ffi = readFfiManifest(args);
  const runtimeFile = runtimeFileName();
  const runtimeImportPath = mode === 'local' ? `./${path.basename(runtimeFile, '.ts')}.js` : undefined;
  const emitted = backendTypescript.emitTypeScriptModule(checked.artifact, {
    sourceFile: file,
    sourceText: fs.readFileSync(file, 'utf8'),
    userDeclarationOffset: prelude.declarations.length,
    runtimeMode: mode,
    runtimeImportPath,
    ffiBindings: ffi?.bindings,
  });
  const resolvedOut = path.resolve(out);
  fs.mkdirSync(path.dirname(resolvedOut), { recursive: true });
  fs.writeFileSync(resolvedOut, emitted.ts);
  let runtimePath;
  let runtimeSha256;
  if (emitted.runtimeTs) {
    runtimePath = path.join(path.dirname(resolvedOut), runtimeFile);
    fs.writeFileSync(runtimePath, emitted.runtimeTs);
    runtimeSha256 = sha256File(runtimePath);
  }
  return { status: 'accepted', target: 'ts', outPath: resolvedOut, outputSha256: sha256File(resolvedOut), runtime: { mode: emitted.runtimeMode, import: emitted.runtimeImport, path: runtimePath, sha256: runtimeSha256 }, ffi: ffiBuildMetadata(ffi, path.dirname(resolvedOut)), emitted: emitted.emitted?.map(x => ({ name: x.name, jsName: x.jsName, arity: x.arity })) ?? [], skipped: emitted.skipped ?? [], semanticSha256: checked.summary.semanticSha256, trustBoundary: { fullLean4Equivalence: false, executionCorrespondenceProof: false, trustedExternalCode: Boolean(ffi) } };
}
function buildJsDirect(file, out, args = []) {
  const { checked, prelude } = checkedProgram(file);
  const { backendTypescript } = compilerLibs();
  const ffi = readFfiManifest(args);
  const emitted = backendTypescript.emitJavaScriptModule(checked.artifact, {
    sourceFile: file,
    sourceText: fs.readFileSync(file, 'utf8'),
    userDeclarationOffset: prelude.declarations.length,
    ffiBindings: ffi?.bindings,
  });
  const resolvedOut = path.resolve(out);
  fs.mkdirSync(path.dirname(resolvedOut), { recursive: true });
  fs.writeFileSync(resolvedOut, emitted.js);
  return { status: 'accepted', target: 'js', outPath: resolvedOut, outputSha256: sha256File(resolvedOut), ffi: ffiBuildMetadata(ffi, path.dirname(resolvedOut)), emitted: emitted.emitted?.map(x => ({ name: x.name, jsName: x.jsName, arity: x.arity })) ?? [], skipped: emitted.skipped ?? [], semanticSha256: checked.summary.semanticSha256, trustBoundary: { fullLean4Equivalence: false, executionCorrespondenceProof: false, trustedExternalCode: Boolean(ffi) } };
}
function parseRunArg(raw) {
  const text = String(raw).trim();
  if (text === 'true') return true;
  if (text === 'false') return false;
  if (/^-?\d+$/.test(text)) return BigInt(text);
  throw new Error(`unsupported PSC-1 run argument ${JSON.stringify(raw)}; use Nat integer or Bool true/false`);
}
function printableRunValue(value) {
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return String(value);
}
async function runDirect(file, call, rawArgs, cliArgs = []) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'proofscript-cli-run-'));
  const out = path.join(tmp, 'out.js');
  const built = buildJsDirect(file, out, cliArgs);
  const mod = await import(pathToFileURL(out).href);
  let value = mod.default?.[call] ?? mod[call];
  if (value === undefined) throw new Error(`export '${call}' not found in small-subset JS output`);
  const callArgs = rawArgs.map(parseRunArg);
  for (const arg of callArgs) value = value(arg);
  return { status: 'accepted', call, args: callArgs.map(printableRunValue), result: printableRunValue(value), ffi: built.ffi, trustBoundary: { fullLean4Equivalence: false, executionCorrespondenceProof: false, trustedExternalCode: Boolean(built.ffi) } };
}
function findProjectRoot(start = process.cwd()) {
  let dir = path.resolve(start);
  while (true) {
    if (fs.existsSync(path.join(dir, 'proofscript.config.json'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return process.cwd();
    dir = parent;
  }
}
function readProjectConfig() {
  const root = findProjectRoot();
  const file = path.join(root, 'proofscript.config.json');
  if (!fs.existsSync(file)) return { projectRoot: process.cwd(), sourceDir: 'src', outDir: 'dist', build: { target: 'ts', outDir: 'dist' }, diagnostics: { sourceLocations: true } };
  try {
    const cfg = JSON.parse(fs.readFileSync(file, 'utf8'));
    const product = validateCliProjectProfile(ROOT, cfg);
    return {
      projectRoot: root,
      proofscriptReference: cfg.proofscriptReference ?? product.proofscriptReference,
      productProfile: cfg.productProfile ?? product.productProfile,
      sourceDir: typeof cfg.sourceDir === 'string' ? cfg.sourceDir : 'src',
      outDir: typeof cfg.outDir === 'string' ? cfg.outDir : (typeof cfg.build?.outDir === 'string' ? cfg.build.outDir : 'dist'),
      entry: typeof cfg.entry === 'string' ? cfg.entry : undefined,
      build: typeof cfg.build === 'object' && cfg.build !== null ? cfg.build : { target: 'ts', outDir: 'dist' },
      diagnostics: typeof cfg.diagnostics === 'object' && cfg.diagnostics !== null ? cfg.diagnostics : { sourceLocations: true },
    };
  } catch (error) {
    throw new Error(`could not read proofscript.config.json: ${error instanceof Error ? error.message : String(error)}`);
  }
}
function defaultEntry() {
  const cfg = readProjectConfig();
  return path.join(cfg.projectRoot, cfg.entry ?? path.join(cfg.sourceDir, 'Main.ps'));
}
function defaultSourceDir() {
  const cfg = readProjectConfig();
  return path.join(cfg.projectRoot, cfg.sourceDir);
}
function defaultOutFor(file, ext) {
  const cfg = readProjectConfig();
  return path.join(cfg.projectRoot, cfg.outDir, `${path.basename(file, '.ps')}.${ext}`);
}
function defaultOutDir() {
  const cfg = readProjectConfig();
  return path.join(cfg.projectRoot, cfg.outDir);
}
function runtimeMode(args) {
  if (has(args, '--bundle-runtime')) return 'bundled';
  const requested = opt(args, '--runtime');
  const cfg = readProjectConfig();
  const configured = typeof cfg.runtime === 'object' && cfg.runtime !== null && typeof cfg.runtime.mode === 'string' ? cfg.runtime.mode : undefined;
  const mode = requested ?? configured ?? 'local';
  if (!['local', 'package', 'bundled'].includes(mode)) {
    console.error(`unsupported: runtime mode must be local, package, or bundled; got '${mode}'`);
    process.exit(2);
  }
  return mode;
}
function runtimeFlags(args) {
  return ['--runtime', runtimeMode(args)];
}
function runtimeFileName() {
  const cfg = readProjectConfig();
  return typeof cfg.runtime === 'object' && cfg.runtime !== null && typeof cfg.runtime.file === 'string' ? cfg.runtime.file : 'proofscript-runtime.ts';
}
function manifestPath(outDir) {
  return path.join(path.resolve(outDir), 'proofscript.manifest.json');
}
function writeCompileManifest(file, payload) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(payload, null, 2) + '\n');
}
function fileLooksGenerated(target) {
  if (!fs.existsSync(target)) return true;
  const text = fs.readFileSync(target, 'utf8').slice(0, 4096);
  return /Generated by ProofScript|Generated TypeScript from ProofScript|ProofScript PSC-1/.test(text);
}
function sourceFiles(input) {
  const resolved = path.resolve(input);
  const stat = fs.statSync(resolved);
  if (stat.isFile()) return resolved.endsWith('.ps') ? [resolved] : [];
  const out = [];
  const walk = (dir) => {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(p);
      else if (ent.isFile() && p.endsWith('.ps')) out.push(p);
    }
  };
  walk(resolved);
  return out.sort();
}
function targetForCompile(source, inputRoot, outDir, suffix) {
  const stem = path.basename(source, '.ps');
  if (outDir) {
    const base = fs.statSync(path.resolve(inputRoot)).isDirectory() ? path.resolve(inputRoot) : path.dirname(path.resolve(inputRoot));
    const relDir = path.relative(base, path.dirname(source));
    return path.join(path.resolve(outDir), relDir, `${stem}${suffix}.ts`);
  }
  return path.join(path.dirname(source), `${stem}${suffix}.ts`);
}

function normalizeProjectName(raw) {
  const cleaned = String(raw ?? 'proofscript-app')
    .trim()
    .replace(/\\/g, '/')
    .split('/')
    .filter(Boolean)
    .pop() ?? 'proofscript-app';
  const slug = cleaned
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'proofscript-app';
}
function writeFileChecked(file, content, force, written) {
  if (fs.existsSync(file) && !force) {
    throw new Error(`refusing to overwrite existing file: ${file}; pass --force to replace generated starter files`);
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  written.push(file);
}
function initCommand(args) {
  const json = has(args, '--json');
  const force = has(args, '--force');
  const template = opt(args, '--template') ?? 'software';
  const dirArg = positional(args)[0] ?? '.';
  if (!['software', 'crud'].includes(template)) {
    const result = { status: 'unsupported', message: `unsupported template '${template}'; supported templates: software, crud` };
    if (json) console.log(JSON.stringify(result, null, 2)); else console.error(`${result.status}: ${result.message}`);
    process.exit(2);
  }
  const targetDir = path.resolve(dirArg);
  const name = normalizeProjectName(opt(args, '--name') ?? (dirArg === '.' ? path.basename(process.cwd()) : dirArg));
  if (fs.existsSync(targetDir)) {
    const entries = fs.readdirSync(targetDir).filter(x => !['.git', '.DS_Store'].includes(x));
    if (entries.length > 0 && !force) {
      const result = { status: 'rejected', message: `target directory is not empty: ${targetDir}; pass --force to write starter files` };
      if (json) console.log(JSON.stringify(result, null, 2)); else console.error(`${result.status}: ${result.message}`);
      process.exit(1);
    }
  }
  fs.mkdirSync(targetDir, { recursive: true });
  const written = [];

  if (template === 'crud') {
    const rootRel = path.relative(targetDir, ROOT).replace(/\\/g, '/') || '.';
    const vendorRel = path.posix.join(rootRel, 'vendor/npm/typescript-5.8.3.tgz');
    writeFileChecked(path.join(targetDir, 'README.md'), `# ProofScript CRUD app example

This example is intentionally more app-like than the small smoke fixtures. It models a tiny in-memory task CRUD domain in the current Software Profile v0 subset:

- domain enums with \`inductive\`;
- immutable records with \`structure\`;
- create/read/update/delete operations as total functions;
- explicit validation with \`Except(String, TaskStore)\`;
- optional lookup with \`Option(Task)\`;
- collection processing with \`List.map\`, \`List.filter\`, \`List.find?\`, and \`List.foldl\`;
- small checked \`by rfl\` smoke theorems over the executable flow.

Build it from the repository after \`npm run setup\` and \`npm link\`:

\`\`\`bash
cd examples/software-profile/crud-app
psc check
psc build
psc compile src --out-dir dist
npm run build:generated-js
npm start
\`\`\`

The generated app imports \`./proofscript-runtime.js\` by default so NodeNext/ESM compilation keeps the runtime and main module side-by-side. Use \`psc build --bundle-runtime\` for a single self-contained TypeScript file.

Trust boundary: this is executable software-profile output, not a proof of full Lean 4 equivalence and not a backend execution-correspondence proof.

## Imperative TypeScript host demo

The pure CRUD domain lives in \`src/Main.ps\`. The optional host demo in
\`host/imperative-demo.ts\` shows ordinary TypeScript application glue calling the
generated ProofScript functions after \`psc build\`.

\`\`\`bash
psc build
npm run build:generated-js
npm run build:host
npm run start:host

# or all together
npm run demo
\`\`\`

The host output is JSON summarizing a create/update/delete flow performed through
the generated ProofScript module.
`, force, written);
    writeFileChecked(path.join(targetDir, '.gitignore'), `node_modules/\ndist/\ndist-js/\ndist-host/\n*.pscore.json\n`, force, written);
    writeFileChecked(path.join(targetDir, 'proofscript.config.json'), JSON.stringify({
      "schemaVersion": 1,
      "proofscriptReference": CURRENT_PROOFSCRIPT_REFERENCE,
      "productProfile": CURRENT_PRODUCT_PROFILE,
      "profile": "proofscript-software-v0",
      "entry": "src/Main.ps",
      "sourceDir": "src",
      "outDir": "dist",
      "build": {
            "target": "ts",
            "outDir": "dist"
      },
      "runtime": {
            "mode": "local",
            "file": "proofscript-runtime.ts"
      },
      "diagnostics": {
            "sourceLocations": true
      },
      "targets": [
            "ts",
            "js"
      ],
      "trustBoundary": {
            "fullLean4Equivalence": false,
            "backendExecutionCorrespondenceProof": false
      }
}, null, 2) + '\n', force, written);
    writeFileChecked(path.join(targetDir, 'tsconfig.generated.json'), JSON.stringify({
      compilerOptions: {
        target: 'ES2022',
        module: 'NodeNext',
        moduleResolution: 'NodeNext',
        rootDir: 'dist',
        outDir: 'dist-js',
        declaration: true,
        strict: false,
        skipLibCheck: true,
        esModuleInterop: true
      },
      include: ['dist/**/*.ts'],
      exclude: ['dist-js', 'node_modules']
    }, null, 2) + '\n', force, written);
    writeFileChecked(path.join(targetDir, 'tsconfig.host.json'), JSON.stringify({
      "compilerOptions": {
            "target": "ES2022",
            "module": "NodeNext",
            "moduleResolution": "NodeNext",
            "rootDir": "host",
            "outDir": "dist-host",
            "strict": true,
            "skipLibCheck": true,
            "esModuleInterop": true
      },
      "include": [
            "host/**/*.ts"
      ],
      "exclude": [
            "node_modules",
            "dist-host"
      ]
}, null, 2) + '\n', force, written);
    writeFileChecked(path.join(targetDir, 'package.json'), JSON.stringify({
      name,
      version: '0.1.0',
      private: true,
      type: 'module',
      scripts: {
        check: 'psc check',
        build: 'psc build',
        'build:ts': 'psc build --target ts',
        'build:js': 'psc build --target js',
        'build:standalone': 'psc build --bundle-runtime',
        'build:package-runtime': 'psc build --runtime package',
        'build:generated-js': 'tsc -p tsconfig.generated.json',
        'build:host': 'tsc -p tsconfig.host.json',
        start: 'node dist-js/Main.js',
        'start:host': 'node dist-host/imperative-demo.js',
        demo: 'npm run build && npm run build:generated-js && npm run build:host && npm run start:host',
        compile: 'psc compile',
        clean: 'psc clean',
        'run:sample': 'psc run smokeSummary',
        doctor: 'psc doctor'
      },
      devDependencies: {
        proofscript: `file:${rootRel}`,
        typescript: `file:${vendorRel}`
      }
    }, null, 2) + '\n', force, written);
    writeFileChecked(path.join(targetDir, 'src', 'Main.ps'), `-- ProofScript Software Profile v0 CRUD-style example.
-- The domain is pure and immutable: create/read/update/delete return new stores.

inductive Priority: Type where {
  | low
  | normal
  | high
}

inductive TaskStatus: Type where {
  | todo
  | doing
  | done
  | archived
}

structure Task {
  id: Nat;
  title: String;
  priority: Priority;
  status: TaskStatus;
  estimate: Nat;
}

structure TaskStore {
  nextId: Nat;
  tasks: List(Task);
}

def emptyStore: TaskStore := {
  { nextId := 1, tasks := List.nil(Task) }
}

function mkTask(id: Nat, title: String, priority: Priority, estimate: Nat): Task := {
  { id := id, title := title, priority := priority, status := TaskStatus.todo, estimate := estimate }
}

function createTask(store: TaskStore, title: String, priority: Priority, estimate: Nat): Except(String, TaskStore) := {
  if estimate == 0 then
    Except.error(String, TaskStore, "estimate must be positive")
  else
    Except.ok(String, TaskStore, {
      store with
        nextId := store.nextId + 1,
        tasks := List.cons(Task, mkTask(store.nextId, title, priority, estimate), store.tasks)
    })
}

function unwrapStore(result: Except(String, TaskStore), fallback: TaskStore): TaskStore := {
  match (result) {
    | Except.error message => fallback
    | Except.ok value => value
  }
}

function sameId(target: Nat, task: Task): Bool := {
  task.id == target
}

function differentId(target: Nat, task: Task): Bool := {
  Bool.not(task.id == target)
}

function findTask(store: TaskStore, id: Nat): Option(Task) := {
  List.find?(Task, sameId(id), store.tasks)
}

function setStatusWhen(target: Nat, status: TaskStatus, task: Task): Task := {
  if task.id == target then { task with status := status } else task
}

function updateStatus(store: TaskStore, id: Nat, status: TaskStatus): TaskStore := {
  { store with tasks := List.map(Task, Task, setStatusWhen(id, status), store.tasks) }
}

function deleteTask(store: TaskStore, id: Nat): TaskStore := {
  { store with tasks := List.filter(Task, differentId(id), store.tasks) }
}

function addEstimate(acc: Nat, task: Task): Nat := {
  acc + task.estimate
}

function totalEstimate(store: TaskStore): Nat := {
  List.foldl(Task, Nat, addEstimate, 0, store.tasks)
}

def createOne: Except(String, TaskStore) := {
  createTask(emptyStore, "Write spec", Priority.high, 3)
}

def afterCreateOne: TaskStore := {
  unwrapStore(createOne, emptyStore)
}

def createTwo: Except(String, TaskStore) := {
  createTask(afterCreateOne, "Review code", Priority.normal, 2)
}

def afterCreateTwo: TaskStore := {
  unwrapStore(createTwo, afterCreateOne)
}

def afterUpdate: TaskStore := {
  updateStatus(afterCreateTwo, 1, TaskStatus.done)
}

def afterDelete: TaskStore := {
  deleteTask(afterUpdate, 2)
}

def foundTaskOne: Bool := {
  Option.isSome(Task, findTask(afterUpdate, 1))
}

def rejectedCreate: Bool := {
  Except.isError(String, TaskStore, createTask(emptyStore, "Bad task", Priority.low, 0))
}

def smokeSummary: Nat := {
  totalEstimate(afterDelete)
}

theorem foundTaskOne_eq: foundTaskOne = true := by rfl
theorem rejectedCreate_eq: rejectedCreate = true := by rfl
theorem smokeSummary_eq: smokeSummary = 3 := by rfl
`, force, written);
    writeFileChecked(path.join(targetDir, 'host', 'imperative-demo.ts'), `// Imperative TypeScript host demo for the generated ProofScript CRUD module.
// This host code is ordinary application glue. The domain logic remains in
// src/Main.ps and is checked by the ProofScript software-profile path.
// Trust boundary: this is executable interop, not the trusted kernel.

import {
  afterUpdate,
  createTask,
  deleteTask,
  findTask,
  totalEstimate,
  updateStatus,
} from "../dist-js/Main.js";
import { __ps } from "../dist-js/proofscript-runtime.js";
import type { PsStructValue, PsValue } from "../dist-js/proofscript-runtime.js";

type Curried4 = (a: PsValue) => (b: PsValue) => (c: PsValue) => (d: PsValue) => PsValue;
type Curried3 = (a: PsValue) => (b: PsValue) => (c: PsValue) => PsValue;
type Curried2 = (a: PsValue) => (b: PsValue) => PsValue;

function asStruct(value: PsValue, label: string): PsStructValue {
  if (
    typeof value !== "object" ||
    value === null ||
    !("__psInductive" in value) ||
    !("__psCtor" in value) ||
    !("fields" in value)
  ) {
    throw new Error(\`\${label} is not a ProofScript structure/inductive value\`);
  }
  return value as PsStructValue;
}

function expectExceptOk(value: PsValue): PsValue {
  const except = asStruct(value, "Except result");
  if (except.__psInductive !== "Except") throw new Error("expected Except result");
  if (except.__psCtor === 1) return except.fields[0];
  throw new Error(\`ProofScript createTask rejected: \${String(except.fields[0])}\`);
}

function isOptionSome(value: PsValue): boolean {
  const option = asStruct(value, "Option result");
  if (option.__psInductive !== "Option") throw new Error("expected Option result");
  return option.__psCtor === 1;
}

function listToArray(value: PsValue): PsStructValue[] {
  const out: PsStructValue[] = [];
  let cursor = asStruct(value, "List");
  for (let depth = 0; depth < 1000; depth += 1) {
    if (cursor.__psInductive !== "List") throw new Error("expected List value");
    if (cursor.__psCtor === 0) return out;
    if (cursor.__psCtor !== 1) throw new Error(\`unknown List constructor \${cursor.__psCtor}\`);
    out.push(asStruct(cursor.fields[0], "Task"));
    cursor = asStruct(cursor.fields[1], "List.tail");
  }
  throw new Error("bounded list traversal exceeded");
}

function natToString(value: PsValue): string {
  if (typeof value !== "bigint") throw new Error(\`expected Nat/BigInt, got \${typeof value}\`);
  return value.toString();
}

const priorityNames = ["low", "normal", "high"] as const;
const statusNames = ["todo", "doing", "done", "archived"] as const;

function enumName(names: readonly string[], value: PsValue): string {
  const tagged = asStruct(value, "enum value");
  return names[tagged.__psCtor] ?? \`unknown(\${tagged.__psCtor})\`;
}

function taskToObject(task: PsStructValue) {
  if (task.__psInductive !== "Task") throw new Error("expected Task");
  return {
    id: natToString(task.fields[0]),
    title: String(task.fields[1]),
    priority: enumName(priorityNames, task.fields[2]),
    status: enumName(statusNames, task.fields[3]),
    estimate: natToString(task.fields[4]),
  };
}

function storeNextId(store: PsStructValue): string {
  if (store.__psInductive !== "TaskStore") throw new Error("expected TaskStore");
  return natToString(store.fields[0]);
}

function storeTasks(store: PsStructValue) {
  if (store.__psInductive !== "TaskStore") throw new Error("expected TaskStore");
  return listToArray(store.fields[1]).map(taskToObject);
}

const create = createTask as Curried4;
const update = updateStatus as Curried3;
const remove = deleteTask as Curried2;
const lookup = findTask as Curried2;
const total = totalEstimate as (store: PsValue) => PsValue;

const high = __ps.Struct_mk("Priority", 2, []);
const doing = __ps.Struct_mk("TaskStatus", 1, []);

let store = expectExceptOk(create(afterUpdate)("Ship demo")(high)(8n));
store = update(store)(3n)(doing);
store = remove(store)(2n);

const storeValue = asStruct(store, "TaskStore");
const tasks = storeTasks(storeValue);
const summary = {
  nextId: storeNextId(storeValue),
  totalEstimate: natToString(total(store)),
  foundTask3: isOptionSome(lookup(store)(3n)),
  taskTitles: tasks.map(task => task.title),
  tasks,
};

console.log(JSON.stringify(summary, null, 2));
`, force, written);
    const result = {
      status: 'accepted',
      command: 'init',
      template,
      profile: 'proofscript-software-v0',
      directory: targetDir,
      name,
      files: written.map(f => path.relative(targetDir, f).replace(/\\/g, '/')),
      next: [
        `cd ${path.relative(process.cwd(), targetDir) || '.'}`,
        'psc check',
        'psc build',
        'npm run build:generated-js',
        'npm run build:host',
        'npm run start:host',
        'npm run demo'
      ],
      buildSystem: { defaultTarget: 'ts', defaultOutDir: 'dist', hostOutDir: 'dist-host' },
      trustBoundary: 'PSC-1 software profile executable demo; no full Lean 4 equivalence or backend execution-correspondence proof'
    };
    if (json) console.log(JSON.stringify(result, null, 2));
    else {
      console.log(`✓ initialized ${name} CRUD demo at ${targetDir}`);
      console.log('Next:');
      for (const step of result.next) console.log(`  ${step}`);
    }
    return;
  }
  writeFileChecked(path.join(targetDir, 'README.md'), `# ${name}\n\nA small ProofScript Software Profile project.\n\n## Commands\n\n\`\`\`bash\npsc check\npsc build\npsc run sample\n\n# Optional explicit commands\npsc build-ts\npsc build-js\npsc compile\n\`\`\`\n\nTrust boundary: this starter targets the PSC-1 software profile. It does not claim full Lean 4 equivalence or backend execution-correspondence proof.\n`, force, written);
  writeFileChecked(path.join(targetDir, '.gitignore'), `node_modules/\ndist/\ndist/\n*.pscore.json\n`, force, written);
  writeFileChecked(path.join(targetDir, 'proofscript.config.json'), JSON.stringify({
    schemaVersion: 1,
    proofscriptReference: CURRENT_PROOFSCRIPT_REFERENCE,
    productProfile: CURRENT_PRODUCT_PROFILE,
    profile: 'proofscript-software-v0',
    entry: 'src/Main.ps',
    sourceDir: 'src',
    outDir: 'dist',
    build: {
      target: 'ts',
      outDir: 'dist'
    },
    runtime: {
      mode: 'local',
      file: 'proofscript-runtime.ts'
    },
    diagnostics: {
      sourceLocations: true
    },
    targets: ['ts', 'js'],
    trustBoundary: {
      fullLean4Equivalence: false,
      backendExecutionCorrespondenceProof: false
    }
  }, null, 2) + '\n', force, written);
  writeFileChecked(path.join(targetDir, 'tsconfig.generated.json'), JSON.stringify({
    compilerOptions: {
      target: 'ES2022',
      module: 'NodeNext',
      moduleResolution: 'NodeNext',
      rootDir: 'dist',
      outDir: 'dist-js',
      declaration: true,
      strict: false,
      skipLibCheck: true,
      esModuleInterop: true
    },
    include: ['dist/**/*.ts'],
    exclude: ['dist-js', 'node_modules']
  }, null, 2) + '\n', force, written);
  writeFileChecked(path.join(targetDir, 'package.json'), JSON.stringify({
    name,
    version: '0.1.0',
    private: true,
    type: 'module',
    scripts: {
      check: 'psc check',
      build: 'psc build',
      'build:ts': 'psc build --target ts',
      'build:js': 'psc build --target js',
      'build:standalone': 'psc build --bundle-runtime',
      'build:package-runtime': 'psc build --runtime package',
      'build:generated-js': 'tsc -p tsconfig.generated.json',
      start: 'node dist-js/Main.js',
      compile: 'psc compile',
      clean: 'psc clean',
      'run:sample': 'psc run sample',
      doctor: 'psc doctor'
    },
    devDependencies: {
      proofscript: 'file:..',
      typescript: 'file:../vendor/npm/typescript-5.8.3.tgz'
    }
  }, null, 2) + '\n', force, written);
  writeFileChecked(path.join(targetDir, 'src', 'Main.ps'), `-- ProofScript Software Profile v0 starter.\n-- This example stays in the small checked subset: Nat, Bool, if, def, theorem.\n\nfunction loyaltyPrice(total: Nat, loyal: Bool): Nat := {\n  if loyal then total - 5 else total\n}\n\ndef sample: Nat := {\n  loyaltyPrice(100, true)\n}\n\ntheorem sample_eq: sample = 95 := by rfl\n`, force, written);
  const result = {
    status: 'accepted',
    command: 'init',
    template,
    profile: 'proofscript-software-v0',
    directory: targetDir,
    name,
    files: written.map(f => path.relative(targetDir, f).replace(/\\/g, '/')),
    next: [
      `cd ${path.relative(process.cwd(), targetDir) || '.'}`,
      'psc check',
      'psc build',
      'psc run sample'
    ],
    buildSystem: { defaultTarget: 'ts', defaultOutDir: 'dist' },
    trustBoundary: 'PSC-1 software profile; no full Lean 4 equivalence claim'
  };
  if (json) console.log(JSON.stringify(result, null, 2));
  else {
    console.log(`✓ initialized ${name} at ${targetDir}`);
    console.log('Next:');
    for (const step of result.next) console.log(`  ${step}`);
  }
}

function setupCommand(args) {
  console.log('ProofScript setup');
  runProcess(process.execPath, [...NODE_TS_FLAGS, path.join(ROOT, 'tools', 'setup-local-workspaces.cts')], 'workspace link/copy setup');
  const tscBin = path.join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc');
  const globalTsc = spawnSync('bash', ['-lc', 'command -v tsc'], { encoding: 'utf8' });
  const globalTscBin = globalTsc.status === 0 ? globalTsc.stdout.trim().split('\n')[0] : '';
  if (fs.existsSync(tscBin)) {
    const tscArgs = [tscBin, '-b', ...args.filter(a => a !== '--json')];
    runProcess(process.execPath, tscArgs, 'tsc -b');
  } else if (globalTscBin) {
    const tscArgs = ['-b', ...args.filter(a => a !== '--json')];
    runProcess(globalTscBin, tscArgs, 'tsc -b');
  } else {
    console.error('rejected: TypeScript is not installed. Run: npm install --offline --no-audit --no-fund or provide tsc on PATH');
    process.exit(1);
  }
  // If a locked-down Windows machine used copy fallback before the build, the
  // copied node_modules/@proofscript/* packages must be refreshed after dist/
  // exists. Junction/symlink setups are idempotent here.
  runProcess(process.execPath, [...NODE_TS_FLAGS, path.join(ROOT, 'tools', 'setup-local-workspaces.cts')], 'post-build workspace link/copy refresh');
  runProcess(process.execPath, [...NODE_TS_FLAGS, path.join(ROOT, 'tools', 'copy-static-assets.ts')], 'static asset copy');
  console.log('PROOFSCRIPT_SETUP=PASS');
}
function checkCommand(args) {
  const pos = positional(args);
  const file = pos[0] ? path.resolve(process.cwd(), pos[0]) : defaultEntry();
  const json = has(args, '--json');
  const emitCore = opt(args, '--emit-core');
  try {
    const parsed = checkDirect(file, emitCore);
    parsed.command = 'check';
    if (emitCore) parsed.emitCore = path.resolve(emitCore);
    if (json) console.log(JSON.stringify(parsed, null, 2));
    else console.log(`accepted ${parsed.userDeclarations.length} user declaration(s); fullLean4Equivalence=false`);
  } catch (error) {
    const result = { status: 'rejected', command: 'check', message: error instanceof Error ? error.message : String(error), fullLean4Equivalence: false };
    jsonOut(result, json);
    process.exit(1);
  }
}
function buildTsCommand(args) {
  const pos = positional(args);
  const file = pos[0] ? path.resolve(process.cwd(), pos[0]) : defaultEntry();
  const out = opt(args, '--out') ?? defaultOutFor(file, 'ts');
  const result = buildTsDirect(file, out, args);
  jsonOut(result, has(args, '--json'));
}
function buildJsCommand(args) {
  const pos = positional(args);
  const file = pos[0] ? path.resolve(process.cwd(), pos[0]) : defaultEntry();
  const out = opt(args, '--out') ?? defaultOutFor(file, 'js');
  const result = buildJsDirect(file, out, args);
  jsonOut(result, has(args, '--json'));
}
function buildCommand(args) {
  const pos = positional(args);
  const target = (opt(args, '--target') || 'ts').toLowerCase();
  if (target !== 'ts' && target !== 'js') {
    console.error(`unsupported: psc build supports --target ts|js in the software profile, got '${target}'`);
    process.exit(2);
  }
  const file = pos[0] ? path.resolve(process.cwd(), pos[0]) : defaultEntry();
  const out = opt(args, '--out') || defaultOutFor(file, target === 'js' ? 'js' : 'ts');
  const result = target === 'js' ? buildJsDirect(file, out, args) : buildTsDirect(file, out, args);
  jsonOut(result, has(args, '--json'));
}

function cleanCommand(args) {
  const json = has(args, '--json');
  const cfg = readProjectConfig();
  const outDir = path.resolve(cfg.projectRoot, cfg.outDir);
  const rel = path.relative(cfg.projectRoot, outDir);
  if (rel.startsWith('..') || path.isAbsolute(rel) || rel === '') {
    const result = { status: 'rejected', message: `refusing to clean unsafe output directory: ${outDir}` };
    if (json) console.log(JSON.stringify(result, null, 2)); else console.error(`${result.status}: ${result.message}`);
    process.exit(1);
  }
  if (!['dist', 'generated'].includes(path.basename(outDir)) && !has(args, '--force')) {
    const result = { status: 'rejected', message: `refusing to clean non-standard output directory '${cfg.outDir}'; pass --force to confirm` };
    if (json) console.log(JSON.stringify(result, null, 2)); else console.error(`${result.status}: ${result.message}`);
    process.exit(1);
  }
  fs.rmSync(outDir, { recursive: true, force: true });
  const result = { status: 'accepted', command: 'clean', outDir };
  if (json) console.log(JSON.stringify(result, null, 2)); else console.log(`✓ cleaned ${path.relative(process.cwd(), outDir) || outDir}`);
}
async function runCommand(args) {
  const pos = positional(args);
  let file;
  let call = opt(args, '--call');
  if (pos[0] && pos[0].endsWith('.ps')) {
    file = path.resolve(process.cwd(), pos[0]);
    call = call ?? pos[1];
  } else {
    file = defaultEntry();
    call = call ?? pos[0];
  }
  if (!call) usage(2);
  const callArgs = opt(args, '--args')?.split(',').filter(x => x.length > 0) ?? [];
  try {
    const result = await runDirect(file, call, callArgs, args);
    jsonOut(result, has(args, '--json'));
  } catch (error) {
    const result = { status: 'rejected', command: 'run', message: error instanceof Error ? error.message : String(error) };
    jsonOut(result, has(args, '--json'));
    process.exit(1);
  }
}
function workspacePackageNames() {
  const dir = path.join(ROOT, 'packages');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter(e => e.isDirectory())
    .map(e => {
      const pj = path.join(dir, e.name, 'package.json');
      if (!fs.existsSync(pj)) return undefined;
      try {
        const parsed = JSON.parse(fs.readFileSync(pj, 'utf8'));
        return typeof parsed.name === 'string' && parsed.name.startsWith('@proofscript/') ? parsed.name : undefined;
      } catch { return undefined; }
    })
    .filter(Boolean)
    .sort();
}
function workspaceLinkStatus() {
  const names = workspacePackageNames();
  const scope = path.join(ROOT, 'node_modules', '@proofscript');
  const entries = [];
  for (const name of names) {
    const short = name.slice('@proofscript/'.length);
    const target = path.join(scope, short);
    let state = 'missing';
    try {
      const st = fs.lstatSync(target);
      if (st.isSymbolicLink()) state = process.platform === 'win32' ? 'junction-or-symlink' : 'symlink';
      else if (st.isDirectory()) state = 'copy-fallback';
      else state = 'unexpected-file';
    } catch (error) {
      if (!error || error.code !== 'ENOENT') state = 'error';
    }
    entries.push({ name, state });
  }
  return { expected: names.length, installed: entries.filter(e => e.state !== 'missing' && e.state !== 'error' && e.state !== 'unexpected-file').length, entries };
}
function packageDistStatus() {
  const required = ['frontend', 'backend-typescript'];
  const packages = required.map(name => {
    const file = path.join(ROOT, 'packages', name, 'dist', 'index.js');
    return { name: `@proofscript/${name}`, file: path.relative(ROOT, file).split(path.sep).join('/'), exists: fs.existsSync(file) };
  });
  return { required: packages, ok: packages.every(p => p.exists) };
}
function pscCheckCanRun() {
  const tmp = fs.mkdtempSync(path.join(process.env.TMPDIR || '/tmp', 'proofscript-doctor-check-'));
  const sample = path.join(tmp, 'DoctorSmoke.ps');
  try {
    fs.writeFileSync(sample, 'def doctorSmoke: Nat := { 1 }\n');
    const result = runPslive(['check', sample, '--json'], { capture: true, timeout: 30_000 });
    return {
      ok: result.status === 0,
      status: result.status ?? (result.signal ? `signal:${result.signal}` : 1),
      sample: 'temporary-smoke',
      stderr: result.status === 0 ? undefined : (result.stderr || result.stdout || '').trim().slice(0, 500),
    };
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}
function doctor(args = []) {
  const json = has(args, '--json');
  const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const buildScript = packageJson.scripts?.build ?? '';
  const workspaces = workspaceLinkStatus();
  const dist = packageDistStatus();
  const check = pscCheckCanRun();
  const result = {
    status: dist.ok && check.ok ? 'accepted' : 'needs_setup',
    version: VERSION,
    node: process.version,
    platform: process.platform,
    powershellCompatibleScripts: !buildScript.includes('export NODE_OPTIONS'),
    windowsWorkspaceLinks: 'junction-or-copy-fallback',
    simpleProjectCommands: true,
    buildSystem: { defaultOutDir: readProjectConfig().outDir, defaultTarget: readProjectConfig().build?.target ?? 'ts', runtime: { mode: runtimeMode([]), file: runtimeFileName(), bundleFlag: '--bundle-runtime' } },
    projectConfig: { projectRoot: readProjectConfig().projectRoot, sourceDir: readProjectConfig().sourceDir, entry: readProjectConfig().entry ?? path.join(readProjectConfig().sourceDir, 'Main.ps'), outDir: readProjectConfig().outDir },
    diagnostics: { sourceLocations: readProjectConfig().diagnostics?.sourceLocations !== false },
    packageDist: dist,
    localWorkspacePackages: workspaces,
    pscCheckCanRun: check,
    frontend: 'psc-software-profile',
    requiresLean4: false,
    fullLean4Equivalence: false,
    sameTheoryAsFullLean4: false,
  };
  if (json) { console.log(JSON.stringify(result, null, 2)); return; }
  console.log('ProofScript software CLI doctor');
  console.log(`version=${result.version}`);
  console.log(`node=${result.node}`);
  console.log(`platform=${result.platform}`);
  console.log(`status=${result.status}`);
  console.log(`powershellCompatibleScripts=${result.powershellCompatibleScripts ? 'yes' : 'no'}`);
  console.log(`windowsWorkspaceLinks=${result.windowsWorkspaceLinks}`);
  console.log(`localWorkspacePackages=${workspaces.installed}/${workspaces.expected}`);
  console.log(`packageDist=${dist.ok ? 'yes' : 'no'}`);
  console.log(`pscCheckCanRun=${check.ok ? 'yes' : 'no'}`);
  console.log('simpleProjectCommands=yes');
  console.log('frontend=psc-software-profile');
  console.log('requiresLean4=false');
  console.log('fullLean4Equivalence=false');
  console.log('sameTheoryAsFullLean4=false');
}

function readJsonFile(relativePath, fallback = undefined) {
  const file = path.join(ROOT, relativePath);
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    if (fallback !== undefined) return fallback;
    throw new Error(`could not read ${relativePath}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function kernelFeatureCounts(kernelStatus) {
  const features = Array.isArray(kernelStatus?.features) ? kernelStatus.features : [];
  const counts = { implemented: 0, partially_implemented: 0, unsupported: 0, blocked: 0, needs_validation: 0, other: 0 };
  for (const feature of features) {
    const status = feature?.status;
    if (Object.prototype.hasOwnProperty.call(counts, status)) counts[status] += 1;
    else counts.other += 1;
  }
  return { total: features.length, ...counts };
}
function detectResourceBoundsEvidence() {
  const file = path.join(ROOT, 'docs', 'KERNEL_COVERAGE.md');
  if (!fs.existsSync(file)) return { present: false };
  const text = fs.readFileSync(file, 'utf8');
  const marker = 'KERNEL-resource-bounds0 / Core v68 evidence';
  return {
    present: text.includes(marker),
    marker,
    auditCompleteLinePresent: /Audit:\s*\*\*41 implemented \/ 0 partially implemented \/ 0 unsupported\*\*/.test(text),
  };
}
function kernelStatusCommand(args) {
  const json = has(args, '--json');
  const packageJson = readJsonFile('package.json', {});
  const kernelStatus = readJsonFile('kernel-status.json', {});
  const implementationStatus = readJsonFile('implementation-status.json', {});
  const versions = readJsonFile('versions.json', {});
  const counts = kernelFeatureCounts(kernelStatus);
  const allChecklistRowsImplemented = counts.total > 0 && counts.implemented === counts.total && counts.partially_implemented === 0 && counts.unsupported === 0 && counts.blocked === 0 && counts.needs_validation === 0 && counts.other === 0;
  const claims = implementationStatus.claims ?? {};
  const result = {
    status: 'accepted',
    command: 'kernel status',
    sourcePackageVersion: packageJson.version ?? VERSION,
    proofscriptReference: kernelStatus.proofscriptReference ?? versions.proofscriptLanguageReference ?? implementationStatus.reference,
    leanSemanticBaseline: kernelStatus.leanSemanticBaseline ?? versions.leanSemanticBaseline ?? implementationStatus.semanticBaseline,
    leanReleaseCommit: kernelStatus.leanReleaseCommit ?? versions.leanReleaseCommit,
    auditBaseline: kernelStatus.auditBaseline ?? {
      implementationProfile: versions.implementationProfile,
      coreFormat: versions.kernelArtifactFormat,
      certificateFormat: versions.certificateFormat,
    },
    defaultKernel: versions.defaultKernel,
    defaultKernelCoreFormat: versions.defaultKernelCoreFormat,
    resourceSecurityProfile: versions.resourceSecurityProfile,
    resourceSecurityStatus: versions.resourceSecurityStatus,
    checklist: counts,
    auditedK3TBChecklistComplete: Boolean(claims.auditedK3TBChecklistComplete) || allChecklistRowsImplemented,
    fullKernelCompleteField: Boolean(kernelStatus.fullKernelComplete || claims.fullKernelComplete),
    fullKernelCompleteFieldIsDeprecatedInThisLine: versions.metadataClaimSeparation ? true : undefined,
    fullLean4KernelComplete: Boolean(claims.fullLean4KernelComplete),
    fullLean4Equivalence: false,
    sameTheoryAsFullLean4: Boolean(claims.sameTheoryAsLean4),
    fullyFormalK3: Boolean(claims.fullyFormalK3 ?? versions.fullyFormalK3),
    formalLean4EquivalenceProvenObligations: Number(claims.formalLean4EquivalenceProvenObligations ?? versions.formalLean4EquivalenceProvenObligations ?? 0),
    standaloneRequiresLean: false,
    evidence: {
      sourceDifferentialAccepted: versions.differentialAcceptedCases,
      kernelOnlyDifferentialAccepted: versions.kernelOnlyDifferentialAcceptedCases,
      resourceBoundsCoverage: detectResourceBoundsEvidence(),
    },
    nextRecommendedWork: 'work above the trusted kernel boundary unless a new trusted-semantic defect is found',
    trustBoundary: 'K3-TB audited checklist completion is not a proof of full Lean 4 language/kernel equivalence',
  };
  if (json) { console.log(JSON.stringify(result, null, 2)); return; }
  console.log('ProofScript kernel status');
  console.log(`sourcePackageVersion=${result.sourcePackageVersion}`);
  console.log(`leanSemanticBaseline=${result.leanSemanticBaseline}`);
  console.log(`leanReleaseCommit=${result.leanReleaseCommit}`);
  console.log(`implementationProfile=${result.auditBaseline?.implementationProfile ?? 'unknown'}`);
  console.log(`coreFormat=${result.auditBaseline?.coreFormat ?? 'unknown'}`);
  console.log(`certificateFormat=${result.auditBaseline?.certificateFormat ?? 'unknown'}`);
  console.log(`defaultKernel=${result.defaultKernel ?? 'unknown'}`);
  console.log(`defaultKernelCoreFormat=${result.defaultKernelCoreFormat ?? 'unknown'}`);
  console.log(`resourceSecurityProfile=${result.resourceSecurityProfile ?? 'unknown'}`);
  console.log(`resourceSecurityStatus=${result.resourceSecurityStatus ?? 'unknown'}`);
  console.log(`checklist=${counts.implemented}/${counts.total} implemented;${counts.partially_implemented} partial;${counts.unsupported} unsupported;${counts.blocked} blocked;${counts.needs_validation} needs_validation`);
  console.log(`auditedK3TBChecklistComplete=${result.auditedK3TBChecklistComplete ? 'true' : 'false'}`);
  console.log(`fullKernelCompleteField=${result.fullKernelCompleteField ? 'true' : 'false'}`);
  if (result.fullKernelCompleteFieldIsDeprecatedInThisLine) console.log('fullKernelCompleteFieldIsDeprecatedInThisLine=true');
  console.log(`fullLean4KernelComplete=${result.fullLean4KernelComplete ? 'true' : 'false'}`);
  console.log(`fullLean4Equivalence=${result.fullLean4Equivalence ? 'true' : 'false'}`);
  console.log(`sameTheoryAsFullLean4=${result.sameTheoryAsFullLean4 ? 'true' : 'false'}`);
  console.log(`fullyFormalK3=${result.fullyFormalK3 ? 'true' : 'false'}`);
  console.log(`formalLean4EquivalenceProvenObligations=${result.formalLean4EquivalenceProvenObligations}`);
  console.log(`standaloneRequiresLean=${result.standaloneRequiresLean ? 'true' : 'false'}`);
  console.log(`nextRecommendedWork=${result.nextRecommendedWork}`);
  console.log(`trustBoundary=${result.trustBoundary}`);
}

function sha256File(file) {
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}
function sha256Text(text) {
  return createHash('sha256').update(text).digest('hex');
}
function readTextFile(file) { return fs.readFileSync(file, 'utf8'); }
function writeJsonFile(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
}
function jsonOut(value, json) {
  if (json) console.log(JSON.stringify(value, null, 2));
  else console.log(value.status === 'accepted' ? `accepted: ${value.command ?? value.status}` : `${value.status}: ${value.message ?? ''}`);
}
function packageInfo() { return JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')); }
function npmReadinessCommand(args) {
  const json = has(args, '--json');
  const pkg = packageInfo();
  const requiredFiles = ['bin','tools','packages','templates','config','README.md','LICENSE','kernel-status.json'];
  const missingFiles = requiredFiles.filter(x => !Array.isArray(pkg.files) || !pkg.files.includes(x));
  const missingPaths = requiredFiles.filter(x => !fs.existsSync(path.join(ROOT, x)));
  const result = {
    status: pkg.name === 'proofscript' && pkg.private === false && pkg.bin?.psc === './bin/psc.mjs' && missingFiles.length === 0 && missingPaths.length === 0 ? 'accepted' : 'rejected',
    command: 'npm-readiness',
    package: { name: pkg.name, version: pkg.version, private: pkg.private, files: pkg.files },
    bin: pkg.bin ?? {},
    missingFilesEntries: missingFiles,
    missingPackagePaths: missingPaths,
    installShape: 'npm install proofscript -> npx psc',
    trustBoundary: { fullLean4Equivalence: false, fullyFormalK3: false, requiresLeanForBasicPscCommands: false },
  };
  jsonOut(result, json);
  if (result.status !== 'accepted') process.exit(1);
}

function readJsonPath(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function emitLeanFromCoreArtifact(raw) {
  try {
    const { decodeArtifact } = require(path.join(ROOT, 'packages', 'kernel-codec', 'dist', 'index.js'));
    const { emitLeanArtifact } = require(path.join(ROOT, 'packages', 'lean-export', 'dist', 'index.js'));
    return emitLeanArtifact(decodeArtifact(raw));
  } catch (error) {
    const decls = Array.isArray(raw?.declarations) ? raw.declarations : [];
    const lines = [
      '/- Generated by ProofScript.',
      '   Structural Lean export fallback: package-local @proofscript workspace modules were unavailable.',
      '   This file records declaration names/kinds for inspection; it is not a semantic Lean replay proof. -/',
      '',
    ];
    for (const d of decls) {
      const kind = typeof d?.kind === 'string' ? d.kind : 'declaration';
      const name = typeof d?.name === 'string' ? d.name : '<anonymous>';
      lines.push(`-- ${kind} ${name}`);
    }
    return lines.join('\n') + '\n';
  }
}
function emitCoreCommand(args) {
  const json = has(args, '--json');
  const pos = positional(args);
  const file = pos[0] ? path.resolve(process.cwd(), pos[0]) : defaultEntry();
  const out = opt(args, '--out') ?? path.join(defaultOutDir(), `${path.basename(file, '.ps')}.pscore.json`);
  try {
    const parsed = checkDirect(file, out);
    const response = {
      status: 'accepted',
      command: 'emit-core',
      source: file,
      out: path.resolve(out),
      sourceSha256: sha256File(file),
      coreSha256: sha256File(out),
      semanticSha256: parsed.semanticSha256,
      trustBoundary: { semanticPSKernelReplay: true, fullLean4Equivalence: false, executionCorrespondenceProof: false },
    };
    jsonOut(response, json);
  } catch (error) {
    const result = { status: 'rejected', command: 'emit-core', message: error instanceof Error ? error.message : String(error) };
    jsonOut(result, json);
    process.exit(1);
  }
}
function emitLeanCommand(args) {
  const json = has(args, '--json');
  const pos = positional(args);
  const input = pos[0] ? path.resolve(process.cwd(), pos[0]) : defaultEntry();
  const out = opt(args, '--out');
  if (!out) usage(2);
  const resolvedOut = path.resolve(process.cwd(), out ?? input.replace(/\.contracts\.json$/i, '.obligations.json').replace(/\.ps$/i, '.obligations.json'));
  let leanText;
  let coreSha256;
  let source;
  if (input.endsWith('.ps')) {
    const tmpCore = path.join(fs.mkdtempSync(path.join(process.cwd(), '.proofscript-emit-lean-')), `${path.basename(input, '.ps')}.pscore.json`);
    const r = runPslive(['check', input, '--emit-core', tmpCore, '--json'], { capture: true });
    if ((r.status ?? 1) !== 0) { process.stdout.write(r.stdout ?? ''); process.stderr.write(r.stderr ?? ''); process.exit(r.status ?? 1); }
    source = input;
    coreSha256 = sha256File(tmpCore);
    const raw = readJsonPath(tmpCore);
    leanText = emitLeanFromCoreArtifact(raw);
  } else {
    const raw = readJsonPath(input);
    if (raw.schema === 'proofscript.contracts.v0' || raw.schema === 'proofscript.contracts.v1') {
      if (!Array.isArray(raw.functions) || raw.functions.length !== 1) throw new Error('unsupported: Lean emission for contract artifacts expects one function in this alpha');
      const fn = raw.functions[0];
      leanText = (raw.contractKind === 'monadic-stateful' || fn.contractKind === 'monadic-stateful')
        ? leanForMonadicContract({ name: fn.name, params: fn.params ?? [], returnType: fn.returnType, requirements: fn.requirements ?? [], ensures: fn.ensures ?? [], oldSnapshots: fn.oldSnapshots ?? raw.oldSnapshots ?? [], operations: fn.operations ?? raw.operations ?? [], obligations: fn.obligations ?? raw.obligations ?? [], body: fn.body, sourcePath: input, stateModel: raw.stateModel })
        : leanForContract({ name: fn.name, params: fn.params ?? [], returnType: fn.returnType, requirements: fn.requirements ?? [], ensures: fn.ensures ?? [], ghosts: fn.ghosts ?? raw.ghosts ?? [], assertions: fn.assertions ?? raw.assertions ?? [], oldSnapshots: fn.oldSnapshots ?? raw.oldSnapshots ?? [], loops: fn.loops ?? raw.loops ?? [], obligations: fn.obligations ?? raw.obligations ?? [], body: fn.body, sourcePath: input });
    } else {
      leanText = emitLeanFromCoreArtifact(raw);
    }
    coreSha256 = sha256File(input);
  }
  fs.mkdirSync(path.dirname(resolvedOut), { recursive: true });
  fs.writeFileSync(resolvedOut, leanText);
  jsonOut({ status: 'accepted', command: 'emit-lean', input, source, out: resolvedOut, inputSha256: coreSha256, outputSha256: sha256File(resolvedOut), trustBoundary: { oracleArtifact: true, fullLean4Equivalence: false } }, json);
}
function runtimeArtifactBinding(file, certificateOut) {
  if (!file) return undefined;
  const resolved = path.resolve(process.cwd(), file);
  if (!fs.existsSync(resolved)) throw new Error(`runtime artifact is missing or unreadable: ${resolved}`);
  const ext = path.extname(resolved).toLowerCase();
  const target = ext === '.ts' ? 'ts' : ext === '.js' ? 'js' : null;
  if (!target) throw new Error(`runtime artifact must be .ts or .js, got '${ext || '<none>'}'`);
  return {
    target,
    path: path.relative(path.dirname(certificateOut), resolved).replace(/\\/g, '/'),
    sha256: sha256File(resolved),
  };
}

function certificateRuntimeMetadata(args, certificateOut) {
  const base = runtimeCertificateMetadata(ROOT);
  const runtimeArtifact = runtimeArtifactBinding(opt(args, '--runtime-artifact'), certificateOut);
  return {
    ...base,
    ...(runtimeArtifact ? { runtimeArtifact } : {}),
    correspondence: {
      ...base.correspondence,
      backendArtifactBound: Boolean(runtimeArtifact),
    },
  };
}

function certifyCommand(args) {
  const json = has(args, '--json');
  const pos = positional(args);
  const source = pos[0] ? path.resolve(process.cwd(), pos[0]) : defaultEntry();
  const core = opt(args, '--core');
  const out = opt(args, '--out');
  if (!core || !out) usage(2);
  const resolvedCore = path.resolve(process.cwd(), core);
  const resolvedOut = path.resolve(process.cwd(), out ?? input.replace(/\.contracts\.json$/i, '.obligations.json').replace(/\.ps$/i, '.obligations.json'));
  if (!fs.existsSync(resolvedCore)) {
    const r = runPslive(['check', source, '--emit-core', resolvedCore, '--json'], { capture: true });
    if ((r.status ?? 1) !== 0) { process.stdout.write(r.stdout ?? ''); process.stderr.write(r.stderr ?? ''); process.exit(r.status ?? 1); }
  }
  const artifact = readJsonPath(resolvedCore);
  const declarations = Array.isArray(artifact.declarations) ? artifact.declarations.map(d => ({ name: d.name, kind: d.kind })) : [];
  const cert = {
    format: 'proofscript-certificate',
    version: 4,
    checkpoint: 'KA-146 Lean-checkable monadic skeleton preflight',
    packageVersion: VERSION,
    ...certificateMetadataForCore(ROOT, artifact),
    ...certificateRuntimeMetadata(args, resolvedOut),
    source: { path: path.relative(path.dirname(resolvedOut), source).replace(/\\/g, '/'), sha256: sha256File(source) },
    core: { path: path.relative(path.dirname(resolvedOut), resolvedCore).replace(/\\/g, '/'), sha256: sha256File(resolvedCore), declarations },
    checker: { command: 'psc certify', structuralOnly: true, semanticPSKernelReplay: true },
    trustBoundary: { hiddenAxiomsIntroduced: false, fullLean4Equivalence: false, executionCorrespondenceProof: false },
  };
  fs.mkdirSync(path.dirname(resolvedOut), { recursive: true });
  fs.writeFileSync(resolvedOut, JSON.stringify(cert, null, 2) + '\n');
  jsonOut({ status: 'accepted', command: 'certify', source, core: resolvedCore, certificate: resolvedOut, certificateSha256: sha256File(resolvedOut), declarations: declarations.length, trustBoundary: cert.trustBoundary }, json);
}

function stateModelCommand(args) {
  const json = has(args, '--json');
  const pos = positional(args);
  const sub = pos[0];
  const file = pos[1];
  const out = opt(args, '--out');
  if (sub !== 'validate' || !file) usage(2);
  const resolved = path.resolve(process.cwd(), file);
  try {
    const descriptor = readJsonPath(resolved);
    const validation = validateStateModelDescriptor(descriptor, {
      descriptorPath: path.relative(process.cwd(), resolved).replace(/\\/g, '/'),
      descriptorSha256: sha256File(resolved),
      packageVersion: VERSION,
      checkpoint: 'KA-146 Lean-checkable monadic skeleton preflight',
    });
    if (out) writeJsonFile(path.resolve(process.cwd(), out), validation);
    jsonOut({ ...validation, command: 'state-model validate', out: out ? path.resolve(process.cwd(), out) : undefined }, json);
    if (validation.status !== 'accepted') process.exit(1);
  } catch (error) {
    jsonOut({ status: 'rejected', command: 'state-model validate', message: error instanceof Error ? error.message : String(error) }, json);
    process.exit(1);
  }
}
function stateModelBindingFromArgs(args) {
  const file = opt(args, '--state-model');
  if (!file) return undefined;
  const resolved = path.resolve(process.cwd(), file);
  const descriptor = readJsonPath(resolved);
  return buildStateModelBinding(descriptor, {
    descriptorPath: path.relative(process.cwd(), resolved).replace(/\\/g, '/'),
    descriptorSha256: sha256File(resolved),
  });
}

function contractsCommand(args) {
  const json = has(args, '--json');
  const input = positional(args)[0];
  const out = opt(args, '--out');
  const emitLean = opt(args, '--emit-lean');
  if (!input) usage(2);
  const resolvedInput = path.resolve(process.cwd(), input);
  const resolvedOut = out ? path.resolve(process.cwd(), out) : undefined;
  try {
    const sourceText = readTextFile(resolvedInput);
    const sourcePath = path.relative(process.cwd(), resolvedInput).replace(/\\/g, '/');
    const stateModel = stateModelBindingFromArgs(args);
    const { artifact, leanText } = isMonadicContractSource(sourceText)
      ? makeMonadicContractsArtifact({
          sourceText,
          sourcePath,
          sourceSha256: sha256File(resolvedInput),
          packageVersion: VERSION,
          checkpoint: 'KA-146 Lean-checkable monadic skeleton preflight',
          stateModel,
        })
      : makeContractsArtifact({
          sourceText,
          sourcePath,
          sourceSha256: sha256File(resolvedInput),
          packageVersion: VERSION,
          checkpoint: 'KA-146 Lean-checkable monadic skeleton preflight',
        });
    assertVerificationProfile(artifact, opt(args, '--verification-profile'));
    if (resolvedOut) writeJsonFile(resolvedOut, artifact);
    let leanPath;
    if (emitLean) {
      leanPath = path.resolve(process.cwd(), emitLean);
      fs.mkdirSync(path.dirname(leanPath), { recursive: true });
      fs.writeFileSync(leanPath, leanText);
    }
    jsonOut({ status: 'accepted', command: 'contracts', out: resolvedOut, emitLean: leanPath, verification: artifact.verification, contractKind: artifact.contractKind ?? 'pure', stateModel: artifact.stateModel, operations: artifact.operations, loops: artifact.loops ?? [], ghosts: artifact.ghosts ?? [], assertions: artifact.assertions ?? [], oldSnapshots: artifact.oldSnapshots ?? [], obligations: artifact.obligations, trustBoundary: artifact.trustBoundary }, json);
  } catch (error) {
    { const message = error instanceof Error ? error.message : String(error); const unsupported = /ghost.*runtime|runtime.*ghost|state model|monadic.*require|^unsupported/i.test(message); jsonOut({ status: unsupported ? 'unsupported' : 'rejected', command: 'contracts', message }, json); process.exit(unsupported ? 2 : 1); }
  }
}
function obligationsCommand(args) {
  const json = has(args, '--json');
  const input = positional(args)[0];
  const out = opt(args, '--out');
  const contractsOut = opt(args, '--contracts-out');
  if (!input) usage(2);
  const resolvedInput = path.resolve(process.cwd(), input);
  const resolvedOut = path.resolve(process.cwd(), out ?? input.replace(/\.contracts\.json$/i, '.obligations.json').replace(/\.ps$/i, '.obligations.json'));
  try {
    let contractArtifact;
    let contractArtifactPath;
    let inputKind = 'artifact';
    if (resolvedInput.endsWith('.ps')) {
      inputKind = 'source';
      const sourceText = readTextFile(resolvedInput);
      const sourcePath = path.relative(process.cwd(), resolvedInput).replace(/\\/g, '/');
      const stateModel = stateModelBindingFromArgs(args);
      const built = isMonadicContractSource(sourceText)
        ? makeMonadicContractsArtifact({
            sourceText,
            sourcePath,
            sourceSha256: sha256File(resolvedInput),
            packageVersion: VERSION,
            checkpoint: 'KA-146 Lean-checkable monadic skeleton preflight',
            stateModel,
          })
        : makeContractsArtifact({
            sourceText,
            sourcePath,
            sourceSha256: sha256File(resolvedInput),
            packageVersion: VERSION,
            checkpoint: 'KA-146 Lean-checkable monadic skeleton preflight',
          });
      contractArtifact = built.artifact;
      contractArtifactPath = contractsOut ? path.resolve(process.cwd(), contractsOut) : resolvedInput;
      if (contractsOut) writeJsonFile(contractArtifactPath, contractArtifact);
    } else {
      contractArtifact = readJsonPath(resolvedInput);
      contractArtifactPath = resolvedInput;
    }
    assertVerificationProfile(contractArtifact, opt(args, '--verification-profile'));
    contractArtifact.contractsSha256 = fs.existsSync(contractArtifactPath) ? sha256File(contractArtifactPath) : undefined;
    const normalized = normalizeObligationsForWorkflow(contractArtifact, path.relative(path.dirname(resolvedOut), contractArtifactPath).replace(/\\/g, '/'), { packageVersion: VERSION, checkpoint: 'KA-146 Lean-checkable monadic skeleton preflight' });
    writeJsonFile(resolvedOut, normalized);
    jsonOut({ status: 'accepted', command: 'obligations', inputKind, out: resolvedOut, count: normalized.obligations.length, ...normalized }, json);
  } catch (error) {
    jsonOut({ status: 'rejected', command: 'obligations', message: error instanceof Error ? error.message : String(error) }, json);
    process.exit(1);
  }
}
function proofStatusCommand(args, commandName = 'proof-status') {
  const json = has(args, '--json');
  const file = positional(args)[0];
  const out = opt(args, '--out');
  if (!file || !out) usage(2);
  const resolved = path.resolve(process.cwd(), file);
  const outPath = path.resolve(process.cwd(), out);
  try {
    const obligations = readJsonPath(resolved);
    const proofsArtifact = readProofClaims(opt(args, '--proofs'));
    const leanCmd = opt(args, '--lean-cmd');
    const leanOut = leanCmd ? path.resolve(process.cwd(), opt(args, '--emit-lean-check') ?? outPath.replace(/\.json$/i, '.lean')) : undefined;
    const artifact = createProofStatusArtifact({
      obligations,
      obligationsPath: resolved,
      outPath,
      proofsArtifact,
      leanCmd,
      leanOut,
      packageVersion: VERSION,
      checkpoint: 'KA-146 Lean-checkable monadic skeleton preflight',
    });
    writeJsonFile(outPath, artifact);
    jsonOut({ status: 'accepted', command: commandName, out: outPath, ...artifact }, json);
  } catch (error) {
    const e = error instanceof Error ? error : new Error(String(error));
    jsonOut({ status: 'rejected', command: commandName, message: e.message, ...(e.leanResult ?? {}), expected: e.expected, actual: e.actual }, json);
    process.exit(1);
  }
}
function verifyCommand(args) {
  const json = has(args, '--json');
  const file = positional(args)[0];
  if (!file) usage(2);
  const resolved = path.resolve(process.cwd(), file);
  const artifact = JSON.parse(fs.readFileSync(resolved, 'utf8'));
  let artifactKind = 'pscore';
  const result = { status: 'accepted', command: 'verify', artifactKind, file: resolved, sha256: sha256File(resolved), trustBoundary: { structuralOnly: true, semanticPSKernelReplay: false, fullLean4Equivalence: false } };
  if (artifact.schema === 'proofscript.proof-status.v1') {
    result.artifactKind = 'proof-status';
    try {
      const verified = verifyProofStatusArtifact({ artifact, artifactPath: resolved });
      result.source = verified.source;
      result.obligationsArtifact = verified.obligationsArtifact;
      if (verified.verification) result.verification = verified.verification;
      result.summary = verified.summary;
      if (verified.leanCheck) result.leanCheck = verified.leanCheck;
      result.trustBoundary.semanticProofChecking = Boolean(artifact.trustBoundary?.semanticProofChecking);
    } catch (error) {
      const e = error instanceof Error ? error : new Error(String(error));
      jsonOut({ status: 'rejected', command: 'verify', artifactKind: 'proof-status', message: e.message, expected: e.expected, actual: e.actual }, json);
      process.exit(1);
    }
  } else if (artifact.schema === 'proofscript.monadic-preflight.v1') {
    result.artifactKind = 'monadic-preflight';
    const stubPath = artifact.leanPreflightStub?.path ? path.resolve(path.dirname(resolved), artifact.leanPreflightStub.path) : null;
    if (!stubPath || !artifact.leanPreflightStub?.sha256 || !fs.existsSync(stubPath)) {
      jsonOut({ status: 'rejected', command: 'verify', artifactKind: 'monadic-preflight', message: 'monadic preflight Lean stub binding is missing or unreadable' }, json);
      process.exit(1);
    }
    const actual = sha256File(stubPath);
    if (actual !== artifact.leanPreflightStub.sha256) {
      jsonOut({ status: 'rejected', command: 'verify', artifactKind: 'monadic-preflight', message: 'monadic preflight Lean stub hash mismatch', expected: artifact.leanPreflightStub.sha256, actual }, json);
      process.exit(1);
    }
    result.leanPreflightStub = { path: stubPath, sha256: actual };
    if (artifact.verification) result.verification = artifact.verification;
    result.summary = artifact.summary;
    result.trustBoundary = { ...result.trustBoundary, ...artifact.trustBoundary };
  } else if (artifact.schema === 'proofscript.contracts.v0' || artifact.schema === 'proofscript.contracts.v1') {
    result.artifactKind = 'contracts';
    if (artifact.verification) result.verification = artifact.verification;
    result.trustBoundary.semanticProofChecking = false;
  } else if (artifact.format === 'proofscript-certificate') {
    result.artifactKind = 'certificate';
    const corePath = path.resolve(path.dirname(resolved), artifact.core?.path ?? '');
    if (!artifact.core?.sha256 || !fs.existsSync(corePath)) {
      jsonOut({ status: 'rejected', command: 'verify', artifactKind: 'certificate', message: 'certificate core binding is missing or unreadable' }, json);
      process.exit(1);
    }
    const actual = sha256File(corePath);
    if (actual !== artifact.core.sha256) {
      jsonOut({ status: 'rejected', command: 'verify', artifactKind: 'certificate', message: 'certificate core hash mismatch', expected: artifact.core.sha256, actual }, json);
      process.exit(1);
    }
    try {
      verifyCertificateMetadataAgainstCore(ROOT, artifact, readJsonPath(corePath));
      verifyRuntimeCertificateMetadata(ROOT, artifact);
    } catch (error) {
      jsonOut({ status: 'rejected', command: 'verify', artifactKind: 'certificate', message: error instanceof Error ? error.message : String(error) }, json);
      process.exit(1);
    }
    if (artifact.runtimeArtifact) {
      const runtimePath = path.resolve(path.dirname(resolved), artifact.runtimeArtifact.path ?? '');
      if (!artifact.runtimeArtifact.sha256 || !fs.existsSync(runtimePath)) {
        jsonOut({ status: 'rejected', command: 'verify', artifactKind: 'certificate', message: 'certificate runtime artifact binding is missing or unreadable' }, json);
        process.exit(1);
      }
      const runtimeSha256 = sha256File(runtimePath);
      if (runtimeSha256 !== artifact.runtimeArtifact.sha256) {
        jsonOut({ status: 'rejected', command: 'verify', artifactKind: 'certificate', message: 'certificate runtime artifact hash mismatch', expected: artifact.runtimeArtifact.sha256, actual: runtimeSha256 }, json);
        process.exit(1);
      }
      if (!['ts', 'js'].includes(artifact.runtimeArtifact.target)) {
        jsonOut({ status: 'rejected', command: 'verify', artifactKind: 'certificate', message: 'certificate runtime artifact target must be ts or js' }, json);
        process.exit(1);
      }
      if (artifact.correspondence?.backendArtifactBound !== true) {
        jsonOut({ status: 'rejected', command: 'verify', artifactKind: 'certificate', message: 'certificate runtime artifact exists but backendArtifactBound is not true' }, json);
        process.exit(1);
      }
      result.runtimeArtifact = { path: runtimePath, target: artifact.runtimeArtifact.target, sha256: runtimeSha256 };
    } else if (artifact.correspondence?.backendArtifactBound === true) {
      jsonOut({ status: 'rejected', command: 'verify', artifactKind: 'certificate', message: 'certificate claims backendArtifactBound without a runtime artifact' }, json);
      process.exit(1);
    }
    if (artifact.runtimeProfile) result.runtimeProfile = artifact.runtimeProfile;
    if (artifact.correspondence) result.correspondence = artifact.correspondence;
    result.boundCore = corePath;
    result.boundCoreSha256 = actual;
    result.trustBoundary.semanticPSKernelReplay = true;
  }
  jsonOut(result, json);
}

function createStructuralCertificate(source, core, out, runtimeArtifact) {
  const resolvedSource = path.resolve(source);
  const resolvedCore = path.resolve(core);
  const resolvedOut = path.resolve(out);
  const artifact = readJsonPath(resolvedCore);
  const declarations = Array.isArray(artifact.declarations) ? artifact.declarations.map(d => ({ name: d.name, kind: d.kind })) : [];
  const cert = {
    format: 'proofscript-certificate',
    version: 4,
    checkpoint: 'KA-146 Lean-checkable monadic skeleton preflight',
    packageVersion: VERSION,
    ...certificateMetadataForCore(ROOT, artifact),
    ...runtimeCertificateMetadata(ROOT),
    ...(runtimeArtifact ? {
      runtimeArtifact: {
        target: runtimeArtifact.target,
        path: path.relative(path.dirname(resolvedOut), path.resolve(runtimeArtifact.path)).replace(/\\/g, '/'),
        sha256: sha256File(path.resolve(runtimeArtifact.path)),
      },
    } : {}),
    correspondence: {
      ...runtimeCertificateMetadata(ROOT).correspondence,
      backendArtifactBound: Boolean(runtimeArtifact),
    },
    source: { path: path.relative(path.dirname(resolvedOut), resolvedSource).replace(/\\/g, '/'), sha256: sha256File(resolvedSource) },
    core: { path: path.relative(path.dirname(resolvedOut), resolvedCore).replace(/\\/g, '/'), sha256: sha256File(resolvedCore), declarations },
    checker: { command: 'psc certify', structuralOnly: true, semanticPSKernelReplay: true },
    trustBoundary: { hiddenAxiomsIntroduced: false, fullLean4Equivalence: false, executionCorrespondenceProof: false },
  };
  writeJsonFile(resolvedOut, cert);
  return { certificate: resolvedOut, certificateSha256: sha256File(resolvedOut), declarations: declarations.length, trustBoundary: cert.trustBoundary };
}
function softwareAlphaCommand(args) {
  const json = has(args, '--json');
  const examplesDir = path.resolve(process.cwd(), opt(args, '--examples-dir') ?? path.join(ROOT, 'examples', 'software'));
  const outDir = path.resolve(process.cwd(), opt(args, '--out-dir') ?? path.join(process.cwd(), 'proofscript-software-alpha-out'));
  const programmingFiles = ['01-domain-model.ps', '02-state-machine.ps'].map(f => path.join(examplesDir, f));
  const contractFiles = ['03-bounded-counter-contract.ps', '04-permission-contract.ps', '05-loop-invariant-contract.ps'].map(f => path.join(examplesDir, f));
  const monadicContractSpecs = [{ source: path.join(examplesDir, '06-bank-transfer-monadic-contract.ps'), model: path.join(examplesDir, '06-bank-state.model.json') }];
  for (const file of [...programmingFiles, ...contractFiles, ...monadicContractSpecs.flatMap(x => [x.source, x.model])]) {
    if (!fs.existsSync(file)) {
      const result = { status: 'rejected', command: 'software-alpha', message: `missing software alpha example: ${file}` };
      jsonOut(result, json);
      process.exit(1);
    }
  }
  fs.mkdirSync(outDir, { recursive: true });
  const workflows = [];
  for (const source of programmingFiles) {
    const stem = path.basename(source, '.ps');
    const core = path.join(outDir, `${stem}.pscore.json`);
    const lean = path.join(outDir, `${stem}.lean`);
    const ts = path.join(outDir, `${stem}.ts`);
    const cert = path.join(outDir, `${stem}.pscert.json`);
    const checked = checkDirect(source, core);
    fs.writeFileSync(lean, emitLeanFromCoreArtifact(readJsonPath(core)));
    const built = buildTsDirect(source, ts, ['--runtime', 'local']);
    const certificate = createStructuralCertificate(source, core, cert, { target: 'ts', path: ts });
    workflows.push({
      kind: 'executable',
      source: { path: path.relative(process.cwd(), source).replace(/\\/g, '/'), sha256: sha256File(source) },
      check: { status: checked.status, semanticSha256: checked.semanticSha256, declarations: checked.userDeclarations },
      core: { path: path.relative(process.cwd(), core).replace(/\\/g, '/'), sha256: sha256File(core) },
      lean: { path: path.relative(process.cwd(), lean).replace(/\\/g, '/'), sha256: sha256File(lean), structuralExport: true },
      runtime: { target: 'ts', path: path.relative(process.cwd(), ts).replace(/\\/g, '/'), sha256: sha256File(ts), executionCorrespondenceProof: false, emitted: built.emitted, skipped: built.skipped },
      certificate: { path: path.relative(process.cwd(), cert).replace(/\\/g, '/'), sha256: certificate.certificateSha256, structuralOnly: true },
    });
  }
  for (const source of contractFiles) {
    const stem = path.basename(source, '.ps');
    const contracts = path.join(outDir, `${stem}.contracts.json`);
    const lean = path.join(outDir, `${stem}.contracts.lean`);
    const obligations = path.join(outDir, `${stem}.obligations.json`);
    const proofStatus = path.join(outDir, `${stem}.proofstatus.json`);
    const contract = parsePureContractSource(readTextFile(source), path.relative(process.cwd(), source).replace(/\\/g, '/'));
    const contractArtifact = {
      schema: 'proofscript.contracts.v1',
      packageVersion: VERSION,
      source: path.relative(process.cwd(), source).replace(/\\/g, '/'),
      sourceSha256: sha256File(source),
      functions: [contract],
      loops: contract.loops ?? [],
      ghosts: contract.ghosts,
      assertions: contract.assertions,
      oldSnapshots: contract.oldSnapshots,
      obligations: contract.obligations,
      trustBoundary: { semanticProofChecking: false, hiddenAxioms: false, ghostErasureVerified: false, oldIsLogicalSnapshot: true, runtimeAssertionTrust: false, loopInvariantChecking: 'structural-obligations-only', vcgenConnected: false, fullLean4Equivalence: false },
    };
    writeJsonFile(contracts, contractArtifact);
    fs.writeFileSync(lean, leanForContract(contract));
    const normalized = normalizeObligationsForWorkflow(contractArtifact, contracts);
    writeJsonFile(obligations, normalized);
    const items = normalized.obligations.map(o => ({ id: o.id, name: o.name, kind: o.kind, statementSha256: o.statementSha256, theoremSha256: o.theoremSha256, status: 'unproved', proof: null, stale: false }));
    const statusArtifact = {
      schema: 'proofscript.proof-status.v1',
      checkpoint: 'KA-146 Lean-checkable monadic skeleton preflight',
      packageVersion: VERSION,
      source: normalized.source,
      obligationsArtifact: { path: path.relative(path.dirname(proofStatus), obligations).replace(/\\/g, '/'), sha256: sha256File(obligations) },
      obligations: items,
      summary: { total: items.length, proved: 0, unproved: items.length },
      trustBoundary: { semanticProofChecking: false, staleProofDetection: true, hiddenAxiomsIntroduced: false },
    };
    writeJsonFile(proofStatus, statusArtifact);
    workflows.push({
      kind: 'contract',
      source: { path: path.relative(process.cwd(), source).replace(/\\/g, '/'), sha256: sha256File(source) },
      contracts: { path: path.relative(process.cwd(), contracts).replace(/\\/g, '/'), sha256: sha256File(contracts), obligations: contract.obligations.length },
      lean: { path: path.relative(process.cwd(), lean).replace(/\\/g, '/'), sha256: sha256File(lean), proofObligationSkeletons: true },
      obligations: { path: path.relative(process.cwd(), obligations).replace(/\\/g, '/'), sha256: sha256File(obligations), count: normalized.obligations.length, unproved: normalized.summary.unproved },
      proofStatus: { path: path.relative(process.cwd(), proofStatus).replace(/\\/g, '/'), sha256: sha256File(proofStatus), staleProofDetection: true },
    });
  }
  for (const spec of monadicContractSpecs) {
    const source = spec.source;
    const stem = path.basename(source, '.ps');
    const contracts = path.join(outDir, `${stem}.contracts.json`);
    const lean = path.join(outDir, `${stem}.contracts.lean`);
    const monadicLowering = path.join(outDir, `${stem}.monadic-lowering.json`);
    const monadicLean = path.join(outDir, `${stem}.monadic-triple.lean`);
    const monadicPreflight = path.join(outDir, `${stem}.monadic-preflight.json`);
    const monadicPreflightLean = path.join(outDir, `${stem}.monadic-preflight.lean`);
    const obligations = path.join(outDir, `${stem}.obligations.json`);
    const proofStatus = path.join(outDir, `${stem}.proofstatus.json`);
    const modelValidation = path.join(outDir, `${stem}.state-model-validation.json`);
    const descriptor = readJsonPath(spec.model);
    const stateModel = buildStateModelBinding(descriptor, {
      descriptorPath: path.relative(process.cwd(), spec.model).replace(/\\/g, '/'),
      descriptorSha256: sha256File(spec.model),
    });
    writeJsonFile(modelValidation, stateModel.validation);
    const built = makeMonadicContractsArtifact({
      sourceText: readTextFile(source),
      sourcePath: path.relative(process.cwd(), source).replace(/\\/g, '/'),
      sourceSha256: sha256File(source),
      packageVersion: VERSION,
      checkpoint: 'KA-146 Lean-checkable monadic skeleton preflight',
      stateModel,
    });
    writeJsonFile(contracts, built.artifact);
    fs.writeFileSync(lean, built.leanText);
    const loweringBundle = createMonadicLoweringBundle({
      contractArtifact: built.artifact,
      contractArtifactPath: path.relative(process.cwd(), contracts).replace(/\\/g, '/'),
      contractArtifactSha256: sha256File(contracts),
      packageVersion: VERSION,
      checkpoint: 'KA-146 Lean-checkable monadic skeleton preflight',
    });
    writeJsonFile(monadicLowering, loweringBundle.artifact);
    fs.writeFileSync(monadicLean, loweringBundle.leanText);
    const preflightLeanText = createMonadicLeanPreflightBundle({ loweringArtifact: loweringBundle.artifact, packageVersion: VERSION }).leanText;
    fs.writeFileSync(monadicPreflightLean, preflightLeanText);
    const preflightBundle = createMonadicLeanPreflightBundle({
      loweringArtifact: loweringBundle.artifact,
      loweringArtifactPath: path.relative(path.dirname(monadicPreflight), monadicLowering).replace(/\\/g, '/'),
      loweringArtifactSha256: sha256File(monadicLowering),
      preflightLeanPath: path.relative(path.dirname(monadicPreflight), monadicPreflightLean).replace(/\\/g, '/'),
      preflightLeanSha256: sha256File(monadicPreflightLean),
      leanRun: { status: 'skipped', reason: 'software-alpha does not require Lean installed' },
      packageVersion: VERSION,
      checkpoint: 'KA-146 Lean-checkable monadic skeleton preflight',
    });
    writeJsonFile(monadicPreflight, preflightBundle.report);
    built.artifact.contractsSha256 = sha256File(contracts);
    const normalized = normalizeObligationsForWorkflow(built.artifact, contracts, { packageVersion: VERSION, checkpoint: 'KA-146 Lean-checkable monadic skeleton preflight' });
    writeJsonFile(obligations, normalized);
    const items = normalized.obligations.map(o => ({ id: o.id, name: o.name, kind: o.kind, statementSha256: o.statementSha256, theoremSha256: o.theoremSha256, status: 'unproved', proof: null, stale: false }));
    const statusArtifact = {
      schema: 'proofscript.proof-status.v1',
      checkpoint: 'KA-146 Lean-checkable monadic skeleton preflight',
      packageVersion: VERSION,
      source: normalized.source,
      obligationsArtifact: { path: path.relative(path.dirname(proofStatus), obligations).replace(/\\/g, '/'), sha256: sha256File(obligations) },
      obligations: items,
      summary: { total: items.length, proved: 0, checked: 0, unproved: items.length },
      trustBoundary: { semanticProofChecking: false, staleProofDetection: true, monadicProofDischarge: false, monadicLoweringSkeletons: true, statefulVcRequestArtifacts: true, leanVcEnvironmentResolved: false, vcgenExecuted: false, monadicPreflightStubs: true, vcgenConnected: false, hiddenAxiomsIntroduced: false },
    };
    writeJsonFile(proofStatus, statusArtifact);
    workflows.push({
      kind: 'monadic-contract',
      source: { path: path.relative(process.cwd(), source).replace(/\\/g, '/'), sha256: sha256File(source) },
      stateModel: { path: path.relative(process.cwd(), spec.model).replace(/\\/g, '/'), sha256: sha256File(spec.model), validation: path.relative(process.cwd(), modelValidation).replace(/\\/g, '/'), name: stateModel.name, vcgenConnected: false },
      contracts: { path: path.relative(process.cwd(), contracts).replace(/\\/g, '/'), sha256: sha256File(contracts), obligations: built.artifact.obligations.length },
      lean: { path: path.relative(process.cwd(), lean).replace(/\\/g, '/'), sha256: sha256File(lean), proofObligationSkeletons: true, monadicStateModelBound: true },
      monadicLowering: { path: path.relative(process.cwd(), monadicLowering).replace(/\\/g, '/'), sha256: sha256File(monadicLowering), tripleSkeleton: true, vcgenConnected: false },
      monadicTripleLean: { path: path.relative(process.cwd(), monadicLean).replace(/\\/g, '/'), sha256: sha256File(monadicLean), checkableAsCompleteProof: false },
      monadicPreflight: { path: path.relative(process.cwd(), monadicPreflight).replace(/\\/g, '/'), sha256: sha256File(monadicPreflight), preflightOnly: true },
      monadicPreflightLean: { path: path.relative(process.cwd(), monadicPreflightLean).replace(/\\/g, '/'), sha256: sha256File(monadicPreflightLean), checkableAsCompleteProof: false, explicitStubs: true },
      obligations: { path: path.relative(process.cwd(), obligations).replace(/\\/g, '/'), sha256: sha256File(obligations), count: normalized.obligations.length, unproved: normalized.summary.unproved },
      proofStatus: { path: path.relative(process.cwd(), proofStatus).replace(/\\/g, '/'), sha256: sha256File(proofStatus), staleProofDetection: true },
      trustBoundary: { semanticProofChecking: false, monadicProofDischarge: false, monadicLoweringSkeletons: true, monadicPreflightStubs: true, vcgenConnected: false },
    });
  }

  const manifest = {
    schema: 'proofscript.software-alpha.v1',
    checkpoint: 'KA-146 Lean-checkable monadic skeleton preflight',
    packageVersion: VERSION,
    command: 'software-alpha',
    examplesDir: path.relative(process.cwd(), examplesDir).replace(/\\/g, '/') || '.',
    outDir: path.relative(process.cwd(), outDir).replace(/\\/g, '/') || '.',
    workflows,
    summary: {
      examples: workflows.length,
      executableExamples: workflows.filter(w => w.kind === 'executable').length,
      contractExamples: workflows.filter(w => w.kind === 'contract').length,
      monadicContractExamples: workflows.filter(w => w.kind === 'monadic-contract').length,
      monadicLoweringSkeletons: workflows.filter(w => w.monadicLowering).length,
      monadicPreflightStubs: workflows.filter(w => w.monadicPreflight).length,
      obligations: workflows.reduce((n, w) => n + (w.obligations?.count ?? w.contracts?.obligations ?? 0), 0),
      runtimeArtifacts: workflows.filter(w => w.runtime).length,
      certificates: workflows.filter(w => w.certificate).length,
    },
    trustBoundary: { semanticProofChecking: false, fullLean4Equivalence: false, executionCorrespondenceProof: false, certifiableArtifacts: true, monadicProofDischarge: false, monadicLoweringSkeletons: true, monadicPreflightStubs: true, vcgenConnected: false },
  };
  const manifestPath = path.join(outDir, 'software-alpha.manifest.json');
  writeJsonFile(manifestPath, manifest);
  const result = { status: 'accepted', command: 'software-alpha', manifest: manifestPath, manifestSha256: sha256File(manifestPath), ...manifest };
  jsonOut(result, json);
}

function targetList() {
  console.log('ProofScript target registry');
  console.log('software-ts\timplemented\tPSC-1 software profile TypeScript output');
  console.log('software-js\timplemented\tPSC-1 software profile JavaScript output');
  console.log('lean-full\tfuture\tfull Lean-compatible profile; not implemented by this CLI');
}
function languageStatus(args = []) {
  const result = {
    status: 'accepted',
    command: 'language status',
    profile: 'ProofScript v0.7 alpha',
    packageVersion: VERSION,
    sourceReference: 'proofscript-language-reference-v0.6.1 compiler-ready + v0.7 verification extensions',
    layers: {
      programmingLanguage: { status: 'usable-software-alpha', note: 'PSC-1 small software profile with def/function/const, structures, inductives, if/match, Nat/Int/Bool/String/Unit/Option/List subset.' },
      theoremProver: { status: 'partial-lean-export', note: 'theorem/proof surface is checked in the supported kernel/Core subset; full tactic engine is not implemented.' },
      formalVerification: { status: 'monadic-preflight-alpha', note: 'Pure requires/ensures/result/assert/ghost/old are promoted in ps3-pure-contracts0. Monadic contracts are a specified structural alpha with typed StateM/Std.Do lowering and evidence-driven Lean VC execution. KA142 loop invariant/decreases remain prototype-only; project-wide semantic proof discharge is not claimed.' },
      runtimeCorrespondence: { status: 'source-proof-runtime-certificate-alpha', note: 'TS/JS build artifacts, Core/cert hashes, obligation manifests, and software-alpha manifests are bindable; full execution-correspondence proof is not claimed.' },
    },
    features: {
      programming: ['def', 'function', 'const', 'structures', 'inductives', 'match', 'if', 'where', 'Nat', 'Int', 'Bool', 'String', 'Unit', 'Option', 'List'],
      theoremProver: ['theorem', 'rfl/simp passthrough where supported', 'Core artifact checking', 'Lean export'],
      formalVerification: ['requires', 'ensures', 'result', 'old', 'assert', 'ghost', 'invariant', 'decreases', 'loop invariant structural obligations', 'proof obligation listing', 'proof status records', 'stale proof detection', 'exact theorem statement printing', 'structural certificates', 'software examples workflow', 'source/proof/runtime artifact binding', 'Lean-backed proof-status checking', 'state model descriptors', 'monadic/stateful contract descriptor binding', 'Std.Do.Triple-style monadic lowering skeleton', 'typed StateM monadic program lowering', 'Std.Do StateM semantic encoding', 'Lean VC derivation request artifact', 'Lean VC execution evidence', 'Lean-checkable monadic preflight stubs'],
      verificationFeatureClaims: {
        requires: 'ps3-pure-contracts0',
        ensures: 'ps3-pure-contracts0',
        result: 'ps3-pure-contracts0; structural-alpha in stateful profile',
        assert: 'ps3-pure-contracts0',
        ghost: 'ps3-pure-contracts0',
        old: 'ps3-pure-contracts0; structural-alpha in stateful profile',
        invariant: 'ka142-loop-prototype',
        decreases: 'ka142-loop-prototype',
        monadicContract: 'ps3-monadic-contracts0 specified-structural-alpha',
      },
      notYetImplemented: ['project-wide monadic vcgen/vcgen semantic discharge', 'promoted loop invariant/decreases semantics', 'frame conditions', 'full macros', 'full tactic engine', 'full Lean4 equivalence'],
    },
    commands: ['init', 'check', 'build', 'build-ts', 'build-js', 'emit-core', 'emit-lean', 'state-model', 'monadic-lowering', 'monadic-vc-request', 'monadic-vc-run', 'monadic-preflight', 'contracts', 'obligations', 'proof-status', 'check-obligations', 'certify', 'verify', 'software-alpha', 'run', 'npm-readiness'],
    trustBoundary: { fullLean4Equivalence: false, fullyFormalK3: false, semanticContractProofChecking: 'partial-lean-backed-explicit-proofs-only', monadicProofDischarge: false, monadicLoweringSkeletons: true, statefulVcRequestArtifacts: true, statefulVcExecutionEvidence: true, leanVcEnvironmentResolved: false, vcgenExecuted: false, monadicPreflightStubs: true, vcgenConnected: false, npmInstallableToolchain: true },
    unsupported: ['monadic vcgen/mvcgen semantic discharge', 'automatic proof search', 'full Lean4 equivalence'],
  };
  if (has(args, '--json')) console.log(JSON.stringify(result, null, 2));
  else {
    console.log('ProofScript language status');
    console.log(`profile=${result.profile}`);
    console.log(`programming=${result.layers.programmingLanguage.status}`);
    console.log(`theoremProver=${result.layers.theoremProver.status}`);
    console.log(`formalVerification=${result.layers.formalVerification.status}`);
    console.log('fullLean4Equivalence=false');
  }
}

const args = process.argv.slice(2);
const cmd = args.shift();
if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') usage(0);
if (cmd === '--version' || cmd === '-v' || cmd === 'version') { console.log(`ProofScript ${VERSION}`); process.exit(0); }
if (cmd === 'setup') setupCommand(args);
else if (cmd === 'init') initCommand(args);
else if (cmd === 'doctor') doctor(args);
else if (cmd === 'target' && args[0] === 'list') targetList();
else if (cmd === 'language' && (args[0] ?? 'status') === 'status') languageStatus(args.slice(args[0] === 'status' ? 1 : 0));
else if (cmd === 'kernel' && (args[0] ?? 'status') === 'status') kernelStatusCommand(args.slice(1));
else if (cmd === 'npm-readiness') npmReadinessCommand(args);
else if (cmd === 'emit-core') emitCoreCommand(args);
else if (cmd === 'emit-lean') emitLeanCommand(args);
else if (cmd === 'certify') certifyCommand(args);
else if (cmd === 'state-model') stateModelCommand(args);
else if (cmd === 'monadic-lowering') monadicLoweringCommand(args, { version: VERSION });
else if (cmd === 'monadic-vc-request') monadicVcRequestCommand(args);
else if (cmd === 'monadic-vc-run') monadicVcRunCommand(args);
else if (cmd === 'monadic-preflight') monadicPreflightCommand(args, { version: VERSION });
else if (cmd === 'contracts') contractsCommand(args);
else if (cmd === 'obligations') obligationsCommand(args);
else if (cmd === 'proof-status') proofStatusCommand(args);
else if (cmd === 'check-obligations') proofStatusCommand(args, 'check-obligations');
else if (cmd === 'software-alpha') softwareAlphaCommand(args);
else if (cmd === 'verify') verifyCommand(args);
else if (cmd === 'compile') compileCommand(args);
else if (cmd === 'clean') cleanCommand(args);
else if (cmd === 'build') buildCommand(args);
else if (cmd === 'check') checkCommand(args);
else if (cmd === 'build-ts') buildTsCommand(args);
else if (cmd === 'build-js') buildJsCommand(args);
else if (cmd === 'run') await runCommand(args);
else if (['status', 'smoke'].includes(cmd)) runPslive([cmd, ...args]);
else usage(2);
