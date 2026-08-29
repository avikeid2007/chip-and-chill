import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import NavBar from "../components/NavBar";
import TeeTicker from "../components/TeeTicker";
import Scorecard from "../components/Scorecard";
import Leaderboard from "../components/Leaderboard";
import { apiFetch } from "../api/client";
import { toDateInput, formatTime } from "../utils/time";
import type { TeeSlot, ScorecardHole, LeaderboardEntry } from "../types";

interface TenantSummary {
  id: string;
  name: string;
  type: string;
  address?: string | null;
  description?: string | null;
  currencySymbol?: string;
  subdomain?: string | null;
  customDomain?: string | null;
}

const demoSlots: TeeSlot[] = [
  { id: "1", time: "7:10a", playersBooked: 2, playersMax: 4, price: 45, status: "open" },
  { id: "2", time: "7:40a", playersBooked: 1, playersMax: 4, price: 45, status: "open" },
  { id: "3", time: "8:10a", playersBooked: 3, playersMax: 4, price: 45, status: "low" },
  { id: "4", time: "8:40a", playersBooked: 4, playersMax: 4, price: 45, status: "full" },
  { id: "5", time: "9:10a", playersBooked: 2, playersMax: 4, price: 52, status: "open" },
];

const demoHoles: ScorecardHole[] = [
  { hole: 1, par: 4, score: 4 },
  { hole: 2, par: 3, score: 2 },
  { hole: 3, par: 5, score: 5 },
  { hole: 4, par: 4, score: 5 },
  { hole: 5, par: 4, score: 4 },
  { hole: 6, par: 3, score: 3 },
  { hole: 7, par: 4, score: 3 },
  { hole: 8, par: 5, score: 5 },
  { hole: 9, par: 4, score: 4 },
];

const demoLeaderboard: LeaderboardEntry[] = [
  { rank: 1, player: "Marcus Webb", thru: 18, toPar: -5 },
  { rank: 2, player: "Dana Osei", thru: 18, toPar: -3 },
  { rank: 3, player: "Sam Petrov", thru: 17, toPar: -1 },
  { rank: 4, player: "Scottie Scheffler", thru: 16, toPar: 0 },
];

export default function Landing() {
  const navigate = useNavigate();

  const [tenants, setTenants] = useState<TenantSummary[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(toDateInput(new Date()));
  const [selectedPartySize, setSelectedPartySize] = useState<number>(2);

  const [heroCourseName, setHeroCourseName] = useState("Pine Hollow");
  const [heroSlots, setHeroSlots] = useState<TeeSlot[] | null>(null);
  const [loadingCourses, setLoadingCourses] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const tenantList = await apiFetch<TenantSummary[]>("/api/tenants");
        setTenants(tenantList);
        if (tenantList.length > 0) {
          setSelectedCourseId(tenantList[0].id);
        }

        const today = toDateInput(new Date());
        for (const tenant of tenantList) {
          const slots = await apiFetch<
            { id: string; startTime: string; maxPlayers: number; playersBooked: number; price: number; status: string }[]
          >(`/api/tenants/${tenant.id}/tee-slots?date=${today}`);

          if (slots.length > 0) {
            setHeroCourseName(tenant.name);
            setHeroSlots(
              slots.slice(0, 5).map((s) => ({
                id: s.id,
                time: formatTime(s.startTime),
                playersBooked: s.playersBooked,
                playersMax: s.maxPlayers,
                price: s.price,
                status: (s.status === "blocked" ? "full" : s.status) as TeeSlot["status"],
              }))
            );
            break;
          }
        }
      } catch {
        /* fallback to demo data */
      } finally {
        setLoadingCourses(false);
      }
    })();
  }, []);

  function handleQuickSearch(e: React.FormEvent) {
    e.preventDefault();
    if (selectedCourseId) {
      navigate(`/booking?tenantId=${selectedCourseId}&date=${selectedDate}&partySize=${selectedPartySize}`);
    } else {
      navigate("/courses");
    }
  }

  return (
    <div className="bg-[#FAFBF9] text-gray-900 selection:bg-gold selection:text-fairway">
      {/* ── HERO SECTION ─────────────────────────────────────────────────── */}
      <div className="relative bg-gradient-to-br from-[#0B3024] via-[#124233] to-[#08241B] text-white overflow-hidden">
        {/* Subtle Luxury Pattern */}
        <div
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 30%, white 0.5px, transparent 0.5px), radial-gradient(circle at 70% 60%, white 0.5px, transparent 0.5px)",
            backgroundSize: "4px 4px, 6px 6px",
          }}
        />

        <NavBar />

        <div className="relative z-10 px-6 sm:px-10 md:px-14 pt-8 pb-24 max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-12 items-center">
            {/* Left Hero Content */}
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs font-mono tracking-wider text-sand uppercase backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                The Modern Golf Operating System
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold leading-[1.1] tracking-tight text-white">
                The tee sheet, <br />
                run <span className="italic text-sand font-normal">your</span> way.
              </h1>

              <p className="text-base sm:text-lg text-white/80 max-w-xl leading-relaxed font-light">
                Discover championship golf courses, reserve simulator driving bays, enter live tournaments, and manage club operations with zero friction.
              </p>

              {/* Quick Search Widget */}
              <form
                onSubmit={handleQuickSearch}
                className="bg-white/95 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-white/20 shadow-2xl text-gray-900 grid grid-cols-1 sm:grid-cols-3 gap-3.5 max-w-2xl"
              >
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                    Golf Course
                  </label>
                  <select
                    value={selectedCourseId}
                    onChange={(e) => setSelectedCourseId(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-fairway/20 focus:border-fairway cursor-pointer text-gray-900"
                  >
                    {tenants.length > 0 ? (
                      tenants.map((t) => (
                        <option key={t.id} value={t.id} className="text-gray-900">
                          {t.name}
                        </option>
                      ))
                    ) : (
                      <option value="">Pine Hollow Golf Club</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                    Play Date
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-fairway/20 focus:border-fairway text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                    Players
                  </label>
                  <select
                    value={selectedPartySize}
                    onChange={(e) => setSelectedPartySize(parseInt(e.target.value))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-fairway/20 focus:border-fairway cursor-pointer text-gray-900"
                  >
                    <option value={1}>1 Player (Single)</option>
                    <option value={2}>2 Players (Pair)</option>
                    <option value={3}>3 Players (Trio)</option>
                    <option value={4}>4 Players (Foursome)</option>
                  </select>
                </div>

                <div className="sm:col-span-3 pt-1 flex flex-col sm:flex-row gap-3">
                  <button
                    type="submit"
                    className="flex-1 py-3 px-6 rounded-xl bg-gold hover:bg-gold/90 text-fairway font-bold text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                  >
                    <span>⛳</span> Search Available Tee Times
                  </button>
                  <Link
                    to="/courses"
                    className="px-5 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold transition-colors flex items-center justify-center"
                  >
                    Browse All Courses
                  </Link>
                </div>
              </form>

              {/* Action Links */}
              <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-white/70">
                <Link
                  to="/onboarding"
                  className="text-sand hover:text-white font-medium flex items-center gap-1.5 transition-colors"
                >
                  <span>🏌️‍♂️</span> Course Owner? Onboard your club in 3 mins &rarr;
                </Link>
                <span>•</span>
                <Link
                  to="/tournaments"
                  className="hover:text-white transition-colors"
                >
                  Browse Tournaments
                </Link>
                <span>•</span>
                <Link
                  to="/range"
                  className="hover:text-white transition-colors"
                >
                  Driving Range Bays
                </Link>
              </div>
            </div>

            {/* Right Live Tee Ticker Preview */}
            <div className="flex justify-center">
              <div className="w-full max-w-md transform hover:scale-[1.01] transition-transform duration-300">
                <TeeTicker courseName={heroCourseName} slots={heroSlots ?? demoSlots} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── METRIC STATS STRIP ────────────────────────────────────────────── */}
      <div className="border-y border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 py-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-bold font-display text-fairway">100% Direct</div>
            <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">Zero Booking Fees</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-bold font-display text-fairway">Real-Time</div>
            <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">Dynamic Tee Sheet</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-bold font-display text-fairway">SMS &amp; Email</div>
            <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">Instant Confirmations</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-bold font-display text-fairway">Open Source</div>
            <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">Self-Hosted or Cloud</div>
          </div>
        </div>
      </div>

      {/* ── FEATURED COURSES & RANGE PREVIEWS ────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 sm:px-10 md:px-14 py-20">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div>
            <div className="text-mono text-xs tracking-widest uppercase text-turf mb-2 font-semibold">
              Explore Venues
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold font-display text-gray-900 tracking-tight">
              Featured Golf Clubs &amp; Ranges
            </h2>
            <p className="text-gray-500 text-sm mt-1 max-w-lg">
              Book championship 18-hole courses or indoor simulator bays with instant online booking.
            </p>
          </div>
          <Link
            to="/courses"
            className="text-xs font-semibold text-turf hover:text-fairway flex items-center gap-1.5 transition-colors self-start md:self-auto"
          >
            View All Courses &amp; Locations &rarr;
          </Link>
        </div>

        {loadingCourses ? (
          <div className="py-12 text-center text-gray-400 font-mono text-xs">Loading course directory...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tenants.map((t, idx) => (
              <div
                key={t.id}
                className="bg-white rounded-2xl border border-[#E4E8E3] overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between p-6 group"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-100">
                        {t.type === "Range" ? "🎯 Driving Range" : "⛳ 18-Hole Course"}
                      </span>
                      <h3 className="text-xl font-bold text-gray-900 mt-2 group-hover:text-fairway transition-colors">
                        {t.name}
                      </h3>
                      {t.address && (
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                          <span>📍</span> {t.address}
                        </p>
                      )}
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-lg shadow-inner">
                      {idx % 2 === 0 ? "🌲" : "⛳"}
                    </div>
                  </div>

                  <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                    {t.description || "Championship golf layout with pristine fairways, fast greens, and state-of-the-art practice facilities."}
                  </p>
                </div>

                <div className="pt-6 mt-6 border-t border-gray-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Green Fees</span>
                    <div className="text-sm font-bold text-gray-900">
                      {t.currencySymbol || "₹"}45 – {t.currencySymbol || "₹"}90
                    </div>
                  </div>
                  <Link
                    to={t.type === "Range" ? `/range?tenantId=${t.id}` : `/booking?tenantId=${t.id}`}
                    className="px-4 py-2 rounded-xl bg-fairway text-white text-xs font-semibold hover:bg-fairway/90 transition-colors shadow-sm"
                  >
                    {t.type === "Range" ? "Reserve Bay" : "Book Tee Time"}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── SCORECARD & DIGITAL EXPERIENCE PREVIEW ───────────────────────── */}
      <div className="bg-white border-y border-gray-200 py-20">
        <div className="max-w-6xl mx-auto px-6 sm:px-10 md:px-14">
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
            <div className="text-mono text-xs tracking-widest uppercase text-turf font-semibold">
              Live Digital Scorecard
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold font-display text-gray-900 tracking-tight">
              A scorecard that feels authentic.
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              Every round renders as an authentic 18-hole grid with birdies circled, bogeys boxed, and automated gross/net differential calculations.
            </p>
          </div>

          <div className="shadow-lg rounded-2xl overflow-hidden border border-[#E4E8E3]">
            <Scorecard
              courseName={heroCourseName}
              date="Aug 28, 2026"
              teeBox="Championship Tees"
              holes={demoHoles}
            />
          </div>

          <div className="grid md:grid-cols-2 gap-8 mt-14">
            {/* Tournament Leaderboard Preview */}
            <div className="bg-[#FAFBF9] rounded-2xl border border-[#E4E8E3] p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-mono text-[10px] tracking-widest uppercase text-turf font-bold">
                    Club Tournaments
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mt-0.5">
                    Live Tournament Leaderboard
                  </h3>
                </div>
                <Link to="/tournaments" className="text-xs text-turf hover:underline font-semibold">
                  View Events &rarr;
                </Link>
              </div>
              <Leaderboard entries={demoLeaderboard} />
            </div>

            {/* Handicap & Scoring Stats Trend */}
            <div className="bg-[#FAFBF9] rounded-2xl border border-[#E4E8E3] p-6 space-y-4">
              <div>
                <div className="text-mono text-[10px] tracking-widest uppercase text-turf font-bold">
                  Golfer Performance
                </div>
                <h3 className="text-lg font-bold text-gray-900 mt-0.5">
                  Handicap Index &amp; Scoring Trend
                </h3>
              </div>

              <div className="bg-white rounded-xl border border-[#E4E8E3] p-5 shadow-sm space-y-4">
                <div className="flex items-baseline justify-between">
                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-4xl font-bold text-fairway">12.4</span>
                    <span className="text-xs text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">
                      ↓ 1.8 Index This Season
                    </span>
                  </div>
                  <span className="text-xs text-gray-400 font-mono">Last 10 Rounds</span>
                </div>

                <div className="flex items-end gap-2 h-20 pt-2">
                  {[72, 84, 65, 58, 48, 42, 38, 35].map((h, i) => (
                    <div
                      key={i}
                      className={`flex-1 rounded-t-md transition-all duration-300 hover:opacity-80 ${
                        i < 2 ? "bg-sand/60" : i < 5 ? "bg-emerald-300" : "bg-fairway"
                      }`}
                      style={{ height: `${h}%` }}
                      title={`Round ${i + 1}`}
                    />
                  ))}
                </div>
                <div className="flex justify-between text-[10px] text-gray-400 font-mono pt-1">
                  <span>Round 1 (88)</span>
                  <span>Round 8 (76)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2-COLUMN FEATURE COMPARISON (GOLFERS VS OWNERS) ──────────────── */}
      <div className="max-w-7xl mx-auto px-6 sm:px-10 md:px-14 py-24 space-y-16">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <div className="text-mono text-xs tracking-widest uppercase text-turf font-semibold">
            All-In-One Platform
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold font-display text-gray-900 tracking-tight">
            Built for players. Engineered for courses.
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* For Golfers Card */}
          <div className="bg-white rounded-2xl border border-[#E4E8E3] p-8 shadow-sm space-y-6">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-2xl">
              🏌️‍♂️
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900">For Golfers</h3>
              <p className="text-xs text-gray-500 mt-1">
                A seamless booking and game tracking experience across all participating clubs.
              </p>
            </div>

            <ul className="space-y-3.5 text-xs text-gray-700">
              <li className="flex items-start gap-3">
                <span className="text-emerald-600 font-bold">✓</span>
                <span><strong>1-Click Tee Time Booking:</strong> Choose party sizes (1-4) with instant confirmation receipts.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-emerald-600 font-bold">✓</span>
                <span><strong>SMS &amp; Email Alerts:</strong> Receive gate codes, dress code rules, and weather updates on your phone.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-emerald-600 font-bold">✓</span>
                <span><strong>Automatic Waitlist Promotion:</strong> Get notified instantly when full slots open up.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-emerald-600 font-bold">✓</span>
                <span><strong>USGA Handicap Tracking:</strong> Real-time handicap differential calculation with round history.</span>
              </li>
            </ul>

            <Link
              to="/courses"
              className="inline-block w-full text-center py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold transition-colors"
            >
              Explore Available Courses
            </Link>
          </div>

          {/* For Course Owners Card */}
          <div className="bg-white rounded-2xl border border-[#E4E8E3] p-8 shadow-sm space-y-6">
            <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-2xl">
              ⛳
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900">For Course Owners &amp; Admins</h3>
              <p className="text-xs text-gray-500 mt-1">
                Complete control over your tee sheet, pricing, tournaments, and member CRM.
              </p>
            </div>

            <ul className="space-y-3.5 text-xs text-gray-700">
              <li className="flex items-start gap-3">
                <span className="text-amber-600 font-bold">✓</span>
                <span><strong>Real-Time Dynamic Tee Sheet:</strong> Block maintenance slots, manage pairings, and view walk-ins.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-amber-600 font-bold">✓</span>
                <span><strong>Custom Email &amp; SMS Dispatch:</strong> Connect your course Brevo, Mailgun, or SMTP server.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-amber-600 font-bold">✓</span>
                <span><strong>Direct Stripe Connect Payouts:</strong> Automated player charging with 0% platform lock-in.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-amber-600 font-bold">✓</span>
                <span><strong>Cross-Course CRM Directory:</strong> Track visiting golfers, lifetime spend, and member records.</span>
              </li>
            </ul>

            <Link
              to="/onboarding"
              className="inline-block w-full text-center py-2.5 rounded-xl bg-fairway text-white text-xs font-semibold hover:bg-fairway/90 transition-colors shadow-sm"
            >
              Onboard Your Golf Course
            </Link>
          </div>
        </div>
      </div>

      {/* ── COURSE OWNER CTA BANNER ──────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-fairway to-turf text-white py-16 px-6 sm:px-10 text-center relative overflow-hidden">
        <div className="max-w-3xl mx-auto space-y-6 relative z-10">
          <span className="px-3.5 py-1.5 rounded-full bg-white/10 text-sand border border-white/15 text-xs font-mono uppercase tracking-wider">
            Ready to upgrade your clubhouse?
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold font-display tracking-tight text-white">
            Start accepting online tee times today.
          </h2>
          <p className="text-sm text-white/80 max-w-xl mx-auto leading-relaxed">
            Create your custom branded golf course portal in under 3 minutes. No complex hardware required.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/onboarding"
              className="px-8 py-3.5 rounded-xl bg-gold text-fairway font-bold text-sm hover:bg-gold/90 transition-all shadow-lg hover:shadow-xl"
            >
              Get Started Free &rarr;
            </Link>
            <Link
              to="/login"
              className="px-6 py-3.5 rounded-xl border border-white/30 text-white font-semibold text-sm hover:bg-white/10 transition-colors"
            >
              Clubhouse Admin Log In
            </Link>
          </div>
        </div>
      </div>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer className="bg-[#08241B] text-white/70 py-14 px-6 sm:px-10 md:px-14 border-t border-white/10 text-xs">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="space-y-3">
            <div className="font-display text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span>⛳</span> OpenGolf
            </div>
            <p className="text-white/60 leading-relaxed">
              Open-source, self-hosted and cloud-ready course operating system. Built for players, engineered for courses.
            </p>
          </div>

          <div className="space-y-2.5">
            <div className="font-bold text-white text-xs uppercase tracking-wider">Explore</div>
            <ul className="space-y-2">
              <li><Link to="/courses" className="hover:text-white transition-colors">Find a Golf Course</Link></li>
              <li><Link to="/range" className="hover:text-white transition-colors">Driving Range Bays</Link></li>
              <li><Link to="/tournaments" className="hover:text-white transition-colors">Tournaments &amp; Events</Link></li>
            </ul>
          </div>

          <div className="space-y-2.5">
            <div className="font-bold text-white text-xs uppercase tracking-wider">Golfer Portal</div>
            <ul className="space-y-2">
              <li><Link to="/bookings" className="hover:text-white transition-colors">My Tee Time Bookings</Link></li>
              <li><Link to="/rounds" className="hover:text-white transition-colors">Scorecard History</Link></li>
              <li><Link to="/stats" className="hover:text-white transition-colors">Handicap Index &amp; Stats</Link></li>
            </ul>
          </div>

          <div className="space-y-2.5">
            <div className="font-bold text-white text-xs uppercase tracking-wider">Course Owners</div>
            <ul className="space-y-2">
              <li><Link to="/onboarding" className="hover:text-white transition-colors">Onboard a New Course</Link></li>
              <li><Link to="/login" className="hover:text-white transition-colors">Admin Dashboard Login</Link></li>
              <li><Link to="/forgot-password" className="hover:text-white transition-colors">Password Recovery</Link></li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto mt-12 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-white/40">
          <div>&copy; {new Date().getFullYear()} OpenGolf Platform. All rights reserved.</div>
          <div className="font-mono text-[11px]">RFC-Compliant SMTP · HttpOnly Security · Stripe Connect</div>
        </div>
      </footer>
    </div>
  );
}
