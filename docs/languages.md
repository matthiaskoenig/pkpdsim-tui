# Languages and the voice

The same table in three languages, English, German and Spanish, and at three levels, for a child, for an adult who knows nothing about the subject, and for somebody who wants the mechanism. What a visitor chooses, and what the level changes, is in [The applications](apps/index.md#the-language-and-the-level); this page is how the words and the clips are made.

## Reading it aloud

A speaker stands beside the sentence of the panel, inside every note, beside the sidebar of the landing page and beside the questions of the first screen. It reads in the language of the visitor, marks itself while it is reading, and stops when it is pressed again.

What it reads comes from two places. A **recorded clip** where there is one: the whole copy is written down before anybody walks up to the table, so almost everything can be recorded in a good voice and sounds the same at every table. All three languages get the same kind of voice, a friendly and confident woman: `en_GB-cori-high`, `de_DE-kerstin-medium` and `es_MX-claude-high` in `PIPER_VOICES` of `scripts/speak.py`. The **speech of the browser** for everything else: a reading like *2.5 times as much of the drug in the blood* is built out of the numbers of the moment and was never a sentence anybody could record.

A table that was never given its clips still reads everything aloud. The clips are what makes it pleasant.

### Record the clips

```bash
node scripts/speech.mjs            # every sentence of every language and level
uv run python scripts/speak.py     # one clip per sentence
```

`scripts/speech.mjs` walks the copy of the four tables, the landing page and the kit, resolves every phrase at every level, and writes `apps/table/public/audio/texts.json`: each sentence and the name of its clip, which is a hash of the sentence. `scripts/speak.py` records them into `apps/table/public/audio/<locale>/` with a manifest. Both are idempotent, so a changed sentence costs one clip and not an afternoon.

| Engine | What it needs | What it sounds like |
| --- | --- | --- |
| `--engine piper` (the default) | `uv pip install piper-tts`, and the voice of each language is downloaded once into `.cache/piper` | a neural voice, which is what a table should have |
| `--engine espeak` | `espeak-ng` of the system | 1990 |
| `--engine flite` | nothing: the voice is inside `ffmpeg` where it was built with libflite | 1996, and English only, which is how the clips are tried out |

`ffmpeg`, where it is installed, packs the clips into Ogg Opus: a twentieth of the size of the WAV, and what every browser of a table plays. The clips are an asset like the models: they are not in the repository but travel with a release, which the install takes, so a fresh clone has the voice without recording anything. Recording is for the sentences which changed.

!!! note "A browser holds sound back until it has been touched"
    Chrome refuses to play a sound on a page nobody has interacted with. At a table, where a finger resting on the button is a synthetic click rather than a gesture of the browser, start it with `--autoplay-policy=no-user-gesture-required`, as [Run on a table](table.md) does. Without it the first press of the day falls back to the speech of the browser.

## Where the words are

One module per package holds all three languages side by side, so a sentence and its translations change together:

| File | What it says |
| --- | --- |
| `packages/tui-kit/src/words.ts` | what every table says: the way back, the switches, the hints, the names of the organs |
| `apps/table/src/text.ts` | the landing page, and what each of the four tables is called on it |
| `packages/<table>-table/src/text.ts` | one table: its about, its things to try, its numbers, its objects, the labels of its scene and the sentence under its title |

A `Phrase` is either one string, which is the same at every level, or the three variants:

```ts
const copy = {
  label: {child: "The tablet", adult: "Dose"},
  info: {
    child: "How big the tablet is that this person swallows.",
    adult: "The tablet the individual takes.",
    expert: "The oral dose of glimepiride, from 1 to 8 mg, the licensed range.",
  },
};
```

`voice.say(phrase)` picks the one of this visitor and falls back to the adult text, so a phrase which has nothing to add for a child or an expert carries one sentence and is done.

### Add a language

1. Add the locale to `LOCALES` in `packages/tui-kit/src/voice.ts` and the language it is spoken in to `SPOKEN` in `speech.ts`.
2. Add its name to `languageOptions()` in `words.ts`.
3. Add the new key to every `Record<Locale, …>`: the kit, the landing page and the four tables. The type checker lists them for you, and a missing one is an error and not a silent English fallback.
4. Record its clips, and give the language a voice in `PIPER_VOICES` of `scripts/speak.py`.

The tests of each table walk every locale and every level and insist that every number and every object has a name and a sentence, so a half translated table fails before it is opened.
