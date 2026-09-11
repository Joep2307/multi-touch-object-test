/* What a rule does.
 *
 * The last word of the grammar, and a union so that each kind carries
 * exactly the fields it needs. A flat type with eight optional
 * parameters would let a programme write a `playSound` with a state id
 * on it, which is a question nobody can answer.
 *
 * `changePresentation` and `playSound` are the only two that reach
 * outside the model. Neither of them does anything here: they put a
 * request on an outbox and the app drains it. The core never plays a
 * sound, and that is what lets the whole behaviour layer run in a test
 * with no browser, no audio device and no canvas.
 */
export type EffectDefinition =
    | {
          readonly type: "changeState";
          readonly target: string;
          readonly stateId: string;
      }
    | { readonly type: "changeMode"; readonly modeId: string }
    | {
          readonly type: "assignRole";
          readonly target: string;
          readonly roleId: string | null;
      }
    | {
          readonly type: "updateVariable";
          readonly key: string;
          /* Either set a value outright, or add to what is there. A
             vote count needs the second and a phase name the first. */
          readonly set?: unknown;
          readonly add?: number;
      }
    | {
          readonly type: "emitEvent";
          readonly eventType: `custom.${string}`;
          readonly payload?: Readonly<Record<string, unknown>>;
      }
    | {
          readonly type: "startTimer";
          readonly name: string;
          readonly afterMS: number;
      }
    | {
          readonly type: "changePresentation";
          readonly target: string;
          readonly presentationId: string;
      }
    | { readonly type: "playSound"; readonly sound: string }
    | {
          readonly type: "appendToLog";
          readonly note: string;
          readonly payload?: Readonly<Record<string, unknown>>;
      };
