#!/usr/bin/env node
/**
 * The TUIO simulator: a tracker a table application can be pointed at, driven from a page
 * instead of from a table.
 *
 * A browser cannot listen on a socket, so the simulator is two halves that meet here. The
 * tracker half sends a bundle per frame, as TUIO 2.0 or TUIO 1.1, over a WebSocket port
 * applications connect to or to a UDP address nobody connects to. The control half is the page
 * this process serves over plain HTTP, which connects back on `/control`, sends the state of its
 * surface as JSON and may change what the tracker speaks and where, so that a version, a
 * transport or a port is tried without restarting anything.
 *
 * Run it with `npm run simulator`. The flags are below, and every one of them is a starting
 * value the control page can change.
 */

import {readFile} from "node:fs/promises";
import {createServer} from "node:http";
import {extname, join, resolve, sep} from "node:path";
import {fileURLToPath} from "node:url";
import {WebSocket, WebSocketServer} from "ws";

import {DEFAULT_SOURCE, oscTimetag, packFrame} from "./frame.mjs";
import {
  DEFAULT_PAGE_PORT, DEFAULT_SETTINGS, describeTracker, loopback, normalizeSettings,
  originAllowed, sameTracker, TRANSPORTS, TUIO_VERSIONS,
} from "./protocol.mjs";
import {createSessionIds} from "./sessions.mjs";
import {emptySurface, frameOf, normalizeSurface} from "./surface.mjs";
import {createTracker} from "./tracker.mjs";

/** Frames per second of a surface nobody is touching. */
const DEFAULT_RATE = 60;

/**
 * The table this simulator drives, which its page opens under the surface.
 *
 * The table is an app of its own, on a port of its own, so the simulator is told where it is
 * rather than serving it. It is the address a page is allowed to open by itself: `?table=` of
 * the page names a table of this one, and anything else has to be typed into the field above
 * the surface, so a link somebody was sent cannot put a page of its choosing under the glass.
 */
const DEFAULT_TABLE = "http://localhost:5173/";

/** The close code of a control page that another control page replaced. */
const TAKEN_OVER = 4000;

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const PAGE_ROOT = join(ROOT, "public");
const SHARED_ROOT = join(ROOT, "src");
const SHARED_PREFIX = "/shared/";
/**
 * The surface draws the objects of a table as the things they stand for, which is the picture
 * the table itself draws: the plain JavaScript of the kit, which both of them read.
 */
const KIT_ROOT = resolve(ROOT, "..", "tui-kit", "src");
const KIT_PREFIX = "/kit/";

const CONTENT_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

const USAGE = `The TUIO simulator of pkpdsim-tui.

  npm run simulator                                      the simulator, as it is
  node packages/tuio-simulator/src/server.mjs <options>  with options, said directly

  --host <host>       the interface both servers listen on (default ${DEFAULT_SETTINGS.host})
  --port <port>       the TUIO port of the tracker (default ${DEFAULT_SETTINGS.port})
  --tuio <version>    ${TUIO_VERSIONS.join(" or ")} (default ${DEFAULT_SETTINGS.version})
  --transport <kind>  ${TRANSPORTS.join(" or ")} (default ${DEFAULT_SETTINGS.transport})
  --page-port <port>  the HTTP port of the control page (default ${DEFAULT_PAGE_PORT})
  --rate <hz>         frames per second (default ${DEFAULT_RATE})
  --table <url>       the table this simulator drives (default ${DEFAULT_TABLE})
  --allow-origin <o>  one more page which may drive the simulator, repeatable ("*" for any)
  --help              this text

The control page changes the version, the transport and the port while the simulator runs.
`;

function parseOptions(argv) {
  const options = {
    ...DEFAULT_SETTINGS, pagePort: DEFAULT_PAGE_PORT, rate: DEFAULT_RATE, help: false,
    table: DEFAULT_TABLE, allowOrigin: [],
  };
  const numbers = {"--port": "port", "--page-port": "pagePort", "--rate": "rate"};
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === "--help" || flag === "-h") {
      options.help = true;
    } else if (flag === "--host") {
      index += 1;
      options.host = argv[index] ?? options.host;
    } else if (flag === "--table") {
      index += 1;
      const value = (argv[index] ?? "").trim();
      let address = null;
      try {
        address = new URL(value);
      } catch {
        address = null;
      }
      if (address === null || !/^https?:$/u.test(address.protocol)) {
        throw new Error(`${flag} is the address of a table, like ${DEFAULT_TABLE}, got "${value}".`);
      }
      options.table = address.href;
    } else if (flag === "--allow-origin") {
      index += 1;
      const value = argv[index] ?? "";
      if (value === "") throw new Error(`${flag} needs the origin of a page, like http://table.local:5173.`);
      options.allowOrigin.push(value);
    } else if (flag === "--tuio" || flag === "--version") {
      index += 1;
      const value = argv[index] ?? "";
      if (!TUIO_VERSIONS.includes(value)) throw new Error(`${flag} is ${TUIO_VERSIONS.join(" or ")}, got "${value}".`);
      options.version = value;
    } else if (flag === "--transport") {
      index += 1;
      const value = argv[index] ?? "";
      if (!TRANSPORTS.includes(value)) throw new Error(`${flag} is ${TRANSPORTS.join(" or ")}, got "${value}".`);
      options.transport = value;
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
  const kit = path.startsWith(KIT_PREFIX);
  const root = shared ? SHARED_ROOT : kit ? KIT_ROOT : PAGE_ROOT;
  const relative = shared
    ? path.slice(SHARED_PREFIX.length)
    : kit ? path.slice(KIT_PREFIX.length) : path.slice(1);
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
      // The page embeds the application it drives, which is served from another port.
      "cross-origin-opener-policy": "same-origin-allow-popups",
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
  let settings = normalizeSettings(options);
  let surface = emptySurface();
  let tracker = null;
  let trouble = "";
  let frameId = 0;
  let lastFrame = 0;
  let coalesced = null;
  let ticker = null;
  let driver = null;

  const log = text => process.stdout.write(`${text}\n`);

  const pageServer = createServer((request, response) => {
    serveFile(request, response).catch(error => {
      process.stderr.write(`The control page could not be served: ${String(error)}\n`);
      response.destroy();
    });
  });
  const controls = new WebSocketServer({
    server: pageServer, path: "/control",
    verifyClient: ({origin}) => {
      if (originAllowed(origin, options.allowOrigin)) return true;
      log(`A control page from ${origin} was turned away. Allow it with --allow-origin.`);
      return false;
    },
  });

  /** What the control page shows about the tracker: what it speaks, who hears it, how far it counted. */
  const announce = () => {
    if (driver === null || driver.readyState !== WebSocket.OPEN) return;
    driver.send(JSON.stringify({
      type: "status",
      settings,
      // Where the table is. The page of a simulator opens it under the surface, and a table
      // which is somewhere else is this one flag rather than an address in every link.
      table: options.table,
      transport: tracker?.kind ?? settings.transport,
      trackers: tracker?.listeners ?? null,
      source: tracker?.url ?? "",
      description: describeTracker(settings),
      trouble,
      frameId,
      rate: options.rate,
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
    if (tracker !== null && tracker.wants) tracker.send(packFrame(frame, settings.version));
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

  const hooks = {
    onChange: announce,
    onLog: log,
  };

  /**
   * The tracker of `next`, in place of the one that is running. A transport that cannot open,
   * which is a port that is taken, leaves the old one in place and is reported to the page: the
   * surface on the table does not go down because somebody typed a port.
   */
  const openTracker = async next => {
    const candidate = createTracker(next, hooks);
    if (candidate.server !== null) {
      const ignore = () => undefined;
      candidate.server.on("error", ignore);
      try {
        await listening(candidate.server, "The tracker", next.host, next.port);
      } catch (error) {
        candidate.close();
        throw error;
      }
      candidate.server.off("error", ignore);
      candidate.server.on("error", error => process.stderr.write(`The tracker hit an error: ${String(error)}\n`));
    }
    if (tracker !== null) tracker.close();
    tracker = candidate;
    settings = next;
    trouble = "";
    // A client that arrives in the middle of a frame should not wait for the next one.
    changed();
    announce();
  };

  /** The settings the page asks for, which only restart the tracker when they move it. */
  const apply = async raw => {
    const next = normalizeSettings(raw, settings);
    const moved = !sameTracker(next, settings);
    if (!moved) {
      settings = next;
      trouble = "";
      log(`The tracker now speaks ${describeTracker(settings)}.`);
      changed();
      announce();
      return;
    }
    try {
      await openTracker(next);
      log(`The tracker is now ${describeTracker(settings)}.`);
    } catch (error) {
      trouble = error instanceof Error ? error.message : String(error);
      process.stderr.write(`${trouble}\n`);
      announce();
    }
  };

  controls.on("connection", socket => {
    if (driver !== null) {
      driver.close(TAKEN_OVER, "Another control page connected.");
    }
    driver = socket;
    log("The control page connected.");
    socket.on("message", data => {
      let message = null;
      try {
        message = JSON.parse(String(data));
      } catch {
        return;
      }
      if (socket !== driver) return;
      if (message?.type === "surface") {
        surface = normalizeSurface(message);
        changed();
      } else if (message?.type === "settings") {
        apply(message.settings).catch(error => process.stderr.write(`${String(error)}\n`));
      }
    });
    socket.on("close", () => {
      if (socket !== driver) return;
      driver = null;
      // The surface of a page that is gone is an empty table, not the last thing it said.
      surface = {...surface, tokens: [], pointers: []};
      sessions.clear();
      log("The control page left. The surface is empty.");
      changed();
    });
    socket.on("error", () => socket.terminate());
    announce();
  });

  // While the page server binds, `listening` reports the one failure that matters: without a
  // listener an error event would throw instead.
  const ignore = () => undefined;
  for (const server of [controls, pageServer]) server.on("error", ignore);
  const pageReady = listening(pageServer, "The control page", settings.host, options.pagePort);
  pageServer.listen(options.pagePort, settings.host);
  try {
    await pageReady;
    await openTracker(settings);
  } catch (error) {
    controls.close();
    pageServer.close();
    if (tracker !== null) tracker.close();
    throw error;
  }
  for (const server of [controls, pageServer]) {
    server.off("error", ignore);
    server.on("error", error => process.stderr.write(`The simulator hit an error: ${String(error)}\n`));
  }

  log(`The simulator is a tracker: ${describeTracker(settings)}, at ${options.rate} Hz.`);
  log(`The control page is on http://${settings.host}:${options.pagePort}`);
  if (!loopback(settings.host)) {
    log(`Anyone who reaches ${settings.host} can drive this simulator: it asks for no password.`);
  }
  log(`Point an application at it with ?tuio=${settings.host}:${settings.port}`);

  emit();
  const heartbeat = setInterval(announce, 500);

  const stop = () => {
    clearInterval(heartbeat);
    if (ticker !== null) clearTimeout(ticker);
    if (coalesced !== null) clearTimeout(coalesced);
    // Closing a server leaves the sockets it accepted open, which would keep the process alive.
    for (const client of controls.clients) client.terminate();
    if (tracker !== null) tracker.close();
    controls.close();
    pageServer.close();
  };
  process.on("SIGINT", () => {
    log("\nThe simulator stops.");
    stop();
  });
  process.on("SIGTERM", stop);
}

main().catch(error => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
