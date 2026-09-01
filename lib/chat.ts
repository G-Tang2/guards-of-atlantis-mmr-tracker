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
};

export type ChatRequestBody = {
  message: string;
  history: ChatTurn[];
};

export type ChatResponseBody =
  | { ok: true; reply: string; cardReferences: CardReference[] }
  | { ok: false; error: string };

// A conversation lives only in the current browser tab's sessionStorage —
// nothing about it is ever persisted server-side (mirrors this app's other
// sessionStorage-only flows, e.g. lib/rankedVote.ts).
export const CHAT_HISTORY_STORAGE_KEY = "goa-chat-history";
