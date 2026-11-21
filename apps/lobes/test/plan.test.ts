import {describe, expect, it} from "vitest";
import fixture from "../../../packages/lobes-sim/test/fixtures/human-cases.json" with {type: "json"};
import type {Lobe} from "@pkpdsim-tui/lobes-sim";
import {caseChanges} from "@pkpdsim-tui/lobes-sim";
import type {TableToken} from "@pkpdsim-tui/tuio-input";
import {liverLayout} from "../src/layout.ts";
import {idleInstruments, instrumentsOn, statesFrom} from "../src/plan.ts";
import {lobeRoles} from "../src/roles.ts";

const lobes = fixture.lobes as Lobe[];
const cases = fixture.cases as Record<string, {changes: Record<string, number>; lobes: string[]}>;
const viewport = {width: 1000, height: 800};
const blocks = liverLayout(lobes, {x: 0, y: 0, width: 1000, height: 800});
const roles = lobeRoles(5);

function at(marker: number, token: string, sessionId = marker): TableToken {
  const block = blocks.find(candidate => candidate.token === token);
  if (block === undefined) throw new Error(token);
  return {
    sessionId, marker, typeId: 0,
    x: (block.x + block.width / 2) / viewport.width,
    y: (block.y + block.height / 2) / viewport.height,
    angle: 0, turn: 0, at: 0,
  };
}

function surface(...tokens: TableToken[]): Map<number, TableToken> {
  return new Map(tokens.map(token => [token.sessionId, token]));
}

describe("instrumentsOn", () => {
  it("reads the segment under every instrument", () => {
    const instruments = instrumentsOn(roles, surface(at(5, "sg8"), at(7, "sg3")), blocks, viewport);
    expect(instruments.map(instrument => [instrument.role.id, instrument.token]))
      .toEqual([["portal", "sg8"], ["resect", "sg3"]]);
  });

  it("ignores the dial, which carries its value in its angle", () => {
    const dial: TableToken = {...at(8, "sg8"), marker: 8};
    expect(instrumentsOn(roles, surface(dial), blocks, viewport)).toEqual([]);
  });

  it("ignores a marker that no role claims", () => {
    expect(instrumentsOn(roles, surface({...at(5, "sg8"), marker: 42}), blocks, viewport)).toEqual([]);
  });

  it("reports an instrument beside the liver as lying on no segment", () => {
    const beside: TableToken = {...at(5, "sg8"), x: 1.4, y: 0.5};
    const instruments = instrumentsOn(roles, surface(beside), blocks, viewport);
    expect(instruments[0]?.token).toBeUndefined();
    expect(idleInstruments(instruments)).toHaveLength(1);
  });
});

describe("statesFrom", () => {
  it("leaves an empty table intact", () => {
    const states = statesFrom(lobes, []);
    expect(Object.values(states).every(state => state === "intact")).toBe(true);
    expect(caseChanges(states)).toEqual({});
  });

  it("builds a right portal vein ligation out of four clamps", () => {
    const instruments = instrumentsOn(roles, surface(
      at(5, "sg5", 1), at(5, "sg6", 2), at(5, "sg7", 3), at(5, "sg8", 4),
    ), blocks, viewport);
    expect(caseChanges(statesFrom(lobes, instruments))).toEqual(cases["right_pvl"]!.changes);
  });

  it("builds a right hepatectomy out of four cuts", () => {
    const instruments = instrumentsOn(roles, surface(
      ...cases["right_hepatectomy"]!.lobes.map((token, index) => at(7, token, index + 1)),
    ), blocks, viewport);
    expect(caseChanges(statesFrom(lobes, instruments))).toEqual(cases["right_hepatectomy"]!.changes);
  });

  it("treats both branches closed on one segment as a resection", () => {
    const instruments = instrumentsOn(roles, surface(at(5, "sg8", 1), at(6, "sg8", 2)), blocks, viewport);
    expect(statesFrom(lobes, instruments)["sg8"]).toBe("resected");
  });

  it("lets the scalpel win over a clamp on the same segment", () => {
    const instruments = instrumentsOn(roles, surface(at(5, "sg8", 1), at(7, "sg8", 2)), blocks, viewport);
    expect(statesFrom(lobes, instruments)["sg8"]).toBe("resected");
  });

  it("ignores an instrument that lies beside the liver", () => {
    const beside: TableToken = {...at(5, "sg8"), x: -0.5, y: 0.5};
    expect(caseChanges(statesFrom(lobes, instrumentsOn(roles, surface(beside), blocks, viewport))))
      .toEqual({});
  });
});
