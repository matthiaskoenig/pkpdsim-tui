/**
 * The sensor of the surface and the `dim` field that carries it. TUIO 2.0 packs the size of the
 * sensor into one integer of the frame message: the width in the low two bytes and the height in
 * the high two.
 */

/** The surface the control page starts on, which is the format of the tables of Interactive Scape. */
export const DEFAULT_SENSOR = {width: 1920, height: 1080};

/** Two bytes per axis, so an axis is at least 1 pixel and at most this. */
export const MAX_SENSOR_AXIS = 65535;

/** 2^16, the factor the height is shifted by. */
export const SENSOR_STRIDE = 65536;

/** An axis of the sensor as a whole number of pixels within what `dim` can carry. */
function axisOf(value, fallback) {
  const rounded = Math.round(Number(value));
  if (!Number.isFinite(rounded) || rounded < 1) return fallback;
  return Math.min(rounded, MAX_SENSOR_AXIS);
}

/** The sensor size a frame can carry, whatever the control page sent. */
export function clampSensor(sensor) {
  const width = axisOf(sensor?.width, DEFAULT_SENSOR.width);
  const height = axisOf(sensor?.height, DEFAULT_SENSOR.height);
  return {width, height};
}

/** The packed `dim` field of a TUIO 2.0 frame message. */
export function dimFromSensor(sensor) {
  const {width, height} = clampSensor(sensor);
  return width + height * SENSOR_STRIDE;
}

/** The sensor size of a packed `dim` field, which is what a client unpacks it to. */
export function sensorFromDim(dim) {
  const width = dim % SENSOR_STRIDE;
  const height = Math.floor(dim / SENSOR_STRIDE);
  return {width, height};
}
