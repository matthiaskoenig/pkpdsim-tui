#!/usr/bin/env node
/**
 * Copies the exported models, runtimes and reference data of a pkpdsim checkout into the assets
 * of the table applications.
 *
 * The exports are generated in pkpdsim itself, by `scripts/cardiovascular_examples.py` and
 * `scripts/lobes_examples.py`, and are the only place the models come from: a table application
 * holds no equations of its own. The copies are gitignored, so a clone stays small and this
 * script restores them. The proper home of this export is a pkpdsim command; until that exists,
 * the checkout is read directly.
 *
 * Usage:
 *   node scripts/sync-assets.mjs [--pkpdsim <path>] [--app <name>] [--list]
 *
 * The checkout is taken from `--pkpdsim`, then from the environment variable `PKPDSIM_DIR`, then
 * from the sibling directory `../pkpdsim`.
 */

import {cp, mkdir, readdir, readFile, stat, writeFile} from "node:fs/promises";
import {execFile} from "node:child_process";
import {dirname, join, resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {promisify} from "node:util";

const run = promisify(execFile);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * What each table needs, relative to `docs/pbpk/examples` of a pkpdsim checkout. The application
 * is one page with one folder of assets per table, see `apps/table`.
 */
const APPS = {
  cardiovascular: {
    target: "apps/table/public/assets/cardiovascular",
    // The female export is the female reference circulation and the heart compiled on it. Its
    // runtime is the one of `solver`, which both bodies share.
    entries: [
      "cardiovascular-data.json", "cardiovascular-anatomy.json", "solver",
      {from: "female/cardiovascular-data.json", to: "female/cardiovascular-data.json"},
      {from: "female/solver", to: "female/solver"},
    ],
    provenanceOf: "cardiovascular-data.json",
  },
  lobes: {
    target: "apps/table/public/assets/lobes",
    // The compiled livers of `solver_lobes/<species>` share the runtime of `solver`, so only the
    // runtime is taken from there and the heart model beside it is left where it is.
    entries: [
      "lobes-data.json",
      "solver_lobes",
      {from: "solver", to: "runtime", files: ["engine.wasm", "mathlib.wasm", "sbmlsim-core.js", "LICENSE", "THIRD_PARTY.md"]},
      // The female export of the lobed liver is the human one; the rat and the mouse have one body.
      {from: "female/lobes-data.json", to: "female/lobes-data.json"},
      {from: "female/solver_lobes", to: "female/solver_lobes"},
    ],
    provenanceOf: "lobes-data.json",
  },
};

/** Where an entry comes from in the checkout, and what it is called in the application. */
function sourceOf(entry) {
  return typeof entry === "string" ? entry : entry.from;
}

function targetOf(entry) {
  return typeof entry === "string" ? entry : entry.to ?? entry.from;
}

function describeEntries(app) {
  return app.entries.map(entry => sourceOf(entry)).join(", ");
}

function parseArguments(argv) {
  const options = {pkpdsim: process.env.PKPDSIM_DIR ?? resolve(root, "..", "pkpdsim"), apps: [], list: false};
  for (let index = 0; index < argv.length; index++) {
    const argument = argv[index];
    if (argument === "--pkpdsim" || argument === "--app") {
      const value = argv[++index];
      if (value === undefined) throw new Error(`${argument} needs a value.`);
      if (argument === "--pkpdsim") options.pkpdsim = resolve(value);
      else options.apps.push(value);
    } else if (argument === "--list") {
      options.list = true;
    } else if (argument.startsWith("--pkpdsim=")) {
      options.pkpdsim = resolve(argument.slice("--pkpdsim=".length));
    } else if (argument.startsWith("--app=")) {
      options.apps.push(argument.slice("--app=".length));
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  if (options.apps.length === 0) options.apps = Object.keys(APPS);
  return options;
}

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function gitDescribe(directory) {
  const describe = async args => {
    try {
      const {stdout} = await run("git", ["-C", directory, ...args]);
      return stdout.trim();
    } catch {
      return "";
    }
  };
  return {
    commit: await describe(["rev-parse", "HEAD"]),
    branch: await describe(["rev-parse", "--abbrev-ref", "HEAD"]),
    dirty: (await describe(["status", "--porcelain"])) !== "",
  };
}

async function sizeOf(path) {
  const entry = await stat(path);
  if (!entry.isDirectory()) return entry.size;
  let total = 0;
  for (const child of await readdir(path, {withFileTypes: true})) {
    total += await sizeOf(join(path, child.name));
  }
  return total;
}

function megabytes(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

async function syncApp(name, examples, pkpdsim) {
  const app = APPS[name];
  if (app === undefined) {
    throw new Error(`Unknown application "${name}". Known: ${Object.keys(APPS).join(", ")}.`);
  }
  const missing = [];
  for (const entry of app.entries) {
    if (!(await exists(join(examples, sourceOf(entry))))) missing.push(sourceOf(entry));
  }
  if (missing.length === app.entries.length) {
    console.log(`  ${name}: skipped, the checkout has no ${missing.join(", ")}`);
    return false;
  }
  if (missing.length > 0) {
    throw new Error(
      `The checkout has an incomplete export for ${name}: ${missing.join(", ")} missing. `
      + `Generate it in pkpdsim with "uv run python scripts/${name}_examples.py".`,
    );
  }
  const target = resolve(root, app.target);
  await mkdir(target, {recursive: true});
  let bytes = 0;
  for (const entry of app.entries) {
    const from = join(examples, sourceOf(entry));
    const into = join(target, targetOf(entry));
    if (typeof entry !== "string" && entry.files !== undefined) {
      await mkdir(into, {recursive: true});
      for (const file of entry.files) {
        await cp(join(from, file), join(into, file), {force: true});
        bytes += await sizeOf(join(from, file));
      }
      continue;
    }
    await cp(from, into, {recursive: true, force: true});
    bytes += await sizeOf(from);
  }
  const data = JSON.parse(await readFile(join(examples, app.provenanceOf), "utf8"));
  await writeFile(
    join(target, "provenance.json"),
    `${JSON.stringify({
      synced_at: new Date().toISOString(),
      pkpdsim: {path: pkpdsim, ...(await gitDescribe(pkpdsim))},
      entries: app.entries.map(entry => targetOf(entry)),
      data_provenance: data.provenance ?? null,
      schema_version: data.schema_version ?? null,
    }, null, 2)}\n`,
  );
  console.log(`  ${name}: ${describeEntries(app)} (${megabytes(bytes)}) into ${app.target}`);
  return true;
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.list) {
    for (const [name, app] of Object.entries(APPS)) {
      console.log(`${name}: ${describeEntries(app)} -> ${app.target}`);
    }
    return;
  }
  const examples = join(options.pkpdsim, "docs", "pbpk", "examples");
  if (!(await exists(examples))) {
    throw new Error(
      `No pkpdsim checkout at ${options.pkpdsim} (looked for ${examples}). `
      + "Pass --pkpdsim <path> or set PKPDSIM_DIR.",
    );
  }
  const git = await gitDescribe(options.pkpdsim);
  console.log(`pkpdsim: ${options.pkpdsim}${git.commit ? ` at ${git.commit.slice(0, 8)}` : ""}`
    + `${git.branch ? ` (${git.branch}${git.dirty ? ", modified" : ""})` : ""}`);
  let synced = 0;
  for (const name of options.apps) {
    if (await syncApp(name, examples, options.pkpdsim)) synced++;
  }
  if (synced === 0) throw new Error("Nothing was synced. The checkout holds no exported examples.");
}

try {
  await main();
} catch (error) {
  console.error(`sync-assets: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
