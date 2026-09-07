export function formatDistance(m: number): string {
    return m < 1000
        ? `${Math.round(m / 10) * 10} m`
        : `${(m / 1000).toFixed(1)} km`;
}
