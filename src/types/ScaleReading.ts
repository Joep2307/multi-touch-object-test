/* One known length, measured on the glass: `px` as the fit read it, `mm`
   as the build drawing states it, and how sure the recogniser was of the
   shape it read. Divide one by the other and the screen has told you its
   own scale. */
export interface ScaleReading {
    px: number;
    mm: number;
    conf: number;
}
