"use client";

import { Fragment, FormEvent, useEffect, useRef, useState } from "react";
import { CHAT_HISTORY_STORAGE_KEY, ChatStreamEvent, ChatTurn } from "@/lib/chat";
import { CardReference } from "@/lib/heroCardContext";
import { CardStatBlock, CardDetailModal } from "@/components/CardDetail";
import { renderSimpleMarkdown } from "@/lib/simpleMarkdown";
import { MessageCircle, Send } from "lucide-react";

// Bump this by hand whenever a meaningful change ships to the Oracle's
// knowledge or behavior (a new hero guide, a rulebook re-extraction, a
// change to how it reasons about context) — not on every unrelated code
// change, and not computed from a build timestamp, since a Vercel
// redeploy for an unrelated page shouldn't make this look newer than it
// is. DD/MM/YY to match the group's own date convention.
const ORACLE_LAST_UPDATED = "09/09/26";

// NEXT_PUBLIC_MATCH_PASSWORD is already inlined into the client bundle —
// PasswordGate itself reads it the same way to check the unlock form, so
// sending it as a header here doesn't expose anything new.
function authHeaders(): Record<string, string> {
  const password = process.env.NEXT_PUBLIC_MATCH_PASSWORD;
  return password ? { "x-goa-auth": password } : {};
}

function ChatPageInner() {
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  // The in-progress reply's text as it streams in — kept separate from
  // `messages`/localStorage until the stream finishes (successfully or
  // not), so a mid-stream failure or navigation away never leaves a
  // half-written turn sitting in persisted history.
  const [streamingReply, setStreamingReply] = useState("");
  // Ticks once a second while waiting on a reply — shown next to
  // "Thinking…" so a free-tier wait (up to 45s, see FIRST_CHUNK_DEADLINE_MS
  // in app/api/chat/route.ts) reads as "still working" rather than
  // "possibly stuck," since there's nothing else visible changing during
  // that stretch.
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<CardReference | null>(null);
  // Bumped only when the user submits a question — a dedicated trigger
  // for the auto-scroll effect below, distinct from `messages`/`sending`
  // changing again once the reply streams in or finishes. Scrolling on
  // every reply update/completion would yank the viewport back to the
  // bottom while someone's still reading an earlier part of a long
  // answer, or had scrolled up to re-read something while waiting.
  const [sendCount, setSendCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Every visit to this page starts a fresh conversation — clears out
  // whatever a prior visit may have persisted, rather than restoring it.
  // `messages` already starts at [] via useState, so there's no setState
  // here to trip the set-state-in-effect rule.
  useEffect(() => {
    localStorage.removeItem(CHAT_HISTORY_STORAGE_KEY);
  }, []);

  useEffect(() => {
    if (sendCount === 0) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [sendCount]);

  // rows={1} on the textarea only sets its *initial* height — without
  // this, a pasted or multi-line message just scrolled inside that
  // single visible line instead of growing the box to show it. Resetting
  // to "auto" before reading scrollHeight is what lets the box shrink
  // back down too (e.g. after deleting text or sending), not just grow;
  // the CSS max-height on .goa-chat-textarea still caps how tall this can
  // get before it scrolls internally.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [input]);

  // Safety net: if this page unmounts while the textarea still has focus
  // (e.g. a back gesture instead of a normal blur), don't leave the body
  // stuck in the "keyboard open" state for whatever page loads next.
  useEffect(() => {
    return () => document.body.classList.remove("goa-chat-input-focused");
  }, []);

  useEffect(() => {
    return () => {
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    };
  }, []);

  const persistMessages = (next: ChatTurn[]) => {
    setMessages(next);
    localStorage.setItem(CHAT_HISTORY_STORAGE_KEY, JSON.stringify(next));
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
    setSendCount((c) => c + 1);

    const startedAt = Date.now();
    setElapsedSeconds(0);
    elapsedTimerRef.current = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);

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
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
      elapsedTimerRef.current = null;
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
          <h1 className="goa-title goa-title-with-tag">
            Ask the Oracle <span className="goa-beta-tag">Beta</span>
          </h1>
          <p className="goa-subtitle">Guards of Atlantis II</p>
          <p className="goa-chat-last-updated">Last updated: {ORACLE_LAST_UPDATED}</p>
          <p className="goa-chat-last-updated">
            <strong>This chat is private — we don&apos;t log or save your conversations.</strong>
          </p>
          <p className="goa-chat-last-updated">
            The Oracle runs on a free AI model, so replies can take up to 45 seconds.
          </p>
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
                ? renderSimpleMarkdown(m.text, m.cardReferences ?? [], setSelectedCard)
                : m.text}
            </div>
            {m.role === "model" &&
              m.showCardDetails &&
              m.cardReferences &&
              m.cardReferences.length > 0 &&
              (m.cardReferences.length > 1 ? (
                <details className="goa-card-ref-details">
                  <summary className="goa-card-ref-summary">
                    Show {m.cardReferences.length} cards
                  </summary>
                  <div className="goa-card-ref-list">
                    {m.cardReferences.map((ref, j) => (
                      <CardStatBlock key={j} reference={ref} />
                    ))}
                  </div>
                </details>
              ) : (
                <div className="goa-card-ref-list">
                  <CardStatBlock reference={m.cardReferences[0]} />
                </div>
              ))}
          </Fragment>
        ))}
        {sending && (
          <div className={`goa-chat-bubble model${streamingReply ? "" : " goa-chat-thinking"}`}>
            {streamingReply ? renderSimpleMarkdown(streamingReply) : `Thinking… (${elapsedSeconds}s)`}
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
