# Guards of Atlantis II — MMR Tracker

**Live app:** [https://guards-of-atlantis-mmr-tracker.vercel.app](https://guards-of-atlantis-mmr-tracker.vercel.app)

A mobile-first web app for tracking MMR (matchmaking rating), match history, hero performance, and player stats for [Guards of Atlantis II](https://www.boardgamegeek.com/boardgame/339906/guards-of-atlantis-ii) — a 2-team MOBA-style board game for 2–10 players.

---

## Features

| Page | Route | Description |
|------|-------|-------------|
| Home | `/` | Navigation hub |
| Record Battle | `/matches/new` | Log a match result with hero selection per player |
| Battle Archives | `/matches` | Full match history with player/hero filtering |
| Hall of Honour | `/leaderboard` | MMR leaderboard with podium and sortable table |
| Player Profile | `/players/[id]` | Per-player stats: MMR trend chart, match history with team/enemy breakdown, hero performance, and head-to-head records |
| Divide the Host | `/teams` | Randomly or optimally split a pool of players into balanced Atlantis vs Titans teams, then launch straight into recording the match |
| Hero Compendium | `/heroes` | Win rate and game count for all 32 heroes, filterable by role |
| Hero Detail | `/heroes/[id]` | Full match history for a specific hero, with per-player win rates |

---

## Tech Stack

- **Framework:** [Next.js 14](https://nextjs.org/) (App Router)
- **Styling:** Tailwind CSS + custom global CSS (`app/globals.css`)
- **Database:** [Supabase](https://supabase.com/) (PostgreSQL)
- **Fonts:** Cinzel (headings), Crimson Pro (body) via Google Fonts
- **Deployment:** [Vercel](https://vercel.com/)

---

## Database Schema

Three tables in Supabase:

### `players`
| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | Primary key |
| `name` | `text` | Unique |
| `mmr` | `integer` | Default 1000 |
| `avatar_url` | `text` | Base64 JPEG, nullable |

### `matches`
| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | Primary key |
| `winner` | `text` | `"atlantis"` or `"titans"` |
| `created_at` | `timestamptz` | Auto-set |
| `atlantis_avg_mmr` | `float` | Average MMR of Atlantis team at time of match |
| `titans_avg_mmr` | `float` | Average MMR of Titans team at time of match |
| `atlantis_mmr_change` | `integer` | MMR delta for Atlantis |
| `titans_mmr_change` | `integer` | MMR delta for Titans |
| `expected_atlantis_win` | `float` | Elo expected win probability for Atlantis |

### `match_players`
| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | Primary key |
| `match_id` | `uuid` | FK → `matches.id` |
| `player_id` | `uuid` | FK → `players.id` |
| `team` | `text` | `"atlantis"` or `"titans"` |
| `mmr_before` | `integer` | Player MMR before the match |
| `mmr_after` | `integer` | Player MMR after the match |
| `hero_id` | `text` | Hero ID from `lib/heroes.ts`, nullable |

---

## MMR System

MMR is calculated using a standard **Elo rating** formula:

```
Expected score  = 1 / (1 + 10^((opponent_avg - team_avg) / 400))
MMR change      = K × (actual_score − expected_score)
K factor        = 40
```

- Each team is treated as a single Elo entity using its average MMR.
- All players on the winning team gain MMR; all players on the losing team lose the same amount.
- Upsets (lower-rated team winning) yield larger MMR swings; expected wins yield smaller ones.

---

## Hero Roster

32 heroes across 4 complexities from the base game and expansions:

| Complexity | Heroes |
|------|--------|
| **1** ★ | Arien, Brogan, Dodger, Sabina, Tigerclaw, Wasp, Xargatha |
| **2** ★ | Bain, Garrus, Min, Misa, Rowenna, Silverarrow, Ursafar, Whisper |
| **3** ★ | Brynn, Cutter, Hanu, Mortimer, Mrak, Swift, Tali, Trinkets, Widget, Wuk |
| **4** ★ | Emmitt, Gydion, Ignatia, NebKher, Snorri, Takahide |

---

## Project Structure

```
app/
├── page.tsx                  # Home / nav hub
├── matches/
│   ├── new/page.tsx          # Record a new match
│   └── page.tsx              # Battle archives
├── leaderboard/page.tsx      # Hall of Honour
├── players/[id]/page.tsx     # Player profile
├── teams/page.tsx            # Team splitter
├── heroes/
│   ├── page.tsx              # Hero compendium
│   └── [id]/page.tsx         # Hero detail & match history
└── globals.css               # All shared styles

components/
├── PlayerAvatar.tsx          # Circular avatar with initials fallback
└── HeroPicker.tsx            # Portal-based hero selection dropdown

lib/
├── heroes.ts                 # Full hero roster, complexities, colours
├── mmr.ts                    # MMR calculation
└── supabase/
    └── client.ts             # Supabase browser client
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com/) project

### 1. Clone and install

```bash
git clone <your-repo-url>
cd guards-of-atlantis-mmr-tracker
npm install
```

### 2. Set up environment variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Create the database tables

Run the following SQL in your Supabase SQL editor:

```sql
-- Players
create table players (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  mmr integer not null default 1000,
  avatar_url text
);

-- Matches
create table matches (
  id uuid primary key default gen_random_uuid(),
  winner text not null check (winner in ('atlantis', 'titans')),
  created_at timestamptz not null default now(),
  atlantis_avg_mmr float,
  titans_avg_mmr float,
  atlantis_mmr_change integer,
  titans_mmr_change integer,
  expected_atlantis_win float
);

-- Match players
create table match_players (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  team text not null check (team in ('atlantis', 'titans')),
  mmr_before integer,
  mmr_after integer,
  hero_id text
);

-- Index for faster hero lookups
create index on match_players(hero_id);
create index on match_players(player_id);
create index on match_players(match_id);
```

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Deploy

Push to GitHub and connect to [Vercel](https://vercel.com/). Add the environment variables in the Vercel project settings.

---

## Design

The UI uses a dark fantasy aesthetic inspired by the Guards of Atlantis II artwork:

- **Faction colours:** Atlantis = red (`#C42A3A`), Titans = blue (`#2AABB8`)
- **Gold accents** (`#C9973A`) for borders, headings, and interactive elements
- **Stone background** (`#1C1A14`) with subtle grid texture
- **Typefaces:** Cinzel (inscriptions/labels), Crimson Pro (body text)
- Mobile-first layout, optimised for phones used at the game table

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-change`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature/my-change`
5. Open a pull request

---

## License

MIT
