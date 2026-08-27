import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import NavBar from "../components/NavBar";
import Scorecard from "../components/Scorecard";
import { useAuth } from "../api/AuthContext";
import { roundsApi, type Round } from "../api/rounds";
import type { ScorecardHole } from "../types";

export default function RoundDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [round, setRound] = useState<Round | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !id) return;
    roundsApi
      .getById(id, user.token)
      .then(setRound)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load round."));
  }, [user, id]);

  if (!user) {
    return (
      <div className="min-h-screen">
        <div className="bg-fairway"><NavBar /></div>
        <div className="max-w-2xl mx-auto px-8 py-16 text-center text-ink-soft text-sm">
          You need to be logged in to view this round.
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen">
        <div className="bg-fairway"><NavBar /></div>
        <div className="max-w-2xl mx-auto px-8 py-16 text-sm text-[#C0533F]">{error}</div>
      </div>
    );
  }

  const holes: ScorecardHole[] = (round?.holes ?? []).map((h) => ({
    hole: h.holeNumber,
    par: h.par,
    score: h.strokes,
  }));

  return (
    <div className="min-h-screen">
      <div className="bg-fairway">
        <NavBar />
      </div>
      <div className="max-w-2xl mx-auto px-8 py-16">
        <Link to="/rounds" className="text-mono text-xs text-turf mb-4 inline-block">← Back to round history</Link>
        <h1 className="text-3xl font-semibold tracking-tight text-fairway mb-8">Round detail</h1>

        {round ? (
          <Scorecard
            courseName={new Date(round.playedOn).toLocaleDateString()}
            date={`${round.teeBox} tees`}
            teeBox={`${holes.length} holes`}
            holes={holes}
          />
        ) : (
          <p className="text-sm text-ink-soft">Loading…</p>
        )}
      </div>
    </div>
  );
}
