/* What's stored in IndexedDB after "Save map offline": a JPEG as a data URL
   plus the bounds it covers. */
export interface BasemapRecord {
    data: string;
    west: number;
    north: number;
    east: number;
    south: number;
}
