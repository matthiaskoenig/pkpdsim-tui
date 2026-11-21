/**
 * The objects on the surface: a ring around each one with a picture of what it is inside it,
 * and a card above it with its name and its value. A table is read from one side, so the card
 * always stands upright: a card at an angle reads as a mistake.
 */

import {ABSOLUTE_SPAN, angleForValue, roleForMarker} from "@pkpdsim-tui/tuio-input";
import type {TableSnapshot, TableToken, TokenRole} from "@pkpdsim-tui/tuio-input";
import {clamp, describeArc} from "./format.ts";
import {createGlyph} from "./glyph.ts";
import type {Glyph, TokenGlyph} from "./glyph.ts";
import {createMirror} from "./mirror.ts";
import type {MirroredObject} from "./mirror.ts";
import type {Voice} from "./voice.ts";
import {attributes, svg} from "./svg.ts";
import type {Viewport} from "./types.ts";

const RING_RADIUS = 58;
const CARD_WIDTH = 236;
const CARD_HEIGHT = 88;
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
  /** The picture inside the ring: what this object is, and where it stands in its range. */
  readonly glyph?: TokenGlyph;
  /** The sentence a finger resting on the object opens, empty when there is none. */
  readonly info?: string;
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
  readonly glyph: Glyph;
  readonly badge: SVGCircleElement;
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
  const glyph = createGlyph(group);
  // The number of the marker is printed on the object itself, so it sits at the foot of the
  // ring where it names the object without covering its picture.
  const badge = svg("circle", {class: "token-badge", cx: 0, cy: RING_RADIUS, r: 15}, group);
  const marker = svg("text", {class: "token-marker", x: 0, y: RING_RADIUS + 6}, group);
  const card = svg("g", {class: "token-card"}, group);
  const plate = svg("rect", {
    class: "card", x: -CARD_WIDTH / 2, y: -CARD_HEIGHT, width: CARD_WIDTH, height: CARD_HEIGHT, rx: 14,
  }, card);
  const title = svg("text", {class: "card-title", x: 0, y: -CARD_HEIGHT + 24}, card);
  const value = svg("text", {class: "card-value", x: 0, y: -CARD_HEIGHT + 56}, card);
  const note = svg("text", {class: "card-note", x: 0, y: -CARD_HEIGHT + 76}, card);
  return {
    group, ring, track, arc, detent, pointer, glyph, badge, marker, card, plate, title, value,
    note,
  };
}

/**
 * The objects of a table. `table` is the application they belong to: with it the layer tells
 * whatever embeds the table what is on the surface, which is how the TUIO simulator draws an
 * object as the thing it stands for.
 */
export function createTokenLayer(
  parent: SVGSVGElement, table?: {readonly voice: Voice; readonly title: string},
): TokenLayer {
  const root = svg("g", {class: "layer layer--tokens"}, parent);
  const touches = svg("g", {class: "layer layer--touches"}, root);
  const elements = new Map<number, TokenElements>();
  const touchElements = new Map<number, SVGCircleElement>();
  const mirror = table === undefined ? null : createMirror(table.voice, table.title);

  const describeToken = (token: TableToken, state: TokenLayerUpdate): MirroredObject => {
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
    // The table is read from one side, so the card stands upright wherever the object is, and
    // it stays on the table: an object at the top edge carries its card below it, and one at
    // the side has it pushed back in rather than drawn off the glass.
    const above = y - RING_RADIUS - 16 - CARD_HEIGHT > 0;
    const shift = clamp(
      x, CARD_WIDTH / 2 + 12, Math.max(CARD_WIDTH / 2 + 12, state.viewport.width - CARD_WIDTH / 2 - 12),
    ) - x;
    visual.card.setAttribute("transform", above
      ? `translate(${shift.toFixed(1)} ${-RING_RADIUS - 16})`
      : `translate(${shift.toFixed(1)} ${RING_RADIUS + 16 + CARD_HEIGHT})`);
    visual.glyph.update(card.glyph);
    visual.ring.setAttribute("class",
      card.kind === "unassigned" ? "token-ring token-ring--unassigned" : "token-ring");
    visual.plate.setAttribute("class",
      card.kind === "unassigned" ? "card card--unassigned" : "card");
    visual.title.textContent = clipLine(card.title, 24);
    visual.value.textContent = clipLine(card.value, 18);
    visual.note.textContent = clipLine(card.note, 36);
    // A finger which rests on an object opens the sentence behind it, like one on a panel.
    if (card.info === undefined || card.info === "") visual.group.removeAttribute("data-info");
    else visual.group.setAttribute("data-info", card.info);
    return {
      marker: token.marker, session: token.sessionId, kind: card.kind, title: card.title,
      value: card.value, note: card.note,
      ...(card.glyph === undefined ? {} : {glyph: {kind: card.glyph.kind, level: card.glyph.level}}),
    };
  };

  return {
    update(state: TokenLayerUpdate): void {
      const mirrored: MirroredObject[] = [];
      for (const token of state.snapshot.tokens.values()) {
        mirrored.push(describeToken(token, state));
      }
      mirror?.post(mirrored.sort((left, right) => left.marker - right.marker));
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
