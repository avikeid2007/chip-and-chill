import { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import NavBar from "../components/NavBar";
import SeoHead from "../components/SeoHead";
import { tournamentApi } from "../api/tournament";
import { courseApi } from "../api/course";
import { useAuth } from "../api/AuthContext";
import { formatTime } from "../utils/time";
import TournamentScorecardModal from "../components/TournamentScorecardModal";
import type {
  TournamentDetail as TournamentDetailType,
  TournamentFormat,
  TournamentHoleScore,
  TournamentRegistration,
  TournamentSkinsSummary,
  TournamentPayoutsResponse,
} from "../types";

const FORMAT_LABELS: Record<TournamentFormat, string> = {
  StrokePlay: "Stroke Play",
  Stableford: "Stableford",
  Scramble: "Scramble",
  MatchPlay: "Match Play",
};

const POLL_INTERVAL_MS = 20000;

export default function TournamentDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const token = user?.token || null;
  const tenantId = user?.tenantId;

  const [tournament, setTournament] = useState<TournamentDetailType | null>(null);
  const [resolvedTenantId, setResolvedTenantId] = useState<string | null>(tenantId || null);
  const [currencySymbol, setCurrencySymbol] = useState("₹");
  const [activeTab, setActiveTab] = useState<"leaderboard" | "pairings" | "skins" | "payouts">("leaderboard");
  const [scoringMode, setScoringMode] = useState<"gross" | "net">("gross");
  const [skinsMode, setSkinsMode] = useState<"gross" | "net">("gross");
  const [selectedFlight, setSelectedFlight] = useState<string>("all");
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Skins & Payouts
  const [skinsData, setSkinsData] = useState<TournamentSkinsSummary | null>(null);
  const [payoutsData, setPayoutsData] = useState<TournamentPayoutsResponse | null>(null);
  const [loadingSkins, setLoadingSkins] = useState(false);
  const [loadingPayouts, setLoadingPayouts] = useState(false);

  // Full 18-Hole Scorecard Modal
  const [scorecardModalOpen, setScorecardModalOpen] = useState(false);
  const [activeScorecardPlayer, setActiveScorecardPlayer] = useState<{
    id: string;
    name: string;
    handicap?: number | null;
    scores?: TournamentHoleScore[];
  } | null>(null);

  // Golfer Registration Modal
  const [regModalOpen, setRegModalOpen] = useState(false);
  const [regName, setRegName] = useState(user ? `${user.firstName} ${user.lastName}` : "");
  const [regEmail, setRegEmail] = useState(user ? user.email : "");
  const [regHandicap, setRegHandicap] = useState("10.0");
  const [regFlight, setRegFlight] = useState("");
  const [registering, setRegistering] = useState(false);
  const [regSuccessMessage, setRegSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (resolvedTenantId) {
      courseApi.getTenant(resolvedTenantId).then((t) => {
        if (t.currencySymbol) setCurrencySymbol(t.currencySymbol);
      }).catch(() => {});
    }
  }, [resolvedTenantId]);

  useEffect(() => {
    if (!id) return;
    loadTournament();
    const interval = setInterval(loadTournament, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [id, resolvedTenantId]);

  useEffect(() => {
    if (!id) return;
    const currentTenantId = resolvedTenantId || tournament?.tenantId;
    if (!currentTenantId) return;

    if (activeTab === "skins") {
      loadSkins(currentTenantId);
    } else if (activeTab === "payouts") {
      loadPayouts(currentTenantId);
    }
  }, [activeTab, resolvedTenantId, tournament?.tenantId, id, selectedFlight]);

  async function loadTournament() {
    if (!id) return;
    try {
      let data: TournamentDetailType;
      if (resolvedTenantId) {
        data = await tournamentApi.getTournament(resolvedTenantId, id, token);
      } else {
        data = await tournamentApi.getTournamentDirect(id, token);
        if (data.tenantId) {
          setResolvedTenantId(data.tenantId);
        }
      }
      setTournament(data);
      setError(null);
    } catch (err: any) {
      if (loading) {
        setError(err?.message || "Failed to load tournament details.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function loadSkins(tId?: string) {
    const targetTenantId = tId || resolvedTenantId || tournament?.tenantId;
    if (!targetTenantId || !id) return;
    setLoadingSkins(true);
    try {
      const flt = selectedFlight === "all" ? undefined : selectedFlight;
      const data = await tournamentApi.getSkins(targetTenantId, id, flt, token);
      setSkinsData(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingSkins(false);
    }
  }

  async function loadPayouts(tId?: string) {
    const targetTenantId = tId || resolvedTenantId || tournament?.tenantId;
    if (!targetTenantId || !id) return;
    setLoadingPayouts(true);
    try {
      const data = await tournamentApi.getPayouts(targetTenantId, id, undefined, token);
      setPayoutsData(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingPayouts(false);
    }
  }

  function openScorecard(regId?: string) {
    if (!tournament || tournament.registrations.length === 0) return;
    const reg = regId
      ? tournament.registrations.find((r) => r.id === regId)
      : tournament.registrations.find((r) => r.golferEmail === user?.email) || tournament.registrations[0];
    if (!reg) return;

    const lbRow = tournament.leaderboard.find((l) => l.registrationId === reg.id);
    setActiveScorecardPlayer({
      id: reg.id,
      name: reg.golferName,
      handicap: reg.handicapIndex,
      scores: lbRow?.holeScores || [],
    });
    setScorecardModalOpen(true);
  }

  async function handleRegisterSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!resolvedTenantId || !tournament) return;
    setRegistering(true);
    try {
      const reg = await tournamentApi.register(
        resolvedTenantId,
        tournament.id,
        {
          golferName: regName.trim(),
          golferEmail: regEmail.trim(),
          handicapIndex: parseFloat(regHandicap) || undefined,
          flight: regFlight.trim() || undefined,
        },
        token
      );

      if (tournament.entryFee > 0) {
        await tournamentApi.confirmSandboxPayment(resolvedTenantId, tournament.id, reg.id, token);
      }

      setRegSuccessMessage(`✓ Successfully registered for ${tournament.name}!`);
      loadTournament();
      setTimeout(() => {
        setRegModalOpen(false);
        setRegSuccessMessage(null);
      }, 1500);
    } catch (err: any) {
      alert(err?.message || "Registration failed.");
    } finally {
      setRegistering(false);
    }
  }

  // Available unique flights in the current tournament
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

  // Sorted leaderboard based on gross vs net & flight filter
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

  // Pairings grouping
  const pairingsMap = useMemo(() => {
    const map = new Map<number, TournamentRegistration[]>();
    if (!tournament) return map;
    tournament.registrations.forEach((r) => {
      if (r.pairingGroup) {
        const group = map.get(r.pairingGroup) || [];
        group.push(r);
        map.set(r.pairingGroup, group);
      }
    });
    return map;
  }, [tournament]);

  const sortedGroupKeys = useMemo(() => {
    return Array.from(pairingsMap.keys()).sort((a, b) => a - b);
  }, [pairingsMap]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFBF9]">
        <div className="bg-fairway"><NavBar /></div>
        <div className="max-w-5xl mx-auto px-8 py-20 text-center text-fairway/60">
          Loading tournament leaderboard...
        </div>
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="min-h-screen bg-[#FAFBF9]">
        <div className="bg-fairway"><NavBar /></div>
        <div className="max-w-5xl mx-auto px-8 py-20 text-center space-y-4">
          <div className="text-4xl">⚠️</div>
          <h2 className="text-xl font-bold text-fairway">Tournament Not Found</h2>
          <p className="text-xs text-fairway/60">{error || "Unable to locate this tournament."}</p>
          <Link to="/tournaments" className="inline-block px-5 py-2.5 rounded-xl bg-fairway text-white font-semibold text-xs">
            ← Back to Tournaments
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFBF9] text-fairway font-sans pb-16">
      <SeoHead
        title={`${tournament.name} — Live Leaderboard & Scores`}
        description={`Follow live scores, USGA hole-by-hole scorecards, skins pot calculations, cut lines, and payouts for ${tournament.name}.`}
        keywords={[tournament.name, "golf leaderboard", "live golf scores", "tournament pairings", "skins pot", "stableford", "stroke play"]}
        canonicalUrl={`https://chipandchill.com/tournaments/${id}`}
        ogType="event"
        jsonLd={[
          {
            "@type": "SportsEvent",
            "name": tournament.name,
            "description": tournament.description || `Live golf tournament: ${tournament.name}`,
            "startDate": tournament.startDate,
            "endDate": tournament.endDate,
            "eventStatus": tournament.status === "Completed"
              ? "https://schema.org/EventMovedOnline"
              : "https://schema.org/EventScheduled",
            "offers": {
              "@type": "Offer",
              "price": tournament.entryFee.toString(),
              "priceCurrency": "INR",
              "availability": tournament.registrations.length < tournament.maxParticipants
                ? "https://schema.org/InStock"
                : "https://schema.org/SoldOut",
              "url": `https://chipandchill.com/tournaments/${id}`
            },
            "url": `https://chipandchill.com/tournaments/${id}`
          },
          {
            "@type": "BreadcrumbList",
            "itemListElement": [
              {
                "@type": "ListItem",
                "position": 1,
                "name": "Home",
                "item": "https://chipandchill.com/"
              },
              {
                "@type": "ListItem",
                "position": 2,
                "name": "Tournaments",
                "item": "https://chipandchill.com/tournaments"
              },
              {
                "@type": "ListItem",
                "position": 3,
                "name": tournament.name,
                "item": `https://chipandchill.com/tournaments/${id}`
              }
            ]
          }
        ]}
      />
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-[#0B3024] to-[#124E3F] text-white">
        <NavBar />
        <div className="max-w-6xl mx-auto px-6 md:px-14 py-10">
          <Link
            to="/tournaments"
            className="text-xs font-mono text-sand hover:underline inline-flex items-center gap-1 mb-4"
          >
            ← All Tournaments
          </Link>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full bg-sand/20 text-sand border border-sand/30">
                  {FORMAT_LABELS[tournament.format]}
                </span>
                <span className="text-xs font-mono text-white/70">
                  {tournament.holesCount} Holes · {new Date(tournament.startDate).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} · {tournament.entryFee > 0 ? `${currencySymbol}${tournament.entryFee.toFixed(0)} Entry` : "Free Entry"}
                </span>
                {tournament.prizePurse > 0 && (
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-gold text-fairway">
                    🏆 {currencySymbol}{tournament.prizePurse.toLocaleString()} Purse
                  </span>
                )}
                {tournament.status === "InProgress" && (
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-red-500 text-white animate-pulse uppercase tracking-wider">
                    ● Live
                  </span>
                )}
              </div>
              <h1 className="text-3xl md:text-5xl font-display font-semibold tracking-tight">
                {tournament.name}
              </h1>
              {tournament.description && (
                <p className="text-white/80 text-sm max-w-2xl leading-relaxed">
                  {tournament.description}
                </p>
              )}
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {tournament.status !== "Completed" && tournament.registrations.length < tournament.maxParticipants && (
                <button
                  onClick={() => {
                    setRegSuccessMessage(null);
                    setRegModalOpen(true);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-white text-fairway font-semibold text-xs hover:bg-sand/30 transition-colors shadow-sm flex items-center gap-1.5"
                >
                  <span>🎟️</span> Register for Event
                </button>
              )}

              <button
                onClick={() => openScorecard()}
                className="px-5 py-2.5 rounded-xl bg-gold text-fairway font-semibold text-xs hover:bg-gold-light transition-colors shadow-sm flex items-center gap-2"
              >
                <span>✏️</span> Enter My Scores
              </button>

              <Link
                to={`/tournaments/${tournament.id}/tv`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 rounded-xl bg-[#062016] text-emerald-300 font-bold border border-emerald-500/30 hover:bg-[#082a1d] transition-colors shadow-sm flex items-center gap-1.5 text-xs"
              >
                <span>📺</span> TV Broadcast ↗
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Side Contests Banner */}
      {(tournament.closestToPinWinner || tournament.longestDriveWinner) && (
        <div className="bg-[#0B3024] text-white border-y border-emerald-800">
          <div className="max-w-6xl mx-auto px-6 md:px-14 py-3 flex items-center justify-around flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span>🎯</span>
              <span className="text-emerald-300 font-bold uppercase text-[10px] font-mono">Closest to Pin (Hole #{tournament.closestToPinHole || 3}):</span>
              <span className="font-bold">{tournament.closestToPinWinner || "In Play..."}</span>
            </div>
            <div className="h-4 w-px bg-white/20 hidden sm:block" />
            <div className="flex items-center gap-2">
              <span>⛳</span>
              <span className="text-gold-light font-bold uppercase text-[10px] font-mono">Longest Drive (Hole #{tournament.longestDriveHole || 18}):</span>
              <span className="font-bold">{tournament.longestDriveWinner || "In Play..."}</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="max-w-6xl mx-auto px-6 md:px-14 py-8 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-sand pb-px gap-6 flex-wrap">
          <div className="flex gap-6 overflow-x-auto">
            <button
              onClick={() => setActiveTab("leaderboard")}
              className={`pb-3 text-sm font-semibold transition-colors relative whitespace-nowrap ${
                activeTab === "leaderboard"
                  ? "text-fairway border-b-2 border-fairway font-bold"
                  : "text-fairway/60 hover:text-fairway"
              }`}
            >
              📊 Live Leaderboard ({tournament.leaderboard.length})
            </button>
            <button
              onClick={() => setActiveTab("pairings")}
              className={`pb-3 text-sm font-semibold transition-colors relative whitespace-nowrap ${
                activeTab === "pairings"
                  ? "text-fairway border-b-2 border-fairway font-bold"
                  : "text-fairway/60 hover:text-fairway"
              }`}
            >
              🏌️ Groups &amp; Tee Times ({pairingsMap.size} Groups)
            </button>
            <button
              onClick={() => setActiveTab("skins")}
              className={`pb-3 text-sm font-semibold transition-colors relative whitespace-nowrap ${
                activeTab === "skins"
                  ? "text-emerald-700 border-b-2 border-emerald-700 font-bold"
                  : "text-fairway/60 hover:text-fairway"
              }`}
            >
              🎯 Skins Game
            </button>
            <button
              onClick={() => setActiveTab("payouts")}
              className={`pb-3 text-sm font-semibold transition-colors relative whitespace-nowrap ${
                activeTab === "payouts"
                  ? "text-amber-700 border-b-2 border-amber-700 font-bold"
                  : "text-fairway/60 hover:text-fairway"
              }`}
            >
              💰 Prize Purse &amp; Payouts
            </button>
          </div>

          {activeTab === "leaderboard" && (
            <div className="bg-white p-1 rounded-xl border border-sand-dark flex items-center shadow-xs mb-2">
              <button
                type="button"
                onClick={() => setScoringMode("gross")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  scoringMode === "gross"
                    ? "bg-fairway text-white shadow-xs"
                    : "text-fairway/60 hover:text-fairway"
                }`}
              >
                Gross (Scratch)
              </button>
              <button
                type="button"
                onClick={() => setScoringMode("net")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  scoringMode === "net"
                    ? "bg-gold text-fairway shadow-xs"
                    : "text-fairway/60 hover:text-fairway"
                }`}
              >
                Net (Handicap)
              </button>
            </div>
          )}
        </div>

        {/* Flight Filter Pills (When available) */}
        {availableFlights.length > 0 && activeTab === "leaderboard" && (
          <div className="flex items-center gap-1.5 flex-wrap bg-white p-2.5 rounded-xl border border-sand">
            <span className="text-[10px] font-mono uppercase tracking-wider text-fairway/50 mr-1">
              Flight:
            </span>
            <button
              onClick={() => setSelectedFlight("all")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                selectedFlight === "all"
                  ? "bg-fairway text-white shadow-sm"
                  : "bg-mist text-fairway/70 hover:bg-sand/60"
              }`}
            >
              All Divisions ({tournament.registrations.length})
            </button>
            {availableFlights.map((flt) => (
              <button
                key={flt}
                onClick={() => setSelectedFlight(flt)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                  selectedFlight === flt
                    ? "bg-fairway text-white shadow-sm"
                    : "bg-mist text-fairway/70 hover:bg-sand/60"
                }`}
              >
                {flt}
              </button>
            ))}
          </div>
        )}

        {/* Tab 1: Live Leaderboard */}
        {activeTab === "leaderboard" && (
          <div className="bg-white rounded-2xl border border-sand-dark shadow-sm overflow-hidden">
            {sortedLeaderboard.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="text-4xl">⛳</div>
                <h3 className="font-display font-semibold text-lg text-fairway">No scores recorded yet</h3>
                <p className="text-xs text-fairway/60">
                  Scores will appear here as soon as golfers record their rounds.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-mist text-[11px] font-mono uppercase tracking-wider text-fairway/70 border-b border-sand">
                      <th className="py-3.5 px-4 text-center w-16">Pos</th>
                      <th className="py-3.5 px-4">Golfer</th>
                      <th className="py-3.5 px-4">Division</th>
                      <th className="py-3.5 px-4 text-center">Status</th>
                      <th className="py-3.5 px-4 text-center">Thru</th>
                      {tournament.roundsCount > 1 &&
                        Array.from({ length: tournament.roundsCount }).map((_, rIdx) => (
                          <th key={rIdx} className="py-3.5 px-2 text-center">R{rIdx + 1}</th>
                        ))}
                      <th className="py-3.5 px-4 text-center">To Par</th>
                      <th className="py-3.5 px-4 text-center">Gross</th>
                      <th className="py-3.5 px-4 text-center">Net</th>
                      <th className="py-3.5 px-4 text-center">Net To Par</th>
                      <th className="py-3.5 px-4 text-right">Card</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sand">
                    {sortedLeaderboard.map((row) => {
                      const isExpanded = expandedRowId === row.registrationId;
                      return (
                        <>
                          <tr
                            key={row.registrationId}
                            onClick={() => setExpandedRowId(isExpanded ? null : row.registrationId)}
                            className={`cursor-pointer transition-colors ${
                              isExpanded ? "bg-sand/20" : "hover:bg-mist/60"
                            }`}
                          >
                            <td className="py-4 px-4 text-center font-display font-black text-fairway">
                              {row.rank === 1 ? "🥇 1" : row.rank === 2 ? "🥈 2" : row.rank === 3 ? "🥉 3" : row.rank}
                            </td>
                            <td className="py-4 px-4">
                              <span className="font-semibold text-fairway block">{row.golferName}</span>
                              {row.handicapIndex !== null && row.handicapIndex !== undefined && (
                                <span className="text-[11px] text-fairway/50 font-mono">
                                  HCP {row.handicapIndex.toFixed(1)}
                                </span>
                              )}
                            </td>
                            <td className="py-4 px-4">
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-fairway/10 text-fairway">
                                {row.flight || "General"}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-center">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                  row.madeCut !== false
                                    ? "bg-green-100 text-green-800"
                                    : "bg-rose-100 text-rose-800"
                                }`}
                              >
                                {row.madeCut !== false ? "Made Cut" : "MC"}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-center font-mono font-medium">
                              {row.thruHoles === 0 ? "—" : row.thruHoles === tournament.holesCount ? "F" : row.thruHoles}
                            </td>
                            {tournament.roundsCount > 1 &&
                              Array.from({ length: tournament.roundsCount }).map((_, rIdx) => (
                                <td key={rIdx} className="py-4 px-2 text-center font-mono font-medium text-fairway/80">
                                  {row.roundGrossScores && row.roundGrossScores[rIdx] ? row.roundGrossScores[rIdx] : "—"}
                                </td>
                              ))}
                            <td className="py-4 px-4 text-center font-mono font-black text-base">
                              <span
                                className={
                                  row.toPar < 0
                                    ? "text-emerald-600"
                                    : row.toPar > 0
                                    ? "text-amber-700"
                                    : "text-fairway"
                                }
                              >
                                {row.thruHoles === 0 ? "—" : row.toPar === 0 ? "E" : row.toPar > 0 ? `+${row.toPar}` : row.toPar}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-center font-mono font-medium">
                              {row.totalGross || "—"}
                            </td>
                            <td className="py-4 px-4 text-center font-mono font-bold text-fairway">
                              {row.totalNet || "—"}
                            </td>
                            <td className="py-4 px-4 text-center font-mono font-black text-sm">
                              <span
                                className={
                                  row.netToPar < 0 ? "text-emerald-600" : row.netToPar > 0 ? "text-amber-700" : "text-fairway"
                                }
                              >
                                {row.thruHoles === 0 ? "—" : row.netToPar === 0 ? "E" : row.netToPar > 0 ? `+${row.netToPar}` : row.netToPar}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-right">
                              <button
                                type="button"
                                className="text-xs font-bold text-turf hover:underline"
                              >
                                {isExpanded ? "▲ Hide" : "▼ Card"}
                              </button>
                            </td>
                          </tr>

                          {/* 18-Hole Card Expanded View */}
                          {isExpanded && row.holeScores && row.holeScores.length > 0 && (
                            <tr className="bg-sand/30">
                              <td colSpan={10 + (tournament.roundsCount > 1 ? tournament.roundsCount : 0)} className="p-4">
                                <div className="bg-white rounded-xl p-3 border border-sand shadow-inner space-y-2">
                                  <span className="text-[10px] font-mono uppercase tracking-widest text-fairway/60 font-bold block">
                                    Hole Scores ({row.golferName})
                                  </span>
                                  <div className="grid grid-cols-9 sm:grid-cols-18 gap-1 text-center font-mono text-[10px]">
                                    {row.holeScores.map((h) => {
                                      const diff = h.grossScore - h.par;
                                      const bg =
                                        diff <= -2
                                          ? "bg-amber-200 text-amber-950 font-black"
                                          : diff === -1
                                          ? "bg-emerald-200 text-emerald-950 font-bold"
                                          : diff === 0
                                          ? "bg-gray-100 text-gray-800"
                                          : "bg-rose-100 text-rose-900";
                                      return (
                                        <div key={h.holeNumber} className="border border-sand rounded p-1 space-y-0.5">
                                          <div className="text-[9px] text-fairway/50 font-semibold">#{h.holeNumber}</div>
                                          <div className={`rounded py-0.5 font-bold ${bg}`}>{h.grossScore}</div>
                                          <div className="text-[8px] text-fairway/40">P{h.par}</div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Pairings & Tee Times */}
        {activeTab === "pairings" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sortedGroupKeys.map((groupNum) => {
              const players = pairingsMap.get(groupNum) || [];
              return (
                <div key={groupNum} className="bg-white rounded-2xl p-5 border border-sand-dark shadow-sm space-y-3">
                  <div className="flex items-center justify-between pb-3 border-b border-sand">
                    <span className="font-display font-bold text-sm text-fairway">
                      Group {groupNum}
                    </span>
                    <span className="text-xs font-mono font-bold text-turf bg-turf/10 px-2.5 py-0.5 rounded-full">
                      ⏰ {players[0]?.teeTime ? formatTime(players[0].teeTime) : "TBD"}
                    </span>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    {players.map((p, idx) => (
                      <div key={p.id} className="flex items-center justify-between">
                        <span className="text-fairway font-medium">
                          {idx + 1}. {p.golferName}
                        </span>
                        <span className="text-fairway/50 font-mono">
                          {p.handicapIndex !== null && p.handicapIndex !== undefined ? `HCP ${p.handicapIndex.toFixed(1)}` : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab 3: Skins Game */}
        {activeTab === "skins" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4 bg-white p-4 rounded-2xl border border-sand-dark">
              <div>
                <h3 className="font-display font-bold text-base text-fairway flex items-center gap-2">
                  <span>🎯</span> Live Tournament Skins
                </h3>
                <p className="text-xs text-fairway/60">
                  Outright lowest score per hole with carryovers
                </p>
              </div>

              <div className="flex items-center p-1 bg-mist rounded-xl border border-sand-dark">
                <button
                  onClick={() => setSkinsMode("gross")}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                    skinsMode === "gross" ? "bg-white text-fairway shadow-xs" : "text-fairway/60 hover:text-fairway"
                  }`}
                >
                  Gross Skins
                </button>
                <button
                  onClick={() => setSkinsMode("net")}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                    skinsMode === "net" ? "bg-white text-fairway shadow-xs" : "text-fairway/60 hover:text-fairway"
                  }`}
                >
                  Net Skins
                </button>
              </div>
            </div>

            {loadingSkins ? (
              <div className="p-8 text-center text-xs text-fairway/60">Computing skins...</div>
            ) : (
              <div className="bg-white rounded-2xl border border-sand-dark shadow-sm overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-mist text-[10px] font-mono uppercase tracking-wider text-fairway/70 border-b border-sand">
                      <th className="py-3 px-4">Hole</th>
                      <th className="py-3 px-4">Par</th>
                      <th className="py-3 px-4">Low Score</th>
                      <th className="py-3 px-4">Skin Winner</th>
                      <th className="py-3 px-4 text-right">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sand">
                    {(skinsMode === "gross" ? skinsData?.grossSkins : skinsData?.netSkins)?.map((s) => (
                      <tr key={s.holeNumber} className="hover:bg-mist/40 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-fairway">Hole #{s.holeNumber}</td>
                        <td className="py-3 px-4 font-mono text-fairway/60">Par {s.par}</td>
                        <td className="py-3 px-4 font-mono font-extrabold text-sm text-fairway">{s.winningScore}</td>
                        <td className="py-3 px-4 font-bold text-fairway">
                          {s.winnerName || <span className="text-fairway/40 font-normal">Tie / Carryover</span>}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {s.isCarryover ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900">
                              🔥 Carryover
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900">
                              ✓ 1 Skin Won
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Prize Purse & Payouts */}
        {activeTab === "payouts" && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-5 border border-sand-dark shadow-sm flex items-center justify-between flex-wrap gap-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-fairway/60 font-bold block">
                  Total Prize Purse
                </span>
                <span className="font-display font-black text-3xl text-fairway mt-0.5 block">
                  {currencySymbol}{(payoutsData?.totalPurse || 0).toLocaleString()}
                </span>
              </div>
              <span className="text-xs font-mono text-fairway/60">
                Top {payoutsData?.totalPaidPlaces || 0} Places Win Cash Prizes
              </span>
            </div>

            <div className="bg-white rounded-2xl border border-sand-dark shadow-sm overflow-hidden">
              {loadingPayouts ? (
                <div className="p-8 text-center text-xs text-fairway/60">Calculating payouts...</div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-mist text-[10px] font-mono uppercase tracking-wider text-fairway/70 border-b border-sand">
                      <th className="py-3 px-4">Place</th>
                      <th className="py-3 px-4">Golfer</th>
                      <th className="py-3 px-4 text-right">Prize Amount</th>
                      <th className="py-3 px-4 text-right">% of Purse</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sand">
                    {payoutsData?.payouts.map((p) => (
                      <tr key={p.registrationId} className="hover:bg-mist/40 transition-colors">
                        <td className="py-3 px-4 font-display font-black text-sm text-fairway">
                          {p.isTie ? `T${p.rank}` : `#${p.rank}`}
                        </td>
                        <td className="py-3 px-4 font-bold text-fairway">
                          {p.golferName}
                          {p.isTie && <span className="ml-2 text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-900">Tie Split</span>}
                        </td>
                        <td className="py-3 px-4 text-right font-display font-black text-sm text-emerald-700">
                          {currencySymbol}{p.payoutAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-fairway/70">
                          {p.pursePercentage.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Golfer Registration Modal */}
      {regModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleRegisterSubmit}
            className="bg-white rounded-3xl border border-sand-dark shadow-2xl w-full max-w-md p-6 space-y-4 font-sans text-fairway"
          >
            <div className="flex items-center justify-between border-b border-sand pb-3">
              <h3 className="font-display font-bold text-xl text-fairway">
                Register for {tournament.name}
              </h3>
              <button
                type="button"
                onClick={() => setRegModalOpen(false)}
                className="text-fairway/60 hover:text-fairway text-lg"
              >
                ✕
              </button>
            </div>

            {regSuccessMessage && (
              <div className="p-3 bg-green-50 border border-green-200 text-green-800 text-xs font-semibold rounded-xl">
                {regSuccessMessage}
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-fairway block mb-1">Your Full Name</label>
                <input
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-sand-dark"
                />
              </div>

              <div>
                <label className="font-bold text-fairway block mb-1">Your Email</label>
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-sand-dark font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-fairway block mb-1">Handicap Index</label>
                  <input
                    type="number"
                    step="0.1"
                    value={regHandicap}
                    onChange={(e) => setRegHandicap(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-sand-dark font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-fairway block mb-1">Preferred Division</label>
                  <input
                    type="text"
                    value={regFlight}
                    onChange={(e) => setRegFlight(e.target.value)}
                    placeholder="e.g. Flight A"
                    className="w-full px-3 py-2 rounded-xl border border-sand-dark"
                  />
                </div>
              </div>

              <div className="p-3 bg-mist rounded-xl text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-fairway/70">Entry Fee:</span>
                  <span className="font-bold">{tournament.entryFee > 0 ? `${currencySymbol}${tournament.entryFee.toFixed(2)}` : "Free"}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-sand">
              <button
                type="button"
                onClick={() => setRegModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-fairway/60 hover:text-fairway"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={registering}
                className="px-5 py-2.5 rounded-xl bg-fairway text-white text-xs font-bold hover:bg-fairway-dark transition-all disabled:opacity-50"
              >
                {registering ? "Confirming..." : "Confirm Registration"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 18-Hole Championship Scorecard Modal */}
      {scorecardModalOpen && activeScorecardPlayer && resolvedTenantId && (
        <TournamentScorecardModal
          isOpen={scorecardModalOpen}
          onClose={() => setScorecardModalOpen(false)}
          tenantId={resolvedTenantId}
          tournamentId={tournament.id}
          registrationId={activeScorecardPlayer.id}
          golferName={activeScorecardPlayer.name}
          handicapIndex={activeScorecardPlayer.handicap}
          holesCount={tournament.holesCount}
          roundsCount={tournament.roundsCount}
          currentRound={tournament.currentRound}
          initialScores={activeScorecardPlayer.scores}
          token={token}
          onScoresSaved={() => {
            loadTournament();
          }}
        />
      )}
    </div>
  );
}
