import { el } from "../dom/el";
import { ui } from "../state/ui";
import { view } from "../state/view";

export function applyColorTheme(theme: string): void {
    ui.colorTheme = theme === "light" ? "light" : "dark";
    document.documentElement.dataset.theme = ui.colorTheme;
    document.documentElement.style.colorScheme = ui.colorTheme;
    (
        [
            ["themeLight", "light"],
            ["themeDark", "dark"],
        ] as const
    ).forEach(([id, value]) => {
        const active = value === ui.colorTheme;
        el(id).classList.toggle("active", active);
        el(id).setAttribute("aria-pressed", String(active));
    });
    try {
        localStorage.setItem("pucktable-color-theme", ui.colorTheme);
    } catch (e) {}
    // The static map layer is cached; after a theme switch the empty
    // background, the grid, and the scale bar also need to be repainted.
    view.mapRenderKey = "";
}
