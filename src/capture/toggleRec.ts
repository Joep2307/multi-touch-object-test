import { capture } from "../state";
import { beginRec } from "./beginRec";
import { finishRec } from "./finishRec";

/* The record button: start, or stop what is running. */
export function toggleRec(): void {
    if (capture.rec) finishRec("stop");
    else beginRec();
}
