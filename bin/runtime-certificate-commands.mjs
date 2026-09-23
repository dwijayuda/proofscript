import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { runtimeCertificateMetadata } from "../packages/product-profile/src/index.mjs";

function option(args, name) {
  const eq = args.find((arg) => arg.startsWith(name + "="));
  if (eq) return eq.slice(name.length + 1);
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function sha256File(file) {
  return createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

export function certificateRuntimeMetadata(args, certificateOut, root, cwd = process.cwd()) {
  const base = runtimeCertificateMetadata(root);
  const file = option(args, "--runtime-artifact");
  if (!file) {
    return {
      ...base,
      correspondence: { ...base.correspondence, backendArtifactBound: false },
    };
  }
  const resolved = path.resolve(cwd, file);
  if (!fs.existsSync(resolved)) throw new Error(`runtime artifact is missing or unreadable: ${resolved}`);
  const ext = path.extname(resolved).toLowerCase();
  const target = ext === ".ts" ? "ts" : ext === ".js" ? "js" : null;
  if (!target) throw new Error(`runtime artifact must be .ts or .js, got '${ext || "<none>"}'`);
  return {
    ...base,
    runtimeArtifact: {
      target,
      path: path.relative(path.dirname(certificateOut), resolved).replace(/\\/g, "/"),
      sha256: sha256File(resolved),
    },
    correspondence: { ...base.correspondence, backendArtifactBound: true },
  };
}
