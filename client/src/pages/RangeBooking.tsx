import { useEffect, useState } from "react";
import NavBar from "../components/NavBar";
import { rangeApi } from "../api/range";
import { courseApi } from "../api/course";
import { useAuth } from "../api/AuthContext";
import { toDateInput, formatTime } from "../utils/time";
import type { RangeBay, RangeAvailabilitySlot } from "../types";

export default function RangeBooking() {
  const { user } = useAuth();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [tenantName, setTenantName] = useState("OpenGolf Range");
  const [currencySymbol, setCurrencySymbol] = useState("₹");

  const [date, setDate] = useState(() => toDateInput(new Date()));
  const [duration, setDuration] = useState<number>(60);
  const [filterLaunchMonitor, setFilterLaunchMonitor] = useState(false);

  const [bays, setBays] = useState<RangeBay[]>([]);
  const [availability, setAvailability] = useState<RangeAvailabilitySlot[]>([]);
  const [selectedBay, setSelectedBay] = useState<RangeBay | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<RangeAvailabilitySlot | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Booking Modal
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [golferName, setGolferName] = useState(user ? `${user.firstName} ${user.lastName}` : "");
  const [golferEmail, setGolferEmail] = useState(user ? user.email : "");
  const [bookingInProgress, setBookingInProgress] = useState(false);
  const [confirmationSuccess, setConfirmationSuccess] = useState(false);

  useEffect(() => {
    if (user?.tenantId) {
      setTenantId(user.tenantId);
    } else {
      courseApi.list().then((list) => {
        if (list.length > 0) setTenantId(list[0].id);
      }).catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    if (!tenantId) return;
    courseApi.getTenant(tenantId).then((t) => {
      setTenantName(t.name);
      if (t.currencySymbol) setCurrencySymbol(t.currencySymbol);
    }).catch(() => {});

    loadBaysAndSlots();
  }, [tenantId, date, duration]);

  async function loadBaysAndSlots() {
    if (!tenantId) return;
    setLoading(true);
    setError(null);
    try {
      const [bayList, slotList] = await Promise.all([
        rangeApi.getBays(tenantId),
        rangeApi.getAvailability(tenantId, date, duration),
      ]);
      setBays(bayList);
      setAvailability(slotList);
      if (bayList.length > 0 && !selectedBay) {
        setSelectedBay(bayList[0]);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load range bays.");
    } finally {
      setLoading(false);
    }
  }

  function handleSelectSlot(slot: RangeAvailabilitySlot) {
    if (!slot.isAvailable) return;
    setSelectedSlot(slot);
    setConfirmationSuccess(false);
    setBookingModalOpen(true);
  }

  async function handleConfirmBooking(e: React.FormEvent) {
    e.preventDefault();
    if (!tenantId || !selectedSlot) return;
    setBookingInProgress(true);
    try {
      const booking = await rangeApi.createBooking(tenantId, {
        rangeBayId: selectedSlot.rangeBayId,
        golferName,
        golferEmail,
        startTime: selectedSlot.startTime,
        durationMinutes: duration,
      });

      // Auto-confirm payment in sandbox
      await rangeApi.confirmSandboxPayment(tenantId, booking.id);

      setConfirmationSuccess(true);
      loadBaysAndSlots();
      setTimeout(() => {
        setBookingModalOpen(false);
        setSelectedSlot(null);
      }, 1500);
    } catch (err: any) {
      alert(err?.message || "Booking failed.");
    } finally {
      setBookingInProgress(false);
    }
  }

  const filteredBays = bays.filter((b) => {
    if (filterLaunchMonitor && !b.hasLaunchMonitor) return false;
    return true;
  });

  const slotsForSelectedBay = availability.filter(
    (s) => selectedBay && s.rangeBayId === selectedBay.id
  );

  return (
    <div className="min-h-screen bg-[#FAFBF9] pb-28 md:pb-12">
      <div className="bg-gradient-to-br from-fairway to-turf text-white">
        <NavBar />
        <div className="max-w-6xl mx-auto px-6 md:px-14 pb-14 pt-8">
          <div className="text-mono text-xs tracking-widest uppercase text-sand mb-2 flex items-center gap-2">
            <span>🎯 Practice Range &amp; TrackMan Bays</span>
            <span>·</span>
            <span>{tenantName}</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-semibold tracking-tight leading-tight mb-3">
            Dial in your swing,<br />reserve your bay.
          </h1>
          <p className="text-white/80 max-w-xl text-sm leading-relaxed">
            Reserve premium driving range bays equipped with launch monitors, heated stalls, and automatic ball feeders.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 md:px-14 py-10 space-y-8">
        {/* Controls Bar */}
        <div className="bg-white rounded-2xl p-6 border border-sand-dark shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
          <div>
            <label className="block text-xs font-semibold text-fairway/70 uppercase mb-1">
              Select Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-sand-dark text-fairway text-sm font-mono focus:outline-none focus:ring-2 focus:ring-fairway"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-fairway/70 uppercase mb-1">
              Session Duration
            </label>
            <div className="flex gap-1.5">
              {[30, 60, 90, 120].map((mins) => (
                <button
                  key={mins}
                  onClick={() => setDuration(mins)}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold font-mono transition-colors ${
                    duration === mins
                      ? "bg-fairway text-white"
                      : "bg-mist text-fairway hover:bg-sand/40 border border-sand"
                  }`}
                >
                  {mins}m
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center sm:justify-end">
            <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-fairway mt-4 sm:mt-0">
              <input
                type="checkbox"
                checked={filterLaunchMonitor}
                onChange={(e) => setFilterLaunchMonitor(e.target.checked)}
                className="rounded border-sand text-fairway focus:ring-fairway w-4 h-4"
              />
              <span>TrackMan / Launch Monitor Only</span>
            </label>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Bays & Availability Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Bay Selector Cards */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold text-lg text-fairway">Choose a Bay</h2>
              <span className="text-xs font-mono text-fairway/60">{filteredBays.length} bays</span>
            </div>

            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-24 bg-white rounded-2xl border border-sand animate-pulse" />
                ))}
              </div>
            ) : filteredBays.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 border border-sand text-center text-xs text-fairway/60">
                No range bays configured or matching filters.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredBays.map((bay) => {
                  const isSelected = selectedBay?.id === bay.id;
                  const bayPrice = Math.round((bay.hourlyRate * duration) / 60);

                  return (
                    <div
                      key={bay.id}
                      onClick={() => setSelectedBay(bay)}
                      className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                        isSelected
                          ? "bg-sand/30 border-fairway ring-2 ring-fairway shadow-sm"
                          : "bg-white border-sand-dark hover:border-turf hover:bg-mist/40"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-fairway/10 text-fairway">
                              Bay {bay.bayNumber}
                            </span>
                            <h3 className="font-display font-bold text-base text-fairway">
                              {bay.name}
                            </h3>
                          </div>

                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            {bay.hasLaunchMonitor && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gold/20 text-fairway">
                                📊 Launch Monitor
                              </span>
                            )}
                            <span className="text-[10px] font-mono text-fairway/60">
                              {bay.isOutdoor ? "Outdoor Target View" : "Covered Stall"}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] uppercase font-semibold text-fairway/50 block">Rate</span>
                          <span className="font-display font-bold text-base text-fairway">
                            {currencySymbol}{bayPrice}
                          </span>
                          <span className="text-[10px] text-fairway/60 block">/{duration}m</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right 2 Columns: Time Slots Grid for Selected Bay */}
          <div className="lg:col-span-2 space-y-4">
            {selectedBay ? (
              <div className="bg-white rounded-2xl p-6 border border-sand-dark shadow-sm space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-sand">
                  <div>
                    <div className="text-[11px] font-mono text-turf font-bold uppercase tracking-wider">
                      Available Time Slots
                    </div>
                    <h3 className="font-display font-bold text-xl text-fairway mt-0.5">
                      {selectedBay.name} · {duration} min session
                    </h3>
                  </div>

                  <span className="text-xs font-mono px-3 py-1 rounded-full bg-mist border border-sand text-fairway">
                    📅 {new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                  </span>
                </div>

                {slotsForSelectedBay.length === 0 ? (
                  <div className="p-12 text-center text-xs text-fairway/60 space-y-2">
                    <p>No available slots found for this date.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
                    {slotsForSelectedBay.map((slot, idx) => {
                      return (
                        <button
                          key={idx}
                          disabled={!slot.isAvailable}
                          onClick={() => handleSelectSlot(slot)}
                          className={`py-3 px-2 rounded-xl text-center transition-all flex flex-col items-center justify-center gap-1 ${
                            slot.isAvailable
                              ? "bg-mist hover:bg-fairway hover:text-white border border-sand hover:border-fairway cursor-pointer group"
                              : "bg-sand/20 opacity-40 cursor-not-allowed border border-sand/40"
                          }`}
                        >
                          <span className="text-xs font-mono font-bold group-hover:text-white text-fairway">
                            {formatTime(slot.startTime)}
                          </span>
                          <span className="text-[10px] font-mono text-fairway/60 group-hover:text-white/80">
                            {slot.isAvailable ? `${currencySymbol}${slot.price.toFixed(0)}` : "Booked"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-12 border border-sand-dark text-center text-xs text-fairway/60">
                Select a bay on the left to browse available tee times.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bay Reservation Modal */}
      {bookingModalOpen && selectedSlot && selectedBay && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-sand-dark animate-in fade-in zoom-in duration-150 space-y-5">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-turf font-bold">
                Driving Range Reservation
              </div>
              <h3 className="font-display font-bold text-2xl text-fairway mt-1">
                {selectedBay.name}
              </h3>
              <p className="text-xs text-fairway/70 mt-1">
                {formatTime(selectedSlot.startTime)} – {formatTime(selectedSlot.endTime)} ({duration} minutes)
              </p>
            </div>

            {confirmationSuccess ? (
              <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-green-800 text-sm font-medium text-center space-y-1">
                <p className="font-bold">✓ Reservation Confirmed!</p>
                <p className="text-xs text-green-700">Your bay has been reserved. See you on the range!</p>
              </div>
            ) : (
              <form onSubmit={handleConfirmBooking} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-fairway/70 uppercase mb-1">
                    Golfer Name
                  </label>
                  <input
                    type="text"
                    required
                    value={golferName}
                    onChange={(e) => setGolferName(e.target.value)}
                    placeholder="e.g. John Rahm"
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
                    value={golferEmail}
                    onChange={(e) => setGolferEmail(e.target.value)}
                    placeholder="john@example.com"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-sand-dark text-fairway text-sm focus:outline-none focus:ring-2 focus:ring-fairway"
                  />
                </div>

                <div className="p-4 rounded-xl bg-mist border border-sand flex items-center justify-between text-xs">
                  <div>
                    <span className="text-fairway/60 block text-[10px] uppercase font-semibold">Total Rate ({duration} mins)</span>
                    <span className="font-display font-bold text-lg text-fairway">
                      {currencySymbol}{selectedSlot.price.toFixed(2)}
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-green-800 bg-green-100 px-2.5 py-1 rounded-full">
                    Instant Bay Hold
                  </span>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setBookingModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl border border-sand-dark text-fairway font-medium text-xs hover:bg-sand/30"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={bookingInProgress}
                    className="flex-1 py-2.5 rounded-xl bg-fairway text-white font-semibold text-xs hover:bg-fairway-dark transition-colors disabled:opacity-50"
                  >
                    {bookingInProgress ? "Reserving..." : "Confirm & Book Bay"}
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
