import { useEffect, useState } from "react";
import AdminLayout from "../components/AdminLayout";
import { useAuth } from "../api/AuthContext";
import { rangeApi } from "../api/range";
import { courseApi } from "../api/course";
import { formatTime, toDateInput } from "../utils/time";
import type { RangeBay, BayBooking, RangeLiveStatus } from "../types";

export default function RangeManager() {
  const { user } = useAuth();
  const token = user?.token || null;
  const tenantId = user?.tenantId;

  const [liveStatus, setLiveStatus] = useState<RangeLiveStatus | null>(null);
  const [bays, setBays] = useState<RangeBay[]>([]);
  const [todayBookings, setTodayBookings] = useState<BayBooking[]>([]);
  const [currencySymbol, setCurrencySymbol] = useState("₹");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add / Edit Bay Modal
  const [bayModalOpen, setBayModalOpen] = useState(false);
  const [editingBay, setEditingBay] = useState<RangeBay | null>(null);
  const [bayNumber, setBayNumber] = useState("1");
  const [bayName, setBayName] = useState("");
  const [isOutdoor, setIsOutdoor] = useState(false);
  const [hasLaunchMonitor, setHasLaunchMonitor] = useState(true);
  const [hourlyRate, setHourlyRate] = useState("300");
  const [isActive, setIsActive] = useState(true);
  const [savingBay, setSavingBay] = useState(false);

  // Quick Walk-In Modal
  const [walkInModalOpen, setWalkInModalOpen] = useState(false);
  const [walkInBayId, setWalkInBayId] = useState("");
  const [walkInGolfer, setWalkInGolfer] = useState("Walk-In Golfer");
  const [walkInDuration, setWalkInDuration] = useState(60);
  const [startingWalkIn, setStartingWalkIn] = useState(false);

  useEffect(() => {
    if (!tenantId) return;
    courseApi.getTenant(tenantId).then((t) => {
      if (t.currencySymbol) setCurrencySymbol(t.currencySymbol);
    }).catch(() => {});
    loadData();

    // Auto-refresh live status every 15s
    const interval = setInterval(loadLiveStatus, 15000);
    return () => clearInterval(interval);
  }, [tenantId]);

  async function loadData() {
    if (!tenantId) return;
    setLoading(true);
    setError(null);
    try {
      const [status, bayList, bookings] = await Promise.all([
        rangeApi.getLiveStatus(tenantId, token),
        rangeApi.getBays(tenantId, token),
        rangeApi.getAllBookings(tenantId, toDateInput(new Date()), token),
      ]);
      setLiveStatus(status);
      setBays(bayList);
      setTodayBookings(bookings);
    } catch (err: any) {
      setError(err?.message || "Failed to load range operations.");
    } finally {
      setLoading(false);
    }
  }

  async function loadLiveStatus() {
    if (!tenantId) return;
    try {
      const status = await rangeApi.getLiveStatus(tenantId, token);
      setLiveStatus(status);
    } catch {
      // silent refresh fail
    }
  }

  function openCreateBayModal() {
    setEditingBay(null);
    setBayNumber(String(bays.length + 1));
    setBayName(`Bay ${bays.length + 1} - TrackMan`);
    setIsOutdoor(false);
    setHasLaunchMonitor(true);
    setHourlyRate("300");
    setIsActive(true);
    setBayModalOpen(true);
  }

  function openEditBayModal(bay: RangeBay) {
    setEditingBay(bay);
    setBayNumber(String(bay.bayNumber));
    setBayName(bay.name);
    setIsOutdoor(bay.isOutdoor);
    setHasLaunchMonitor(bay.hasLaunchMonitor);
    setHourlyRate(String(bay.hourlyRate));
    setIsActive(bay.isActive);
    setBayModalOpen(true);
  }

  async function handleSaveBay(e: React.FormEvent) {
    e.preventDefault();
    if (!tenantId) return;
    setSavingBay(true);
    try {
      if (editingBay) {
        await rangeApi.updateBay(
          tenantId,
          editingBay.id,
          {
            bayNumber: parseInt(bayNumber, 10),
            name: bayName,
            isOutdoor,
            hasLaunchMonitor,
            hourlyRate: parseFloat(hourlyRate),
            isActive,
          },
          token
        );
      } else {
        await rangeApi.createBay(
          tenantId,
          {
            bayNumber: parseInt(bayNumber, 10),
            name: bayName,
            isOutdoor,
            hasLaunchMonitor,
            hourlyRate: parseFloat(hourlyRate),
            isActive,
          },
          token
        );
      }
      setBayModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err?.message || "Failed to save bay.");
    } finally {
      setSavingBay(false);
    }
  }

  async function handleDeleteBay(bayId: string) {
    if (!tenantId) return;
    if (!confirm("Are you sure you want to delete this bay?")) return;
    try {
      await rangeApi.deleteBay(tenantId, bayId, token);
      loadData();
    } catch (err: any) {
      alert(err?.message || "Failed to delete bay.");
    }
  }

  function openWalkInModal(bayId: string) {
    setWalkInBayId(bayId);
    setWalkInGolfer("Walk-In Golfer");
    setWalkInDuration(60);
    setWalkInModalOpen(true);
  }

  async function handleStartWalkIn(e: React.FormEvent) {
    e.preventDefault();
    if (!tenantId || !walkInBayId) return;
    setStartingWalkIn(true);
    try {
      const nowIso = new Date().toISOString();
      const booking = await rangeApi.createBooking(
        tenantId,
        {
          rangeBayId: walkInBayId,
          golferName: walkInGolfer,
          golferEmail: "walkin@opengolf.local",
          startTime: nowIso,
          durationMinutes: walkInDuration,
        },
        token
      );
      await rangeApi.confirmSandboxPayment(tenantId, booking.id, token);
      await rangeApi.checkIn(tenantId, booking.id, token);
      setWalkInModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err?.message || "Failed to assign walk-in session.");
    } finally {
      setStartingWalkIn(false);
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
              Range Operations
            </div>
            <h1 className="text-3xl font-display font-bold text-fairway tracking-tight">
              Driving Range &amp; Bay Manager
            </h1>
            <p className="text-xs text-fairway/60 mt-1">
              Live bay status board, active session timers, and bay configuration.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={openCreateBayModal}
              className="px-5 py-2.5 rounded-xl bg-fairway text-white font-medium hover:bg-fairway-dark transition-colors flex items-center gap-2 shadow-sm text-sm"
            >
              <span>+</span> Add Range Bay
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Live Status Stats Bar */}
        {liveStatus && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-sand-dark shadow-sm">
              <span className="text-[11px] font-semibold text-fairway/60 uppercase">Total Bays</span>
              <div className="text-2xl font-display font-bold text-fairway mt-1">{liveStatus.totalBays}</div>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-sand-dark shadow-sm">
              <span className="text-[11px] font-semibold text-green-700 uppercase">Available Bays</span>
              <div className="text-2xl font-display font-bold text-green-700 mt-1">{liveStatus.availableBays}</div>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-sand-dark shadow-sm">
              <span className="text-[11px] font-semibold text-amber-700 uppercase">Occupied (Live)</span>
              <div className="text-2xl font-display font-bold text-amber-700 mt-1">{liveStatus.occupiedBays}</div>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-sand-dark shadow-sm">
              <span className="text-[11px] font-semibold text-fairway/60 uppercase">Maintenance</span>
              <div className="text-2xl font-display font-bold text-fairway/50 mt-1">{liveStatus.maintenanceBays}</div>
            </div>
          </div>
        )}

        {/* Live Bay Board Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold text-xl text-fairway">
              Live Bay Status Board
            </h2>
            <span className="text-xs font-mono text-fairway/60 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Live monitoring
            </span>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-44 bg-white rounded-2xl border border-sand animate-pulse" />
              ))}
            </div>
          ) : liveStatus?.bays.length === 0 ? (
            <div className="bg-white rounded-2xl border border-sand-dark p-12 text-center space-y-3">
              <div className="text-4xl">🎯</div>
              <p className="text-fairway font-medium">No range bays configured yet.</p>
              <button
                onClick={openCreateBayModal}
                className="px-4 py-2 rounded-lg bg-fairway text-white text-xs font-medium"
              >
                Create your first bay
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {liveStatus?.bays.map((bay) => {
                const isOccupied = bay.status === "Occupied";
                const isAvailable = bay.status === "Available";
                const isWarning = isOccupied && bay.remainingMinutes !== null && bay.remainingMinutes !== undefined && bay.remainingMinutes <= 5;
                const bayDef = bays.find((b) => b.id === bay.bayId);

                return (
                  <div
                    key={bay.bayId}
                    className={`bg-white rounded-2xl p-5 border shadow-sm flex flex-col justify-between space-y-4 transition-all relative overflow-hidden ${
                      isWarning
                        ? "border-red-400 bg-red-50/30 ring-2 ring-red-400"
                        : isOccupied
                        ? "border-amber-300 bg-amber-50/20"
                        : isAvailable
                        ? "border-sand-dark hover:border-turf"
                        : "border-gray-200 opacity-60 bg-gray-50"
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-fairway/10 text-fairway">
                          Bay {bay.bayNumber}
                        </span>

                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                            isOccupied
                              ? "bg-amber-100 text-amber-800"
                              : isAvailable
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-200 text-gray-700"
                          }`}
                        >
                          {bay.status}
                        </span>
                      </div>

                      <div>
                        <h3 className="font-display font-bold text-base text-fairway">
                          {bay.name}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-1 text-[11px] text-fairway/60">
                          {bay.hasLaunchMonitor && <span>📊 TrackMan ·</span>}
                          <span>{bay.isOutdoor ? "Outdoor" : "Covered"}</span>
                        </div>
                      </div>

                      {/* Active Session Info */}
                      {isOccupied && (
                        <div className="p-3 rounded-xl bg-amber-100/60 border border-amber-200/80 space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-fairway truncate max-w-[120px]">
                              {bay.golferName || "Golfer"}
                            </span>
                            <span className="font-mono font-bold text-amber-900">
                              ⏱️ {bay.remainingMinutes}m left
                            </span>
                          </div>

                          <div className="w-full bg-amber-200 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${isWarning ? "bg-red-600" : "bg-amber-600"}`}
                              style={{
                                width: `${Math.min(
                                  100,
                                  Math.max(5, ((bay.remainingMinutes || 0) / (bay.totalDurationMinutes || 60)) * 100)
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-2 border-t border-sand">
                      {isAvailable && (
                        <button
                          onClick={() => openWalkInModal(bay.bayId)}
                          className="flex-1 py-1.5 rounded-lg bg-gold text-fairway font-semibold text-xs hover:bg-gold-light transition-colors"
                        >
                          + Walk-In
                        </button>
                      )}

                      {bayDef && (
                        <button
                          onClick={() => openEditBayModal(bayDef)}
                          className="py-1.5 px-3 rounded-lg border border-sand-dark text-fairway text-xs hover:bg-mist transition-colors"
                        >
                          Edit
                        </button>
                      )}

                      <button
                        onClick={() => handleDeleteBay(bay.bayId)}
                        className="py-1.5 px-2 rounded-lg text-red-500 hover:bg-red-50 text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Today's Range Reservations Ledger */}
        <div className="bg-white rounded-2xl border border-sand-dark shadow-sm overflow-hidden">
          <div className="p-4 bg-mist border-b border-sand flex items-center justify-between">
            <h3 className="font-display font-semibold text-sm text-fairway">
              Today's Bay Reservations ({todayBookings.length})
            </h3>
          </div>

          {todayBookings.length === 0 ? (
            <div className="p-8 text-center text-xs text-fairway/60">
              No reservations booked for today yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-mist text-[10px] font-mono uppercase tracking-wider text-fairway/70 border-b border-sand">
                    <th className="py-3 px-4">Time</th>
                    <th className="py-3 px-4">Bay</th>
                    <th className="py-3 px-4">Golfer</th>
                    <th className="py-3 px-4">Duration</th>
                    <th className="py-3 px-4">Rate</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sand">
                  {todayBookings.map((b) => (
                    <tr key={b.id} className="hover:bg-mist/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-fairway">
                        {formatTime(b.startTime)} – {formatTime(b.endTime)}
                      </td>
                      <td className="py-3 px-4 font-semibold text-fairway">
                        {b.bayName}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-fairway">{b.golferName}</div>
                        <div className="text-[10px] font-mono text-fairway/50">{b.golferEmail}</div>
                      </td>
                      <td className="py-3 px-4 font-mono">{b.durationMinutes} mins</td>
                      <td className="py-3 px-4 font-mono font-bold text-fairway">
                        {currencySymbol}{b.price.toFixed(2)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            b.status === "Active"
                              ? "bg-amber-100 text-amber-800"
                              : b.status === "Completed"
                              ? "bg-gray-100 text-gray-700"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create / Edit Bay Modal */}
      {bayModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-sand-dark animate-in fade-in zoom-in duration-150 space-y-4">
            <h3 className="font-display font-bold text-xl text-fairway">
              {editingBay ? "Edit Range Bay" : "Add New Range Bay"}
            </h3>

            <form onSubmit={handleSaveBay} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-fairway/70 uppercase mb-1">
                    Bay #
                  </label>
                  <input
                    type="number"
                    required
                    value={bayNumber}
                    onChange={(e) => setBayNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-sand-dark text-fairway text-sm font-mono"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-fairway/70 uppercase mb-1">
                    Bay Name / Label
                  </label>
                  <input
                    type="text"
                    required
                    value={bayName}
                    onChange={(e) => setBayName(e.target.value)}
                    placeholder="e.g. Bay 1 - TrackMan"
                    className="w-full px-3 py-2 rounded-lg border border-sand-dark text-fairway text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-fairway/70 uppercase mb-1">
                  Hourly Rate ({currencySymbol})
                </label>
                <input
                  type="number"
                  min={0}
                  step="10"
                  required
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-sand-dark text-fairway text-sm font-mono"
                />
              </div>

              <div className="space-y-2 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-fairway">
                  <input
                    type="checkbox"
                    checked={hasLaunchMonitor}
                    onChange={(e) => setHasLaunchMonitor(e.target.checked)}
                    className="rounded border-sand text-fairway focus:ring-fairway"
                  />
                  <span>Equipped with Launch Monitor / TrackMan</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-fairway">
                  <input
                    type="checkbox"
                    checked={isOutdoor}
                    onChange={(e) => setIsOutdoor(e.target.checked)}
                    className="rounded border-sand text-fairway focus:ring-fairway"
                  />
                  <span>Outdoor Grass Stall (vs Covered Heated Bay)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-fairway">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="rounded border-sand text-fairway focus:ring-fairway"
                  />
                  <span>Active for Booking (uncheck for Maintenance)</span>
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setBayModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-sand-dark text-fairway font-medium text-xs hover:bg-sand/30"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingBay}
                  className="flex-1 py-2.5 rounded-xl bg-fairway text-white font-semibold text-xs hover:bg-fairway-dark transition-colors disabled:opacity-50"
                >
                  {savingBay ? "Saving..." : "Save Bay"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Walk-In Modal */}
      {walkInModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-sand-dark animate-in fade-in zoom-in duration-150 space-y-4">
            <h3 className="font-display font-bold text-xl text-fairway">
              Start Walk-In Bay Session
            </h3>

            <form onSubmit={handleStartWalkIn} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-fairway/70 uppercase mb-1">
                  Golfer Name
                </label>
                <input
                  type="text"
                  required
                  value={walkInGolfer}
                  onChange={(e) => setWalkInGolfer(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-sand-dark text-fairway text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-fairway/70 uppercase mb-1">
                  Duration
                </label>
                <select
                  value={walkInDuration}
                  onChange={(e) => setWalkInDuration(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-sand-dark text-fairway text-sm bg-white font-mono"
                >
                  <option value={30}>30 Minutes</option>
                  <option value={60}>60 Minutes (1 Hour)</option>
                  <option value={90}>90 Minutes</option>
                  <option value={120}>120 Minutes (2 Hours)</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setWalkInModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-sand-dark text-fairway font-medium text-xs hover:bg-sand/30"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={startingWalkIn}
                  className="flex-1 py-2.5 rounded-xl bg-gold text-fairway font-semibold text-xs hover:bg-gold-light transition-colors disabled:opacity-50"
                >
                  {startingWalkIn ? "Starting..." : "Start Session Now"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
