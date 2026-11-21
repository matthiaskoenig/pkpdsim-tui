/**
 * How the address of a tracker reaches an application: the query of the page it was opened
 * with. Every application reads the same two parameters, so one address works for all of them.
 *
 *   ?tuio                        the tracker on the machine the page came from
 *   ?tuio=host:port              a tracker somewhere else, which is how a table is addressed
 *   ?tuio=host:port&tuio-version=1.1   a tracker that speaks the older protocol
 */

import {DEFAULT_TUIO_HOST, DEFAULT_TUIO_PORT} from "./receiver.ts";
import {DEFAULT_TUIO_VERSION, TUIO_VERSIONS} from "./tuio.ts";
import type {TuioVersion} from "./tuio.ts";

export interface TrackerOptions {
  /** Whether the page asked for a tracker at all, rather than for the mouse. */
  readonly tracker: boolean;
  readonly host: string;
  readonly port: number;
  readonly version: TuioVersion;
}

function versionOf(value: string | null): TuioVersion {
  return TUIO_VERSIONS.includes(value as TuioVersion) ? value as TuioVersion : DEFAULT_TUIO_VERSION;
}

/** The tracker the query asks for, with everything it leaves out at its default. */
export function trackerOptions(parameters: URLSearchParams): TrackerOptions {
  const value = parameters.get("tuio");
  const version = versionOf(parameters.get("tuio-version"));
  if (value === null || value === "" || value === "true") {
    return {
      tracker: parameters.has("tuio"), host: DEFAULT_TUIO_HOST, port: DEFAULT_TUIO_PORT, version,
    };
  }
  const [host, port] = value.split(":");
  const parsed = Number.parseInt(port ?? "", 10);
  return {
    tracker: true,
    host: host === undefined || host === "" ? DEFAULT_TUIO_HOST : host,
    port: Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TUIO_PORT,
    version,
  };
}
