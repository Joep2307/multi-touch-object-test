import { learn } from "../../state";
import { learnPoints } from "./learnPoints";
import { renderLearn } from "./renderLearn";
import { setLearnBar } from "./setLearnBar";

/* `clearFirst` belongs to the "Next puck" button. At that moment the previous
   puck is still on the glass, and measuring would immediately restart on
   those same three contact points: so you'd get the previous puck again,
   with no time to place the next one. So now it waits until the glass is
   empty. */
export function restartLearn(clearFirst = false): void {
    learn.phase = clearFirst && learnPoints().length ? "clear" : "wait";
    learn.samples = [];
    learn.m = null;
    learn.tplId = null;
    learn.clash = null;
    learn.moved = false;
    setLearnBar(0);
    renderLearn();
}
