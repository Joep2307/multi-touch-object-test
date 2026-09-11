/* Something the model wants the outside world to do.
 *
 * The core plays no sounds and draws nothing. Two of the nine effects
 * reach outside the model, and both of them stop here: they put a
 * request on a list and something above the core drains it. That is
 * what lets the whole behaviour layer run in a test with no browser,
 * no audio device and no canvas — and it is why a rule can be replayed
 * from the log without the table shouting at an empty room.
 */
export type OutboxRequest =
    | {
          readonly type: "playSound";
          readonly sound: string;
          readonly at: number;
      }
    | {
          readonly type: "changePresentation";
          readonly target: string;
          readonly presentationId: string;
          readonly at: number;
      };
