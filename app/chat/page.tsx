"use client";

import { Fragment, FormEvent, ReactNode, useEffect, useRef, useState } from "react";
import { CHAT_HISTORY_STORAGE_KEY, ChatStreamEvent, ChatTurn } from "@/lib/chat";
import { CardReference } from "@/lib/heroCardContext";
import { MessageCircle, Send, X } from "lucide-react";

// Bump this by hand whenever a meaningful change ships to the Oracle's
// knowledge or behavior (a new hero guide, a rulebook re-extraction, a
// change to how it reasons about context) — not on every unrelated code
// change, and not computed from a build timestamp, since a Vercel
// redeploy for an unrelated page shouldn't make this look newer than it
// is. DD/MM/YY to match the group's own date convention.
const ORACLE_LAST_UPDATED = "07/09/26";

// NEXT_PUBLIC_MATCH_PASSWORD is already inlined into the client bundle —
// PasswordGate itself reads it the same way to check the unlock form, so
// sending it as a header here doesn't expose anything new.
function authHeaders(): Record<string, string> {
  const password = process.env.NEXT_PUBLIC_MATCH_PASSWORD;
  return password ? { "x-goa-auth": password } : {};
}

// Card description text uses inline icon placeholders like
// "::token_blast::" or "::attack_red::" (representing a small icon on the
// physical card) — turns "token_blast" into "Token Blast" for a readable
// inline badge instead of leaving the raw placeholder text on screen.
function formatIconToken(raw: string): string {
  return raw
    .split("_")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Finds real card names (from this message's own cardReferences — never
// the full database, to avoid matching generic English words against
// unrelated heroes) inside a plain-text segment and wraps each as a
// tappable span that opens the on-demand detail popout. Longer names are
// matched first so e.g. "Grand Melee" doesn't get shadowed by a shorter
// "Melee" match. Cards whose block is already auto-shown (showDetails)
// still get wrapped, so tapping the name in prose works the same way
// everywhere instead of only for strategy replies.
function wrapCardMentions(
  text: string,
  cardReferences: CardReference[],
  keyPrefix: string,
  onSelectCard: (ref: CardReference) => void,
): ReactNode[] {
  const names = Array.from(
    new Set(
      cardReferences
        .map((ref) => (typeof ref.card.name === "string" ? ref.card.name : ""))
        .filter((n) => n.length >= 4),
    ),
  ).sort((a, b) => b.length - a.length);
  if (names.length === 0) return [text];

  const pattern = new RegExp(`(${names.map(escapeRegExp).join("|")})`, "gi");
  const parts = text.split(pattern);
  if (parts.length === 1) return [text];

  return parts.map((part, i) => {
    const ref = cardReferences.find(
      (r) => typeof r.card.name === "string" && r.card.name.toLowerCase() === part.toLowerCase(),
    );
    if (!ref) return part;
    return (
      <button
        key={`${keyPrefix}-mention-${i}`}
        type="button"
        className="goa-card-mention"
        onClick={() => onSelectCard(ref)}
      >
        {part}
      </button>
    );
  });
}

// Lightweight Markdown-ish rendering for the model's replies (bold,
// italic, inline code, bullet lists, paragraphs) — Gemini's answers
// commonly use this handful of patterns, and this stays dependency-free
// by building React nodes directly rather than pulling in a markdown
// library. Never uses dangerouslySetInnerHTML, so there's no HTML
// injection risk regardless of what text comes back.
function renderInline(
  text: string,
  keyPrefix: string,
  cardReferences: CardReference[],
  onSelectCard: (ref: CardReference) => void,
): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /\*\*(.+?)\*\*|`(.+?)`|::([a-zA-Z0-9_]+)::|\*(.+?)\*|_(.+?)_/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  const pushPlain = (segment: string, key: string) => {
    if (!segment) return;
    nodes.push(...wrapCardMentions(segment, cardReferences, key, onSelectCard));
  };
  while ((match = pattern.exec(text))) {
    if (match.index > lastIndex) pushPlain(text.slice(lastIndex, match.index), `${keyPrefix}-${i}`);
    const key = `${keyPrefix}-${i++}`;
    // Card names commonly land inside bold/code/italic (Gemini reaches
    // for **Card Name** or `Card Name` on its own) — wrap the inner text
    // through wrapCardMentions too, not just plain segments, or every
    // formatted mention would silently stay untappable.
    if (match[1] !== undefined)
      nodes.push(
        <strong key={key}>{wrapCardMentions(match[1], cardReferences, key, onSelectCard)}</strong>,
      );
    else if (match[2] !== undefined)
      nodes.push(
        <code key={key} className="goa-chat-code">
          {wrapCardMentions(match[2], cardReferences, key, onSelectCard)}
        </code>,
      );
    else if (match[3] !== undefined)
      nodes.push(
        <span key={key} className="goa-icon-token">
          {formatIconToken(match[3])}
        </span>,
      );
    else
      nodes.push(
        <em key={key}>{wrapCardMentions(match[4] ?? match[5], cardReferences, key, onSelectCard)}</em>,
      );
    lastIndex = pattern.lastIndex;
  }
  if (lastIndex < text.length) pushPlain(text.slice(lastIndex), `${keyPrefix}-tail`);
  return nodes;
}

function renderChatText(
  text: string,
  cardReferences: CardReference[] = [],
  onSelectCard: (ref: CardReference) => void = () => {},
): ReactNode[] {
  const blocks: ReactNode[] = [];
  let listItems: string[] = [];

  const flushList = () => {
    if (listItems.length === 0) return;
    const items = listItems;
    blocks.push(
      <ul key={`list-${blocks.length}`} className="goa-chat-list">
        {items.map((item, i) => (
          <li key={i}>{renderInline(item, `li-${blocks.length}-${i}`, cardReferences, onSelectCard)}</li>
        ))}
      </ul>,
    );
    listItems = [];
  };

  text.split("\n").forEach((line, i) => {
    const headingMatch = line.match(/^\s{0,3}#{1,6}\s+(.*)/);
    if (headingMatch) {
      flushList();
      blocks.push(
        <p key={`h-${i}`} className="goa-chat-heading">
          {renderInline(headingMatch[1], `h-${i}`, cardReferences, onSelectCard)}
        </p>,
      );
      return;
    }
    // Card text exported from the physical cards uses its own markup, not
    // standard Markdown: "~(...)" is small reminder/clarification text
    // (rendered as its own muted note), ">>" starts a new option in a
    // "Choose one —" list, and a lone ">" is that same option's text
    // continuing after a card's hard line-wrap — appended to the option
    // above rather than becoming its own bullet. Without this, all three
    // markers show up as literal ~/>/>> characters in the UI.
    const reminderMatch = line.match(/^\s*~\((.*)\)\s*$/);
    if (reminderMatch) {
      flushList();
      blocks.push(
        <p key={`rem-${i}`} className="goa-chat-reminder">
          {renderInline(reminderMatch[1], `rem-${i}`, cardReferences, onSelectCard)}
        </p>,
      );
      return;
    }
    const bulletMatch = line.match(/^\s*[-*]\s+(.*)/);
    if (bulletMatch) {
      listItems.push(bulletMatch[1]);
      return;
    }
    const optionMatch = line.match(/^\s*>>\s*(.*)/);
    if (optionMatch) {
      listItems.push(optionMatch[1]);
      return;
    }
    const optionContinuationMatch = line.match(/^\s*>\s*(.*)/);
    if (optionContinuationMatch) {
      if (listItems.length > 0) {
        listItems[listItems.length - 1] =
          `${listItems[listItems.length - 1]} ${optionContinuationMatch[1]}`.trim();
      } else {
        listItems.push(optionContinuationMatch[1]);
      }
      return;
    }
    flushList();
    if (line.trim() === "") {
      blocks.push(<br key={`br-${i}`} />);
    } else {
      blocks.push(
        <p key={`p-${i}`} className="goa-chat-line">
          {renderInline(line, `p-${i}`, cardReferences, onSelectCard)}
        </p>,
      );
    }
  });
  flushList();

  return blocks;
}

// Roughly matches each card color's in-game theme; falls back to the
// default border for anything unrecognized.
const CARD_COLOR_ACCENT: Record<string, string> = {
  RED: "#c42a3a",
  BLUE: "#2aabb8",
  GREEN: "#5dbb8a",
  GOLD: "#f0c96a",
  PURPLE: "#a97fd4",
  SILVER: "#b8b8c0",
};

function asString(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}
function asNumber(v: unknown): number | null {
  return typeof v === "number" ? v : null;
}

// Renders a card's exact fields straight from source data — this is the
// actual fix for the model occasionally misstating a card's color/stats
// while summarizing: nothing shown here passed through the model's own
// synthesis, it's a direct lookup rendered by this component. See
// lib/heroCardContext.ts's findMentionedCards.
function CardStatBlock({ reference }: { reference: CardReference }) {
  const card = reference.card;
  const name = asString(card.name) ?? "Unknown Card";
  const color = asString(card.color) ?? "";
  const level = asNumber(card.level);
  const initiative = asNumber(card.initiative);
  const primaryAction = asString(card.primaryAction);
  const primaryValue = asNumber(card.primaryValue);
  const modifier = asString(card.modifier);
  const modifierValue = asNumber(card.modifierValue);
  const secondaryMovement = asNumber(card.secondaryMovement);
  const secondaryDefense = asNumber(card.secondaryDefense);
  const item = asString(card.item);
  const description = asString(card.description) ?? "";
  const accent = CARD_COLOR_ACCENT[color] ?? "var(--border)";

  return (
    <div className="goa-card-ref" style={{ borderColor: accent }}>
      {reference.colorMismatch && (
        <p className="goa-card-ref-warning">
          ⚠ You asked about a different color — this card is actually {color || "a different color"}.
        </p>
      )}
      <div className="goa-card-ref-head">
        <span className="goa-card-ref-name" style={{ color: accent }}>
          {name}
        </span>
        <span className="goa-card-ref-hero">{reference.heroName}</span>
      </div>
      <div className="goa-card-ref-tags">
        {color && (
          <span className="goa-card-ref-tag" style={{ borderColor: accent, color: accent }}>
            {color} · {level ? `Tier ${level}` : "Starting"}
          </span>
        )}
        {initiative !== null && <span className="goa-card-ref-tag">Init {initiative}</span>}
        {primaryAction && (
          <span className="goa-card-ref-tag">
            {primaryAction}
            {primaryValue !== null ? ` ${primaryValue}` : ""}
          </span>
        )}
        {modifier && modifierValue !== null && (
          <span className="goa-card-ref-tag">
            {modifier} {modifierValue}
          </span>
        )}
        {secondaryMovement !== null && (
          <span className="goa-card-ref-tag">Move {secondaryMovement}</span>
        )}
        {secondaryDefense !== null && (
          <span className="goa-card-ref-tag">Def {secondaryDefense}</span>
        )}
        {item && <span className="goa-card-ref-tag">Item: {item}</span>}
      </div>
      {description && <div className="goa-card-ref-desc">{renderChatText(description)}</div>}
    </div>
  );
}

// On-demand popout for a card tapped inline in a strategy reply's prose
// (where the block doesn't auto-show) — reuses CardStatBlock's exact
// rendering so a tapped card always looks identical to an auto-shown one.
function CardDetailModal({
  reference,
  onClose,
}: {
  reference: CardReference;
  onClose: () => void;
}) {
  return (
    <div className="goa-card-modal-backdrop" onClick={onClose}>
      <div className="goa-card-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="goa-card-modal-close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>
        <CardStatBlock reference={reference} />
      </div>
    </div>
  );
}

function ChatPageInner() {
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  // The in-progress reply's text as it streams in — kept separate from
  // `messages`/sessionStorage until the stream finishes (successfully or
  // not), so a mid-stream failure or navigation away never leaves a
  // half-written turn sitting in persisted history.
  const [streamingReply, setStreamingReply] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<CardReference | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Every visit to this page starts a fresh conversation — clears out
  // whatever a prior visit may have persisted, rather than restoring it.
  // `messages` already starts at [] via useState, so there's no setState
  // here to trip the set-state-in-effect rule.
  useEffect(() => {
    sessionStorage.removeItem(CHAT_HISTORY_STORAGE_KEY);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  // Safety net: if this page unmounts while the textarea still has focus
  // (e.g. a back gesture instead of a normal blur), don't leave the body
  // stuck in the "keyboard open" state for whatever page loads next.
  useEffect(() => {
    return () => document.body.classList.remove("goa-chat-input-focused");
  }, []);

  const persistMessages = (next: ChatTurn[]) => {
    setMessages(next);
    sessionStorage.setItem(CHAT_HISTORY_STORAGE_KEY, JSON.stringify(next));
  };

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || sending) return;

    // Close the keyboard as soon as the message is sent, rather than
    // leaving it open until the reply arrives (or requiring a manual tap
    // elsewhere to dismiss it) — matches the app's earlier fix that keeps
    // focus on the textarea through the send tap itself; this just moves
    // the blur to happen right after, once we know a send actually went
    // through, instead of not at all.
    textareaRef.current?.blur();

    const historyBeforeSend = messages;
    const nextMessages: ChatTurn[] = [...messages, { role: "user", text: trimmed }];
    persistMessages(nextMessages);
    setInput("");
    setSending(true);
    setStreamingReply("");
    setError(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ message: trimmed, history: historyBeforeSend }),
      });
      if (!res.ok) {
        // A request that fails before generation starts (bad auth,
        // invalid body, a Discord/rulebook lookup error) still returns a
        // plain JSON error with a real HTTP status — only a failure once
        // generation had already started arrives as an in-band "error"
        // line in the stream body itself, handled below.
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Something went wrong");
      }
      if (!res.body) throw new Error("Something went wrong");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";
      let doneEvent: Extract<ChatStreamEvent, { type: "done" }> | null = null;
      let errorEvent: Extract<ChatStreamEvent, { type: "error" }> | null = null;

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          if (!line.trim()) continue;

          let event: ChatStreamEvent;
          try {
            event = JSON.parse(line);
          } catch {
            continue;
          }
          if (event.type === "chunk") {
            fullText += event.text;
            setStreamingReply(fullText);
          } else if (event.type === "done") {
            doneEvent = event;
          } else if (event.type === "error") {
            errorEvent = event;
          }
        }
      }

      // A partial reply (some text streamed before a mid-generation
      // failure) is still worth keeping — losing an otherwise-useful
      // partial answer just because the stream cut off would be a worse
      // experience than showing it with an error noted alongside.
      if (fullText) {
        persistMessages([
          ...nextMessages,
          {
            role: "model",
            text: fullText,
            cardReferences: doneEvent?.cardReferences,
            showCardDetails: doneEvent?.showCardDetails,
          },
        ]);
      }
      if (errorEvent) {
        setError(errorEvent.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSending(false);
      setStreamingReply("");
    }
  };

  return (
    <main className="goa-root goa-chat-page">
      <div className="goa-chat-messages">
        {/* Lives inside the scroll container (not as a fixed sibling) so
            it scrolls away with the rest of the conversation once there's
            enough of it — the message list gets the full viewport instead
            of permanently losing space to a header that stays pinned. */}
        <header className="goa-header">
          <div className="goa-crown">
            <MessageCircle size={30} />
          </div>
          <h1 className="goa-title">Ask the Oracle</h1>
          <p className="goa-subtitle">Guards of Atlantis II</p>
          <p className="goa-chat-last-updated">Last updated: {ORACLE_LAST_UPDATED}</p>
        </header>

        {messages.length === 0 && (
          <p className="goa-chat-empty">
            Ask a question about the rules, hero action cards, or the group&apos;s Discord
            history.
          </p>
        )}
        {messages.map((m, i) => (
          <Fragment key={i}>
            <div className={`goa-chat-bubble ${m.role}`}>
              {m.role === "model"
                ? renderChatText(m.text, m.cardReferences ?? [], setSelectedCard)
                : m.text}
            </div>
            {m.role === "model" && m.showCardDetails && m.cardReferences && m.cardReferences.length > 0 && (
              <div className="goa-card-ref-list">
                {m.cardReferences.map((ref, j) => (
                  <CardStatBlock key={j} reference={ref} />
                ))}
              </div>
            )}
          </Fragment>
        ))}
        {sending && (
          <div className={`goa-chat-bubble model${streamingReply ? "" : " goa-chat-thinking"}`}>
            {streamingReply ? renderChatText(streamingReply) : "Thinking…"}
          </div>
        )}
        {error && <p className="goa-chat-error">{error}</p>}
        <div ref={messagesEndRef} />
      </div>

      <form className="goa-chat-input-bar" onSubmit={handleSend}>
        <textarea
          ref={textareaRef}
          className="goa-chat-textarea"
          placeholder="Speak to the Oracle…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend(e as unknown as FormEvent);
            }
          }}
          // On mobile, a position:fixed bottom nav doesn't reliably stay
          // above the on-screen keyboard (it tracks the layout viewport,
          // which iOS Safari doesn't shrink, not the visual one, which
          // does) — it can end up overlapping the input bar instead.
          // Hiding it specifically while actively typing sidesteps that
          // entirely; it's still shown for normal browsing on this page.
          onFocus={() => document.body.classList.add("goa-chat-input-focused")}
          onBlur={() => document.body.classList.remove("goa-chat-input-focused")}
          rows={1}
        />
        <button
          type="submit"
          className="goa-chat-send-btn"
          disabled={sending || !input.trim()}
          // Without this, tapping the button first blurs the textarea
          // (the default action of a mousedown on another element) before
          // the click fires — that blur closes the keyboard and, via the
          // onBlur handler above, triggers a layout reflow (nav
          // reappearing, page height changing) mid-touch, which can shift
          // the button out from under the tap and swallow the click
          // entirely. Preventing the mousedown's default keeps focus (and
          // the keyboard) exactly where it was, so the tap always reaches
          // the click/submit on the first try.
          onMouseDown={(e) => e.preventDefault()}
        >
          <Send size={18} />
        </button>
      </form>

      {selectedCard && (
        <CardDetailModal reference={selectedCard} onClose={() => setSelectedCard(null)} />
      )}
    </main>
  );
}

export default function ChatPage() {
  return <ChatPageInner />;
}
