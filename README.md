# pkpdsim-tui
[![ci](https://github.com/matthiaskoenig/pkpdsim-tui/actions/workflows/ci.yml/badge.svg)](https://github.com/matthiaskoenig/pkpdsim-tui/actions/workflows/ci.yml)
[![documentation](https://github.com/matthiaskoenig/pkpdsim-tui/actions/workflows/docs.yml/badge.svg)](https://github.com/matthiaskoenig/pkpdsim-tui/actions/workflows/docs.yml)
[![Documentation](https://img.shields.io/badge/docs-pkpdsim--tui-3f51b5.svg)](https://matthiaskoenig.github.io/pkpdsim-tui)
[![TUIO](https://img.shields.io/badge/TUIO-1.1%20%7C%202.0-00897b.svg)](https://tuio.org/)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](https://opensource.org/license/MIT)

Tangible table applications of the physiologically based pharmacokinetic and pharmacodynamic (PBPK/PD) models of [pkpdsim](https://github.com/matthiaskoenig/pkpdsim), driven by physical objects on a multitouch table with object recognition.

The interactive examples of the pkpdsim documentation run in a browser with sliders and a mouse. The same models become something else on a table: a visitor puts an object down, twists it, and the physiology answers. The input is [TUIO](https://tuio.org/), the protocol of tangible interactive surfaces, which the tables of [Interactive Scape](https://www.interactive-scape.com/) and the [TUIO simulator](https://github.com/InteractiveScapeGmbH/tuio-simulator) speak.

Every application also runs without a table, on a mouse and the keyboard, so it can be developed and shown anywhere.

It speaks English, German and Spanish, at three levels, and reads itself aloud: a visitor picks whether they want it explained the way a six year old is told it, the way an adult who knows nothing about the subject is told it, or in full, and whoever cannot read it presses play instead.

## One application, five tables

Everything here is one application: it opens on the two reference bodies of pkpdsim, a man and a woman, with the tables arranged around them, and a touch on a card or on the organ it points at opens that table. Touching a body is what every table is then solved for, and **Back** in the panel of a table returns to them. One build, one address, one port.

| Table | Opened by | State | What the objects do |
| --- | --- | --- | --- |
| Cardiovascular circulation | `?app=cardiovascular` | prototype | Four resistance objects on an anatomy, hepatic, systemic, portal and renal, and two for the heart itself. The angle of an object is its value, the pressures, flows and perfusion follow, and the compiled heart beats on the table at the rate it is given. |
| The liver | `?app=liver` | prototype | Why the body needs a liver: its two blood supplies as two objects, what one lobule of it is served with, and the way into the three liver tables which follow it. |
| Lobed liver | `?app=lobes` | prototype | A clamp on a segment of the liver is a portal vein ligation, the scalpel is a resection, and a dial winds the five days of the regeneration that follows. |
| Glimepiride | `?app=glimepiride` | prototype | The dose, the CYP2C9 genotype, the liver, the kidneys and the body weight of one individual, each on its own dial, on the whole body model of glimepiride. |
| Machine perfusion | `?app=perfusion` | prototype | A liver kept alive outside the body: the pump, the oxygen and the temperature of the circuit, and a dial through the six hours of the perfusion. |

## Quick start

```bash
npm install
npm run sync          # copies the exported models and reference data of a pkpdsim checkout
npm run dev           # the application and the TUIO simulator, both on http://localhost:5173
```

| Address | What it is |
| --- | --- |
| `http://localhost:5173/` | the two bodies, from which every table is opened |
| `http://localhost:5173/?app=cardiovascular` | one table directly; `liver`, `lobes`, `glimepiride` and `perfusion` are the others |
| `http://localhost:5173/simulator/` | the simulator, with the application under its own surface |
| `http://localhost:5173/simulator/?table=cardiovascular` | the same, opened on one table |
| `http://localhost:5173/?lang=de&level=child` | any of them in another language and at another level, which a visitor also switches on the table |

Nothing has to be added to those addresses: a page asks the server it came from whether it carries a tracker, and the development server does, at `/tuio`. The mouse works at the same time as the objects: digit keys place an object, dragging moves it, the wheel turns it, backspace lifts it, escape leaves a table for the body. On the surface of the simulator the objects are placed with a double click and turned with the wheel, and the application under it follows them. `?tuio=off` keeps a page on the mouse alone; the Unity simulator of Interactive Scape, and a real table, are addressed with `?tuio=host:port`.

| What you want to see | What to run | What to open |
| --- | --- | --- |
| the application alone, on the mouse | `npm run dev:app` | `http://localhost:5173/` |
| the objects of a table, on a surface you do not have to own | `npm run dev` | `http://localhost:5173/simulator/` |
| the application as it will stand on the table, with the objects beside it | `npm run dev` | the two addresses above, in two windows |
| the built application | `npm run build && npm run preview` | `http://localhost:4173/` |

Everything is on one port, so a table on another machine is one forwarded port: `ssh -L 5173:localhost:5173 <machine>`, then the addresses above in the browser at home. `npm run dev -- --no-simulator` leaves the simulator out, and `npm run preview` serves the built application the same way.

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
| `packages/perfusion-sim` | the machine perfusion: the settings of the machine, the parameters they are, and the request that solves six hours of it |
| `packages/tuio-simulator` | the TUIO simulator: a control page and the tracker that serves it, on plain `node`, in either version of the protocol and over either transport |
| `packages/cardiovascular-table`, `packages/liver-table`, `packages/lobes-table`, `packages/glimepiride-table`, `packages/perfusion-table` | the five tables: what each one draws, which object does what on it, and what it says about itself |
| `apps/table` | the one application: the body, the tables behind it, and the development server that carries the simulator |
| `scripts/sync-assets.mjs` | copies the exported runtime, model and reference data of a pkpdsim checkout into an application |
| `scripts/export_model.py` | compiles an SBML model that comes from its own repository into the WebAssembly an application runs |
| `scripts/speech.mjs`, `scripts/speak.py` | every sentence the tables can say, and the clips which read them aloud |
| `docs/` | the [Zensical](https://zensical.org/) documentation |

## Development

```bash
npm test              # vitest
npm run typecheck     # tsc
npm run build         # the production bundle of the application
npm run speech        # the clips the tables read aloud, see docs/languages.md
npm run docs:build    # the documentation, strict
```

## License

* Source code: [MIT](https://opensource.org/license/MIT)
* Documentation: [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)
* Models: the license of the model repository they come from

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.

© 2026 [Matthias König](https://livermetabolism.com)
