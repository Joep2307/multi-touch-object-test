/* One option on the ring around a puck. */
export interface RingItem {
    key: "move" | "zoom" | "select" | "back" | "topic";
    label: string;
    disabled?: boolean;
}
