import {describe, expect, it} from "vitest";
import reference from "../../../packages/cardio-sim/test/fixtures/pressure-reference.json" with {type: "json"};
import {parsePressureReference} from "@pkpdsim-tui/cardio-sim";
import {createVoice} from "@pkpdsim-tui/tui-kit";
import {roleForMarker, valueFromAngle} from "@pkpdsim-tui/tuio-input";
import type {TableToken} from "@pkpdsim-tui/tuio-input";
import {
  cardiovascularRoles, controlsFromTokens, heartControlsFromTokens,
} from "../src/roles.ts";
import {unassignedMarkers} from "@pkpdsim-tui/tuio-input";

const pressure = parsePressureReference(reference);

function token(sessionId: number, marker: number, angle: number, turn = angle): TableToken {
  return {sessionId, marker, typeId: 0, x: 0.5, y: 0.5, angle, turn, at: 0};
}

function tokens(...list: TableToken[]): ReadonlyMap<number, TableToken> {
  return new Map(list.map(entry => [entry.sessionId, entry]));
}

const CARDIOVASCULAR_ROLES = cardiovascularRoles(createVoice("en", "adult"));
const HEART_ROLES = CARDIOVASCULAR_ROLES.slice(0, 2);
const RESISTANCE_ROLES = CARDIOVASCULAR_ROLES.slice(2);

describe("the objects of the circulation", () => {
  it("covers the two of the heart and the two resistances, on four markers", () => {
    // The heart is picked up first, because it is what drives everything else. The two
    // resistances of the liver were taken off the table: four objects is what a visitor holds.
    expect(HEART_ROLES.map(role => role.id)).toEqual(["heartRate", "contractility"]);
    expect(RESISTANCE_ROLES.map(role => role.id)).toEqual(["systemic", "renal"]);
    expect(CARDIOVASCULAR_ROLES.flatMap(role => [...role.markers])).toEqual([1, 2, 3, 4]);
  });

  it("keeps the reference of every role at the value the model runs at without it", () => {
    for (const role of RESISTANCE_ROLES) {
      expect(role.reference).toBe(1);
      expect(role.min).toBeLessThanOrEqual(1);
      expect(role.max).toBeGreaterThan(1);
    }
    const [rate, contractility] = HEART_ROLES;
    expect(rate?.reference).toBe(75);
    expect(rate?.min).toBe(40);
    expect(rate?.max).toBe(150);
    expect(contractility?.reference).toBe(1);
  });
});

describe("heartControlsFromTokens", () => {
  it("gives the heart of the individual at rest on an empty surface", () => {
    expect(heartControlsFromTokens(CARDIOVASCULAR_ROLES, tokens())).toEqual({
      hepatic: 1, systemic: 1, portal: 1, renal: 1, heartRate: 75, contractility: 1,
    });
  });

  it("reads the rate off the object on marker one", () => {
    const role = roleForMarker(CARDIOVASCULAR_ROLES, 1);
    expect(role?.id).toBe("heartRate");
    const controls = heartControlsFromTokens(CARDIOVASCULAR_ROLES, tokens(token(3, 1, 0.8)));
    expect(controls.heartRate).toBeCloseTo(valueFromAngle(role!, 0.8), 12);
    expect(controls.contractility).toBe(1);
  });

  it("never asks the model for a rate it was not built for", () => {
    for (const angle of [-3, -1, 0, 1, 3]) {
      const controls = heartControlsFromTokens(CARDIOVASCULAR_ROLES, tokens(token(3, 1, angle)));
      expect(controls.heartRate).toBeGreaterThanOrEqual(40);
      expect(controls.heartRate).toBeLessThanOrEqual(150);
    }
  });
});

describe("controlsFromTokens", () => {
  it("gives the reference controls on an empty surface", () => {
    const controls = controlsFromTokens(RESISTANCE_ROLES, tokens(), pressure);
    expect(controls).toEqual({
      hepatic: 1, systemic: 1, portal: 1, renal: 1,
      arterial: pressure.arterial_pressure, venous: pressure.venous_pressure,
    });
  });

  it("takes the value of the angle of a token", () => {
    const role = roleForMarker(RESISTANCE_ROLES, 4);
    expect(role?.id).toBe("renal");
    const controls = controlsFromTokens(CARDIOVASCULAR_ROLES, tokens(token(5, 4, 1.2)), pressure);
    expect(controls.renal).toBeCloseTo(valueFromAngle(role!, 1.2), 12);
    expect(controls.systemic).toBe(1);
  });

  it("ignores a token whose marker no role claims", () => {
    const controls = controlsFromTokens(CARDIOVASCULAR_ROLES, tokens(token(5, 99, 1.2)), pressure);
    expect(controls.renal).toBe(1);
    expect(controls.systemic).toBe(1);
  });

  it("leaves the two resistances of the liver at the reference, whatever is on the surface", () => {
    const controls = controlsFromTokens(CARDIOVASCULAR_ROLES, tokens(token(5, 4, 1.2)), pressure);
    expect(controls.hepatic).toBe(1);
    expect(controls.portal).toBe(1);
  });

  it("lets the token that arrived last win when two carry one role", () => {
    const first = token(5, 4, 0.4);
    const second = token(9, 4, -0.4 + Math.PI * 2);
    const controls = controlsFromTokens(CARDIOVASCULAR_ROLES, tokens(first, second), pressure);
    const renal = roleForMarker(RESISTANCE_ROLES, 4)!;
    expect(controls.renal).toBeCloseTo(valueFromAngle(renal, second.angle), 12);
    expect(controls.renal).toBeLessThan(1.0001);
  });

  it("measures a relative role from the turn it was put down at", () => {
    const roles = [{...roleForMarker(RESISTANCE_ROLES, 3)!, mode: "relative" as const, turns: 1}];
    const placed = token(7, 3, 1.0, 1.0);
    const twisted = token(7, 3, 1.0 + Math.PI / 2, 1.0 + Math.PI / 2);
    const origins = new Map([[7, 1.0]]);
    expect(controlsFromTokens(roles, tokens(placed), pressure, origins).systemic).toBeCloseTo(1, 12);
    expect(controlsFromTokens(roles, tokens(twisted), pressure, origins).systemic)
      .toBeCloseTo(valueFromAngle(roles[0]!, twisted.turn, 1.0), 12);
  });

  it("never leaves the pressure boundaries of the reference", () => {
    const controls = controlsFromTokens(CARDIOVASCULAR_ROLES, tokens(token(1, 5, 2.5)), pressure);
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
