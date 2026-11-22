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
| `scripts/dev.mjs` | Starts the application and the simulator on one port |
| `scripts/sync-assets.mjs` | Copies the exported runtime, model and reference data of a pkpdsim checkout into `apps/table/public/assets/<table>` |
| `scripts/export_model.py` | Compiles an SBML model that comes from its own repository into the WebAssembly an application runs |
| `scripts/speech.mjs` | Collects every sentence of the copy, in three languages and at three levels, for the clips the table reads aloud |
| `scripts/speak.py` | Records those sentences into `apps/table/public/audio/<locale>/` |
| `scripts/qr.mjs` | Writes `apps/table/src/qr.ts`, the QR code of the laboratory in the footer of the landing page, as one SVG path |
| `docs/` | This site |

The repository is an npm workspace. The packages ship TypeScript source and are consumed as source, so there is one type check and one build for the whole tree. There is one application: `apps/table` is the page, and a table of `packages/*-table` is a module it loads when `?app` names it, with the assets of that table under `assets/<table>/`. A table is left by opening another one, which reloads the page, so no table has to take itself down and a worker, a solver and a socket go with the page they belong to.

## Commands

```bash
npm install
npm run sync          # the exported models and data of a pkpdsim checkout
npm run export:glimepiride  # compiles the glimepiride model of its own repository
npm run export:perfusion    # compiles a machine perfusion model built with pkpdsim
npm run dev           # the application and the simulator, both on http://localhost:5173
npm run dev:app       # the application alone, for a real table or another tracker
npm run dev:cardiovascular  # the same as npm run dev, and prints the address of that table
npm run preview       # the built application, served the same way
npm run simulator     # the simulator alone: a tracker on 3333, its control page on 3344
npm run speech:texts  # every sentence the table can say, for the clips
npm run speech        # the same, and records the clips with scripts/speak.py
npm test              # vitest
npm run typecheck     # tsc
npm run build         # the production bundle
npm run docs          # this site, served
npm run docs:build    # this site, strict
```

`npm run sync` reads the checkout named by `--pkpdsim`, then by the environment variable `PKPDSIM_DIR`, then the sibling directory `../pkpdsim`. What it copies is gitignored, so a clone stays small, and `--list` prints what each application needs.

A model that is not exported by pkpdsim is compiled here instead. `scripts/export_model.py` takes an SBML file and writes the compiled model, its description and the browser runtime beside it, with the release of sbmlsim-core of the `dev` extra; `npm run export:glimepiride` is that command for the glimepiride model, which it expects in a `glimepiride-model` checkout beside this one or at the path in `GLIMEPIRIDE_MODEL`. The script knows nothing about a model, so the next one is another line in `package.json`.

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
PERFUSION_MODEL=../pkpdsim/models/rat_liver_nmp_flat.xml npm run export:perfusion
```

`node scripts/qr.mjs` regenerates the QR code of the landing page footer. It is generated once and committed as a module of paths, so the page carries no QR library and works with no network; `node scripts/qr.mjs --print` draws it in the terminal to check it, and the address it encodes is `LAB_URL` at the top of the script.

`npm run speech` writes the clips a table reads aloud. `scripts/speech.mjs` imports the copy modules straight into `node`, which reads TypeScript of its own, so there is one copy of the text and no build step between it and the clips. [Languages and the voice](languages.md) covers the engines and what is recorded.

A table is developed against the [simulator](simulator.md) of `packages/tuio-simulator`, which is a tracker like the table is. `npm run dev` starts both, and the development server carries the simulator as well, so one port is the whole table: the application on `/`, the surface that drives it on `/simulator/`, and the tracker on `/tuio`, which an application is pointed at with `?tuio=/tuio`. That is also what makes a machine somewhere else one forwarded port, `ssh -L 5173:localhost:5173 <machine>`.

### The ports and the other flags of `npm run dev`

| Flag | What it does | Default |
| --- | --- | --- |
| `--port <port>` | The one port of the table: the application, the simulator page and the tracker behind it | `5173` |
| `--page-port <port>` | The port the simulator serves its own control page on | `3344` |
| `--tuio-port <port>` | The port of the tracker itself | `3333` |
| `--host <host>` | Opens the table to the network. Without it the three ports are only reachable from this machine | this machine |
| `--app <id>` | Also prints the address of that one table | |
| `--no-simulator` | The application alone, for a real table or another tracker | |
| `--preview` | The built application instead of the development server | |
| `--help` | The list above | |

The flags come after `--`, because npm takes the ones before it for itself:

```bash
npm run dev -- --port 8080
npm run dev -- --port 8080 --page-port 3346 --tuio-port 3335   # a second copy beside the first
```

`--port` alone is enough while nothing else is running. A second copy needs all three, because the simulator binds its own two ports and stops with the reason when one of them is taken. `npm run preview` takes the same flags.

### The table on the network

The development server listens on this machine only. That is on purpose: it carries the control socket of the simulator and the tracker with it, and neither of them asks for a password, so a table on the network of an exhibition would hand the objects on the glass to everybody on that network. A machine somewhere else reaches the table over a forwarded port instead:

```bash
ssh -L 5173:localhost:5173 <machine>
```

`--host` is the way out of that, for the table itself or a tablet beside it:

```bash
npm run dev -- --host                  # every interface
npm run dev -- --host 192.168.1.14     # one of them
```

It says in the banner what it opens, and the simulator then accepts the control page under the address of the network as well, which it otherwise only does for a page of its own machine. Serve the built `dist/` with a server of your own for anything that stands longer than a session.

## The input layer

Everything that carries logic is a pure function and is tested without a socket: the unwrapping of an angle across the 2 pi boundary, the mapping of an angle to a value, the resolution of a marker to a role, the hit test of a position against the anchors of an anatomy, and the reducer that turns the nullable token and pointer of a `Tuio20Object` into a snapshot.

`createMockTableInput` is not a test double. It implements the same `TableInput` interface from mouse, touch and keyboard events, which is how a table application is developed and demonstrated without a table. An application never learns which input it is drawing.

`openTableInput` decides which it is, so every table asks the same question in one line. A page whose address names a tracker listens to that tracker alone. A page which names none asks the server it came from whether it carries one at `/tuio`, and when it does, the objects of that tracker and the mouse of this machine are merged into one surface, with the sessions of the mouse numbered far above those of the tracker so the two never meet. `?tuio=off` keeps a page on the mouse. That is what makes `npm run dev`, a forwarded port over ssh and a deployed build all work without anything being added to the address.

## Adding a table

1. Add a package under `packages/<name>-table` whose `src/app.ts` exports one `TableApp`: a function which takes the `TableHost` of `packages/tui-kit` and draws on the surface it is given. It looks for no element of its own, and reads the query and the assets of its table from the host.
2. Add it to `TABLES` in `apps/table/src/tables.ts`: what `?app` calls it, its card on the body, the organ the card points at, the folder of its assets and the import which loads it.
3. Add its entry to `APPS` in `scripts/sync-assets.mjs`, naming the exported files it needs, and the `dev:<name>` script to the root `package.json`.
4. Define its roles: which marker does what, over which range, on which scale, and which objects carry their meaning in their position instead (`mode: "position"`).
5. Put the model layer in a package under `packages/`, never in the application, and hold it to the exported reference of pkpdsim with a test.
6. Draw it with `packages/tui-kit`: the band, the cards, the panel, the notes and the course are shared, and only the scene of the application is its own. Give every number of the band and every role an `info`, which is the note a visitor opens, and every role a picture with `glyph`, which is what the object says about itself while it is turned.
7. Anything a visitor presses rather than turns carries `data-dwell="<name>"` and a click handler. The note layer of `createInfo` watches the fingers of the tracker, fires the click when one has rested on it for a moment, and marks the element with `data-arming` while it does, which is what the element fills from. The name and not the element is the identity of a target, because a panel is redrawn under a finger which is resting on it.
8. Write its words in `packages/<name>-table/src/text.ts`: one module with English, German and Spanish side by side, where every explanatory sentence is a `Phrase` of a child, an adult and an expert text. Nothing a visitor reads is written into the code of a scene, a card or a role, and a test walks every locale and every level to insist that nothing was forgotten. See [Languages and the voice](languages.md).
9. Write its three quiz questions into the same module as `quiz`, in the three languages, with the same ids in the same order: what is asked, two or three answers, which one is right, the one sentence why, and what to turn at the table to see it. `createQuiz(host.chrome, {voice, questions: copy.quiz})` is the whole of what a table does with them. See [Run on a table](table.md).
10. Add a page under `docs/apps/` that names every marker, and add it to `nav` in `zensical.toml`.

## Conventions

- No model equations live here. The models are exported by pkpdsim or compiled from their own repository, and a port of one is held to its exported reference by a test.
- A solve that takes longer than a frame runs in a Web Worker, the objects stay where they are, and the answer that is on the table stays on it until the next one arrives.
- A table application never shows a browser dialog. `alert`, `confirm` and `prompt` block the surface and there is no keyboard at a table to dismiss them.
- A table is read from one side: everything a person reads stands upright for the edge the panel is in, and nothing is drawn twice.
- What is not needed at a glance is a note behind the element it belongs to, which a hover or a finger at rest opens, and not another paragraph on the surface.
- Every word a visitor reads comes from the `text.ts` of its package, in three languages and at three levels. A string in the middle of a scene is a word which cannot be translated and cannot be read aloud.
- The reference state stays on screen when something fails. An empty table in front of an audience is the worst failure mode there is.
- Markdown carries no hard line wraps: a paragraph, a list item or a table row is a single line.

## The documentation

The site is built with [Zensical](https://zensical.org/) from the markdown in `docs/`, configured in `zensical.toml`. The build is gitignored.

```bash
uv sync --extra dev
uv run zensical serve
uv run zensical build --clean --strict
```
