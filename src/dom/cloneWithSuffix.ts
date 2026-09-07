/* A clone of a panel for the other side, where every id (and every
   label-for) gets a suffix, so that ids stay unique. */
export function cloneWithSuffix<T extends HTMLElement>(
    node: T,
    suffix: string,
): T {
    const c = node.cloneNode(true) as T;
    const fix = (n: Element) => {
        if (n.id) n.id += suffix;
        if (n instanceof HTMLLabelElement && n.htmlFor) n.htmlFor += suffix;
    };
    fix(c);
    c.querySelectorAll("[id],label[for]").forEach(fix);
    return c;
}
