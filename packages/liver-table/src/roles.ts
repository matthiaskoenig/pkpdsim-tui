/**
 * The two objects of the liver table. Both are resistances of the steady pressure network of the
 * cardiovascular model, which is what makes the two supplies of the liver move: the gut sends
 * more blood when its vessels open after a meal, and a stiff liver holds the blood back.
 */

import type {TokenRole} from "@pkpdsim-tui/tuio-input";

export const LIVER_ROLES: readonly TokenRole[] = [
  {
    id: "portal", label: "The gut", unit: "x", markers: [1],
    description: "How open the vessels of the gut and of the portal vein are. After a meal they "
      + "open and the gut sends more blood to the liver; turning the object up closes them.",
    min: 0.4, max: 6, reference: 1, mode: "absolute", scale: "log", turns: 1,
  },
  {
    id: "hepatic", label: "The liver", unit: "x", markers: [2],
    description: "How easily the blood gets through the liver itself. A scarred, cirrhotic liver "
      + "resists it, the blood backs up in the portal vein and the pressure there rises.",
    min: 0.5, max: 8, reference: 1, mode: "absolute", scale: "log", turns: 1,
  },
];
