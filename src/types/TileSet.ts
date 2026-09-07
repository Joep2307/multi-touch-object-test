/* One map imagery set. `max` is the deepest zoom level the source
   provides; `credit` appears at the bottom of the screen, because the
   sources require that attribution. */
export interface TileSet {
    url: string;
    max: number;
    credit: string;
}
