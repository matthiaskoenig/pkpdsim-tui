/**
 * Every sentence the table can say, for the clips which are recorded before it opens.
 *
 * The copy of the application is written down: five tables, the landing page and the words the
 * kit itself uses, each in three languages and at three levels. This script walks all of it and
 * writes what is there to be read aloud, with the name each sentence will have as a file. What
 * turns these into sound is `scripts/speak.py`, which a table only needs once; a table which has
 * no clips reads with the speech of the browser instead.
 *
 *   node scripts/speech.mjs            writes apps/table/public/audio/texts.json
 *   node scripts/speech.mjs --print    the same list, on the terminal
 */

import {mkdir, writeFile} from "node:fs/promises";
import {dirname, join} from "node:path";
import {fileURLToPath} from "node:url";

import {normalizeSpeech, speechKey} from "../packages/tui-kit/src/speech.ts";
import {createVoice, LEVELS, LOCALES} from "../packages/tui-kit/src/voice.ts";
import {words} from "../packages/tui-kit/src/words.ts";
import {HUB_TEXT} from "../apps/table/src/text.ts";
import {entryCopy, TABLES} from "../apps/table/src/tables.ts";
import {CARDIO_TEXT} from "../packages/cardiovascular-table/src/text.ts";
import {GLIMEPIRIDE_TEXT} from "../packages/glimepiride-table/src/text.ts";
import {LIVER_TEXT} from "../packages/liver-table/src/text.ts";
import {LOBE_TEXT} from "../packages/lobes-table/src/text.ts";
import {PERFUSION_TEXT} from "../packages/perfusion-table/src/text.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "apps", "table", "public", "audio", "texts.json");

/** The copy of every table, by the name it is known under. */
const BOOKS = {
  cardiovascular: CARDIO_TEXT, glimepiride: GLIMEPIRIDE_TEXT, liver: LIVER_TEXT,
  lobes: LOBE_TEXT, perfusion: PERFUSION_TEXT,
};

/**
 * What is worth a clip: something a visitor hears as a sentence. A unit, a number and a word of
 * one syllable are read by the browser if they are ever read at all.
 */
function spoken(text) {
  const normalized = normalizeSpeech(text);
  return normalized.length >= 6 && normalized.includes(" ");
}

/** The one of the three texts of a phrase this level is read. */
function atLevel(phrase, level) {
  if (typeof phrase === "string") return phrase;
  return phrase[level] ?? phrase.adult ?? "";
}

/** Everything which is a sentence somewhere in a piece of copy, at this level. */
function walk(value, level, found) {
  if (typeof value === "string") {
    if (spoken(value)) found.add(normalizeSpeech(value));
    return;
  }
  if (Array.isArray(value)) {
    for (const entry of value) walk(entry, level, found);
    return;
  }
  if (typeof value !== "object" || value === null) return;
  // A phrase is the same sentence at three levels, and this visitor hears one of them.
  if (typeof value.adult === "string") {
    walk(atLevel(value, level), level, found);
    return;
  }
  for (const entry of Object.values(value)) walk(entry, level, found);
}

/** What a landing page says when it is asked to read itself: its heading and its invitation. */
function hubSpeech(locale, level) {
  const copy = HUB_TEXT[locale];
  return `${copy.heading}. ${copy.motivation[level].join(" ")}`;
}

export function collect() {
  const texts = {};
  for (const locale of LOCALES) {
    const found = new Set();
    for (const level of LEVELS) {
      const voice = createVoice(locale, level);
      walk(words(voice), level, found);
      walk(HUB_TEXT[locale], level, found);
      for (const book of Object.values(BOOKS)) walk(book[locale], level, found);
      for (const entry of TABLES) walk(entryCopy(voice, entry.id), level, found);
      found.add(normalizeSpeech(hubSpeech(locale, level)));
    }
    texts[locale] = [...found].sort().map(text => ({key: speechKey(text), text}));
  }
  return texts;
}

const texts = collect();
if (process.argv.includes("--print")) {
  for (const [locale, entries] of Object.entries(texts)) {
    for (const entry of entries) console.log(`${locale}\t${entry.key}\t${entry.text}`);
  }
} else {
  await mkdir(dirname(OUT), {recursive: true});
  await writeFile(OUT, `${JSON.stringify(texts, null, 2)}\n`, "utf8");
  const counts = Object.entries(texts)
    .map(([locale, entries]) => `${locale} ${entries.length}`).join(", ");
  console.log(`${OUT}: ${counts}`);
}
