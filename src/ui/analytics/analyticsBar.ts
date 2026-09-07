export function analyticsBar(
    label: string,
    count: number,
    total: number,
    color?: string,
): HTMLDivElement {
    const row = document.createElement("div");
    row.className = "analytics-bar";
    const head = document.createElement("div");
    head.className = "analytics-bar-head";
    const name = document.createElement("span");
    name.textContent = label;
    const value = document.createElement("b");
    value.textContent = String(count);
    head.append(name, value);
    const rail = document.createElement("div");
    rail.className = "analytics-rail";
    const fill = document.createElement("i");
    fill.style.width = (total ? (count / total) * 100 : 0) + "%";
    fill.style.background = color || "var(--accent)";
    rail.appendChild(fill);
    row.append(head, rail);
    return row;
}
