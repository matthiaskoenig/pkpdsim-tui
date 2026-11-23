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

  // The command a booth is started with. It is the one place the table of this exhibition is
  // written down: the tracker it reports its objects over and the ids printed on its pucks, so
  // `npm run table` is the whole of it and no address of that table carries either.
  it("has one for the table itself, with its tracker and the ids of its markers", () => {
    const table = scripts["table"] ?? "";
    expect(table).toContain("--no-simulator");
    expect(table).toMatch(/--tuio \d+\.\d+\.\d+\.\d+:\d+/u);
    expect(table).toMatch(/--ids \d+(,\d+)+/u);
  });

  it("quotes nothing the way only a POSIX shell reads it", () => {
    for (const [name, command] of Object.entries(scripts)) {
      expect(command, name).not.toContain("'");
    }
  });
});
