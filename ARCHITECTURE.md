# Architecture

How this table is put together, as it was actually built rather than
as it was planned. Written in English because it is derived from the
two plans in [`todo/`](todo/) and shares their vocabulary; the code
comments stay Dutch, as the [README](README.md) says.

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

The measurements that changed the design are in
[`todo/TODO.md`](todo/TODO.md), against the seven recordings made on
9 September 2026. Two are worth repeating here because they shaped the
code.

**A puck has no reliable nose.** The three-foot footprint's two
candidate apexes differ by about four per cent, against a measurement
noise of 1.6%. So rotation is not measured from a heading at all:
`PointMatchRotationSource` matches this frame's feet to the previous
frame's by contact id and solves for the rotation that best explains
the difference. It needs nothing to be distinguishable. The recording
of a full circle reads as 351.5 degrees that way, and read as 97 to
203 the other way.

**Recognition is the one thing the core does not own.** Grouping
contact points into objects is done by the existing recogniser, and
this architecture deliberately does not build a second one. The
registry is filled by whoever knows how; the core takes it as it finds
it.

## Where to read next

- [`todo/TODO.md`](todo/TODO.md) — the Base: contacts, traits,
  physicals, and what the real table said.
- [`todo/TODO-interaction-model.md`](todo/TODO-interaction-model.md) —
  the layers above it, and what building each one cost.
- [`resources/physical-interaction-model.html`](resources/physical-interaction-model.html)
  — the abstract model the second plan implements. Open it in a
  browser.
