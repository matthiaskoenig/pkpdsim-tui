import {describe, expect, it} from "vitest";

import {KIT_TEXT, LOCALES} from "../src/index.ts";

describe("the words of the quiz", () => {
  it("says what it says in every language", () => {
    for (const locale of LOCALES) {
      const copy = KIT_TEXT[locale].quiz;
      for (const word of [copy.title, copy.info, copy.close, copy.next, copy.last, copy.again,
        copy.right, copy.wrong]) {
        expect(word.length, locale).toBeGreaterThan(1);
      }
      expect(copy.score(3, 3), locale).toContain("3");
      expect(copy.score(1, 3), locale).toContain("1");
      // All of them right is said differently from some of them right, because it is.
      expect(copy.score(3, 3)).not.toBe(copy.score(2, 3));
    }
  });
});
