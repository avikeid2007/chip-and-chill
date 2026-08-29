import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import NavBar from "../components/NavBar";
import { courseApi, type Tenant } from "../api/course";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export default function CourseBrowse() {
  const [courses, setCourses] = useState<Tenant[]>([]);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "course" | "range">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const timeout = setTimeout(() => {
      courseApi
        .list(search || undefined)
        .then(setCourses)
        .catch((err) => setError(err instanceof Error ? err.message : "Failed to load courses."))
        .finally(() => setLoading(false));
    }, 200);
    return () => clearTimeout(timeout);
  }, [search]);

  const filteredCourses = courses.filter((c) => {
    if (filterType === "course") return c.type === "Course";
    if (filterType === "range") return c.type === "Range";
    return true;
  });

  return (
    <div className="min-h-screen bg-[#F7F9F6] text-gray-900 font-sans flex flex-col">
      <div className="bg-gradient-to-br from-fairway to-turf text-white">
        <NavBar />
      </div>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 w-full flex-1 space-y-8">
        {/* Header Title */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-turf font-bold mb-1">
              National Golf & Range Directory
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-fairway">
              Explore Championship Courses & Facilities
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 mt-1 max-w-xl">
              Discover premier 18-hole championship layouts, resort destinations, and high-tech TrackMan driving ranges.
            </p>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white rounded-3xl border border-sand-dark p-4 sm:p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="w-full sm:w-96 relative">
            <input
              type="text"
              placeholder="Search courses by name, city, or architect..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-gray-200 text-xs font-semibold text-gray-900 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-fairway transition-all"
            />
            <span className="absolute left-3.5 top-3 text-xs text-gray-400">🔍</span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
            {[
              { id: "all", label: `All Facilities (${courses.length})` },
              { id: "course", label: "⛳ 18-Hole Courses" },
              { id: "range", label: "🎯 Driving Ranges" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterType(tab.id as any)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  filterType === tab.id
                    ? "bg-fairway text-white shadow-sm"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold">
            ⚠️ {error}
          </div>
        )}

        {/* Course Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-3xl border border-sand-dark h-80 animate-pulse" />
            ))
          ) : filteredCourses.length === 0 ? (
            <div className="col-span-full bg-white rounded-3xl border border-dashed border-gray-200 p-16 text-center space-y-3">
              <div className="text-4xl">⛳</div>
              <h3 className="text-base font-bold text-gray-900">No golf facilities found</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                No active golf courses or driving ranges match your query. Try clearing your search.
              </p>
              <button
                type="button"
                onClick={() => setSearch("")}
                className="px-4 py-2 bg-fairway text-white text-xs font-bold rounded-xl"
              >
                Clear Search
              </button>
            </div>
          ) : (
            filteredCourses.map((c) => {
              const amenities = c.amenities
                ? c.amenities.split(",").map((a) => a.trim()).slice(0, 3)
                : ["Range", "Pro Shop", "Carts"];

              return (
                <div
                  key={c.id}
                  className="bg-white rounded-3xl border border-sand-dark shadow-sm hover:shadow-xl hover:border-turf transition-all flex flex-col overflow-hidden group"
                >
                  {/* Top Cover Thumbnail or Brand Header */}
                  <div className="relative h-44 bg-fairway overflow-hidden flex items-center justify-center">
                    {c.coverImageUrl ? (
                      <img
                        src={c.coverImageUrl.startsWith("http") ? c.coverImageUrl : `${API_BASE}${c.coverImageUrl}`}
                        alt={c.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-80"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-fairway to-turf flex items-center justify-center opacity-90">
                        <span className="text-5xl">⛳</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                    {/* Logo Overlay */}
                    {c.logoUrl && (
                      <img
                        src={c.logoUrl.startsWith("http") ? c.logoUrl : `${API_BASE}${c.logoUrl}`}
                        alt={`${c.name} logo`}
                        className="absolute bottom-3 left-4 w-12 h-12 rounded-2xl object-contain bg-white/90 p-1.5 shadow-md border border-white/20"
                      />
                    )}

                    {/* Type Badge */}
                    <div className="absolute top-3 right-3">
                      <span className="px-3 py-1 rounded-full bg-black/60 text-white border border-white/20 text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm">
                        {c.type === "Range" ? "🎯 Driving Range" : "⛳ 18-Hole Course"}
                      </span>
                    </div>
                  </div>

                  {/* Body Info */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-extrabold text-turf uppercase tracking-wider">
                          {c.courseType || "Championship Links"}
                        </span>
                        {c.courseRating && c.slopeRating && (
                          <span className="text-[10px] font-mono text-gray-500 font-bold">
                            · {c.courseRating.toFixed(1)} / {c.slopeRating}
                          </span>
                        )}
                      </div>

                      <h3 className="text-xl font-extrabold text-gray-900 group-hover:text-fairway transition-colors">
                        {c.name}
                      </h3>

                      <p className="text-xs text-gray-500 line-clamp-1">
                        📍 {c.address || "Monterey, California"}
                      </p>

                      {c.description && (
                        <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed pt-1">
                          {c.description}
                        </p>
                      )}
                    </div>

                    {/* Amenities Tags */}
                    <div className="pt-3 border-t border-gray-100 flex items-center gap-1.5 flex-wrap">
                      {amenities.map((a, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-lg bg-gray-100 text-gray-600 text-[10px] font-bold"
                        >
                          {a}
                        </span>
                      ))}
                      {c.architect && (
                        <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 text-[10px] font-bold">
                          Arch: {c.architect}
                        </span>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <Link
                        to={`/courses/${c.id}`}
                        className="py-2.5 px-3 rounded-xl border border-gray-200 text-gray-800 font-bold text-xs hover:bg-gray-100 transition-colors text-center"
                      >
                        Scorecard & Info
                      </Link>
                      <Link
                        to={c.type === "Range" ? `/range-booking?tenantId=${c.id}` : `/booking?tenantId=${c.id}`}
                        className="py-2.5 px-3 rounded-xl bg-fairway text-white font-bold text-xs hover:bg-fairway/90 transition-all text-center shadow-sm flex items-center justify-center gap-1"
                      >
                        <span>{c.type === "Range" ? "🎯" : "⛳"}</span>
                        <span>{c.type === "Range" ? "Book Bays" : "Tee Times"}</span>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}
