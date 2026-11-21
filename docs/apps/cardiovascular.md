# Cardiovascular circulation

The whole circulation on the table, and four objects that obstruct it.

The model is the cardiovascular model of the pkpdsim PBPK library: a heart, a pulmonary circuit, fourteen systemic organs, and the portal system that drains five of them through the liver. The table shows the steady state of its pressure network, which is the part of the model that answers immediately.

## The objects

| Marker | Object | What it changes | Range |
| --- | --- | --- | --- |
| 1 | Hepatic outflow | The resistance of the hepatic veins, between the liver and the vena cava | 0.5x to 8x |
| 2 | Systemic resistance | The resistance of every systemic organ at once, the afterload of the heart | 0.5x to 2x |
| 3 | Portal vein | The resistance of the portal vein, between the splanchnic organs and the liver | 0.5x to 6x |
| 4 | Renal resistance | The resistance of the kidneys, on top of the systemic resistance | 0.5x to 3x |

Every object is a dial. Pointing away from the person is the reference physiology, 1.00x. Turning it to the right raises the resistance, turning it to the left lowers it, and the scale is logarithmic, because a resistance factor is a ratio. The last tenth of each half turn is the stop of the dial, where the value sits on its extreme instead of on a knife edge. Lifting the object restores the reference.

The position of these objects carries nothing: each one is a dial, wherever it is put. The card next to it turns to the nearest edge of the table, so it reads upright for whoever placed it.

## What the table shows

The five numbers at the near and the far edge:

| Number | What it is |
| --- | --- |
| Cardiac output | The sum of all organ flows, in l/min |
| Portal pressure | The pressure in the portal vein, in mmHg |
| Portal gradient | Portal pressure minus the pressure in the liver, the number portal hypertension is measured by |
| Hepatic flow | The flow through the hepatic veins, in l/min |
| Portal flow | The flow through the portal vein, in l/min |

The small number under each one is the change against the reference circulation.

On the body, each organ is a disc as large as its flow and coloured by the share of its reference flow it still receives: grey at the reference, blue when it has lost half, amber when it has gained half. The vessels are as wide as the flow they carry, with the arterial side in red, the venous side in blue and the portal system in purple.

## Things to try

- **Portal hypertension.** Turn object 1 to the right. The hepatic veins obstruct, the portal pressure and the portal gradient rise, the liver and the splanchnic organs lose flow. This is the haemodynamics of cirrhosis.
- **Portal vein thrombosis.** Turn object 3 to the right instead. The portal pressure rises as well, but the pressure in the liver does not follow, so the gradient opens further and the hepatic artery takes over part of the supply.
- **Vasodilation.** Turn object 2 to the left. Every organ gains flow and the cardiac output rises, because the model drives the circulation with a fixed pressure head.
- **Renal artery stenosis.** Turn object 4 to the right. The kidneys lose flow and almost nothing else moves, because the kidneys are one organ among fourteen.

## Where the numbers come from

The steady pressure network has an exact algebraic solution, which is what makes the table answer within a frame rather than within a second. The solution is a port of `cardiovascular-model.mjs` of the pkpdsim documentation, and its test holds it to the exported reference: at the reference controls it has to reproduce the portal pressure, the pressure in the liver, the cardiac output and every one of the fourteen organ flows, and both nodes have to conserve flow.

The reference circulation, the organ resistances, the anatomy and its organ anchors are generated in pkpdsim by `scripts/cardiovascular_examples.py` and copied in by `npm run sync`, which also writes a `provenance.json` naming the commit they came from. The beating heart of the full model is solved with SUNDIALS IDA on the compiled SBML; the exported cases are part of the copied data and are the next thing this application will show.

## Run it

```bash
npm run sync
npm run dev
```

| Address | What it does |
| --- | --- |
| `http://localhost:5173/` | On the mouse: keys 1 to 4 place an object, dragging moves it, the wheel turns it, backspace lifts it, escape clears the table |
| `http://localhost:5173/?tuio` | On a tracker at `ws://localhost:3333`, which is the [simulator](../simulator.md) |
| `http://localhost:5173/?tuio&tuio-version=1.1` | On a tracker that speaks TUIO 1.1 rather than TUIO 2.0 |
| `http://localhost:5173/?tuio=host:port` | On a tracker somewhere else, which is how a [table](../table.md) is addressed |
| `http://localhost:5173/?sex=female` | The female reference body |
