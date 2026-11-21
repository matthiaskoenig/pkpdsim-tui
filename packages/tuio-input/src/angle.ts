/** Angles of the protocol are radians in [0, 2 pi), which has to be undone before it is used. */

export const TWO_PI = Math.PI * 2;

/** The angle in [0, 2 pi). */
export function wrapAngle(angle: number): number {
  const wrapped = angle % TWO_PI;
  return wrapped < 0 ? wrapped + TWO_PI : wrapped;
}

/** The angle in (-pi, pi], so that a small turn to the left is a small negative number. */
export function signedAngle(angle: number): number {
  const wrapped = wrapAngle(angle);
  return wrapped > Math.PI ? wrapped - TWO_PI : wrapped;
}

/**
 * The accumulated angle of a turn. A tracker delivers the angle wrapped, so a token twisted
 * past the boundary reads as a jump of almost a full turn; the shorter way round is the turn
 * that actually happened.
 */
export function unwrapAngle(previous: number, next: number): number {
  return previous + signedAngle(next - previous);
}
