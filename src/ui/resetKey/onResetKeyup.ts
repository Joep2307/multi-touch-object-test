import { reset } from "../../state";

export function onResetKeyup(e: KeyboardEvent): void {
    if (e.code === reset.key) reset.heldAt = 0;
}
