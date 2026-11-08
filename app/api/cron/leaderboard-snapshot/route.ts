// Called by the Vercel Cron schedule in vercel.json, once every month.
// Vercel invokes cron routes with GET and no way to attach the shared
// PasswordGate header, so this checks CRON_SECRET instead — a separate,
// server-only env var only Vercel's scheduler (and you, manually) knows,
// set alongside the project's other env vars in the Vercel dashboard.
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  const provided = request.headers.get("authorization");
  if (!expected || provided !== `Bearer ${expected}`) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { data: players, error } = await supabaseServer
    .from("players")
    .select("id, name, mmr, rank, avatar_url, matches_played")
    .order("rank", { ascending: true });

  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  const { error: insertError } = await supabaseServer.from("leaderboard_snapshots").insert({
    snapshot_date: new Date().toISOString().slice(0, 10),
    players: (players ?? []).map((p) => ({
      player_id: p.id,
      name: p.name,
      mmr: p.mmr,
      rank: p.rank,
      avatar_url: p.avatar_url,
      matches_played: p.matches_played,
    })),
  });

  if (insertError) {
    return Response.json({ ok: false, error: insertError.message }, { status: 500 });
  }

  return Response.json({ ok: true, playerCount: players?.length ?? 0 });
}
