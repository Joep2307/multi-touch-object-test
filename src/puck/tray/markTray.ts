import { sim } from "../../state";

/* The tray no longer blocks anything: two people each with a Problem puck is
   just a normal table, not an error. It only shows what's out there. */
export function markTray(): void {
    [...document.querySelectorAll<HTMLElement>(".traypuck")].forEach((d) =>
        d.classList.toggle(
            "on-table",
            sim.pucks.some((s) => s.tpl.id === d.dataset.id),
        ),
    );
}
