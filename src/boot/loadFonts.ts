/* ═══════════════════════════════════════════════════════════════
   FONTS — loaded from CSS, silently falls back to system faces
   ═══════════════════════════════════════════════════════════════ */
export function loadFonts(): void {
    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href =
        "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=JetBrains+Mono:wght@400;500&display=swap";
    document.head.appendChild(l);
}
