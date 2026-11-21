import {describe, expect, it} from "vitest";

import type {PressureSolution} from "@pkpdsim-tui/cardio-sim";
import {createVoice, LEVELS, LOCALES} from "@pkpdsim-tui/tui-kit";
import {liverStats, LOBULES} from "../src/cards.ts";
import {liverRoles} from "../src/roles.ts";
import {liverReading} from "../src/audience.ts";

const solution = {
  ppo: 10, pli: 8, qpo: 1.33, qh: 1.79, qha: 0.46, co: 6.4, flows: [],
  systemicFlow: 4.6, portalResidual: 0, hepaticResidual: 0,
} as unknown as PressureSolution;

const english = createVoice("en", "adult");

describe("what the liver table reads", () => {
  it("divides the flow of the liver among its lobules", () => {
    const stat = liverStats(english).find(entry => entry.id === "lobule");
    expect(stat).toBeDefined();
    expect(stat?.of(solution)).toBeCloseTo(1e6 * 1.79 / LOBULES, 9);
  });

  it("says which share of the heart the liver takes", () => {
    const stat = liverStats(english).find(entry => entry.id === "share");
    expect(stat?.of(solution)).toBeCloseTo(100 * 1.79 / 6.4, 9);
    expect(stat?.of({...solution, co: 0})).toBe(0);
  });

  it("gives every number a name and a sentence, in every language and at every level", () => {
    for (const locale of LOCALES) {
      for (const level of LEVELS) {
        const voice = createVoice(locale, level);
        for (const stat of liverStats(voice)) {
          expect(stat.label.length, `${locale} ${level} ${stat.id}`).toBeGreaterThan(3);
          expect((stat.info ?? "").length, `${locale} ${level} ${stat.id}`).toBeGreaterThan(20);
        }
      }
    }
  });

  it("shows a child fewer numbers than an expert", () => {
    const child = liverStats(createVoice("en", "child")).filter(stat => stat.from === undefined);
    expect(child.length).toBe(3);
    expect(liverStats(english).length).toBe(6);
  });
});

describe("what the liver table says", () => {
  it("names what the objects have made of the liver", () => {
    const reference = {...solution, qpo: 1.33, ppo: 10};
    expect(liverReading(english, solution, reference)).toContain("1.79 litres a minute");
    const backed = {...solution, qpo: 0.9, ppo: 18};
    const sentence = liverReading(english, backed, reference);
    expect(sentence).toContain("the gut is sending less");
    expect(sentence).toContain("backing up");
  });

  it("says the same state in German and in Spanish", () => {
    const reference = {...solution, qpo: 1.33, ppo: 10};
    const backed = {...solution, qpo: 0.9, ppo: 18};
    expect(liverReading(createVoice("de", "adult"), backed, reference))
      .toContain("der Darm weniger schickt");
    expect(liverReading(createVoice("es", "adult"), backed, reference))
      .toContain("el intestino manda menos");
    for (const locale of LOCALES) {
      expect(liverReading(createVoice(locale, "child"), solution, reference)).toContain("1.79");
    }
  });
});

describe("the objects of the liver table", () => {
  it("turns two resistances of the circulation, each with its own marker", () => {
    const roles = liverRoles(english);
    expect(roles.map(role => role.id)).toEqual(["portal", "hepatic"]);
    expect(new Set(roles.flatMap(role => role.markers)).size).toBe(roles.length);
    for (const role of roles) {
      expect(role.min).toBeLessThan(role.reference);
      expect(role.reference).toBeLessThan(role.max);
      expect(role.description.length).toBeGreaterThan(30);
    }
  });

  it("names both objects in every language and at every level", () => {
    for (const locale of LOCALES) {
      for (const level of LEVELS) {
        const voice = createVoice(locale, level);
        for (const role of liverRoles(voice)) {
          expect(role.label.length, `${locale} ${level} ${role.id}`).toBeGreaterThan(3);
          expect(role.description.length, `${locale} ${level} ${role.id}`).toBeGreaterThan(30);
        }
      }
    }
  });
});
