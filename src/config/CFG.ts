import { QS } from "./QS";

/* ═══════════════════════════════════════════════════════════════
   CONFIG — once per setup, not per session
   ═══════════════════════════════════════════════════════════════ */
export const CFG = {
    longestSideMM: 60,
    puckRadiusMM: 45,
    /* The new puck is not a triangle but a ring: five feet on one circle.
     `ringRadiusMM` is the radius of that circle -- outer diameter 80 mm and
     a viewing hole of 56 mm, so the middle of the rim sits at 34 mm.
     `ringToleranceDeg` is how much each gap between two feet may deviate on
     average; with five points the table measures the angle from five
     measurements at once, so this can be strict.

     Two numbers make the difference between "the table hesitates" and "the
     table picks the wrong puck". The four templates lie 14.4 degrees apart
     (mean gap difference). A single limit of 9 degrees left 5 degrees of
     play in that; at a real table a foot easily trembles 2 mm and then that
     is too strict, because the puck keeps dropping out. The limit now sits
     at 12, and on top of that the best puck must fit `ringMarginDeg` better
     than the runner-up: if that difference is smaller, the measurement is
     ambiguous and the table would rather say nothing than name the wrong
     puck. `ringHoldDeg` belongs to holding on with four feet, which is
     allowed to be more generous: only one template joins in there, so it
     cannot pick the wrong one. */
    ringRadiusMM: 34,
    ringToleranceDeg: 12,
    ringMarginDeg: 3,
    ringHoldDeg: 14,
    /* The diameter is a feature of its own, not just a check: two pucks
     with the same pattern but a different ring are two different pucks. A
     template whose radius lies further away than this is therefore dropped
     before the best fit is chosen, instead of the best fit being rejected
     on size afterwards -- that used to let a puck fall silent because a
     look-alike with the wrong ring won the comparison first. A puck
     already on the table gets the wider limit. */
    ringSizeTol: 0.22,
    ringSizeTolTracked: 0.3,
    /* ── The grid code ───────────────────────────────────────────────
     The third kind of puck. The ring is divided into `slotCount`
     compartments and the puck is the pattern of which ones carry a foot,
     so the table doesn't measure "how many degrees off" but "in which
     slot". With twelve slots of 30 degrees a foot may sit 15 degrees off
     and still lands right -- where the free-angle ring has 12 degrees for
     the whole pattern.

     `slotSnapDeg` is how far the feet may sit from the middle of their
     slot on average; above that they are fingers and not a puck.
     `slotErrMax` is what may go wrong in total before a puck is named for
     the first time, `slotMissMax` and `slotExtraMax` of which kind: a foot
     that loses contact, a finger that happens to lie on the same circle.
     One is deliberately strict. A reading with as many feet as the code
     differs in an even number of slots, so a complete reading has to be
     exact and only a missing or an extra foot costs one -- and six
     fingers spread over a circle, which land two slots away often enough,
     are rejected. A puck already on the table is allowed one more, since
     it cannot change identity by it. On top of that the best code must
     beat the runner-up by `slotMarginBits`, otherwise the table would
     rather say nothing. `slotHoldBits` belongs to holding on to a puck that is
     already being tracked, where only its own code joins in and nothing
     can be confused. `slotMinFeet` is how many points on a circle are
     worth trying at all. */
    slotCount: 12,
    slotSnapDeg: 7,
    slotErrMax: 1,
    slotMissMax: 1,
    slotExtraMax: 1,
    slotMarginBits: 2,
    slotHoldBits: 2,
    slotMinFeet: 4,
    slotSizeTol: 0.18,
    slotSizeTolTracked: 0.26,
    /* A rotating physical puck sometimes briefly loses contact on one foot.
     Two good frames are enough to lock onto it; after that we hold the last
     known position and angle for 0.9 s instead of dropping it after 0.18 s. */
    stableFrames: 2,
    dropoutMS: 900,
    smoothing: 4,
    jitterPX: 22,
    rearmPX: 70,
    ringPX: 110,
    rotationGain: 1,
    /* Turning always zooms and sliding always travels. Options are selected
       by tapping, so there is no hidden puck mode to remember. */
    puckTapMS: 280,
    puckZoomRotDeg: 90,
    puckRotDeadRAD: 0.02,
    puckZoomEaseMS: 70,
    puckRotMaxDegS: 540,
    puckPanDeadPX: 14,
    puckPanGain: 2.8,
    puckPanMaxPXS: 900,
    puckPanEaseMS: 700,
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
