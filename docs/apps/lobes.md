# Liver surgery

The liver divided into its segments, the operations a surgeon does on one object, and what grows back after each of them.

The model is the lobed liver of the pkpdsim PBPK library: each segment has its own portal branch, its own hepatic artery, its own volume and its own share of the drug that passes through. Taking a segment away is a resection, and the days that follow are the regeneration of what is left. The table solves that course with SUNDIALS IDA on the compiled SBML, in a Web Worker, every time the operation on it changes.

## Background

A liver is not one organ but eight pieces. Each Couinaud segment has its own branch of the portal vein, its own branch of the hepatic artery and its own way out into the hepatic veins, which is why a surgeon can take one away and leave the rest working. That is what makes a liver tumour operable: the piece that carries it is cut out, and the liver that is left grows until it can do the work of the whole again. In a healthy person it recovers most of its mass within weeks, and the first days are the steep part of that curve.

The limit of such an operation is how much liver is left. A remnant that is too small cannot keep up with what the body asks of it, and the blood that the whole liver used to take now has to pass through a fraction of it, which raises the pressure in the portal vein. Surgeons therefore make the future remnant grow before they operate: they close the portal branch of the side that will be removed, which sends its blood to the other side and makes that side grow, and only then do they resect. That is a portal vein ligation, and it is one object on this table.

Why a pharmacokinetic model cares: the liver is where most drugs are broken down, and the capacity that is left after an operation is the capacity that metabolizes them. The same model carries both, the mass of each piece and the drug that passes through it.

## The objects

| Marker | Object | What it does |
| --- | --- | --- |
| 1 | The operation | Turns through the resections a surgeon does, from one segment to the whole right side of the liver |
| 2 | Regeneration rate | How fast what is left grows back, between a third of the rate of a healthy liver of this species and three times it |

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

- **Right hepatectomy.** Turn the knife to the right half. A third of the liver is left on the first day, the blood of the whole body now passes through that third, and the portal pressure in front of it rises. Over the weeks that follow it grows back towards the volume the whole liver had.
- **The remnant too small.** Turn one further, to the extended right hepatectomy. The remnant starts far below what the body needs, the pressure in front of it is higher again, and the curve starts from further down.
- **A liver which is slow.** Turn the second object down. The same operation takes far longer to come back, which is what an ill liver does: the curve of a healthy one is still drawn behind it.
- **A rat is not a person.** Switch the species to the rat. The whole course is ten days rather than sixty, because a rat is most of the way back within a week.

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
| `http://localhost:5173/?app=lobes` | On the mouse: keys 1 and 2 place an object, dragging moves it, the wheel turns the dial, backspace lifts it, escape goes back to the body |
| `http://localhost:5173/?app=lobes&tuio` | On a tracker at `ws://localhost:3333`, which is the [simulator](../simulator.md) |
| `http://localhost:5173/?app=lobes&tuio=/tuio` | On the tracker behind the one port of `npm run dev`, which is what `http://localhost:5173/simulator/?table=lobes` opens |
| `http://localhost:5173/?app=lobes&tuio&tuio-version=1.1` | On a tracker that speaks TUIO 1.1 rather than TUIO 2.0 |
| `http://localhost:5173/?app=lobes&tuio=host:port` | On a tracker somewhere else, which is how a [table](../table.md) is addressed |
| `http://localhost:5173/?app=lobes&sex=female` | The female reference body, for the human liver |
| `http://localhost:5173/?app=lobes&species=rat` | The rat liver, with its five lobes, instead of the human one; `?species=mouse` for the mouse |
