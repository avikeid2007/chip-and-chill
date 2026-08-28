import { useEffect, useState } from "react";
import NavBar from "../components/NavBar";
import { useAuth } from "../api/AuthContext";
import { bookingsApi, type Booking } from "../api/bookings";
import { apiFetch } from "../api/client";
import { formatTime } from "../utils/time";

type DisplayStatus = "Upcoming" | "Completed" | "Cancelled";

export default function MyBookings() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<(Booking & { course?: string })[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        // A golfer books across tenants; MVP fetches per known tenant.
        const tenants = await apiFetch<{ id: string; name: string }[]>("/api/tenants");
        const all: (Booking & { course?: string })[] = [];
        for (const t of tenants) {
          const list = await bookingsApi.mine(t.id, user.token);
          all.push(...list.map((b) => ({ ...b, course: t.name })));
        }
        all.sort((a, b) =>
          new Date(b.teeSlot?.startTime ?? 0).getTime() - new Date(a.teeSlot?.startTime ?? 0).getTime()
        );
        setBookings(all);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load bookings.");
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
    if (!b || !b.course) return;
    try {
      // tenantId is needed for the cancel call; recover it via the tenants list.
      const tenants = await apiFetch<{ id: string; name: string }[]>("/api/tenants");
      const tenant = tenants.find((t) => t.name === b.course);
      if (!tenant) return;
      await bookingsApi.cancel(tenant.id, id, user.token);
      setBookings((prev) => prev.map((x) => (x.id === id ? { ...x, status: "Cancelled" } : x)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel booking.");
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen">
        <div className="bg-fairway"><NavBar /></div>
        <div className="max-w-3xl mx-auto px-8 py-16 text-center text-ink-soft text-sm">
          You need to be logged in to view your bookings.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="bg-fairway">
        <NavBar />
      </div>
      <div className="max-w-3xl mx-auto px-8 md:px-14 py-16">
        <div className="eyebrow">Your account</div>
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-fairway">My bookings</h1>
          <a href="/booking" className="btn-primary">Book a tee time</a>
        </div>

        {error && (
          <p className="text-sm text-[#C0533F] bg-[#C0533F]/8 border border-[#C0533F]/20 rounded-md px-3 py-2 mb-4">{error}</p>
        )}

        <div className="card overflow-hidden">
          {bookings.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <div className="w-12 h-12 rounded-full bg-turf/10 text-turf flex items-center justify-center mx-auto mb-4 text-xl">📅</div>
              <p className="text-sm text-ink-soft mb-4">No bookings yet.</p>
              <a href="/booking" className="btn-primary">Book a tee time</a>
            </div>
          ) : (
            bookings.map((b) => {
              const status = displayStatus(b);
              const isPaid = b.paymentStatus === "Paid";
              const isRefunded = b.paymentStatus === "Refunded";

              return (
                <div key={b.id} className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 border-b border-[#EEF1ED] last:border-b-0 row-hover gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-fairway">{b.course ?? "Course"}</p>
                      {isPaid ? (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-green-100 text-green-800 font-medium">
                          ✓ Paid ₹{((b.price ?? b.teeSlot?.price ?? 50) * b.partySize).toFixed(2)}
                        </span>
                      ) : isRefunded ? (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-medium">
                          Refunded
                        </span>
                      ) : (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-sand text-fairway/70">
                          Pay at pro shop
                        </span>
                      )}
                    </div>
                    <p className="text-mono text-xs text-ink-soft mt-1">
                      {b.teeSlot ? `${new Date(b.teeSlot.startTime).toLocaleDateString()} · ${formatTime(b.teeSlot.startTime)} · ` : ""}
                      {b.partySize} {b.partySize === 1 ? "player" : "players"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <span className={`pill ${status === "Upcoming" ? "pill-green" : status === "Cancelled" ? "pill-red" : "pill-gray"}`}>{status}</span>
                    {status === "Upcoming" && (
                      <button
                        onClick={() => {
                          const confirmText = isPaid
                            ? "Are you sure you want to cancel? Your payment will be automatically refunded."
                            : "Are you sure you want to cancel this booking?";
                          if (confirm(confirmText)) {
                            cancelBooking(b.id);
                          }
                        }}
                        className="text-xs font-medium text-[#C0533F] hover:underline"
                      >
                        Cancel {isPaid ? "& Refund" : ""}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
