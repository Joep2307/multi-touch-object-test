/* One raw point with a stable source identity. Recognition deliberately
   works on plain x/y values; the new contact model also needs to know that
   a moving point is the same finger or simulated foot as last frame. */
export type TrackBridgeContact = {
    readonly sourceId: string;
    readonly x: number;
    readonly y: number;
    readonly radiusPX: number;
    readonly simulated: boolean;
};
