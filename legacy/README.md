# legacy/ — the table before the module split

The single-file app as it ran on the table until the TypeScript
conversion finished on 4 September 2026: `index.html` loads `app.ts`,
which imports `capture.ts`, `kg.ts` and `speech.ts`; `styles.css` is
its stylesheet and `test/` holds its Playwright scripts. Nothing under
`src/` or `exe/` imports any of it, no npm script runs it, and lint,
format and spelling skip it. It is kept so the historical table stays
readable without `git log`; delete the folder when that stops being
worth the room.
