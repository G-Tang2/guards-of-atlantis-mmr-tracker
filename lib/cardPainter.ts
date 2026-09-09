// Ported from Stats-of-Atlantis (github.com/G-Tang2/Stats-of-Atlantis,
// src/card_painter.ts + src/states.ts) — that project renders these same
// Guards of Atlantis II action cards onto a <canvas> via plain Canvas2D
// draw calls, so the drawing logic itself needed no real changes to move
// here. What did change:
//   - Image loading: the source used Vite's `import.meta.glob` to bundle
//     every PNG/WEBP at build time; here they're plain static files under
//     public/cards/, loaded by URL like any other Next.js public asset.
//   - The background-image cache is keyed by `${heroId}:${slug}` instead
//     of bare `slug` — the source only ever showed one hero at a time, so
//     every hero's "Gold" card shared one cache slot; this app can show
//     several heroes' cards on screen at once (e.g. a hero compendium
//     grid), so slots need to stay hero-scoped to avoid one hero's Gold
//     card silently overwriting another's in the cache.
// Card data (HeroCard in lib/heroCards.ts) already matches the field
// names/values this expects (color/primaryAction/item/etc as the same
// upper-case string literals) since both projects trace back to the same
// card database export — see lib/heroCards.ts's own header comment.

export enum Color {
  GOLD = "GOLD",
  SILVER = "SILVER",
  RED = "RED",
  BLUE = "BLUE",
  GREEN = "GREEN",
  PURPLE = "PURPLE",
}

export enum Type {
  SKILL = "SKILL",
  ATTACK = "ATTACK",
  MOVEMENT = "MOVEMENT",
  DEFENSE = "DEFENSE",
  DEFENSE_SKILL = "DEFENSE_SKILL",
}

export enum ValueSign {
  NONE = "NONE",
  PLUS = "PLUS",
  MINUS = "MINUS",
  EXCLAMATION = "EXCLAMATION",
}

export enum Modifier {
  NONE = "NONE",
  RANGE = "RANGE",
  AREA = "AREA",
}

export enum Item {
  ATTACK = "ATTACK",
  DEFENSE = "DEFENSE",
  INITIATIVE = "INITIATIVE",
  RANGE = "RANGE",
  AREA = "AREA",
  MOVEMENT = "MOVEMENT",
}

export enum Stat {
  ATTACK = "ATTACK",
  DEFENSE = "DEFENSE",
  INITIATIVE = "INITIATIVE",
  MOVEMENT = "MOVEMENT",
}

// Only consulted when showNumbers is false (the "symbol" display mode
// that shows </> arrows instead of a stat's literal modified value) —
// ported verbatim for parity even though every current caller in this
// app passes showNumbers: true.
const cardStats = new Map<Color, Map<Stat, Map<string, number[]>>>([
  [Color.RED, new Map<Stat, Map<string, number[]>>([
    [Stat.MOVEMENT, new Map<string, number[]>([
      ["i", [3, 4, 4, 4, 5, 5, 5, 5]],
      ["ii", [3, 4, 4, 4, 5, 5, 5, 5]],
      ["iii", [3, 4, 4, 4, 5, 5, 5, 5]],
    ])],
    [Stat.INITIATIVE, new Map<string, number[]>([
      ["i", [7, 7, 7, 8, 8, 8, 9, 9]],
      ["ii", [7, 7, 8, 8, 9, 9, 9, 9]],
      ["iii", [8, 8, 8, 9, 9, 9, 10, 10]],
    ])],
    [Stat.ATTACK, new Map<string, number[]>([
      ["i", [4, 4, 5, 5, 5, 6, 6, 6]],
      ["ii", [4, 5, 5, 5, 6, 6, 6, 7]],
      ["iii", [5, 5, 6, 6, 6, 7, 7, 7]],
    ])],
    [Stat.DEFENSE, new Map<string, number[]>([
      ["i", [5, 5, 6, 6, 6, 7, 7, 7]],
      ["ii", [5, 6, 6, 6, 7, 7, 7, 8]],
      ["iii", [6, 6, 7, 7, 7, 8, 8, 8]],
    ])],
  ])],
  [Color.GOLD, new Map<Stat, Map<string, number[]>>([
    [Stat.MOVEMENT, new Map<string, number[]>([["i", [1, 1, 1, 1, 1, 1, 2, 2]]])],
    [Stat.INITIATIVE, new Map<string, number[]>([["i", [11, 11, 11, 11, 12, 12, 12, 13]]])],
    [Stat.ATTACK, new Map<string, number[]>([["i", [1, 2, 2, 3, 3, 3, 4, 4]]])],
    [Stat.DEFENSE, new Map<string, number[]>([["i", [1, 1, 2, 2, 2, 2, 3, 3]]])],
  ])],
  [Color.SILVER, new Map<Stat, Map<string, number[]>>([
    [Stat.DEFENSE, new Map<string, number[]>([["i", [1, 2, 2, 2, 3, 3, 3, 4]]])],
  ])],
  [Color.BLUE, new Map<Stat, Map<string, number[]>>([
    [Stat.MOVEMENT, new Map<string, number[]>([
      ["i", [2, 2, 3, 3, 3, 3, 3, 3]],
      ["ii", [2, 2, 3, 3, 3, 3, 3, 3]],
      ["iii", [2, 2, 3, 3, 3, 3, 3, 3]],
    ])],
    [Stat.INITIATIVE, new Map<string, number[]>([
      ["i", [8, 9, 9, 9, 9, 10, 10, 10]],
      ["ii", [9, 9, 10, 10, 10, 10, 10, 11]],
      ["iii", [9, 10, 10, 10, 10, 11, 11, 11]],
    ])],
    [Stat.DEFENSE, new Map<string, number[]>([
      ["i", [4, 4, 4, 5, 5, 5, 6, 6]],
      ["ii", [4, 5, 5, 5, 6, 6, 6, 7]],
      ["iii", [5, 5, 5, 6, 6, 6, 7, 7]],
    ])],
  ])],
  [Color.GREEN, new Map<Stat, Map<string, number[]>>([
    [Stat.MOVEMENT, new Map<string, number[]>([
      ["i", [2, 2, 2, 2, 2, 2, 2, 3]],
      ["ii", [2, 2, 2, 2, 2, 2, 2, 3]],
      ["iii", [2, 2, 2, 2, 2, 2, 2, 3]],
    ])],
    [Stat.INITIATIVE, new Map<string, number[]>([
      ["i", [6, 5, 5, 4, 4, 3, 3, 2]],
      ["ii", [5, 5, 4, 4, 3, 3, 2, 2]],
      ["iii", [5, 4, 4, 3, 3, 2, 2, 1]],
    ])],
    [Stat.DEFENSE, new Map<string, number[]>([
      ["i", [1, 2, 2, 3, 3, 3, 3, 4]],
      ["ii", [2, 2, 3, 3, 3, 4, 4, 4]],
      ["iii", [2, 3, 3, 4, 4, 4, 4, 5]],
    ])],
  ])],
]);

const defaultEmoji = [
  "area_blue", "area_gold", "area_green", "area_purple", "area_red", "area_silver",
  "attack_blue", "attack_gold", "attack_green", "attack_red", "attack_silver",
  "defense_blue", "defense_gold", "defense_green", "defense_red", "defense_silver",
  "defense_skill_blue", "defense_skill_gold", "defense_skill_green", "defense_skill_red", "defense_skill_silver",
  "initiative", "life_counters", "marker_bounty", "marker_poison",
  "movement_blue", "movement_gold", "movement_green", "movement_red", "movement_silver",
  "range_blue", "range_gold", "range_green", "range_purple", "range_red", "range_silver",
  "rune_bird", "rune_bird_marker", "rune_axe", "rune_axe_marker", "rune_anvil", "rune_anvil_marker",
  "rune_horn", "rune_horn_marker",
  "skill_blue", "skill_gold", "skill_green", "skill_red", "skill_silver",
  "tiebreaker_blue", "tiebreaker_orange",
  "token_barrier", "token_blast", "token_dud", "token_glitch", "token_grenade", "token_ice",
  "token_illusion", "token_magma", "token_rock", "token_smoke_bomb", "token_totem", "token_tree", "token_zombie",
];

// Shared frame/icon PNGs under public/cards/_shared/ — every hero's cards
// draw from this same set, so it's loaded once regardless of which/how
// many heroes are shown.
const imageNames = [
  "area_blue", "area_gold", "area_green", "area_purple", "area_red", "area_silver",
  "attack", "attack_blue", "attack_gold", "attack_green", "attack_red", "attack_silver",
  "banner_blue_bottom", "banner_blue_top", "banner_gold_bottom", "banner_gold_top",
  "banner_green_bottom", "banner_green_top", "banner_red_bottom", "banner_red_top",
  "banner_silver_bottom", "banner_silver_top", "bottom_long", "bottom_short",
  "colorblind_blue", "colorblind_gold", "colorblind_green", "colorblind_purple", "colorblind_red", "colorblind_silver",
  "defense", "defense_blue", "defense_gold", "defense_green", "defense_red", "defense_silver",
  "defense_skill_blue", "defense_skill_gold", "defense_skill_green", "defense_skill_red", "defense_skill_silver",
  "frame_blue_bottom", "frame_blue_middle", "frame_blue_middle_cut", "frame_blue_top",
  "frame_empty_bottom",
  "frame_gold_bottom", "frame_gold_middle", "frame_gold_top",
  "frame_green_bottom", "frame_green_middle", "frame_green_middle_cut", "frame_green_top",
  "frame_purple_bottom", "frame_purple_middle", "frame_purple_top",
  "frame_red_bottom", "frame_red_middle", "frame_red_middle_cut", "frame_red_top",
  "frame_silver_bottom", "frame_silver_middle", "frame_silver_top",
  "initiative",
  "item_area", "item_attack", "item_defense", "item_initiative", "item_movement", "item_range",
  "level_i", "level_ii", "level_iii", "level_iv", "level_h",
  "life_counters", "marker_bounty", "marker_poison",
  "movement", "movement_blue", "movement_gold", "movement_green", "movement_red", "movement_silver",
  "range_blue", "range_gold", "range_green", "range_purple", "range_red", "range_silver",
  "rune_bird", "rune_bird_marker", "rune_axe", "rune_axe_marker", "rune_anvil", "rune_anvil_marker",
  "rune_horn", "rune_horn_marker",
  "skill_blue", "skill_gold", "skill_green", "skill_red", "skill_silver",
  "tiebreaker_blue", "tiebreaker_orange",
  "title", "title_ultimate",
  "token_barrier", "token_blast", "token_dud", "token_glitch", "token_grenade", "token_ice",
  "token_illusion", "token_magma", "token_rock", "token_smoke_bomb", "token_totem", "token_tree", "token_zombie",
];

const SHARED_IMAGE_BASE = "/cards/_shared";

const images: Map<string, HTMLImageElement> = new Map();
let sharedImagesPromise: Promise<void> | null = null;

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

// Idempotent/shared across every card on the page — calling this from
// several mounted cards at once still only fetches each shared PNG once.
export function preloadImages(): Promise<void> {
  if (!sharedImagesPromise) {
    sharedImagesPromise = Promise.all(
      imageNames.map(async (name) => {
        const image = await loadImage(`${SHARED_IMAGE_BASE}/${name}.png`);
        if (image) images.set(name, image);
      }),
    ).then(() => undefined);
  }
  return sharedImagesPromise;
}

// Loads (and caches) one hero's card-slot background art, e.g.
// heroId="arien", slug="BlueIIB" -> /cards/arien/BlueIIB.webp — see
// getBackgroundSlug below for how a card maps to its slug. Returns null
// (rather than throwing) when the asset doesn't exist yet, so a hero
// whose art hasn't been copied into public/cards/<heroId>/ yet just
// fails to render instead of breaking the page.
export async function loadCardBackground(heroId: string, slug: string): Promise<HTMLImageElement | null> {
  const cacheKey = `${heroId}:${slug}`;
  const cached = images.get(cacheKey);
  if (cached) return cached;
  const image = await loadImage(`/cards/${heroId}/${slug}.webp`);
  if (image) images.set(cacheKey, image);
  return image;
}

// Mirrors Stats-of-Atlantis's getBackgroundSlug (src/lib/encyclopedia.ts)
// — maps a card's data onto the filename (minus extension) of its
// background art within a hero's public/cards/<heroId>/ folder.
export function getBackgroundSlug(
  card: {
    color?: unknown;
    handicapped?: boolean;
    extra?: boolean;
    level?: unknown;
    variant?: { first?: number } | null;
  },
  extraSlotIndex: number | null = null,
): string {
  if (card.extra && extraSlotIndex != null) return `Extra${extraSlotIndex + 1}`;

  const color = typeof card.color === "string" ? card.color : "";
  if (color === "GOLD") return card.handicapped ? "Handicap" : "Gold";
  if (color === "SILVER") return card.handicapped ? "Handicap" : "Silver";
  if (color === "PURPLE") return "Ultimate";

  const prefix = color === "BLUE" ? "Blue" : color === "RED" ? "Red" : "Green";
  const level = typeof card.level === "number" ? card.level : 1;
  if (level === 2) return card.variant?.first === 2 ? `${prefix}IIB` : `${prefix}IIA`;
  if (level === 3) return card.variant?.first === 2 ? `${prefix}IIIB` : `${prefix}IIIA`;
  return `${prefix}IA`;
}

function clear(canvas: HTMLCanvasElement, context: CanvasRenderingContext2D): void {
  context.clearRect(0, 0, canvas.width, canvas.height);
}

function addImage(context: CanvasRenderingContext2D, name: string, x: number, y: number): void {
  const image = images.get(name);
  if (image) context.drawImage(image, x, y);
}

function addEmoji(context: CanvasRenderingContext2D, name: string, x: number, y: number): void {
  const image = images.get(name);
  if (!image) return;
  context.drawImage(image, x, y, (64 * image.width) / image.height, 64);
}

function addCardDescription(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
): void {
  if (text === "---") {
    context.beginPath();
    context.moveTo(x - 381, y - 11);
    context.lineTo(x + 381, y - 11);
    context.lineWidth = 2;
    context.stroke();
  } else if (text.startsWith(">>")) {
    addTextWithBold(context, "•  " + text.substring(2), x - cardDescriptionIndent, y, true);
  } else if (text.startsWith(">")) {
    addTextWithBold(context, text.substring(1), x - (cardDescriptionIndent - 45), y, true);
  } else {
    addTextWithBold(context, text, x, y);
  }
}

type RichTextSegment =
  | { type: "text"; value: string; bold: boolean; italic: boolean }
  | { type: "emoji"; value: string };

function getDescriptionMaxLineWidth(
  context: CanvasRenderingContext2D,
  descriptionLines: string[],
  fontSizeAdjustment: number,
): number {
  let longestLineWidth = 0;
  descriptionLines.forEach((line) => {
    if (line.startsWith(">>")) {
      longestLineWidth = Math.max(
        longestLineWidth,
        getRichTextWidth(context, "•  " + line.substring(2), fontSizeAdjustment),
      );
    } else if (line.startsWith(">")) {
      longestLineWidth = Math.max(
        longestLineWidth,
        getRichTextWidth(context, line.substring(1), fontSizeAdjustment) + 45,
      );
    }
  });
  return longestLineWidth;
}

function getCardDescriptionLayout(
  context: CanvasRenderingContext2D,
  descriptionLines: string[],
): { indent: number; longestLineWidth: number } {
  const longestLineWidth = getDescriptionMaxLineWidth(context, descriptionLines, 0);
  const usesSmallDescriptionFont = longestLineWidth >= 1000;
  const indentationWidth = usesSmallDescriptionFont
    ? getDescriptionMaxLineWidth(context, descriptionLines, -2)
    : longestLineWidth;

  return {
    indent: indentationWidth > 980 ? indentationWidth / 2 : 490,
    longestLineWidth,
  };
}

function parseRichTextSegments(text: string): RichTextSegment[] {
  const segments: RichTextSegment[] = [];
  let isBold = false;
  let isItalic = false;
  let index = 0;
  let buffer = "";

  const flushBuffer = () => {
    if (buffer.length > 0) {
      segments.push({ type: "text", value: buffer, bold: isBold, italic: isItalic });
      buffer = "";
    }
  };

  while (index < text.length) {
    if (text.startsWith("**", index)) {
      flushBuffer();
      isBold = !isBold;
      index += 2;
      continue;
    }
    if (text[index] === "~") {
      flushBuffer();
      isItalic = !isItalic;
      index += 1;
      continue;
    }
    if (text.startsWith("::", index)) {
      const closingIndex = text.indexOf("::", index + 2);
      if (closingIndex !== -1) {
        flushBuffer();
        segments.push({ type: "emoji", value: text.slice(index + 2, closingIndex) });
        index = closingIndex + 2;
        continue;
      }
    }
    buffer += text[index];
    index += 1;
  }
  flushBuffer();

  return segments;
}

let cardDescriptionIndent = 490;
let descriptionFontSizeAdjustment = 0;

function getRichTextSegmentFont(
  bold: boolean,
  italic: boolean,
  fontSizeAdjustment: number = descriptionFontSizeAdjustment,
): string {
  const baseSize = Math.max(1, 49 + fontSizeAdjustment);
  const italicSize = Math.max(1, 36 + fontSizeAdjustment);
  if (bold && italic) return `italic bold ${italicSize}px Arial`;
  if (bold) return `bold ${baseSize}px Arial`;
  if (italic) return `italic ${italicSize}px Arial`;
  return `${baseSize}px Arial`;
}

function getRichTextWidth(
  context: CanvasRenderingContext2D,
  text: string,
  fontSizeAdjustment: number = descriptionFontSizeAdjustment,
): number {
  const segments = parseRichTextSegments(text);
  return segments.reduce((sum, segment) => {
    if (segment.type === "emoji") return sum + 64;
    context.font = getRichTextSegmentFont(segment.bold, segment.italic, fontSizeAdjustment);
    return sum + context.measureText(segment.value).width;
  }, 0);
}

function addTextWithBold(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  left: boolean = false,
): void {
  context.textAlign = "left";
  const segments = parseRichTextSegments(text);

  const fullTextWidth = segments.reduce((sum, segment) => {
    if (segment.type === "emoji") return sum + 64;
    context.font = getRichTextSegmentFont(segment.bold, segment.italic);
    return sum + context.measureText(segment.value).width;
  }, 0);

  let indent = 0;
  segments.forEach((segment) => {
    if (segment.type === "emoji") {
      if (defaultEmoji.includes(segment.value)) {
        addEmoji(context, segment.value, x - (left ? 0 : fullTextWidth / 2) + indent, y - 50);
      }
      indent += 64;
    } else {
      context.font = getRichTextSegmentFont(segment.bold, segment.italic);
      const partWidth = context.measureText(segment.value).width;
      context.fillText(segment.value, x - (left ? 0 : fullTextWidth / 2) + indent, y);
      indent += partWidth;
    }
  });
  context.textAlign = "center";
}

function addCardType(context: CanvasRenderingContext2D, text: string, x: number, y: number): void {
  addOutlinedText(context, text, x, y, 54, 6, 604);
}

function addOutlinedText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  fontSize: number,
  outlineSize: number,
  widthLimit?: number,
) {
  context.font = `${fontSize}px "Modesto Poster"`;
  context.lineWidth = outlineSize;
  context.strokeText(text, x, y, widthLimit);
  context.fillStyle = "white";
  context.fillText(text, x, y, widthLimit);
  context.fillStyle = "black";
}

function addExtraMarker(context: CanvasRenderingContext2D) {
  const previousAlign = context.textAlign;
  context.textAlign = "center";
  addOutlinedText(context, ">", 1060, 150, 90, 8);
  context.textAlign = previousAlign;
}

function addTitle(context: CanvasRenderingContext2D, text: string, x: number, y: number, widthLimit?: number) {
  context.textAlign = "center";
  context.font = '66px "Modesto Poster"';
  context.fillText(text, x, y, widthLimit);
}

function addInitiative(
  context: CanvasRenderingContext2D,
  value: number,
  x: number,
  y: number,
  bonus: number,
  showNumbers: boolean,
  color: Color,
  level: string,
  initiativeStat: number,
) {
  if (showNumbers || color === Color.SILVER) {
    addSquishedOutlinedText(context, value.toString(), x, y, 197, 14, 0.92, false, bonus);
  } else {
    const supposedValue = cardStats.get(color)?.get(Stat.INITIATIVE)?.get(level)?.[initiativeStat - 1] ?? value;
    const difference = value - supposedValue;
    let symbol = "";
    if (difference === 1) symbol = "›";
    if (difference > 1) symbol = "»";
    if (difference === -1) symbol = "‹";
    if (difference < -1) symbol = "«";
    addSquishedOutlinedText(context, symbol, x, y + 25, 296, 14, 0.92, false, bonus, false);
  }
}

function addModifierValue(context: CanvasRenderingContext2D, value: number, x: number, y: number, bonus = 0): number {
  return addSquishedOutlinedText(context, value.toString(), x, y, 156, 14, 0.875, false, bonus);
}

function addBlockValue(context: CanvasRenderingContext2D, value: string, x: number, y: number): number {
  return addSquishedOutlinedText(context, value, x, y, 156, 14, 0.875, false, 0);
}

function addPrimaryValue(
  context: CanvasRenderingContext2D,
  value: number,
  x: number,
  y: number,
  bonus: number,
  showNumbers: boolean,
  color: Color,
  level: string,
  stat: Stat,
  statNumber: number,
): number {
  if (showNumbers) {
    return addSquishedOutlinedText(context, value.toString(), x, y, 156, 14, 0.875, false, bonus);
  }
  const supposedValue = cardStats.get(color)?.get(stat)?.get(level)?.[statNumber - 1] ?? value;
  const difference = value - supposedValue;
  let symbol = "";
  if (difference === 1) symbol = "›";
  if (difference > 1) symbol = "»";
  if (difference === -1) symbol = "‹";
  if (difference < -1) symbol = "«";
  return addSquishedOutlinedText(context, symbol, x, y + 18, 244, 14, 0.875, false, bonus, false);
}

function addSign(context: CanvasRenderingContext2D, text: string, x: number, y: number) {
  addSquishedOutlinedText(context, text, x, y, 156, 14, 0.875, true);
}

function addSecondaryValue(
  context: CanvasRenderingContext2D,
  value: number,
  x: number,
  y: number,
  bonus: number,
  showNumbers: boolean,
  color: Color,
  level: string,
  stat: Stat,
  statNumber: number,
) {
  if (showNumbers) {
    addSquishedOutlinedText(context, value.toString(), x, y, 136, 14, 0.875, false, bonus);
    return;
  }
  const supposedValue = cardStats.get(color)?.get(stat)?.get(level)?.[statNumber - 1] ?? value;
  const difference = value - supposedValue;
  let symbol = "";
  if (difference === 1) symbol = "›";
  if (difference > 1) symbol = "»";
  if (difference === -1) symbol = "‹";
  if (difference < -1) symbol = "«";
  addSquishedOutlinedText(context, symbol, x, y + 10, 204, 14, 0.875, false, bonus, false);
}

function addSquishedOutlinedText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  fontSize: number,
  outlineSize: number,
  squishness: number,
  left: boolean = false,
  bonus: number = 0,
  showNumbers: boolean = true,
): number {
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = 400;
  tempCanvas.height = 400;
  const tempContext = tempCanvas.getContext("2d")!;
  tempContext.textAlign = left ? "left" : "center";
  tempContext.font = `${fontSize}px "Modesto Poster"`;
  tempContext.lineWidth = outlineSize;
  tempContext.strokeText(text, 200, 200);
  switch (bonus) {
    case 1:
      tempContext.fillStyle = "palegreen";
      break;
    case 2:
      tempContext.fillStyle = "powderblue";
      break;
    case 3:
      tempContext.fillStyle = "plum";
      break;
    default:
      tempContext.fillStyle = "white";
  }
  tempContext.fillText(text, 200, 200);
  tempContext.fillStyle = "black";

  if (!showNumbers) {
    const tempCanvas2 = document.createElement("canvas");
    tempCanvas2.width = 400;
    tempCanvas2.height = 400;
    const tempContext2 = tempCanvas2.getContext("2d")!;
    tempContext2.rotate(-Math.PI / 2);
    tempContext2.drawImage(tempCanvas, -400, 0);

    context.drawImage(tempCanvas2, 0, 0, 400, 400, x - 200 + 0.3 * fontSize, y - 200 - 0.3 * fontSize, 400, 400);
    return fontSize * 0.4;
  }
  context.drawImage(tempCanvas, 0, 0, 400, 400, x - 200 * squishness, y - 200, 400 * squishness, 400);
  return tempContext.measureText(text).width * squishness;
}

// Draws one hero action card onto `canvas`/`context` (expected to be
// 1192x1664 — the source game's card art aspect ratio). `background` is
// this card's slot art (see loadCardBackground/getBackgroundSlug above);
// everything else mirrors the card's own data fields.
export function updateCanvas(
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  background: HTMLImageElement | null,
  color: Color,
  handicap: boolean,
  extra: boolean,
  name: string,
  description: string,
  level: string,
  item: Item,
  initiative: number,
  primaryActionType: Type,
  primaryActionValue: number,
  primaryActionValueSign: ValueSign,
  modifier: Modifier,
  modifierValue: number,
  modifierValueSign: ValueSign,
  secondaryMovementValue: number,
  secondaryDefenseValue: number,
  secondaryAttackValue: number | null,
  showNumbers: boolean = true,
): void {
  clear(canvas, context);

  if (background) {
    context.drawImage(background, 0, 0, 1192, 1664);
  }

  if (color === Color.PURPLE) {
    addImage(context, "title_ultimate", 0, 0);
    addTitle(context, name, 594, 140, 760);
  } else {
    addImage(context, "title", 0, 0);
    addTitle(context, name, 632, 140, 710);
  }

  const descriptionLines = description.split(/\r\n|\r|\n/);
  const descriptionHeight = descriptionLines.length;
  const descriptionLayout = getCardDescriptionLayout(context, descriptionLines);
  cardDescriptionIndent = descriptionLayout.indent;
  descriptionFontSizeAdjustment = descriptionLayout.longestLineWidth >= 1000 ? -2 : 0;
  const hasSecondaryAttack = secondaryAttackValue !== null;
  const hasSecondaryMovement = color !== Color.SILVER && secondaryMovementValue !== 0;
  const hasSecondaryDefense = primaryActionType !== Type.DEFENSE && primaryActionType !== Type.DEFENSE_SKILL;
  const secondaryBannerOffset =
    hasSecondaryAttack && hasSecondaryMovement && hasSecondaryDefense && primaryActionType !== Type.MOVEMENT
      ? 50
      : 0;
  context.font = "49px Arial";

  function placeSecondary(inset: number) {
    const adjustedInset = hasSecondaryAttack ? inset - 209 + 20 : inset;
    const attackInset = inset + 20;

    function addSecondaryAttack(atInset: number) {
      addImage(context, "attack", 35, atInset - 25);
      addSecondaryValue(context, secondaryAttackValue! + 0, 143, atInset + 121, 0, showNumbers, color, level, Stat.ATTACK, 0);
    }

    if (!hasSecondaryMovement) {
      if (primaryActionType !== Type.DEFENSE && primaryActionType !== Type.DEFENSE_SKILL) {
        addImage(context, "defense", 70, adjustedInset);
        addSecondaryValue(context, secondaryDefenseValue, 143, adjustedInset + 131, 0, showNumbers, color, level, Stat.DEFENSE, 0);
      }
      if (hasSecondaryAttack) addSecondaryAttack(attackInset);
      return;
    }

    if (primaryActionType === Type.DEFENSE || primaryActionType === Type.DEFENSE_SKILL) {
      addImage(context, "movement", 64, adjustedInset);
      addSecondaryValue(context, secondaryMovementValue, 143, adjustedInset + 121, 0, showNumbers, color, level, Stat.MOVEMENT, 0);
      if (hasSecondaryAttack) addSecondaryAttack(attackInset);
    } else if (primaryActionType === Type.MOVEMENT) {
      addImage(context, "defense", 70, adjustedInset);
      addSecondaryValue(context, secondaryDefenseValue, 143, adjustedInset + 131, 0, showNumbers, color, level, Stat.DEFENSE, 0);
      if (hasSecondaryAttack) addSecondaryAttack(attackInset);
    } else {
      addImage(context, "movement", 64, adjustedInset);
      addImage(context, "defense", 70, adjustedInset - 209);
      addSecondaryValue(context, secondaryMovementValue, 143, adjustedInset + 121, 0, showNumbers, color, level, Stat.MOVEMENT, 0);
      addSecondaryValue(context, secondaryDefenseValue, 143, adjustedInset - 79, 0, showNumbers, color, level, Stat.DEFENSE, 0);
      if (hasSecondaryAttack) addSecondaryAttack(attackInset);
    }
  }

  function placeSecondaryOnSilver(inset: number) {
    const adjustedInset = hasSecondaryAttack ? inset - 209 + 20 : inset;
    const attackInset = inset + 20;

    if (primaryActionType !== Type.DEFENSE && primaryActionType !== Type.DEFENSE_SKILL) {
      addImage(context, "defense", 70, adjustedInset);
      addSecondaryValue(context, secondaryDefenseValue, 143, adjustedInset + 131, 0, showNumbers, color, level, Stat.DEFENSE, 0);
    }
    if (hasSecondaryAttack) {
      addImage(context, "attack", 35, attackInset - 25);
      addSecondaryValue(context, secondaryAttackValue! + 0, 143, attackInset + 121, 0, showNumbers, color, level, Stat.ATTACK, 0);
    }
  }

  switch (color) {
    case Color.GOLD:
      switch (descriptionHeight) {
        case 1: case 2: case 3: case 4: case 5: case 6:
          if (secondaryBannerOffset > 0) addImage(context, "banner_gold_bottom", 50, 278);
          addImage(context, "banner_gold_bottom", 50, 278 + secondaryBannerOffset);
          addImage(context, "banner_gold_top", 50, 0);
          placeSecondary(645 + secondaryBannerOffset);
          break;
        case 7:
          if (secondaryBannerOffset > 0) addImage(context, "banner_gold_bottom", 50, 219);
          addImage(context, "banner_gold_bottom", 50, 219 + secondaryBannerOffset);
          addImage(context, "banner_gold_top", 50, 0);
          placeSecondary(586 + secondaryBannerOffset);
          break;
        default:
          if (secondaryBannerOffset > 0) addImage(context, "banner_gold_bottom", 50, 158);
          addImage(context, "banner_gold_bottom", 50, 158 + secondaryBannerOffset);
          addImage(context, "banner_gold_top", 50, 0);
          placeSecondary(525 + secondaryBannerOffset);
          break;
      }
      break;
    case Color.SILVER:
      switch (descriptionHeight) {
        case 1: case 2: case 3: case 4: case 5: case 6:
          if (secondaryBannerOffset > 0) addImage(context, "banner_silver_bottom", 50, 318);
          addImage(context, "banner_silver_bottom", 50, 318 + secondaryBannerOffset);
          addImage(context, "banner_silver_top", 50, 0);
          placeSecondaryOnSilver(637 + secondaryBannerOffset);
          break;
        case 7:
          if (secondaryBannerOffset > 0) addImage(context, "banner_silver_bottom", 50, 259);
          addImage(context, "banner_silver_bottom", 50, 259 + secondaryBannerOffset);
          addImage(context, "banner_silver_top", 50, 0);
          placeSecondaryOnSilver(578 + secondaryBannerOffset);
          break;
        default:
          if (secondaryBannerOffset > 0) addImage(context, "banner_silver_bottom", 50, 198);
          addImage(context, "banner_silver_bottom", 50, 198 + secondaryBannerOffset);
          addImage(context, "banner_silver_top", 50, 0);
          placeSecondaryOnSilver(517 + secondaryBannerOffset);
          break;
      }
      break;
    case Color.RED:
      if (level === "ii" || level === "iii") {
        switch (descriptionHeight) {
          case 1: case 2: case 3: case 4:
            if (secondaryBannerOffset > 0) addImage(context, "banner_red_bottom", 50, 330);
            addImage(context, "banner_red_bottom", 50, 330 + secondaryBannerOffset);
            addImage(context, "banner_red_top", 50, 0);
            placeSecondary(645 + secondaryBannerOffset);
            break;
          case 5:
            if (secondaryBannerOffset > 0) addImage(context, "banner_red_bottom", 50, 271);
            addImage(context, "banner_red_bottom", 50, 271 + secondaryBannerOffset);
            addImage(context, "banner_red_top", 50, 0);
            placeSecondary(586 + secondaryBannerOffset);
            break;
          case 6:
            if (secondaryBannerOffset > 0) addImage(context, "banner_red_bottom", 50, 210);
            addImage(context, "banner_red_bottom", 50, 210 + secondaryBannerOffset);
            addImage(context, "banner_red_top", 50, 0);
            placeSecondary(525 + secondaryBannerOffset);
            break;
          default:
            if (secondaryBannerOffset > 0) addImage(context, "banner_red_bottom", 50, 150);
            addImage(context, "banner_red_bottom", 50, 150 + secondaryBannerOffset);
            addImage(context, "banner_red_top", 50, 0);
            placeSecondary(465 + secondaryBannerOffset);
            break;
        }
      } else {
        switch (descriptionHeight) {
          case 1: case 2: case 3: case 4: case 5: case 6:
            if (secondaryBannerOffset > 0) addImage(context, "banner_red_bottom", 50, 330);
            addImage(context, "banner_red_bottom", 50, 330 + secondaryBannerOffset);
            addImage(context, "banner_red_top", 50, 0);
            placeSecondary(645 + secondaryBannerOffset);
            break;
          case 7:
            if (secondaryBannerOffset > 0) addImage(context, "banner_red_bottom", 50, 271);
            addImage(context, "banner_red_bottom", 50, 271 + secondaryBannerOffset);
            addImage(context, "banner_red_top", 50, 0);
            placeSecondary(586 + secondaryBannerOffset);
            break;
          default:
            if (secondaryBannerOffset > 0) addImage(context, "banner_red_bottom", 50, 210);
            addImage(context, "banner_red_bottom", 50, 210 + secondaryBannerOffset);
            addImage(context, "banner_red_top", 50, 0);
            placeSecondary(525 + secondaryBannerOffset);
            break;
        }
      }
      break;
    case Color.BLUE:
      if (level === "ii" || level === "iii") {
        switch (descriptionHeight) {
          case 1: case 2: case 3: case 4:
            if (secondaryBannerOffset > 0) addImage(context, "banner_blue_bottom", 50, 318);
            addImage(context, "banner_blue_bottom", 50, 318 + secondaryBannerOffset);
            addImage(context, "banner_blue_top", 50, 0);
            placeSecondary(645 + secondaryBannerOffset);
            break;
          case 5:
            if (secondaryBannerOffset > 0) addImage(context, "banner_blue_bottom", 50, 259);
            addImage(context, "banner_blue_bottom", 50, 259 + secondaryBannerOffset);
            addImage(context, "banner_blue_top", 50, 0);
            placeSecondary(586 + secondaryBannerOffset);
            break;
          case 6:
            if (secondaryBannerOffset > 0) addImage(context, "banner_blue_bottom", 50, 198);
            addImage(context, "banner_blue_bottom", 50, 198 + secondaryBannerOffset);
            addImage(context, "banner_blue_top", 50, 0);
            placeSecondary(525 + secondaryBannerOffset);
            break;
          default:
            if (secondaryBannerOffset > 0) addImage(context, "banner_blue_bottom", 50, 138);
            addImage(context, "banner_blue_bottom", 50, 138 + secondaryBannerOffset);
            addImage(context, "banner_blue_top", 50, 0);
            placeSecondary(465 + secondaryBannerOffset);
            break;
        }
      } else {
        switch (descriptionHeight) {
          case 1: case 2: case 3: case 4: case 5: case 6:
            if (secondaryBannerOffset > 0) addImage(context, "banner_blue_bottom", 50, 318);
            addImage(context, "banner_blue_bottom", 50, 318 + secondaryBannerOffset);
            addImage(context, "banner_blue_top", 50, 0);
            placeSecondary(645 + secondaryBannerOffset);
            break;
          case 7:
            if (secondaryBannerOffset > 0) addImage(context, "banner_blue_bottom", 50, 259);
            addImage(context, "banner_blue_bottom", 50, 259 + secondaryBannerOffset);
            addImage(context, "banner_blue_top", 50, 0);
            placeSecondary(586 + secondaryBannerOffset);
            break;
          default:
            if (secondaryBannerOffset > 0) addImage(context, "banner_blue_bottom", 50, 198);
            addImage(context, "banner_blue_bottom", 50, 198 + secondaryBannerOffset);
            addImage(context, "banner_blue_top", 50, 0);
            placeSecondary(525 + secondaryBannerOffset);
            break;
        }
      }
      break;
    case Color.GREEN:
      if (level === "ii" || level === "iii") {
        switch (descriptionHeight) {
          case 1: case 2: case 3: case 4:
            if (secondaryBannerOffset > 0) addImage(context, "banner_green_bottom", 50, 325);
            addImage(context, "banner_green_bottom", 50, 325 + secondaryBannerOffset);
            addImage(context, "banner_green_top", 50, 0);
            placeSecondary(645 + secondaryBannerOffset);
            break;
          case 5:
            if (secondaryBannerOffset > 0) addImage(context, "banner_green_bottom", 50, 266);
            addImage(context, "banner_green_bottom", 50, 266 + secondaryBannerOffset);
            addImage(context, "banner_green_top", 50, 0);
            placeSecondary(586 + secondaryBannerOffset);
            break;
          case 6:
            if (secondaryBannerOffset > 0) addImage(context, "banner_green_bottom", 50, 205);
            addImage(context, "banner_green_bottom", 50, 205 + secondaryBannerOffset);
            addImage(context, "banner_green_top", 50, 0);
            placeSecondary(525 + secondaryBannerOffset);
            break;
          default:
            if (secondaryBannerOffset > 0) addImage(context, "banner_green_bottom", 50, 145);
            addImage(context, "banner_green_bottom", 50, 145 + secondaryBannerOffset);
            addImage(context, "banner_green_top", 50, 0);
            placeSecondary(465 + secondaryBannerOffset);
            break;
        }
      } else {
        switch (descriptionHeight) {
          case 1: case 2: case 3: case 4: case 5: case 6:
            if (secondaryBannerOffset > 0) addImage(context, "banner_green_bottom", 50, 325);
            addImage(context, "banner_green_bottom", 50, 325 + secondaryBannerOffset);
            addImage(context, "banner_green_top", 50, 0);
            placeSecondary(645 + secondaryBannerOffset);
            break;
          case 7:
            if (secondaryBannerOffset > 0) addImage(context, "banner_green_bottom", 50, 266);
            addImage(context, "banner_green_bottom", 50, 266 + secondaryBannerOffset);
            addImage(context, "banner_green_top", 50, 0);
            placeSecondary(586 + secondaryBannerOffset);
            break;
          default:
            if (secondaryBannerOffset > 0) addImage(context, "banner_green_bottom", 50, 205);
            addImage(context, "banner_green_bottom", 50, 205 + secondaryBannerOffset);
            addImage(context, "banner_green_top", 50, 0);
            placeSecondary(525 + secondaryBannerOffset);
            break;
        }
      }
      break;
  }

  if (color !== Color.PURPLE) {
    addImage(context, "initiative", 26, 13);
    addInitiative(context, initiative, 143, 192, 0, showNumbers, color, level, 0);
  }

  let cardType = "";
  cardType += color === Color.GOLD || color === Color.SILVER ? "Basic " : "";
  if (color === Color.PURPLE) {
    cardType += "Ultimate";
  } else {
    switch (primaryActionType) {
      case Type.SKILL: cardType += "Skill"; break;
      case Type.ATTACK: cardType += "Attack"; break;
      case Type.MOVEMENT: cardType += "Movement"; break;
      case Type.DEFENSE: cardType += "Defense"; break;
      case Type.DEFENSE_SKILL:
        if ((color === Color.GOLD || color === Color.SILVER) && modifier !== Modifier.NONE) cardType += "Defense/Skill";
        else cardType += "Defense / Skill";
        break;
    }
  }
  if (modifier === Modifier.RANGE) cardType += " - Ranged";

  let primaryActionHeight = 0;
  const lowerColor = color.toLowerCase();

  if ((level === "ii" || level === "iii") && (color === Color.RED || color === Color.BLUE || color === Color.GREEN)) {
    addImage(context, "bottom_long", 0, 1412);
    switch (descriptionHeight) {
      case 1:
        addImage(context, "frame_empty_bottom", 56, 1415);
        addImage(context, `frame_${lowerColor}_middle`, 56, 1249);
        addImage(context, `frame_${lowerColor}_top`, 56, 1137);
        addImage(context, `frame_${lowerColor}_middle_cut`, 56, 1340);
        addCardDescription(context, description, 596, 1358);
        addCardType(context, cardType, 596, 1200);
        primaryActionHeight = 1137;
        break;
      case 2:
        addImage(context, "frame_empty_bottom", 56, 1415);
        addImage(context, `frame_${lowerColor}_middle`, 56, 1249);
        addImage(context, `frame_${lowerColor}_top`, 56, 1098);
        addImage(context, `frame_${lowerColor}_middle_cut`, 56, 1340);
        addCardDescription(context, descriptionLines[0], 596, 1311);
        addCardDescription(context, descriptionLines[1], 596, 1372);
        addCardType(context, cardType, 596, 1161);
        primaryActionHeight = 1098;
        break;
      case 3:
        addImage(context, "frame_empty_bottom", 56, 1415);
        addImage(context, `frame_${lowerColor}_middle`, 56, 1249);
        addImage(context, `frame_${lowerColor}_middle`, 56, 1216);
        addImage(context, `frame_${lowerColor}_top`, 56, 1065);
        addImage(context, `frame_${lowerColor}_middle_cut`, 56, 1340);
        addCardDescription(context, descriptionLines[0], 596, 1262);
        addCardDescription(context, descriptionLines[1], 596, 1323);
        addCardDescription(context, descriptionLines[2], 596, 1387);
        addCardType(context, cardType, 596, 1128);
        primaryActionHeight = 1065;
        break;
      case 4:
        addImage(context, "frame_empty_bottom", 56, 1415);
        addImage(context, `frame_${lowerColor}_middle`, 56, 1249);
        addImage(context, `frame_${lowerColor}_middle`, 56, 1083);
        addImage(context, `frame_${lowerColor}_top`, 56, 1002);
        addImage(context, `frame_${lowerColor}_middle_cut`, 56, 1340);
        addCardDescription(context, descriptionLines[0], 596, 1198);
        addCardDescription(context, descriptionLines[1], 596, 1259);
        addCardDescription(context, descriptionLines[2], 596, 1323);
        addCardDescription(context, descriptionLines[3], 596, 1387);
        addCardType(context, cardType, 596, 1065);
        primaryActionHeight = 1002;
        break;
      case 5:
        addImage(context, "frame_empty_bottom", 56, 1415);
        addImage(context, `frame_${lowerColor}_middle`, 56, 1249);
        addImage(context, `frame_${lowerColor}_middle`, 56, 1083);
        addImage(context, `frame_${lowerColor}_top`, 56, 937);
        addImage(context, `frame_${lowerColor}_middle_cut`, 56, 1340);
        addCardDescription(context, descriptionLines[0], 596, 1134);
        addCardDescription(context, descriptionLines[1], 596, 1198);
        addCardDescription(context, descriptionLines[2], 596, 1259);
        addCardDescription(context, descriptionLines[3], 596, 1323);
        addCardDescription(context, descriptionLines[4], 596, 1387);
        addCardType(context, cardType, 596, 1000);
        primaryActionHeight = 937;
        break;
      case 6:
        addImage(context, "frame_empty_bottom", 56, 1415);
        addImage(context, `frame_${lowerColor}_middle`, 56, 1249);
        addImage(context, `frame_${lowerColor}_middle`, 56, 1083);
        addImage(context, `frame_${lowerColor}_middle`, 56, 1015);
        addImage(context, `frame_${lowerColor}_top`, 56, 864);
        addImage(context, `frame_${lowerColor}_middle_cut`, 56, 1340);
        addCardDescription(context, descriptionLines[0], 596, 1064);
        addCardDescription(context, descriptionLines[1], 596, 1128);
        addCardDescription(context, descriptionLines[2], 596, 1189);
        addCardDescription(context, descriptionLines[3], 596, 1253);
        addCardDescription(context, descriptionLines[4], 596, 1314);
        addCardDescription(context, descriptionLines[5], 596, 1378);
        addCardType(context, cardType, 596, 927);
        primaryActionHeight = 864;
        break;
      default:
        addImage(context, "frame_empty_bottom", 56, 1415);
        addImage(context, `frame_${lowerColor}_middle`, 56, 1249);
        addImage(context, `frame_${lowerColor}_middle`, 56, 1083);
        addImage(context, `frame_${lowerColor}_middle`, 56, 1015);
        addImage(context, `frame_${lowerColor}_middle`, 56, 987);
        addImage(context, `frame_${lowerColor}_top`, 56, 836);
        addImage(context, `frame_${lowerColor}_middle_cut`, 56, 1340);
        addCardDescription(context, descriptionLines[0], 596, 1019);
        addCardDescription(context, descriptionLines[1], 596, 1083);
        addCardDescription(context, descriptionLines[2], 596, 1144);
        addCardDescription(context, descriptionLines[3], 596, 1208);
        addCardDescription(context, descriptionLines[4], 596, 1269);
        addCardDescription(context, descriptionLines[5], 596, 1333);
        addCardDescription(context, descriptionLines[6], 596, 1397);
        addCardType(context, cardType, 596, 899);
        primaryActionHeight = 836;
        break;
    }
  } else {
    addImage(context, "bottom_short", 0, 1413);
    switch (descriptionHeight) {
      case 1:
        addImage(context, `frame_${lowerColor}_bottom`, 56, 1522);
        addImage(context, `frame_${lowerColor}_middle`, 56, 1356);
        addImage(context, `frame_${lowerColor}_top`, 56, 1244);
        addCardDescription(context, description, 596, 1465);
        addCardType(context, cardType, 596, 1307);
        primaryActionHeight = 1244;
        break;
      case 2:
        addImage(context, `frame_${lowerColor}_bottom`, 56, 1522);
        addImage(context, `frame_${lowerColor}_middle`, 56, 1356);
        addImage(context, `frame_${lowerColor}_top`, 56, 1205);
        addCardDescription(context, descriptionLines[0], 596, 1418);
        addCardDescription(context, descriptionLines[1], 596, 1479);
        addCardType(context, cardType, 596, 1268);
        primaryActionHeight = 1205;
        break;
      case 3:
        addImage(context, `frame_${lowerColor}_bottom`, 56, 1522);
        addImage(context, `frame_${lowerColor}_middle`, 56, 1356);
        addImage(context, `frame_${lowerColor}_middle`, 56, 1323);
        addImage(context, `frame_${lowerColor}_top`, 56, 1172);
        addCardDescription(context, descriptionLines[0], 596, 1369);
        addCardDescription(context, descriptionLines[1], 596, 1430);
        addCardDescription(context, descriptionLines[2], 596, 1494);
        addCardType(context, cardType, 596, 1235);
        primaryActionHeight = 1172;
        break;
      case 4:
        addImage(context, `frame_${lowerColor}_bottom`, 56, 1522);
        addImage(context, `frame_${lowerColor}_middle`, 56, 1356);
        addImage(context, `frame_${lowerColor}_middle`, 56, 1190);
        addImage(context, `frame_${lowerColor}_top`, 56, 1109);
        addCardDescription(context, descriptionLines[0], 596, 1305);
        addCardDescription(context, descriptionLines[1], 596, 1366);
        addCardDescription(context, descriptionLines[2], 596, 1430);
        addCardDescription(context, descriptionLines[3], 596, 1494);
        addCardType(context, cardType, 596, 1172);
        primaryActionHeight = 1109;
        break;
      case 5:
        addImage(context, `frame_${lowerColor}_bottom`, 56, 1522);
        addImage(context, `frame_${lowerColor}_middle`, 56, 1356);
        addImage(context, `frame_${lowerColor}_middle`, 56, 1190);
        addImage(context, `frame_${lowerColor}_top`, 56, 1044);
        addCardDescription(context, descriptionLines[0], 596, 1241);
        addCardDescription(context, descriptionLines[1], 596, 1305);
        addCardDescription(context, descriptionLines[2], 596, 1366);
        addCardDescription(context, descriptionLines[3], 596, 1430);
        addCardDescription(context, descriptionLines[4], 596, 1494);
        addCardType(context, cardType, 596, 1107);
        primaryActionHeight = 1044;
        break;
      case 6:
        addImage(context, `frame_${lowerColor}_bottom`, 56, 1522);
        addImage(context, `frame_${lowerColor}_middle`, 56, 1356);
        addImage(context, `frame_${lowerColor}_middle`, 56, 1190);
        addImage(context, `frame_${lowerColor}_middle`, 56, 1122);
        addImage(context, `frame_${lowerColor}_top`, 56, 971);
        addCardDescription(context, descriptionLines[0], 596, 1171);
        addCardDescription(context, descriptionLines[1], 596, 1235);
        addCardDescription(context, descriptionLines[2], 596, 1296);
        addCardDescription(context, descriptionLines[3], 596, 1360);
        addCardDescription(context, descriptionLines[4], 596, 1421);
        addCardDescription(context, descriptionLines[5], 596, 1485);
        addCardType(context, cardType, 596, 1034);
        primaryActionHeight = 971;
        break;
      case 7:
        addImage(context, `frame_${lowerColor}_bottom`, 56, 1522);
        addImage(context, `frame_${lowerColor}_middle`, 56, 1356);
        addImage(context, `frame_${lowerColor}_middle`, 56, 1190);
        addImage(context, `frame_${lowerColor}_middle`, 56, 1122);
        addImage(context, `frame_${lowerColor}_middle`, 56, 1094);
        addImage(context, `frame_${lowerColor}_top`, 56, 943);
        addCardDescription(context, descriptionLines[0], 596, 1126);
        addCardDescription(context, descriptionLines[1], 596, 1190);
        addCardDescription(context, descriptionLines[2], 596, 1251);
        addCardDescription(context, descriptionLines[3], 596, 1315);
        addCardDescription(context, descriptionLines[4], 596, 1376);
        addCardDescription(context, descriptionLines[5], 596, 1440);
        addCardDescription(context, descriptionLines[6], 596, 1504);
        addCardType(context, cardType, 596, 1006);
        primaryActionHeight = 943;
        break;
      default:
        addImage(context, `frame_${lowerColor}_bottom`, 56, 1552);
        addImage(context, `frame_${lowerColor}_middle`, 56, 1386);
        addImage(context, `frame_${lowerColor}_middle`, 56, 1326);
        addImage(context, `frame_${lowerColor}_middle`, 56, 1190);
        addImage(context, `frame_${lowerColor}_middle`, 56, 1122);
        addImage(context, `frame_${lowerColor}_middle`, 56, 1074);
        addImage(context, `frame_${lowerColor}_top`, 56, 923);
        addCardDescription(context, descriptionLines[0], 596, 1098);
        addCardDescription(context, descriptionLines[1], 596, 1159);
        addCardDescription(context, descriptionLines[2], 596, 1222);
        addCardDescription(context, descriptionLines[3], 596, 1286);
        addCardDescription(context, descriptionLines[4], 596, 1347);
        addCardDescription(context, descriptionLines[5], 596, 1411);
        addCardDescription(context, descriptionLines[6], 596, 1472);
        addCardDescription(context, descriptionLines[7], 596, 1536);
        addCardType(context, cardType, 596, 986);
        primaryActionHeight = 923;
        break;
    }
  }

  let modifierValueWidth = 0;
  switch (modifier) {
    case Modifier.AREA:
      addImage(context, `area_${lowerColor}`, 921, primaryActionHeight - 20);
      modifierValueWidth = addModifierValue(context, modifierValue, 1052, primaryActionHeight + 82);
      break;
    case Modifier.RANGE:
      addImage(context, `range_${lowerColor}`, 936, primaryActionHeight - 77);
      modifierValueWidth = addModifierValue(context, modifierValue, 1052, primaryActionHeight + 82);
      break;
  }
  if (
    (modifier === Modifier.AREA || modifier === Modifier.RANGE) &&
    (modifierValueSign === ValueSign.PLUS || modifierValueSign === ValueSign.MINUS)
  ) {
    addSign(context, modifierValueSign === ValueSign.PLUS ? "+" : "-", 1052 + modifierValueWidth / 2, primaryActionHeight + 82);
  }

  addImage(context, `colorblind_${lowerColor}`, 1116, 46);

  if (color === Color.RED || color === Color.BLUE || color === Color.GREEN) {
    addImage(context, `level_${level}`, 1006, 85);
    if (level === "ii" || level === "iii") addImage(context, `item_${item.toLowerCase()}`, 476, 1484);
  }

  if (color === Color.GOLD || color === Color.SILVER) {
    if (extra) addExtraMarker(context);
    else if (handicap) addImage(context, "level_h", 1008, 85);
  }

  if (color === Color.PURPLE) {
    addImage(context, "level_iv", 1008, 85);
  } else {
    let primaryValueWidth = 0;
    switch (primaryActionType) {
      case Type.SKILL:
        addImage(context, `skill_${lowerColor}`, 22, primaryActionHeight - 79);
        break;
      case Type.ATTACK:
        addImage(context, `attack_${lowerColor}`, 19, primaryActionHeight - 82);
        if (primaryActionValueSign !== ValueSign.EXCLAMATION) {
          primaryValueWidth = addPrimaryValue(context, primaryActionValue, 142, primaryActionHeight + 82, 0, showNumbers, color, level, Stat.ATTACK, 0);
        }
        break;
      case Type.MOVEMENT:
        addImage(context, `movement_${lowerColor}`, 43, primaryActionHeight - 68);
        if (primaryActionValueSign !== ValueSign.EXCLAMATION) {
          primaryValueWidth = addPrimaryValue(context, primaryActionValue, 142, primaryActionHeight + 82, 0, showNumbers, color, level, Stat.MOVEMENT, 0);
        }
        break;
      case Type.DEFENSE:
        addImage(context, `defense_${lowerColor}`, 51, primaryActionHeight - 74);
        if (primaryActionValueSign !== ValueSign.EXCLAMATION) {
          primaryValueWidth = addPrimaryValue(context, primaryActionValue, 142, primaryActionHeight + 82, 0, showNumbers, color, level, Stat.DEFENSE, 0);
        }
        break;
      case Type.DEFENSE_SKILL:
        addImage(context, `defense_skill_${lowerColor}`, 51, primaryActionHeight - 74);
        if (primaryActionValueSign !== ValueSign.EXCLAMATION) {
          primaryValueWidth = addPrimaryValue(context, primaryActionValue, 142, primaryActionHeight + 82, 0, showNumbers, color, level, Stat.DEFENSE, 0);
        }
        break;
    }

    if (primaryActionType !== Type.SKILL && primaryActionValueSign !== ValueSign.NONE) {
      if (primaryActionValueSign === ValueSign.EXCLAMATION) {
        addBlockValue(context, "!", 142, primaryActionHeight + 82);
      } else {
        addSign(context, primaryActionValueSign === ValueSign.PLUS ? "+" : "-", 142 + primaryValueWidth / 2, primaryActionHeight + 82);
      }
    }
  }
}
