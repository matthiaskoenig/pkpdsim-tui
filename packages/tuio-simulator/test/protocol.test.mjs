/** What the simulator speaks and where: the settings a control page may change while it runs. */

import {describe, expect, it} from "vitest";

import {
  DEFAULT_PORT, DEFAULT_SETTINGS, describeTracker, normalizeSettings, sameTracker, TRANSPORTS,
  TUIO_VERSIONS,
} from "../src/protocol.mjs";

describe("the settings of the tracker", () => {
  it("starts on TUIO 2.0, a WebSocket and the port of TUIO", () => {
    expect(DEFAULT_SETTINGS).toEqual({
      version: "2.0", transport: "websocket", port: 3333, host: "localhost",
    });
    expect(TUIO_VERSIONS).toEqual(["2.0", "1.1"]);
    expect(TRANSPORTS).toEqual(["websocket", "udp"]);
  });

  it("takes what a page sends", () => {
    expect(normalizeSettings({version: "1.1", transport: "udp", port: "3334", host: "table"}))
      .toEqual({version: "1.1", transport: "udp", port: 3334, host: "table"});
  });

  it("keeps what it had wherever a page sends something it does not know", () => {
    const current = {version: "1.1", transport: "udp", port: 3334, host: "table"};
    expect(normalizeSettings({version: "3.0", transport: "carrier pigeon"}, current))
      .toEqual(current);
    expect(normalizeSettings({}, current)).toEqual(current);
    expect(normalizeSettings(null, current)).toEqual(current);
  });

  it("refuses a port that is not a port, and a host that is an address with more in it", () => {
    expect(normalizeSettings({port: 0}).port).toBe(DEFAULT_PORT);
    expect(normalizeSettings({port: 70000}).port).toBe(DEFAULT_PORT);
    expect(normalizeSettings({port: "ws://localhost:3333"}).port).toBe(DEFAULT_PORT);
    expect(normalizeSettings({port: 3333.4}).port).toBe(3333);
    expect(normalizeSettings({host: "ws://table:3333"}).host).toBe("localhost");
    expect(normalizeSettings({host: "  table  "}).host).toBe("table");
  });

  it("is the same tracker while only the version changes, which binds no socket", () => {
    const base = normalizeSettings({});
    expect(sameTracker(base, normalizeSettings({version: "1.1"}, base))).toBe(true);
    expect(sameTracker(base, normalizeSettings({port: 3334}, base))).toBe(false);
    expect(sameTracker(base, normalizeSettings({transport: "udp"}, base))).toBe(false);
  });

  it("says what it is in the words of the address it listens on", () => {
    expect(describeTracker(normalizeSettings({}))).toBe("TUIO 2.0 on ws://localhost:3333");
    expect(describeTracker(normalizeSettings({version: "1.1", transport: "udp", port: 3333})))
      .toBe("TUIO 1.1 on udp://localhost:3333");
  });
});
