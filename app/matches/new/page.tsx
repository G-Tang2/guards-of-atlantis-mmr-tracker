"use client";

import { useEffect, useState } from "react";
import { supabaseClient } from "@/lib/supabase/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { calculateMMR } from "@/lib/mmr";

type Player = {
  id: string;
  name: string;
  mmr: number;
};

type Team = "atlantis" | "titans";

export default function NewMatchPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  const [atlantisSearch, setAtlantisSearch] = useState("");
  const [titansSearch, setTitansSearch] = useState("");

  const [atlantis, setAtlantis] = useState<Player[]>([]);
  const [titans, setTitans] = useState<Player[]>([]);

  const [winner, setWinner] = useState<Team | "">("");

  const [playedAt, setPlayedAt] = useState(() => {
    return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  });

  // ---------------------------
  // Load players
  // ---------------------------
  useEffect(() => {
    const loadPlayers = async () => {
      const { data, error } = await supabaseClient
        .from("players")
        .select("*")
        .order("name");

      if (error) {
        console.error(error);
        return;
      }

      setPlayers(data ?? []);
      console.log("Loaded players:", data);
      setLoading(false);
    };

    loadPlayers();
  }, []);

  // ---------------------------
  // Helpers
  // ---------------------------
  const availablePlayers = players.filter(
    (p) =>
      !atlantis.some((a) => a.id === p.id) &&
      !titans.some((t) => t.id === p.id),
  );

  const upsertPlayer = async (name: string): Promise<Player> => {
    const { data, error } = await supabaseClient
      .from("players")
      .upsert({ name }, { onConflict: "name" })
      .select()
      .single();

    if (error) throw error;

    return data;
  };

  // ---------------------------
  // Add player
  // ---------------------------
  const addPlayer = async (name: string, team: Team) => {
    if (!name.trim()) return;

    const player = await upsertPlayer(name.trim());

    if (team === "atlantis") {
      setAtlantis((prev) =>
        prev.find((p) => p.id === player.id) ? prev : [...prev, player],
      );
      setAtlantisSearch("");
    } else {
      setTitans((prev) =>
        prev.find((p) => p.id === player.id) ? prev : [...prev, player],
      );
      setTitansSearch("");
    }

    // refresh local cache so future searches include new players
    setPlayers((prev) => {
      if (prev.find((p) => p.id === player.id)) return prev;
      return [...prev, player];
    });
  };

  const removePlayer = (id: string, team: Team) => {
    if (team === "atlantis") {
      setAtlantis((prev) => prev.filter((p) => p.id !== id));
    } else {
      setTitans((prev) => prev.filter((p) => p.id !== id));
    }
  };

  // ---------------------------
  // Save match
  // ---------------------------
const handleSave = async () => {
  if (!winner || atlantis.length === 0 || titans.length === 0) return;
  console.log(atlantis, titans)

  const result = calculateMMR(atlantis, titans, winner);

  // 1. create match
const { data: match, error } = await supabaseClient
  .from("matches")
  .insert({
    winner,
    played_at: new Date(playedAt).toISOString(),

    atlantis_avg_mmr: result.meta.atlantisAvg,
    titans_avg_mmr: result.meta.titansAvg,

    atlantis_mmr_change: result.meta.atlantisDelta,
    titans_mmr_change: result.meta.titansDelta,

    expected_atlantis_win: result.meta.expectedA,
  })
  .select()
  .single();

  if (error) throw error;

  // 2. build match_players insert
  const matchPlayers = [
    ...result.atlantis.map((p) => ({
      match_id: match.id,
      player_id: p.id,
      team: "atlantis",
      mmr_before: atlantis.find((x) => x.id === p.id)?.mmr,
      mmr_after: p.newmmr,
    })),
    ...result.titans.map((p) => ({
      match_id: match.id,
      player_id: p.id,
      team: "titans",
      mmr_before: titans.find((x) => x.id === p.id)?.mmr,
      mmr_after: p.newmmr,
    })),
  ];

  const { error: mpError } = await supabaseClient
    .from("match_players")
    .insert(matchPlayers);

  if (mpError) throw mpError;

  // 3. update player mmr in DB
const updates = [...result.atlantis, ...result.titans];
console.log("mmr updates to apply:", updates);

await Promise.all(
  updates.map((p) =>
    supabaseClient
      .from("players")
      .update({ mmr: Math.round(p.newmmr) })
      .eq("id", p.id)
  )
);

  console.log("Match saved with mmr updates!");
};

  // ---------------------------
  // UI filter
  // ---------------------------
  const filterPlayers = (list: Player[], query: string) =>
    list.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()));

  if (loading) {
    return (
      <main className="p-6">
        <p>Loading players...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl p-6">
      <h1 className="mb-8 text-center text-3xl font-bold">Add Match History</h1>

      <div className="mb-6 rounded border p-4">
        <h2 className="mb-2 text-lg font-semibold">Match Date</h2>

        <input
          type="date"
          className="rounded border p-2"
          value={playedAt}
          onChange={(e) => setPlayedAt(e.target.value)}
        />
      </div>
      <div className="grid gap-8 md:grid-cols-2">
        {/* ---------------- ATLANTIS ---------------- */}
        <div className="rounded-lg border p-4">
          <h2 className="mb-4 text-xl font-semibold">Atlantis</h2>

          <Input
            placeholder="Search or add player..."
            value={atlantisSearch}
            onChange={(e) => setAtlantisSearch(e.target.value)}
          />

          {atlantisSearch && (
            <div className="mt-2 max-h-48 overflow-y-auto rounded border">
              {filterPlayers(availablePlayers, atlantisSearch).map((p) => (
                <button
                  key={p.id}
                  className="w-full border-b px-3 py-2 text-left hover:bg-muted"
                  onClick={() => addPlayer(p.name, "atlantis")}
                >
                  {p.name}
                </button>
              ))}

              {filterPlayers(availablePlayers, atlantisSearch).length === 0 && (
                <button
                  className="w-full px-3 py-2 text-left text-sm text-blue-600 hover:bg-muted"
                  onClick={() => addPlayer(atlantisSearch, "atlantis")}
                >
                  + Create &quot;{atlantisSearch}&quot;
                </button>
              )}
            </div>
          )}

          <div className="mt-4 space-y-2">
            {atlantis.map((p) => (
              <div
                key={p.id}
                className="flex justify-between rounded border p-2"
              >
                {p.name}
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => removePlayer(p.id, "atlantis")}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* ---------------- TITANS ---------------- */}
        <div className="rounded-lg border p-4">
          <h2 className="mb-4 text-xl font-semibold">Titans</h2>

          <Input
            placeholder="Search or add player..."
            value={titansSearch}
            onChange={(e) => setTitansSearch(e.target.value)}
          />

          {titansSearch && (
            <div className="mt-2 max-h-48 overflow-y-auto rounded border">
              {filterPlayers(availablePlayers, titansSearch).map((p) => (
                <button
                  key={p.id}
                  className="w-full border-b px-3 py-2 text-left hover:bg-muted"
                  onClick={() => addPlayer(p.name, "titans")}
                >
                  {p.name}
                </button>
              ))}

              {filterPlayers(availablePlayers, titansSearch).length === 0 && (
                <button
                  className="w-full px-3 py-2 text-left text-sm text-blue-600 hover:bg-muted"
                  onClick={() => addPlayer(titansSearch, "titans")}
                >
                  + Create &quot;{titansSearch}&quot;
                </button>
              )}
            </div>
          )}

          <div className="mt-4 space-y-2">
            {titans.map((p) => (
              <div
                key={p.id}
                className="flex justify-between rounded border p-2"
              >
                {p.name}
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => removePlayer(p.id, "titans")}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ---------------- WINNER ---------------- */}
      <div className="mt-8 rounded border p-4">
        <h2 className="mb-4 text-lg font-semibold">Winner</h2>

        <div className="flex gap-4">
          <Button
            variant={winner === "atlantis" ? "default" : "outline"}
            onClick={() => setWinner("atlantis")}
          >
            Atlantis
          </Button>

          <Button
            variant={winner === "titans" ? "default" : "outline"}
            onClick={() => setWinner("titans")}
          >
            Titans
          </Button>
        </div>
      </div>

      {/* ---------------- SAVE ---------------- */}
      <Button
        className="mt-8 w-full"
        onClick={handleSave}
        disabled={!winner || atlantis.length === 0 || titans.length === 0}
      >
        Save Match
      </Button>
    </main>
  );
}
