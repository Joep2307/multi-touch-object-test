import { wireCapture } from "../capture";
import { CFG, DEV, DRAG_PANELS, kgUrl } from "../config";
import { el } from "../dom";
import { tr } from "../i18n";
import {
    endPointer,
    onControlTapDown,
    onControlTapUp,
    onEscape,
    onImageDrop,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onPointerDown,
    onPointerMove,
    onSearchKeydown,
    onTapDown,
    onTapUp,
    onWheel,
} from "../input";
import { kg, kgStatusText, loadKG, onKgChange } from "../kg";
import { MV, applyCalm, bakeStore, resize } from "../map";
import { closeNotes, reorientNote } from "../notes";
import { exportCsv, exportGeoJson, restore } from "../pins";
import {
    buildSheet,
    closeLearn,
    closeSheet,
    exportConfig,
    exportMeasurements,
    openLearn,
    restartLearn,
} from "../puck/learn";
import { clearPucks } from "../puck/sim";
import {
    endTrayDrag,
    moveGhost,
    onTrayDown,
    renderTray,
    trays,
} from "../puck/tray";
import { resetTemplates, saveOwnPucks } from "../puck";
import {
    learn,
    menu,
    panels,
    reset,
    templates,
    tiles,
    touches,
    tracks,
    ui,
} from "../state";
import { closeAnalytics, flipAnalytics, openAnalytics } from "../ui/analytics";
import { showKeyboard } from "../ui/keyboard";
import { closeDocumentViewer, closeKgInfo } from "../ui/kgInfo";
import {
    MENU_BTNS,
    closeMenu,
    markLayerMenu,
    openMenu,
    reorientMenu,
} from "../ui/menu";
import { makeDraggable, refreshPanelOffsets } from "../ui/panels";
import { applyResetKey, onResetKeydown, onResetKeyup } from "../ui/resetKey";
import {
    applyColorTheme,
    applyLock,
    applyMode,
    applyPinMoveMode,
    applySides,
    onWipe,
    puckMode,
    refreshFullscreenLabel,
    setLang,
    stepScale,
    toggleFullscreen,
    toggleOrientation,
    wireAccordions,
} from "../ui";
import type { TextField } from "../types";

/* Everything that in app.js was attached at the top level to the window
   and the buttons, in the same order: when two handlers sit on the same
   event, who registered first matters. */
export function wireEvents(): void {
    const captureUi = wireCapture();
    // ── The glass ───────────────────────────────────────────────────────
    addEventListener("pointerdown", onControlTapDown, true);
    addEventListener("pointerup", onControlTapUp, true);
    addEventListener(
        "pointercancel",
        (e) => touches.controlTaps.delete(e.pointerId),
        true,
    );

    addEventListener("pointerdown", onPointerDown);
    addEventListener("pointermove", onPointerMove);
    addEventListener("pointerup", endPointer);
    addEventListener("pointercancel", endPointer);
    addEventListener("contextmenu", (e) => e.preventDefault());

    /* Listen on the window: some touchscreens send the pointer-up to the
     canvas as soon as the finger leaves the puck tray. Previously that left
     only the drag copy hanging around with no puck placed. Registered once,
     because more than one drag can be in progress at the same time. */
    trays().forEach((t) => t.addEventListener("pointerdown", onTrayDown));
    addEventListener("pointermove", moveGhost);
    addEventListener("pointerup", endTrayDrag);
    addEventListener("pointercancel", endTrayDrag);

    addEventListener("mousedown", onMouseDown);
    addEventListener("mousemove", onMouseMove);
    addEventListener("mouseup", onMouseUp);
    addEventListener("wheel", onWheel, { passive: false });

    addEventListener("pointerdown", onTapDown);
    addEventListener("pointerup", onTapUp);

    // ── Keys ────────────────────────────────────────────────────────────
    addEventListener("keydown", onResetKeydown);
    addEventListener("keyup", onResetKeyup);
    addEventListener("blur", () => {
        reset.heldAt = 0;
    });
    addEventListener("keydown", onEscape);
    addEventListener("focusin", (e) => {
        const t = e.target as HTMLElement;
        if (t.classList?.contains("touch-type")) showKeyboard(t as TextField);
    });

    addEventListener("resize", resize);
    addEventListener("resize", refreshPanelOffsets);
    addEventListener("fullscreenchange", refreshFullscreenLabel);
    addEventListener("dragover", (e) => e.preventDefault());
    addEventListener("drop", onImageDrop);

    /* The grip of the corner buttons sits inside a button. Dragging there
     must not also open the menu; a tap without movement should. */
    addEventListener(
        "click",
        (e) => {
            if (performance.now() - panels.dragEnd < 300) {
                e.stopPropagation();
                e.preventDefault();
            }
        },
        true,
    );

    for (const { id, head, loose } of DRAG_PANELS) {
        const panel = document.getElementById(id);
        if (panel) makeDraggable(panel, head, loose);
        // The clones on the other side are the same panels, so they slide the
        // same way.
        const twin = document.getElementById(id + "-b");
        if (twin) makeDraggable(twin, head, loose);
    }

    // ── Settings ────────────────────────────────────────────────────────
    el("btnOrientation").onclick = () => {
        toggleOrientation();
        captureUi.reorient();
    };
    el("btnFullscreen").onclick = toggleFullscreen;
    el("modeTouch").onclick = () => {
        applyMode("touch");
        reorientMenu();
        captureUi.reorient();
    };
    el("modeLaptop").onclick = () => {
        applyMode("laptop");
        reorientMenu();
        captureUi.reorient();
    };
    el("modePuck").onclick = () => {
        applyMode("puck");
        reorientMenu();
        captureUi.reorient();
    };
    /* The add button sits where the vanished tray used to be, on both sides
     of the table. Hence a class rather than an id. */
    [...document.querySelectorAll<HTMLElement>(".btn-add-puck")].forEach(
        (b) => (b.onclick = openLearn),
    );
    el("btnSim").onclick = (e) => {
        ui.simMode = !ui.simMode;
        (e.target as HTMLElement).classList.toggle("on", ui.simMode);
    };
    el("btnDebug").onclick = (e) => {
        ui.debugMode = !ui.debugMode;
        (e.target as HTMLElement).classList.toggle("on", ui.debugMode);
    };
    [...document.querySelectorAll<HTMLElement>(".btn-clear")].forEach(
        (b) => (b.onclick = () => clearPucks(true)),
    );
    el("themeLight").onclick = () => applyColorTheme("light");
    el("themeDark").onclick = () => applyColorTheme("dark");
    wireAccordions();
    el("btnMove").onclick = () => {
        ui.mapLocked = !ui.mapLocked;
        touches.gesture = null;
        touches.mousePan = null;
        applyLock();
    };
    el("btnCalm").onclick = () => {
        ui.calmMap = !ui.calmMap;
        applyCalm();
    };
    el("btnResetKey").onclick = () => {
        reset.learning = !reset.learning;
        applyResetKey();
    };
    el("btnMoveDots").onclick = () => {
        ui.pinMoveMode = !ui.pinMoveMode;
        closeNotes();
        applyPinMoveMode();
    };
    el("btnScaleDown").onclick = () => stepScale(-1);
    el("btnScaleUp").onclick = () => stepScale(1);
    el("btnSides").onclick = () => {
        ui.twoSided = !ui.twoSided;
        applySides();
        reorientMenu();
        reorientNote();
        captureUi.reorient();
    };

    // ── Knowledge graph ─────────────────────────────────────────────────
    el("kgInfoClose").onclick = closeKgInfo;
    el("closeDocumentViewer").onclick = closeDocumentViewer;
    el("documentViewer").addEventListener("pointerdown", (e) => {
        if (e.target === el("documentViewer")) closeDocumentViewer();
    });
    onKgChange(() => {
        el("kgStatus").textContent = kgStatusText();
        el("btnKg").classList.toggle("on", kg.enabled);
        el("btnKgThemes").classList.toggle("on", kg.useThemes);
    });
    el("btnKg").onclick = async () => {
        kg.enabled = !kg.enabled;
        el("btnKg").classList.toggle("on", kg.enabled);
        if (!kg.enabled) {
            closeKgInfo();
            kg.relations = false;
            markLayerMenu();
            kg.statusKey = "off";
            el("kgStatus").textContent = kgStatusText();
            return;
        }
        if (!kg.nodes.length) await loadKG(kgUrl());
        else el("kgStatus").textContent = kgStatusText();
    };
    el("btnKgThemes").onclick = async () => {
        kg.useThemes = !kg.useThemes;
        el("btnKgThemes").classList.toggle("on", kg.useThemes);
        if (kg.useThemes && !kg.themes.length) await loadKG(kgUrl());
    };

    /* Dev mode sets itself on the <body>; the stylesheet then strips out
     everything that's only for the builder. The two calibration fields
     start from what's in CFG and write over it live: what you set correctly
     here, you then set in CFG so the table is configured the same way
     tomorrow too. */
    document.body.classList.toggle("dev", DEV);
    el<HTMLInputElement>("tol").value = String(CFG.tolerance);
    el("tolVal").textContent = CFG.tolerance.toFixed(3);
    el<HTMLInputElement>("diag").value = String(CFG.screenDiagIn);
    el("btnSim").classList.toggle("on", ui.simMode);
    el("tol").oninput = (e) => {
        CFG.tolerance = ui.tolerance = parseFloat(
            (e.target as HTMLInputElement).value,
        );
        el("tolVal").textContent = ui.tolerance.toFixed(3);
    };
    el("diag").oninput = (e) => {
        const v = parseFloat((e.target as HTMLInputElement).value);
        if (Number.isFinite(v) && v > 0) CFG.screenDiagIn = v;
        resize();
    };
    applySides();

    // ── Map ─────────────────────────────────────────────────────────────
    el("tiles").onchange = (e) => {
        MV.set = (e.target as HTMLSelectElement).value;
        tiles.cache.clear();
        tiles.tried = 0;
        tiles.failed = 0; // the message is about this image
        el("bakeHint").textContent = tr("bakeHint");
        markLayerMenu();
    };
    MENU_BTNS.forEach(([id, side, view]) => {
        el(id).onclick = () => (
            captureUi.close(),
            menu.side === side && menu.view === view
                ? closeMenu()
                : openMenu(side, view)
        );
    });
    el("menuClose").onclick = closeMenu;
    // The menu stays open while someone works on the map alongside it.
    // Closing happens deliberately via the close button, the same menu
    // button, or Escape.
    el("sess").onchange = restore;
    el("zIn").onclick = () => MV.zoomBy(1);
    el("zOut").onclick = () => MV.zoomBy(-1);
    [...document.querySelectorAll<HTMLElement>("[data-go]")].forEach(
        (b) =>
            (b.onclick = () => {
                const [la, lo, z] = (b.dataset.go as string)
                    .split(",")
                    .map(Number);
                /* Een knop met een half `data-go` is een fout in de
                   HTML, geen kaartstand om naartoe te springen. */
                if (la === undefined || lo === undefined || z === undefined)
                    return;
                MV.lat = la;
                MV.lng = lo;
                MV.zoom = z;
            }),
    );
    el("search").onkeydown = onSearchKeydown;
    el("btnBake").onclick = () => {
        tiles.bakePending = true;
    };
    el("btnUnbake").onclick = () => {
        tiles.bgImage = null;
        try {
            localStorage.removeItem("pucktable-basemap");
        } catch (e) {}
        bakeStore.del().catch(() => {});
        el("bakeHint").textContent = tr("bakeCleared");
    };

    // ── Session ─────────────────────────────────────────────────────────
    el("btnWipe").onclick = onWipe;
    el("btnAnalytics").onclick = openAnalytics;
    el("flipAnalytics").onclick = flipAnalytics;
    el("closeAnalytics").onclick = closeAnalytics;
    el("analytics").addEventListener("pointerdown", (e) => {
        if (e.target === el("analytics")) closeAnalytics();
    });
    el("btnGeo").onclick = exportGeoJson;
    el("btnCsv").onclick = exportCsv;

    // ── Recognise puck ──────────────────────────────────────────────────
    el("btnRecognise").onclick = openLearn;
    el("closeLearn").onclick = closeLearn;
    el("closeLearnTop").onclick = closeLearn;
    el("btnLearnReset").onclick = () => {
        if (puckMode()) {
            templates.own.length = 0;
            saveOwnPucks();
            tracks.map.clear();
            learn.note = tr("recogClearedOwn");
        } else {
            resetTemplates();
            renderTray();
            learn.note = tr("recogCleared");
        }
        restartLearn();
    };
    el("btnLearnExport").onclick = exportMeasurements;
    el("btnExport").onclick = exportConfig;
    el("btnSheet").onclick = () => {
        buildSheet();
        el("sheet").style.display = "block";
    };
    el("closeSheet").onclick = closeSheet;
    el("closeSheetTop").onclick = closeSheet;
    el("sheet").addEventListener("pointerdown", (e) => {
        if (e.target === el("sheet")) closeSheet();
    });

    // ── Language ────────────────────────────────────────────────────────
    el("langNl").onclick = () => setLang("nl");
    el("langEn").onclick = () => setLang("en");
}
