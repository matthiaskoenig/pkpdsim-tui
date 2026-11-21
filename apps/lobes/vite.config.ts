import {defineConfig} from "vite";

export default defineConfig({
  // The page is served from a file path on the machine that drives the table as often as from a
  // server, so every asset is referenced relatively.
  base: "./",
  resolve: {
    alias: {
      // `tuio-client` declares itself an ES module but points `main` at its CommonJS bundle.
      "tuio-client": "tuio-client/dist/tuio-client.es.js",
    },
  },
  build: {
    target: "es2023",
    outDir: "dist",
    // The exported livers are copied into `public/assets`, so the bundle keeps its own folder.
    assetsDir: "bundle",
    emptyOutDir: true,
    chunkSizeWarningLimit: 1024,
  },
  server: {
    host: true,
  },
});
