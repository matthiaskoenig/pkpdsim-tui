/**
 * What the table tells whoever is holding it: the objects on the surface, as the table reads
 * them right now.
 *
 * The TUIO simulator puts a table application in a frame under its surface, so the two draw the
 * same objects: the simulator knows where an object is and how far it is turned, and the table
 * knows what that object is and what it has just done. The table posts what it knows to the
 * window which embeds it, and the simulator draws its objects as the things they stand for: a
 * dose is a tablet which grows as it is turned up.
 *
 * Nothing but the labels and the values of a public model travels this way, and a table which
 * nobody embeds posts nothing at all.
 */

import type {Voice} from "./voice.ts";

/** The name of the protocol, which keeps these messages apart from everybody else's. */
export const MIRROR_SOURCE = "pkpdsim-tui";

/** One object of the surface, as the table reads it. */
export interface MirroredObject {
  readonly marker: number;
  readonly session: number;
  /** `dial`, `plain` or `unassigned`, the kinds of the card of an object. */
  readonly kind: string;
  readonly title: string;
  readonly value: string;
  readonly note: string;
  readonly glyph?: {readonly kind: string; readonly level: number};
}

export interface MirrorState {
  readonly source: typeof MIRROR_SOURCE;
  readonly type: "objects";
  /** Which table this is, in the language it is being read in. */
  readonly table: string;
  readonly locale: string;
  readonly level: string;
  readonly objects: readonly MirroredObject[];
}

export interface Mirror {
  /** Posts the objects to whoever embeds this table, when they have changed. */
  post(objects: readonly MirroredObject[]): void;
}

/**
 * The mirror of this table. A table nobody embeds gets one which does nothing, so no caller has
 * to ask whether it is in a frame.
 */
export function createMirror(voice: Voice, table: string): Mirror {
  const parent = typeof window === "undefined" ? null : window.parent;
  if (parent === null || parent === window) return {post: () => undefined};
  let last: MirrorState | null = null;
  let previous = "";

  // The table may be embedded from another origin, so the objects go to whoever asked for the
  // frame; they are the labels of a public model and nothing else.
  const post = (state: MirrorState): void => parent.postMessage(state, "*");

  // A surface which reloads has forgotten what is on the table, so it asks for it again.
  window.addEventListener("message", event => {
    const message: unknown = event.data;
    if (typeof message !== "object" || message === null) return;
    const asked = message as {source?: unknown; type?: unknown};
    if (asked.source !== MIRROR_SOURCE || asked.type !== "hello") return;
    if (last !== null) post(last);
  });

  return {
    post(objects: readonly MirroredObject[]): void {
      const state: MirrorState = {
        source: MIRROR_SOURCE, type: "objects", table,
        locale: voice.locale, level: voice.level, objects,
      };
      const serialized = JSON.stringify(state);
      if (serialized === previous) return;
      previous = serialized;
      last = state;
      post(state);
    },
  };
}
