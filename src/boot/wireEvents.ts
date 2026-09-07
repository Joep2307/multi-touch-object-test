import { CFG } from "../config/CFG";
import { DEV } from "../config/DEV";
import { DRAG_PANELS } from "../config/DRAG_PANELS";
import { el } from "../dom/el";
import { tr } from "../i18n/tr";
import { endPointer } from "../input/endPointer";
import { onControlTapDown } from "../input/onControlTapDown";
import { onControlTapUp } from "../input/onControlTapUp";
import { onEscape } from "../input/onEscape";
import { onImageDrop } from "../input/onImageDrop";
import { onMouseDown } from "../input/onMouseDown";
import { onMouseMove } from "../input/onMouseMove";
import { onMouseUp } from "../input/onMouseUp";
import { onPointerDown } from "../input/onPointerDown";
import { onPointerMove } from "../input/onPointerMove";
import { onSearchKeydown } from "../input/onSearchKeydown";
import { onTapDown } from "../input/onTapDown";
import { onTapUp } from "../input/onTapUp";
import { onWheel } from "../input/onWheel";
import { kgUrl } from "../config/kgUrl";
import { kg } from "../kg/kg";
import { kgStatusText } from "../kg/kgStatusText";
import { loadKG } from "../kg/loadKG";
import { onKgChange } from "../kg/onKgChange";
import { MV } from "../map/MV";
import { applyCalm } from "../map/applyCalm";
import { bakeStore } from "../map/bakeStore";
import { resize } from "../map/resize";
import { closeNotes } from "../notes/closeNotes";
import { reorientNote } from "../notes/reorientNote";
import { exportCsv } from "../pins/exportCsv";
import { exportGeoJson } from "../pins/exportGeoJson";
import { restore } from "../pins/restore";
import { buildSheet } from "../puck/learn/buildSheet";
import { closeLearn } from "../puck/learn/closeLearn";
import { closeSheet } from "../puck/learn/closeSheet";
import { exportConfig } from "../puck/learn/exportConfig";
import { exportMeasurements } from "../puck/learn/exportMeasurements";
import { openLearn } from "../puck/learn/openLearn";
import { restartLearn } from "../puck/learn/restartLearn";
import { resetTemplates } from "../puck/resetTemplates";
import { saveOwnPucks } from "../puck/saveOwnPucks";
import { clearPucks } from "../puck/sim/clearPucks";
import { endTrayDrag } from "../puck/tray/endTrayDrag";
import { moveGhost } from "../puck/tray/moveGhost";
import { onTrayDown } from "../puck/tray/onTrayDown";
import { renderTray } from "../puck/tray/renderTray";
import { trays } from "../puck/tray/trays";
import { learn } from "../state/learn";
import { panels } from "../state/panels";
import { reset } from "../state/reset";
import { templates } from "../state/templates";
import { tiles } from "../state/tiles";
import { touches } from "../state/touches";
import { tracks } from "../state/tracks";
import { ui } from "../state/ui";
import type { TextField } from "../types/TextField";
import { closeAnalytics } from "../ui/analytics/closeAnalytics";
import { flipAnalytics } from "../ui/analytics/flipAnalytics";
import { openAnalytics } from "../ui/analytics/openAnalytics";
import { applyColorTheme } from "../ui/applyColorTheme";
import { applyLock } from "../ui/applyLock";
import { applyMode } from "../ui/applyMode";
import { applyPinMoveMode } from "../ui/applyPinMoveMode";
import { applySides } from "../ui/applySides";
import { showKeyboard } from "../ui/keyboard/showKeyboard";
import { closeDocumentViewer } from "../ui/kgInfo/closeDocumentViewer";
import { closeKgInfo } from "../ui/kgInfo/closeKgInfo";
import { MENU_BTNS } from "../ui/menu/MENU_BTNS";
import { closeMenu } from "../ui/menu/closeMenu";
import { markLayerMenu } from "../ui/menu/markLayerMenu";
import { openMenu } from "../ui/menu/openMenu";
import { reorientMenu } from "../ui/menu/reorientMenu";
import { onWipe } from "../ui/onWipe";
import { makeDraggable } from "../ui/panels/makeDraggable";
import { refreshPanelOffsets } from "../ui/panels/refreshPanelOffsets";
import { puckMode } from "../ui/puckMode";
import { refreshFullscreenLabel } from "../ui/refreshFullscreenLabel";
import { applyResetKey } from "../ui/resetKey/applyResetKey";
import { onResetKeydown } from "../ui/resetKey/onResetKeydown";
import { onResetKeyup } from "../ui/resetKey/onResetKeyup";
import { setLang } from "../ui/setLang";
import { stepScale } from "../ui/stepScale";
import { toggleFullscreen } from "../ui/toggleFullscreen";
import { toggleOrientation } from "../ui/toggleOrientation";
import { wireAccordions } from "../ui/wireAccordions";
import { menu } from "../state/menu";

/* Everything that in app.js was attached at the top level to the window
   and the buttons, in the same order: when two handlers sit on the same
   event, who registered first matters. */
export function wireEvents(): void {
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
        // The clones on the other side are the same panels, so they slide the same way.
        const twin = document.getElementById(id + "-b");
        if (twin) makeDraggable(twin, head, loose);
    }

    // ── Settings ────────────────────────────────────────────────────────
    el("btnOrientation").onclick = toggleOrientation;
    el("btnFullscreen").onclick = toggleFullscreen;
    el("modeTouch").onclick = () => {
        applyMode("touch");
        reorientMenu();
    };
    el("modeLaptop").onclick = () => {
        applyMode("laptop");
        reorientMenu();
    };
    el("modePuck").onclick = () => {
        applyMode("puck");
        reorientMenu();
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
        el(id).onclick = () =>
            menu.side === side && menu.view === view
                ? closeMenu()
                : openMenu(side, view);
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
