import { kg } from "./kg";
import { kl } from "./kl";

/* The status line in the current language. */
export function kgStatusText(): string {
    return kl(kg.statusKey, ...(kg.statusArgs || []));
}
