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
    include: ["packages/*/test/**/*.test.ts", "apps/*/test/**/*.test.ts"],
    environment: "node",
  },
});
