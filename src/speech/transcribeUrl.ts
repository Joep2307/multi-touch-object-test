/* The transcription service lives at the same address as the knowledge
   graph: empty means "on this server", so the table also works behind a
   subpath. */
export function transcribeUrl(baseUrl: string): string {
    const b = (baseUrl || "").trim().replace(/\/+$/, "");
    return (b ? b + "/" : "") + "api/transcribe";
}
