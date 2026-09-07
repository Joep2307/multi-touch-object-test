/* Which floating panels can be dragged aside, and by what. An existing
   header is itself the grip; a panel without a header gets a bare drag
   strip (`loose` makes that strip sit looser from the edge). */
export const DRAG_PANELS: { id: string; head?: string; loose?: boolean }[] = [
    /* The expanded menu may be dragged aside; only the four corner buttons
     that open it remain as fixed anchors of the table's controls. */
    { id: "menu", head: ".menu-head" },
    { id: "note", head: ".note-head" },
    { id: "keyboard", head: ".keyboard-head" },
    { id: "puckDock", head: ".puck-dock-head" },
    { id: "puckDockTop", head: ".puck-dock-head" },
    { id: "zoom" }, // grip as the first row above the buttons
    { id: "kgInfo", loose: true },
];
