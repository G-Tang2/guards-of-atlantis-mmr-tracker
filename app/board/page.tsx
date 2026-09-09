"use client";

import { Map } from "lucide-react";
import { HexBoard } from "@/components/HexBoard";

export default function BoardPage() {
  return (
    <main className="goa-root goa-board-page">
      <header className="goa-header">
        <div className="goa-crown">
          <Map size={30} />
        </div>
        <h1 className="goa-title">Battle Board</h1>
        <p className="goa-subtitle">Guards of Atlantis II</p>
      </header>

      <HexBoard />
    </main>
  );
}
