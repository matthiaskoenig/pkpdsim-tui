/**
 * The frame of a tracker, as the bundle a client receives, in either version of the protocol.
 *
 * A TUIO 2.0 bundle opens with `/tuio2/frm` and closes with `/tuio2/alv`, which is not a
 * convention but the protocol: a client collects the messages between the two and reads the
 * frame as a whole, so a bundle without its `alv` is never applied and an object that is missing
 * from the `alv` has left the surface.
 *
 * TUIO 1.1 says the same thing in two profiles that are each their own stream: `/tuio/2Dobj` for
 * the objects and `/tuio/2Dcur` for the touches, each with an `alive` message naming what is on
 * the surface, a `set` message per object and the `fseq` that applies them. A client that gets
 * no `fseq` has received nothing.
 */

import OSC from "osc-js";
import {dimFromSensor} from "./sensor.mjs";
import {DEFAULT_SETTINGS} from "./protocol.mjs";

/** The seconds between the epoch of NTP, 1900, and the epoch of POSIX, 1970. */
export const NTP_EPOCH_OFFSET = 2208988800n;

/** 2^32, the fractions of a second of an NTP timestamp. */
const NTP_FRACTIONS = 4294967296;

/** What a tracker calls itself in the frame message, as `application@address`. */
export const DEFAULT_SOURCE = "pkpdsim-tui-simulator@localhost";

const int = value => ({type: "i", value});
const float = value => ({type: "f", value});
const string = value => ({type: "s", value});

/**
 * The 64 bit OSC time tag of a POSIX timestamp in milliseconds: NTP seconds in the high 32 bits
 * and the fraction of the second in the low 32.
 */
export function oscTimetag(milliseconds) {
  const seconds = Math.floor(milliseconds / 1000);
  const rest = milliseconds - seconds * 1000;
  const fractions = BigInt(Math.floor((rest / 1000) * NTP_FRACTIONS));
  return ((BigInt(seconds) + NTP_EPOCH_OFFSET) << 32n) | fractions;
}

/** The milliseconds of an OSC time tag, which is the inverse of `oscTimetag`. */
export function timetagMilliseconds(timetag) {
  const seconds = Number((timetag >> 32n) - NTP_EPOCH_OFFSET);
  const fractions = Number(timetag & 0xffffffffn);
  return seconds * 1000 + (fractions / NTP_FRACTIONS) * 1000;
}

function bySession(left, right) {
  return left.sessionId - right.sessionId;
}

/**
 * The messages of one frame, in the order the bundle holds them: the frame message, a token
 * message per token, a pointer message per touch, and the alive message of every session still
 * on the surface. The arguments carry their OSC type, because the type tag string is part of the
 * protocol: a position is a float even when it lands exactly on 0 or 1.
 */
export function frameMessages(frame) {
  const tokens = [...frame.tokens].sort(bySession);
  const pointers = [...frame.pointers].sort(bySession);
  const messages = [{
    address: "/tuio2/frm",
    args: [
      int(frame.frameId),
      {type: "t", value: frame.time},
      int(dimFromSensor(frame.sensor)),
      {type: "s", value: frame.source ?? DEFAULT_SOURCE},
    ],
  }];
  for (const token of tokens) {
    messages.push({
      address: "/tuio2/tok",
      args: [
        int(token.sessionId), int(token.typeId ?? 0), int(token.marker),
        float(token.x), float(token.y), float(token.angle),
      ],
    });
  }
  for (const pointer of pointers) {
    messages.push({
      address: "/tuio2/ptr",
      args: [
        int(pointer.sessionId), int(pointer.typeId ?? 0), int(pointer.componentId ?? 0),
        float(pointer.x), float(pointer.y), float(pointer.angle ?? 0),
        float(pointer.shear ?? 0), float(pointer.radius), float(pointer.press),
      ],
    });
  }
  messages.push({
    address: "/tuio2/alv",
    args: [...tokens, ...pointers].map(object => object.sessionId).sort((a, b) => a - b).map(int),
  });
  return messages;
}

/**
 * The messages of one frame in TUIO 1.1, which carries no sensor size and no type id: an object
 * is its symbol and a touch is a cursor. The velocities and the accelerations are part of every
 * `set` message, and the simulator reports them as zero rather than differentiating a mouse.
 */
export function frameMessages11(frame) {
  const tokens = [...frame.tokens].sort(bySession);
  const pointers = [...frame.pointers].sort(bySession);
  const source = frame.source ?? DEFAULT_SOURCE;
  const messages = [];
  messages.push({address: "/tuio/2Dobj", args: [string("source"), string(source)]});
  messages.push({
    address: "/tuio/2Dobj",
    args: [string("alive"), ...tokens.map(token => int(token.sessionId))],
  });
  for (const token of tokens) {
    messages.push({
      address: "/tuio/2Dobj",
      args: [
        string("set"), int(token.sessionId), int(token.marker),
        float(token.x), float(token.y), float(token.angle),
        float(0), float(0), float(0), float(0), float(0),
      ],
    });
  }
  messages.push({address: "/tuio/2Dobj", args: [string("fseq"), int(frame.frameId)]});
  messages.push({address: "/tuio/2Dcur", args: [string("source"), string(source)]});
  messages.push({
    address: "/tuio/2Dcur",
    args: [string("alive"), ...pointers.map(pointer => int(pointer.sessionId))],
  });
  for (const pointer of pointers) {
    messages.push({
      address: "/tuio/2Dcur",
      args: [
        string("set"), int(pointer.sessionId),
        float(pointer.x), float(pointer.y),
        float(0), float(0), float(0),
      ],
    });
  }
  messages.push({address: "/tuio/2Dcur", args: [string("fseq"), int(frame.frameId)]});
  return messages;
}

/** The messages of one frame in the version named, which is what a bundle is packed from. */
export function messagesOf(frame, version = DEFAULT_SETTINGS.version) {
  return version === "1.1" ? frameMessages11(frame) : frameMessages(frame);
}

/**
 * An OSC message with the type tag string written out. `osc-js` infers the type of an argument
 * of `Message`, which would make an integral position an int, and takes only a `Message` into a
 * bundle, which rules out its `TypedMessage`.
 */
class TuioMessage extends OSC.Message {
  constructor(address, args) {
    super(address);
    this.types = args.map(argument => argument.type).join("");
    this.args = args.map(argument => argument.value);
  }
}

/** The bundle of one frame, packed as the bytes a client receives. */
export function packFrame(frame, version = DEFAULT_SETTINGS.version) {
  const messages = messagesOf(frame, version).map(message => new TuioMessage(message.address, message.args));
  const bundle = new OSC.Bundle(messages, Math.floor(timetagMilliseconds(frame.time)));
  return bundle.pack();
}
