/**
 * The tracker half of the simulator: where the bundles of a frame go.
 *
 * The two transports are not two ways of saying the same thing. A WebSocket tracker listens, and
 * what it sends reaches the applications that connected to it, which is the only transport a
 * browser can receive. A UDP tracker does not listen and is never connected to: it sends every
 * frame to one address, as a tracker on a table does, and learns nothing about who is there.
 */

import {createSocket} from "node:dgram";
import {WebSocket, WebSocketServer} from "ws";

/** The bytes of a packed bundle as a datagram. */
function datagram(bytes) {
  return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

/**
 * A tracker on a WebSocket port, which is what a table application in a browser connects to.
 *
 * @param {{host: string, port: number, onChange: () => void, onLog: (text: string) => void}} options
 */
export function createWebsocketTracker({host, port, onChange, onLog}) {
  const server = new WebSocketServer({host, port});
  server.on("connection", socket => {
    onLog(`A table application connected. Listening: ${server.clients.size}.`);
    socket.on("close", () => {
      onLog(`A table application left. Listening: ${server.clients.size}.`);
      onChange();
    });
    socket.on("error", () => socket.terminate());
    onChange();
  });
  return {
    kind: "websocket",
    url: `ws://${host}:${port}`,
    server,
    /** How many applications are listening, which a WebSocket tracker knows exactly. */
    get listeners() {
      return server.clients.size;
    },
    /** Whether a frame is worth packing at all, which it is not when nobody is connected. */
    get wants() {
      return server.clients.size > 0;
    },
    send(bytes) {
      if (server.clients.size === 0) return;
      for (const client of server.clients) {
        if (client.readyState === WebSocket.OPEN) client.send(bytes, {binary: true});
      }
    },
    close() {
      for (const client of server.clients) client.terminate();
      server.close();
    },
  };
}

/**
 * A tracker that sends to a UDP address, which is the transport of TUIO itself and the one a
 * table, a Unity client or a TUIO dump tool listens on. Nobody connects to it, so it never
 * reports a listener: a datagram that nothing receives is not an error and is not noticed.
 */
export function createUdpTracker({host, port, onLog}) {
  const socket = createSocket("udp4");
  let open = true;
  socket.on("error", error => onLog(`The UDP tracker hit an error: ${String(error)}`));
  // Nothing is received on this socket, so it never blocks the event loop of the process.
  socket.unref();
  return {
    kind: "udp",
    url: `udp://${host}:${port}`,
    server: null,
    /** Unknown by the nature of the transport, which the control page says in those words. */
    get listeners() {
      return null;
    },
    /** Always: a sender that cannot be connected to has no reason to stop sending. */
    get wants() {
      return open;
    },
    send(bytes) {
      if (!open) return;
      socket.send(datagram(bytes), port, host, error => {
        if (error !== null && error !== undefined) onLog(`A frame was not sent: ${String(error)}`);
      });
    },
    close() {
      open = false;
      socket.close();
    },
  };
}

/** The tracker of a set of settings, which is the one thing a change of transport replaces. */
export function createTracker(settings, hooks) {
  return settings.transport === "udp"
    ? createUdpTracker({host: settings.host, port: settings.port, ...hooks})
    : createWebsocketTracker({host: settings.host, port: settings.port, ...hooks});
}
