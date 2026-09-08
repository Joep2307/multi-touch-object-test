/* How far a measured radius lies from the one on the drawing, relative. The
   diameter is a feature of its own: the same code on a ring of 26 mm is a
   different puck from the one on 34 mm, so this is checked before a
   template is chosen and not afterwards. */
export function sizeErr(
    radiusPX: number,
    wantMM: number,
    pxPerMM: number,
): number {
    const want = wantMM * pxPerMM;
    return want > 0 ? Math.abs(radiusPX - want) / want : Infinity;
}
