import { capture } from "../state";
import { beginLapse } from "./beginLapse";
import { endLapse } from "./endLapse";

/* The time-lapse button: start, or stop what is running. */
export function toggleLapse(): void {
    if (capture.lapse) void endLapse("stop");
    else beginLapse();
}
