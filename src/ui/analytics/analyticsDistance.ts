import type { LatLng } from "../../types/LatLng";

/* Meters tussen twee punten, plat benaderd — genoeg om groepen te maken. */
export const analyticsDistance = (a: LatLng, b: LatLng): number => {
    const rad = Math.PI / 180,
        lat = ((a.lat + b.lat) / 2) * rad;
    return Math.hypot(
        (a.lat - b.lat) * 111320,
        (a.lng - b.lng) * 111320 * Math.cos(lat),
    );
};
