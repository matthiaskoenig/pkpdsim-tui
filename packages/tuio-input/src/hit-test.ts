/** What a token points at: the nearest anchor of an anatomy under it. */

export interface Anchor {
  readonly id: string;
  readonly x: number;
  readonly y: number;
}

export interface Point {
  readonly x: number;
  readonly y: number;
}

/** The id of the nearest anchor within the radius, in the units the anchors are given in. */
export function hitTest(anchors: readonly Anchor[], point: Point, radius: number): string | undefined {
  let best: string | undefined;
  let bestDistance = radius * radius;
  for (const anchor of anchors) {
    const dx = anchor.x - point.x;
    const dy = anchor.y - point.y;
    const distance = dx * dx + dy * dy;
    if (distance <= bestDistance) {
      best = anchor.id;
      bestDistance = distance;
    }
  }
  return best;
}
