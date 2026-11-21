/**
 * The objects on the surface: a dial around each one, and a card next to it that is turned to
 * face the edge of the table the object is nearest to, which is where the person who put it
 * down is standing.
 */

import type {PressureSolution} from "@pkpdsim-tui/cardio-sim";
import {ABSOLUTE_SPAN, roleForMarker, valueFromAngle} from "@pkpdsim-tui/tuio-input";
import type {TableSnapshot, TableToken, TokenRole} from "@pkpdsim-tui/tuio-input";
import {clamp, describeArc, formatFactor, formatNumber} from "./format.ts";
import {attributes, svg} from "./svg.ts";
import type {Viewport} from "./scene.ts";

const RING_RADIUS = 58;
const CARD_WIDTH = 252;
const CARD_HEIGHT = 96;
/** The outer stop of the dial, in degrees from the detent at the top. */
const STOP = ABSOLUTE_SPAN * 180;

interface TokenElements {
  readonly group: SVGGElement;
  readonly ring: SVGCircleElement;
  readonly arc: SVGPathElement;
  readonly pointer: SVGLineElement;
  readonly marker: SVGTextElement;
  readonly card: SVGGElement;
  readonly plate: SVGRectElement;
  readonly title: SVGTextElement;
  readonly value: SVGTextElement;
  readonly note: SVGTextElement;
}

export interface TokenLayerUpdate {
  readonly snapshot: TableSnapshot;
  readonly roles: readonly TokenRole[];
  readonly origins: ReadonlyMap<number, number>;
  readonly solution: PressureSolution;
  readonly viewport: Viewport;
}

export interface TokenLayer {
  update(state: TokenLayerUpdate): void;
}

/** What the model says about the role of this object, in one line on its card. */
function noteFor(roleId: string, solution: PressureSolution): string {
  switch (roleId) {
    case "hepatic":
      return `portal gradient ${formatNumber(solution.ppo - solution.pli)} mmHg`;
    case "portal":
      return `portal flow ${formatNumber(solution.qpo)} l/min`;
    case "systemic":
      return `cardiac output ${formatNumber(solution.co)} l/min`;
    case "renal": {
      const kidney = solution.flows.find(organ => organ.id === "ki");
      return `renal flow ${formatNumber(kidney?.flow ?? 0)} l/min`;
    }
    default:
      return "";
  }
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

function buildToken(parent: SVGGElement): TokenElements {
  const group = svg("g", {class: "token"}, parent);
  const ring = svg("circle", {class: "token-ring", r: RING_RADIUS}, group);
  svg("path", {class: "token-track", d: describeArc(0, 0, RING_RADIUS, -STOP, STOP)}, group);
  const arc = svg("path", {class: "token-arc", d: ""}, group);
  svg("line", {
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
  return {group, ring, arc, pointer, marker, card, plate, title, value, note};
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
    // The pointer shows where the object really is; the arc stops where its range does.
    const degrees = (token.angle > Math.PI ? token.angle - Math.PI * 2 : token.angle) * 180 / Math.PI;
    visual.pointer.setAttribute("transform", `rotate(${degrees.toFixed(1)})`);
    const arcEnd = clamp(degrees, -STOP, STOP);
    visual.arc.setAttribute("d",
      Math.abs(arcEnd) < 0.5 ? "" : describeArc(0, 0, RING_RADIUS, 0, arcEnd));
    visual.card.setAttribute("transform",
      `rotate(${cardRotation(token.x, token.y).toFixed(1)}) translate(0 ${-RING_RADIUS - 18})`);

    if (role === undefined) {
      visual.ring.setAttribute("class", "token-ring token-ring--unassigned");
      visual.plate.setAttribute("class", "card card--unassigned");
      visual.arc.setAttribute("opacity", "0");
      visual.title.textContent = `Marker ${token.marker}`;
      visual.value.textContent = "no role";
      visual.note.textContent = "This table does not use this object";
      return;
    }
    const angle = role.mode === "absolute" ? token.angle : token.turn;
    const value = valueFromAngle(role, angle, state.origins.get(token.sessionId) ?? 0);
    visual.ring.setAttribute("class", "token-ring");
    visual.plate.setAttribute("class", "card");
    visual.arc.setAttribute("opacity", "1");
    visual.title.textContent = role.label;
    visual.value.textContent = formatFactor(value);
    visual.note.textContent = noteFor(role.id, state.solution);
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
