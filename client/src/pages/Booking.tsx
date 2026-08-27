import { useEffect, useState } from "react";
import NavBar from "../components/NavBar";
import TeeTicker from "../components/TeeTicker";
import type { TeeSlot } from "../types";
import { useAuth } from "../api/AuthContext";
import { bookingsApi, waitlistApi } from "../api/bookings";
import { apiFetch } from "../api/client";

function formatTime(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, "0");
  const ampm = h >= 12 ? "p" : "a";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m}${ampm}`;
}

export default function Booking() {
  const { user } = useAuth();
  const [slots, setSlots] = useState<TeeSlot[]>([]);
  const [selected, setSelected] = useState<TeeSlot | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [waitlisted, setWaitlisted] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);

  // MVP: pick the user's assigned tenant (if they're a course admin),
  // otherwise pick the first active tenant. Once a tenant directory with
  // course selection exists, this comes from the chosen course.
  useEffect(() => {
    if (user?.tenantId) {
      setTenantId(user.tenantId);
    } else {
      apiFetch<{ id: string }[]>("/api/tenants")
        .then((tenants) => {
          if (tenants.length > 0) setTenantId(tenants[0].id);
        })
        .catch(() => {});
    }
  }, [user?.tenantId]);

  useEffect(() => {
    if (!tenantId || !user?.token) return;
    const today = new Date().toISOString().slice(0, 10);
    apiFetch<{ id: string; startTime: string; maxPlayers: number; playersBooked: number; price: number; status: string }[]>(
      `/api/tenants/${tenantId}/tee-slots?date=${today}`,
      {},
      user.token,
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
  }, [tenantId]);

  async function confirmBooking() {
    if (!selected || !user || !tenantId) return;
    setError(null);
    try {
      await bookingsApi.create(tenantId, user.token, {
        teeSlotId: selected.id,
        partySize: 1,
      });
      setConfirmed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Booking failed.");
    }
  }

  async function joinWaitlist(slot: TeeSlot) {
    if (!user || !tenantId) return;
    setError(null);
    try {
      const res = await waitlistApi.join(tenantId, slot.id, user.token);
      setWaitlisted(res.position);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join waitlist.");
    }
  }

  return (
    <div className="min-h-screen">
      <div className="bg-gradient-to-br from-fairway to-turf">
        <NavBar />
      </div>
      <div className="page-shell fade-up">
        <div className="eyebrow">Tee sheet</div>
        <h1 className="text-3xl font-semibold tracking-tight text-fairway mb-8">Book a tee time</h1>

        {!confirmed && waitlisted === null ? (
          <>
            {error && <p className="text-sm text-[#C0533F] bg-[#C0533F]/8 border border-[#C0533F]/20 rounded-md px-3 py-2 mb-4">{error}</p>}
            <TeeTicker courseName="Today" slots={slots} onSelect={setSelected} />
            {slots.length === 0 && !error && (
              <p className="text-sm text-ink-soft mt-6 text-center">No tee times available today.</p>
            )}
            {selected && (
              <div className="mt-6 card p-6">
                {selected.status !== "full" ? (
                  <>
                    <p className="text-sm text-ink-soft mb-4">
                      Confirm <span className="text-mono font-semibold text-fairway">{selected.time}</span> for{" "}
                      <span className="font-semibold">${selected.price}</span> per player
                    </p>
                    {error && <p className="text-sm text-[#C0533F] bg-[#C0533F]/8 border border-[#C0533F]/20 rounded-md px-3 py-2 mb-3">{error}</p>}
                    {user ? (
                      <button
                        onClick={confirmBooking}
                        className="btn-primary"
                      >
                        Confirm Booking
                      </button>
                    ) : (
                      <p className="text-sm text-ink-soft">
                        <a href="/login" className="text-turf font-medium">Log in</a> to book this tee time.
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-sm text-ink-soft mb-4">
                      <span className="text-mono font-semibold text-fairway">{selected.time}</span> is fully booked.
                      Join the waitlist and we'll email you when a spot opens up.
                    </p>
                    {error && <p className="text-sm text-[#C0533F] bg-[#C0533F]/8 border border-[#C0533F]/20 rounded-md px-3 py-2 mb-3">{error}</p>}
                    {user ? (
                      <button
                        onClick={() => joinWaitlist(selected)}
                        className="btn-outline"
                      >
                        Join Waitlist
                      </button>
                    ) : (
                      <p className="text-sm text-ink-soft">
                        <a href="/login" className="text-turf font-medium">Log in</a> to join the waitlist.
                      </p>
                    )}
                  </>
                )}
              </div>
            )}
          </>
        ) : confirmed ? (
          <div className="card p-8 text-center max-w-sm mx-auto">
            <div className="w-12 h-12 rounded-full bg-turf/10 text-turf flex items-center justify-center mx-auto mb-4 text-2xl">✓</div>
            <h3 className="text-xl font-semibold text-fairway mb-2">Booking confirmed</h3>
            <p className="text-sm text-ink-soft">
              You're set for {selected?.time}. A confirmation email is on its way.
            </p>
          </div>
        ) : (
          <div className="card p-8 text-center max-w-sm mx-auto">
            <div className="w-12 h-12 rounded-full bg-gold/20 text-gold flex items-center justify-center mx-auto mb-4 text-2xl">⏳</div>
            <h3 className="text-xl font-semibold text-fairway mb-2">You're on the waitlist</h3>
            <p className="text-sm text-ink-soft">
              Position #{waitlisted} for {selected?.time}. We'll email you the moment a spot opens.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
