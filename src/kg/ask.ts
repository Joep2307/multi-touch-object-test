import type { ChatSource } from "@biblio";
import { kg } from "./kg";

/* Sends the question to POST /api/biblio/chat and delivers the tokens as
   they come in. Without a backend (or without Ollama behind it), the client
   falls back to fixtures/chat.txt — then the answer is a sample answer, not
   a real analysis. `onSources` receives the fragments it draws on. */
export async function ask(
    question: string,
    {
        onToken,
        onSources,
        signal,
    }: {
        onToken?: (text: string) => void;
        onSources?: (s: ChatSource[]) => void;
        signal?: AbortSignal;
    } = {},
): Promise<string> {
    if (!kg.client) throw new Error("kennisgraaf nog niet geladen");
    let text = "";
    for await (const ev of kg.client.chat(question, [], signal)) {
        if (ev.event === "sources") onSources?.(ev.data);
        else if (ev.event === "token") {
            text += ev.data.text;
            onToken?.(text);
        } else if (ev.event === "error")
            throw new Error(
                ev.data.message || ev.data.error || "chat mislukt",
            );
        else if (ev.event === "done") break;
    }
    return text;
}
