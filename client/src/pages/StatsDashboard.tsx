import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import NavBar from "../components/NavBar";
import { useAuth } from "../api/AuthContext";
import { roundsApi, type Stats } from "../api/rounds";

function ScoreTrendChart({ trend }: { trend: Stats["trend"] }) {
  if (trend.length < 2) return <p className="text-sm text-ink-soft">Play a few more rounds to see your trend.</p>;

  const w = 640, h = 200, pad = 30;
  const scores = trend.map(t => t.strokes);
  const min = Math.min(...scores) - 2;
  const max = Math.max(...scores) + 2;
  const x = (i: number) => pad + (i / (trend.length - 1)) * (w - pad * 2);
  const y = (v: number) => h - pad - ((v - min) / (max - min)) * (h - pad * 2);
  const path = trend.map((t, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(t.strokes)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full">
      {/* gridlines */}
      {[min, (min + max) / 2, max].map((v, i) => (
        <g key={i}>
          <line x1={pad} y1={y(v)} x2={w - pad} y2={y(v)} stroke="#EEF1ED" strokeWidth="1" />
          <text x={4} y={y(v) + 4} fontSize="10" fill="#8A948A">{Math.round(v)}</text>
        </g>
      ))}
      <path d={path} fill="none" stroke="#1E5B3E" strokeWidth="2" />
      {trend.map((t, i) => (
        <circle key={i} cx={x(i)} cy={y(t.strokes)} r="3.5" fill="#C9A227">
          <title>{`${new Date(t.playedOn).toLocaleDateString()}: ${t.strokes}`}</title>
        </circle>
      ))}
    </svg>
  );
}

function HolePerformanceChart({ holes }: { holes: Stats["holes"] }) {
  if (holes.length === 0) return null;
  const w = 640, h = 220, pad = 30;
  const maxAvg = Math.max(...holes.map(h => h.avgStrokes)) + 0.5;
  const bw = (w - pad * 2) / holes.length;
  const y = (v: number) => h - pad - (v / maxAvg) * (h - pad * 2);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full">
      {[0, maxAvg / 2, maxAvg].map((v, i) => (
        <g key={i}>
          <line x1={pad} y1={y(v)} x2={w - pad} y2={y(v)} stroke="#EEF1ED" />
          <text x={4} y={y(v) + 4} fontSize="10" fill="#8A948A">{v.toFixed(1)}</text>
        </g>
      ))}
      {holes.map((hole, i) => {
        const overPar = Math.max(0, hole.avgStrokes - hole.avgPar);
        const parPart = hole.avgStrokes - overPar;
        return (
          <g key={hole.holeNumber}>
            {/* par portion */}
            <rect
              x={pad + i * bw + bw * 0.15}
              y={y(parPart)}
              width={bw * 0.7}
              height={(parPart / maxAvg) * (h - pad * 2)}
              fill="#1E5B3E"
            >
              <title>{`Hole ${hole.holeNumber}: avg ${hole.avgStrokes} vs par ${hole.avgPar}`}</title>
            </rect>
            {/* strokes over par portion */}
            {overPar > 0 && (
              <rect
                x={pad + i * bw + bw * 0.15}
                y={y(hole.avgStrokes)}
                width={bw * 0.7}
                height={(overPar / maxAvg) * (h - pad * 2)}
                fill="#C0533F"
              >
                <title>{`Hole ${hole.holeNumber}: ${overPar.toFixed(1)} over par on average`}</title>
              </rect>
            )}
            <text x={pad + i * bw + bw / 2} y={h - 10} fontSize="9" textAnchor="middle" fill="#8A948A">
              {hole.holeNumber}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function StatsDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    roundsApi
      .stats(user.token)
      .then(setStats)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load stats."));
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-screen">
        <div className="bg-fairway"><NavBar /></div>
        <div className="max-w-4xl mx-auto px-8 py-16 text-center text-ink-soft text-sm">
          You need to be logged in to view your stats.
        </div>
      </div>
    );
  }

  const hi = stats?.handicapIndex;

  return (
    <div className="min-h-screen">
      <div className="bg-fairway"><NavBar /></div>
      <div className="max-w-4xl mx-auto px-8 md:px-14 py-16">
        <div className="text-mono text-xs tracking-widest uppercase text-turf mb-3">Your game</div>
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-fairway">Stats dashboard</h1>
          <Link to="/rounds/new" className="bg-gold text-fairway px-4 py-2.5 rounded-[3px] font-semibold text-sm">
            + Log a round
          </Link>
        </div>

        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

        {/* Handicap hero card */}
        <div className="bg-gradient-to-br from-fairway to-turf rounded-md p-8 mb-8 flex items-center gap-8">
          <div className="text-center">
            <div className="font-display text-6xl font-semibold text-white">{hi != null ? hi.toFixed(1) : "—"}</div>
            <div className="text-mono text-xs uppercase tracking-widest text-white/70 mt-2">Handicap Index</div>
          </div>
          <div className="grid grid-cols-2 gap-x-10 gap-y-3 text-sm flex-1">
            <div>
              <div className="text-white/60 text-xs">Rounds played</div>
              <div className="text-white font-semibold text-lg">{stats?.roundsPlayed ?? 0}</div>
            </div>
            <div>
              <div className="text-white/60 text-xs">Average score</div>
              <div className="text-white font-semibold text-lg">{stats?.averageScore ?? "—"}</div>
            </div>
            <div>
              <div className="text-white/60 text-xs">Average vs par</div>
              <div className="text-white font-semibold text-lg">
                {stats?.averageToPar != null ? (stats.averageToPar > 0 ? `+${stats.averageToPar}` : stats.averageToPar) : "—"}
              </div>
            </div>
            <div>
              <div className="text-white/60 text-xs">Best round</div>
              <div className="text-white font-semibold text-lg">
                {stats?.bestRound ? `${stats.bestRound.strokes} (${stats.bestRound.strokes - stats.bestRound.par >= 0 ? "+" : ""}${stats.bestRound.strokes - stats.bestRound.par})` : "—"}
              </div>
            </div>
          </div>
        </div>

        {!stats || stats.roundsPlayed === 0 ? (
          <div className="bg-white border border-[#E4E8E3] rounded-md p-8 text-center text-sm text-ink-soft">
            No rounds yet. Log your first round to unlock trends and hole insights.
          </div>
        ) : (
          <>
            {/* Score trend */}
            <section className="mb-8">
              <h2 className="text-lg font-semibold text-fairway mb-3">Score trend</h2>
              <div className="bg-white border border-[#E4E8E3] rounded-md p-4">
                <ScoreTrendChart trend={stats.trend} />
              </div>
            </section>

            {/* Hole performance */}
            {stats.holes.length > 0 && (
              <section className="mb-8">
                <h2 className="text-lg font-semibold text-fairway mb-1">Hole performance</h2>
                <p className="text-xs text-ink-soft mb-3">Average strokes per hole — red shows strokes over par.</p>
                <div className="bg-white border border-[#E4E8E3] rounded-md p-4">
                  <HolePerformanceChart holes={stats.holes} />
                </div>
              </section>
            )}

            {/* Hole breakdown table */}
            {stats.holes.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-fairway mb-3">By the numbers</h2>
                <div className="bg-white border border-[#E4E8E3] rounded-md overflow-hidden overflow-x-auto">
                  <table className="w-full text-sm text-mono">
                    <thead>
                      <tr className="text-mono text-xs uppercase tracking-wide text-ink-soft bg-[#FAFBF9] border-b border-[#EEF1ED]">
                        <th className="px-4 py-2.5 text-left">Hole</th>
                        <th className="px-4 py-2.5 text-right">Avg</th>
                        <th className="px-4 py-2.5 text-right">Par</th>
                        <th className="px-4 py-2.5 text-right">🐦 Birdies</th>
                        <th className="px-4 py-2.5 text-right">Pars</th>
                        <th className="px-4 py-2.5 text-right">Bogeys</th>
                        <th className="px-4 py-2.5 text-right">Dbl+</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.holes.map((h) => (
                        <tr key={h.holeNumber} className="border-b border-[#EEF1ED] last:border-b-0">
                          <td className="px-4 py-2 font-semibold text-turf">{h.holeNumber}</td>
                          <td className="px-4 py-2 text-right">{h.avgStrokes.toFixed(1)}</td>
                          <td className="px-4 py-2 text-right text-ink-soft">{h.avgPar.toFixed(1)}</td>
                          <td className="px-4 py-2 text-right">{h.birdies}</td>
                          <td className="px-4 py-2 text-right">{h.pars}</td>
                          <td className="px-4 py-2 text-right">{h.bogeys}</td>
                          <td className="px-4 py-2 text-right text-[#C0533F]">{h.doublesOrWorse}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
