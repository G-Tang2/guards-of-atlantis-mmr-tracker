"use client";

// Shared "here's exactly what this card says" rendering — originally
// lived only in app/chat/page.tsx, extracted so the match detail page's
// Draft Analysis (app/matches/[id]/page.tsx) can show the same on-demand
// popout for a card named in its own generated text, via the same tap-a-
// card-name interaction (see lib/simpleMarkdown.tsx's wrapCardMentions).
import { X } from "lucide-react";
import { CardReference } from "@/lib/heroCardContext";
import { HeroActionCard, hasCardArt } from "@/components/HeroActionCard";
import { renderSimpleMarkdown } from "@/lib/simpleMarkdown";

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
export function CardStatBlock({ reference }: { reference: CardReference }) {
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
  const showArt = hasCardArt(reference.heroId);

  if (showArt) {
    // The card art itself already shows the name/title, so the separate
    // text header (and the border framing it, sized for that text block)
    // would just be redundant chrome around the visual card.
    return (
      <div className="goa-card-ref goa-card-ref-borderless">
        {reference.colorMismatch && (
          <p className="goa-card-ref-warning">
            ⚠ You asked about a different color — this card is actually {color || "a different color"}.
          </p>
        )}
        <HeroActionCard heroId={reference.heroId} card={card} className="goa-card-ref-art" />
      </div>
    );
  }

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
        {secondaryMovement !== null && <span className="goa-card-ref-tag">Move {secondaryMovement}</span>}
        {secondaryDefense !== null && <span className="goa-card-ref-tag">Def {secondaryDefense}</span>}
        {item && <span className="goa-card-ref-tag">Item: {item}</span>}
      </div>
      {description && <div className="goa-card-ref-desc">{renderSimpleMarkdown(description)}</div>}
    </div>
  );
}

// On-demand popout for a card tapped inline in prose (where the block
// doesn't auto-show) — reuses CardStatBlock's exact rendering so a
// tapped card always looks identical to an auto-shown one.
export function CardDetailModal({
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
