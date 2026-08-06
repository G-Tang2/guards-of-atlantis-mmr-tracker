// Shared between /teams and /matches/new so an in-progress team assembly
// survives the user hitting Back from the match-record step, instead of
// resetting to an empty pool. Cleared once a match is actually recorded.
export const TEAMS_DRAFT_STORAGE_KEY = "goa-teams-draft";
