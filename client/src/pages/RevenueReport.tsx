import { useEffect, useRef, useState } from "react";
import AdminLayout from "../components/AdminLayout";
import { useAuth } from "../api/AuthContext";
import {
  reportsApi,
  type RevenueReport,
  type DailyRevenuePoint,
  type TeeSheetReport,
  type GolfersReport,
  type RangeTournamentsReport,
} from "../api/reports";
import { courseApi } from "../api/course";
import NoCourse from "../components/NoCourse";

// ── Period & Tab options ──────────────────────────────────────────────────────
type Period = 7 | 30 | 90 | "month";
type ReportTab = "revenue" | "teeSheet" | "golfers" | "rangeTournaments";

function toDays(p: Period): number {
  if (p === "month") {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  }
  return p as number;
}

function periodLabel(p: Period): string {
  return p === "month" ? "This Month" : `Last ${p} Days`;
}

// ── Trend arrow helper ────────────────────────────────────────────────────────
function pctChange(current: number, prev: number): number | null {
  if (prev === 0) return null;
  return Math.round(((current - prev) / prev) * 100);
}

function TrendBadge({ current, prev }: { current: number; prev: number }) {
  const pct = pctChange(current, prev);
  if (pct === null) return <span className="text-xs text-gray-400">No prior data</span>;
  const up = pct >= 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-full ${
        up ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
      }`}
    >
      {up ? "▲" : "▼"} {Math.abs(pct)}%
    </span>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({
  icon,
  label,
  value,
  prev,
  suffix = "",
}: {
  icon: string;
  label: string;
  value: number;
  prev: number;
  suffix?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#EEF1ED] shadow-xs p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-2xl">{icon}</span>
        <TrendBadge current={value} prev={prev} />
      </div>
      <div>
        <p className="text-2xl font-extrabold text-fairway tracking-tight">
          {suffix}{value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
        </p>
        <p className="text-xs text-ink-soft mt-0.5 font-medium">{label}</p>
      </div>
    </div>
  );
}

// ── Stat Row (for bookings table) ─────────────────────────────────────────────
function StatRow({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-[#EEF1ED] last:border-0">
      <span className="text-sm text-ink-soft">{label}</span>
      <div className="text-right">
        <span className="text-sm font-semibold text-fairway">{value}</span>
        {sub && <span className="text-xs text-ink-soft ml-1.5">{sub}</span>}
      </div>
    </div>
  );
}

// ── Native Canvas Revenue Bar Chart ───────────────────────────────────────────
function RevenueBarChart({ data, currencySymbol }: { data: DailyRevenuePoint[]; currencySymbol: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    const padL = 52, padR = 16, padT = 16, padB = 28;
    const chartW = W - padL - padR;
    const chartH = H - padT - padB;

    const maxVal = Math.max(...data.map((d) => d.tee + d.range), 1);

    ctx.clearRect(0, 0, W, H);

    // Grid lines
    const gridLines = 4;
    ctx.strokeStyle = "#EEF1ED";
    ctx.lineWidth = 1;
    ctx.fillStyle = "#9CA38F";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "right";

    for (let i = 0; i <= gridLines; i++) {
      const y = padT + chartH - (chartH * i) / gridLines;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(W - padR, y);
      ctx.stroke();
      const val = Math.round((maxVal * i) / gridLines);
      ctx.fillText(`${currencySymbol}${val >= 1000 ? (val / 1000).toFixed(1) + "k" : val}`, padL - 4, y + 3);
    }

    // Bars
    const barGroupW = chartW / data.length;
    const barW = Math.max(Math.min(barGroupW * 0.6, 32), 4);
    const TEE_COLOR = "#2D6A4F";
    const RANGE_COLOR = "#F4A261";

    data.forEach((d, i) => {
      const x = padL + barGroupW * i + (barGroupW - barW) / 2;
      const totalH = ((d.tee + d.range) / maxVal) * chartH;
      const teeH = (d.tee / maxVal) * chartH;
      const rangeH = totalH - teeH;

      // Range (top segment, amber)
      if (rangeH > 0) {
        ctx.fillStyle = RANGE_COLOR;
        ctx.beginPath();
        ctx.roundRect(x, padT + chartH - totalH, barW, rangeH + 2, [3, 3, 0, 0]);
        ctx.fill();
      }
      // Tee (bottom segment, green)
      if (teeH > 0) {
        ctx.fillStyle = TEE_COLOR;
        ctx.beginPath();
        ctx.roundRect(x, padT + chartH - teeH, barW, teeH, rangeH > 0 ? [0, 0, 0, 0] : [3, 3, 0, 0]);
        ctx.fill();
      }

      // X-axis date label
      const showEvery = data.length > 60 ? 14 : data.length > 30 ? 7 : data.length > 14 ? 3 : 1;
      if (i % showEvery === 0) {
        const date = new Date(d.date);
        const lbl = `${date.getDate()}/${date.getMonth() + 1}`;
        ctx.fillStyle = "#9CA38F";
        ctx.font = "9px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(lbl, x + barW / 2, H - padB + 12);
      }
    });
  }, [data, currencySymbol]);

  return <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />;
}

// ── Native Canvas Hourly Occupancy Heatmap ────────────────────────────────────
function HourlyOccupancyChart({
  hourly,
  currencySymbol,
}: {
  hourly: TeeSheetReport["hourly"];
  currencySymbol: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || hourly.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    const padL = 45, padR = 16, padT = 16, padB = 28;
    const chartW = W - padL - padR;
    const chartH = H - padT - padB;

    ctx.clearRect(0, 0, W, H);

    const levels = [0, 25, 50, 75, 100];
    ctx.font = "10px sans-serif";
    ctx.textAlign = "right";

    levels.forEach((lvl) => {
      const y = padT + chartH - (chartH * lvl) / 100;
      ctx.strokeStyle = "#EEF1ED";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(W - padR, y);
      ctx.stroke();

      ctx.fillStyle = "#9CA38F";
      ctx.fillText(`${lvl}%`, padL - 5, y + 3);
    });

    const barGroupW = chartW / hourly.length;
    const barW = Math.max(Math.min(barGroupW * 0.65, 36), 8);

    hourly.forEach((h, i) => {
      const x = padL + barGroupW * i + (barGroupW - barW) / 2;
      const barH = (h.occupancyPercent / 100) * chartH;
      const y = padT + chartH - barH;

      let color = "#E0E7DE";
      if (h.occupancyPercent >= 75) color = "#1B4332";
      else if (h.occupancyPercent >= 50) color = "#2D6A4F";
      else if (h.occupancyPercent >= 25) color = "#52B788";
      else if (h.occupancyPercent > 0) color = "#95D5B2";

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(x, y, barW, barH, [4, 4, 0, 0]);
      ctx.fill();

      if (h.occupancyPercent > 0) {
        ctx.fillStyle = "#2D6A4F";
        ctx.font = "bold 9px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`${Math.round(h.occupancyPercent)}%`, x + barW / 2, Math.max(y - 4, padT + 8));
      }

      ctx.fillStyle = "#6B7280";
      ctx.font = "9px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(h.hourLabel, x + barW / 2, H - padB + 14);
    });
  }, [hourly, currencySymbol]);

  return <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />;
}

// ── Main Page Component ───────────────────────────────────────────────────────
export default function RevenueReportPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<ReportTab>("revenue");
  const [period, setPeriod] = useState<Period>(30);

  const [revReport, setRevReport] = useState<RevenueReport | null>(null);
  const [teeReport, setTeeReport] = useState<TeeSheetReport | null>(null);
  const [golfersReport, setGolfersReport] = useState<GolfersReport | null>(null);
  const [rangeTournamentsReport, setRangeTournamentsReport] = useState<RangeTournamentsReport | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cs, setCs] = useState("₹");

  // Fetch tenant to get currency symbol
  useEffect(() => {
    if (!user?.tenantId) return;
    courseApi
      .getTenant(user.tenantId)
      .then((t) => {
        if (t.currencySymbol) setCs(t.currencySymbol);
      })
      .catch(() => {});
  }, [user?.tenantId]);

  // Load data when tab, period, or user changes
  useEffect(() => {
    if (!user?.tenantId) return;
    setLoading(true);
    setError(null);

    const days = toDays(period);

    if (tab === "revenue") {
      reportsApi
        .revenue(user.tenantId, days, user.token)
        .then(setRevReport)
        .catch((e) => setError(e instanceof Error ? e.message : "Failed to load revenue report."))
        .finally(() => setLoading(false));
    } else if (tab === "teeSheet") {
      reportsApi
        .teeSheet(user.tenantId, days, user.token)
        .then(setTeeReport)
        .catch((e) => setError(e instanceof Error ? e.message : "Failed to load tee sheet report."))
        .finally(() => setLoading(false));
    } else if (tab === "golfers") {
      reportsApi
        .golfers(user.tenantId, days, user.token)
        .then(setGolfersReport)
        .catch((e) => setError(e instanceof Error ? e.message : "Failed to load golfers report."))
        .finally(() => setLoading(false));
    } else {
      reportsApi
        .rangeAndTournaments(user.tenantId, days, user.token)
        .then(setRangeTournamentsReport)
        .catch((e) => setError(e instanceof Error ? e.message : "Failed to load range & tournaments report."))
        .finally(() => setLoading(false));
    }
  }, [user, tab, period]);

  if (!user?.tenantId) {
    return (
      <AdminLayout>
        <NoCourse />
      </AdminLayout>
    );
  }

  const PERIODS: Period[] = [7, 30, 90, "month"];

  return (
    <AdminLayout>
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div className="eyebrow mb-0">Analytics &amp; Intelligence</div>
          <h1 className="text-3xl font-semibold tracking-tight text-fairway">Owner Reports Hub</h1>
          <p className="text-sm text-ink-soft mt-1">
            Data insights, tee-sheet occupancy, member analytics, and range/tournament performance for {periodLabel(period).toLowerCase()}.
          </p>
        </div>

        {/* Period switcher */}
        <div className="flex items-center bg-white border border-[#EEF1ED] rounded-2xl p-1 shadow-xs gap-1 self-start sm:self-auto">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                period === p
                  ? "bg-fairway text-white shadow-xs"
                  : "text-ink-soft hover:text-fairway hover:bg-[#F8FAF7]"
              }`}
            >
              {p === "month" ? "This Month" : `${p}D`}
            </button>
          ))}
        </div>
      </div>

      {/* Main Report Navigation Tabs */}
      <div className="flex items-center gap-2 mb-6 border-b border-[#EEF1ED] pb-3 overflow-x-auto">
        <button
          onClick={() => setTab("revenue")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
            tab === "revenue"
              ? "bg-fairway text-white shadow-xs"
              : "text-ink-soft bg-white border border-[#EEF1ED] hover:bg-[#F8FAF7] hover:text-fairway"
          }`}
        >
          <span>💰</span>
          <span>Revenue Overview</span>
        </button>

        <button
          onClick={() => setTab("teeSheet")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
            tab === "teeSheet"
              ? "bg-fairway text-white shadow-xs"
              : "text-ink-soft bg-white border border-[#EEF1ED] hover:bg-[#F8FAF7] hover:text-fairway"
          }`}
        >
          <span>⛳</span>
          <span>Tee Sheet &amp; Operations</span>
        </button>

        <button
          onClick={() => setTab("golfers")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
            tab === "golfers"
              ? "bg-fairway text-white shadow-xs"
              : "text-ink-soft bg-white border border-[#EEF1ED] hover:bg-[#F8FAF7] hover:text-fairway"
          }`}
        >
          <span>🏌️</span>
          <span>Golfer &amp; Member Activity</span>
        </button>

        <button
          onClick={() => setTab("rangeTournaments")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
            tab === "rangeTournaments"
              ? "bg-fairway text-white shadow-xs"
              : "text-ink-soft bg-white border border-[#EEF1ED] hover:bg-[#F8FAF7] hover:text-fairway"
          }`}
        >
          <span>🎯</span>
          <span>Driving Range &amp; Tournaments</span>
        </button>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
          {error}
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="space-y-6 animate-pulse">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 bg-line rounded-2xl" />
            ))}
          </div>
          <div className="h-64 bg-line rounded-2xl" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="h-48 bg-line rounded-2xl" />
            <div className="h-48 bg-line rounded-2xl" />
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          TAB 1: REVENUE OVERVIEW
      ────────────────────────────────────────────────────────────────────────── */}
      {!loading && tab === "revenue" && revReport && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              icon="💰"
              label="Total Revenue"
              value={revReport.totalRevenue}
              prev={revReport.previousPeriodRevenue}
              suffix={cs}
            />
            <KpiCard
              icon="⛳"
              label="Tee Revenue"
              value={revReport.teeRevenue}
              prev={revReport.previousTeePeriodRevenue}
              suffix={cs}
            />
            <KpiCard
              icon="🎯"
              label="Range Revenue"
              value={revReport.rangeRevenue}
              prev={revReport.previousRangePeriodRevenue}
              suffix={cs}
            />
            <div className="bg-white rounded-2xl border border-[#EEF1ED] shadow-xs p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-2xl">📈</span>
                <span
                  className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                    revReport.occupancyPercent >= 70
                      ? "bg-emerald-50 text-emerald-700"
                      : revReport.occupancyPercent >= 40
                      ? "bg-amber-50 text-amber-700"
                      : "bg-red-50 text-red-600"
                  }`}
                >
                  {revReport.occupancyPercent >= 70
                    ? "Healthy"
                    : revReport.occupancyPercent >= 40
                    ? "Moderate"
                    : "Low"}
                </span>
              </div>
              <div>
                <p className="text-2xl font-extrabold text-fairway tracking-tight">
                  {revReport.occupancyPercent}%
                </p>
                <p className="text-xs text-ink-soft mt-0.5 font-medium">Tee Sheet Occupancy</p>
              </div>
            </div>
          </div>

          {/* Daily Bar Chart */}
          <div className="bg-white rounded-2xl border border-[#EEF1ED] shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-[#EEF1ED] flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-fairway">Daily Revenue</h2>
                <p className="text-xs text-ink-soft mt-0.5">{periodLabel(period)}</p>
              </div>
              {/* Legend */}
              <div className="flex items-center gap-4 text-xs text-ink-soft">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-xs bg-[#2D6A4F] inline-block" /> Tee
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-xs bg-[#F4A261] inline-block" /> Range
                </span>
              </div>
            </div>
            <div className="p-5" style={{ height: 240 }}>
              {revReport.daily.every((d) => d.tee === 0 && d.range === 0) ? (
                <div className="flex items-center justify-center h-full text-sm text-ink-soft">
                  No revenue data recorded for this period yet.
                </div>
              ) : (
                <RevenueBarChart data={revReport.daily} currencySymbol={cs} />
              )}
            </div>
          </div>

          {/* Bottom 2-col row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Revenue Breakdown */}
            <div className="bg-white rounded-2xl border border-[#EEF1ED] shadow-xs p-5">
              <h2 className="text-sm font-semibold text-fairway mb-4">Revenue Breakdown</h2>
              {revReport.totalRevenue === 0 ? (
                <p className="text-sm text-ink-soft">No revenue recorded this period.</p>
              ) : (
                (() => {
                  const teePct =
                    revReport.totalRevenue > 0
                      ? Math.round((revReport.teeRevenue / revReport.totalRevenue) * 100)
                      : 0;
                  const rangePct = 100 - teePct;
                  return (
                    <div className="space-y-4">
                      {/* Horizontal stacked bar */}
                      <div className="flex rounded-full overflow-hidden h-4">
                        {teePct > 0 && (
                          <div style={{ width: `${teePct}%` }} className="bg-[#2D6A4F] transition-all" />
                        )}
                        {rangePct > 0 && (
                          <div style={{ width: `${rangePct}%` }} className="bg-[#F4A261] transition-all" />
                        )}
                      </div>
                      {/* Labels */}
                      <div className="space-y-2">
                        {[
                          { label: "⛳ Tee Bookings", value: revReport.teeRevenue, pct: teePct, color: "bg-[#2D6A4F]" },
                          { label: "🎯 Range Bays", value: revReport.rangeRevenue, pct: rangePct, color: "bg-[#F4A261]" },
                        ].map((row) => (
                          <div key={row.label} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <span className={`w-2.5 h-2.5 rounded-full ${row.color}`} />
                              <span className="text-ink-soft">{row.label}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-ink-soft">{row.pct}%</span>
                              <span className="font-semibold text-fairway">
                                {cs}{row.value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()
              )}
            </div>

            {/* Bookings Summary */}
            <div className="bg-white rounded-2xl border border-[#EEF1ED] shadow-xs p-5">
              <h2 className="text-sm font-semibold text-fairway mb-4">Tee Bookings Summary</h2>
              <StatRow label="Total Bookings" value={revReport.totalBookings} />
              <StatRow
                label="Checked In"
                value={revReport.checkedIn}
                sub={
                  revReport.totalBookings > 0
                    ? `(${Math.round((revReport.checkedIn / revReport.totalBookings) * 100)}%)`
                    : ""
                }
              />
              <StatRow
                label="Cancelled"
                value={revReport.cancelled}
                sub={
                  revReport.totalBookings > 0
                    ? `(${Math.round((revReport.cancelled / revReport.totalBookings) * 100)}%)`
                    : ""
                }
              />
              <StatRow
                label="Confirmed (Active)"
                value={revReport.totalBookings - revReport.checkedIn - revReport.cancelled}
              />
              <StatRow label="Avg. Party Size" value={`${revReport.averagePartySize} players`} />
              <StatRow
                label="Avg. Revenue / Booking"
                value={
                  revReport.totalBookings > 0
                    ? `${cs}${Math.round(
                        revReport.teeRevenue / Math.max(revReport.totalBookings - revReport.cancelled, 1)
                      ).toLocaleString("en-IN")}`
                    : `${cs}0`
                }
              />
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          TAB 2: TEE SHEET & OPERATIONS PERFORMANCE
      ────────────────────────────────────────────────────────────────────────── */}
      {!loading && tab === "teeSheet" && teeReport && (
        <div className="space-y-6">
          {/* Operations Hero KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-[#EEF1ED] shadow-xs p-5 flex flex-col gap-2">
              <span className="text-2xl">⛳</span>
              <p className="text-2xl font-extrabold text-fairway tracking-tight">
                {teeReport.overallOccupancyPercent}%
              </p>
              <p className="text-xs text-ink-soft font-medium">
                Overall Tee Occupancy ({teeReport.totalGolfers} golfers across {teeReport.totalSlots} slots)
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-[#EEF1ED] shadow-xs p-5 flex flex-col gap-2">
              <span className="text-2xl">📅</span>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-extrabold text-fairway">{teeReport.weekdayOccupancyPercent}%</span>
                <span className="text-xs text-ink-soft">Wkday</span>
                <span className="text-gray-300">/</span>
                <span className="text-xl font-extrabold text-emerald-700">{teeReport.weekendOccupancyPercent}%</span>
                <span className="text-xs text-ink-soft">Wkend</span>
              </div>
              <p className="text-xs text-ink-soft font-medium">Weekday vs Weekend Demand</p>
            </div>

            <div className="bg-white rounded-2xl border border-[#EEF1ED] shadow-xs p-5 flex flex-col gap-2">
              <span className="text-2xl">✅</span>
              <p className="text-2xl font-extrabold text-emerald-700 tracking-tight">
                {teeReport.checkInRate}%
              </p>
              <p className="text-xs text-ink-soft font-medium">
                Arrival Check-In Rate (Cancelled: {teeReport.cancellationRate}%)
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-[#EEF1ED] shadow-xs p-5 flex flex-col gap-2">
              <span className="text-2xl">👥</span>
              <p className="text-2xl font-extrabold text-fairway tracking-tight">
                {teeReport.averagePartySize}
              </p>
              <p className="text-xs text-ink-soft font-medium">Average Players per Booking</p>
            </div>
          </div>

          {/* Hourly Demand & Heatmap Bar Chart */}
          <div className="bg-white rounded-2xl border border-[#EEF1ED] shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-[#EEF1ED] flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-fairway">Tee Time Popularity by Hour (6 AM – 6 PM)</h2>
                <p className="text-xs text-ink-soft mt-0.5">
                  Occupancy distribution across the day. Peak hours show higher golfer concentration.
                </p>
              </div>
              {/* Heatmap Legend */}
              <div className="flex items-center gap-3 text-xs text-ink-soft">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#1B4332]" /> Peak (75%+)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#2D6A4F]" /> High (50%+)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#E0E7DE]" /> Low
                </span>
              </div>
            </div>
            <div className="p-5" style={{ height: 250 }}>
              {teeReport.hourly.every((h) => h.totalSlots === 0) ? (
                <div className="flex items-center justify-center h-full text-sm text-ink-soft">
                  No tee slot activity recorded for this period.
                </div>
              ) : (
                <HourlyOccupancyChart hourly={teeReport.hourly} currencySymbol={cs} />
              )}
            </div>
          </div>

          {/* Time of Day Performance Cards */}
          <div>
            <h2 className="text-sm font-semibold text-fairway mb-3">Time-of-Day Segments</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {teeReport.timeOfDay.map((bucket) => {
                const icons: Record<string, string> = {
                  "Morning Rush": "🌅",
                  "Midday Prime": "☀️",
                  "Afternoon": "🌤️",
                  "Twilight": "🌆",
                };
                return (
                  <div
                    key={bucket.name}
                    className="bg-white rounded-2xl border border-[#EEF1ED] p-4 shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xl">{icons[bucket.name] || "⏱️"}</span>
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            bucket.occupancyPercent >= 70
                              ? "bg-emerald-100 text-emerald-800"
                              : bucket.occupancyPercent >= 40
                              ? "bg-amber-100 text-amber-800"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {bucket.occupancyPercent}% Occ
                        </span>
                      </div>
                      <h3 className="font-semibold text-sm text-fairway">{bucket.name}</h3>
                      <p className="text-[11px] font-mono text-ink-soft">{bucket.timeRange}</p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#EEF1ED] flex items-center justify-between text-xs">
                      <div>
                        <span className="text-ink-soft">Players: </span>
                        <span className="font-semibold text-fairway">{bucket.totalGolfers}</span>
                      </div>
                      <div>
                        <span className="text-ink-soft">Revenue: </span>
                        <span className="font-semibold text-emerald-800 font-mono">
                          {cs}{bucket.revenue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Day of Week Breakdown Table */}
          <div className="bg-white rounded-2xl border border-[#EEF1ED] shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-[#EEF1ED]">
              <h2 className="text-sm font-semibold text-fairway">Day-of-Week Utilization &amp; Revenue</h2>
              <p className="text-xs text-ink-soft mt-0.5">
                Understand which days drive the most traffic to calibrate weekday vs weekend pricing rules.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#FAFBF9] text-[11px] font-mono uppercase tracking-wider text-ink-soft border-b border-[#EEF1ED]">
                    <th className="py-3 px-5">Day of Week</th>
                    <th className="py-3 px-5">Total Slots</th>
                    <th className="py-3 px-5">Booked Slots</th>
                    <th className="py-3 px-5">Total Golfers</th>
                    <th className="py-3 px-5">Occupancy</th>
                    <th className="py-3 px-5 text-right">Revenue Generated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEF1ED]">
                  {teeReport.daysOfWeek.map((d) => (
                    <tr key={d.day} className="hover:bg-[#FAFBF9] transition-colors">
                      <td className="py-3.5 px-5 font-semibold text-fairway flex items-center gap-2">
                        <span>{d.day === "Saturday" || d.day === "Sunday" ? "🌟" : "⛳"}</span>
                        <span>{d.day}</span>
                      </td>
                      <td className="py-3.5 px-5 font-mono text-ink-soft">{d.totalSlots}</td>
                      <td className="py-3.5 px-5 font-mono text-ink-soft">{d.bookedSlots}</td>
                      <td className="py-3.5 px-5 font-mono font-medium text-fairway">{d.totalGolfers}</td>
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-gray-100 rounded-full h-2 overflow-hidden">
                            <div
                              style={{ width: `${Math.min(d.occupancyPercent, 100)}%` }}
                              className={`h-full rounded-full ${
                                d.occupancyPercent >= 70
                                  ? "bg-emerald-600"
                                  : d.occupancyPercent >= 40
                                  ? "bg-amber-500"
                                  : "bg-gray-400"
                              }`}
                            />
                          </div>
                          <span className="font-semibold text-fairway">{d.occupancyPercent}%</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-5 text-right font-mono font-bold text-fairway">
                        {cs}{d.revenue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          TAB 3: GOLFER & MEMBER ACTIVITY
      ────────────────────────────────────────────────────────────────────────── */}
      {!loading && tab === "golfers" && golfersReport && (
        <div className="space-y-6">
          {/* Golfer Hero KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-[#EEF1ED] shadow-xs p-5 flex flex-col gap-2">
              <span className="text-2xl">🏌️</span>
              <p className="text-2xl font-extrabold text-fairway tracking-tight">
                {golfersReport.totalUniqueGolfers}
              </p>
              <p className="text-xs text-ink-soft font-medium">
                Active Players this period ({golfersReport.totalRegisteredMembers} registered members)
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-[#EEF1ED] shadow-xs p-5 flex flex-col gap-2">
              <span className="text-2xl">🎯</span>
              <p className="text-2xl font-extrabold text-fairway tracking-tight">
                {golfersReport.totalRoundsPlayed}
              </p>
              <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">
                  18H: {golfersReport.rounds18Hole}
                </span>
                <span className="font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md">
                  9H: {golfersReport.rounds9Hole}
                </span>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#EEF1ED] shadow-xs p-5 flex flex-col gap-2">
              <span className="text-2xl">📊</span>
              <p className="text-2xl font-extrabold text-fairway tracking-tight">
                {golfersReport.averageRoundScore > 0 ? golfersReport.averageRoundScore : "—"}
              </p>
              <p className="text-xs text-ink-soft font-medium">
                Avg 18-Hole Course Score (
                {golfersReport.averageScoreToPar > 0
                  ? `+${golfersReport.averageScoreToPar}`
                  : golfersReport.averageScoreToPar < 0
                  ? `${golfersReport.averageScoreToPar}`
                  : "E"}
                )
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-[#EEF1ED] shadow-xs p-5 flex flex-col gap-2">
              <span className="text-2xl">🏆</span>
              <p className="text-2xl font-extrabold text-emerald-700 tracking-tight">
                {golfersReport.topGolfers.length > 0 && golfersReport.topGolfers[0].bestRoundScore
                  ? golfersReport.topGolfers[0].bestRoundScore
                  : "—"}
              </p>
              <p className="text-xs text-ink-soft font-medium">
                Course Low Gross Score ({golfersReport.topGolfers.length > 0 ? golfersReport.topGolfers[0].name : "None yet"})
              </p>
            </div>
          </div>

          {/* Top 10 Golfers Leaderboard */}
          <div className="bg-white rounded-2xl border border-[#EEF1ED] shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-[#EEF1ED] flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-fairway">Top 10 Golfers &amp; VIP Members</h2>
                <p className="text-xs text-ink-soft mt-0.5">
                  Ranked by course spend and rounds played during this period.
                </p>
              </div>
              <span className="text-xs font-mono text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-full">
                👑 Top VIPs
              </span>
            </div>

            {golfersReport.topGolfers.length === 0 ? (
              <div className="p-8 text-center text-xs text-ink-soft">
                No golfer activity recorded for this period yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#FAFBF9] text-[11px] font-mono uppercase tracking-wider text-ink-soft border-b border-[#EEF1ED]">
                      <th className="py-3 px-5">Rank</th>
                      <th className="py-3 px-5">Golfer</th>
                      <th className="py-3 px-5">Handicap</th>
                      <th className="py-3 px-5">Rounds Played</th>
                      <th className="py-3 px-5">Bookings</th>
                      <th className="py-3 px-5">Best Score</th>
                      <th className="py-3 px-5 text-right">Total Course Spend</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EEF1ED]">
                    {golfersReport.topGolfers.map((g, idx) => (
                      <tr key={g.userId} className="hover:bg-[#FAFBF9] transition-colors">
                        <td className="py-3.5 px-5 font-mono font-bold text-fairway">
                          {idx === 0 ? "🥇 #1" : idx === 1 ? "🥈 #2" : idx === 2 ? "🥉 #3" : `#${idx + 1}`}
                        </td>
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-fairway/10 text-fairway font-bold flex items-center justify-center text-xs shrink-0">
                              {g.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-fairway truncate">{g.name}</p>
                              <p className="text-[11px] text-ink-soft font-mono truncate">{g.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-5">
                          <span className="font-mono font-semibold px-2 py-0.5 rounded-md bg-fairway/5 text-fairway text-xs">
                            {g.handicapIndex !== null && g.handicapIndex !== undefined
                              ? g.handicapIndex <= 0
                                ? `+${Math.abs(g.handicapIndex)}`
                                : g.handicapIndex.toFixed(1)
                              : "Unranked"}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 font-mono font-medium text-fairway">
                          {g.roundsPlayed} rounds
                        </td>
                        <td className="py-3.5 px-5 font-mono text-ink-soft">
                          {g.bookingsCount} bookings
                        </td>
                        <td className="py-3.5 px-5 font-mono font-semibold text-fairway">
                          {g.bestRoundScore ? `${g.bestRoundScore} strokes` : "—"}
                        </td>
                        <td className="py-3.5 px-5 text-right font-mono font-bold text-emerald-800">
                          {cs}{g.totalSpend.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Bottom 2-col row: Handicap Distribution & Scoring Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Handicap Distribution Curve */}
            <div className="bg-white rounded-2xl border border-[#EEF1ED] shadow-xs p-5">
              <h2 className="text-sm font-semibold text-fairway mb-1">Member Handicap Distribution</h2>
              <p className="text-xs text-ink-soft mb-4">
                Spread of player skill levels across active registered golfers.
              </p>

              <div className="space-y-3">
                {golfersReport.handicapDistribution.map((bucket) => (
                  <div key={bucket.rangeLabel} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-fairway">{bucket.rangeLabel}</span>
                      <span className="font-mono text-ink-soft">
                        {bucket.count} golfers ({bucket.percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div
                        style={{ width: `${Math.min(bucket.percentage, 100)}%` }}
                        className="h-full rounded-full bg-[#2D6A4F] transition-all"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Course Scoring Breakdown */}
            <div className="bg-white rounded-2xl border border-[#EEF1ED] shadow-xs p-5">
              <h2 className="text-sm font-semibold text-fairway mb-1">Hole Scoring Breakdown</h2>
              <p className="text-xs text-ink-soft mb-4">
                Aggregated hole results across all completed scorecards.
              </p>

              {(() => {
                const s = golfersReport.scoringBreakdown;
                const totalHoles = s.eaglesOrBetter + s.birdies + s.pars + s.bogeys + s.doubleBogeysOrWorse;

                if (totalHoles === 0) {
                  return (
                    <div className="p-8 text-center text-xs text-ink-soft">
                      No hole scores recorded for this period yet.
                    </div>
                  );
                }

                const eaglePct = Math.round((s.eaglesOrBetter / totalHoles) * 100);
                const birdiePct = Math.round((s.birdies / totalHoles) * 100);
                const parPct = Math.round((s.pars / totalHoles) * 100);
                const bogeyPct = Math.round((s.bogeys / totalHoles) * 100);
                const doublePct = 100 - eaglePct - birdiePct - parPct - bogeyPct;

                return (
                  <div className="space-y-4">
                    {/* Proportional horizontal bar */}
                    <div className="flex rounded-full overflow-hidden h-4">
                      {eaglePct > 0 && <div style={{ width: `${eaglePct}%` }} className="bg-amber-400" />}
                      {birdiePct > 0 && <div style={{ width: `${birdiePct}%` }} className="bg-emerald-600" />}
                      {parPct > 0 && <div style={{ width: `${parPct}%` }} className="bg-blue-600" />}
                      {bogeyPct > 0 && <div style={{ width: `${bogeyPct}%` }} className="bg-orange-500" />}
                      {doublePct > 0 && <div style={{ width: `${doublePct}%` }} className="bg-red-600" />}
                    </div>

                    <div className="space-y-2 pt-2">
                      {[
                        { label: "🦅 Eagles / Better", count: s.eaglesOrBetter, pct: eaglePct, color: "bg-amber-400" },
                        { label: "🐦 Birdies", count: s.birdies, pct: birdiePct, color: "bg-emerald-600" },
                        { label: "⛳ Pars", count: s.pars, pct: parPct, color: "bg-blue-600" },
                        { label: "🔴 Bogeys", count: s.bogeys, pct: bogeyPct, color: "bg-orange-500" },
                        { label: "⚠️ Double Bogeys+", count: s.doubleBogeysOrWorse, pct: doublePct, color: "bg-red-600" },
                      ].map((row) => (
                        <div key={row.label} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${row.color}`} />
                            <span className="font-medium text-fairway">{row.label}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-ink-soft">{row.count} holes</span>
                            <span className="font-mono font-bold text-fairway w-8 text-right">{row.pct}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          TAB 4: DRIVING RANGE & TOURNAMENTS
      ────────────────────────────────────────────────────────────────────────── */}
      {!loading && tab === "rangeTournaments" && rangeTournamentsReport && (
        <div className="space-y-6">
          {/* Hero KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-[#EEF1ED] shadow-xs p-5 flex flex-col gap-2">
              <span className="text-2xl">🎯</span>
              <p className="text-2xl font-extrabold text-fairway tracking-tight">
                {cs}{rangeTournamentsReport.totalRangeRevenue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-ink-soft font-medium">
                Range Revenue ({rangeTournamentsReport.totalRangeSessions} sessions · {rangeTournamentsReport.totalPracticeHours} hrs)
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-[#EEF1ED] shadow-xs p-5 flex flex-col gap-2">
              <span className="text-2xl">📡</span>
              <p className="text-2xl font-extrabold text-emerald-700 tracking-tight">
                {cs}{rangeTournamentsReport.trackManRevenue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-ink-soft font-medium">
                TrackMan / Launch Monitor Revenue ({rangeTournamentsReport.trackManSessions} sessions)
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-[#EEF1ED] shadow-xs p-5 flex flex-col gap-2">
              <span className="text-2xl">🏆</span>
              <p className="text-2xl font-extrabold text-fairway tracking-tight">
                {rangeTournamentsReport.totalTournaments} Events
              </p>
              <p className="text-xs text-ink-soft font-medium">
                {rangeTournamentsReport.totalParticipants} Participants Turned Out
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-[#EEF1ED] shadow-xs p-5 flex flex-col gap-2">
              <span className="text-2xl">💰</span>
              <p className="text-2xl font-extrabold text-fairway tracking-tight">
                {cs}{rangeTournamentsReport.totalTournamentRevenue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-ink-soft font-medium">
                Tournament Entry Fees Collected (Purse: {cs}{rangeTournamentsReport.totalPrizePurse.toLocaleString("en-IN")})
              </p>
            </div>
          </div>

          {/* Bay-by-Bay Performance Table */}
          <div className="bg-white rounded-2xl border border-[#EEF1ED] shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-[#EEF1ED] flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-fairway">Driving Range Bay Utilization</h2>
                <p className="text-xs text-ink-soft mt-0.5">
                  Performance and hours logged across each practice bay.
                </p>
              </div>
              <span className="text-xs font-mono text-turf font-semibold bg-emerald-50 px-2.5 py-1 rounded-full">
                🎯 {rangeTournamentsReport.bays.length} Bays Active
              </span>
            </div>

            {rangeTournamentsReport.bays.length === 0 ? (
              <div className="p-8 text-center text-xs text-ink-soft">
                No range bays configured for this course yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#FAFBF9] text-[11px] font-mono uppercase tracking-wider text-ink-soft border-b border-[#EEF1ED]">
                      <th className="py-3 px-5">Bay</th>
                      <th className="py-3 px-5">Features</th>
                      <th className="py-3 px-5">Hourly Rate</th>
                      <th className="py-3 px-5">Sessions</th>
                      <th className="py-3 px-5">Total Hours</th>
                      <th className="py-3 px-5">Utilization</th>
                      <th className="py-3 px-5 text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EEF1ED]">
                    {rangeTournamentsReport.bays.map((bay) => (
                      <tr key={bay.bayId} className="hover:bg-[#FAFBF9] transition-colors">
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-fairway/10 text-fairway font-bold flex items-center justify-center text-xs">
                              {bay.bayNumber}
                            </span>
                            <span className="font-semibold text-fairway">{bay.bayName}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {bay.hasLaunchMonitor && (
                              <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full">
                                📡 TrackMan
                              </span>
                            )}
                            <span className="text-[10px] font-medium bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                              {bay.isOutdoor ? "Outdoor" : "Indoor"}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-5 font-mono text-fairway font-medium">
                          {cs}{bay.hourlyRate}/hr
                        </td>
                        <td className="py-3.5 px-5 font-mono text-ink-soft">
                          {bay.sessionsCount} sessions
                        </td>
                        <td className="py-3.5 px-5 font-mono text-ink-soft">
                          {bay.totalHours} hrs
                        </td>
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-gray-100 rounded-full h-2 overflow-hidden">
                              <div
                                style={{ width: `${Math.min(bay.utilizationPercent, 100)}%` }}
                                className={`h-full rounded-full ${
                                  bay.utilizationPercent >= 50
                                    ? "bg-emerald-600"
                                    : bay.utilizationPercent >= 20
                                    ? "bg-amber-500"
                                    : "bg-gray-400"
                                }`}
                              />
                            </div>
                            <span className="font-semibold text-fairway font-mono">{bay.utilizationPercent}%</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-5 text-right font-mono font-bold text-emerald-800">
                          {cs}{bay.totalRevenue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Tournaments Performance Ledger */}
          <div className="bg-white rounded-2xl border border-[#EEF1ED] shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-[#EEF1ED] flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-fairway">Tournaments &amp; Competitions</h2>
                <p className="text-xs text-ink-soft mt-0.5">
                  Participation, entry fee earnings, and prize allocations.
                </p>
              </div>
              <span className="text-xs font-mono text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-full">
                🏆 Tournaments Summary
              </span>
            </div>

            {rangeTournamentsReport.tournaments.length === 0 ? (
              <div className="p-8 text-center text-xs text-ink-soft">
                No tournaments organized during this period.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#FAFBF9] text-[11px] font-mono uppercase tracking-wider text-ink-soft border-b border-[#EEF1ED]">
                      <th className="py-3 px-5">Tournament</th>
                      <th className="py-3 px-5">Format</th>
                      <th className="py-3 px-5">Dates</th>
                      <th className="py-3 px-5">Status</th>
                      <th className="py-3 px-5">Turnout</th>
                      <th className="py-3 px-5">Entry Fee</th>
                      <th className="py-3 px-5 text-right">Revenue Collected</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EEF1ED]">
                    {rangeTournamentsReport.tournaments.map((t) => (
                      <tr key={t.id} className="hover:bg-[#FAFBF9] transition-colors">
                        <td className="py-3.5 px-5">
                          <div>
                            <p className="font-semibold text-fairway">{t.name}</p>
                            {(t.closestToPinWinner || t.longestDriveWinner) && (
                              <div className="flex gap-2 text-[10px] text-ink-soft mt-0.5">
                                {t.closestToPinWinner && <span>🎯 CTP: {t.closestToPinWinner}</span>}
                                {t.longestDriveWinner && <span>🚀 Long Drive: {t.longestDriveWinner}</span>}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-5">
                          <span className="px-2 py-0.5 rounded-md bg-fairway/5 text-fairway font-medium text-[11px]">
                            {t.format}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 font-mono text-ink-soft text-[11px]">
                          {new Date(t.startDate).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                          {t.endDate && t.endDate !== t.startDate && (
                            <span> – {new Date(t.endDate).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}</span>
                          )}
                        </td>
                        <td className="py-3.5 px-5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              t.status === "Completed"
                                ? "bg-emerald-100 text-emerald-800"
                                : t.status === "InProgress"
                                ? "bg-amber-100 text-amber-800 animate-pulse"
                                : "bg-blue-50 text-blue-800"
                            }`}
                          >
                            {t.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 font-mono">
                          <span className="font-semibold text-fairway">{t.participantsCount}</span>
                          <span className="text-ink-soft text-[11px]"> / {t.maxParticipants}</span>
                        </td>
                        <td className="py-3.5 px-5 font-mono text-ink-soft">
                          {t.entryFee > 0 ? `${cs}${t.entryFee.toLocaleString("en-IN")}` : "Free"}
                        </td>
                        <td className="py-3.5 px-5 text-right font-mono font-bold text-emerald-800">
                          {cs}{t.revenueCollected.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
