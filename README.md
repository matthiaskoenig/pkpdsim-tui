# pkpdsim-tui
[![ci](https://github.com/matthiaskoenig/pkpdsim-tui/actions/workflows/ci.yml/badge.svg)](https://github.com/matthiaskoenig/pkpdsim-tui/actions/workflows/ci.yml)
[![documentation](https://github.com/matthiaskoenig/pkpdsim-tui/actions/workflows/docs.yml/badge.svg)](https://github.com/matthiaskoenig/pkpdsim-tui/actions/workflows/docs.yml)
[![Documentation](https://img.shields.io/badge/docs-pkpdsim--tui-3f51b5.svg)](https://matthiaskoenig.github.io/pkpdsim-tui)
[![TUIO](https://img.shields.io/badge/TUIO-1.1%20%7C%202.0-00897b.svg)](https://tuio.org/)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](https://opensource.org/license/MIT)

Tangible table applications of the physiologically based pharmacokinetic and pharmacodynamic (PBPK/PD) models of [pkpdsim](https://github.com/matthiaskoenig/pkpdsim), driven by physical objects on a multitouch table with object recognition.

The interactive examples of the pkpdsim documentation run in a browser with sliders and a mouse. The same models become something else on a table: a visitor puts an object down, twists it, and the physiology answers. The input is [TUIO](https://tuio.org/), the protocol of tangible interactive surfaces, which the tables of [Interactive Scape](https://www.interactive-scape.com/) and the [TUIO simulator](https://github.com/InteractiveScapeGmbH/tuio-simulator) speak.

Every application also runs without a table, on a mouse and the keyboard, so it can be developed and shown anywhere.

## Applications

| Application | State | What the objects do |
| --- | --- | --- |
| `apps/cardiovascular` | prototype | Four resistance objects on an anatomy, hepatic, systemic, portal and renal, and two for the heart itself. The angle of an object is its value, the pressures, flows and perfusion follow, and the compiled heart beats on the table at the rate it is given. |
| `apps/lobes` | prototype | A clamp on a segment of the liver is a portal vein ligation, the scalpel is a resection, and a dial winds the five days of the regeneration that follows. |
| `apps/glimepiride` | prototype | The dose, the CYP2C9 genotype, the liver, the kidneys and the body weight of one individual, each on its own dial, on the whole body model of glimepiride. |

## Quick start

```bash
npm install
npm run sync          # copies the exported models and reference data of a pkpdsim checkout
npm run dev:cardiovascular  # the circulation on http://localhost:5173
npm run dev:lobes           # the lobed liver on http://localhost:5174
npm run dev:glimepiride     # glimepiride on http://localhost:5175
npm run simulator     # the TUIO simulator: a tracker on 3333, its control page on 3344
```

Without a table the application runs on the mouse: digit keys place an object, dragging moves it, the wheel turns it, backspace lifts it. To drive it from objects, run `npm run simulator`, place objects on the control page at `http://localhost:3344` and open the application at `http://localhost:5173/?tuio=localhost:3333`. The control page also shows the application under its own surface, so the objects sit on the picture they drive. The Unity simulator of Interactive Scape, and a real table, are addressed the same way.

The documentation explains the protocol, the simulator and the table: `npm run docs`.

## Layout

| Path | What is in it |
| --- | --- |
| `packages/tuio-input` | TUIO and the mouse behind one `TableInput` interface, and the role, angle and target vocabulary of a tangible application |
| `packages/tui-kit` | what every table draws the same way: the surface, the dials and cards of the objects, the bands at the edges, the panels and the course |
| `packages/core-runtime` | a compiled SBML model on the sbmlsim-core WebAssembly runtime, solved in a Web Worker |
| `packages/cardio-sim` | the steady pressure network of the cardiovascular model of pkpdsim and the loaders of its exported reference data |
| `packages/lobes-sim` | the lobed liver: the states of a segment, the parameters they change and the request that solves them |
| `packages/glimepiride-sim` | the glimepiride individual, the request that solves them and the pharmacokinetics of the result |
| `packages/tuio-simulator` | the TUIO simulator: a control page and the tracker that serves it, on plain `node`, in either version of the protocol and over either transport |
| `apps/cardiovascular`, `apps/lobes`, `apps/glimepiride` | the three table applications |
| `scripts/sync-assets.mjs` | copies the exported runtime, model and reference data of a pkpdsim checkout into an application |
| `scripts/export_model.py` | compiles an SBML model that comes from its own repository into the WebAssembly an application runs |
| `docs/` | the [Zensical](https://zensical.org/) documentation |

## Development

```bash
npm test              # vitest
npm run typecheck     # tsc
npm run build         # the production bundle of the application
npm run docs:build    # the documentation, strict
```

## License

* Source code: [MIT](https://opensource.org/license/MIT)
* Documentation: [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)
* Models: the license of the model repository they come from

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.

© 2026 [Matthias König](https://livermetabolism.com)
