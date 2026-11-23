/** Loading the exported data of a pkpdsim checkout from the assets of an application. */

import {assetJson} from "@pkpdsim-tui/core-runtime";
import {parseAnatomy, parseCardiovascularData} from "./parse.ts";
import type {Anatomy, CardiovascularData} from "./types.ts";

export async function loadCardiovascularData(url: string | URL): Promise<CardiovascularData> {
  return parseCardiovascularData(await assetJson(url));
}

export async function loadAnatomy(url: string | URL): Promise<Anatomy> {
  return parseAnatomy(await assetJson(url));
}
