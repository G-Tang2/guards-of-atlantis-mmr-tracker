// app/page.tsx

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col p-6">
      {/* Center Title */}
      <div className="flex flex-1 items-center justify-center">
        <h1 className="text-center text-4xl font-bold md:text-6xl">
          Guards of Atlantis 2 MMR Tracker
        </h1>
      </div>

      {/* Bottom Button */}
      <div className="p-6">
        <Link href="/matches/new">
          <Button className="w-full" size="lg">
            Add Match History
          </Button>
        </Link>
      </div>
      <div className="p-6">
        <Link href="/matches">
          <Button className="w-full" size="lg">
            View Match History
          </Button>
        </Link>
      </div>
      <div className="p-6">
        <Link href="/leaderboard">
          <Button className="w-full" size="lg">
            MMR Leaderboard
          </Button>
        </Link>
      </div>
    </main>
  );
}
