/* Distance in meters over the earth's surface. At city scale, the error
   from this spherical approximation is negligible. */
export function metersBetween(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
): number {
    const R = 6371000,
        rad = Math.PI / 180;
    const dLat = (lat2 - lat1) * rad,
        dLon = (lon2 - lon1) * rad;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
}
