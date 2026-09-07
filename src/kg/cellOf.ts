import { CELL } from "./CELL";

export const cellOf = (lat: number, lon: number): string =>
    Math.floor(lat / CELL.LAT) + "," + Math.floor(lon / CELL.LON);
