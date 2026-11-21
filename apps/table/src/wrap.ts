/**
 * Lines of a sentence for a card on the body. SVG text does not wrap and the cards are drawn in
 * the scene rather than in HTML, so the words are broken here.
 */

/** A line which has to be cut, with the cut marked. */
function truncate(line: string, columns: number): string {
  if (line.length + 3 <= columns) return `${line}...`;
  return `${line.slice(0, Math.max(0, columns - 3)).trimEnd()}...`;
}

/**
 * The sentence, broken into at most `lines` lines of at most `columns` characters. A word longer
 * than a line stays whole and overhangs rather than being cut, and a sentence which does not fit
 * at all ends in an ellipsis, so a card never grows into the body beside it.
 */
export function wrapText(text: string, columns: number, lines = 3): readonly string[] {
  const words = text.split(/\s+/u).filter(word => word !== "");
  if (words.length === 0) return [];
  const wrapped: string[] = [];
  let current = "";
  let dropped = false;
  for (const word of words) {
    const candidate = current === "" ? word : `${current} ${word}`;
    if (candidate.length <= columns || current === "") {
      current = candidate;
      continue;
    }
    if (wrapped.length + 1 === lines) {
      dropped = true;
      break;
    }
    wrapped.push(current);
    current = word;
  }
  wrapped.push(dropped ? truncate(current, columns) : current);
  return wrapped;
}
