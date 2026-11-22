/**
 * The liver on the table: a block for every segment, the inflow and the outflow below it, and
 * what the solved course says about each segment at the day the dial shows.
 *
 * The blocks keep their place while the plan changes, because the objects on the table cannot
 * move with them. A segment that lost a branch or was taken away says so where it lies.
 */

import type {Lobe, LobeState} from "@pkpdsim-tui/lobes-sim";
import {
  attributes, clamp, formatNumber, mixHex, perfusionColor, PERFUSION_NEUTRAL, svg, vesselWidth,
} from "@pkpdsim-tui/tui-kit";
import type {Box, Viewport, Voice} from "@pkpdsim-tui/tui-kit";
import {LOBE_TEXT} from "./text.ts";
import {liverLayout} from "./layout.ts";
import {monitorWidth} from "./monitors.ts";
import type {LobeBlock} from "./layout.ts";

/**
 * How far the organ stands out around the blocks it is drawn around, in pixels of the surface.
 * The blocks are clipped to the outline, so the slack is what keeps the clip to their corners.
 */
const ORGAN = {x: 42, y: 34} as const;

interface Point {
  readonly x: number;
  readonly y: number;
}

/** A closed smooth curve through these points, as the cubics of a path. */
function smoothLoop(points: readonly Point[]): string {
  const at = (index: number): Point =>
    points[((index % points.length) + points.length) % points.length] as Point;
  const start = at(0);
  let path = `M${start.x.toFixed(1)} ${start.y.toFixed(1)}`;
  for (let index = 0; index < points.length; index += 1) {
    const before = at(index - 1);
    const from = at(index);
    const to = at(index + 1);
    const after = at(index + 2);
    const first = {x: from.x + (to.x - before.x) / 6, y: from.y + (to.y - before.y) / 6};
    const second = {x: to.x - (after.x - from.x) / 6, y: to.y - (after.y - from.y) / 6};
    path += ` C${first.x.toFixed(1)} ${first.y.toFixed(1)} `
      + `${second.x.toFixed(1)} ${second.y.toFixed(1)} ${to.x.toFixed(1)} ${to.y.toFixed(1)}`;
  }
  return `${path} Z`;
}

/**
 * The outline of the organ the blocks are the segments of: a smooth curve around what they
 * cover, which follows their own profile. A human liver reaches lower on its right lobe than
 * on its left, and the blocks are laid out that way, so the organ drawn around them has the
 * shape of a liver rather than of the box they were given.
 */
export function liverOutline(blocks: readonly LobeBlock[], box: Box): string {
  if (blocks.length === 0) return "";
  // The profile of the blocks, column by column: how high and how low they reach over each
  // span of the width, which is where the outline is drawn around them.
  const edges = [...new Set(blocks.flatMap(block => [block.x, block.x + block.width]))]
    .sort((left, right) => left - right);
  const columns: {x: number; top: number; bottom: number}[] = [];
  for (let index = 0; index < edges.length - 1; index += 1) {
    const middle = ((edges[index] ?? 0) + (edges[index + 1] ?? 0)) / 2;
    const over = blocks.filter(block => block.x <= middle && block.x + block.width >= middle);
    if (over.length === 0) continue;
    columns.push({
      x: middle,
      top: Math.min(...over.map(block => block.y)),
      bottom: Math.max(...over.map(block => block.y + block.height)),
    });
  }
  const first = columns[0];
  const last = columns[columns.length - 1];
  if (first === undefined || last === undefined) return "";
  const points: Point[] = [
    // The round end of the organ at the left, over the top of every column to the right end,
    // and back along the floor of every column.
    {x: box.x - ORGAN.x, y: (first.top + first.bottom) / 2},
    ...columns.map(column => ({x: column.x, y: column.top - ORGAN.y})),
    {x: box.x + box.width + ORGAN.x, y: (last.top + last.bottom) / 2},
    ...[...columns].reverse().map(column => ({x: column.x, y: column.bottom + ORGAN.y})),
  ];
  return smoothLoop(points);
}

/** The bands of numbers at the two edges. */
const BAND = 132;
/** The curves of the regeneration below the liver, which are what this table is about. */
const PLOT_HEIGHT = 250;
const GAP = 26;
/** The room the inflow and the outflow of the whole liver take below the blocks. */
const HILUM = 92;
/** The room the hepatic veins take above the blocks. */
const OUTFLOW = 46;
const BLOCK_GAP = 7;
/** The room the panels take in the corners, which the course below the liver keeps out of. */
const PANEL = 380;
/** A block narrower than this has no room for the name of its segment. */
const NARROW = 190;
/** A block narrower than this has no room for a number either. */
const SLIVER = 96;

/** The room between the panel in the near corner and the monitors at the far side. */
function room(viewport: Viewport): {left: number; width: number} {
  const left = PANEL;
  const width = Math.max(360, viewport.width - left - monitorWidth(viewport) - GAP);
  return {left, width};
}

export function liverBox(viewport: Viewport): Box {
  const top = BAND + GAP + OUTFLOW;
  const height = Math.max(240, viewport.height - BAND * 2 - PLOT_HEIGHT - GAP * 3 - HILUM - OUTFLOW);
  // A liver is wider than it is tall, and the monitors and the objects need the rest.
  const space = room(viewport);
  const width = clamp(Math.min(space.width - GAP * 2, height * 2), 320, space.width);
  return {x: space.left + (space.width - width) / 2, y: top, width, height};
}

export function plotBox(viewport: Viewport): Box {
  const liver = liverBox(viewport);
  // The course sits under the liver, in the same room between the panel and the monitors.
  const space = room(viewport);
  const width = Math.min(Math.max(liver.width, 360), space.width - GAP * 2);
  return {
    x: space.left + (space.width - width) / 2, y: liver.y + liver.height + HILUM + GAP,
    width, height: PLOT_HEIGHT,
  };
}

export interface LiverView {
  readonly states: Readonly<Record<string, LobeState>>;
  /** The solved course at the day of the dial. */
  readonly sample: Readonly<Record<string, number>>;
  /** The same liver without the operation, at the same day. */
  readonly baseline: Readonly<Record<string, number>>;
}

interface BlockElements {
  readonly group: SVGGElement;
  readonly plate: SVGRectElement;
  readonly label: SVGTextElement;
  readonly name: SVGTextElement;
  readonly value: SVGTextElement;
  readonly note: SVGTextElement;
  readonly portalPip: SVGCircleElement;
  readonly arterialPip: SVGCircleElement;
  block: LobeBlock;
}

export interface LiverScene {
  readonly blocks: readonly LobeBlock[];
  resize(viewport: Viewport): void;
  update(view: LiverView): void;
}

/** The roman numeral of a Couinaud segment, or the id of a lobe that has no number. */
export function blockLabel(block: {name: string; token: string}): string {
  const roman = /^segment ([IVX]+)/.exec(block.name);
  return roman?.[1] ?? block.token.toUpperCase();
}

/** How a segment is named on a card beside an object: short enough to read at a glance. */
export function shortName(voice: Voice, block: {name: string; token: string}): string {
  const roman = /^segment ([IVX]+)/.exec(block.name);
  return roman === null ? block.name : voice.pick(LOBE_TEXT).segment(roman[1] ?? "");
}

/**
 * Where a segment lies, which is the part of its name worth reading on the block itself. A
 * child is not told it: the numeral is what a segment is called, and the rest is anatomy.
 */
export function blockName(voice: Voice, block: LobeBlock): string {
  if (voice.child) return "";
  const detail = /\(([^)]+)\)/.exec(block.name);
  const found = detail?.[1];
  if (found === undefined) return block.name;
  return voice.pick(LOBE_TEXT).segmentNames[found] ?? found;
}

/** The tint of a segment whose branch was closed, in the colour of that branch. */
const STATE_FILL: Readonly<Record<LobeState, string>> = {
  intact: PERFUSION_NEUTRAL,
  portal: "#a06cd5",
  arterial: "#e2574c",
  resected: "#e4eaef",
};

export function createLiverScene(
  parent: SVGSVGElement, lobes: readonly Lobe[], voice: Voice,
): LiverScene {
  const copy = voice.pick(LOBE_TEXT);
  const root = svg("g", {class: "layer layer--liver"}, parent);
  const vessels = svg("g", {class: "liver-vessels"}, root);
  const portal = svg("path", {class: "vessel vessel--portal", d: ""}, vessels);
  const artery = svg("path", {class: "vessel vessel--arterial", d: ""}, vessels);
  const hepatic = svg("path", {class: "vessel vessel--venous", d: ""}, vessels);
  const portalLabel = svg("text", {class: "trunk-label", x: 0, y: 0}, vessels);
  const arteryLabel = svg("text", {class: "trunk-label", x: 0, y: 0}, vessels);
  const hepaticLabel = svg("text", {class: "trunk-label", x: 0, y: 0}, vessels);
  // The organ the blocks are the segments of: it stands behind them, and the blocks are
  // clipped to it, so that the mosaic has the shape of a liver.
  const shape = svg("path", {class: "liver-shape", d: ""}, root);
  const defs = svg("defs", {}, root);
  const clip = svg("clipPath", {id: "lobes-liver-clip"}, defs);
  const clipPath = svg("path", {d: ""}, clip);
  const blockLayer = svg("g", {class: "liver-blocks", "clip-path": "url(#lobes-liver-clip)"}, root);
  // What the eight blocks are, in one line under the organ.
  const caption = svg("text", {class: "liver-caption"}, root);
  caption.textContent = voice.say(copy.segmentsNote);

  let blocks: LobeBlock[] = [];
  const elements = new Map<string, BlockElements>();

  const build = (block: LobeBlock): BlockElements => {
    const group = svg("g", {class: "segment"}, blockLayer);
    const plate = svg("rect", {class: "segment-plate", rx: 12}, group);
    const label = svg("text", {class: "segment-label"}, group);
    const name = svg("text", {class: "segment-name"}, group);
    const value = svg("text", {class: "segment-value"}, group);
    const note = svg("text", {class: "segment-note"}, group);
    const portalPip = svg("circle", {class: "pip pip--portal", r: 5}, group);
    const arterialPip = svg("circle", {class: "pip pip--arterial", r: 5}, group);
    return {group, plate, label, name, value, note, portalPip, arterialPip, block};
  };

  return {
    get blocks(): readonly LobeBlock[] {
      return blocks;
    },

    resize(viewport: Viewport): void {
      const box = liverBox(viewport);
      blocks = liverLayout(lobes, box, BLOCK_GAP);
      const outline = liverOutline(blocks, box);
      attributes(shape, {d: outline});
      attributes(clipPath, {d: outline});
      // Over the organ, above the trunk of the hepatic veins and under the band of numbers.
      // Just over the organ, and clear of the band of numbers above it.
      attributes(caption, {x: box.x - ORGAN.x, y: box.y - ORGAN.y - 14, "text-anchor": "start"});
      for (const block of blocks) {
        let visual = elements.get(block.token);
        if (visual === undefined) {
          visual = build(block);
          elements.set(block.token, visual);
        }
        visual.block = block;
        attributes(visual.plate, {
          x: block.x, y: block.y, width: block.width, height: block.height,
        });
        const centre = block.x + block.width / 2;
        const short = block.height < 90;
        const narrow = block.width < NARROW;
        const sliver = block.width < SLIVER;
        attributes(visual.label, {x: centre, y: block.y + (short ? block.height / 2 + 10 : 36)});
        attributes(visual.name, {x: centre, y: block.y + 56, opacity: short || narrow ? 0 : 1});
        attributes(visual.value, {
          x: centre, y: block.y + block.height - 34, opacity: short || sliver ? 0 : 1,
        });
        attributes(visual.note, {
          x: centre, y: block.y + block.height - 14, opacity: short || sliver ? 0 : 1,
        });
        // The two branches sit in the corner, out of the way of the numbers below. A block too
        // narrow to hold them beside its numeral does without them.
        attributes(visual.portalPip, {cx: block.x + 16, cy: block.y + 18, opacity: sliver ? 0 : 1});
        attributes(visual.arterialPip, {cx: block.x + 34, cy: block.y + 18, opacity: sliver ? 0 : 1});
      }

      // The inflow and the outflow of the whole liver: the portal vein and the hepatic artery
      // come up to the hilum, the hepatic veins leave at the top towards the heart.
      const hilum = {x: box.x + box.width / 2, y: box.y + box.height};
      const foot = hilum.y + HILUM;
      attributes(portal, {d: `M${hilum.x - 46} ${foot} L${hilum.x - 46} ${hilum.y + 18} L${hilum.x - 14} ${hilum.y}`});
      attributes(artery, {d: `M${hilum.x + 46} ${foot} L${hilum.x + 46} ${hilum.y + 18} L${hilum.x + 14} ${hilum.y}`});
      attributes(hepatic, {d: `M${hilum.x} ${box.y} L${hilum.x} ${box.y - OUTFLOW}`});
      attributes(portalLabel, {x: hilum.x - 56, y: foot - 6, "text-anchor": "end"});
      attributes(arteryLabel, {x: hilum.x + 56, y: foot - 6, "text-anchor": "start"});
      attributes(hepaticLabel, {x: hilum.x + 22, y: box.y - OUTFLOW + 6, "text-anchor": "start"});
    },

    update(view: LiverView): void {
      for (const [token, visual] of elements) {
        const state = view.states[token] ?? "intact";
        // What this segment became, against the same segment of a liver nobody operated on.
        const reference = view.baseline[`Vli_${token}`];
        const volume = reference === undefined || reference <= 0
          ? 1
          : (view.sample[`Vli_${token}`] ?? reference) / reference;
        const flow = view.sample[`Qh_${token}`] ?? 0;
        const resected = state === "resected";
        // A segment that is still there is coloured by what it has become: below its reference
        // volume it has atrophied, above it has grown.
        const fill = resected
          ? STATE_FILL.resected
          : mixHex(perfusionColor(volume), STATE_FILL[state], state === "intact" ? 0 : 0.5);
        attributes(visual.plate, {fill, "data-state": state});
        visual.group.setAttribute("data-state", state);
        visual.label.textContent = blockLabel(visual.block);
        visual.name.textContent = blockName(voice, visual.block);
        visual.value.textContent = resected
          ? copy.resected
          : `${formatNumber(volume * 100, 0)} %`;
        visual.note.textContent = resected
          ? copy.massGone(`${formatNumber(visual.block.share * 100, 0)} %`)
          : `${formatNumber(flow * 1000, 0)} ml/min`;
        visual.portalPip.setAttribute("data-closed",
          String(state === "portal" || resected));
        visual.arterialPip.setAttribute("data-closed",
          String(state === "arterial" || resected));
        // What this segment is, for the finger that rests on it: where it lies, what share of
        // the liver it carries, and what it is doing on the day the course is at.
        visual.group.setAttribute("data-info", copy.segmentInfo({
          name: shortName(voice, visual.block),
          where: blockName(voice, visual.block),
          share: `${formatNumber(visual.block.share * 100, 0)} %`,
          state: resected
            ? copy.resected
            : `${formatNumber(volume * 100, 0)} %, ${formatNumber(flow * 1000, 0)} ml/min`,
        }));
      }

      const qpo = view.sample["Qpo"] ?? 0;
      const qha = view.sample["Qha"] ?? 0;
      const qh = view.sample["Qh"] ?? 0;
      // The width of a trunk follows the square root of its flow, as on the circulation table.
      attributes(portal, {"stroke-width": vesselWidth(qpo, 13, 2, 26)});
      attributes(artery, {"stroke-width": vesselWidth(qha, 13, 2, 26)});
      attributes(hepatic, {"stroke-width": vesselWidth(qh, 13, 2, 26)});
      portalLabel.textContent = `${copy.vessels.portal} ${formatNumber(qpo)} l/min`;
      arteryLabel.textContent = `${copy.vessels.artery} ${formatNumber(qha)} l/min`;
      hepaticLabel.textContent = `${copy.vessels.hepatic} ${formatNumber(qh)} l/min`;
    },
  };
}
