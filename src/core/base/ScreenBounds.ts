/* The drawable area, in pixels, with the origin at the top left.
 *
 * The core does not know what a canvas is, so the one thing it needs
 * from the screen — how big it is — is passed in as this. It is the
 * only screen fact any trait ever sees.
 */
export type ScreenBounds = {
    readonly width: number;
    readonly height: number;
};
