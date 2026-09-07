import { kg } from "./kg";

export function setKgLang(l: string): void {
    kg.lang = l === "en" ? "en" : "nl";
}
