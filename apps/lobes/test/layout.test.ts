import {describe, expect, it} from "vitest";
import fixture from "../../../packages/lobes-sim/test/fixtures/human-cases.json" with {type: "json"};
import {blockAt, liverLayout} from "../src/layout.ts";
import type {Lobe} from "@pkpdsim-tui/lobes-sim";
import type {LobeBlock} from "../src/layout.ts";

const lobes = fixture.lobes as Lobe[];
const box = {x: 0, y: 0, width: 1000, height: 800};

describe("liverLayout", () => {
  const blocks = liverLayout(lobes, box);

  it("lays out every segment", () => {
    expect(blocks.map(block => block.token).sort())
      .toEqual(["sg1", "sg2", "sg3", "sg4", "sg5", "sg6", "sg7", "sg8"]);
  });

  it("gives a segment the area of its mass", () => {
    const area = box.width * box.height;
    for (const block of blocks) {
      expect(block.width * block.height / area, block.token).toBeCloseTo(block.share, 6);
    }
  });

  it("fills the box without a gap or an overlap", () => {
    const covered = blocks.reduce((sum, block) => sum + block.width * block.height, 0);
    expect(covered).toBeCloseTo(box.width * box.height, 6);
    for (const block of blocks) {
      for (const other of blocks) {
        if (other === block) continue;
        const overlap = Math.max(0, Math.min(block.x + block.width, other.x + other.width) - Math.max(block.x, other.x))
          * Math.max(0, Math.min(block.y + block.height, other.y + other.height) - Math.max(block.y, other.y));
        expect(overlap, `${block.token}/${other.token}`).toBeCloseTo(0, 6);
      }
    }
  });

  it("puts the right lobe on the left, as the body is seen from the front", () => {
    const of = (token: string): number => {
      const block = blocks.find(candidate => candidate.token === token);
      if (block === undefined) throw new Error(token);
      return block.x + block.width / 2;
    };
    for (const right of ["sg5", "sg6", "sg7", "sg8"]) {
      for (const left of ["sg2", "sg3", "sg4"]) {
        expect(of(right), `${right} left of ${left}`).toBeLessThan(of(left));
      }
    }
  });

  it("puts the caudate lobe between the right and the left lobe", () => {
    const of = (token: string): LobeBlock => {
      const block = blocks.find(candidate => candidate.token === token);
      if (block === undefined) throw new Error(token);
      return block;
    };
    const caudate = of("sg1");
    expect(caudate.height).toBe(box.height);
    expect(caudate.x).toBeGreaterThan(of("sg5").x);
    expect(caudate.x).toBeLessThan(of("sg4").x);
  });

  it("keeps the place of a segment when another one is lost", () => {
    const without = liverLayout(lobes, box);
    for (const block of blocks) {
      const same = without.find(candidate => candidate.token === block.token);
      expect(same?.x, block.token).toBe(block.x);
    }
  });

  it("leaves a gap between the blocks when it is asked for", () => {
    const spaced = liverLayout(lobes, box, 10);
    for (const block of spaced) {
      const tight = blocks.find(candidate => candidate.token === block.token);
      expect(block.width, block.token).toBeCloseTo((tight?.width ?? 0) - 10, 6);
    }
  });

  it("falls back to a single row for lobes it has no arrangement for", () => {
    const two: Lobe[] = [
      {token: "a", name: "a", mass_fraction: 0.25, source: ""},
      {token: "b", name: "b", mass_fraction: 0.75, source: ""},
    ];
    const row = liverLayout(two, box);
    expect(row.map(block => block.width)).toEqual([250, 750]);
    expect(row.every(block => block.height === 800)).toBe(true);
  });

  it("is empty when the lobes carry no mass", () => {
    expect(liverLayout([{token: "a", name: "a", mass_fraction: 0, source: ""}], box)).toEqual([]);
  });
});

describe("blockAt", () => {
  const blocks = liverLayout(lobes, box);

  it("finds the segment under a point", () => {
    for (const block of blocks) {
      const found = blockAt(blocks, block.x + block.width / 2, block.y + block.height / 2);
      expect(found?.token, block.token).toBe(block.token);
    }
  });

  it("finds nothing outside the liver", () => {
    expect(blockAt(blocks, -10, -10)).toBeUndefined();
    expect(blockAt(blocks, box.width + 10, box.height / 2)).toBeUndefined();
  });
});
