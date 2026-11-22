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

  // The blocks are drawn inside the outline of a liver rather than filling a square, so the
  // area of a block is its share of the mass of the liver against the other blocks, and the
  // whole of them covers the organ rather than the box.
  it("gives a segment the area of its mass", () => {
    const covered = blocks.reduce((sum, block) => sum + block.width * block.height, 0);
    for (const block of blocks) {
      expect(block.width * block.height / covered, block.token).toBeCloseTo(block.share, 6);
    }
  });

  it("covers most of the box, and no block leaves it", () => {
    const covered = blocks.reduce((sum, block) => sum + block.width * block.height, 0);
    expect(covered).toBeGreaterThan(box.width * box.height * 0.8);
    expect(covered).toBeLessThanOrEqual(box.width * box.height + 1e-6);
    for (const block of blocks) {
      expect(block.x, block.token).toBeGreaterThanOrEqual(box.x - 1e-6);
      expect(block.y, block.token).toBeGreaterThanOrEqual(box.y - 1e-6);
      expect(block.x + block.width, block.token).toBeLessThanOrEqual(box.x + box.width + 1e-6);
      expect(block.y + block.height, block.token).toBeLessThanOrEqual(box.y + box.height + 1e-6);
    }
  });

  it("never lays one block over another", () => {
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
    expect(caudate.height).toBeCloseTo(box.height * 0.9, 6);
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

  // The left lobe of a liver hangs higher than the right one, which is what the blocks do.
  it("hangs the left lobe above the floor of the right one", () => {
    const low = (token: string): number => {
      const block = blocks.find(candidate => candidate.token === token);
      if (block === undefined) throw new Error(token);
      return block.y + block.height;
    };
    for (const left of ["sg2", "sg3", "sg4"]) {
      expect(low(left), left).toBeLessThan(low("sg6"));
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
