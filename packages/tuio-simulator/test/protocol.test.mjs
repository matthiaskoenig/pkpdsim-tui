/** What the simulator speaks and where: the settings a control page may change while it runs. */

import {describe, expect, it} from "vitest";

import {
  DEFAULT_PORT, DEFAULT_SETTINGS, describeTracker, loopback, normalizeSettings, originAllowed,
  sameTracker, TRANSPORTS, TUIO_VERSIONS,
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

describe("originAllowed", () => {
  it("lets a page of this machine drive the simulator", () => {
    expect(originAllowed("http://localhost:3344", [])).toBe(true);
    expect(originAllowed("http://127.0.0.1:5173", [])).toBe(true);
    expect(originAllowed("http://[::1]:5173", [])).toBe(true);
  });

  it("turns a page of the internet away, which cannot be allowed to move the objects", () => {
    expect(originAllowed("https://evil.example", [])).toBe(false);
    expect(originAllowed("http://192.168.1.14:5173", [])).toBe(false);
    // A name which only begins like the loopback address is somewhere else.
    expect(originAllowed("http://127.0.0.1.evil.example", [])).toBe(false);
    expect(originAllowed("not an origin", [])).toBe(false);
  });

  it("lets a page in which was named on the command line", () => {
    expect(originAllowed("https://table.local", ["https://table.local"])).toBe(true);
    expect(originAllowed("https://table.local", ["https://other.local"])).toBe(false);
    expect(originAllowed("https://anything.example", ["*"])).toBe(true);
  });

  it("lets a client which is no browser through, because it sends no origin", () => {
    expect(originAllowed(undefined, [])).toBe(true);
    expect(originAllowed("", [])).toBe(true);
  });
});

describe("loopback", () => {
  it("knows this machine from every other", () => {
    expect(loopback("localhost")).toBe(true);
    expect(loopback("127.0.0.1")).toBe(true);
    expect(loopback("::1")).toBe(true);
    expect(loopback("0.0.0.0")).toBe(false);
    expect(loopback("192.168.1.14")).toBe(false);
  });
});
