"use client";

// Visual rendering of one Guards of Atlantis II hero action card, ported
// from Stats-of-Atlantis (see lib/cardPainter.ts's header comment) —
// draws the card's actual game-accurate layout (frame art, banners,
// stat icons) onto a <canvas>, rather than the plain text/tag summary
// CardStatBlock (app/chat/page.tsx) shows on its own.
//
// Currently only has background art for a subset of heroes (whatever's
// been copied into public/cards/<heroId>/ so far — see that folder). For
// any hero without art yet, this renders nothing (returns null) so a
// caller can fall back to CardStatBlock's text rendering instead of
// showing a broken/blank canvas.
import { useEffect, useRef, useState } from "react";
import { HERO_CARDS, HeroCard } from "@/lib/heroCards";
import { HEROES } from "@/lib/heroes";
import {
  Color,
  Item,
  Modifier,
  Type,
  ValueSign,
  getBackgroundSlug,
  loadCardBackground,
  preloadImages,
  updateCanvas,
} from "@/lib/cardPainter";

const CARD_WIDTH = 1192;
const CARD_HEIGHT = 1664;

function asString(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}
function asNumber(v: unknown): number | null {
  return typeof v === "number" ? v : null;
}
function asBoolean(v: unknown): boolean {
  return v === true;
}
function asVariant(v: unknown): { first?: number } | null {
  if (v && typeof v === "object" && "first" in v) {
    const first = (v as { first?: unknown }).first;
    return { first: typeof first === "number" ? first : undefined };
  }
  return null;
}

// Card levels are stored as numbers (1-4) but the source art/frame
// filenames use lowercase roman numerals — this mapping is the only
// place that needs to know that.
function levelToRoman(level: number | null): string {
  switch (level) {
    case 2: return "ii";
    case 3: return "iii";
    case 4: return "iv";
    default: return "i";
  }
}

export function hasCardArt(heroId: string): boolean {
  return KNOWN_HERO_ART.has(heroId);
}

// Every hero in the roster now has art under public/cards/<heroId>/ — see
// this file's header comment. Derived from lib/heroes.ts (the roster's
// own source of truth) rather than a second hardcoded list, so a newly
// added hero without art copied in yet fails loudly via a 404 in dev
// instead of silently drifting out of sync with two lists to maintain.
const KNOWN_HERO_ART = new Set<string>(HEROES.map((h) => h.id));

// Mirrors Stats-of-Atlantis's sortedExtras (src/lib/encyclopedia.ts) — a
// hero's "extra" cards (an alternate basic-action pair, e.g. Takahide's)
// each get their own background art file (Extra1.webp, Extra2.webp, ...)
// keyed by their position among that hero's own extra cards, sorted by
// variant.first (ties broken by original array order).
function getExtraSlotIndex(heroId: string, card: HeroCard): number | null {
  if (!asBoolean(card.extra)) return null;
  const heroCards = HERO_CARDS[heroId] ?? [];
  const extras = heroCards
    .filter((c) => asBoolean(c.extra))
    .sort((a, b) => (asVariant(a.variant)?.first ?? 0) - (asVariant(b.variant)?.first ?? 0));
  const index = extras.indexOf(card);
  return index >= 0 ? index : null;
}

export function HeroActionCard({ heroId, card, className }: { heroId: string; card: HeroCard; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [ready, setReady] = useState(false);

  const hasArt = hasCardArt(heroId);

  useEffect(() => {
    if (!hasArt) return;
    let cancelled = false;

    async function paint() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const context = canvas.getContext("2d");
      if (!context) return;

      const slug = getBackgroundSlug(
        {
          color: card.color,
          handicapped: asBoolean(card.handicapped),
          extra: asBoolean(card.extra),
          level: asNumber(card.level),
          variant: asVariant(card.variant),
        },
        getExtraSlotIndex(heroId, card),
      );

      const [background] = await Promise.all([
        loadCardBackground(heroId, slug),
        preloadImages(),
        document.fonts.load('66px "Modesto Poster"'),
        document.fonts.ready,
      ]);
      if (cancelled) return;

      updateCanvas(
        canvas,
        context,
        background,
        (asString(card.color) as Color) ?? Color.GOLD,
        asBoolean(card.handicapped),
        asBoolean(card.extra),
        asString(card.name) ?? "",
        asString(card.description) ?? "",
        levelToRoman(asNumber(card.level)),
        (asString(card.item) as Item) ?? Item.ATTACK,
        asNumber(card.initiative) ?? 0,
        (asString(card.primaryAction) as Type) ?? Type.ATTACK,
        asNumber(card.primaryValue) ?? 0,
        (asString(card.primaryValueSign) as ValueSign) ?? ValueSign.NONE,
        (asString(card.modifier) as Modifier) ?? Modifier.NONE,
        asNumber(card.modifierValue) ?? 0,
        (asString(card.modifierValueSign) as ValueSign) ?? ValueSign.NONE,
        asNumber(card.secondaryMovement) ?? 0,
        asNumber(card.secondaryDefense) ?? 0,
        asNumber(card.secondaryAttack),
      );
      setReady(true);
    }

    void paint();
    return () => {
      cancelled = true;
    };
    // card is a plain data object rebuilt on each parent render, so key
    // off its own identifying fields rather than the object reference to
    // avoid redrawing every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heroId, card.name, card.color, card.level, card.description]);

  if (!hasArt) return null;

  return (
    <canvas
      ref={canvasRef}
      width={CARD_WIDTH}
      height={CARD_HEIGHT}
      className={className}
      style={{ width: "100%", height: "auto", opacity: ready ? 1 : 0, transition: "opacity 0.15s" }}
    />
  );
}
