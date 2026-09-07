/* Formatting for new files: 79 columns, 4 spaces.
 *
 *   npm run format         writes the formatting out
 *   npm run format:check   only checks, and is what CI runs
 *
 * What's excluded from this is in .prettierignore: the files that
 * predate this convention. See there for why.
 */
export default {
    printWidth: 79,
    tabWidth: 4,
    useTabs: false,
    semi: true,
    singleQuote: false,
    quoteProps: "as-needed",
    trailingComma: "all",
    bracketSpacing: true,
    arrowParens: "always",
    endOfLine: "lf",
    overrides: [
        // Machine-managed files keep their own indentation, so that an
        // `npm install` doesn't produce a formatting diff.
        {
            files: ["package.json", "package-lock.json"],
            options: { tabWidth: 2 },
        },
        { files: ["*.md"], options: { proseWrap: "preserve" } },
        { files: ["*.{yml,yaml,json}"], options: { tabWidth: 2 } },
    ],
};
