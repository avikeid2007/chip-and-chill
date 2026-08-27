import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import NavBar from "../components/NavBar";
import { useAuth } from "../api/AuthContext";
import { roundsApi, type Round } from "../api/rounds";

export default function RoundHistory() {
  const { user } = useAuth();
  const [rounds, setRounds] = useState<Round[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    roundsApi
      .mine(user.token)
      .then(setRounds)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load rounds."));
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-screen">
        <div className="bg-fairway"><NavBar /></div>
        <div className="max-w-3xl mx-auto px-8 py-16 text-center text-ink-soft text-sm">
          You need to be logged in to view your rounds.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="bg-fairway">
        <NavBar />
      </div>
      <div className="max-w-3xl mx-auto px-8 md:px-14 py-16">
        <div className="eyebrow">Your stats</div>
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-fairway">Round history</h1>
          <div className="flex gap-2">
            <Link to="/stats" className="btn-outline">📊 Stats</Link>
            <Link to="/rounds/new" className="btn-primary">+ Log a round</Link>
          </div>
        </div>

        {error && (
          <p className="text-sm text-[#C0533F] bg-[#C0533F]/8 border border-[#C0533F]/20 rounded-md px-3 py-2 mb-4">{error}</p>
        )}

        <div className="card overflow-hidden">
          {rounds.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <div className="w-12 h-12 rounded-full bg-turf/10 text-turf flex items-center justify-center mx-auto mb-4 text-xl">⛳</div>
              <p className="text-sm text-ink-soft mb-4">No rounds logged yet.</p>
              <Link to="/rounds/new" className="btn-primary">Log your first round</Link>
            </div>
          ) : (
            rounds.map((r) => {
              const score = r.holes.reduce((s, h) => s + h.strokes, 0);
              const par = r.holes.reduce((s, h) => s + h.par, 0);
              const diff = score - par;
              return (
                <Link
                  key={r.id}
                  to={`/rounds/${r.id}`}
                  className="flex items-center justify-between px-6 py-4 border-b border-[#EEF1ED] last:border-b-0 hover:bg-[#FAFBF9] transition-colors"
                >
                  <div>
                    <p className="font-medium text-fairway">{new Date(r.playedOn).toLocaleDateString()}</p>
                    <p className="text-mono text-xs text-ink-soft mt-1">{r.teeBox} tees · {r.holes.length} holes</p>
                  </div>
                  <div className="text-right">
                    <p className="text-mono font-bold text-lg text-fairway">{score}</p>
                    <span className={`pill ${diff <= 0 ? "pill-green" : "pill-gray"}`}>
                      {diff > 0 ? `+${diff}` : diff} to par
                    </span>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
