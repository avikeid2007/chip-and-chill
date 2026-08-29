import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import NavBar from "../components/NavBar";
import { courseApi, type CourseHole, type Tenant, type CourseWeather } from "../api/course";
import { API_BASE } from "../api/client";

export default function CourseProfile() {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<"overview" | "scorecard" | "holes" | "amenities">("overview");
  const [selectedTee, setSelectedTee] = useState<"white" | "black" | "blue" | "gold" | "red">("white");
  const [selectedHoleNum, setSelectedHoleNum] = useState<number>(1);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [holes, setHoles] = useState<CourseHole[]>([]);
  const [weather, setWeather] = useState<CourseWeather | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      courseApi.getTenant(id),
      courseApi.getHoles(id),
      courseApi.getWeather(id).catch(() => null),
    ])
      .then(([t, h, w]) => {
        setTenant(t);
        setHoles(h);
        setWeather(w);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load course details."))
      .finally(() => setLoading(false));
  }, [id]);

  const totalPar = holes.reduce((s, h) => s + h.par, 0) || 72;
  const totalWhiteYardage = holes.reduce((s, h) => s + (h.yardageWhite || 0), 0);
  const totalBlackYardage = holes.reduce((s, h) => s + (h.yardageBlack || h.yardageWhite || 0), 0);
  const totalBlueYardage = holes.reduce((s, h) => s + (h.yardageBlue || h.yardageWhite || 0), 0);
  const totalGoldYardage = holes.reduce((s, h) => s + (h.yardageGold || h.yardageWhite || 0), 0);
  const totalRedYardage = holes.reduce((s, h) => s + (h.yardageRed || h.yardageWhite || 0), 0);

  const currentYardage =
    selectedTee === "black"
      ? totalBlackYardage
      : selectedTee === "blue"
      ? totalBlueYardage
      : selectedTee === "gold"
      ? totalGoldYardage
      : selectedTee === "red"
      ? totalRedYardage
      : totalWhiteYardage;

  const currentHole = holes.find((h) => h.holeNumber === selectedHoleNum) || {
    holeNumber: selectedHoleNum,
    par: 4,
    handicapIndex: selectedHoleNum,
    yardageWhite: 385,
    yardageBlack: 420,
    yardageBlue: 400,
    yardageGold: 360,
    yardageRed: 320,
    notes: "Straightforward tee shot favor center-left of the fairway. Green slopes gently back to front.",
  };

  const amenitiesList = tenant?.amenities
    ? tenant.amenities.split(",").map((a) => a.trim()).filter(Boolean)
    : [
        "Driving Range",
        "Putting Green",
        "Pro Shop",
        "GPS Carts",
        "Clubhouse Restaurant",
        "Locker Rooms",
        "PGA Lessons",
      ];

  if (error) {
    return (
      <div className="min-h-screen bg-[#F7F9F6]">
        <div className="bg-gradient-to-br from-fairway to-turf text-white"><NavBar /></div>
        <div className="max-w-3xl mx-auto px-8 py-16 text-center">
          <div className="text-3xl mb-2">⛳</div>
          <p className="text-sm text-red-600 font-semibold">{error}</p>
          <Link to="/courses" className="mt-4 inline-block text-xs font-bold text-fairway underline">← Back to Course Directory</Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F9F6]">
        <div className="bg-gradient-to-br from-fairway to-turf text-white"><NavBar /></div>
        <div className="max-w-6xl mx-auto px-6 py-12 space-y-6">
          <div className="h-64 bg-white rounded-3xl border border-sand-dark animate-pulse" />
          <div className="h-96 bg-white rounded-3xl border border-sand-dark animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F9F6] text-gray-900 font-sans flex flex-col">
      {/* Navigation */}
      <div className="bg-gradient-to-br from-fairway to-turf text-white">
        <NavBar />
      </div>

      {/* Hero Header Banner */}
      <div className="relative bg-fairway text-white overflow-hidden">
        {tenant?.coverImageUrl ? (
          <div className="absolute inset-0 z-0">
            <img
              src={tenant.coverImageUrl.startsWith("http") ? tenant.coverImageUrl : `${API_BASE}${tenant.coverImageUrl}`}
              alt={tenant.name}
              className="w-full h-full object-cover opacity-30"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-fairway via-fairway/80 to-transparent" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(#2E7D32_1px,transparent_1px)] [background-size:16px_16px] opacity-10" />
        )}

        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 pb-10 relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="flex items-start gap-5">
              {tenant?.logoUrl ? (
                <img
                  src={tenant.logoUrl.startsWith("http") ? tenant.logoUrl : `${API_BASE}${tenant.logoUrl}`}
                  alt={`${tenant.name} logo`}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl object-contain bg-white/10 p-2 border-2 border-white/20 shadow-xl flex-shrink-0 backdrop-blur-sm"
                />
              ) : (
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-white/10 border-2 border-white/20 flex items-center justify-center text-4xl shadow-xl flex-shrink-0 backdrop-blur-sm">
                  ⛳
                </div>
              )}

              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="px-3 py-0.5 rounded-full bg-gold/20 text-gold border border-gold/30 text-xs font-bold uppercase tracking-wider">
                    {tenant?.courseType || "Championship Course"}
                  </span>
                  {tenant?.yearBuilt && (
                    <span className="text-xs text-white/70 font-mono">Est. {tenant.yearBuilt}</span>
                  )}
                  {tenant?.architect && (
                    <span className="text-xs text-white/70 font-medium">· Designed by {tenant.architect}</span>
                  )}
                </div>

                <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white mb-2">
                  {tenant?.name || "Golf Club"}
                </h1>

                <p className="text-sm text-white/80 max-w-2xl">
                  {tenant?.description || "Premier 18-hole championship golf course and driving range facility."}
                </p>

                <p className="text-xs text-white/60 mt-2 flex items-center gap-1.5">
                  <span>📍</span> {tenant?.address || "Championship Links Drive"}
                </p>
              </div>
            </div>

            {/* Quick Action CTAs */}
            <div className="flex items-center gap-3 flex-wrap">
              <Link
                to={`/booking?tenantId=${id}`}
                className="px-6 py-3.5 rounded-2xl bg-gold text-fairway font-extrabold text-sm hover:bg-gold/90 transition-all shadow-lg flex items-center gap-2"
              >
                <span>⛳</span> Book a Tee Time
              </Link>
              <Link
                to={`/range-booking?tenantId=${id}`}
                className="px-5 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm border border-white/20 transition-all backdrop-blur-sm flex items-center gap-2"
              >
                <span>🎯</span> Range Bays
              </Link>
            </div>
          </div>

          {/* Quick Course Spec Ribbons */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 mt-8 pt-6 border-t border-white/15">
            <div className="bg-white/10 backdrop-blur-sm p-3 rounded-2xl border border-white/10 text-center">
              <span className="text-[10px] uppercase font-bold text-white/60 block">Holes</span>
              <span className="text-xl font-black text-white font-mono">{holes.length > 0 ? holes.length : 18} Holes</span>
            </div>
            <div className="bg-white/10 backdrop-blur-sm p-3 rounded-2xl border border-white/10 text-center">
              <span className="text-[10px] uppercase font-bold text-white/60 block">Par</span>
              <span className="text-xl font-black text-white font-mono">Par {totalPar}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-sm p-3 rounded-2xl border border-white/10 text-center">
              <span className="text-[10px] uppercase font-bold text-white/60 block">White Tees</span>
              <span className="text-xl font-black text-white font-mono">{totalWhiteYardage.toLocaleString()} yds</span>
            </div>
            <div className="bg-white/10 backdrop-blur-sm p-3 rounded-2xl border border-white/10 text-center">
              <span className="text-[10px] uppercase font-bold text-white/60 block">Rating / Slope</span>
              <span className="text-xl font-black text-gold font-mono">
                {tenant?.courseRating ? tenant.courseRating.toFixed(1) : "72.4"} / {tenant?.slopeRating || 132}
              </span>
            </div>
            <div className="bg-white/10 backdrop-blur-sm p-3 rounded-2xl border border-white/10 text-center">
              <span className="text-[10px] uppercase font-bold text-white/60 block">Greens</span>
              <span className="text-xs font-bold text-white truncate block mt-1">{tenant?.greensGrass || "Bentgrass"}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-sm p-3 rounded-2xl border border-white/10 text-center">
              <span className="text-[10px] uppercase font-bold text-white/60 block">Fairways</span>
              <span className="text-xs font-bold text-white truncate block mt-1">{tenant?.fairwaysGrass || "Bermuda"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Body */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 w-full flex-1 space-y-8">
        {/* Live Weather & Wind Conditions Card */}
        {weather && (
          <div className="bg-white rounded-3xl border border-sand-dark p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center text-2xl flex-shrink-0">
                🌤️
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-turf">Live Course Weather</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">
                    {weather.playabilityRating}
                  </span>
                </div>
                <h3 className="text-xl font-extrabold text-gray-900 mt-0.5">
                  {weather.temperatureC}°C / {weather.temperatureF}°F · {weather.condition}
                </h3>
                <p className="text-xs text-gray-500">{weather.description}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 sm:gap-6 border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6 w-full md:w-auto justify-around">
              <div className="text-center">
                <span className="text-[10px] font-bold uppercase text-gray-400 block">Wind Speed</span>
                <span className="text-base font-bold text-fairway font-mono">{weather.windSpeedMph} mph {weather.windDirection}</span>
              </div>
              <div className="text-center">
                <span className="text-[10px] font-bold uppercase text-gray-400 block">Humidity</span>
                <span className="text-base font-bold text-fairway font-mono">{weather.humidity}%</span>
              </div>
              <div className="text-center">
                <span className="text-[10px] font-bold uppercase text-gray-400 block">Feels Like</span>
                <span className="text-base font-bold text-fairway font-mono">{weather.feelsLikeC}°C</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-gray-200 pb-3 overflow-x-auto">
          {[
            { key: "overview", label: "🏛️ Overview & Amenities" },
            { key: "scorecard", label: "📊 18-Hole Scorecard Matrix" },
            { key: "holes", label: "🗺️ Hole-by-Hole Flyover & Tips" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as any)}
              className={`px-5 py-2.5 rounded-2xl text-xs font-extrabold transition-all whitespace-nowrap ${
                tab === t.key
                  ? "bg-fairway text-white shadow-md"
                  : "bg-white border border-sand-dark text-gray-700 hover:bg-gray-50"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab 1: Overview & Amenities */}
        {tab === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-6">
              {/* Club Architecture Card */}
              <div className="bg-white rounded-3xl border border-sand-dark p-6 sm:p-8 shadow-sm space-y-4">
                <h3 className="text-lg font-bold text-fairway pb-3 border-b border-gray-100">
                  About the Championship Course
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                  {tenant?.description ||
                    "Designed to challenge players of all skill levels while providing magnificent panoramic views across fairways and greens. Featuring strategic bunkers, pristine water hazards, and lightning-fast greens."}
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                  <div className="p-3 rounded-2xl bg-gray-50 border border-gray-200/80">
                    <span className="text-[10px] font-bold uppercase text-gray-400 block">Course Designer</span>
                    <span className="text-xs font-bold text-gray-900">{tenant?.architect || "Classic Design"}</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-gray-50 border border-gray-200/80">
                    <span className="text-[10px] font-bold uppercase text-gray-400 block">Established</span>
                    <span className="text-xs font-bold text-gray-900">{tenant?.yearBuilt ? `Year ${tenant.yearBuilt}` : "Modern Links"}</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-gray-50 border border-gray-200/80">
                    <span className="text-[10px] font-bold uppercase text-gray-400 block">Layout Style</span>
                    <span className="text-xs font-bold text-gray-900">{tenant?.courseType || "Championship"}</span>
                  </div>
                </div>
              </div>

              {/* Amenities Grid */}
              <div className="bg-white rounded-3xl border border-sand-dark p-6 sm:p-8 shadow-sm space-y-4">
                <h3 className="text-lg font-bold text-fairway pb-3 border-b border-gray-100">
                  Clubhouse Amenities & Facilities
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {amenitiesList.map((amenity, i) => (
                    <div
                      key={i}
                      className="p-3.5 rounded-2xl bg-[#F8FAF7] border border-gray-200/80 flex items-center gap-2.5 text-xs font-bold text-gray-800"
                    >
                      <span className="w-2 h-2 rounded-full bg-turf" />
                      <span>{amenity}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Policies */}
              <div className="bg-white rounded-3xl border border-sand-dark p-6 sm:p-8 shadow-sm space-y-4">
                <h3 className="text-lg font-bold text-fairway pb-3 border-b border-gray-100">
                  Course Policies & Dress Code
                </h3>
                <div className="space-y-3 text-xs text-gray-700">
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-fairway min-w-[90px]">👔 Dress Code:</span>
                    <span>{tenant?.dressCode || "Collared shirts and tailored shorts/trousers required. Soft spikes only."}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-fairway min-w-[90px]">👟 Spike Policy:</span>
                    <span>{tenant?.spikePolicy || "Non-metal / soft spikes only."}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-fairway min-w-[90px]">⏱️ Pace of Play:</span>
                    <span>Target pace of 4 hours and 15 minutes for 18 holes.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar Contact & Booking Box */}
            <div className="space-y-6">
              <div className="bg-white rounded-3xl border-2 border-fairway p-6 sm:p-8 shadow-lg space-y-6">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-turf block">Reserve Tee Time</span>
                  <h4 className="text-2xl font-black text-fairway font-display mt-0.5">Ready to Play?</h4>
                  <p className="text-xs text-gray-500 mt-1">
                    Book online tee times or driving range bays with instant confirmation.
                  </p>
                </div>

                <div className="space-y-2">
                  <Link
                    to={`/booking?tenantId=${id}`}
                    className="w-full py-3.5 bg-fairway text-white text-xs font-black rounded-2xl hover:bg-fairway/90 transition-all text-center block shadow"
                  >
                    ⛳ Book a Tee Time Online →
                  </Link>
                  <Link
                    to={`/range-booking?tenantId=${id}`}
                    className="w-full py-3.5 bg-gray-100 text-gray-800 text-xs font-bold rounded-2xl hover:bg-gray-200 transition-all text-center block"
                  >
                    🎯 Book Driving Range Bay →
                  </Link>
                </div>

                <div className="pt-4 border-t border-gray-100 space-y-2 text-xs text-gray-600">
                  {tenant?.phone && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Pro Shop:</span>
                      <a href={`tel:${tenant.phone}`} className="font-bold text-fairway hover:underline">{tenant.phone}</a>
                    </div>
                  )}
                  {tenant?.email && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Email:</span>
                      <a href={`mailto:${tenant.email}`} className="font-bold text-fairway hover:underline">{tenant.email}</a>
                    </div>
                  )}
                  {tenant?.website && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Website:</span>
                      <a href={tenant.website} target="_blank" rel="noreferrer" className="font-bold text-turf hover:underline">Visit Site ↗</a>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-400">Timezone:</span>
                    <span className="font-bold text-gray-700">{tenant?.timezone || "UTC"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: 18-Hole Scorecard Matrix */}
        {tab === "scorecard" && (
          <div className="bg-white rounded-3xl border border-sand-dark p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-bold text-fairway">18-Hole Championship Scorecard</h3>
                <p className="text-xs text-gray-500">Official stroke index, pars, and full tee yardages.</p>
              </div>

              {/* Tee Box Selector */}
              <div className="flex items-center gap-1.5 overflow-x-auto">
                <span className="text-xs font-bold text-gray-400 uppercase mr-1">Tee:</span>
                {[
                  { key: "black", label: "⚫ Black (Championship)", yds: totalBlackYardage },
                  { key: "blue", label: "🔵 Blue (Tournament)", yds: totalBlueYardage },
                  { key: "white", label: "⚪ White (Member)", yds: totalWhiteYardage },
                  { key: "gold", label: "🟡 Gold (Senior)", yds: totalGoldYardage },
                  { key: "red", label: "🔴 Red (Forward)", yds: totalRedYardage },
                ].map((tee) => (
                  <button
                    key={tee.key}
                    type="button"
                    onClick={() => setSelectedTee(tee.key as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                      selectedTee === tee.key
                        ? "bg-fairway text-white shadow-sm"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {tee.label} ({tee.yds > 0 ? tee.yds.toLocaleString() : "—"} yds)
                  </button>
                ))}
              </div>
            </div>

            {/* Scorecard Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-center text-xs border-collapse">
                <thead>
                  <tr className="bg-fairway text-white text-[11px] font-bold">
                    <th className="py-2.5 px-3 text-left rounded-l-xl">Hole</th>
                    {Array.from({ length: 9 }).map((_, i) => (
                      <th key={i + 1} className="py-2.5 px-2 font-mono">{i + 1}</th>
                    ))}
                    <th className="py-2.5 px-3 bg-fairway/80 font-mono">OUT</th>
                    {Array.from({ length: 9 }).map((_, i) => (
                      <th key={i + 10} className="py-2.5 px-2 font-mono">{i + 10}</th>
                    ))}
                    <th className="py-2.5 px-3 bg-fairway/80 font-mono">IN</th>
                    <th className="py-2.5 px-3 bg-gold text-fairway font-black rounded-r-xl font-mono">TOT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {/* Yardage Row */}
                  <tr className="bg-[#FAFBF9] font-mono font-bold text-gray-800">
                    <td className="py-3 px-3 text-left font-bold uppercase text-[10px] text-gray-500">
                      {selectedTee.toUpperCase()} (YDS)
                    </td>
                    {Array.from({ length: 9 }).map((_, i) => {
                      const h = holes.find((x) => x.holeNumber === i + 1);
                      const yds = selectedTee === "black" ? (h?.yardageBlack || h?.yardageWhite || 410)
                        : selectedTee === "blue" ? (h?.yardageBlue || h?.yardageWhite || 395)
                        : selectedTee === "gold" ? (h?.yardageGold || h?.yardageWhite || 360)
                        : selectedTee === "red" ? (h?.yardageRed || h?.yardageWhite || 320)
                        : (h?.yardageWhite || 380);
                      return <td key={i + 1} className="py-3 px-2">{yds}</td>;
                    })}
                    <td className="py-3 px-3 bg-gray-100 font-black">
                      {holes.slice(0, 9).reduce((s, h) => s + (selectedTee === "black" ? (h.yardageBlack || h.yardageWhite) : h.yardageWhite), 0) || Math.round(currentYardage / 2)}
                    </td>
                    {Array.from({ length: 9 }).map((_, i) => {
                      const h = holes.find((x) => x.holeNumber === i + 10);
                      const yds = selectedTee === "black" ? (h?.yardageBlack || h?.yardageWhite || 415)
                        : selectedTee === "blue" ? (h?.yardageBlue || h?.yardageWhite || 390)
                        : selectedTee === "gold" ? (h?.yardageGold || h?.yardageWhite || 365)
                        : selectedTee === "red" ? (h?.yardageRed || h?.yardageWhite || 330)
                        : (h?.yardageWhite || 385);
                      return <td key={i + 10} className="py-3 px-2">{yds}</td>;
                    })}
                    <td className="py-3 px-3 bg-gray-100 font-black">
                      {holes.slice(9, 18).reduce((s, h) => s + (selectedTee === "black" ? (h.yardageBlack || h.yardageWhite) : h.yardageWhite), 0) || Math.round(currentYardage / 2)}
                    </td>
                    <td className="py-3 px-3 bg-gold/20 font-black text-fairway font-mono">
                      {currentYardage > 0 ? currentYardage.toLocaleString() : "7,050"}
                    </td>
                  </tr>

                  {/* Par Row */}
                  <tr className="font-mono font-bold text-gray-900">
                    <td className="py-3 px-3 text-left font-bold uppercase text-[10px] text-gray-500">PAR</td>
                    {Array.from({ length: 9 }).map((_, i) => {
                      const h = holes.find((x) => x.holeNumber === i + 1);
                      return <td key={i + 1} className="py-3 px-2 text-turf">{h?.par || 4}</td>;
                    })}
                    <td className="py-3 px-3 bg-gray-100 font-black text-turf">
                      {holes.slice(0, 9).reduce((s, h) => s + h.par, 0) || 36}
                    </td>
                    {Array.from({ length: 9 }).map((_, i) => {
                      const h = holes.find((x) => x.holeNumber === i + 10);
                      return <td key={i + 10} className="py-3 px-2 text-turf">{h?.par || 4}</td>;
                    })}
                    <td className="py-3 px-3 bg-gray-100 font-black text-turf">
                      {holes.slice(9, 18).reduce((s, h) => s + h.par, 0) || 36}
                    </td>
                    <td className="py-3 px-3 bg-gold/20 font-black text-fairway">{totalPar}</td>
                  </tr>

                  {/* Stroke Index / Handicap Row */}
                  <tr className="bg-[#FAFBF9] font-mono text-gray-500 text-[11px]">
                    <td className="py-2.5 px-3 text-left font-bold uppercase text-[10px] text-gray-400">STROKE INDEX</td>
                    {Array.from({ length: 9 }).map((_, i) => {
                      const h = holes.find((x) => x.holeNumber === i + 1);
                      return <td key={i + 1} className="py-2.5 px-2">{h?.handicapIndex || (i * 2 + 1)}</td>;
                    })}
                    <td className="py-2.5 px-3 bg-gray-100 font-bold">—</td>
                    {Array.from({ length: 9 }).map((_, i) => {
                      const h = holes.find((x) => x.holeNumber === i + 10);
                      return <td key={i + 10} className="py-2.5 px-2">{h?.handicapIndex || (i * 2 + 2)}</td>;
                    })}
                    <td className="py-2.5 px-3 bg-gray-100 font-bold">—</td>
                    <td className="py-2.5 px-3 bg-gold/20 font-bold">—</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Hole-by-Hole Flyover & Tips */}
        {tab === "holes" && (
          <div className="space-y-6">
            {/* 1-18 Hole Strip */}
            <div className="grid grid-cols-6 sm:grid-cols-9 md:grid-cols-18 gap-1.5">
              {Array.from({ length: 18 }).map((_, i) => {
                const num = i + 1;
                const isSelected = selectedHoleNum === num;
                return (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setSelectedHoleNum(num)}
                    className={`py-2 rounded-xl text-xs font-black transition-all border ${
                      isSelected
                        ? "bg-fairway text-white border-fairway shadow-md scale-105"
                        : "bg-white border-gray-200 text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {num}
                  </button>
                );
              })}
            </div>

            {/* Selected Hole Details Card */}
            <div className="bg-white rounded-3xl border border-sand-dark p-6 sm:p-8 shadow-sm space-y-6 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <span className="w-12 h-12 rounded-2xl bg-fairway text-white text-xl font-black flex items-center justify-center font-mono shadow">
                    #{currentHole.holeNumber}
                  </span>
                  <div>
                    <h3 className="text-2xl font-black text-fairway font-display">Hole #{currentHole.holeNumber}</h3>
                    <p className="text-xs text-gray-500">Par {currentHole.par} · Stroke Index {currentHole.handicapIndex || currentHole.holeNumber}</p>
                  </div>
                </div>

                {/* 5 Tee Yardages Box */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="px-3 py-1.5 rounded-xl bg-gray-900 text-white text-xs font-bold font-mono">
                    ⚫ {currentHole.yardageBlack || currentHole.yardageWhite + 30} yds
                  </div>
                  <div className="px-3 py-1.5 rounded-xl bg-blue-700 text-white text-xs font-bold font-mono">
                    🔵 {currentHole.yardageBlue || currentHole.yardageWhite + 15} yds
                  </div>
                  <div className="px-3 py-1.5 rounded-xl bg-gray-100 border border-gray-300 text-gray-900 text-xs font-bold font-mono">
                    ⚪ {currentHole.yardageWhite} yds
                  </div>
                  <div className="px-3 py-1.5 rounded-xl bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold font-mono">
                    🟡 {currentHole.yardageGold || currentHole.yardageWhite - 25} yds
                  </div>
                  <div className="px-3 py-1.5 rounded-xl bg-red-100 border border-red-300 text-red-900 text-xs font-bold font-mono">
                    🔴 {currentHole.yardageRed || currentHole.yardageWhite - 55} yds
                  </div>
                </div>
              </div>

              {/* Hole Strategy & Pro Tips */}
              <div className="p-5 rounded-2xl bg-[#F8FAF7] border border-gray-200/80 space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-turf flex items-center gap-1">
                  <span>💡</span> Head Pro Strategy & Layout Tip
                </span>
                <p className="text-xs sm:text-sm text-gray-700 leading-relaxed font-medium">
                  {currentHole.notes ||
                    "Carefully manage tee shot distance to avoid fairway bunkers. Approach shot plays slightly uphill with a tiered green sloping back to front."}
                </p>
              </div>

              {/* Prev / Next Hole Navigation */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  disabled={selectedHoleNum === 1}
                  onClick={() => setSelectedHoleNum((prev) => Math.max(1, prev - 1))}
                  className="px-4 py-2 rounded-xl border border-sand text-xs font-bold text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  ← Previous Hole ({selectedHoleNum > 1 ? selectedHoleNum - 1 : ""})
                </button>
                <button
                  type="button"
                  disabled={selectedHoleNum === 18}
                  onClick={() => setSelectedHoleNum((prev) => Math.min(18, prev + 1))}
                  className="px-4 py-2 rounded-xl bg-fairway text-white text-xs font-bold hover:bg-fairway/90 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Next Hole ({selectedHoleNum < 18 ? selectedHoleNum + 1 : ""}) →
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
