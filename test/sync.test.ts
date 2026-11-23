/**
 * The script which copies the exported models and reference data of a pkpdsim checkout into the
 * assets of the application, as somebody who has just cloned both runs it: a complete export, a
 * checkout which is behind and has only part of one, and a checkout which has none.
 *
 * It runs on a copy of the script in a temporary repository, so a test never writes into the
 * assets of this one.
 */

import {cp, mkdir, mkdtemp, readFile, writeFile} from "node:fs/promises";
import {execFile} from "node:child_process";
import {existsSync} from "node:fs";
import {tmpdir} from "node:os";
import {dirname, join, resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {promisify} from "node:util";
import {describe, expect, it} from "vitest";

const run = promisify(execFile);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** A repository with nothing in it but the script under test. */
async function repository(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "pkpdsim-tui-sync-"));
  await mkdir(join(directory, "scripts"), {recursive: true});
  await cp(join(root, "scripts", "sync-assets.mjs"), join(directory, "scripts", "sync-assets.mjs"));
  return directory;
}

/** A pkpdsim checkout whose export holds the given files, each one of them a file or a folder. */
async function checkout(files: readonly string[]): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "pkpdsim-"));
  const examples = join(directory, "docs", "pbpk", "examples");
  await mkdir(examples, {recursive: true});
  for (const file of files) {
    const path = join(examples, file);
    if (file.endsWith("/")) {
      await mkdir(path, {recursive: true});
      // What a solver folder of an export holds, including the runtime a second table takes
      // out of it file by file.
      for (const name of [
        "model.wasm", "model.json", "config.json", "engine.wasm", "mathlib.wasm",
        "sbmlsim-core.js", "LICENSE", "THIRD_PARTY.md",
      ]) {
        await writeFile(join(path, name), "{}");
      }
      continue;
    }
    await mkdir(dirname(path), {recursive: true});
    await writeFile(path, JSON.stringify({schema_version: 3, provenance: {model: "whole body"}}));
  }
  return directory;
}

const COMPLETE = [
  "cardiovascular-data.json", "cardiovascular-anatomy.json", "solver/",
  "female/cardiovascular-data.json", "female/solver/",
];

/** The script, as `npm run sync` runs it, and what it said. */
async function sync(where: string, pkpdsim: string, apps: readonly string[] = ["cardiovascular"]):
Promise<{code: number; out: string; error: string}> {
  try {
    const {stdout, stderr} = await run("node", [
      join(where, "scripts", "sync-assets.mjs"), "--pkpdsim", pkpdsim,
      ...apps.flatMap(app => ["--app", app]),
    ]);
    return {code: 0, out: stdout, error: stderr};
  } catch (failure) {
    const thrown = failure as {code?: number; stdout?: string; stderr?: string};
    return {code: thrown.code ?? 1, out: thrown.stdout ?? "", error: thrown.stderr ?? ""};
  }
}

describe("the assets of a complete export", () => {
  it("are copied in, with where they came from beside them", async () => {
    const where = await repository();
    const answer = await sync(where, await checkout(COMPLETE));
    expect(answer.error).toBe("");
    const target = join(where, "apps", "table", "public", "assets", "cardiovascular");
    expect(existsSync(join(target, "cardiovascular-anatomy.json"))).toBe(true);
    expect(existsSync(join(target, "female", "solver", "model.wasm"))).toBe(true);
    const provenance = JSON.parse(await readFile(join(target, "provenance.json"), "utf8")) as {
      schema_version: number;
    };
    expect(provenance.schema_version).toBe(3);
  });
});

describe("a checkout whose export is incomplete", () => {
  it("is named with what is missing, and with both ways out of it", async () => {
    const where = await repository();
    const behind = await checkout(["cardiovascular-data.json", "solver/"]);
    const answer = await sync(where, behind);
    expect(answer.code).not.toBe(0);
    // What the checkout does not have, each one of them.
    expect(answer.error).toContain("cardiovascular-anatomy.json");
    expect(answer.error).toContain("female/cardiovascular-data.json");
    expect(answer.error).toContain("female/solver");
    // A checkout which is behind is the common one of the two, so it is said first.
    expect(answer.error).toContain(`git -C ${behind} pull`);
    expect(answer.error).toContain("cardiovascular_examples.py");
  });

  it("leaves no half of itself in the assets of the application", async () => {
    const where = await repository();
    const answer = await sync(where, await checkout(["cardiovascular-data.json", "solver/"]));
    expect(answer.code).not.toBe(0);
    expect(existsSync(join(where, "apps", "table", "public", "assets", "cardiovascular")))
      .toBe(false);
  });
});

describe("one table of a checkout whose export is incomplete", () => {
  it("does not hold back the table whose export is there", async () => {
    const where = await repository();
    const answer = await sync(
      where,
      await checkout([
        "cardiovascular-data.json", "solver/", "lobes-data.json", "solver_lobes/",
        "female/lobes-data.json", "female/solver_lobes/",
      ]),
      ["cardiovascular", "lobes"],
    );
    expect(answer.code).not.toBe(0);
    expect(answer.error).toContain("The export of cardiovascular");
    const assets = join(where, "apps", "table", "public", "assets");
    expect(existsSync(join(assets, "lobes", "runtime", "engine.wasm"))).toBe(true);
    expect(existsSync(join(assets, "cardiovascular"))).toBe(false);
  });
});

describe("a checkout which has no export at all", () => {
  it("is said to have none, rather than named incomplete", async () => {
    const where = await repository();
    const answer = await sync(where, await checkout([]));
    expect(answer.code).not.toBe(0);
    expect(answer.out).toContain("skipped");
    expect(answer.error).toContain("Nothing was synced");
  });
});
