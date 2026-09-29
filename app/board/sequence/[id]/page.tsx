// The public, read-only side of a Battle Board sequence someone shared
// (see the "Share" button in the board's own sequence builder,
// components/HexBoard.tsx) — deliberately outside PasswordGate, like the
// Ranked Balance vote's own shareable-link page, since this link is meant
// to be handed to people who may not have the app's shared password at
// all.
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabaseClient } from "@/lib/supabase/client";
import { BoardSequenceViewer } from "@/components/BoardSequenceViewer";
import { PlacedToken } from "@/components/HexBoard";
import { Map, ScrollText, ChevronLeft, ChevronRight, Grid3x3 } from "lucide-react";

type SequenceRow = {
  id: string;
  name: string;
  map_id: string;
  steps: PlacedToken[][];
};

export default function SharedSequencePage() {
  const params = useParams();
  const id = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [sequence, setSequence] = useState<SequenceRow | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [showGrid, setShowGrid] = useState(false);

  useEffect(() => {
    if (!id) return;
    supabaseClient
      .from("board_sequences")
      .select("*")
      .eq("id", id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        setSequence(data as SequenceRow);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="goa-root goa-board-page goa-loading-screen">
        <div className="goa-loading-inner">
          <div className="goa-loading-icon">
            <ScrollText size={32} />
          </div>
          <p className="goa-loading-text">Unrolling the plan…</p>
        </div>
      </div>
    );
  }

  if (notFound || !sequence || sequence.steps.length === 0) {
    return (
      <main className="goa-root goa-board-page">
        <header className="goa-header">
          <div className="goa-crown">
            <Map size={30} />
          </div>
          <h1 className="goa-title">Battle Board</h1>
        </header>
        <div className="goa-card">
          <div className="draft-body">
            <p className="draft-note">
              This sequence link isn&apos;t valid — it may have been deleted, or the link might be mistyped.
            </p>
          </div>
        </div>
      </main>
    );
  }

  const step = sequence.steps[stepIndex] ?? [];

  return (
    <main className="goa-root goa-board-page">
      <header className="goa-header">
        <div className="goa-crown">
          <ScrollText size={30} />
        </div>
        <h1 className="goa-title">{sequence.name}</h1>
        <p className="goa-subtitle">Guards of Atlantis II</p>
      </header>

      <div className="goa-board-inner">
        <div className="goa-board-toolbar">
          <button
            type="button"
            className={`goa-board-icon-btn ${showGrid ? "active" : ""}`}
            onClick={() => setShowGrid((v) => !v)}
            aria-label={showGrid ? "Hide grid" : "Show grid"}
            aria-pressed={showGrid}
          >
            <Grid3x3 size={16} />
          </button>
        </div>

        <BoardSequenceViewer mapId={sequence.map_id} tokens={step} showGrid={showGrid} />

        <div className="goa-board-sequence-bar">
          <div className="goa-board-sequence-row">
            <button
              type="button"
              className="goa-board-icon-btn"
              onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
              disabled={stepIndex === 0}
              aria-label="Previous step"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="goa-board-sequence-step-label">
              Step {stepIndex + 1} of {sequence.steps.length}
            </span>
            <button
              type="button"
              className="goa-board-icon-btn"
              onClick={() => setStepIndex((i) => Math.min(sequence.steps.length - 1, i + 1))}
              disabled={stepIndex >= sequence.steps.length - 1}
              aria-label="Next step"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
