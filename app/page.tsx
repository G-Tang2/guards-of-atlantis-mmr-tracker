"use client";

import Image from "next/image";
import { useState } from "react";
import {
  Sparkles,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { UPDATES, UpdateEntry, UpdateDetailItem } from "@/lib/updates";

const PAGE_SIZE = 3;

// Groups consecutive items of the same kind together: plain text (no
// label, no dot point), bulleted list items (label only), and icon
// legend rows (label + icon) each render as their own block.
type DetailBlock =
  | { type: "text"; key: string; text: string }
  | { type: "list"; key: string; items: UpdateDetailItem[] }
  | { type: "icons"; key: string; items: UpdateDetailItem[] };

function classify(item: UpdateDetailItem): "text" | "list" | "icons" {
  if (item.icon) return "icons";
  if (item.label) return "list";
  return "text";
}

function groupDetailItems(items: UpdateDetailItem[]): DetailBlock[] {
  const blocks: DetailBlock[] = [];
  items.forEach((item, i) => {
    const kind = classify(item);
    if (kind === "text") {
      blocks.push({ type: "text", key: `text-${i}`, text: item.text });
      return;
    }
    const last = blocks[blocks.length - 1];
    if (last?.type === kind) {
      last.items.push(item);
    } else {
      blocks.push({ type: kind, key: `${kind}-${i}`, items: [item] });
    }
  });
  return blocks;
}

function UpdatePost({ update }: { update: UpdateEntry }) {
  return (
    <div className="goa-update-item">
      <div className="goa-update-date">{update.date}</div>
      <div className="goa-update-title">{update.title}</div>
      <p className="goa-update-desc">{update.summary}</p>
      {Array.isArray(update.details) ? (
        groupDetailItems(update.details).map((block) => {
          if (block.type === "text") {
            return (
              <p key={block.key} className="goa-update-details">
                {block.text}
              </p>
            );
          }
          if (block.type === "list") {
            return (
              <ul key={block.key} className="goa-update-details-list">
                {block.items.map((item) => (
                  <li key={item.label}>
                    <span className="goa-update-details-label">
                      {item.label}:
                    </span>{" "}
                    {item.text}
                  </li>
                ))}
              </ul>
            );
          }
          return (
            <div key={block.key} className="goa-update-icon-legend">
              {block.items.map((item) => {
                const Icon = item.icon!;
                return (
                  <div key={item.label} className="goa-update-icon-row">
                    <span className="goa-update-icon-badge">
                      <Icon size={13} />
                    </span>
                    <div>
                      <span className="goa-update-details-label">
                        {item.label}
                      </span>
                      <p className="goa-update-details">{item.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })
      ) : (
        <p className="goa-update-details">{update.details}</p>
      )}
    </div>
  );
}

export default function Home() {
  const [expanded, setExpanded] = useState(false);
  const [page, setPage] = useState(0);

  const pageCount = Math.max(1, Math.ceil(UPDATES.length / PAGE_SIZE));
  const visibleItems = expanded
    ? UPDATES.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)
    : UPDATES.slice(0, 1);

  const toggleExpanded = () => {
    setExpanded((v) => !v);
    setPage(0);
  };

  return (
    <main className="goa-root">
      {/* Hero */}
      <div className="goa-hero">
        <div className="goa-emblem">
          <Image
            src="/goa-logo.png"
            alt="logo"
            width={300}
            height={225}
            className="w-[300px] h-[225px]"
            priority
          />
        </div>
        <p className="goa-hero-sub">MMR Tracker</p>
      </div>

      {/* What's New */}
      <div className="goa-card">
        <div className="goa-card-head">
          <Sparkles size={14} />
          What&apos;s New
        </div>

        <div
          className={`goa-updates-scroll ${expanded ? "expanded" : ""}`}
        >
          {visibleItems.map((update) => (
            <UpdatePost key={update.title} update={update} />
          ))}
        </div>

        {expanded && pageCount > 1 && (
          <div className="goa-update-pagination">
            <button
              className="goa-update-page-btn"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              aria-label="Previous page"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="goa-update-page-label">
              Page {page + 1} of {pageCount}
            </span>
            <button
              className="goa-update-page-btn"
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              disabled={page === pageCount - 1}
              aria-label="Next page"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}

        {UPDATES.length > 1 && (
          <button className="goa-update-toggle" onClick={toggleExpanded}>
            {expanded ? "Show Less" : `Show ${UPDATES.length - 1} More`}
            <ChevronDown
              size={14}
              className={expanded ? "rotate-180" : ""}
            />
          </button>
        )}
      </div>
    </main>
  );
}
