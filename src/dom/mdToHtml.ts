/* The knowledge graph's answer comes back as markdown. A full parser
   would be overkill here; this covers what comes out in practice —
   headings, bold, italics, lists — and escapes everything first, so that
   no HTML from the model can end up in the page. */
export function mdToHtml(md: string): string {
    const esc = (t: string) =>
        t.replace(
            /[&<>]/g,
            (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c] as string,
        );
    return esc(md)
        .replace(/^#{1,6}\s*(.+)$/gm, '<b class="kg-h">$1</b>')
        .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
        .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<i>$2</i>")
        .replace(/^\s*[-•]\s+(.+)$/gm, '<span class="kg-li">$1</span>');
}
