# pkpdsim-tui
[![release](https://img.shields.io/github/v/release/matthiaskoenig/pkpdsim-tui?color=2f6fd0)](https://github.com/matthiaskoenig/pkpdsim-tui/releases)
[![ci](https://github.com/matthiaskoenig/pkpdsim-tui/actions/workflows/ci.yml/badge.svg)](https://github.com/matthiaskoenig/pkpdsim-tui/actions/workflows/ci.yml)
[![documentation](https://github.com/matthiaskoenig/pkpdsim-tui/actions/workflows/docs.yml/badge.svg)](https://github.com/matthiaskoenig/pkpdsim-tui/actions/workflows/docs.yml)
[![Documentation](https://img.shields.io/badge/docs-pkpdsim--tui-3f51b5.svg)](https://matthiaskoenig.github.io/pkpdsim-tui)
[![TUIO](https://img.shields.io/badge/TUIO-1.1%20%7C%202.0-00897b.svg)](https://tuio.org/)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](https://opensource.org/license/MIT)

Four tables you can touch, built on the PBPK/PD models of [pkpdsim](https://github.com/matthiaskoenig/pkpdsim). Put a physical object on a multitouch table, turn it, and the model answers: the blood pressure changes, the liver grows back, the drug moves through the body. The input is [TUIO](https://tuio.org/), the protocol of tangible surfaces. A mouse works too, so everything runs on a laptop as well.

![The body, with the four tables around it](docs/images/body.png)

The tables are the circulation, liver surgery, a drug through the body, and a liver on a perfusion machine. Everything is one application: it opens on the body of the person at the table, with the four tables on a ring around it. An object says what it is by its marker, which value it carries by its angle, and what it acts on by where it lies. Each table speaks English, German and Spanish, at three levels, and reads itself aloud.

![The circulation table, with two objects on the glass](docs/images/cardiovascular.png)

## Documentation

[matthiaskoenig.github.io/pkpdsim-tui](https://matthiaskoenig.github.io/pkpdsim-tui)

| Page | What it is for |
| --- | --- |
| [The applications](https://matthiaskoenig.github.io/pkpdsim-tui/apps/) | The four tables, what a visitor chooses, and how a table behaves under a hand |
| [Run on a table](https://matthiaskoenig.github.io/pkpdsim-tui/table/) | Install it, and run it at a booth with a real table and real objects |
| [Run the simulator](https://matthiaskoenig.github.io/pkpdsim-tui/simulator/) | The same on a laptop, where the objects are placed with a mouse |
| [Development](https://matthiaskoenig.github.io/pkpdsim-tui/development/) | The layout of the repository, the two apps, the tests and the releases |
| [Languages and the voice](https://matthiaskoenig.github.io/pkpdsim-tui/languages/) | Where the words are and how the clips are recorded |

## License

* Source code: [MIT](https://opensource.org/license/MIT)
* Documentation: [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)
* Models: the license of the model repository they come from

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.

© 2026 [Matthias König](https://livermetabolism.com)
