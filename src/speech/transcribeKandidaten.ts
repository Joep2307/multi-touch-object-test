import { STT_PORT } from "./STT_PORT";
import { transcribeUrl } from "./transcribeUrl";

/* Where we're going to look. If an address is given, exactly there and
   nowhere else — whoever configured it means it. If nothing is given, first
   this server itself (that's how the vite dev server works, which proxies
   /api/transcribe) and then the same machine on the default port. That
   second address is what the table finds on the NUC. */
export function transcribeKandidaten(baseUrl: string): string[] {
    const eigen = transcribeUrl(baseUrl);
    if ((baseUrl || "").trim()) return [eigen];
    const lijst = [eigen];
    try {
        const l = location;
        if (
            l.hostname &&
            l.protocol.startsWith("http") &&
            l.port !== String(STT_PORT)
        )
            lijst.push(
                `${l.protocol}//${l.hostname}:${STT_PORT}/api/transcribe`,
            );
    } catch (e) {
        /* no location: then it just stays with its own origin */
    }
    return lijst;
}
