# What TUIO is

TUIO is the protocol these table applications listen to. If you have never met it, this page is enough to work with it; [tuio.org](https://tuio.org/) is the authority for everything beyond it.

## In one paragraph

In the words of its own site, "TUIO is an open framework that defines a common protocol and API for tangible multitouch surfaces". It carries an abstract description of what is happening on an interactive surface: where the fingers are, and where the tagged objects are, how they are turned and which marker each one carries. A tracker, which is the table or a piece of vision software, encodes that state and sends it; a client, which is the application, decodes it and draws something. Neither side knows anything about the other, which is the point: a table from one vendor and an application from somebody else work together because both speak TUIO.

It came out of the [Reactable](http://reactable.com/), the tangible synthesizer built in Barcelona, where it was first implemented inside [reacTIVision](https://github.com/mkalten/reacTIVision), the computer vision tracker that reads fiducial markers from below a translucent table. The protocol was published for anyone to use, and is now a community standard with implementations in C++, Java, C#, Processing, Pure Data, Unity, Rust and JavaScript.

The paper to cite:

> Kaltenbrunner, M., Bovermann, T., Bencina, R., Costanza, E.: TUIO - A Protocol for Table Based Tangible User Interfaces. Proceedings of the 6th International Workshop on Gesture in Human-Computer Interaction and Simulation (GW 2005), Vannes, France, 2005.

## How a message travels

TUIO is encoded as [Open Sound Control](https://opensoundcontrol.stanford.edu/) (OSC), the binary message format from computer music, in bundles. The transport is normally UDP on the default port **3333**, called TUIO/UDP; TCP exists as well.

A browser cannot receive UDP, so a browser application needs the tracker to offer the same bundles over a **WebSocket**. The tables of Interactive Scape and their simulator do exactly that, and the port is chosen in the tracker. The examples of Interactive Scape use **3343**, and so do these applications by default. Port 3333 is the UDP port of the protocol and is never the WebSocket port.

The protocol is one way. The tracker sends, the application listens, and the application never answers. A table does not care whether anybody is looking.

## TUIO 1.1

Two kinds of message carry the state, and nothing announces an arrival or a departure:

```
/tuio/2Dcur source application@address
/tuio/2Dcur alive s_id0 ... s_idN
/tuio/2Dcur set s_id x_pos y_pos x_vel y_vel m_accel
/tuio/2Dcur fseq f_id
```

`set` gives the state of one object, `alive` lists the session ids currently on the surface, and `fseq` numbers the bundle. An application works out that an object has gone by noticing that its session id dropped out of `alive`. A quiet surface keeps sending `alive` and `fseq`, so silence means a dead tracker and not an empty table.

The three two dimensional profiles and their fields:

| Profile | Message | What it is |
| --- | --- | --- |
| Object | `/tuio/2Dobj set s i x y a X Y A m r` | A tagged object: a marker on the surface |
| Cursor | `/tuio/2Dcur set s x y X Y m` | A finger: no identity and no angle |
| Blob | `/tuio/2Dblb set s x y a w h f X Y A m r` | An untagged shape, with its bounding ellipse |

The fields: `s` is the session id, `i` the class id, which is the marker number, `x y` the position, `a` the angle, `X Y` the velocity, `A` the rotation velocity, `m` and `r` the accelerations, `w h` the size and `f` the area.

Two numbers matter for drawing. **Positions are normalized to 0.0 to 1.0** over each axis, so the tracker divides by the sensor size and the application multiplies by the size of its own window. **Angles are 0 to 2 pi**, and a velocity of 1.0 means one full axis length, or one full rotation, per second.

Two ids matter for logic. The **session id** identifies one presence of one object and is thrown away when it is lifted. The **class id** is the marker number and is the same every time that object comes back. Two copies of the same marker on the table share a class id and differ by session id.

## TUIO 2.0

TUIO 2.0 is a redesign, not an extension, and it is what these applications use. It replaces the separate profiles with one namespace and a component model: an object on the surface is a container, identified by its session id, that may carry a **token** (it is tagged), a **pointer** (it is a finger or a stylus), **bounds** (its outline) and a **symbol** (the code that was read off it), in any combination.

The messages, in the order a bundle holds them:

| Message | What it carries |
| --- | --- |
| `/tuio2/frm f_id time dim source` | Opens every bundle. `dim` packs the sensor size, `time` is an OSC time tag |
| `/tuio2/tok s_id tu_id c_id x_pos y_pos angle ...` | A token: a tagged object |
| `/tuio2/ptr s_id tu_id c_id x_pos y_pos angle shear radius press ...` | A pointer: a touch, with its pressure |
| `/tuio2/bnd s_id x_pos y_pos angle width height area ...` | The bounds of an untagged shape |
| `/tuio2/sym s_id tu_id c_id group data` | The symbol read off an object: a fiducial, a data matrix, an RFID tag |
| `/tuio2/alv s_id0 ... s_idN` | Closes every bundle: everything still on the surface |

Three ids, where TUIO 1.1 had two:

- `s_id`, the **session id**, is one presence of one object, and the same session id in a `tok`, a `bnd` and a `sym` message means all three describe the same thing.
- `c_id`, the **component id**, is the marker of a token, and is the field an application reads to know which object it is looking at.
- `tu_id` packs a **type id** and a **user id** into one integer, so a tracker that knows who is touching can say so. A user id of 0 means it does not know.

The sensor size is packed the same way: `dim` holds the width in the first two bytes and the height in the final two, so `640 + 480 * 65536` is a surface of 640 by 480.

Positions are normalized to 0 to 1 and angles are 0 to 2 pi, as in TUIO 1.1. Pointer pressure runs from -1 to 1, where a negative value is a finger hovering above the glass, and a pointer radius is normalized to the height of the sensor.

The TUIO 2.0 specification is dated November 2014, is considered stable and ready to implement, and is still marked as pending formal publication.

## What this repository uses

`packages/tuio-input` speaks TUIO 2.0 over WebSocket, through the [`tuio-client`](https://github.com/InteractiveScapeGmbH/tuio_client_js) package of Interactive Scape. The package ships no WebSocket receiver, so the repository carries one built on [`osc-js`](https://github.com/adzialocha/osc-js), the same twenty lines its README and the `tuio-web-examples` repository use.

The protocol is reduced to one small shape, which is all an application sees:

| TUIO 2.0 | In `packages/tuio-input` |
| --- | --- |
| `Tuio20Object.token` with `cId` | `TableToken.marker` |
| `Tuio20Token.position` | `TableToken.x`, `TableToken.y`, fractions of the sensor |
| `Tuio20Token.angle` | `TableToken.angle` in 0 to 2 pi, and `TableToken.turn`, which keeps counting past it |
| `Tuio20Object.pointer` | `TablePointer`, with its radius and pressure |
| `dim` of `/tuio2/frm` | `TableSnapshot.sensor` |
| `/tuio2/alv` | a session that is no longer in `TableSnapshot.tokens` |

`TableToken.turn` is the one addition. A tracker sends the angle wrapped into 0 to 2 pi, so an object turned past the boundary reads as a jump of almost a full turn backwards. The input layer undoes that by taking the shorter way round between two frames, which is how a knob that is turned twice reports two turns.

The same `TableInput` interface is implemented by the mouse, which is why these applications run on a laptop.

## Where to look next

- [tuio.org](https://tuio.org/) for the specifications of 1.1 and 2.0 and the list of implementations
- [Run the simulator](simulator.md) to put objects on a surface you do not own yet
- [Run on a table](table.md) for a real one
