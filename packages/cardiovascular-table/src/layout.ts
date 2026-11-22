/**
 * The column of plots at the far side of the body from the panel: the beat of the heart, the
 * beats of the last minute and the liver of the last minute, in that order, because the heart
 * is what drives the rest.
 *
 * The three panels are laid out together rather than each in its own corner, so that they are
 * read as one monitor and so that a surface which is too short for all three shrinks them
 * instead of letting the last one off the glass.
 */

import {LAB_ROOM} from "@pkpdsim-tui/tui-kit";
import type {Viewport} from "@pkpdsim-tui/tui-kit";

export type PanelName = "pulse" | "beats" | "hepatic";

/** The width of the column, and how tall each panel is drawn before any shrinking. */
export const COLUMN = {
  width: 420,
  gap: 14,
  right: 24,
  top: 120,
  bottom: 24,
  height: {pulse: 280, beats: 186, hepatic: 300} as Readonly<Record<PanelName, number>>,
} as const;

const ORDER: readonly PanelName[] = ["pulse", "beats", "hepatic"];

/** How much the whole column has to be shrunk by to stand on this surface. */
export function columnScale(viewport: Viewport): number {
  const stack = ORDER.reduce((sum, name) => sum + COLUMN.height[name], 0)
    + COLUMN.gap * (ORDER.length - 1);
  // The laboratory stands in the bottom corner of every page, under this column.
  const room = viewport.height - COLUMN.top - COLUMN.bottom - LAB_ROOM;
  return Math.min(1, room / stack);
}

/** What the column takes of the width of the surface, once it is shrunk to fit. */
export function columnWidth(viewport: Viewport): number {
  return COLUMN.width * columnScale(viewport) + COLUMN.right;
}

/** Where a panel stands, and at what size: the transform of its group. */
export function placePanel(viewport: Viewport, name: PanelName): string {
  const scale = columnScale(viewport);
  let top = COLUMN.top;
  for (const other of ORDER) {
    if (other === name) break;
    top += (COLUMN.height[other] + COLUMN.gap) * scale;
  }
  const left = viewport.width - COLUMN.right - COLUMN.width * scale;
  return `translate(${left.toFixed(1)} ${top.toFixed(1)}) scale(${scale.toFixed(4)})`;
}
