/**
 * The way the drug takes through the individual, across the top of the table: the tablet, the
 * liver that makes M1 out of it, the plasma it is measured in, the kidneys that clear the
 * metabolites and the urine they end up in.
 *
 * Each station carries the number the objects on the table set it to, so the reader sees what
 * the dials did to the body and not only what they did to the curve.
 */

import {attributes, formatNumber, svg} from "@pkpdsim-tui/tui-kit";
import type {Box} from "@pkpdsim-tui/tui-kit";

export interface Station {
  readonly id: string;
  readonly label: string;
}

export const STATIONS: readonly Station[] = [
  {id: "tablet", label: "Tablet"},
  {id: "liver", label: "Liver"},
  {id: "plasma", label: "Plasma"},
  {id: "kidney", label: "Kidneys"},
  {id: "urine", label: "Urine"},
];

export interface StationValue {
  readonly value: string;
  readonly note: string;
  /** Whether an object moved this station away from the reference individual. */
  readonly changed: boolean;
}

export interface Pathway {
  resize(box: Box): void;
  update(values: Readonly<Record<string, StationValue>>): void;
}

const NODE_HEIGHT = 86;
const ARROW = 34;

interface StationElements {
  readonly group: SVGGElement;
  readonly plate: SVGRectElement;
  readonly label: SVGTextElement;
  readonly value: SVGTextElement;
  readonly note: SVGTextElement;
}

export function createPathway(parent: SVGSVGElement): Pathway {
  const root = svg("g", {class: "layer layer--pathway"}, parent);
  const arrows = svg("g", {class: "pathway-arrows"}, root);
  const stations = new Map<string, StationElements>(STATIONS.map(station => {
    const group = svg("g", {class: `station station--${station.id}`}, root);
    const plate = svg("rect", {class: "station-plate", rx: 14, height: NODE_HEIGHT}, group);
    const label = svg("text", {class: "station-label", "text-anchor": "middle"}, group);
    const value = svg("text", {class: "station-value", "text-anchor": "middle"}, group);
    const note = svg("text", {class: "station-note", "text-anchor": "middle"}, group);
    label.textContent = station.label;
    return [station.id, {group, plate, label, value, note}];
  }));

  return {
    resize(box: Box): void {
      const width = (box.width - ARROW * (STATIONS.length - 1)) / STATIONS.length;
      arrows.replaceChildren();
      STATIONS.forEach((station, index) => {
        const visual = stations.get(station.id);
        if (visual === undefined) return;
        const x = box.x + index * (width + ARROW);
        attributes(visual.plate, {x, y: box.y, width});
        const centre = x + width / 2;
        attributes(visual.label, {x: centre, y: box.y + 24});
        attributes(visual.value, {x: centre, y: box.y + 54});
        attributes(visual.note, {x: centre, y: box.y + 74});
        if (index === 0) return;
        const from = x - ARROW;
        const middle = box.y + NODE_HEIGHT / 2;
        svg("path", {
          class: "pathway-arrow",
          d: `M${from + 6} ${middle} H${x - 10} M${x - 16} ${middle - 6} L${x - 8} ${middle} L${x - 16} ${middle + 6}`,
        }, arrows);
      });
    },

    update(values: Readonly<Record<string, StationValue>>): void {
      for (const [id, visual] of stations) {
        const value = values[id];
        visual.value.textContent = value?.value ?? "-";
        visual.note.textContent = value?.note ?? "";
        visual.group.setAttribute("data-changed", String(value?.changed ?? false));
      }
    },
  };
}

/** The height the pathway takes, so the scene can leave room for it. */
export const PATHWAY_HEIGHT = NODE_HEIGHT;

/** A number with its unit, for a station. */
export function stationNumber(value: number, unit: string, digits = 2): string {
  return `${formatNumber(value, digits)} ${unit}`;
}
