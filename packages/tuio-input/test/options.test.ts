/** The tracker an application is pointed at, as the query of its address names it. */

import {describe, expect, it} from "vitest";

import {DEFAULT_TUIO_HOST, DEFAULT_TUIO_PORT, trackerOptions} from "../src/index.ts";

function options(query: string): ReturnType<typeof trackerOptions> {
  return trackerOptions(new URLSearchParams(query));
}

describe("the tracker of a query", () => {
  it("is no tracker at all without the parameter, which is the mouse", () => {
    expect(options("")).toEqual({
      tracker: false, host: DEFAULT_TUIO_HOST, port: DEFAULT_TUIO_PORT, version: "2.0",
    });
    expect(options("species=rat").tracker).toBe(false);
  });

  it("is the tracker of this machine when the parameter carries nothing", () => {
    expect(options("tuio")).toEqual({
      tracker: true, host: DEFAULT_TUIO_HOST, port: DEFAULT_TUIO_PORT, version: "2.0",
    });
    expect(options("tuio=").tracker).toBe(true);
  });

  it("is the host and the port the parameter names", () => {
    expect(options("tuio=table.local:3334"))
      .toEqual({tracker: true, host: "table.local", port: 3334, version: "2.0"});
    expect(options("tuio=192.168.1.40:3333").host).toBe("192.168.1.40");
  });

  it("takes the default of whichever half is missing or broken", () => {
    expect(options("tuio=table.local").port).toBe(DEFAULT_TUIO_PORT);
    expect(options("tuio=:3334")).toEqual({
      tracker: true, host: DEFAULT_TUIO_HOST, port: 3334, version: "2.0",
    });
    expect(options("tuio=table:port").port).toBe(DEFAULT_TUIO_PORT);
    expect(options("tuio=table:0").port).toBe(DEFAULT_TUIO_PORT);
  });

  it("speaks TUIO 2.0 unless the query asks for the older protocol", () => {
    expect(options("tuio&tuio-version=1.1").version).toBe("1.1");
    expect(options("tuio=table:3333&tuio-version=1.1").version).toBe("1.1");
    expect(options("tuio&tuio-version=2.0").version).toBe("2.0");
    expect(options("tuio&tuio-version=0.9").version).toBe("2.0");
  });
});
