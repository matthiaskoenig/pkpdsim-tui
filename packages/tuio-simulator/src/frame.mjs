/**
 * The frame of a tracker, as the bundle a client receives.
 *
 * Every bundle opens with `/tuio2/frm` and closes with `/tuio2/alv`, which is not a convention
 * but the protocol: a client collects the messages between the two and reads the frame as a
 * whole, so a bundle without its `alv` is never applied and an object that is missing from the
 * `alv` has left the surface.
 */

import OSC from "osc-js";
import {dimFromSensor} from "./sensor.mjs";

/** The seconds between the epoch of NTP, 1900, and the epoch of POSIX, 1970. */
export const NTP_EPOCH_OFFSET = 2208988800n;

/** 2^32, the fractions of a second of an NTP timestamp. */
const NTP_FRACTIONS = 4294967296;

/** What a tracker calls itself in the frame message, as `application@address`. */
export const DEFAULT_SOURCE = "pkpdsim-tui-simulator@localhost";

const int = value => ({type: "i", value});
const float = value => ({type: "f", value});

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
export function packFrame(frame) {
  const messages = frameMessages(frame).map(message => new TuioMessage(message.address, message.args));
  const bundle = new OSC.Bundle(messages, Math.floor(timetagMilliseconds(frame.time)));
  return bundle.pack();
}
