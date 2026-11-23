/**
 * The resources of a release: the compiled models of the tables and the clips they read aloud.
 *
 * Neither is in the repository, so a clone takes them from the release it is, and what is
 * checked here is that the two halves of that cannot drift apart: an archive is named the same
 * way when it is packed and when it is taken, and a table which was added to the application is
 * a table whose models the archive carries.
 */

import {describe, expect, it} from "vitest";
import {PARTS, archiveName, parseOptions} from "../scripts/assets.mjs";
import {TABLES} from "../apps/table/src/tables.ts";

const models = PARTS.find(part => part.id === "models");
const voice = PARTS.find(part => part.id === "voice");

describe("an archive of a release", () => {
  it("is named by what is in it and the version it belongs to", () => {
    expect(archiveName("models", "0.2.0")).toBe("pkpdsim-tui-models-0.2.0.tar.gz");
    expect(archiveName("voice", "1.0.0")).toBe("pkpdsim-tui-voice-1.0.0.tar.gz");
  });

  it("is the models of the tables and the clips they read aloud", () => {
    expect(PARTS.map(part => part.id)).toEqual(["models", "voice"]);
    expect(models?.folders).toEqual(["assets"]);
    expect(voice?.folders).toEqual(["audio"]);
  });

  // The archive is unpacked into the public folder of the application, so every file it carries
  // is read from there and nothing may reach above it.
  it("says what it carries as the application holds it", () => {
    for (const part of PARTS) {
      for (const file of part.must) {
        expect(file, file).toMatch(/^(assets|audio)\//u);
        expect(file, file).not.toContain("..");
      }
    }
  });
});

describe("the models of the release", () => {
  // A fifth table is a fifth folder of assets, and a release which does not carry it is a table
  // which cannot start. The two lists are kept in step here rather than by a visitor.
  it("are the ones of every table of the application", () => {
    for (const table of TABLES) {
      const folder = `assets/${table.assets}`;
      expect(
        models?.must.some(file => file.startsWith(folder)), `${table.id}: ${folder}`,
      ).toBe(true);
    }
  });

  it("are a file of every language the table speaks", () => {
    for (const locale of ["de", "en", "es"]) {
      expect(voice?.must, locale).toContain(`audio/${locale}/manifest.json`);
    }
  });
});

describe("the options of the command", () => {
  it("take both archives of this version by default", () => {
    const options = parseOptions([]);
    expect(options.command).toBe("fetch");
    expect(options.voice).toBe(true);
    expect(options.ifMissing).toBe(false);
    expect(options.release).toBeUndefined();
  });

  it("read the archive, the release and where it is", () => {
    const options = parseOptions(["--no-voice", "--version", "0.3.0", "--url", "http://x/y"]);
    expect(options.voice).toBe(false);
    expect(options.release).toBe("0.3.0");
    expect(options.url).toBe("http://x/y");
  });

  it("read the packing of them", () => {
    expect(parseOptions(["pack"]).command).toBe("pack");
    expect(parseOptions(["check"]).command).toBe("check");
  });

  // An install of a checkout which has them does nothing, so it is the install which says so.
  it("read the one an install uses", () => {
    expect(parseOptions(["--if-missing"]).ifMissing).toBe(true);
  });

  it("refuse what they cannot read", () => {
    expect(() => parseOptions(["--voice"])).toThrow(/Unknown option/u);
    expect(() => parseOptions(["--version"])).toThrow(/needs a value/u);
  });
});
