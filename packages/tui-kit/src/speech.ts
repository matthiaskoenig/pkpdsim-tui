/**
 * Reading the table aloud. A visitor who cannot read yet, or cannot read this language, presses
 * the play button and hears what the panel says.
 *
 * What is read is the text of the application, which is known before anybody walks up to the
 * table: `npm run speech` writes a clip for every sentence of every language and level into
 * `audio/<locale>/`, with a manifest which names them by the text they say. A sentence which
 * has a clip is played; anything else, a reading which was built from numbers for instance, is
 * read by the speech of the browser. The table therefore sounds the same wherever it stands,
 * and still says everything on a machine which was never given the clips.
 */

import type {Locale, Voice} from "./voice.ts";

/** The language each locale is read in, as a browser names a voice. */
const SPOKEN: Record<Locale, string> = {en: "en-GB", de: "de-DE", es: "es-ES"};

/** How fast it is read. A child is read to a little more slowly. */
const RATE = {child: 0.86, adult: 0.98, expert: 1};

/** The same text twice is the same clip: one space between words, nothing around them. */
export function normalizeSpeech(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * The name of the clip of a sentence: the FNV-1a hash of the text, which `scripts/speech.mjs`
 * computes the same way. A hash and not the sentence itself, because a sentence is a paragraph
 * and a file name is not.
 */
export function speechKey(text: string): string {
  let hash = 0x811c9dc5;
  const normalized = normalizeSpeech(text);
  for (let at = 0; at < normalized.length; at += 1) {
    hash ^= normalized.codePointAt(at) ?? 0;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

export interface Speech {
  /**
   * Reads the text aloud, or stops if that same text is already being read. Several sentences
   * are read one after the other, and each one is looked for among the clips on its own: what
   * a table says about itself was recorded, what it says about the objects on it right now was
   * not, and both are read in the same breath.
   */
  toggle(text: string | readonly string[]): void;
  stop(): void;
  speaking(): boolean;
  /** Called whenever it starts or stops, so a button can show what it is doing. */
  listen(listener: () => void): void;
}

interface Manifest {
  readonly clips?: Readonly<Record<string, string>>;
}

/** One reader per language, because the panel, the notes and the landing page share it. */
const readers = new Map<string, Speech>();

function createSpeech(voice: Voice, base: URL): Speech {
  const clips = new Map<string, string>();
  const listeners: (() => void)[] = [];
  let audio: HTMLAudioElement | null = null;
  /** What is being read, as one text, so that pressing the button again stops it. */
  let saying = "";
  /** What is left of it, sentence by sentence. */
  let queue: string[] = [];

  // The clips are written before the table is opened, and a table which has none still speaks.
  void fetch(new URL(`${voice.locale}/manifest.json`, base))
    .then(response => (response.ok ? response.json() as Promise<Manifest> : null))
    .then(manifest => {
      for (const [key, file] of Object.entries(manifest?.clips ?? {})) clips.set(key, file);
    })
    .catch(() => undefined);

  const changed = (): void => {
    for (const listener of listeners) listener();
  };

  const stop = (): void => {
    const was = saying;
    saying = "";
    queue = [];
    if (audio !== null) {
      audio.pause();
      audio = null;
    }
    window.speechSynthesis?.cancel();
    if (was !== "") changed();
  };

  /** The voice of the browser which speaks this language, when it has one. */
  const browserVoice = (): SpeechSynthesisVoice | undefined => {
    const wanted = SPOKEN[voice.locale];
    const all = window.speechSynthesis?.getVoices() ?? [];
    return all.find(candidate => candidate.lang.replace("_", "-") === wanted)
      ?? all.find(candidate => candidate.lang.slice(0, 2) === voice.locale);
  };

  /** A sentence which has no clip, in the voice of the browser. */
  const readAloud = (sentence: string): void => {
    if (window.speechSynthesis === undefined) {
      next();
      return;
    }
    const utterance = new SpeechSynthesisUtterance(sentence);
    utterance.lang = SPOKEN[voice.locale];
    utterance.rate = RATE[voice.level];
    const chosen = browserVoice();
    if (chosen !== undefined) utterance.voice = chosen;
    utterance.addEventListener("end", () => next());
    utterance.addEventListener("error", () => next());
    window.speechSynthesis.speak(utterance);
  };

  /** Reads the next sentence, and stops when there is none left. */
  const next = (): void => {
    const sentence = queue.shift();
    if (sentence === undefined) {
      stop();
      return;
    }
    const clip = clips.get(speechKey(sentence));
    if (clip === undefined) {
      readAloud(sentence);
      return;
    }
    const playing = new Audio(new URL(clip, base).href);
    audio = playing;
    playing.addEventListener("ended", () => next());
    // A clip which cannot be played, because the browser is holding sound back until somebody
    // has touched the page, is still said: the browser reads it instead.
    playing.addEventListener("error", () => readAloud(sentence));
    void playing.play().catch(() => {
      if (audio === playing) readAloud(sentence);
    });
  };

  return {
    toggle(text: string | readonly string[]): void {
      const sentences = (typeof text === "string" ? [text] : text)
        .map(normalizeSpeech).filter(sentence => sentence !== "");
      const whole = sentences.join(" ");
      if (whole === "") return;
      if (saying === whole) {
        stop();
        return;
      }
      stop();
      saying = whole;
      queue = [...sentences];
      changed();
      next();
    },
    stop,
    speaking(): boolean {
      return saying !== "";
    },
    listen(listener: () => void): void {
      listeners.push(listener);
    },
  };
}

/**
 * The reader of this language. The panel, the notes and the landing page all ask for it, and
 * they all get the same one, so that pressing play in one place stops what another started.
 */
export function speechFor(voice: Voice): Speech {
  const existing = readers.get(voice.locale);
  if (existing !== undefined) return existing;
  const base = new URL("audio/", document.baseURI);
  const reader = createSpeech(voice, base);
  readers.set(voice.locale, reader);
  return reader;
}
