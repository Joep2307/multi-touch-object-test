/* The piece of UI chrome this element sits in, or null if it's the map.
   `#learn` is deliberately not included: the measurement window must keep
   seeing every touch as a contact point, even on its own buttons. */
export const uiChrome = (t: EventTarget | null): HTMLElement | null =>
    (t instanceof Element
        ? t.closest<HTMLElement>(".panel,#sheet,#analytics,#documentViewer")
        : null) || null;
