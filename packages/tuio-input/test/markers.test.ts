/**
 * The ids the markers of a table carry, which an application is told at the address it is
 * opened with: the objects of a table are numbered from 1 here, and the pucks of a real table
 * carry whatever was printed on them.
 */

import {describe, expect, it} from "vitest";
import {markerIds, markerOf, markersOn, rolesOn} from "../src/markers.ts";
import {roleForMarker} from "../src/roles.ts";
import type {TokenRole} from "../src/roles.ts";

function query(search: string): URLSearchParams {
  return new URLSearchParams(search);
}

const DIAL: TokenRole = {
  id: "heartRate", label: "How fast the heart beats", description: "The rate of the heart.",
  unit: "/min", markers: [1], min: 40, max: 180, reference: 70,
  mode: "absolute", scale: "linear", turns: 1,
};

describe("the ids a table says at its address", () => {
  it("are nothing at all when it says none, which is the markers from 1", () => {
    expect(markerIds(query(""))).toEqual([]);
    expect(markerIds(query("?lang=de"))).toEqual([]);
    expect(markerIds(query("?ids="))).toEqual([]);
    expect(markerOf([], 1)).toBe(1);
    expect(markerOf([], 6)).toBe(6);
  });

  it("are the pucks of the table, in the order its objects are picked up", () => {
    const ids = markerIds(query("?ids=1,3,5,6,11,12,21"));
    expect(ids).toEqual([1, 3, 5, 6, 11, 12, 21]);
    expect(markerOf(ids, 1)).toBe(1);
    expect(markerOf(ids, 2)).toBe(3);
    expect(markerOf(ids, 6)).toBe(12);
    expect(markersOn(ids, [1, 2, 3, 4])).toEqual([1, 3, 5, 6]);
  });

  it("are read with the spaces somebody typed around them", () => {
    expect(markerIds(query("?ids= 1 , 3 ,5"))).toEqual([1, 3, 5]);
  });

  it("are whole numbers, and say so when they are not", () => {
    expect(() => markerIds(query("?ids=abc"))).toThrow(/ids/su);
    expect(() => markerIds(query("?ids=1,,3"))).toThrow(/ids/su);
    expect(() => markerIds(query("?ids=1,-3"))).toThrow(/ids/su);
    expect(() => markerIds(query("?ids=1,2.5"))).toThrow(/ids/su);
  });

  it("are each one object, and say which one was given twice", () => {
    expect(() => markerIds(query("?ids=1,3,1"))).toThrow(/1/su);
  });

  // A table of four objects which was given two ids cannot read the other two, and a visitor
  // turning an object nothing answers to is worse than a sentence at the start.
  it("say how many a table needs when it was given too few", () => {
    expect(() => markerOf([1, 3], 3)).toThrow(/3/su);
  });
});

describe("the roles of a table", () => {
  it("keep their markers where the table is numbered the way the application is", () => {
    expect(rolesOn([], [DIAL])[0]?.markers).toEqual([1]);
  });

  // What the whole of it is for: an object of the table, with the id printed on it, is the
  // object of the model it was mapped to.
  it("are found by the id of the puck a visitor put down", () => {
    const roles = rolesOn([1, 3, 5], [
      DIAL, {...DIAL, id: "contractility", markers: [2]}, {...DIAL, id: "systemic", markers: [3]},
    ]);
    expect(roleForMarker(roles, 3)?.id).toBe("contractility");
    expect(roleForMarker(roles, 5)?.id).toBe("systemic");
    expect(roleForMarker(roles, 2)).toBeUndefined();
  });

  it("read their object from the id of this table, and are otherwise untouched", () => {
    const [mapped] = rolesOn([7, 8, 9], [DIAL, {...DIAL, id: "contractility", markers: [2, 3]}]);
    expect(mapped?.markers).toEqual([7]);
    expect(mapped?.label).toBe(DIAL.label);
    expect(mapped?.min).toBe(40);
    expect(rolesOn([7, 8, 9], [DIAL, {...DIAL, id: "x", markers: [2, 3]}])[1]?.markers)
      .toEqual([8, 9]);
  });
});

/**
 * The ids of a booth: said once, to the server which serves the table, so every page of it reads
 * the same markers and the address of a table carries nothing.
 */
describe("the ids the server carries", () => {
  const ids = (query: string, carried: string): readonly number[] =>
    markerIds(new URLSearchParams(query), carried);

  it("are the ids of every page of that table", () => {
    expect(ids("app=cardiovascular", "1,3,5,6,11,12,21")).toEqual([1, 3, 5, 6, 11, 12, 21]);
    expect(ids("", "1,3,5")).toEqual([1, 3, 5]);
  });

  it("give way to a page which says its own, which is how another list is tried", () => {
    expect(ids("ids=2,4,6", "1,3,5")).toEqual([2, 4, 6]);
  });

  it("are the markers from 1 where neither the page nor the server says any", () => {
    expect(ids("", "")).toEqual([]);
    expect(ids("ids=", "")).toEqual([]);
    // A page which empties the list reads what the table carries: an empty parameter is a page
    // which said nothing, not a page which said "no ids".
    expect(ids("ids=", "1,3,5")).toEqual([1, 3, 5]);
  });

  it("are refused like a list of an address is", () => {
    expect(() => ids("", "1,3,x")).toThrow(/whole numbers/u);
    expect(() => ids("", "1,3,3")).toThrow(/3 twice/u);
  });
});
