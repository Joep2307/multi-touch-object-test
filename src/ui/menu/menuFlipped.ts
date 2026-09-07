import { menu } from "../../state/menu";
import { sidesActive } from "../sidesActive";

export const menuFlipped = (): boolean => menu.side === "b" && sidesActive();
