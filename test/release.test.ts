/**
 * The version of the repository and the release it belongs to.
 *
 * One version lives in the root `package.json`, every workspace carries the same one, and the
 * release notes of that version are written before it is tagged: the tag starts the release
 * workflow, which builds the GitHub release from `release-notes/<version>.md`, and a tag cannot
 * be moved afterwards.
 */

import {readdirSync, readFileSync} from "node:fs";
import {describe, expect, it} from "vitest";

const root = new URL("../", import.meta.url);

function version(path: string): string {
  const text = readFileSync(new URL(path, root), "utf8");
  return (JSON.parse(text) as {version?: string}).version ?? "";
}

const VERSION = version("package.json");

/** Every workspace of `package.json`, as the folders they are in. */
function workspaces(): readonly string[] {
  const names: string[] = [];
  for (const folder of ["packages", "apps"]) {
    for (const entry of readdirSync(new URL(`${folder}/`, root), {withFileTypes: true})) {
      if (entry.isDirectory()) names.push(`${folder}/${entry.name}/package.json`);
    }
  }
  return names;
}

describe("the version of the repository", () => {
  it("is a release version, three numbers and nothing else", () => {
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+$/u);
  });

  it("is the version of every workspace", () => {
    for (const path of workspaces()) {
      expect([path, version(path)]).toEqual([path, VERSION]);
    }
  });

  it("has release notes, which are written before the version is tagged", () => {
    const notes = readFileSync(new URL(`release-notes/${VERSION}.md`, root), "utf8");
    expect(notes.split("\n")[0]).toBe(`# Release notes for pkpdsim-tui ${VERSION}`);
  });
});
