/* A recording's callbacks, with an empty fallback filled in for each. */
export interface TalkSay {
    segment: (text: string) => void;
    partial: (text: string) => void;
    error: (key: string) => void;
    audio: (blob: Blob) => void;
}
