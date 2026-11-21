/**
 * How the address of a tracker reaches an application: the query of the page it was opened
 * with. Every application reads the same parameters, so one address works for all of them.
 *
 *   ?tuio                      the tracker on the machine the page came from
 *   ?tuio=host:port            a tracker somewhere else, which is how a table is addressed
 *   ?tuio=/tuio                a tracker behind the server this page came from, on the port of
 *                              the page: this is what lets one port, and so one forwarded port
 *                              over ssh, carry the application and the surface which drives it
 *   ?tuio=ws://host:port/path  a tracker named in full
 *   ?tuio=host:port&tuio-version=1.1   a tracker that speaks the older protocol
 */

import {DEFAULT_TUIO_HOST, DEFAULT_TUIO_PATH, DEFAULT_TUIO_PORT} from "./receiver.ts";
import {DEFAULT_TUIO_VERSION, TUIO_VERSIONS} from "./tuio.ts";
import type {TuioVersion} from "./tuio.ts";

export interface TrackerOptions {
  /** Whether the page asked for a tracker at all, rather than for the mouse. */
  readonly tracker: boolean;
  readonly host: string;
  readonly port: number;
  readonly secure: boolean;
  /** The path of the WebSocket, "/" for a tracker which listens on a port of its own. */
  readonly path: string;
  /** The address as a person reads it, for the panel of an application which waits for one. */
  readonly address: string;
  readonly version: TuioVersion;
}

/** What a page knows about where it came from: `window.location`, or a test. */
export interface PageOrigin {
  readonly hostname: string;
  /** Empty when the scheme carries the port, which is how a browser reports 80 and 443. */
  readonly port: string;
  readonly protocol: string;
}

function versionOf(value: string | null): TuioVersion {
  return TUIO_VERSIONS.includes(value as TuioVersion) ? value as TuioVersion : DEFAULT_TUIO_VERSION;
}

/** The port a scheme implies, which is what a browser reports as no port at all. */
function portOf(port: string, secure: boolean): number {
  const parsed = Number.parseInt(port, 10);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return secure ? 443 : 80;
}

function addressOf(host: string, port: number, path: string): string {
  return `${host}:${port}${path === DEFAULT_TUIO_PATH ? "" : path}`;
}

function trackerAt(
  found: Omit<TrackerOptions, "address" | "tracker">, tracker = true,
): TrackerOptions {
  return {...found, tracker, address: addressOf(found.host, found.port, found.path)};
}

/** Where the page came from, or nothing outside a browser. */
function pageOrigin(): PageOrigin | undefined {
  return typeof window === "undefined" ? undefined : window.location;
}

/** The tracker the query asks for, with everything it leaves out at its default. */
export function trackerOptions(
  parameters: URLSearchParams, origin: PageOrigin | undefined = pageOrigin(),
): TrackerOptions {
  const value = parameters.get("tuio");
  const version = versionOf(parameters.get("tuio-version"));
  const defaults = {
    host: DEFAULT_TUIO_HOST, port: DEFAULT_TUIO_PORT, secure: false, path: DEFAULT_TUIO_PATH,
    version,
  };
  if (value === null || value === "" || value === "true") {
    return trackerAt(defaults, parameters.has("tuio"));
  }
  if (value.startsWith("ws://") || value.startsWith("wss://")) {
    const url = new URL(value);
    const secure = url.protocol === "wss:";
    return trackerAt({
      host: url.hostname, port: portOf(url.port, secure), secure,
      path: url.pathname === "" ? DEFAULT_TUIO_PATH : url.pathname, version,
    });
  }
  if (value.startsWith("/")) {
    // The tracker is behind the server this page came from, so it is reached on the port of the
    // page: the page, its models and the tracker are one address.
    if (origin === undefined) return trackerAt({...defaults, path: value});
    const secure = origin.protocol === "https:" || origin.protocol === "wss:";
    return trackerAt({
      host: origin.hostname, port: portOf(origin.port, secure), secure, path: value, version,
    });
  }
  const [host, port] = value.split(":");
  const parsed = Number.parseInt(port ?? "", 10);
  return trackerAt({
    host: host === undefined || host === "" ? DEFAULT_TUIO_HOST : host,
    port: Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TUIO_PORT,
    secure: false, path: DEFAULT_TUIO_PATH, version,
  });
}
