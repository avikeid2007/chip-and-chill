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
      if (selectedGolferId) {
        await openGolferDetail(selectedGolferId);
      }
    } catch (err: any) {
      setEnrollError(err?.message || "Failed to enroll golfer into tournament.");
    } finally {
      setEnrolling(false);
    }
  }

  const filteredGolfers = golfers.filter((g) => {
    if (filterType === "active") return g.totalBookings > 0 || g.totalRounds > 0;
    if (filterType === "tournaments") return g.totalTournaments > 0;
    if (filterType === "range") return g.totalRangeBookings > 0;
    return true;
  });

  const totalGolfers = golfers.length;
  const totalRounds = golfers.reduce((acc, g) => acc + g.totalBookings + g.totalRounds, 0);
  const totalTourn = golfers.reduce((acc, g) => acc + g.totalTournaments, 0);
  const totalSpend = golfers.reduce((acc, g) => acc + g.lifetimeSpend, 0);

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
              Customer &amp; Player Management
            </div>
            <h1 className="text-3xl font-display font-bold text-fairway tracking-tight">
              Golfer &amp; Member Directory
            </h1>
            <p className="text-xs text-fairway/60 mt-1">
              Registered players, member handicap profiles, booking activity, and tournament participation.
            </p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-fairway text-white font-medium text-xs shadow-sm hover:bg-fairway-dark transition-colors self-start sm:self-auto"
          >
            <span>+</span> Add Golfer / Member
          </button>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Aggregate KPI Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-sand-dark shadow-sm">
            <span className="text-[11px] font-semibold text-fairway/60 uppercase">Registered Golfers</span>
            <div className="text-2xl font-display font-bold text-fairway mt-1">{totalGolfers}</div>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-sand-dark shadow-sm">
            <span className="text-[11px] font-semibold text-turf uppercase">Total Rounds / Tee Times</span>
            <div className="text-2xl font-display font-bold text-turf mt-1">{totalRounds}</div>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-sand-dark shadow-sm">
            <span className="text-[11px] font-semibold text-amber-700 uppercase">Tournament Entries</span>
            <div className="text-2xl font-display font-bold text-amber-700 mt-1">{totalTourn}</div>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-sand-dark shadow-sm">
            <span className="text-[11px] font-semibold text-fairway/60 uppercase">Player Revenue</span>
            <div className="text-2xl font-display font-bold text-fairway mt-1">{currencySymbol}{totalSpend.toFixed(0)}</div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="bg-white rounded-2xl p-5 border border-sand-dark shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search golfers by name, email, or phone..."
              value={search}
              onChange={handleSearchChange}
              className="w-full px-4 py-2.5 rounded-xl border border-sand-dark text-fairway text-xs focus:outline-none focus:ring-2 focus:ring-fairway"
            />
          </div>

          <div className="flex gap-2">
            {[
              { id: "all", label: "All Golfers" },
              { id: "active", label: "Active Players" },
              { id: "tournaments", label: "Tournament Golfers" },
              { id: "range", label: "Range Players" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterType(tab.id as any)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
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
                    <th className="py-3 px-4">Golfer</th>
                    <th className="py-3 px-4 text-center">Handicap</th>
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
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-sand/60 border border-sand text-fairway font-bold text-xs flex items-center justify-center flex-shrink-0">
                              {initials}
                            </div>
                            <div>
                              <div className="font-semibold text-fairway text-sm">
                                {g.firstName} {g.lastName}
                              </div>
                              <div className="text-[10px] font-mono text-fairway/50">
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
                              className="px-2.5 py-1.5 rounded-lg border border-sand-dark text-fairway font-semibold text-[11px] hover:bg-fairway hover:text-white transition-colors"
                            >
                              History →
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
                    min="0"
                    max="54"
                    value={newGolfer.handicapIndex}
                    onChange={(e) => setNewGolfer({ ...newGolfer, handicapIndex: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-sand-dark text-fairway text-xs focus:ring-2 focus:ring-fairway"
                    placeholder="8.4"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-fairway mb-1">Initial Password (Optional)</label>
                <input
                  type="password"
                  value={newGolfer.password}
                  onChange={(e) => setNewGolfer({ ...newGolfer, password: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-sand-dark text-fairway text-xs focus:ring-2 focus:ring-fairway"
                  placeholder="Defaults to GolferPass123!"
                />
                <p className="text-[10px] text-fairway/50 mt-1">If blank, defaults to: <code className="font-mono text-fairway font-semibold">GolferPass123!</code></p>
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
                  className="px-5 py-2 rounded-xl bg-fairway text-white text-xs font-semibold hover:bg-fairway-dark transition-colors disabled:opacity-50"
                >
                  {creating ? "Adding..." : "Add Golfer"}
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

      {/* Golfer Detail Slide-Over Modal */}
      {selectedGolferId && golferDetail && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-sand-dark animate-in fade-in zoom-in duration-150 space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-sand">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gold text-fairway font-bold text-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                  {`${golferDetail.firstName.charAt(0)}${golferDetail.lastName.charAt(0)}`.toUpperCase()}
                </div>
                <div>
                  <h3 className="font-display font-bold text-2xl text-fairway">
                    {golferDetail.firstName} {golferDetail.lastName}
                  </h3>
                  <p className="text-xs text-fairway/60 font-mono">
                    {golferDetail.email} {golferDetail.phoneNumber ? `· ${golferDetail.phoneNumber}` : ""}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEnrollModalGolfer(golferDetail)}
                  className="px-3 py-1.5 rounded-lg bg-amber-600 text-white font-semibold text-xs hover:bg-amber-700 transition-colors flex items-center gap-1 shadow-sm"
                >
                  🏆 Enroll in Tournament
                </button>
                <button
                  onClick={() => {
                    setSelectedGolferId(null);
                    setGolferDetail(null);
                  }}
                  className="w-8 h-8 rounded-full bg-mist hover:bg-sand/40 text-fairway flex items-center justify-center text-sm font-bold transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-4 gap-3 text-center">
              <div className="p-3 rounded-xl bg-mist border border-sand">
                <span className="text-[10px] uppercase font-semibold text-fairway/60 block">Handicap</span>
                <span className="font-mono font-bold text-lg text-fairway">
                  {golferDetail.handicapIndex !== null && golferDetail.handicapIndex !== undefined
                    ? golferDetail.handicapIndex.toFixed(1)
                    : "—"}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-mist border border-sand">
                <span className="text-[10px] uppercase font-semibold text-fairway/60 block">Tee Times</span>
                <span className="font-mono font-bold text-lg text-fairway">
                  {golferDetail.totalBookings}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-mist border border-sand">
                <span className="text-[10px] uppercase font-semibold text-fairway/60 block">Tournaments</span>
                <span className="font-mono font-bold text-lg text-amber-800">
                  {golferDetail.totalTournaments}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-mist border border-sand">
                <span className="text-[10px] uppercase font-semibold text-fairway/60 block">Lifetime Spend</span>
                <span className="font-mono font-bold text-lg text-turf">
                  {currencySymbol}{golferDetail.lifetimeSpend.toFixed(0)}
                </span>
              </div>
            </div>

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

            {/* Footer */}
            <div className="pt-3 border-t border-sand flex justify-end">
              <button
                onClick={() => {
                  setSelectedGolferId(null);
                  setGolferDetail(null);
                }}
                className="px-5 py-2.5 rounded-xl bg-fairway text-white font-medium text-xs hover:bg-fairway-dark transition-colors"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
