# Run on a table

A multitouch table with object recognition is a browser, a tracker and a sheet of glass. The browser is the only part these applications know about.

## The surface

The tables of [Interactive Scape](https://www.interactive-scape.com/) recognise objects capacitively: the markers are passive and are read through the glass, with no camera below the table and no light of their own. The table reports them over TUIO, which is what makes a browser enough to write a table application. [DISPLAX](https://www.displax.com/) and the SUR40 bridges emit TUIO as well, and anything else that offers TUIO 2.0 over a WebSocket will work. The sensor reports its own size in every frame, so positions arrive as fractions of the surface rather than in pixels.

## Start it on a table

A real table brings two things of its own: the tracker it reports its objects over, and the markers whose ids are printed on its pucks. Both belong to the booth and not to a visitor, so both are said once, in the command of the table, and starting it is the whole of it:

!!! tip "The command for a real table"

    ```bash
    npm run table
    ```

    Then open the address, which carries nothing at all:

    ```
    http://localhost:5173/
    ```

That command is the table of this exhibition written down once, in `package.json`:

```bash
node scripts/dev.mjs --no-simulator --tuio 10.0.0.20:3343 --ids 1,3,5,6,11,12,21
```

`--no-simulator` leaves the simulator out, because the table is the tracker. `--tuio` is where that tracker listens, the host and the port of the table itself: the server carries it at `/tuio`, where every page it serves finds it. `--ids` are the ids of the markers of the table, in the order the objects of a table are picked up, and every page it serves reads them. Another table is the same command with its own two, either in `package.json` or after `--`:

```bash
npm run table -- --tuio 10.0.0.21:3343 --ids 2,4,8,9,14,15,22
```

The address is the body, from which a visitor opens a table; `?app=cardiovascular` opens one at once, which is what a booth with one subject uses.

Because the table is said to the server and not to the address, there is one place to change it and nothing to keep in step: the page a visitor is handed, the page a table opens again after a visit, and a page somebody typed are all the same table. A page may still name a tracker or a list of ids of its own, with `?tuio=` and `?ids=` below, which is how a second table on the same server or another set of pucks is tried without stopping the booth.

A built page for a booth of its own takes the same two over the environment, where the launcher is not what starts it:

```bash
TUIO_TABLE_TRACKER=10.0.0.20:3343 TUIO_TABLE_IDS=1,3,5,6,11,12,21 npm run build
```

## Point the browser at the tracker

Find the WebSocket host and port of the table in its own configuration, and give them to the `--tuio` of `npm run table` above. A page which belongs to no booth can be pointed at one by its own address instead:

```
http://<the machine that serves the application>:5173/?tuio=10.0.0.20:3343
```

If the browser runs on the table itself, the host is `localhost`. Start with the [simulator settings](simulator.md), which is the same protocol on the same port.

A page told about a tracker this way listens to it alone, so a stray mouse cannot put objects on the surface of an exhibition. A page told nothing looks for a tracker behind its own server at `/tuio`: a server started on a table carries the table there and the page waits for it, naming the table itself in the panel and in the sentence it says while the table has not answered; a server which carries the simulator is found the same way, and a page which finds nothing runs on the mouse, which is what a published build does.

## The ids of the markers

The objects of a table are numbered from 1 here: the first object of a table is 1, the second 2, and the same pucks serve all four tables. The markers of a real table carry whatever ids were printed on them, which is `[1, 3, 5, 6, 11, 12, 21]` on one table and something else on the next. The `--ids` of `npm run table` says them, in the order the objects of a table are picked up, and the nth object of every table is then read from the nth id.

The circulation then reads 1, 3 and 5, liver surgery reads 1 and 3, and the drug reads 1, 3, 5, 6, 11 and 12. Every number a visitor sees is the id of the puck in their hand: the one on the card beside an object, the one in the panel, and the one in the sentence which asks for an object. The list is of the table, so every page of that table reads it and nobody has to carry it from one page to the next. A page which is not of a booth, or which is trying another set of pucks, says its own list:

```
http://localhost:5173/?ids=1,3,5,6,11,12,21
```

Give at least as many ids as the table with the most objects needs, which is six, for the drug through the body. A list which is not a list of whole numbers, which names one puck twice, or which does not reach as far as the objects of a table is refused at the start, with the reason, rather than left to a visitor who turns an object nothing answers to.

The [simulator](simulator.md) places an object of any id between 1 and 999, so the mapping of a table can be tried before the table is there: `http://localhost:5173/simulator/?table=cardiovascular&ids=1,3,5` drives the application under the surface with the same list. On the mouse of a laptop the digit keys follow the order of the list instead of the ids themselves, because 11 and 12 are no keys: the first key is the first object.

The laboratory is in the bottom right corner of every page, with the square a phone is pointed at, in the same place and at the same size, so a visitor can read whose work this is and take the address with them. The line under it opens the page [about](#the-page-about-all-of-this) all of this.

Who the tables are solved for stands beside the gear in the far corner, on every page: a line with the body, the age, the weight and the height, which opens the question again when it is pressed. It is the one setting a visitor changes while they are at a table. Everything about the table itself waits behind the **gear**: which table is open, the language, the level, the body and the address of the tracker. They are rows of either-or switches drawn as pictograms and flags rather than words, because a visitor who cannot read the language is the one who needs the language switch. The choices hold while a visitor walks from one table to the next and travel in the address, so a booth can be opened on `?lang=es&level=child` and stay there. See [Languages and the voice](languages.md).

Every table wears its own colour and its own picture over the title of its panel: the red heart of the circulation, the purple scalpel of the operations, the green tablet of the drug, the blue pump of the machine. **Back** stands in that row, and the **Quiz** and **Start again** of a table in the opposite corner: one row of furniture in each corner, and the rest of the glass for the body.

## One side of the table

Everything is upright for the people standing at the edge the panel is in: the panel in the corner, the band of numbers along that edge, and the card beside every object. Nothing is drawn twice. A booth has a front, and the room a second, upside down copy of every number would take goes to the body instead. A table people stand around on every side would want the mirrored copies back, which is a layout change in `packages/tui-kit`.

## Choosing, and going back

A table has no click, so everything that is pressed rather than turned is pressed by a finger: a disc on the landing page, the organ it points at, a switch in the panel, or **Back**, which every table carries above its title. Two gestures press one, and nobody has to be told which:

- **A tap.** A finger that lands on an element and goes again presses it when it goes, the way a phone answers.
- **A rest.** A finger that stays on an element presses it after a moment, and the element fills while the finger is there, so that holding is visibly doing something.

A finger that moves off the element before it goes presses nothing, and neither does a hand sweeping across the glass or one leaning on it: a press belongs to the element the finger landed on and left from. Everything a visitor can press is at least a fingertip across, because a visitor aims by eye across a table rather than with a pointer.

A visit begins before the landing page. The first screen asks which **language** to speak, with every language written in its own tongue; the second asks **who is looking**, a child, an adult or somebody of the field; the third asks **who is at the table**, the body every model is then solved for. All three answers go into the address, so a link that already says them walks straight in.

The landing page carries no panel: a heading, what the tables are for, the body of that person in the middle, and the four tables as coloured discs on a ring around it, each the same distance from the body and each in the colour of the organ it is about. The figure is that person and nobody else, at the height of that body and the width its weight makes. What a table is about stands in the sidebar at the right: the disc a hand is over, or an organ a finger is on, fills it with the whole of what that table shows, in the colour of that table. While nothing is chosen the sidebar is the key of the four colours.

The landing page reads no object at all. The objects belong to a table, which numbers them from 1, so one set of pucks serves every table and nothing has to be handed to a visitor who has just walked up.

## The page a table opens with

Every table opens with one page, in the words of the chosen level and in the colour of that table, so a visitor who pressed a red circle meets a red page: what this table is about in a sentence or two, then every object with what turning it changes. A speaker reads it aloud, and **Start** hands the surface over. The things worth trying belong to the panel, which stands beside the surface while they are being tried.

Beside each object is a **light bulb** for the visitor who wants more than how to turn it. It opens the physiology behind that object in the place of the list, one at a time, closed again from its own corner, so the page keeps its size and the way in is never pushed off the glass. That matters on a table that cannot scroll. The text is one piece of prose rather than one per level, because the depth is the point of asking for it; the line above it follows the level.

It is the same page on every table, built in `packages/tui-kit` out of what a table already tells its panel. The background of an object travels with the object, as `background` of its `TokenRole`, written beside the label and the sentence in the `text.ts` of its table. Starting that table again brings the page back.

## What a visitor is told

Each table says the little that is needed at a glance and keeps the rest behind the thing it belongs to. Hovering a number, an object, an organ or a card with a mouse, or resting a finger on it, opens a note that says what it is: what a portal pressure means, what the object in somebody's hand does, how much blood an organ is getting.

Inside the ring of an object is a picture of the thing it stands for, and the picture answers while the object is turned: a vessel narrows as its resistance goes up, a heart beats at the rate of the dial, a tablet fills, a clock hand walks through the days after an operation.

Every object that is turned wears a **band on its ring**, which is the change it is making. It grows out of the baseline of that object, the value the model has without it: the detent at the top of the dial for an object whose reference sits in the middle of its range, the end of the track for one whose reference is an end of it, like a liver that cannot be healthier than healthy. The band is red where the object was turned up and blue where it was turned down, and thicker the further it has been turned. An object nobody has moved wears none, so a table left alone says so from across the room.

Everything that is said can be **read aloud**. A speaker stands beside the sentence of the panel, inside every note, beside the sidebar of the landing page and beside the questions of the first screen. It reads in the language of the visitor, from the recorded clip where there is one and with the speech of the browser where there is not. See [Languages and the voice](languages.md).

## The curves

A course drawn under a scene keeps the scale it opened with. Both ends are written at the side of the box, with the unit over them, and the scale only ever widens, when a curve leaves it. A plot whose axis follows what the numbers happen to be doing shows the same picture whatever the objects are set to, which is the opposite of what a visitor who just turned something wants to see.

What a course was before the objects were last moved stays behind it and fades, losing half of what is left every one and a half seconds, so the last few states are a trail in the direction the change went. The strip charts of the heart carry the same rule: their ceiling rises with what the table has shown and never falls again.

## Two surfaces

A visitor can tell from across the room what they are looking at. The **white canvas** is what is being shown: the body, the segments, the machine, the course of a curve. The **blue card** is what is being said: the panel, a note behind an element, the card beside an object. Everything that speaks is a pale blue card on the white canvas, the way a note in the margin of an atlas is. The dark is left to the furniture: the gear, the quiz and the ring of a tick.

## The quiz

Every table carries three questions behind the **Quiz** button. A question has two or three answers, a visitor rests a finger on one, and the card says at once whether it was right, why, and what to turn at the table to see it happen. Nothing is lost by being wrong: the reason is the part worth remembering and it is shown either way. At the end the card says how many were right and offers the three again. The questions are in the `text.ts` of the table, in the three languages and in the same order, which a test insists on, so a visitor who switches language in the middle keeps their place.

## Who is at the table

A model of the body is a model of somebody, so the third question of the first screen asks who. Four answers on one screen: the **body**, a woman or a man, drawn rather than named; the **age**, from three to a hundred years; what that body **weighs**, from three to a hundred and fifty kilograms; and how **tall** it is, from fifty to two hundred and thirty centimetres.

The screen opens where the question before it points. A visitor who said a **child** is looking is shown a body of ten years, with the weight and the height of a body of ten; an adult and somebody of the field open at the reference adult of thirty-five. Asking a ten year old to drag the age down from thirty-five is asking them to answer the same question twice.

The three numbers are set one by one and none of them moves another, because the age, the weight and the height of a person are three measurements rather than one. Each line carries a mark at what is typical for the age that is currently set, so a visitor sees what a body of that age usually weighs without anything moving by itself. The lines are the one thing on these tables that is dragged rather than pressed.

What the answers do:

- The **age and the body** give the reference body of ICRP 89 (`children_human.toml` and `physiology_human.toml` of pkpdsim), interpolated in age the way the library interpolates it. That is where the weight and height lines open and what their marks stand at.
- The **weight and the height** are the `BW` and the `HEIGHT` of every model, which scales the organs, their blood volumes and their flows.
- The **years of an adult** carry the fall of the kidney function with them (`age_human.toml`, Delanaye 2022 and Eriksen 2020), so the creatinine clearance of the drug table opens where the years have left it.

What it is not: a model of a child. A three year old is not a small adult, and the enzymes of a child, the water in their tissues and the way they absorb a tablet are not those of a grown up. What the tables show at three years is the physiology of a body of that size, which is where a visitor starts to see why a child is given another dose. The drawing is the grown up anatomy either way, stretched to the height of this body and to the width its weight makes.

The person is in the address as `?age=`, `?sex=`, `?bw=` and `?height=`.

## Starting again

**Start again**, beside the quiz in the corner of a table, resets that table: it loads once more at its reference state, with the page the table opens with up again. It is a reload and not an undo, which is what an exhibit between two visitors wants. It keeps the language, the level and the tracker, which belong to the booth, and the body, which belongs to the visitor standing there.

**Restart the table**, in the corner of the landing page, resets the visit: back to the first question, the language, the level and the body forgotten, the stars every quiz handed out cleared. It keeps nothing but the tracker the booth was set up with.

## The page about all of this

The line under the laboratory opens one more page, which is not a table: **about**. It carries whose laboratory this is and how to reach it, which models the tables solve and where they come from, which software solves them, under which licences, and who paid for the work. Everything a licence asks to be said is there, including the anatomy, which is adapted from the EMBL-EBI Expression Atlas anatomograms under CC BY 4.0. A table carries none of it: the glass in front of an audience is for the body. The page is reached at `?app=about`.

## Full screen

A table has no keyboard and no browser chrome. Start Chrome in kiosk mode on the page:

```bash
google-chrome --kiosk --noerrdialogs --disable-pinch --overscroll-history-navigation=0 \
  --autoplay-policy=no-user-gesture-required \
  --app="http://localhost:4173/?tuio=localhost:3333&lang=de"
```

`--autoplay-policy=no-user-gesture-required` is for the clips: a finger resting on a button is a press of the table and not a gesture the browser counts as an interaction, and without the flag Chrome would hold the first clip of the day back. `&lang=` and `&level=` open the table in the language and at the level a booth starts the day with.

Serve the built application rather than the development server:

```bash
npm run build
npm run preview
```

The build under `apps/table/dist` is self contained, every table with its models and its runtime, so it can be copied to the machine that drives the table and served by anything. Nothing it needs is on the network. `npm run preview` serves it on 4173 and starts the simulator beside it; `npx vite preview --port 4173 apps/table` serves it alone.

Also worth doing on the machine at a booth: turn off screen blanking and the screen saver, turn off automatic updates, and disable the system gestures a stray palm on the glass would trigger.

## Assign the markers

Every table numbers its markers from 1, so the same objects serve all of them: the [circulation](apps/cardiovascular.md) uses 1 to 3, [liver surgery](apps/lobes.md) 1 and 2, [the drug](apps/glimepiride.md) 1 to 6 and [machine perfusion](apps/perfusion.md) 1 to 4. An object means whatever the open table reads it as.

Put the marker on the underside of a puck, and a label and an arrow on the top. The angle of the object is the value it carries, so the arrow is the needle of the dial. An object whose marker nothing claims is drawn as unassigned rather than ignored, which is how a mislabelled puck is found.

## What to check before an audience arrives

1. The body is on the surface, and a finger held on a disc opens its table.
2. The gear in the corner shows a green dot and the address of the tracker.
3. Every puck is recognised: put each one down in turn and watch its card appear with the right name and its picture inside the ring.
4. Turning a puck moves both the picture inside it and the numbers at the edge.
5. Lifting a puck returns its number to the reference.
6. The panel, the numbers and the cards all read upright from the side the visitors stand at.
7. A finger resting on a number, an organ or an object opens the note behind it.
8. The first screen asks the language, who is looking and who is at the table, and **Restart the table** on the landing page asks all three again.

## When something goes wrong during the day

A table of an exhibition stands for hours with nobody looking after it, so it mends what it can by itself.

**The tracker goes away.** The gear turns red and names what happened, and the page asks the tracker again after a second, then two, then four, then every eight until it answers. The objects on the glass are forgotten while it is gone, because the page no longer knows what is on the surface, and the first bundle of a tracker which came back brings them all. Nobody has to reload anything.

**The table cannot start.** One sentence says so in the language of the visitor, the reason for whoever looks after the table stands small underneath, and the page loads itself again after twenty seconds. A model that was not copied in yet, or a file that did not arrive the first time, fixes itself as soon as it is there.
