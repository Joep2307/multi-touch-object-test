/* Files whose Last-Modified header feeds the build stamp. The bundled
   scripts have a hash in their name after a build, so they can't be named
   here; `version.json` is written by deploy/update.sh on every build. */
export const STAMP_FILES = ["./index.html", "./version.json"];
