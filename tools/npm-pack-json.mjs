export function parseNpmPackJson(stdout) {
  const parsed = JSON.parse(String(stdout));
  const candidates = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === "object" && Array.isArray(parsed.files)
      ? [parsed]
      : parsed && typeof parsed === "object"
        ? Object.values(parsed)
        : [];
  const entries = candidates.filter((item) =>
    item && typeof item === "object" && Array.isArray(item.files)
  );
  if (entries.length !== 1) {
    throw new Error(
      `npm pack --json must describe exactly one package, found ${entries.length}`,
    );
  }
  return entries[0];
}
