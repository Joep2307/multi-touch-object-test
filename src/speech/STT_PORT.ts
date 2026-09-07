/* The default port of the transcription service. The table is served on the
   NUC by `python3 -m http.server`, and that can't proxy anything: so the
   service runs next to the table on its own port instead of on /api of the
   same server. That's why we look for it here instead of making it a
   setting someone would have to know on the day itself. */
export const STT_PORT = 8770;
