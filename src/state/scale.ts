/* What the table has worked out about its own screen.

   `seed` is what the declared screen diagonal implies, recomputed on
   every resize. `k` is the correction the pucks have measured against it,
   so the scale in use is `seed * k` -- see `syncPxPerMM`.

   A factor rather than a scale, because the two have to survive different
   things. Put the window on half the screen and the seed halves with it;
   the fact that the panel is two per cent smaller than its spec sheet says
   is unchanged. `k` is therefore the part worth keeping across a resize,
   and the part worth storing between sessions. */
export const scale = {
    seed: 4,
    k: 1,
    samples: 0,
};
