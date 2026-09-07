import { reset } from "../../state/reset";

export function onResetKeyup(e: KeyboardEvent): void {
    if (e.code === reset.key) reset.heldAt = 0;
}
