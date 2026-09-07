import { view } from "../state/view";
import type { LatLng } from "../types/LatLng";
import type { MapView } from "../types/MapView";
import type { Point } from "../types/Point";

/* ═══════════════════════════════════════════════════════════════
   MAP — slippy tiles drawn straight onto the canvas.
   No library: Web Mercator is twelve lines of arithmetic.
   ═══════════════════════════════════════════════════════════════
   `north` is which screen edge geographic north points to: 0° is
   top, 90° right, 180° bottom, and 270° left. It is persisted. */
const storedNorth = ((): number => {
    try {
        const v = Number(localStorage.getItem("pucktable-north"));
        return Number.isFinite(v) ? v : 0;
    } catch (e) {
        return 0;
    }
})();

export const MV: MapView = {
    lng: 4.7759,
    lat: 51.5866,
    zoom: 14,
    set: "osm",
    north: ((storedNorth % 360) + 360) % 360,
    world(): number {
        return 256 * Math.pow(2, MV.zoom);
    },
    wx(lng: number): number {
        return ((lng + 180) / 360) * MV.world();
    },
    wy(lat: number): number {
        const s = Math.sin((lat * Math.PI) / 180);
        return (
            (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * MV.world()
        );
    },
    lngAt(x: number): number {
        return (x / MV.world()) * 360 - 180;
    },
    latAt(y: number): number {
        const n = Math.PI - (2 * Math.PI * y) / MV.world();
        return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
    },
    projectRaw(lng: number, lat: number): Point {
        return {
            x: MV.wx(lng) - MV.wx(MV.lng) + view.W / 2,
            y: MV.wy(lat) - MV.wy(MV.lat) + view.H / 2,
        };
    },
    rotatePoint(x: number, y: number, degrees: number = MV.north): Point {
        const a = (degrees * Math.PI) / 180,
            c = Math.cos(a),
            s = Math.sin(a),
            dx = x - view.W / 2,
            dy = y - view.H / 2;
        return {
            x: view.W / 2 + dx * c - dy * s,
            y: view.H / 2 + dx * s + dy * c,
        };
    },
    project(lng: number, lat: number): Point {
        const p = MV.projectRaw(lng, lat);
        return MV.rotatePoint(p.x, p.y);
    },
    unproject(x: number, y: number): LatLng {
        const p = MV.rotatePoint(x, y, -MV.north);
        return {
            lng: MV.lngAt(p.x - view.W / 2 + MV.wx(MV.lng)),
            lat: MV.latAt(p.y - view.H / 2 + MV.wy(MV.lat)),
        };
    },
    panBy(dx: number, dy: number): void {
        const a = (-MV.north * Math.PI) / 180,
            c = Math.cos(a),
            s = Math.sin(a);
        const mapDx = dx * c - dy * s,
            mapDy = dx * s + dy * c;
        const cx = MV.wx(MV.lng) - mapDx,
            cy = MV.wy(MV.lat) - mapDy;
        MV.lng = MV.lngAt(cx);
        MV.lat = Math.max(-85, Math.min(85, MV.latAt(cy)));
    },
    zoomBy(dz: number, ax?: number, ay?: number): void {
        ax = ax === undefined ? view.W / 2 : ax;
        ay = ay === undefined ? view.H / 2 : ay;
        const z = Math.max(3, Math.min(19, MV.zoom + dz));
        if (z === MV.zoom) return;
        const anchor = MV.unproject(ax, ay); // geo point under the cursor, at the old zoom
        MV.zoom = z;
        const p = MV.project(anchor.lng, anchor.lat); // where that same point lands after zooming
        MV.panBy(ax - p.x, ay - p.y); // keep the anchor fixed, also on a rotated map
    },
};
