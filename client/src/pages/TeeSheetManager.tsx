import { useEffect, useState } from "react";
import AdminLayout from "../components/AdminLayout";
import { useAuth } from "../api/AuthContext";
import { adminApi } from "../api/admin";
import { apiFetch } from "../api/client";
import { toDateInput, formatDateLabel, formatTime, toSlotIsoString } from "../utils/time";
import NoCourse from "../components/NoCourse";

interface Slot {
  id: string;
  startTime: string;
  maxPlayers: number;
  booked: number;
  price: number;
  blocked: boolean;
}

export default function TeeSheetManager() {
  const { user } = useAuth();
  const [date, setDate] = useState(() => toDateInput(new Date()));
  const [slots, setSlots] = useState<Slot[]>([]);
  const [currencySymbol, setCurrencySymbol] = useState("₹");
  const [loading, setLoading] = useState(true);
  const [newTime, setNewTime] = useState("");
  const [newPrice, setNewPrice] = useState(500);
  const [error, setError] = useState<string | null>(null);

  async function loadSlots() {
    if (!user?.tenantId) return;
    setLoading(true);
    try {
      const data = await apiFetch<
        { id: string; startTime: string; maxPlayers: number; playersBooked: number; price: number; status: string }[]
      >(`/api/tenants/${user.tenantId}/tee-slots?date=${date}&includeBlocked=true`, {}, user.token, user.tenantId);
      setSlots(
        data.map((s) => ({
          id: s.id,
          startTime: s.startTime,
          maxPlayers: s.maxPlayers,
          booked: s.playersBooked,
          price: s.price,
          blocked: s.status === "blocked",
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tee sheet.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user?.tenantId) {
      apiFetch<{ currencySymbol?: string }>(`/api/tenants/${user.tenantId}`, {}, user.token, user.tenantId)
        .then((t) => {
          if (t.currencySymbol) setCurrencySymbol(t.currencySymbol);
        })
        .catch(() => {});
    }
    loadSlots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.tenantId, date]);

  function shiftDate(days: number) {
    const [y, m, d] = date.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + days);
    setDate(toDateInput(dt));
  }

  async function toggleBlock(id: string, currentlyBlocked: boolean) {
    if (!user?.tenantId) return;
    try {
      await adminApi.setSlotBlocked(user.tenantId, id, !currentlyBlocked, user.token);
      setSlots((prev) => prev.map((s) => (s.id === id ? { ...s, blocked: !currentlyBlocked } : s)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update slot.");
    }
  }

  async function addSlot(e: React.FormEvent) {
    e.preventDefault();
    if (!newTime || !user?.tenantId) return;
    try {
      await apiFetch(
        `/api/tenants/${user.tenantId}/tee-slots`,
        {
          method: "POST",
          body: JSON.stringify({ startTime: toSlotIsoString(date, newTime), maxPlayers: 4, price: newPrice }),
        },
        user.token,
        user.tenantId
      );
      setNewTime("");
      await loadSlots();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add slot.");
    }
  }

  if (!user?.tenantId) {
    return (
      <AdminLayout>
        <NoCourse />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <div className="eyebrow mb-0">Course admin</div>
          <h1 className="text-3xl font-semibold tracking-tight text-fairway">Tee sheet manager</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => shiftDate(-1)} className="btn-ghost px-3" aria-label="Previous day">←</button>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-fairway w-28 text-center">{formatDateLabel(date)}</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="border border-line rounded-md px-2 py-1.5 text-xs"
            />
          </div>
          <button onClick={() => shiftDate(1)} className="btn-ghost px-3" aria-label="Next day">→</button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      <div className="card overflow-hidden mb-8">
        <div className="grid grid-cols-[80px_1fr_100px_80px_100px] text-mono text-xs uppercase tracking-wide text-ink-soft bg-[#FAFBF9] border-b border-[#EEF1ED] px-5 py-2.5">
          <span>Time</span><span>Booked</span><span>Status</span><span>Price</span><span></span>
        </div>
        {loading ? (
          <div className="px-5 py-6 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-4 bg-line rounded animate-pulse" />
            ))}
          </div>
        ) : slots.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <div className="text-2xl mb-2">⛳</div>
            <p className="text-sm text-ink-soft">No slots for {formatDateLabel(date).toLowerCase()} yet — add one below.</p>
          </div>
        ) : (
          slots.map((s) => {
            const full = s.booked >= s.maxPlayers;
            const low = !full && s.booked >= s.maxPlayers - 1;
            const statusLabel = s.blocked ? "Blocked" : full ? "Full" : low ? "Low" : "Open";
            const pillClass = s.blocked ? "pill-red" : full ? "pill-gray" : low ? "pill-gold" : "pill-green";
            return (
              <div key={s.id} className={`grid grid-cols-[80px_1fr_100px_80px_100px] items-center px-5 py-3 border-b border-[#EEF1ED] last:border-b-0 text-sm row-hover ${s.blocked ? "opacity-60" : ""}`}>
                <span className="text-mono font-medium">{formatTime(s.startTime)}</span>
                <span className="text-ink-soft">{s.booked} / {s.maxPlayers} players</span>
                <span className={`pill w-fit ${pillClass}`}>{statusLabel}</span>
                <span className="text-mono text-sand">{currencySymbol}{s.price}</span>
                <button
                  onClick={() => toggleBlock(s.id, s.blocked)}
                  className="text-xs font-medium text-turf hover:underline text-left"
                >
                  {s.blocked ? "Unblock" : "Block"}
                </button>
              </div>
            );
          })
        )}
      </div>

      <div className="card p-5">
        <h2 className="font-semibold text-fairway text-sm mb-4">Add a tee time — {formatDateLabel(date)}</h2>
        <form onSubmit={addSlot} className="flex gap-3 items-end flex-wrap">
          <div>
            <label className="label">Time</label>
            <input
              type="time"
              required
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              className="border border-line rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="label">Price ({currencySymbol})</label>
            <input
              type="number"
              value={newPrice}
              onChange={(e) => setNewPrice(Number(e.target.value))}
              className="border border-line rounded-md px-3 py-2 text-sm w-24 font-mono"
            />
          </div>
          <button type="submit" className="btn-primary">
            Add slot
          </button>
        </form>
      </div>
    </AdminLayout>
  );
}
