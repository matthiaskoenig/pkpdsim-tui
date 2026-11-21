# pkpdsim-tui

Tangible table applications of the physiologically based pharmacokinetic and pharmacodynamic (PBPK/PD) models of [pkpdsim](https://github.com/matthiaskoenig/pkpdsim), driven by physical objects on a multitouch table with object recognition.

The interactive examples of the pkpdsim documentation run in a browser with sliders and a mouse. The same models become something else on a table: a visitor puts an object down, twists it, and the physiology answers. The input is [TUIO](https://tuio.org/), the protocol of tangible interactive surfaces, which the tables of [Interactive Scape](https://www.interactive-scape.com/) and the [TUIO simulator](https://github.com/InteractiveScapeGmbH/tuio-simulator) speak.

Every application also runs without a table, on a mouse and the keyboard, so it can be developed and shown anywhere.

## Applications

| Application | State | What the objects do |
| --- | --- | --- |
| `apps/cardiovascular` | prototype | Four resistance tokens on an anatomy: hepatic, systemic, portal and renal. The angle of the token is the resistance factor, and the pressures, flows and perfusion follow. |
| Liver lobes | planned | A clamp on a portal branch is a portal vein ligation, a cut is a hepatectomy. |
| Glimepiride | planned | A dose token and a patient token on the digital twin of the glimepiride model. |

## Quick start

```bash
npm install
npm run sync          # copies the exported models and reference data of a pkpdsim checkout
npm run dev           # the cardiovascular application on http://localhost:5173
```

Without a table the application runs on the mouse: digit keys place a token, dragging moves it, the wheel turns it, backspace lifts it. With the TUIO simulator running on WebSocket, TUIO 2.0 and port 3343, open `http://localhost:5173/?tuio=localhost:3343`.

The documentation explains the protocol, the simulator and the table: `npm run docs`.

## Layout

| Path | What is in it |
| --- | --- |
| `packages/tuio-input` | TUIO 2.0 and the mouse behind one `TableInput` interface, and the role, angle and target vocabulary of a tangible application |
| `packages/cardio-sim` | the steady pressure network of the cardiovascular model of pkpdsim and the loaders of its exported reference data |
| `apps/cardiovascular` | the cardiovascular table application |
| `scripts/sync-assets.mjs` | copies the exported runtime, model and reference data of a pkpdsim checkout into an application |
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
