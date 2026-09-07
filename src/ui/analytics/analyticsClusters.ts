import { pins } from "../../state/pins";
import type { LatLng } from "../../types/LatLng";
import type { Pin } from "../../types/Pin";
import { analyticsDistance } from "./analyticsDistance";

/* Groups within about 250 meters, largest first. */
export function analyticsClusters(): { items: Pin[]; center: LatLng }[] {
    const groups: { items: Pin[]; center: LatLng }[] = [];
    for (const pin of pins.list) {
        let group = groups.find((g) => analyticsDistance(pin, g.center) < 250);
        if (!group) {
            group = { items: [], center: { lat: pin.lat, lng: pin.lng } };
            groups.push(group);
        }
        group.items.push(pin);
        group.center = {
            lat:
                group.items.reduce((s, p) => s + p.lat, 0) /
                group.items.length,
            lng:
                group.items.reduce((s, p) => s + p.lng, 0) /
                group.items.length,
        };
    }
    return groups.sort((a, b) => b.items.length - a.items.length);
}
