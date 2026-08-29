import { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { tournamentApi } from "../api/tournament";
import { courseApi } from "../api/course";
import { formatTime } from "../utils/time";
import type { TournamentDetail } from "../types";

const PAGE_SIZE = 8;
const CYCLE_INTERVAL_MS = 10000;
const POLL_INTERVAL_MS = 15000;

export default function TournamentTvLeaderboard() {
  const { id } = useParams<{ id: string }>();
  const [tournament, setTournament] = useState<TournamentDetail | null>(null);
  const [tenantName, setTenantName] = useState("Clubhouse Arena");
  const [currentPage, setCurrentPage] = useState(0);
  const [scoringMode, setScoringMode] = useState<"gross" | "net">("gross");
  const [selectedFlight, setSelectedFlight] = useState<string>("all");
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 1. Fetch tournament details & poll live
  useEffect(() => {
    if (!id) return;
    const tournId: string = id;

    async function loadData() {
      try {
        let data: TournamentDetail | null = null;
        try {
          data = await tournamentApi.getTournamentDirect(tournId);
        } catch {
          const courses = await courseApi.list().catch(() => []);
          if (courses.length > 0) {
            data = await tournamentApi.getTournament(courses[0].id, tournId);
          }
        }

        if (data) {
          setTournament(data);
          setLastUpdated(new Date());
          setError(null);

          if (data.tenantId) {
            courseApi.getTenant(data.tenantId).then((t) => {
              if (t.name) setTenantName(t.name);
            }).catch(() => {});
          }
        } else {
          setError("Tournament not found.");
        }
      } catch (err: any) {
        console.error("TV Leaderboard fetch error:", err);
        if (!tournament) {
          setError(err?.message || "Failed to load tournament.");
        }
      } finally {
        setLoading(false);
      }
    }

    loadData();
    const interval = setInterval(loadData, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [id]);

  // Available unique flights
  const availableFlights = useMemo(() => {
    if (!tournament) return [];
    const set = new Set<string>();
    tournament.registrations.forEach((r) => {
      if (r.flight && r.flight.trim().length > 0) {
        set.add(r.flight.trim());
      }
    });
    return Array.from(set);
  }, [tournament]);

  // Sort rows based on gross vs net & flight filter
  const sortedLeaderboard = useMemo(() => {
    if (!tournament) return [];
    let list = [...tournament.leaderboard];

    if (selectedFlight !== "all") {
      list = list.filter((r) => r.flight === selectedFlight);
    }

    if (tournament.format === "Stableford") {
      list.sort((a, b) => {
        if (a.madeCut !== b.madeCut) return a.madeCut ? -1 : 1;
        return b.stablefordPoints - a.stablefordPoints;
      });
    } else if (scoringMode === "net") {
      list.sort((a, b) => {
        if (a.madeCut !== b.madeCut) return a.madeCut ? -1 : 1;
        if (a.thruHoles === 0 && b.thruHoles === 0) return 0;
        if (a.thruHoles === 0) return 1;
        if (b.thruHoles === 0) return -1;
        return a.netToPar - b.netToPar;
      });
    } else {
      list.sort((a, b) => {
        if (a.madeCut !== b.madeCut) return a.madeCut ? -1 : 1;
        if (a.thruHoles === 0 && b.thruHoles === 0) return 0;
        if (a.thruHoles === 0) return 1;
        if (b.thruHoles === 0) return -1;
        return a.toPar - b.toPar;
      });
    }

    return list.map((item, idx) => ({ ...item, rank: idx + 1 }));
  }, [tournament, scoringMode, selectedFlight]);

  // 2. Auto-cycle pagination for large tournaments
  const totalPages = useMemo(() => {
    if (sortedLeaderboard.length === 0) return 1;
    return Math.ceil(sortedLeaderboard.length / PAGE_SIZE);
  }, [sortedLeaderboard]);

  useEffect(() => {
    if (totalPages <= 1) {
      setCurrentPage(0);
      return;
    }
    const timer = setInterval(() => {
      setCurrentPage((prev) => (prev + 1) % totalPages);
    }, CYCLE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [totalPages]);

  const pagedRows = useMemo(() => {
    const start = currentPage * PAGE_SIZE;
    return sortedLeaderboard.slice(start, start + PAGE_SIZE);
  }, [sortedLeaderboard, currentPage]);

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }

  if (loading && !tournament) {
    return (
      <div className="h-screen bg-[#041610] text-white flex items-center justify-center font-display">
        <div className="text-center space-y-4">
          <div className="text-5xl animate-bounce">⛳</div>
          <h2 className="text-2xl font-bold text-emerald-300">Loading Live Clubhouse Leaderboard...</h2>
        </div>
      </div>
    );
  }

  if (error && !tournament) {
    return (
      <div className="h-screen bg-[#041610] text-white flex items-center justify-center font-display p-6">
        <div className="text-center space-y-4 max-w-md bg-white/5 border border-white/10 p-8 rounded-3xl backdrop-blur-md">
          <div className="text-5xl">⚠️</div>
          <h2 className="text-2xl font-bold text-white">Tournament TV Kiosk</h2>
          <p className="text-sm text-white/60">{error}</p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 rounded-xl bg-[#D4AF37] text-black font-bold text-xs"
            >
              🔄 Retry Connection
            </button>
            <Link
              to="/tournaments"
              className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs"
            >
              ← Back
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!tournament) return null;

  return (
    <div className="h-screen w-screen bg-[#041610] text-white flex flex-col justify-between overflow-hidden font-sans select-none p-6 sm:p-8">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none opacity-20 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-500 via-transparent to-transparent" />

      {/* Header Banner */}
      <header className="flex items-center justify-between pb-4 border-b border-white/10 relative z-10">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#996515] p-0.5 flex items-center justify-center shadow-lg shadow-black/40">
            <div className="w-full h-full bg-[#062016] rounded-2xl flex items-center justify-center text-2xl">
              🏆
            </div>
          </div>

          <div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono uppercase tracking-widest text-[#D4AF37] font-bold">
                {tenantName} · Live Leaderboard
              </span>
              {tournament.roundsCount > 1 && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40 font-mono">
                  ROUND {tournament.currentRound} OF {tournament.roundsCount}
                </span>
              )}
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                LIVE BROADCAST
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-black text-white tracking-tight mt-0.5">
              {tournament.name}
            </h1>
          </div>
        </div>

        {/* Right Controls & Info */}
        <div className="flex items-center gap-3">
          {/* Flight Filter (if flights exist) */}
          {availableFlights.length > 0 && (
            <div className="bg-white/10 p-1 rounded-2xl border border-white/15 flex items-center text-xs">
              <button
                onClick={() => setSelectedFlight("all")}
                className={`px-3 py-1 rounded-xl font-bold transition-all ${
                  selectedFlight === "all" ? "bg-[#D4AF37] text-black" : "text-white/70 hover:text-white"
                }`}
              >
                All
              </button>
              {availableFlights.map((flt) => (
                <button
                  key={flt}
                  onClick={() => setSelectedFlight(flt)}
                  className={`px-3 py-1 rounded-xl font-bold transition-all ${
                    selectedFlight === flt ? "bg-[#D4AF37] text-black" : "text-white/70 hover:text-white"
                  }`}
                >
                  {flt}
                </button>
              ))}
            </div>
          )}

          {/* Gross vs Net Switcher */}
          <div className="bg-white/10 p-1 rounded-2xl border border-white/15 flex items-center">
            <button
              onClick={() => setScoringMode("gross")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                scoringMode === "gross"
                  ? "bg-[#D4AF37] text-black shadow-md"
                  : "text-white/70 hover:text-white"
              }`}
            >
              GROSS
            </button>
            <button
              onClick={() => setScoringMode("net")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                scoringMode === "net"
                  ? "bg-[#D4AF37] text-black shadow-md"
                  : "text-white/70 hover:text-white"
              }`}
            >
              NET
            </button>
          </div>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-bold text-white transition-colors flex items-center gap-1.5"
            title="Toggle TV Fullscreen"
          >
            {isFullscreen ? "🗗" : "⛶ Fullscreen"}
          </button>

          <Link
            to={`/tournaments/${tournament.id}`}
            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-white/60 transition-colors"
          >
            ✕
          </Link>
        </div>
      </header>

      {/* Side Contests Ticker Bar */}
      {(tournament.closestToPinWinner || tournament.longestDriveWinner) && (
        <div className="bg-[#0B3024] border border-emerald-500/30 rounded-2xl px-6 py-2 flex items-center justify-around text-xs my-2 relative z-10 shadow-lg">
          <div className="flex items-center gap-2">
            <span>🎯</span>
            <span className="text-emerald-300 font-bold font-mono uppercase text-[11px]">Closest to Pin (Hole #{tournament.closestToPinHole || 3}):</span>
            <span className="font-display font-bold text-white text-sm">{tournament.closestToPinWinner || "In Play..."}</span>
          </div>
          <div className="h-4 w-px bg-white/20" />
          <div className="flex items-center gap-2">
            <span>⛳</span>
            <span className="text-gold-light font-bold font-mono uppercase text-[11px]">Longest Drive (Hole #{tournament.longestDriveHole || 18}):</span>
            <span className="font-display font-bold text-white text-sm">{tournament.longestDriveWinner || "In Play..."}</span>
          </div>
        </div>
      )}

      {/* Main High-Contrast Leaderboard Table */}
      <main className="flex-1 py-3 overflow-hidden flex flex-col justify-center relative z-10">
        <div className="bg-white/[0.04] border border-white/10 rounded-3xl overflow-hidden backdrop-blur-md shadow-2xl shadow-black/80 flex flex-col h-full">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 px-6 py-3.5 bg-white/[0.06] border-b border-white/10 text-xs font-mono uppercase tracking-widest text-[#D4AF37] font-bold">
            <div className="col-span-1 text-center">POS</div>
            <div className="col-span-4">GOLFER</div>
            <div className="col-span-2">DIVISION</div>
            <div className="col-span-1 text-center">THRU</div>
            <div className="col-span-2 text-center">SCORE ({scoringMode.toUpperCase()})</div>
            <div className="col-span-2 text-center">TO PAR</div>
          </div>

          {/* Table Rows */}
          <div className="flex-1 divide-y divide-white/5 flex flex-col justify-around">
            {pagedRows.map((row, idx) => {
              const displayRank = currentPage * PAGE_SIZE + idx + 1;
              const isLeader = displayRank === 1 && row.madeCut !== false;
              const toParVal = scoringMode === "net" ? row.netToPar : row.toPar;
              const displayScore = scoringMode === "net" ? row.totalNet : row.totalGross;

              return (
                <div
                  key={row.registrationId}
                  className={`grid grid-cols-12 gap-4 px-6 py-3 items-center transition-all ${
                    isLeader
                      ? "bg-[#D4AF37]/10 border-l-4 border-[#D4AF37]"
                      : "hover:bg-white/[0.02]"
                  }`}
                >
                  {/* Rank */}
                  <div className="col-span-1 text-center">
                    {row.madeCut !== false ? (
                      <span
                        className={`inline-flex items-center justify-center w-8 h-8 rounded-xl font-display font-black text-base ${
                          displayRank === 1
                            ? "bg-[#D4AF37] text-black shadow-lg"
                            : displayRank === 2
                            ? "bg-slate-300 text-black"
                            : displayRank === 3
                            ? "bg-amber-700 text-white"
                            : "bg-white/10 text-white/80"
                        }`}
                      >
                        {displayRank}
                      </span>
                    ) : (
                      <span className="inline-flex items-center justify-center px-2 py-1 rounded-lg bg-rose-500/20 text-rose-300 text-[10px] font-mono font-black border border-rose-500/30">
                        MC
                      </span>
                    )}
                  </div>

                  {/* Golfer Name & HCP */}
                  <div className="col-span-4 flex items-center gap-3">
                    <span className="font-display font-bold text-lg sm:text-xl text-white tracking-wide">
                      {row.golferName}
                    </span>
                    {row.handicapIndex !== null && row.handicapIndex !== undefined && (
                      <span className="text-xs px-2 py-0.5 rounded-md bg-white/10 text-emerald-300 font-mono">
                        HCP {row.handicapIndex.toFixed(1)}
                      </span>
                    )}
                  </div>

                  {/* Flight / Division */}
                  <div className="col-span-2 text-xs text-white/70 font-medium">
                    <span className="px-2.5 py-1 rounded-lg bg-white/10 text-white/90">
                      {row.flight || "General Field"}
                    </span>
                  </div>

                  {/* Thru */}
                  <div className="col-span-1 text-center font-mono font-bold text-base text-white/75">
                    {row.thruHoles === 0 ? "—" : row.thruHoles === tournament.holesCount ? "F" : row.thruHoles}
                  </div>

                  {/* Gross / Net Total */}
                  <div className="col-span-2 text-center font-mono font-black text-2xl text-white">
                    {row.thruHoles === 0 ? "—" : displayScore}
                  </div>

                  {/* To Par */}
                  <div className="col-span-2 text-center">
                    <span
                      className={`inline-block px-4 py-1 rounded-xl font-mono font-black text-lg ${
                        row.thruHoles === 0
                          ? "text-white/40"
                          : toParVal < 0
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                          : toParVal > 0
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                          : "bg-white/10 text-white"
                      }`}
                    >
                      {row.thruHoles === 0 ? "EVEN" : toParVal === 0 ? "E" : toParVal > 0 ? `+${toParVal}` : toParVal}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Footer Ticker & Page Indicators */}
      <footer className="flex items-center justify-between pt-4 border-t border-white/10 text-xs text-white/60 relative z-10">
        <div className="flex items-center gap-3">
          <span className="font-mono">Format: <strong className="text-white">{tournament.format}</strong></span>
          <span>•</span>
          <span className="font-mono">Field: <strong className="text-white">{tournament.registrations.length} Players</strong></span>
          <span>•</span>
          <span className="font-mono">Updated: <strong className="text-white">{formatTime(lastUpdated.toISOString())}</strong></span>
        </div>

        {/* Page Dots */}
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] text-white/50">Page {currentPage + 1} of {totalPages}</span>
            <div className="flex items-center gap-1.5">
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i)}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${
                    currentPage === i ? "bg-[#D4AF37] w-6" : "bg-white/20 hover:bg-white/40"
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </footer>
    </div>
  );
}
