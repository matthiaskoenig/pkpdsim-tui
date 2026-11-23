# pkpdsim-tui
[![ci](https://github.com/matthiaskoenig/pkpdsim-tui/actions/workflows/ci.yml/badge.svg)](https://github.com/matthiaskoenig/pkpdsim-tui/actions/workflows/ci.yml) [![documentation](https://github.com/matthiaskoenig/pkpdsim-tui/actions/workflows/docs.yml/badge.svg)](https://github.com/matthiaskoenig/pkpdsim-tui/actions/workflows/docs.yml) [![Documentation](https://img.shields.io/badge/docs-pkpdsim--tui-3f51b5.svg)](https://matthiaskoenig.github.io/pkpdsim-tui) [![TUIO](https://img.shields.io/badge/TUIO-1.1%20%7C%202.0-00897b.svg)](https://tuio.org/) [![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](https://opensource.org/license/MIT)

Four tables you can touch, built on the PBPK/PD models of [pkpdsim](https://github.com/matthiaskoenig/pkpdsim). A visitor puts a physical object on a multitouch table, turns it, and the model answers: the blood pressure changes, the liver grows back, the drug moves through the body. The input is [TUIO](https://tuio.org/), which the tables of [Interactive Scape](https://www.interactive-scape.com/) and the [simulator](simulator.md) speak. A mouse works too, so everything also runs on a laptop.

![The body, with the four tables around it](images/body.png)

| Table | What a visitor does |
| --- | --- |
| [Follow the blood](apps/cardiovascular.md) | Turns the heart and the vessels of the whole circulation, with the heart beating while they move |
| [The liver grows back](apps/lobes.md) | Cuts a liver the way a surgeon does and watches the days after the operation |
| [One tablet, one day](apps/glimepiride.md) | Gives one person a drug: the dose, the tablets a day, their genotype, their liver and kidneys |
| [A liver without a body](apps/perfusion.md) | Keeps a liver alive on a machine and runs the hours |

Everything is one application: it opens on the body of the person at the table, with the four tables on a ring around it, and each table is reached from there. An object says what it is by its marker, which value it carries by its angle, and what it acts on by where it lies; lifting it undoes it. Every table speaks English, German and Spanish, at three levels, and reads itself aloud.

## Where to go

- **[The applications](apps/index.md)** - the four tables, what a visitor chooses, and how a table behaves under a hand
- **[Run on a table](table.md)** - install it, and run it at a booth with a real table and real objects
- **[Run the simulator](simulator.md)** - the same on a laptop, where the objects are placed with a mouse
- **[Development](development.md)** - the layout of the repository, the two apps, the tests and the releases
- **[Languages and the voice](languages.md)** - where the words are and how the clips are recorded

## License

* Source code: [MIT](https://opensource.org/license/MIT)
* Documentation: [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)
* The anatomy is adapted from the [EMBL-EBI Expression Atlas anatomograms](https://github.com/ebi-gene-expression-group/anatomogram) under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)

© 2026 [Matthias König](https://livermetabolism.com)
