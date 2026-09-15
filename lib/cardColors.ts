// Roughly matches each card color's in-game theme; falls back to the
// default border/text color for anything unrecognized. Shared between
// components/CardDetail.tsx (a card's own stat block) and
// lib/simpleMarkdown.tsx (an inline tappable card-name mention), so both
// use the exact same color for a given card.
export const CARD_COLOR_ACCENT: Record<string, string> = {
  RED: "#c42a3a",
  BLUE: "#2aabb8",
  GREEN: "#5dbb8a",
  GOLD: "#f0c96a",
  PURPLE: "#a97fd4",
  SILVER: "#b8b8c0",
};
