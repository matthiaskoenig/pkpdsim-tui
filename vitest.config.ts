import {defineConfig} from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      // `tuio-client` declares itself an ES module but points `main` at its CommonJS bundle,
      // so the ES bundle has to be named directly.
      "tuio-client": "tuio-client/dist/tuio-client.es.js",
    },
  },
  test: {
    // The simulator runs on plain `node` without a build step, so its tests are modules too.
    include: [
      "packages/*/test/**/*.test.ts", "packages/*/test/**/*.test.mjs", "apps/*/test/**/*.test.ts",
      // the version of the repository and its release notes, which belong to no package
      "test/**/*.test.ts",
    ],
    environment: "node",
  },
});
