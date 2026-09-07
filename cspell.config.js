/* Spell-checking over both code and comments.
 *
 *   npm run spell
 *
 * The reason this lives here and isn't an afterthought: the comments in
 * this repo are prose, in Dutch, and they explain why something is the
 * way it is — they get referenced and quoted elsewhere. A typo in the
 * name of a puck or a service costs more than a misspelled word in a
 * sentence: that name gets looked up somewhere.
 *
 * Two languages at once, because the code is English and the comments
 * are Dutch — often on the same line. Words that only exist within this
 * project live in project-words.txt, so that this list stays readable.
 */
export default {
    version: "0.2",
    /* The Dutch dictionary lives in @cspell/dict-nl-nl and has to be
       added by hand: cspell only loads built-in dictionaries on its
       own. `language` then turns on both languages at once. */
    import: ["@cspell/dict-nl-nl/cspell-ext.json"],
    /* en-GB alongside en: the interface says "Recognise puck" and
       "millimetres", and the comments follow that spelling. */
    language: "nl,en,en-GB",
    // Domain-specific names that neither dictionary knows.
    dictionaryDefinitions: [
        {
            name: "puck-table",
            path: "./project-words.txt",
            addWords: true,
        },
    ],
    dictionaries: [
        "puck-table",
        "nl-nl",
        "softwareTerms",
        "typescript",
        "node",
    ],
    ignorePaths: [
        "node_modules/**",
        "dist/**",
        "dist.nieuw/**",
        "dist.oud/**",
        "coverage/**",
        "vendor/**",
        "exe/public/fixtures/**",
        "src/puck/geometry/*.wasm",
        "src/wasm/**/target/**",
        "src/wasm/**/Cargo.lock",
        "package-lock.json",
        "Claude outputs/**",
        "*.pdf",
        "*.png",
        ".git/**",
    ],
    ignoreRegExpList: [
        // Colour codes, base64 chunks, and URLs are not language.
        "/#[0-9a-fA-F]{3,8}\\b/",
        "/\\bdata:[^\\s\"')]+/",
        "/https?:\\/\\/[^\\s\"')]+/",
        // The divider lines in headings (═══) and other ASCII art.
        "/[═─│┌┐└┘├┤┬┴┼]+/",
    ],
    // This repo speaks Dutch; a single misspelled word is not a reason
    // to fail a build, but it should still stand out.
    useGitignore: true,
};
