import { menu } from "../../state";
import { sidesActive } from "../sidesActive";

export const menuFlipped = (): boolean => menu.side === "b" && sidesActive();
