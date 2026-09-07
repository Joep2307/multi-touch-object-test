import { loadFonts } from "./boot/loadFonts";
import { wireEvents } from "./boot/wireEvents";
import { MV } from "./map/MV";
import { resize } from "./map/resize";
import { restoreBasemap } from "./map/restoreBasemap";
import { setNorth } from "./map/setNorth";
import { buildNoteViews } from "./notes/buildNoteViews";
import { restore } from "./pins/restore";
import { loadPuckGeometry } from "./puck/geometry/loadPuckGeometry";
import { restoreOwnPucks } from "./puck/restoreOwnPucks";
import { restoreTemplates } from "./puck/restoreTemplates";
import { renderTray } from "./puck/tray/renderTray";
import { frame } from "./render/frame";
import { ui } from "./state/ui";
import { applyColorTheme } from "./ui/applyColorTheme";
import { applyLang } from "./ui/applyLang";
import { applyLock } from "./ui/applyLock";
import { applyMode } from "./ui/applyMode";
import { applyPinMoveMode } from "./ui/applyPinMoveMode";
import { applyScale } from "./ui/applyScale";
import { buildKeyboards } from "./ui/keyboard/buildKeyboards";

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

// Handy for tweaking from the console: `MV.zoom = 16`, `setNorth(90)`.
window.MV = MV;
window.setNorth = setNorth;

loadPuckGeometry();
frame();
