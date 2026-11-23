/**
 * The commands of `package.json` run on every shell.
 *
 * npm runs them through `cmd.exe` on Windows and through `sh` everywhere else, and the two share
 * almost no syntax: a default of `${VAR:-...}`, a substitution of `$(...)` and a variable put in
 * front of a command are all read literally by `cmd.exe`, so a command which uses one of them is
 * a command which only half of the machines of a table can run.
 */

import {readFileSync} from "node:fs";
import {describe, expect, it} from "vitest";

const scripts = (JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
) as {scripts: Record<string, string>}).scripts;

describe("every command of the repository", () => {
  it("is there to be read", () => {
    expect(Object.keys(scripts).length).toBeGreaterThan(5);
  });

  it("asks for no expansion of a shell", () => {
    for (const [name, command] of Object.entries(scripts)) {
      expect(command, name).not.toMatch(/\$\{/u);
      expect(command, name).not.toMatch(/\$\(/u);
      expect(command, name).not.toMatch(/`/u);
    }
  });

  it("puts no variable in front of a command", () => {
    for (const [name, command] of Object.entries(scripts)) {
      expect(command, name).not.toMatch(/^\s*[A-Za-z_][A-Za-z0-9_]*=/u);
    }
  });

  // The resources of a release are taken by the install itself, so a clone of a release is a
  // table: an install, and `npm run table`. `--if-missing` is what makes that install one which
  // can be run twice and one which a machine off the network still finishes.
  it("takes the resources of the release with the install", () => {
    expect(scripts["postinstall"] ?? "").toContain("scripts/assets.mjs");
    expect(scripts["postinstall"] ?? "").toContain("--if-missing");
    expect(scripts["assets"] ?? "").toBe("node scripts/assets.mjs");
    expect(scripts["assets:pack"] ?? "").toContain("pack");
  });

  // The command a booth is started with. It is the one place the table of this exhibition is
  // written down: the tracker it reports its objects over and the ids printed on its pucks, so
  // `npm run table` is the whole of it and no address of that table carries either.
  it("has one for the table itself, with its tracker and the ids of its markers", () => {
    const table = scripts["table"] ?? "";
    expect(table).toContain("scripts/table.mjs");
    expect(table).toMatch(/--tuio \d+\.\d+\.\d+\.\d+:\d+/u);
    expect(table).toMatch(/--ids \d+(,\d+)+/u);
  });

  // The two apps of the repository are two commands, and neither starts the other: the table is
  // the application and the tracker it listens to, the simulator is a tracker and the surface
  // which drives it, and `npm run dev` is the one which starts both for a laptop.
  it("has one for each app, and one which starts both", () => {
    expect(scripts["table"] ?? "").toContain("scripts/table.mjs");
    expect(scripts["table"] ?? "").not.toContain("simulator");
    expect(scripts["simulator"] ?? "").toContain("tuio-simulator");
    expect(scripts["simulator"] ?? "").not.toContain("scripts/table.mjs");
    expect(scripts["dev"] ?? "").toContain("scripts/dev.mjs");
  });

  it("quotes nothing the way only a POSIX shell reads it", () => {
    for (const [name, command] of Object.entries(scripts)) {
      expect(command, name).not.toContain("'");
    }
  });
});
