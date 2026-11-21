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
 *   ?tuio=off                  the mouse, even where a tracker is there to be found
 *
 * A page opened without `?tuio` looks for a tracker behind its own server once, at
 * `/tuio`: the development server and the preview server of this repository carry one there, so
 * a table that was started with `npm run dev` works at its address with nothing added to it,
 * including through a single forwarded port over ssh. A page which finds nothing runs on the
 * mouse, which is what a published build does.
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
  /** Whether the page found this tracker behind its own server rather than being told about it. */
  readonly discovered: boolean;
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
  found: Omit<TrackerOptions, "address" | "tracker" | "discovered">, tracker = true,
): TrackerOptions {
  return {
    ...found, tracker, discovered: false,
    address: addressOf(found.host, found.port, found.path),
  };
}

/** The path a page looks for a tracker of its own server at. */
export const SAME_ORIGIN_PATH = "/tuio";
/** How long that look takes before the page settles for the mouse, in milliseconds. */
const PROBE_TIMEOUT = 1500;

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
  // A page can say that it wants the mouse, which is how a tracker that is there to be found is
  // left alone: a second table on the same server, or a demonstration on a laptop.
  if (value === "off" || value === "false" || value === "none") return trackerAt(defaults, false);
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

/** The address of a tracker as a WebSocket URL. */
export function trackerUrl(options: TrackerOptions): string {
  return `${options.secure ? "wss" : "ws"}://${options.host}:${options.port}${options.path}`;
}

/** Whether something answers the WebSocket handshake at that address, within the timeout. */
function answers(url: string, timeout: number): Promise<boolean> {
  return new Promise<boolean>(resolve => {
    let socket: WebSocket;
    try {
      socket = new WebSocket(url);
    } catch {
      resolve(false);
      return;
    }
    let settled = false;
    const done = (answer: boolean): void => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      socket.onopen = null;
      socket.onerror = null;
      socket.onclose = null;
      // The receiver opens the connection the table runs on; this one has done its work.
      try {
        socket.close();
      } catch {
        // A socket which never opened is already gone.
      }
      resolve(answer);
    };
    const timer = window.setTimeout(() => done(false), timeout);
    socket.onopen = () => done(true);
    socket.onerror = () => done(false);
    socket.onclose = () => done(false);
  });
}

/**
 * The tracker of a page which did not name one: the server the page came from is asked whether
 * it carries one at `SAME_ORIGIN_PATH`, and the page takes it when it does. This is what makes
 * one address enough for the whole table, a forwarded port included, and it costs a page which
 * is served from a build without a tracker one refused connection.
 */
export async function resolveTracker(
  parameters: URLSearchParams, origin: PageOrigin | undefined = pageOrigin(),
): Promise<TrackerOptions> {
  const asked = trackerOptions(parameters, origin);
  if (asked.tracker || parameters.has("tuio") || origin === undefined) return asked;
  if (typeof WebSocket === "undefined") return asked;
  const query = new URLSearchParams(parameters);
  query.set("tuio", SAME_ORIGIN_PATH);
  const probe = trackerOptions(query, origin);
  return await answers(trackerUrl(probe), PROBE_TIMEOUT) ? {...probe, discovered: true} : asked;
}
