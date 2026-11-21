/** The tangible input layer: TUIO 2.0 and the mouse, behind one interface. */

export {signedAngle, TWO_PI, unwrapAngle, wrapAngle} from "./angle.ts";
export {hitTest} from "./hit-test.ts";
export type {Anchor, Point} from "./hit-test.ts";
export {createMockTableInput} from "./mock.ts";
export type {MockTableInput, MockTableInputOptions} from "./mock.ts";
export {DEFAULT_TUIO_HOST, DEFAULT_TUIO_PORT, WebsocketTuioReceiver} from "./receiver.ts";
export type {WebsocketTuioReceiverOptions} from "./receiver.ts";
export {
  ABSOLUTE_SPAN, angleForValue, offsetOfValue, roleForMarker, valueAtOffset, valueFromAngle,
} from "./roles.ts";
export type {RoleMode, RoleScale, TokenRole} from "./roles.ts";
export {
  applyTuioObject, DEFAULT_SENSOR, emptySnapshot, removeTuioObject, sensorFromDim, withSensor,
} from "./snapshot.ts";
export type {TuioObjectLike, TuioPointerLike, TuioSession, TuioTokenLike} from "./snapshot.ts";
export {createTuioTableInput, DEFAULT_TUIO_VERSION, TUIO_VERSIONS} from "./tuio.ts";
export type {TuioTableInputOptions, TuioVersion} from "./tuio.ts";
export {trackerOptions} from "./options.ts";
export type {TrackerOptions} from "./options.ts";
export type {
  SensorSize, TableInput, TableInputState, TableListener, TablePointer, TableSnapshot, TableStatus,
  TableToken,
} from "./types.ts";
export {unassignedMarkers, valuesFromTokens, winningTokens} from "./surface.ts";
