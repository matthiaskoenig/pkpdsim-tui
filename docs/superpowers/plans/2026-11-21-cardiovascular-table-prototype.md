# Cardiovascular table prototype implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A `pkpdsim-tui` repository whose cardiovascular table application is driven by physical objects over TUIO 2.0, runs without a table on a mouse, and ships a zensical site that explains TUIO and the simulator.

**Architecture:** npm workspaces. `packages/tuio-input` turns TUIO 2.0 into a snapshot of tokens and pointers and maps marker identity, angle and position to roles, values and targets. `packages/cardio-sim` is the TypeScript port of the exact algebraic reduction of the steady pressure network, validated against the reference solution pkpdsim exports. `apps/cardiovascular` renders the anatomy, binds four resistance roles to the solver, and lays the result out for people standing around a table.

**Tech Stack:** TypeScript 7, Vite 8, vitest 5, `tuio-client` 0.1.0, `osc-js` 2.4.1, `vecti` 3, zensical for the documentation.

**Spec:** `docs/superpowers/specs/2026-11-21-pkpdsim-tui-design.md`

## Global Constraints

- Token positions are normalized 0..1 of the sensor; angles are radians in 0..2 pi; the frame `dim` field packs sensor width in the first two bytes and height in the final two.
- The TUIO 2.0 marker identity of a token is `cId`; `tuId` packs user id and type id; `sessionId` identifies one presence of one object.
- The default WebSocket tracker is `ws://localhost:3343` with TUIO 2.0. Port 3333 is the UDP port of the protocol and is never the WebSocket port.
- `tuio-client` ships no WebSocket receiver; the repository carries one that subclasses `TuioReceiver` over `OSC.WebsocketClientPlugin`.
- No model equations are written here. The cardiovascular numbers come from `cardiovascular-data.json` and the port of `cardiovascular-model.mjs`, both of pkpdsim.
- Node packages are used at their latest release.
- No browser dialogs: `alert`, `confirm` and `prompt` block a table and are never used.

## Review Focus

- A token arrives with a marker identity no role claims. The scene has to show it as unassigned, not crash and not silently act as another role.
- A token is lifted in the middle of a twist. Its role returns to the reference value and the scene stops drawing its card.
- The tracker is absent, refuses the connection, or drops it. The application stays usable on the mouse and the status chip names what to do.
- Two tokens of the same role sit on the table at once. The later one wins, deterministically, and lifting it hands control back to the earlier one.
- Controls reach the edge of their range, or a solve is asked for an arterial pressure below the venous pressure. The solver refuses and the last good picture stays on screen.

---

### Task 1: The repository and the input layer types

**Files:**
- Create: `package.json`, `tsconfig.base.json`, `vitest.config.ts`, `.gitignore`, `README.md`
- Create: `packages/tuio-input/{package.json,tsconfig.json}`, `packages/tuio-input/src/types.ts`
- Test: none of its own; the types are exercised by every later task.

**Interfaces:**
- Produces: `TableToken {sessionId, typeId, componentId, x, y, angle}`, `TablePointer {sessionId, x, y, radius, press}`, `TableSnapshot {tokens, pointers, sensor, at}`, `TableStatus {state: "idle"|"connecting"|"connected"|"error", detail, source}`, `TableInput {status, snapshot, connect, disconnect, subscribe}`.

- [ ] **Step 1: Write the workspace root** with workspaces `packages/*` and `apps/*`, and scripts `dev`, `build`, `test`, `typecheck`, `sync`, `docs`.
- [ ] **Step 2: Write `src/types.ts`** with the interfaces above, `sensor` as `{width, height}` and `at` as a millisecond timestamp.
- [ ] **Step 3: Run `npm install`** and verify `npm run typecheck` passes with no files to check yet.
- [ ] **Step 4: Commit.**

### Task 2: Angles, roles and hit testing as pure functions

**Files:**
- Create: `packages/tuio-input/src/angle.ts`, `roles.ts`, `hit-test.ts`
- Test: `packages/tuio-input/test/{angle,roles,hit-test}.test.ts`

**Interfaces:**
- Produces: `unwrapAngle(previous: number, next: number): number`; `TokenRole {id, label, markers, min, max, reference, mode: "absolute"|"relative", turns, unit, scale: "linear"|"log"}`; `roleForMarker(roles, marker): TokenRole | undefined`; `valueFromAngle(role, angle, origin?): number`; `angleForValue(role, value): number`; `hitTest(anchors, point, radius): string | undefined`.

- [ ] **Step 1: Write the failing tests.** `unwrapAngle` carries 0.1 past 2 pi to just above 2 pi and -0.1 below zero to just below zero, and never jumps by more than pi. `valueFromAngle` on an absolute linear role of range 1..8 returns the reference at angle 0, the maximum just below a full turn, and clamps outside. A log role of range 1..8 returns the geometric midpoint at half a turn. A relative role returns the reference at its origin and the same value for the same offset after two turns. `roleForMarker` returns undefined for an unclaimed marker. `hitTest` returns the nearest anchor within the radius and undefined beyond it.
- [ ] **Step 2: Run `npm test -w @pkpdsim-tui/tuio-input`** and verify the failures.
- [ ] **Step 3: Implement the three modules.** `valueFromAngle` divides the turn into `turns` revolutions and interpolates in the chosen scale; `hitTest` compares squared distances in anchor units.
- [ ] **Step 4: Run the tests and verify they pass.**
- [ ] **Step 5: Commit.**

### Task 3: The snapshot reducer and the TUIO client

**Files:**
- Create: `packages/tuio-input/src/snapshot.ts`, `receiver.ts`, `tuio.ts`, `index.ts`
- Test: `packages/tuio-input/test/snapshot.test.ts`

**Interfaces:**
- Consumes: the types of Task 1.
- Produces: `applyTuioObject(snapshot, object, now): TableSnapshot` and `removeTuioObject(snapshot, object): TableSnapshot`, both pure over the nullable `token`/`pointer` of a `Tuio20Object`; `sensorFromDim(dim): {width, height}`; `class WebsocketTuioReceiver extends TuioReceiver`; `createTuioTableInput({host, port, flip}): TableInput`.

- [ ] **Step 1: Write the failing tests** against hand built objects shaped like `Tuio20Object`: a token add, a move, an angle change, a removal, a pointer add and removal, an object that carries neither a token nor a pointer, and `sensorFromDim(640 + 480 * 65536)` returning `{width: 640, height: 480}`.
- [ ] **Step 2: Run the tests and verify the failures.**
- [ ] **Step 3: Implement the modules.** The receiver is the `osc-js` subclass of the `tuio-client` README. `createTuioTableInput` wires `Tuio20Client`, reduces through `applyTuioObject` on `tuioAdd`/`tuioUpdate` and `removeTuioObject` on `tuioRemove`, reads the sensor from `client.dim` on `tuioRefresh`, and reports status transitions including a failed connection.
- [ ] **Step 4: Run the tests and verify they pass.**
- [ ] **Step 5: Commit.**

### Task 4: Mouse and keyboard input with the same interface

**Files:**
- Create: `packages/tuio-input/src/mock.ts`
- Test: `packages/tuio-input/test/mock.test.ts`

**Interfaces:**
- Produces: `createMockTableInput({element, markers}): TableInput & {place(marker, x, y), lift(sessionId)}`.

- [ ] **Step 1: Write the failing test.** Placing a marker publishes a snapshot with one token at that position; dragging moves it; a wheel gesture over it changes its angle and wraps past 2 pi; lifting removes it; the status is `connected` with a source that names the mouse.
- [ ] **Step 2: Run the test and verify it fails.**
- [ ] **Step 3: Implement `createMockTableInput`** over pointer and wheel events of the element, with digit keys placing the marker of that index at the cursor and backspace lifting the token under it.
- [ ] **Step 4: Run the test and verify it passes.**
- [ ] **Step 5: Commit.**

### Task 5: The pressure network port

**Files:**
- Create: `packages/cardio-sim/{package.json,tsconfig.json}`, `packages/cardio-sim/src/{types.ts,pressure.ts,reference.ts,index.ts}`
- Test: `packages/cardio-sim/test/pressure.test.ts`

**Interfaces:**
- Produces: `PressureReference` and `PressureControls` types; `defaultControls(reference): PressureControls`; `solvePressure(reference, controls): PressureSolution` with `{ppo, pli, qpo, qh, qha, co, flows, systemicFlow, portalResidual, hepaticResidual}`; `loadCardiovascularData(url)` and `loadAnatomy(url)` with runtime validation.

- [ ] **Step 1: Write the failing test** over the committed fixture of the reference block of `cardiovascular-data.json`: the default controls reproduce `portal_pressure` 10, `hepatic_pressure` 8 and `cardiac_output` 6.5 to 1e-9, every organ flow matches its exported `flow` to 1e-9, both residuals are below 1e-9, and `solvePressure` throws a `RangeError` for a non positive resistance and for an arterial pressure at or below the venous pressure.
- [ ] **Step 2: Run the test and verify it fails.**
- [ ] **Step 3: Port `cardiovascular-model.mjs`** of pkpdsim to typed TypeScript without changing the algebra, and write the loaders.
- [ ] **Step 4: Run the test and verify it passes.**
- [ ] **Step 5: Commit.**

### Task 6: The asset sync script

**Files:**
- Create: `scripts/sync-assets.mjs`

- [ ] **Step 1: Implement the script.** It resolves a pkpdsim checkout from `--pkpdsim` or `PKPDSIM_DIR`, defaulting to the sibling `../pkpdsim`, copies `cardiovascular-data.json`, `cardiovascular-anatomy.json` and `solver/` into `apps/cardiovascular/public/assets/`, writes a `provenance.json` naming the source and the `provenance` block of the data file, and fails with a readable message when the checkout has no exported examples.
- [ ] **Step 2: Run `npm run sync`** and verify the files land and `provenance.json` names the pkpdsim commit.
- [ ] **Step 3: Commit.**

### Task 7: The cardiovascular table application

**Files:**
- Create: `apps/cardiovascular/{package.json,tsconfig.json,vite.config.ts,index.html}`, `apps/cardiovascular/src/{main.ts,roles.ts,scene.ts,cards.ts,readout.ts,status.ts,style.css}`
- Test: `apps/cardiovascular/test/roles.test.ts`

**Interfaces:**
- Consumes: Tasks 2 to 5.
- Produces: `CARDIOVASCULAR_ROLES: TokenRole[]` and `controlsFromTokens(roles, tokens, reference): PressureControls`.

- [ ] **Step 1: Write the failing test** for `controlsFromTokens`: no tokens gives the default controls; a hepatic token at a known angle gives the value `valueFromAngle` gives; a token with an unclaimed marker is ignored; two tokens of one role resolve to the one with the higher session id.
- [ ] **Step 2: Run the test and verify it fails.**
- [ ] **Step 3: Implement the application.** Four roles on markers 1 to 4 (hepatic, systemic, portal, renal), log scale for hepatic and portal over 1..8, linear for systemic over 0.5..2 and renal over 0.5..3. The scene draws the exported silhouette and anchors in SVG, organ discs scaled by flow and coloured by the ratio to the reference flow, and the portal and hepatic vessels as paths whose width follows the flow. A card follows each token, rotated to its angle. The headline numbers are drawn at two opposite edges, the second copy rotated by 180 degrees. The status chip names the tracker, and when none is connected it names the simulator settings and the mouse fallback. `?tuio=host:port` and `?mock` select the input.
- [ ] **Step 4: Run the test and verify it passes, then `npm run build` and verify the bundle.**
- [ ] **Step 5: Commit.**

### Task 8: The documentation site

**Files:**
- Create: `zensical.toml`, `pyproject.toml`, `docs/{index.md,tuio.md,simulator.md,table.md,development.md}`, `docs/apps/cardiovascular.md`
- Create: `.github/workflows/{ci.yml,docs.yml}`

- [ ] **Step 1: Write the pages.** `tuio.md` introduces TUIO with its citation, the tracker and client architecture, the OSC transport and the default port 3333, the 1.1 profiles and their field lists, and the 2.0 component model and messages. `simulator.md` gives the settings (WebSocket, TUIO 2.0, port 3343), the gestures of the simulator, and how to start an application against it. `table.md` covers a Scape table and the marker assignment. `docs/apps/cardiovascular.md` names each role, its marker and its range.
- [ ] **Step 2: Run `uv run zensical build --clean --strict`** and verify it builds with no warnings.
- [ ] **Step 3: Commit.**
