# pkpdsim-tui: design

## Intent

The interactive examples of pkpdsim run in a browser with sliders and a mouse. The same models become something else on a multitouch table with object recognition: a person puts a physical object on the table, twists it, and the physiology answers. `pkpdsim-tui` is the repository of those table applications. It holds the tangible user interface (TUI) layer, the table applications themselves, and the documentation needed to run them on a [Interactive Scape](https://www.interactive-scape.com/) table or in the [TUIO simulator](https://github.com/InteractiveScapeGmbH/tuio-simulator).

The why: a model a visitor can touch is a model a visitor understands. The audience is the one that stands around a table at a conference booth, a lab open day or a lecture, not the one that reads a documentation page.

## Goals

- Three table applications, in this order: the cardiovascular circulation, the liver lobes (portal vein ligation and hepatectomy), and glimepiride.
- A physical object on the table is the control. Its marker identity is what it does, its position is what it acts on, its angle is the value it carries, and lifting it undoes it.
- The applications run offline on the machine that drives the table. No model server, no internet, no Python at run time.
- The same application runs without a table, on a mouse or a touch screen, so it can be developed and demonstrated anywhere.
- Documentation that someone who has never heard of TUIO can follow: what the protocol is, how to run the simulator, and how to point an application at a real table.

## Non-goals

- Replacing the browser examples in the pkpdsim documentation. Those stay as they are; this repository is their tangible sibling.
- A general purpose TUIO framework. The input layer covers tokens and pointers of TUIO 2.0, which is what the Scape tables emit, and nothing more until a model needs more.
- Fitting, scans or any other part of the pkpdsim workflow. A table application shows a model that has already been built and published.
- Multi user accounts, persistence or telemetry.

## Anti-goals

The following would make the work a failure even if every feature was present.

- An application that needs a network connection, a login or a rebuild at the booth.
- A table application that is the desktop dashboard with bigger buttons. If the physical object is not the control, the point has been missed.
- A copy of the model equations. The models come from pkpdsim as compiled SBML and exported reference data, so what the table shows is what the SBML says.
- Text that only a person standing at one edge of the table can read.

## Constraints

- Input is TUIO 2.0 over WebSocket, the transport the Scape tables and the simulator offer to a browser. The TUIO default port 3333 is the UDP port of the protocol; the WebSocket port is chosen in the tracker, and 3343 is the port the Interactive Scape examples use.
- The client is [`tuio-client`](https://github.com/InteractiveScapeGmbH/tuio_client_js) 0.1.0 from npm. It ships no WebSocket receiver, so the repository carries one built on `osc-js`, as its README and the `tuio-web-examples` repository do.
- Token coordinates arrive normalized to 0..1 of the sensor, the angle in radians. The sensor size arrives packed in the `dim` field of the frame message as two unsigned 16 bit values.
- The models and their runtime come from pkpdsim and are not reimplemented here. For the cardiovascular circulation that is `docs/pbpk/examples/cardiovascular-data.json`, `cardiovascular-anatomy.json` and the compiled model under `solver/`.
- Our own libraries are used at their latest release. For the node packages this means the newest published versions of vite, vitest and typescript.
- Everything a table shows has to survive a token that arrives at a random angle, a marker nobody assigned a meaning to, a token that is lifted mid gesture, and a tracker that never connects.

## Approaches

Three ways of building this were considered.

1. **Vite workspaces with TypeScript, the input layer and the model runtime as packages, one application per folder.** Chosen. `tuio-client` ships ES modules and type declarations and needs `osc-js` as a real dependency, so a bundler is required, and the Interactive Scape web examples are all Vite. Types matter here because the TUIO object model (`Tuio20Object` containing a token, a pointer, bounds or a symbol, each nullable) is easy to get wrong silently.
2. **Plain ES modules with no build step, as the pkpdsim documentation examples do today.** Rejected: it cannot consume `tuio-client` and `osc-js` from npm without vendoring them by hand, and it gives up the type declarations that make the TUIO object model safe to use.
3. **A Python back end that holds the model and talks to the page over a WebSocket.** Rejected: it puts a server between a visitor's hand and the picture, and an application that needs a process running elsewhere is the one that fails at a booth.

## How it works

### The input layer

`@pkpdsim-tui/tuio-input` turns TUIO into a snapshot a table application can render.

- A `TableInput` interface: `connect()`, `disconnect()`, a `status`, and a listener that receives a `TableSnapshot` of the tokens and pointers currently on the surface, in normalized coordinates with the sensor size.
- `TuioTableInput` implements it over `tuio-client` and a `WebsocketTuioReceiver` built on `osc-js`.
- `MockTableInput` implements the same interface from mouse, touch and keyboard, so every application runs and is demonstrated without a table. This is not a test double; it is how the application is used on a laptop.
- The parts that carry the logic are pure functions and are unit tested without a socket: unwrapping an angle across the 2 pi boundary, mapping an angle to a value, resolving a marker identity to a role, and hit testing a position against the anchors of an anatomy.

### The tangible vocabulary

The same vocabulary applies to every application, so a visitor who learned one has learned the others.

- The marker identity (`cId` of a TUIO 2.0 token) selects the **role**: what the object is.
- The **angle** carries the value. A role maps the angle either absolutely, so the orientation of the object is the value and a printed arrow on the puck points at it, or relatively, so the value changes by how far it is twisted from where it was put down. Absolute is the default, because it is reproducible and a visitor can read the state off the table.
- The **position** selects the target where a role needs one: the vessel, organ or lobe under the object, hit tested against the anatomy anchors that pkpdsim already exports for its figures.
- **Removal** restores the reference value of that role. Nothing is permanent and nothing has to be undone by hand.
- Touch stays for what touch is good at: scrubbing a time course, switching a mode, or moving a panel.

The roles of the first three applications: a *patient* (sex, age, body weight), a *clamp* that occludes the vessel or lobe under it, a *drug* whose angle is the dose, and a *lens* that shows the local time course of whatever is under it.

### The model runtime

`@pkpdsim-tui/cardio-sim` holds the model layer of the cardiovascular application.

The steady pressure network of the cardiovascular model has an exact algebraic reduction, which the pkpdsim documentation example already carries as `cardiovascular-model.mjs`. It is ported to TypeScript here and tested against the exported reference solution: the reference controls have to reproduce the portal pressure, the hepatic pressure, the cardiac output and every organ flow of `cardiovascular-data.json`. This is what makes a token twist answer within a frame, which an integration in WebAssembly cannot do.

The compiled SBML heart and the `sbmlsim-core` WebAssembly runtime are the second stage, for the beating heart: the eight exported reference cases play back immediately, and a new combination of controls is integrated in a Web Worker while the pressure network keeps the picture live. The prototype plays back the exported cases; the live integration is the next step and the asset export already carries what it needs.

### The assets

`scripts/sync-assets.mjs` copies the exported runtime, model and reference data of a pkpdsim checkout into the `public/assets/` folder of an application, and records what it copied with the provenance of the data file. The copies are gitignored, so a clone is small, and `npm run sync` restores them. A release of a table application bundles them, because a booth has no checkout.

The proper home of this export is a pkpdsim command, which is how the data is generated in the first place (`scripts/cardiovascular_examples.py`). Until that command exists, the sync script reads a checkout, whose path comes from `PKPDSIM_DIR` or `--pkpdsim`.

### The applications

Every application is a full bleed, dark, full screen page with no browser furniture, laid out for a surface people stand around rather than sit in front of:

- The anatomy in the centre, from the exported silhouette and organ anchors.
- A card next to each token, rotated to the angle of that token, so it is readable from the edge the person who placed it is standing at.
- The headline numbers repeated at opposite edges, one copy rotated by 180 degrees.
- A status chip that names the tracker and says plainly when there is none, with the simulator settings to use.

The cardiovascular application is the prototype: four resistance roles (hepatic, systemic, portal, renal) map one to one onto the four sliders of the existing dashboard, so the whole tangible path is proven without new model work.

### The documentation

A zensical site, as every repository here has, with the pages a newcomer needs: an introduction to TUIO and its history, protocol and message structure; how to run the simulator and point an application at it; how to run on a Scape table; and a page per application that names its roles and markers.

## Left to the builder

- The exact visual language of the scene: colour ramp of perfusion, edge width scale, easing of the animation.
- Whether the scene draws into SVG or a canvas. The anatomy arrives as an SVG path, which argues for SVG.
- The structure of the test files within each package, and the mock input gestures beyond "place, move, twist, lift".
