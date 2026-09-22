#!/usr/bin/env node
'use strict';

const { linkLocalWorkspaces } = require('./link-local-workspaces.cts');

function main() {
  const result = linkLocalWorkspaces();
  if (process.argv.includes('--json')) process.stdout.write(`${JSON.stringify(result, null, 2)}
`);
  else process.stdout.write(`PROOFSCRIPT_LOCAL_WORKSPACE_SETUP=PASS packages=${result.packageCount} workspaceLinksSha256=${result.workspaceLinksSha256}
`);
}

if (require.main === module) {
  try { main(); }
  catch (error) {
    const result = { schema: 'proofscript-local-workspace-setup/v1', status: 'rejected', message: error instanceof Error ? error.message : String(error) };
    process.stdout.write(`${JSON.stringify(result, null, 2)}
`);
    process.exitCode = 1;
  }
}
