import { useEffect, useState } from "react";
import AdminLayout from "../components/AdminLayout";
import { useAuth } from "../api/AuthContext";
import { tournamentApi } from "../api/tournament";
import { courseApi } from "../api/course";
import { golfersApi } from "../api/golfers";
import { toDateInput, formatTime } from "../utils/time";
import type {
  TournamentSummary,
  TournamentDetail,
  TournamentFormat,
  TournamentStatus,
  TenantGolferSummary,
} from "../types";

const FORMAT_OPTIONS: { label: string; value: TournamentFormat }[] = [
  { label: "Stroke Play (Gross / Net)", value: "StrokePlay" },
  { label: "Stableford (Points)", value: "Stableford" },
  { label: "Team Scramble", value: "Scramble" },
  { label: "Match Play", value: "MatchPlay" },
];

export default function TournamentManager() {
  const { user } = useAuth();
  const token = user?.token || null;
  const tenantId = user?.tenantId;

  const [tournaments, setTournaments] = useState<TournamentSummary[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<TournamentDetail | null>(null);
  const [registeredGolfers, setRegisteredGolfers] = useState<TenantGolferSummary[]>([]);
  const [currencySymbol, setCurrencySymbol] = useState("₹");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create Tournament Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [format, setFormat] = useState<TournamentFormat>("StrokePlay");
  const [startDate, setStartDate] = useState(() => `${toDateInput(new Date())}T08:00`);
  const [endDate, setEndDate] = useState(() => `${toDateInput(new Date())}T16:00`);
  const [entryFee, setEntryFee] = useState("1000");
  const [maxParticipants, setMaxParticipants] = useState("72");
  const [holesCount, setHolesCount] = useState("18");
  const [creating, setCreating] = useState(false);

  // Pairings Modal
  const [pairingsModalOpen, setPairingsModalOpen] = useState(false);
  const [groupSize, setGroupSize] = useState(4);
  const [intervalMinutes, setIntervalMinutes] = useState(8);
  const [generatingPairings, setGeneratingPairings] = useState(false);

  // Enroll Player Modal
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [enrollName, setEnrollName] = useState("");
  const [enrollEmail, setEnrollEmail] = useState("");
  const [enrollHandicap, setEnrollHandicap] = useState("10.0");
  const [enrollPaymentStatus, setEnrollPaymentStatus] = useState<"Paid" | "Unpaid" | "Free">("Paid");
  const [enrolling, setEnrolling] = useState(false);

  // Score Entry Modal
  const [scoreModalOpen, setScoreModalOpen] = useState(false);
  const [scoreRegId, setScoreRegId] = useState("");
  const [scoreHoleNum, setScoreHoleNum] = useState(1);
  const [scoreGross, setScoreGross] = useState(4);
  const [scorePar, setScorePar] = useState(4);
  const [savingScore, setSavingScore] = useState(false);

  // Active view tab inside selected tournament
  const [detailTab, setDetailTab] = useState<"roster" | "leaderboard">("roster");

  useEffect(() => {
    if (!tenantId) return;
    courseApi.getTenant(tenantId).then((t) => {
      if (t.currencySymbol) setCurrencySymbol(t.currencySymbol);
    }).catch(() => {});
    loadTournaments();
    golfersApi.getGolfers(tenantId, undefined, token).then(setRegisteredGolfers).catch(() => {});
  }, [tenantId]);

  function handleSelectRegisteredGolfer(golferId: string) {
    if (!golferId) return;
    const g = registeredGolfers.find((x) => x.id === golferId);
    if (!g) return;
    setEnrollName(`${g.firstName} ${g.lastName}`.trim());
    setEnrollEmail(g.email);
    if (g.handicapIndex !== null && g.handicapIndex !== undefined) {
      setEnrollHandicap(g.handicapIndex.toString());
    }
  }

  async function loadTournaments() {
    if (!tenantId) return;
    setLoading(true);
    setError(null);
    try {
      const list = await tournamentApi.getTournaments(tenantId, undefined, token);
      setTournaments(list);
      if (list.length > 0 && !selectedTournament) {
        loadDetail(list[0].id);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load tournaments.");
    } finally {
      setLoading(false);
    }
  }

  async function loadDetail(tournId: string) {
    if (!tenantId) return;
    try {
      const detail = await tournamentApi.getTournament(tenantId, tournId, token);
      setSelectedTournament(detail);
    } catch (err: any) {
      setError(err?.message || "Failed to load tournament detail.");
    }
  }

  async function handleEnrollPlayer(e: React.FormEvent) {
    e.preventDefault();
    if (!tenantId || !selectedTournament) return;
    setEnrolling(true);
    try {
      const reg = await tournamentApi.register(
        tenantId,
        selectedTournament.id,
        {
          golferName: enrollName.trim(),
          golferEmail: enrollEmail.trim(),
          handicapIndex: parseFloat(enrollHandicap) || undefined,
        },
        token
      );

      if (enrollPaymentStatus === "Paid" && selectedTournament.entryFee > 0) {
        await tournamentApi.confirmSandboxPayment(tenantId, selectedTournament.id, reg.id, token);
      }

      setEnrollModalOpen(false);
      setEnrollName("");
      setEnrollEmail("");
      loadDetail(selectedTournament.id);
      loadTournaments();
    } catch (err: any) {
      alert(err?.message || "Failed to enroll player.");
    } finally {
      setEnrolling(false);
    }
  }

  function openScoreModal(regId?: string) {
    if (regId) {
      setScoreRegId(regId);
    } else if (selectedTournament && selectedTournament.registrations.length > 0) {
      setScoreRegId(selectedTournament.registrations[0].id);
    }
    setScoreModalOpen(true);
  }

  async function handleScoreSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!tenantId || !selectedTournament || !scoreRegId) return;
    setSavingScore(true);
    try {
      await tournamentApi.postScore(
        tenantId,
        selectedTournament.id,
        {
          registrationId: scoreRegId,
          holeNumber: Number(scoreHoleNum),
          grossScore: Number(scoreGross),
          par: Number(scorePar),
        },
        token
      );
      setScoreModalOpen(false);
      loadDetail(selectedTournament.id);
    } catch (err: any) {
      alert(err?.message || "Failed to record score.");
    } finally {
      setSavingScore(false);
    }
  }

  async function handleCreateTournament(e: React.FormEvent) {
    e.preventDefault();
    if (!tenantId) return;
    setCreating(true);
    try {
      await tournamentApi.createTournament(
        tenantId,
        {
          name,
          description,
          format,
          startDate: new Date(startDate).toISOString(),
          endDate: new Date(endDate).toISOString(),
          entryFee: parseFloat(entryFee) || 0,
          maxParticipants: parseInt(maxParticipants, 10) || 72,
          holesCount: parseInt(holesCount, 10) || 18,
          isPublic: true,
        },
        token
      );
      setCreateModalOpen(false);
      setName("");
      setDescription("");
      loadTournaments();
    } catch (err: any) {
      alert(err?.message || "Failed to create tournament.");
    } finally {
      setCreating(false);
    }
  }

  async function handleStatusChange(tournId: string, newStatus: TournamentStatus) {
    if (!tenantId) return;
    try {
      await tournamentApi.updateTournament(tenantId, tournId, { status: newStatus }, token);
      loadTournaments();
      if (selectedTournament?.id === tournId) {
        loadDetail(tournId);
      }
    } catch (err: any) {
      alert(err?.message || "Failed to update status.");
    }
  }

  async function handleGeneratePairings(e: React.FormEvent) {
    e.preventDefault();
    if (!tenantId || !selectedTournament) return;
    setGeneratingPairings(true);
    try {
      await tournamentApi.generatePairings(
        tenantId,
        selectedTournament.id,
        {
          playersPerGroup: groupSize,
          intervalMinutes,
        },
        token
      );
      setPairingsModalOpen(false);
      loadDetail(selectedTournament.id);
    } catch (err: any) {
      alert(err?.message || "Failed to generate pairings.");
    } finally {
      setGeneratingPairings(false);
    }
  }

  async function handleDeleteTournament(tournId: string) {
    if (!tenantId) return;
    if (!confirm("Are you sure you want to delete this tournament? All registrations and scores will be removed.")) return;
    try {
      await tournamentApi.deleteTournament(tenantId, tournId, token);
      setSelectedTournament(null);
      loadTournaments();
    } catch (err: any) {
      alert(err?.message || "Failed to delete tournament.");
    }
  }

  if (!tenantId) {
    return (
      <AdminLayout>
        <div className="p-12 text-center text-fairway/60">No course found for your account.</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-[11px] font-mono uppercase tracking-widest text-turf font-bold">
              Course Management
            </div>
            <h1 className="text-3xl font-display font-bold text-fairway tracking-tight">
              Tournaments &amp; Leagues
            </h1>
            <p className="text-xs text-fairway/60 mt-1">
              Create club tournaments, manage pairings, and broadcast live leaderboards.
            </p>
          </div>

          <button
            onClick={() => setCreateModalOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-fairway text-white font-medium hover:bg-fairway-dark transition-colors flex items-center gap-2 shadow-sm text-sm"
          >
            <span>+</span> New Tournament
          </button>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Layout: Tournament List & Management Drawer */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Events List */}
          <div className="bg-white rounded-2xl border border-sand-dark shadow-sm overflow-hidden divide-y divide-sand">
            <div className="p-4 bg-mist font-display font-semibold text-sm text-fairway flex items-center justify-between">
              <span>Club Tournaments</span>
              <span className="text-xs font-mono text-fairway/60">{tournaments.length} events</span>
            </div>

            {loading ? (
              <div className="p-8 text-center text-xs text-fairway/50">Loading tournaments...</div>
            ) : tournaments.length === 0 ? (
              <div className="p-8 text-center text-xs text-fairway/60 space-y-2">
                <p>No tournaments scheduled yet.</p>
                <button
                  onClick={() => setCreateModalOpen(true)}
                  className="text-turf font-semibold hover:underline"
                >
                  Create your first tournament →
                </button>
              </div>
            ) : (
              tournaments.map((t) => {
                const isSelected = selectedTournament?.id === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => loadDetail(t.id)}
                    className={`p-4 cursor-pointer transition-colors space-y-2 ${
                      isSelected ? "bg-sand/30 border-l-4 border-fairway" : "hover:bg-mist/60"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-fairway/10 text-fairway">
                        {t.format}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          t.status === "InProgress"
                            ? "bg-red-100 text-red-800"
                            : t.status === "Completed"
                            ? "bg-gray-100 text-gray-700"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {t.status}
                      </span>
                    </div>

                    <h3 className="font-display font-bold text-sm text-fairway">{t.name}</h3>

                    <div className="flex items-center justify-between text-xs text-fairway/60">
                      <span>{new Date(t.startDate).toLocaleDateString()}</span>
                      <span className="font-mono">{t.registeredCount} / {t.maxParticipants} players</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right 2 Columns: Selected Tournament Workspace */}
          <div className="lg:col-span-2 space-y-6">
            {selectedTournament ? (
              <div className="space-y-6">
                {/* Event Summary Card */}
                <div className="bg-white rounded-2xl p-6 border border-sand-dark shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-sand">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="font-display font-bold text-2xl text-fairway">
                          {selectedTournament.name}
                        </h2>
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-sand text-fairway">
                          {selectedTournament.format}
                        </span>
                      </div>
                      <p className="text-xs text-fairway/60 mt-1">
                        Starts {new Date(selectedTournament.startDate).toLocaleString()} · Entry Fee: {currencySymbol}{selectedTournament.entryFee.toFixed(2)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={selectedTournament.status}
                        onChange={(e) => handleStatusChange(selectedTournament.id, e.target.value as TournamentStatus)}
                        className="text-xs font-semibold px-3 py-2 rounded-lg border border-sand-dark bg-white text-fairway focus:outline-none focus:ring-2 focus:ring-fairway"
                      >
                        <option value="Upcoming">Upcoming</option>
                        <option value="InProgress">In Progress (Live)</option>
                        <option value="Completed">Completed</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>

                      <button
                        onClick={() => handleDeleteTournament(selectedTournament.id)}
                        className="text-xs px-3 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <button
                      onClick={() => setPairingsModalOpen(true)}
                      className="text-xs px-3.5 py-2 rounded-xl bg-gold text-fairway font-semibold hover:bg-gold-light transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                      <span>⚡</span> Auto-Generate Pairings
                    </button>
                    <button
                      onClick={() => openScoreModal()}
                      disabled={selectedTournament.registrations.length === 0}
                      className="text-xs px-3.5 py-2 rounded-xl bg-fairway text-white font-semibold hover:bg-fairway-dark transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                    >
                      <span>📝</span> Log Hole Score
                    </button>
                    <a
                      href={`/tournaments/${selectedTournament.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs px-3.5 py-2 rounded-xl border border-sand-dark text-fairway font-medium hover:bg-mist transition-colors flex items-center gap-1.5"
                    >
                      <span>🔗</span> Public Leaderboard ↗
                    </a>
                  </div>
                </div>

                {/* Sub-tabs: Roster vs Leaderboard */}
                <div className="flex items-center gap-2 border-b border-sand pb-1">
                  <button
                    onClick={() => setDetailTab("roster")}
                    className={`px-4 py-2 text-xs font-semibold rounded-t-xl transition-colors border-b-2 ${
                      detailTab === "roster"
                        ? "border-fairway text-fairway bg-mist"
                        : "border-transparent text-fairway/60 hover:text-fairway"
                    }`}
                  >
                    👥 Players &amp; Pairings ({selectedTournament.registrations.length})
                  </button>
                  <button
                    onClick={() => setDetailTab("leaderboard")}
                    className={`px-4 py-2 text-xs font-semibold rounded-t-xl transition-colors border-b-2 ${
                      detailTab === "leaderboard"
                        ? "border-gold text-fairway bg-gold/10"
                        : "border-transparent text-fairway/60 hover:text-fairway"
                    }`}
                  >
                    🏆 Live Leaderboard ({selectedTournament.leaderboard.length})
                  </button>
                </div>

                {/* Tab 1: Registrations & Pairings Roster Table */}
                {detailTab === "roster" && (
                  <div className="bg-white rounded-2xl border border-sand-dark shadow-sm overflow-hidden">
                    <div className="p-4 bg-mist border-b border-sand flex items-center justify-between">
                      <h3 className="font-display font-semibold text-sm text-fairway">
                        Registered Players ({selectedTournament.registrations.length})
                      </h3>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEnrollModalOpen(true)}
                          className="text-xs px-3.5 py-1.5 rounded-lg bg-fairway text-white font-medium hover:bg-fairway-dark transition-colors flex items-center gap-1 shadow-sm"
                        >
                          <span>+</span> Enroll Player
                        </button>
                      </div>
                    </div>

                    {selectedTournament.registrations.length === 0 ? (
                      <div className="p-8 text-center text-xs text-fairway/60 space-y-3">
                        <p>No golfers have registered for this tournament yet.</p>
                        <button
                          onClick={() => setEnrollModalOpen(true)}
                          className="px-4 py-2 rounded-lg bg-fairway text-white font-medium text-xs hover:bg-fairway-dark transition-colors inline-flex items-center gap-1.5"
                        >
                          <span>+</span> Enroll First Player
                        </button>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-mist text-[10px] font-mono uppercase tracking-wider text-fairway/70 border-b border-sand">
                              <th className="py-3 px-4">Golfer</th>
                              <th className="py-3 px-4">Handicap</th>
                              <th className="py-3 px-4">Payment</th>
                              <th className="py-3 px-4">Group</th>
                              <th className="py-3 px-4">Tee Time</th>
                              <th className="py-3 px-4 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-sand">
                            {selectedTournament.registrations.map((r) => (
                              <tr key={r.id} className="hover:bg-mist/40 transition-colors">
                                <td className="py-3 px-4 font-semibold text-fairway">
                                  <div>{r.golferName}</div>
                                  <div className="text-[10px] font-mono text-fairway/50 font-normal">{r.golferEmail}</div>
                                </td>
                                <td className="py-3 px-4 font-mono">
                                  {r.handicapIndex !== null && r.handicapIndex !== undefined
                                    ? r.handicapIndex.toFixed(1)
                                    : "—"}
                                </td>
                                <td className="py-3 px-4">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                      r.paymentStatus === "Paid" || r.paymentStatus === "Free"
                                        ? "bg-green-100 text-green-800"
                                        : "bg-amber-100 text-amber-800"
                                    }`}
                                  >
                                    {r.paymentStatus}
                                  </span>
                                </td>
                                <td className="py-3 px-4 font-mono font-bold text-fairway">
                                  {r.pairingGroup ? `Group ${r.pairingGroup}` : "—"}
                                </td>
                                <td className="py-3 px-4 font-mono text-fairway/70">
                                  {r.teeTime ? formatTime(r.teeTime) : "—"}
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <button
                                    onClick={() => openScoreModal(r.id)}
                                    className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-fairway/10 text-fairway hover:bg-fairway hover:text-white transition-colors"
                                  >
                                    📝 Enter Score
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* Tab 2: Live Leaderboard */}
                {detailTab === "leaderboard" && (
                  <div className="bg-white rounded-2xl border border-sand-dark shadow-sm overflow-hidden">
                    <div className="p-4 bg-mist border-b border-sand flex items-center justify-between">
                      <div>
                        <h3 className="font-display font-semibold text-sm text-fairway">
                          Live Tournament Standings ({selectedTournament.format})
                        </h3>
                        <p className="text-[11px] text-fairway/60">
                          Real-time gross scores, to-par differentials, and hole progress
                        </p>
                      </div>
                      <button
                        onClick={() => openScoreModal()}
                        disabled={selectedTournament.registrations.length === 0}
                        className="text-xs px-3.5 py-1.5 rounded-lg bg-fairway text-white font-medium hover:bg-fairway-dark transition-colors flex items-center gap-1 shadow-sm disabled:opacity-50"
                      >
                        <span>+</span> Log Score
                      </button>
                    </div>

                    {selectedTournament.leaderboard.length === 0 ? (
                      <div className="p-8 text-center text-xs text-fairway/60 space-y-3">
                        <p>No hole scores recorded yet. Click below to start recording live player scores!</p>
                        <button
                          onClick={() => openScoreModal()}
                          disabled={selectedTournament.registrations.length === 0}
                          className="px-4 py-2 rounded-lg bg-fairway text-white font-medium text-xs hover:bg-fairway-dark transition-colors inline-flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <span>📝</span> Enter First Score
                        </button>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-mist text-[10px] font-mono uppercase tracking-wider text-fairway/70 border-b border-sand">
                              <th className="py-3 px-4 w-12 text-center">Pos</th>
                              <th className="py-3 px-4">Golfer</th>
                              <th className="py-3 px-4">Holes</th>
                              <th className="py-3 px-4 font-mono text-center">To Par</th>
                              <th className="py-3 px-4 font-mono text-center">Gross</th>
                              {selectedTournament.format === "Stableford" && (
                                <th className="py-3 px-4 font-mono text-center">Points</th>
                              )}
                              <th className="py-3 px-4 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-sand">
                            {selectedTournament.leaderboard.map((row, idx) => {
                              const isE = row.toPar === 0;
                              const isUnder = row.toPar < 0;
                              const toParDisplay = row.thruHoles === 0 ? "—" : isE ? "E" : isUnder ? `${row.toPar}` : `+${row.toPar}`;
                              const rank = idx + 1;
                              const posDisplay = rank === 1 ? "🥇 1" : rank === 2 ? "🥈 2" : rank === 3 ? "🥉 3" : `T${rank}`;

                              return (
                                <tr key={row.registrationId} className="hover:bg-mist/40 transition-colors">
                                  <td className="py-3 px-4 text-center font-bold text-fairway">
                                    {posDisplay}
                                  </td>
                                  <td className="py-3 px-4 font-semibold text-fairway">
                                    <div>{row.golferName}</div>
                                    <div className="text-[10px] font-mono text-fairway/50 font-normal">
                                      {row.handicapIndex !== undefined && row.handicapIndex !== null ? `Hcp: ${row.handicapIndex.toFixed(1)}` : ""}
                                    </div>
                                  </td>
                                  <td className="py-3 px-4 font-mono">
                                    <span className="px-2 py-0.5 rounded-full bg-mist text-[11px] font-semibold text-fairway">
                                      {row.thruHoles === 0 ? "Not Started" : row.thruHoles >= selectedTournament.holesCount ? "F" : `Thru ${row.thruHoles}`}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-center font-mono font-bold">
                                    <span
                                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                        row.thruHoles === 0
                                          ? "text-fairway/40"
                                          : isUnder
                                          ? "bg-green-100 text-green-700"
                                          : isE
                                          ? "bg-amber-100 text-amber-800"
                                          : "bg-red-50 text-red-600"
                                      }`}
                                    >
                                      {toParDisplay}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-center font-mono font-bold text-fairway text-sm">
                                    {row.totalGross || "—"}
                                  </td>
                                  {selectedTournament.format === "Stableford" && (
                                    <td className="py-3 px-4 text-center font-mono font-bold text-gold">
                                      {row.stablefordPoints} pts
                                    </td>
                                  )}
                                  <td className="py-3 px-4 text-right">
                                    <button
                                      onClick={() => openScoreModal(row.registrationId)}
                                      className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-fairway text-white hover:bg-fairway-dark transition-colors"
                                    >
                                      + Score
                                    </button>
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
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-sand-dark p-12 text-center text-fairway/60 text-sm">
                Select a tournament to view details, pairings, and scoring.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Tournament Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-sand-dark animate-in fade-in zoom-in duration-150 space-y-4">
            <h3 className="font-display font-bold text-xl text-fairway">
              Create New Tournament
            </h3>

            <form onSubmit={handleCreateTournament} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-fairway/70 uppercase mb-1">
                  Tournament Title
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Annual Club Championship, Autumn Scramble"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-sand-dark text-fairway text-sm focus:outline-none focus:ring-2 focus:ring-fairway"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-fairway/70 uppercase mb-1">
                  Description &amp; Rules
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Rules of play, prize purse, flights, eligibility..."
                  className="w-full px-3.5 py-2 rounded-lg border border-sand-dark text-fairway text-sm focus:outline-none focus:ring-2 focus:ring-fairway"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-fairway/70 uppercase mb-1">
                    Format
                  </label>
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value as TournamentFormat)}
                    className="w-full px-3 py-2 rounded-lg border border-sand-dark text-fairway text-sm bg-white focus:outline-none focus:ring-2 focus:ring-fairway"
                  >
                    {FORMAT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-fairway/70 uppercase mb-1">
                    Entry Fee ({currencySymbol})
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={entryFee}
                    onChange={(e) => setEntryFee(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-sand-dark text-fairway text-sm font-mono focus:outline-none focus:ring-2 focus:ring-fairway"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-fairway/70 uppercase mb-1">
                    Start Date &amp; Time
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-sand-dark text-fairway text-sm font-mono focus:outline-none focus:ring-2 focus:ring-fairway"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-fairway/70 uppercase mb-1">
                    End Date &amp; Time
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-sand-dark text-fairway text-sm font-mono focus:outline-none focus:ring-2 focus:ring-fairway"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-fairway/70 uppercase mb-1">
                    Max Golfer Capacity
                  </label>
                  <input
                    type="number"
                    min={4}
                    value={maxParticipants}
                    onChange={(e) => setMaxParticipants(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-sand-dark text-fairway text-sm font-mono focus:outline-none focus:ring-2 focus:ring-fairway"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-fairway/70 uppercase mb-1">
                    Holes Count
                  </label>
                  <select
                    value={holesCount}
                    onChange={(e) => setHolesCount(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-sand-dark text-fairway text-sm font-mono bg-white focus:outline-none focus:ring-2 focus:ring-fairway"
                  >
                    <option value="18">18 Holes</option>
                    <option value="9">9 Holes</option>
                    <option value="36">36 Holes (2 Rounds)</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-sand-dark text-fairway font-medium text-xs hover:bg-sand/30"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 py-2.5 rounded-xl bg-fairway text-white font-semibold text-xs hover:bg-fairway-dark transition-colors disabled:opacity-50"
                >
                  {creating ? "Creating..." : "Create Tournament"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Auto-Pairings Modal */}
      {pairingsModalOpen && selectedTournament && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-sand-dark animate-in fade-in zoom-in duration-150 space-y-4">
            <h3 className="font-display font-bold text-xl text-fairway">
              Generate Automated Pairings
            </h3>
            <p className="text-xs text-fairway/60">
              Sorts players by handicap and assigns balanced groups with staggered tee time intervals.
            </p>

            <form onSubmit={handleGeneratePairings} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-fairway/70 uppercase mb-1">
                    Players per Group
                  </label>
                  <select
                    value={groupSize}
                    onChange={(e) => setGroupSize(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-sand-dark text-fairway text-sm bg-white font-mono"
                  >
                    <option value={2}>2 Players (Twosomes)</option>
                    <option value={3}>3 Players (Threesomes)</option>
                    <option value={4}>4 Players (Foursomes)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-fairway/70 uppercase mb-1">
                    Interval (Minutes)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={20}
                    value={intervalMinutes}
                    onChange={(e) => setIntervalMinutes(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-sand-dark text-fairway text-sm font-mono"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPairingsModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-sand-dark text-fairway font-medium text-xs hover:bg-sand/30"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={generatingPairings}
                  className="flex-1 py-2.5 rounded-xl bg-gold text-fairway font-semibold text-xs hover:bg-gold-light transition-colors disabled:opacity-50"
                >
                  {generatingPairings ? "Generating..." : "Generate Groups"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enroll Player Modal */}
      {enrollModalOpen && selectedTournament && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-sand-dark animate-in fade-in zoom-in duration-150 space-y-4">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-turf font-bold">
                Admin Player Enrollment
              </div>
              <h3 className="font-display font-bold text-xl text-fairway mt-1">
                Enroll Player into {selectedTournament.name}
              </h3>
            </div>

            <form onSubmit={handleEnrollPlayer} className="space-y-4">
              {registeredGolfers.length > 0 && (
                <div className="p-3 bg-mist rounded-xl border border-sand">
                  <label className="block text-[11px] font-semibold text-fairway/80 uppercase mb-1">
                    Quick Select from Registered Members
                  </label>
                  <select
                    onChange={(e) => handleSelectRegisteredGolfer(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-sand-dark text-fairway text-xs bg-white focus:outline-none focus:ring-2 focus:ring-fairway"
                  >
                    <option value="">-- Choose Registered Golfer --</option>
                    {registeredGolfers.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.firstName} {g.lastName} ({g.email}) {g.handicapIndex !== null && g.handicapIndex !== undefined ? `· Hcp: ${g.handicapIndex.toFixed(1)}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-fairway/70 uppercase mb-1">
                  Golfer Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Scottie Scheffler"
                  value={enrollName}
                  onChange={(e) => setEnrollName(e.target.value)}
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
                  placeholder="scottie@example.com"
                  value={enrollEmail}
                  onChange={(e) => setEnrollEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-sand-dark text-fairway text-sm focus:outline-none focus:ring-2 focus:ring-fairway"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-fairway/70 uppercase mb-1">
                    Handicap Index
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 2.4"
                    value={enrollHandicap}
                    onChange={(e) => setEnrollHandicap(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-sand-dark text-fairway text-sm font-mono focus:outline-none focus:ring-2 focus:ring-fairway"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-fairway/70 uppercase mb-1">
                    Payment Status
                  </label>
                  <select
                    value={enrollPaymentStatus}
                    onChange={(e) => setEnrollPaymentStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-sand-dark text-fairway text-sm bg-white font-medium"
                  >
                    <option value="Paid">Paid ({currencySymbol}{selectedTournament.entryFee})</option>
                    <option value="Unpaid">Unpaid</option>
                    <option value="Free">Free / Comped</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEnrollModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-sand-dark text-fairway font-medium text-xs hover:bg-sand/30"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={enrolling}
                  className="flex-1 py-2.5 rounded-xl bg-fairway text-white font-semibold text-xs hover:bg-fairway-dark transition-colors disabled:opacity-50"
                >
                  {enrolling ? "Enrolling..." : "Enroll Player"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Interactive Score Entry Modal */}
      {scoreModalOpen && selectedTournament && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-sand-dark animate-in fade-in zoom-in duration-150 space-y-5">
            <div className="flex items-center justify-between border-b border-sand pb-3">
              <div>
                <h3 className="font-display font-bold text-lg text-fairway flex items-center gap-2">
                  <span>📝</span> Record Live Hole Score
                </h3>
                <p className="text-xs text-fairway/60">
                  {selectedTournament.name} · {selectedTournament.format}
                </p>
              </div>
              <button
                onClick={() => setScoreModalOpen(false)}
                className="w-8 h-8 rounded-full bg-mist hover:bg-sand text-fairway font-bold text-xs flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleScoreSubmit} className="space-y-4">
              {/* Select Golfer */}
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-fairway/70 mb-1.5 font-bold">
                  Golfer
                </label>
                <select
                  value={scoreRegId}
                  onChange={(e) => setScoreRegId(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-sand-dark text-fairway text-sm bg-white font-semibold focus:outline-none focus:ring-2 focus:ring-fairway"
                >
                  {selectedTournament.registrations.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.golferName} {r.handicapIndex !== null && r.handicapIndex !== undefined ? `(Hcp ${r.handicapIndex.toFixed(1)})` : ""} {r.pairingGroup ? `· Group ${r.pairingGroup}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Hole Number Selector (1 - 18) */}
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-fairway/70 mb-1.5 font-bold">
                  Hole Number (1 to {selectedTournament.holesCount})
                </label>
                <div className="grid grid-cols-6 sm:grid-cols-9 gap-1.5">
                  {Array.from({ length: selectedTournament.holesCount }, (_, i) => i + 1).map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setScoreHoleNum(h)}
                      className={`py-2 rounded-lg text-xs font-mono font-bold transition-all ${
                        scoreHoleNum === h
                          ? "bg-fairway text-white shadow-md scale-105"
                          : "bg-mist text-fairway/70 hover:bg-sand/60 hover:text-fairway"
                      }`}
                    >
                      {h}
                    </button>
                  ))}
                </div>
              </div>

              {/* Hole Par Selector */}
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-fairway/70 mb-1.5 font-bold">
                  Hole Par
                </label>
                <div className="flex gap-2">
                  {[3, 4, 5].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setScorePar(p)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                        scorePar === p
                          ? "bg-gold text-fairway shadow-sm scale-102"
                          : "bg-mist text-fairway/70 hover:bg-sand/60"
                      }`}
                    >
                      Par {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Gross Score (Strokes) Selector */}
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-fairway/70 mb-1.5 font-bold">
                  Strokes (Gross Score)
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setScoreGross(Math.max(1, scoreGross - 1))}
                    className="w-12 h-12 rounded-2xl bg-mist hover:bg-sand text-fairway text-xl font-bold flex items-center justify-center transition-colors"
                  >
                    −
                  </button>
                  <div className="flex-1 text-center py-2 bg-fairway/5 rounded-2xl border border-fairway/20">
                    <span className="text-3xl font-display font-black text-fairway font-mono">
                      {scoreGross}
                    </span>
                    <span className="text-xs text-fairway/60 block font-medium">strokes</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setScoreGross(Math.min(15, scoreGross + 1))}
                    className="w-12 h-12 rounded-2xl bg-mist hover:bg-sand text-fairway text-xl font-bold flex items-center justify-center transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Instant Score Result Banner */}
              {(() => {
                const diff = scoreGross - scorePar;
                let label = "Par";
                let badgeClass = "bg-amber-100 text-amber-900 border-amber-300";
                if (diff <= -3) { label = "Albatross (-3)"; badgeClass = "bg-purple-100 text-purple-900 border-purple-300"; }
                else if (diff === -2) { label = "Eagle (-2)"; badgeClass = "bg-emerald-100 text-emerald-900 border-emerald-300"; }
                else if (diff === -1) { label = "Birdie (-1)"; badgeClass = "bg-green-100 text-green-900 border-green-300"; }
                else if (diff === 0) { label = "Par (E)"; badgeClass = "bg-amber-100 text-amber-900 border-amber-300"; }
                else if (diff === 1) { label = "Bogey (+1)"; badgeClass = "bg-orange-100 text-orange-900 border-orange-300"; }
                else { label = `Double Bogey+ (+${diff})`; badgeClass = "bg-red-100 text-red-900 border-red-300"; }

                const points = Math.max(0, 2 - diff);

                return (
                  <div className={`p-3 rounded-xl border text-xs flex items-center justify-between font-semibold ${badgeClass}`}>
                    <div className="flex items-center gap-2">
                      <span>🎯</span>
                      <span>Hole {scoreHoleNum} (Par {scorePar}) → <strong>{label}</strong></span>
                    </div>
                    <div className="font-mono font-bold">
                      {selectedTournament.format === "Stableford" ? `${points} Pts` : diff === 0 ? "E" : diff > 0 ? `+${diff}` : `${diff}`}
                    </div>
                  </div>
                );
              })()}

              {/* Submit Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setScoreModalOpen(false)}
                  className="flex-1 py-3 rounded-xl border border-sand-dark text-fairway font-medium text-xs hover:bg-sand/30"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingScore}
                  className="flex-1 py-3 rounded-xl bg-fairway text-white font-bold text-xs hover:bg-fairway-dark transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {savingScore ? "Saving Score..." : "💾 Save Hole Score"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
