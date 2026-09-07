/* All main sections of the menu are compact accordions. They start
   collapsed, so the menu can be fully surveyed even on a smaller table
   screen. The button and aria-expanded together keep telling the state. */
export function wireAccordions(): void {
    document
        .querySelectorAll<HTMLElement>("#menu .menu-sec>.accordion-head")
        .forEach((head) => {
            head.onclick = () => {
                const section = head.parentElement!;
                const collapsed = section.classList.toggle("collapsed");
                head.setAttribute("aria-expanded", String(!collapsed));
                if (!collapsed) {
                    document
                        .querySelectorAll(
                            `#menu .menu-sec[data-view="${section.dataset.view}"]`,
                        )
                        .forEach((other) => {
                            if (other === section) return;
                            other.classList.add("collapsed");
                            other
                                .querySelector(":scope>.accordion-head")
                                ?.setAttribute("aria-expanded", "false");
                        });
                }
            };
        });
}
