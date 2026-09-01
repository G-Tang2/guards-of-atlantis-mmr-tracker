export const runtime = "nodejs";

import { requireSharedAuth } from "@/lib/apiAuth";
import { fetchRelevantDiscordContext } from "@/lib/discordContext";
import { RULEBOOK_TEXT } from "@/lib/rulebook";
import {
  getRelevantHeroIds,
  fetchRelevantHeroCards,
  findMentionedCards,
  extractAskedColors,
  isCardDetailQuestion,
} from "@/lib/heroCardContext";
import { generateChatReply } from "@/lib/gemini";
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
    const wantsCardDetail = isCardDetailQuestion(message);
    const relevantHeroIds = wantsCardDetail ? getRelevantHeroIds(message) : [];
    const heroCardContext = wantsCardDetail ? fetchRelevantHeroCards(relevantHeroIds) : "";
    const discordContext = await fetchRelevantDiscordContext(message);

    const discordSection = discordContext && `Discord history:\n${discordContext}`;
    const cardSection =
      heroCardContext &&
      `Hero action card details for the hero(es) this question appears to be about (JSON — each card's "description" is its exact rules text; other heroes' cards were left out of this request to keep it small, not because they don't exist):\n${heroCardContext}`;
    // For a card/strategy question, the cards themselves are what actually
    // answer it — they go first so the model grounds its reasoning in
    // them, with Discord history following as supplementary color rather
    // than leading the answer with community banter/opinions in place of
    // concrete kit-based advice. For anything else (general/social/rules
    // questions), Discord leads as the group's own primary source.
    const sections = wantsCardDetail
      ? [cardSection, `Official rulebook:\n${RULEBOOK_TEXT}`, discordSection].filter(Boolean)
      : [discordSection, `Official rulebook:\n${RULEBOOK_TEXT}`, cardSection].filter(Boolean);

    const askedColors = wantsCardDetail ? extractAskedColors(message) : [];
    const colorFilterNote = askedColors.length
      ? ` The question specifically asks about ${askedColors.join("/")} card(s) — before including any card in your answer, check that card's own "color" field and silently exclude it if it does not match ${askedColors.join(" or ")}, even if it's otherwise a similar level/initiative to the cards that do match. Do not present an off-color card as if it were one of the requested-color options.`
      : "";
    const priorityInstruction = wantsCardDetail
      ? ` This question is about a hero's action cards or how to play them — ground your answer primarily in that hero's actual card data below, since their cards are what actually define how they're played; don't lead with Discord opinions or banter in place of concrete, kit-based advice. Only bring in Discord history where it adds real, specific insight (e.g. a known strong line of play, a common mistake, a house-rule ruling on that hero) — and when you do, treat it as supporting color, not the main answer. When you name a specific action card, refer to it by its exact name and focus on explaining/comparing it in prose — do not restate its exact color, level, initiative, or numeric values yourself, since the app automatically shows that card's exact data (sourced directly from the database, not from you) right alongside your answer.${colorFilterNote} If the question is about a hero whose cards aren't included below, say you don't have that hero's card details in this message rather than guessing.`
      : " The group's own Discord message history below is your top-priority source for this kind of question — treat it as the primary source for how this group actually plays and talks about the game (house rules, opinions, running jokes, prior rulings), and lead with it over generic knowledge whenever it's relevant. The official rulebook is secondary reference material for official rules. This question doesn't appear to be asking about hero action card specifics, so no card data was included below — if it turns out you do need a card's exact details to answer well, say you don't have that hero's card data in this message rather than guessing at stats.";

    const systemInstruction = `You are a helpful assistant for the Guards of Atlantis II board game group.${priorityInstruction} For rules questions specifically: only state a rule, exception, or restriction if it is explicitly written in the rulebook or card text below — do not infer, speculate, or invent an exception based on theme, flavor text, "spirit of the rules", or assumed community consensus. If a general rule (e.g. what a Clear/Attack/Skill action can target) doesn't list an exception for a specific case, the general rule applies as written, even if the specific case sounds narratively special. If something isn't covered by the data below, say so honestly rather than making it up. You do not have access to the group's match history, player stats/MMR, or hero pick/win rates — if asked about those, say so rather than guessing.\n\n${sections.join("\n\n")}`;

    const reply = await generateChatReply({ systemInstruction, history, message });
    const cardReferences = wantsCardDetail
      ? findMentionedCards(reply, relevantHeroIds, askedColors)
      : [];
    return Response.json({ ok: true, reply, cardReferences });
  } catch (e) {
    console.error("Chat route error:", e);
    return Response.json(
      { ok: false, error: "Failed to get a reply. Please try again." },
      { status: 502 },
    );
  }
}
