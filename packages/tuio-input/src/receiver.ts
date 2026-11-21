/**
 * The WebSocket receiver of the TUIO client. `tuio-client` ships none, so this is the
 * `osc-js` subclass its README and the Interactive Scape web examples use.
 */

import OSC from "osc-js";
import {TuioReceiver} from "tuio-client";

export interface WebsocketTuioReceiverOptions {
  /** The host of the tracker: the table, or the machine that runs the simulator. */
  readonly host?: string;
  /** The WebSocket port of the tracker. 3333 is the UDP port of TUIO and is not this one. */
  readonly port?: number;
  readonly secure?: boolean;
  readonly onOpen?: () => void;
  readonly onClose?: () => void;
  readonly onError?: (error: unknown) => void;
}

export const DEFAULT_TUIO_HOST = "localhost";
export const DEFAULT_TUIO_PORT = 3343;

export class WebsocketTuioReceiver extends TuioReceiver {
  readonly host: string;
  readonly port: number;
  readonly secure: boolean;
  private readonly osc: OSC;

  constructor(options: WebsocketTuioReceiverOptions = {}) {
    super();
    this.host = options.host ?? DEFAULT_TUIO_HOST;
    this.port = options.port ?? DEFAULT_TUIO_PORT;
    this.secure = options.secure ?? false;
    const plugin = new OSC.WebsocketClientPlugin({host: this.host, port: this.port, secure: this.secure});
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

  /** `ws://host:port`, which is what the tracker has to be listening on. */
  get url(): string {
    return `${this.secure ? "wss" : "ws"}://${this.host}:${this.port}`;
  }

  override connect(): void {
    this.osc.open();
  }

  override disconnect(): void {
    this.osc.close();
    this.isConnected = false;
  }
}
