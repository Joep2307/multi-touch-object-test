/* One finger pans the map, two fingers pinch it. */
export type Gesture =
    | { n: 1; id: number; x: number; y: number }
    | { n: 2; ids: [number, number]; d: number; mx: number; my: number };
