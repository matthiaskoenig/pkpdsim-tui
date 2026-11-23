import {readFileSync} from "node:fs";
import {defineConfig} from "vite";
import type {Connect, Plugin, ProxyOptions} from "vite";
import {dataNotFound} from "./data-404.ts";

/**
 * The one application: the body and every table of pkpdsim behind it, from one page.
 *
 * The development server also carries the TUIO simulator, so that the whole table is one port.
 * `ssh -L 5173:localhost:5173 <host>` is then everything a remote machine needs: the application
 * on `/`, the surface which drives it on `/simulator/`, and the tracker itself on `/tuio`, which
 * an application is pointed at with `?tuio=/tuio` and finds by itself.
 *
 * `npm run dev -- --tuio <host:port>` puts a real table behind `/tuio` in place of the
 * simulator, which is the one place the tracker of a table is said.
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

/**
 * The tracker this server carries at `/tuio`: the simulator of this machine by default, and the
 * real table where `npm run dev -- --tuio 10.0.0.20:3343` named one. It is `host:port`, or a
 * whole `ws://host:port/path` for a tracker which listens under a path of its own.
 *
 * This is the one place the tracker of a table is said. A page which was not told about one
 * finds it here, so every page of the table is driven by it and no address of one carries a
 * machine: the page a visitor is handed, the page a table opens again, and a page somebody
 * typed all reach the same tracker.
 */
const TUIO_TRACKER = process.env["TUIO_TRACKER"] ?? "127.0.0.1:3333";
const TRACKER_URL = new URL(
  /^wss?:\/\//u.test(TUIO_TRACKER) ? TUIO_TRACKER : `ws://${TUIO_TRACKER}`);

/**
 * The real table this server was started on, as a person reads it, and the ids of the markers
 * of that table. Both are of the booth and not of a visitor, so they are said once, here, and
 * every page this server serves is given them: the page a visitor is handed, the page a table
 * opens again, and a page somebody typed. An address of a table then carries nothing.
 *
 * `npm run dev -- --tuio 10.0.0.20:3343 --ids 1,3,5,6,11,12,21` writes both, and a build for a
 * booth of its own takes them from the environment:
 *
 *   TUIO_TABLE_TRACKER=10.0.0.20:3343 TUIO_TABLE_IDS=1,3,5,6,11,12,21 npm run build
 */
const TABLE_TRACKER = process.env["TUIO_TABLE_TRACKER"] ?? "";
const TABLE_IDS = process.env["TUIO_TABLE_IDS"] ?? "";
if (TABLE_IDS !== "" && !/^\d+(,\d+)*$/u.test(TABLE_IDS)) {
  throw new Error(
    `TUIO_TABLE_IDS is the ids of the markers of the table, like 1,3,5,6,11,12,21, `
    + `got "${TABLE_IDS}".`);
}

const proxy: Record<string, ProxyOptions> = {
  "/simulator": {
    target: `http://${SIMULATOR_PAGE}`,
    ws: true,
    // The simulator serves its page at the root of its own port, and the control socket of the
    // page is `/control` beside it.
    rewrite: path => path.replace(/^\/simulator/, "") || "/",
  },
  "/tuio": {
    target: `ws://${TRACKER_URL.host}`,
    ws: true,
    // The path of the tracker itself, which is a path of its own for a tracker behind a server
    // of someone else and `/` for one which listens on a port.
    rewrite: () => TRACKER_URL.pathname,
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
  plugins: [simulatorSlash(), dataNotFound()],
  resolve: {
    alias: {
      // `tuio-client` declares itself an ES module but points `main` at its CommonJS bundle.
      "tuio-client": "tuio-client/dist/tuio-client.es.js",
    },
  },
  define: {
    __TABLE_VERSION__: JSON.stringify(VERSION),
    __TABLE_TRACKER__: JSON.stringify(TABLE_TRACKER),
    __TABLE_IDS__: JSON.stringify(TABLE_IDS),
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
