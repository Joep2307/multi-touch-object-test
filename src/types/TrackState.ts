/* `candidate` hasn't been seen long enough yet; `incomplete` is briefly
   gone but still being held onto (see CFG.dropoutMS). */
export type TrackState = "candidate" | "recognised" | "incomplete";
