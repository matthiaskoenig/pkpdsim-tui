// @vitest-environment jsdom
import {beforeEach, describe, expect, it} from "vitest";
import {createMockTableInput} from "../src/mock.ts";
import type {TableSnapshot} from "../src/types.ts";

let element: HTMLElement;

beforeEach(() => {
  document.body.innerHTML = "<div id=\"surface\" style=\"width:1000px;height:500px\"></div>";
  element = document.getElementById("surface") as HTMLElement;
  element.getBoundingClientRect = () => ({
    x: 0, y: 0, left: 0, top: 0, right: 1000, bottom: 500, width: 1000, height: 500,
    toJSON: () => ({}),
  });
});

function pointerEvent(type: string, clientX: number, clientY: number, pointerId = 1): Event {
  const event = new Event(type, {bubbles: true}) as Event & Record<string, unknown>;
  Object.assign(event, {clientX, clientY, pointerId, button: 0, buttons: 1});
  return event;
}

function keyEvent(key: string): Event {
  const event = new Event("keydown", {bubbles: true}) as Event & Record<string, unknown>;
  Object.assign(event, {key});
  return event;
}

describe("the digit keys of the mock", () => {
  it("put the object of that number down where the markers are the numbers", () => {
    const input = createMockTableInput({element, markers: [1, 2, 3, 4]});
    input.connect();
    document.dispatchEvent(keyEvent("3"));
    expect([...input.snapshot.tokens.values()].map(token => token.marker)).toEqual([3]);
  });

  // A table which was given the ids of the markers of a real one is driven by the place of an
  // object in that list: 11 and 12 are no keys of a laptop, and they are objects 5 and 6.
  it("put the nth object down where the markers are the ids of a table", () => {
    const input = createMockTableInput({element, markers: [1, 3, 5, 6, 11, 12]});
    input.connect();
    for (const key of ["2", "5", "6"]) document.dispatchEvent(keyEvent(key));
    expect([...input.snapshot.tokens.values()].map(token => token.marker)).toEqual([3, 11, 12]);
  });

  it("put nothing down for a key no object of the table has", () => {
    const input = createMockTableInput({element, markers: [1, 2]});
    input.connect();
    for (const key of ["0", "3", "9"]) document.dispatchEvent(keyEvent(key));
    expect(input.snapshot.tokens.size).toBe(0);
  });
});

describe("createMockTableInput", () => {
  it("reports itself connected on the mouse", () => {
    const input = createMockTableInput({element, markers: [1, 2, 3, 4]});
    input.connect();
    expect(input.status.state).toBe("connected");
    expect(input.status.source).toMatch(/mouse/i);
  });

  it("places, moves, turns and lifts a token", () => {
    const input = createMockTableInput({element, markers: [1, 2, 3, 4]});
    const seen: TableSnapshot[] = [];
    input.subscribe(snapshot => seen.push(snapshot));
    input.connect();

    const placed = input.place(2, 0.25, 0.5);
    expect(input.snapshot.tokens.get(placed)).toMatchObject({marker: 2, x: 0.25, y: 0.5, angle: 0});

    element.dispatchEvent(pointerEvent("pointerdown", 250, 250));
    element.dispatchEvent(pointerEvent("pointermove", 500, 125));
    expect(input.snapshot.tokens.get(placed)).toMatchObject({x: 0.5, y: 0.25});
    element.dispatchEvent(pointerEvent("pointerup", 500, 125));

    const wheel = new Event("wheel", {bubbles: true}) as Event & Record<string, unknown>;
    Object.assign(wheel, {clientX: 500, clientY: 125, deltaY: 100});
    element.dispatchEvent(wheel);
    expect(input.snapshot.tokens.get(placed)?.turn).toBeGreaterThan(0);

    input.lift(placed);
    expect(input.snapshot.tokens.size).toBe(0);
    expect(seen.length).toBeGreaterThan(3);
  });

  it("turns in both directions and crosses the 2 pi boundary", () => {
    const input = createMockTableInput({element, markers: [1]});
    input.connect();
    const placed = input.place(1, 0.5, 0.5);
    for (let step = 0; step < 40; step++) {
      const wheel = new Event("wheel", {bubbles: true}) as Event & Record<string, unknown>;
      Object.assign(wheel, {clientX: 500, clientY: 250, deltaY: -100});
      element.dispatchEvent(wheel);
    }
    const turned = input.snapshot.tokens.get(placed);
    expect(turned?.turn).toBeLessThan(-Math.PI);
    expect(turned?.angle).toBeGreaterThanOrEqual(0);
    expect(turned?.angle).toBeLessThan(Math.PI * 2);
  });

  it("ignores a lift of a session that is not on the surface", () => {
    const input = createMockTableInput({element, markers: [1]});
    input.connect();
    expect(() => input.lift(123)).not.toThrow();
    expect(input.snapshot.tokens.size).toBe(0);
  });
});
