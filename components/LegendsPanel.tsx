"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Flame, Sparkles, Skull, Repeat2, Shuffle, Heart, HeartCrack, Swords, Dumbbell, Coins } from "lucide-react";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { getHero } from "@/lib/match";
import {
  computeFunStats,
  FunStatsMatch,
  MIN_DUO_GAMES,
  type DuoEntry,
  type NemesisEntry,
} from "@/lib/funStats";

type Player = {
  id: string;
  name: string;
  avatar_url?: string | null;
};

// Ranks a top-N list by value, giving tied entries the same rank (e.g.
// two players tied for 1st are both rank 1, and the next distinct value
// is rank 2) rather than a plain 1/2/3 index.
function withRank<T>(entries: T[], getValue: (e: T) => number): { rank: number; entry: T }[] {
  let rank = 0;
  let lastValue: number | undefined;
  return entries.map((entry) => {
    const v = getValue(entry);
    if (lastValue === undefined || v !== lastValue) {
      rank++;
      lastValue = v;
    }
    return { rank, entry };
  });
}

// The "Legends" tab on /leaderboard — a record book of top-3 trivia
// (streaks, one-tricks, duos, bounties) derived from the same matches the
// Rankings tab already fetched. Takes players/matches as props rather than
// fetching its own copy, since LeaderboardPage already has both in state.
export function LegendsPanel({ players, matches }: { players: Player[]; matches: FunStatsMatch[] }) {
  const router = useRouter();
  const playerMap = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
  const stats = useMemo(() => computeFunStats(matches), [matches]);
  const goToProfile = (id: string) => router.push(`/players/${id}`);

  return (
    <>
      {/* Longest win streak */}
      <StatCard icon={<Flame size={16} />} title="On Fire" description="Longest win streak">
        {stats.longestWinStreak.length === 0 ? (
          <Empty />
        ) : (
          withRank(stats.longestWinStreak, (e) => e.length).map(({ rank, entry: e }) => (
            <PlayerRow
              key={e.playerId}
              rank={rank}
              player={playerMap.get(e.playerId)}
              onClick={() => goToProfile(e.playerId)}
              value={`${e.length} wins`}
              sub={`Battles #${e.startMatchNumber}–#${e.endMatchNumber}`}
            />
          ))
        )}
      </StatCard>

      {/* Current active win streak */}
      <StatCard icon={<Sparkles size={16} />} title="Hot Streak" description="Current active win streak">
        {stats.hotStreak.length === 0 ? (
          <Empty />
        ) : (
          withRank(stats.hotStreak, (e) => e.length).map(({ rank, entry: e }) => (
            <PlayerRow
              key={e.playerId}
              rank={rank}
              player={playerMap.get(e.playerId)}
              onClick={() => goToProfile(e.playerId)}
              value={`${e.length} wins`}
              sub={`Since Battle #${e.startMatchNumber}`}
            />
          ))
        )}
      </StatCard>

      {/* Longest losing streak */}
      <StatCard icon={<Skull size={16} />} title="Cursed Run" description="Longest losing streak">
        {stats.longestLossStreak.length === 0 ? (
          <Empty />
        ) : (
          withRank(stats.longestLossStreak, (e) => e.length).map(({ rank, entry: e }) => (
            <PlayerRow
              key={e.playerId}
              rank={rank}
              player={playerMap.get(e.playerId)}
              onClick={() => goToProfile(e.playerId)}
              value={`${e.length} losses`}
              sub={`Battles #${e.startMatchNumber}–#${e.endMatchNumber}`}
            />
          ))
        )}
      </StatCard>

      {/* Most games on one hero */}
      <StatCard icon={<Repeat2 size={16} />} title="One-Trick" description="Most battles played as a single hero">
        {stats.mostGamesOneHero.length === 0 ? (
          <Empty />
        ) : (
          withRank(stats.mostGamesOneHero, (e) => e.count).map(({ rank, entry: e }) => {
            const hero = getHero(e.heroId);
            return (
              <PlayerRow
                key={e.playerId}
                rank={rank}
                player={playerMap.get(e.playerId)}
                onClick={() => goToProfile(e.playerId)}
                value={`${e.count}×`}
                sub={hero?.name}
                leadingIcon={
                  hero ? (
                    <Image
                      src={hero.icon}
                      alt={hero.name}
                      width={28}
                      height={28}
                      className="goa-funstat-hero-icon"
                    />
                  ) : undefined
                }
              />
            );
          })
        )}
      </StatCard>

      {/* Most heroes played */}
      <StatCard icon={<Shuffle size={16} />} title="Most Versatile" description="Most distinct heroes played">
        {stats.mostHeroesPlayed.length === 0 ? (
          <Empty />
        ) : (
          withRank(stats.mostHeroesPlayed, (e) => e.count).map(({ rank, entry: e }) => (
            <PlayerRow
              key={e.playerId}
              rank={rank}
              player={playerMap.get(e.playerId)}
              onClick={() => goToProfile(e.playerId)}
              value={`${e.count} heroes`}
            />
          ))
        )}
      </StatCard>

      {/* Best duo */}
      <StatCard
        icon={<Heart size={16} />}
        title="Best Duo"
        description={`Highest win rate as teammates (min. ${MIN_DUO_GAMES} battles together)`}
      >
        {stats.bestDuo.length === 0 ? (
          <Empty text={`No pair has played ${MIN_DUO_GAMES} battles together yet`} />
        ) : (
          withRank(stats.bestDuo, (e) => e.winRate).map(({ rank, entry: e }, i) => (
            <DuoRow key={i} rank={rank} entry={e} playerMap={playerMap} onClick={goToProfile} valueClass="gain" />
          ))
        )}
      </StatCard>

      {/* Worst duo */}
      <StatCard
        icon={<HeartCrack size={16} />}
        title="Worst Duo"
        description={`Lowest win rate as teammates (min. ${MIN_DUO_GAMES} battles together)`}
      >
        {stats.worstDuo.length === 0 ? (
          <Empty text={`No pair has played ${MIN_DUO_GAMES} battles together yet`} />
        ) : (
          withRank(stats.worstDuo, (e) => e.winRate).map(({ rank, entry: e }, i) => (
            <DuoRow key={i} rank={rank} entry={e} playerMap={playerMap} onClick={goToProfile} valueClass="loss" />
          ))
        )}
      </StatCard>

      {/* Nemesis */}
      <StatCard icon={<Swords size={16} />} title="Nemesis" description="Most-played head-to-head rivalry">
        {stats.nemesis.length === 0 ? (
          <Empty />
        ) : (
          withRank(stats.nemesis, (e) => e.games).map(({ rank, entry: e }, i) => (
            <NemesisRow key={i} rank={rank} entry={e} playerMap={playerMap} onClick={goToProfile} />
          ))
        )}
      </StatCard>

      {/* Iron Man */}
      <StatCard icon={<Dumbbell size={16} />} title="Iron Man" description="Most battles played">
        {stats.ironMan.length === 0 ? (
          <Empty />
        ) : (
          withRank(stats.ironMan, (e) => e.count).map(({ rank, entry: e }) => (
            <PlayerRow
              key={e.playerId}
              rank={rank}
              player={playerMap.get(e.playerId)}
              onClick={() => goToProfile(e.playerId)}
              value={`${e.count} battles`}
            />
          ))
        )}
      </StatCard>

      {/* Bounty hunter */}
      <StatCard icon={<Coins size={16} />} title="Bounty Hunter" description="Most bounty bonuses earned">
        {stats.bountyHunter.length === 0 ? (
          <Empty />
        ) : (
          withRank(stats.bountyHunter, (e) => e.count).map(({ rank, entry: e }) => (
            <PlayerRow
              key={e.playerId}
              rank={rank}
              player={playerMap.get(e.playerId)}
              onClick={() => goToProfile(e.playerId)}
              value={`${e.count}×`}
            />
          ))
        )}
      </StatCard>
    </>
  );
}

function StatCard({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="goa-stats-card">
      <div className="goa-stats-head">
        {icon}
        {title}
      </div>
      <p className="goa-funstat-desc">{description}</p>
      <div>{children}</div>
    </section>
  );
}

function Empty({ text }: { text?: string }) {
  return <div className="goa-funstat-empty">{text ?? "No battles recorded yet"}</div>;
}

function RankBadge({ rank }: { rank: number }) {
  return <span className={`goa-funstat-rank r${rank}`}>#{rank}</span>;
}

function PlayerRow({
  rank,
  player,
  onClick,
  value,
  valueClass,
  sub,
  leadingIcon,
}: {
  rank: number;
  player?: Player;
  onClick: () => void;
  value: string;
  valueClass?: "gain" | "loss";
  sub?: string;
  leadingIcon?: React.ReactNode;
}) {
  return (
    <div className="goa-funstat-row" onClick={onClick}>
      <span className="goa-funstat-who">
        <RankBadge rank={rank} />
        {leadingIcon ?? (
          <PlayerAvatar avatarUrl={player?.avatar_url} name={player?.name ?? "?"} size={28} />
        )}
        <span>
          <span className="goa-funstat-name">{player?.name ?? "Unknown"}</span>
          {sub && <span className="goa-funstat-sub">{sub}</span>}
        </span>
      </span>
      <span className={`goa-funstat-value ${valueClass ?? ""}`}>{value}</span>
    </div>
  );
}

function DuoRow({
  rank,
  entry,
  playerMap,
  onClick,
  valueClass,
}: {
  rank: number;
  entry: DuoEntry;
  playerMap: Map<string, Player>;
  onClick: (id: string) => void;
  valueClass?: "gain" | "loss";
}) {
  const [aId, bId] = entry.playerIds;
  const a = playerMap.get(aId);
  const b = playerMap.get(bId);
  return (
    <div className="goa-funstat-row">
      <span className="goa-funstat-who">
        <RankBadge rank={rank} />
        <span className="goa-funstat-duo-avatars">
          <span onClick={(ev) => { ev.stopPropagation(); onClick(aId); }}>
            <PlayerAvatar avatarUrl={a?.avatar_url} name={a?.name ?? "?"} size={28} />
          </span>
          <span onClick={(ev) => { ev.stopPropagation(); onClick(bId); }}>
            <PlayerAvatar avatarUrl={b?.avatar_url} name={b?.name ?? "?"} size={28} />
          </span>
        </span>
        <span>
          <span className="goa-funstat-name">
            {a?.name ?? "Unknown"} &amp; {b?.name ?? "Unknown"}
          </span>
          <span className="goa-funstat-sub">
            {entry.wins}W–{entry.losses}L–{entry.draws}D together
          </span>
        </span>
      </span>
      <span className={`goa-funstat-value ${valueClass ?? ""}`}>
        {Math.round(entry.winRate)}%
      </span>
    </div>
  );
}

function NemesisRow({
  rank,
  entry,
  playerMap,
  onClick,
}: {
  rank: number;
  entry: NemesisEntry;
  playerMap: Map<string, Player>;
  onClick: (id: string) => void;
}) {
  // Leads with whoever is ahead in the head-to-head record, so the score
  // reads naturally left-to-right (leader's wins first).
  const leaderIsFirst = entry.winsFirst >= entry.winsSecond;
  const [leaderId, otherId] = leaderIsFirst
    ? [entry.playerIds[0], entry.playerIds[1]]
    : [entry.playerIds[1], entry.playerIds[0]];
  const [leaderWins, otherWins] = leaderIsFirst
    ? [entry.winsFirst, entry.winsSecond]
    : [entry.winsSecond, entry.winsFirst];
  const leader = playerMap.get(leaderId);
  const other = playerMap.get(otherId);
  return (
    <div className="goa-funstat-row">
      <span className="goa-funstat-who">
        <RankBadge rank={rank} />
        <span className="goa-funstat-duo-avatars">
          <span onClick={(ev) => { ev.stopPropagation(); onClick(leaderId); }}>
            <PlayerAvatar avatarUrl={leader?.avatar_url} name={leader?.name ?? "?"} size={28} />
          </span>
          <span onClick={(ev) => { ev.stopPropagation(); onClick(otherId); }}>
            <PlayerAvatar avatarUrl={other?.avatar_url} name={other?.name ?? "?"} size={28} />
          </span>
        </span>
        <span>
          <span className="goa-funstat-name">
            {leader?.name ?? "Unknown"} vs {other?.name ?? "Unknown"}
          </span>
          <span className="goa-funstat-sub">
            {entry.games} head-to-head battle{entry.games === 1 ? "" : "s"}
            {entry.draws > 0 ? `, ${entry.draws} draw${entry.draws === 1 ? "" : "s"}` : ""}
          </span>
        </span>
      </span>
      <span className="goa-funstat-value">
        {leaderWins}-{otherWins}
      </span>
    </div>
  );
}
