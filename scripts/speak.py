"""Record every sentence of the table, so that a visitor who presses play hears a voice.

The text of the application is known before anybody walks up to the table: `node
scripts/speech.mjs` writes it to `apps/table/public/audio/texts.json`, and this script turns it
into one clip per sentence, with a manifest the application looks a sentence up in. A table
which has no clips still reads everything aloud with the speech of the browser, which is what a
developer sees; the clips are what makes the table sound the same wherever it stands, and they
are the only way the voice of a language is not the voice the browser happens to carry.

The clips are an asset like the models: they are not in the repository, and a fresh clone makes
them again.

    node scripts/speech.mjs                       the sentences, first
    uv run python scripts/speak.py                every language, with piper
    uv run python scripts/speak.py --locale de    one language
    uv run python scripts/speak.py --engine espeak

Engines:

* `piper` (the default), a neural voice which runs offline: `uv tool install piper-tts
  --python 3.12`, which puts a `piper` on the path. The voice of each language is downloaded
  once into `.cache/piper`, the first time it is asked for.
* `espeak`, the `espeak-ng` of the system: no download and no model, but it sounds like 1990.
* `flite`, the voice inside `ffmpeg` where it was built with libflite: nothing to install at all,
  which is how the clips are tried out, but it speaks English only.

`ffmpeg`, where it is installed, packs the clips into Ogg Opus, which is a twentieth of the
size of the WAV and what every browser of a table plays.
"""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
AUDIO = ROOT / "apps" / "table" / "public" / "audio"
TEXTS = AUDIO / "texts.json"
CACHE = ROOT / ".cache" / "piper"

#: The voice of each language. A piper voice is `<language>-<name>-<quality>`.
PIPER_VOICES = {
    "en": "en_GB-alba-medium",
    "de": "de_DE-thorsten-medium",
    "es": "es_ES-davefx-medium",
}

#: What espeak-ng calls each language.
ESPEAK_VOICES = {"en": "en-gb", "de": "de", "es": "es"}

#: The voices libflite carries, which are English and nothing else.
FLITE_VOICES = {"en": "slt"}


@dataclass(frozen=True)
class Sentence:
    """One thing the table says, and the name of the file which says it."""

    key: str
    text: str


def read_texts(locales: list[str]) -> dict[str, list[Sentence]]:
    """The sentences of each language, as `scripts/speech.mjs` wrote them down."""
    if not TEXTS.exists():
        raise SystemExit(
            f"{TEXTS} is missing. Write it first with `node scripts/speech.mjs`."
        )
    raw = json.loads(TEXTS.read_text(encoding="utf-8"))
    found = {
        locale: [Sentence(entry["key"], entry["text"]) for entry in entries]
        for locale, entries in raw.items()
        if not locales or locale in locales
    }
    if not found:
        raise SystemExit(f"None of {', '.join(locales)} is in {TEXTS}.")
    return found


def piper_python() -> str:
    """
    The interpreter piper lives in: the one beside the `piper` of the path, which is where a
    tool installation puts it, and otherwise the one which runs this script.
    """
    found = shutil.which("piper")
    if found is not None:
        beside = Path(found).resolve().with_name("python")
        if beside.exists():
            return str(beside)
    return sys.executable


def piper_voice(voice: str) -> None:
    """The model of a language, downloaded into the cache the first time it is asked for."""
    CACHE.mkdir(parents=True, exist_ok=True)
    if (CACHE / f"{voice}.onnx").exists():
        return
    print(f"The voice {voice}, into {CACHE}. This is downloaded once.", file=sys.stderr)
    subprocess.run(
        [piper_python(), "-m", "piper.download_voices", voice, "--data-dir", str(CACHE)],
        check=True)


def piper_speak(voice: str, text: str, out: Path) -> None:
    """One sentence, in the neural voice of this language."""
    piper_voice(voice)
    command = [
        piper_python(), "-m", "piper",
        "--model", voice,
        "--data-dir", str(CACHE),
        "--output-file", str(out),
    ]
    subprocess.run(command, input=text, text=True, check=True, capture_output=True)


def espeak_speak(voice: str, text: str, out: Path) -> None:
    """One sentence, in the voice every machine already has."""
    subprocess.run(
        ["espeak-ng", "-v", voice, "-s", "150", "-w", str(out), text],
        check=True, capture_output=True,
    )


def flite_speak(voice: str, text: str, out: Path) -> None:
    """One sentence, in the voice ffmpeg carries. The text goes through a file: a filter graph
    is a string of colons and commas, and a sentence is full of both."""
    script = out.with_suffix(".txt")
    script.write_text(text, encoding="utf-8")
    try:
        subprocess.run(
            ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
             "-f", "lavfi", "-i", f"flite=textfile={script}:voice={voice}",
             "-ar", "22050", "-ac", "1", str(out)],
            check=True, capture_output=True,
        )
    finally:
        script.unlink(missing_ok=True)


def encode(wav: Path, out: Path) -> None:
    """The clip, packed small enough to be loaded at a table over a wire."""
    subprocess.run(
        ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(wav),
         "-c:a", "libopus", "-b:a", "32k", "-ac", "1", str(out)],
        check=True,
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--engine", choices=["piper", "espeak", "flite"], default="piper")
    parser.add_argument(
        "--locale", action="append", default=[],
        help="only this language, repeatable; every language by default",
    )
    parser.add_argument(
        "--format", choices=["ogg", "wav"], default="ogg",
        help="ogg needs ffmpeg and is a twentieth of the size",
    )
    parser.add_argument(
        "--force", action="store_true", help="record the clips which are already there again",
    )
    arguments = parser.parse_args()

    if arguments.engine == "espeak" and shutil.which("espeak-ng") is None:
        raise SystemExit("espeak-ng is not installed. Install it, or use --engine piper.")
    if arguments.engine == "flite" and shutil.which("ffmpeg") is None:
        raise SystemExit("ffmpeg is not installed, and the flite voice lives inside it.")
    pack = arguments.format == "ogg"
    if pack and shutil.which("ffmpeg") is None:
        print("ffmpeg is not installed, so the clips stay WAV.", file=sys.stderr)
        pack = False
    suffix = ".ogg" if pack else ".wav"

    for locale, sentences in read_texts(arguments.locale).items():
        voices = {
            "piper": PIPER_VOICES, "espeak": ESPEAK_VOICES, "flite": FLITE_VOICES,
        }[arguments.engine]
        voice = voices.get(locale)
        if voice is None:
            print(f"{locale}: no voice for this language, skipped.", file=sys.stderr)
            continue
        folder = AUDIO / locale
        folder.mkdir(parents=True, exist_ok=True)
        clips: dict[str, str] = {}
        written = 0
        for index, sentence in enumerate(sentences, start=1):
            clip = folder / f"{sentence.key}{suffix}"
            clips[sentence.key] = f"{locale}/{clip.name}"
            if clip.exists() and not arguments.force:
                continue
            wav = folder / f"{sentence.key}.wav"
            if arguments.engine == "piper":
                piper_speak(voice, sentence.text, wav)
            elif arguments.engine == "espeak":
                espeak_speak(voice, sentence.text, wav)
            else:
                flite_speak(voice, sentence.text, wav)
            if pack:
                encode(wav, clip)
                wav.unlink()
            written += 1
            if index % 25 == 0 or index == len(sentences):
                print(f"{locale}: {index}/{len(sentences)}", flush=True)
        manifest = {"voice": voice, "engine": arguments.engine, "clips": clips}
        (folder / "manifest.json").write_text(
            json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8",
        )
        print(f"{locale}: {len(clips)} clips, {written} recorded, {folder}")


if __name__ == "__main__":
    main()
