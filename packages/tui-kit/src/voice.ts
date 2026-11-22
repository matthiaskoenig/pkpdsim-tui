/**
 * Who the table is talking to, and in which language. A table in a museum is read by a child, by
 * an adult who has never heard of a portal vein, and by a clinician who wants the mechanism, in
 * whatever language the visitor brought with them. Both are one switch each in the panel, and
 * both are in the address of the page, so a table is also handed over as a link.
 *
 * A phrase is one string when it says the same thing to everybody, and three when it does not.
 * The level is a fallback chain and never a hole: a phrase which says nothing of its own to a
 * child or to an expert says what it says to an adult.
 */

export const LOCALES = ["en", "de", "es"] as const;
export type Locale = (typeof LOCALES)[number];

export const LEVELS = ["child", "adult", "expert"] as const;
/** How much a visitor wants: a six year old, an adult who knows nothing, somebody of the field. */
export type Level = (typeof LEVELS)[number];

/** What a phrase says to each of the three, where only the adult is required. */
export interface PhraseLevels {
  readonly child?: string;
  readonly adult: string;
  readonly expert?: string;
}

/** Something the table says: one string, or one per level. */
export type Phrase = string | PhraseLevels;

/** What `name` the switch of the language carries, and what the visitor calls their own. */
/**
 * The languages, in the order they are offered: the one of the room first, then the one of the
 * visitors who do not speak it, then Spanish. `languageOptions` reads this order, so the
 * welcome screen and the settings menu offer them the same way round.
 */
export const LOCALE_NAMES: Readonly<Record<Locale, string>> = {
  de: "Deutsch", en: "English", es: "Español",
};

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

export function isLevel(value: string): value is Level {
  return (LEVELS as readonly string[]).includes(value);
}

/** Says a phrase to one of the three. */
export function say(phrase: Phrase, level: Level): string {
  if (typeof phrase === "string") return phrase;
  if (level === "child") return phrase.child ?? phrase.adult;
  if (level === "expert") return phrase.expert ?? phrase.adult;
  return phrase.adult;
}

/** The language and the level of the person at the table, and what follows from them. */
export interface Voice {
  readonly locale: Locale;
  readonly level: Level;
  /** Says a phrase at the level of this voice. */
  say(phrase: Phrase): string;
  /** Picks what a bundle holds for this language. */
  pick<T>(bundle: Readonly<Record<Locale, T>>): T;
  /** True while the table is talking to a child, which also changes how much it shows. */
  readonly child: boolean;
  /** True while it is talking to somebody of the field. */
  readonly expert: boolean;
}

export function createVoice(locale: Locale, level: Level): Voice {
  return {
    locale, level,
    say: phrase => say(phrase, level),
    pick: bundle => bundle[locale],
    child: level === "child",
    expert: level === "expert",
  };
}

/** What a table opens on when nothing says otherwise: the youngest visitor, in German. */
const DEFAULT_LOCALE: Locale = "de";
const DEFAULT_LEVEL: Level = "child";

/**
 * The voice of a page: `?lang` and `?level`, which every link of the application carries along.
 *
 * A table in a room opens on the language of that room and on the simplest words it has, and a
 * visitor changes both in two presses, so the first thing anybody meets is a sentence a child
 * can read. The language of the browser is asked for with `?lang=auto`, which is for a page
 * somebody opened on their own machine rather than for the table in the room: a kiosk browser
 * reports whatever it was installed as, which is nothing about the people in front of it.
 */
export function voiceOf(parameters: URLSearchParams, languages: readonly string[] = []): Voice {
  const asked = parameters.get("lang") ?? "";
  const level = parameters.get("level") ?? "";
  const preferred = languages.map(tag => tag.slice(0, 2).toLowerCase()).find(isLocale);
  const locale = isLocale(asked)
    ? asked
    : asked === "auto" ? preferred ?? DEFAULT_LOCALE : DEFAULT_LOCALE;
  return createVoice(locale, isLevel(level) ? level : DEFAULT_LEVEL);
}

/** The levels a table tells `level` apart by, from the fewest words to the most. */
export function levelRank(level: Level): number {
  return LEVELS.indexOf(level);
}

/** Whether something which is only for `from` upwards is shown to this voice. */
export function shows(voice: Voice, from: Level | undefined): boolean {
  return from === undefined || levelRank(voice.level) >= levelRank(from);
}
