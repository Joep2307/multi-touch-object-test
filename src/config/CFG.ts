import { QS } from "./QS";

/* ═══════════════════════════════════════════════════════════════
   CONFIG — once per setup, not per session
   ═══════════════════════════════════════════════════════════════ */
export const CFG = {
    longestSideMM: 60,
    puckRadiusMM: 45,
    /* A rotating physical puck sometimes briefly loses contact on one foot.
     Two good frames are enough to lock onto it; after that we hold the last
     known position and angle for 0.9 s instead of dropping it after 0.18 s. */
    stableFrames: 2,
    dropoutMS: 900,
    smoothing: 4,
    jitterPX: 22,
    rearmPX: 70,
    ringPX: 110,
    rotationGain: 2,
    /* The ring around the puck has become a menu. Choosing works by rotating
     to an option and holding still for a moment: tapping stays reserved for
     recording a marking. `puckDwellMS` is that hold time in the main menu;
     `puckTopicDwellMS` applies in the theme menu and is much longer, because
     there you rotate past all the themes to read them, and pausing along the
     way must not yet count as a choice. `puckZoomPX` is how far you have to
     push the puck forward for one zoom level. */
    puckDwellMS: 600,
    puckTopicDwellMS: 2000,
    puckZoomPX: 150,
    puckZoomDeadPX: 2,
    /* How long a puck's state is retained if it comes off the table. A bad
     contact or a bump against the table drops a puck for less than this
     duration; it comes back as it was, not as a new puck. */
    puckMemoryMS: 10000,
    /* How long the reset button must be held down before the table starts
     over. At zero, a single touch is enough, and then a sleeve brushing the
     button throws away half a conversation. */
    resetHoldMS: 700,
    retina: 0, // use the visible zoom level; avoids four times as many tile requests
    /* Once per setup, not per session. These three used to be input fields
     in the menu, where they reset to their default value on every reload:
     a setting that remembers nothing isn't a setting. They belong to the
     table, so they live here, with the URL as an override for whoever is
     running a second setup (?diag=55&tol=0.08&kg=…). */
    screenDiagIn: 43, // screen diagonal in inches; determines pxPerMM and thus recognition
    /* Contact areas are not measured by the touchscreen at exactly the same
     centre point across different rotation angles. 0.10 absorbs that
     directional error; the four default shapes still lie further apart
     than that. */
    tolerance: 0.1, // how much a puck's side ratios are allowed to deviate
    kgUrl: "", // address of the knowledge-graph backend; empty = the fixtures
    /* Address of the transcription service. Empty is the normal case: then
     speech first tries this same server, and then the default port on the
     same machine. Only set this if the service runs somewhere else, either
     here or with ?stt=http://… in the URL. */
    sttUrl: "",
};

{
    const d = parseFloat(QS.get("diag") ?? "");
    if (Number.isFinite(d) && d > 0) CFG.screenDiagIn = d;
}
{
    const t = parseFloat(QS.get("tol") ?? "");
    if (Number.isFinite(t) && t > 0) CFG.tolerance = t;
}
if (QS.get("kg")) CFG.kgUrl = (QS.get("kg") ?? "").trim();
if (QS.get("stt")) CFG.sttUrl = (QS.get("stt") ?? "").trim();
