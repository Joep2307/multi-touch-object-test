import { ringOffset } from "./ringOffset";

export const ringStart = (n: number): number => -Math.PI + ringOffset(n);
