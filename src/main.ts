import { installTestHooks, loadFonts, wireEvents } from "./boot";
import { MV, resize, restoreBasemap, setNorth } from "./map";
import { buildNoteViews } from "./notes";
import { restore } from "./pins";
import { loadPuckGeometry } from "./puck/geometry";
import { restoreScale } from "./puck/scale";
import { renderTray } from "./puck/tray";
import { restoreOwnPucks, restoreTemplates } from "./puck";
import { frame } from "./render";
import { ui } from "./state";
import { buildKeyboards } from "./ui/keyboard";
import {
    applyColorTheme,
    applyLang,
    applyLock,
    applyMode,
    applyPinMoveMode,
    applyScale,
} from "./ui";

/* ═══════════════════════════════════════════════════════════════
   PUCK TABLE — the participation table
   ═══════════════════════════════════════════════════════════════
   This is the only file that does anything on load. Every other module
   exports one thing and waits to be called. The order here follows the
   old app.js: first build the windows and keyboards, then wire up the
   buttons, then pull the state from storage and start the draw loop.
   The Rust geometry loads meanwhile; until it's there the table just
   draws, but recognizes nothing. */
loadFonts();
buildNoteViews();
buildKeyboards();
wireEvents();

restoreTemplates();
restoreScale();
restoreOwnPucks();
applyColorTheme(ui.colorTheme);
resize();
restore();
restoreBasemap();
applyScale();
applyLock();
applyPinMoveMode();
applyMode(ui.mode);
renderTray();
applyLang();
installTestHooks();

// Handy for tweaking from the console: `MV.zoom = 16`, `setNorth(90)`.
window.MV = MV;
window.setNorth = setNorth;

loadPuckGeometry();
frame();
