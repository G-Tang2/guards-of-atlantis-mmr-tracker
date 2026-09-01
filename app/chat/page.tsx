"use client";

import { Fragment, FormEvent, ReactNode, useEffect, useRef, useState } from "react";
import { PasswordGate } from "@/components/PasswordGate";
import { CHAT_HISTORY_STORAGE_KEY, ChatTurn } from "@/lib/chat";
import { CardReference } from "@/lib/heroCardContext";
import { MessageCircle, Send } from "lucide-react";

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

// Lightweight Markdown-ish rendering for the model's replies (bold,
// italic, inline code, bullet lists, paragraphs) — Gemini's answers
// commonly use this handful of patterns, and this stays dependency-free
// by building React nodes directly rather than pulling in a markdown
// library. Never uses dangerouslySetInnerHTML, so there's no HTML
// injection risk regardless of what text comes back.
function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /\*\*(.+?)\*\*|`(.+?)`|::([a-zA-Z0-9_]+)::|\*(.+?)\*|_(.+?)_/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = pattern.exec(text))) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    const key = `${keyPrefix}-${i++}`;
    if (match[1] !== undefined) nodes.push(<strong key={key}>{match[1]}</strong>);
    else if (match[2] !== undefined)
      nodes.push(
        <code key={key} className="goa-chat-code">
          {match[2]}
        </code>,
      );
    else if (match[3] !== undefined)
      nodes.push(
        <span key={key} className="goa-icon-token">
          {formatIconToken(match[3])}
        </span>,
      );
    else nodes.push(<em key={key}>{match[4] ?? match[5]}</em>);
    lastIndex = pattern.lastIndex;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

function renderChatText(text: string): ReactNode[] {
  const blocks: ReactNode[] = [];
  let listItems: string[] = [];

  const flushList = () => {
    if (listItems.length === 0) return;
    const items = listItems;
    blocks.push(
      <ul key={`list-${blocks.length}`} className="goa-chat-list">
        {items.map((item, i) => (
          <li key={i}>{renderInline(item, `li-${blocks.length}-${i}`)}</li>
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
          {renderInline(headingMatch[1], `h-${i}`)}
        </p>,
      );
      return;
    }
    const bulletMatch = line.match(/^\s*[-*]\s+(.*)/);
    if (bulletMatch) {
      listItems.push(bulletMatch[1]);
      return;
    }
    flushList();
    if (line.trim() === "") {
      blocks.push(<br key={`br-${i}`} />);
    } else {
      blocks.push(
        <p key={`p-${i}`} className="goa-chat-line">
          {renderInline(line, `p-${i}`)}
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

function ChatPageInner() {
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  const persistMessages = (next: ChatTurn[]) => {
    setMessages(next);
    sessionStorage.setItem(CHAT_HISTORY_STORAGE_KEY, JSON.stringify(next));
  };

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || sending) return;

    const historyBeforeSend = messages;
    const nextMessages: ChatTurn[] = [...messages, { role: "user", text: trimmed }];
    persistMessages(nextMessages);
    setInput("");
    setSending(true);
    setError(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ message: trimmed, history: historyBeforeSend }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Something went wrong");
      persistMessages([
        ...nextMessages,
        { role: "model", text: data.reply, cardReferences: data.cardReferences },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="goa-root goa-chat-page">
      <header className="goa-header">
        <div className="goa-crown">
          <MessageCircle size={30} />
        </div>
        <h1 className="goa-title">Ask the Oracle</h1>
        <p className="goa-subtitle">Guards of Atlantis II</p>
      </header>

      <div className="goa-chat-messages">
        {messages.length === 0 && (
          <p className="goa-chat-empty">
            Ask a question about the rules, hero action cards, or the group&apos;s Discord
            history.
          </p>
        )}
        {messages.map((m, i) => (
          <Fragment key={i}>
            <div className={`goa-chat-bubble ${m.role}`}>
              {m.role === "model" ? renderChatText(m.text) : m.text}
            </div>
            {m.role === "model" && m.cardReferences && m.cardReferences.length > 0 && (
              <div className="goa-card-ref-list">
                {m.cardReferences.map((ref, j) => (
                  <CardStatBlock key={j} reference={ref} />
                ))}
              </div>
            )}
          </Fragment>
        ))}
        {sending && <div className="goa-chat-bubble model goa-chat-thinking">Thinking…</div>}
        {error && <p className="goa-chat-error">{error}</p>}
        <div ref={messagesEndRef} />
      </div>

      <form className="goa-chat-input-bar" onSubmit={handleSend}>
        <textarea
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
          rows={1}
        />
        <button type="submit" className="goa-chat-send-btn" disabled={sending || !input.trim()}>
          <Send size={18} />
        </button>
      </form>
    </main>
  );
}

export default function ChatPage() {
  return (
    <PasswordGate>
      <ChatPageInner />
    </PasswordGate>
  );
}
