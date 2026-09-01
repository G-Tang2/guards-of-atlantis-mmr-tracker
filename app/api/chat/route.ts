export const runtime = "nodejs";

import { requireSharedAuth } from "@/lib/apiAuth";
import { fetchRelevantDiscordContext } from "@/lib/discordContext";
import { RULEBOOK_TEXT } from "@/lib/rulebook";
import {
  getRelevantHeroIds,
  fetchRelevantHeroCards,
  findMentionedCards,
  extractAskedColors,
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
    const relevantHeroIds = getRelevantHeroIds(message);
    const heroCardContext = fetchRelevantHeroCards(relevantHeroIds);
    const discordContext = await fetchRelevantDiscordContext(message);

    const sections = [
      `Official rulebook:\n${RULEBOOK_TEXT}`,
      heroCardContext &&
        `Hero action card details for the hero(es) this question appears to be about (JSON — each card's "description" is its exact rules text; other heroes' cards were left out of this request to keep it small, not because they don't exist):\n${heroCardContext}`,
      discordContext && `Discord history:\n${discordContext}`,
    ].filter(Boolean);

    const askedColors = extractAskedColors(message);
    const colorFilterNote = askedColors.length
      ? ` The question specifically asks about ${askedColors.join("/")} card(s) — before including any card in your answer, check that card's own "color" field and silently exclude it if it does not match ${askedColors.join(" or ")}, even if it's otherwise a similar level/initiative to the cards that do match. Do not present an off-color card as if it were one of the requested-color options.`
      : "";

    const systemInstruction = `You are a helpful assistant for the Guards of Atlantis II board game group. Use the data below to answer questions about the official rules, specific hero action cards, and general group discussion when it's relevant. When you name a specific action card, refer to it by its exact name and focus on explaining/comparing it in prose — do not restate its exact color, level, initiative, or numeric values yourself, since the app automatically shows that card's exact data (sourced directly from the database, not from you) right alongside your answer.${colorFilterNote} For rules questions specifically: only state a rule, exception, or restriction if it is explicitly written in the rulebook or card text below — do not infer, speculate, or invent an exception based on theme, flavor text, "spirit of the rules", or assumed community consensus. If a general rule (e.g. what a Clear/Attack/Skill action can target) doesn't list an exception for a specific case, the general rule applies as written, even if the specific case sounds narratively special. If a question is about a hero whose cards aren't included below, say you don't have that hero's card details in this message rather than guessing. If something else isn't covered by the data below, say so honestly rather than making it up. You do not have access to the group's match history, player stats/MMR, or hero pick/win rates — if asked about those, say so rather than guessing.\n\n${sections.join("\n\n")}`;

    const reply = await generateChatReply({ systemInstruction, history, message });
    const cardReferences = findMentionedCards(reply, relevantHeroIds, askedColors);
    return Response.json({ ok: true, reply, cardReferences });
  } catch (e) {
    console.error("Chat route error:", e);
    return Response.json(
      { ok: false, error: "Failed to get a reply. Please try again." },
      { status: 502 },
    );
  }
}
