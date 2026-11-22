import {describe, expect, it} from "vitest";
import {namedRole} from "../src/roles.ts";
import {createVoice} from "../src/voice.ts";

const voice = createVoice("en", "adult");
const RANGE = {id: "flow", unit: "ml/min", min: 50, max: 300, reference: 150, markers: [1]};

describe("namedRole", () => {
  it("names a dial of the table in the words of the visitor", () => {
    const role = namedRole({label: "Flow", info: "What the pump moves."}, voice, RANGE);
    expect(role).toMatchObject({
      id: "flow", label: "Flow", description: "What the pump moves.", unit: "ml/min",
      markers: [1], min: 50, max: 300, reference: 150,
      mode: "absolute", scale: "linear", turns: 1,
    });
  });

  it("carries the background of the light bulb only where the text has one", () => {
    const without = namedRole({label: "Flow", info: "What the pump moves."}, voice, RANGE);
    expect("background" in without).toBe(false);
    const withMore = namedRole(
      {label: "Flow", info: "What the pump moves.", more: "The pump stands for the heart."},
      voice, RANGE);
    expect(withMore.background).toBe("The pump stands for the heart.");
  });

  it("says what an object does differently from the rest", () => {
    const role = namedRole({label: "Growth", info: "How fast it grows back."}, voice, RANGE,
      {scale: "log", mode: "relative", steps: [1, 2, 3]});
    expect(role).toMatchObject({scale: "log", mode: "relative", steps: [1, 2, 3]});
  });

  it("reads a phrase at the level of the visitor", () => {
    const child = createVoice("en", "child");
    const words = {label: {adult: "Oxygen", child: "Air"}, info: {adult: "The gas.", child: "To breathe."}};
    expect(namedRole(words, child, RANGE)).toMatchObject({label: "Air", description: "To breathe."});
    expect(namedRole(words, voice, RANGE)).toMatchObject({label: "Oxygen", description: "The gas."});
  });
});
