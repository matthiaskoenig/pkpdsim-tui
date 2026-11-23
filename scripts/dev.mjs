#!/usr/bin/env node
/**
 * The table and the surface which drives it, on one port.
 *
 * It starts two processes: the application of `apps/table`, which is the body and every table
 * behind it, and the TUIO simulator. The development server of the application carries the
 * simulator as well, so everything is reached on one port:
 *
 *   /            the application: the body, and a table with `?app=`
 *   /simulator/  the surface which drives it, with the application under it
 *   /tuio        the tracker itself, which an application is pointed at with `?tuio=/tuio`
 *
 * That is what makes a table on another machine one forwarded port:
 *
 *   ssh -L 5173:localhost:5173 <machine>
 *
 * Usage:
 *   npm run dev [-- <options>]
 *
 *   --app <id>         print the address of one table, e.g. cardiovascular
 *   --port <port>      the one port of the table (default 5173)
 *   --host <host>      open the table to the network (default: this machine only)
 *   --page-port <port> the port the simulator serves its page on (default 3344)
 *   --tuio-port <port> the port of the tracker (default 3333)
 *   --tuio <host:port> the tracker of a real table, e.g. 10.0.0.20:3343, which the server
 *                      carries at `/tuio` instead of the simulator
 *   --ids <list>       the ids the markers of the table carry, e.g. 1,3,5,6,11,12,21
 *   --no-simulator     the application alone, for a real table or another tracker
 *   --preview          the built application instead of the development server
 *   --help             this text
 */

import {spawn} from "node:child_process";
import {dirname, join, resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {binScript} from "./bin.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const DEFAULTS = {
  port: 5173, pagePort: 3344, tuioPort: 3333, app: "", host: "localhost", ids: "", tuio: "",
  simulator: true, preview: false,
};

/** Whether an address is this machine, which is where the table stays unless it is sent out. */
function loopback(host) {
  return host === "localhost" || host === "::1" || /^127(\.\d{1,3}){3}$/u.test(host);
}

/** How long the banner waits for the server before it prints anyway. */
const READY_TIMEOUT = 20000;

function usage() {
  const text = [
    "The table and the surface which drives it, on one port.",
    "",
    "  npm run dev [-- <options>]",
    "",
    `  --app <id>         print the address of one table (default: the body)`,
    `  --port <port>      the one port of the table (default ${DEFAULTS.port})`,
    `  --host <host>      open the table to the network (default ${DEFAULTS.host}, this machine only)`,
    `  --page-port <port> the page of the simulator (default ${DEFAULTS.pagePort})`,
    `  --tuio-port <port> the tracker of the simulator (default ${DEFAULTS.tuioPort})`,
    "  --tuio <host:port> the tracker of a real table, e.g. 10.0.0.20:3343. The server carries",
    "                     it at /tuio, so every page of the table reaches it and no address",
    "                     has to name it. The simulator is not needed with one",
    "  --ids <list>       the ids the markers of the table carry, e.g. 1,3,5,6,11,12,21",
    "  --no-simulator     the application alone, for a real table or another tracker",
    "  --preview          the built application instead of the development server",
    "  --help             this text",
    "",
  ];
  process.stdout.write(`${text.join("\n")}\n`);
}

function parseOptions(argv) {
  const options = {...DEFAULTS};
  const numbers = {"--port": "port", "--page-port": "pagePort", "--tuio-port": "tuioPort"};
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === "--help" || flag === "-h") {
      options.help = true;
    } else if (flag === "--no-simulator") {
      options.simulator = false;
    } else if (flag === "--preview") {
      options.preview = true;
    } else if (flag === "--app") {
      index += 1;
      options.app = argv[index] ?? "";
    } else if (flag === "--tuio") {
      // The tracker of a real table: its own WebSocket, which the server of the page carries at
      // `/tuio` in place of the simulator. It is said here and nowhere else, so every page of
      // the table talks to the same tracker and no address of one has to name it.
      index += 1;
      const value = (argv[index] ?? "").trim();
      if (!/^[A-Za-z0-9._:/-]+$/u.test(value)) {
        throw new Error(`--tuio is the address of a tracker, like 10.0.0.20:3343, got "${value}".`);
      }
      options.tuio = value;
    } else if (flag === "--ids") {
      // The ids of the markers of a real table, which the address of the page carries. They are
      // read here as well so a list which is not one is said at the prompt rather than on the
      // glass, see `markers.ts` of `@pkpdsim-tui/tuio-input`.
      index += 1;
      const value = (argv[index] ?? "").trim();
      if (!/^\d+(,\d+)*$/u.test(value)) {
        throw new Error(`--ids is the ids of the markers, like 1,3,5,6,11,12,21, got "${value}".`);
      }
      options.ids = value;
    } else if (flag === "--host") {
      // `--host` on its own is every interface, which is what vite means by it as well.
      const next = argv[index + 1];
      if (next === undefined || next.startsWith("--")) {
        options.host = "0.0.0.0";
      } else {
        index += 1;
        options.host = next;
      }
    } else if (flag in numbers) {
      index += 1;
      const value = Number(argv[index]);
      if (!Number.isInteger(value) || value <= 0 || value > 65535) {
        throw new Error(`${flag} needs a port, got "${argv[index]}".`);
      }
      options[numbers[flag]] = value;
    } else {
      throw new Error(`Unknown option "${flag}". Try --help.`);
    }
  }
  return options;
}

/** The server, once it answers, or nothing when it never does. */
async function waitForServer(url, until) {
  while (Date.now() < until) {
    try {
      await fetch(url, {method: "GET"});
      return true;
    } catch {
      await new Promise(done => setTimeout(done, 150));
    }
  }
  return false;
}

/**
 * The address to open. The tracker of the table and the ids of its markers are not in it: they
 * are said once, to the server, which gives them to every page it serves, so the address of a
 * booth is the address of the application and nothing else - the page a visitor is handed, the
 * page a table opens again and a page somebody typed are all the same table.
 */
function address(base, options, app = "") {
  return `${base}/${app === "" ? "" : `?app=${app}`}`;
}

function banner(options) {
  const base = `http://localhost:${options.port}`;
  const lines = [
    "",
    `  The table            ${address(base, options)}`,
    "                       the body, and every table is opened from it",
  ];
  if (options.app !== "") {
    lines.push(`  ${options.app.padEnd(20).slice(0, 20)} ${address(base, options, options.app)}`);
  }
  if (options.simulator) {
    lines.push(
      `  The surface over it  ${base}/simulator/`,
      "                       the simulator, with the application under it",
    );
    if (options.app !== "") {
      lines.push(
        `                       ${address(`${base}/simulator`, options, options.app)
          .replace("?app=", "?table=")}`);
    }
  }
  if (options.tuio !== "") {
    lines.push(
      `  The tracker          ${options.tuio}`,
      `                       the table itself, carried at ${base}/tuio: every`,
      "                       page above is driven by it, with nothing in its address",
    );
  }
  if (options.ids !== "") {
    lines.push(
      `  The objects          ${options.ids}`,
      "                       the ids of the markers of this table, in the order the",
      "                       objects of a table are picked up",
    );
  }
  lines.push(
    `  Over ssh             ssh -L ${options.port}:localhost:${options.port} <machine>`,
    "                       one port carries the table, the surface and the tracker",
  );
  if (!loopback(options.host)) {
    lines.push(
      `  On the network       the table listens on ${options.host} and asks for no password`,
      "                       anyone who reaches it can drive the table and the simulator",
    );
  }
  lines.push("");
  process.stdout.write(`${lines.join("\n")}\n`);
}

function prefixed(stream, label, to) {
  let rest = "";
  stream.setEncoding("utf8");
  stream.on("data", chunk => {
    const lines = `${rest}${chunk}`.split("\n");
    rest = lines.pop() ?? "";
    for (const line of lines) to.write(`${label} ${line}\n`);
  });
  stream.on("end", () => {
    if (rest !== "") to.write(`${label} ${rest}\n`);
  });
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  if (options.help) {
    usage();
    return;
  }

  const children = [];
  let stopping = false;

  const stop = code => {
    if (stopping) return;
    stopping = true;
    for (const child of children) child.kill("SIGTERM");
    process.exitCode = code;
  };

  if (options.simulator) {
    const simulator = spawn(process.execPath, [
      join(root, "packages", "tuio-simulator", "src", "server.mjs"),
      "--page-port", String(options.pagePort), "--port", String(options.tuioPort),
      // The simulator only lets pages of this machine drive it. A table which was opened to the
      // network is reached under an address of the network, and the page of the simulator comes
      // with it through the proxy, so its origin is allowed along with the table itself.
      ...(loopback(options.host) ? [] : ["--allow-origin", "*"]),
    ], {cwd: root, stdio: ["ignore", "pipe", "pipe"]});
    prefixed(simulator.stdout, "simulator |", process.stdout);
    prefixed(simulator.stderr, "simulator |", process.stderr);
    simulator.on("exit", code => {
      if (!stopping) process.stderr.write(`The simulator stopped with code ${code ?? 0}.\n`);
      stop(code ?? 0);
    });
    children.push(simulator);
  }

  // vite is started as the script it is, with this node, like the simulator above: the shim of
  // `node_modules/.bin` is no program on Windows, see `bin.mjs` and issue #21.
  const vite = spawn(process.execPath, [
    binScript("vite", "vite"),
    ...(options.preview ? ["preview"] : []),
    "--port", String(options.port), "--strictPort",
  ], {
    cwd: join(root, "apps", "table"),
    stdio: "inherit",
    env: {
      ...process.env,
      TUIO_TABLE_HOST: options.host,
      TUIO_SIMULATOR_PAGE: `127.0.0.1:${options.pagePort}`,
      // The tracker every page of this server reaches at `/tuio`: the real table where one was
      // named, and the simulator of this machine otherwise. This is the one place either is
      // said, so a table at an exhibition is one flag and no address of it carries a machine.
      TUIO_TRACKER: options.tuio === "" ? `127.0.0.1:${options.tuioPort}` : options.tuio,
      // What the pages of this server are told about the booth they belong to: the real table
      // which drives them, which they then wait for and name, and the ids of the markers of
      // that table, which every one of them reads. Empty is a laptop and the simulator.
      TUIO_TABLE_TRACKER: options.tuio,
      TUIO_TABLE_IDS: options.ids,
    },
  });
  vite.on("exit", code => stop(code ?? 0));
  children.push(vite);

  for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => stop(0));

  if (await waitForServer(`http://127.0.0.1:${options.port}/`, Date.now() + READY_TIMEOUT)) {
    banner(options);
  }
}

try {
  await main();
} catch (error) {
  process.stderr.write(`dev: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
