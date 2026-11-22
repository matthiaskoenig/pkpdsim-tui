import {describe, expect, it} from "vitest";
import {retryDelay} from "../src/tuio.ts";

describe("retryDelay", () => {
  it("asks again at once and then waits longer every time", () => {
    expect(retryDelay(1)).toBe(1000);
    expect(retryDelay(2)).toBe(2000);
    expect(retryDelay(3)).toBe(4000);
  });

  it("never waits longer than eight seconds, so a tracker which comes back is found", () => {
    expect(retryDelay(4)).toBe(8000);
    expect(retryDelay(40)).toBe(8000);
  });

  it("treats a first attempt that was not counted as the first", () => {
    expect(retryDelay(0)).toBe(1000);
  });
});
