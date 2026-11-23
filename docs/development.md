# Development

## The layout

| Path | What is in it |
| --- | --- |
| `packages/tuio-input` | TUIO 2.0 and the mouse behind one `TableInput` interface, and the role, angle and target vocabulary |
| `packages/tui-kit` | What every application shares: the surface, the dials, pictures and cards of the objects, the band of numbers, the panel in the corner, the notes behind the elements and the course below the scene |
| `packages/core-runtime` | A compiled SBML model on the sbmlsim-core WebAssembly runtime, solved with SUNDIALS IDA in a Web Worker |
| `packages/cardio-sim` | The steady pressure network of the cardiovascular model and the loaders of the exported data |
| `packages/lobes-sim` | The lobed liver: the states of a segment, the parameters they change and the request that solves them |
| `packages/glimepiride-sim` | The glimepiride individual, the request that solves them and the pharmacokinetics of the result |
| `packages/perfusion-sim` | The machine perfusion: the settings of the machine, the parameters they are, and the request that solves six hours of it |
| `packages/tuio-simulator` | The TUIO simulator: a control page and the tracker that serves it, on plain `node`, in either version of the protocol and over either transport |
| `packages/cardiovascular-table` | The cardiovascular table: its scene, its objects, its cards and what it says about itself |
| `packages/lobes-table` | The lobed liver table |
| `packages/glimepiride-table` | The glimepiride table |
| `packages/perfusion-table` | The machine perfusion table |
| `apps/table` | The one application: the body, the tables behind it, the assets of each of them, and the development server that carries the simulator |
| `scripts/table.mjs` | The table: serves the application and carries the tracker it listens to at `/tuio` |
| `scripts/dev.mjs` | Starts one of each app, the table pointed at the tracker of the simulator |
| `scripts/assets.mjs` | Takes the resources of a release, the compiled models and the clips the table reads aloud, and packs them for the next one |
| `scripts/sync-assets.mjs` | Copies the exported runtime, model and reference data of a pkpdsim checkout into `apps/table/public/assets/<table>` |
| `scripts/export_model.py` | Compiles an SBML model that comes from its own repository into the WebAssembly an application runs |
| `scripts/speech.mjs` | Collects every sentence of the copy, in three languages and at three levels, for the clips the table reads aloud |
| `scripts/speak.py` | Records those sentences into `apps/table/public/audio/<locale>/` |
| `scripts/qr.mjs` | Writes `apps/table/src/qr.ts`, the QR code of the laboratory in the footer of the landing page, as one SVG path |
| `docs/` | This site |

The repository is an npm workspace. The packages ship TypeScript source and are consumed as source, so there is one type check and one build for the whole tree. There is one application: `apps/table` is the page, and a table of `packages/*-table` is a module it loads when `?app` names it, with the assets of that table under `assets/<table>/`. A table is left by opening another one, which reloads the page, so no table has to take itself down and a worker, a solver and a socket go with the page they belong to.

## Commands

```bash
npm install           # and the resources of the release: the models and the voice
npm run assets        # the same, for a checkout which was not on the network at install
npm run assets:check  # whether every one of them is where a page looks for it
npm run assets:pack   # packs the ones of this checkout into the archives of a release
npm run table         # the table alone, with the tracker and the pucks of this exhibition
npm run simulator     # the simulator alone: a tracker on 3333, its control page on 3344
npm run dev           # one of each: the table on 5173, the simulator on 3344
npm run dev:app       # the table alone and on no tracker, which is the mouse
npm run dev:cardiovascular  # the same as npm run dev, and prints the address of that table
npm run preview       # the built table, served the same way
npm run speech:texts  # every sentence the table can say, for the clips
npm run speech        # the same, and records the clips with scripts/speak.py
npm test              # vitest
npm run typecheck     # tsc
npm run build         # the production bundle
npm run docs          # this site, served
npm run docs:build    # this site, strict
```

Nothing of a table is missing from that list: the models and the clips arrive with the release, and the commands which write them from a pkpdsim checkout are in [The resources of a release](#the-resources-of-a-release), which is for whoever cuts the next one.

Every one of them runs on Linux, on macOS and on Windows: a command of a package is started as the script it is, with the `node` which is running, and never through a shim of `node_modules/.bin`, which is no program under its plain name on Windows and was issue #21. The same holds for what is written in `package.json`, where nothing asks a shell to expand it, and `test/scripts.test.ts` and `test/bin.test.ts` keep both of those true.

### The resources of a release

A table needs 68 MB which is not in the repository: the compiled models of the four tables with their reference data, under `apps/table/public/assets/`, and the clips the tables read aloud, 2253 of them in three languages, under `apps/table/public/audio/`. None of it is source. A model is written by pkpdsim and compiled to WebAssembly, the clips are recorded from the copy, and both are written again whenever either changes, so a repository which carried them would grow by all of it at every release.

They travel with a release instead, as two archives of the tag:

| Archive | What is in it | Packed |
| --- | --- | --- |
| `pkpdsim-tui-models-<version>.tar.gz` | `assets/`: the compiled models of the four tables, their runtimes and their reference data | 4 MB |
| `pkpdsim-tui-voice-<version>.tar.gz` | `audio/`: the clips of the three languages and the texts they were recorded from | 49 MB |

Each has a `.sha256` beside it, which is checked before anything is unpacked. `scripts/assets.mjs` is both halves of this:

```bash
npm run assets                      # both archives of the release this checkout is
npm run assets -- --no-voice        # the models alone, which is 4 MB of the 53
npm run assets -- --version 0.2.0   # the archives of another release
npm run assets -- --url http://localhost:3390   # a release which is not on GitHub yet
npm run assets:check                # what is missing, and nothing else
npm run assets:pack                 # the archives of this checkout, for the next release
```

The archives are packed and unpacked with `tar`, which Linux, macOS and Windows 10 and later all carry, and nothing else is needed to take them.

`npm install` runs it as `--if-missing`: a clone takes the resources of its version once and says so, a checkout which has them says nothing, and one which cannot reach the release says what to run rather than failing the install. The checks of the repository need none of it, so an install with `CI` in its environment takes nothing.

So a table is a clone, an install and `npm run table`. A checkout which writes the models itself needs a pkpdsim beside it, and that is what the rest of this section is about.

`npm run sync` reads the checkout named by `--pkpdsim`, then by the environment variable `PKPDSIM_DIR`, then the sibling directory `../pkpdsim`. What it copies is gitignored, so a clone stays small, and `--list` prints what each application needs.

A model that is not exported by pkpdsim is compiled here instead. `scripts/export_model.py` takes an SBML file and writes the compiled model, its description and the browser runtime beside it, with the release of sbmlsim-core of the `dev` extra; `npm run export:glimepiride` is that command for the glimepiride model, which it expects in a `glimepiride-model` checkout beside this one; a model somewhere else is given as `npm run export:glimepiride -- --sbml <path>`, which every shell reads the same way. The script knows nothing about a model, so the next one is another line in `package.json`.

The model of the [machine perfusion table](apps/perfusion.md) is built from the perfusion library of pkpdsim, in a pkpdsim checkout, and then compiled here. The definition is the one of its documentation, a rat liver with four zones in a normothermic circuit:

```python
# not executed
from pathlib import Path

from pkpdsim.pbpk.values import Value
from pkpdsim.perfusion import (
    Circuit, CoreParameters, LiverOrgan, Perfusate, PerfusionDefinition, build,
)
from pkpdsim.perfusion.units import PU
from pkpdsim.species import Species

definition = PerfusionDefinition(
    sid="rat_liver_nmp",
    name="rat liver in a normothermic machine perfusion",
    species=Species.RAT,
    organ=LiverOrgan.default(zones=4),
    circuit=Circuit.default(),
    perfusate=Perfusate.default(),
    temperature=Value(37.0, PU.degC, "ModelChoice", "a normothermic perfusion"),
    core=CoreParameters.default(),
)
assert definition.validate() == []
flat = build(definition, Path("models"))  # models/rat_liver_nmp_flat.xml
```

```bash
npm run export:perfusion -- --sbml ../pkpdsim/models/rat_liver_nmp_flat.xml
```

`node scripts/qr.mjs` regenerates the QR code of the landing page footer. It is generated once and committed as a module of paths, so the page carries no QR library and works with no network; `node scripts/qr.mjs --print` draws it in the terminal to check it, and the address it encodes is `LAB_URL` at the top of the script.

`npm run speech` writes the clips a table reads aloud. `scripts/speech.mjs` imports the copy modules straight into `node`, which reads TypeScript of its own, so there is one copy of the text and no build step between it and the clips. [Languages and the voice](languages.md) covers the engines and what is recorded.

A table is developed against the [simulator](simulator.md) of `packages/tuio-simulator`, which is a tracker like the table is. `npm run dev` starts one of each app: the simulator, which is the tracker on 3333 and the surface which drives it on 3344, and the table on 5173, pointed at that tracker and carrying it at `/tuio` so that no address of a page names a machine. A table on another machine is then the port of the table, `ssh -L 5173:localhost:5173 <machine>`, and the surface beside it is the port of the simulator.

### The two apps and their flags

The table and the simulator are two apps, started by two commands, and neither carries the other: a table at an exhibition has no simulator in it, and a simulator drives the table of this repository as readily as an application of somebody else. `npm run dev` starts one of each for a laptop and points the table at the tracker of the simulator.

**`npm run table`**, the application and the tracker it listens to:

| Flag | What it does | Default |
| --- | --- | --- |
| `--port <port>` | The port of the table, which carries its tracker at `/tuio` as well | `5173` |
| `--tuio <host:port>` | The tracker of the table, `10.0.0.20:3343`. Without one a page finds no tracker and the tables are driven by the mouse | none |
| `--ids <list>` | The ids the markers of the table carry, `5,6,11,12,21,22`, which every page the server serves reads, see [Run on a table](table.md#the-ids-of-the-markers) | the markers from 1 |
| `--host <host>` | Opens the table to the network. Without it the port is only reachable from this machine | this machine |
| `--app <id>` | Also prints the address of that one table | |
| `--preview` | The built application instead of the development server | |
| `--quiet` | No banner, for a command which prints one of its own | |
| `--help` | The list above | |

The tracker and the ids are of the booth and not of a visitor, so they are said once and no address of that table carries either. For the table of this exhibition they are written down in `package.json`, as `npm run table`, which is `node scripts/table.mjs --tuio 10.0.0.20:3343 --ids 5,6,11,12,21,22` and takes the same flags after `--`. A built page takes them from the environment instead, `TUIO_TABLE_TRACKER=10.0.0.20:3343 TUIO_TABLE_IDS=5,6,11,12,21,22 npm run build`, and a page may still name its own with `?tuio=` and `?ids=`.

**`npm run simulator`**, a tracker and the surface which drives it:

| Flag | What it does | Default |
| --- | --- | --- |
| `--port <port>` | The TUIO port of the tracker | `3333` |
| `--page-port <port>` | The port the control page is served on | `3344` |
| `--table <url>` | The table this simulator drives, which its page opens under the surface | `http://localhost:5173/` |
| `--host`, `--tuio`, `--transport`, `--rate`, `--allow-origin` | What it speaks and who may drive it, see [Run the simulator](simulator.md) | |

**`npm run dev`**, one of each: `--port` for the table, `--page-port` and `--tuio-port` for the simulator, and `--host`, `--app` and `--preview`, which it hands on.

The flags come after `--`, because npm takes the ones before it for itself:

```bash
npm run dev -- --port 8080
npm run dev -- --port 8080 --page-port 3346 --tuio-port 3335   # a second copy beside the first
```

`--port` alone is enough while nothing else is running. A second copy needs all three, because the simulator binds its own two ports and stops with the reason when one of them is taken. `npm run preview` takes the flags of the table.

### The table on the network

The server of the table listens on this machine only. That is on purpose: it carries the tracker of the table with it, and the tracker asks for no password, so a table on the network of an exhibition would hand the objects on the glass to everybody on that network. A machine somewhere else reaches the table over a forwarded port instead:

```bash
ssh -L 5173:localhost:5173 <machine>
```

`--host` is the way out of that, for the table itself or a tablet beside it:

```bash
npm run dev -- --host                  # every interface
npm run dev -- --host 192.168.1.14     # one of them
```

It says in the banner what it opens, and the simulator then accepts the control page under the address of the network as well, which it otherwise only does for a page of its own machine. Serve the built `dist/` with a server of your own for anything that stands longer than a session.

## The size of a surface

A table is drawn on one surface, 1920 by 1080, and scaled to the glass in front of the visitor: the 4K table of the exhibition is that surface at twice the size, a laptop is it at its own size, and a window somebody made smaller is it smaller. How large the surface is is said in one place, the stylesheet of the kit, as the size of the text of the page:

```css
font-size: max(10px, calc(16 * min(100vw / 1920, 100vh / 1080)));
```

Two rules follow from that, and a table which breaks either of them is a table which looks right on the machine it was written on and wrong on the glass:

- **The furniture of the page is in `rem`.** The panel, the cards of the settings, the brief, the buttons and the notes are HTML, and every length of them is a multiple of the text of the page: `0.0625rem` is the hairline of the drawing, `2.75rem` the smallest thing a finger presses. A length in pixels there is a length which stays the same while everything around it grows.
- **A scene is drawn in the pixels of the surface.** Every table lays itself out in `surfaceViewport()` of the kit rather than in the window, which is the window in the pixels of the drawing, and sets that as the `viewBox` of its scene. The browser then scales the lines, the text and the layout of it together. A length inside a scene is therefore in `px`, which are the pixels of that surface and not of the glass; a length in `rem` inside a scene scales twice.

`surfaceScale()` is the number itself, for the few places which have to speak in the pixels of the glass: the note of the info layer, which is placed beside an element the browser measured, and how far a tapping finger may travel before it was going somewhere else. A finger of the tracker arrives as a fraction of the sensor and is multiplied by the window, so it is in those pixels too.

## The input layer

`packages/tuio-input` speaks TUIO 2.0 and TUIO 1.1 over WebSocket, through the [`tuio-client`](https://github.com/InteractiveScapeGmbH/tuio_client_js) package of Interactive Scape. That package ships no WebSocket receiver, so the repository carries one built on [`osc-js`](https://github.com/adzialocha/osc-js). A browser cannot take the UDP a tracker usually sends, which is why a table has to offer the bundles over a WebSocket; [tuio.org](https://tuio.org/) has the protocol itself.

What an application sees of it is one small shape:

| TUIO 2.0 | In `packages/tuio-input` |
| --- | --- |
| `Tuio20Object.token` with `cId` | `TableToken.marker` |
| `Tuio20Token.position` | `TableToken.x`, `TableToken.y`, fractions of the sensor |
| `Tuio20Token.angle` | `TableToken.angle` in 0 to 2 pi, and `TableToken.turn`, which keeps counting past it |
| `Tuio20Object.pointer` | `TablePointer`, with its radius and pressure |
| `dim` of `/tuio2/frm` | `TableSnapshot.sensor` |
| `/tuio2/alv` | A session that is no longer in `TableSnapshot.tokens` |

`TableToken.turn` is the one addition. A tracker sends the angle wrapped into 0 to 2 pi, so an object turned past the boundary reads as a jump of almost a full turn backwards. The input layer undoes that by taking the shorter way round between two frames, which is how a knob turned twice reports two turns. The same `TableInput` interface is implemented by the mouse, which is why these applications run on a laptop.

Everything that carries logic is a pure function and is tested without a socket: the unwrapping of an angle across the 2 pi boundary, the mapping of an angle to a value, the resolution of a marker to a role, the hit test of a position against the anchors of an anatomy, and the reducer that turns the nullable token and pointer of a `Tuio20Object` into a snapshot.

`createMockTableInput` is not a test double. It implements the same `TableInput` interface from mouse, touch and keyboard events, which is how a table application is developed and demonstrated without a table. An application never learns which input it is drawing.

`openTableInput` decides which it is, so every table asks the same question in one line. A page whose address names a tracker listens to that tracker alone. A page which names none asks the server it came from whether it carries one at `/tuio`, and when it does, the objects of that tracker and the mouse of this machine are merged into one surface, with the sessions of the mouse numbered far above those of the tracker so the two never meet. `?tuio=off` keeps a page on the mouse. That is what makes `npm run dev`, a forwarded port over ssh and a deployed build all work without anything being added to the address.

## Adding a table

1. Add a package under `packages/<name>-table` whose `src/app.ts` exports one `TableApp`: a function which takes the `TableHost` of `packages/tui-kit` and draws on the surface it is given. It looks for no element of its own, and reads the query and the assets of its table from the host.
2. Add it to `TABLES` in `apps/table/src/tables.ts`: what `?app` calls it, its card on the body, the organ the card points at, the folder of its assets and the import which loads it.
3. Add its entry to `APPS` in `scripts/sync-assets.mjs`, naming the exported files it needs, name those files in `PARTS` of `scripts/assets.mjs`, which is what says a release carries them, and add the `dev:<name>` script to the root `package.json`.
4. Define its roles: which marker does what, over which range, on which scale, and which objects carry their meaning in their position instead (`mode: "position"`).
5. Put the model layer in a package under `packages/`, never in the application, and hold it to the exported reference of pkpdsim with a test.
6. Lay it out in `surfaceViewport()` and give that to the `viewBox` of its scene, so the table scales with the glass; see [The size of a surface](#the-size-of-a-surface) for which lengths are `px` and which are `rem`.
7. Draw it with `packages/tui-kit`: the band, the cards, the panel, the notes and the course are shared, and only the scene of the application is its own. Give every number of the band and every role an `info`, which is the note a visitor opens, and every role a picture with `glyph`, which is what the object says about itself while it is turned.
8. Anything a visitor presses rather than turns carries `data-dwell="<name>"` and a click handler. The note layer of `createInfo` watches the fingers of the tracker, fires the click when one has rested on it for a moment, and marks the element with `data-arming` while it does, which is what the element fills from. The name and not the element is the identity of a target, because a panel is redrawn under a finger which is resting on it.
9. Write its words in `packages/<name>-table/src/text.ts`: one module with English, German and Spanish side by side, where every explanatory sentence is a `Phrase` of a child, an adult and an expert text. Nothing a visitor reads is written into the code of a scene, a card or a role, and a test walks every locale and every level to insist that nothing was forgotten. See [Languages and the voice](languages.md).
10. Write its three quiz questions into the same module as `quiz`, in the three languages, with the same ids in the same order: what is asked, two or three answers, which one is right, the one sentence why, and what to turn at the table to see it. `createQuiz(host.chrome, {voice, questions: copy.quiz})` is the whole of what a table does with them. See [Run on a table](table.md).
11. Add a page under `docs/apps/` that names every marker, and add it to `nav` in `zensical.toml`.

## Conventions

- No model equations live here. The models are exported by pkpdsim or compiled from their own repository, and a port of one is held to its exported reference by a test.
- A solve that takes longer than a frame runs in a Web Worker, the objects stay where they are, and the answer that is on the table stays on it until the next one arrives.
- A table application never shows a browser dialog. `alert`, `confirm` and `prompt` block the surface and there is no keyboard at a table to dismiss them.
- A table is read from one side: everything a person reads stands upright for the edge the panel is in, and nothing is drawn twice.
- What is not needed at a glance is a note behind the element it belongs to, which a hover or a finger at rest opens, and not another paragraph on the surface.
- Every word a visitor reads comes from the `text.ts` of its package, in three languages and at three levels. A string in the middle of a scene is a word which cannot be translated and cannot be read aloud.
- The reference state stays on screen when something fails. An empty table in front of an audience is the worst failure mode there is.
- A table is drawn on one surface, 1920 by 1080, and scaled to the glass in front of the visitor. The page is in `rem`, a scene is in the pixels of that surface, and nothing is laid out in the pixels of the window; see [The size of a surface](#the-size-of-a-surface).
- Markdown carries no hard line wraps: a paragraph, a list item or a table row is a single line.

## Branches, the version and a release

`develop` is the default branch and takes every change through a pull request: the rulesets in `.github/rulesets/` reject a push straight to it and ask for the `node` and `docs` checks. `main` tracks the latest release and is fast-forwarded by the `sync-main` job of `ci.yml`, never by hand. `.github/rulesets/apply.sh` applies the rulesets and the merge settings of the repository and can be run again after every change of them.

The version is one number for the whole repository: the root `package.json`, every workspace beside it, and the line the page about all of this shows, which `vite.config.ts` reads out of the root and writes into the bundle, so a table at an exhibition can be asked which release it is running. `test/release.test.ts` fails when the versions disagree, when the version is no plain `x.y.z`, or when the release notes of that version are missing.

A release is prepared on a branch, because `develop` takes nothing else, and tagged once that pull request is merged:

1. branch off `develop`: `git switch -c release/x.y.z develop`
2. write the release notes in `release-notes/x.y.z.md`. The first line is `# Release notes for pkpdsim-tui x.y.z`, which is what the test looks for and what the GitHub release is built from
3. set the version everywhere: `npm version x.y.z --workspaces --include-workspace-root --no-git-tag-version`, which writes the root, every workspace and `package-lock.json`. It makes no tag: a squash merge would rewrite the commit and leave the tag behind on a commit which is not part of `develop`
4. make sure everything passes: `npm run typecheck`, `npm test`, `npm run build`, `npm run docs:build`
5. push the branch, open the pull request against `develop` and merge it once the checks are green
6. tag the merged commit on `develop` and push the tag:

    ```bash
    git switch develop
    git pull
    git tag x.y.z
    git push origin x.y.z
    ```

    This starts `ci.yml` once more on the tagged tree, and when the checks pass it creates the GitHub release from `release-notes/x.y.z.md` and fast-forwards `main` to the tagged commit. Check the version before pushing: a tag can be neither moved nor deleted.

7.  Put the resources of the table on the release, from a checkout which has them all:

    ```bash
    npm run assets:check   # all of them, or there is nothing to pack
    npm run assets:pack    # writes the two archives and their sha256 files
    gh release upload x.y.z pkpdsim-tui-models-x.y.z.tar.gz pkpdsim-tui-voice-x.y.z.tar.gz \
      pkpdsim-tui-models-x.y.z.tar.gz.sha256 pkpdsim-tui-voice-x.y.z.tar.gz.sha256
    ```

    `npm run assets:pack` prints that command with the paths it wrote. This is what makes a clone of the release a table: an install of it takes these archives, so they belong to every release and a release without them is one which has to be told to run `npm run sync`.

Nothing goes to a registry. The packages are private and a table is served as a build of `apps/table`, so the release is the tag, the notes and `main`. A table is deployed from a tag rather than from a branch:

```bash
git switch --detach x.y.z
npm ci                       # and the resources of that release, from the release itself
npm run build
```

`apps/table/dist` is then what the machine of the table serves, see [Run on a table](table.md).

## The documentation

The site is built with [Zensical](https://zensical.org/) from the markdown in `docs/`, configured in `zensical.toml`. The build is gitignored.

The pages go from what a visitor sees to how it is made, and a new page belongs in that order:

| Page | What belongs on it |
| --- | --- |
| `index.md` | The overview, and nothing which has to be kept in step with a command |
| `apps/index.md` and `apps/<table>.md` | The four tables, the settings and the levels a visitor chooses, how a table behaves under a hand, and the model behind each one |
| `table.md` | A booth: installing it, the one command, the tracker, the pucks, the glass |
| `simulator.md` | The same on a laptop, and how a table is driven against the simulator |
| `development.md` | The repository itself: the layout, the commands, the two apps, the releases |
| `languages.md` | Where the words are and how the clips are recorded |

```bash
uv sync --extra dev
uv run zensical serve
uv run zensical build --clean --strict
```
