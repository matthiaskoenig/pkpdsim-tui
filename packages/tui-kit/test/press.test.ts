// @vitest-environment jsdom
/**
 * The two gestures which press something on a table: a tap, and a finger which rests on it.
 *
 * Hit testing belongs to a browser, so the layer is told where the elements of this page are
 * and the fingers are moved over them by hand, one frame at a time, on a clock of our own.
 */
import {beforeEach, describe, expect, it} from "vitest";
import {createPress, PRESS} from "../src/press.ts";
import type {PressPoint, PressTarget} from "../src/press.ts";

/** Two switches side by side, each 100 pixels wide, and the glass beside them. */
const BOXES = [
  {key: "left", from: 0, to: 100},
  {key: "right", from: 100, to: 200},
];

let pressed: string[];
let elements: Map<string, HTMLElement>;

function target(key: string): PressTarget | undefined {
  const element = elements.get(key);
  return element === undefined ? undefined : {element, key};
}

function layer(options: {onPoint?: (point: PressPoint) => boolean} = {}) {
  return createPress({
    ...options,
    targetAt: point => {
      const box = BOXES.find(one => point.x >= one.from && point.x < one.to);
      return box === undefined || point.y < 0 || point.y > 100 ? undefined : target(box.key);
    },
    keyed: target,
    onPress: found => pressed.push(found.key),
  });
}

/** A finger, which is one point of one frame. */
const finger = (x: number, y = 50, id = 1): PressPoint => ({id, x, y});

beforeEach(() => {
  pressed = [];
  elements = new Map(BOXES.map(box => {
    const element = document.createElement("button");
    element.dataset["dwell"] = box.key;
    document.body.appendChild(element);
    return [box.key, element];
  }));
});

describe("a finger which rests on a switch", () => {
  it("presses it once, after the fill has run", () => {
    const press = layer();
    press.follow([finger(50)], 0);
    press.follow([finger(50)], PRESS - 10);
    expect(pressed).toEqual([]);
    press.follow([finger(50)], PRESS);
    expect(pressed).toEqual(["left"]);
    press.follow([finger(50)], PRESS + 500);
    press.follow([], PRESS + 520);
    expect(pressed).toEqual(["left"]);
  });

  it("fills it while it is there, and lets go of it when it goes", () => {
    const press = layer();
    press.follow([finger(50)], 0);
    expect(elements.get("left")?.dataset["arming"]).toBe("true");
    press.follow([], 100);
    expect(elements.get("left")?.dataset["arming"]).toBeUndefined();
  });

  it("starts again on the other switch when it slides onto it", () => {
    const press = layer();
    press.follow([finger(50)], 0);
    press.follow([finger(150)], PRESS - 10);
    press.follow([finger(150)], PRESS);
    expect(pressed).toEqual([]);
    press.follow([finger(150)], PRESS - 10 + PRESS);
    expect(pressed).toEqual(["right"]);
  });
});

describe("a finger which taps a switch", () => {
  it("presses it when it goes, which is what a phone does", () => {
    const press = layer();
    press.follow([finger(50)], 0);
    press.follow([finger(52)], 120);
    press.follow([], 140);
    expect(pressed).toEqual(["left"]);
  });

  it("presses the switch it landed on even where the drawing is new", () => {
    const press = layer();
    press.follow([finger(50)], 0);
    press.follow([finger(50)], 120);
    // The panel is drawn again while the finger is on it, which is what the name is for.
    const fresh = document.createElement("button");
    fresh.dataset["dwell"] = "left";
    elements.get("left")?.remove();
    elements.set("left", fresh);
    document.body.appendChild(fresh);
    press.follow([], 140);
    expect(pressed).toEqual(["left"]);
  });

  it("presses nothing when it was there for a moment only, which is the tracker flickering", () => {
    const press = layer();
    press.follow([finger(50)], 0);
    press.follow([], 20);
    expect(pressed).toEqual([]);
  });

  it("presses nothing when it moved off the switch before it went", () => {
    const press = layer();
    press.follow([finger(50)], 0);
    // Off the switches, on the glass beside them, and gone from there.
    press.follow([finger(50, 400)], 100);
    press.follow([], 120);
    expect(pressed).toEqual([]);
  });

  it("presses nothing when it travelled across the switch, which is a hand on the glass", () => {
    const press = layer();
    press.follow([finger(5)], 0);
    press.follow([finger(95)], 100);
    press.follow([], 120);
    expect(pressed).toEqual([]);
  });

  it("presses one switch for each finger of a visitor", () => {
    const press = layer();
    press.follow([finger(50, 50, 1), finger(150, 50, 2)], 0);
    press.follow([finger(50, 50, 1), finger(150, 50, 2)], 120);
    press.follow([], 140);
    expect([...pressed].sort()).toEqual(["left", "right"]);
  });
});

describe("the mouse of a laptop", () => {
  // The page sends the click of a mouse by itself, so the finger it stands for presses nothing:
  // an element would otherwise be pressed twice on the machine this is developed on.
  it("presses nothing of its own, by a tap or by a rest", () => {
    const press = layer();
    const mouse = (x: number): PressPoint => ({id: 1, x, y: 50, mouse: true});
    press.follow([mouse(50)], 0);
    press.follow([mouse(50)], PRESS + 100);
    press.follow([], PRESS + 120);
    expect(pressed).toEqual([]);
    expect(elements.get("left")?.dataset["arming"]).toBeUndefined();
  });
});

describe("a finger which is something else", () => {
  it("presses nothing where the page took it for itself", () => {
    const taken: number[] = [];
    const press = layer({onPoint: point => {
      taken.push(point.x);
      return true;
    }});
    press.follow([finger(50)], 0);
    press.follow([finger(50)], PRESS + 100);
    press.follow([], PRESS + 120);
    expect(pressed).toEqual([]);
    expect(taken).toEqual([50, 50]);
  });
});
