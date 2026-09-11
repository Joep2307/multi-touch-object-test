/* One chip shape for the ring around the puck and the buttons in the
   panels: both are a word you can select. The sizes come from the same
   tokens as the buttons (--chip-* and --text-2xs in exe/styles/) times the
   UI scale, so that a label on the ring and a button in the menu are the
   same size and have the same corners. readChip() fills them in. */
export const CHIP = { font: 15, padX: 18, padY: 14, radius: 16 };
