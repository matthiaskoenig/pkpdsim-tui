import {readFileSync} from "node:fs";
import {defineConfig} from "vite";
import type {Connect, Plugin, ProxyOptions} from "vite";

/**
 * The one application: the body and every table of pkpdsim behind it, from one page.
 *
 * The development server also carries the TUIO simulator, so that the whole table is one port.
 * `ssh -L 5173:localhost:5173 <host>` is then everything a remote machine needs: the application
 * on `/`, the surface which drives it on `/simulator/`, and the tracker itself on `/tuio`, which
 * an application is pointed at with `?tuio=/tuio`.
 */
/**
 * Which interface the server listens on. It stays on this machine unless it is sent out with
 * `npm run dev -- --host`: the proxy below carries the control socket of the simulator and the
 * tracker with it, and neither asks for a password, so a table on the network of an exhibition
 * would hand them to everybody on it.
 */
const HOST = process.env["TUIO_TABLE_HOST"] ?? "localhost";

/**
 * The version of the repository, which the page about all of this shows. It is read from the
 * one `package.json` that carries it, so a build says which release it is and a table at an
 * exhibition can be asked what it is running.
 */
const VERSION = (JSON.parse(
  readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
) as {version: string}).version;

const SIMULATOR_PAGE = process.env["TUIO_SIMULATOR_PAGE"] ?? "127.0.0.1:3344";
const TUIO_TRACKER = process.env["TUIO_TRACKER"] ?? "127.0.0.1:3333";

const proxy: Record<string, ProxyOptions> = {
  "/simulator": {
    target: `http://${SIMULATOR_PAGE}`,
    ws: true,
    // The simulator serves its page at the root of its own port, and the control socket of the
    // page is `/control` beside it.
    rewrite: path => path.replace(/^\/simulator/, "") || "/",
  },
  "/tuio": {
    target: `ws://${TUIO_TRACKER}`,
    ws: true,
    rewrite: () => "/",
  },
};

/** `/simulator` without the slash would resolve the files of the page against the root. */
function simulatorSlash(): Plugin {
  const redirect: Connect.NextHandleFunction = (request, response, next) => {
    if (request.url !== "/simulator") {
      next();
      return;
    }
    response.writeHead(301, {location: "/simulator/"});
    response.end();
  };
  return {
    name: "simulator-slash",
    configureServer: server => {
      server.middlewares.use(redirect);
    },
    configurePreviewServer: server => {
      server.middlewares.use(redirect);
    },
  };
}

export default defineConfig({
  // The page is served from a file path on the machine that drives the table as often as from a
  // server, so every asset is referenced relatively.
  base: "./",
  plugins: [simulatorSlash()],
  resolve: {
    alias: {
      // `tuio-client` declares itself an ES module but points `main` at its CommonJS bundle.
      "tuio-client": "tuio-client/dist/tuio-client.es.js",
    },
  },
  define: {
    __TABLE_VERSION__: JSON.stringify(VERSION),
  },
  build: {
    target: "es2023",
    outDir: "dist",
    // The exported models are copied into `public/assets`, so the bundle keeps its own folder.
    assetsDir: "bundle",
    emptyOutDir: true,
    chunkSizeWarningLimit: 1024,
  },
  server: {
    host: HOST,
    port: 5173,
    strictPort: true,
    proxy,
  },
  preview: {
    host: HOST,
    port: 4173,
    strictPort: true,
    proxy,
  },
});
