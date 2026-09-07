/* A single row in a graph list. Labels are set via textContent, so a title
   from the graph never ends up as HTML on the page. */
export function kgRow(
    label: string,
    right: string,
    extraClass = "",
): HTMLDivElement {
    const row = document.createElement("div");
    row.className = "kg-near" + (extraClass ? " " + extraClass : "");
    const l = document.createElement("span");
    l.className = "kg-near-label";
    l.textContent = label;
    const r = document.createElement("span");
    r.className = "kg-near-dist mono";
    r.textContent = right;
    row.append(l, r);
    return row;
}
