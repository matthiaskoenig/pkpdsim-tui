# pkpdsim-tui
[![release](https://img.shields.io/github/v/release/matthiaskoenig/pkpdsim-tui?color=2f6fd0)](https://github.com/matthiaskoenig/pkpdsim-tui/releases)
[![ci](https://github.com/matthiaskoenig/pkpdsim-tui/actions/workflows/ci.yml/badge.svg)](https://github.com/matthiaskoenig/pkpdsim-tui/actions/workflows/ci.yml)
[![documentation](https://github.com/matthiaskoenig/pkpdsim-tui/actions/workflows/docs.yml/badge.svg)](https://github.com/matthiaskoenig/pkpdsim-tui/actions/workflows/docs.yml)
[![Documentation](https://img.shields.io/badge/docs-pkpdsim--tui-3f51b5.svg)](https://matthiaskoenig.github.io/pkpdsim-tui)
[![TUIO](https://img.shields.io/badge/TUIO-1.1%20%7C%202.0-00897b.svg)](https://tuio.org/)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](https://opensource.org/license/MIT)

Four tables you can touch, built on the PBPK/PD models of [pkpdsim](https://github.com/matthiaskoenig/pkpdsim). Put a physical object on a multitouch table, turn it, and the model answers: the blood pressure changes, the liver grows back, the drug moves through the body. The input is [TUIO](https://tuio.org/), the protocol of tangible surfaces. A mouse works too, so everything runs on a laptop as well.

![The body, with the four tables around it](docs/images/body.png)

The tables are the circulation, liver surgery, a drug through the body, and a liver on a perfusion machine. Each speaks English, German and Spanish, at three levels, and reads itself aloud.

![The circulation table, with two objects on the glass](docs/images/cardiovascular.png)

## Quick start

```bash
npm install                  # and the resources of the release, about 50 MB
npm run dev                  # http://localhost:5173
```

That is the whole of it: no checkout of pkpdsim beside this one and nothing to compile. The compiled models, their reference data and the clips the tables read aloud are not in the repository, because a model is written by pkpdsim and the voice is 2253 clips of three languages, so they travel with a release instead, as two archives. `npm install` takes the ones of the release this checkout is, and `npm run assets` is the same said out loud, for a machine which was not on the network at install. A checkout which writes the models itself, from pkpdsim, is what `npm run sync` and the export commands are for, see [Development](https://matthiaskoenig.github.io/pkpdsim-tui/development/).

That one port carries the application, the TUIO simulator at `/simulator/` and the tracker at `/tuio`. Use another port with `npm run dev -- --port 8080`, and `npm run dev -- --help` lists the rest. Linux, macOS and Windows all run it.

## On a real table

```bash
npm run table
# then open http://localhost:5173/
```

That is the table of this exhibition, written down once in `package.json`:

```bash
node scripts/dev.mjs --no-simulator --tuio 10.0.0.20:3343 --ids 1,3,5,6,11,12,21
```

`--no-simulator` leaves the simulator out, because the table is the tracker; `--tuio` is where that tracker listens, which the server then carries at `/tuio`; `--ids` are the ids printed on the pucks of the table, in the order the objects of a table are picked up, so the nth object of every table is read from the nth id. Every page the table serves is given both, so its address carries nothing and there is one place to change either. [Run on a table](https://matthiaskoenig.github.io/pkpdsim-tui/table/) has the whole of it.

## Documentation

[matthiaskoenig.github.io/pkpdsim-tui](https://matthiaskoenig.github.io/pkpdsim-tui) covers how to run it, the four tables, the simulator, a real table, the languages and the voice, and how the code is laid out.

## License

* Source code: [MIT](https://opensource.org/license/MIT)
* Documentation: [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)
* Models: the license of the model repository they come from

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.

© 2026 [Matthias König](https://livermetabolism.com)
