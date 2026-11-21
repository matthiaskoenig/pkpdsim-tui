# Development

## The layout

| Path | What is in it |
| --- | --- |
| `packages/tuio-input` | TUIO 2.0 and the mouse behind one `TableInput` interface, and the role, angle and target vocabulary |
| `packages/tui-kit` | What every application shares: the surface, the dials and cards of the objects, the bands at the edges, the panels in the corners and the course below the scene |
| `packages/core-runtime` | A compiled SBML model on the sbmlsim-core WebAssembly runtime, solved with SUNDIALS IDA in a Web Worker |
| `packages/cardio-sim` | The steady pressure network of the cardiovascular model and the loaders of the exported data |
| `packages/lobes-sim` | The lobed liver: the states of a segment, the parameters they change and the request that solves them |
| `packages/glimepiride-sim` | The glimepiride individual, the request that solves them and the pharmacokinetics of the result |
| `packages/tuio-simulator` | The TUIO simulator: a control page and the tracker that serves it, on plain `node`, in either version of the protocol and over either transport |
| `apps/cardiovascular` | The cardiovascular table application |
| `apps/lobes` | The lobed liver table application |
| `apps/glimepiride` | The glimepiride table application |
| `scripts/sync-assets.mjs` | Copies the exported runtime, model and reference data of a pkpdsim checkout into an application |
| `scripts/export_model.py` | Compiles an SBML model that comes from its own repository into the WebAssembly an application runs |
| `docs/` | This site |

The repository is an npm workspace. The packages ship TypeScript source and are consumed as source, so there is one type check and one build for the whole tree.

## Commands

```bash
npm install
npm run sync          # the exported models and data of a pkpdsim checkout
npm run export:glimepiride  # compiles the glimepiride model of its own repository
npm run dev           # the cardiovascular application, on http://localhost:5173
npm run dev:lobes     # the lobed liver, on http://localhost:5174
npm run dev:glimepiride     # glimepiride, on http://localhost:5175
npm run simulator     # the TUIO simulator: a tracker on 3333, its control page on 3344
npm test              # vitest
npm run typecheck     # tsc
npm run build         # the production bundle
npm run docs          # this site, served
npm run docs:build    # this site, strict
```

`npm run sync` reads the checkout named by `--pkpdsim`, then by the environment variable `PKPDSIM_DIR`, then the sibling directory `../pkpdsim`. What it copies is gitignored, so a clone stays small, and `--list` prints what each application needs.

A model that is not exported by pkpdsim is compiled here instead. `scripts/export_model.py` takes an SBML file and writes the compiled model, its description and the browser runtime beside it, with the release of sbmlsim-core of the `dev` extra; `npm run export:glimepiride` is that command for the glimepiride model, which it expects in a `glimepiride-model` checkout beside this one or at the path in `GLIMEPIRIDE_MODEL`. The script knows nothing about a model, so the next one is another line in `package.json`.

An application is developed against the [simulator](simulator.md) of `packages/tuio-simulator`, which is a tracker like the table is: `npm run simulator` in one terminal, `npm run dev` in another, and the application opened at `http://localhost:5173/?tuio=localhost:3333`. Nothing but the checkout is needed for it, and the objects are placed and turned on the page it serves on `http://localhost:3344`, which also shows the application under its own surface.

## The input layer

Everything that carries logic is a pure function and is tested without a socket: the unwrapping of an angle across the 2 pi boundary, the mapping of an angle to a value, the resolution of a marker to a role, the hit test of a position against the anchors of an anatomy, and the reducer that turns the nullable token and pointer of a `Tuio20Object` into a snapshot.

`createMockTableInput` is not a test double. It implements the same `TableInput` interface from mouse, touch and keyboard events, which is how a table application is developed and demonstrated without a table. An application never learns which input it is drawing.

## Adding an application

1. Add the folder under `apps/`, with its own `package.json`, `vite.config.ts` and `index.html`.
2. Add its entry to `APPS` in `scripts/sync-assets.mjs`, naming the exported files it needs.
3. Add a `dev:<name>` script to the root `package.json`, on the next port after the applications that are there.
4. Define its roles: which marker does what, over which range, on which scale, and which objects carry their meaning in their position instead (`mode: "position"`).
5. Put the model layer in a package under `packages/`, never in the application, and hold it to the exported reference of pkpdsim with a test.
6. Draw it with `packages/tui-kit`: the bands, the cards, the panels and the course are shared, and only the scene of the application is its own.
7. Add a page under `docs/apps/` that names every marker, and add it to `nav` in `zensical.toml`.

## Conventions

- No model equations live here. The models are exported by pkpdsim or compiled from their own repository, and a port of one is held to its exported reference by a test.
- A solve that takes longer than a frame runs in a Web Worker, the objects stay where they are, and the answer that is on the table stays on it until the next one arrives.
- A table application never shows a browser dialog. `alert`, `confirm` and `prompt` block the surface and there is no keyboard at a table to dismiss them.
- Anything a person reads is repeated at two opposite edges, or turned to the edge it belongs to.
- The reference state stays on screen when something fails. An empty table in front of an audience is the worst failure mode there is.
- Markdown carries no hard line wraps: a paragraph, a list item or a table row is a single line.

## The documentation

The site is built with [Zensical](https://zensical.org/) from the markdown in `docs/`, configured in `zensical.toml`. The build is gitignored.

```bash
uv sync --extra dev
uv run zensical serve
uv run zensical build --clean --strict
```
