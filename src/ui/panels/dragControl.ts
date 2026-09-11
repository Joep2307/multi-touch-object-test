/* A button in a panel's header stays a button: dragging doesn't start there.
 */
export const dragControl = (t: EventTarget | null): boolean =>
    t instanceof Element &&
    !!t.closest("button,input,select,textarea,a,label,.traypuck");
