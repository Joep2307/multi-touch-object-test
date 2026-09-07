/* One tray per side of the table, all with the same contents. Hence classes
   instead of ids: the number of trays can change without the code needing
   to know about it. */
export const trays = (): HTMLElement[] => [
    ...document.querySelectorAll<HTMLElement>(".tray"),
];
