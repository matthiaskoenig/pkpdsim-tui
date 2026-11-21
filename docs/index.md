# pkpdsim-tui

Tangible table applications of the physiologically based pharmacokinetic and pharmacodynamic (PBPK/PD) models of [pkpdsim](https://github.com/matthiaskoenig/pkpdsim).

The interactive examples in the pkpdsim documentation run in a browser, with sliders and a mouse. On a multitouch table with object recognition the same models become something else: a visitor puts a physical object down, turns it, and the physiology answers. The input is [TUIO](tuio.md), the protocol of tangible interactive surfaces, which the tables of [Interactive Scape](https://www.interactive-scape.com/) and the [TUIO simulator](simulator.md) speak.

Every application also runs without a table, on a mouse and the keyboard, so it can be developed and shown anywhere.

## The applications

| Application | State | What the objects do |
| --- | --- | --- |
| [Cardiovascular circulation](apps/cardiovascular.md) | prototype | Four resistance objects on an anatomy: hepatic, systemic, portal and renal. |
| [Lobed liver](apps/lobes.md) | prototype | A clamp on a segment is a portal vein ligation, the scalpel is a resection, and a dial winds the days of the regeneration that follows. |
| [Glimepiride](apps/glimepiride.md) | prototype | The dose, the CYP2C9 genotype, the liver, the kidneys and the body weight of one individual, each on its own dial. |

## Quick start

```bash
git clone https://github.com/matthiaskoenig/pkpdsim-tui.git
cd pkpdsim-tui
npm install
npm run sync      # copies the exported models and reference data of a pkpdsim checkout
npm run dev
```

The cardiovascular application opens on `http://localhost:5173`; `npm run dev:lobes` and `npm run dev:glimepiride` open the other two on 5174 and 5175. Without a table they run on the mouse: the digit keys place an object under the pointer, dragging moves it, the wheel turns it, and backspace lifts it.

To drive it from objects instead, start the simulator this repository carries, in a second terminal:

```bash
npm run simulator
```

It is a TUIO 2.0 tracker on `ws://localhost:3343` and a control page on `http://localhost:3344`, where tokens are placed with a double click and turned with the wheel. Open the application at `http://localhost:5173/?tuio=localhost:3343` and it follows them. The [simulator page](simulator.md) covers the gestures and the Unity simulator of Interactive Scape, the [table page](table.md) covers a real surface.

## The idea

The vocabulary is the same in every application, so a visitor who learned one has learned the others.

- The marker of an object says **what it is**: a resistance, a clamp, a dose, a patient.
- Its angle says **which value it carries**. Pointing away from the person is the reference physiology, turning it to the right raises the value and to the left lowers it.
- Its position says **what it acts on**, where a role needs a target: the vessel, organ or lobe under it.
- Lifting the object **undoes** it. Nothing on this table is permanent.

Touches stay for what touches are good at: moving a panel, scrubbing a time course, switching a mode.

## What runs the model

Nothing in this repository solves a PBPK model of its own. The models, their compiled form, their runtime and their reference solutions are exported by pkpdsim and copied in by `npm run sync`, so what the table shows is what the SBML says. A model that comes from its own repository, like glimepiride, is compiled here by `scripts/export_model.py` with the same release of sbmlsim-core, and nothing else about it is this repository's.

Two kinds of model meet on these tables. The steady pressure network of the circulation has an exact algebraic reduction, so the anatomy answers within a frame, while the lobed liver and glimepiride are integrated with SUNDIALS IDA in a Web Worker on the compiled SBML: the objects stay where they are, the table says it is solving, and the answer replaces the one before it.

## License

* Source code: [MIT](https://opensource.org/license/MIT)
* Documentation: [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)
* The anatomy is adapted from the [EMBL-EBI Expression Atlas anatomograms](https://github.com/ebi-gene-expression-group/anatomogram) under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)

© 2026 [Matthias König](https://livermetabolism.com)
