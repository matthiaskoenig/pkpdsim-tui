#!/usr/bin/env node
/**
 * Both apps of this repository, which is a table on a laptop.
 *
 * They are two apps and they stay two apps: the simulator is a tracker and the surface which
 * drives it, the table is the application and the tracker it listens to, and neither is served
 * by the other. This starts one of each and points the table at the tracker of the simulator,
 * which is the setup of a real table with the glass replaced by a page:
 *
 *   http://localhost:5173/   the table: the body, and a table with `?app=`
 *   http://localhost:3344/   the simulator: the surface, with the table under it
 *   ws://localhost:3333      the tracker itself, which the table reaches at `/tuio`
 *
 * Either app runs on its own when that is what is wanted: `npm run table` is the table alone,
 * with the tracker and the pucks of a booth, and `npm run simulator` is the simulator alone,
 * which drives the table of another machine or an application of somebody else.
 *
 * Usage:
 *   npm run dev [-- <options>]
 *
 *   --app <id>         print the address of one table, e.g. cardiovascular
 *   --port <port>      the port of the table (default 5173)
 *   --host <host>      open both to the network (default: this machine only)
 *   --page-port <port> the page of the simulator (default 3344)
 *   --tuio-port <port> the tracker of the simulator (default 3333)
 *   --preview          the built table instead of the development server
 *   --help             this text
 */

import {spawn} from "node:child_process";
import {dirname, join, resolve} from "node:path";
import {fileURLToPath} from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const DEFAULTS = {
  port: 5173, pagePort: 3344, tuioPort: 3333, app: "", host: "localhost", preview: false,
};

/** Whether an address is this machine, which is where both apps stay unless they are sent out. */
function loopback(host) {
  return host === "localhost" || host === "::1" || /^127(\.\d{1,3}){3}$/u.test(host);
}

/** How long the banner waits for the table before it prints anyway. */
const READY_TIMEOUT = 20000;

function usage() {
  const text = [
    "Both apps of this repository: the simulator, and the table pointed at it.",
    "",
    "  npm run dev [-- <options>]",
    "",
    "  --app <id>         print the address of one table (default: the body)",
    `  --port <port>      the port of the table (default ${DEFAULTS.port})`,
    `  --host <host>      open both to the network (default ${DEFAULTS.host}, this machine only)`,
    `  --page-port <port> the page of the simulator (default ${DEFAULTS.pagePort})`,
    `  --tuio-port <port> the tracker of the simulator (default ${DEFAULTS.tuioPort})`,
    "  --preview          the built table instead of the development server",
    "  --help             this text",
    "",
    "  npm run table is the table alone, with the tracker and the pucks of a booth, and",
    "  npm run simulator is the simulator alone. Each takes its own options.",
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
    } else if (flag === "--preview") {
      options.preview = true;
    } else if (flag === "--app") {
      index += 1;
      options.app = argv[index] ?? "";
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

function banner(options) {
  const table = `http://localhost:${options.port}`;
  const surface = `http://localhost:${options.pagePort}`;
  const lines = [
    "",
    `  The table            ${table}/`,
    "                       the body, and every table is opened from it",
  ];
  if (options.app !== "") {
    lines.push(`  ${options.app.padEnd(20).slice(0, 20)} ${table}/?app=${options.app}`);
  }
  lines.push(
    `  The simulator        ${surface}/`,
    "                       the surface which drives it, with the table under it",
  );
  if (options.app !== "") {
    lines.push(`                       ${surface}/?table=${options.app}`);
  }
  lines.push(
    `  The tracker          ws://localhost:${options.tuioPort}`,
    `                       of the simulator, which the table carries at ${table}/tuio`,
    `  Over ssh             ssh -L ${options.port}:localhost:${options.port} `
      + `-L ${options.pagePort}:localhost:${options.pagePort} <machine>`,
    "                       one port for each app, because they are two apps",
  );
  if (!loopback(options.host)) {
    lines.push(
      `  On the network       both listen on ${options.host} and ask for no password`,
      "                       anyone who reaches them can drive the table",
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

  const simulator = spawn(process.execPath, [
    join(root, "packages", "tuio-simulator", "src", "server.mjs"),
    "--page-port", String(options.pagePort), "--port", String(options.tuioPort),
    // The table this simulator drives, which its page opens under the surface. It is an app of
    // its own on a port of its own, so the simulator is told where it is rather than serving it.
    "--table", `http://localhost:${options.port}/`,
    ...(loopback(options.host) ? [] : ["--host", options.host, "--allow-origin", "*"]),
  ], {cwd: root, stdio: ["ignore", "pipe", "pipe"]});
  prefixed(simulator.stdout, "simulator |", process.stdout);
  prefixed(simulator.stderr, "simulator |", process.stderr);
  simulator.on("exit", code => {
    if (!stopping) process.stderr.write(`The simulator stopped with code ${code ?? 0}.\n`);
    stop(code ?? 0);
  });
  children.push(simulator);

  // The table itself, pointed at the tracker of the simulator: the same app a booth runs, with
  // the glass of the table replaced by a page. Its banner is left out, because this command
  // prints one for both apps.
  const table = spawn(process.execPath, [
    join(root, "scripts", "table.mjs"),
    "--port", String(options.port),
    "--tuio", `127.0.0.1:${options.tuioPort}`,
    "--host", options.host,
    "--quiet",
    ...(options.app === "" ? [] : ["--app", options.app]),
    ...(options.preview ? ["--preview"] : []),
  ], {cwd: root, stdio: "inherit"});
  table.on("exit", code => stop(code ?? 0));
  children.push(table);

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
