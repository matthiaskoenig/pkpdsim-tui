#!/usr/bin/env node
/**
 * The resources of the table: the compiled models with their reference data, and the clips the
 * table reads aloud.
 *
 * Neither is in the repository. A compiled model is written by pkpdsim and weighs megabytes, and
 * the voice is 2253 clips of three languages, so a clone which carried them would grow by all of
 * it again at every release. They travel with a release instead, as two archives, and this is
 * what puts them where the application looks for them:
 *
 *   npm install          takes them for the release this checkout is, if they are not there
 *   npm run assets       the same, said out loud, which is what a sentence about a file which
 *                        is missing asks for
 *
 * So a table is a clone, an install and `npm run table`, with no checkout of pkpdsim beside it
 * and nothing to generate. A checkout which has pkpdsim and writes the models itself is what
 * `npm run sync` and `npm run export:*` are for, and `npm run assets:pack` packs what they
 * wrote into the archives of the next release, see `docs/development.md`.
 *
 * Usage:
 *   node scripts/assets.mjs [--version <v>] [--no-voice] [--if-missing] [--quiet]
 *   node scripts/assets.mjs check
 *   node scripts/assets.mjs pack [--out <dir>]
 */

import {createHash} from "node:crypto";
import {execFile} from "node:child_process";
import {mkdir, mkdtemp, readFile, rm, stat, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {dirname, join, resolve} from "node:path";
import {fileURLToPath, pathToFileURL} from "node:url";
import {promisify} from "node:util";

const run = promisify(execFile);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** Where the application looks for them, which is what a release carries. */
const PUBLIC = join(root, "apps", "table", "public");

/** The repository the archives of a release come from. */
const REPOSITORY = "matthiaskoenig/pkpdsim-tui";

/** The files of one compiled model, which is what a table loads before it can solve anything. */
function solver(folder) {
  return ["model.wasm", "model.json", "engine.wasm", "mathlib.wasm", "sbmlsim-core.js"]
    .map(file => `${folder}/${file}`);
}

/**
 * The two archives, and enough of what is in each to say whether it is there. A table reads
 * more files than these; what is listed is one per thing that can be missing on its own, so a
 * half-written export is found here rather than by a visitor.
 */
export const PARTS = [
  {
    id: "models",
    what: "the compiled models and their reference data",
    folders: ["assets"],
    must: [
      "assets/cardiovascular/cardiovascular-data.json",
      "assets/cardiovascular/cardiovascular-anatomy.json",
      ...solver("assets/cardiovascular/solver"),
      "assets/cardiovascular/female/cardiovascular-data.json",
      "assets/cardiovascular/female/solver/model.wasm",
      "assets/lobes/lobes-data.json",
      "assets/lobes/runtime/engine.wasm",
      "assets/lobes/runtime/mathlib.wasm",
      "assets/lobes/runtime/sbmlsim-core.js",
      "assets/lobes/solver_lobes/human/model.wasm",
      "assets/lobes/solver_lobes/rat/model.wasm",
      "assets/lobes/solver_lobes/mouse/model.wasm",
      "assets/lobes/female/lobes-data.json",
      "assets/lobes/female/solver_lobes/human/model.wasm",
      ...solver("assets/glimepiride/solver"),
      ...solver("assets/perfusion/solver"),
    ],
  },
  {
    id: "voice",
    what: "the clips the table reads aloud",
    folders: ["audio"],
    must: [
      "audio/texts.json",
      "audio/de/manifest.json",
      "audio/en/manifest.json",
      "audio/es/manifest.json",
    ],
  },
];

/** The version of the repository, which is the release its resources come from. */
async function version() {
  const manifest = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
  return manifest.version;
}

/** What one archive of a release is called. */
export function archiveName(id, release) {
  return `pkpdsim-tui-${id}-${release}.tar.gz`;
}

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

/** Which files of a part are not where the application looks for them. */
async function absent(part) {
  const missing = [];
  for (const file of part.must) {
    if (!(await exists(join(PUBLIC, ...file.split("/"))))) missing.push(file);
  }
  return missing;
}

export function parseOptions(argv) {
  const options = {command: "fetch", voice: true, out: root, ifMissing: false, quiet: false};
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === "pack" || flag === "check" || flag === "fetch") options.command = flag;
    else if (flag === "--no-voice") options.voice = false;
    else if (flag === "--if-missing") options.ifMissing = true;
    else if (flag === "--quiet") options.quiet = true;
    else if (flag === "--version" || flag === "--out" || flag === "--url") {
      index += 1;
      const value = argv[index];
      if (value === undefined) throw new Error(`${flag} needs a value.`);
      if (flag === "--version") options.release = value;
      else if (flag === "--out") options.out = resolve(value);
      else options.url = value;
    } else if (flag === "--help" || flag === "-h") options.help = true;
    else throw new Error(`Unknown option "${flag}". Try --help.`);
  }
  return options;
}

function usage() {
  process.stdout.write([
    "The resources of the table: the compiled models and the clips it reads aloud.",
    "",
    "  npm run assets                       take them from the release of this checkout",
    "  npm run assets:pack                  pack what this checkout has, for a release",
    "  node scripts/assets.mjs <options>    the same with options, said to the script itself",
    "",
    "  --version <v>      the release to take them from (default: the version of this tree)",
    "  --url <base>       where the archives are, for a release which is not on GitHub yet",
    "  --no-voice         the models alone, without the clips, which are the weight of it",
    "  --if-missing       do nothing where they are already there, which is what install does",
    "  --quiet            say nothing unless something is wrong",
    "  --out <dir>        where `pack` writes the archives (default: the root of the repository)",
    "  --help             this text",
    "",
  ].join("\n"));
}

/** The sha256 of a file, as a release says it beside the archive itself. */
async function digest(path) {
  return createHash("sha256").update(await readFile(path)).digest("hex");
}

async function pack(options) {
  const release = options.release ?? await version();
  await mkdir(options.out, {recursive: true});
  const written = [];
  for (const part of PARTS) {
    if (part.id === "voice" && !options.voice) continue;
    const missing = await absent(part);
    if (missing.length > 0) {
      throw new Error(
        `This checkout cannot pack ${part.what}: ${missing.length} of them are missing, `
        + `starting with ${missing[0]}.\n`
        + `  An archive of a release carries all of it, so it is packed where everything is `
        + `there: run "npm run sync" and "npm run export:glimepiride", `
        + `"npm run export:perfusion" for the models, and "npm run speech" for the voice.`);
    }
    const archive = join(options.out, archiveName(part.id, release));
    // The folders are packed as the application holds them, so unpacking is one `tar -x` into
    // the public folder and nothing has to be moved afterwards.
    await run("tar", ["-czf", archive, "-C", PUBLIC, ...part.folders]);
    const sum = await digest(archive);
    await writeFile(`${archive}.sha256`, `${sum}  ${archiveName(part.id, release)}\n`);
    const size = (await stat(archive)).size;
    written.push({archive, size});
    process.stdout.write(
      `  ${archiveName(part.id, release)}  ${(size / 1e6).toFixed(1)} MB  ${sum.slice(0, 12)}\n`);
  }
  process.stdout.write(
    `\n  Upload them to the release of ${release}, with their sha256 files beside them:\n`
    + `    gh release upload ${release} ${written.map(one => one.archive).join(" ")} `
    + `${written.map(one => `${one.archive}.sha256`).join(" ")}\n\n`);
}

/** Where the archives of a release are, which is the release of this repository by default. */
function baseUrl(options, release) {
  return options.url ?? `https://github.com/${REPOSITORY}/releases/download/${release}`;
}

async function download(url, to) {
  const answer = await fetch(url, {redirect: "follow"});
  if (!answer.ok) {
    const failed = new Error(`${url}: HTTP ${answer.status}`);
    failed.status = answer.status;
    throw failed;
  }
  await writeFile(to, Buffer.from(await answer.arrayBuffer()));
}

/** The sha256 a release says the archive has, or nothing where it says none. */
async function published(url) {
  try {
    const answer = await fetch(`${url}.sha256`, {redirect: "follow"});
    if (!answer.ok) return undefined;
    const [sum] = (await answer.text()).trim().split(/\s+/u);
    return /^[0-9a-f]{64}$/u.test(sum ?? "") ? sum : undefined;
  } catch {
    return undefined;
  }
}

async function take(part, options, release, say) {
  const url = `${baseUrl(options, release)}/${archiveName(part.id, release)}`;
  const folder = await mkdtemp(join(tmpdir(), "pkpdsim-tui-"));
  const archive = join(folder, archiveName(part.id, release));
  try {
    say(`  taking ${part.what} of ${release}`);
    try {
      await download(url, archive);
    } catch (error) {
      // A release which carries none of this is one from before they travelled with a release,
      // or a version which was never released at all. Both are written from a checkout.
      if (error?.status === 404) {
        throw new Error(
          `The release of ${release} carries no archive of ${part.what}: ${url} is not there.\n`
          + `  A checkout which has pkpdsim beside it writes them itself, with "npm run sync", `
          + `"npm run export:glimepiride",\n  "npm run export:perfusion" and "npm run speech", `
          + `see docs/development.md.`);
      }
      throw error;
    }
    const wanted = await published(url);
    if (wanted !== undefined) {
      const got = await digest(archive);
      if (got !== wanted) {
        throw new Error(
          `${url} is not what the release says it is: the sha256 of what arrived is ${got} and `
          + `the release says ${wanted}. Nothing was unpacked.`);
      }
    }
    await mkdir(PUBLIC, {recursive: true});
    try {
      await run("tar", ["-xzf", archive, "-C", PUBLIC]);
    } catch (error) {
      // Linux, macOS and Windows 10 and later all carry tar; a machine without it is told so
      // rather than left with "spawn tar ENOENT".
      if (error?.code === "ENOENT") {
        throw new Error(
          "tar is what unpacks an archive of the release, and this machine has none. Windows 10 "
          + "and later\n  carry it as tar.exe; a Linux without it installs it from its own "
          + "packages.");
      }
      throw error;
    }
    const missing = await absent(part);
    if (missing.length > 0) {
      throw new Error(
        `${archiveName(part.id, release)} does not carry ${part.what} of this version: `
        + `${missing[0]} is still missing after unpacking it.`);
    }
    say(`  ${part.what}: there`);
  } finally {
    await rm(folder, {recursive: true, force: true});
  }
}

async function fetchParts(options) {
  const release = options.release ?? await version();
  const say = options.quiet ? () => undefined : line => process.stdout.write(`${line}\n`);
  const wanted = [];
  for (const part of PARTS) {
    if (part.id === "voice" && !options.voice) continue;
    const missing = await absent(part);
    // An install which has them says nothing: it is run on every change of a dependency, and
    // what it would say is that nothing happened.
    if (options.ifMissing && missing.length === 0) continue;
    wanted.push(part);
  }
  if (wanted.length === 0) return;
  if (options.ifMissing) {
    process.stdout.write(
      `pkpdsim-tui: taking ${wanted.map(part => part.what).join(" and ")} from the release of `
      + `${release}.\n  They are tens of megabytes and this is done once.\n`);
  }
  for (const part of wanted) await take(part, options, release, say);
}

async function check() {
  let whole = true;
  for (const part of PARTS) {
    const missing = await absent(part);
    whole = whole && missing.length === 0;
    process.stdout.write(missing.length === 0
      ? `  ${part.what}: there\n`
      : `  ${part.what}: ${missing.length} missing, starting with ${missing[0]}\n`);
  }
  if (!whole) {
    process.stdout.write("\n  Run \"npm run assets\" to take them from the release.\n");
    process.exitCode = 1;
  }
}

export async function main(argv = process.argv.slice(2)) {
  const options = parseOptions(argv);
  if (options.help) {
    usage();
    return;
  }
  if (options.command === "pack") await pack(options);
  else if (options.command === "check") await check();
  else await fetchParts(options);
}

/** Whether this is the install of a checkout rather than somebody asking for the resources. */
function installing(argv) {
  return argv.includes("--if-missing");
}

// Only as a command: the parts above are read by the tests of the repository.
if (process.argv[1] !== undefined
  && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const argv = process.argv.slice(2);
  // The checks of the repository need none of this and run on every push, so an install there
  // does not pull 50 MB it will not open. A machine of a booth has no CI in its environment.
  if (installing(argv) && process.env["CI"] !== undefined && process.env["CI"] !== "") {
    process.stdout.write("pkpdsim-tui: the resources of the release are not taken in CI.\n");
  } else {
    try {
      await main(argv);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      process.stderr.write(`assets: ${reason}\n`);
      // An install which cannot reach the release is not a broken install: it is a checkout
      // which has to be told once, so what went wrong is said and the install carries on.
      if (installing(argv)) {
        process.stderr.write(
          "  The table needs them to start. Run \"npm run assets\" once the machine is on the "
          + "network,\n  or write them from a pkpdsim checkout with \"npm run sync\".\n");
      } else {
        process.exitCode = 1;
      }
    }
  }
}
