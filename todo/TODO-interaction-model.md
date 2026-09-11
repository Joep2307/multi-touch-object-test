# TODO — Physical Interaction Model

Status: **phases A to F done; phase G done as far as it can be
without the physical table. Six items remain, every one of them
blocked on the glass. 9 September 2026.** Implementation plan for
`resources/physical-interaction-model.html`: twenty-five entities in
five layers, from contact point to table image. Written 9 September
2026 against the tree as it stands after the phase 6 parity bridge in
`TODO.md`.

This plan **supersedes phases 7 and 8 of `TODO.md`** where they
overlap. Those phases sketched a `Function` / `Grant` / `Verdict` /
`Intent` / `Command` vocabulary; the model replaces it with one
grammar — trigger, condition, effect — used twice, by actions and by
transitions. What survives from the old sketch is written down below
under "Carried over". Phases 0–6, 9 and 10 of `TODO.md` stand.

## Goal

When this is done, the loop in section 00 of the model runs end to
end in `src/core/`, headless and replayable: a `ContactFrame` becomes
a `PhysicalInstance`, the instance's changes become
`InteractionEvent`s, events fire actions and transitions, their
effects change session state, and a presentation layer reads that
state to say what the table shows. Everything to the right of
`InteractionEvent` is loaded from a **programme definition** — data,
not code — so a voting session and a board game are two files, not
two builds.

The first programme is today's table: place a mark, open a note,
capture, vote. That is the proof, and it is the last item in the
plan, not the first.

---

## Ground rules

All of `TODO.md`'s ground rules hold: strict TypeScript, one symbol per
file, a barrel per folder, no number in a function body, the core
imports nothing from `src/state/`, `src/render/`, `src/ui/` or the
DOM. Three rules are new and come from the model itself.

- **Definition versus runtime is a naming rule.** Anything authored
  up front is a `type` whose name ends in `Definition` (or is one of
  the model's other definition nouns: `PhysicalSignature`,
  `Settings`, `TablePresentation`). Anything that exists only during
  a session is a class or a plain runtime type with no suffix
  (`PhysicalInstance`, `RoleAssignment`, `InteractionEvent`,
  `Session`). A definition is JSON-serialisable and carries an `id`;
  a runtime object may hold class instances and never has to be
  serialised except through the event log.
- **The model's names win.** Where the code already has the concept
  under another name, the code keeps working and gets the model's
  name as the exported symbol; the old name is retired in the same
  commit, never kept as an alias. The mapping table below is the
  authority.
- **Presentation never writes back.** No file under
  `src/core/presentation/` may import from `src/core/behaviour/` or
  `src/core/session/`, and nothing in it may call an effect. Lint
  rule, like the core boundary, from the first file.

Layout, one folder per layer of the model:

```
src/core/
  contact/        01  exists — InputContact lives here
  physical/       01  exists — PhysicalKindDefinition, PhysicalInstance
  gesture/        01  new    — GestureDefinition and its recogniser
  events/         01  new    — InteractionEvent, EventType, EventBus
  relation/       01  new    — SpatialRelation, RelationKind
  behaviour/      02  new    — actions, triggers, conditions, effects,
                               states, transitions, state machines
  session/        03  new    — Session, modes, roles, settings, log
  presentation/   04  new    — table presentation, regions, bindings
  programme/      05  new    — ExtensionProperties, ProgrammeDefinition,
                               ModelValidator, JSON loading
```

---

## The 25 entities against the tree

What the model names, what the code has today, and what is missing.
This table is the plan in one page; the phases below are it in order.

### Recognition · 5

| Model                    | Today                                                              | Missing                                                                                          |
| ------------------------ | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `InputContact`           | `ContactPoint` (id, x, y, radius, firstSeen, lastSeen)             | `status: ContactStatus` — Started / Active / Ended, derived per frame                            |
| `PhysicalSignature`      | `FootprintSpec` + `KindFamily` + solver choice in `BaseFactory`    | A kind with **several** signatures; explicit `distanceTolerance`, `orientationRule`, `scaleRule` |
| `PhysicalKindDefinition` | `PhysicalKind` (id, label, family, footprint, affordances, legacy) | `signatures[]`, `defaultRoleId`, `stateMachineId`, `presentationId`, `properties`                |
| `GestureDefinition`      | `Tap` / `TapKind` / `TapPolicy`; `Move`; `Rotate`                  | A descriptor-driven recogniser: Swipe, Shake, Place, Remove; duration/distance/direction windows |
| `PhysicalInstance`       | `Physical` → `TangibleObject` + `Base` + `Presence`                | `roleId`, `currentStateId`, `properties`, `status: InstanceStatus`, a read-only snapshot type    |

### Runtime state · 3

| Model              | Today                                                                     | Missing                                                                   |
| ------------------ | ------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `MotionHistory`    | `Tail` + `TailPoint` + `TailPolicy` (maxAgeMS, maxPoints)                 | Nothing but the name; `MotionSample` = `TailPoint`                        |
| `SpatialRelation`  | Nothing. `IdentityMap` knows "near the same place", `puckSepPX` is legacy | The whole thing: pairwise distance, direction, `RelationKind`, hysteresis |
| `InteractionEvent` | `RegistryEvent` (joined / left / lifted / returned)                       | The whole thing: `EventType`, source/target, timestamp, payload, a bus    |

### Behaviour · 7

Nothing exists. `TODO.md` phase 7 sketched a different vocabulary and
was never started.

| Model                    | Note                                                                  |
| ------------------------ | --------------------------------------------------------------------- |
| `ActionDefinition`       | Free-standing: trigger + conditions + effects + parameters + priority |
| `TriggerDefinition`      | eventType, sourceFilter, targetFilter, parameters                     |
| `ConditionDefinition`    | type, subject, operator, value                                        |
| `EffectDefinition`       | type: `EffectType`, target, parameters                                |
| `StateDefinition`        | presentationId, enabledActionIds, entry/exit effects, properties      |
| `TransitionDefinition`   | from, to, and the same trigger / conditions / effects                 |
| `StateMachineDefinition` | initialStateId, states, transitions                                   |

### Session & roles · 6

| Model            | Today                                                                                             | Missing                                                                          |
| ---------------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `Session`        | `DEFAULT_SESSION` (a storage key) and the objects in `src/state/`                                 | A real object: activeModeId, variables, instances, assignments, log              |
| `ModeDefinition` | `UiMode` (touch / laptop / puck) and `PuckMode` (move / zoom) — both UI, neither a programme mode | The whole thing                                                                  |
| `RoleDefinition` | `PhysicalKind.defaultRole` deliberately left off in phase 5                                       | The whole thing, incl. `overflowPolicy` and the cardinality decided in `TODO.md` |
| `RoleAssignment` | Nothing                                                                                           | The whole thing                                                                  |
| `Settings`       | `CFG` — one flat object, no scope                                                                 | `SettingScope`, validation, defaults; this is where `CFG` is dismantled          |
| `EventLog`       | Nothing (the journal in `TODO.md` decided 9 was never built)                                      | Append-only, every entry stamped with the active mode                            |

### Presentation · 3 + 1

| Model                    | Today                                                         | Missing                                                                  |
| ------------------------ | ------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `TablePresentation`      | `src/render/frame.ts` draws straight from `tracks` and `pins` | Descriptor: background, regions, layers, physical / global presentations |
| `RegionDefinition`       | Nothing                                                       | Shape, position, size, accepted kinds and roles; the enter/exit events   |
| `PresentationDefinition` | `drawPuck`, `drawPins`, `drawChip` — code per thing           | `Renderer`, layer, assets, `bindings`                                    |
| `ExtensionProperties`    | `Pin` has `[extra: string]: unknown`                          | One mixin type, attached to the eight entities the model names           |

### Enumerations in the model

All become string-literal union types, one file each, named as the
model names them: `ContactStatus`, `InstanceStatus`, `Affordance`
(see decision 1), `RelationKind`, `Gesture`, `EventType`,
`EffectType`, `OverflowPolicy`, `AssignmentStatus`, `SettingScope`,
`Renderer`. The model's "examples" chips (`VotingToken`, `Voter`,
`cast_vote`, …) are **not** code: they are entries in the first
programme definition.

---

## Carried over from `TODO.md` phase 7

Ideas from the retired sketch that are better than what the model
says, or that the model leaves open. They are kept, renamed.

- **A denied condition says why.** `Verdict` with `Denied(reason)`
  becomes `ConditionResult`: `{ met: true }` or
  `{ met: false; reason: ConditionDefinition }`. An action that does
  not fire is then explainable on the dev overlay and in the log,
  which is the only way to debug "I tapped and nothing happened" at
  a table with visitors.
- **A mode narrows, never widens** (decided 7). A mode's
  `enabledActionIds` is an intersection filter over the registered
  actions, and `ModelValidator` checks that no mode names an action
  that does not exist.
- **Every effect is stamped with its author** (decided 8, 9).
  `InteractionEvent.sourceId` is the physical that caused it, and
  the log entry that an effect appends carries the event id that
  fired it. Undo and per-participant analysis fall out of the log.
- **`ModelValidator` at boot and in CI**, extended to every
  definition type in the model.
- **`MenuComposer`**: the ring menu is built from the actions
  enabled for this instance's role, state and mode. No UI file names
  a role id. Unchanged, now expressed over `ActionDefinition`.

---

## Phases

Each phase is additive in `src/core/` and ends with `npm run check`
green. Phases A–F need neither the table nor the bridge; they are
pure model and tests. Phase G is the first one that runs on the
glass, and it waits for parity (`TODO.md` phase 6).

### A. Recognition layer — close the gaps

**Done.** 272 unit tests pass, `npm run check` is green, and the new
tests are in `src/test/unit/core/recognition.test.ts`. What building it
changed is written up under "What phase A cost" below.

The layer mostly exists. This phase renames it to the model and
adds what the model has that the code does not.

- [x] `ContactStatus` (`Started` | `Active` | `Ended`) and
      `ContactPoint.status`, derived by `ContactFrame` from whether
      the id was in the previous frame. `Ended` contacts appear in
      exactly one frame so a consumer can see them go.
- [x] `PhysicalSignature`: id, `contactCount`, `geometry`
      (the current `FootprintSpec`), `distanceTolerance`,
      `orientationRule` (`free` | `fixed`), `scaleRule`
      (`fixed` | `free`). `FootprintSpec` becomes the `geometry`
      field of a signature rather than a field of the kind.
- [x] `PhysicalKind` → `PhysicalKindDefinition` with
      `signatures: PhysicalSignature[]` (1..*), `defaultRoleId`,
      `stateMachineId`, `presentationId`, `properties`. The three
      id fields are optional until phases C–E exist; `ModelValidator`
      (phase F) is what makes a dangling id an error. `templateToKind`
      in the bridge produces one signature per template.
- [x] `BaseFactory` picks solver and heading source **per signature**,
      and `PhysicalInstance` reports which one the object is being read
      by. A kind with two signatures — three feet, or five on a ring —
      is the test, and `solverForFamily()` is now one function so that
      `signatureFrom` and `BaseFactory` cannot choose differently.
- [x] **Done, 9 September 2026.** `matchSignature` picks between a
      kind's own signatures, and only within one kind — deciding which
      _kind_ a footprint is stays with the recogniser that already does
      it, because a second opinion about that is how a table ends up
      with two answers and no way to tell which it acted on. Scored
      with `scoreFootprint`, which `Position` now uses too, so a
      signature chosen here cannot be one the trait then reads badly;
      extracting that scorer removed the duplicate it would otherwise
      have needed. The margin over the runner-up is reported rather
      than judged, because how sure is sure enough belongs to whoever
      asked.
      Confidence separates a right reading from a wrong one by about
      eight to one, and the test asserts that, but nothing yet chooses.
      Choosing is one step from deciding which _kind_ a footprint is,
      which is out of scope: a second recogniser competing with the one
      the table already runs is exactly what this plan promised not to
      build. It waits for a kind that genuinely has two signatures.
- [x] `InstanceStatus` (`Detected` | `Missing` | `Removed`) as the
      model's view of `PresenceState`: placed → Detected, placed but
      not measured this frame → Missing, lifted → Missing, gone →
      Removed. `PresenceState` stays underneath; it has four states
      because it needs them, and the model's three are a projection.
- [x] `PhysicalInstance`: the read-only snapshot the rest of the
      system talks to — id, kindId, roleId, pose (position,
      direction, size), motion (velocity, acceleration),
      currentStateId, properties, firstSeenAt / lastSeenAt, status.
      Built from `Base.snapshot()` + `Presence` each frame; nothing
      above the recognition layer sees a `Base` or a trait.
- [x] `roleId`, `currentStateId` and `properties` are **writable only
      through effects** (phase C). Until then they are set by the
      registry from the kind's defaults.
- [x] `Affordance` reconciled with the model's enumeration — see
      decision 1.
- [x] `MotionHistory` = `Tail`, renamed; `MotionSample` = `TailPoint`;
      `maximumAge` / `maximumSamples` are the policy's `maxAgeMS` /
      `maxPoints`. Rename only, no behaviour change, tests stay green.
- [x] `GestureDefinition` + `Gesture` enum + `GestureRecogniser`:
      one recogniser fed the instance's base snapshot per frame,
      reading `inputEventTypes`, `minDuration` / `maxDuration`,
      `minDistance` / `maxDistance`, `directionRange`,
      `requiredContactCount`. `Tap`, `DoubleTap`, `Hold` are
      reproduced from `TapPolicy` as three definitions so the numbers
      move out of the policy and into data; `Place` and `Remove` come
      from `Presence`; `Swipe`, `Rotate`, `Shake` are new. Each emits
      a `physical.*` event (phase B).
- [x] Tests in `src/test/unit/core/recognition.test.ts`: status
      transitions of a contact across three frames; a two-signature
      kind matched both ways; `InstanceStatus` for every
      `PresenceState`; every gesture on synthetic base snapshots, and
      a synthetic shake that must **not** read as a swipe.

### B. Runtime state — events and relations

**Done.** 304 unit tests pass. The hinge of the loop: after this phase
every change on the glass is an `InteractionEvent`, and nothing above
this layer reads a base trait directly.

Four things came out differently from the plan.

- **Two more event types.** `physical.swiped` and `physical.shaken`.
  The model draws fourteen, the gesture list has a swipe and a shake
  in it, and a gesture that cannot become an event cannot be reacted
  to. Smuggling them through `custom.*` was the alternative, and that
  is a programme's space rather than the core's.
- **Gestures are the source of behavioural events; presence is the
  source of arrival and departure.** `physical.detected` and
  `physical.removed` come from the presence transition, because that
  is the only thing that knows a lifted puck from one that lost a foot
  for three frames. So `place` and `remove` left the default gesture
  set: a programme that deleted them would otherwise stop hearing that
  a puck had been put on the table, which is not a programme's
  decision. Both stay in the vocabulary for a programme that wants a
  separately named gesture.
- **The recognisers live in `PhysicalEventSource`, not on the
  physical.** The plan's first guess was the other way round. A
  gesture definition belongs to a programme, and a programme can be
  reloaded while pucks are lying on the glass; hanging the recogniser
  off the object would mean rebuilding every object to change a
  threshold.
- **A near crossing is announced once per pair, not once per
  direction.** Relations are directed and `relations` keeps both, but
  being near is symmetric, and announcing it from both sides fires
  every watching rule twice for one approach.

`inputEventTypes` did **not** land, which answers the second of phase
B's open questions. A gesture fed contact events would be a second way
of reading the same movement, and the recogniser already reads the
base snapshot.

- [x] `EventType`: the fourteen in the model — `contact.started`,
      `contact.moved`, `contact.ended`, `physical.detected`,
      `physical.moved`, `physical.rotated`, `physical.tapped`,
      `physical.removed`, `physical.enteredRegion`,
      `physical.exitedRegion`, `physical.nearPhysical`,
      `state.entered`, `state.exited`, `mode.changed` — plus
      `custom.*` for what an `emitEvent` effect emits
      (`vote.cast`). A string-literal union with a template-literal
      tail, so a typo in a programme file is still caught by
      `ModelValidator`, not by the compiler.
- [x] `InteractionEvent`: id, type, sourceId, targetId, timestamp,
      payload, properties. Immutable. `timestamp` comes from the
      frame clock, never from `Date.now()`, so a replay produces the
      same events.
- [x] `EventBus`: synchronous, ordered, one subscriber list. The
      behaviour layer and the log subscribe; nothing else. An event
      emitted during dispatch is queued behind the current one, not
      nested, so an effect that emits cannot re-enter the action that
      fired it.
- [x] `ContactEventSource`: `contact.*` from the frame diff.
- [x] `PhysicalEventSource`: `physical.detected` / `moved` / `rotated`
      / `tapped` / `removed` from `PhysicalInstance` changes and the
      gesture recogniser. `moved` and `rotated` are **rate-limited by
      policy**, not per frame: one event per frame at 60 Hz is the
      wrong granularity for a rule, and the policy is where "every
      5 px or 2°" lives.
- [x] `SpatialRelation`: sourceId, targetId, distance,
      relativeDirection, `relation: RelationKind`. `RelationKind` is
      `Nearest` | `Near` | `Far` | `Touching` | `Overlapping` |
      `Inside` | `Outside`.
- [x] `SpatialRelationPolicy`: the `Near` / `Far` distances in mm and
      the touch tolerance. The gap between near and far **is** the
      hysteresis, so there is no third number; the policy refuses a
      pair where leaving is easier than arriving. `Touching` and
      `Overlapping` use the kinds' outer diameters, never a constant.
- [x] `SpatialIndex`: per frame, every pair of detected instances;
      emits `physical.nearPhysical` on a `Far → Near` crossing only.
      O(n²) is fine — the table holds tens of objects, not thousands;
      write that in the header comment so nobody optimises it.
- [x] Tests in `src/test/unit/core/events.test.ts` and
      `relation.test.ts`: a replayed recording produces an identical
      event list twice; the bus queues rather than nests; two
      synthetic pucks approaching cross `Near` exactly once with
      jitter around the threshold; `Inside` for a small disc placed
      on a large one.

### C. Behaviour layer — rules and states

**Done.** 332 unit tests pass, and the model's own voting example runs
end to end in `src/test/unit/core/behaviour.test.ts` — including the
second tap doing nothing, with the trace naming the state condition as
the reason. Nothing was written to make the second tap do nothing: the
token moved to `Voted`, and `Voted` is not `Ready`.

One grammar, two applications. The grammar came first and the state
machine on top of it.

Three things came out differently from the plan.

- **Conditions share one comparator.** The plan said one
  `ConditionEvaluator` class per type. What the ten types differ in is
  _where they look_ — a role id, a variable, a distance — while the
  eight operators are identical for all of them. So each type is a
  `ConditionSubject` that resolves a value, and `evaluateCondition` is
  the single place `lte` is implemented. Ten classes each
  re-implementing eight comparisons would be eight comparisons written
  ten times, and the tenth would eventually differ. Effects kept a
  class each, for the opposite reason: they share nothing at all.
- **`region` was two questions under one name.** "Is this inside that
  object" and "is this standing in that area" are different, so the
  condition types are `relation` and `region`. Ten types rather than
  the model's nine.
- **A condition on something absent fails.** It does not throw and it
  does not pass. A rule asking about a role on an object that has none
  has been answered. Throwing would take the table down mid-session;
  passing would make a misspelt variable name silently enable
  everything.

`RuleContext` is the seam, written as a type so phase C could be built
and tested before a session existed — the tests hand the engine a table
of six maps.

- [x] `TriggerDefinition`, `ConditionDefinition`, `EffectDefinition`
      as types. `ConditionDefinition.type` is a closed union
      (`kind`, `role`, `state`, `mode`, `variable`, `distance`,
      `affordance`, `region`, `property`) with `operator` from
      `=` `≠` `<` `≤` `>` `≥` `in` `has`. Each type is one
      `ConditionEvaluator` class in a registry, so a programme can add
      one without touching the others.
- [x] `EffectType`: `changeState`, `changeMode`, `assignRole`,
      `updateVariable`, `emitEvent`, `startTimer`,
      `changePresentation`, `playSound`, `appendToLog`. Each is one
      `EffectExecutor` class in a registry. `playSound` and
      `changePresentation` are the two that touch the outside world:
      in the core they **produce a request** on an outbox; the app
      drains the outbox. The core never plays a sound.
- [x] `ActionDefinition` and `TransitionDefinition` as types;
      `TriggerMatcher` (eventType + source/target filters);
      `ConditionResult` with the reason (see "Carried over").
- [x] `RuleEngine`: subscribes to the bus; for each event, finds the
      actions whose trigger matches **and** that are enabled for the
      source instance (its state's `enabledActionIds` ∩ the active
      mode's `enabledActionIds`), evaluates conditions in order,
      stops at the first unmet one, executes effects in order.
      `priority` orders actions that match the same event;
      equal priority is definition order. Every fired, and every
      refused, action is reported to a `RuleTrace` for the overlay.
- [x] `StateDefinition`, `StateMachineDefinition` as types;
      `StateMachine` runtime per instance (currentStateId, the
      machine it runs); `StateMachineRunner` that evaluates
      transitions from the current state on each event, runs
      `exitEffects` → transition effects → `entryEffects`, and emits
      `state.exited` / `state.entered`. Roles and modes may carry a
      machine too (`RoleDefinition.stateMachineId`); the runner does
      not care what owns it.
- [x] `TimerWheel`: `startTimer` needs a clock. The core takes ticks
      from the frame clock, so a timer is a deadline compared against
      it and fires as an event. No `setTimeout` in the core. A fired
      timer is stamped with its **deadline**, not the frame that
      noticed it, or a replay would drift a little further every time.
- [x] Tests in `src/test/unit/core/behaviour.test.ts`: the model's
      own example — trigger `physical.tapped`, conditions role
      `Voter`, state `Ready`, mode `Voting`; effects emit `vote.cast`,
      increment `votes`, set state `Voted` — and then **a second tap
      does nothing**, with the trace naming the state condition as
      the reason. Plus: priority ordering, an effect that emits an
      event that fires another action (queued, not nested), a timer
      that fires on the right frame, a transition whose exit effect
      changes a variable the entry effect reads.

### D. Session, modes, roles, settings, log

**Done.** 356 unit tests pass. The seam closed: the rule engine was
built and tested in phase C against a table of six maps, and `Session`
walked into the same shape without the engine changing a line.

The only place with real state. Everything else in the model is either
a definition, authored up front and unchanging, or a measurement, true
for one frame.

Three notes.

- **A lift is not a departure.** `RoleAssigner.departed` is what
  expires a part, and it means the table has forgotten the object
  entirely — not that it was picked up. A puck lifted to point at
  something must not cost someone their vote, so the presence memory
  window is what governs it and the assigner never sees a lift at all.
- **Instances are cached once a frame and written through.** A rule
  that changes a state has to be visible to the next condition in the
  same frame _and_ has to outlive the frame, so `Session.assign`
  updates both the frame's cache and the physical it came from.
  Reading a fresh snapshot per condition would be correct and far too
  slow; writing only the cache would lose every change on the next
  frame.
- **`Session` requires a `PhysicalRegistry`.** It was tempting to make
  it optional so tests could skip it, but an optional dependency that
  changes behaviour is worse than a required one. A session is a
  session _of physicals_, and a test stands in `SystemPhysical`s,
  which is truthful — a session about objects with no pose still
  works.

- [x] `Session`: id, activeModeId, settings, variables,
      physicalInstances (wraps `PhysicalRegistry`), roleAssignments,
      eventLog, properties. One instance per running table; the
      bridge creates it (phase G).
- [x] `ModeDefinition`: id, name, tablePresentationId,
      enabledActionIds, enabledRoleIds, initialStateAssignments,
      entryEffects, exitEffects, settings. `changeMode` runs exit
      effects, swaps, runs entry effects, applies
      `initialStateAssignments` (kindId → stateId) to every instance
      on the glass, emits `mode.changed`.
- [x] `RoleDefinition`: id, name, permissions, minimumAssignments,
      maximumAssignments, overflowPolicy, eligiblePhysicalKinds,
      stateMachineId, properties. `maximumAssignments` absent means
      uncapped (`TODO.md` decided 6; Voter is uncapped).
- [x] `OverflowPolicy`: `Reject` | `Queue` | `ReplaceOldest` |
      `ReplaceLowestPriority` | `AllowTemporarily`. One
      `OverflowResolver` class each, in a registry. This closes
      `TODO.md` open question 1 by making it data: a programme
      chooses per role, so a queue of Voters and a single Supervisor
      can want opposite answers on the same table at the same time.
- [x] `RoleAssignment`: id, roleId, assigneeId, assignedAt,
      assignedBy, `status: AssignmentStatus` (`Active` | `Queued` |
      `Expired` | `Removed`). `RoleAssigner`: on `physical.detected`
      assigns the kind's `defaultRoleId` if the role is enabled in the
      active mode and the kind is eligible; on cap, applies the
      overflow policy; on `physical.removed`, expires after the
      presence memory window — a lifted voter keeps its role while
      it is remembered.
- [x] `Settings`: id, `scope: SettingScope` (`Global` | `Session` |
      `Mode` | `Role` | `PhysicalKind`), key, value, defaultValue,
      validation. `SettingsResolver`: the effective value for a key
      is the most specific scope that defines it. Every policy object
      in `src/core/base/` gets its numbers **from settings** through
      the resolver, which is how `CFG` empties (`TODO.md` phase 10)
      without a big-bang rewrite: one policy at a time.
- [x] `EventLog`: append-only; `EventLogEntry` = the event + the
      active mode id at the time + the action or transition id that
      consumed it, if any. `append` is the only write. Reading is by
      range or by predicate. A `replay(log, session)` helper re-runs
      the effects, which is what undo, analytics and the afternoon's
      vote count are built on.
- [x] Tests in `src/test/unit/core/session.test.ts`: a ninth voter
      under each of the five overflow policies; a mode change that
      resets states and trims actions; a lifted-then-returned puck
      keeps its role, a gone one loses it; settings resolution
      across all five scopes; the log replayed onto a fresh session
      reaches the same variables.

### E. Presentation layer — what the table shows

**Done**, except for the one item that belongs to phase G — see below.
375 unit tests pass.

Descriptors in the core, drawing in `src/render/`. The core computes
_what_ to show; the renderer only paints it.

Two notes.

- **The boundary is a lint rule, and it was tested by breaking it.**
  Nothing under `src/core/presentation/` may import anything
  executable from `behaviour/` or `session/`; types are allowed,
  because a `StateId` in a lookup table is a name rather than a call.
  A throwaway file importing `EventLog` was added to prove the rule
  fires, then deleted. `PresentationView` — the clock, the mode, and
  the variables, and nothing else — is why the layer never needs to
  reach further.
- **A `RenderPlan` holds no instance, no session and no rule.** That is
  what turns "the image reads the state, it does not change it" from a
  promise in a comment into a fact about the code: a renderer handed
  one cannot reach back into the model even by accident. A test
  round-trips a plan through JSON to prove there is nothing else in
  it.

- [x] `PresentationDefinition`: id, name, `renderer: Renderer`
      (`Shape` | `Image` | `Text` | `Animation` | `Video` |
      `CustomComponent`), layer, assets, `bindings`, properties.
- [x] `Binding`: a target property (`position`, `rotation`, `text`,
      `color`, `visible`, `scale`, `opacity`) bound to a source path
      (`pose.position`, `pose.direction`, `currentState`,
      `activeMode`, `variables.voteCount`, `properties.*`), with an
      optional map (state id → colour). `BindingResolver` turns an
      instance + session into a `RenderProps` record per frame.
      Pure: same inputs, same output, no allocation when unchanged.
- [x] `RegionDefinition`: id, name, `shape` (`circle` | `rect` |
      `polygon`), position, size, acceptedPhysicalKinds,
      acceptedRoles, presentationId, properties. Positions in mm from
      the table origin, converted through `pxPerMM` at the edge, so a
      programme file is screen-independent.
- [x] `RegionTracker`: per frame, which instances are inside which
      regions; emits `physical.enteredRegion` / `exitedRegion` with
      hysteresis from a `RegionPolicy`; an instance of a kind or role
      the region does not accept still gets the events, with
      `payload.accepted = false`, so a rule can react to a wrong
      object in the voting area.
- [x] `TablePresentation`: id, background, regions, layers,
      physicalPresentations (kindId → presentationId, overridable per
      state), globalPresentations. A mode's `tablePresentationId`
      selects one.
- [x] `RenderPlan`: the per-frame output of the layer — an ordered
      list of (layer, renderer, props) — which is the whole interface
      to `src/render/`.
- [x] **Half done, 9 September 2026.** `frame.ts` has the branch:
      `drawRenderPlan` paints what the model says the table should
      show, over what the table did show, behind `?base`. The shapes
      are deliberately plain — making it look like the real table
      would invite reading it as the real table. A `RenderPlan` holds
      no instance, no session and no rule, so painting one cannot feed
      anything back, which is what makes this safe to run beside a
      working table.
- [ ] **Needs the table.** `drawPuck` / `drawPins` / `drawChip` become
      the shape, image and text renderers behind it. That is the
      migration: it changes what the public sees.
- [x] ESLint rule: `src/core/presentation/` imports nothing from
      `behaviour/` or `session/` except types.
- [x] Tests in `src/test/unit/core/presentation.test.ts`: bindings
      follow pose, state and mode; a region crossing with jitter
      emits one pair of events; a non-accepted kind is flagged; a
      `RenderPlan` for two instances in two states differs only in
      the bound colour.

### F. Extension, validation, programme files

**Done**, except for one check that cannot live in the core — see
below. 394 unit tests pass.

The agreement in section 05, and the loader that makes "swappable per
programme" true.

Two notes.

- **A failed load changes nothing.** The programme is validated
  completely before a single registry is touched, so a second load
  that turns out to be broken leaves the running session exactly as it
  was. Register-as-you-go with an unwind on failure leaves a
  half-loaded table at the precise moment nobody can debug it, and the
  unwinding is the code path that never gets tested.
- **`load` returns a result rather than throwing.** Refusing a
  programme is a normal thing to do with a file somebody is still
  editing, and a caller that has to catch an exception to find out
  will eventually catch it too broadly.

- [x] `ExtensionProperties` = `Readonly<Record<string, unknown>>`
      as the `properties` field on the eight entities the model
      names: `Session`, `PhysicalKindDefinition`, `PhysicalInstance`,
      `RoleDefinition`, `StateDefinition`, `ModeDefinition`,
      `PresentationDefinition`, `InteractionEvent`. Nowhere else.
      `Pin`'s `[extra: string]: unknown` is this, and is migrated to
      it when marks move over (phase G).
- [x] `ProgrammeDefinition`: one object holding every definition
      list — kinds, signatures, gestures, actions, state machines,
      modes, roles, settings, table presentations, presentations,
      regions — plus `id`, `version` and `initialModeId`. Loaded from
      JSON; `src/config/` no longer holds behaviour.
- [x] `ModelValidator`, run at boot and in a unit test over every
      programme file in the repo: every referenced id exists; every
      state machine's `initialStateId` is one of its states and every
      transition's from/to are; every mode's `enabledActionIds` and
      `enabledRoleIds` are registered; every `EventType` in a trigger
      is a known type or `custom.*` emitted by some effect; every
      region's accepted kinds exist. Errors name the definition id and
      the field, and every one is collected rather than thrown: a
      programme with six mistakes reports six, because failing on the
      first means six runs to find them.
- [x] **Done, but not in the core.** "Every action has a label in
      every language" needs `src/i18n/`, which the core may not import
      and should not. It lives in `src/test/unit/core/runtime.test.ts`,
      where both trees are visible, and checks every action, role and
      mode in the first programme.
- [x] **Done, 9 September 2026.** Two signatures on _different_ kinds
      that expect the same number of feet at radii closer together
      than either one's tolerance are refused. Whichever was registered
      first would otherwise win every time and the other kind would
      never be recognised — silently, at the table, and only when
      someone put the unlucky puck down and nothing happened. The test
      is deliberately coarse: a finer one would be the second
      recogniser this plan promised not to build, and what is wanted
      is to catch two kinds nobody could ever tell apart rather than
      to rank the ones that are merely similar. Two signatures on the
      _same_ kind are two readings of one object and are left alone.
- [x] `ProgrammeLoader`: JSON → `ProgrammeDefinition`, validated,
      into the registries. A second load replaces everything atomically
      or fails without touching the running session.
- [x] Tests: a programme file with each class of dangling id fails
      validation with the right message; a valid one round-trips
      through JSON unchanged.

### G. The first programme — today's table as definitions

**Half done, and the half that is left is blocked on hardware.** 410
unit tests pass and `npm run smoke` is green.

The whole loop from section 00 now runs end to end on a real programme
file, headless, in `src/test/unit/core/runtime.test.ts`: a puck is put
on the glass, takes the part its kind is for, is armed by standing in
the voting area, casts exactly one vote across two taps, and is drawn
differently for having voted — with every decision in that sentence
coming out of `exe/public/programmes/participation.json` rather than
out of code.

What is **not** done is moving the running table's features onto it.
That waits for parity at the physical table (`TODO.md` phase 6), and
doing it blind would risk breaking a table that works.

- [x] The first programme, as data:
      `exe/public/programmes/participation.json`. Roles `Participant`
      and `Moderator`; modes `Setup`, `FreeInteraction`, `Voting`,
      `Discussion`, `Results`, `Paused`; actions `place_mark`,
      `open_note`, `capture`, `cast_vote` and one per mode change; a
      state machine for a participant puck (`Ready` → `Voting` →
      `Voted`); a voting-area region; presentations for the puck ring
      and the tally. It lives under `exe/public/` rather than at the
      repo root as first planned, because that is where this repo
      already keeps data the app fetches.
- [x] `Runtime`: the loop as one object. Contacts become events,
      relations and regions are measured, objects' movements become
      events, rules run, and a `RenderPlan` comes out. Every line of
      it is wiring; the order the pieces run in is the only judgement
      in the file.
- [x] A unit test standing in for the smoke test the plan asked for: a
      puck in the voting area in `Voting` mode casts exactly one vote
      across two taps, and the log shows both taps with the second
      refused, naming the state condition.
- [x] The i18n check phase F could not host: every action, role and
      mode in the programme is named with a translation key, checked
- [x] in the test tree where both trees are visible. **Done, 9 September 2026.** `BaseRuntime` in `src/bridge/` builds a `Session` and a
      `Runtime` from the programme file and feeds them the bridge's own
      frame, behind `?base`. The summary is on the glass, because the
      table is a kiosk with no console. **The outbox is drained and
      discarded**, so no rule can reach anything the public sees, and
      the whole thing sits inside the `try` that already disables the
      diagnostic on any error. The smoke test drives a real puck with
      `?base` on and asserts the model reached its opening mode, counted
      events, and raised no error. This did not need the table after all
      — parity does, but running the model beside it does not, and
      calling it blocked was over-caution rather than a reason. The
      programme's rules do **not** fire on today's pucks yet, and that
      is expected: the kinds the bridge builds come from
      `templateToKind`, and a template carries no default role and no
      state machine, so nothing is given a part and every condition
      asking for one refuses. Making them fire is the migration below,
      one action at a time.

- [ ] **Needs the table.** Storage migration (`TODO.md` phase 8):
      `Pin` records read as marks, both shapes loadable for one
      release.
- [ ] **Needs the table.** Features cross over one action at a time,
      map control last.
- [x] **Half done, 9 September 2026.** The question is answered:
      `enabledActionsFor` in `src/core/behaviour/` returns what an
      object can be asked to do now, filtered by its state, the active
      mode and the action's own trigger — the same three filters the
      rule engine applies, in the same order, because a menu that
      offered an action the engine would refuse is worse than no menu.
      Named for what it computes rather than for the menu, since an
      overlay explaining why a tap did nothing is another consumer.
      `byPriority` is now shared with the engine, so the menu cannot
      list actions in a different order from the one they fire in.
- [ ] **Needs the table.** Wiring it in: `ringItems()` and
      `openPuckRing()` stop hardcoding the menu.
- [x] **Done, 9 September 2026, and it was a bug rather than a
      feature.** Learning a puck already produced a kind, because
      `TrackBridge` converts live templates through `templateToKind` —
      but it converted each one _once_ and cached it forever, so a puck
      re-measured with "Learn puck" went on being read by the shape it
      had a minute ago. Found by checking the claim instead of
      believing it. `KindRegistry.redefine` is the named way to say a
      kind has been measured again, deliberately a different verb from
      `register`, and the bridge now rebuilds the base of any puck
      whose footprint changed under it. Persisting into a loaded
      programme is a question only once kinds stop coming from
      templates, which is the migration.
- [ ] **Needs the table.** `Track` and `RegistryEvent` deleted.
- [ ] **Needs the table.** The smoke test extended to drive the same
      vote through the real app.

## What phase G found

Writing a real programme and running it is what these came from. None
of them were visible while the layers were being built separately.

1. **A programme could not react to anything the host did.** The
   validator required a trigger's event type to be a core event or one
   some effect emits, which is right for catching a misspelt
   `custom.vote.cats` and wrong for `custom.menu.capture`. A
   programme now declares what it expects from outside in
   `externalEvents`, and the typo check survives.
2. **A tap's verdict lands when the object leaves the glass**, so
   every condition about where it was standing failed — there was
   nothing left to measure. An instance's pose now falls back to the
   last accepted centre, and regions and relations keep anything the
   table still believes is here rather than only what it measured this
   frame. Otherwise a puck that loses a foot for three frames leaves
   the voting area and comes back, twice, for every rule watching.
3. **Roles were only offered on arrival.** A puck put down during
   Setup would hold no part for the rest of the afternoon, because the
   mode that would have allowed it changed later. A mode change now
   offers the part again to everything already lying on the glass,
   which is the point of a mode.
4. **One region tracker was not enough.** Which areas mean something
   changes with the mode — the voting area exists in `Voting` and
   nowhere else — so there is one tracker per table presentation,
   each keeping its own membership.
5. **The programme's own state machine and its vote action
   disagreed**, and only running it showed that. `cast_vote` required
   `Ready` while the machine moved an armed puck to `Voting`. This is
   exactly the class of mistake `ModelValidator` cannot catch: both
   halves were internally valid and referred to states that exist.
   Nothing but running it would have found it.

---

## What phase A cost

Four things the plan did not foresee. All of them are in the tree and
all of them are tested.

1. **A lifted contact needs its own list, not a status on a shared
   one.** The plan said `Ended` contacts appear in exactly one frame
   so a consumer can see them go, and putting them among the live
   points is the obvious reading of that. It is wrong: anything that
   _counts_ feet cannot tell a lifted one from a present one, so a
   puck that had just lost a foot read as `complete` for exactly one
   frame. A robustness test caught it within a minute of the change.
   `ContactFrame` now has `points` and `ended`, and the status stays on
   the point because started-versus-active is still worth knowing.
2. **The base measures `SensedContact`, not `ContactPoint`.** Solvers
   and heading sources read a shape; whether a touch is new or gone is
   a fact about the frame it arrived in. Splitting the two types means
   a source physically cannot decide a status — only
   `ContactStatusTracker` can — and it kept the change out of every
   test that builds feet by hand.
3. **`Tap` lost its policy entirely.** Moving the thresholds into
   `GestureDefinition`s left the trait with nothing to tune: it
   reports `down`, `dwellMS` and `movedPX`, and `GestureRecogniser`
   decides what that was. `TapPolicy` and `TapKind` are deleted and
   `BasePolicies` has one fewer field. Two places with an opinion
   about what a tap is was the thing to avoid, and the plan's wording
   would have left both.
4. **Recordings went to version 2, and the reader still opens
   version 1.** Contacts carry a status now. The seven recordings of
   real pucks made at the table on 9 September are version 1 and are
   the only real data that exists, so `ReplayContactSource` reads what
   was **down** in each frame and lets the tracker derive the rest —
   which means an old recording replays into exactly the frames it was
   captured from.

Two smaller things: `solverForFamily()` was extracted so that
`signatureFrom` and `BaseFactory` cannot disagree about which solver a
family uses, which is the bug that once made the standard footprint
score zero; and the comment on `FootprintSpec` was repaired, having
been left with a duplicated line and a dangling sentence by an earlier
edit.

## Decisions taken before phase A

All five were settled as recommended, on 9 September 2026.

1. **Affordances.** The classes stayed as the truth about the object
   and gained `Tappable` and `Placeable`; `affordanceNames()` is the
   one mapping onto the model's six names, deriving `movable` from
   not-`Passive`, `stackable` from `Nestable` or `Nesting`, and
   `viewThrough` from `Apertured`. `Opaque` and `Coded` deliberately
   have no name: a programme reasoning about them would be reasoning
   about the manufacturing. Templates claim `Tappable` — `wasTap()`
   already opens the ring menu for every puck — and deliberately not
   `Placeable`, which waits for regions to ask.
2. **A signature wraps `FootprintSpec`** as its `geometry`. The base
   tests did not move, and they are the specification the Rust port
   has to satisfy.
3. **Branded ids**, and they live in the folder of the phase that will
   own them: `StateId` and `StateMachineId` in `behaviour/`, `RoleId`
   in `session/`, `PresentationId` in `presentation/`,
   `ExtensionProperties` in `programme/`. Those four folders are a
   barrel and one or two type files today, so phases C to F add files
   rather than moving them.
4. **The effect outbox** is still open — nothing produces one yet. It
   is a phase C question and was not forced.
5. **Mode ownership** stays open; it is a phase D question about the
   first programme, not about the recognition layer.

## Decisions needed after phase B

Phase B answered its own three; see the notes in its section. What is
left belongs to the phases that own it.

1. **Who drains the effect outbox.** Phase C built it: `playSound` and
   `changePresentation` put an `OutboxRequest` on `RuleContext` and
   nothing in the core reads it back. Who drains it is still open, and
   is a phase G question now rather than a phase C one. Recommended:
   `src/bridge/` while the legacy pipeline still runs, `src/boot/`
   once it does not.
2. **Mode ownership** (phase D): may a Moderator puck set another
   instance's state, or only the session's mode? In the model,
   `changeState.target` can name any instance; the first programme has
   to decide whether it allows that.

### Answered by building phase B

1. ~~**Where gestures become events.**~~ `GestureRecogniser` returns
   results; phase B turns them into `physical.tapped` and friends. Does
   the recogniser live on `TangibleObject`, so every physical has one,
   or beside the registry, so one object can run several definition
   sets? Recommended: on the physical. A gesture is something done to
   _that_ object, and a second set is a programme changing its
   definitions, not a second recogniser.
2. **`inputEventTypes` on a gesture definition.** The model has it and
   phase A left it out, because the `EventType` it names does not
   exist yet. It lands with phase B or it does not land at all — a
   gesture that is fed contact events rather than the base snapshot
   would be a second way of reading the same movement.
3. **How often `physical.moved` fires.** Once a frame is the wrong
   granularity for a rule. The plan says a policy decides; the number
   it holds — every 5 px, every 2° — has never been measured against
   a real session, and the seven recordings are what to measure it on
   before guessing.
4. **Still open from phase A**, both belonging to their own phases:
   who drains the effect outbox (phase C), and whether a Moderator may
   set another instance's state or only the session's mode (phase D).

## Out of scope

- Any change to how recognition decides which kind a footprint is.
  Signatures describe what exists; the matchers keep matching.
- Multi-table sync, `RemotePhysical` beyond a name, undo beyond what
  replaying the log gives for free.
- The knowledge graph, speech and capture services: called by effect
  executors, not changed.
- An editor for programme files. JSON by hand, validated at boot.
