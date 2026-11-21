# Run the TUIO simulator

The simulator puts tokens and touches on a surface you do not have to own. It is the way these applications are built and the first thing to reach for when a table misbehaves, because it answers the question of whether the table or the application is at fault.

## Get it

The simulator is [InteractiveScapeGmbH/tuio-simulator](https://github.com/InteractiveScapeGmbH/tuio-simulator). It supports TUIO 1.1 and 2.0, UDP and WebSocket, and touches, tokens and mobiles.

```bash
git clone https://github.com/InteractiveScapeGmbH/tuio-simulator.git
```

The repository is a Unity project and publishes no binaries, so there are two ways to run it:

- **A build you were given.** Run it and skip to the settings below.
- **From source.** Open the folder in Unity Hub, let it install the editor version the project asks for, open the only scene and press play. The editor is enough; nothing has to be built to drive a browser on the same machine.

Any other TUIO tracker works as well, as long as it offers the bundles over a WebSocket. [tuio.org](https://tuio.org/) lists them, and the [TUIO page](tuio.md) explains why a browser needs WebSocket rather than the usual UDP.

## Set it up

In the simulator, before pressing start:

| Setting | Value |
| --- | --- |
| TUIO version | **TUIO 2.0** |
| Connection type | **WebSocket** |
| Port | **3343** |

Then press **Start**. The simulator is now a tracker on `ws://localhost:3343`.

Port 3343 is a convention, not a standard: it is the port the Interactive Scape examples use and the default of these applications. Port 3333 is the UDP port of TUIO and will not work from a browser.

## Drive it

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

1. Is the simulator **started**? The settings alone do nothing.
2. Is it on **WebSocket** and **TUIO 2.0**? A simulator on UDP is invisible to a browser, and a TUIO 1.1 stream is ignored by these applications.
3. Do the **ports** match, in the simulator and in the address of the page?
4. Is the browser on the **same machine**? If not, `localhost` is the wrong host: use the address of the machine the simulator runs on, and check that nothing blocks the port.
5. Open the developer console. A failed WebSocket says so there first.
