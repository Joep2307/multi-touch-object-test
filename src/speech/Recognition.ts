import type { SpeechRecognitionCtor } from "../types/global";

/* The browser's speech recognition, if it exists. */
export const Recognition = (): SpeechRecognitionCtor | null =>
    (typeof window !== "undefined" &&
        (window.SpeechRecognition || window.webkitSpeechRecognition)) ||
    null;
