export function resolveNpmInvocation(
  npmArgs,
  {
    env = process.env,
    execPath = process.execPath,
    platform = process.platform,
  } = {},
) {
  const args = Array.isArray(npmArgs) ? [...npmArgs] : [];
  const npmExecPath = String(env?.npm_execpath ?? "").trim();

  if (npmExecPath) {
    return {
      command: execPath,
      args: [npmExecPath, ...args],
      mode: "node-npm-cli",
    };
  }

  if (platform === "win32") {
    throw new Error(
      "unable to resolve npm CLI safely on Windows; run this end test through the npm script so npm_execpath is available",
    );
  }

  return {
    command: "npm",
    args,
    mode: "npm-bin",
  };
}
