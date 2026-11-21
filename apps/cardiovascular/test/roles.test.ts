import {describe, expect, it} from "vitest";
import reference from "../../../packages/cardio-sim/test/fixtures/pressure-reference.json" with {type: "json"};
import {parsePressureReference} from "@pkpdsim-tui/cardio-sim";
import {roleForMarker, valueFromAngle} from "@pkpdsim-tui/tuio-input";
import type {TableToken} from "@pkpdsim-tui/tuio-input";
import {CARDIOVASCULAR_ROLES, controlsFromTokens, unassignedMarkers} from "../src/roles.ts";
import {cardRotation} from "../src/tokens.ts";

const pressure = parsePressureReference(reference);

function token(sessionId: number, marker: number, angle: number, turn = angle): TableToken {
  return {sessionId, marker, typeId: 0, x: 0.5, y: 0.5, angle, turn, at: 0};
}

function tokens(...list: TableToken[]): ReadonlyMap<number, TableToken> {
  return new Map(list.map(entry => [entry.sessionId, entry]));
}

describe("CARDIOVASCULAR_ROLES", () => {
  it("covers the four resistances of the model on four markers", () => {
    expect(CARDIOVASCULAR_ROLES.map(role => role.id))
      .toEqual(["hepatic", "systemic", "portal", "renal"]);
    expect(CARDIOVASCULAR_ROLES.flatMap(role => [...role.markers])).toEqual([1, 2, 3, 4]);
  });

  it("keeps the reference of every role at the value the model runs at without it", () => {
    for (const role of CARDIOVASCULAR_ROLES) {
      expect(role.reference).toBe(1);
      expect(role.min).toBeLessThanOrEqual(1);
      expect(role.max).toBeGreaterThan(1);
    }
  });
});

describe("controlsFromTokens", () => {
  it("gives the reference controls on an empty surface", () => {
    const controls = controlsFromTokens(CARDIOVASCULAR_ROLES, tokens(), pressure);
    expect(controls).toEqual({
      hepatic: 1, systemic: 1, portal: 1, renal: 1,
      arterial: pressure.arterial_pressure, venous: pressure.venous_pressure,
    });
  });

  it("takes the value of the angle of a token", () => {
    const role = roleForMarker(CARDIOVASCULAR_ROLES, 1);
    expect(role?.id).toBe("hepatic");
    const controls = controlsFromTokens(CARDIOVASCULAR_ROLES, tokens(token(5, 1, 1.2)), pressure);
    expect(controls.hepatic).toBeCloseTo(valueFromAngle(role!, 1.2), 12);
    expect(controls.systemic).toBe(1);
  });

  it("ignores a token whose marker no role claims", () => {
    const controls = controlsFromTokens(CARDIOVASCULAR_ROLES, tokens(token(5, 99, 1.2)), pressure);
    expect(controls.hepatic).toBe(1);
    expect(controls.systemic).toBe(1);
  });

  it("lets the token that arrived last win when two carry one role", () => {
    const first = token(5, 1, 0.4);
    const second = token(9, 1, -0.4 + Math.PI * 2);
    const controls = controlsFromTokens(CARDIOVASCULAR_ROLES, tokens(first, second), pressure);
    expect(controls.hepatic).toBeCloseTo(valueFromAngle(CARDIOVASCULAR_ROLES[0]!, second.angle), 12);
    expect(controls.hepatic).toBeLessThan(1.0001);
  });

  it("measures a relative role from the turn it was put down at", () => {
    const roles = [{...CARDIOVASCULAR_ROLES[1]!, mode: "relative" as const, turns: 1}];
    const placed = token(7, 2, 1.0, 1.0);
    const twisted = token(7, 2, 1.0 + Math.PI / 2, 1.0 + Math.PI / 2);
    const origins = new Map([[7, 1.0]]);
    expect(controlsFromTokens(roles, tokens(placed), pressure, origins).systemic).toBeCloseTo(1, 12);
    expect(controlsFromTokens(roles, tokens(twisted), pressure, origins).systemic)
      .toBeCloseTo(valueFromAngle(roles[0]!, twisted.turn, 1.0), 12);
  });

  it("never leaves the pressure boundaries of the reference", () => {
    const controls = controlsFromTokens(CARDIOVASCULAR_ROLES, tokens(token(1, 4, 2.5)), pressure);
    expect(controls.arterial).toBe(pressure.arterial_pressure);
    expect(controls.venous).toBe(pressure.venous_pressure);
  });
});

describe("unassignedMarkers", () => {
  it("names the markers on the surface that no role claims", () => {
    expect(unassignedMarkers(CARDIOVASCULAR_ROLES, tokens(token(1, 1, 0), token(2, 42, 0))))
      .toEqual([42]);
  });

  it("reports each unknown marker once", () => {
    expect(unassignedMarkers(CARDIOVASCULAR_ROLES, tokens(token(1, 42, 0), token(2, 42, 0))))
      .toEqual([42]);
  });
});

describe("cardRotation", () => {
  it("turns a card to the nearest edge of the table", () => {
    expect(cardRotation(0.5, 0.9)).toBe(0);
    expect(cardRotation(0.5, 0.1)).toBe(180);
    expect(cardRotation(0.1, 0.5)).toBe(90);
    expect(cardRotation(0.9, 0.5)).toBe(-90);
  });

  it("faces the near edge in the middle of the table", () => {
    expect(cardRotation(0.5, 0.5)).toBe(0);
  });

  it("picks one edge in a corner", () => {
    expect([0, 90]).toContain(cardRotation(0.08, 0.92));
  });
});
