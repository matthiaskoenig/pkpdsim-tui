# One tablet, one day

One individual on the table, six objects that say who they are, and the body of that individual with the drug moving through it.

The model is the [glimepiride model](https://github.com/matthiaskoenig/glimepiride-model), a whole body PBPK model of the sulfonylurea glimepiride and of its two metabolites M1 and M2. A tablet is swallowed, the liver turns glimepiride into M1 with CYP2C9, M1 becomes M2, and the kidneys clear both into the urine. Every dial on this table is one of the things that make two people respond differently to the same tablet.

## Background

Glimepiride is taken for type 2 diabetes: it makes the pancreas release insulin, which lowers the blood sugar. Too much of it in the blood lowers the blood sugar too far, and a hypoglycaemia in an elderly patient is a fall, a confusion or a hospital admission. So the question the table asks is the question of the prescription: the same tablet, in two different people, leaves how much drug in the blood?

What the body does with the tablet happens in three places. The gut dissolves it and lets it through. The liver takes it apart with the enzyme CYP2C9, into M1, which is itself active, and then into M2, which is not. The kidneys wash M1 and M2 out in the urine. Each of these can be slower in one person than in another, and the model carries all three.

CYP2C9 is the interesting one. The gene comes in variants: about one person in eight carries a slow allele, and somebody with two of them breaks glimepiride down at roughly a quarter of the usual rate. They get a multiple of the exposure from the same tablet, and the guidance for them is a lower dose. A cirrhotic liver has less working tissue and less enzyme in it, so it acts in the same direction, and failing kidneys hold the metabolites back instead. The three dials of this table are those three, and the fourth, the body weight, is the one that is measured at every visit.

This is what a physiologically based model is for. It does not fit a curve to a population; it carries the organs, their blood flows and the enzyme in the liver, so that each of these can be turned on its own and the answer follows from the physiology.

## The objects

| Marker | Object | What it changes | Range | Reference |
| --- | --- | --- | --- | --- |
| 1 | Dose | The tablet that is swallowed | 0 to 8 mg | 4 mg |
| 2 | Body weight | The weight of the individual, which scales their organs and flows | 40 to 170 kg | 73 kg, or 60 kg for the female body |
| 3 | Tablets, one a day | How many mornings in a row a tablet is taken | 1 to 10 | 1 |
| 4 | CYP2C9 activity | The activity of the enzyme that makes M1, as a fraction of the wild type | 0.23 to 1.00 | 1.00, which is `*1/*1` |
| 5 | Cirrhosis | How cirrhotic the liver is | 0 to 0.95 | 0, healthy |
| 6 | Creatinine clearance | What the kidneys still clear | 10 to 110 ml/min | 110 ml/min |

Every object of the individual is a dial, and its angle is the value: pointing away from the person is the reference individual, turning it to the right raises the value and to the left lowers it. Where the reference sits at one end of what is possible, as a creatinine clearance that cannot be better than normal does, the dial has half a span and the table draws only that half. Lifting an object puts that property back to the reference.

Three of the dials say in words what they are set to, because that is how a clinician reads them: the CYP2C9 dial names the genotype it is nearest to (`*1/*1`, `*1/*2`, `*2/*2`, `*1/*3`, `*2/*3`, `*3/*3`, from the allele activities of the marimo application of the model), the cirrhosis dial names the Child-Pugh class, and the kidney dial names the stage of impairment.

The panel also carries a switch a finger touches rather than an object: the body of the individual. The male reference adult weighs 73 kg and is 176 cm tall, the female one 60 kg and 163 cm, which is ICRP 89 as the pkpdsim physiology carries it. The switch sets both, so the organs, their blood flows and the dose per kilogram all follow, and the detent of the weight dial moves with it.

The tablets object is the course rather than a property of the person: one tablet every 24 hours for as many mornings as it is turned to, and the course runs to the end of the day of the last of them. One tablet is therefore one day, which is the question this table asks: what a single tablet does between this morning and the next. The table solves that course and the clock of the table then runs along it by itself, over and over, so a visitor sees the drug arrive and leave without having to wind anything.

## What the table shows

The individual, with a bubble on every part of the body the model carries: the gut with the tablet which has not been taken up, the liver, the blood, the lungs, the kidneys, the rest of the body and what has left it. The area of a bubble is what that part holds, counted in millimoles of glimepiride and of the two metabolites together, because one molecule of the drug becomes one of M1 and then one of M2: the bubbles are the dose which was swallowed, wherever it has got to. The names stand in a column at each side of the figure, with a thread to the bubble they belong to, because the chest of a body holds three of them.

The six numbers of the band, with the change against the reference individual under each one. Hovering one, or resting a finger on it, says what it is:

| Number | What it is |
| --- | --- |
| Plasma now | The plasma concentration of glimepiride at the hour the running clock has reached, in uM |
| Peak plasma | The highest plasma concentration of the course |
| Time of the peak | When it is reached, in hours after the dose |
| Half life | The half life of the terminal part of the course, from a straight line through its logarithm |
| Exposure | The area under the course that was simulated |
| M1 and M2 in urine | What has arrived in the urine at the end of the course, in umole |

The plot beside the body is the plasma course of glimepiride, M1 and M2. The three are read in the same unit and therefore share one scale, so their heights can be compared, and the same individual at the reference is drawn behind them as a dashed line. The cursor of the running clock walks along it, and the bubbles on the body are that same moment.

## Things to try

- **The poor metabolizer.** Turn the CYP2C9 dial down to `*3/*3`. Glimepiride is cleared more slowly, the peak and the exposure rise, the half life lengthens and less M1 and M2 reach the urine: the dose that is right for a wild type individual is too much for this one.
- **The cirrhotic liver.** Turn the cirrhosis dial to CPT C. The liver loses functional mass and perfusion at once, and the parent accumulates.
- **The failing kidney.** Turn the clearance dial down to severe. Glimepiride itself hardly notices, because it leaves through the liver, but M1 and M2 stay in the plasma and little arrives in the urine.
- **Two things at once.** Put the poor metabolizer and the cirrhotic liver on the table together and wind the hour dial back through the first hours: this is the patient a label warns about.

## Where the numbers come from

The model is the SBML of its own repository, compiled here by `scripts/export_model.py` with the same release of sbmlsim-core that pkpdsim exports its examples with, so a model exported here and one exported there run on the same runtime:

```bash
npm run export:glimepiride            # expects a glimepiride-model checkout beside this one
GLIMEPIRIDE_MODEL=/path/to/glimepiride_body_flat.xml npm run export:glimepiride
```

The individual becomes five parameters of that model (`PODOSE_gli`, `LI__f_cyp2c9`, `f_cirrhosis`, `KI__f_renal_function`, `BW`), which are set before the initial values are resolved, because that is how an oral dose is given: the tablet is in the intestine when the clock starts. The creatinine clearance is the one control that is not a parameter, the model takes the fraction of the renal function that is left, and a clearance above the reference does not make the kidneys clear more than they can.

The pharmacokinetics are arithmetic on the solved course and nothing else: the peak and its time are the largest value of the curve, the exposure is the trapezoid area under the window that was simulated rather than an extrapolation to infinity, and the half life is the slope of a straight line through the logarithm of its last third.

## Run it

```bash
npm run export:glimepiride
npm run dev:glimepiride
```

The table is the third card on the body at `http://localhost:5173/`, and `?app=glimepiride` opens it directly.

| Address | What it does |
| --- | --- |
| `http://localhost:5173/?app=glimepiride` | On the mouse: keys 1 to 6 place an object, dragging moves it, the wheel turns it, backspace lifts it, escape goes back to the body |
| `http://localhost:5173/?app=glimepiride&tuio` | On a tracker at `ws://localhost:3333`, which is the [simulator](../simulator.md) |
| `http://localhost:5173/?app=glimepiride&tuio=/tuio` | On the tracker behind the one port of `npm run dev`, which is what `http://localhost:5173/simulator/?table=glimepiride` opens |
| `http://localhost:5173/?app=glimepiride&tuio&tuio-version=1.1` | On a tracker that speaks TUIO 1.1 rather than TUIO 2.0 |
| `http://localhost:5173/?app=glimepiride&tuio=host:port` | On a tracker somewhere else, which is how a [table](../table.md) is addressed |
| `http://localhost:5173/?app=glimepiride&sex=female` | The female reference body of 60 kg and 163 cm |
