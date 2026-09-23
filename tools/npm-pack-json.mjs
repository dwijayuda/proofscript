export function parseNpmPackJson(stdout) {
  const parsed = JSON.parse(String(stdout));
  const info = Array.isArray(parsed) ? parsed[0] : parsed;
  if (!info || typeof info !== "object") {
    throw new Error("npm pack --json did not return package metadata");
  }
  return info;
}
