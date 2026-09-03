export const runtime = "nodejs";

import { requireSharedAuth } from "@/lib/apiAuth";
import { fetchRelevantDiscordContext } from "@/lib/discordContext";
import { RULEBOOK_TEXT } from "@/lib/rulebook";
import { HERO_GUIDES } from "@/lib/heroGuides";
import { GENERAL_STRATEGY_GUIDES } from "@/lib/generalStrategy";
import {
  getRelevantHeroIds,
  fetchRelevantHeroCards,
  findMentionedCards,
  extractAskedColors,
  isCardDetailQuestion,
  wantsHeroCardContext,
} from "@/lib/heroCardContext";
import { generateChatReply, GeminiRateLimitError } from "@/lib/gemini";
import { ChatRequestBody, ChatTurn } from "@/lib/chat";

const MAX_MESSAGE_LENGTH = 4000;

export async function POST(request: Request) {
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
    const heroCardContext = wantsContext ? fetchRelevantHeroCards(relevantHeroIds) : "";
    const heroGuideContext = wantsContext
      ? relevantHeroIds
          .filter((id) => HERO_GUIDES[id])
          .map((id) => HERO_GUIDES[id])
          .join("\n\n---\n\n")
      : "";
    // Not hero-specific (card-color roles, push potential/minion advantage,
    // statline & item matchups) — sent alongside hero context on any
    // strategy-flavored question, not just ones naming a hero, since these
    // patterns are the foundation every hero-specific line of play sits on.
    const generalStrategyContext = wantsContext ? Object.values(GENERAL_STRATEGY_GUIDES).join("\n\n---\n\n") : "";
    const discordContext = await fetchRelevantDiscordContext(message);

    const discordSection = discordContext && `Discord history:\n${discordContext}`;
    const cardSection =
      heroCardContext &&
      `Hero action card details for the hero(es) this question appears to be about (JSON — each card's "description" is its exact rules text; other heroes' cards were left out of this request to keep it small, not because they don't exist):\n${heroCardContext}`;
    const guideSection =
      heroGuideContext &&
      `Community strategy guide(s) for the hero(es) this question appears to be about (prose commentary and playstyle advice, not official rules text — if it ever conflicts with the hero action card details above/below on an exact number or effect, the card data is authoritative):\n${heroGuideContext}`;
    const generalStrategySection =
      generalStrategyContext &&
      `Community general strategy guides (not hero-specific — how the five card colors function and interact, and how to read the minion wave/push potential):\n${generalStrategyContext}`;
    // For a card/strategy question, the cards themselves are what actually
    // answer it — they go first so the model grounds its reasoning in
    // them, with the strategy guide right after (richer playstyle context
    // than the raw card JSON alone), then the general strategy guides, and
    // Discord history following as supplementary color rather than leading
    // the answer with community banter/opinions in place of concrete
    // kit-based advice. For anything else (general/social/rules
    // questions), Discord leads as the group's own primary source.
    const sections = wantsContext
      ? [cardSection, guideSection, generalStrategySection, `Official rulebook:\n${RULEBOOK_TEXT}`, discordSection].filter(Boolean)
      : [discordSection, `Official rulebook:\n${RULEBOOK_TEXT}`, cardSection, guideSection, generalStrategySection].filter(Boolean);

    const askedColors = wantsDetail ? extractAskedColors(message) : [];
    const colorFilterNote = askedColors.length
      ? ` The question specifically asks about ${askedColors.join("/")} card(s) — before including any card in your answer, check that card's own "color" field and silently exclude it if it does not match ${askedColors.join(" or ")}, even if it's otherwise a similar level/initiative to the cards that do match. Do not present an off-color card as if it were one of the requested-color options.`
      : "";

    let priorityInstruction: string;
    if (wantsDetail) {
      priorityInstruction = ` This question is asking about a hero's action cards' own facts — ground your answer primarily in that hero's actual card data below, since it's the source of truth. Don't lead with Discord opinions or banter in place of concrete card facts; only bring in Discord history or that hero's strategy guide (if included below) where it adds real, specific insight (e.g. a known strong line of play, a house-rule ruling on that hero), treated as supporting color, not the main answer. When you name a specific action card, refer to it by its exact name and focus on explaining/comparing it in prose — do not restate its exact color, level, initiative, or numeric values yourself, since the app automatically shows that card's exact data (sourced directly from the database, not from you) right alongside your answer.${colorFilterNote} If the question is about a hero whose cards aren't included below, say you don't have that hero's card details in this message rather than guessing.`;
    } else if (wantsContext) {
      priorityInstruction = ` This question is about a specific hero's kit, playstyle, or a mechanic tied to their cards, or about general strategy (how the card colors function, reading the minion wave, push potential/minion advantage, statline or item matchups), without asking for the literal card-by-card facts — if a community strategy guide for the relevant hero is included below, treat it as your primary grounding for that hero's playstyle/strategy advice (it's written specifically to answer "how do I play/counter this hero" questions, so it's richer for this than the raw card data); for anything about general mechanics/patterns rather than one hero's kit, ground your answer in the general strategy guides instead. Fall back to the hero's card data (and the rulebook/Discord history, which may already contain a direct, specific answer — e.g. a prior ruling or established community consensus on exactly this) when no guide is available or it doesn't cover what's being asked. Write in prose rather than cataloging every card. No card-data box will be shown alongside this reply, so don't enumerate the hero's full card list or state exact numeric stats/tier/color as if they were verified facts; you may reference a specific card by its exact name when it helps illustrate a point, described qualitatively. If a guide or Discord history already answers this question clearly, use that answer confidently — don't deflect with "I don't have that data" just because the formal card JSON doesn't spell out every detail itself.`;
    } else {
      priorityInstruction = " The group's own Discord message history below is your top-priority source for this kind of question — treat it as the primary source for how this group actually plays and talks about the game (house rules, opinions, running jokes, prior rulings), and lead with it over generic knowledge whenever it's relevant. The official rulebook is secondary reference material for official rules. This question doesn't appear to be about a specific hero's cards, so no card data was included below — if the question does turn out to hinge on a card's exact, unstated details and neither Discord nor the rulebook already answers it, say so rather than guessing; but if Discord or the rulebook already contains a clear answer, use it confidently instead of deflecting.";
    }

    const systemInstruction = `You are a helpful assistant for the Guards of Atlantis II board game group.${priorityInstruction} For rules questions specifically: only state a rule, exception, or restriction if it is explicitly written in the rulebook or card text below — do not infer, speculate, or invent an exception based on theme, flavor text, "spirit of the rules", or assumed community consensus. If a general rule (e.g. what a Clear/Attack/Skill action can target) doesn't list an exception for a specific case, the general rule applies as written, even if the specific case sounds narratively special. If something isn't covered by the data below, say so honestly rather than making it up. You do not have access to the group's match history, player stats/MMR, or hero pick/win rates — if asked about those, say so rather than guessing.\n\n${sections.join("\n\n")}`;

    const reply = await generateChatReply({ systemInstruction, history, message });
    // Computed whenever card context was sent at all (not just wantsDetail)
    // so a strategy reply's card mentions are still tappable in the UI for
    // an on-demand detail popout, even though they don't auto-render as
    // visible blocks — see showCardDetails below for that distinction.
    const cardReferences = wantsContext
      ? findMentionedCards(reply, relevantHeroIds, askedColors)
      : [];
    return Response.json({ ok: true, reply, cardReferences, showCardDetails: wantsDetail });
  } catch (e) {
    console.error("Chat route error:", e);
    if (e instanceof GeminiRateLimitError) {
      return Response.json(
        { ok: false, error: "The Oracle is receiving too many questions right now. Please try again in about a minute." },
        { status: 429 },
      );
    }
    return Response.json(
      { ok: false, error: "Failed to get a reply. Please try again." },
      { status: 502 },
    );
  }
}
