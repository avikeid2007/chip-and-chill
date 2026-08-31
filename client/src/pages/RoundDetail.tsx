import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import NavBar from "../components/NavBar";
import { useAuth } from "../api/AuthContext";
import { roundsApi, type Round } from "../api/rounds";
import { courseApi, type Tenant, type CourseHole } from "../api/course";

function scoreBadgeClass(strokes: number, par: number) {
  const diff = strokes - par;
  if (diff <= -2) return "bg-amber-100 text-amber-900 border-2 border-amber-500 rounded-full font-black"; // Eagle
  if (diff === -1) return "bg-emerald-100 text-emerald-900 border-2 border-emerald-500 rounded-full font-bold"; // Birdie
  if (diff === 0) return "text-gray-900 font-semibold"; // Par
  if (diff === 1) return "bg-orange-50 text-orange-900 border border-orange-300 rounded-md font-bold"; // Bogey
  return "bg-rose-100 text-rose-950 border-2 border-rose-500 rounded-md font-black"; // Double+
}

export default function RoundDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [round, setRound] = useState<Round | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [courseHoles, setCourseHoles] = useState<CourseHole[]>([]);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const shareCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user || !id) return;
    setLoading(true);
    roundsApi
      .getById(id, user.token)
      .then(async (r) => {
        setRound(r);
        if (r.tenantId) {
          try {
            const [t, h] = await Promise.all([
              courseApi.getTenant(r.tenantId),
              courseApi.getHoles(r.tenantId).catch(() => []),
            ]);
            setTenant(t);
            setCourseHoles(h);
          } catch {
            /* ignore tenant fetch errors */
          }
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load round."))
      .finally(() => setLoading(false));
  }, [user, id]);

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F7F9F6]">
        <div className="bg-gradient-to-br from-fairway to-turf text-white"><NavBar /></div>
        <div className="max-w-md mx-auto px-6 py-20 text-center">
          <div className="w-16 h-16 rounded-3xl bg-fairway/10 text-fairway flex items-center justify-center mx-auto mb-4 text-2xl">
            🔒
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Member Login Required</h2>
          <p className="text-xs text-gray-600 mb-6">Log in to view complete round scorecards and statistics.</p>
          <Link to="/login" className="inline-block px-6 py-3 rounded-2xl bg-fairway text-white text-xs font-bold shadow-md hover:bg-fairway/90">
            Log In Now →
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F9F6]">
        <div className="bg-gradient-to-br from-fairway to-turf text-white"><NavBar /></div>
        <main className="max-w-5xl mx-auto px-4 sm:px-8 py-12">
          <div className="h-44 bg-white rounded-3xl border border-gray-200 animate-pulse mb-6" />
          <div className="h-96 bg-white rounded-3xl border border-gray-200 animate-pulse" />
        </main>
      </div>
    );
  }

  if (error || !round) {
    return (
      <div className="min-h-screen bg-[#F7F9F6]">
        <div className="bg-gradient-to-br from-fairway to-turf text-white"><NavBar /></div>
        <main className="max-w-md mx-auto px-6 py-20 text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Round Not Found</h3>
          <p className="text-xs text-gray-500 mb-6">{error || "This round could not be located in your history."}</p>
          <Link to="/rounds" className="inline-block px-6 py-3 rounded-2xl bg-fairway text-white text-xs font-bold shadow-md">
            ← Back to Round History
          </Link>
        </main>
      </div>
    );
  }

  // Calculations
  const holes = round.holes || [];
  const totalStrokes = holes.reduce((s, h) => s + h.strokes, 0);
  const totalPar = holes.reduce((s, h) => s + h.par, 0);
  const toPar = totalStrokes - totalPar;

  const isNineHoles = holes.length <= 9;
  const isBackNineOnly = isNineHoles && holes.some((h) => h.holeNumber > 9);

  const front9 = isNineHoles && isBackNineOnly ? [] : holes.filter((h) => h.holeNumber <= 9 || isNineHoles);
  const back9 = isNineHoles && isBackNineOnly ? holes : holes.filter((h) => h.holeNumber > 9);

  const frontPar = front9.reduce((s, h) => s + h.par, 0);
  const frontStrokes = front9.reduce((s, h) => s + h.strokes, 0);
  const backPar = back9.reduce((s, h) => s + h.par, 0);
  const backStrokes = back9.reduce((s, h) => s + h.strokes, 0);

  // Scoring breakdown
  const eagles = holes.filter((h) => h.strokes - h.par <= -2).length;
  const birdies = holes.filter((h) => h.strokes - h.par === -1).length;
  const pars = holes.filter((h) => h.strokes - h.par === 0).length;
  const bogeys = holes.filter((h) => h.strokes - h.par === 1).length;
  const doublesOrWorse = holes.filter((h) => h.strokes - h.par >= 2).length;

  const courseName = tenant?.name || "Championship Golf Links";
  const formattedDate = new Date(round.playedOn).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  function handleCopyShareLink() {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  }

  return (
    <div className="min-h-screen bg-[#F7F9F6] text-gray-900 font-sans flex flex-col pb-28 md:pb-12 print:bg-white print:pb-0">
      <div className="bg-gradient-to-br from-[#0B3024] via-[#124233] to-[#08241B] text-white print:hidden">
        <NavBar />
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-8 py-8 md:py-12 w-full flex-1">
        {/* Navigation & Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 print:hidden">
          <Link
            to="/rounds"
            className="text-xs font-bold text-gray-500 hover:text-fairway flex items-center gap-1.5 transition-colors self-start"
          >
            ← Back to Round History
          </Link>

          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setShowShareModal(true)}
              className="px-4 py-2.5 rounded-2xl bg-white border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm flex items-center gap-1.5"
            >
              <span>📸</span> Share Match Card
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2.5 rounded-2xl bg-white border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm flex items-center gap-1.5"
            >
              <span>🖨️</span> Print Scorecard
            </button>

            <Link
              to="/rounds/new"
              className="px-5 py-2.5 rounded-2xl bg-fairway text-white text-xs font-bold hover:bg-fairway/90 transition-all shadow-md flex items-center gap-1.5"
            >
              <span>+</span> Log New Round
            </Link>
          </div>
        </div>

        {/* ── ROUND HEADER HERO CARD ───────────────────────────────────────── */}
        <div className="bg-white rounded-3xl border border-[#E4E8E3] shadow-md p-6 sm:p-8 mb-8 relative overflow-hidden print:border-none print:shadow-none print:p-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-100 text-[11px] font-bold uppercase tracking-wider">
                  ⛳ {isNineHoles ? (isBackNineOnly ? "9-Hole Round (Back 9)" : "9-Hole Round (Front 9)") : "18-Hole Championship Round"}
                </span>
                <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-[11px] font-bold">
                  {round.teeBox} Tees
                </span>
                {round.handicapDifferential !== undefined && round.handicapDifferential !== null && (
                  <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-200 text-[11px] font-mono font-bold">
                    WHS Diff: {round.handicapDifferential > 0 ? `+${round.handicapDifferential.toFixed(1)}` : round.handicapDifferential.toFixed(1)}
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-4xl font-display font-black text-fairway tracking-tight">
                {courseName}
              </h1>

              <p className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                <span>📅</span> {formattedDate}
                {tenant?.address && <span>• 📍 {tenant.address}</span>}
              </p>
            </div>

            {/* Score Callout Badge */}
            <div className="flex items-center gap-4 bg-gradient-to-br from-[#0B3024] to-[#1B4332] text-white p-5 rounded-3xl shadow-lg sm:min-w-[200px] justify-center">
              <div className="text-center">
                <span className="text-[10px] font-mono uppercase tracking-widest text-sand block font-bold">
                  Gross Score
                </span>
                <span className="font-display text-5xl font-black tracking-tight block my-0.5">
                  {totalStrokes}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold inline-block ${
                  toPar <= 0 ? "bg-emerald-400 text-emerald-950" : "bg-white/20 text-white"
                }`}>
                  {toPar === 0 ? "E (Even Par)" : toPar > 0 ? `+${toPar} Over Par` : `${toPar} Under Par`}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── KPI HIGHLIGHTS BAR ───────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-8">
          <div className="bg-white rounded-2xl border border-[#E4E8E3] p-4 text-center shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
              {isNineHoles && isBackNineOnly ? "Back 9 (IN)" : "Front 9 (OUT)"}
            </span>
            <span className="text-2xl font-black text-gray-900 font-mono block mt-1">
              {isNineHoles && isBackNineOnly ? backStrokes : frontStrokes}
            </span>
            <span className="text-[10px] text-gray-400 font-mono">
              Par {isNineHoles && isBackNineOnly ? backPar : frontPar}
            </span>
          </div>

          <div className="bg-white rounded-2xl border border-[#E4E8E3] p-4 text-center shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
              {isNineHoles ? "Round Length" : "Back 9 (IN)"}
            </span>
            <span className="text-2xl font-black text-gray-900 font-mono block mt-1">
              {isNineHoles ? "9 Holes" : backStrokes}
            </span>
            <span className="text-[10px] text-gray-400 font-mono">
              {isNineHoles ? `Total Par ${totalPar}` : `Par ${backPar}`}
            </span>
          </div>

          <div className="bg-white rounded-2xl border border-[#E4E8E3] p-4 text-center shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">🦅 Eagles+</span>
            <span className="text-2xl font-black text-amber-900 font-mono block mt-1">{eagles}</span>
            <span className="text-[10px] text-gray-400 font-mono">{eagles > 0 ? `${((eagles / holes.length) * 100).toFixed(0)}%` : "0%"}</span>
          </div>

          <div className="bg-white rounded-2xl border border-[#E4E8E3] p-4 text-center shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">🐦 Birdies</span>
            <span className="text-2xl font-black text-emerald-900 font-mono block mt-1">{birdies}</span>
            <span className="text-[10px] text-gray-400 font-mono">{birdies > 0 ? `${((birdies / holes.length) * 100).toFixed(0)}%` : "0%"}</span>
          </div>

          <div className="bg-white rounded-2xl border border-[#E4E8E3] p-4 text-center shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-600 block">⛳ Pars</span>
            <span className="text-2xl font-black text-gray-900 font-mono block mt-1">{pars}</span>
            <span className="text-[10px] text-gray-400 font-mono">{((pars / holes.length) * 100).toFixed(0)}%</span>
          </div>

          <div className="bg-white rounded-2xl border border-[#E4E8E3] p-4 text-center shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-orange-700 block">🟧 Bogeys+</span>
            <span className="text-2xl font-black text-orange-950 font-mono block mt-1">{bogeys + doublesOrWorse}</span>
            <span className="text-[10px] text-gray-400 font-mono">{(((bogeys + doublesOrWorse) / holes.length) * 100).toFixed(0)}%</span>
          </div>
        </div>

        {/* ── CHAMPIONSHIP SCORECARD MATRIX ────────────────────────────────── */}
        <div className="bg-white rounded-3xl border border-[#E4E8E3] shadow-sm overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-[#0B3024] to-[#1B4332] text-white px-6 py-4 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider">Official Scorecard</h2>
            <span className="text-xs font-mono text-sand">
              {holes.length === 18
                ? "18-Hole Championship Matrix"
                : isBackNineOnly
                ? "9-Hole Matrix (Back 9 · Holes 10–18)"
                : "9-Hole Matrix (Front 9 · Holes 1–9)"}
            </span>
          </div>

          {/* FIRST TABLE: FRONT 9 (OR ALL 9 HOLES IF 9-HOLE ROUND) */}
          {(front9.length > 0 || (isNineHoles && isBackNineOnly)) && (
            <div className="overflow-x-auto border-b border-gray-200">
              <div className="px-4 py-2 bg-gray-50 text-[11px] font-bold uppercase tracking-wider text-gray-500 border-b border-gray-200">
                {isNineHoles ? (isBackNineOnly ? "Back 9 (IN)" : "Front 9 (OUT)") : "Front 9 (OUT)"}
              </div>
              <table className="w-full text-xs font-mono text-center border-collapse">
                <thead>
                  <tr className="bg-[#FAFBF9] border-b border-gray-200 text-gray-500 text-[11px] font-sans">
                    <th className="py-2.5 px-3 text-left font-bold w-24 sticky left-0 bg-[#FAFBF9] z-10">HOLE</th>
                    {(front9.length > 0 ? front9 : back9).map((h) => (
                      <th key={h.holeNumber} className="py-2.5 px-2 font-bold text-fairway min-w-[38px]">
                        {h.holeNumber}
                      </th>
                    ))}
                    <th className="py-2.5 px-3 font-black bg-gray-100 text-gray-900 min-w-[50px]">
                      {isNineHoles ? (isBackNineOnly ? "IN" : "OUT") : "OUT"}
                    </th>
                    {isNineHoles && (
                      <th className="py-2.5 px-4 font-black bg-fairway text-white min-w-[65px]">TOTAL</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {/* Yardage Row (if available) */}
                  {courseHoles.length > 0 && (
                    <tr className="border-b border-gray-100 text-gray-400 text-[10px]">
                      <td className="py-2 px-3 text-left font-sans font-semibold sticky left-0 bg-white z-10 text-gray-400">
                        YDS
                      </td>
                      {(front9.length > 0 ? front9 : back9).map((h) => {
                        const ch = courseHoles.find((x) => x.holeNumber === h.holeNumber);
                        return (
                          <td key={h.holeNumber} className="py-2 px-2">
                            {ch?.yardageWhite || "—"}
                          </td>
                        );
                      })}
                      <td className="py-2 px-3 font-bold bg-gray-50 text-gray-500">
                        {(front9.length > 0 ? front9 : back9).reduce((s, h) => {
                          const ch = courseHoles.find((x) => x.holeNumber === h.holeNumber);
                          return s + (ch?.yardageWhite || 0);
                        }, 0)}
                      </td>
                      {isNineHoles && (
                        <td className="py-2 px-4 font-bold bg-gray-100 text-gray-800">
                          {(front9.length > 0 ? front9 : back9).reduce((s, h) => {
                            const ch = courseHoles.find((x) => x.holeNumber === h.holeNumber);
                            return s + (ch?.yardageWhite || 0);
                          }, 0)}
                        </td>
                      )}
                    </tr>
                  )}

                  {/* Par Row */}
                  <tr className="border-b border-gray-100 text-gray-500">
                    <td className="py-2.5 px-3 text-left font-sans font-bold sticky left-0 bg-white z-10 text-gray-500">
                      PAR
                    </td>
                    {(front9.length > 0 ? front9 : back9).map((h) => (
                      <td key={h.holeNumber} className="py-2.5 px-2 font-semibold">
                        {h.par}
                      </td>
                    ))}
                    <td className="py-2.5 px-3 font-bold bg-gray-50 text-fairway">
                      {isNineHoles && isBackNineOnly ? backPar : frontPar}
                    </td>
                    {isNineHoles && (
                      <td className="py-2.5 px-4 font-black bg-gray-100 text-fairway">{totalPar}</td>
                    )}
                  </tr>

                  {/* Score Row */}
                  <tr className="border-b border-gray-100">
                    <td className="py-3 px-3 text-left font-sans font-bold sticky left-0 bg-white z-10 text-gray-900">
                      SCORE
                    </td>
                    {(front9.length > 0 ? front9 : back9).map((h) => (
                      <td key={h.holeNumber} className="py-2 px-1">
                        <span className={`inline-flex items-center justify-center w-8 h-8 ${scoreBadgeClass(h.strokes, h.par)}`}>
                          {h.strokes}
                        </span>
                      </td>
                    ))}
                    <td className="py-3 px-3 font-black text-sm bg-emerald-50 text-emerald-950 font-mono">
                      {isNineHoles && isBackNineOnly ? backStrokes : frontStrokes}
                    </td>
                    {isNineHoles && (
                      <td className="py-3 px-4 font-black text-base bg-emerald-600 text-white font-mono shadow-inner">
                        {totalStrokes}
                      </td>
                    )}
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* SECOND TABLE: BACK 9 (ONLY IF 18 HOLES) */}
          {!isNineHoles && back9.length > 0 && (
            <div className="overflow-x-auto">
              <div className="px-4 py-2 bg-gray-50 text-[11px] font-bold uppercase tracking-wider text-gray-500 border-b border-gray-200">
                Back 9 (IN)
              </div>
              <table className="w-full text-xs font-mono text-center border-collapse">
                <thead>
                  <tr className="bg-[#FAFBF9] border-b border-gray-200 text-gray-500 text-[11px] font-sans">
                    <th className="py-2.5 px-3 text-left font-bold w-24 sticky left-0 bg-[#FAFBF9] z-10">HOLE</th>
                    {back9.map((h) => (
                      <th key={h.holeNumber} className="py-2.5 px-2 font-bold text-fairway min-w-[38px]">
                        {h.holeNumber}
                      </th>
                    ))}
                    <th className="py-2.5 px-3 font-black bg-gray-100 text-gray-900 min-w-[50px]">IN</th>
                    <th className="py-2.5 px-4 font-black bg-fairway text-white min-w-[65px]">TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Yardage Row */}
                  {courseHoles.length >= 18 && (
                    <tr className="border-b border-gray-100 text-gray-400 text-[10px]">
                      <td className="py-2 px-3 text-left font-sans font-semibold sticky left-0 bg-white z-10 text-gray-400">
                        YDS
                      </td>
                      {back9.map((h, i) => (
                        <td key={h.holeNumber} className="py-2 px-2">
                          {courseHoles[9 + i]?.yardageWhite || "—"}
                        </td>
                      ))}
                      <td className="py-2 px-3 font-bold bg-gray-50 text-gray-500">
                        {back9.reduce((s, _, i) => s + (courseHoles[9 + i]?.yardageWhite || 0), 0)}
                      </td>
                      <td className="py-2 px-4 font-bold bg-gray-100 text-gray-800">
                        {courseHoles.reduce((s, h) => s + (h.yardageWhite || 0), 0)}
                      </td>
                    </tr>
                  )}

                  {/* Par Row */}
                  <tr className="border-b border-gray-100 text-gray-500">
                    <td className="py-2.5 px-3 text-left font-sans font-bold sticky left-0 bg-white z-10 text-gray-500">
                      PAR
                    </td>
                    {back9.map((h) => (
                      <td key={h.holeNumber} className="py-2.5 px-2 font-semibold">
                        {h.par}
                      </td>
                    ))}
                    <td className="py-2.5 px-3 font-bold bg-gray-50 text-fairway">{backPar}</td>
                    <td className="py-2.5 px-4 font-black bg-gray-100 text-fairway">{totalPar}</td>
                  </tr>

                  {/* Score Row */}
                  <tr>
                    <td className="py-3 px-3 text-left font-sans font-bold sticky left-0 bg-white z-10 text-gray-900">
                      SCORE
                    </td>
                    {back9.map((h) => (
                      <td key={h.holeNumber} className="py-2 px-1">
                        <span className={`inline-flex items-center justify-center w-8 h-8 ${scoreBadgeClass(h.strokes, h.par)}`}>
                          {h.strokes}
                        </span>
                      </td>
                    ))}
                    <td className="py-3 px-3 font-black text-sm bg-emerald-50 text-emerald-950 font-mono">
                      {backStrokes}
                    </td>
                    <td className="py-3 px-4 font-black text-base bg-emerald-600 text-white font-mono shadow-inner">
                      {totalStrokes}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── PRINT-ONLY SIGNATURE CERTIFICATION FOOTER ─────────────────────── */}
        <div className="hidden print:block pt-8 border-t border-gray-300 text-xs">
          <div className="grid grid-cols-2 gap-12 mb-6">
            <div>
              <div className="border-b border-gray-400 pb-1 mb-1 font-bold text-gray-700">Player Signature:</div>
              <span className="text-[10px] text-gray-500">{user.firstName} {user.lastName} ({user.email})</span>
            </div>
            <div>
              <div className="border-b border-gray-400 pb-1 mb-1 font-bold text-gray-700">Attest / Marker Signature:</div>
              <span className="text-[10px] text-gray-500">Official Handicap Attestation</span>
            </div>
          </div>
          <div className="text-[10px] text-gray-400 font-mono text-center">
            Certified official scorecard generated by Chip &amp; Chill Golf Platform. Complies with World Handicap System rules.
          </div>
        </div>
      </main>

      {/* ── SOCIAL SHARE STORY RECAP MODAL ─────────────────────────────────── */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-gray-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-[#FAFBF9]">
              <div className="flex items-center gap-2">
                <span className="text-xl">📸</span>
                <h3 className="text-sm font-bold text-gray-900">Share Match Recap Card</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300 flex items-center justify-center font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-6">
              {/* Luxury Share Card Preview */}
              <div
                ref={shareCardRef}
                className="bg-gradient-to-br from-[#07241B] via-[#0E3A2C] to-[#051A13] text-white p-6 sm:p-8 rounded-3xl shadow-2xl border border-white/15 relative overflow-hidden text-center"
              >
                {/* Decorative background circle */}
                <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />
                <div className="absolute -bottom-12 -left-12 w-48 h-48 rounded-full bg-gold/10 blur-2xl pointer-events-none" />

                {/* Logo & Tag */}
                <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3 text-left">
                  <div>
                    <span className="font-display font-black text-lg text-white tracking-tight">
                      Chip <span className="italic text-sand font-serif">&amp;</span> Chill
                    </span>
                    <span className="text-[10px] text-emerald-400 block font-mono">MATCH RECAP</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-white/80 text-[10px] font-mono">
                    {formattedDate}
                  </span>
                </div>

                {/* Golfer & Course */}
                <div className="my-2">
                  <h4 className="text-xl sm:text-2xl font-bold font-display text-white">
                    {user.firstName || user.lastName ? `${user.firstName || ""} ${user.lastName || ""}`.trim() : user.email}
                  </h4>
                  <p className="text-xs text-sand font-medium mt-0.5">
                    {courseName} • {round.teeBox} Tees
                  </p>
                </div>

                {/* Big Score Spotlight */}
                <div className="my-6 py-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-white/60 block">
                    Gross Score
                  </span>
                  <div className="font-display text-6xl font-black text-white my-1">
                    {totalStrokes}
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-black inline-block ${
                    toPar <= 0 ? "bg-emerald-400 text-emerald-950" : "bg-sand text-fairway"
                  }`}>
                    {toPar === 0 ? "EVEN PAR" : toPar > 0 ? `+${toPar} TO PAR` : `${toPar} UNDER PAR`}
                  </span>
                </div>

                {/* Stat Highlights */}
                <div className="grid grid-cols-3 gap-2 pt-2 text-center text-xs">
                  <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                    <span className="text-emerald-400 font-bold block text-sm">{birdies}</span>
                    <span className="text-[10px] text-white/70">Birdies</span>
                  </div>
                  <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                    <span className="text-white font-bold block text-sm">{pars}</span>
                    <span className="text-[10px] text-white/70">Pars</span>
                  </div>
                  <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                    <span className="text-amber-400 font-bold block text-sm">
                      {round.handicapDifferential !== undefined && round.handicapDifferential !== null ? round.handicapDifferential.toFixed(1) : "—"}
                    </span>
                    <span className="text-[10px] text-white/70">WHS Diff</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={handleCopyShareLink}
                  className="flex-1 py-3 rounded-2xl bg-fairway text-white text-xs font-bold hover:bg-fairway/90 transition-all shadow-md flex items-center justify-center gap-2"
                >
                  {copiedLink ? "✓ Link Copied to Clipboard!" : "🔗 Copy Match Link"}
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="py-3 px-5 rounded-2xl bg-gray-100 text-gray-700 text-xs font-bold hover:bg-gray-200 transition-colors"
                >
                  🖨️ Print / Save PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
