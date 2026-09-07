import { learn } from "../state/learn";
import { touches } from "../state/touches";
import { tracks } from "../state/tracks";
import { ui } from "../state/ui";

/* Can the map move right now? Not if it's locked, not while dragging dots
   or measuring, and not while a puck is resting on it: a recognized puck
   freezes the map so it can't slide out from under it. */
export const mapMovable = (): boolean =>
    !ui.mapLocked &&
    !ui.pinMoveMode &&
    !touches.drag &&
    !learn.open &&
    !touches.puckTouches.length &&
    tracks.map.size === 0 &&
    touches.real.size < 3;
