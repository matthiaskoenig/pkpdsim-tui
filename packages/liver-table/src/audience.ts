/** What the liver table says to whoever is standing at it. */

import type {PressureSolution} from "@pkpdsim-tui/cardio-sim";
import {formatNumber} from "@pkpdsim-tui/tui-kit";

export const LIVER_TITLE = "The liver";
export const LIVER_ABOUT = "The liver is the only organ with two blood supplies: oxygen from "
  + "the artery, and everything the gut has absorbed from the portal vein. It sees your food, "
  + "and every drug you take, before the rest of the body does.";
export const LIVER_TRIES: readonly string[] = [
  "Turn the gut object: after a meal its vessels open and more blood arrives.",
  "Turn the liver object up: a scarred liver holds the blood back, and the portal pressure rises.",
];

/** One sentence about what the objects have made of the liver. */
export function liverReading(solution: PressureSolution, reference: PressureSolution): string {
  const share = solution.co === 0 ? 0 : Math.round(100 * solution.qh / solution.co);
  const parts: string[] = [];
  if (solution.qpo > reference.qpo * 1.08) parts.push("the gut is sending more");
  else if (solution.qpo < reference.qpo * 0.92) parts.push("the gut is sending less");
  if (solution.ppo > reference.ppo + 2) parts.push("the blood is backing up in the portal vein");
  const made = parts.length === 0 ? "" : `, where ${parts.join(" and ")}`;
  return `${formatNumber(solution.qh, 2)} litres a minute through the liver${made}: `
    + `${formatNumber(solution.qpo, 2)} from the gut, ${formatNumber(solution.qha, 2)} from the `
    + `artery, ${share}% of everything the heart pumps.`;
}
