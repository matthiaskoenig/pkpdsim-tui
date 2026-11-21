import {describe, expect, it} from "vitest";

import type {PressureSolution} from "@pkpdsim-tui/cardio-sim";
import {LIVER_STATS, LOBULES} from "../src/cards.ts";
import {LIVER_ROLES} from "../src/roles.ts";
import {liverReading} from "../src/audience.ts";

const solution = {
  ppo: 10, pli: 8, qpo: 1.33, qh: 1.79, qha: 0.46, co: 6.4, flows: [],
  systemicFlow: 4.6, portalResidual: 0, hepaticResidual: 0,
} as unknown as PressureSolution;

describe("what the liver table reads", () => {
  it("divides the flow of the liver among its lobules", () => {
    const stat = LIVER_STATS.find(entry => entry.id === "lobule");
    expect(stat).toBeDefined();
    expect(stat?.of(solution)).toBeCloseTo(1e6 * 1.79 / LOBULES, 9);
  });

  it("says which share of the heart the liver takes", () => {
    const stat = LIVER_STATS.find(entry => entry.id === "share");
    expect(stat?.of(solution)).toBeCloseTo(100 * 1.79 / 6.4, 9);
    expect(stat?.of({...solution, co: 0})).toBe(0);
  });

  it("gives every number the sentence which says what it is", () => {
    for (const stat of LIVER_STATS) expect((stat.info ?? "").length).toBeGreaterThan(20);
  });
});

describe("what the liver table says", () => {
  it("names what the objects have made of the liver", () => {
    const reference = {...solution, qpo: 1.33, ppo: 10};
    expect(liverReading(solution, reference)).toContain("1.79 litres a minute");
    const backed = {...solution, qpo: 0.9, ppo: 18};
    const sentence = liverReading(backed, reference);
    expect(sentence).toContain("the gut is sending less");
    expect(sentence).toContain("backing up");
  });
});

describe("the objects of the liver table", () => {
  it("turns two resistances of the circulation, each with its own marker", () => {
    expect(LIVER_ROLES.map(role => role.id)).toEqual(["portal", "hepatic"]);
    expect(new Set(LIVER_ROLES.flatMap(role => role.markers)).size).toBe(LIVER_ROLES.length);
    for (const role of LIVER_ROLES) {
      expect(role.min).toBeLessThan(role.reference);
      expect(role.reference).toBeLessThan(role.max);
      expect(role.description.length).toBeGreaterThan(30);
    }
  });
});
