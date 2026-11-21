# Run on a table

A multitouch table with object recognition is a browser, a tracker and a sheet of glass. The browser is the only part these applications know about.

## The surface

The tables of [Interactive Scape](https://www.interactive-scape.com/) recognise objects capacitively: the markers are passive and are read through the glass, with no camera below the table and no light of their own. The table reports them over TUIO, which is what makes a browser enough to write a table application. [DISPLAX](https://www.displax.com/) and the SUR40 bridges emit TUIO as well, and anything else that offers TUIO 2.0 over a WebSocket will work.

The sensor reports its own size in each frame, so an application does not have to be told the resolution of the surface, and positions arrive as fractions of it rather than in pixels.

## Point the browser at the tracker

Find the WebSocket host and port of the table in its own configuration, then open the application with them:

```
http://<the machine that serves the application>:5173/?tuio=<table host>:<table port>
```

That address is the body, from which a visitor opens a table; `&app=cardiovascular` opens one of them at once, which is what a booth with one subject uses. If the browser runs on the table itself, the host is `localhost`. Start with the [simulator settings](simulator.md), which is the same protocol on the same port.

A page which is told about a tracker this way listens to it alone, so a stray mouse on the machine cannot put objects on the surface of an exhibition. A page which is told nothing looks for a tracker behind its own server at `/tuio` and otherwise runs on the mouse, which is what the development server and a deployed build respectively give you.

## One side of the table

Everything a table draws is upright for the people standing at the edge the panel is in: the panel in the corner, the band of numbers along that edge, the cards of the tables on the body, and the card beside every object. Nothing is drawn twice.

That is a decision about what these tables are for. A booth has a front, and the room that a second, upside down copy of every number would take goes to the body instead. A table that people are meant to stand around on every side would want the mirrored copies back, which is a layout change in `packages/tui-kit`: the panel, the band and the card of an object are each drawn in one place.

## Choosing, and going back

A table has no click, so everything which is pressed rather than turned is pressed by **resting a finger on it**: a card on the landing page, the organ the card points at, a switch in the panel, or **Back**, which every table carries above its title and which returns to the landing page. The element fills while the finger is on it, so that holding is visibly doing something, and lifting the finger before it is full cancels it. A hand sweeping across the glass opens nothing.

The landing page carries no panel: a heading, two lines of what the table is for, the two reference bodies and the five tables around them. Touching a body is what every table is then solved for. What a card is, and what a body is, waits behind it as a note.

## What a visitor is told

Each table says the little that is needed at a glance, and keeps the rest behind the thing it belongs to. Hovering a number, an object, an organ or a card with a mouse, or resting a finger on it for a moment at the table, opens a note that says what it is: what a portal pressure means, what the object in somebody's hand does, how much blood an organ is getting.

The objects say what they are as well. Inside the ring of an object is a picture of the thing it stands for, and the picture answers while the object is turned: a vessel narrows as its resistance goes up, a heart beats at the rate the dial is set to, a tablet fills, a clock hand walks through the days after an operation.

## Full screen

A table has no keyboard and no browser chrome. Start Chrome in kiosk mode on the page:

```bash
google-chrome --kiosk --noerrdialogs --disable-pinch --overscroll-history-navigation=0 \
  --app="http://localhost:4173/?tuio=localhost:3333"
```

Serve the built application rather than the development server:

```bash
npm run build
npm run preview
```

The build under `apps/table/dist` is self contained, every table with its models and its runtime, so it can be copied to the machine that drives the table and served by anything. Nothing it needs is on the network. `npm run preview` serves it on 4173 and starts the simulator beside it; `npx vite preview --port 4173 apps/table` serves it alone.

Also worth doing on the machine at a booth: turn off the screen blanking and the screen saver, turn off automatic updates, and disable the system gestures that a stray palm on the glass would otherwise trigger.

## Assign the markers

Every table names the markers it reads, and the tables share them: the [circulation](apps/cardiovascular.md) uses 1 to 6, four resistances and the two of the heart, the [lobed liver](apps/lobes.md) 5 to 8, two clamps, the scalpel and the day dial, and [glimepiride](apps/glimepiride.md) 1 to 5 and 8. An object means whatever the table that is open reads it as, so one set of pucks serves all of them.

Put the marker on the underside of a puck, and put a label and an arrow on the top. The angle of the object is the value it carries, so the arrow is not decoration: it is the needle of the dial. An object whose marker nothing claims is drawn on the table as unassigned rather than ignored, which is how a mislabelled puck is found.

## What to check before an audience arrives

1. The body is on the surface, and a finger held on a card opens its table.
2. The panel in the corner shows a teal dot and the address of the table.
3. Every puck is recognised: put each one down in turn and watch its card appear with the right name and its picture inside the ring.
4. Turning a puck moves both the picture inside it and the numbers at the edge.
5. Lifting a puck returns its number to the reference.
6. The panel, the numbers and the cards all read upright from the side the visitors stand at.
7. A finger resting on a number, an organ or an object opens the note behind it.
