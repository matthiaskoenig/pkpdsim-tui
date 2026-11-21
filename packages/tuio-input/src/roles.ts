/**
 * The tangible vocabulary: the marker of a token says what it is, its angle says which value
 * it carries.
 */

import {signedAngle, TWO_PI} from "./angle.ts";

export type RoleScale = "linear" | "log";

/**
 * Where the value of a token comes from. `absolute` makes the orientation of the object the
 * value, so a printed arrow points at it and a person reads the state off the table.
 * `relative` starts at the reference wherever the object was put down and follows the twist.
 * `position` is an object whose place on the table is what it says, like an instrument that acts
 * on whatever lies under it: it has no dial, and turning it means nothing.
 */
export type RoleMode = "absolute" | "relative" | "position";

/** What a token does, and over which values. */
export interface TokenRole {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly unit: string;
  /** The marker ids that carry this role. */
  readonly markers: readonly number[];
  readonly min: number;
  readonly max: number;
  /** The value of the model without this token, which is also the value at the detent. */
  readonly reference: number;
  readonly mode: RoleMode;
  readonly scale: RoleScale;
  /** Revolutions that span the whole range, for a relative role. */
  readonly turns: number;
}

/**
 * The fraction of a half turn that an absolute role spends on its range. The rest is the stop at
 * the back of the dial, where the extremes sit on a plateau instead of on a knife edge.
 */
export const ABSOLUTE_SPAN = 0.9;

export function roleForMarker(roles: readonly TokenRole[], marker: number): TokenRole | undefined {
  return roles.find(role => role.markers.includes(marker));
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}

/**
 * The value at an offset from the reference, where -1 is the minimum, 0 the reference and 1 the
 * maximum. A log role steps in ratios, which is what a resistance factor wants.
 */
export function valueAtOffset(role: TokenRole, offset: number): number {
  const t = clamp(offset, -1, 1);
  const {min, max, reference} = role;
  if (role.scale === "log" && (min <= 0 || reference <= 0 || max <= 0)) {
    throw new RangeError(`Role ${role.id} is logarithmic, so its range has to be positive.`);
  }
  const value = role.scale === "log"
    ? (t >= 0 ? reference * (max / reference) ** t : reference * (reference / min) ** t)
    : (t >= 0 ? reference + (max - reference) * t : reference + (reference - min) * t);
  // An object turned to the stop carries the end of its range and not a hair beyond it: the
  // arithmetic above lands on 0.22999999999999998 where the dial says 0.23, and a model which
  // checks its own range would refuse that.
  return clamp(value, min, max);
}

/** The inverse of `valueAtOffset`, for a dial that shows where the value sits. */
export function offsetOfValue(role: TokenRole, value: number): number {
  const {min, max, reference} = role;
  const clamped = clamp(value, min, max);
  const up = clamped >= reference;
  const span = role.scale === "log"
    ? Math.log(up ? max / reference : reference / min)
    : up ? max - reference : reference - min;
  if (span <= 0) return 0;
  const distance = role.scale === "log"
    ? Math.log(up ? clamped / reference : reference / clamped)
    : up ? clamped - reference : reference - clamped;
  return (up ? 1 : -1) * distance / span;
}

/**
 * The value a token carries. `origin` is the accumulated angle at which a relative token was put
 * down, and is ignored by an absolute role.
 */
export function valueFromAngle(role: TokenRole, angle: number, origin = 0): number {
  if (role.mode === "position") {
    throw new RangeError(`Role ${role.id} carries its value in its position, not in its angle.`);
  }
  const offset = role.mode === "absolute"
    ? signedAngle(angle) / (ABSOLUTE_SPAN * Math.PI)
    : 2 * (angle - origin) / (TWO_PI * role.turns);
  return valueAtOffset(role, offset);
}

/** The angle at which an absolute token carries this value. */
export function angleForValue(role: TokenRole, value: number): number {
  return offsetOfValue(role, value) * ABSOLUTE_SPAN * Math.PI;
}
