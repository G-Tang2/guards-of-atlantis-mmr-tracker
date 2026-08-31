// Shared between /teams and /teams/vote. /teams writes the ordered pool of
// player IDs being split right before navigating away; /teams/vote uses it
// both to know who's voting and, after each vote, to persist the running
// tally so a refresh mid-vote (the device is passed hand-to-hand) can
// resume instead of restarting. Cleared once a winner is applied, or when
// the vote page bails out for missing/invalid data.
export const RANKED_VOTE_STORAGE_KEY = "goa-ranked-vote";
