/** Which table the query opens, and the lines a card of the body is written in. */

import {describe, expect, it} from "vitest";

import {angleForValue, valueFromAngle} from "@pkpdsim-tui/tuio-input";
import {createVoice, LEVELS, LOCALES, say} from "@pkpdsim-tui/tui-kit";
import {
  entryCopy, OVERVIEW, selectedTable, TABLES, tableAtDial, tableOf, TOPIC_MARKER, topicRole,
} from "../src/tables.ts";
import {HUB_TEXT} from "../src/text.ts";
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

  it("gives every table an id, a card and a folder of assets", () => {
    const ids = TABLES.map(entry => entry.id);
    expect(new Set(ids).size).toBe(TABLES.length);
    expect(ids).not.toContain(OVERVIEW);
    for (const entry of TABLES) {
      // Two tables may read the same export, as the liver and the circulation do.
      expect(entry.assets.endsWith("/")).toBe(true);
      // The card points at an organ the body is marked at, which is one the table is about.
      expect(entry.organs).toContain(entry.organ);
    }
  });
});

describe("the words of the application", () => {
  it("says every table in every language, at every level", () => {
    for (const locale of LOCALES) {
      for (const level of LEVELS) {
        const voice = createVoice(locale, level);
        for (const entry of TABLES) {
          const copy = entryCopy(voice, entry.id);
          expect(copy.label.length, `${locale} ${entry.id}`).toBeGreaterThan(2);
          expect(copy.title.length, `${locale} ${entry.id}`).toBeGreaterThan(4);
          expect(voice.say(copy.blurb).length, `${locale} ${level} ${entry.id}`)
            .toBeGreaterThan(10);
          expect(voice.say(copy.about).length, `${locale} ${level} ${entry.id}`)
            .toBeGreaterThan(40);
        }
      }
    }
  });

  it("says the landing page in every language, at every level", () => {
    for (const locale of LOCALES) {
      const copy = HUB_TEXT[locale];
      expect(copy.heading.length).toBeGreaterThan(8);
      for (const level of LEVELS) {
        expect(copy.motivation[level].length, `${locale} ${level}`).toBe(2);
        for (const line of copy.motivation[level]) expect(line.length).toBeGreaterThan(20);
        expect(say(copy.headingInfo, level).length).toBeGreaterThan(30);
        expect(say(copy.bodyInfo.male, level).length).toBeGreaterThan(20);
        expect(say(copy.bodyInfo.female, level).length).toBeGreaterThan(20);
      }
      // A language which forgot a table would leave a card of the landing page empty.
      expect(Object.keys(copy.entries).sort()).toEqual(TABLES.map(entry => entry.id).sort());
    }
  });

  it("says a child less than an expert", () => {
    for (const locale of LOCALES) {
      for (const entry of TABLES) {
        const child = createVoice(locale, "child");
        const expert = createVoice(locale, "expert");
        const copy = entryCopy(child, entry.id);
        expect(child.say(copy.about).length, `${locale} ${entry.id}`)
          .toBeLessThan(expert.say(copy.about).length);
      }
    }
  });
});

describe("the sentence of a card", () => {
  it("breaks on spaces and keeps every word", () => {
    expect(wrapText("one two three four", 9)).toEqual(["one two", "three", "four"]);
  });

  it("fits the words it is given", () => {
    for (const line of wrapText(HUB_TEXT.en.entries["liver"]?.title ?? "", 34)) {
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

describe("the object which picks a table", () => {
  const voice = createVoice("en", "adult");
  const role = topicRole(voice);

  it("reads the first marker of the surface", () => {
    expect(role.markers).toEqual([TOPIC_MARKER]);
    expect(TOPIC_MARKER).toBe(0);
  });

  it("points at the middle table at its detent, and at the ends at its stops", () => {
    expect(tableAtDial(valueFromAngle(role, 0)).id).toBe(TABLES[2]?.id);
    // Half a turn either way is the same angle, so the stops are read just inside it.
    expect(tableAtDial(valueFromAngle(role, -2.9)).id).toBe(TABLES[0]?.id);
    expect(tableAtDial(valueFromAngle(role, 2.9)).id).toBe(TABLES[TABLES.length - 1]?.id);
  });

  it("walks through every table, in the order of the ring", () => {
    const walked = TABLES.map(
      (_entry, index) => tableAtDial(valueFromAngle(role, angleForValue(role, index))).id);
    expect(walked).toEqual(TABLES.map(entry => entry.id));
  });

  it("stays on a table whatever a hand does to the object", () => {
    for (const angle of [-8, -3.2, -0.01, 0.01, 1.7, 9]) {
      expect(TABLES.some(entry => entry.id === tableAtDial(valueFromAngle(role, angle)).id))
        .toBe(true);
    }
  });
});
