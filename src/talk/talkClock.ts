import { talk } from "../state";

export function talkClock(): string {
    const s = Math.max(
        0,
        Math.round((performance.now() - talk.startedAt) / 1000),
    );
    return (
        String(Math.floor(s / 60)).padStart(2, "0") +
        ":" +
        String(s % 60).padStart(2, "0")
    );
}
