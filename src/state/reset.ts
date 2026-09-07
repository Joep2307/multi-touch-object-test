/* The reset button next to the table. USB buttons like this present
   themselves as a keyboard and send a single key; which key that is isn't
   written on the box anywhere, so the table reads it out itself and stores
   the key code in localStorage — with the table, not in the code. */
export const reset = {
    key: ((): string => {
        try {
            return localStorage.getItem("pucktable-reset-key") || "";
        } catch (e) {
            return "";
        }
    })(),
    learning: false,
    heldAt: 0,
};
