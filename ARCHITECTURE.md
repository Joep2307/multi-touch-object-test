# Architecture

How this table is put together, as it was actually built rather than
as it was planned. Written in English because it is derived from the
two plans that built it (finished, and kept in git history at commit
`d6f21d2`) and shares their vocabulary; the code comments stay Dutch,
as the [README](README.md) says. What is still to do is in
[`todo/`](todo/).

There are **two pipelines in this repository**, and that is deliberate
and temporary. The one that runs the table is in `src/puck/`,
`src/render/`, `src/input/` and their neighbours. The one being built
to replace it is in `src/core/`. They read the same contact points and
are compared against each other, frame by frame, until the second can
take over. `src/bridge/` is the only place allowed to import from
both.

## The loop

Everything in `src/core/` serves one circuit. The table sees contact
points, not objects. A signature groups those points into something
recognisable; that object gets a stable id; its movements become
events; events test rules; rules change state and image. Then someone
looks at the table and moves something again.

```
InputContact ─groups─> PhysicalSignature ─identifies─> PhysicalInstance
                                                            │
                                                    generates│
                                                            v
TablePresentation <─changes─ EffectDefinition <─executes─ InteractionEvent
        │                                          ^            │
        │                                          │       triggers
        └──────── a participant moves something ───┘            v
                                                    Action / Transition
```

The hinge is `PhysicalInstance`, and one rule holds it up: **its id
must not depend on how many contact points are being seen**. Drop one
foot of a block and it is the same block, missing — not a new object.

Everything to the right of `InteractionEvent` is loaded from a
programme file and can be swapped per installation. Everything to the
left is table infrastructure, built once.

## The core, layer by layer

`src/core/` is headless. It imports nothing from the app tree and
touches no DOM, so every part of it can be tested without a table, a
canvas or a browser — and ported to Rust later. Two things enforce
that rather than asking for it: `tsconfig.core.json` removes the DOM
typings altogether, and a lint rule in `eslint.config.js` refuses the
imports.

Two habits that started here now hold for the whole tree, and
`src/test/unit/` has a test for each. Every folder has an `index.ts`
and a cross-folder import goes through it, so a folder has a surface
rather than an inside anyone may reach into — with one exception, an
import _up_ the tree, which stays a file import because the parent
barrel already re-exports the child and the cycle that would make
hands a subclass an undefined base. And nothing does work when it is
loaded: `src/main.ts` is the only file that acts on import, which is
what lets every barrel be loaded on its own, under Node, with no page
present.

| Folder          | What lives there                                             |
| --------------- | ------------------------------------------------------------ |
| `contact/`      | What the glass reports, and how to record and replay it      |
| `base/`         | The kinematic truth about one object, as traits              |
| `physical/`     | What is on the table: kinds, signatures, instances, presence |
| `gesture/`      | What a movement meant, from definitions a programme owns     |
| `events/`       | The one vocabulary everything above recognition speaks       |
| `relation/`     | How objects stand to each other                              |
| `behaviour/`    | Rules and states: one grammar, two applications              |
| `session/`      | The only place with real state                               |
| `presentation/` | What the table shows, and nothing about why                  |
| `programme/`    | Every definition a session runs, validated before believed   |
| `runtime/`      | The loop above, as one object                                |

### Traits, not fields

A `Base` owns traits. Each is fed one sample per frame and answers
questions about it; none of them holds an opinion about what the
object _means_. `Rotate` knows degrees, not that turning zooms the
map.

The alternative is what the old pipeline does: `Track` is one
interface with 37 fields mixing sensing, user interface, map control
and knowledge-graph caching, because every feature that touched a puck
grew a field on it. A trait has its own state, its own policy and its
own tests, it can be left off a kind that does not need it, and
nothing outside it can write to it.

Two tiers. `Position`, `Direction`, `Move`, `Rotate` and `Tap` read
the contact frame. `MotionHistory` and `Acceleration` read only what
the first tier computed. A test asserts the second tier still works
with the raw frame withheld, which is what makes the boundary real
rather than a convention.

One thing runs before all of them. `FootprintCompletion` fills in
whatever feet the frame is short of, so every trait is handed a whole
footprint and none of them learns that holding on exists — see **A
puck holds on while two of its feet are down** below.

### One grammar, used twice

An `ActionDefinition` is free-standing behaviour — cast a vote, place a
marker. A `TransitionDefinition` is the same three words — when,
provided that, then — bound to a move between two states. The
duplication is deliberate: actions describe what a programme _can_ do,
states describe when it is _allowed_.

That is why a second tap does nothing, and why nothing had to be
written to make a second tap do nothing. The token moved to `Voted`,
and `Voted` does not list `cast_vote` among its enabled actions.

### What the layers may not do

- Nothing in `src/core/` imports from the app tree or touches the DOM.
- Nothing in `src/core/presentation/` imports anything executable from
  `behaviour/` or `session/`. The image reads the state; it does not
  change it. A `RenderPlan` holds no instance, no session and no rule,
  so a renderer cannot reach back into the model even by accident.
- No number lives in a function body. Every tuning value is a field on
  a policy or on a descriptor.
- Nothing anywhere in `src/` does work at import time except
  `src/main.ts`.
- Two effects reach outside the model — `playSound` and
  `changePresentation` — and neither does anything. They put a request
  on an outbox and something above the core drains it. The core plays
  no sounds and draws nothing, which is what lets a whole afternoon be
  replayed in a test without the room hearing it.

## Definitions and runtime

The split runs through everything. A **definition** is authored up
front, carries an id, and is JSON: a kind, a role, a rule, a state, a
presentation. **Runtime** exists only inside a running session: the
block lying on the table now, the role it was just given, the event
from three seconds ago. Definitions can be versioned; runtime is gone
when the session ends, except the log.

The naming says which is which: a type whose name ends in `Definition`
is authored, and everything else is not.

## Time

There is one clock and it is the frame clock. No `setTimeout`
anywhere in the core, and no `Date.now()`. A timer is a deadline
compared against the frame's own time, and it fires stamped with the
deadline rather than with the frame that noticed it.

That single rule is what makes a recorded session replay into exactly
the events it was captured from, and the log is what undo, the
analysis export and an afternoon's account of how a vote came out are
all built on.

## What the table taught us

The measurements that changed the design were taken against the
seven recordings made on 9 September 2026, which live in
`src/test/unit/core/fixtures/`; the full account is in the finished
Base plan in git history (`d6f21d2`, `todo/TODO.md`). Two are worth
repeating here because they shaped the code.

**A puck has no reliable nose.** The three-foot footprint's two
candidate apexes differ by about four per cent, against a measurement
noise of 1.6%. So rotation is not measured from a heading at all:
`PointMatchRotationSource` matches this frame's feet to the previous
frame's by contact id and solves for the rotation that best explains
the difference. It needs nothing to be distinguishable. The recording
of a full circle reads as 351.5 degrees that way, and read as 97 to
203 the other way.

**A puck holds on while two of its feet are down.** A dropout used to
be nothing at all: no triple, no detection, and the kinematics stopped
dead — `Move` reset and a drag through one bad frame reported that the
puck had never moved. Two matched points fix a rigid motion in the
plane completely, so the two feet still on the glass say how the puck
moved and turned, and where the third must be. The identity is what
makes this safe rather than a guess: the feet are matched by contact
id and by `firstSeen`, so a finger landing where a foot was is a new
touch and is refused, and there is no time limit — two feet that have
been down without interruption since the last whole frame are still
those two feet a minute later.

Both pipelines do it, and deliberately not by sharing an answer: a
held detection hands the new model the **real** feet only, so the
reconstruction happens twice, independently, and parity has something
to compare.

**Recognition is the one thing the core does not own.** Grouping
contact points into objects is done by the existing recogniser, and
this architecture deliberately does not build a second one. The
registry is filled by whoever knows how; the core takes it as it finds
it.

## Where to read next

- [`todo/TODO.md`](todo/TODO.md) — the plan of 11 September 2026, now
  built: holding a puck on two feet, and ten serious bugs. Its tail is
  the parked list, which is still open.
- The two finished plans, the Base and the interaction model, are in
  git history at `d6f21d2` under `todo/`.
- [`resources/physical-interaction-model.html`](resources/physical-interaction-model.html)
  — the abstract model the second plan implements. Open it in a
  browser.
