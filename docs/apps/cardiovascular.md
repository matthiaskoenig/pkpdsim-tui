# Cardiovascular circulation

The whole circulation on the table, six objects that change it, and a heart that beats while they are being moved.

The model is the cardiovascular model of the pkpdsim PBPK library: a heart, a pulmonary circuit, fourteen systemic organs, and the portal system that drains five of them through the liver. Two of its solutions run side by side. The steady state of the pressure network is algebraic and is solved on every frame, so the organs and the vessels follow a hand without a wait. The beating heart is the compiled SBML of the same model, integrated with SUNDIALS IDA in a Web Worker, and it is where the blood pressure, the cardiac output, the stroke volume and the beat beside the heart come from.

## Background

The heart of an adult at rest pushes five to six litres of blood a minute through the body, which is about the whole blood volume every minute. It does that in beats: the left ventricle fills while it is relaxed, the valve to the aorta opens when the pressure in it exceeds the pressure in the aorta, and in a fraction of a second it ejects a stroke volume of some seventy millilitres. The pressure in the aorta rises to the systolic value with that ejection and falls back to the diastolic value while the heart fills again, which is the two numbers of a blood pressure cuff. The flow through an organ is the pressure across it divided by its resistance, so narrowing a vessel moves both the flow through it and the pressures around it, and the circulation settles somewhere new within a few beats.

The liver is the organ this model is most careful about, because it is fed twice. The hepatic artery brings it blood at arterial pressure, and the portal vein brings it everything that drained the stomach, the intestines, the spleen and the pancreas. Both leave through the hepatic veins into the vena cava. When the way out of the liver narrows, which is what cirrhosis does to it, the blood backs up in front of it: the pressure in the portal vein rises, and that is portal hypertension, the condition behind the varices and the ascites of a decompensated liver. The table makes that happen with one object.

A circulation is not a detail of a pharmacokinetic model: every organ of a PBPK model receives a blood flow, and the concentration a drug reaches in the liver or the kidney depends on how much blood arrives there. The same cardiovascular model carries the flows of the models in [pkdb_models](https://github.com/matthiaskoenig/pkdb_models).

## The objects

| Marker | Object | What it changes | Range |
| --- | --- | --- | --- |
| 1 | Heart rate | How often the heart beats, which the compiled heart is solved with | 40 to 150 /min |
| 2 | Contractility | How hard the ventricles squeeze, where turning it down is a failing heart | 0.4x to 1.6x |
| 3 | Systemic resistance | The resistance of every systemic organ at once, the afterload of the heart | 0.5x to 2x |
| 4 | Hepatic outflow | The resistance of the hepatic veins, between the liver and the vena cava | 0.5x to 8x |
| 5 | Renal resistance | The resistance of the kidneys, on top of the systemic resistance | 0.5x to 3x |
| 6 | Portal vein | The resistance of the portal vein, between the splanchnic organs and the liver | 0.5x to 6x |

They are picked up in the order they are understood in: the heart itself on 1 and 2, the vessels of the whole body on 3, and then the three parts a model of a drug cares about, the liver, the kidneys and the gut.

Every object is a dial. Pointing away from the person is the reference physiology, 1.00x for a resistance and 75 beats a minute for the heart. Turning it to the right raises the value, turning it to the left lowers it. The four resistances are logarithmic, because a resistance factor is a ratio; the heart rate is linear, because a rate is read off a scale in beats per minute. The last tenth of each half turn is the stop of the dial, where the value sits on its extreme instead of on a knife edge. Lifting the object restores the reference.

The four resistances change both solutions at once. The two of the heart only change the beating one, because the steady network has no beat.

The position of these objects carries nothing: each one is a dial, wherever it is put. The card stands above it and reads upright, as everything on these tables does. Inside the ring of a resistance is a vessel whose opening narrows as the factor goes up, following Poiseuille's law, and inside the two of the heart is a heart that beats at the rate of the dial.

## What the table shows

The six numbers of the band, all of them read off the beating heart over its last three beats. Hovering one, or resting a finger on it, says what it is:

| Number | What it is |
| --- | --- |
| Systolic | The highest pressure in the aorta during a beat, in mmHg |
| Diastolic | The lowest pressure in the aorta between two beats, in mmHg |
| Cardiac output | The blood the heart moves, averaged over the beats, in l/min |
| Stroke volume | What one beat moves, which is the cardiac output divided by the rate, in ml |
| Portal pressure | The mean pressure in the portal vein, in mmHg |
| Portal gradient | Portal pressure minus the pressure in the liver, the number portal hypertension is measured by |

The small number under each one is the change against the reference heart of the same body, which is the case pkpdsim exported for it.

A panel in the corner draws **2.4 seconds** of the solved heart: the pressure in the aorta in red, the pressure in the left ventricle in blue, and a cursor walking through them in real time at the rate on the table. The window is a time and not a number of beats, so it holds three beats of a heart at rest and five of a fast one, and a visitor sees the beats crowd together as the rate goes up. Behind them, dashed, is the first heart that was solved on this table, which is the heart of this body before anything was turned: every later run is read against it. On the anatomy the left ventricle empties and fills with the same cycle, which is the heart beating on the body.

While a run of the heart is in flight the beat and the panel step back a little, and the anatomy keeps answering, because the steady network is solved on every frame. One run takes about two seconds.

On the body the circulation is drawn as the circuit the blood runs: out of the heart, down the arterial trunk on one side, through the organs, up the venous trunk on the other, back to the heart and through the lungs before it starts again. The gut, the spleen and the pancreas drain into the portal vein instead, which carries their blood through the liver first. Every vessel carries an arrow saying which way the blood in it runs and is as wide as the flow it carries, with the arterial side in red, the venous side in blue and the portal system in purple. Each organ is a disc as large as its flow and coloured by the share of its reference flow it still receives: grey at the reference, blue when it has lost half, amber when it has gained half.

The organs of the abdomen sit on each other, so their names are read in two columns clear of the body, each joined to its organ by a thin line: the organs which drain into the vena cava down the left, the portal ones down the right, and the liver under them, which is where their blood goes. Under each name is the flow that organ is getting right now.

## Things to try

- **Portal hypertension.** Turn object 4 to the right. The hepatic veins obstruct, the portal pressure and the portal gradient rise, the liver and the splanchnic organs lose flow. This is the haemodynamics of cirrhosis.
- **Portal vein thrombosis.** Turn object 6 to the right instead. The portal pressure rises as well, but the pressure in the liver does not follow, so the gradient opens further and the hepatic artery takes over part of the supply.
- **Vasodilation.** Turn object 3 to the left. Every organ gains flow and the cardiac output rises, because the model drives the circulation with a fixed pressure head.
- **Renal artery stenosis.** Turn object 5 to the right. The kidneys lose flow and almost nothing else moves, because the kidneys are one organ among fourteen.
- **A slow heart.** Turn object 1 down to 40 beats a minute. The heart has longer to fill, so one beat moves half as much again, but the cardiac output still falls and the pressure in the aorta has further to fall between two beats: the blood pressure opens to something like 107/41 mmHg.
- **A failing heart.** Turn object 2 down. The ventricle beside the heart empties less with every beat, the stroke volume falls and the circulation is carried by the rate alone.
- **The other body.** Touch Woman beside the body, here or on the landing page. The whole table reloads on the female reference body of 60 kg, which has its own compiled heart, and every number is compared against that body's own reference.

## Where the numbers come from

The steady pressure network has an exact algebraic solution, which is what makes the table answer within a frame rather than within a second. The solution is a port of `cardiovascular-model.mjs` of the pkpdsim documentation, and its test holds it to the exported reference: at the reference controls it has to reproduce the portal pressure, the pressure in the liver, the cardiac output and every one of the fourteen organ flows, and both nodes have to conserve flow.

The reference circulation, the organ resistances, the anatomy and its organ anchors are generated in pkpdsim by `scripts/cardiovascular_examples.py` and copied in by `npm run sync`, which also writes a `provenance.json` naming the commit they came from. The female body is the same export for the female reference individual, under `female/`, and both bodies share one WebAssembly runtime.

The beating heart is a port of `cardiovascular-solver.mjs` of the pkpdsim documentation: the same request, the same intervention at the end of a whole beat, the same summary of the three beats before and after it. Its test holds it to the exported cases, by summarizing the beats pkpdsim published and requiring the numbers that came with them. Where the table departs from the export it does so to be quick enough for a hand on an object: it reads the summarized beats at 2 ms instead of 0.2 ms, which moves every number by less than a tenth of its unit, it reads the whole run coarsely, because it draws the beats and not the run, and it asks for the eleven columns it shows instead of all thirty four.

## Run it

```bash
npm run sync
npm run dev:cardiovascular
```

The table is the first card on the body at `http://localhost:5173/`, and `?app=cardiovascular` opens it directly.

| Address | What it does |
| --- | --- |
| `http://localhost:5173/?app=cardiovascular` | On the mouse: keys 1 to 6 place an object, dragging moves it, the wheel turns it, backspace lifts it, escape goes back to the body |
| `http://localhost:5173/?app=cardiovascular&tuio` | On a tracker at `ws://localhost:3333`, which is the [simulator](../simulator.md) |
| `http://localhost:5173/?app=cardiovascular&tuio=/tuio` | On the tracker behind the one port of `npm run dev`, which is what `http://localhost:5173/simulator/?table=cardiovascular` opens |
| `http://localhost:5173/?app=cardiovascular&tuio&tuio-version=1.1` | On a tracker that speaks TUIO 1.1 rather than TUIO 2.0 |
| `http://localhost:5173/?app=cardiovascular&tuio=host:port` | On a tracker somewhere else, which is how a [table](../table.md) is addressed |
| `http://localhost:5173/?app=cardiovascular&sex=female` | The female reference body |
