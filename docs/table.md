# Run on a table

A multitouch table with object recognition is a browser, a tracker and a sheet of glass. The browser is the only part these applications know about. This page is the whole of a booth: what to install, how to start it, and what to check before an audience arrives.

## Install it

```bash
git clone https://github.com/matthiaskoenig/pkpdsim-tui.git
cd pkpdsim-tui
npm install
```

That is all of it: no checkout of pkpdsim beside this one and nothing to compile. Node 24 or newer, and Linux, macOS and Windows all run it.

The install takes the resources of the table with it: the compiled models of the four tables, their reference data and the clips they read aloud, about 50 MB, from the release this checkout is. They are not in the repository, because a model is written by pkpdsim and the voice is 2253 clips of three languages, so a clone which carried them would grow by all of it again at every release. `npm run assets` takes them again, for a machine which was not on the network at install, and a table which finds no model of its own says that one command. How the archives of a release are written is in [Development](development.md#the-resources-of-a-release).

## Start it

A real table brings two things of its own: the tracker it reports its objects over, and the markers whose ids are printed on its pucks. Both belong to the booth and not to a visitor, so both are said once, in the command of the table, and starting it is the whole of it:

!!! tip "The command for a real table"

    ```bash
    npm run table
    ```

    Then open the address, which carries nothing at all:

    ```
    http://localhost:5173/
    ```

`npm run table` is the table of this exhibition, written down once in `package.json`:

```bash
node scripts/table.mjs --tuio 10.0.0.20:3343 --ids 5,6,11,12,21,22
```

| What it carries | How it is said | This exhibition |
| --- | --- | --- |
| The tracker of the table | `--tuio <host:port>` | `10.0.0.20:3343`, which the server carries at `/tuio` |
| The objects of the table | `--ids <list>` | `5,6,11,12,21,22`, the ids printed on the six pucks |
| The port of the table | `--port <port>` | `5173`, which carries the tracker with it |

Another table is the same command with its own two, either written into `package.json` or said to the script itself:

```bash
node scripts/table.mjs --tuio 10.0.0.21:3343 --ids 2,4,8,9,14,15,22
```

`npm run table` is that line with the two of this exhibition in it. An option is said to `scripts/table.mjs` rather than to `npm run table`, because npm keeps the flags of a command for itself: the booth types no `--`.

The address a visitor is handed is the body, from which they open a table; `?app=cardiovascular` opens one at once, which is what a booth with one subject uses. Because the table is said to the server and not to the address, there is one place to change it and nothing to keep in step: the page a visitor is handed, the page a table opens again after a visit, and a page somebody typed are all the same table. A page may still name a tracker or a list of ids of its own, with `?tuio=` and `?ids=` below, which is how a second table on the same server or another set of pucks is tried without stopping the booth.

A built page for a booth of its own takes the same two over the environment, where the launcher is not what starts it:

```bash
TUIO_TABLE_TRACKER=10.0.0.20:3343 TUIO_TABLE_IDS=5,6,11,12,21,22 npm run build
```

A booth starts the table and nothing else. The [simulator](simulator.md) is an app of its own, for a laptop which has no glass.

### The ports

| Port | App | What listens there |
| --- | --- | --- |
| `5173` | table | The table: the body, and a table with `?app=` |
| `5173/tuio` | table | The tracker of the table, carried by the server of the table |
| `3344` | simulator | The control page, with the table under its surface |
| `3333` | simulator | The tracker of the simulator |

One port is the whole booth, which is also how a table is driven from another machine:

```bash
ssh -L 5173:localhost:5173 <machine>
```

## The surface

The tables of [Interactive Scape](https://www.interactive-scape.com/) recognise objects capacitively: the markers are passive and are read through the glass, with no camera below the table and no light of their own. The table reports them over TUIO, which is what makes a browser enough to write a table application. [DISPLAX](https://www.displax.com/) and the SUR40 bridges emit TUIO as well, and anything else that offers TUIO 2.0 over a WebSocket will work. The sensor reports its own size in every frame, so positions arrive as fractions of the surface rather than in pixels.

## Point the browser at the tracker

Find the WebSocket host and port of the table in its own configuration, and give them to the `--tuio` of `npm run table` above. A page which belongs to no booth can be pointed at one by its own address instead:

```
http://<the machine that serves the application>:5173/?tuio=10.0.0.20:3343
```

If the browser runs on the table itself, the host is `localhost`. Start with the [simulator settings](simulator.md), which is the same protocol on the same port.

A page told about a tracker this way listens to it alone, so a stray mouse cannot put objects on the surface of an exhibition. A page told nothing looks for a tracker behind its own server at `/tuio`: a server started on a table carries the table there and the page waits for it, naming the table itself in the panel and in the sentence it says while the table has not answered; a server which carries the simulator is found the same way, and a page which finds nothing runs on the mouse, which is what a published build does.

## The ids of the markers

The objects of a table are numbered from 1 here: the first object of a table is 1, the second 2, and the same pucks serve all four tables. The markers of a real table carry whatever ids were printed on them, which is `[1, 3, 5, 6, 11, 12, 21]` on one table and something else on the next. The `--ids` of `npm run table` says them, in the order the objects of a table are picked up, and the nth object of every table is then read from the nth id.

The circulation then reads 1, 3 and 5, liver surgery reads 1 and 3, and the drug reads 1, 3, 5, 6, 11 and 12. Every number a visitor sees is the id of the puck in their hand: the one on the card beside an object, the one in the panel, and the one in the sentence which asks for an object. The list is of the table, so every page of that table reads it and nobody has to carry it from one page to the next. A page which is not of a booth, or which is trying another set of pucks, says its own list:

```
http://localhost:5173/?ids=1,3,5,6,11,12,21
```

Give at least as many ids as the table with the most objects needs, which is six, for the drug through the body. The `--ids 5,6,11,12,21,22` of this exhibition is those six pucks: the circulation reads 5, 6 and 11, liver surgery reads 5 and 6, the liver on the machine reads 5, 6, 11 and 12, and the drug through the body reads all six. A list which is not a list of whole numbers, which names one puck twice, or which does not reach as far as the objects of a table is refused at the start, with the reason, rather than left to a visitor who turns an object nothing answers to.

The [simulator](simulator.md) places an object of any id between 1 and 999, so the mapping of a table can be tried before the table is there: `http://localhost:3344/?table=cardiovascular&ids=1,3,5` drives the table under the surface with the same list. On the mouse of a laptop the digit keys follow the order of the list instead of the ids themselves, because 11 and 12 are no keys: the first key is the first object.

## Assign the markers

Every table numbers its markers from 1, so the same objects serve all of them: the [circulation](apps/cardiovascular.md) uses 1 to 3, [liver surgery](apps/lobes.md) 1 and 2, [the drug](apps/glimepiride.md) 1 to 6 and [machine perfusion](apps/perfusion.md) 1 to 4. An object means whatever the open table reads it as.

Put the marker on the underside of a puck, and a label and an arrow on the top. The angle of the object is the value it carries, so the arrow is the needle of the dial. An object whose marker nothing claims is drawn as unassigned rather than ignored, which is how a mislabelled puck is found.

## The size of the picture

The table of an exhibition is 4K and the laptop a table is written on is not, so everything is drawn on one surface, 1920 by 1080, and scaled to the glass it is shown on. A 4K table carries the same picture at twice the size: the same panel in the same corner, the same cards beside the objects, the same lines of the same thickness, the text twice as large. Nothing is set for this, and there is no setting to get wrong.

A window of another shape is laid out for the shape it has rather than stretched: the panel at the edge of a wider surface stands further out, and the body in the middle keeps its proportions. Nothing is let below ten pixels of text, so a window somebody opened beside the simulator is small rather than unreadable.

## One side of the table

Everything is upright for the people standing at the edge the panel is in: the panel in the corner, the band of numbers along that edge, and the card beside every object. Nothing is drawn twice. A booth has a front, and the room a second, upside down copy of every number would take goes to the body instead. A table people stand around on every side would want the mirrored copies back, which is a layout change in `packages/tui-kit`.

## Full screen

A table has no keyboard and no browser chrome. Start Chrome in kiosk mode on the page:

```bash
google-chrome --kiosk --noerrdialogs --disable-pinch --overscroll-history-navigation=0 \
  --autoplay-policy=no-user-gesture-required \
  --app="http://localhost:5173/?lang=de"
```

`--autoplay-policy=no-user-gesture-required` is for the clips: a finger resting on a button is a press of the table and not a gesture the browser counts as an interaction, and without the flag Chrome would hold the first clip of the day back. `&lang=` and `&level=` open the table in the language and at the level a booth starts the day with; the rest of what an address may carry is in [The applications](apps/index.md#the-settings).

The address carries nothing of the table itself: the tracker and the ids are of the server, which is what `npm run table` says. Serve the built application rather than the development server:

```bash
npm run build
npm run table:preview
```

The build under `apps/table/dist` is self contained, every table with its models and its runtime, so it can be copied to the machine that drives the table and served by anything. Nothing it needs is on the network. `npm run table:preview` is `npm run table` with `--preview`, so it serves that build on the one port of the table, 5173, with the tracker and the ids of the booth as before; `npm run preview` is the same without them, and `npx vite preview --port 5173 apps/table` is the build alone.

Also worth doing on the machine at a booth: turn off screen blanking and the screen saver, turn off automatic updates, and disable the system gestures a stray palm on the glass would trigger.

## What to check before an audience arrives

1. The body is on the surface, and a finger held on a disc opens its table.
2. The gear in the corner shows a green dot and the address of the tracker.
3. Every puck is recognised: put each one down in turn and watch its card appear with the right name and its picture inside the ring.
4. Turning a puck moves both the picture inside it and the numbers at the edge.
5. Lifting a puck returns its number to the reference.
6. The panel, the numbers and the cards all read upright from the side the visitors stand at.
7. A finger resting on a number, an organ or an object opens the note behind it.
8. The first screen asks the language, who is looking and who is at the table, and **Restart the table** on the landing page asks all three again.

## When something goes wrong during the day

A table of an exhibition stands for hours with nobody looking after it, so it mends what it can by itself.

**The tracker goes away.** The gear turns red and names what happened, and the page asks the tracker again after a second, then two, then four, then every eight until it answers. The objects on the glass are forgotten while it is gone, because the page no longer knows what is on the surface, and the first bundle of a tracker which came back brings them all. Nobody has to reload anything.

**The table cannot start.** One sentence says so in the language of the visitor, the reason for whoever looks after the table stands small underneath, and the page loads itself again after twenty seconds. A model that was not copied in yet, or a file that did not arrive the first time, fixes itself as soon as it is there.

**An object is not read.** Its id is not in the list the booth was started with: the puck is drawn as unassigned, with its id, so the list of `--ids` can be corrected without walking back to the glass.
