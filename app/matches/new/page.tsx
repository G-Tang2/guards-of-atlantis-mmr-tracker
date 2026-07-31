"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseClient } from "@/lib/supabase/client";
import { calculateMMR } from "@/lib/mmr";
import { HeroPicker } from "@/components/HeroPicker";
import { Hero } from "@/lib/heroes";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { Swords } from "lucide-react";

type Player = {
  id: string;
  name: string;
  mmr: number;
  rank: number;
  avatar_url?: string | null;
  last_played_match_number: number;
};

type PoolEntry = {
  player: Player;
  hero: Hero | null;
};

enum WinCondition {
  LAST_PUSH = "LAST_PUSH",
  THRONE = "THRONE",
  LIFE_COUNTER = "LIFE_COUNTER",
}

type Team = "atlantis" | "titans";
type Winner = "" | "atlantis" | "titans" | "none";

const INACTIVE_GAME_THRESHOLD = 5;

function NewMatchPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [atlantisSearch, setAtlantisSearch] = useState("");
  const [titansSearch, setTitansSearch] = useState("");
  const [atlantis, setAtlantis] = useState<PoolEntry[]>([]);
  const [titans, setTitans] = useState<PoolEntry[]>([]);
  const [winner, setWinner] = useState<Winner>("");
  const [winCondition, setWinCondition] = useState<WinCondition | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadPlayers = async () => {
      const result = await supabaseClient
        .from("players")
        .select("*")
        .order("name");
      const { data, error } = await result;
      if (!error && data) {
        setPlayers(data);

        const atlantisParam = searchParams.get("atlantis");
        const titansParam = searchParams.get("titans");

        if (atlantisParam) {
          const ids = new Set(atlantisParam.split(",").filter(Boolean));
          const entries: PoolEntry[] = data
            .filter((p) => ids.has(p.id))
            .map((player) => ({ player, hero: null }));
          if (entries.length > 0) setAtlantis(entries);
        }

        if (titansParam) {
          const ids = new Set(titansParam.split(",").filter(Boolean));
          const entries: PoolEntry[] = data
            .filter((p) => ids.has(p.id))
            .map((player) => ({ player, hero: null }));
          if (entries.length > 0) setTitans(entries);
        }
      }

      setLoading(false);
    };
    loadPlayers();
  }, [searchParams]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const availablePlayers = players.filter(
    (p) =>
      !atlantis.some((e) => e.player.id === p.id) &&
      !titans.some((e) => e.player.id === p.id),
  );

  const upsertPlayer = async (name: string): Promise<Player> => {
    const res = await supabaseClient
      .from("players")
      .upsert({ name }, { onConflict: "name" })
      .select()
      .single();
    const { data, error } = await res;
    if (error) throw error;
    return data;
  };

  const addPlayer = async (name: string, team: Team) => {
    if (!name.trim()) return;
    const player = await upsertPlayer(name.trim());
    const entry: PoolEntry = { player, hero: null };

    if (team === "atlantis") {
      setAtlantis((prev) =>
        prev.find((e) => e.player.id === player.id) ? prev : [...prev, entry],
      );
      setAtlantisSearch("");
    } else {
      setTitans((prev) =>
        prev.find((e) => e.player.id === player.id) ? prev : [...prev, entry],
      );
      setTitansSearch("");
    }

    setPlayers((prev) =>
      prev.find((p) => p.id === player.id) ? prev : [...prev, player],
    );
  };

  const removePlayer = (id: string, team: Team) => {
    if (team === "atlantis")
      setAtlantis((prev) => prev.filter((e) => e.player.id !== id));
    else setTitans((prev) => prev.filter((e) => e.player.id !== id));
  };

  const filterPlayers = (list: Player[], query: string): Player[] =>
    list.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()));

  const setHero = (playerId: string, team: Team, hero: Hero | null) => {
    if (team === "atlantis") {
      setAtlantis((prev) =>
        prev.map((e) => (e.player.id === playerId ? { ...e, hero } : e)),
      );
    } else {
      setTitans((prev) =>
        prev.map((e) => (e.player.id === playerId ? { ...e, hero } : e)),
      );
    }
  };

  const handleSave = async () => {
    if (!winner || atlantis.length === 0 || titans.length === 0 || saving)
      return;
    setSaving(true);

    try {
      const atlPlayers = atlantis.map((e) => e.player);
      const titPlayers = titans.map((e) => e.player);
      const result = calculateMMR(atlPlayers, titPlayers, winner);

      const { data: match, error } = await supabaseClient
        .from("matches")
        .insert({
          winner,
          win_condition: winCondition,
          atlantis_avg_mmr: result.meta.atlantisAvg,
          titans_avg_mmr: result.meta.titansAvg,
          atlantis_mmr_change: result.meta.atlantisDelta,
          titans_mmr_change: result.meta.titansDelta,
          expected_atlantis_win: result.meta.expectedA,
        })
        .select("id, match_number")
        .single();

      if (error) throw error;

      const newMatchNumber = match.match_number;
      const matchParticipantIds = new Set([
        ...result.atlantis.map((p) => p.id),
        ...result.titans.map((p) => p.id),
      ]);
      const teamByPlayerId = new Map<string, Team>([
        ...atlantis.map((e): [string, Team] => [e.player.id, "atlantis"]),
        ...titans.map((e): [string, Team] => [e.player.id, "titans"]),
      ]);

      // Denormalize match_number onto every match_player row
      const matchPlayers = [
        ...result.atlantis.map((p) => ({
          match_id: match.id,
          match_number: newMatchNumber,
          player_id: p.id,
          team: "atlantis",
          mmr_before: atlPlayers.find((x) => x.id === p.id)?.mmr,
          mmr_after: p.newMmr,
          hero_id: atlantis.find((e) => e.player.id === p.id)?.hero?.id ?? null,
        })),
        ...result.titans.map((p) => ({
          match_id: match.id,
          match_number: newMatchNumber,
          player_id: p.id,
          team: "titans",
          mmr_before: titPlayers.find((x) => x.id === p.id)?.mmr,
          mmr_after: p.newMmr,
          hero_id: titans.find((e) => e.player.id === p.id)?.hero?.id ?? null,
        })),
      ];

      const { error: mpError } = await supabaseClient
        .from("match_players")
        .insert(matchPlayers);
      if (mpError) throw mpError;

// Combine updated match participants with non-participating players
      const updatedParticipantsMap = new Map(
        [...result.atlantis, ...result.titans].map((p) => [
          p.id,
          Math.round(p.newMmr),
        ]),
      );

      const allPlayersPostMatch = players.map((p) => {
        const isParticipant = matchParticipantIds.has(p.id);
        const postMatchMmr = updatedParticipantsMap.get(p.id) ?? p.mmr;
        return {
          ...p,
          postMatchMmr,
          lostMmr: isParticipant && postMatchMmr < p.mmr,
          last_played_match_number: isParticipant
            ? newMatchNumber
            : (p.last_played_match_number ?? 0),
          isParticipant,
        };
      });

      // Baseline order = current standings (existing rank), so protection
      // is evaluated against who was actually ranked above whom.
      const workingOrder = [...allPlayersPostMatch].sort((a, b) => {
        const rankA = a.rank ?? Number.MAX_SAFE_INTEGER;
        const rankB = b.rank ?? Number.MAX_SAFE_INTEGER;
        if (rankA !== rankB) return rankA - rankB;
        return b.postMatchMmr - a.postMatchMmr;
      });

      // Best (lowest) pre-match rank on the losing side of this match —
      // winning against a team that included this player proves the
      // winners beat someone ranked at least that high.
      const losingPool =
        winner === "atlantis" ? titans : winner === "titans" ? atlantis : [];
      const losingTeamBestRank = losingPool.reduce<number | undefined>(
        (best, e) =>
          best === undefined || e.player.rank < best ? e.player.rank : best,
        undefined,
      );

      // Player A can overtake player B only if A's post-match MMR is higher
      // AND either: A's team won this match against a losing side that
      // included someone ranked at least as high as B (B doesn't need to
      // have played, or even be on the losing team — a teammate of A works
      // too); or A sat out this match while B played it and lost MMR; or B
      // has been inactive for at least INACTIVE_GAME_THRESHOLD games.
      const canOvertake = (
        a: (typeof workingOrder)[number],
        b: (typeof workingOrder)[number],
      ) => {
        if (a.postMatchMmr <= b.postMatchMmr) return false;

        const aBeatSomeoneAboveB =
          a.isParticipant &&
          winner !== "none" &&
          teamByPlayerId.get(a.id) === winner &&
          losingTeamBestRank !== undefined &&
          losingTeamBestRank <= b.rank;
        const aSatOutBLost = !a.isParticipant && b.isParticipant && b.lostMmr;
        const bInactive =
          newMatchNumber > 0 &&
          b.last_played_match_number <= newMatchNumber - INACTIVE_GAME_THRESHOLD;

        return aBeatSomeoneAboveB || aSatOutBLost || bInactive;
      };

      // Let each player climb past the player directly above them in the
      // working order for as long as the overtake rule permits it.
      for (let i = 1; i < workingOrder.length; i++) {
        let j = i;
        while (j > 0 && canOvertake(workingOrder[j], workingOrder[j - 1])) {
          [workingOrder[j - 1], workingOrder[j]] = [
            workingOrder[j],
            workingOrder[j - 1],
          ];
          j--;
        }
      }

      const computedRanks = new Map<string, number>(
        workingOrder.map((p, idx) => [p.id, idx + 1]),
      );

      // Pass 1: Temporarily clear ranks to prevent Supabase 409 Unique Constraint errors
      await supabaseClient
        .from("players")
        .update({ rank: null })
        .in("id", allPlayersPostMatch.map((p) => p.id));

      // Pass 2: Update final MMR, last_played_match_number, and computed ranks
      await Promise.all(
        allPlayersPostMatch.map((p) =>
          supabaseClient
            .from("players")
            .update({
              mmr: p.postMatchMmr,
              rank: computedRanks.get(p.id),
              last_played_match_number: p.last_played_match_number,
            })
            .eq("id", p.id),
        ),
      );

      // Refresh the co-played materialized view so protected ranking is current
      await supabaseClient.rpc("refresh_player_co_played");

      showToast("Victory inscribed in the archives");
      setAtlantis([]);
      setTitans([]);
      setWinner("");

      setTimeout(() => {
        router.push("/matches");
      }, 1000);
    } catch (err) {
      console.error("Failed to save match", err);
      showToast("✦ Record cannot be saved. Try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="goa-root goa-bg goa-loading-screen">
        <div className="goa-loading-inner">
          <div className="goa-loading-icon">
            <Swords size={30} />
          </div>
          <p className="goa-loading-text xl">Loading existing players…</p>
        </div>
      </div>
    );
  }

  const canSave = winner && atlantis.length > 0 && titans.length > 0;

  return (
    <div className="goa-root goa-bg">
      {/* Header */}
      <header className="goa-header">
        <h1 className="goa-title">Record of Battle</h1>
        <p className="goa-subtitle">Guards of Atlantis II</p>
      </header>

      {/* Atlantis */}
      <div className="goa-section">
        <div className="goa-section-header atlantis-header">
          <h2 className="goa-section-title">Atlantis</h2>
        </div>
        <div className="goa-search-wrap">
          <input
            className="goa-search"
            placeholder="Summon an Atlantean…"
            value={atlantisSearch}
            onChange={(e) => setAtlantisSearch(e.target.value)}
          />
        </div>
        {atlantisSearch && (
          <div className="goa-splitter-dropdown">
            {filterPlayers(availablePlayers, atlantisSearch).map((p) => (
              <button
                key={p.id}
                className="goa-battle-option"
                onClick={() => addPlayer(p.name, "atlantis")}
              >
                <Swords size={14} className="inline-block align-text-bottom" />{" "}
                {p.name}
              </button>
            ))}
            {filterPlayers(availablePlayers, atlantisSearch).length === 0 && (
              <button
                className="goa-battle-option goa-battle-option-new"
                onClick={() => addPlayer(atlantisSearch, "atlantis")}
              >
                ✦ Recruit &quot;{atlantisSearch}&quot;
              </button>
            )}
          </div>
        )}
        <div className="goa-players">
          {atlantis.length === 0 && (
            <p className="empty-state">No Atlanteans assembled</p>
          )}
          {atlantis.map((p) => (
            <div key={p.player.id} className="goa-player-block">
              <div key={p.player.id} className="goa-player-row">
                <span className="goa-player-name">
                  <PlayerAvatar
                    avatarUrl={p.player.avatar_url}
                    name={p.player.name}
                    size={22}
                  />
                  {p.player.name}
                  {p.player.mmr && (
                    <span className="goa-player-mmr">{p.player.mmr}</span>
                  )}
                </span>
                <button
                  className="goa-remove"
                  onClick={() => removePlayer(p.player.id, "atlantis")}
                  aria-label="Remove"
                >
                  ✕
                </button>
              </div>
              <HeroPicker
                selected={p.hero}
                onSelect={(h) => setHero(p.player.id, "atlantis", h)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Titans */}
      <div className="goa-section">
        <div className="goa-section-header titans-header">
          <h2 className="goa-section-title">Titans</h2>
        </div>
        <div className="goa-search-wrap">
          <input
            className="goa-search"
            placeholder="Summon a Titan…"
            value={titansSearch}
            onChange={(e) => setTitansSearch(e.target.value)}
          />
        </div>
        {titansSearch && (
          <div className="goa-splitter-dropdown">
            {filterPlayers(availablePlayers, titansSearch).map((p) => (
              <button
                key={p.id}
                className="goa-battle-option"
                onClick={() => addPlayer(p.name, "titans")}
              >
                <Swords size={14} className="inline-block align-text-bottom" />{" "}
                {p.name}
              </button>
            ))}
            {filterPlayers(availablePlayers, titansSearch).length === 0 && (
              <button
                className="goa-battle-option goa-battle-option-new"
                onClick={() => addPlayer(titansSearch, "titans")}
              >
                ✦ Recruit &quot;{titansSearch}&quot;
              </button>
            )}
          </div>
        )}
        <div className="goa-players">
          {titans.length === 0 && (
            <p className="empty-state">No Titans assembled</p>
          )}
          {titans.map((p) => (
            <div key={p.player.id} className="goa-player-block">
              <div className="goa-player-row">
                <span className="goa-player-name">
                  <PlayerAvatar
                    avatarUrl={p.player.avatar_url}
                    name={p.player.name}
                    size={22}
                  />
                  {p.player.name}
                  {p.player.mmr && (
                    <span className="goa-player-mmr">{p.player.mmr}</span>
                  )}
                </span>
                <button
                  className="goa-remove"
                  onClick={() => removePlayer(p.player.id, "titans")}
                  aria-label="Remove"
                >
                  ✕
                </button>
              </div>
              <div className="goa-hero-wrap">
                <HeroPicker
                  selected={p.hero}
                  onSelect={(h) => setHero(p.player.id, "titans", h)}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Winner */}
      <p className="winner-label">Declare the victor</p>
      <div className="goa-winner-section">
        <button
          className={`goa-faction-btn goa-faction-btn-a ${winner === "atlantis" ? "selected" : ""}`}
          onClick={() => {
            setWinner(winner === "atlantis" ? "" : "atlantis");
          }}
        >
          <span className="goa-faction-label">Atlantis</span>
        </button>
        <button
          className={`goa-faction-btn goa-faction-btn-t ${winner === "titans" ? "selected" : ""}`}
          onClick={() => {
            setWinner(winner === "titans" ? "" : "titans");
          }}
        >
          <span className="goa-faction-label">Titans</span>
        </button>
        <button
          className={`goa-faction-btn goa-faction-btn-d ${winner === "none" ? "selected" : ""}`}
          onClick={() => {
            setWinner(winner === "none" ? "" : "none");
            setWinCondition(null);
          }}
        >
          <span className="goa-faction-label">Draw</span>
        </button>
      </div>

      {/* Win condition */}
      <p className="winner-label">Victory Condition</p>
      <div className="goa-win-condition-section">
        <button
          disabled={winner === "none"}
          className={`goa-win-condition-btn ${winCondition === WinCondition.THRONE ? "selected" : ""}`}
          onClick={() =>
            setWinCondition(
              winCondition === WinCondition.THRONE ? null : WinCondition.THRONE,
            )
          }
        >
          <span className="goa-faction-label">Throne</span>
        </button>
        <button
          disabled={winner === "none"}
          className={`goa-win-condition-btn ${winCondition === WinCondition.LAST_PUSH ? "selected" : ""}`}
          onClick={() =>
            setWinCondition(
              winCondition === WinCondition.LAST_PUSH
                ? null
                : WinCondition.LAST_PUSH,
            )
          }
        >
          <span className="goa-faction-label">Last Push</span>
        </button>
        <button
          disabled={winner === "none"}
          className={`goa-win-condition-btn ${winCondition === WinCondition.LIFE_COUNTER ? "selected" : ""}`}
          onClick={() =>
            setWinCondition(
              winCondition === WinCondition.LIFE_COUNTER
                ? null
                : WinCondition.LIFE_COUNTER,
            )
          }
        >
          <span className="goa-faction-label">Life Counter</span>
        </button>
      </div>

      <div className="goa-divider" />

      {/* Save */}
      <div className="goa-btn-wrap">
        <button
          className="goa-btn inline-flex items-center justify-center gap-2"
          onClick={handleSave}
          disabled={!canSave || saving}
        >
          {saving ? (
            "✦ Inscribing…"
          ) : (
            <>
              <Swords size={18} />
              Inscribe to the Archives
            </>
          )}
        </button>
      </div>

      {toast && <div className="goa-toast">{toast}</div>}
    </div>
  );
}

export default function NewMatchPage() {
  return (
    <Suspense>
      <NewMatchPageInner />
    </Suspense>
  );
}