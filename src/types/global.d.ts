/* What the browser provides but the standard types don't know about, and
   what the app itself puts on `window` so it can be reached from the console. */
import type { MV } from "../map/MV";
import type { setNorth } from "../map/setNorth";

/* The Web Speech API, only the parts that speech uses. TypeScript's DOM
   library doesn't know it in every version, and Chrome names it with a
   webkit prefix. */
export interface SpeechRecognitionLike {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    onresult: ((e: SpeechRecognitionEventLike) => void) | null;
    onerror: ((e: { error: string }) => void) | null;
    onend: (() => void) | null;
    start(): void;
    stop(): void;
}
export interface SpeechRecognitionEventLike {
    resultIndex: number;
    results: ArrayLike<{ isFinal: boolean; 0?: { transcript: string } }>;
}
export type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

declare global {
    interface Window {
        SpeechRecognition?: SpeechRecognitionCtor;
        webkitSpeechRecognition?: SpeechRecognitionCtor;
        MV: typeof MV;
        setNorth: typeof setNorth;
        /* Only present on a `?base` URL: the recording controls for a
           parity session. See src/bridge/installBaseHooks.ts. */
        __base?: {
            start: (name?: string) => string;
            stop: () => string;
            save: () => string;
            parity: () => string;
            readonly recording: boolean;
            readonly frames: number;
        };
        __puck?: {
            topics: () => string[];
            ringStart: (n: number) => number;
            ringPX: () => number;
            ringOpen: () => boolean[];
            tracks: () => Array<Record<string, unknown>>;
            simulated: () => Array<{ x: number; y: number }>;
        };
    }
}
