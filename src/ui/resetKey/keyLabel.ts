/* `e.code` is the key's physical position, not its character: that's exactly
   what you want to know for a button, and it doesn't change with the
   keyboard layout. */
export const keyLabel = (code: string): string =>
    code
        .replace(/^Key/, "")
        .replace(/^Digit/, "")
        .replace(/^Numpad/, "num ") || code;
