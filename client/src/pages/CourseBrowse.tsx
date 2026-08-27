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
    <div className="min-h-screen">
      <div className="bg-fairway">
        <NavBar />
      </div>
      <div className="max-w-5xl mx-auto px-8 md:px-14 py-16">
        <div className="text-mono text-xs tracking-widest uppercase text-turf mb-3">Directory</div>
        <h1 className="text-3xl font-semibold tracking-tight text-fairway mb-8">Find a course or range</h1>

        <input
          type="text"
          placeholder="Search by name or city..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input mb-8"
        />

        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

        <div className="grid gap-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="card p-5 h-[72px] animate-pulse" />
            ))
          ) : courses.length === 0 ? (
            <div className="card p-10 text-center">
              <div className="text-2xl mb-2">⛳</div>
              <p className="text-sm text-ink-soft">No courses found.</p>
            </div>
          ) : (
            courses.map((c) => (
              <Link
                key={c.id}
                to={`/courses/${c.id}`}
                className="card card-hover p-5 flex items-center justify-between hover:border-turf transition-colors cursor-pointer"
              >
                <div>
                  <h3 className="font-display font-semibold text-lg text-fairway">{c.name}</h3>
                  <p className="text-sm text-ink-soft">
                    {c.address || "Location TBD"} · {c.type === "Range" ? "Driving range" : "Golf course"}
                  </p>
                </div>
                <span className="text-mono text-xs text-turf">View →</span>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
