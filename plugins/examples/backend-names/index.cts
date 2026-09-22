const fs = require("node:fs");
const path = require("node:path");
const {
  CURRENT_PRODUCT_PROFILE,
  CURRENT_PROOFSCRIPT_REFERENCE,
} = require("@proofscript/plugin-api");

module.exports = {
  manifest: {
    name: "example-proofscript-backend-names",
    version: "0.0.1",
    pluginApi: 1,
    proofscriptReference: CURRENT_PROOFSCRIPT_REFERENCE,
    productProfile: CURRENT_PRODUCT_PROFILE,
    kinds: ["backend"],
    requiresHostCapabilities: ["backend:v1"],
    logicalContribution: "none",
  },
  setup(api) {
    api.registerBackend({
      name: "names",
      build(input) {
        fs.mkdirSync(path.dirname(input.outPath), { recursive: true });
        fs.writeFileSync(input.outPath, input.module.declarations.map(d => d.name).join("\n") + "\n");
        return {
          target: "names",
          files: [input.outPath],
          executionCorrespondence: "not-claimed",
        };
      },
    });
  },
};
