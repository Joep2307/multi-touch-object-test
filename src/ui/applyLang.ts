import { el } from "../dom";
import { topicLabel, tr, vName } from "../i18n";
import { kg, kgStatusText, setKgLang } from "../kg";
import { applyCalm } from "../map";
import { notePart, openNotes, refreshNoteFlipLabels } from "../notes";
import { buildSheet, renderLearn } from "../puck/learn";
import { renderTray } from "../puck/tray";
import { learn, menu, ui } from "../state";
import { renderTalk, setTalkMsg } from "../talk";
import { renderAnalytics } from "./analytics";
import { applyLock } from "./applyLock";
import { applyPinMoveMode } from "./applyPinMoveMode";
import { renderKeyboard } from "./keyboard";
import { openKgInfo } from "./kgInfo";
import { MENU_TITLES, buildLayerMenu } from "./menu";
import { refreshFullscreenLabel } from "./refreshFullscreenLabel";
import { refreshModeTexts } from "./refreshModeTexts";
import { refreshOrientationControl } from "./refreshOrientationControl";
import { applyResetKey } from "./resetKey";
import { resetWipeButton } from "./resetWipeButton";
import { showBuildStamp } from "./showBuildStamp";
import { updateUI } from "./updateUI";

/* ── Language button ──────────────────────────────────────────────────────
   Top of the menu, next to the title. Not permanently on the map: whoever
   operates the table opens the menu anyway, and whoever stands around it
   gains nothing from yet another button sitting on top of the map. Two
   boxes instead of one toggle button, so the active language is visible at
   a glance.

   applyLang() walks in one pass over everything that carries text: the
   elements with a data-i18n key, and then the pieces that are built up by
   JavaScript and therefore don't change along automatically. */
export function applyLang(): void {
    const lang = ui.lang;
    document.documentElement.lang = lang;
    document.title = tr("docTitle");
    setKgLang(lang);

    document.querySelectorAll<HTMLElement>("[data-i18n]").forEach((n) => {
        n.textContent = tr(n.dataset.i18n!);
    });
    document.querySelectorAll<HTMLElement>("[data-i18n-html]").forEach((n) => {
        n.innerHTML = tr(n.dataset.i18nHtml!);
    });
    document
        .querySelectorAll<HTMLInputElement>("[data-i18n-ph]")
        .forEach((n) => {
            n.placeholder = tr(n.dataset.i18nPh!);
        });
    document.querySelectorAll<HTMLElement>("[data-i18n-aria]").forEach((n) => {
        n.setAttribute("aria-label", tr(n.dataset.i18nAria!));
    });
    document
        .querySelectorAll<HTMLElement>("[data-i18n-title]")
        .forEach((n) => {
            n.title = tr(n.dataset.i18nTitle!);
        });
    document
        .querySelectorAll<HTMLOptGroupElement>("[data-i18n-label]")
        .forEach((n) => {
            n.label = tr(n.dataset.i18nLabel!);
        });

    ["langNl", "langEn"].forEach((id) => {
        const mine = id === "langNl" ? lang === "nl" : lang === "en";
        el(id).classList.toggle("on", mine);
        el(id).setAttribute("aria-pressed", String(mine));
    });

    // What JavaScript itself has put in place.
    el("menuTitle").textContent = tr(MENU_TITLES[menu.view]);
    el("kgStatus").textContent = kgStatusText();
    el("bakeHint").textContent = tr("bakeHint");
    buildLayerMenu();
    resetWipeButton();
    applyResetKey();
    applyCalm();
    applyLock();
    applyPinMoveMode();
    renderTray();
    renderKeyboard();
    updateUI([]);
    refreshModeTexts();
    refreshNoteFlipLabels();
    refreshOrientationControl();
    refreshFullscreenLabel();
    // Open windows shouldn't have to close first before they follow along.
    for (const v of openNotes()) {
        notePart(v, "noteHead").textContent =
            vName(v.pin!.verdict) + " · " + topicLabel(v.pin!.topic);
        renderTalk(v);
        setTalkMsg(v, v.talkMsg.key, {
            warn: v.talkMsg.warn,
            args: v.talkMsg.args,
        });
    }
    if (el("kgInfo").style.display === "block" && kg.selected) {
        openKgInfo(
            kg.selected,
            +(el("kgInfo").dataset.anchorX ?? 0),
            +(el("kgInfo").dataset.anchorY ?? 0),
        );
    }
    /* updateUI() only rebuilds the analytics window when the marks have
       changed, and a language switch changes none of them — so an open
       overview would keep standing there in the previous language. */
    if (el("analytics").classList.contains("open")) renderAnalytics();
    if (el("sheet").style.display === "block") buildSheet();
    if (learn.open) renderLearn();
    showBuildStamp();
}
