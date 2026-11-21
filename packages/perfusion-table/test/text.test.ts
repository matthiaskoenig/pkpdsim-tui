import {describe, expect, it} from "vitest";

import {REFERENCE_SETTINGS} from "@pkpdsim-tui/perfusion-sim";
import {createVoice, LEVELS, LOCALES} from "@pkpdsim-tui/tui-kit";
import {perfusionReading} from "../src/audience.ts";
import {perfusionStats} from "../src/cards.ts";
import {perfusionRoles} from "../src/roles.ts";
import type {PerfusionReadout} from "../src/cards.ts";

const english = createVoice("en", "adult");

const healthy: PerfusionReadout = {
  inflow: 80, outflow: 42, bile: 2.4, alivePericentral: 1, alivePeriportal: 1,
  alt: 0.02, lactate: 0.6,
  zones: [
    {oxygen: 70, alive: 1}, {oxygen: 60, alive: 1}, {oxygen: 52, alive: 1},
    {oxygen: 42, alive: 1},
  ],
};

describe("what the perfusion table reads", () => {
  it("reads the oxygen the organ took as the difference over it", () => {
    const taken = perfusionStats(english).find(stat => stat.id === "taken");
    expect(taken?.of(healthy)).toBeCloseTo(38, 9);
  });

  it("gives every number a name and a sentence, in every language and at every level", () => {
    for (const locale of LOCALES) {
      for (const level of LEVELS) {
        const voice = createVoice(locale, level);
        for (const stat of perfusionStats(voice)) {
          expect(stat.label.length, `${locale} ${level} ${stat.id}`).toBeGreaterThan(3);
          expect((stat.info ?? "").length, `${locale} ${level} ${stat.id}`).toBeGreaterThan(20);
        }
      }
    }
  });

  it("shows a child fewer numbers than an expert", () => {
    const child = perfusionStats(createVoice("en", "child"))
      .filter(stat => stat.from === undefined);
    expect(child.length).toBe(3);
    expect(perfusionStats(english).length).toBe(6);
  });

  it("gives every object a label and a description, in every language and at every level", () => {
    for (const locale of LOCALES) {
      for (const level of LEVELS) {
        const voice = createVoice(locale, level);
        const roles = perfusionRoles(6, voice);
        expect(roles.map(role => role.id)).toEqual(["flow", "oxygen", "temperature", "hour"]);
        for (const role of roles) {
          expect(role.label.length, `${locale} ${level} ${role.id}`).toBeGreaterThan(3);
          expect(role.description.length, `${locale} ${level} ${role.id}`).toBeGreaterThan(20);
        }
      }
    }
  });
});

describe("what the perfusion table says", () => {
  it("says that the organ is well while the cells are alive", () => {
    const sentence = perfusionReading(english, REFERENCE_SETTINGS, healthy, 4);
    expect(sentence).toContain("the organ is well");
    expect(sentence).toContain("100% of the last cells are alive");
  });

  it("says that the far end has died, in every language", () => {
    const dying: PerfusionReadout = {...healthy, alivePericentral: 0.2, bile: 0};
    expect(perfusionReading(english, REFERENCE_SETTINGS, dying, 6))
      .toContain("the far end has died");
    expect(perfusionReading(createVoice("de", "child"), REFERENCE_SETTINGS, dying, 6))
      .toContain("ist das hintere Ende abgestorben");
    expect(perfusionReading(createVoice("es", "expert"), REFERENCE_SETTINGS, dying, 6))
      .toContain("el extremo final ha muerto");
  });

  it("names the temperature only when the circuit is kept cold", () => {
    const cold = {...REFERENCE_SETTINGS, temperature: 8};
    expect(perfusionReading(english, cold, healthy, 4)).toContain("kept at 8 degrees");
    expect(perfusionReading(english, REFERENCE_SETTINGS, healthy, 4)).not.toContain("kept at");
  });
});
