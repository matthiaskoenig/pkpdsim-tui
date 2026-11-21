# Run the TUIO simulator

The simulator puts tokens and touches on a surface you do not have to own. It is the way these applications are built and the first thing to reach for when a table misbehaves, because it answers the question of whether the table or the application is at fault.

There are two of them: the one in this repository, which needs nothing but the checkout, and the Unity simulator of Interactive Scape, which is the one a table comes with.

## The simulator of this repository

A browser cannot listen on a socket, so this simulator is two halves. The tracker is a small Node process that speaks TUIO 2.0 over a WebSocket, and the surface is a page that process serves, where the tokens are placed and turned. Nothing is built and nothing is installed beyond `npm install`.

```bash
npm run simulator
```

| What | Where |
| --- | --- |
| The tracker | `ws://localhost:3343`, TUIO 2.0 over WebSocket |
| The control page | `http://localhost:3344` |

Open the control page, and open an application at `http://localhost:5173/?tuio=localhost:3343` beside it. The chip at the top of the control page names the tracker and counts the applications listening to it, so it says at once whether the two have found each other.

| Flag | What it is | Default |
| --- | --- | --- |
| `--host` | the interface both servers listen on. `0.0.0.0` lets a browser on another machine connect | `localhost` |
| `--port` | the WebSocket port of the tracker | `3343` |
| `--page-port` | the HTTP port of the control page | `3344` |
| `--rate` | frames per second of a surface nobody is touching | `60` |

The flags come after `--`, because npm takes the ones before it for itself:

```bash
npm run simulator -- --host 0.0.0.0 --rate 30
```

### Drive it

| Gesture | What happens |
| --- | --- |
| Press and drag empty space | A touch, which arrives as a TUIO pointer and lasts as long as the button is down |
| Double click with the left button | Places a token, carrying the marker of the **Next marker** field |
| Press and drag on a token | Moves the token |
| Scroll over a token | Turns it, five degrees at a time, or one with the shift key held |
| Click with the middle button on a token | Lifts the token off the surface |
| **Clear surface** | Lifts everything at once |

Every token on the surface says what a tracker reports about it: its marker, its angle in degrees, its position as the fractions of the surface the protocol sends, and the session id it was given. The **Surface** fields are the sensor size the frame message carries, in pixels, and the surface on the page keeps its aspect ratio, so a position on the page is the position the application draws.

The simulator is a tracker and nothing else. It sends a frame at the rate of the stream and at once when something moves, it never reads anything from an application, and an application that connects in the middle gets the surface as it stands. One control page drives the surface at a time: a second one takes it over and the first says so.

It places tokens and touches, which is what these applications read. The mobile of the Unity simulator, and the bounds and symbols of TUIO 2.0, are not simulated.

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
| Port | **3343** |

Then press **Start**. The simulator is now a tracker on `ws://localhost:3343`.

Port 3343 is a convention, not a standard: it is the port the Interactive Scape examples use and the default of these applications. Port 3333 is the UDP port of TUIO and will not work from a browser.

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
npm run dev
```

Then open `http://localhost:5173/?tuio=localhost:3343`.

The address of the tracker is `?tuio=host:port`. A bare `?tuio` means `localhost:3343`. Without the parameter the application runs on the mouse and ignores the tracker.

The panel in the corner of the table names the tracker and its state:

| What it says | What it means |
| --- | --- |
| `ws://localhost:3343` with a teal dot | Bundles are arriving |
| An amber dot | The socket is open and the first frame has not arrived |
| A red dot, "No tracker answers" | Nothing is listening on that port. The simulator is not started, or it is on UDP, or on another port |
| A red dot, "closed the connection" | The tracker was there and went away. Start it and reload |

The reference circulation stays on screen while a tracker is missing, so a failed connection shows an idle table rather than an empty one.

## When nothing arrives

1. Is the simulator **started**? The settings alone do nothing, and `npm run simulator` says where it is listening.
2. Is it on **WebSocket** and **TUIO 2.0**? A simulator on UDP is invisible to a browser, and a TUIO 1.1 stream is ignored by these applications.
3. Do the **ports** match, in the simulator and in the address of the page? A port that is taken stops `npm run simulator` with the reason.
4. Is the browser on the **same machine**? If not, `localhost` is the wrong host: use the address of the machine the simulator runs on, start it with `--host 0.0.0.0`, and check that nothing blocks the port.
5. Open the developer console. A failed WebSocket says so there first.
