import { ReactNode } from "react";
import { CardReference } from "@/lib/heroCardContext";

// Same lightweight Markdown-ish rendering as app/chat/page.tsx's own
// renderChatText (bold, italic, inline code, bullet lists, paragraphs,
// headings, plus hero-card-text's own "~(...)" reminder notes and
// ">>"/">" option-list markup) — kept as its own copy rather than a
// direct import, since the chat page's version threads its rendering
// through local component state (onSelectCard opens that page's own
// selectedCard state) that doesn't carry over to other callers. The
// tappable card-mention feature itself (wrapCardMentions below) is fully
// reproduced here, parameterized the same way chat's is, so any caller
// can opt in by passing real cardReferences/onSelectCard — callers with
// nothing to make tappable (e.g. a hero card's own description text) just
// omit them and get plain formatting, same as before this existed.
//
// Never uses dangerouslySetInnerHTML, so there's no HTML injection risk
// regardless of what text comes back from the model.
//
// Reuses the chat page's own CSS classes (goa-chat-heading/-list/-line/
// -reminder/-code, goa-icon-token, goa-card-mention) since they're
// generic prose styling, not scoped to the chat bubble itself — only
// strong/em need a per-caller wrapper class for their color (see
// goa-draft-analysis-text in globals.css), since goa-chat-bubble.model/
// .user's own strong/em rules are scoped to that specific class.
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function formatIconToken(raw: string): string {
  return raw
    .split("_")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function wrapCardMentions(
  text: string,
  cardReferences: CardReference[],
  keyPrefix: string,
  onSelectCard: (ref: CardReference) => void,
): ReactNode[] {
  if (cardReferences.length === 0) return [text];

  const names = Array.from(
    new Set(
      cardReferences
        .map((ref) => (typeof ref.card.name === "string" ? ref.card.name : ""))
        .filter((n) => n.length >= 4),
    ),
  ).sort((a, b) => b.length - a.length);
  if (names.length === 0) return [text];

  // Letter-boundary lookaround (zero-width, so it isn't itself captured
  // by split() below) rather than \b — see lib/heroCardContext.ts's
  // findMentionedCards for why a real \b breaks on names ending in
  // punctuation. This stops a short, common-word card name (e.g.
  // Gydion's spell "Shield") from matching as a fragment of an unrelated
  // longer word like "windshield" or "shielding".
  const pattern = new RegExp(`(?<![a-zA-Z])(${names.map(escapeRegExp).join("|")})(?![a-zA-Z])`, "gi");
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
    if (match[1] !== undefined)
      nodes.push(<strong key={key}>{wrapCardMentions(match[1], cardReferences, key, onSelectCard)}</strong>);
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
      nodes.push(<em key={key}>{wrapCardMentions(match[4] ?? match[5], cardReferences, key, onSelectCard)}</em>);
    lastIndex = pattern.lastIndex;
  }
  if (lastIndex < text.length) pushPlain(text.slice(lastIndex), `${keyPrefix}-tail`);
  return nodes;
}

export function renderSimpleMarkdown(
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
    // Hero card text's own markup (see app/chat/page.tsx's renderChatText,
    // which this mirrors): "~(...)" is small reminder/clarification text,
    // ">>" starts a new option in a "Choose one —" list, and a lone ">"
    // continues that option's text after a card's hard line-wrap.
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
