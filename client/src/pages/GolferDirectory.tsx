import { useEffect, useState } from "react";
import AdminLayout from "../components/AdminLayout";
import { useAuth } from "../api/AuthContext";
import { golfersApi } from "../api/golfers";
import { tournamentApi } from "../api/tournament";
import { courseApi } from "../api/course";
import { formatTime } from "../utils/time";
import type { TenantGolferSummary, TenantGolferDetail, TournamentSummary } from "../types";

export default function GolferDirectory() {
  const { user } = useAuth();
  const token = user?.token || null;
  const tenantId = user?.tenantId;

  const [golfers, setGolfers] = useState<TenantGolferSummary[]>([]);
  const [tournaments, setTournaments] = useState<TournamentSummary[]>([]);
  const [currencySymbol, setCurrencySymbol] = useState("₹");
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "active" | "tournaments" | "range">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected Golfer Drawer / Modal
  const [selectedGolferId, setSelectedGolferId] = useState<string | null>(null);
  const [golferDetail, setGolferDetail] = useState<TenantGolferDetail | null>(null);
  const [detailTab, setDetailTab] = useState<"passport" | "equipment" | "history" | "contact">("passport");

  // Add Golfer Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [newGolfer, setNewGolfer] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    handicapIndex: "",
    password: "",
  });

  // Direct Tournament Enrollment Modal for a Golfer
  const [enrollModalGolfer, setEnrollModalGolfer] = useState<TenantGolferSummary | null>(null);
  const [selectedTournId, setSelectedTournId] = useState("");
  const [enrollPaymentStatus, setEnrollPaymentStatus] = useState<"Paid" | "Unpaid" | "Free">("Paid");
  const [enrolling, setEnrolling] = useState(false);
  const [enrollError, setEnrollError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantId) return;
    courseApi.getTenant(tenantId).then((t) => {
      if (t.currencySymbol) setCurrencySymbol(t.currencySymbol);
    }).catch(() => {});
    loadGolfers();
    tournamentApi.getTournaments(tenantId, undefined, token).then((tList) => {
      setTournaments(tList);
      if (tList.length > 0) setSelectedTournId(tList[0].id);
    }).catch(() => {});
  }, [tenantId]);

  async function loadGolfers(searchQuery?: string) {
    if (!tenantId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await golfersApi.getGolfers(tenantId, searchQuery ?? search, token);
      setGolfers(data);
    } catch (err: any) {
      setError(err?.message || "Failed to load golfer directory.");
    } finally {
      setLoading(false);
    }
  }

  async function openGolferDetail(golferId: string) {
    if (!tenantId) return;
    setSelectedGolferId(golferId);
    setDetailTab("passport");
    try {
      const detail = await golfersApi.getGolferDetail(tenantId, golferId, token);
      setGolferDetail(detail);
    } catch (err: any) {
      alert(err?.message || "Failed to load golfer details.");
    }
  }

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setSearch(val);
    loadGolfers(val);
  }

  async function handleCreateGolfer(e: React.FormEvent) {
    e.preventDefault();
    if (!tenantId) return;
    setCreateError(null);
    setCreating(true);

    try {
      await golfersApi.createGolfer(
        tenantId,
        {
          firstName: newGolfer.firstName.trim(),
          lastName: newGolfer.lastName.trim(),
          email: newGolfer.email.trim(),
          phoneNumber: newGolfer.phoneNumber.trim() || undefined,
          handicapIndex: newGolfer.handicapIndex ? parseFloat(newGolfer.handicapIndex) : undefined,
          password: newGolfer.password.trim() || undefined,
        },
        token
      );

      setShowAddModal(false);
      setNewGolfer({
        firstName: "",
        lastName: "",
        email: "",
        phoneNumber: "",
        handicapIndex: "",
        password: "",
      });
      await loadGolfers();
    } catch (err: any) {
      setCreateError(err?.message || "Failed to add golfer.");
    } finally {
      setCreating(false);
    }
  }

  async function handleEnrollGolfer(e: React.FormEvent) {
    e.preventDefault();
    if (!tenantId || !enrollModalGolfer || !selectedTournId) return;
    setEnrollError(null);
    setEnrolling(true);

    try {
      const reg = await tournamentApi.register(
        tenantId,
        selectedTournId,
        {
          golferName: `${enrollModalGolfer.firstName} ${enrollModalGolfer.lastName}`.trim(),
          golferEmail: enrollModalGolfer.email,
          handicapIndex: enrollModalGolfer.handicapIndex ?? undefined,
        },
        token
      );

      const targetTourn = tournaments.find((t) => t.id === selectedTournId);
      if (enrollPaymentStatus === "Paid" && targetTourn && targetTourn.entryFee > 0) {
        await tournamentApi.confirmSandboxPayment(tenantId, selectedTournId, reg.id, token);
      }

      alert(`Successfully enrolled ${enrollModalGolfer.firstName} ${enrollModalGolfer.lastName} into the tournament!`);
      setEnrollModalGolfer(null);
      await loadGolfers();
    } catch (err: any) {
      setEnrollError(err?.message || "Failed to enroll golfer.");
    } finally {
      setEnrolling(false);
    }
  }

  // Filtered Golfers
  const filteredGolfers = golfers.filter((g) => {
    if (filterType === "active") return (g.totalBookings + g.totalRounds) > 0;
    if (filterType === "tournaments") return g.totalTournaments > 0;
    if (filterType === "range") return g.totalRangeBookings > 0;
    return true;
  });

  // Summary Metrics
  const totalGolfers = golfers.length;
  const activeMembers = golfers.filter((g) => (g.totalBookings + g.totalRounds) > 0).length;
  const totalLifetimeRevenue = golfers.reduce((acc, g) => acc + (g.lifetimeSpend || 0), 0);
  const avgHandicap = golfers.filter((g) => g.handicapIndex !== null && g.handicapIndex !== undefined).length > 0
    ? (
        golfers
          .filter((g) => g.handicapIndex !== null && g.handicapIndex !== undefined)
          .reduce((acc, g) => acc + (g.handicapIndex || 0), 0) /
        golfers.filter((g) => g.handicapIndex !== null && g.handicapIndex !== undefined).length
      ).toFixed(1)
    : "—";

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-fairway tracking-tight">
              Golfer & Member Directory
            </h1>
            <p className="text-xs text-fairway/70 mt-0.5">
              Player CRM, tournament enrollment, Golfer Passports, equipment specs, and player lifetime spend.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-fairway text-white text-xs font-semibold rounded-xl hover:bg-fairway/90 transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <span>+</span> Add Golfer / Member
            </button>
          </div>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center justify-between">
            <span>⚠️ {error}</span>
            <button onClick={() => setError(null)}>✕</button>
          </div>
        )}

        {/* Overview Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white p-4 rounded-2xl border border-sand-dark shadow-sm">
            <span className="text-[10px] font-mono uppercase tracking-wider text-fairway/60 block mb-0.5">Total Players</span>
            <span className="text-2xl font-bold text-fairway font-mono">{totalGolfers}</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-sand-dark shadow-sm">
            <span className="text-[10px] font-mono uppercase tracking-wider text-fairway/60 block mb-0.5">Active Players</span>
            <span className="text-2xl font-bold text-turf font-mono">{activeMembers}</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-sand-dark shadow-sm">
            <span className="text-[10px] font-mono uppercase tracking-wider text-fairway/60 block mb-0.5">Avg Handicap</span>
            <span className="text-2xl font-bold text-fairway font-mono">{avgHandicap}</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-sand-dark shadow-sm">
            <span className="text-[10px] font-mono uppercase tracking-wider text-fairway/60 block mb-0.5">Player Spend</span>
            <span className="text-2xl font-bold text-fairway font-mono">{currencySymbol}{totalLifetimeRevenue.toFixed(0)}</span>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white p-4 rounded-2xl border border-sand-dark shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="w-full sm:w-80">
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={search}
              onChange={handleSearchChange}
              className="w-full px-3.5 py-2 rounded-xl border border-sand-dark text-xs text-fairway bg-sand/20 focus:bg-white focus:outline-none focus:ring-2 focus:ring-fairway transition-all placeholder:text-fairway/40 font-medium"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
            {[
              { id: "all", label: "All Players" },
              { id: "active", label: "Active Players" },
              { id: "tournaments", label: "Tournament Golfers" },
              { id: "range", label: "Range Players" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterType(tab.id as any)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                  filterType === tab.id
                    ? "bg-fairway text-white"
                    : "bg-mist text-fairway/70 hover:bg-sand/40 border border-sand"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Golfer Table */}
        <div className="bg-white rounded-2xl border border-sand-dark shadow-sm overflow-hidden">
          <div className="p-4 bg-mist border-b border-sand flex items-center justify-between">
            <h3 className="font-display font-semibold text-sm text-fairway">
              Players ({filteredGolfers.length})
            </h3>
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs text-fairway/50">Loading golfer directory...</div>
          ) : filteredGolfers.length === 0 ? (
            <div className="p-12 text-center text-xs text-fairway/60 space-y-2">
              <div className="text-3xl">🏌️</div>
              <p className="font-medium text-fairway">No registered golfers found</p>
              <p className="text-fairway/50">Click "+ Add Golfer / Member" above to register a new member, or golfers will appear here when they book at your course.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-mist text-[10px] font-mono uppercase tracking-wider text-fairway/70 border-b border-sand">
                    <th className="py-3 px-4">Golfer Passport</th>
                    <th className="py-3 px-4 text-center">Handicap</th>
                    <th className="py-3 px-4 text-center">Tee & Club</th>
                    <th className="py-3 px-4 text-center">Rounds</th>
                    <th className="py-3 px-4 text-center">Tournaments</th>
                    <th className="py-3 px-4 text-center">Range</th>
                    <th className="py-3 px-4 text-right">Lifetime Spend</th>
                    <th className="py-3 px-4 text-right">Last Activity</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sand">
                  {filteredGolfers.map((g) => {
                    const initials = `${g.firstName.charAt(0)}${g.lastName.charAt(0)}`.toUpperCase() || "G";
                    const lastAct = g.lastActivityAt ? new Date(g.lastActivityAt).toLocaleDateString() : "—";

                    return (
                      <tr key={g.id} className="hover:bg-mist/40 transition-colors">
                        <td className="py-3 px-4">
                          <div
                            className="flex items-center gap-3 cursor-pointer group"
                            onClick={() => openGolferDetail(g.id)}
                          >
                            <div className="w-9 h-9 rounded-xl overflow-hidden bg-sand/60 border border-sand text-fairway font-bold text-xs flex items-center justify-center flex-shrink-0">
                              {g.avatarUrl ? (
                                <img src={g.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                              ) : (
                                <span>{initials}</span>
                              )}
                            </div>
                            <div>
                              <div className="font-semibold text-fairway text-sm group-hover:text-turf transition-colors flex items-center gap-1.5">
                                {g.firstName} {g.lastName}
                                <span className="text-[10px] opacity-0 group-hover:opacity-100 text-turf">→</span>
                              </div>
                              <div className="text-[10px] font-mono text-fairway/60">
                                {g.email} {g.phoneNumber ? `· ${g.phoneNumber}` : ""}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center font-mono">
                          {g.handicapIndex !== null && g.handicapIndex !== undefined ? (
                            <span className="px-2 py-0.5 rounded-md bg-fairway/10 text-fairway font-bold">
                              {g.handicapIndex.toFixed(1)}
                            </span>
                          ) : (
                            <span className="text-fairway/40">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex flex-col items-center gap-0.5">
                            {g.preferredTee && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700 border border-gray-200">
                                {g.preferredTee} Tee
                              </span>
                            )}
                            {g.homeClubName ? (
                              <span className="text-[10px] text-gray-500 truncate max-w-[100px]">{g.homeClubName}</span>
                            ) : g.city ? (
                              <span className="text-[10px] text-gray-400 truncate max-w-[100px]">📍 {g.city}</span>
                            ) : null}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-medium text-fairway">
                          {g.totalBookings + g.totalRounds > 0 ? g.totalBookings + g.totalRounds : "—"}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-medium text-fairway">
                          {g.totalTournaments > 0 ? (
                            <span className="text-amber-800 font-bold">🏆 {g.totalTournaments}</span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-medium text-fairway">
                          {g.totalRangeBookings > 0 ? (
                            <span className="text-turf font-bold">🎯 {g.totalRangeBookings}</span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-fairway">
                          {currencySymbol}{g.lifetimeSpend.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-fairway/60">
                          {lastAct}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setEnrollModalGolfer(g)}
                              title="Enroll in a Tournament"
                              className="px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 font-semibold text-[11px] hover:bg-amber-600 hover:text-white transition-colors"
                            >
                              🏆 Enroll
                            </button>
                            <button
                              onClick={() => openGolferDetail(g.id)}
                              className="px-2.5 py-1.5 rounded-lg bg-fairway text-white font-semibold text-[11px] hover:bg-fairway/90 transition-colors shadow-sm"
                            >
                              View Passport
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Golfer / Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-sand-dark animate-in fade-in zoom-in duration-150 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-sand">
              <div>
                <h3 className="font-display font-bold text-xl text-fairway">Add Golfer / Member</h3>
                <p className="text-xs text-fairway/60">Register a new player profile under your golf course.</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-full bg-mist hover:bg-sand/40 text-fairway flex items-center justify-center text-sm font-bold transition-colors"
              >
                ✕
              </button>
            </div>

            {createError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateGolfer} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-fairway mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={newGolfer.firstName}
                    onChange={(e) => setNewGolfer({ ...newGolfer, firstName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-sand-dark text-fairway text-xs focus:ring-2 focus:ring-fairway"
                    placeholder="Tiger"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-fairway mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={newGolfer.lastName}
                    onChange={(e) => setNewGolfer({ ...newGolfer, lastName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-sand-dark text-fairway text-xs focus:ring-2 focus:ring-fairway"
                    placeholder="Woods"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-fairway mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={newGolfer.email}
                  onChange={(e) => setNewGolfer({ ...newGolfer, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-sand-dark text-fairway text-xs focus:ring-2 focus:ring-fairway"
                  placeholder="tiger@example.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-fairway mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={newGolfer.phoneNumber}
                    onChange={(e) => setNewGolfer({ ...newGolfer, phoneNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-sand-dark text-fairway text-xs focus:ring-2 focus:ring-fairway"
                    placeholder="+91 98765 43210"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-fairway mb-1">Handicap Index</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newGolfer.handicapIndex}
                    onChange={(e) => setNewGolfer({ ...newGolfer, handicapIndex: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-sand-dark text-fairway text-xs focus:ring-2 focus:ring-fairway"
                    placeholder="12.4"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-fairway mb-1">Temporary Password (Optional)</label>
                <input
                  type="password"
                  value={newGolfer.password}
                  onChange={(e) => setNewGolfer({ ...newGolfer, password: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-sand-dark text-fairway text-xs focus:ring-2 focus:ring-fairway"
                  placeholder="Leave blank to let golfer set their own password"
                />
              </div>

              <div className="pt-3 border-t border-sand flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-sand text-fairway text-xs font-medium hover:bg-mist"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 rounded-xl bg-fairway text-white text-xs font-semibold hover:bg-fairway/90 transition-colors disabled:opacity-50"
                >
                  {creating ? "Adding Golfer..." : "Add Golfer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enroll Golfer in Tournament Modal */}
      {enrollModalGolfer && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-sand-dark animate-in fade-in zoom-in duration-150 space-y-4">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-turf font-bold">
                Tournament Registration
              </div>
              <h3 className="font-display font-bold text-xl text-fairway mt-1">
                Enroll {enrollModalGolfer.firstName} {enrollModalGolfer.lastName}
              </h3>
              <p className="text-xs text-fairway/60">
                {enrollModalGolfer.email} {enrollModalGolfer.handicapIndex !== null && enrollModalGolfer.handicapIndex !== undefined ? `· Handicap ${enrollModalGolfer.handicapIndex.toFixed(1)}` : ""}
              </p>
            </div>

            {enrollError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
                {enrollError}
              </div>
            )}

            {tournaments.length === 0 ? (
              <div className="p-6 text-center text-xs text-fairway/60 bg-mist rounded-xl space-y-2">
                <p>No club tournaments scheduled yet.</p>
                <p className="text-[11px] text-fairway/50">Create a tournament first in the Tournaments manager.</p>
              </div>
            ) : (
              <form onSubmit={handleEnrollGolfer} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-fairway/80 uppercase mb-1">
                    Select Tournament
                  </label>
                  <select
                    required
                    value={selectedTournId}
                    onChange={(e) => setSelectedTournId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-sand-dark text-fairway text-xs bg-white font-medium focus:ring-2 focus:ring-fairway"
                  >
                    {tournaments.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.format} · {t.startDate.slice(0, 10)}) — {currencySymbol}{t.entryFee}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-fairway/80 uppercase mb-1">
                    Payment Status
                  </label>
                  <select
                    value={enrollPaymentStatus}
                    onChange={(e) => setEnrollPaymentStatus(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-sand-dark text-fairway text-xs bg-white font-medium focus:ring-2 focus:ring-fairway"
                  >
                    <option value="Paid">Paid (Cash / POS In Pro-Shop)</option>
                    <option value="Unpaid">Unpaid (Pay at Check-In)</option>
                    <option value="Free">Free / Comped Entry</option>
                  </select>
                </div>

                <div className="pt-3 border-t border-sand flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEnrollModalGolfer(null)}
                    className="px-4 py-2 rounded-xl border border-sand text-fairway text-xs font-medium hover:bg-mist"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={enrolling}
                    className="px-5 py-2 rounded-xl bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 transition-colors disabled:opacity-50"
                  >
                    {enrolling ? "Enrolling..." : "Confirm Enrollment"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Comprehensive Golfer Passport & Detail Slide-Over Modal */}
      {selectedGolferId && golferDetail && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-sand-dark animate-in fade-in zoom-in duration-150 space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Golfer Header Card */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4 pb-6 border-b border-sand">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-fairway text-white font-black text-2xl flex items-center justify-center flex-shrink-0 shadow-md border-2 border-emerald-50">
                  {golferDetail.avatarUrl ? (
                    <img src={golferDetail.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span>{`${golferDetail.firstName.charAt(0)}${golferDetail.lastName.charAt(0)}`.toUpperCase()}</span>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-display font-black text-2xl text-fairway">
                      {golferDetail.firstName} {golferDetail.lastName}
                    </h3>
                    {golferDetail.handicapIndex !== null && golferDetail.handicapIndex !== undefined && (
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-black font-mono">
                        WHS: {golferDetail.handicapIndex.toFixed(1)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-fairway/70 font-mono mt-0.5">
                    {golferDetail.email} {golferDetail.phoneNumber ? `· ${golferDetail.phoneNumber}` : ""}
                  </p>
                  {golferDetail.bio && (
                    <p className="text-xs text-gray-600 mt-1 italic">
                      "{golferDetail.bio}"
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap justify-end">
                <button
                  onClick={() => setEnrollModalGolfer(golferDetail)}
                  className="px-3.5 py-2 rounded-xl bg-amber-600 text-white font-bold text-xs hover:bg-amber-700 transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <span>🏆</span> Enroll in Event
                </button>
                {golferDetail.email && (
                  <a
                    href={`mailto:${golferDetail.email}`}
                    className="px-3 py-2 rounded-xl border border-sand-dark text-fairway font-bold text-xs hover:bg-mist transition-colors"
                  >
                    ✉️ Email
                  </a>
                )}
                {golferDetail.phoneNumber && (
                  <a
                    href={`tel:${golferDetail.phoneNumber}`}
                    className="px-3 py-2 rounded-xl border border-sand-dark text-fairway font-bold text-xs hover:bg-mist transition-colors"
                  >
                    📞 Call
                  </a>
                )}
                <button
                  onClick={() => {
                    setSelectedGolferId(null);
                    setGolferDetail(null);
                  }}
                  className="w-9 h-9 rounded-full bg-mist hover:bg-sand/40 text-fairway flex items-center justify-center text-sm font-bold transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3.5 rounded-2xl bg-[#F8FAF7] border border-sand">
                <span className="text-[10px] uppercase font-bold text-fairway/60 block">Handicap</span>
                <span className="font-mono font-black text-xl text-fairway">
                  {golferDetail.handicapIndex !== null && golferDetail.handicapIndex !== undefined
                    ? golferDetail.handicapIndex.toFixed(1)
                    : "—"}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-[#F8FAF7] border border-sand">
                <span className="text-[10px] uppercase font-bold text-fairway/60 block">Tee Times</span>
                <span className="font-mono font-black text-xl text-fairway">
                  {golferDetail.totalBookings}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-[#F8FAF7] border border-sand">
                <span className="text-[10px] uppercase font-bold text-fairway/60 block">Tournaments</span>
                <span className="font-mono font-black text-xl text-amber-800">
                  {golferDetail.totalTournaments}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-[#F8FAF7] border border-sand">
                <span className="text-[10px] uppercase font-bold text-fairway/60 block">Lifetime Spend</span>
                <span className="font-mono font-black text-xl text-turf">
                  {currencySymbol}{golferDetail.lifetimeSpend.toFixed(0)}
                </span>
              </div>
            </div>

            {/* Tabbed Navigation inside Detail Modal */}
            <div className="flex items-center gap-2 border-b border-gray-100 pb-2 overflow-x-auto">
              {[
                { key: "passport", label: "🪪 Game & Passport" },
                { key: "equipment", label: "🏌️ In The Bag (Equipment)" },
                { key: "history", label: "📈 Bookings & Activity" },
                { key: "contact", label: "🚨 Safety & Notifications" },
              ].map((t) => (
                <button
                  key={t.key}
                  onClick={() => setDetailTab(t.key as any)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    detailTab === t.key
                      ? "bg-fairway text-white shadow-sm"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Tab 1: Game & Passport */}
            {detailTab === "passport" && (
              <div className="space-y-4 animate-fadeIn">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200/80 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-gray-500 block">Handedness</span>
                    <span className="text-sm font-bold text-gray-900">{golferDetail.handedness || "Right-Handed"}</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200/80 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-gray-500 block">Preferred Tee Box</span>
                    <span className="text-sm font-bold text-gray-900">{golferDetail.preferredTee || "White (Standard)"}</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200/80 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-gray-500 block">Average 18-Hole Score</span>
                    <span className="text-sm font-bold text-gray-900">{golferDetail.averageScore || "80-89"}</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200/80 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-gray-500 block">Play Frequency</span>
                    <span className="text-sm font-bold text-gray-900">{golferDetail.playFrequency || "Weekly"}</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200/80 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-gray-500 block">Home Golf Club</span>
                    <span className="text-sm font-bold text-gray-900">{golferDetail.homeClubName || "Not specified"}</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200/80 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-gray-500 block">Location</span>
                    <span className="text-sm font-bold text-gray-900">
                      {golferDetail.city ? `${golferDetail.city}${golferDetail.country ? `, ${golferDetail.country}` : ""}` : "Not specified"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: In The Bag */}
            {detailTab === "equipment" && (
              <div className="space-y-4 animate-fadeIn">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200/80 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-gray-500 block">🏌️ Driver</span>
                    <span className="text-sm font-bold text-gray-900">{golferDetail.driver || "—"}</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200/80 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-gray-500 block">⛳ Irons Set</span>
                    <span className="text-sm font-bold text-gray-900">{golferDetail.irons || "—"}</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200/80 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-gray-500 block">🪄 Putter</span>
                    <span className="text-sm font-bold text-gray-900">{golferDetail.putter || "—"}</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200/80 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-gray-500 block">⚪ Preferred Golf Ball</span>
                    <span className="text-sm font-bold text-gray-900">{golferDetail.golfBall || "—"}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: History & Bookings */}
            {detailTab === "history" && (
              <div className="space-y-6 animate-fadeIn">
                {/* Recent Tee Time Bookings */}
                <div className="space-y-3">
                  <h4 className="font-display font-bold text-sm text-fairway flex items-center justify-between">
                    <span>Recent Tee Sheet Bookings</span>
                    <span className="text-xs font-mono text-fairway/50 font-normal">{golferDetail.recentBookings.length} records</span>
                  </h4>

                  {golferDetail.recentBookings.length === 0 ? (
                    <p className="text-xs text-fairway/50 italic bg-mist p-3 rounded-xl">No tee sheet bookings recorded.</p>
                  ) : (
                    <div className="space-y-2">
                      {golferDetail.recentBookings.map((b) => (
                        <div key={b.bookingId} className="p-3 rounded-xl border border-sand bg-white flex items-center justify-between text-xs">
                          <div>
                            <span className="font-semibold text-fairway">{b.date}</span> at <span className="font-mono font-bold">{formatTime(b.startTime)}</span>
                            <span className="text-fairway/50 ml-2">({b.partySize} {b.partySize === 1 ? "player" : "players"})</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-fairway">{currencySymbol}{b.price.toFixed(2)}</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-800">
                              {b.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recent Tournament Registrations */}
                <div className="space-y-3">
                  <h4 className="font-display font-bold text-sm text-fairway flex items-center justify-between">
                    <span>Tournament Participation</span>
                    <span className="text-xs font-mono text-fairway/50 font-normal">{golferDetail.recentTournaments.length} events</span>
                  </h4>

                  {golferDetail.recentTournaments.length === 0 ? (
                    <p className="text-xs text-fairway/50 italic bg-mist p-3 rounded-xl">No tournament entries recorded.</p>
                  ) : (
                    <div className="space-y-2">
                      {golferDetail.recentTournaments.map((t) => (
                        <div key={t.tournamentId} className="p-3 rounded-xl border border-sand bg-white flex items-center justify-between text-xs">
                          <div>
                            <span className="font-semibold text-fairway">{t.tournamentName}</span>
                            <span className="text-fairway/50 ml-2">({t.format} · {t.startDate})</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800">
                              {t.registrationStatus}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recent Range Sessions */}
                <div className="space-y-3">
                  <h4 className="font-display font-bold text-sm text-fairway flex items-center justify-between">
                    <span>Driving Range Sessions</span>
                    <span className="text-xs font-mono text-fairway/50 font-normal">{golferDetail.recentRangeSessions.length} sessions</span>
                  </h4>

                  {golferDetail.recentRangeSessions.length === 0 ? (
                    <p className="text-xs text-fairway/50 italic bg-mist p-3 rounded-xl">No range sessions recorded.</p>
                  ) : (
                    <div className="space-y-2">
                      {golferDetail.recentRangeSessions.map((r) => (
                        <div key={r.bookingId} className="p-3 rounded-xl border border-sand bg-white flex items-center justify-between text-xs">
                          <div>
                            <span className="font-semibold text-fairway">{r.bayName}</span>
                            <span className="text-fairway/50 ml-2">({r.durationMinutes} mins · {r.startTime})</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-fairway">{currencySymbol}{r.price.toFixed(2)}</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-turf/20 text-turf">
                              {r.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab 4: Safety & Contact */}
            {detailTab === "contact" && (
              <div className="space-y-4 animate-fadeIn">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-amber-900 block">🚨 Emergency Contact Person</span>
                    <span className="text-sm font-bold text-gray-900">{golferDetail.emergencyContactName || "None provided"}</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-amber-900 block">📞 Emergency Contact Phone</span>
                    <span className="text-sm font-bold text-gray-900">
                      {golferDetail.emergencyContactPhone ? (
                        <a href={`tel:${golferDetail.emergencyContactPhone}`} className="text-turf hover:underline">
                          {golferDetail.emergencyContactPhone}
                        </a>
                      ) : (
                        "None provided"
                      )}
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200/80 space-y-2">
                  <span className="text-[10px] uppercase font-bold text-gray-500 block">Communication Preferences</span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className={golferDetail.smsAlertsEnabled ? "text-green-600" : "text-gray-400"}>
                        {golferDetail.smsAlertsEnabled ? "✓" : "✕"}
                      </span>
                      <span>SMS Alerts Enabled</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={golferDetail.marketingEnabled ? "text-green-600" : "text-gray-400"}>
                        {golferDetail.marketingEnabled ? "✓" : "✕"}
                      </span>
                      <span>Marketing & Event Emails</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="pt-4 border-t border-sand flex justify-end">
              <button
                onClick={() => {
                  setSelectedGolferId(null);
                  setGolferDetail(null);
                }}
                className="px-6 py-2.5 rounded-xl bg-fairway text-white font-bold text-xs hover:bg-fairway/90 transition-colors shadow"
              >
                Close Passport
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
