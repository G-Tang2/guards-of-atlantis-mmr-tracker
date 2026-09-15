import { ReactNode } from "react";

// Same lightweight Markdown-ish rendering as app/chat/page.tsx's own
// renderChatText (bold, italic, inline code, bullet lists, paragraphs,
// headings) — kept as its own copy rather than shared, since that
// version is tightly coupled to the chat page's tappable card-mention
// feature (CardReference lookups), which callers here (currently: the
// match detail page's Oracle draft analysis) have no equivalent of.
// Never uses dangerouslySetInnerHTML, so there's no HTML injection risk
// regardless of what text comes back from the model.
//
// Reuses the chat page's own CSS classes (goa-chat-heading/-list/-line/
// -reminder/-code, goa-icon-token) since they're generic prose styling,
// not scoped to the chat bubble itself — only strong/em need a
// per-caller wrapper class for their color (see goa-draft-analysis-text
// in globals.css), since goa-chat-bubble.model/.user's own strong/em
// rules are scoped to that specific class.
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
          {match[3].split("_").filter(Boolean).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
        </span>,
      );
    else nodes.push(<em key={key}>{match[4] ?? match[5]}</em>);
    lastIndex = pattern.lastIndex;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

export function renderSimpleMarkdown(text: string): ReactNode[] {
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
