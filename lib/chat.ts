import { CardReference } from "@/lib/heroCardContext";

export type ChatRole = "user" | "model";

export type ChatTurn = {
  role: ChatRole;
  text: string;
  // Only ever set on model turns — the exact card data (color, stats,
  // rules text) for any real card the reply named, rendered straight from
  // source data rather than the model's own recitation of it. See
  // lib/heroCardContext.ts's findMentionedCards for why this exists.
  cardReferences?: CardReference[];
  // Whether cardReferences should render as an always-visible block list
  // (the user explicitly asked about card facts) vs. stay hidden until
  // the reader taps a card's name in the reply text (a strategy question
  // that merely mentions cards in passing) — see isCardDetailQuestion in
  // lib/heroCardContext.ts for how the server decides this.
  showCardDetails?: boolean;
};

export type ChatRequestBody = {
  message: string;
  history: ChatTurn[];
};

// The success path streams as newline-delimited JSON instead of one
// final object — each line is one of these, in order: zero or more
// "chunk" events (the reply's text, incrementally, as Gemini generates
// it) followed by exactly one "done" (cardReferences/showCardDetails
// aren't known until the full reply text has been scanned for card
// mentions — see findMentionedCards) or "error" (a failure once
// generation had already started, so the response is already committed
// to a 200 status — see app/api/chat/route.ts). A request that fails
// before generation starts (bad auth, invalid body, a Discord/rulebook
// lookup error) still returns a plain non-200 JSON error body, not this.
export type ChatStreamEvent =
  | { type: "chunk"; text: string }
  | { type: "done"; cardReferences: CardReference[]; showCardDetails: boolean }
  | { type: "error"; error: string };

// The client resends the whole session's messages as history on every turn
// (see app/chat/page.tsx) — harmless for the sessionStorage copy, but
// uncapped it means a long-running conversation compounds token usage on
// top of whatever the new question itself needs, on every single
// subsequent turn. Trimmed to the most recent turns that fit this budget
// (recency, not relevance, since conversation continuity is what history
// is for) rather than the keyword-priority fill used for Discord/rulebook
// context. Same ~4-chars-per-token heuristic as the other context budgets.
const HISTORY_TOKEN_BUDGET = 20_000;
const HISTORY_CHAR_BUDGET = HISTORY_TOKEN_BUDGET * 4;

export function trimHistoryToBudget(history: ChatTurn[]): ChatTurn[] {
  const kept: ChatTurn[] = [];
  let totalChars = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    const chars = history[i].text.length;
    // Always keep at least the single most recent turn, even if it alone
    // exceeds the budget (an unusually long model reply) — dropping it
    // entirely would lose more continuity than the token savings are worth.
    if (kept.length > 0 && totalChars + chars > HISTORY_CHAR_BUDGET) break;
    kept.unshift(history[i]);
    totalChars += chars;
  }
  return kept;
}

// A conversation lives only in the current browser tab's sessionStorage —
// nothing about it is ever persisted server-side (mirrors this app's other
// sessionStorage-only flows, e.g. lib/rankedVote.ts).
export const CHAT_HISTORY_STORAGE_KEY = "goa-chat-history";
