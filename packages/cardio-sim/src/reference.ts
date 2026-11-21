/** Loading the exported data of a pkpdsim checkout from the assets of an application. */

import {parseAnatomy, parseCardiovascularData} from "./parse.ts";
import type {Anatomy, CardiovascularData} from "./types.ts";

async function loadJson(url: string | URL): Promise<unknown> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Could not load ${String(url)}: HTTP ${response.status}. Run "npm run sync".`);
  }
  return response.json();
}

export async function loadCardiovascularData(url: string | URL): Promise<CardiovascularData> {
  return parseCardiovascularData(await loadJson(url));
}

export async function loadAnatomy(url: string | URL): Promise<Anatomy> {
  return parseAnatomy(await loadJson(url));
}
