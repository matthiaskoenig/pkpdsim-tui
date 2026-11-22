/**
 * The stars of the quizzes, which are what a visitor takes from one table to the next.
 *
 * A table does not know the others, and the landing page does not know what happened on a
 * table, so the stars live in the one place both of them can reach: the storage of the browser
 * the surface runs in. The best run of a table counts, so a visitor who walks away and comes
 * back keeps what they knew.
 */

/** Where the stars are kept. */
const KEY = "pkpdsim-tui.stars";
/** What a table says when its stars change, which the landing page listens for. */
const EVENT = "pkpdsim-tui:stars";

/** The stars of every table which has been answered, by the id of the table. */
export type Stars = Readonly<Record<string, number>>;

/** Everything which is kept, or nothing if the browser does not keep anything. */
export function readStars(): Stars {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw === null) return {};
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object") return {};
    const stars: Record<string, number> = {};
    for (const [table, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value === "number" && Number.isFinite(value) && value > 0) {
        stars[table] = Math.round(value);
      }
    }
    return stars;
  } catch {
    // A surface in a kiosk may keep nothing at all, and a table works without its stars.
    return {};
  }
}

/** The stars of one table. */
export function starsOf(table: string): number {
  return readStars()[table] ?? 0;
}

/** Keeps the run of a table if it is the best one so far, and says what now stands. */
export function keepStars(table: string, won: number): number {
  const stars = readStars();
  const best = Math.max(stars[table] ?? 0, Math.max(0, Math.round(won)));
  try {
    window.localStorage.setItem(KEY, JSON.stringify({...stars, [table]: best}));
  } catch {
    // Nothing is kept, which is the same as a first visit every time.
  }
  window.dispatchEvent(new CustomEvent(EVENT, {detail: {table, stars: best}}));
  return best;
}

/** Forgets every star, which the landing page offers after a day of visitors. */
export function clearStars(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // Nothing was kept.
  }
  window.dispatchEvent(new CustomEvent(EVENT, {detail: {table: "", stars: 0}}));
}

/** Calls back whenever a table wins a star, and returns the way to stop listening. */
export function watchStars(onChange: () => void): () => void {
  const listener = (): void => onChange();
  window.addEventListener(EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}

/** The stars of a run as one string: what was won, and what was there to win. */
export function starMarks(won: number, of: number): string {
  return "★".repeat(Math.max(0, Math.min(won, of))) + "☆".repeat(Math.max(0, of - won));
}
