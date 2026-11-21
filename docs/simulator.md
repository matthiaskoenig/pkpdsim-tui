# Run the TUIO simulator

The simulator puts tokens and touches on a surface you do not have to own. It is the way these applications are built and the first thing to reach for when a table misbehaves, because it answers the question of whether the table or the application is at fault.

There are two of them: the one in this repository, which needs nothing but the checkout, and the Unity simulator of Interactive Scape, which is the one a table comes with.

## The simulator of this repository

A browser cannot listen on a socket, so this simulator is two halves. The tracker is a small Node process that sends a bundle per frame, and the surface is a page that process serves, where the objects are placed and turned. Nothing is built and nothing is installed beyond `npm install`.

```bash
npm run simulator
```

| What | Where |
| --- | --- |
| The tracker | `ws://localhost:3333`, TUIO 2.0 over WebSocket, until the control page says otherwise |
| The control page | `http://localhost:3344` |

Open the control page, and open an application at `http://localhost:5173/?tuio=localhost:3333` beside it, or let the control page show the application under its own surface. The chip at the top of the page names the tracker and counts the applications listening to it, so it says at once whether the two have found each other.

| Flag | What it is | Default |
| --- | --- | --- |
| `--host` | the interface both servers listen on. `0.0.0.0` lets a browser on another machine connect | `localhost` |
| `--port` | the TUIO port of the tracker | `3333` |
| `--tuio` | `2.0` or `1.1` | `2.0` |
| `--transport` | `websocket` or `udp` | `websocket` |
| `--page-port` | the HTTP port of the control page | `3344` |
| `--rate` | frames per second of a surface nobody is touching | `60` |

The flags come after `--`, because npm takes the ones before it for itself:

```bash
npm run simulator -- --host 0.0.0.0 --rate 30
```

### What it speaks, and where

The first three flags are only starting values: the **TUIO**, **Connection** and **Port** fields of the control page change them while the simulator runs, and the tracker is replaced under the applications that are listening. A port that is taken changes nothing and says so in the chip, so the surface in front of an audience does not go down because somebody typed a port.

| Field | What it does |
| --- | --- |
| TUIO | **2.0** sends `/tuio2/frm`, `/tuio2/tok`, `/tuio2/ptr` and `/tuio2/alv`. **1.1** sends the two profiles of the older protocol instead, `/tuio/2Dobj` for the objects and `/tuio/2Dcur` for the touches, each with its own alive, set and fseq messages |
| Connection | **WebSocket** listens, and is the only transport a browser can receive. **UDP** listens to nobody: it sends every frame to the port, as a tracker on a table does, which is how a client that is not a browser is fed |
| Port | 3333, the port of TUIO, for both transports |

A UDP tracker cannot say who is listening, because nothing connects to a sender, so the chip says it is sending and leaves it at that. The applications of this repository read TUIO 2.0 by default and TUIO 1.1 when the address carries `&tuio-version=1.1`, which the control page appends by itself.

### Show the application under the surface

Type the address of an application into the **Application** field and press **Show it under the surface**. The page embeds it, lays it out at the size of the sensor and scales it to the surface on screen, so the objects sit on the picture they drive, as they do on the glass of a table. The address is pointed at this tracker, the version and the port included, and a change of either reloads it.

The embedded application receives no mouse: the surface over it owns the pointer, which is the whole point of the overlay. To use an application with the mouse, open it in a window of its own without `?tuio`.

### Drive it

| Gesture | What happens |
| --- | --- |
| Press and drag empty space | A touch, which arrives as a TUIO pointer and lasts as long as the button is down |
| Double click with the left button | Places an object, carrying the id of the **Next object id** field, which then counts up |
| Double click with the right button | Opens the picker, which places an object of any id without touching the field |
| Press and drag on an object | Moves it |
| Scroll over an object | Turns it, five degrees at a time, or one with the shift key held |
| Click with the middle button on an object | Lifts it off the surface |
| **Clear surface** | Lifts everything at once |

Every object on the surface says what a tracker reports about it: its id, its angle in degrees, its position as the tuple of surface fractions the protocol sends, and the session id it was given. The **Surface** fields are the sensor size the frame message carries, in pixels, and the surface on the page keeps its aspect ratio, so a position on the page is the position the application draws. What was typed into the fields is kept for the next time the page is opened; what is on the surface is not.

The simulator is a tracker and nothing else. It sends a frame at the rate of the stream and at once when something moves, it never reads anything from an application, and an application that connects in the middle gets the surface as it stands. One control page drives the surface at a time: a second one takes it over and the first says so.

It places tokens and touches, which is what these applications read. The mobile of the Unity simulator, the blobs of TUIO 1.1, and the bounds and symbols of TUIO 2.0, are not simulated.

## The simulator of Interactive Scape

The simulator a table comes with is [InteractiveScapeGmbH/tuio-simulator](https://github.com/InteractiveScapeGmbH/tuio-simulator). It supports TUIO 1.1 and 2.0, UDP and WebSocket, and touches, tokens and mobiles.

```bash
git clone https://github.com/InteractiveScapeGmbH/tuio-simulator.git
```

The repository is a Unity project and publishes no binaries, so there are two ways to run it:

- **A build you were given.** Run it and skip to the settings below.
- **From source.** Open the folder in Unity Hub, let it install the editor version the project asks for, open the only scene and press play. The editor is enough; nothing has to be built to drive a browser on the same machine.

Any other TUIO tracker works as well, as long as it offers the bundles over a WebSocket. [tuio.org](https://tuio.org/) lists them, and the [TUIO page](tuio.md) explains why a browser needs WebSocket rather than the usual UDP.

### Set it up

In the simulator, before pressing start:

| Setting | Value |
| --- | --- |
| TUIO version | **TUIO 2.0** |
| Connection type | **WebSocket** |
| Port | **3333** |

Then press **Start**. The simulator is now a tracker on `ws://localhost:3333`.

Port 3333 is the port of TUIO, which the specification names for UDP and which a WebSocket tracker may share: they are different sockets. 3343 is a convention of some WebSocket bridges, and an application reaches one with `?tuio=localhost:3343`. A simulator on **UDP** is invisible to a browser whatever the port is.

The applications read TUIO 1.1 as well, with `&tuio-version=1.1` in the address, so a simulator set to the older protocol is not a dead end.

### Drive it

| Gesture | What happens |
| --- | --- |
| Press and drag | A touch, which arrives as a TUIO pointer |
| Double click with the left button | Places a token. The **Next Object ID** field sets the marker it carries |
| Press and drag on a token | Moves the token |
| Hover over a token and scroll | Turns it. Hold left shift for finer steps |
| Click with the middle button | Removes the token under the pointer |
| Double click with the right button | Places a mobile, which is a TUIO 2.0 object with a random id |

The marker is what an application reads to know what an object is, so set **Next Object ID** before each token. The [cardiovascular application](apps/cardiovascular.md) uses markers 1 to 4.

## Point an application at it

```bash
npm run dev:cardiovascular
```

Then open `http://localhost:5173/?tuio=localhost:3333`.

The address of the tracker is `?tuio=host:port`. A bare `?tuio` means `localhost:3333`, and `&tuio-version=1.1` asks for the older protocol. Without the parameter the application runs on the mouse and ignores the tracker.

The panel in the corner of the table names the tracker and its state:

| What it says | What it means |
| --- | --- |
| `ws://localhost:3333` with a teal dot | Bundles are arriving |
| An amber dot | The socket is open and the first frame has not arrived |
| A red dot, "No tracker answers" | Nothing is listening on that port. The simulator is not started, or it is on UDP, or on another port |
| A red dot, "closed the connection" | The tracker was there and went away. Start it and reload |

The reference circulation stays on screen while a tracker is missing, so a failed connection shows an idle table rather than an empty one.

## When nothing arrives

1. Is the simulator **started**? The settings alone do nothing, and `npm run simulator` says where it is listening.
2. Is it on **WebSocket**? A simulator on UDP is invisible to a browser, whatever the port. Is the **version** the one the address asks for? A TUIO 1.1 stream reaches an application that was opened with `&tuio-version=1.1` and nothing else.
3. Do the **ports** match, in the simulator and in the address of the page? A port that is taken stops `npm run simulator` with the reason.
4. Is the browser on the **same machine**? If not, `localhost` is the wrong host: use the address of the machine the simulator runs on, start it with `--host 0.0.0.0`, and check that nothing blocks the port.
5. Open the developer console. A failed WebSocket says so there first.
