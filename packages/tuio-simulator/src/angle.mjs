/**
 * Angles of TUIO 2.0 are radians in [0, 2 pi). The control page turns an object by degrees and
 * past the boundary in both directions, so the wrap happens once, here, on the way into a frame.
 *
 * This repeats `wrapAngle` of `packages/tuio-input` on purpose: that package is TypeScript
 * consumed as source by a bundler, and this one runs on plain `node` without a build step.
 */

/** A full turn in radians. */
export const TWO_PI = Math.PI * 2;

/** The angle in [0, 2 pi). Anything that is not a number is no angle at all, which is 0. */
export function wrapAngle(angle) {
  if (!Number.isFinite(angle)) return 0;
  const wrapped = angle % TWO_PI;
  return wrapped < 0 ? wrapped + TWO_PI : wrapped;
}

/** The angle in degrees, in [0, 360), which is what the readout of the control page shows. */
export function degreesOf(angle) {
  return (wrapAngle(angle) * 180) / Math.PI;
}

/** The radians of an angle given in degrees. */
export function radiansOf(degrees) {
  return wrapAngle((degrees * Math.PI) / 180);
}
