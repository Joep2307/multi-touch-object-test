/* The rules of the tree, checked against the files themselves.
 *
 * Three of the standing conventions cannot be held by the compiler or
 * by Prettier, and a convention nothing checks is a convention that
 * drifts:
 *
 *   1. every folder under src/ has an index.ts barrel;
 *   2. an import that leaves its folder goes through the barrel of the
 *      folder it lands in — never to a file inside it. The one
 *      exception is an import *up* the tree: a file may import a file
 *      from a folder above it, because that folder's barrel re-exports
 *      the child and the cycle that makes would hand a subclass an
 *      undefined base;
 *   3. one symbol per file, and the file is named after it. `index.ts`
 *      and `constants.ts` are the exceptions the convention itself
 *      names; declaration files, tests and the entry point export
 *      nothing of their own;
 *   4. 79 columns, also where Prettier does not reach — comments,
 *      string literals and the rules drawn in a heading.
 *
 * Each failure lists every offender, so a run reads as a to-do list.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import {
    basename,
    dirname,
    extname,
    join,
    relative,
    resolve,
} from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const SRC = resolve(fileURLToPath(new URL("../../", import.meta.url)));
const skipDir = (dir: string): boolean =>
    dir.startsWith(join(SRC, "wasm")) ||
    dir === join(SRC, "test", "unit", "core", "fixtures");

const files: string[] = [];
const folders = new Set<string>();
(function walk(dir: string): void {
    if (skipDir(dir)) return;
    for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) walk(path);
        else if (name.endsWith(".ts")) {
            files.push(path);
            folders.add(dir);
        }
    }
})(SRC);

/* Folders that need a barrel: every folder holding code, except src/
   itself (main.ts is the entry, not a module) and the test tree. */
const codeFolders = [...folders].filter(
    (dir) => dir !== SRC && !dir.startsWith(join(SRC, "test")),
);

const rel = (path: string): string =>
    relative(SRC, path).split("\\").join("/");
const resolveImport = (from: string, spec: string): string | null => {
    const base = resolve(dirname(from), spec);
    for (const candidate of [base + ".ts", join(base, "index.ts"), base]) {
        if (existsSync(candidate) && statSync(candidate).isFile())
            return candidate;
    }
    return null;
};
const isAncestor = (dir: string, of: string): boolean => {
    const r = relative(dir, of);
    return r !== "" && !r.startsWith("..");
};

/* The stylesheets are held to the same width; the code and the opmaak
   are one tree as far as this rule is concerned. */
const STYLES = fileURLToPath(new URL("../../../exe/styles/", import.meta.url));
const styleFiles: string[] = [];
(function walk(dir: string): void {
    for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) walk(path);
        else if (extname(name) === ".scss") styleFiles.push(path);
    }
})(STYLES);

/* The two files that predate the 79/4 convention and are exempt from it
   in .prettierignore, for the reason given there: they are aligned by
   hand — the language table in two columns, the panels in the HTML — and
   reflowing them turns that into shuffled lines `git blame` can no
   longer follow. exe/index.html is not scanned here at all; L.ts is, so
   the exemption has to be named. */
const WIDTH_EXEMPT = [join(SRC, "i18n", "L.ts")];

describe("src/ conventions", () => {
    it("gives every code folder an index.ts barrel", () => {
        const missing = codeFolders
            .filter((dir) => !existsSync(join(dir, "index.ts")))
            .map(rel);
        expect(missing).toEqual([]);
    });

    it("imports another folder through its barrel", () => {
        const offenders: string[] = [];
        for (const file of files) {
            if (basename(file) === "index.ts") continue;
            const src = readFileSync(file, "utf8");
            const re = /^(?:import|export)[^'"]*from\s+["'](\.[^"']+)["']/gm;
            for (const m of src.matchAll(re)) {
                const spec = m[1] ?? "";
                const target = resolveImport(file, spec);
                if (!target || !target.endsWith(".ts")) continue;
                if (basename(target) === "index.ts") continue;
                const from = dirname(file);
                const to = dirname(target);
                if (to === from || isAncestor(to, from)) continue;
                offenders.push(`${rel(file)} -> ${spec}`);
            }
        }
        expect(offenders).toEqual([]);
    });

    it("keeps one symbol per file, named after the file", () => {
        const offenders: string[] = [];
        for (const file of files) {
            const name = basename(file);
            if (name === "index.ts" || name === "constants.ts") continue;
            if (name.endsWith(".d.ts") || name.endsWith(".test.ts")) continue;
            if (file.startsWith(join(SRC, "test"))) continue;
            if (file === join(SRC, "main.ts")) continue;
            const src = readFileSync(file, "utf8");
            const kinds =
                "(?:abstract )?class|(?:async )?function|const|let|" +
                "type|interface|enum";
            const re = new RegExp(`^export (?:${kinds}) (\\w+)`, "gm");
            const exported = [...src.matchAll(re)].map((m) => m[1]);
            const stem = name.replace(/\.ts$/, "");
            if (exported.length !== 1 || exported[0] !== stem) {
                offenders.push(
                    `${rel(file)} exports ${exported.join(", ") || "nothing"}`,
                );
            }
        }
        expect(offenders).toEqual([]);
    });

    it("keeps every line inside 79 columns", () => {
        const offenders: string[] = [];
        for (const file of [...files, ...styleFiles]) {
            if (WIDTH_EXEMPT.includes(file)) continue;
            const lines = readFileSync(file, "utf8").split("\n");
            lines.forEach((line, i) => {
                /* Characters, not bytes: a `—` or a `·` is one column
                   wide on screen and counts as one here. */
                if ([...line].length > 79) {
                    offenders.push(`${rel(file)}:${i + 1}`);
                }
            });
        }
        expect(offenders).toEqual([]);
    });
});
