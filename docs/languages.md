# Languages, levels and the voice

The same table in three languages, at three levels, and read aloud for whoever cannot read it. A table in a museum is walked up to by a six year old, by their parent and by a hepatologist, one after the other, and they are not owed the same sentence.

## What a visitor chooses

Two switches carry it, and both are on every page:

- **The language.** English, Deutsch, Español.
- **The level.** Kids, Adults, Experts: *explain it like I am six*, *explain it to an adult who knows nothing about this*, and *tell me what it really is*.

On the landing page they are two rows of pills in the corner, with the button which reads the page aloud above them. In a table they are two switches in the panel, beside the table switch and the body. Both are pressed the way everything on a table is pressed, by resting a finger on them, and both travel in the address:

```
http://localhost:5173/?app=glimepiride&lang=de&level=child
```

A page which is given neither takes the language of the browser when it is one of the three, and the adult level, which is what a visitor who says nothing gets.

## What changes with the level

Not only the words. The level decides how much is said at all:

| | Kids | Adults | Experts |
| --- | --- | --- | --- |
| The title of a dial | *How fast the liver works* | *CYP2C9 activity* | *CYP2C9 activity* |
| What it is | "How quickly the liver takes the tablet apart. Some people are slow at it." | "The activity of CYP2C9, which makes M1 out of glimepiride. Turning it down is a poor metabolizer." | "The enzyme which hydroxylates glimepiride to M1. The detents are the \*1/\*1, \*1/\*2, \*1/\*3, \*2/\*3 and \*3/\*3 genotypes." |
| The numbers of the band | the two or three which answer the question | what a visitor asks next | all six |
| German and Spanish | du, tú | Sie, usted | Sie, usted |

A band of six numbers is not what a six year old came to read, so a number carries the level it appears from and the band is filtered by it (`StatDefinition.from`, `visibleStats`). A table never shows a child something it cannot explain to them.

## Reading it aloud

Every panel, every note and the landing page carry a **play button**. Pressing it reads the text: for a panel, what this table is, what it says about the objects on it right now, and the things worth trying; for a note, the sentence behind the element a finger rested on. Pressing it again stops.

What is read comes from two places:

- **A recorded clip**, where there is one. The whole copy of the application is written down before anybody walks up to the table, so almost everything it says can be recorded in a good voice, in the language it belongs to, and it sounds the same at every table.
- **The speech of the browser** for everything else: a reading like *2.5 times as much of the drug in the blood* is built out of the numbers of the moment and was never a sentence anybody could record.

A table which was never given its clips still reads everything aloud. The clips are what makes it pleasant.

### Record the clips

```bash
node scripts/speech.mjs            # every sentence of every language and level
uv run python scripts/speak.py     # one clip per sentence
```

`scripts/speech.mjs` walks the copy of the five tables, the landing page and the kit, resolves every phrase at every level, and writes `apps/table/public/audio/texts.json`: the sentence and the name its clip will have, which is a hash of the sentence itself. `scripts/speak.py` records them into `apps/table/public/audio/<locale>/` with a manifest the application looks a sentence up in. Both are idempotent: a clip which is there is kept unless `--force` says otherwise, so a changed sentence costs one clip and not an afternoon.

| Engine | What it needs | What it sounds like |
| --- | --- | --- |
| `--engine piper` (the default) | `uv pip install piper-tts`, and the voice of each language is downloaded once into `.cache/piper` | a neural voice, which is what a table should have |
| `--engine espeak` | `espeak-ng` of the system | 1990 |
| `--engine flite` | nothing: the voice is inside `ffmpeg` where it was built with libflite | 1996, and English only, which is how the clips are tried out |

`ffmpeg`, where it is installed, packs the clips into Ogg Opus: a twentieth of the size of the WAV, and what every browser of a table plays. The clips are an asset like the models and are not in the repository; a fresh clone records them again, or runs without them.

!!! note "A browser holds sound back until it has been touched"
    Chrome refuses to play a sound on a page nobody has interacted with. At a table, where a finger resting on the button is a synthetic click rather than a gesture of the browser, start it with `--autoplay-policy=no-user-gesture-required`, as [Run on a table](table.md) does. Without it the first press of the day falls back to the speech of the browser.

## Where the words are

One module per package holds all three languages side by side, so a sentence and its translations are read and changed together:

| File | What it says |
| --- | --- |
| `packages/tui-kit/src/words.ts` | what every table says: the way back, the switches, the hints, the names of the organs |
| `apps/table/src/text.ts` | the landing page, and what each of the five tables is called on it |
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
3. Add the new key to every `Record<Locale, …>`: the kit, the landing page and the five tables. The type checker lists them for you, and a missing one is an error and not a silent English fallback.
4. Record its clips, and give the language a voice in `PIPER_VOICES` of `scripts/speak.py`.

The tests of each table walk every locale and every level and insist that every number and every object has a name and a sentence, so a half translated table fails before it is opened.
