// app/heroes/[id]/page.tsx
"use client";

import { CSSProperties, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabase/client";
import { Hero } from "@/lib/heroes";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import Image from "next/image";
import { didWin, formatDate, getHero, renderStars } from "@/lib/match";
import { Swords, ScrollText, BookUser, CheckCircle2, Circle, X } from "lucide-react";

type Player = {
  id: string;
  name: string;
  mmr: number;
  avatar_url?: string | null;
};

type MatchPlayer = {
  player_id: string;
  team: "atlantis" | "titans" | "none";
  mmr_before: number;
  mmr_after: number;
  hero_id?: string | null;
  players: Player;
};

type Match = {
  id: string;
  match_number?: number;
  winner: "atlantis" | "titans" | "none";
  created_at: string;
  atlantis_avg_mmr: number;
  titans_avg_mmr: number;
  atlantis_mmr_change: number;
  titans_mmr_change: number;
  match_players: MatchPlayer[];
};

// Supabase returns the embedded `players` relation as an array when it
// can't infer a one-to-one cardinality from the foreign key, and as a
// single object when it can — normalize both shapes when loading.
type RawMatch = Omit<Match, "match_players"> & {
  match_players: (Omit<MatchPlayer, "players"> & {
    players: Player | Player[] | null;
  })[];
};

type TeamPanelProps = {
  label: string;
  labelClass: "atl" | "tit";
  players: MatchPlayer[];
  avgMmr: number;
  mmrChange: number;
  highlightHeroId: string;
  onSelectPlayer: (id: string) => void;
};

function HeroStarRating({
  complexity,
}: {
  complexity: number | string | undefined | null;
}) {
  const count = Number(complexity) || 0;
  return (
    <div className="goa-hero-star-row">
      {Array.from({ length: count }).map((_, i) => (
        <Image
          key={i}
          src="/icons/star.png"
          alt="★"
          width={16}
          height={16}
        />
      ))}
    </div>
  );
}

function TeamPanel({
  label,
  labelClass,
  players,
  avgMmr,
  mmrChange,
  highlightHeroId,
  onSelectPlayer,
}: TeamPanelProps) {
  return (
    <div className="goa-team">
      <div className="flex justify-between">
        <span className={`goa-team-head ${labelClass}`}>{label}</span>
        <span className={`goa-delta ${mmrChange >= 0 ? "pos" : "neg"}`}>
          {mmrChange >= 0 ? "▲" : "▼"}
          {Math.abs(mmrChange)}
        </span>
      </div>
      <div className="goa-avg-mmr">Avg {Math.round(avgMmr)} MMR</div>
      {players.map((p) => {
        const playedHero = getHero(p.hero_id);
        const isHighlighted = p.hero_id === highlightHeroId;
        return (
          <div
            key={p.player_id}
            className="goa-player-entry clickable"
            onClick={() => onSelectPlayer(p.player_id)}
          >
            <div className="goa-player-info">
              <span className="goa-player-name">
                <PlayerAvatar
                  avatarUrl={p.players.avatar_url}
                  name={p.players.name}
                  size={20}
                />
                {p.players.name}
              </span>
              <span className="goa-mmr-change">
                {p.mmr_before} → {p.mmr_after}
              </span>
            </div>
            {playedHero && (
              <span
                className={`goa-display-hero ${isHighlighted ? "highlight" : ""}`}
              >
                <Image
                  src={playedHero.icon}
                  alt={playedHero.name}
                  width={24}
                  height={24}
                  className="size-6"
                />
                {playedHero.name} {renderStars(playedHero.complexity)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function HeroDetailPage() {
  const params = useParams();
  const router = useRouter();
  const heroId = params?.id as string;

  const hero: Hero | undefined = getHero(heroId);

  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  // Players toggled on in the "Played by" list — when non-empty, match
  // history below is filtered to matches where at least one of them
  // played this specific hero. Multiple players can be highlighted at
  // once (an OR filter, not narrowed to only matches with all of them).
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set());

  const togglePlayerFilter = (playerId: string) => {
    setSelectedPlayerIds((prev) => {
      const next = new Set(prev);
      if (next.has(playerId)) next.delete(playerId);
      else next.add(playerId);
      return next;
    });
  };

  // Which of the two toggle-to-filter lists is showing — "Played by" is
  // the default; switching tabs never clears either list's own selection.
  const [statsTab, setStatsTab] = useState<"players" | "matchups">("players");

  // Opposing heroes toggled on in the "Hero Matchups" list — same OR-filter
  // shape as selectedPlayerIds above, but narrows to matches where this
  // hero faced one of the highlighted heroes on the other team.
  const [selectedMatchupHeroIds, setSelectedMatchupHeroIds] = useState<Set<string>>(new Set());

  const toggleMatchupFilter = (opponentHeroId: string) => {
    setSelectedMatchupHeroIds((prev) => {
      const next = new Set(prev);
      if (next.has(opponentHeroId)) next.delete(opponentHeroId);
      else next.add(opponentHeroId);
      return next;
    });
  };

  useEffect(() => {
    if (!heroId) return;

    const load = async () => {
      // 1. Fetch all match IDs ordered ascending to calculate global match numbers
      const { data: allMatches } = await supabaseClient
        .from("matches")
        .select("id")
        .order("created_at", { ascending: true });

      const matchNumberMap = new Map<string, number>();
      allMatches?.forEach((m, index) => {
        matchNumberMap.set(m.id, index + 1);
      });

      // 2. Get all match_ids where this hero was played
      const { data: mpData, error: mpError } = await supabaseClient
        .from("match_players")
        .select("match_id")
        .eq("hero_id", heroId);

      if (mpError || !mpData || mpData.length === 0) {
        setLoading(false);
        return;
      }

      const matchIds = [...new Set(mpData.map((r) => r.match_id))];

      // 3. Fetch details for those hero matches
      const { data: mData, error: mError } = await supabaseClient
        .from("matches")
        .select(
          `
          id, winner, created_at, atlantis_avg_mmr, titans_avg_mmr,
          atlantis_mmr_change, titans_mmr_change,
          match_players (
            player_id, team, mmr_before, mmr_after, hero_id,
            players ( id, name, mmr, avatar_url )
          )
        `,
        )
        .in("id", matchIds)
        .order("created_at", { ascending: false });

      if (mError || !mData) {
        setLoading(false);
        return;
      }

      const rawMatches = mData as RawMatch[];
      const normalized: Match[] = rawMatches.map((m) => ({
        ...m,
        match_number: matchNumberMap.get(m.id),
        match_players: (m.match_players ?? [])
          .map((mp): MatchPlayer | null => {
            const p = Array.isArray(mp.players) ? mp.players[0] : mp.players;
            if (!p) return null;
            return { ...mp, players: { ...p } };
          })
          .filter((mp): mp is MatchPlayer => mp !== null),
      }));

      setMatches(normalized);
      setLoading(false);
    };

    load();
  }, [heroId]);

  const stats = useMemo(() => {
    let wins = 0,
      losses = 0,
      draws = 0;
    const playerMap = new Map<
      string,
      { player: Player; wins: number; losses: number; draws: number }
    >();

    matches.forEach((m) => {
      const heroPlayers = m.match_players.filter((mp) => mp.hero_id === heroId);
      heroPlayers.forEach((mp) => {
        const isDraw = m.winner === "none";
        const won = didWin(mp.team, m.winner);
        if (isDraw) draws++;
        else if (won) wins++;
        else losses++;

        if (!playerMap.has(mp.player_id)) {
          playerMap.set(mp.player_id, {
            player: mp.players,
            wins: 0,
            losses: 0,
            draws: 0,
          });
        }
        const entry = playerMap.get(mp.player_id)!;
        if (isDraw) entry.draws++;
        else if (won) entry.wins++;
        else entry.losses++;
      });
    });

    const played = wins + losses + draws;
    const winRate = played === 0 ? 0 : Math.round((wins / played) * 100);
    const players = Array.from(playerMap.values()).sort(
      (a, b) =>
        b.wins + b.losses + b.draws - (a.wins + a.losses + a.draws),
    );

    return { wins, losses, draws, played, winRate, players };
  }, [matches, heroId]);

  // How this hero has fared against every opposing hero it's actually
  // faced — one datapoint per opposing team's hero pick in each match this
  // hero was played, counted from this hero's own side's result (so a
  // 2v2 match where the enemy team picked two heroes counts as a game
  // against each of those two, not split half a game each).
  const matchupStats = useMemo(() => {
    const map = new Map<string, { wins: number; losses: number; draws: number }>();
    matches.forEach((m) => {
      const heroPlayers = m.match_players.filter((mp) => mp.hero_id === heroId);
      heroPlayers.forEach((hp) => {
        const opposingTeam = hp.team === "atlantis" ? "titans" : "atlantis";
        const opposingHeroIds = m.match_players
          .filter((mp) => mp.team === opposingTeam && mp.hero_id)
          .map((mp) => mp.hero_id as string);
        const isDraw = m.winner === "none";
        const won = didWin(hp.team, m.winner);
        opposingHeroIds.forEach((oppHeroId) => {
          if (!map.has(oppHeroId)) map.set(oppHeroId, { wins: 0, losses: 0, draws: 0 });
          const entry = map.get(oppHeroId)!;
          if (isDraw) entry.draws++;
          else if (won) entry.wins++;
          else entry.losses++;
        });
      });
    });

    return Array.from(map.entries())
      .map(([opponentHeroId, rec]) => ({ opponentHeroId, ...rec }))
      .sort(
        (a, b) =>
          b.wins + b.losses + b.draws - (a.wins + a.losses + a.draws),
      );
  }, [matches, heroId]);

  // Whether `match` pitted this hero against `opponentHeroId` on the
  // other team — shared by the matchup filter below.
  const matchHasMatchup = (m: Match, opponentHeroId: string): boolean =>
    m.match_players
      .filter((mp) => mp.hero_id === heroId)
      .some((hp) => {
        const opposingTeam = hp.team === "atlantis" ? "titans" : "atlantis";
        return m.match_players.some(
          (mp) => mp.team === opposingTeam && mp.hero_id === opponentHeroId,
        );
      });

  // Matches actually rendered below — every match when neither filter is
  // active, otherwise narrowed by whichever of the "Played by" and "Hero
  // Matchups" filters are in use (each an OR across its own selections,
  // combined with the other as an AND).
  const visibleMatches = useMemo(() => {
    let list = matches;
    if (selectedPlayerIds.size > 0) {
      list = list.filter((m) =>
        m.match_players.some(
          (mp) => mp.hero_id === heroId && selectedPlayerIds.has(mp.player_id),
        ),
      );
    }
    if (selectedMatchupHeroIds.size > 0) {
      list = list.filter((m) =>
        Array.from(selectedMatchupHeroIds).some((oppId) => matchHasMatchup(m, oppId)),
      );
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matches, heroId, selectedPlayerIds, selectedMatchupHeroIds]);

  if (!hero) {
    return (
      <div className="goa-root goa-loading-screen">
        <div className="goa-loading-inner">
          <div className="goa-loading-icon">
            <Swords size={30} />
          </div>
          <p className="goa-loading-text wide">Hero not found</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="goa-root goa-loading-screen">
        <div className="goa-loading-inner">
          <div className="goa-loading-icon">
            <BookUser size={30} />
          </div>
          <p className="goa-loading-text wide">Consulting the chronicles…</p>
        </div>
      </div>
    );
  }

  // .goa-stat-val's default color is already gold-light, so the 45-59
  // "mid" tier needs no modifier class.
  const wrClass =
    stats.played === 0
      ? "text-muted"
      : stats.winRate >= 60
        ? "gain"
        : stats.winRate >= 45
          ? ""
          : "loss";

  return (
    <main className="goa-root">
      {/* Hero header */}
      <header className="goa-header hero-header">
        <div className="goa-hero-header-bg">
          <Image
            src={`/hero_avatars/${hero.id}.webp`}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="goa-hero-header-bg-fade" />
        </div>
        <div className="goa-hero-header-content">
          <h1 className="goa-title">{hero.name}</h1>
          <Image
            src={hero.icon}
            alt={hero.name}
            width={64}
            height={64}
            className="object-contain shrink-0 flex justify-self-center size-16"
          />
          <HeroStarRating complexity={hero.complexity} />
        </div>
      </header>

      {/* Stat tiles */}
      <div className="goa-stats-grid">
        {/* Win Rate */}
        <div className="goa-stat-tile">
          <div className="goa-stat-lbl">Win Rate</div>
          <div className={`goa-stat-val ${wrClass}`}>
            {stats.played === 0 ? "—" : `${stats.winRate}%`}
          </div>
          {stats.played > 0 && (
            <div className="goa-win-bar-wrap">
              <div
                className="goa-win-bar"
                style={
                  { "--bar-width": `${stats.winRate}%` } as CSSProperties
                }
              />
            </div>
          )}
        </div>

        {/* Games played */}
        <div className="goa-stat-tile">
          <div className="goa-stat-lbl">Games Played</div>
          <div className="goa-stat-val">{stats.played}</div>
          <div className="goa-stat-sub">total matches</div>
        </div>

        {/* Wins */}
        <div className="goa-stat-tile">
          <div className="goa-stat-lbl">Victories</div>
          <div className="goa-stat-val gain">{stats.wins}</div>
        </div>

        {/* Losses */}
        <div className="goa-stat-tile">
          <div className="goa-stat-lbl">Defeats</div>
          <div className="goa-stat-val loss">{stats.losses}</div>
        </div>

        {/* Draws */}
        {stats.draws > 0 && (
          <div className="goa-stat-tile">
            <div className="goa-stat-lbl">Draws</div>
            <div className="goa-stat-val draw">{stats.draws}</div>
          </div>
        )}
      </div>

      {/* Played by / Hero Matchups — tabbed, since both are just
          different ways of narrowing the same Match History below. */}
      {(stats.players.length > 0 || matchupStats.length > 0) && (
        <div className="goa-stats-card tight-top">
          <div className="goa-profile-tabs">
            <button
              className={`goa-profile-tab ${statsTab === "players" ? "active" : ""}`}
              onClick={() => setStatsTab("players")}
            >
              Played by
            </button>
            <button
              className={`goa-profile-tab ${statsTab === "matchups" ? "active" : ""}`}
              onClick={() => setStatsTab("matchups")}
            >
              Hero Matchups
            </button>
          </div>

          {statsTab === "players" &&
            (stats.players.length === 0 ? (
              <p className="goa-pool-empty">No players recorded</p>
            ) : (
              <div className="goa-hero-players-list">
                {stats.players.map(({ player, wins, losses, draws }) => {
                  const played = wins + losses + draws;
                  const pr = played === 0 ? 0 : Math.round((wins / played) * 100);
                  const selected = selectedPlayerIds.has(player.id);
                  return (
                    <div
                      key={player.id}
                      className={`goa-hero-player-row${selected ? " selected" : ""}`}
                      onClick={() => togglePlayerFilter(player.id)}
                    >
                      <PlayerAvatar
                        avatarUrl={player.avatar_url}
                        name={player.name}
                        size={28}
                      />
                      <span className="goa-hero-player-name">{player.name}</span>
                      <span
                        className={`goa-hero-player-pr ${pr >= 50 ? "goa-text-gain" : "goa-text-loss"}`}
                      >
                        {pr}%
                      </span>
                      <span className="goa-hero-player-wl">
                        <span className="goa-text-gain">{wins}W</span>/
                        <span className="goa-text-loss">{losses}L</span>
                        {draws > 0 && (
                          <>/<span className="goa-text-draw">{draws}D</span></>
                        )}
                      </span>
                      <span className="goa-hero-player-toggle">
                        {selected ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}

          {statsTab === "matchups" &&
            (matchupStats.length === 0 ? (
              <p className="goa-pool-empty">No matchups recorded</p>
            ) : (
              <div className="goa-hero-matchup-list">
                {matchupStats.map(({ opponentHeroId, wins, losses, draws }) => {
                  const opponentHero = getHero(opponentHeroId);
                  if (!opponentHero) return null;
                  const played = wins + losses + draws;
                  const wr = played === 0 ? 0 : Math.round((wins / played) * 100);
                  const selected = selectedMatchupHeroIds.has(opponentHeroId);
                  return (
                    <div
                      key={opponentHeroId}
                      className={`goa-hero-matchup-row${selected ? " selected" : ""}`}
                      onClick={() => toggleMatchupFilter(opponentHeroId)}
                    >
                      <Image
                        src={opponentHero.icon}
                        alt={opponentHero.name}
                        width={28}
                        height={28}
                        className="goa-hero-matchup-icon"
                      />
                      <span className="goa-hero-matchup-name">{opponentHero.name}</span>
                      <span
                        className={`goa-hero-player-pr ${wr >= 50 ? "goa-text-gain" : "goa-text-loss"}`}
                      >
                        {wr}%
                      </span>
                      <span className="goa-hero-player-wl">
                        <span className="goa-text-gain">{wins}W</span>/
                        <span className="goa-text-loss">{losses}L</span>
                        {draws > 0 && (
                          <>/<span className="goa-text-draw">{draws}D</span></>
                        )}
                      </span>
                      <span className="goa-hero-player-toggle">
                        {selected ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
        </div>
      )}

      {/* Match history for this hero */}
      <div className="goa-match-history-header">
        <ScrollText size={14} /> Match History
      </div>

      {(selectedPlayerIds.size > 0 || selectedMatchupHeroIds.size > 0) && (
        <div className="goa-hero-filter-note">
          <span>
            Showing matches
            {selectedPlayerIds.size > 0 && (
              <>
                {" "}for{" "}
                {stats.players
                  .filter(({ player }) => selectedPlayerIds.has(player.id))
                  .map(({ player }) => player.name)
                  .join(", ")}
              </>
            )}
            {selectedMatchupHeroIds.size > 0 && (
              <>
                {" "}vs{" "}
                {Array.from(selectedMatchupHeroIds)
                  .map((id) => getHero(id)?.name)
                  .filter(Boolean)
                  .join(", ")}
              </>
            )}
          </span>
          <button
            type="button"
            className="goa-hero-filter-clear"
            onClick={() => {
              setSelectedPlayerIds(new Set());
              setSelectedMatchupHeroIds(new Set());
            }}
          >
            <X size={12} /> Clear
          </button>
        </div>
      )}

      <div className="goa-matches">
        {visibleMatches.length === 0 && (
          <div className="goa-empty">
            <div className="goa-empty-icon">
              <Swords size={34} />
            </div>
            <p>
              {selectedPlayerIds.size > 0 || selectedMatchupHeroIds.size > 0
                ? "No matches for the highlighted filter(s)"
                : "No matches recorded"}
            </p>
          </div>
        )}

        {visibleMatches.map((match) => {
          const atlantis = match.match_players.filter(
            (p) => p.team === "atlantis",
          );
          const titans = match.match_players.filter((p) => p.team === "titans");

          // Who played the hero in this match
          const heroPlayers = match.match_players.filter(
            (mp) => mp.hero_id === heroId,
          );

          return (
            <div key={match.id} className="goa-match-card">
              <div className="goa-match-header">
                <span className="goa-match-date">
                  {match.match_number && (
                    <span className="goa-match-number wide bold">
                      #{match.match_number}
                    </span>
                  )}
                  {formatDate(match.created_at)}
                </span>
                <span className="goa-match-winner">
                  <span className={`goa-winner-badge ${match.winner}`}>
                    {match.winner === "none"
                      ? "DRAW"
                      : `${match.winner.toUpperCase()} VICTORY`}
                  </span>
                </span>
              </div>

              {/* Hero used by banner */}
              {heroPlayers.length > 0 && (
                <div className="goa-hero-used-by-banner">
                  <span className="goa-hero-used-by-label">
                    {hero.name} played by:
                  </span>
                  {heroPlayers.map((mp) => (
                    <span
                      key={mp.player_id}
                      className="goa-hero-used-by-player"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/players/${mp.player_id}`);
                      }}
                    >
                      <PlayerAvatar
                        avatarUrl={mp.players.avatar_url}
                        name={mp.players.name}
                        size={18}
                      />
                      <span
                        className={`goa-hero-used-by-name ${
                          match.winner === "none"
                            ? "draw"
                            : mp.team === match.winner
                              ? "win"
                              : "loss"
                        }`}
                      >
                        {mp.players.name}
                      </span>
                      <span className="goa-hero-used-by-result">
                        (
                        {match.winner == "none"
                          ? "Draw"
                          : mp.team === match.winner
                            ? "Won"
                            : "Lost"}
                        )
                      </span>
                    </span>
                  ))}
                </div>
              )}

              <div className="goa-teams">
                <TeamPanel
                  label="Atlantis"
                  labelClass="atl"
                  players={atlantis}
                  avgMmr={match.atlantis_avg_mmr}
                  mmrChange={match.atlantis_mmr_change}
                  highlightHeroId={heroId}
                  onSelectPlayer={(id) => router.push(`/players/${id}`)}
                />
                <TeamPanel
                  label="Titans"
                  labelClass="tit"
                  players={titans}
                  avgMmr={match.titans_avg_mmr}
                  mmrChange={match.titans_mmr_change}
                  highlightHeroId={heroId}
                  onSelectPlayer={(id) => router.push(`/players/${id}`)}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="goa-spacer-lg" />
    </main>
  );
}
