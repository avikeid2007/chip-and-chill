import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import NavBar from "../components/NavBar";
import TeeTicker from "../components/TeeTicker";
import PaymentModal from "../components/PaymentModal";
import type { TeeSlot } from "../types";
import { useAuth } from "../api/AuthContext";
import { bookingsApi, waitlistApi } from "../api/bookings";
import type { Booking as BookingType } from "../api/bookings";
import { courseApi } from "../api/course";
import type { Tenant } from "../api/course";
import { apiFetch } from "../api/client";
import { formatTime, toDateInput } from "../utils/time";

export default function Booking() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [courses, setCourses] = useState<Tenant[]>([]);
  const [slots, setSlots] = useState<TeeSlot[]>([]);
  const [selected, setSelected] = useState<TeeSlot | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<BookingType | null>(null);
  const [waitlisted, setWaitlisted] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);

  const [partySize, setPartySize] = useState(1);
  const [paymentChoice, setPaymentChoice] = useState<"online" | "course">("online");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [pendingBookingId, setPendingBookingId] = useState<string | null>(null);
  const [bookingInProgress, setBookingInProgress] = useState(false);

  useEffect(() => {
    const urlTenantId = searchParams.get("tenantId") || searchParams.get("courseId");

    courseApi.list()
      .then((all) => {
        setCourses(all);
        if (urlTenantId && all.some((c) => c.id === urlTenantId)) {
          setTenantId(urlTenantId);
        } else if (user?.tenantId) {
          setTenantId(user.tenantId);
        } else if (all.length > 0) {
          setTenantId(all[0].id);
        }
      })
      .catch(() => {});
  }, [user?.tenantId, searchParams]);

  useEffect(() => {
    if (!tenantId) return;
    courseApi.getTenant(tenantId)
      .then((t) => {
        setTenant(t);
        if (t.requirePaymentUpfront) {
          setPaymentChoice("online");
        }
      })
      .catch(() => {});
  }, [tenantId]);

  useEffect(() => {
    if (!tenantId) return;
    const today = toDateInput(new Date());
    apiFetch<{ id: string; startTime: string; maxPlayers: number; playersBooked: number; price: number; status: string }[]>(
      `/api/tenants/${tenantId}/tee-slots?date=${today}`,
      {},
      user?.token,
      tenantId
    )
      .then((data) =>
        setSlots(
          data.map((s) => ({
            id: s.id,
            time: formatTime(s.startTime),
            playersBooked: s.playersBooked,
            playersMax: s.maxPlayers,
            price: s.price,
            status: (s.status === "blocked" ? "full" : s.status) as TeeSlot["status"],
          }))
        )
      )
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load tee times."));
  }, [tenantId, user?.token]);

  async function handleBookSlot() {
    if (!selected || !user || !tenantId) return;
    setError(null);
    setBookingInProgress(true);

    try {
      const booking = await bookingsApi.create(tenantId, user.token, {
        teeSlotId: selected.id,
        partySize,
      });

      if (paymentChoice === "online" || tenant?.requirePaymentUpfront) {
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

  async function joinWaitlist(slot: TeeSlot) {
    if (!user || !tenantId) return;
    setError(null);
    try {
      const res = await waitlistApi.join(tenantId, slot.id, user.token, partySize);
      setWaitlisted(res.position);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join waitlist.");
    }
  }

  const totalPrice = (selected?.price ?? 50) * partySize;

  return (
    <div className="min-h-screen bg-sand-light">
      <div className="bg-gradient-to-br from-fairway to-turf">
        <NavBar />
      </div>
      <div className="page-shell fade-up">
        <div className="eyebrow">Tee sheet</div>
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-fairway">
              Book a Tee Time
            </h1>
            {courses.length > 1 ? (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs font-semibold text-fairway/60 uppercase">Course:</span>
                <select
                  value={tenantId || ""}
                  onChange={(e) => {
                    setTenantId(e.target.value);
                    setSearchParams({ tenantId: e.target.value });
                  }}
                  className="text-sm font-semibold px-3 py-1.5 rounded-lg border border-sand-dark bg-white text-fairway focus:outline-none focus:ring-2 focus:ring-fairway cursor-pointer"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.address ? `• ${c.address}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            ) : tenant ? (
              <p className="text-sm text-fairway/70 mt-1">
                {tenant.name} {tenant.address ? `• ${tenant.address}` : ""}
              </p>
            ) : null}
          </div>
          {tenant?.requirePaymentUpfront && (
            <span className="text-xs bg-gold/20 text-fairway font-medium px-3 py-1.5 rounded-full border border-gold/30 flex items-center gap-1.5">
              <span>💳</span> Online Payment Required
            </span>
          )}
        </div>

        {!confirmedBooking && waitlisted === null ? (
          <>
            {error && (
              <p className="text-sm text-[#C0533F] bg-[#C0533F]/8 border border-[#C0533F]/20 rounded-md px-3 py-2 mb-4">
                {error}
              </p>
            )}
            <TeeTicker
              courseName={tenant?.name || "Pine Hollow"}
              slots={slots}
              currencySymbol={tenant?.currencySymbol || "₹"}
              onSelect={(slot) => setSelected(slot)}
            />

            {selected && (
              <div className="card p-6 mt-6 max-w-xl mx-auto space-y-5 border border-sand-dark">
                {selected.status !== "full" ? (
                  <div className="space-y-4">
                    {/* Rate header */}
                    <div className="flex items-center justify-between pb-3 border-b border-sand">
                      <div>
                        <span className="text-xs font-semibold text-fairway/60 uppercase">Selected Time</span>
                        <p className="text-mono font-bold text-2xl text-fairway">{selected.time}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-semibold text-fairway/60 uppercase">Rate per Player</span>
                        <p className="font-display font-bold text-2xl text-fairway">{(tenant?.currencySymbol || "₹")}{selected.price.toFixed(2)}</p>
                      </div>
                    </div>

                    {/* Party Size Selector */}
                    <div>
                      <label className="block text-xs font-semibold text-fairway/70 uppercase mb-1.5">
                        Players
                      </label>
                      <div className="flex items-center gap-2">
                        {[1, 2, 3, 4].map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setPartySize(n)}
                            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors border ${
                              partySize === n
                                ? "bg-fairway text-white border-fairway"
                                : "bg-white text-fairway border-sand-dark hover:bg-mist"
                            }`}
                          >
                            {n} {n === 1 ? "Golfer" : "Golfers"}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Payment Options */}
                    {!tenant?.requirePaymentUpfront ? (
                      <div className="pt-2">
                        <label className="block text-xs font-semibold text-fairway/70 uppercase mb-2">
                          Payment Option
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          <label className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition-colors ${
                            paymentChoice === "online" ? "bg-fairway/5 border-fairway" : "border-sand-dark hover:bg-mist"
                          }`}>
                            <input
                              type="radio"
                              name="payMode"
                              checked={paymentChoice === "online"}
                              onChange={() => setPaymentChoice("online")}
                              className="mt-0.5 text-fairway"
                            />
                            <div>
                              <p className="text-xs font-bold text-fairway">Pay Online Now</p>
                              <p className="text-[11px] text-fairway/60">Credit Card / Instant</p>
                            </div>
                          </label>

                          <label className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition-colors ${
                            paymentChoice === "course" ? "bg-fairway/5 border-fairway" : "border-sand-dark hover:bg-mist"
                          }`}>
                            <input
                              type="radio"
                              name="payMode"
                              checked={paymentChoice === "course"}
                              onChange={() => setPaymentChoice("course")}
                              className="mt-0.5 text-fairway"
                            />
                            <div>
                              <p className="text-xs font-bold text-fairway">Pay at Pro Shop</p>
                              <p className="text-[11px] text-fairway/60">Pay when checking in</p>
                            </div>
                          </label>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-sand/40 p-3 rounded-lg border border-sand-dark text-xs text-fairway space-y-0.5">
                        <p className="font-semibold">💳 Upfront Payment Policy</p>
                        <p className="text-fairway/70">
                          This course requires full online payment to secure tee time slots.
                        </p>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-3 border-t border-sand">
                      <div>
                        <span className="text-xs text-fairway/60">Total</span>
                        <p className="font-display font-bold text-xl text-fairway">{(tenant?.currencySymbol || "₹")}{totalPrice.toFixed(2)}</p>
                      </div>
                      {user ? (
                        <button
                          onClick={handleBookSlot}
                          disabled={bookingInProgress}
                          className="btn-primary flex items-center gap-2"
                        >
                          {bookingInProgress
                            ? "Reserving..."
                            : paymentChoice === "online" || tenant?.requirePaymentUpfront
                            ? `Pay & Confirm (${tenant?.currencySymbol || "₹"}${totalPrice.toFixed(2)})`
                            : "Confirm Booking"}
                        </button>
                      ) : (
                        <p className="text-sm text-ink-soft">
                          <a href="/login" className="text-turf font-medium">Log in</a> to book.
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-ink-soft">
                      <span className="text-mono font-semibold text-fairway">{selected.time}</span> is fully booked.
                      Join the waitlist and we'll email you automatically when a spot opens up.
                    </p>
                    {user ? (
                      <button
                        onClick={() => joinWaitlist(selected)}
                        className="btn-outline w-full"
                      >
                        Join Waitlist for {partySize} {partySize === 1 ? "player" : "players"}
                      </button>
                    ) : (
                      <p className="text-sm text-ink-soft">
                        <a href="/login" className="text-turf font-medium">Log in</a> to join waitlist.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        ) : confirmedBooking ? (
          <div className="card p-8 text-center max-w-md mx-auto space-y-4 border border-sand-dark">
            <div className="w-14 h-14 rounded-full bg-green-100 text-green-700 flex items-center justify-center mx-auto text-3xl">
              ✓
            </div>
            <div>
              <h3 className="text-2xl font-bold text-fairway mb-1">Tee Time Confirmed!</h3>
              <p className="text-sm text-fairway/70">
                You're booked for <span className="font-semibold text-fairway">{selected?.time}</span> ({confirmedBooking.partySize} player{confirmedBooking.partySize > 1 ? "s" : ""}).
              </p>
            </div>

            <div className="p-4 rounded-xl bg-mist border border-sand text-left space-y-2 text-xs">
              <div className="flex justify-between text-fairway">
                <span>Payment Status:</span>
                <span className={`font-bold ${confirmedBooking.paymentStatus === "Paid" ? "text-green-700" : "text-amber-700"}`}>
                  {confirmedBooking.paymentStatus === "Paid" ? "✓ Paid Online via Stripe" : "Pay at Pro Shop"}
                </span>
              </div>
              <div className="flex justify-between text-fairway">
                <span>Total Amount:</span>
                <span className="font-bold">{(tenant?.currencySymbol || "₹")}{((selected?.price ?? 50) * (confirmedBooking.partySize || 1)).toFixed(2)}</span>
              </div>
            </div>

            <p className="text-xs text-fairway/60">
              A confirmation email and calendar invitation have been sent to your registered email address.
            </p>

            <div className="pt-2">
              <a
                href="/bookings"
                className="inline-block px-5 py-2.5 rounded-xl bg-fairway text-white text-sm font-medium hover:bg-fairway-dark transition-colors"
              >
                View My Bookings
              </a>
            </div>
          </div>
        ) : (
          <div className="card p-8 text-center max-w-sm mx-auto space-y-3">
            <div className="w-14 h-14 rounded-full bg-gold/20 text-gold flex items-center justify-center mx-auto text-3xl">
              ⏳
            </div>
            <h3 className="text-xl font-semibold text-fairway">You're on the waitlist</h3>
            <p className="text-sm text-ink-soft">
              Position #{waitlisted} for {selected?.time}. We'll email you the moment a spot opens up!
            </p>
            <div className="pt-3">
              <button onClick={() => setWaitlisted(null)} className="btn-outline text-xs">
                Back to Tee Sheet
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Checkout Modal */}
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
          currencySymbol={tenant?.currencySymbol || "₹"}
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
