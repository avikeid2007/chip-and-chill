import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import NavBar from "../components/NavBar";
import { tournamentApi } from "../api/tournament";
import { courseApi } from "../api/course";
import { useAuth } from "../api/AuthContext";
import { formatTime } from "../utils/time";
import type { TournamentDetail as TournamentDetailType, TournamentFormat } from "../types";

const FORMAT_LABELS: Record<TournamentFormat, string> = {
  StrokePlay: "Stroke Play",
  Stableford: "Stableford",
  Scramble: "Scramble",
  MatchPlay: "Match Play",
};

export default function TournamentDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const token = user?.token || null;
  const tenantId = user?.tenantId;

  const [tournament, setTournament] = useState<TournamentDetailType | null>(null);
  const [resolvedTenantId, setResolvedTenantId] = useState<string | null>(tenantId || null);
  const [currencySymbol, setCurrencySymbol] = useState("₹");
  const [activeTab, setActiveTab] = useState<"leaderboard" | "pairings">("leaderboard");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Score Entry Modal
  const [scoreModalOpen, setScoreModalOpen] = useState(false);
  const [selectedRegId, setSelectedRegId] = useState<string>("");
  const [holeNum, setHoleNum] = useState<number>(1);
  const [grossScore, setGrossScore] = useState<number>(4);
  const [holePar, setHolePar] = useState<number>(4);
  const [savingScore, setSavingScore] = useState(false);

  // Golfer Registration Modal
  const [regModalOpen, setRegModalOpen] = useState(false);
  const [regName, setRegName] = useState(user ? `${user.firstName} ${user.lastName}` : "");
  const [regEmail, setRegEmail] = useState(user ? user.email : "");
  const [regHandicap, setRegHandicap] = useState("10.0");
  const [registering, setRegistering] = useState(false);
  const [regSuccessMessage, setRegSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (resolvedTenantId) return;
    courseApi.list().then((tList) => {
      if (tList.length > 0) setResolvedTenantId(tList[0].id);
    }).catch(() => {});
  }, [resolvedTenantId]);

  useEffect(() => {
    if (!resolvedTenantId || !id) return;
    courseApi.getTenant(resolvedTenantId).then((t) => {
      if (t.currencySymbol) setCurrencySymbol(t.currencySymbol);
    }).catch(() => {});

    loadTournament();
  }, [resolvedTenantId, id]);

  async function loadTournament() {
    if (!resolvedTenantId || !id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await tournamentApi.getTournament(resolvedTenantId, id, token);
      setTournament(data);
      if (data.registrations.length > 0 && !selectedRegId) {
        setSelectedRegId(data.registrations[0].id);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load tournament details.");
    } finally {
      setLoading(false);
    }
  }

  async function handleScoreSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!resolvedTenantId || !id || !selectedRegId) return;
    setSavingScore(true);
    try {
      await tournamentApi.postScore(
        resolvedTenantId,
        id,
        {
          registrationId: selectedRegId,
          holeNumber: holeNum,
          grossScore: Number(grossScore),
          par: Number(holePar),
        },
        token
      );
      setScoreModalOpen(false);
      loadTournament();
    } catch (err: any) {
      alert(err?.message || "Failed to record score.");
    } finally {
      setSavingScore(false);
    }
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
          <p className="text-red-600 font-medium">{error || "Tournament not found"}</p>
          <Link to="/tournaments" className="btn-primary inline-block">
            ← Back to Tournaments
          </Link>
        </div>
      </div>
    );
  }

  // Group pairings by pairingGroup number
  const pairingsMap = new Map<number, typeof tournament.registrations>();
  tournament.registrations.forEach((r) => {
    const groupNum = r.pairingGroup || 1;
    const existing = pairingsMap.get(groupNum) || [];
    existing.push(r);
    pairingsMap.set(groupNum, existing);
  });
  const sortedGroupKeys = Array.from(pairingsMap.keys()).sort((a, b) => a - b);

  return (
    <div className="min-h-screen bg-[#FAFBF9]">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-fairway to-turf text-white">
        <NavBar />
        <div className="max-w-6xl mx-auto px-6 md:px-14 pb-12 pt-6">
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

            <div className="flex items-center gap-3">
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
                onClick={() => setScoreModalOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-gold text-fairway font-semibold text-xs hover:bg-gold-light transition-colors shadow-sm flex items-center gap-2"
              >
                <span>✏️</span> Log Live Score
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-6xl mx-auto px-6 md:px-14 py-8 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex border-b border-sand pb-px gap-6">
          <button
            onClick={() => setActiveTab("leaderboard")}
            className={`pb-3 text-sm font-semibold transition-colors relative ${
              activeTab === "leaderboard"
                ? "text-fairway border-b-2 border-fairway font-bold"
                : "text-fairway/60 hover:text-fairway"
            }`}
          >
            📊 Live Leaderboard ({tournament.leaderboard.length})
          </button>
          <button
            onClick={() => setActiveTab("pairings")}
            className={`pb-3 text-sm font-semibold transition-colors relative ${
              activeTab === "pairings"
                ? "text-fairway border-b-2 border-fairway font-bold"
                : "text-fairway/60 hover:text-fairway"
            }`}
          >
            🏌️ Groups &amp; Tee Times ({pairingsMap.size} Groups)
          </button>
        </div>

        {/* Tab 1: Live Leaderboard */}
        {activeTab === "leaderboard" && (
          <div className="bg-white rounded-2xl border border-sand-dark shadow-sm overflow-hidden">
            {tournament.leaderboard.length === 0 ? (
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
                      <th className="py-3.5 px-4 text-center">Thru</th>
                      <th className="py-3.5 px-4 text-center">To Par</th>
                      <th className="py-3.5 px-4 text-center">Gross</th>
                      {tournament.format === "Stableford" && (
                        <th className="py-3.5 px-4 text-center font-bold text-fairway">Points</th>
                      )}
                      <th className="py-3.5 px-4 text-center hidden md:table-cell">Eagles</th>
                      <th className="py-3.5 px-4 text-center hidden md:table-cell">Birdies</th>
                      <th className="py-3.5 px-4 text-center hidden md:table-cell">Pars</th>
                      <th className="py-3.5 px-4 text-center hidden md:table-cell">Bogeys</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sand">
                    {tournament.leaderboard.map((row) => {
                      const isUnderPar = row.toPar < 0;
                      const isEven = row.toPar === 0;
                      const toParFormatted = isEven ? "E" : row.toPar > 0 ? `+${row.toPar}` : `${row.toPar}`;
                      const medal = row.rank === 1 ? "🥇" : row.rank === 2 ? "🥈" : row.rank === 3 ? "🥉" : null;

                      return (
                        <tr key={row.registrationId} className="hover:bg-mist/50 transition-colors">
                          <td className="py-4 px-4 text-center font-mono font-bold text-fairway text-base">
                            {medal ? (
                              <span className="flex items-center justify-center gap-1">
                                <span>{medal}</span>
                                <span className="text-xs text-fairway/60">T{row.rank}</span>
                              </span>
                            ) : (
                              `T${row.rank}`
                            )}
                          </td>
                          <td className="py-4 px-4">
                            <div className="font-semibold text-fairway text-sm">
                              {row.golferName}
                            </div>
                            {row.handicapIndex !== null && row.handicapIndex !== undefined && (
                              <span className="text-[11px] font-mono text-fairway/50">
                                HCP: {row.handicapIndex.toFixed(1)}
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-4 text-center font-mono text-xs text-fairway/80">
                            {row.thruHoles === 0 ? "—" : row.thruHoles === tournament.holesCount ? "F" : row.thruHoles}
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span
                              className={`inline-block px-3 py-1 rounded-full text-xs font-mono font-bold ${
                                isUnderPar
                                  ? "bg-green-100 text-green-800"
                                  : isEven
                                  ? "bg-sand/60 text-fairway"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {toParFormatted}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-center font-mono font-bold text-fairway">
                            {row.totalGross > 0 ? row.totalGross : "—"}
                          </td>
                          {tournament.format === "Stableford" && (
                            <td className="py-4 px-4 text-center font-mono font-bold text-turf text-base">
                              {row.stablefordPoints} pts
                            </td>
                          )}
                          <td className="py-4 px-4 text-center font-mono text-xs hidden md:table-cell text-gold-dark font-bold">
                            {row.eagles > 0 ? `🦅 ${row.eagles}` : "—"}
                          </td>
                          <td className="py-4 px-4 text-center font-mono text-xs hidden md:table-cell text-green-700 font-bold">
                            {row.birdies > 0 ? `🟢 ${row.birdies}` : "—"}
                          </td>
                          <td className="py-4 px-4 text-center font-mono text-xs hidden md:table-cell text-fairway/70">
                            {row.pars > 0 ? row.pars : "—"}
                          </td>
                          <td className="py-4 px-4 text-center font-mono text-xs hidden md:table-cell text-red-600">
                            {row.bogeys > 0 ? row.bogeys : "—"}
                          </td>
                        </tr>
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
          <div className="space-y-4">
            {sortedGroupKeys.length === 0 ? (
              <div className="bg-white rounded-2xl border border-sand-dark p-12 text-center space-y-2">
                <p className="text-fairway font-medium">No pairings have been generated yet.</p>
                <p className="text-xs text-fairway/60">
                  The tournament director will announce group assignments before the opening round.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sortedGroupKeys.map((groupNum) => {
                  const groupPlayers = pairingsMap.get(groupNum) || [];
                  const teeTime = groupPlayers[0]?.teeTime;

                  return (
                    <div
                      key={groupNum}
                      className="bg-white rounded-2xl border border-sand-dark p-5 shadow-sm space-y-3"
                    >
                      <div className="flex items-center justify-between pb-3 border-b border-sand">
                        <span className="font-display font-bold text-base text-fairway">
                          Group {groupNum}
                        </span>
                        <span className="text-xs font-mono font-medium px-2.5 py-1 rounded-full bg-mist border border-sand text-fairway">
                          ⏰ {teeTime ? formatTime(teeTime) : "TBD"}
                        </span>
                      </div>

                      <div className="space-y-2">
                        {groupPlayers.map((player) => (
                          <div
                            key={player.id}
                            className="flex items-center justify-between text-xs py-1 px-2 rounded-lg hover:bg-mist transition-colors"
                          >
                            <span className="font-semibold text-fairway">{player.golferName}</span>
                            <span className="font-mono text-fairway/50">
                              {player.handicapIndex !== null && player.handicapIndex !== undefined
                                ? `HCP ${player.handicapIndex.toFixed(1)}`
                                : "HCP —"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Score Entry Modal */}
      {scoreModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-sand-dark animate-in fade-in zoom-in duration-150 space-y-4">
            <h3 className="font-display font-bold text-xl text-fairway">
              Record Tournament Score
            </h3>

            <form onSubmit={handleScoreSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-fairway/70 uppercase mb-1">
                  Select Golfer
                </label>
                <select
                  value={selectedRegId}
                  onChange={(e) => setSelectedRegId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-sand-dark text-fairway text-sm bg-white focus:outline-none focus:ring-2 focus:ring-fairway"
                >
                  {tournament.registrations.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.golferName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-fairway/70 uppercase mb-1">
                    Hole #
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={tournament.holesCount}
                    value={holeNum}
                    onChange={(e) => setHoleNum(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-sand-dark text-fairway text-sm font-mono focus:outline-none focus:ring-2 focus:ring-fairway"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-fairway/70 uppercase mb-1">
                    Par
                  </label>
                  <select
                    value={holePar}
                    onChange={(e) => setHolePar(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-sand-dark text-fairway text-sm font-mono bg-white focus:outline-none focus:ring-2 focus:ring-fairway"
                  >
                    <option value={3}>Par 3</option>
                    <option value={4}>Par 4</option>
                    <option value={5}>Par 5</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-fairway/70 uppercase mb-1">
                    Gross Score
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={15}
                    value={grossScore}
                    onChange={(e) => setGrossScore(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-sand-dark text-fairway text-sm font-mono focus:outline-none focus:ring-2 focus:ring-fairway"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setScoreModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-sand-dark text-fairway font-medium text-xs hover:bg-sand/30"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingScore}
                  className="flex-1 py-2.5 rounded-xl bg-fairway text-white font-semibold text-xs hover:bg-fairway-dark transition-colors disabled:opacity-50"
                >
                  {savingScore ? "Saving..." : "Save Hole Score"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Registration Modal */}
      {regModalOpen && tournament && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-sand-dark animate-in fade-in zoom-in duration-150 space-y-4">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-turf font-bold">
                Tournament Registration
              </div>
              <h3 className="font-display font-bold text-2xl text-fairway mt-1">
                {tournament.name}
              </h3>
              <p className="text-xs text-fairway/70 mt-1">
                {FORMAT_LABELS[tournament.format]} · {new Date(tournament.startDate).toLocaleDateString()}
              </p>
            </div>

            {regSuccessMessage ? (
              <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-green-800 text-sm font-medium text-center">
                {regSuccessMessage}
              </div>
            ) : (
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-fairway/70 uppercase mb-1">
                    Golfer Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="e.g. Scottie Scheffler"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-sand-dark text-fairway text-sm focus:outline-none focus:ring-2 focus:ring-fairway"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-fairway/70 uppercase mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="scottie@example.com"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-sand-dark text-fairway text-sm focus:outline-none focus:ring-2 focus:ring-fairway"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-fairway/70 uppercase mb-1">
                    Handicap Index (Optional)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={regHandicap}
                    onChange={(e) => setRegHandicap(e.target.value)}
                    placeholder="e.g. 5.2"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-sand-dark text-fairway text-sm font-mono focus:outline-none focus:ring-2 focus:ring-fairway"
                  />
                </div>

                <div className="p-3.5 rounded-xl bg-mist border border-sand flex items-center justify-between text-xs">
                  <span className="font-semibold text-fairway">Total Due:</span>
                  <span className="font-display font-bold text-base text-fairway">
                    {tournament.entryFee > 0
                      ? `${currencySymbol}${tournament.entryFee.toFixed(2)}`
                      : "Free Registration"}
                  </span>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setRegModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl border border-sand-dark text-fairway font-medium text-xs hover:bg-sand/30 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={registering}
                    className="flex-1 py-2.5 rounded-xl bg-fairway text-white font-semibold text-xs hover:bg-fairway-dark transition-colors disabled:opacity-50"
                  >
                    {registering ? "Confirming..." : "Complete & Pay"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
