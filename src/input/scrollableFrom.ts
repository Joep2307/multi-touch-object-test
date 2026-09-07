/* Het dichtstbijzijnde scrollbare element tussen `node` en `root`. */
export function scrollableFrom(
    node: EventTarget | null,
    root: HTMLElement,
): HTMLElement | null {
    for (
        let n = node instanceof HTMLElement ? node : null;
        n;
        n = n.parentElement
    ) {
        if (n.scrollHeight > n.clientHeight + 2) {
            const oy = getComputedStyle(n).overflowY;
            if (oy === "auto" || oy === "scroll") return n;
        }
        if (n === root) break;
    }
    return null;
}
