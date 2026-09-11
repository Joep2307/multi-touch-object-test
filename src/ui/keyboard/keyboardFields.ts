import type { TextField } from "../../types";

export function keyboardFields(): TextField[] {
    return [
        ...document.querySelectorAll<TextField>(
            'input[type="text"],input:not([type]),textarea',
        ),
    ];
}
