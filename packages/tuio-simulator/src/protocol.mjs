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

/**
 * Which pages may drive the simulator. A browser tells a socket the origin of the page it was
 * opened from, so the control page itself, and an application which carries it through a proxy
 * of its own, are let in and a page of the internet is not: without this any site open in the
 * same browser could put objects on the table and point the tracker of the machine wherever it
 * liked. A client which sends no origin is not a browser, so a script on the machine still
 * works.
 */
export function loopback(hostname) {
  // The address of this machine and nothing which only reads like it: `127.0.0.1.example.com`
  // is a name somebody else owns, and a URL spells the loopback address of IPv6 in brackets.
  return hostname === "localhost" || hostname === "::1" || hostname === "[::1]"
    || /^127(\.\d{1,3}){3}$/u.test(hostname);
}

export function originAllowed(origin, allowed) {
  if (origin === undefined || origin === "") return true;
  if (allowed.includes("*") || allowed.includes(origin)) return true;
  try {
    return loopback(new URL(origin).hostname);
  } catch {
    return false;
  }
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
