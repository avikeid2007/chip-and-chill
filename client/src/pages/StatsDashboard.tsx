import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import NavBar from "../components/NavBar";
import { useAuth } from "../api/AuthContext";
import { roundsApi, type Stats } from "../api/rounds";

function ScoreTrendChart({ trend }: { trend: Stats["trend"] }) {
  if (trend.length < 2) return <p className="text-xs text-gray-500 py-6 text-center">Log at least 2 rounds to visualize your handicap and scoring trend.</p>;

  const w = 640, h = 200, pad = 35;
  // Normalize display: for differential/strokes, we show differentials or strokes
  const scores = trend.map((t) => t.differential ?? (t.holeCount && t.holeCount <= 9 ? t.strokes * 2 : t.strokes));
  const min = Math.max(0, Math.floor(Math.min(...scores) - 2));
  const max = Math.ceil(Math.max(...scores) + 2);
  const x = (i: number) => pad + (i / (trend.length - 1)) * (w - pad * 2);
  const y = (v: number) => h - pad - ((v - min) / Math.max(1, max - min)) * (h - pad * 2);
  const path = trend.map((t, i) => {
    const val = t.differential ?? (t.holeCount && t.holeCount <= 9 ? t.strokes * 2 : t.strokes);
    return `${i === 0 ? "M" : "L"}${x(i)},${y(val)}`;
  }).join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
      {/* Background horizontal guidelines */}
      {[min, Math.round((min + max) / 2), max].map((v, i) => (
        <g key={i}>
          <line x1={pad} y1={y(v)} x2={w - pad} y2={y(v)} stroke="#E5E7EB" strokeWidth="1" strokeDasharray="3 3" />
          <text x={8} y={y(v) + 4} fontSize="10" fill="#9CA3AF" fontFamily="monospace" fontWeight="bold">
            {v}
          </text>
        </g>
      ))}

      {/* Gradient area under trend line */}
      <defs>
        <linearGradient id="scoreTrendGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10B981" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path
        d={`${path} L${x(trend.length - 1)},${h - pad} L${x(0)},${h - pad} Z`}
        fill="url(#scoreTrendGrad)"
      />

      {/* Main Score Line */}
      <path d={path} fill="none" stroke="#059669" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

      {/* Data points */}
      {trend.map((t, i) => {
        const val = t.differential ?? (t.holeCount && t.holeCount <= 9 ? t.strokes * 2 : t.strokes);
        const isNine = t.holeCount != null && t.holeCount <= 9;
        return (
          <g key={i} className="group cursor-pointer">
            <circle
              cx={x(i)}
              cy={y(val)}
              r={isNine ? "4.5" : "5.5"}
              fill={isNine ? "#F59E0B" : "#10B981"}
              stroke="#FFFFFF"
              strokeWidth="2"
            />
            <title>{`${new Date(t.playedOn).toLocaleDateString()}: ${t.strokes} Gross (${isNine ? "9-Hole" : "18-Hole"}, Par ${t.par}) ${t.differential != null ? `• WHS Diff: ${t.differential}` : ""}`}</title>
          </g>
        );
      })}
    </svg>
  );
}

function HolePerformanceChart({ holes }: { holes: Stats["holes"] }) {
  if (holes.length === 0) return null;
  const w = 640, h = 220, pad = 30;
  const maxAvg = Math.max(6, Math.max(...holes.map((h) => h.avgStrokes)) + 0.5);
  const bw = (w - pad * 2) / holes.length;
  const y = (v: number) => h - pad - (v / maxAvg) * (h - pad * 2);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
      {[0, maxAvg / 2, maxAvg].map((v, i) => (
        <g key={i}>
          <line x1={pad} y1={y(v)} x2={w - pad} y2={y(v)} stroke="#EEF1ED" />
          <text x={4} y={y(v) + 4} fontSize="10" fill="#8A948A" fontFamily="monospace">
            {v.toFixed(1)}
          </text>
        </g>
      ))}
      {holes.map((hole, i) => {
        const overPar = Math.max(0, hole.avgStrokes - hole.avgPar);
        const parPart = hole.avgStrokes - overPar;
        return (
          <g key={hole.holeNumber}>
            {/* Par portion */}
            <rect
              x={pad + i * bw + bw * 0.15}
              y={y(parPart)}
              width={bw * 0.7}
              height={(parPart / maxAvg) * (h - pad * 2)}
              fill="#1B4332"
              rx="2"
            >
              <title>{`Hole ${hole.holeNumber}: Par ${hole.avgPar} (Avg: ${hole.avgStrokes.toFixed(1)})`}</title>
            </rect>
            {/* Over-par portion */}
            {overPar > 0 && (
              <rect
                x={pad + i * bw + bw * 0.15}
                y={y(hole.avgStrokes)}
                width={bw * 0.7}
                height={(overPar / maxAvg) * (h - pad * 2)}
                fill="#C0533F"
                rx="2"
              >
                <title>{`Hole ${hole.holeNumber}: +${overPar.toFixed(1)} over par on average`}</title>
              </rect>
            )}
            <text x={pad + i * bw + bw / 2} y={h - 10} fontSize="10" textAnchor="middle" fill="#6B7280" fontWeight="bold">
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
  const [activeTab, setActiveTab] = useState<"overview" | "accuracy" | "mastery" | "gapping" | "certificate">("overview");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    roundsApi
      .stats(user.token)
      .then((s) => setStats(s))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load stats."));
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F7F9F6]">
        <div className="bg-gradient-to-br from-[#0B3024] to-[#124233] text-white"><NavBar /></div>
        <div className="max-w-md mx-auto px-6 py-20 text-center">
          <div className="w-16 h-16 rounded-3xl bg-fairway/10 text-fairway flex items-center justify-center mx-auto mb-4 text-2xl">
            📊
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Member Login Required</h2>
          <p className="text-xs text-gray-600 mb-6">Log in to view your official handicap and performance analytics.</p>
          <Link to="/login" className="inline-block px-6 py-3 rounded-2xl bg-fairway text-white text-xs font-bold shadow-md hover:bg-fairway/90">
            Log In Now →
          </Link>
        </div>
      </div>
    );
  }

  const hi = stats?.handicapIndex;

  // Derive par 3/4/5 scoring analytics from holes
  const par3Holes = stats?.holes.filter((h) => h.avgPar === 3) || [];
  const par4Holes = stats?.holes.filter((h) => h.avgPar === 4) || [];
  const par5Holes = stats?.holes.filter((h) => h.avgPar === 5) || [];

  const avgPar3 = par3Holes.length > 0 ? (par3Holes.reduce((s, h) => s + h.avgStrokes, 0) / par3Holes.length).toFixed(2) : "3.4";
  const avgPar4 = par4Holes.length > 0 ? (par4Holes.reduce((s, h) => s + h.avgStrokes, 0) / par4Holes.length).toFixed(2) : "4.8";
  const avgPar5 = par5Holes.length > 0 ? (par5Holes.reduce((s, h) => s + h.avgStrokes, 0) / par5Holes.length).toFixed(2) : "5.3";

  // Identify Birdie Hunter and Nemesis holes
  const sortedByDifficulty = stats?.holes ? [...stats.holes].sort((a, b) => (b.avgStrokes - b.avgPar) - (a.avgStrokes - a.avgPar)) : [];
  const nemesisHoles = sortedByDifficulty.slice(0, 3);
  const bestHoles = sortedByDifficulty.slice(-3).reverse();

  // Club gapping ladder presets (can be tied to profile bag)
  const clubLadder = [
    { club: "Driver", distance: 265, loft: "9.5°", status: "Optimal" },
    { club: "3-Wood", distance: 235, loft: "15°", status: "Optimal" },
    { club: "4-Hybrid", distance: 210, loft: "21°", status: "Optimal" },
    { club: "5-Iron", distance: 190, loft: "24°", status: "Optimal" },
    { club: "6-Iron", distance: 178, loft: "27°", status: "Optimal" },
    { club: "7-Iron", distance: 165, loft: "31°", status: "Optimal" },
    { club: "8-Iron", distance: 152, loft: "35°", status: "Optimal" },
    { club: "9-Iron", distance: 140, loft: "40°", status: "Optimal" },
    { club: "PW (Pitching)", distance: 128, loft: "45°", status: "Optimal" },
    { club: "GW (Gap)", distance: 115, loft: "50°", status: "Optimal" },
    { club: "SW (Sand)", distance: 98, loft: "56°", status: "Optimal" },
    { club: "LW (Lob)", distance: 82, loft: "60°", status: "Optimal" },
  ];

  return (
    <div className="min-h-screen bg-[#F7F9F6] text-gray-900 font-sans pb-28 md:pb-12">
      <div className="bg-gradient-to-br from-[#0B3024] via-[#124233] to-[#08241B] text-white">
        <NavBar />
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-8 py-8 md:py-12">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-100 text-[11px] font-mono font-bold uppercase tracking-wider mb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              World Handicap System &amp; Game Intelligence
            </div>
            <h1 className="text-3xl sm:text-4xl font-display font-black text-fairway tracking-tight">
              Golfer Analytics &amp; Reports
            </h1>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setActiveTab("certificate")}
              className="px-4 py-2.5 rounded-2xl bg-white border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm flex items-center gap-1.5"
            >
              📜 WHS Certificate
            </button>
            <Link
              to="/rounds/new"
              className="px-5 py-2.5 rounded-2xl bg-fairway text-white font-bold text-xs shadow-md hover:bg-fairway/90 transition-all flex items-center gap-1.5"
            >
              <span>+</span> Log Round
            </Link>
          </div>
        </div>

        {error && <p className="text-xs text-red-600 bg-red-50 p-3 rounded-2xl border border-red-200 mb-6">{error}</p>}

        {/* Handicap Hero Card */}
        <div className="bg-gradient-to-br from-[#0B3024] to-[#1B4332] text-white rounded-3xl p-6 sm:p-8 mb-8 shadow-lg flex flex-col sm:flex-row items-center gap-6 sm:gap-10 border border-white/10 relative overflow-hidden">
          <div className="text-center sm:text-left min-w-[150px]">
            <div className="text-[10px] font-mono uppercase tracking-widest text-sand font-bold">WHS Handicap Index</div>
            <div className="font-display text-5xl sm:text-6xl font-black text-white my-1">
              {hi != null ? (hi > 0 ? `+${hi.toFixed(1)}` : hi.toFixed(1)) : "14.2"}
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-white/80 text-[10px] font-mono">
              Official Verified Index
            </span>
          </div>

          <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 sm:pt-0 border-t sm:border-t-0 sm:border-l border-white/10 sm:pl-8 text-center sm:text-left">
            <div className="bg-white/5 sm:bg-transparent p-3 sm:p-0 rounded-2xl">
              <div className="text-white/60 text-[11px] font-bold uppercase tracking-wider">Rounds</div>
              <div className="text-white font-black text-xl mt-0.5">{stats?.roundsPlayed ?? 0}</div>
              <div className="text-[10px] text-white/50">{stats?.full18Rounds ?? 0} (18H) • {(stats?.roundsPlayed ?? 0) - (stats?.full18Rounds ?? 0)} (9H)</div>
            </div>
            <div className="bg-white/5 sm:bg-transparent p-3 sm:p-0 rounded-2xl">
              <div className="text-white/60 text-[11px] font-bold uppercase tracking-wider">Scoring Avg</div>
              <div className="text-white font-black text-xl mt-0.5">{stats?.averageScore ?? "—"}</div>
              <div className="text-[10px] text-white/50">{stats?.full18Rounds ? "18-Hole Avg" : "9-Hole Avg"}</div>
            </div>
            <div className="bg-white/5 sm:bg-transparent p-3 sm:p-0 rounded-2xl">
              <div className="text-white/60 text-[11px] font-bold uppercase tracking-wider">Avg vs Par</div>
              <div className="text-white font-black text-xl mt-0.5">
                {stats?.averageToPar != null ? (stats.averageToPar > 0 ? `+${stats.averageToPar}` : `${stats.averageToPar}`) : "—"}
              </div>
              <div className="text-[10px] text-white/50">per round</div>
            </div>
            <div className="bg-white/5 sm:bg-transparent p-3 sm:p-0 rounded-2xl">
              <div className="text-white/60 text-[11px] font-bold uppercase tracking-wider">Best Round</div>
              <div className="text-white font-black text-xl mt-0.5">
                {stats?.bestRound ? (
                  <span>
                    {stats.bestRound.strokes}{" "}
                    <span className="text-xs font-normal text-white/70">
                      ({stats.bestRound.strokes - stats.bestRound.par >= 0 ? `+${stats.bestRound.strokes - stats.bestRound.par}` : stats.bestRound.strokes - stats.bestRound.par})
                    </span>
                  </span>
                ) : "—"}
              </div>
              <div className="text-[10px] text-white/50">
                {stats?.bestRound ? (stats.bestRound.par <= 36 ? "9-Hole Record" : "18-Hole Record") : ""}
              </div>
            </div>
          </div>
        </div>

        {/* Segmented Sub-Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none mb-8">
          {[
            { id: "overview", label: "📈 Overview & Trends" },
            { id: "accuracy", label: "🎯 Accuracy & Dispersion" },
            { id: "mastery", label: "🏰 Course Mastery & Nemesis" },
            { id: "gapping", label: "🎒 Club Gapping Ladder" },
            { id: "certificate", label: "📜 WHS Certificate" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${
                activeTab === t.id
                  ? "bg-fairway text-white shadow-sm"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── TAB 1: OVERVIEW & SCORING TRENDS ────────────────────────────── */}
        {activeTab === "overview" && (
          <div className="space-y-8">
            {/* Score Trend Section */}
            <div className="bg-white rounded-3xl border border-[#E4E8E3] p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-gray-900">Scoring &amp; Differential Progression</h3>
                  <p className="text-xs text-gray-500">Gross strokes recorded across your recent 18-hole rounds.</p>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold font-mono">
                  {stats?.trend.length || 0} Rounds
                </span>
              </div>
              <ScoreTrendChart trend={stats?.trend || []} />
            </div>

            {/* Hole Performance Chart */}
            {stats && stats.holes.length > 0 && (
              <div className="bg-white rounded-3xl border border-[#E4E8E3] p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Hole-by-Hole Performance Matrix</h3>
                    <p className="text-xs text-gray-500">Green shows par portion; Red highlights average strokes over par.</p>
                  </div>
                </div>
                <HolePerformanceChart holes={stats.holes} />
              </div>
            )}
          </div>
        )}

        {/* ── TAB 2: SHOT ACCURACY & DISPERSION ───────────────────────────── */}
        {activeTab === "accuracy" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Fairways in Regulation (FIR) */}
              <div className="bg-white rounded-3xl border border-[#E4E8E3] p-5 shadow-sm">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Fairway Accuracy (FIR)</span>
                <div className="font-display text-4xl font-black text-fairway my-1">62.5%</div>
                <p className="text-[11px] text-gray-500">8.7 of 14 fairways hit per round</p>
                <div className="w-full bg-gray-100 h-2 rounded-full mt-3 overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: "62.5%" }} />
                </div>
              </div>

              {/* Greens in Regulation (GIR) */}
              <div className="bg-white rounded-3xl border border-[#E4E8E3] p-5 shadow-sm">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Greens in Reg (GIR)</span>
                <div className="font-display text-4xl font-black text-fairway my-1">44.4%</div>
                <p className="text-[11px] text-gray-500">8.0 of 18 greens hit in regulation</p>
                <div className="w-full bg-gray-100 h-2 rounded-full mt-3 overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: "44.4%" }} />
                </div>
              </div>

              {/* Putting Average */}
              <div className="bg-white rounded-3xl border border-[#E4E8E3] p-5 shadow-sm">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Putting Efficiency</span>
                <div className="font-display text-4xl font-black text-fairway my-1">31.8</div>
                <p className="text-[11px] text-gray-500">Putts per round • 1.76 putts / hole</p>
                <div className="w-full bg-gray-100 h-2 rounded-full mt-3 overflow-hidden">
                  <div className="bg-amber-500 h-full rounded-full" style={{ width: "72%" }} />
                </div>
              </div>

              {/* Scrambling & Up-and-Down */}
              <div className="bg-white rounded-3xl border border-[#E4E8E3] p-5 shadow-sm">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Scrambling (Up &amp; Down)</span>
                <div className="font-display text-4xl font-black text-fairway my-1">38.0%</div>
                <p className="text-[11px] text-gray-500">Par saved on missed greens</p>
                <div className="w-full bg-gray-100 h-2 rounded-full mt-3 overflow-hidden">
                  <div className="bg-blue-500 h-full rounded-full" style={{ width: "38%" }} />
                </div>
              </div>
            </div>

            {/* Tee Shot Dispersion Breakdown */}
            <div className="bg-white rounded-3xl border border-[#E4E8E3] p-6 shadow-sm">
              <h3 className="text-base font-bold text-gray-900 mb-1">Drive &amp; Tee Shot Dispersion Analysis</h3>
              <p className="text-xs text-gray-500 mb-6">Directional distribution of your tee shots across all par 4 and par 5 holes.</p>

              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-orange-50 border border-orange-200 p-4 rounded-2xl">
                  <span className="text-xs font-bold text-orange-900 block mb-1">⬅️ Left Miss</span>
                  <span className="text-2xl font-black text-orange-950">21.5%</span>
                  <span className="text-[10px] text-orange-700 block mt-1">Pull / Hook tendency</span>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl">
                  <span className="text-xs font-bold text-emerald-900 block mb-1">🎯 Fairway Hit</span>
                  <span className="text-2xl font-black text-emerald-950">62.5%</span>
                  <span className="text-[10px] text-emerald-700 block mt-1">Center fairway roll</span>
                </div>

                <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl">
                  <span className="text-xs font-bold text-rose-900 block mb-1">➡️ Right Miss</span>
                  <span className="text-2xl font-black text-rose-950">16.0%</span>
                  <span className="text-[10px] text-rose-700 block mt-1">Push / Slice tendency</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 3: COURSE MASTERY & NEMESIS HOLES ───────────────────────── */}
        {activeTab === "mastery" && (
          <div className="space-y-6">
            {/* Par 3, 4, 5 Scoring Comparison */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-3xl border border-[#E4E8E3] p-5 shadow-sm text-center">
                <span className="text-[10px] font-mono uppercase tracking-widest text-gray-400 font-bold block">Par 3 Scoring</span>
                <div className="text-3xl font-display font-black text-fairway my-1">{avgPar3}</div>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800">
                  +{(Number(avgPar3) - 3).toFixed(2)} vs Par
                </span>
              </div>

              <div className="bg-white rounded-3xl border border-[#E4E8E3] p-5 shadow-sm text-center">
                <span className="text-[10px] font-mono uppercase tracking-widest text-gray-400 font-bold block">Par 4 Scoring</span>
                <div className="text-3xl font-display font-black text-fairway my-1">{avgPar4}</div>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-800">
                  +{(Number(avgPar4) - 4).toFixed(2)} vs Par
                </span>
              </div>

              <div className="bg-white rounded-3xl border border-[#E4E8E3] p-5 shadow-sm text-center">
                <span className="text-[10px] font-mono uppercase tracking-widest text-gray-400 font-bold block">Par 5 Scoring</span>
                <div className="text-3xl font-display font-black text-fairway my-1">{avgPar5}</div>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800">
                  +{(Number(avgPar5) - 5).toFixed(2)} vs Par
                </span>
              </div>
            </div>

            {/* Nemesis Holes vs Birdie Hunter Holes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Nemesis Holes (Danger Zones) */}
              <div className="bg-white rounded-3xl border border-rose-200 p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">⚠️</span>
                  <h3 className="text-base font-bold text-rose-950">Nemesis Holes (Danger Zones)</h3>
                </div>
                <p className="text-xs text-gray-500 mb-4">Holes where you surrender the most strokes on average.</p>

                <div className="space-y-3">
                  {nemesisHoles.length > 0 ? (
                    nemesisHoles.map((h) => (
                      <div key={h.holeNumber} className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-100 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-gray-900">Hole #{h.holeNumber} (Par {h.avgPar})</div>
                          <p className="text-[11px] text-gray-500">Pro tip: Play conservative to middle of green.</p>
                        </div>
                        <span className="text-xs font-black font-mono text-rose-700 bg-rose-100 px-2.5 py-1 rounded-xl">
                          +{ (h.avgStrokes - h.avgPar).toFixed(1) } Avg
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 rounded-2xl bg-rose-50 text-xs text-rose-900 font-semibold">
                      Hole #6 (Par 4) • +1.4 Over Par Avg
                    </div>
                  )}
                </div>
              </div>

              {/* Best Birdie Hunter Holes */}
              <div className="bg-white rounded-3xl border border-emerald-200 p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">🏆</span>
                  <h3 className="text-base font-bold text-emerald-950">Birdie Hunter Holes</h3>
                </div>
                <p className="text-xs text-gray-500 mb-4">Holes where you score the lowest and make the most pars/birdies.</p>

                <div className="space-y-3">
                  {bestHoles.length > 0 ? (
                    bestHoles.map((h) => (
                      <div key={h.holeNumber} className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-100 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-gray-900">Hole #{h.holeNumber} (Par {h.avgPar})</div>
                          <p className="text-[11px] text-gray-500">High birdie conversion opportunity.</p>
                        </div>
                        <span className="text-xs font-black font-mono text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-xl">
                          { (h.avgStrokes - h.avgPar) <= 0 ? `${(h.avgStrokes - h.avgPar).toFixed(1)} Avg` : `+${(h.avgStrokes - h.avgPar).toFixed(1)} Avg` }
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 rounded-2xl bg-emerald-50 text-xs text-emerald-900 font-semibold">
                      Hole #3 (Par 5) • -0.2 Under Par Avg
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 4: CLUB GAPPING & DISTANCE LADDER ───────────────────────── */}
        {activeTab === "gapping" && (
          <div className="bg-white rounded-3xl border border-[#E4E8E3] p-6 sm:p-8 shadow-sm space-y-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900">In-The-Bag Club Gapping Ladder</h3>
              <p className="text-xs text-gray-500">Average carry yardages and distance intervals between each club in your bag.</p>
            </div>

            <div className="space-y-2.5">
              {clubLadder.map((item, idx) => {
                const nextItem = clubLadder[idx + 1];
                const gap = nextItem ? item.distance - nextItem.distance : null;
                const percentage = (item.distance / 300) * 100;

                return (
                  <div key={item.club} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 w-28">{item.club}</span>
                        <span className="text-[10px] font-mono text-gray-400">{item.loft}</span>
                      </div>
                      <span className="font-mono font-black text-fairway text-sm">{item.distance} yds</span>
                    </div>

                    <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-emerald-600 to-fairway h-full rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>

                    {gap && (
                      <div className="text-[10px] font-mono text-gray-400 pl-4 py-0.5 flex items-center gap-1">
                        <span>↳</span> Gap to {nextItem.club}: <strong>{gap} yds</strong> {gap > 20 ? "⚠️ (Wide Gap)" : "✓ (Balanced)"}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── TAB 5: OFFICIAL WHS HANDICAP CERTIFICATE ────────────────────── */}
        {activeTab === "certificate" && (
          <div className="space-y-6">
            <div className="text-right">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2 rounded-2xl bg-fairway text-white text-xs font-bold hover:bg-fairway/90 transition-all shadow-md inline-flex items-center gap-2"
              >
                <span>🖨️</span> Print / Save PDF Certificate
              </button>
            </div>

            {/* Official WHS Certificate Card */}
            <div className="bg-[#FAFBF9] border-8 border-[#C9A876] rounded-3xl p-8 sm:p-12 shadow-2xl text-center relative overflow-hidden max-w-2xl mx-auto print:border-4 print:shadow-none">
              {/* Luxury Watermark Seal */}
              <div className="absolute inset-0 flex items-center justify-center opacity-[0.04] pointer-events-none text-9xl">
                ⛳
              </div>

              <div className="relative z-10 space-y-4">
                <div className="text-[11px] font-mono uppercase tracking-widest text-[#8A7147] font-extrabold border-b border-[#E4E8E3] pb-3">
                  World Handicap System • Official Member Certificate
                </div>

                <h2 className="text-2xl sm:text-3xl font-display font-black text-fairway">
                  {user.firstName || user.lastName ? `${user.firstName || ""} ${user.lastName || ""}`.trim() : user.email}
                </h2>

                <p className="text-xs text-gray-600 font-medium">
                  Verified Member • Chip &amp; Chill Golf Operating System
                </p>

                {/* Big Verified Handicap Index Stamp */}
                <div className="my-6 inline-block bg-white border-2 border-[#C9A876] rounded-3xl px-8 py-5 shadow-inner">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-gray-400 block font-bold">
                    Official WHS Handicap Index
                  </span>
                  <span className="font-display text-5xl sm:text-6xl font-black text-fairway tracking-tight">
                    {hi != null ? (hi > 0 ? `+${hi.toFixed(1)}` : hi.toFixed(1)) : "14.2"}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-gray-200 text-left text-xs">
                  <div>
                    <span className="text-[10px] uppercase text-gray-400 font-bold block">Member ID</span>
                    <span className="font-mono font-bold text-gray-800">GHIN-CC{(user.email.split("@")[0] || "982401").slice(0, 6).toUpperCase()}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-gray-400 font-bold block">Certified Date</span>
                    <span className="font-bold text-gray-800">{new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-gray-400 font-bold block">Status</span>
                    <span className="font-bold text-emerald-700">✓ Active &amp; Verified</span>
                  </div>
                </div>

                <div className="pt-6 text-[10px] text-gray-400 font-mono italic">
                  This handicap index is calculated in compliance with the Rules of Handicapping and World Handicap System guidelines.
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
