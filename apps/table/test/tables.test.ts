/** Which table the query opens, and the lines a card of the body is written in. */

import {describe, expect, it} from "vitest";

import {OVERVIEW, selectedTable, TABLES, tableOf} from "../src/tables.ts";
import {wrapText} from "../src/wrap.ts";

function query(search: string): URLSearchParams {
  return new URLSearchParams(search);
}

describe("the table of a query", () => {
  it("is the body itself when the query names none", () => {
    expect(tableOf(query(""))).toBeUndefined();
    expect(tableOf(query("sex=female"))).toBeUndefined();
    expect(tableOf(query(`app=${OVERVIEW}`))).toBeUndefined();
    expect(tableOf(query("app="))).toBeUndefined();
    expect(selectedTable(query(""))).toBe(OVERVIEW);
  });

  it("is the table the query names", () => {
    expect(tableOf(query("app=cardiovascular"))?.id).toBe("cardiovascular");
    expect(tableOf(query("app=lobes&sex=female"))?.id).toBe("lobes");
    expect(selectedTable(query("app=glimepiride"))).toBe("glimepiride");
  });

  it("is the body again when the query names a table that is not there", () => {
    expect(tableOf(query("app=kidney"))).toBeUndefined();
    expect(selectedTable(query("app=kidney"))).toBe(OVERVIEW);
  });

  it("gives every table an id, a card and a folder of assets of its own", () => {
    const ids = TABLES.map(entry => entry.id);
    expect(new Set(ids).size).toBe(TABLES.length);
    expect(new Set(TABLES.map(entry => entry.assets)).size).toBe(TABLES.length);
    expect(ids).not.toContain(OVERVIEW);
    for (const entry of TABLES) {
      expect(entry.assets.endsWith("/")).toBe(true);
      expect(entry.label.length).toBeGreaterThan(0);
      expect(entry.about.length).toBeGreaterThan(20);
      // The card points at an organ the body is marked at, which is one the table is about.
      expect(entry.organs).toContain(entry.organ);
    }
  });
});

describe("the sentence of a card", () => {
  it("breaks on spaces and keeps every word", () => {
    expect(wrapText("one two three four", 9)).toEqual(["one two", "three", "four"]);
  });

  it("fits the words it is given", () => {
    for (const line of wrapText(TABLES[0]?.about ?? "", 34)) {
      expect(line.length).toBeLessThanOrEqual(34);
    }
  });

  it("keeps a word which is longer than the line rather than cutting it", () => {
    expect(wrapText("hepaticojejunostomy now", 8)).toEqual(["hepaticojejunostomy", "now"]);
  });

  it("marks the cut when the sentence does not fit at all", () => {
    expect(wrapText("one two three four five", 8, 2)).toEqual(["one two", "three..."]);
  });

  it("is nothing at all for nothing at all", () => {
    expect(wrapText("", 20)).toEqual([]);
    expect(wrapText("   ", 20)).toEqual([]);
  });
});
