"use client";

import { useEffect, useState } from "react";
import { supabaseClient } from "@/lib/supabase/client";
import { HEROES } from "@/lib/heroes";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { useRouter } from "next/navigation";
import Image from "next/image";

type Player = {
  id: string;
  name: string;
  mmr: number;
  avatar_url?: string | null;
};

enum WinCondition {
  LAST_PUSH = "LAST_PUSH",
  THRONE = "THRONE",
  LIFE_COUNTER = "LIFE_COUNTER",
}

const winConditionLabel: Record<string, string> = {
  LAST_PUSH: "LAST PUSH",
  THRONE: "THRONE",
  LIFE_COUNTER: "LIFE COUNTER",
};

type Team = "atlantis" | "titans" | "none";

type MatchPlayer = {
  player_id: string;
  team: Team;
  players: Player;
  mmr_before: number;
  mmr_after: number;
  hero_id?: string;
};

type Match = {
  id: string;
  winner: Team;
  win_condition: WinCondition | null;
  created_at: string;
  atlantis_avg_mmr: number;
  titans_avg_mmr: number;
  atlantis_mmr_change: number;
  titans_mmr_change: number;
  match_players: MatchPlayer[];
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
};

const sortByName = (a: Player, b: Player) => a.name.localeCompare(b.name);

const MATCHES_PER_PAGE = 5;

const MATCH_SELECT = `
  id,
  winner,
  win_condition,
  created_at,
  atlantis_avg_mmr,
  titans_avg_mmr,
  atlantis_mmr_change,
  titans_mmr_change,
  match_players (
    player_id,
    team,
    mmr_before,
    mmr_after,
    hero_id,
    players (
      id,
      name,
      mmr,
      avatar_url
    )
  )
`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const normalizeMatch = (match: any): Match => {
  const normalizedMatchPlayers: MatchPlayer[] = (match.match_players ?? [])
    .map((mp: any): MatchPlayer | null => {
      const player = Array.isArray(mp.players) ? mp.players[0] : mp.players;
      if (!player) return null;
      return {
        player_id: mp.player_id,
        team: mp.team as Team,
        mmr_before: mp.mmr_before,
        mmr_after: mp.mmr_after,
        hero_id: mp.hero_id,
        players: {
          id: player.id,
          name: player.name,
          mmr: player.mmr,
          avatar_url: player.avatar_url,
        },
      };
    })
    .filter((mp: MatchPlayer | null): mp is MatchPlayer => mp !== null);

  return {
    id: match.id,
    winner: match.winner as Team,
    win_condition: match.win_condition as WinCondition,
    created_at: match.created_at,
    atlantis_avg_mmr: match.atlantis_avg_mmr,
    titans_avg_mmr: match.titans_avg_mmr,
    atlantis_mmr_change: match.atlantis_mmr_change,
    titans_mmr_change: match.titans_mmr_change,
    match_players: normalizedMatchPlayers,
  };
};

type PlayerStats = {
  wins: number;
  losses: number;
  winRate: number;
  mmr: number;
  name: string;
};

export default function MatchHistoryPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filterPlayerId, setFilterPlayerId] = useState("");
  const [totalCount, setTotalCount] = useState(0);
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);

  const renderStars = (n: number) => "★".repeat(n);

  const formatWinCondition = (wc?: WinCondition | null) => {
    if (!wc) return "";
    return `BY ${winConditionLabel[wc]}`;
  };

  // Load the player list once (small table, needed for the filter dropdown).
  useEffect(() => {
    const loadPlayers = async () => {
      const { data, error } = await supabaseClient
        .from("players")
        .select("id, name, mmr, avatar_url");
      if (error) {
        console.error(error);
        return;
      }
      setPlayers(data ?? []);
    };
    loadPlayers();
  }, []);

  // Fetches one page of matches, either for "all players" or for a specific
  // player (via match_players), and either replaces or appends to the list.
  const fetchMatches = async (
    playerId: string,
    offset: number,
    append: boolean,
  ) => {
    if (append) setLoadingMore(true);
    else setLoading(true);

    if (!playerId) {
      const { data, error, count } = await supabaseClient
        .from("matches")
        .select(MATCH_SELECT, { count: "exact" })
        .order("created_at", { ascending: false })
        .range(offset, offset + MATCHES_PER_PAGE - 1);

      if (error) {
        console.error(error);
      } else {
        const normalized = (data ?? []).map(normalizeMatch);
        setMatches((prev) => (append ? [...prev, ...normalized] : normalized));
        setTotalCount(count ?? 0);
      }
    } else {
      // Find which matches this player was in first (paginated + ordered by
      // match date), then fetch the full match data for just those matches.
      const {
        data: mpData,
        error: mpError,
        count,
      } = await supabaseClient
        .from("match_players")
        .select("match_id, matches!inner(created_at)", { count: "exact" })
        .eq("player_id", playerId)
        .order("created_at", { foreignTable: "matches", ascending: false })
        .range(offset, offset + MATCHES_PER_PAGE - 1);

      if (mpError) {
        console.error(mpError);
      } else {
        const matchIds = (mpData ?? []).map((row) => row.match_id);
        if (matchIds.length === 0) {
          if (!append) setMatches([]);
        } else {
          const { data, error } = await supabaseClient
            .from("matches")
            .select(MATCH_SELECT)
            .in("id", matchIds)
            .order("created_at", { ascending: false });

          if (error) {
            console.error(error);
          } else {
            const normalized = (data ?? []).map(normalizeMatch);
            setMatches((prev) =>
              append ? [...prev, ...normalized] : normalized,
            );
          }
        }
        setTotalCount(count ?? 0);
      }
    }

    if (append) setLoadingMore(false);
    else setLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchMatches(filterPlayerId, 0, false);
  }, [filterPlayerId]);

  const handleLoadMore = () => {
    fetchMatches(filterPlayerId, matches.length, true);
  };

  // Win/loss stats need to cover ALL of a player's matches, not just the
  // page that's currently loaded, so this is fetched independently.
  useEffect(() => {
    if (!filterPlayerId) return;

    const loadStats = async () => {
      const { data, error } = await supabaseClient
        .from("match_players")
        .select("team, matches!inner(winner)")
        .eq("player_id", filterPlayerId);

      if (error) {
        console.error(error);
        return;
      }

      let wins = 0;
      let losses = 0;
      (data ?? []).forEach((row) => {
        const matchInfo = Array.isArray(row.matches)
          ? row.matches[0]
          : row.matches;
        if (!matchInfo) return;
        if (row.team === matchInfo.winner) wins++;
        else losses++;
      });

      const total = wins + losses;
      const winRate = total === 0 ? 0 : (wins / total) * 100;
      const player = players.find((p) => p.id === filterPlayerId);
      setPlayerStats({
        wins,
        losses,
        winRate,
        mmr: player?.mmr ?? 1000,
        name: player?.name ?? "Unknown",
      });
    };

    loadStats();
  }, [filterPlayerId, players]);

  const router = useRouter();
  const goToProfile = (id: string) => router.push(`/players/${id}`);

  const hasMore = matches.length < totalCount;
  const displayedStats = filterPlayerId ? playerStats : null;

  if (loading) {
    return (
      <div
        className="goa-root"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📜</div>
          <p
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: "0.75rem",
              letterSpacing: "0.2em",
              color: "var(--muted)",
              textTransform: "uppercase",
            }}
          >
            Consulting the archives…
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="goa-root">
      <button className="goa-back" onClick={() => router.back()}>
        <span className="goa-back-arrow">‹</span> Home
      </button>
      <header className="goa-header">
        <div className="goa-crown">📜</div>
        <h1 className="goa-title">Battle Archives</h1>
        <p className="goa-subtitle">Guards of Atlantis II</p>
      </header>

      {/* Filter */}
      <div className="goa-filter-wrap">
        <select
          className="goa-select"
          value={filterPlayerId}
          onChange={(e) => setFilterPlayerId(e.target.value)}
        >
          <option value="">⚔ All Players</option>
          {[...players].sort(sortByName).map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Player stats */}
      {displayedStats && (
        <div className="goa-stats-card">
          <div className="goa-stats-head">
            <PlayerAvatar
              avatarUrl={
                players.find((p) => p.id === filterPlayerId)?.avatar_url
              }
              name={displayedStats.name}
              size={32}
            />
            {displayedStats.name}
          </div>
          <div className="goa-stats-grid">
            <div className="goa-stat">
              <div className="goa-stat-label">Rating</div>
              <div className="goa-stat-value">{displayedStats.mmr}</div>
              <div className="goa-stat-sub">current MMR</div>
            </div>
            <div className="goa-stat">
              <div className="goa-stat-label">Win Rate</div>
              <div className="goa-stat-value">
                {displayedStats.winRate.toFixed(1)}%
              </div>
              <div className="goa-stat-sub">
                {displayedStats.wins + displayedStats.losses} battles
              </div>
            </div>
            <div className="goa-stat">
              <div className="goa-stat-label">Victories</div>
              <div className="goa-stat-value" style={{ color: "var(--gain)" }}>
                {displayedStats.wins}
              </div>
            </div>
            <div className="goa-stat">
              <div className="goa-stat-label">Defeats</div>
              <div className="goa-stat-value" style={{ color: "var(--loss)" }}>
                {displayedStats.losses}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Match list */}
      <div className="goa-matches">
        {matches.length === 0 && (
          <div className="goa-empty">
            <div className="goa-empty-icon">⚔</div>
            <p>No battles recorded</p>
          </div>
        )}

        {matches.map((match, index) => {
          const matchNumber = totalCount - index;
          const atlantis = match.match_players.filter(
            (p) => p.team === "atlantis",
          );
          const titans = match.match_players.filter((p) => p.team === "titans");

          let matchBorderClass = "";
          if (filterPlayerId) {
            const playerEntry = match.match_players.find(
              (mp) => mp.player_id === filterPlayerId,
            );
            if (playerEntry) {
              matchBorderClass =
                playerEntry.team === match.winner ? "match-win" : "match-loss";
            }
          }

          return (
            <div
              key={match.id}
              className={`goa-match-card ${matchBorderClass}`}
            >
              <div className="goa-match-header">
                <span className="goa-match-date">
                  <span style={{ opacity: 0.75, marginRight: "0.35rem" }}>
                    #{matchNumber}
                  </span>
                  · {formatDate(match.created_at)}
                </span>
                <span className="goa-match-winner">
                  <span className={`goa-winner-badge ${match.winner}`}>
                    {match.winner === "none"
                      ? "DRAW"
                      : `${match.winner.toUpperCase()} VICTORY`}{" "}
                    {formatWinCondition(match.win_condition)}
                  </span>
                </span>
              </div>

              <div className="goa-teams">
                {/* Atlantis */}
                <div className="goa-team">
                  <div className="flex justify-between">
                    <span className="goa-team-head atl">Atlantis</span>
                    <span
                      className={`goa-delta ${match.atlantis_mmr_change >= 0 ? "pos" : "neg"}`}
                    >
                      {match.atlantis_mmr_change >= 0 ? "▲" : "▼"}
                      {Math.abs(match.atlantis_mmr_change)}
                    </span>
                  </div>
                  <div className="goa-avg-mmr">
                    Avg {Math.round(match.atlantis_avg_mmr)} MMR
                  </div>
                  {atlantis.map((p) => {
                    return (
                      <div
                        key={p.player_id}
                        className="goa-player-entry"
                        onClick={() => goToProfile(p.player_id)}
                      >
                        <div className="goa-player-info">
                          <span className="goa-player-name">
                            <PlayerAvatar
                              avatarUrl={p.players.avatar_url}
                              name={p.players.name}
                              size={32}
                            />
                            {p.players.name}
                          </span>
                          <span className="goa-mmr-change">
                            {p.mmr_before} → {p.mmr_after}
                          </span>
                        </div>
                        <span className="goa-display-hero">
                          <Image
                            src={"/heroes/" + p.hero_id + "_icon.png"}
                            alt={p.hero_id || "unknown hero"}
                            width={24}
                            height={24}
                            style={{
                              objectFit: "contain",
                              flexShrink: 0,
                              marginLeft: "0.2rem",
                            }}
                          />
                          {HEROES.find((h) => h.id === p.hero_id)?.name}{" "}
                          {renderStars(
                            parseInt(
                              HEROES.find((h) => h.id === p.hero_id)
                                ?.complexity || "",
                            ),
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Titans */}
                <div className="goa-team">
                  <div className="flex justify-between">
                    <span className="goa-team-head tit">Titans</span>
                    <span
                      className={`goa-delta ${match.titans_mmr_change >= 0 ? "pos" : "neg"}`}
                    >
                      {match.titans_mmr_change >= 0 ? "▲" : "▼"}
                      {Math.abs(match.titans_mmr_change)}
                    </span>
                  </div>
                  <div className="goa-avg-mmr">
                    Avg {Math.round(match.titans_avg_mmr)} MMR
                  </div>
                  {titans.map((p) => {
                    return (
                      <div
                        key={p.player_id}
                        className="goa-player-entry"
                        onClick={() => goToProfile(p.player_id)}
                      >
                        <div className="goa-player-info">
                          <span className="goa-player-name">
                            <PlayerAvatar
                              avatarUrl={p.players.avatar_url}
                              name={p.players.name}
                              size={32}
                            />
                            {p.players.name}
                          </span>
                          <span className="goa-mmr-change">
                            {p.mmr_before} → {p.mmr_after}
                          </span>
                        </div>
                        <span className="goa-display-hero">
                          <Image
                            src={"/heroes/" + p.hero_id + "_icon.png"}
                            alt={p.hero_id || "unknown hero"}
                            width={24}
                            height={24}
                            style={{
                              objectFit: "contain",
                              flexShrink: 0,
                              marginLeft: "0.2rem",
                            }}
                          />
                          {HEROES.find((h) => h.id === p.hero_id)?.name}{" "}
                          {renderStars(
                            parseInt(
                              HEROES.find((h) => h.id === p.hero_id)
                                ?.complexity || "",
                            ),
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {matches.length > 0 && (
        <div
          className="goa-pagination"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "0.75rem",
            marginBottom: "2rem",
          }}
        >
          <p
            className="goa-pagination-count"
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: "0.7rem",
              letterSpacing: "0.15em",
              color: "var(--muted)",
              textTransform: "uppercase",
              margin: 0,
            }}
          >
            Showing {matches.length} of {totalCount} battles
          </p>
          {hasMore && (
            <button
              className="goa-load-more"
              onClick={handleLoadMore}
              disabled={loadingMore}
              style={{
                fontFamily: "'Cinzel', serif",
                fontSize: "0.75rem",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                padding: "0.6rem 1.5rem",
                cursor: loadingMore ? "default" : "pointer",
                opacity: loadingMore ? 0.6 : 1,
              }}
            >
              {loadingMore ? "Loading…" : "Load More Battles"}
            </button>
          )}
        </div>
      )}
    </main>
  );
}