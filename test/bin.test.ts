/**
 * How the launcher of the development server starts a command of a package.
 *
 * `npm run dev` starts vite itself, and it starts it as a script of this node rather than
 * through the shim of `node_modules/.bin`: on Windows a shim is `vite.cmd` beside `vite.ps1`
 * and the name without an extension is no program at all, so spawning it fails with ENOENT and
 * the whole table does not start, see issue #21.
 */

import {execFile} from "node:child_process";
import {existsSync} from "node:fs";
import {join} from "node:path";
import {promisify} from "node:util";
import {describe, expect, it} from "vitest";
import {binScript} from "../scripts/bin.mjs";

const run = promisify(execFile);

describe("the script of a command of a package", () => {
  it("is a file of the package itself, on every platform", () => {
    const script = binScript("vite", "vite");
    expect(script).not.toContain(join("node_modules", ".bin"));
    expect(script.endsWith(".js")).toBe(true);
    // The shim exists on this platform or it does not; the script of the package always does.
    expect(existsSync(script)).toBe(true);
  });

  // The launcher starts vite exactly this way, so this is the spawn which failed on Windows.
  it("runs under this node, which is how the launcher starts it", async () => {
    const {stdout} = await run(process.execPath, [binScript("vite", "vite"), "--version"]);
    expect(stdout).toMatch(/vite\/\d+\.\d+\.\d+/u);
  }, 30000);

  it("says which package and which command when the package has none", () => {
    expect(() => binScript("vite", "tuio")).toThrow(/vite.*tuio/su);
  });

  it("says which package when there is no such package", () => {
    expect(() => binScript("no-such-package-here", "nothing")).toThrow(/no-such-package-here/su);
  });
});
