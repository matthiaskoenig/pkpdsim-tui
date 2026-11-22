import {describe, expect, it} from "vitest";

import {referenceIndividual} from "@pkpdsim-tui/glimepiride-sim";
import {createVoice, LEVELS, LOCALES} from "@pkpdsim-tui/tui-kit";
import {glimepirideReading} from "../src/audience.ts";
import {categoryOf, glimepirideStats} from "../src/cards.ts";
import {glimepirideRoles} from "../src/roles.ts";
import type {GlimepirideReadout} from "../src/cards.ts";

const english = createVoice("en", "adult");

function readout(auc: number, halflife: number): GlimepirideReadout {
  return {
    pk: {cmax: 0.4, tmax: 150, auc, halflife},
    now: 0.1,
    urine: 12,
  };
}

describe("what the glimepiride table reads", () => {
  it("gives every number a name and a sentence, in every language and at every level", () => {
    for (const locale of LOCALES) {
      for (const level of LEVELS) {
        const voice = createVoice(locale, level);
        for (const stat of glimepirideStats(voice)) {
          expect(stat.label.length, `${locale} ${level} ${stat.id}`).toBeGreaterThan(3);
          expect((stat.info ?? "").length, `${locale} ${level} ${stat.id}`).toBeGreaterThan(20);
        }
      }
    }
  });

  it("shows a child fewer numbers than an expert", () => {
    const child = glimepirideStats(createVoice("en", "child"))
      .filter(stat => stat.from === undefined);
    expect(child.length).toBe(2);
    expect(glimepirideStats(english).length).toBe(6);
  });

  it("gives every object a label and a description, in every language and at every level", () => {
    for (const locale of LOCALES) {
      for (const level of LEVELS) {
        const voice = createVoice(locale, level);
        const roles = glimepirideRoles(24, voice);
        expect(roles.map(role => role.id)).toEqual(
          ["dose", "weight", "cyp2c9", "cirrhosis", "renal", "hour"]);
        for (const role of roles) {
          expect(role.label.length, `${locale} ${level} ${role.id}`).toBeGreaterThan(3);
          expect(role.description.length, `${locale} ${level} ${role.id}`).toBeGreaterThan(20);
        }
      }
    }
  });

  it("says a genotype the same way everywhere and translates a clinical class", () => {
    expect(categoryOf(english, "cyp2c9", 1)).toBe("*1/*1");
    expect(categoryOf(createVoice("de", "adult"), "cyp2c9", 1)).toBe("*1/*1");
    expect(categoryOf(english, "renal", 110)).toBe("normal");
    expect(categoryOf(createVoice("de", "adult"), "renal", 20)).toBe("schwer");
    expect(categoryOf(createVoice("es", "adult"), "renal", 20)).toBe("grave");
  });
});

describe("what the glimepiride table says", () => {
  const reference = referenceIndividual("male");

  it("says that nothing was changed about the person on the table", () => {
    const sentence = glimepirideReading(
      english, reference, "male", readout(600, 300), readout(600, 300), reference);
    expect(sentence).toContain("takes 4 mg of glimepiride");
  });

  it("names the slow liver and what it does to the exposure", () => {
    const slow = {...reference, cyp2c9: 0.2};
    const sentence = glimepirideReading(
      english, slow, "male", readout(1500, 900), readout(600, 300), reference);
    expect(sentence).toContain("breaks glimepiride down slowly");
    expect(sentence).toContain("2.5 times as much");
    expect(sentence).toContain("half of it is gone after 15 hours");
  });

  it("says the same state in German and in Spanish", () => {
    const slow = {...reference, cyp2c9: 0.2};
    const german = glimepirideReading(
      createVoice("de", "adult"), slow, "female", readout(1500, 900), readout(600, 300), reference);
    expect(german).toContain("Glimepirid langsam abbaut");
    expect(german).toContain("Eine Frau");
    const spanish = glimepirideReading(
      createVoice("es", "child"), slow, "male", readout(1500, 900), readout(600, 300), reference);
    expect(spanish).toContain("metaboliza la glimepirida despacio");
    expect(spanish).toContain("Un hombre");
  });
});
