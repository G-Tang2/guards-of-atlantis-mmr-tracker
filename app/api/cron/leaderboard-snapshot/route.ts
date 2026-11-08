// Called by the Vercel Cron schedule in vercel.json, once every month.
// Vercel invokes cron routes with GET and no way to attach the shared
// PasswordGate header, so this checks CRON_SECRET instead — a separate,
// server-only env var only Vercel's scheduler (and you, manually) knows,
// set alongside the project's other env vars in the Vercel dashboard.
import { supabaseServer } from "@/lib/supabase/server";
import { didWin } from "@/lib/match";
import { getCompletedBadges } from "@/lib/heroWinBonus";

export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  const provided = request.headers.get("authorization");
  if (!expected || provided !== `Bearer ${expected}`) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const [{ data: players, error: playersError }, { data: matches, error: matchesError }] = await Promise.all([
    supabaseServer
      .from("players")
      .select("id, name, mmr, rank, avatar_url, matches_played")
      .order("rank", { ascending: true }),
    // Same shape the Rankings tab computes wins/losses/draws/badges from
    // live (see app/leaderboard/page.tsx) — a snapshot captures the same
    // derived stats, not just mmr/rank, so it's a self-contained record of
    // the leaderboard as it actually looked at the time.
    supabaseServer.from("matches").select("winner, match_players ( player_id, team, hero_id )"),
  ]);

  if (playersError) {
    return Response.json({ ok: false, error: playersError.message }, { status: 500 });
  }
  if (matchesError) {
    return Response.json({ ok: false, error: matchesError.message }, { status: 500 });
  }

  const statsByPlayer = new Map<string, { wins: number; losses: number; draws: number; wonHeroIds: Set<string> }>();
  (matches ?? []).forEach((match) => {
    match.match_players?.forEach((mp) => {
      const stats = statsByPlayer.get(mp.player_id) ?? { wins: 0, losses: 0, draws: 0, wonHeroIds: new Set<string>() };
      if (match.winner === "none") {
        stats.draws++;
      } else if (didWin(mp.team, match.winner)) {
        stats.wins++;
        if (mp.hero_id) stats.wonHeroIds.add(mp.hero_id);
      } else {
        stats.losses++;
      }
      statsByPlayer.set(mp.player_id, stats);
    });
  });

  const { error: insertError } = await supabaseServer.from("leaderboard_snapshots").insert({
    snapshot_date: new Date().toISOString().slice(0, 10),
    players: (players ?? []).map((p) => {
      const stats = statsByPlayer.get(p.id) ?? { wins: 0, losses: 0, draws: 0, wonHeroIds: new Set<string>() };
      return {
        player_id: p.id,
        name: p.name,
        mmr: p.mmr,
        rank: p.rank,
        avatar_url: p.avatar_url,
        matches_played: p.matches_played,
        wins: stats.wins,
        losses: stats.losses,
        draws: stats.draws,
        badge_ids: getCompletedBadges(stats.wonHeroIds).map((b) => b.id),
      };
    }),
  });

  if (insertError) {
    return Response.json({ ok: false, error: insertError.message }, { status: 500 });
  }

  return Response.json({ ok: true, playerCount: players?.length ?? 0 });
}
