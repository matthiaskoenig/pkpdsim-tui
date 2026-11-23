import {readFileSync} from "node:fs";
import {defineConfig} from "vite";
import type {ProxyOptions} from "vite";
import {dataNotFound} from "./data-404.ts";

/**
 * The one application: the body and every table of pkpdsim behind it, from one page.
 *
 * This is the app of the table and nothing else. The server carries the tracker of the table at
 * `/tuio`, which `npm run table -- --tuio <host:port>` names, so the application, its models and
 * the tracker are one address and one forwarded port:
 *
 *   ssh -L 5173:localhost:5173 <host>
 *
 * The simulator is an app of its own, on a port of its own, and is started with `npm run
 * simulator`. It is not served from here: a table of an exhibition carries no simulator, so
 * neither does the server of a table.
 */
/**
 * Which interface the server listens on. It stays on this machine unless it is sent out with
 * `npm run table -- --host`: the proxy below carries the tracker of the table with it, and that
 * asks for no password, so a table on the network of an exhibition would hand it to everybody
 * on it.
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

/**
 * The tracker this server carries at `/tuio`, which `npm run table -- --tuio 10.0.0.20:3343`
 * names: the real table at an exhibition, and the tracker of the simulator where `npm run dev`
 * started one beside this server. It is `host:port`, or a whole `ws://host:port/path` for a
 * tracker which listens under a path of its own.
 *
 * This is the one place the tracker of a table is said. A page which was not told about one
 * finds it here, so every page of the table is driven by it and no address of one carries a
 * machine: the page a visitor is handed, the page a table opens again, and a page somebody
 * typed all reach the same tracker. A server which was given none carries none, and its pages
 * are driven by the mouse.
 */
const TUIO_TRACKER = process.env["TUIO_TRACKER"] ?? "";
const TRACKER_URL = TUIO_TRACKER === "" ? null : new URL(
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

const proxy: Record<string, ProxyOptions> = TRACKER_URL === null ? {} : {
  "/tuio": {
    target: `ws://${TRACKER_URL.host}`,
    ws: true,
    // The path of the tracker itself, which is a path of its own for a tracker behind a server
    // of someone else and `/` for one which listens on a port.
    rewrite: () => TRACKER_URL.pathname,
  },
};

export default defineConfig({
  // The page is served from a file path on the machine that drives the table as often as from a
  // server, so every asset is referenced relatively.
  base: "./",
  plugins: [dataNotFound()],
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
