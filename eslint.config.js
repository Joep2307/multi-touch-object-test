/* What ESLint is supposed to do here, and above all what it isn't.
 *
 *   npm run lint          check
 *   npm run lint:fix      fix what can fix itself
 *
 * This is not a style checker — that's Prettier's job, and two tools
 * covering the same ground is one too many. Only rules that catch a
 * genuine mistake live here: a typo in a name, a variable that goes
 * nowhere, a `catch` that silently swallows everything.
 *
 * `no-undef` is the most important of the bunch. app.js is a single
 * module of well over four thousand lines with no bundling step during
 * development; a misspelled function name there isn't a build failure
 * but an empty table on an afternoon with the public present. This rule
 * catches it before the doors open.
 */
import js from "@eslint/js";
import ts from "typescript-eslint";
import globals from "globals";

export default [
    {
        ignores: [
            "dist/",
            "dist.nieuw/",
            "dist.oud/",
            "coverage/",
            "node_modules/",
            "public/fixtures/",
            "vendor/",
            "Claude outputs/",
            /* The historical pre-module snapshot; see legacy/README.md. */
            "legacy/",
        ],
    },

    js.configs.recommended,

    /* Applies everywhere, TypeScript included: an empty `catch` at this
       table is often exactly the intent. localStorage throwing in a
       private window, a fullscreen request the browser refuses, an audio
       context that isn't allowed to start — none of these may stop the
       table, and none of them can be meaningfully handled. Other empty
       blocks remain an error. */
    {
        files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
        rules: { "no-empty": ["error", { allowEmptyCatch: true }] },
    },

    /* The table itself: browser code, ES modules. */
    {
        files: ["*.js"],
        languageOptions: {
            ecmaVersion: 2023,
            sourceType: "module",
            globals: globals.browser,
        },
        rules: {
            /* An empty `catch` here is often exactly the intent:
               localStorage throwing in a private window must not stop
               the table. But there does need to be something in it that
               shows it's deliberate. */
            "no-empty": ["error", { allowEmptyCatch: true }],
            "no-unused-vars": [
                "error",
                {
                    args: "after-used",
                    argsIgnorePattern: "^_",
                    varsIgnorePattern: "^_",
                    caughtErrors: "none",
                },
            ],
            /* == between a number and a string is, at this table, almost
               always intentional (a session name, a value from storage),
               so only === except against null. */
            eqeqeq: ["error", "always", { null: "ignore" }],
            "no-var": "error",
            "prefer-const": ["error", { destructuring: "all" }],
            "no-implicit-globals": "error",
            "no-console": "off",
        },
    },

    /* The TypeScript side (see todo/TODO.md). Without type-checking rules:
       `tsc --noEmit` already does that job, and does it better; ESLint
       catches here what the compiler doesn't see. Prettier still handles
       formatting. */
    ...ts.configs.recommended.map((c) => ({
        ...c,
        files: ["src/**/*.ts", "exe/**/*.ts", "*.config.ts"],
    })),
    {
        files: ["src/**/*.ts", "exe/**/*.ts", "*.config.ts"],
        languageOptions: {
            parser: ts.parser,
            ecmaVersion: 2023,
            sourceType: "module",
            globals: globals.browser,
        },
        rules: {
            "@typescript-eslint/no-unused-vars": [
                "error",
                {
                    argsIgnorePattern: "^_",
                    varsIgnorePattern: "^_",
                    // Same as on the JS side: `catch (e) {}` around
                    // something that's allowed to fail is intentional
                    // here, not a forgotten variable.
                    caughtErrors: "none",
                },
            ],
            // `any` is sometimes the honest answer for a browser API
            // that isn't in the typings yet (SpeechRecognition). A
            // warning, not an error.
            "@typescript-eslint/no-explicit-any": "warn",
            eqeqeq: ["error", "always", { null: "ignore" }],
        },
    },

    /* The core (src/core/) is headless and must stay that way.
     *
     * Everything below Physical has to be testable without a table, a
     * canvas or a browser, and it has to be portable to Rust later. Both
     * fall over the moment one file reaches for `document` or imports a
     * state object. tsconfig.core.json already removes the DOM typings;
     * these two rules cover what the compiler cannot see.
     *
     * If a core file genuinely needs something from the old tree, that is
     * the signal to pass it in through a parameter instead — not to add
     * an exception here. */
    {
        files: ["src/core/**/*.ts"],
        rules: {
            "no-restricted-imports": [
                "error",
                {
                    patterns: [
                        {
                            group: [
                                "**/state/*",
                                "**/render/*",
                                "**/ui/*",
                                "**/ui/**/*",
                                "**/map/*",
                                "**/dom/*",
                                "**/config/*",
                                "**/puck/*",
                                "**/puck/**/*",
                                "**/pins/*",
                                "**/notes/*",
                                "**/input/*",
                                "**/kg/*",
                                "**/i18n/*",
                                "**/speech/*",
                                "**/talk/*",
                                "**/capture/*",
                                "**/boot/*",
                                "**/types/*",
                                "@biblio",
                            ],
                            message:
                                "src/core/ stays headless: no imports " +
                                "from the app tree. Pass what you need " +
                                "in as a parameter.",
                        },
                    ],
                },
            ],
            "no-restricted-globals": [
                "error",
                {
                    name: "document",
                    message: "src/core/ may not touch the DOM.",
                },
                {
                    name: "window",
                    message: "src/core/ may not touch the DOM.",
                },
                {
                    name: "localStorage",
                    message: "src/core/ may not touch storage directly.",
                },
                {
                    name: "navigator",
                    message: "src/core/ may not touch the browser.",
                },
            ],
        },
    },

    /* The presentation layer draws; it never decides.
     *
     * The one guarantee this layer makes is that no arrow runs from it
     * back into behaviour: the image reads the state, it does not
     * change it. A comment cannot hold that — the first binding that
     * "just needs to check one condition" would break it and nothing
     * would notice — so the boundary is a lint rule.
     *
     * Types are allowed through, because a `StateId` in a lookup table
     * is a name, not a call. Anything executable is not. If a drawing
     * genuinely needs something from a session, add it to
     * `PresentationView`, which exists to be small. */
    {
        files: ["src/core/presentation/**/*.ts"],
        rules: {
            "no-restricted-imports": [
                "error",
                {
                    patterns: [
                        {
                            group: ["**/behaviour/*", "**/session/*"],
                            allowTypeImports: true,
                            message:
                                "The image reads the state, it does not " +
                                "change it. Read what you need through " +
                                "PresentationView instead.",
                        },
                    ],
                },
            ],
        },
    },

    /* Node tooling: the configuration files. */
    {
        files: ["*.config.js", "*.config.mjs", "eslint.config.js"],
        languageOptions: {
            ecmaVersion: 2023,
            sourceType: "module",
            globals: globals.node,
        },
    },

    /* The smoke test sends code into the browser via page.evaluate: both
       the browser's globals and Node's apply there. */
    {
        files: ["src/test/smoke.ts"],
        languageOptions: {
            globals: { ...globals.node, ...globals.browser },
        },
        /* The smoke test wraps `catch(e){}` around everything that's
           allowed to fail in the browser, and holds on to handles
           (`errs`, `ctx`) that sometimes go unused in a given block.
           That's intentional there. */
        rules: {
            "@typescript-eslint/no-unused-vars": "off",
            "@typescript-eslint/no-explicit-any": "off",
            "no-empty": ["error", { allowEmptyCatch: true }],
        },
    },

    /* The unit tests pull describe/it/expect from an import, not from a
       global (see `globals: false` in vitest.config.js). */
    {
        files: ["src/test/unit/**/*.ts"],
        languageOptions: {
            ecmaVersion: 2023,
            sourceType: "module",
            globals: { ...globals.node, ...globals.browser },
        },
    },
];
