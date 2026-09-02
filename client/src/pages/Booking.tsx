import { useEffect, useState, useMemo } from "react";
import { useSearchParams, useParams, Link } from "react-router-dom";
import NavBar from "../components/NavBar";
import SeoHead from "../components/SeoHead";
import PaymentModal from "../components/PaymentModal";
import type { TeeSlot } from "../types";
import { useAuth } from "../api/AuthContext";
import { bookingsApi, waitlistApi } from "../api/bookings";
import type { Booking as BookingType } from "../api/bookings";
import { courseApi } from "../api/course";
import type { Tenant } from "../api/course";
import { apiFetch } from "../api/client";
import { formatTime, toDateInput, formatDateLabel } from "../utils/time";

interface GolferSlot {
  id: string;
  time: string;
  // BUG-09 FIX: Store the raw ISO startTime alongside the formatted display string
  // so time filtering doesn't have to re-parse a locale-formatted string.
  startTimeIso: string;
  playersBooked: number;
  playersMax: number;
  price: number;
  status: "open" | "low" | "full" | "blocked";
}

export default function Booking() {
  const { user } = useAuth();
  const { id: routeTenantId } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [courses, setCourses] = useState<Tenant[]>([]);
  const [slots, setSlots] = useState<GolferSlot[]>([]);
  const [selected, setSelected] = useState<GolferSlot | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<BookingType | null>(null);
  const [waitlisted, setWaitlisted] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);

  const [partySize, setPartySize] = useState(() => parseInt(searchParams.get("partySize") || "1") || 1);
  const [selectedDate, setSelectedDate] = useState(() => searchParams.get("date") || toDateInput(new Date()));
  const [timeFilter, setTimeFilter] = useState<"all" | "morning" | "afternoon" | "twilight">("all");
  const [paymentChoice, setPaymentChoice] = useState<"online" | "course">("online");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [pendingBookingId, setPendingBookingId] = useState<string | null>(null);
  const [bookingInProgress, setBookingInProgress] = useState(false);

  // 1. Fetch available courses
  useEffect(() => {
    const urlTenantId = routeTenantId || searchParams.get("tenantId") || searchParams.get("courseId");

    courseApi.list()
      .then((all) => {
        setCourses(all);
        if (urlTenantId && all.some((c) => c.id === urlTenantId)) {
          setTenantId(urlTenantId);
        } else if (user?.tenantId && all.some((c) => c.id === user.tenantId)) {
          setTenantId(user.tenantId);
        } else if (all.length > 0) {
          setTenantId(all[0].id);
        }
      })
      .catch(() => {});
  }, [user?.tenantId, searchParams]);

  // 2. Fetch selected tenant details
  useEffect(() => {
    if (!tenantId) return;
    courseApi.getTenant(tenantId)
      .then((t) => {
        setTenant(t);
        const hasOnline = Boolean(t.stripeChargesEnabled);
        if (t.requirePaymentUpfront && hasOnline) {
          setPaymentChoice("online");
        } else {
          setPaymentChoice("course");
        }
      })
      .catch(() => {});
  }, [tenantId]);

  // 3. Fetch tee slots for selected course and date
  useEffect(() => {
    if (!tenantId) return;
    setSelected(null);
    setLoading(true);
    setError(null);

    apiFetch<{ id: string; startTime: string; maxPlayers: number; playersBooked: number; price: number; status: string }[]>(
      `/api/tenants/${tenantId}/tee-slots?date=${selectedDate}`,
      {},
      user?.token,
      tenantId
    )
      .then((data) => {
        setSlots(
          data.map((s) => ({
            id: s.id,
            time: formatTime(s.startTime),
            startTimeIso: s.startTime,
            playersBooked: s.playersBooked,
            playersMax: s.maxPlayers,
            price: s.price,
            status: (s.status === "blocked" ? "full" : s.status) as TeeSlot["status"],
          }))
        );
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load tee times."))
      .finally(() => setLoading(false));
  }, [tenantId, selectedDate, user?.token]);

  // BUG-09 FIX: Filter slots using the raw ISO startTimeIso rather than parsing
  // the already-formatted display string (which is fragile and locale-dependent).
  const filteredSlots = useMemo(() => {
    return slots.filter((slot) => {
      if (timeFilter === "all") return true;
      const hour = new Date(slot.startTimeIso).getHours();
      if (timeFilter === "morning") return hour < 11;
      if (timeFilter === "afternoon") return hour >= 11 && hour < 15;
      if (timeFilter === "twilight") return hour >= 15;
      return true;
    });
  }, [slots, timeFilter]);

  // Next 7 days quick dates ribbon
  const nextDays = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const iso = toDateInput(d);
      const dayName = i === 0 ? "Today" : i === 1 ? "Tomorrow" : d.toLocaleDateString("en-US", { weekday: "short" });
      const dayNumber = d.getDate();
      const monthName = d.toLocaleDateString("en-US", { month: "short" });
      arr.push({ iso, dayName, dayNumber, monthName });
    }
    return arr;
  }, []);

  const isOnlinePaymentAvailable = Boolean(tenant?.stripeChargesEnabled);

  async function handleBookSlot() {
    if (!selected || !user || !tenantId) return;
    setError(null);
    setBookingInProgress(true);

    try {
      const booking = await bookingsApi.create(tenantId, user.token, {
        teeSlotId: selected.id,
        partySize,
      });

      if ((paymentChoice === "online" || tenant?.requirePaymentUpfront) && isOnlinePaymentAvailable) {
        setPendingBookingId(booking.id);
        setShowPaymentModal(true);
      } else {
        setConfirmedBooking(booking);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Booking failed.");
    } finally {
      setBookingInProgress(false);
    }
  }

  function handlePaymentSuccess(_txId?: string) {
    setShowPaymentModal(false);
    if (selected) {
      setConfirmedBooking({
        id: pendingBookingId || "",
        teeSlotId: selected.id,
        partySize,
        status: "Confirmed",
        paymentStatus: "Paid",
        amountPaid: selected.price * partySize,
      });
    }
  }

  async function joinWaitlist(slot: GolferSlot) {
    if (!user || !tenantId) return;
    setError(null);
    try {
      const res = await waitlistApi.join(tenantId, slot.id, user.token, partySize);
      setWaitlisted(res.position);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join waitlist.");
    }
  }

  const currencySymbol = tenant?.currencySymbol || "₹";
  const totalPrice = (selected?.price ?? 500) * partySize;

  return (
    <div className="min-h-screen bg-[#F7F9F6] text-gray-900 flex flex-col font-sans pb-28 md:pb-12">
      <SeoHead
        title={tenant ? `Book Tee Times — ${tenant.name}` : "Book Tee Times Online"}
        description={tenant ? `Book online tee times and green fees for ${tenant.name}. Instant slot confirmation, party size selection, and dynamic pricing.` : "Book tee times online across championship golf courses."}
        keywords={[tenant?.name || "golf course", "book tee time", "golf reservations", "green fee booking", "golf slots"]}
        canonicalUrl={tenantId ? `https://chipandchill.com/courses/${tenantId}/book` : "https://chipandchill.com/booking"}
      />
      <div className="bg-gradient-to-br from-fairway to-turf text-white">
        <NavBar />
      </div>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 w-full flex-1">
        {/* Course Header Banner */}
        <div className="bg-white rounded-3xl border border-sand-dark shadow-sm p-6 sm:p-8 mb-8 relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-3 py-1 rounded-full bg-turf/10 text-turf text-xs font-bold uppercase tracking-wider">
                  ⛳ Championship Golf Course
                </span>
                {tenant?.requirePaymentUpfront && (
                  <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold flex items-center gap-1">
                    <span>💳</span> Online Payment Required
                  </span>
                )}
              </div>

              <h1 className="text-3xl sm:text-4xl font-extrabold text-fairway tracking-tight">
                {tenant?.name || "Select a Golf Club"}
              </h1>
              
              <p className="text-sm text-gray-600 mt-1 flex items-center gap-2">
                <span>📍</span> {tenant?.address || "Premier Championship Links"} • {tenant?.holesCount || 18} Holes
              </p>
            </div>

            {/* Course Selector if multiple exist */}
            {courses.length > 1 && (
              <div className="bg-[#F8FAF7] border border-gray-200 p-3 rounded-2xl flex flex-col gap-1 min-w-[240px]">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Select Facility</span>
                <select
                  value={tenantId || ""}
                  onChange={(e) => {
                    setTenantId(e.target.value);
                    setSearchParams({ tenantId: e.target.value });
                  }}
                  className="text-xs font-bold bg-white text-gray-900 border border-gray-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-fairway cursor-pointer"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.address ? `(${c.address})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {!confirmedBooking && waitlisted === null ? (
          <>
            {error && (
              <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold mb-6 flex items-center justify-between">
                <span>⚠️ {error}</span>
                <button onClick={() => setError(null)} className="text-red-500 hover:text-red-800 font-bold">✕</button>
              </div>
            )}

            {/* Date Selection Ribbon */}
            <div className="bg-white rounded-3xl border border-sand-dark shadow-sm p-4 sm:p-6 mb-8">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                  <span>📅</span> Choose Date of Play
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-500">Pick custom date:</span>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => {
                      setSelectedDate(e.target.value);
                      setSearchParams((prev) => {
                        prev.set("date", e.target.value);
                        return prev;
                      });
                    }}
                    className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-1 text-xs font-bold text-gray-900 cursor-pointer"
                  />
                </div>
              </div>

              {/* 7-Day Quick Strip */}
              <div className="flex sm:grid sm:grid-cols-7 gap-2.5 overflow-x-auto pb-2 scrollbar-none">
                {nextDays.map((day) => {
                  const isSelected = selectedDate === day.iso;
                  return (
                    <button
                      key={day.iso}
                      type="button"
                      onClick={() => {
                        setSelectedDate(day.iso);
                        setSearchParams((prev) => {
                          prev.set("date", day.iso);
                          return prev;
                        });
                      }}
                      className={`min-w-[76px] sm:min-w-0 flex-1 p-3 rounded-2xl border text-center transition-all ${
                        isSelected
                          ? "bg-fairway text-white border-fairway shadow-md scale-[1.02]"
                          : "bg-[#FAFBF9] border-gray-200/80 hover:bg-gray-100/80 text-gray-700"
                      }`}
                    >
                      <span className="text-[10px] font-bold block uppercase tracking-wider opacity-80">{day.dayName}</span>
                      <span className="text-xl font-black block my-0.5">{day.dayNumber}</span>
                      <span className="text-[10px] opacity-75 uppercase">{day.monthName}</span>
                    </button>
                  );
                })}
              </div>

              {/* Time of Day Filter Tabs */}
              <div className="flex items-center gap-2 mt-6 pt-4 border-t border-gray-100 overflow-x-auto">
                <span className="text-xs font-bold text-gray-500 uppercase mr-1">Filter:</span>
                {[
                  { key: "all", label: `All Times (${slots.length})` },
                  { key: "morning", label: "🌅 Morning (Before 11 AM)" },
                  { key: "afternoon", label: "☀️ Midday (11 AM - 3 PM)" },
                  { key: "twilight", label: "🌇 Twilight (After 3 PM)" },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setTimeFilter(tab.key as any)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
                      timeFilter === tab.key
                        ? "bg-turf text-white shadow-sm"
                        : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tee Slots Grid */}
            <div className="space-y-4 mb-8">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-fairway">
                  Available Tee Times for {formatDateLabel(selectedDate)}
                </h2>
                <span className="text-xs font-semibold text-gray-500">
                  {filteredSlots.length} slot{filteredSlots.length !== 1 ? "s" : ""} found
                </span>
              </div>

              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="h-28 bg-white border border-gray-100 rounded-2xl animate-pulse" />
                  ))}
                </div>
              ) : filteredSlots.length === 0 ? (
                <div className="bg-white rounded-3xl border border-dashed border-gray-200 p-12 text-center">
                  <div className="text-4xl mb-3">⛳</div>
                  <h4 className="text-base font-bold text-gray-900 mb-1">No tee times available</h4>
                  <p className="text-xs text-gray-500 max-w-md mx-auto mb-4">
                    There are no open tee times matching your filters for {formatDateLabel(selectedDate)}. Please choose another day or filter.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      const tom = new Date();
                      tom.setDate(tom.getDate() + 1);
                      setSelectedDate(toDateInput(tom));
                    }}
                    className="px-4 py-2 bg-fairway text-white text-xs font-bold rounded-xl hover:bg-fairway/90 transition-colors"
                  >
                    Check Tomorrow's Slots →
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {filteredSlots.map((slot) => {
                    const isSelected = selected?.id === slot.id;
                    const isFull = slot.status === "full";
                    const openSpots = slot.playersMax - slot.playersBooked;

                    return (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => setSelected(slot)}
                        className={`p-4 rounded-2xl border text-left transition-all relative flex flex-col justify-between ${
                          isSelected
                            ? "bg-emerald-50/80 border-turf shadow-md ring-2 ring-turf scale-[1.01]"
                            : isFull
                            ? "bg-gray-50 border-gray-200 opacity-60 hover:opacity-100"
                            : "bg-white border-gray-200 hover:border-turf hover:shadow-sm"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <span className="text-lg font-black text-gray-900 font-mono tracking-tight">
                            {slot.time}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                              isFull
                                ? "bg-red-100 text-red-700"
                                : openSpots === 1
                                ? "bg-amber-100 text-amber-800"
                                : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {isFull ? "Full (Waitlist)" : `${openSpots} Spots Left`}
                          </span>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between">
                          <span className="text-xs text-gray-500 font-medium">{tenant?.holesCount || 18} Holes</span>
                          <span className="text-base font-extrabold text-fairway font-mono">
                            {currencySymbol}{slot.price.toFixed(0)}
                            <span className="text-[10px] font-normal text-gray-400"> / player</span>
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Selected Booking Checkout Box */}
            {selected && (
              <div className="bg-white rounded-3xl border-2 border-fairway shadow-xl p-6 sm:p-8 max-w-2xl mx-auto space-y-6 animate-fadeIn">
                {selected.status !== "full" ? (
                  <>
                    <div className="flex items-center justify-between pb-4 border-b border-gray-100 flex-wrap gap-2">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-turf block">Selected Tee Time</span>
                        <h3 className="text-2xl font-black text-gray-900 font-mono">
                          {selected.time} • {formatDateLabel(selectedDate)}
                        </h3>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-gray-500 font-medium block">Rate per player</span>
                        <span className="text-xl font-bold text-fairway font-mono">{currencySymbol}{selected.price.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Party Size Selector */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                        Number of Golfers (Max {selected.playersMax - selected.playersBooked} open spots)
                      </label>
                      <div className="grid grid-cols-4 gap-2">
                        {[1, 2, 3, 4].map((n) => {
                          const disabled = n > (selected.playersMax - selected.playersBooked);
                          return (
                            <button
                              key={n}
                              type="button"
                              disabled={disabled}
                              onClick={() => setPartySize(n)}
                              className={`py-3 rounded-2xl text-xs font-bold transition-all border ${
                                partySize === n
                                  ? "bg-fairway text-white border-fairway shadow-sm"
                                  : disabled
                                  ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                                  : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                              }`}
                            >
                              {n} {n === 1 ? "Player" : "Players"}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Payment Mode Selector */}
                    {isOnlinePaymentAvailable ? (
                      !tenant?.requirePaymentUpfront ? (
                        <div className="pt-2">
                          <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                            Payment Mode
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <label className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                              paymentChoice === "online" ? "bg-emerald-50/70 border-turf shadow-sm" : "border-gray-200 hover:bg-gray-50"
                            }`}>
                              <input
                                type="radio"
                                name="payMode"
                                checked={paymentChoice === "online"}
                                onChange={() => setPaymentChoice("online")}
                                className="mt-1 text-turf focus:ring-turf"
                              />
                              <div>
                                <p className="text-xs font-bold text-gray-900">💳 Pay Online Now</p>
                                <p className="text-[11px] text-gray-500">Instant credit card confirmation</p>
                              </div>
                            </label>

                            <label className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                              paymentChoice === "course" ? "bg-emerald-50/70 border-turf shadow-sm" : "border-gray-200 hover:bg-gray-50"
                            }`}>
                              <input
                                type="radio"
                                name="payMode"
                                checked={paymentChoice === "course"}
                                onChange={() => setPaymentChoice("course")}
                                className="mt-1 text-turf focus:ring-turf"
                              />
                              <div>
                                <p className="text-xs font-bold text-gray-900">⛳ Pay at Clubhouse on Arrival</p>
                                <p className="text-[11px] text-gray-500">Settle at check-in desk before tee-off</p>
                              </div>
                            </label>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-amber-50 p-3.5 rounded-2xl border border-amber-200 text-xs text-amber-900 space-y-0.5">
                          <p className="font-bold">💳 Course Online Payment Policy</p>
                          <p className="opacity-80">This facility requires upfront payment to confirm tee time slots.</p>
                        </div>
                      )
                    ) : (
                      <div className="pt-2">
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                          Payment Method
                        </label>
                        <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200 flex items-start gap-3">
                          <span className="text-xl">⛳</span>
                          <div>
                            <p className="text-xs font-bold text-gray-900">Pay at Clubhouse on Arrival</p>
                            <p className="text-[11px] text-gray-600 mt-0.5">
                              No advance online card payment required • Settle your green fee at the clubhouse check-in desk before tee-off.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Price Total & Booking Action Button */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100 flex-wrap gap-4">
                      <div>
                        <span className="text-xs text-gray-500 block">Total Booking Price:</span>
                        <p className="text-2xl font-black text-fairway font-mono">
                          {currencySymbol}{totalPrice.toFixed(2)}
                          <span className="text-xs font-normal text-gray-400"> ({partySize} player{partySize > 1 ? "s" : ""})</span>
                        </p>
                      </div>

                      {user ? (
                        <button
                          type="button"
                          onClick={handleBookSlot}
                          disabled={bookingInProgress}
                          className="px-6 py-3.5 bg-fairway text-white rounded-2xl text-sm font-extrabold shadow-lg hover:bg-fairway/90 transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                          {bookingInProgress
                            ? "Processing Reservation..."
                            : (paymentChoice === "online" && isOnlinePaymentAvailable) || (tenant?.requirePaymentUpfront && isOnlinePaymentAvailable)
                            ? `Proceed to Pay ${currencySymbol}${totalPrice.toFixed(2)} →`
                            : `Confirm & Reserve (${currencySymbol}${totalPrice.toFixed(2)} at Clubhouse) →`}
                        </button>
                      ) : (
                        <div className="flex items-center gap-3">
                          <Link
                            to={`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`}
                            className="px-5 py-2.5 bg-fairway text-white rounded-xl text-xs font-bold hover:bg-fairway/90 transition-colors"
                          >
                            Log In to Book
                          </Link>
                          <Link
                            to={`/register?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`}
                            className="px-4 py-2.5 bg-gray-100 text-gray-800 rounded-xl text-xs font-bold hover:bg-gray-200 transition-colors"
                          >
                            Sign Up
                          </Link>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  /* Waitlist Join Box */
                  <div className="space-y-4 text-center py-2">
                    <div className="text-3xl">⏳</div>
                    <div>
                      <h4 className="text-lg font-bold text-gray-900">{selected.time} is Fully Booked</h4>
                      <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
                        Join the waitlist. We will automatically notify you by email the moment any golfer cancels!
                      </p>
                    </div>

                    {user ? (
                      <button
                        type="button"
                        onClick={() => joinWaitlist(selected)}
                        className="px-6 py-3 bg-turf text-white rounded-2xl text-xs font-bold shadow hover:bg-turf/90 transition-colors"
                      >
                        Join Waitlist for {partySize} {partySize === 1 ? "Player" : "Players"}
                      </button>
                    ) : (
                      <Link
                        to="/login"
                        className="inline-block px-5 py-2.5 bg-turf text-white rounded-xl text-xs font-bold hover:bg-turf/90"
                      >
                        Log In to Join Waitlist
                      </Link>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        ) : confirmedBooking ? (
          /* Confirmation Receipt Card */
          <div className="bg-white rounded-3xl border border-sand-dark shadow-2xl p-8 max-w-md mx-auto text-center space-y-5 animate-fadeIn">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto text-3xl font-black">
              ✓
            </div>
            
            <div>
              <h3 className="text-2xl font-black text-gray-900 tracking-tight">Tee Time Confirmed!</h3>
              <p className="text-xs text-gray-500 mt-1">
                Your reservation at <strong className="text-fairway">{tenant?.name}</strong> is locked in.
              </p>
            </div>

            <div className="bg-[#F8FAF7] p-5 rounded-2xl border border-gray-200/80 text-left space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Date & Time:</span>
                <span className="font-bold text-gray-900">{selected?.time} • {formatDateLabel(selectedDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Golfers:</span>
                <span className="font-bold text-gray-900">{confirmedBooking.partySize} player(s)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Payment Status:</span>
                <span className={`font-bold ${confirmedBooking.paymentStatus === "Paid" ? "text-emerald-700" : "text-amber-700"}`}>
                  {confirmedBooking.paymentStatus === "Paid" ? "✓ Paid Online" : "Pay at Pro Shop"}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-200 font-black text-sm">
                <span>Total Amount:</span>
                <span className="text-fairway font-mono">{currencySymbol}{((selected?.price ?? 500) * (confirmedBooking.partySize || 1)).toFixed(2)}</span>
              </div>
            </div>

            <p className="text-[11px] text-gray-500">
              A confirmation email has been dispatched with calendar details and dress code guidelines.
            </p>

            <div className="pt-3 flex items-center justify-center gap-3">
              <Link
                to="/bookings"
                className="px-5 py-2.5 bg-fairway text-white rounded-xl text-xs font-bold hover:bg-fairway/90 transition-colors"
              >
                View My Bookings
              </Link>
              <button
                type="button"
                onClick={() => {
                  setConfirmedBooking(null);
                  setSelected(null);
                }}
                className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-200 transition-colors"
              >
                Book Another Slot
              </button>
            </div>
          </div>
        ) : (
          /* Waitlist Confirmation */
          <div className="bg-white rounded-3xl border border-sand-dark shadow-2xl p-8 max-w-sm mx-auto text-center space-y-4 animate-fadeIn">
            <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto text-3xl">
              ⏳
            </div>
            <h3 className="text-xl font-bold text-gray-900">You're on the Waitlist</h3>
            <p className="text-xs text-gray-500">
              Position <strong>#{waitlisted}</strong> for {selected?.time}. We'll email you immediately if a spot opens!
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setWaitlisted(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold"
              >
                Back to Tee Sheet
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Payment Modal */}
      {showPaymentModal && pendingBookingId && selected && tenantId && (
        <PaymentModal
          tenantId={tenantId}
          bookingId={pendingBookingId}
          token={user?.token || null}
          courseName={tenant?.name || "Golf Club"}
          slotTime={selected.time || "Tee Time"}
          partySize={partySize}
          pricePerPlayer={selected.price}
          totalPrice={totalPrice}
          currencySymbol={currencySymbol}
          onSuccess={handlePaymentSuccess}
          onClose={() => {
            setShowPaymentModal(false);
            setConfirmedBooking({
              id: pendingBookingId,
              teeSlotId: selected.id,
              partySize,
              status: "Confirmed",
              paymentStatus: "Unpaid",
              amountPaid: 0,
            });
          }}
        />
      )}
    </div>
  );
}
