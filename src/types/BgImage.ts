/* Een kaartafbeelding vastgepind op echte coördinaten. */
export interface BgImage {
    img: HTMLImageElement;
    west: number;
    north: number;
    east: number;
    south: number;
}
