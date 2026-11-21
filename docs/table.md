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

If the browser runs on the table itself, the host is `localhost`. Start with the [simulator settings](simulator.md), which is the same protocol on the same port.

## Full screen

A table has no keyboard and no browser chrome. Start Chrome in kiosk mode on the page:

```bash
google-chrome --kiosk --noerrdialogs --disable-pinch --overscroll-history-navigation=0 \
  --app="http://localhost:4173/?tuio=localhost:3333"
```

Serve the built application rather than the development server:

```bash
npm run build
npx vite preview --port 4173 apps/cardiovascular
```

The build under `apps/cardiovascular/dist` is self contained, models and runtime included, so it can be copied to the machine that drives the table and served by anything. Nothing it needs is on the network.

Also worth doing on the machine at a booth: turn off the screen blanking and the screen saver, turn off automatic updates, and disable the system gestures that a stray palm on the glass would otherwise trigger.

## Assign the markers

Every application names the markers it reads. The [cardiovascular application](apps/cardiovascular.md) uses markers 1 to 4, one for each resistance.

Put the marker on the underside of a puck, and put a label and an arrow on the top. The angle of the object is the value it carries, so the arrow is not decoration: it is the needle of the dial. An object whose marker nothing claims is drawn on the table as unassigned rather than ignored, which is how a mislabelled puck is found.

## What to check before an audience arrives

1. The panel in the corner shows a teal dot and the address of the table.
2. Every puck is recognised: put each one down in turn and watch its card appear with the right name.
3. Turning a puck moves the numbers at both edges of the table.
4. Lifting a puck returns its number to the reference.
5. The numbers at the far edge are upright from that side.
