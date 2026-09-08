import * as cap from "../../capture";
import { el } from "../dom/el";
import { tr } from "../i18n/tr";
import { MV } from "../map/MV";
import { tiles } from "../state/tiles";
import { view } from "../state/view";
import type { Side } from "../types/Side";
import { sidesActive } from "../ui/sidesActive";
import { resetPanelOffset } from "../ui/panels/resetPanelOffset";
import { closeMenu } from "../ui/menu/closeMenu";

const BUTTONS = [
    ["btnCapA", "a"],
    ["btnCapB", "b"],
] as const;

export function wireCapture(): { close: () => void; reorient: () => void } {
    let side: Side | null = null;
    let message = "";

    const clock = (ms: number): string => {
        const seconds = Math.max(0, Math.round(ms / 1000));
        return (
            Math.floor(seconds / 60) +
            ":" +
            String(seconds % 60).padStart(2, "0")
        );
    };
    const saveCapture = (kind: cap.CapKind, blob: Blob): void => {
        const stamp = new Date()
            .toISOString()
            .slice(0, 16)
            .replace(/[:T]/g, "-");
        const label =
            kind === "shot"
                ? "image"
                : kind === "rec"
                  ? "recording"
                  : "time-lapse";
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download =
            (el<HTMLInputElement>("sess").value || "table") +
            "-" +
            label +
            "-" +
            stamp +
            (kind === "shot" ? ".png" : cap.ext(blob));
        link.click();
        setTimeout(() => URL.revokeObjectURL(link.href), 60000);
        message = tr(
            "capSaved",
            Math.max(0.1, Math.round(blob.size / 104857.6) / 10),
        );
    };
    const reasonText = (reason: cap.CapReason): string =>
        reason === "besmet"
            ? tr("capTainted")
            : reason === "leeg"
              ? tr("capEmpty")
              : reason === "onbruikbaar"
                ? tr("capNoFilm")
                : tr("capFailed");
    const paint = (): void => {
        const state = cap.state();
        const film = cap.canFilm();
        for (const [id, buttonSide] of BUTTONS) {
            const button = el(id);
            button.classList.toggle("on", side === buttonSide);
            button.classList.toggle(
                "filming",
                state.rec || state.lapse || state.busy,
            );
            const timer = button.querySelector<HTMLElement>(".cap-time");
            if (timer) timer.textContent = clock(state.ms);
            button.setAttribute("aria-expanded", String(side === buttonSide));
        }
        const shot = el<HTMLButtonElement>("btnShot");
        const rec = el<HTMLButtonElement>("btnRec");
        const lapse = el<HTMLButtonElement>("btnLapse");
        rec.textContent = state.rec
            ? tr("capRecStop", clock(state.ms))
            : tr("capRec");
        lapse.textContent = state.lapse
            ? tr("capLapseStop", state.frames)
            : tr("capLapse");
        rec.classList.toggle("on", state.rec);
        lapse.classList.toggle("on", state.lapse);
        shot.disabled = state.busy;
        rec.disabled = state.busy || state.lapse || !film;
        lapse.disabled = state.busy || state.rec || !film;
        el("capHint").innerHTML = state.busy
            ? tr("capBusy")
            : message || (film ? tr("capHint") : tr("capNoFilm"));
    };
    const close = (): void => {
        if (!side) return;
        side = null;
        el("capBar").classList.remove("open");
        paint();
    };
    const open = (next: Side): void => {
        closeMenu();
        side = next;
        const bar = el("capBar");
        resetPanelOffset(bar);
        bar.classList.toggle("at-a", next === "a");
        bar.classList.toggle("at-b", next === "b");
        bar.classList.toggle("flipped", next === "b" && sidesActive());
        bar.classList.add("open");
        paint();
    };
    const reorient = (): void => {
        if (side) open(side === "b" && !sidesActive() ? "a" : side);
    };

    cap.init(view.cv, {
        change: paint,
        done: (kind, blob, reason) => {
            if (blob) {
                saveCapture(kind, blob);
                if (reason === "limiet") message += " " + tr("capLimit");
            } else message = reasonText(reason);
            paint();
        },
    });
    for (const [id, buttonSide] of BUTTONS)
        el(id).onclick = () =>
            side === buttonSide ? close() : open(buttonSide);
    el("btnShot").onclick = async () => {
        message = "";
        paint();
        try {
            saveCapture("shot", await cap.shot());
        } catch {
            message = tiles.tainted.has(MV.set)
                ? tr("capTainted")
                : tr("capFailed");
        }
        paint();
    };
    el("btnRec").onclick = () => {
        message = "";
        const running = cap.state().rec;
        cap.toggleRec();
        if (!running && cap.state().rec) close();
        else paint();
    };
    el("btnLapse").onclick = () => {
        message = "";
        const running = cap.state().lapse;
        cap.toggleLapse();
        if (!running && cap.state().lapse) close();
        else paint();
    };
    paint();
    return { close, reorient };
}
