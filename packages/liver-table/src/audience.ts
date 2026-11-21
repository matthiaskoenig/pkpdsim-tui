/** What the liver table says to whoever is standing at it, in their language. */

import type {PressureSolution} from "@pkpdsim-tui/cardio-sim";
import {formatNumber} from "@pkpdsim-tui/tui-kit";
import type {Voice} from "@pkpdsim-tui/tui-kit";
import {LIVER_TEXT} from "./text.ts";

/** One sentence about what the objects have made of the liver. */
export function liverReading(
  voice: Voice, solution: PressureSolution, reference: PressureSolution,
): string {
  const copy = voice.pick(LIVER_TEXT);
  return copy.reading({
    qh: formatNumber(solution.qh, 2),
    qpo: formatNumber(solution.qpo, 2),
    qha: formatNumber(solution.qha, 2),
    share: solution.co === 0 ? 0 : Math.round(100 * solution.qh / solution.co),
    gut: solution.qpo > reference.qpo * 1.08
      ? "more"
      : solution.qpo < reference.qpo * 0.92 ? "less" : "same",
    backing: solution.ppo > reference.ppo + 2,
  });
}
