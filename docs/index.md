# pkpdsim-tui

Tangible table applications of the physiologically based pharmacokinetic and pharmacodynamic (PBPK/PD) models of [pkpdsim](https://github.com/matthiaskoenig/pkpdsim).

The interactive examples in the pkpdsim documentation run in a browser, with sliders and a mouse. On a multitouch table with object recognition the same models become something else: a visitor puts a physical object down, turns it, and the physiology answers. The input is [TUIO](tuio.md), the protocol of tangible interactive surfaces, which the tables of [Interactive Scape](https://www.interactive-scape.com/) and the [TUIO simulator](simulator.md) speak.

Every application also runs without a table, on a mouse and the keyboard, so it can be developed and shown anywhere.

## The applications

| Application | State | What the objects do |
| --- | --- | --- |
| [Cardiovascular circulation](apps/cardiovascular.md) | prototype | Four resistance objects on an anatomy: hepatic, systemic, portal and renal. |
| Liver lobes | planned | A clamp on a portal branch is a portal vein ligation, a cut is a hepatectomy. |
| Glimepiride | planned | A dose object and a patient object on the digital twin of the glimepiride model. |

## Quick start

```bash
git clone https://github.com/matthiaskoenig/pkpdsim-tui.git
cd pkpdsim-tui
npm install
npm run sync      # copies the exported models and reference data of a pkpdsim checkout
npm run dev
```

The application opens on `http://localhost:5173`. Without a table it runs on the mouse: keys 1 to 4 place an object under the pointer, dragging moves it, the wheel turns it, and backspace lifts it.

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

Nothing in this repository solves a PBPK model of its own. The models, their compiled form, their runtime and their reference solutions are exported by pkpdsim and copied in by `npm run sync`, so what the table shows is what the SBML says. For the cardiovascular circulation the steady pressure network has an exact algebraic reduction, which is why the anatomy answers while a hand is still on an object.

## License

* Source code: [MIT](https://opensource.org/license/MIT)
* Documentation: [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)
* The anatomy is adapted from the [EMBL-EBI Expression Atlas anatomograms](https://github.com/ebi-gene-expression-group/anatomogram) under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)

© 2026 [Matthias König](https://livermetabolism.com)
