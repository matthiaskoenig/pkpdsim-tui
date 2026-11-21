import {describe, expect, it} from "vitest";

import {
  clampSensor, DEFAULT_SENSOR, dimFromSensor, MAX_SENSOR_AXIS, sensorFromDim, SENSOR_STRIDE,
} from "../src/sensor.mjs";

describe("the packed sensor dimension", () => {
  it("holds the width in the low two bytes and the height in the high two", () => {
    const dim = dimFromSensor({width: 640, height: 480});
    expect(dim).toBe(640 + 480 * 65536);
    expect(dim & 0xffff).toBe(640);
    expect(dim >>> 16).toBe(480);
  });

  it("packs the default surface of the simulator", () => {
    expect(dimFromSensor(DEFAULT_SENSOR)).toBe(1920 + 1080 * SENSOR_STRIDE);
  });

  it("is undone by the unpacking a client does", () => {
    for (const sensor of [{width: 1920, height: 1080}, {width: 1, height: 1}, {width: 3840, height: 2160}]) {
      expect(sensorFromDim(dimFromSensor(sensor))).toEqual(sensor);
    }
  });

  it("stays inside the two bytes of each axis", () => {
    expect(clampSensor({width: 999999, height: 999999}))
      .toEqual({width: MAX_SENSOR_AXIS, height: MAX_SENSOR_AXIS});
    expect(dimFromSensor({width: MAX_SENSOR_AXIS, height: MAX_SENSOR_AXIS}))
      .toBe(MAX_SENSOR_AXIS + MAX_SENSOR_AXIS * SENSOR_STRIDE);
  });

  it("falls back to the default surface for a size that is no size", () => {
    expect(clampSensor({width: 0, height: 0})).toEqual(DEFAULT_SENSOR);
    expect(clampSensor({width: -1920, height: 1080})).toEqual({width: 1920, height: 1080});
    expect(clampSensor({width: Number.NaN, height: "nonsense"})).toEqual(DEFAULT_SENSOR);
    expect(clampSensor(undefined)).toEqual(DEFAULT_SENSOR);
  });

  it("rounds a fractional size to whole pixels", () => {
    expect(clampSensor({width: 1920.4, height: 1079.6})).toEqual({width: 1920, height: 1080});
  });
});
