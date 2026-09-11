import { view } from "../state";
import { MV } from "./MV";

/* Set which screen edge geographic north points to.
   0° is top, 90° right, 180° bottom, and 270° left. Can also be used
   from the console: `setNorth(90)`. */
export function setNorth(degrees: number = 0): number {
    const value = Number(degrees);
    if (!Number.isFinite(value))
        throw new TypeError("setNorth verwacht een hoek in graden");
    MV.north = ((value % 360) + 360) % 360;
    view.mapRenderKey = "";
    try {
        localStorage.setItem("pucktable-north", String(MV.north));
    } catch (e) {}
    dispatchEvent(
        new CustomEvent("northchange", { detail: { degrees: MV.north } }),
    );
    return MV.north;
}
