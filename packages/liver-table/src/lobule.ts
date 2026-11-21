/**
 * One liver lobule: the hexagon a liver is built of, about a million times over. The blood
 * enters at the corners, where a branch of the artery and a branch of the portal vein lie side
 * by side, and leaves in the middle, through the central vein. What the cells do depends on how
 * far along that path they sit, which is what the three zones are.
 *
 * The drawing is in a box of a hundred by a hundred, which is scaled into the room it is given.
 */

import {attributes, svg} from "@pkpdsim-tui/tui-kit";
import type {Box, Voice} from "@pkpdsim-tui/tui-kit";
import {LIVER_TEXT} from "./text.ts";

const CENTRE = {x: 50, y: 48} as const;
/** The three zones, from the corners inwards: periportal, intermediate, pericentral. */
const ZONES: readonly {radius: number; info: string}[] = [
  {
    radius: 32,
    info: "Zone 1, periportal: the cells which meet the blood first. They get the most oxygen, "
      + "and they are the ones which build glucose and handle what has just been eaten.",
  },
  {radius: 22, info: "Zone 2: halfway along the path, in between the other two."},
  {
    radius: 12,
    info: "Zone 3, pericentral: the last cells on the path. Least oxygen reaches them, and most "
      + "of the work on drugs is done here, which is also why damage starts here.",
  },
];

function hexagon(radius: number): string {
  const points = Array.from({length: 6}, (_unused, index) => {
    const angle = (Math.PI / 3) * index - Math.PI / 2;
    return `${(CENTRE.x + radius * Math.cos(angle)).toFixed(2)},`
      + `${(CENTRE.y + radius * Math.sin(angle)).toFixed(2)}`;
  });
  return `M ${points.join(" L ")} Z`;
}

export interface Lobule {
  resize(box: Box): void;
  /** What one lobule is served with, in microlitres a minute. */
  update(perLobule: number): void;
}

export function createLobule(parent: SVGSVGElement, voice: Voice): Lobule {
  const copy = voice.pick(LIVER_TEXT).lobule;
  const root = svg("g", {class: "lobule"}, parent);
  const inner = svg("g", {class: "lobule-inner"}, root);

  for (const [index, zone] of ZONES.entries()) {
    svg("path", {
      class: "lobule-zone", "data-zone": index + 1, d: hexagon(zone.radius),
      "data-info": zone.info,
    }, inner);
  }

  // The corners: a branch of the portal vein and one of the artery, which run together.
  for (let index = 0; index < 6; index += 1) {
    const angle = (Math.PI / 3) * index - Math.PI / 2;
    const x = CENTRE.x + 32 * Math.cos(angle);
    const y = CENTRE.y + 32 * Math.sin(angle);
    svg("circle", {
      class: "lobule-triad", cx: x, cy: y, r: 3.4,
      "data-info": voice.say(copy.triad),
    }, inner);
    svg("path", {
      class: "lobule-flow",
      d: `M ${(CENTRE.x + 26 * Math.cos(angle)).toFixed(2)} `
        + `${(CENTRE.y + 26 * Math.sin(angle)).toFixed(2)} L `
        + `${(CENTRE.x + 9 * Math.cos(angle)).toFixed(2)} `
        + `${(CENTRE.y + 9 * Math.sin(angle)).toFixed(2)}`,
    }, inner);
  }
  svg("circle", {
    class: "lobule-central", cx: CENTRE.x, cy: CENTRE.y, r: 5,
    "data-info": voice.say(copy.central),
  }, inner);

  const label = (text: string, x: number, y: number, extra = ""): void => {
    const element = svg("text", {class: `lobule-label ${extra}`, x, y}, inner);
    element.textContent = text;
  };
  label(copy.title, 50, 6, "lobule-label--title");
  label(voice.say(copy.subtitle), 50, 12, "lobule-label--subtitle");
  label(copy.zone1, 50, 86, "lobule-label--zone");
  label(copy.zone3, 50, 39, "lobule-label--centre");
  const flow = svg("text", {class: "lobule-flow-value", x: 50, y: 95}, inner);

  return {
    resize(box: Box): void {
      const scale = Math.min(box.width / 100, box.height / 100);
      const left = box.x + (box.width - 100 * scale) / 2;
      const top = box.y + (box.height - 100 * scale) / 2;
      inner.setAttribute("transform", `translate(${left} ${top}) scale(${scale})`);
    },

    update(perLobule: number): void {
      flow.textContent = copy.flow(perLobule.toFixed(2));
      attributes(inner, {"data-flow": perLobule.toFixed(2)});
    },
  };
}
