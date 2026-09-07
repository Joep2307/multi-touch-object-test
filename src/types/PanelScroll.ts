/* A finger scrolling a panel; see startPanelScroll. */
export interface PanelScroll {
    id: number;
    el: HTMLElement;
    y: number;
    top: number;
    scale: number;
    moved: boolean;
}
