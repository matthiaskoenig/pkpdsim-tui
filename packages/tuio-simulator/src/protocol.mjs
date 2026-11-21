/**
 * What the simulator speaks and where it speaks it: the version of TUIO, the transport and the
 * port. The three travel together, because changing one of them changes what the other two
 * mean, and they arrive from a page, so nothing about them is trusted.
 *
 * TUIO 2.0 is the default. TUIO 1.1 is what most tables and most clients still speak, and the
 * simulator sends the two profiles of it a tangible table uses: `/tuio/2Dobj` for the objects
 * and `/tuio/2Dcur` for the touches.
 */

/** The versions of the protocol the simulator can send. */
export const TUIO_VERSIONS = ["2.0", "1.1"];

/** How the bundles leave the simulator. A browser can only receive the first one. */
export const TRANSPORTS = ["websocket", "udp"];

/** The port of TUIO. The specification names it for UDP, and a WebSocket tracker may share it. */
export const DEFAULT_PORT = 3333;

/** The port the control page is served on, which is never a TUIO port. */
export const DEFAULT_PAGE_PORT = 3344;

/** The highest port a socket can be bound to or sent to. */
const MAX_PORT = 65535;

/** What the simulator starts on, before a page or a flag says otherwise. */
export const DEFAULT_SETTINGS = {
  version: "2.0",
  transport: "websocket",
  port: DEFAULT_PORT,
  host: "localhost",
};

function portOf(value, fallback) {
  const number = Math.round(Number(value));
  if (!Number.isFinite(number) || number < 1 || number > MAX_PORT) return fallback;
  return number;
}

function hostOf(value, fallback) {
  if (typeof value !== "string") return fallback;
  const host = value.trim();
  // A host is a name or an address, never a URL, a port or a path.
  return host.length > 0 && host.length <= 253 && !/[\s/:?#]/.test(host) ? host : fallback;
}

/**
 * The settings described by `raw`, with everything it leaves out or gets wrong taken from
 * `fallback`. A page that sends a version the simulator does not know keeps the one it had,
 * which is what makes a newer page safe in front of an older simulator.
 */
export function normalizeSettings(raw, fallback = DEFAULT_SETTINGS) {
  return {
    version: TUIO_VERSIONS.includes(raw?.version) ? raw.version : fallback.version,
    transport: TRANSPORTS.includes(raw?.transport) ? raw.transport : fallback.transport,
    port: portOf(raw?.port, fallback.port),
    host: hostOf(raw?.host, fallback.host),
  };
}

/** Whether two settings describe the same tracker, which is what makes a change worth a restart. */
export function sameTracker(left, right) {
  return left.transport === right.transport && left.port === right.port && left.host === right.host;
}

/** How the control page and the log name a tracker. */
export function describeTracker(settings) {
  const where = settings.transport === "udp"
    ? `udp://${settings.host}:${settings.port}`
    : `ws://${settings.host}:${settings.port}`;
  return `TUIO ${settings.version} on ${where}`;
}
