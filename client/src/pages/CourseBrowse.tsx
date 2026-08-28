import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import NavBar from "../components/NavBar";
import { courseApi, type Tenant } from "../api/course";

export default function CourseBrowse() {
  const [courses, setCourses] = useState<Tenant[]>([]);
  const [search, setSearch] = useState("");
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
    }, 250);
    return () => clearTimeout(timeout);
  }, [search]);

  return (
    <div className="min-h-screen bg-[#FAFBF9]">
      <div className="bg-fairway">
        <NavBar />
      </div>
      <div className="max-w-5xl mx-auto px-6 md:px-14 py-14 space-y-8">
        <div>
          <div className="text-mono text-xs tracking-widest uppercase text-turf mb-2 font-bold">
            Course &amp; Facility Directory
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-semibold tracking-tight text-fairway">
            Find a Golf Course or Range
          </h1>
          <p className="text-xs text-fairway/70 mt-1 max-w-lg leading-relaxed">
            Discover premier golf clubs, practice ranges, and championship venues. Choose a course to view its live tee sheet.
          </p>
        </div>

        <div className="relative">
          <input
            type="text"
            placeholder="Search courses by name, city, or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-sand-dark text-fairway text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-fairway"
          />
        </div>

        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

        <div className="grid gap-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-sand p-6 h-28 animate-pulse" />
            ))
          ) : courses.length === 0 ? (
            <div className="bg-white rounded-2xl border border-sand-dark p-12 text-center space-y-2">
              <div className="text-3xl">⛳</div>
              <p className="text-fairway font-medium">No courses found.</p>
              <p className="text-xs text-fairway/60">Try searching for a different name or location.</p>
            </div>
          ) : (
            courses.map((c) => (
              <div
                key={c.id}
                className="bg-white rounded-2xl border border-sand-dark p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-turf transition-all hover:shadow-md"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <h3 className="font-display font-bold text-xl text-fairway">{c.name}</h3>
                    <span className="text-[10px] font-mono uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-fairway/10 text-fairway font-semibold">
                      {c.type === "Range" ? "Driving Range" : "Golf Club"}
                    </span>
                  </div>
                  <p className="text-xs text-fairway/70">
                    📍 {c.address || "Location TBD"}
                  </p>
                  {c.description && (
                    <p className="text-xs text-fairway/60 line-clamp-1 max-w-xl">
                      {c.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
                  <Link
                    to={`/courses/${c.id}`}
                    className="py-2.5 px-4 rounded-xl border border-sand-dark text-fairway font-medium text-xs hover:bg-mist transition-colors text-center"
                  >
                    View Details
                  </Link>
                  <Link
                    to={`/booking?tenantId=${c.id}`}
                    className="py-2.5 px-5 rounded-xl bg-gold text-fairway font-semibold text-xs hover:bg-gold-light transition-colors text-center shadow-sm flex items-center gap-1.5"
                  >
                    <span>⛳</span> Book Tee Times
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
