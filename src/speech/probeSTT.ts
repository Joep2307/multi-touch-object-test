import { Recognition } from "./Recognition";
import { hasMic } from "./hasMic";
import { hasRecorder } from "./hasRecorder";
import { stt } from "./stt";
import { transcribeKandidaten } from "./transcribeKandidaten";

/* What can this table do? Probe once per address; the answer doesn't change
   halfway through an afternoon. The service is expected to return a 200 on
   a GET — if it isn't running, that's a 404 from the biblio backend or a
   network error, and the table falls back to what the browser itself can
   do. */
let probing: Promise<typeof stt> | null = null,
    probedFor: string | null = null;
export function probeSTT(baseUrl = ""): Promise<typeof stt> {
    if (stt.checked && probedFor === baseUrl) return Promise.resolve(stt);
    if (probing && probedFor === baseUrl) return probing;
    probedFor = baseUrl;
    probing = (async () => {
        stt.checked = false;
        stt.mode = "onbekend";
        stt.reason = "";
        stt.url = "";
        if (hasMic() && hasRecorder()) {
            for (const url of transcribeKandidaten(baseUrl)) {
                try {
                    const r = await fetch(url, {
                        method: "GET",
                        cache: "no-store",
                    });
                    if (r.ok) {
                        stt.mode = "backend";
                        stt.url = url;
                        break;
                    }
                } catch (e) {
                    /* not this one; try the next, otherwise fall back below */
                }
            }
        }
        if (stt.mode !== "backend") {
            if (Recognition()) stt.mode = "browser";
            else if (hasMic() && hasRecorder()) stt.mode = "audio";
            else {
                stt.mode = "geen";
                stt.reason =
                    typeof isSecureContext !== "undefined" && !isSecureContext
                        ? "insecure"
                        : "nomic";
            }
        }
        stt.checked = true;
        return stt;
    })().finally(() => {
        probing = null;
    });
    return probing;
}
