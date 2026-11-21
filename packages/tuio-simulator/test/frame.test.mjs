/**
 * The bundle of a frame, and the round trip through the client the table applications use: what
 * the simulator packs is read back by `tuio-client` over the same `osc-js` the browser runs.
 */

import OSC from "osc-js";
import {Tuio20Client, TuioReceiver} from "tuio-client";
import {describe, expect, it} from "vitest";

import {TWO_PI} from "../src/angle.mjs";
import {
  DEFAULT_SOURCE, frameMessages, NTP_EPOCH_OFFSET, oscTimetag, packFrame, timetagMilliseconds,
} from "../src/frame.mjs";
import {dimFromSensor} from "../src/sensor.mjs";
import {createSessionIds} from "../src/sessions.mjs";
import {frameOf, normalizeSurface} from "../src/surface.mjs";

/** A frame of a surface described the way the control page describes it. */
function frameAt(frameId, surface, sessions, milliseconds = 1763692800000) {
  return frameOf(normalizeSurface(surface), sessions, {
    frameId, time: oscTimetag(milliseconds), source: DEFAULT_SOURCE,
  });
}

function addressesOf(frame) {
  return frameMessages(frame).map(message => message.address);
}

function messageAt(frame, address) {
  return frameMessages(frame).find(message => message.address === address);
}

/**
 * The receiver of `tuio-client` with the socket taken out: bundles are fed in as bytes, through
 * the same `osc-js` event handler the WebSocket receiver of `packages/tuio-input` uses.
 */
class FeedReceiver extends TuioReceiver {
  constructor() {
    super();
    this.osc = new OSC();
    this.osc.on("*", message => this.onOscMessage(message));
  }

  connect() {
    this.isConnected = true;
  }

  disconnect() {
    this.isConnected = false;
  }

  feed(bytes) {
    this.osc.eventHandler.notify(bytes);
  }
}

describe("the bundle of a frame", () => {
  it("opens with the frame message and closes with the alive message", () => {
    const sessions = createSessionIds();
    const frame = frameAt(1, {
      tokens: [{key: "t1", marker: 1, x: 0.5, y: 0.5, angle: 0}],
      pointers: [{key: "p1", x: 0.2, y: 0.3}],
    }, sessions);
    const addresses = addressesOf(frame);
    expect(addresses[0]).toBe("/tuio2/frm");
    expect(addresses.at(-1)).toBe("/tuio2/alv");
    expect(addresses).toEqual(["/tuio2/frm", "/tuio2/tok", "/tuio2/ptr", "/tuio2/alv"]);
  });

  it("carries one token message per token and one pointer message per touch", () => {
    const sessions = createSessionIds();
    const frame = frameAt(1, {
      tokens: [{key: "a", marker: 1}, {key: "b", marker: 2}, {key: "c", marker: 2}],
      pointers: [{key: "p", x: 0, y: 0}, {key: "q", x: 1, y: 1}],
    }, sessions);
    const addresses = addressesOf(frame);
    expect(addresses.filter(address => address === "/tuio2/tok")).toHaveLength(3);
    expect(addresses.filter(address => address === "/tuio2/ptr")).toHaveLength(2);
  });

  it("names every session on the surface in the alive message, and nothing else", () => {
    const sessions = createSessionIds();
    const frame = frameAt(1, {
      tokens: [{key: "a", marker: 1}, {key: "b", marker: 2}],
      pointers: [{key: "p", x: 0, y: 0}],
    }, sessions);
    const alive = messageAt(frame, "/tuio2/alv").args.map(argument => argument.value);
    expect(alive).toEqual([1, 2, 3]);
  });

  it("is a frame message and an alive message even when the table is empty", () => {
    const frame = frameAt(4, {}, createSessionIds());
    expect(addressesOf(frame)).toEqual(["/tuio2/frm", "/tuio2/alv"]);
    expect(messageAt(frame, "/tuio2/alv").args).toEqual([]);
  });

  it("writes the type tag string of the protocol, so a position stays a float at 0 and 1", () => {
    const sessions = createSessionIds();
    const frame = frameAt(1, {
      tokens: [{key: "t", marker: 1, x: 0, y: 1, angle: 0}],
      pointers: [{key: "p", x: 1, y: 0}],
    }, sessions);
    const types = address => messageAt(frame, address).args.map(argument => argument.type).join("");
    expect(types("/tuio2/frm")).toBe("itis");
    expect(types("/tuio2/tok")).toBe("iiifff");
    expect(types("/tuio2/ptr")).toBe("iiiffffff");
    expect(types("/tuio2/alv")).toBe("ii");
  });

  it("carries the frame id, the packed sensor and the source in the frame message", () => {
    const frame = frameAt(12, {sensor: {width: 640, height: 480}}, createSessionIds());
    const args = messageAt(frame, "/tuio2/frm").args.map(argument => argument.value);
    expect(args[0]).toBe(12);
    expect(args[2]).toBe(dimFromSensor({width: 640, height: 480}));
    expect(args[3]).toBe(DEFAULT_SOURCE);
  });
});

describe("the OSC time tag", () => {
  it("counts seconds from 1900 in the high 32 bits", () => {
    const timetag = oscTimetag(1000);
    expect(timetag >> 32n).toBe(NTP_EPOCH_OFFSET + 1n);
    expect(timetag & 0xffffffffn).toBe(0n);
  });

  it("holds the fraction of a second in the low 32 bits", () => {
    expect(oscTimetag(500) & 0xffffffffn).toBe(1n << 31n);
  });

  it("is undone by reading the milliseconds back", () => {
    for (const milliseconds of [0, 1, 1763692800123, 1763692800999]) {
      expect(Math.round(timetagMilliseconds(oscTimetag(milliseconds)))).toBe(milliseconds);
    }
  });
});

describe("the packed bundle", () => {
  it("unpacks as a bundle of the same messages", () => {
    const sessions = createSessionIds();
    const frame = frameAt(3, {
      tokens: [{key: "t1", marker: 5, x: 0.25, y: 0.75, angle: Math.PI}],
    }, sessions);
    const packet = new OSC.Packet();
    packet.unpack(new DataView(packFrame(frame).buffer));
    const bundle = packet.value;
    expect(bundle.bundleElements.map(element => element.address))
      .toEqual(["/tuio2/frm", "/tuio2/tok", "/tuio2/alv"]);
    const [frm, tok] = bundle.bundleElements;
    expect(frm.types).toBe(",itis");
    expect(frm.args[0]).toBe(3);
    expect(frm.args[1]).toBe(frame.time);
    expect(tok.args.slice(0, 3)).toEqual([1, 0, 5]);
    expect(tok.args[3]).toBeCloseTo(0.25, 6);
    expect(tok.args[5]).toBeCloseTo(Math.PI, 6);
  });

  it("is read by the TUIO client of the table applications", () => {
    const receiver = new FeedReceiver();
    const client = new Tuio20Client(receiver);
    const added = [];
    const updated = [];
    const removed = [];
    client.addTuioListener({
      tuioAdd: object => added.push(object),
      tuioUpdate: object => updated.push(object),
      tuioRemove: object => removed.push(object),
      tuioRefresh: () => undefined,
    });
    client.connect();

    // A bundle a moment old, because `osc-js` defers a bundle whose time tag is still to come.
    const past = Date.now() - 1000;
    const sessions = createSessionIds();
    const put = {tokens: [{key: "t1", marker: 2, x: 0.25, y: 0.75, angle: -Math.PI / 2}]};
    receiver.feed(packFrame(frameAt(1, put, sessions, past)));

    expect(added).toHaveLength(1);
    expect(client.dim).toBe(dimFromSensor({width: 1920, height: 1080}));
    expect(client.source).toBe(DEFAULT_SOURCE);
    const token = added[0].token;
    expect(token.sessionId).toBe(1);
    expect(token.cId).toBe(2);
    expect(token.position.x).toBeCloseTo(0.25, 6);
    expect(token.position.y).toBeCloseTo(0.75, 6);
    expect(token.angle).toBeCloseTo(TWO_PI - Math.PI / 2, 6);

    const turned = {tokens: [{key: "t1", marker: 2, x: 0.25, y: 0.75, angle: 0.5}]};
    receiver.feed(packFrame(frameAt(2, turned, sessions, past + 1)));
    expect(updated).toHaveLength(1);
    expect(updated[0].token.angle).toBeCloseTo(0.5, 6);

    receiver.feed(packFrame(frameAt(3, {}, sessions, past + 2)));
    expect(removed).toHaveLength(1);
    expect(removed[0].token.sessionId).toBe(1);
  });
});
