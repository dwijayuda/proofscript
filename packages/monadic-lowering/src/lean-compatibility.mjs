export const MINIMUM_STATEFUL_LEAN_VERSION = "4.33.1";

function parseParts(version) {
  const match = String(version ?? "").trim().match(
    /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/,
  );
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] ?? null,
  };
}

export function parseLeanCompatibilityVersion(text) {
  return String(text ?? "").match(
    /\bversion\s+(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)/i,
  )?.[1];
}

function comparePrerelease(a, b) {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  const aa = a.split(".");
  const bb = b.split(".");
  const length = Math.max(aa.length, bb.length);
  for (let i = 0; i < length; i += 1) {
    if (aa[i] === undefined) return -1;
    if (bb[i] === undefined) return 1;
    const an = /^\d+$/.test(aa[i]) ? Number(aa[i]) : null;
    const bn = /^\d+$/.test(bb[i]) ? Number(bb[i]) : null;
    if (an !== null && bn !== null && an !== bn) return an < bn ? -1 : 1;
    if (an !== null && bn === null) return -1;
    if (an === null && bn !== null) return 1;
    if (aa[i] !== bb[i]) return aa[i] < bb[i] ? -1 : 1;
  }
  return 0;
}

export function compareLeanCompatibilityVersions(left, right) {
  const a = parseParts(left);
  const b = parseParts(right);
  if (!a || !b) throw new Error(`invalid Lean compatibility version comparison: '${left}' vs '${right}'`);
  for (const key of ["major", "minor", "patch"]) {
    if (a[key] !== b[key]) return a[key] < b[key] ? -1 : 1;
  }
  return comparePrerelease(a.prerelease, b.prerelease);
}

export function normalizeLeanToolchainSelector(value) {
  const raw = String(value ?? "").trim();
  const prefix = "leanprover/lean4:";
  const selected = raw.startsWith(prefix) ? raw.slice(prefix.length) : raw;
  const version = selected.startsWith("v") ? selected.slice(1) : selected;
  if (!parseParts(version)) {
    throw new Error(`invalid Lean toolchain selector '${raw}'`);
  }
  return `${prefix}v${version}`;
}

export function classifyLeanCompatibilityOutput(
  output,
  minimumVersion = MINIMUM_STATEFUL_LEAN_VERSION,
) {
  const version = parseLeanCompatibilityVersion(output);
  if (!version) {
    return {
      status: "unsupported",
      minimumVersion,
      output: String(output ?? ""),
      message: "unable to parse Lean version",
    };
  }

  let comparison;
  try {
    comparison = compareLeanCompatibilityVersions(version, minimumVersion);
  } catch (error) {
    return {
      status: "unsupported",
      version,
      minimumVersion,
      output: String(output ?? ""),
      message: error instanceof Error ? error.message : String(error),
    };
  }

  if (comparison < 0) {
    return {
      status: "unsupported",
      version,
      minimumVersion,
      output: String(output ?? ""),
      message: `Lean >= ${minimumVersion} required, found ${version}`,
    };
  }

  const prerelease = version.includes("-");
  return {
    status: "accepted",
    version,
    minimumVersion,
    compatibilityPolicy: `>=${minimumVersion}`,
    releaseChannel: prerelease ? "prerelease" : "stable-or-development",
    exactVersionRequired: false,
    output: String(output ?? ""),
  };
}
