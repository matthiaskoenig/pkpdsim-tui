/**
 * Which ids the markers of this table carry.
 *
 * The objects of an application are numbered from 1: the first object of a table is 1, the
 * second 2, and one set of pucks serves all four tables. A real table brings its own markers,
 * and their ids are whatever was printed on them, [1, 3, 5, 6, 11, 12, 21] on one table and
 * something else on the next. `?ids=` says them, in the order the objects of a table are picked
 * up, and the nth object of every table is then read from the nth id of that list:
 *
 *   ?ids=1,3,5,6,11,12,21   the pucks of this table, in that order
 *   (nothing)               what the server of the page carries, and the markers from 1
 *                           where it carries nothing, which is what the simulator and the
 *                           mouse of a laptop give
 *
 * The ids of a table are said once, to the server which serves it, with
 * `npm run dev -- --ids 1,3,5,6,11,12,21`: a booth is then one address with nothing in it, and
 * every page of that table reads the same markers, the one a visitor is handed, the one a table
 * opens again and the one somebody typed. A page which names its own ids says them for itself,
 * which is how another list is tried without restarting the table.
 *
 * What a visitor reads is the id of the puck in their hand everywhere: the number on the card of
 * an object, the one in the panel and the one in the sentence which asks for an object are the
 * ids of this table.
 *
 * A list which is not a list of whole numbers, which names one puck twice, or which does not
 * reach as far as the objects of a table, is said at the start rather than left to a visitor who
 * turns an object nothing answers to.
 */

import type {TokenRole} from "./roles.ts";

/** The parameter of the address which says the ids of the markers of this table. */
export const MARKER_IDS = "ids";

/** An example, for the sentence a wrong list is refused with. */
const EXAMPLE = "1,3,5,6,11,12,21";

/**
 * The ids of the markers of a table, as the page was given them: the list of its own address,
 * the list the server of the page carries where the address says nothing, and nothing at all
 * where neither does, which is a table numbered from 1.
 */
export function markerIds(parameters: URLSearchParams, carried = ""): readonly number[] {
  const asked = parameters.get(MARKER_IDS);
  return parseMarkerIds(asked === null || asked.trim() === "" ? carried : asked);
}

/** One list of ids, as a person writes it, or the reason it is no list of a table. */
export function parseMarkerIds(value: string): readonly number[] {
  if (value.trim() === "") return [];
  const ids = value.split(",").map(part => {
    const asked = part.trim();
    if (!/^\d+$/u.test(asked)) {
      throw new Error(
        `The ids of the markers of the table are whole numbers, like ${EXAMPLE}: `
        + `"${asked}" of "${value}" is none.`);
    }
    return Number.parseInt(asked, 10);
  });
  for (const [index, id] of ids.entries()) {
    if (ids.indexOf(id) !== index) {
      throw new Error(
        `Every object of a table is one marker of it: "${value}" says ${id} twice.`);
    }
  }
  return ids;
}

/** The id this table carries for the object an application calls `marker`. */
export function markerOf(ids: readonly number[], marker: number): number {
  if (ids.length === 0) return marker;
  const id = ids[marker - 1];
  if (id === undefined) {
    throw new Error(
      `This table reads ${marker} objects and the ids of it say ${ids.length} of them `
      + `(${ids.join(", ")}): every object of a table needs the id of its marker.`);
  }
  return id;
}

/** The markers an application reads, as the ids this table carries for them. */
export function markersOn(ids: readonly number[], markers: readonly number[]): readonly number[] {
  return markers.map(marker => markerOf(ids, marker));
}

/** The objects of a table, read from the markers this table carries. */
export function rolesOn(
  ids: readonly number[], roles: readonly TokenRole[],
): readonly TokenRole[] {
  if (ids.length === 0) return roles;
  return roles.map(role => ({...role, markers: markersOn(ids, role.markers)}));
}
