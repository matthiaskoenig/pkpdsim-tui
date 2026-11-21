# Lobed liver

The liver divided into its segments, and three instruments that act on whatever segment they lie on.

The model is the lobed liver of the pkpdsim PBPK library: each segment has its own portal branch, its own hepatic artery, its own volume and its own share of the drug that passes through. Closing a branch is a portal vein ligation, taking a segment away is a resection, and the days that follow are the regeneration of what is left. The table solves five days of that with SUNDIALS IDA on the compiled SBML, in a Web Worker, every time the instruments on it change.

## Background

A liver is not one organ but eight pieces. Each Couinaud segment has its own branch of the portal vein, its own branch of the hepatic artery and its own way out into the hepatic veins, which is why a surgeon can take one away and leave the rest working. That is what makes a liver tumour operable: the piece that carries it is cut out, and the liver that is left grows until it can do the work of the whole again. In a healthy person it recovers most of its mass within weeks, and the first days are the steep part of that curve.

The limit of such an operation is how much liver is left. A remnant that is too small cannot keep up with what the body asks of it, and the blood that the whole liver used to take now has to pass through a fraction of it, which raises the pressure in the portal vein. Surgeons therefore make the future remnant grow before they operate: they close the portal branch of the side that will be removed, which sends its blood to the other side and makes that side grow, and only then do they resect. That is a portal vein ligation, and it is one object on this table.

Why a pharmacokinetic model cares: the liver is where most drugs are broken down, and the capacity that is left after an operation is the capacity that metabolizes them. The same model carries both, the mass of each piece and the drug that passes through it.

## The objects

| Marker | Object | What it does |
| --- | --- | --- |
| 5 | Portal clamp | Closes the portal branch of the segment under it, which is a portal vein ligation |
| 6 | Arterial clamp | Closes the hepatic artery of the segment under it |
| 7 | Scalpel | Takes the segment under it away, which is a resection |
| 8 | Day after the operation | Winds the days of the course, from the end back to the operation |

The panel also carries two switches a finger touches rather than an object: the body of the individual, male or female, and the species. The female export is the human liver only, so the female body cannot be chosen for the rat or the mouse.

The three instruments carry their meaning in their **position**, not in their angle: the segment they lie on is the one they act on, and there is nothing to read off a dial. Two instruments on one segment combine, and a segment whose portal branch and artery are both closed has no inflow left at all, which the table treats as a resection. Lifting an instrument undoes what it did.

The day object is the one dial. It is relative: it starts at the end of the course wherever it is put down, and winding it back walks through the days towards the operation. Turning it solves nothing, it only moves the moment the table is read at, so it answers instantly.

## The liver

Each segment is a block whose **area** is its share of the mass of the liver, laid out as the body is seen from the front: the right lobe on the left of the picture with its posterior sector (VII above VI) and its anterior sector (VIII above V), the caudate lobe as the strip in the middle where it lies between the portal vein and the vena cava, and the left lobe on the right with the medial segment IV against the right lobe and the lateral segments II and III.

The blocks keep their place while the plan changes. A physical object cannot move itself when the picture is redrawn, so a segment that was taken away stays where it was, drawn hollow and dashed, and the loss of mass is read off the numbers rather than off the layout.

Each block says what became of it: the volume it has reached as a percentage of the same segment in a liver nobody operated on, and the flow through it. Two pips in its corner are its branches, filled while they are open and hollow once they are closed. The colour follows the volume, blue where a segment has atrophied and amber where it has grown, with the tint of a closed branch over it.

Below the liver, the portal vein and the hepatic artery come up to the hilum and the hepatic veins leave at the top, each as wide as the flow it carries.

## What the table shows

The five numbers of the band, read at the day the dial points at. Hovering one, or resting a finger on it, says what it is:

| Number | What it is |
| --- | --- |
| Liver volume | The volume of the whole liver, as a percentage of the reference liver |
| Portal pressure | The pressure in the portal vein, in mmHg |
| Portal gradient | Portal pressure minus the pressure in the liver |
| Portal flow | The flow through the portal vein, in l/min |
| Arterial flow | The flow through the hepatic artery, in l/min |

The small number under each one is the change against the same liver without the operation, at the same day. The course below the liver draws the volume and the portal pressure over the five days, with that untouched liver behind them as a dashed line.

## Things to try

- **Portal vein ligation of the right lobe.** Put the portal clamp on V, VI, VII and VIII. The portal pressure rises, the four ligated segments atrophy over the days and the left lobe grows: this is the operation that is done before a large resection, to let the future remnant grow first.
- **Right hepatectomy.** Put the scalpel on the same four segments. A third of the liver is left on the first day, and over the five days it regenerates towards the volume the whole liver had.
- **The remnant too small.** Add segment IV to the resection. The remnant starts far below what the body needs, the portal pressure in it is higher, and the regeneration starts from further away.
- **One segment at a time.** Clamp VIII alone, then wind the day dial back to the operation and forward again, and watch that one block shrink while its neighbours take over.

## Where the numbers come from

The liver, its segments and their mass fractions, the compiled model and the solver settings are generated in pkpdsim by `scripts/lobes_examples.py` and copied in by `npm run sync`, which writes a `provenance.json` naming the commit they came from. The states of a segment and the parameters each of them writes (`g_po_<segment>`, `g_ha_<segment>`, `f_present_<segment>`) are a port of `lobes-model.mjs` of the pkpdsim documentation, and the request of one run is a port of `lobes-solver.mjs`.

The test of that port holds it to the export: for every case pkpdsim precomputed, the instruments that build it have to produce exactly the parameter changes the export carries, and the state of every segment has to be readable back out of them.

## Run it

```bash
npm run sync
npm run dev:lobes
```

The table is the second card on the body at `http://localhost:5173/`, and `?app=lobes` opens it directly.

| Address | What it does |
| --- | --- |
| `http://localhost:5173/?app=lobes` | On the mouse: keys 1 to 4 place an object, dragging moves it, the wheel turns the dial, backspace lifts it, escape goes back to the body |
| `http://localhost:5173/?app=lobes&tuio` | On a tracker at `ws://localhost:3333`, which is the [simulator](../simulator.md) |
| `http://localhost:5173/?app=lobes&tuio=/tuio` | On the tracker behind the one port of `npm run dev`, which is what `http://localhost:5173/simulator/?table=lobes` opens |
| `http://localhost:5173/?app=lobes&tuio&tuio-version=1.1` | On a tracker that speaks TUIO 1.1 rather than TUIO 2.0 |
| `http://localhost:5173/?app=lobes&tuio=host:port` | On a tracker somewhere else, which is how a [table](../table.md) is addressed |
| `http://localhost:5173/?app=lobes&sex=female` | The female reference body, for the human liver |
| `http://localhost:5173/?app=lobes&species=rat` | The rat liver, with its five lobes, instead of the human one; `?species=mouse` for the mouse |
