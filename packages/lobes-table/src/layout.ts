/**
 * Where a segment of the liver lies on the table.
 *
 * A segment is a block whose area is its share of the mass of the liver, and the blocks keep
 * their place: an object that lies on a segment has to stay on that segment while the plan
 * changes, because a physical object cannot move itself when the picture is redrawn. The loss of
 * mass is shown by the state of a block, never by taking its place away.
 *
 * The arrangement follows the anatomy as the body is seen from the front, so the right lobe of
 * the liver is on the left of the picture.
 */

import type {Lobe} from "@pkpdsim-tui/lobes-sim";
import type {Box} from "@pkpdsim-tui/tui-kit";

export type {Box};

export interface LobeBlock {
  readonly token: string;
  readonly name: string;
  /** The share of the mass of the liver, which is the share of the area. */
  readonly share: number;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** A leaf is a segment; a split divides its box among its children. */
type Arrangement =
  | {readonly token: string}
  | {readonly split: "row" | "column"; readonly children: readonly Arrangement[]};

/**
 * The Couinaud segments of the human liver: the right lobe with its posterior sector (VII above
 * VI) and its anterior sector (VIII above V), the left lobe with the medial segment IV against
 * the right lobe and the lateral segments II and III, and the caudate lobe as the strip between
 * the two, where it lies between the portal vein and the vena cava.
 */
const HUMAN: Arrangement = {
  split: "row",
  children: [
    {
      split: "row",
      children: [
        {split: "column", children: [{token: "sg7"}, {token: "sg6"}]},
        {split: "column", children: [{token: "sg8"}, {token: "sg5"}]},
      ],
    },
    {token: "sg1"},
    {
      split: "row",
      children: [
        {token: "sg4"},
        {split: "column", children: [{token: "sg2"}, {token: "sg3"}]},
      ],
    },
  ],
};

/** The lobes of the rat: the right lobe, the two halves of the median lobe, the left lateral lobe. */
const RAT: Arrangement = {
  split: "row",
  children: [{token: "rl"}, {token: "rml"}, {token: "cl"}, {token: "lml"}, {token: "lll"}],
};

/** The lobes of the mouse: the right superior and inferior lobes, the median and the left lobe. */
const MOUSE: Arrangement = {
  split: "row",
  children: [
    {split: "column", children: [{token: "rs"}, {token: "ri"}]},
    {token: "cl"},
    {token: "ml"},
    {token: "ll"},
  ],
};

const ARRANGEMENTS: readonly Arrangement[] = [HUMAN, RAT, MOUSE];

function tokensOf(arrangement: Arrangement): string[] {
  return "token" in arrangement
    ? [arrangement.token]
    : arrangement.children.flatMap(tokensOf);
}

/** The arrangement that covers exactly these lobes, or a single row when none does. */
function arrangementFor(lobes: readonly Lobe[]): Arrangement {
  const wanted = [...lobes.map(lobe => lobe.token)].sort();
  for (const arrangement of ARRANGEMENTS) {
    const covered = tokensOf(arrangement).sort();
    if (covered.length === wanted.length && covered.every((token, index) => token === wanted[index])) {
      return arrangement;
    }
  }
  return {split: "row", children: lobes.map(lobe => ({token: lobe.token}))};
}

/** The blocks of the liver, laid out so that the area of a block is its share of the mass. */
export function liverLayout(lobes: readonly Lobe[], box: Box, gap = 0): LobeBlock[] {
  const named = new Map(lobes.map(lobe => [lobe.token, lobe]));
  const total = lobes.reduce((sum, lobe) => sum + Math.max(lobe.mass_fraction, 0), 0);
  if (total <= 0) return [];
  const weightOf = (arrangement: Arrangement): number => "token" in arrangement
    ? Math.max(named.get(arrangement.token)?.mass_fraction ?? 0, 0) / total
    : arrangement.children.reduce((sum, child) => sum + weightOf(child), 0);

  const blocks: LobeBlock[] = [];
  const place = (arrangement: Arrangement, area: Box): void => {
    if ("token" in arrangement) {
      const lobe = named.get(arrangement.token);
      if (lobe === undefined) return;
      blocks.push({
        token: lobe.token,
        name: lobe.name,
        share: Math.max(lobe.mass_fraction, 0) / total,
        x: area.x + gap / 2,
        y: area.y + gap / 2,
        width: Math.max(area.width - gap, 0),
        height: Math.max(area.height - gap, 0),
      });
      return;
    }
    const weight = weightOf(arrangement);
    if (weight <= 0) return;
    let offset = 0;
    for (const child of arrangement.children) {
      const share = weightOf(child) / weight;
      if (share <= 0) continue;
      if (arrangement.split === "row") {
        const width = area.width * share;
        place(child, {x: area.x + offset, y: area.y, width, height: area.height});
        offset += width;
      } else {
        const height = area.height * share;
        place(child, {x: area.x, y: area.y + offset, width: area.width, height});
        offset += height;
      }
    }
  };
  place(arrangementFor(lobes), box);
  return blocks;
}

/** The segment under a point of the table, which is what an instrument acts on. */
export function blockAt(blocks: readonly LobeBlock[], x: number, y: number): LobeBlock | undefined {
  return blocks.find(block =>
    x >= block.x && x <= block.x + block.width && y >= block.y && y <= block.y + block.height);
}
