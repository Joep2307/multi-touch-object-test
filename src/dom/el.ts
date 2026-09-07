/* An element by id. If it doesn't exist, that's a mistake in index.html
   and it's allowed to fail hard — better that than a table that silently
   skips something. */
export const el = <T extends HTMLElement = HTMLElement>(id: string): T =>
    document.getElementById(id) as T;
