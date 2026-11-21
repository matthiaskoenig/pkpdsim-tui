/** Numbers, colours and arcs of the scene, kept apart from the drawing so they can be tested. */

/** Angles of the table are degrees clockwise from up, which is how a dial is read. */
export interface PolarPoint {
  readonly x: number;
  readonly y: number;
}

export function polarPoint(cx: number, cy: number, radius: number, degrees: number): PolarPoint {
  const radians = (degrees * Math.PI) / 180;
  return {x: cx + radius * Math.sin(radians), y: cy - radius * Math.cos(radians)};
}

/** The path of a circular arc, clockwise from `fromDegrees` to `toDegrees`. */
export function describeArc(
  cx: number, cy: number, radius: number, fromDegrees: number, toDegrees: number,
): string {
  const from = polarPoint(cx, cy, radius, fromDegrees);
  const to = polarPoint(cx, cy, radius, toDegrees);
  const sweep = toDegrees >= fromDegrees ? 1 : 0;
  const large = Math.abs(toDegrees - fromDegrees) > 180 ? 1 : 0;
  return `M ${from.x.toFixed(2)} ${from.y.toFixed(2)} `
    + `A ${radius} ${radius} 0 ${large} ${sweep} ${to.x.toFixed(2)} ${to.y.toFixed(2)}`;
}

export function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}

/** A value with as many digits as it needs and no more, for a number read at a distance. */
export function formatNumber(value: number, digits?: number): string {
  if (!Number.isFinite(value)) return "-";
  // A number the caller fixed the decimals of is written with those decimals: a blood pressure
  // of 81 mmHg is not read to a tenth. Without them the decimals follow the magnitude, so that
  // a flow of 0.46 l/min and one of 123 l/min are both read at a glance.
  if (digits !== undefined) return value.toFixed(digits);
  const magnitude = Math.abs(value);
  return value.toFixed(magnitude >= 100 ? 0 : magnitude >= 10 ? 1 : 2);
}

/** A resistance factor, as the table shows it on a card. */
export function formatFactor(value: number): string {
  return `${value < 10 ? value.toFixed(2) : value.toFixed(1)}x`;
}

/** The change of a value against the reference, with its sign, or an empty string when it is nil. */
export function formatDelta(value: number, reference: number, digits = 1): string {
  const delta = value - reference;
  if (Math.abs(delta) < 0.05 * Math.max(1e-9, Math.abs(reference)) && Math.abs(delta) < 0.1) return "";
  const text = delta.toFixed(digits);
  // A difference which rounds to nothing is not written as "-0": at these decimals it is none.
  if (Number.parseFloat(text) === 0) return "";
  return `${delta > 0 ? "+" : ""}${text}`;
}

function parseHex(color: string): [number, number, number] {
  const value = Number.parseInt(color.replace("#", ""), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function toHex(channels: readonly [number, number, number]): string {
  return `#${channels.map(channel => Math.round(clamp(channel, 0, 255)).toString(16).padStart(2, "0")).join("")}`;
}

/** The colour `fraction` of the way from `from` to `to`. */
export function mixHex(from: string, to: string, fraction: number): string {
  const [fr, fg, fb] = parseHex(from);
  const [tr, tg, tb] = parseHex(to);
  const t = clamp(fraction, 0, 1);
  return toHex([fr + (tr - fr) * t, fg + (tg - fg) * t, fb + (tb - fb) * t]);
}

export const PERFUSION_NEUTRAL = "#7f93a8";
export const PERFUSION_LOW = "#2f6fd0";
export const PERFUSION_HIGH = "#e8a33d";

/**
 * The colour of an organ at this fraction of its reference flow. One doubling in either direction
 * reaches the end of the ramp, so the eye reads a ratio and not a difference.
 */
export function perfusionColor(ratio: number): string {
  if (!Number.isFinite(ratio) || ratio <= 0) return PERFUSION_LOW;
  const octaves = clamp(Math.log2(ratio), -1, 1);
  return octaves >= 0
    ? mixHex(PERFUSION_NEUTRAL, PERFUSION_HIGH, octaves)
    : mixHex(PERFUSION_NEUTRAL, PERFUSION_LOW, -octaves);
}

/** The width of a vessel that carries this flow, in the centimetres of the anatomy. */
export function vesselWidth(flow: number, scale = 1.25, min = 0.3, max = 4.2): number {
  if (!Number.isFinite(flow) || flow <= 0) return min;
  return clamp(scale * Math.sqrt(flow), min, max);
}

/** The radius of the disc of an organ that carries this flow, in centimetres. */
export function organRadius(flow: number, base = 1.1, scale = 2.4, max = 7): number {
  if (!Number.isFinite(flow) || flow <= 0) return base;
  return clamp(base + scale * Math.sqrt(flow), base, max);
}
