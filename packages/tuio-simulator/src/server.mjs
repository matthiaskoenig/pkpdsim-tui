#!/usr/bin/env node
/**
 * The TUIO 2.0 simulator: a tracker a table application can be pointed at, driven from a page
 * instead of from a table.
 *
 * A browser cannot listen on a socket, so the simulator is two halves that meet here. The
 * tracker half is a WebSocket server on the TUIO port, which broadcasts a bundle per frame to
 * every application that connects and never reads anything from them, because the protocol is
 * one way. The control half is the page this process serves over plain HTTP, which connects back
 * on `/control` and sends the state of its surface as JSON.
 *
 * Run it with `npm run simulator`. The flags are `--port`, `--host`, `--page-port` and `--rate`.
 */

import {readFile} from "node:fs/promises";
import {createServer} from "node:http";
import {extname, join, resolve, sep} from "node:path";
import {fileURLToPath} from "node:url";
import {WebSocket, WebSocketServer} from "ws";

import {DEFAULT_SOURCE, oscTimetag, packFrame} from "./frame.mjs";
import {createSessionIds} from "./sessions.mjs";
import {emptySurface, frameOf, normalizeSurface} from "./surface.mjs";

/** The WebSocket port of the tracker. 3333 is the UDP port of TUIO and is never this one. */
const DEFAULT_PORT = 3343;

/** The port the control page is served on. */
const DEFAULT_PAGE_PORT = 3344;

/** Frames per second of a surface nobody is touching. */
const DEFAULT_RATE = 60;

/** The close code of a control page that another control page replaced. */
const TAKEN_OVER = 4000;

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const PAGE_ROOT = join(ROOT, "public");
const SHARED_ROOT = join(ROOT, "src");
const SHARED_PREFIX = "/shared/";

const CONTENT_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

const USAGE = `The TUIO 2.0 simulator of pkpdsim-tui.

  npm run simulator -- [options]

  --host <host>       the interface both servers listen on (default localhost)
  --port <port>       the WebSocket port of the tracker (default ${DEFAULT_PORT})
  --page-port <port>  the HTTP port of the control page (default ${DEFAULT_PAGE_PORT})
  --rate <hz>         frames per second (default ${DEFAULT_RATE})
  --help              this text
`;

function parseOptions(argv) {
  const options = {
    host: "localhost", port: DEFAULT_PORT, pagePort: DEFAULT_PAGE_PORT, rate: DEFAULT_RATE,
    help: false,
  };
  const numbers = {"--port": "port", "--page-port": "pagePort", "--rate": "rate"};
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === "--help" || flag === "-h") {
      options.help = true;
    } else if (flag === "--host") {
      index += 1;
      options.host = argv[index] ?? options.host;
    } else if (flag in numbers) {
      index += 1;
      const value = Number(argv[index]);
      if (!Number.isFinite(value) || value <= 0) throw new Error(`${flag} needs a positive number, got "${argv[index]}".`);
      options[numbers[flag]] = value;
    } else {
      throw new Error(`Unknown option "${flag}". Try --help.`);
    }
  }
  return options;
}

/** The file a request asks for, or null when it asks for something outside the two roots. */
function fileOf(url) {
  const path = decodeURIComponent(new URL(url, "http://localhost").pathname);
  const shared = path.startsWith(SHARED_PREFIX);
  const root = shared ? SHARED_ROOT : PAGE_ROOT;
  const relative = shared ? path.slice(SHARED_PREFIX.length) : path.slice(1);
  const file = resolve(root, relative === "" ? "index.html" : relative);
  if (file !== root && !file.startsWith(root + sep)) return null;
  if (!(extname(file) in CONTENT_TYPES)) return null;
  return file;
}

async function serveFile(request, response) {
  const file = fileOf(request.url ?? "/");
  if (file === null) {
    response.writeHead(404, {"content-type": "text/plain; charset=utf-8"});
    response.end("Not found.\n");
    return;
  }
  try {
    const body = await readFile(file);
    response.writeHead(200, {
      "content-type": CONTENT_TYPES[extname(file)],
      // The page and its modules are edited while the simulator runs.
      "cache-control": "no-store",
    });
    response.end(body);
  } catch {
    response.writeHead(404, {"content-type": "text/plain; charset=utf-8"});
    response.end("Not found.\n");
  }
}

/**
 * The server once it listens, or the reason it never will. A port that is taken is the one
 * failure that happens every day, so it says what to do about it.
 */
function listening(server, what, host, port) {
  return new Promise((done, failed) => {
    const onError = error => {
      server.off("listening", onListening);
      failed(error.code === "EADDRINUSE"
        ? new Error(`${what} cannot listen on ${host}:${port}: the port is taken. `
          + "Another simulator, a tracker or the Unity simulator may already be running, "
          + "or pass another port.")
        : error);
    };
    const onListening = () => {
      server.off("error", onError);
      done(undefined);
    };
    server.once("error", onError);
    server.once("listening", onListening);
  });
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(USAGE);
    return;
  }

  const sessions = createSessionIds();
  const interval = 1000 / options.rate;
  let surface = emptySurface();
  let frameId = 0;
  let lastFrame = 0;
  let coalesced = null;
  let ticker = null;

  const trackers = new WebSocketServer({host: options.host, port: options.port});
  const trackersReady = listening(trackers, "The tracker", options.host, options.port);
  const pageServer = createServer((request, response) => {
    serveFile(request, response).catch(error => {
      process.stderr.write(`The control page could not be served: ${String(error)}\n`);
      response.destroy();
    });
  });
  const controls = new WebSocketServer({server: pageServer, path: "/control"});
  let driver = null;

  // While the servers bind, `listening` reports the one failure that matters, and a port that is
  // taken reaches all three of them: without a listener an error event would throw instead.
  const ignore = () => undefined;
  for (const server of [trackers, controls, pageServer]) server.on("error", ignore);

  /** What the control page shows about the tracker: who is listening and how far it has counted. */
  const announce = () => {
    if (driver === null || driver.readyState !== WebSocket.OPEN) return;
    driver.send(JSON.stringify({
      type: "status",
      trackers: trackers.clients.size,
      frameId,
      rate: options.rate,
      source: `ws://${options.host}:${options.port}`,
      sessions: sessions.entries(),
    }));
  };

  const emit = () => {
    if (coalesced !== null) {
      clearTimeout(coalesced);
      coalesced = null;
    }
    if (ticker !== null) clearTimeout(ticker);
    // A client takes a frame only when its id is greater than the one before, so the counter
    // runs on whether anybody is listening or not.
    frameId += 1;
    lastFrame = Date.now();
    const frame = frameOf(surface, sessions, {
      frameId, time: oscTimetag(lastFrame), source: DEFAULT_SOURCE,
    });
    if (trackers.clients.size > 0) {
      const bytes = packFrame(frame);
      for (const client of trackers.clients) {
        if (client.readyState === WebSocket.OPEN) client.send(bytes, {binary: true});
      }
    }
    ticker = setTimeout(emit, interval);
  };

  /**
   * A frame carries the change at once, which is what makes a dial follow a hand, but never more
   * often than the frame rate: a mouse that reports faster than the tracker would otherwise
   * raise the rate of the whole stream.
   */
  const changed = () => {
    const due = lastFrame + interval - Date.now();
    if (due <= 0) {
      emit();
    } else if (coalesced === null) {
      coalesced = setTimeout(emit, due);
    }
  };

  trackers.on("connection", socket => {
    process.stdout.write(`A table application connected. Listening: ${trackers.clients.size}.\n`);
    socket.on("close", () => {
      process.stdout.write(`A table application left. Listening: ${trackers.clients.size}.\n`);
      announce();
    });
    socket.on("error", () => socket.terminate());
    // A client that arrives in the middle of a frame should not wait for the next one.
    changed();
    announce();
  });
  controls.on("connection", socket => {
    if (driver !== null) {
      driver.close(TAKEN_OVER, "Another control page connected.");
    }
    driver = socket;
    process.stdout.write("The control page connected.\n");
    socket.on("message", data => {
      let message = null;
      try {
        message = JSON.parse(String(data));
      } catch {
        return;
      }
      if (socket !== driver || message?.type !== "surface") return;
      surface = normalizeSurface(message);
      changed();
    });
    socket.on("close", () => {
      if (socket !== driver) return;
      driver = null;
      // The surface of a page that is gone is an empty table, not the last thing it said.
      surface = {...surface, tokens: [], pointers: []};
      sessions.clear();
      process.stdout.write("The control page left. The surface is empty.\n");
      changed();
    });
    socket.on("error", () => socket.terminate());
    announce();
  });

  const pageReady = listening(pageServer, "The control page", options.host, options.pagePort);
  pageServer.listen(options.pagePort, options.host);
  const started = await Promise.allSettled([trackersReady, pageReady]);
  const refused = started.find(result => result.status === "rejected");
  if (refused !== undefined) {
    trackers.close();
    controls.close();
    pageServer.close();
    throw refused.reason;
  }

  for (const server of [trackers, controls, pageServer]) {
    server.off("error", ignore);
    server.on("error", error => process.stderr.write(`The simulator hit an error: ${String(error)}\n`));
  }

  process.stdout.write(
    `The TUIO 2.0 simulator is a tracker on ws://${options.host}:${options.port}, at `
    + `${options.rate} Hz.\nThe control page is on http://${options.host}:${options.pagePort}\n`
    + `Point an application at it with ?tuio=${options.host}:${options.port}\n`,
  );

  emit();
  const heartbeat = setInterval(announce, 500);

  const stop = () => {
    clearInterval(heartbeat);
    if (ticker !== null) clearTimeout(ticker);
    if (coalesced !== null) clearTimeout(coalesced);
    // Closing a server leaves the sockets it accepted open, which would keep the process alive.
    for (const client of [...trackers.clients, ...controls.clients]) client.terminate();
    trackers.close();
    controls.close();
    pageServer.close();
  };
  process.on("SIGINT", () => {
    process.stdout.write("\nThe simulator stops.\n");
    stop();
  });
  process.on("SIGTERM", stop);
}

main().catch(error => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
