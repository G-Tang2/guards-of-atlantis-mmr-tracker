export const runtime = "nodejs";
// Default serverless function timeout is far too short for this route now
// that a reply can involve a bounded rate-limit retry (see
// MAX_AUTO_RETRY_DELAY_MS in lib/gemini.ts) on top of the Discord/rulebook
// lookups, question-embedding, and token-counting calls that already
// precede the actual reply generation. 60s is the max Vercel allows
// without a paid plan's higher ceiling.
export const maxDuration = 60;

import { requireSharedAuth } from "@/lib/apiAuth";
import { fetchDiscordCandidates, selectDiscordContext } from "@/lib/discordContext";
import { wantsRulebookContext, fetchRelevantRulebookPages } from "@/lib/rulebook";
import { fetchRelevantHeroGuides } from "@/lib/heroGuides";
import { HERO_CARDS } from "@/lib/heroCards";
import { GENERAL_STRATEGY_GUIDES } from "@/lib/generalStrategy";
import {
  getRelevantHeroIds,
  fetchRelevantHeroCards,
  findMentionedCards,
  extractAskedColors,
  isCardDetailQuestion,
  wantsHeroCardContext,
  wantsCrossHeroStatSummary,
  buildAllHeroStatSummary,
  detectStatSuperlative,
  computeStatExtremes,
  extractAskedLevel,
  detectTopN,
  detectNamedHeroStatComparison,
  computeStatBreakdown,
  STAT_LABELS,
} from "@/lib/heroCardContext";
import { streamChatReply, countTokens, GeminiRateLimitError, GeminiTimeoutError } from "@/lib/gemini";
import { ChatRequestBody, ChatStreamEvent, ChatTurn, trimHistoryToBudget } from "@/lib/chat";

const MAX_MESSAGE_LENGTH = 4000;

// Total token ceiling for the whole system instruction assembled below.
// This is NOT the whole request's input-token cost, though — conversation
// history (up to HISTORY_TOKEN_BUDGET, see trimHistoryToBudget in
// lib/chat.ts) and the user's own message (up to MAX_MESSAGE_LENGTH chars)
// ride alongside it and count against the same Gemini free-tier
// input-token quota, so the real worst case is roughly this plus ~21k
// tokens (20k history + ~1k message) — 80k here plus that ~21k lands
// right around 100k total. The hero-card and hero-guide sections each
// carry their own hard ceiling already (see
// fetchRelevantHeroCards/fetchRelevantHeroGuides), and the rulebook is
// gated on/off rather than sized, so this budget is really about Discord
// history: rather than a flat cap that either wastes headroom on a simple
// question or gets crowded out on a heavy one, it gets whatever this total
// leaves over once the other sections are known for this specific request
// (see discordTokenBudget below).
//
// Lowered from 200k to 80k -- worst case ~221k was sized for headroom
// under Gemini's paid-tier throughput; on the free tier's much tighter
// per-minute cap (and its generally slower, less predictable latency —
// see FIRST_CHUNK_DEADLINE_MS), a smaller worst case matters more than
// the extra context a rarely-needed 200k budget bought. Still sized
// assuming at most one heavy (max card/guide match, rules-flavored, full
// rulebook, full conversation history) question lands in any given
// 60-second window, not several in a row.
const TOTAL_CONTEXT_TOKEN_BUDGET = 80_000;
// Discord history still gets at least this much even when the other
// sections are maxed out, so a heavy multi-hero rules question doesn't
// squeeze it out entirely. Scaled down along with TOTAL_CONTEXT_TOKEN_BUDGET
// above (same ratio: was 20k against a 200k total) -- keeping the old 20k
// floor against this smaller 80k total would let the heaviest realistic
// question (hero cards + guides + rulebook, all near their own ceilings,
// summing to ~71k) push the real total past the ~100k worst case this is
// meant to guarantee, defeating the point of lowering the total at all.
const MIN_DISCORD_TOKEN_BUDGET = 8_000;

// The reply must start streaming within this window or the request gives
// up and reports a clear timeout instead of continuing to wait — a real
// live incident (Gemini's own "high demand" 503s) once left a user
// staring at "Thinking…" for 158 seconds with nothing bounding the wait.
// Applies to time-to-first-chunk only, not the full reply: a streaming
// UI already feels responsive once tokens start arriving, and capping
// total generation time would mean cutting a thorough answer short (see
// buildAllHeroStatSummary's cross-hero comparisons, which can legitimately
// run long) purely to hit a clock, trading quality for a number no user
// asked for.
//
// Originally 15s, tuned against paid-tier latency (~4-5s typical). Raised
// to 30s after observing the free tier alone regularly needs ~14s for an
// ordinary question, then to 45s after a live test on free tier ("how to
// play arien") got no response at all within 30s -- free tier isn't just
// worse quota/data-terms, it's measurably slower and far less predictable
// per request too. 45s leaves a 15s margin under the route's 60s
// maxDuration for the actual reply to stream out once the first chunk
// does arrive, since a raw platform timeout there would be an uglier
// failure than this deadline's own clean error message. This is a
// mitigation, not a fix -- staying on free tier means some questions
// will keep timing out outright; only moving back to the paid tier
// actually resolves that. Revisit downward if back on paid.
const FIRST_CHUNK_DEADLINE_MS = 45_000;

// Stops waiting on `promise` once `deadlineAt` passes, resolving to
// `fallback` instead — doesn't cancel the underlying work (it may still
// resolve later, its result just goes unused), which is fine here since
// every caller already treats its own result as best-effort (countTokens
// falls back to a heuristic, Discord context degrades to "none" — see
// their own comments) rather than something a reply strictly requires.
function withDeadline<T>(promise: Promise<T>, deadlineAt: number, fallback: T): Promise<T> {
  const remainingMs = deadlineAt - Date.now();
  if (remainingMs <= 0) return Promise.resolve(fallback);
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), remainingMs)),
  ]);
}

export async function POST(request: Request) {
  // Set as early as possible so it covers the whole request, not just
  // the Gemini generation call — the Discord/token-count work below eats
  // into the same 15s window.
  const firstChunkDeadlineAt = Date.now() + FIRST_CHUNK_DEADLINE_MS;

  const unauthorized = requireSharedAuth(request);
  if (unauthorized) return unauthorized;

  let body: ChatRequestBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid request body" }, { status: 400 });
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  const history: ChatTurn[] = Array.isArray(body.history) ? body.history : [];

  if (!message) {
    return Response.json({ ok: false, error: "Message is empty" }, { status: 400 });
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return Response.json({ ok: false, error: "Message is too long" }, { status: 400 });
  }

  try {
    // wantsContext: broad — anything that benefits from having the hero's
    // card data available to reason with (including "how do I play X"
    // strategy questions). wantsDetail: narrow — the user actually asked
    // for the cards' own facts (name, tier, color, exact numbers). A
    // strategy question can be wantsContext without being wantsDetail:
    // the model still gets the kit as background, but the reply shouldn't
    // enumerate/cite exact card facts or trigger the stat-block UI unless
    // the user actually asked for those details.
    const wantsContext = wantsHeroCardContext(message);
    const wantsDetail = isCardDetailQuestion(message);
    const relevantHeroIds = wantsContext ? getRelevantHeroIds(message) : [];
    const askedColors = wantsDetail ? extractAskedColors(message) : [];
    const heroCardContext = wantsContext ? fetchRelevantHeroCards(relevantHeroIds) : "";
    const heroGuideContext = wantsContext ? fetchRelevantHeroGuides(relevantHeroIds) : "";
    // "Who has the lowest red initiative" and similar cross-hero
    // comparisons never name a hero (there's nothing to name — the whole
    // question is which one), so relevantHeroIds always comes back empty
    // and heroCardContext above is empty too — without this, the model
    // had zero card data to compare and could only give an honest but
    // useless "I don't have every hero's details" instead of an actual
    // answer. See wantsCrossHeroStatSummary/buildAllHeroStatSummary in
    // lib/heroCardContext.ts for why this needs its own compact
    // all-heroes table rather than just widening heroCardContext.
    // Stat min/max questions (initiative, movement, defense, attack,
    // range, area) get a precise, code-computed answer instead of asking
    // the model to scan the stat table itself — hit live for initiative:
    // given the full, correct table, the model still misread it, saying
    // "value of 7" but then also listing an actual-8 card among the
    // matches. See computeStatExtremes's own comment for the per-stat
    // field-resolution details. Scoped to relevantHeroIds when a specific
    // hero is already in view ("Arien's highest initiative card" should
    // only compare Arien's own cards), and to every hero otherwise (a
    // true cross-hero comparison, "who has the highest attack"). askedLevel
    // is an extra filter dimension alongside color ("tier 1 red cards"),
    // and topGroupCount widens beyond just the single best value for a
    // "top N" question, without changing the single-value case at all.
    const askedLevel = wantsDetail ? extractAskedLevel(message) : null;
    const topGroupCount = wantsDetail ? detectTopN(message) : 1;
    const statSuperlative = wantsContext ? detectStatSuperlative(message) : null;
    const statExtremeGroups = statSuperlative
      ? computeStatExtremes(
          statSuperlative.stat,
          statSuperlative.direction,
          askedColors,
          relevantHeroIds,
          askedLevel,
          topGroupCount,
        )
      : null;
    // "Compare Arien and Misa's initiative" — two-or-more named heroes
    // plus a stat and comparison wording, but no min/max direction word,
    // so detectStatSuperlative alone wouldn't catch it. Only meaningful
    // when a superlative computation isn't already answering the
    // question, and only once real heroes are already in scope (this
    // never applies to the whole-roster case — comparing "the whole
    // roster" isn't a comparison, that's what the superlative/stat-table
    // paths are for).
    const comparisonStat =
      wantsContext && !statExtremeGroups ? detectNamedHeroStatComparison(message, relevantHeroIds) : null;
    const statBreakdown = comparisonStat
      ? computeStatBreakdown(comparisonStat, relevantHeroIds, askedColors, askedLevel)
      : null;
    // Skip building the general stat table when either precise answer
    // already covers the question — presenting any of these together
    // risks the model re-deriving (and re-flubbing) its own answer from
    // the raw table instead of just using the verified one.
    const useCrossHeroStatSummary =
      wantsContext && !statExtremeGroups && !statBreakdown && wantsCrossHeroStatSummary(message, relevantHeroIds);
    const statSummaryText = useCrossHeroStatSummary ? buildAllHeroStatSummary(askedColors) : "";
    // A precise stat answer only gets "cross-hero comparison" priority-
    // instruction treatment when it's actually comparing across the
    // whole roster (relevantHeroIds empty) — a single-hero superlative
    // ("Arien's highest initiative card") is still just a question about
    // that hero's own kit, already well served by the normal wantsDetail
    // instructions below. A named-hero comparison gets its own separate
    // note instead (see comparisonNote below), since it's neither a
    // whole-roster comparison nor a single hero's own kit.
    const isCrossHeroComparison =
      useCrossHeroStatSummary || (statExtremeGroups !== null && relevantHeroIds.length === 0);
    // Not hero-specific (card-color roles, push potential/minion advantage,
    // statline & item matchups) — sent alongside hero context on any
    // strategy-flavored question, not just ones naming a hero, since these
    // patterns are the foundation every hero-specific line of play sits on.
    const generalStrategyContext = wantsContext ? Object.values(GENERAL_STRATEGY_GUIDES).join("\n\n---\n\n") : "";

    const cardSection =
      heroCardContext &&
      `Hero action card details for the hero(es) this question appears to be about (JSON — each card's "description" is its exact rules text; other heroes' cards were left out of this request to keep it small, not because they don't exist):\n${heroCardContext}`;
    const guideSection =
      heroGuideContext &&
      `Community strategy guide(s) for the hero(es) this question appears to be about (prose commentary and playstyle advice, not official rules text — if it ever conflicts with the hero action card details above/below on an exact number or effect, the card data is authoritative):\n${heroGuideContext}`;
    const generalStrategySection =
      generalStrategyContext &&
      `Community general strategy guides (not hero-specific — how the five card colors function and interact, and how to read the minion wave/push potential):\n${generalStrategyContext}`;
    // The rulebook is ~24k tokens in full — fetchRelevantRulebookPages
    // trims it to the page(s) that actually match the question's keywords
    // (falling back to the full text if nothing matches, so a miss costs
    // tokens rather than correctness — see its own comment in
    // lib/rulebook.ts). For a hero/strategy question (wantsContext), still
    // only worth fetching at all when the question also looks
    // rules-flavored (see wantsRulebookContext), since the priority
    // instructions below already treat card data/guides as that branch's
    // primary grounding. A general/social/rules question (the other
    // branch) gets it unconditionally, same as before — that's the branch
    // it serves most directly.
    const rulebookText = wantsContext
      ? (wantsRulebookContext(message) ? fetchRelevantRulebookPages(message) : "")
      : fetchRelevantRulebookPages(message);
    const rulebookSection = rulebookText && `Official rulebook:\n${rulebookText}`;

    const statSummarySection =
      statSummaryText &&
      `All hero card stats, for cross-hero comparison questions (plain table, one row per card — "-" means that field doesn't apply to that card; every hero is included${askedColors.length ? `, filtered to ${askedColors.join("/")} cards only since that's what was asked` : ", across every color"}, so this table is complete for answering a "who has the lowest/highest" style question — don't say you're missing other heroes' data):\n${statSummaryText}`;

    const statExtremeLabel = statSuperlative ? STAT_LABELS[statSuperlative.stat] : "";
    const statExtremeScopeNote =
      (askedColors.length ? ` among ${askedColors.join("/")} cards` : "") +
      (askedLevel !== null ? ` at Tier ${askedLevel}` : "") +
      (relevantHeroIds.length > 0 ? ` among ${relevantHeroIds.length === 1 ? "this hero's" : "these heroes'"} own cards` : "");
    const statExtremeSection =
      statExtremeGroups &&
      `Pre-computed, verified-correct answer (do not recompute this yourself — every value below was checked directly against the card database, not derived from any table shown elsewhere in this prompt): the ${statExtremeGroups.length > 1 ? `${statExtremeGroups.length} ${statSuperlative!.direction === "min" ? "lowest" : "highest"} distinct` : statSuperlative!.direction === "min" ? "lowest" : "highest"} ${statExtremeLabel} value(s)${statExtremeScopeNote} ${statExtremeGroups.length > 1 ? "are" : "is exactly"}:\n${statExtremeGroups
        .map(
          (group) =>
            `${statExtremeGroups.length > 1 ? `Value ${group.value}:\n` : ""}${group.matches.map((m) => `- ${m.heroName}: "${m.cardName}" (${m.color}${m.level ? `, Tier ${m.level}` : ""}, ${statExtremeLabel} ${group.value})`).join("\n")}`,
        )
        .join("\n")}\nPresent exactly this list — do not add a card that isn't listed here, drop one that is, or restate a different ${statExtremeLabel} value for any of them, even if a stat table elsewhere in this prompt seems to suggest otherwise.`;

    const statBreakdownLabel = comparisonStat ? STAT_LABELS[comparisonStat] : "";
    const statBreakdownSection =
      statBreakdown &&
      `Pre-computed, verified-correct ${statBreakdownLabel} breakdown for this comparison (do not recompute this yourself — every value below was checked directly against the card database):\n${statBreakdown
        .map(
          (hero) =>
            `${hero.heroName}:\n${hero.cards.length > 0 ? hero.cards.map((c) => `- "${c.cardName}" (${c.color}${c.level ? `, Tier ${c.level}` : ""}): ${statBreakdownLabel} ${c.value}`).join("\n") : `- (no card has a ${statBreakdownLabel} value${askedColors.length ? ` among ${askedColors.join("/")} cards` : ""}${askedLevel !== null ? ` at Tier ${askedLevel}` : ""})`}`,
        )
        .join("\n\n")}`;

    const colorFilterNote = askedColors.length
      ? ` The question specifically asks about ${askedColors.join("/")} card(s) — before including any card in your answer, check that card's own "color" field and silently exclude it if it does not match ${askedColors.join(" or ")}, even if it's otherwise a similar level/initiative to the cards that do match. Do not present an off-color card as if it were one of the requested-color options.`
      : "";

    const crossHeroNote = statBreakdown
      ? " This question is comparing specific named heroes against each other on one stat, not asking about one hero's own kit in isolation. A pre-computed, already-verified breakdown of that stat for each hero is included below (labeled as such) — use it directly rather than reading the values off any raw card data also included, and state the actual values for each hero in your answer."
      : isCrossHeroComparison
        ? statExtremeGroups
          ? " This is a cross-hero comparison question, not a question about one hero's own kit — no single hero's card data is included below because none applies. A pre-computed, already-verified answer is included below (labeled as such); present that list exactly as given rather than trying to re-derive it yourself, and state the actual value in your answer — that's the whole point of a comparison, and no separate stat-block UI will show it for you this time."
          : ` This is a cross-hero comparison question, not a question about one hero's own kit — no single hero's card data is included below because none applies; instead, use the all-heroes stat table (also below) to actually work out the answer (e.g. scan its Initiative column for the lowest value among matching rows). Unlike a single-hero card question, here you should state the winning hero/card's name and its actual value directly in your answer — that's the whole point of a comparison, and no separate stat-block UI will show it for you this time. That table already covers every hero, so do not say you're missing other heroes' data.`
        : " If the question is about a hero whose cards aren't included below, say you don't have that hero's card details in this message rather than guessing.";
    let priorityInstruction: string;
    if (wantsDetail) {
      priorityInstruction = ` This question is asking about a hero's action cards' own facts — ground your answer primarily in that hero's actual card data below, since it's the source of truth. Don't lead with Discord opinions or banter in place of concrete card facts; only bring in Discord history or that hero's strategy guide (if included below) where it adds real, specific insight (e.g. a known strong line of play, a house-rule ruling on that hero), treated as supporting color, not the main answer. When you name a specific action card, refer to it by its exact name and focus on explaining/comparing it in prose — do not restate its exact color, level, initiative, or numeric values yourself, since the app automatically shows that card's exact data (sourced directly from the database, not from you) right alongside your answer.${colorFilterNote}${crossHeroNote}`;
    } else if (wantsContext) {
      priorityInstruction = ` This question is about a specific hero's kit, playstyle, or a mechanic tied to their cards, or about general strategy (how the card colors function, reading the minion wave, push potential/minion advantage, statline or item matchups), without asking for the literal card-by-card facts — if a community strategy guide for the relevant hero is included below, treat it as your primary grounding for that hero's playstyle/strategy advice (it's written specifically to answer "how do I play/counter this hero" questions, so it's richer for this than the raw card data); for anything about general mechanics/patterns rather than one hero's kit, ground your answer in the general strategy guides instead. Fall back to the hero's card data (and the rulebook/Discord history, when included below, which may already contain a direct, specific answer — e.g. a prior ruling or established community consensus on exactly this) when no guide is available or it doesn't cover what's being asked. Write in prose rather than cataloging every card. No card-data box will be shown alongside this reply, so don't enumerate the hero's full card list or state exact numeric stats/tier/color as if they were verified facts; you may reference a specific card by its exact name when it helps illustrate a point, described qualitatively. If a guide or Discord history already answers this question clearly, use that answer confidently — don't deflect with "I don't have that data" just because the formal card JSON doesn't spell out every detail itself.`;
    } else {
      priorityInstruction = " The group's own Discord message history below is your top-priority source for this kind of question — treat it as the primary source for how this group actually plays and talks about the game (house rules, opinions, running jokes, prior rulings), and lead with it over generic knowledge whenever it's relevant. The official rulebook is secondary reference material for official rules. This question doesn't appear to be about a specific hero's cards, so no card data was included below — if the question does turn out to hinge on a card's exact, unstated details and neither Discord nor the rulebook already answers it, say so rather than guessing; but if Discord or the rulebook already contains a clear answer, use it confidently instead of deflecting.";
    }

    // Hit live: asked "who has the slowest red initiative", the model
    // picked the *highest* initiative value in the data (the card that
    // actually acts first/fastest) and called it "slowest" — an intuitive
    // but backwards guess (treating a bigger number as "slower", like a
    // time cost) rather than applying this game's actual turn-order rule.
    // Stated explicitly here since it's load-bearing for any
    // initiative-related question, not just cross-hero comparisons.
    const initiativeDirectionNote =
      " Initiative note: actions resolve in initiative order from HIGHEST to LOWEST each turn — a card with a HIGHER initiative number acts earlier (faster/first), and a LOWER initiative number acts later (slower/last). So \"fastest\"/\"acts first\" means the highest initiative value, and \"slowest\"/\"acts last\" means the lowest initiative value — the opposite of treating initiative like a time cost.";

    const promptPreamble = `You are a helpful assistant for the Guards of Atlantis II board game group.${priorityInstruction}${initiativeDirectionNote} For rules questions specifically: only state a rule, exception, or restriction if it is explicitly written in the rulebook or card text below — do not infer, speculate, or invent an exception based on theme, flavor text, "spirit of the rules", or assumed community consensus. If a general rule (e.g. what a Clear/Attack/Skill action can target) doesn't list an exception for a specific case, the general rule applies as written, even if the specific case sounds narratively special. If something isn't covered by the data below, say so honestly rather than making it up. You do not have access to the group's match history, player stats/MMR, or hero pick/win rates — if asked about those, say so rather than guessing.`;

    // Whatever's left of the total budget after the sections above is what
    // Discord history gets for this specific request — a plain question
    // with no hero/rulebook content ends up giving Discord most of the
    // whole budget, while a heavy multi-hero rules question leaves it the
    // floor. Sized from Gemini's own tokenizer (via countTokens) rather
    // than the ~4-chars-per-token heuristic used elsewhere, since this is
    // the one number that directly determines how close a request lands
    // to the real per-minute cap — countTokens falls back to that same
    // heuristic on any failure (missing key, network error), so this never
    // blocks a reply. Order doesn't matter for a token count, so this
    // doesn't need to match the final section ordering below.
    const nonDiscordSections = [cardSection, statExtremeSection, statBreakdownSection, statSummarySection, guideSection, generalStrategySection, rulebookSection].filter(Boolean);
    const nonDiscordSystemInstructionSoFar = `${promptPreamble}\n\n${nonDiscordSections.join("\n\n")}`;
    // Run alongside each other rather than one after the other — the
    // Discord fetch doesn't actually need the token count until the
    // selectDiscordContext trim step below, so there's no reason to make
    // it wait on countTokens' own network round trip first. Also wrapped
    // in withDeadline: both already degrade gracefully on their own
    // (countTokens falls back to the char heuristic, empty Discord
    // candidates just means no Discord section), so if either is still
    // running when the 15s first-chunk deadline is close, better to
    // start generation with what's on hand than let this phase alone eat
    // the whole budget.
    const [actualNonDiscordTokens, discordCandidates] = await withDeadline(
      Promise.all([countTokens(nonDiscordSystemInstructionSoFar), fetchDiscordCandidates(message)]),
      firstChunkDeadlineAt,
      [null, { recent: [], semantic: [], matchedByKeyword: [] }] as const,
    );
    const nonDiscordTokens = actualNonDiscordTokens ?? Math.round(nonDiscordSystemInstructionSoFar.length / 4);
    const discordTokenBudget = Math.max(MIN_DISCORD_TOKEN_BUDGET, TOTAL_CONTEXT_TOKEN_BUDGET - nonDiscordTokens);
    const discordContext = selectDiscordContext(discordCandidates, discordTokenBudget);
    const discordSection = discordContext && `Discord history:\n${discordContext}`;

    // For a card/strategy question, the cards themselves are what actually
    // answer it — they go first so the model grounds its reasoning in
    // them, with the strategy guide right after (richer playstyle context
    // than the raw card JSON alone), then the general strategy guides, and
    // Discord history following as supplementary color rather than leading
    // the answer with community banter/opinions in place of concrete
    // kit-based advice. For anything else (general/social/rules
    // questions), Discord leads as the group's own primary source.
    const sections = wantsContext
      ? [cardSection, statExtremeSection, statBreakdownSection, statSummarySection, guideSection, generalStrategySection, rulebookSection, discordSection].filter(Boolean)
      : [discordSection, rulebookSection, cardSection, statExtremeSection, statBreakdownSection, statSummarySection, guideSection, generalStrategySection].filter(Boolean);

    const systemInstruction = `${promptPreamble}\n\n${sections.join("\n\n")}`;
    const trimmedHistory = trimHistoryToBudget(history);

    // From here on, the response is already committed to a 200 stream —
    // a failure partway through (including the rate-limit case this app
    // has hit before) can no longer change the HTTP status, so it's
    // reported as an in-band "error" event instead (see ChatStreamEvent
    // in lib/chat.ts). Everything above this point can still fail with a
    // normal non-200 JSON error response, same as before streaming.
    const encoder = new TextEncoder();
    const send = (controller: ReadableStreamDefaultController<Uint8Array>, event: ChatStreamEvent) => {
      controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
    };

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        let fullReply = "";
        try {
          for await (const chunk of streamChatReply({
            systemInstruction,
            history: trimmedHistory,
            message,
            firstChunkDeadlineAt,
          })) {
            fullReply += chunk;
            send(controller, { type: "chunk", text: chunk });
          }
          // Computed whenever card context was sent at all (not just
          // wantsDetail) so a strategy reply's card mentions are still
          // tappable in the UI for an on-demand detail popout, even
          // though they don't auto-render as visible blocks — see
          // showCardDetails for that distinction.
          // In cross-hero comparison mode the winning card can be any
          // hero's, not just one of relevantHeroIds (which is empty for
          // these questions in the first place — see useCrossHeroStatSummary
          // above), so every hero is in scope for spotting the named card.
          const cardScanHeroIds = isCrossHeroComparison ? Object.keys(HERO_CARDS) : relevantHeroIds;
          const cardReferences = wantsContext ? findMentionedCards(fullReply, cardScanHeroIds, askedColors) : [];
          send(controller, { type: "done", cardReferences, showCardDetails: wantsDetail });
        } catch (e) {
          console.error("Chat stream error:", e);
          const errorMessage =
            e instanceof GeminiRateLimitError
              ? "The Oracle is receiving too many questions right now. Please try again in about a minute."
              : e instanceof GeminiTimeoutError
                ? "The Oracle is responding slowly right now. Please try again in a moment."
                : "Failed to get a reply. Please try again.";
          send(controller, { type: "error", error: errorMessage });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8" } });
  } catch (e) {
    console.error("Chat route error:", e);
    return Response.json(
      { ok: false, error: "Failed to get a reply. Please try again." },
      { status: 502 },
    );
  }
}
