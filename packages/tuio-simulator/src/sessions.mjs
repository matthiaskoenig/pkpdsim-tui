/**
 * The session ids of the surface. A TUIO session id is one presence of one object: it is stable
 * while the object is on the surface and is never handed out again once it has left, because a
 * client that saw it leave would otherwise mistake the next object for the old one coming back.
 *
 * The control page names its objects with keys of its own, which it reuses freely over a reload;
 * the mapping from a key to a session id lives here.
 */

/**
 * The allocator of session ids, counting up from `first` and never down.
 *
 * @param {number} [first] the first session id to hand out
 */
export function createSessionIds(first = 1) {
  const assigned = new Map();
  let next = first;

  return {
    /** The session id of a key, allocating one the first time the key is seen. */
    idFor(key) {
      const known = assigned.get(key);
      if (known !== undefined) return known;
      const id = next;
      next += 1;
      assigned.set(key, id);
      return id;
    },

    /** Whether a key is on the surface. */
    has(key) {
      return assigned.has(key);
    },

    /** Drops a key, whose session id is now spent. */
    release(key) {
      assigned.delete(key);
    },

    /** Drops every key that is not in `keys`, which is how a lifted object leaves. */
    retain(keys) {
      const kept = new Set(keys);
      for (const key of [...assigned.keys()]) {
        if (!kept.has(key)) assigned.delete(key);
      }
    },

    /** Drops every key, so that nothing of a disconnected control page survives. */
    clear() {
      assigned.clear();
    },

    /** The keys on the surface and their session ids. */
    entries() {
      return [...assigned.entries()];
    },

    /** How many keys are on the surface. */
    get size() {
      return assigned.size;
    },

    /** The session id the next unknown key will get. */
    get next() {
      return next;
    },
  };
}
