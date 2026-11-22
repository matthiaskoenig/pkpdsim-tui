# Run the TUIO simulator

The simulator puts objects and touches on a surface you do not have to own. It is how these applications are built, and the first thing to reach for when a table misbehaves, because it says whether the table or the application is at fault.

![The simulator, with the circulation table under its surface](images/simulator.png)

There are two: the one in this repository, which needs nothing but the checkout, and the Unity simulator a table comes with.

## The simulator of this repository

A browser cannot listen on a socket, so this simulator is two halves. The tracker is a small Node process that sends a bundle per frame, and the surface is a page that process serves, where the objects are placed and turned.

```bash
npm run simulator        # the tracker on ws://localhost:3333, the page on http://localhost:3344
```

Open the control page and an application beside it at `http://localhost:5173/?tuio=localhost:3333`, or let the page show the application under its own surface. The chip at the top names the tracker and counts the applications listening, so it says at once whether the two found each other.

| Flag | What it is | Default |
| --- | --- | --- |
| `--host` | The interface both servers listen on. `0.0.0.0` lets a browser on another machine connect | `localhost` |
| `--port` | The TUIO port of the tracker | `3333` |
| `--tuio` | `2.0` or `1.1` | `2.0` |
| `--transport` | `websocket` or `udp` | `websocket` |
| `--page-port` | The HTTP port of the control page | `3344` |
| `--rate` | Frames per second of a surface nobody is touching | `60` |

The flags come after `--`, because npm takes the ones before it for itself: `npm run simulator -- --host 0.0.0.0 --rate 30`.

### Both on one port

`npm run dev` starts the application and the simulator together and serves both on the port of the application, so a whole table is one address:

| Address | What it is |
| --- | --- |
| `http://localhost:5173/` | The application: the body, and a table with `?app=` |
| `http://localhost:5173/simulator/` | The control page, with the application under its own surface |
| `http://localhost:5173/simulator/?table=cardiovascular` | The same, opened on one table |
| `ws://localhost:5173/tuio` | The tracker, which an application reaches with `?tuio=/tuio` |

A page that was not told about a tracker asks the server it came from whether it has one at `/tuio`, and takes it when it does. A page from a build without a tracker, the deployed one for instance, finds nothing there and runs on the mouse. `?tuio=off` keeps a page on the mouse even where a tracker answers.

A tracker found this way does not take the mouse away: the objects of the simulator and the keys of the laptop go on the same surface, so a table can be tried with one hand on the mouse while the simulator stands beside it. A tracker the address names is a real table, and there the page listens to the table alone.

One port is one forwarded port, which is how a table is driven from another machine: `ssh -L 5173:localhost:5173 <machine>`. The **Port** field of the page still moves the tracker, but the one port carries the tracker it was started with, so change that field only when an application is pointed at the tracker directly. `npm run dev -- --tuio-port 3343` moves both ends at once.

### What it speaks

The **TUIO**, **Connection** and **Port** fields change the tracker while it runs, and it is replaced under the applications that are listening. A port that is taken changes nothing and says so in the chip, so a surface in front of an audience does not go down because somebody typed a port.

| Field | What it does |
| --- | --- |
| TUIO | **2.0** sends `/tuio2/frm`, `/tuio2/tok`, `/tuio2/ptr` and `/tuio2/alv`. **1.1** sends `/tuio/2Dobj` and `/tuio/2Dcur` instead |
| Connection | **WebSocket** listens, and is the only transport a browser can receive. **UDP** sends every frame to the port, as a tracker on a table does |
| Port | 3333, the port of TUIO, for both transports |

A UDP tracker cannot say who is listening, because nothing connects to a sender, so the chip says it is sending and leaves it there. The applications read TUIO 2.0 by default and TUIO 1.1 when the address carries `&tuio-version=1.1`, which the control page appends by itself.

### Show the application under the surface

Type the address of an application into the **Application** field and press **Show it under the surface**. The page embeds it, lays it out at the size of the sensor and scales it to the surface on screen, so the objects sit on the picture they drive. The address is pointed at this tracker, version and port included, and a change of either reloads it.

The embedded application gets no mouse: the surface over it owns the pointer. To use an application with the mouse, open it in a window of its own.

With an application underneath, an object is not a numbered disc. The table says what it reads on it, and the surface draws it: the name, the value and the picture of the thing itself, which grows as the object is turned up. An object whose number the open table does not read keeps a dashed amber ring, which is how a mislabelled puck is found without walking to the table. The table posts this to the page that embeds it and to nothing else, and nothing travels the other way, so the surface is still a tracker.

### Drive it

| Gesture | What happens |
| --- | --- |
| Click empty space | A tap: the touch stays down long enough for the table to take it as a choice |
| Press and hold empty space | A finger at rest, which is what presses a card or a switch on a table |
| Press and drag empty space | A finger moving across the glass |
| Double click, left button | Places an object carrying the **Next object id**, which then counts up |
| Double click, right button | Opens the picker, which places an object of any id |
| Press and drag on an object | Moves it |
| Scroll over an object | Turns it, five degrees at a time, or one with shift held |
| Middle click on an object | Lifts it off the surface |
| **Clear surface** | Lifts everything at once |
| **Full screen** | The surface alone, for a demonstration |

A table has no click. A finger that rests on a card, a switch or **Back** presses it after a moment, and the element fills while the finger is there. The three kinds of touch are three colours on the surface, teal, amber and blue, with a legend beside the gestures.

Every object says what a tracker reports about it: its id, its angle in degrees, its position as the tuple of surface fractions the protocol sends, and its session id. The **Surface** fields are the sensor size the frame message carries, and the surface keeps its aspect ratio, so a position on the page is the position the application draws. The fields are kept for the next time the page is opened; what is on the surface is not.

The rail on the left keeps what happened, newest first: every object put down, turned, moved and taken off, every touch, and on its own line what the table made of each change. Turning one object folds into the line it rewrites, so a long turn is one entry and not forty. That is the quickest way to see where a disagreement is. An object that was turned with no reading under it is a table that did not hear the tracker; a reading that does not move is a table that heard it and did not believe it.

The simulator sends a frame at the rate of the stream and at once when something moves, never reads anything from an application, and gives an application that connects in the middle the surface as it stands. One control page drives the surface at a time; a second one takes it over and the first says so. It places objects and touches, which is what these applications read. The mobiles of the Unity simulator, the blobs of TUIO 1.1 and the bounds and symbols of TUIO 2.0 are not simulated.

## The simulator of Interactive Scape

The simulator a table comes with is [InteractiveScapeGmbH/tuio-simulator](https://github.com/InteractiveScapeGmbH/tuio-simulator). It supports TUIO 1.1 and 2.0, UDP and WebSocket, and touches, tokens and mobiles. The repository is a Unity project and publishes no binaries, so either run a build you were given, or open the folder in Unity Hub, open the only scene and press play. The editor is enough.

Before pressing **Start**, set TUIO version **2.0**, connection type **WebSocket** and port **3333**. The simulator is then a tracker on `ws://localhost:3333`. Port 3333 is the port of TUIO, which the specification names for UDP and which a WebSocket tracker may share: they are different sockets. A simulator on UDP is invisible to a browser whatever the port is.

Double clicking places a token, the **Next Object ID** field sets the marker it carries, dragging moves it and scrolling over it turns it. The marker is what an application reads to know what an object is, so set the field before each token. Every table numbers its objects from 1: the [circulation](apps/cardiovascular.md) uses 1 to 3, [liver surgery](apps/lobes.md) 1 and 2, [the drug](apps/glimepiride.md) 1 to 6 and [machine perfusion](apps/perfusion.md) 1 to 4.

Any other TUIO tracker works too, as long as it offers the bundles over a WebSocket. [tuio.org](https://tuio.org/) lists them, and the [TUIO page](tuio.md) explains why a browser needs WebSocket rather than UDP.

## Point an application at it

| What it says | Which tracker |
| --- | --- |
| `?tuio` | `ws://localhost:3333`, the simulator on this machine |
| `?tuio=host:port` | A tracker somewhere else, which is how a [table](table.md) is addressed |
| `?tuio=/tuio` | A tracker behind the server the page came from |
| `?tuio=ws://host:port/path` | A tracker named in full |

`&tuio-version=1.1` asks for the older protocol. The panel in the corner of the table names the tracker and its state: a teal dot means bundles are arriving, amber that the socket is open and the first frame has not come, red that nothing is listening or that the tracker went away. The reference circulation stays on screen while a tracker is missing, so a failed connection shows an idle table rather than an empty one.

## When nothing arrives

1. Is the simulator **started**? The settings alone do nothing, and `npm run simulator` says where it is listening.
2. Is it on **WebSocket**? A simulator on UDP is invisible to a browser. Is the **version** the one the address asks for?
3. Do the **ports** match, in the simulator and in the address of the page? A port that is taken stops `npm run simulator` with the reason.
4. Is the browser on the **same machine**? If not, use the address of that machine, start the simulator with `--host 0.0.0.0`, and check that nothing blocks the port.
5. Open the developer console. A failed WebSocket says so there first.
