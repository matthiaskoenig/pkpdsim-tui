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

  it("quotes nothing the way only a POSIX shell reads it", () => {
    for (const [name, command] of Object.entries(scripts)) {
      expect(command, name).not.toContain("'");
    }
  });
});
