/**
 * The WebSocket receiver of the TUIO client. `tuio-client` ships none, so this is an `osc-js`
 * receiver, as its README and the Interactive Scape web examples use one.
 *
 * The WebSocket plugin of osc-js builds `ws://host:port` and carries no path. A path is how one
 * port serves the application and the tracker at once, which is what makes a table reachable
 * over a single forwarded port, so the socket is opened here instead.
 */

import OSC from "osc-js";
import {TuioReceiver} from "tuio-client";

export interface WebsocketTuioReceiverOptions {
  /** The host of the tracker: the table, or the machine that runs the simulator. */
  readonly host?: string;
  /** The port of the tracker. 3333 is the port of TUIO, over UDP and over WebSocket alike. */
  readonly port?: number;
  readonly secure?: boolean;
  /** The path of the WebSocket, "/" for a tracker which listens on a port of its own. */
  readonly path?: string;
  readonly onOpen?: () => void;
  readonly onClose?: () => void;
  readonly onError?: (error: unknown) => void;
}

export const DEFAULT_TUIO_HOST = "localhost";
export const DEFAULT_TUIO_PORT = 3333;
export const DEFAULT_TUIO_PATH = "/";

/** The connection states osc-js asks a plugin for, as its `STATUS` names them. */
const STATUS = {
  NOT_INITIALIZED: -1, CONNECTING: 0, OPEN: 1, CLOSING: 2, CLOSED: 3,
} as const;

/** What osc-js hands a plugin to report with. */
type Notify = (...args: readonly unknown[]) => void;

/**
 * An osc-js plugin which opens one WebSocket URL, so that the address of the tracker is the one
 * the page was given and not one built from a host and a port.
 */
class UrlWebsocketPlugin {
  private socket: WebSocket | null = null;
  private state: number = STATUS.NOT_INITIALIZED;
  private notify: Notify = () => undefined;

  constructor(private readonly url: string) {}

  /** osc-js hooks its event handler in here. */
  registerNotify(notify: Notify): void {
    this.notify = notify;
  }

  status(): number {
    return this.state;
  }

  open(): void {
    this.close();
    const socket = new WebSocket(this.url);
    socket.binaryType = "arraybuffer";
    this.socket = socket;
    this.state = STATUS.CONNECTING;
    const remote = {address: this.url, family: "ws", port: 0, size: 0};
    socket.onopen = () => {
      this.state = STATUS.OPEN;
      this.notify("open");
    };
    socket.onclose = () => {
      this.state = STATUS.CLOSED;
      this.notify("close");
    };
    socket.onerror = (error: unknown) => {
      this.notify("error", error);
    };
    socket.onmessage = (message: MessageEvent<ArrayBuffer>) => {
      this.notify(message.data, remote);
    };
  }

  close(): void {
    if (this.socket === null) return;
    this.state = STATUS.CLOSING;
    this.socket.close();
    this.socket = null;
  }

  send(binary: Uint8Array<ArrayBuffer>): void {
    if (this.socket === null || this.state !== STATUS.OPEN) return;
    this.socket.send(binary);
  }
}

export class WebsocketTuioReceiver extends TuioReceiver {
  readonly host: string;
  readonly port: number;
  readonly secure: boolean;
  readonly path: string;
  private readonly osc: OSC;

  constructor(options: WebsocketTuioReceiverOptions = {}) {
    super();
    this.host = options.host ?? DEFAULT_TUIO_HOST;
    this.port = options.port ?? DEFAULT_TUIO_PORT;
    this.secure = options.secure ?? false;
    this.path = options.path ?? DEFAULT_TUIO_PATH;
    // osc-js takes any object with these four methods as its transport; the shipped plugins are
    // classes of the same shape, which its typings declare as private members.
    const plugin = new UrlWebsocketPlugin(this.url) as unknown as OSC.Plugin;
    this.osc = new OSC({plugin});
    this.osc.on("*", (message: OSC.Message) => this.onOscMessage(message));
    this.osc.on("open", () => {
      this.isConnected = true;
      options.onOpen?.();
    });
    this.osc.on("close", () => {
      this.isConnected = false;
      options.onClose?.();
    });
    this.osc.on("error", (error: unknown) => {
      this.isConnected = false;
      options.onError?.(error);
    });
  }

  /** The address the tracker has to be listening on. */
  get url(): string {
    return `${this.secure ? "wss" : "ws"}://${this.host}:${this.port}${this.path}`;
  }

  override connect(): void {
    this.osc.open();
  }

  override disconnect(): void {
    this.osc.close();
    this.isConnected = false;
  }
}
