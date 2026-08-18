// Shared between /matches/timer and /matches/new so a completed timer
// session's per-player cumulative action time survives the handoff into
// the match-record step. Cleared once a match is actually recorded.
export const TIMER_LOG_STORAGE_KEY = "goa-timer-log";
