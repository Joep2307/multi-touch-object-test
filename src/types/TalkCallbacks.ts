import type { Lang } from "./Lang";

/* What happens along the way during a recording:
     onSegment(text)   a finished chunk of speech — this should be saved
     onPartial(text)   what's being said right now, not yet final; display only
     onError(key)      "denied" | "nomic" | "backend" | "browser" | "insecure"
     onAudio(blob)     only in recording mode: the audio, to be saved */
export interface TalkCallbacks {
    lang?: Lang;
    onSegment?: (text: string) => void;
    onPartial?: (text: string) => void;
    onError?: (key: string) => void;
    onAudio?: (blob: Blob) => void;
}
