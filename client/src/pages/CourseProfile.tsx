import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import NavBar from "../components/NavBar";
import { courseApi, type CourseHole, type Tenant } from "../api/course";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export default function CourseProfile() {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<"overview" | "holes">("overview");
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [holes, setHoles] = useState<CourseHole[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([courseApi.getTenant(id), courseApi.getHoles(id)])
      .then(([t, h]) => {
        setTenant(t);
        setHoles(h);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load course."));
  }, [id]);

  const totalPar = holes.reduce((s, h) => s + h.par, 0);
  const totalYardage = holes.reduce((s, h) => s + (h.yardageWhite || 0), 0);

  if (error) {
    return (
      <div className="min-h-screen">
        <div className="bg-gradient-to-br from-fairway to-turf"><NavBar /></div>
        <div className="max-w-3xl mx-auto px-8 py-16 text-sm text-[#C0533F]">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="bg-gradient-to-br from-fairway to-turf">
        <NavBar />
        <div className="px-8 md:px-14 pb-10 max-w-5xl mx-auto">
          <div className="text-mono text-xs tracking-widest uppercase text-sand mb-3">
            {tenant?.address || "Golf course"} · {holes.length} holes
          </div>
          <div className="flex items-center gap-4 mb-3">
            {tenant?.logoUrl && (
              <img
                src={`${API_BASE}${tenant.logoUrl}`}
                alt={`${tenant.name} logo`}
                className="w-14 h-14 rounded-md object-contain bg-white/10 p-1"
              />
            )}
            <h1 className="text-4xl font-semibold tracking-tight text-white">{tenant?.name || "Loading…"}</h1>
          </div>
          <p className="text-white/75 max-w-lg">{tenant?.description}</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-8 md:px-14 py-10">
        <div className="flex gap-2 mb-8 border-b border-[#E4E8E3]">
          {(["overview", "holes"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === t ? "border-turf text-fairway" : "border-transparent text-ink-soft"
              }`}
            >
              {t === "overview" ? "Overview" : "Hole-by-Hole"}
            </button>
          ))}
        </div>

        {tab === "overview" ? (
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4 text-sm text-ink-soft">
              <p>{holes.length} holes{totalPar > 0 ? `, par ${totalPar}` : ""}{totalYardage > 0 ? `, ${totalYardage.toLocaleString()} yards from the white tees` : ""}.</p>
              <p>Pro shop open daily 6:30a–7p. Cart and club rentals available. Practice range and putting green on site.</p>
            </div>
            <div className="bg-white border border-[#E4E8E3] rounded-md p-5 space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-ink-soft">Par</span><span className="font-medium">{totalPar}</span></div>
              <div className="flex justify-between"><span className="text-ink-soft">Yardage</span><span className="font-medium">{totalYardage.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-ink-soft">Holes</span><span className="font-medium">{holes.length}</span></div>
              <Link to={`/booking?tenantId=${id}`} className="block text-center bg-gold text-fairway px-4 py-2.5 rounded-[3px] font-semibold text-sm mt-2">
                Book a Tee Time
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-md border border-[#E4E8E3] overflow-hidden">
            <div className="grid grid-cols-3 text-mono text-xs uppercase tracking-wide text-ink-soft bg-[#FAFBF9] border-b border-[#EEF1ED] px-5 py-3">
              <span>Hole</span><span>Par</span><span>Yardage</span>
            </div>
            {holes.map((h) => (
              <div key={h.holeNumber} className="grid grid-cols-3 px-5 py-3 border-b border-[#EEF1ED] last:border-b-0 text-sm text-mono">
                <span className="font-semibold text-turf">{h.holeNumber}</span>
                <span>{h.par}</span>
                <span>{h.yardageWhite} yds</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
