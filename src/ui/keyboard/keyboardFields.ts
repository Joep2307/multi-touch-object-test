import type { TextField } from "../../types/TextField";

export function keyboardFields(): TextField[] {
    return [
        ...document.querySelectorAll<TextField>(
            'input[type="text"],input:not([type]),textarea',
        ),
    ];
}
