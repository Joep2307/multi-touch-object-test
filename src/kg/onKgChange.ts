import { kg } from "./kg";

export function onKgChange(fn: () => void): void {
    kg.listener = fn;
}
