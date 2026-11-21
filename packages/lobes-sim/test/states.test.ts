import {describe, expect, it} from "vitest";
import fixture from "./fixtures/human-cases.json" with {type: "json"};
import {
  caseChanges, describeStates, intactStates, LOBE_STATES, lobeState, portalFraction,
  remnantFraction, stateOfChanges,
} from "../src/states.ts";
import type {Lobe, LobeState} from "../src/types.ts";

const lobes = fixture.lobes as Lobe[];
const cases = fixture.cases as Record<string, {label: string; lobes: string[]; changes: Record<string, number>; kind: string}>;
const tokens = lobes.map(lobe => lobe.token);

describe("the lobe table of the human liver", () => {
  it("holds the eight Couinaud segments and their mass adds up", () => {
    expect(tokens).toEqual(["sg1", "sg2", "sg3", "sg4", "sg5", "sg6", "sg7", "sg8"]);
    expect(lobes.reduce((sum, lobe) => sum + lobe.mass_fraction, 0)).toBeCloseTo(1, 9);
  });
});

describe("caseChanges", () => {
  it("writes the parameters of every exported case", () => {
    for (const [id, entry] of Object.entries(cases)) {
      const state: LobeState = entry.kind === "Resection" ? "resected"
        : entry.kind === "PortalLigation" ? "portal" : "intact";
      const states = {...intactStates(lobes)} as Record<string, LobeState>;
      for (const token of entry.lobes) states[token] = state;
      expect(caseChanges(states), id).toEqual(entry.changes);
    }
  });

  it("closes only the portal gate of a ligated segment", () => {
    expect(caseChanges({sg8: "portal"})).toEqual({g_po_sg8: 0});
  });

  it("closes both gates and removes a resected segment", () => {
    expect(caseChanges({sg8: "resected"})).toEqual({g_ha_sg8: 0, g_po_sg8: 0, f_present_sg8: 0});
  });

  it("changes nothing for an intact liver", () => {
    expect(caseChanges(intactStates(lobes))).toEqual({});
  });

  it("refuses a state that does not exist", () => {
    expect(() => caseChanges({sg1: "melted" as LobeState})).toThrow(RangeError);
  });
});

describe("stateOfChanges", () => {
  it("reads the state of every segment back out of an exported case", () => {
    for (const [id, entry] of Object.entries(cases)) {
      const states = stateOfChanges(entry.changes, tokens);
      expect(caseChanges(states), id).toEqual(entry.changes);
      for (const token of entry.lobes) {
        expect(states[token], `${id}/${token}`).not.toBe("intact");
      }
    }
  });

  it("reads a right hepatectomy as four resected segments", () => {
    const states = stateOfChanges(cases["right_hepatectomy"]!.changes, tokens);
    expect(Object.entries(states).filter(([, state]) => state === "resected").map(([token]) => token))
      .toEqual(["sg5", "sg6", "sg7", "sg8"]);
  });
});

describe("remnantFraction and portalFraction", () => {
  it("is the whole liver when nothing was done", () => {
    const states = intactStates(lobes);
    expect(remnantFraction(lobes, states)).toBeCloseTo(1, 9);
    expect(portalFraction(lobes, states)).toBeCloseTo(1, 9);
  });

  it("drops the mass of the resected segments", () => {
    const states = stateOfChanges(cases["right_hepatectomy"]!.changes, tokens);
    expect(remnantFraction(lobes, states)).toBeCloseTo(1 - (0.13 + 0.079 + 0.19 + 0.261), 9);
  });

  it("keeps the mass of a ligated segment but not its portal inflow", () => {
    const states = stateOfChanges(cases["right_pvl"]!.changes, tokens);
    expect(remnantFraction(lobes, states)).toBeCloseTo(1, 9);
    expect(portalFraction(lobes, states)).toBeCloseTo(1 - (0.13 + 0.079 + 0.19 + 0.261), 9);
  });
});

describe("lobeState and describeStates", () => {
  it("knows the four states", () => {
    expect(LOBE_STATES.map(state => state.id)).toEqual(["intact", "portal", "arterial", "resected"]);
    expect(lobeState("portal").short).toBe("PVL");
    expect(() => lobeState("melted" as LobeState)).toThrow(RangeError);
  });

  it("names what was done to the liver", () => {
    expect(describeStates(lobes, intactStates(lobes))).toBe("intact liver");
    expect(describeStates(lobes, {...intactStates(lobes), sg8: "portal", sg7: "resected"}))
      .toBe("resected sg7; PVL sg8");
  });
});
