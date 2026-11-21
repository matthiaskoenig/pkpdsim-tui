/**
 * The objects on the surface: a ring around each one, and a card next to it that is turned to
 * face the edge of the table the object is nearest to, which is where the person who put it
 * down is standing.
 */

import {ABSOLUTE_SPAN, angleForValue, roleForMarker} from "@pkpdsim-tui/tuio-input";
import type {TableSnapshot, TableToken, TokenRole} from "@pkpdsim-tui/tuio-input";
import {clamp, describeArc} from "./format.ts";
import {attributes, svg} from "./svg.ts";
import type {Viewport} from "./types.ts";

const RING_RADIUS = 58;
const CARD_WIDTH = 252;
const CARD_HEIGHT = 96;
/** The outer stop of the dial, in degrees from the detent at the top. */
const STOP = ABSOLUTE_SPAN * 180;

/**
 * How an object reads on the table. A `dial` carries its value in its angle and gets the arc and
 * the detent; a `plain` object carries it in its position, where an arc would be a lie; an
 * `unassigned` object is one whose marker no role claims.
 */
export type TokenCardKind = "dial" | "plain" | "unassigned";

export interface TokenCard {
  readonly kind: TokenCardKind;
  readonly title: string;
  readonly value: string;
  readonly note: string;
}

export interface TokenLayerUpdate {
  readonly snapshot: TableSnapshot;
  readonly roles: readonly TokenRole[];
  readonly viewport: Viewport;
  /** What this object says on its card, which only the application knows. */
  readonly card: (token: TableToken, role: TokenRole | undefined) => TokenCard;
}

export interface TokenLayer {
  update(state: TokenLayerUpdate): void;
}

/**
 * The rotation that makes a card readable from the nearest edge of the table. People stand at
 * the four sides of a rectangular table, not on a circle around it, so the card turns to one of
 * four quarters instead of following the object exactly: a card at an angle reads as a mistake.
 */
export function cardRotation(x: number, y: number): number {
  const edges = [
    {distance: y, rotation: 180},
    {distance: 1 - y, rotation: 0},
    {distance: x, rotation: 90},
    {distance: 1 - x, rotation: -90},
  ];
  let nearest = edges[1] as {distance: number; rotation: number};
  for (const edge of edges) {
    if (edge.distance < nearest.distance) nearest = edge;
  }
  return nearest.rotation;
}

/**
 * As much of a line as fits on a card. A card is as wide as the object it belongs to and does
 * not wrap, so a line that is too long is cut rather than drawn across the scene.
 */
export function clipLine(text: string, characters: number): string {
  return text.length <= characters ? text : `${text.slice(0, Math.max(1, characters - 1)).trimEnd()}...`;
}

/** The span of the dial of a role, in degrees from the detent. */
export function trackSpan(role: TokenRole | undefined): {start: number; end: number} {
  if (role === undefined || role.mode === "relative") return {start: -STOP, end: STOP};
  const degrees = (value: number): number => angleForValue(role, value) * 180 / Math.PI;
  return {start: degrees(role.min), end: degrees(role.max)};
}

function trackOf(role: TokenRole | undefined): string {
  const {start, end} = trackSpan(role);
  return Math.abs(end - start) < 0.5 ? "" : describeArc(0, 0, RING_RADIUS, start, end);
}

interface TokenElements {
  readonly group: SVGGElement;
  readonly ring: SVGCircleElement;
  readonly track: SVGPathElement;
  readonly arc: SVGPathElement;
  readonly detent: SVGLineElement;
  readonly pointer: SVGLineElement;
  readonly marker: SVGTextElement;
  readonly card: SVGGElement;
  readonly plate: SVGRectElement;
  readonly title: SVGTextElement;
  readonly value: SVGTextElement;
  readonly note: SVGTextElement;
}

function buildToken(parent: SVGGElement): TokenElements {
  const group = svg("g", {class: "token"}, parent);
  const ring = svg("circle", {class: "token-ring", r: RING_RADIUS}, group);
  const track = svg("path", {class: "token-track", d: ""}, group);
  const arc = svg("path", {class: "token-arc", d: ""}, group);
  const detent = svg("line", {
    class: "token-detent", x1: 0, y1: -RING_RADIUS - 9, x2: 0, y2: -RING_RADIUS + 9,
  }, group);
  const pointer = svg("line", {
    class: "token-pointer", x1: 0, y1: -14, x2: 0, y2: -RING_RADIUS + 10,
  }, group);
  const marker = svg("text", {class: "token-marker", x: 0, y: 6}, group);
  const card = svg("g", {class: "token-card"}, group);
  const plate = svg("rect", {
    class: "card", x: -CARD_WIDTH / 2, y: -CARD_HEIGHT, width: CARD_WIDTH, height: CARD_HEIGHT, rx: 14,
  }, card);
  const title = svg("text", {class: "card-title", x: 0, y: -CARD_HEIGHT + 26}, card);
  const value = svg("text", {class: "card-value", x: 0, y: -CARD_HEIGHT + 62}, card);
  const note = svg("text", {class: "card-note", x: 0, y: -CARD_HEIGHT + 84}, card);
  return {group, ring, track, arc, detent, pointer, marker, card, plate, title, value, note};
}

export function createTokenLayer(parent: SVGSVGElement): TokenLayer {
  const root = svg("g", {class: "layer layer--tokens"}, parent);
  const touches = svg("g", {class: "layer layer--touches"}, root);
  const elements = new Map<number, TokenElements>();
  const touchElements = new Map<number, SVGCircleElement>();

  const describeToken = (token: TableToken, state: TokenLayerUpdate): void => {
    let visual = elements.get(token.sessionId);
    if (visual === undefined) {
      visual = buildToken(root);
      elements.set(token.sessionId, visual);
    }
    const x = token.x * state.viewport.width;
    const y = token.y * state.viewport.height;
    visual.group.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
    visual.marker.textContent = String(token.marker);

    const role = roleForMarker(state.roles, token.marker);
    const card = state.card(token, role);
    // The pointer shows where the object really is; the arc stops where its range does.
    const degrees = (token.angle > Math.PI ? token.angle - Math.PI * 2 : token.angle) * 180 / Math.PI;
    visual.pointer.setAttribute("transform", `rotate(${degrees.toFixed(1)})`);
    const arcEnd = clamp(degrees, -STOP, STOP);
    const dial = card.kind === "dial";
    visual.arc.setAttribute("d",
      !dial || Math.abs(arcEnd) < 0.5 ? "" : describeArc(0, 0, RING_RADIUS, 0, arcEnd));
    // The track covers the values the role really has. A role whose reference is one end of its
    // range, like an impairment that cannot be better than healthy, gets half a dial and the
    // other half of the ring stays empty instead of promising a value that does not exist.
    visual.track.setAttribute("d", !dial ? "" : trackOf(role));
    visual.detent.setAttribute("opacity", dial ? "1" : "0");
    visual.card.setAttribute("transform",
      `rotate(${cardRotation(token.x, token.y).toFixed(1)}) translate(0 ${-RING_RADIUS - 18})`);
    visual.ring.setAttribute("class",
      card.kind === "unassigned" ? "token-ring token-ring--unassigned" : "token-ring");
    visual.plate.setAttribute("class",
      card.kind === "unassigned" ? "card card--unassigned" : "card");
    visual.title.textContent = clipLine(card.title, 26);
    visual.value.textContent = clipLine(card.value, 20);
    visual.note.textContent = clipLine(card.note, 40);
  };

  return {
    update(state: TokenLayerUpdate): void {
      for (const token of state.snapshot.tokens.values()) describeToken(token, state);
      for (const [sessionId, visual] of elements) {
        if (state.snapshot.tokens.has(sessionId)) continue;
        visual.group.remove();
        elements.delete(sessionId);
      }
      for (const pointer of state.snapshot.pointers.values()) {
        let circle = touchElements.get(pointer.sessionId);
        if (circle === undefined) {
          circle = svg("circle", {class: "touch", r: 26}, touches);
          touchElements.set(pointer.sessionId, circle);
        }
        attributes(circle, {
          cx: (pointer.x * state.viewport.width).toFixed(1),
          cy: (pointer.y * state.viewport.height).toFixed(1),
        });
      }
      for (const [sessionId, circle] of touchElements) {
        if (state.snapshot.pointers.has(sessionId)) continue;
        circle.remove();
        touchElements.delete(sessionId);
      }
    },
  };
}
