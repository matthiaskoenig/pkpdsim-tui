/**
 * Who the tables open for: the address says it, and where it says nothing the answer of the
 * screen before it does.
 */

import {describe, expect, it} from "vitest";
import {referenceBody} from "@pkpdsim-tui/cardio-sim";
import {CHILD_AGE, personOf} from "../src/person.ts";

describe("the person of the address", () => {
  it("opens at the reference adult when nobody said who is looking", () => {
    const person = personOf(new URLSearchParams());
    expect(person.age).toBe(35);
    expect(person.sex).toBe("female");
    expect(person.weight).toBeCloseTo(referenceBody(35, "female").weight, 6);
    expect(person.height).toBeCloseTo(referenceBody(35, "female").height, 6);
  });

  it("opens at a child of ten when a child said they were looking", () => {
    const person = personOf(new URLSearchParams("level=child&sex=male"));
    expect(person.age).toBe(CHILD_AGE);
    // The body of that age carries the weight and the height with it, so the three numbers of
    // the screen are the three numbers of a ten year old rather than of a grown up.
    const body = referenceBody(CHILD_AGE, "male");
    expect(person.weight).toBeCloseTo(body.weight, 6);
    expect(person.height).toBeCloseTo(body.height, 6);
    expect(person.weight).toBeLessThan(referenceBody(35, "male").weight);
  });

  it("opens at the reference adult for a grown up and for somebody of the field", () => {
    expect(personOf(new URLSearchParams("level=adult")).age).toBe(35);
    expect(personOf(new URLSearchParams("level=expert")).age).toBe(35);
  });

  it("keeps what the address says, whoever is looking", () => {
    const person = personOf(new URLSearchParams("level=child&age=52&bw=91.5&height=174"));
    expect(person.age).toBe(52);
    expect(person.weight).toBe(91.5);
    expect(person.height).toBe(174);
  });
});
