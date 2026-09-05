"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabaseClient } from "@/lib/supabase/client";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { Checkbox } from "@/components/ui/checkbox";
import { didWin } from "@/lib/match";
import { getCompletedBadges } from "@/lib/heroWinBonus";
import { Badge } from "@/lib/badges";
import { Trophy, Medal, Shield, Swords } from "lucide-react";

type Player = {
  id: string;
  name: string;
  mmr: number;
  rank: number;
  avatar_url?: string | null;
  last_played_match_number: number;
};

type ProtectedRank = {
  protectedRank: number;
  // Ranked above a player with higher MMR who couldn't overtake them —
  // shown with a shield.
  hasShield: boolean;
  // Has higher MMR than the player directly above but couldn't overtake
  // them — shown with a sword.
  needsSword: boolean;
  // Games that can pass without this player playing before they're
  // considered inactive (and lose the shield's protection).
  gamesUntilInactive: number;
};

type Match = {
  id: string;
  match_number: number;
  winner: "atlantis" | "titans" | "none";
  match_players: {
    player_id: string;
    team: "atlantis" | "titans";
    hero_id: string | null;
  }[];
};

type PlayerStats = {
  id: string;
  name: string;
  mmr: number;
  rank: number;
  avatar_url?: string | null;
  wins: number;
  losses: number;
  draws: number;
  matches: number;
  winRate: number;
  last_played_match_number: number;
  badges: Badge[];
};

type SortKey = "rank" | "name" | "mmr" | "winRate" | "wl" | "matches";

export default function LeaderboardPage() {
  const router = useRouter();
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [maxMatchNumber, setMaxMatchNumber] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [sortAsc, setSortAsc] = useState(true);
  const [showAllPlayers, setShowAllPlayers] = useState(false);

  const MINIMUM_MATCHES_FOR_DISPLAY = 5;
  const INACTIVE_GAME_THRESHOLD = 4;

  useEffect(() => {
    const load = async () => {
      const [
        { data: playersData },
        { data: matchesData },
        { data: maxMatchData },
      ] = await Promise.all([
        supabaseClient
          .from("players")
          .select("id, name, mmr, rank, avatar_url, last_played_match_number"),
        supabaseClient
          .from("matches")
          .select(
            "id, match_number, winner, match_players ( player_id, team, hero_id )",
          )
          .order("created_at", { ascending: false }),
        supabaseClient
          .from("matches")
          .select("match_number")
          .order("match_number", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      setPlayers(playersData ?? []);
      setMatches(matchesData ?? []);
      setMaxMatchNumber(maxMatchData?.match_number ?? 0);
      setLoading(false);
    };
    load();
  }, []);

  // Optimized single-pass statistics calculation
  const leaderboard: PlayerStats[] = useMemo(() => {
    const statsMap = new Map<
      string,
      {
        wins: number;
        losses: number;
        draws: number;
        matches: number;
        wonHeroIds: Set<string>;
      }
    >();

    matches.forEach((match) => {
      match.match_players?.forEach((mp) => {
        const stats = statsMap.get(mp.player_id) ?? {
          wins: 0,
          losses: 0,
          draws: 0,
          matches: 0,
          wonHeroIds: new Set<string>(),
        };
        stats.matches++;
        if (match.winner === "none") {
          stats.draws++;
        } else if (didWin(mp.team, match.winner)) {
          stats.wins++;
          if (mp.hero_id) stats.wonHeroIds.add(mp.hero_id);
        } else {
          stats.losses++;
        }
        statsMap.set(mp.player_id, stats);
      });
    });

    return players.map((player) => {
      const stats = statsMap.get(player.id) ?? {
        wins: 0,
        losses: 0,
        draws: 0,
        matches: 0,
        wonHeroIds: new Set<string>(),
      };
      return {
        id: player.id,
        name: player.name,
        mmr: player.mmr,
        rank: player.rank,
        avatar_url: player.avatar_url ?? null,
        last_played_match_number: player.last_played_match_number ?? 0,
        wins: stats.wins,
        losses: stats.losses,
        draws: stats.draws,
        matches: stats.matches,
        winRate: stats.matches === 0 ? 0 : (stats.wins / stats.matches) * 100,
        badges: getCompletedBadges(stats.wonHeroIds),
      };
    });
  }, [players, matches]);

  const playersToDisplay = useMemo(() => {
    if (showAllPlayers) return leaderboard;
    return leaderboard.filter((p) => p.matches >= MINIMUM_MATCHES_FOR_DISPLAY);
  }, [leaderboard, showAllPlayers]);

  const sortedByRank = useMemo(
    () => [...playersToDisplay].sort((a, b) => a.rank - b.rank),
    [playersToDisplay],
  );

  const protectedRankMap = useMemo(() => {
    const latestMatch = matches.find((m) => m.match_number === maxMatchNumber);

    // Rank each player held going into the latest match (current standings).
    const rankById = new Map(sortedByRank.map((p) => [p.id, p.rank]));

    // Team each player was on in the latest match, and who lost it (draws
    // award MMR to both sides, so only a decisive result counts as a loss).
    const latestMatchTeam = new Map<string, "atlantis" | "titans">();
    const latestMatchLosers = new Set<string>();
    if (latestMatch) {
      latestMatch.match_players.forEach((mp) => {
        latestMatchTeam.set(mp.player_id, mp.team);
        if (latestMatch.winner !== "none" && mp.team !== latestMatch.winner) {
          latestMatchLosers.add(mp.player_id);
        }
      });
    }

    // Best (lowest) pre-match rank among the losing side of the latest
    // match — beating a team that included this player proves you beat
    // someone ranked at least that high.
    let losingTeamBestRank: number | undefined;
    if (latestMatch && latestMatch.winner !== "none") {
      latestMatchLosers.forEach((id) => {
        const rank = rankById.get(id);
        if (
          rank !== undefined &&
          (losingTeamBestRank === undefined || rank < losingTeamBestRank)
        ) {
          losingTeamBestRank = rank;
        }
      });
    }

    const isParticipant = (player: PlayerStats) =>
      maxMatchNumber > 0 && player.last_played_match_number === maxMatchNumber;

    // Counted by real match rows played after last_played_match_number, not
    // by subtracting match_number values — the sequence backing
    // match_number can skip numbers (e.g. a rolled back insert), so
    // arithmetic on it undercounts inactivity whenever a gap exists.
    const gamesSincePlayed = (lastPlayedMatchNumber: number) =>
      matches.filter((m) => m.match_number > lastPlayedMatchNumber).length;

    const isInactive = (player: PlayerStats) =>
      maxMatchNumber > 0 &&
      gamesSincePlayed(player.last_played_match_number) >=
        INACTIVE_GAME_THRESHOLD;

    // Player A can overtake player B only if A's MMR is higher AND either:
    // A's team won the latest match against a losing side that included
    // someone ranked at least as high as B (B doesn't need to have played,
    // or even be on the losing team — a teammate of A works too); or A sat
    // out the latest match while B played it and lost MMR; or B has been
    // inactive for at least INACTIVE_GAME_THRESHOLD games.
    const canOvertake = (a: PlayerStats, b: PlayerStats) => {
      if (a.mmr <= b.mmr) return false;

      const aPlayed = isParticipant(a);
      const bPlayed = isParticipant(b);
      const aBeatSomeoneAboveB =
        aPlayed &&
        latestMatch !== undefined &&
        latestMatch.winner !== "none" &&
        latestMatchTeam.get(a.id) === latestMatch.winner &&
        losingTeamBestRank !== undefined &&
        losingTeamBestRank <= b.rank;
      const aSatOutBLost = !aPlayed && bPlayed && latestMatchLosers.has(b.id);

      return aBeatSomeoneAboveB || aSatOutBLost || isInactive(b);
    };

    // Let each player climb past the player directly above them (in
    // current-rank order) for as long as the overtake rule permits it.
    const workingOrder = [...sortedByRank];
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

    // Any player still ranked above someone with higher MMR after the climb
    // above is exactly a blocked overtake: the player below has higher MMR
    // but couldn't pass (sword), and the player above is holding them off
    // (shield).
    const shieldIds = new Set<string>();
    const swordIds = new Set<string>();
    for (let i = 0; i < workingOrder.length - 1; i++) {
      const above = workingOrder[i];
      const below = workingOrder[i + 1];
      if (below.mmr > above.mmr) {
        shieldIds.add(above.id);
        swordIds.add(below.id);
      }
    }

    const protectedRanks = new Map<string, ProtectedRank>();
    workingOrder.forEach((player, idx) => {
      const gamesUntilInactive = Math.max(
        0,
        INACTIVE_GAME_THRESHOLD -
          gamesSincePlayed(player.last_played_match_number),
      );
      protectedRanks.set(player.id, {
        protectedRank: idx + 1,
        hasShield: shieldIds.has(player.id),
        needsSword: swordIds.has(player.id),
        gamesUntilInactive,
      });
    });

    return protectedRanks;
  }, [sortedByRank, matches, maxMatchNumber]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const sorted = useMemo(() => {
    const list = [...playersToDisplay];
    list.sort((a, b) => {
      if (sortKey === "name")
        return sortAsc
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      let valA = 0,
        valB = 0;
      switch (sortKey) {
        case "mmr":
          valA = a.mmr;
          valB = b.mmr;
          break;
        case "winRate":
          valA = a.winRate;
          valB = b.winRate;
          break;
        case "wl":
          valA = a.wins - a.losses;
          valB = b.wins - b.losses;
          break;
        case "matches":
          valA = a.matches;
          valB = b.matches;
          break;
        case "rank": {
          valA = protectedRankMap.get(a.id)?.protectedRank ?? 0;
          valB = protectedRankMap.get(b.id)?.protectedRank ?? 0;
          break;
        }
      }
      return sortAsc ? valA - valB : valB - valA;
    });
    return list;
  }, [playersToDisplay, sortKey, sortAsc, protectedRankMap]);

  const top3 = sorted.slice(0, 3);
  const plinthClass = ["first", "second", "third"];
  const sortCols: { key: SortKey; label: string }[] = [
    { key: "rank", label: "Rank" },
    { key: "mmr", label: "MMR" },
    { key: "winRate", label: "Win %" },
    { key: "wl", label: "W/L" },
    { key: "matches", label: "Battles" },
    { key: "name", label: "Name" },
  ];

  const goToProfile = (id: string) => router.push(`/players/${id}`);

  if (loading) {
    return (
      <div className="goa-root goa-loading-screen">
        <div className="goa-loading-inner">
          <div className="goa-loading-icon">
            <Trophy size={32} />
          </div>
          <p className="goa-loading-text">Tallying the honours…</p>
        </div>
      </div>
    );
  }

  return (
    <main className="goa-root">
      <header className="goa-header">
        <div className="goa-crown">
          <Trophy size={30} />
        </div>
        <h1 className="goa-title">Hall of Honour</h1>
        <p className="goa-subtitle">Guards of Atlantis II</p>
      </header>

      {/* Podium — top 3 */}
      {top3.length >= 1 && (
        <div className="goa-podium">
          {[1, 0, 2].map((idx) => {
            const p = top3[idx];
            if (!p) return <div key={idx} className="goa-podium-slot" />;
            const cls = plinthClass[idx];
            return (
              <div
                key={p.id}
                className={`goa-podium-slot ${cls}`}
                onClick={() => goToProfile(p.id)}
              >
                <PlayerAvatar
                  avatarUrl={p.avatar_url}
                  name={p.name}
                  size={64}
                  borderColor={
                    idx === 0
                      ? "rgba(201,151,58,0.8)"
                      : idx === 1
                        ? "rgba(192,192,192,0.7)"
                        : "rgba(180,100,40,0.7)"
                  }
                />
                <span className="goa-podium-name">{p.name}</span>
                <span className="goa-podium-mmr">{p.mmr} MMR</span>
                <div className={`goa-podium-plinth ${cls}`}>
                  <span className="goa-podium-medal">
                    <Medal size={20} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Sort pills */}
      <div className="goa-sort-bar">
        {sortCols.map(({ key, label }) => (
          <button
            key={key}
            className={`goa-sort-btn ${sortKey === key ? "active" : ""}`}
            onClick={() => handleSort(key)}
          >
            {label}
            {sortKey === key && (
              <span className="goa-sort-arrow sm">{sortAsc ? "▲" : "▼"}</span>
            )}
          </button>
        ))}
      </div>

      <div className="goa-checkbox-container">
        <Checkbox
          id="show-all-players"
          checked={showAllPlayers}
          onCheckedChange={(checked) => setShowAllPlayers(checked === true)}
          className="border-[#ebc931ab] data-[state=checked]:border-[#ebc931ab] data-[state=checked]:bg-[#b7a14238] inline-block"
        />
        <label htmlFor="show-all-players" className="goa-tap-hint">
          Show all players
        </label>
      </div>

      {/* Table */}
      <div className="goa-table-wrap">
        <div className="goa-header-row">
          <span
            className={`goa-col-head center ${sortKey === "rank" ? "active" : ""}`}
            onClick={() => handleSort("rank")}
          >
            #
          </span>
          <span
            className={`goa-col-head ${sortKey === "name" ? "active" : ""}`}
            onClick={() => handleSort("name")}
          >
            Name
          </span>
          <span
            className={`goa-col-head right ${sortKey === "mmr" ? "active" : ""}`}
            onClick={() => handleSort("mmr")}
          >
            MMR
          </span>
          <span
            className={`goa-col-head right ${sortKey === "winRate" ? "active" : ""}`}
            onClick={() => handleSort("winRate")}
          >
            Win%
          </span>
          <span
            className={`goa-col-head right ${sortKey === "wl" ? "active" : ""}`}
            onClick={() => handleSort("wl")}
          >
            W/L
          </span>
          <span
            className={`goa-col-head right goa-col-head-battles ${sortKey === "matches" ? "active" : ""}`}
            onClick={() => handleSort("matches")}
          >
            Bat.
          </span>
        </div>

        {sorted.map((p) => {
          const rankInfo = protectedRankMap.get(p.id);
          const rank = rankInfo?.protectedRank ?? 0;
          const hasShield = rankInfo?.hasShield ?? false;
          const needsSword = rankInfo?.needsSword ?? false;
          const gamesUntilInactive = rankInfo?.gamesUntilInactive ?? 0;

          const rankCls =
            rank === 1 ? "r1" : rank === 2 ? "r2" : rank === 3 ? "r3" : "";
          const rowCls = rank <= 3 ? `rank-${rank}` : "";

          return (
            <div
              key={p.id}
              className={`goa-row ${rowCls}`}
              onClick={() => goToProfile(p.id)}
            >
              <span className={`goa-cell-rank ${rankCls}`}>
                {rank <= 3 ? (
                  <Medal size={14} className="inline-block align-middle" />
                ) : (
                  `#${rank}`
                )}
                {hasShield && (
                  <span
                    className="goa-rank-badge"
                    title={`Protected: the player below has higher MMR but hasn't beaten this player head-to-head. Becomes inactive (and loses protection) in ${gamesUntilInactive} more game${gamesUntilInactive === 1 ? "" : "s"} if they don't play.`}
                  >
                    <Shield size={11} className="inline-block align-text-bottom" />
                    {gamesUntilInactive}
                  </span>
                )}
                {needsSword && (
                  <span
                    className="goa-rank-badge"
                    title="Blocked: has higher MMR than the player above but must beat them to claim this rank"
                  >
                    <Swords size={11} className="inline-block align-text-bottom" />
                  </span>
                )}
              </span>
              <span className="goa-cell-name">
                <PlayerAvatar
                  avatarUrl={p.avatar_url}
                  name={p.name}
                  size={26}
                />
                {p.name}
                {p.badges.length > 0 && (
                  <span className="goa-player-badges">
                    {p.badges.map((b) => (
                      <Image
                        key={b.id}
                        src={b.icon}
                        alt={b.name}
                        title={b.name}
                        width={14}
                        height={14}
                      />
                    ))}
                  </span>
                )}
                <span className="goa-name-arrow">›</span>
              </span>
              <span className="goa-cell-mmr">{p.mmr}</span>
              <span
                className={`goa-cell-wr ${p.winRate >= 50 ? "good" : "bad"}`}
              >
                {p.winRate.toFixed(1)}%
              </span>
              <span className="goa-cell-wl">
                <span className="goa-wins">{p.wins}</span>
                <span className="goa-wl-sep">/</span>
                <span className="goa-losses">{p.losses}</span>
                {p.draws > 0 && (
                  <>
                    <span className="goa-wl-sep">/</span>
                    <span className="goa-draws">{p.draws}</span>
                  </>
                )}
              </span>
              <span className="goa-cell-m">{p.matches}</span>
            </div>
          );
        })}
      </div>
    </main>
  );
}
