# Run on a table

A multitouch table with object recognition is a browser, a tracker and a sheet of glass. The browser is the only part these applications know about.

## The surface

The tables of [Interactive Scape](https://www.interactive-scape.com/) recognise objects capacitively: the markers are passive and are read through the glass, with no camera below the table and no light of their own. The table reports them over TUIO, which is what makes a browser enough to write a table application. [DISPLAX](https://www.displax.com/) and the SUR40 bridges emit TUIO as well, and anything else that offers TUIO 2.0 over a WebSocket will work.

The sensor reports its own size in each frame, so an application does not have to be told the resolution of the surface, and positions arrive as fractions of it rather than in pixels.

## Point the browser at the tracker

Find the WebSocket host and port of the table in its own configuration, then open the application with them:

```
http://<the machine that serves the application>:5173/?tuio=<table host>:<table port>
```

That address is the body, from which a visitor opens a table; `&app=cardiovascular` opens one of them at once, which is what a booth with one subject uses. If the browser runs on the table itself, the host is `localhost`. Start with the [simulator settings](simulator.md), which is the same protocol on the same port.

A page which is told about a tracker this way listens to it alone, so a stray mouse on the machine cannot put objects on the surface of an exhibition. A page which is told nothing looks for a tracker behind its own server at `/tuio` and otherwise runs on the mouse, which is what the development server and a deployed build respectively give you.

## One side of the table

Everything a table draws is upright for the people standing at the edge the panel is in: the panel in the corner, the band of numbers along that edge, the cards of the tables on the body, and the card beside every object. Nothing is drawn twice.

That is a decision about what these tables are for. A booth has a front, and the room that a second, upside down copy of every number would take goes to the body instead. A table that people are meant to stand around on every side would want the mirrored copies back, which is a layout change in `packages/tui-kit`: the panel, the band and the card of an object are each drawn in one place.

## Choosing, and going back

A table has no click, so everything which is pressed rather than turned is pressed by **resting a finger on it**: a card on the landing page, the organ the card points at, a switch in the panel, or **Back**, which every table carries above its title and which returns to the landing page. The element fills while the finger is on it, so that holding is visibly doing something, and lifting the finger before it is full cancels it. A hand sweeping across the glass opens nothing.

The landing page carries no panel: a heading, what the tables are for, the body of the person at the table in the middle, and the four tables as big coloured icons on a ring around them, each the same distance from the body and each in the colour of the organ it is about, which the body carries too. It is one person seen four ways, which is the thing to understand before a visitor walks to the first table. The figure stands at the height of that person, so a body of eight years is smaller in the ring than a grown up, and the line in the corner says who they are.

What a table is about stands in the **sidebar at the right**: the icon a hand is over, or an organ a finger is on, fills it with the whole of what that table shows, in the colour of that table. It is one place to read rather than a note wherever the hand happens to be, which is what a table across a room wants. While nothing is chosen the sidebar is the key of the four colours, so that an icon on the ring and an organ on the body are read as one table.

The landing page reads **no object at all**. The objects of the surface belong to a table, which numbers them from 1, and a visitor who has just walked up has their hands: a card is opened by resting a finger on it or on the organ it points at. One set of pucks therefore serves every table, and nothing on the glass of the landing page has to be handed to anybody.

A visit begins before the landing page. The first screen asks **which language** to speak, with every language written in its own tongue so that the question is readable by whoever walked up; the second asks **who is looking**, a child, an adult or somebody of the field; and the third asks **who is at the table**, which is the body every model is then solved for. All three answers go into the address, so every table opened from the landing page is in that language, at that level and about that body, and a link which already says them walks straight in. **Von vorn** in the corner of the landing page asks the three questions again and forgets what the last visitor did, which is what a booth wants between two of them.

The laboratory is in the bottom right corner of **every page** with the square a phone is pointed at: the first screen, the landing page and each of the four tables, in the same place and at the same size, because a visitor who walks up to a table in the middle of a room has to be able to read whose work it is and take the address with them without finding their way back. The line under it opens the page **about** all of this: whose laboratory the models come from, what they are, which software solves them, under which licences, and who paid for the work. That page is the one page without the block, since it is what the block opens and carries the square itself. Everything a licence asks to be said is on it, and nothing of it is on the glass of a table.

Everything about the table itself, rather than about what is on it, waits behind the **gear in the far corner** of a table, and stands open on the landing page: which table is open, the language and the level. They are three rows of either-or switches with a tick on the one which is on, drawn as pictograms and flags rather than words, because a visitor who cannot read the language is the one who needs the language switch. The address of the tracker is in that card too, where it belongs to whoever set the booth up, rather than on the glass in front of the audience; the dot on the gear is green while the table is connected and amber while it is not. The gear says nothing and reads nothing aloud: the settings are not something a table explains. The choices hold while a visitor walks from one table to another and travel in the address, so a booth can be opened on `?lang=es&level=child` and stay there. See [Languages and the voice](languages.md).

Every table wears **its own colour and its own picture** over the title of its panel: the red heart of the circulation, the purple scalpel of the operations, the green tablet of the drug, the blue pump of the machine, each the icon of the card which opened it. A visitor who pressed a green circle a moment ago meets a green circle at the table they walked to, and what the table says of itself, the sentence under its title, is marked in that colour too.

## Two surfaces

A table has exactly two kinds of surface, and a visitor can tell what they are looking at from across the room.

- **The white canvas** is what is being shown: the body, the lobule, the segments, the machine, the course of a curve. It carries the heading of the table in the far corner of the panel, large enough to be read while walking up.
- **The blue card** is what is being said: the panel, the note behind an element, the card beside an object. Everything which speaks is a pale blue card on the white canvas, the way a note in the margin of an atlas is, and nothing else is. The dark is left to the furniture of the table: the gear in the corner, the quiz and the ring of a tick.

## The quiz

Every table carries three questions behind the **Quiz** button under its panel. A question has two or three answers, a visitor rests a finger on one, and the card says at once whether it was right, why it was right, and what to turn at the table to see it happen. Nothing is lost by being wrong: the reason is the part worth remembering, and it is shown either way. Three dots in the head of the card say which question this is. At the end the card says how many were right and offers the three again.

The questions of a table are in its `text.ts`, beside everything else a visitor reads, in the three languages and in the same order, which a test insists on: a visitor who switches language in the middle of the quiz keeps their place.

## What a visitor is told

Each table says the little that is needed at a glance, and keeps the rest behind the thing it belongs to. Hovering a number, an object, an organ or a card with a mouse, or resting a finger on it for a moment at the table, opens a note that says what it is: what a portal pressure means, what the object in somebody's hand does, how much blood an organ is getting.

The objects say what they are as well. Inside the ring of an object is a picture of the thing it stands for, and the picture answers while the object is turned: a vessel narrows as its resistance goes up, a heart beats at the rate the dial is set to, a tablet fills, a clock hand walks through the days after an operation.

Everything which is said can be **read aloud**. A speaker stands beside the sentence of the panel, inside the note behind an element, beside what the sidebar of the landing page says and beside the questions of the first screen; it reads in the language of the visitor, from the recorded clip of that sentence where there is one and with the speech of the browser where there is not, and says so while it is reading. Pressing it again stops it. See [Languages and the voice](languages.md).

## Who is at the table

A model of the body is a model of somebody, so the third question of the first screen asks who. It is three answers on one screen: the **body**, a woman or a man, drawn rather than named; the **age**, from four to a hundred and twenty years; and what that body **weighs**, which opens at the reference of that age and moves half again either way. Two lines with a knob carry the age and the weight, and they are the one thing on these tables which is dragged rather than pressed: a finger anywhere on the line sets it, and the knob follows from the first moment.

What the three answers do:

- The **age and the body** give the reference body of ICRP 89 (`database/tables/children_human.toml` and `physiology_human.toml` of pkpdsim: the reference children at 0, 1, 5, 10 and 15 years of either sex, and the reference adult at 35), interpolated in age the way the library interpolates it. That gives the height, which no dial carries, and the weight the dial opens at.
- The **weight and the height** are the `BW` and the `HEIGHT` of every model of the collection, which scales its organs, their blood volumes and their flows from the two. The circulation, the operations of a human liver and the drug through the body are each solved for them.
- The **years of an adult** carry the fall of the kidney function with them (`age_human.toml`, Delanaye 2022 and Eriksen 2020), so the creatinine clearance of the drug table opens where the years have left it.

What it is not: a model of a child. A four year old is not a small adult, and the enzymes of a child, the water in their tissues and the way they absorb a tablet are not those of a grown up. What the tables show at four years is the physiology of a body of that size, which is where a visitor starts to see why a child is given another dose. The drawing of the body is the grown up one of the anatomy either way; what changes with the age is how tall it stands and every number which is solved for it.

The person is in the address as `?age=`, `?sex=` and `?bw=`, and the line in the corner of the landing page opens the question again at any time. The body switch of a table changes the same `?sex`, and forgets the weight with it, because the weight of a body belongs to the body it was set on.

## Starting again

Every table carries **Start again** under what it is showing. It loads the table once more at its reference state: the body of the physiology, every value as it was exported, nothing of what the last visitor did left on the glass. It is a reload and not an undo, which is what an exhibit between two visitors wants, and it keeps the language, the level and the tracker, which belong to the booth and not to the visitor.

## The page about all of this

The line under the laboratory in the corner of the landing page opens one more page, which is not a table: **about**. It carries whose laboratory this is and how to reach it, which models the tables solve and where they come from, which software solves them, under which licences all of it stands, and who paid for the work. It is where everything a licence asks to be said is said, including the anatomy of the bodies, which is adapted from the EMBL-EBI Expression Atlas anatomograms under CC BY 4.0. A table itself carries none of it: the glass in front of an audience is for the body, not for attributions.

The page is reached at `?app=about`, and **Back** returns to the landing page, by a finger as everywhere else.

## Full screen

A table has no keyboard and no browser chrome. Start Chrome in kiosk mode on the page:

```bash
google-chrome --kiosk --noerrdialogs --disable-pinch --overscroll-history-navigation=0 \
  --autoplay-policy=no-user-gesture-required \
  --app="http://localhost:4173/?tuio=localhost:3333&lang=de"
```

`--autoplay-policy=no-user-gesture-required` is for the clips, which are off at the moment: a finger resting on a button is a press of the table and not a gesture the browser counts as an interaction, and without the flag Chrome would hold the first clip of the day back. `&lang=` and `&level=` open the table in the language and at the level a booth wants to start the day with; a visitor changes both on the table.

Serve the built application rather than the development server:

```bash
npm run build
npm run preview
```

The build under `apps/table/dist` is self contained, every table with its models and its runtime, so it can be copied to the machine that drives the table and served by anything. Nothing it needs is on the network. `npm run preview` serves it on 4173 and starts the simulator beside it; `npx vite preview --port 4173 apps/table` serves it alone.

Also worth doing on the machine at a booth: turn off the screen blanking and the screen saver, turn off automatic updates, and disable the system gestures that a stray palm on the glass would otherwise trigger.

## Assign the markers

Every table names the markers it reads, and every one of them starts at 1, so the same objects serve all of them: the [circulation](apps/cardiovascular.md) uses 1 to 4, the two of the heart and two resistances, [liver surgery](apps/lobes.md) 1 and 2, the knife and the days, and [the drug](apps/glimepiride.md) 1 to 6. An object means whatever the table that is open reads it as, so one set of pucks serves all of them.

Put the marker on the underside of a puck, and put a label and an arrow on the top. The angle of the object is the value it carries, so the arrow is not decoration: it is the needle of the dial. An object whose marker nothing claims is drawn on the table as unassigned rather than ignored, which is how a mislabelled puck is found.

## What to check before an audience arrives

1. The body is on the surface, and a finger held on a card opens its table.
2. The gear in the corner shows a green dot and the address of the table.
3. Every puck is recognised: put each one down in turn and watch its card appear with the right name and its picture inside the ring.
4. Turning a puck moves both the picture inside it and the numbers at the edge.
5. Lifting a puck returns its number to the reference.
6. The panel, the numbers and the cards all read upright from the side the visitors stand at.
7. A finger resting on a number, an organ or an object opens the note behind it.
8. The first screen asks the language and who is looking, the landing page opens the table a finger rests on, and **Von vorn** in its corner asks both questions again.
