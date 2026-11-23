/**
 * Where the command of a package lives.
 *
 * A command of a dependency is started as a script of this node, and never through the shim of
 * `node_modules/.bin`. A shim is a shell script under the plain name of the command on Linux
 * and on macOS; on Windows the plain name is no program at all, because the shims there are
 * `vite.cmd` and `vite.ps1` beside it, so spawning the plain name fails with ENOENT and the
 * table does not start, see issue #21. The script a shim would run is a file of the package
 * itself, the same one on every platform, and `node` runs it everywhere.
 */

import {readFileSync} from "node:fs";
import {createRequire} from "node:module";
import {dirname, resolve} from "node:path";

const require = createRequire(import.meta.url);

/** The script of the command `command` of the package `name`, as an absolute path. */
export function binScript(name, command) {
  let manifest;
  try {
    // The manifest of a package is reachable whatever its exports say, and it is the one place
    // which knows where its commands are.
    manifest = require.resolve(`${name}/package.json`);
  } catch {
    throw new Error(
      `There is no package "${name}" to run "${command}" from. Run "npm install" first.`);
  }
  const {bin} = JSON.parse(readFileSync(manifest, "utf8"));
  const script = typeof bin === "string" ? (name === command ? bin : undefined) : bin?.[command];
  if (typeof script !== "string") {
    throw new Error(`The package "${name}" has no command "${command}".`);
  }
  return resolve(dirname(manifest), script);
}
