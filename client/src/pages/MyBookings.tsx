import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import NavBar from "../components/NavBar";
import { useAuth } from "../api/AuthContext";
import { bookingsApi, type Booking } from "../api/bookings";
import { apiFetch } from "../api/client";
import { formatTime } from "../utils/time";

type DisplayStatus = "Upcoming" | "Completed" | "Cancelled";

interface EnrichedBooking extends Booking {
  courseName?: string;
  courseAddress?: string;
  courseId?: string;
  currencySymbol?: string;
}

export default function MyBookings() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<EnrichedBooking[]>([]);
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const tenants = await apiFetch<{ id: string; name: string; address?: string; currencySymbol?: string }[]>("/api/tenants");
        const all: EnrichedBooking[] = [];
        for (const t of tenants) {
          try {
            const list = await bookingsApi.mine(t.id, user.token);
            all.push(
              ...list.map((b) => ({
                ...b,
                courseName: t.name,
                courseAddress: t.address,
                courseId: t.id,
                currencySymbol: t.currencySymbol || "₹",
              }))
            );
          } catch {
            /* ignore individual tenant errors */
          }
        }
        all.sort((a, b) =>
          new Date(b.teeSlot?.startTime ?? 0).getTime() - new Date(a.teeSlot?.startTime ?? 0).getTime()
        );
        setBookings(all);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load bookings.");
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  function displayStatus(b: Booking): DisplayStatus {
    if (b.status === "Cancelled") return "Cancelled";
    if (b.status === "CheckedIn") return "Completed";
    return b.teeSlot && new Date(b.teeSlot.startTime) > new Date() ? "Upcoming" : "Completed";
  }

  async function cancelBooking(id: string) {
    if (!user) return;
    const b = bookings.find((x) => x.id === id);
    if (!b || !b.courseId) return;
    try {
      await bookingsApi.cancel(b.courseId, id, user.token);
      setBookings((prev) => prev.map((x) => (x.id === id ? { ...x, status: "Cancelled" } : x)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel booking.");
    }
  }

  function downloadCalendarInvite(b: EnrichedBooking) {
    if (!b.teeSlot) return;
    const startTime = new Date(b.teeSlot.startTime);
    const endTime = new Date(startTime.getTime() + 4 * 60 * 60 * 1000); // 4-hour round

    const formatDate = (d: Date) => d.toISOString().replace(/-|:|\.\d+/g, "");
    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Chip & Chill Golf//EN",
      "BEGIN:VEVENT",
      `SUMMARY:⛳ Tee Time at ${b.courseName}`,
      `DESCRIPTION:Golf reservation for ${b.partySize} player(s). Booking Ref: CC-${b.id.slice(0, 6).toUpperCase()}`,
      `LOCATION:${b.courseAddress || b.courseName}`,
      `DTSTART:${formatDate(startTime)}`,
      `DTEND:${formatDate(endTime)}`,
      "STATUS:CONFIRMED",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `golf-teetime-${b.id.slice(0, 6)}.ics`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const upcomingBookings = bookings.filter((b) => displayStatus(b) === "Upcoming");
  const pastBookings = bookings.filter((b) => displayStatus(b) !== "Upcoming");

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F7F9F6]">
        <div className="bg-gradient-to-br from-fairway to-turf text-white"><NavBar /></div>
        <div className="max-w-md mx-auto px-6 py-20 text-center">
          <div className="w-16 h-16 rounded-3xl bg-fairway/10 text-fairway flex items-center justify-center mx-auto mb-4 text-2xl">
            🎟️
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Member Login Required</h2>
          <p className="text-xs text-gray-600 mb-6">Log in to view your digital clubhouse passes and upcoming tee times.</p>
          <Link to="/login" className="inline-block px-6 py-3 rounded-2xl bg-fairway text-white text-xs font-bold shadow-md hover:bg-fairway/90">
            Log In Now →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F9F6] text-gray-900 font-sans flex flex-col pb-28 md:pb-12">
      <div className="bg-gradient-to-br from-[#0B3024] via-[#124233] to-[#08241B] text-white">
        <NavBar />
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 w-full flex-1">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-100 text-[11px] font-mono font-bold uppercase tracking-wider mb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Digital Clubhouse Passes
            </div>
            <h1 className="text-3xl font-display font-black text-fairway tracking-tight">
              My Reservations
            </h1>
          </div>

          <Link
            to="/booking"
            className="self-start sm:self-auto px-5 py-2.5 rounded-2xl bg-fairway text-white text-xs font-bold hover:bg-fairway/90 transition-all shadow-md flex items-center gap-2"
          >
            <span>⛳</span> Book New Tee Time
          </Link>
        </div>

        {error && (
          <div className="p-4 mb-6 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
            ⚠️ {error}
          </div>
        )}

        {/* Tab Switcher */}
        <div className="flex bg-gray-100 p-1 rounded-2xl border border-gray-200 mb-6 max-w-xs">
          <button
            onClick={() => setActiveTab("upcoming")}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "upcoming"
                ? "bg-white text-fairway shadow-sm"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            Upcoming Passes ({upcomingBookings.length})
          </button>
          <button
            onClick={() => setActiveTab("past")}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "past"
                ? "bg-white text-fairway shadow-sm"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            History ({pastBookings.length})
          </button>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-44 bg-white rounded-3xl border border-gray-200 animate-pulse" />
            ))}
          </div>
        ) : (
          <div>
            {/* UPCOMING PASSES */}
            {activeTab === "upcoming" && (
              <div className="space-y-6">
                {upcomingBookings.length === 0 ? (
                  <div className="bg-white rounded-3xl border border-dashed border-gray-300 p-12 text-center">
                    <div className="text-4xl mb-3">🎟️</div>
                    <h3 className="text-base font-bold text-gray-900 mb-1">No Upcoming Tee Times</h3>
                    <p className="text-xs text-gray-500 mb-6 max-w-sm mx-auto">
                      You do not have any active reservations. Browse championship courses and book your next round.
                    </p>
                    <Link
                      to="/booking"
                      className="inline-block px-6 py-3 rounded-2xl bg-fairway text-white text-xs font-bold shadow-md hover:bg-fairway/90"
                    >
                      Find a Tee Time →
                    </Link>
                  </div>
                ) : (
                  upcomingBookings.map((b) => {
                    const isPaid = b.paymentStatus === "Paid";
                    const refCode = `CC-${b.id.slice(0, 6).toUpperCase()}`;

                    return (
                      <div
                        key={b.id}
                        className="bg-white rounded-3xl border border-[#E4E8E3] shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden relative"
                      >
                        {/* Top Gradient Banner */}
                        <div className="bg-gradient-to-r from-[#0B3024] to-[#1B4332] text-white p-5 sm:p-6 flex items-start justify-between">
                          <div>
                            <span className="text-[10px] font-mono uppercase tracking-widest text-sand block mb-1">
                              Clubhouse Pass • {refCode}
                            </span>
                            <h3 className="text-xl sm:text-2xl font-bold font-display text-white">
                              {b.courseName || "Championship Golf Course"}
                            </h3>
                            {b.courseAddress && (
                              <p className="text-xs text-white/75 mt-0.5 flex items-center gap-1">
                                <span>📍</span> {b.courseAddress}
                              </p>
                            )}
                          </div>

                          <span className="px-3 py-1 rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 text-xs font-bold font-mono">
                            CONFIRMED
                          </span>
                        </div>

                        {/* Pass Body */}
                        <div className="p-5 sm:p-6 grid grid-cols-2 sm:grid-cols-4 gap-4 bg-white border-b border-dashed border-gray-200">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Date</span>
                            <span className="text-sm font-black text-gray-900 block mt-0.5">
                              {b.teeSlot ? new Date(b.teeSlot.startTime).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) : "Today"}
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Tee Time</span>
                            <span className="text-sm font-black text-fairway font-mono block mt-0.5">
                              {b.teeSlot ? formatTime(b.teeSlot.startTime) : "TBD"}
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Party Size</span>
                            <span className="text-sm font-bold text-gray-900 block mt-0.5">
                              {b.partySize} {b.partySize === 1 ? "Golfer" : "Golfers"}
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Payment</span>
                            <span className={`text-xs font-bold inline-block mt-0.5 px-2 py-0.5 rounded-full ${
                              isPaid ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-amber-50 text-amber-800 border border-amber-200"
                            }`}>
                              {isPaid ? `✓ Paid ${b.currencySymbol}${((b.price ?? b.teeSlot?.price ?? 50) * b.partySize).toFixed(2)}` : "⛳ Pay at Pro Shop"}
                            </span>
                          </div>
                        </div>

                        {/* Pass Footer Actions */}
                        <div className="p-4 sm:p-5 bg-gray-50 flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => downloadCalendarInvite(b)}
                              className="px-3.5 py-2 rounded-xl bg-white border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-100 transition-colors shadow-sm flex items-center gap-1.5"
                            >
                              📅 Add to Calendar
                            </button>

                            {b.courseAddress && (
                              <a
                                href={`https://maps.google.com/?q=${encodeURIComponent(b.courseAddress)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3.5 py-2 rounded-xl bg-white border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-100 transition-colors shadow-sm flex items-center gap-1.5"
                              >
                                📍 Directions
                              </a>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              const confirmText = isPaid
                                ? "Cancel this reservation and receive a full automatic refund?"
                                : "Are you sure you want to cancel this reservation?";
                              if (window.confirm(confirmText)) cancelBooking(b.id);
                            }}
                            className="text-xs font-bold text-rose-600 hover:text-rose-800 transition-colors"
                          >
                            Cancel Reservation {isPaid ? "& Refund" : ""}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* PAST RESERVATIONS */}
            {activeTab === "past" && (
              <div className="bg-white rounded-3xl border border-[#E4E8E3] overflow-hidden shadow-sm">
                {pastBookings.length === 0 ? (
                  <div className="p-12 text-center text-xs text-gray-500">No past reservations found.</div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {pastBookings.map((b) => (
                      <div key={b.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <h4 className="text-sm font-bold text-gray-900">{b.courseName || "Course"}</h4>
                          <p className="text-xs text-gray-500 font-mono mt-0.5">
                            {b.teeSlot ? new Date(b.teeSlot.startTime).toLocaleDateString() : ""} • {b.partySize} players
                          </p>
                        </div>
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-gray-100 text-gray-600 self-start sm:self-center">
                          {b.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
