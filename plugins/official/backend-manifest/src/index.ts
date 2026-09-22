import fs from "node:fs";
import path from "node:path";
import {
  CURRENT_PRODUCT_PROFILE,
  CURRENT_PROOFSCRIPT_REFERENCE,
  ProofScriptPlugin,
} from "@proofscript/plugin-api";

const plugin: ProofScriptPlugin = {
  manifest: {
    name: "@proofscript/backend-manifest",
    version: "0.1.0-dev.0",
    pluginApi: 1,
    proofscriptReference: CURRENT_PROOFSCRIPT_REFERENCE,
    productProfile: CURRENT_PRODUCT_PROFILE,
    kinds: ["backend"],
    requiresHostCapabilities: ["backend:v1"],
    logicalContribution: "none",
  },
  setup(api) {
    api.registerBackend({
      name: "manifest",
      build(input) {
        fs.mkdirSync(path.dirname(input.outPath), { recursive: true });
        fs.writeFileSync(input.outPath, JSON.stringify(input.module, null, 2) + "\n");
        return {
          target: "manifest",
          files: [input.outPath],
          executionCorrespondence: "not-claimed",
        };
      },
    });
  },
};

export = plugin;
