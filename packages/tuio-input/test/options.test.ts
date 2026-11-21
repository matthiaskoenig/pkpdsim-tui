/** The tracker an application is pointed at, as the query of its address names it. */

import {describe, expect, it} from "vitest";

import {DEFAULT_TUIO_HOST, DEFAULT_TUIO_PORT, trackerOptions} from "../src/index.ts";
import type {PageOrigin} from "../src/index.ts";

/** The page the application came from, which a tracker behind a path is reached on. */
const PAGE: PageOrigin = {hostname: "localhost", port: "5173", protocol: "http:"};

function options(query: string, origin: PageOrigin | undefined = PAGE): ReturnType<typeof trackerOptions> {
  return trackerOptions(new URLSearchParams(query), origin);
}

describe("the tracker of a query", () => {
  it("is no tracker at all without the parameter, which is the mouse", () => {
    expect(options("")).toEqual({
      tracker: false, host: DEFAULT_TUIO_HOST, port: DEFAULT_TUIO_PORT, secure: false, path: "/",
      address: `${DEFAULT_TUIO_HOST}:${DEFAULT_TUIO_PORT}`, version: "2.0",
    });
    expect(options("species=rat").tracker).toBe(false);
  });

  it("is the tracker of this machine when the parameter carries nothing", () => {
    expect(options("tuio")).toEqual({
      tracker: true, host: DEFAULT_TUIO_HOST, port: DEFAULT_TUIO_PORT, secure: false, path: "/",
      address: `${DEFAULT_TUIO_HOST}:${DEFAULT_TUIO_PORT}`, version: "2.0",
    });
    expect(options("tuio=").tracker).toBe(true);
  });

  it("is the host and the port the parameter names", () => {
    expect(options("tuio=table.local:3334")).toEqual({
      tracker: true, host: "table.local", port: 3334, secure: false, path: "/",
      address: "table.local:3334", version: "2.0",
    });
    expect(options("tuio=192.168.1.40:3333").host).toBe("192.168.1.40");
  });

  it("takes the default of whichever half is missing or broken", () => {
    expect(options("tuio=table.local").port).toBe(DEFAULT_TUIO_PORT);
    expect(options("tuio=:3334").host).toBe(DEFAULT_TUIO_HOST);
    expect(options("tuio=:3334").port).toBe(3334);
    expect(options("tuio=table:port").port).toBe(DEFAULT_TUIO_PORT);
    expect(options("tuio=table:0").port).toBe(DEFAULT_TUIO_PORT);
  });

  it("is the server the page came from when the parameter is a path", () => {
    expect(options("tuio=/tuio")).toEqual({
      tracker: true, host: "localhost", port: 5173, secure: false, path: "/tuio",
      address: "localhost:5173/tuio", version: "2.0",
    });
  });

  it("takes the port and the scheme of the page the path is reached on", () => {
    const secure = {hostname: "table.example", port: "", protocol: "https:"};
    expect(options("tuio=/tuio", secure)).toEqual({
      tracker: true, host: "table.example", port: 443, secure: true, path: "/tuio",
      address: "table.example:443/tuio", version: "2.0",
    });
    expect(options("tuio=/tuio", {hostname: "table.example", port: "", protocol: "http:"}).port)
      .toBe(80);
  });

  it("falls back to the tracker of this machine for a path without a page", () => {
    expect(trackerOptions(new URLSearchParams("tuio=/tuio"), undefined)).toEqual({
      tracker: true, host: DEFAULT_TUIO_HOST, port: DEFAULT_TUIO_PORT, secure: false,
      path: "/tuio", address: `${DEFAULT_TUIO_HOST}:${DEFAULT_TUIO_PORT}/tuio`, version: "2.0",
    });
  });

  it("is the address the parameter names in full", () => {
    expect(options("tuio=ws://table.local:3334/tuio")).toEqual({
      tracker: true, host: "table.local", port: 3334, secure: false, path: "/tuio",
      address: "table.local:3334/tuio", version: "2.0",
    });
    expect(options("tuio=wss://table.example/tuio")).toEqual({
      tracker: true, host: "table.example", port: 443, secure: true, path: "/tuio",
      address: "table.example:443/tuio", version: "2.0",
    });
  });

  it("speaks TUIO 2.0 unless the query asks for the older protocol", () => {
    expect(options("tuio&tuio-version=1.1").version).toBe("1.1");
    expect(options("tuio=table:3333&tuio-version=1.1").version).toBe("1.1");
    expect(options("tuio=/tuio&tuio-version=1.1").version).toBe("1.1");
    expect(options("tuio&tuio-version=2.0").version).toBe("2.0");
    expect(options("tuio&tuio-version=0.9").version).toBe("2.0");
  });
});
