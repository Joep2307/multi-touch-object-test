/* Text that ends up in an HTML string. */
export const escapeHtml = (s: unknown): string =>
    String(s || "").replace(
        /[&<>"']/g,
        (ch) =>
            ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;",
            })[ch] as string,
    );
