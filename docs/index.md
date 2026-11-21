# pkpdsim-tui
[![ci](https://github.com/matthiaskoenig/pkpdsim-tui/actions/workflows/ci.yml/badge.svg)](https://github.com/matthiaskoenig/pkpdsim-tui/actions/workflows/ci.yml) [![documentation](https://github.com/matthiaskoenig/pkpdsim-tui/actions/workflows/docs.yml/badge.svg)](https://github.com/matthiaskoenig/pkpdsim-tui/actions/workflows/docs.yml) [![Documentation](https://img.shields.io/badge/docs-pkpdsim--tui-3f51b5.svg)](https://matthiaskoenig.github.io/pkpdsim-tui) [![TUIO](https://img.shields.io/badge/TUIO-1.1%20%7C%202.0-00897b.svg)](https://tuio.org/) [![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](https://opensource.org/license/MIT)

Tangible table applications of the physiologically based pharmacokinetic and pharmacodynamic (PBPK/PD) models of [pkpdsim](https://github.com/matthiaskoenig/pkpdsim).

The interactive examples in the pkpdsim documentation run in a browser, with sliders and a mouse. On a multitouch table with object recognition the same models become something else: a visitor puts a physical object down, turns it, and the physiology answers. The input is [TUIO](tuio.md), the protocol of tangible interactive surfaces, which the tables of [Interactive Scape](https://www.interactive-scape.com/) and the [TUIO simulator](simulator.md) speak.

Every application also runs without a table, on a mouse and the keyboard, so it can be developed and shown anywhere.

## One application, five tables

Everything here is one application. It opens on the two reference bodies of the pkpdsim physiology, a man and a woman, with the tables arranged around them and a line from each card to the organ its table is about. Touching a card, or the organ it points at, opens that table; touching a body is what every table is then solved for. In a table, **Back** in the panel returns to the bodies, and so does the table switch beside it. One build, one address, one port.

| Table | Opened by | State | What the objects do |
| --- | --- | --- | --- |
| [Cardiovascular circulation](apps/cardiovascular.md) | `?app=cardiovascular` | prototype | Four resistance objects on an anatomy, hepatic, systemic, portal and renal, and two for the heart itself, which beats on the table while they are moved. |
| [The liver](apps/liver.md) | `?app=liver` | prototype | The gut and the liver itself as two resistances: where the two blood supplies of the liver come from, and what one lobule of it is served with. |
| [Lobed liver](apps/lobes.md) | `?app=lobes` | prototype | A clamp on a segment is a portal vein ligation, the scalpel is a resection, and a dial winds the days of the regeneration that follows. |
| [Glimepiride](apps/glimepiride.md) | `?app=glimepiride` | prototype | The dose, the CYP2C9 genotype, the liver, the kidneys and the body weight of one individual, each on its own dial. |
| [Machine perfusion](apps/perfusion.md) | `?app=perfusion` | prototype | The pump, the oxygen and the temperature of a liver kept alive outside the body, and a dial through the hours of the perfusion. |

The three liver tables are one story, which [The liver](apps/liver.md) is the way into: a liver with two blood supplies which sees the food first, a liver which takes drugs apart, a liver which can be cut and grows back, and a liver which stays alive on a machine when it is outside the body.

## Quick start

```bash
git clone https://github.com/matthiaskoenig/pkpdsim-tui.git
cd pkpdsim-tui
npm install
npm run sync      # copies the exported models and reference data of a pkpdsim checkout
npm run dev
```

`npm run dev` starts the application and the [TUIO simulator](simulator.md) together, and serves both on one port. The application finds the tracker of that server by itself, so there is nothing to add to its address:

| Address | What it is |
| --- | --- |
| `http://localhost:5173/` | The two bodies, from which every table is opened |
| `http://localhost:5173/?app=cardiovascular` | One table directly; `liver`, `lobes`, `glimepiride` and `perfusion` are the others |
| `http://localhost:5173/simulator/` | The simulator, with the application under its own surface |
| `http://localhost:5173/simulator/?table=cardiovascular` | The same, opened on one table |

### Which one do I want?

| What you want to see | What to run | What to open |
| --- | --- | --- |
| The application alone, driven by the mouse | `npm run dev:app` | `http://localhost:5173/` |
| The objects of a table, on a surface you do not have to own | `npm run dev` | `http://localhost:5173/simulator/` |
| The application as it will stand on the table, with the objects beside it | `npm run dev` | `http://localhost:5173/` in one window, `http://localhost:5173/simulator/` in another |
| The built application, as it will be deployed | `npm run build && npm run preview` | `http://localhost:4173/` |
| A real table | `npm run build`, serve `apps/table/dist` | `http://<server>/?tuio=<table host>:<table port>`, see [Run on a table](table.md) |

Both the mouse and the objects work while `npm run dev` is running: the digit keys place an object under the pointer, dragging moves it, the wheel turns it, backspace lifts it, and escape leaves a table for the body, while the simulator puts its own objects on the same surface. On the surface of the simulator the objects are placed with a double click and turned with the wheel. `?tuio=off` keeps a page on the mouse alone, and `?tuio=<host>:<port>` points it at a tracker somewhere else.

Because everything is on one port, a table on another machine is one forwarded port:

```bash
ssh -L 5173:localhost:5173 <machine>
```

The addresses above then work in the browser at home. The [simulator page](simulator.md) covers the gestures and the Unity simulator of Interactive Scape, the [table page](table.md) covers a real surface.

## The idea

The vocabulary is the same in every application, so a visitor who learned one has learned the others.

- The marker of an object says **what it is**: a resistance, a clamp, a dose, a patient.
- Its angle says **which value it carries**. Pointing away from the person is the reference physiology, turning it to the right raises the value and to the left lowers it.
- Its position says **what it acts on**, where a role needs a target: the vessel, organ or lobe under it.
- Lifting the object **undoes** it. Nothing on this table is permanent.

Touches stay for what touches are good at: moving a panel, scrubbing a time course, switching a mode. A table has no click, so a touch chooses by **resting**: a finger which stays on a card, a switch or the way back for a moment presses it, and the element fills while the finger is there so that holding is visibly doing something. Two switches every table carries are which table this is and whose body it is, male or female, because neither is a value a dial holds: one is another table and the other is a different export of the model. The body holds across a switch, so the circulation, the liver and the drug are solved for the same person.

Each table also says in words what it is and what it is showing. One panel, in the corner of the edge the visitors stand at, carries the title, a reading of the state the objects have put the body in, which changes as they are moved, and two things worth trying. The numbers at the edge are for whoever wants them; the sentence is for everybody else.

Everything that is not needed at a glance waits behind the element it belongs to: hovering a number, an object, an organ or a card with the mouse, or resting a finger on it at the table, opens a note that says what it is. That is what keeps the surface short enough to read in a room full of people.

## On show

The table is made for a visitor who has a minute, not for a reader. What that costs the design:

- **A landing page with nothing on it but the invitation.** A heading, two lines of what this is, the two bodies, and the five tables around them. No panel, no legend, no status: those belong to a table which is already open.
- **One side.** Everything is upright for the people at the panel's edge. Nothing is drawn twice, and the room that saves goes to the body.
- **A card per object.** An object carries a picture of what it is, and the picture answers while it is turned: a vessel narrows, a heart beats at the rate it is set to, a clock hand walks through the days after an operation.
- **Short words, with more behind them.** Two things to try, one sentence of state, and a note on everything else for whoever asks for it.
- **Nothing is permanent.** Lifting an object undoes it, and every table is one touch away from the body it belongs to.

## What runs the model

Nothing in this repository solves a PBPK model of its own. The models, their compiled form, their runtime and their reference solutions are exported by pkpdsim and copied in by `npm run sync`, so what the table shows is what the SBML says. A model that comes from its own repository, like glimepiride, is compiled here by `scripts/export_model.py` with the same release of sbmlsim-core, and nothing else about it is this repository's.

Two kinds of model meet on these tables. The steady pressure network of the circulation has an exact algebraic reduction, so the anatomy answers within a frame, while the lobed liver and glimepiride are integrated with SUNDIALS IDA in a Web Worker on the compiled SBML: the objects stay where they are, the table says it is solving, and the answer replaces the one before it.

## License

* Source code: [MIT](https://opensource.org/license/MIT)
* Documentation: [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)
* The anatomy is adapted from the [EMBL-EBI Expression Atlas anatomograms](https://github.com/ebi-gene-expression-group/anatomogram) under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)

© 2026 [Matthias König](https://livermetabolism.com)
