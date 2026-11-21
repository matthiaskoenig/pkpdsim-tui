import {describe, expect, it} from "vitest";

import {normalizeSpeech, speechKey} from "../src/speech.ts";

describe("what is read aloud", () => {
  it("reads the same sentence however it was written down", () => {
    expect(normalizeSpeech("  The liver\n  gets blood  ")).toBe("The liver gets blood");
    expect(speechKey("The liver gets blood")).toBe(speechKey("  The liver\n gets blood "));
  });

  it("names a clip after the sentence it says, and keeps that name", () => {
    // The name of a clip is written into the manifest when it is recorded, so it may not move:
    // a table which was given its clips would stop finding them.
    expect(speechKey("The liver")).toBe("0e5f6694");
    expect(speechKey("Der Körper auf dem Tisch")).toBe("870b7419");
    expect(speechKey("")).toBe("811c9dc5");
    expect(speechKey("a")).toHaveLength(8);
  });

  it("gives two different sentences two different clips", () => {
    expect(speechKey("The liver")).not.toBe(speechKey("The lobes"));
  });
});
