# The liver

Why the body has a liver at all, and the way into the three tables which take that further.

The liver is the only organ with two blood supplies. One comes from the aorta through the hepatic artery and carries the oxygen it works with; the other comes from the stomach, the gut and the spleen through the portal vein and carries everything that was absorbed. Both end in the same sinusoids, so the liver sees a meal, and every drug that is swallowed, before the rest of the body does. This table draws that, lets two objects move it, and shows what happens inside one lobule.

## Background

Three quarters of the blood of the liver arrives through the portal vein, already stripped of most of its oxygen, and a quarter through the hepatic artery. Together they are about a litre and a half a minute in a person at rest, roughly a quarter of everything the heart pumps, for an organ which is a fortieth of the body mass. The pressure in the portal vein is low, around 8 to 10 mmHg, and what the blood loses on its way through the liver, the portal gradient, is a couple of mmHg in a healthy one. A cirrhotic liver resists the flow, the gradient rises, and the blood backs up into the portal vein: portal hypertension, with everything that follows from it.

Inside, the liver is built of about a million lobules, hexagons a millimetre across. The blood enters at their corners, where a branch of the portal vein, a branch of the hepatic artery and a bile duct lie together as the portal triad, and runs through the sinusoids towards the central vein in the middle, which takes it away. The cells along that path do not all do the same thing: the ones at the corners get the most oxygen and build glucose, the ones in the middle see the least and do most of the work on drugs, which is also why damage starts there. That gradient is what a [machine perfusion](perfusion.md) makes visible, and what the zonated liver of pkpdsim models.

## The objects

| Marker | Object | What it does |
| --- | --- | --- |
| 1 | The gut | How open the vessels of the gut and the portal vein are. After a meal they open and the gut sends more blood. |
| 2 | The liver | How easily the blood gets through the liver itself. Turning it up is a scarred, cirrhotic liver. |

Both are absolute dials: the angle is the factor on the reference resistance, pointing up is the physiology of a healthy person at rest, and lifting the object puts it back there.

## What the table shows

The numbers of the band, each with the sentence which says what it is behind it:

| Number | What it is |
| --- | --- |
| Through the liver | Everything the liver gets, from both supplies together, in l/min |
| From the gut | What the portal vein brings, in l/min |
| From the artery | What the hepatic artery brings, in l/min |
| Of the heart | The share of the cardiac output which goes through the liver |
| Portal pressure | The pressure in the portal vein, in mmHg |
| One lobule gets | The flow of the whole liver divided among its million lobules, in microlitres a minute |

The schematic on the left is the circulation of the liver: the heart, the gut and the liver, with the hepatic artery, the portal vein and the hepatic vein between them, each as wide as the blood it carries, so a dial changes the picture and not only a number. The hexagon on the right is one lobule, with its three zones, the portal triads at its corners and the central vein in the middle.

The three cards at the bottom are where the story goes on: the [glimepiride table](glimepiride.md) for what the liver does to a drug, the [lobed liver](lobes.md) for what can be cut away, and the [machine perfusion](perfusion.md) for a liver outside the body. A finger resting on one of them opens it, as everywhere else.

## Things to try

- **After a meal.** Turn the gut object so that its vessels open. The portal flow rises, and with it everything the liver has to handle.
- **A cirrhotic liver.** Turn the liver object up. The flow falls, the portal pressure climbs and the gradient with it: that is what a clinician measures to tell how far a cirrhosis has gone.
- **Both at once.** A gut which sends more into a liver which resists is the worst case for the portal pressure, and it is why a meal can be dangerous in advanced cirrhosis.

## Where the numbers come from

The steady pressure network of the cardiovascular model, which is an exact algebraic reduction of the circulation and answers within a frame. It is the same export the [circulation table](cardiovascular.md) uses, which `npm run sync` copies in from a pkpdsim checkout; the lobule is a drawing of the zonated liver of pkpdsim, and the flow it is given is the solved flow of the whole liver divided by a million.

## Run it

```bash
npm run sync
npm run dev
```

The table is the second card on the landing page at `http://localhost:5173/`, and `?app=liver` opens it directly.

| Address | What it does |
| --- | --- |
| `http://localhost:5173/?app=liver` | On the mouse: keys 1 and 2 place an object, dragging moves it, the wheel turns it, escape goes back to the bodies |
| `http://localhost:5173/?app=liver&tuio=/tuio` | On the tracker behind the one port of `npm run dev`, which is what `http://localhost:5173/simulator/?table=/?app=liver` opens |
| `http://localhost:5173/?app=liver&tuio=host:port` | On a tracker somewhere else, which is how a [table](../table.md) is addressed |
