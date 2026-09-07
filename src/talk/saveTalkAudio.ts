import { el } from "../dom/el";
import { tr } from "../i18n/tr";
import { talk } from "../state/talk";

/* Without a transcription service, the audio is all there is; it must not
   disappear along with the window. So download it, with the session name in it. */
export function saveTalkAudio(): void {
    if (!talk.audioBlob) return;
    const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(talk.audioBlob);
    a.download =
        (el<HTMLInputElement>("sess").value || tr("fileTable")) +
        "-" +
        tr("fileTalk") +
        "-" +
        stamp +
        (talk.audioBlob.type.includes("mp4") ? ".m4a" : ".webm");
    a.click();
}
