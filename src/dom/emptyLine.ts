/* One "nothing here" line in a list. As an element rather than an HTML
   string, so that translated text is never read as markup. */
export function emptyLine(text: string): HTMLParagraphElement {
    const p = document.createElement("p");
    p.className = "empty";
    p.textContent = text;
    return p;
}
