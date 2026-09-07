/* How long a chunk of audio lasts before it's sent to the transcription
   service. Shorter means text appears on the table faster but more
   requests, and whisper needs a run-up to recognize a sentence: under five
   seconds, the end of every sentence gets lost. Eight seconds is the
   trade-off. */
export const CHUNK_MS = 8000;
