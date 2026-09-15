export const runtime = "nodejs";
// Same reasoning as app/api/chat/route.ts's own maxDuration — a free-tier
// Gemini generation can take up to FIRST_CHUNK_DEADLINE_MS just to start,
// and this route waits for the *entire* reply (not streamed to the
// client — it's saved once and reused on every later page view), so it
// needs the same ceiling.
export const maxDuration = 60;

import { requireSharedAuth } from "@/lib/apiAuth";
import { supabaseClient } from "@/lib/supabase/client";
import { streamChatReply, GeminiRateLimitError, GeminiTimeoutError } from "@/lib/gemini";
import { fetchRelevantHeroCards } from "@/lib/heroCardContext";
import { fetchRelevantHeroGuides } from "@/lib/heroGuides";
import { GENERAL_STRATEGY_GUIDES } from "@/lib/generalStrategy";
import { HEROES } from "@/lib/heroes";
import { formatWinCondition } from "@/lib/match";

// Bounded the same way app/api/chat/route.ts bounds its own first-chunk
// wait — this route has no streaming UI to keep feeling responsive while
// it waits, so the whole call just needs to stay well inside maxDuration.
const GENERATION_DEADLINE_MS = 55_000;

const getHeroName = (heroId: string | null) => HEROES.find((h) => h.id === heroId)?.name ?? heroId ?? "Unknown";

type RawMatchPlayer = {
  team: string;
  hero_id: string | null;
  players: { name: string } | { name: string }[] | null;
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const unauthorized = requireSharedAuth(request);
  if (unauthorized) return unauthorized;

  const { id: matchId } = await params;

  let regenerate = false;
  try {
    const body = await request.json();
    regenerate = body?.regenerate === true;
  } catch {
    // No body (or invalid JSON) just means "don't force regenerate" —
    // this route is meant to work with a plain empty POST too.
  }

  const { data: match, error } = await supabaseClient
    .from("matches")
    .select(
      `
      id, winner, win_condition, draft_analysis,
      match_players ( team, hero_id, players ( name ) )
      `,
    )
    .eq("id", matchId)
    .single();

  if (error || !match) {
    return Response.json({ ok: false, error: "Match not found" }, { status: 404 });
  }

  // Already generated — return the cached copy instead of spending
  // another Gemini call, unless the caller explicitly asked to redo it.
  if (match.draft_analysis && !regenerate) {
    return Response.json({ ok: true, analysis: match.draft_analysis });
  }

  const matchPlayers = (match.match_players ?? []) as unknown as RawMatchPlayer[];
  const rosterFor = (team: "atlantis" | "titans") =>
    matchPlayers
      .filter((mp) => mp.team === team)
      .map((mp) => {
        const player = Array.isArray(mp.players) ? mp.players[0] : mp.players;
        return { playerName: player?.name ?? "Unknown", heroId: mp.hero_id, heroName: getHeroName(mp.hero_id) };
      });

  const atlantisRoster = rosterFor("atlantis");
  const titansRoster = rosterFor("titans");
  const allHeroIds = [...atlantisRoster, ...titansRoster]
    .map((p) => p.heroId)
    .filter((id): id is string => !!id);

  if (allHeroIds.length === 0) {
    return Response.json(
      { ok: false, error: "This match has no hero picks recorded to analyze" },
      { status: 400 },
    );
  }

  const formatRoster = (roster: typeof atlantisRoster) =>
    roster.map((p) => `${p.heroName} (played by ${p.playerName})`).join(", ") || "(no hero picks recorded)";
  const heroNameList = (roster: typeof atlantisRoster) =>
    roster.map((p) => p.heroName).join(", ") || "no hero picks recorded";

  const resultLine =
    match.winner === "none"
      ? "The match ended in a draw."
      : `${match.winner === "atlantis" ? "Atlantis" : "Titans"} won this match${
          match.win_condition ? ` ${formatWinCondition(match.win_condition).toLowerCase()}` : ""
        }.`;

  const heroCardContext = fetchRelevantHeroCards(allHeroIds);
  const heroGuideContext = fetchRelevantHeroGuides(allHeroIds);
  const generalStrategyContext = Object.values(GENERAL_STRATEGY_GUIDES).join("\n\n---\n\n");

  const sections = [
    heroCardContext &&
      `Hero action card details for every hero in this match (JSON — each card's "description" is its exact rules text):\n${heroCardContext}`,
    heroGuideContext &&
      `Community strategy guide(s) for the heroes in this match (prose commentary and playstyle advice, not official rules text — if it ever conflicts with the card details above on an exact number or effect, the card data is authoritative):\n${heroGuideContext}`,
    `Community general strategy guides (how the five card colors function and interact, and how to read the minion wave/push potential):\n${generalStrategyContext}`,
  ].filter(Boolean);

  const systemInstruction = `You are a strategy analyst for the Guards of Atlantis II board game group, writing a post-match "Draft Analysis" for a game that has already been played and recorded.

MATCH CONTEXT
Atlantis picks: ${formatRoster(atlantisRoster)}
Titans picks: ${formatRoster(titansRoster)}
${resultLine}

TASK: Analyze which team drafted the stronger overall TEAM COMPOSITION — not simply whichever team happened to win the actual game. The match result above is context only: a team can win despite a weaker draft, or lose despite a stronger one — say so plainly if that's the case.

Structure your answer with exactly these four "##" Markdown headings, in this order:

## Atlantis Team Composition (${heroNameList(atlantisRoster)})
A couple of paragraphs on Atlantis's own identity as a team — how their heroes' card colors/kits and win conditions reinforce each other.

## Titans Team Composition (${heroNameList(titansRoster)})
Same, for Titans.

## Matchup & Synergistic Answers
How each team's composition actually plays against the other's specific picks — where one side's kit directly answers, blunts, or struggles against the other's, not just each team assessed in isolation.

## Verdict
State plainly which team drafted the stronger composition ONLY if one side genuinely has the edge. If the gap is marginal, or you'd need to reach to justify picking a side, say explicitly that the draft was balanced instead — do not pick a "winner" just to have named one; a balanced verdict is a normal, common outcome here, not a fallback to avoid. Reconcile this verdict with the actual match result above — if the team you judge to have drafted better didn't win (or vice versa), say so explicitly rather than leaving the two unaddressed.

Ground every specific claim (card names, numbers, effects) in the hero card details and strategy guides below — don't invent numbers or effects that aren't there.

${sections.join("\n\n")}`;

  try {
    let fullText = "";
    for await (const chunk of streamChatReply({
      systemInstruction,
      history: [],
      message: "Write the draft analysis now.",
      firstChunkDeadlineAt: Date.now() + GENERATION_DEADLINE_MS,
    })) {
      fullText += chunk;
    }

    if (!fullText.trim()) {
      return Response.json({ ok: false, error: "The Oracle had nothing to say. Please try again." }, { status: 502 });
    }

    const { error: updateError } = await supabaseClient
      .from("matches")
      .update({ draft_analysis: fullText, draft_analysis_generated_at: new Date().toISOString() })
      .eq("id", matchId);
    if (updateError) throw updateError;

    return Response.json({ ok: true, analysis: fullText });
  } catch (e) {
    console.error("Draft analysis generation error:", e);
    const errorMessage =
      e instanceof GeminiRateLimitError
        ? "The Oracle is receiving too many questions right now. Please try again in about a minute."
        : e instanceof GeminiTimeoutError
          ? "The Oracle is responding slowly right now. Please try again in a moment."
          : "Failed to generate the draft analysis. Please try again.";
    return Response.json({ ok: false, error: errorMessage }, { status: 502 });
  }
}
