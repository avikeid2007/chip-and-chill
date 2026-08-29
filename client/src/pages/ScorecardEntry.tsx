import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import NavBar from "../components/NavBar";
import { useAuth } from "../api/AuthContext";
import { roundsApi } from "../api/rounds";
import { courseApi, type CourseHole } from "../api/course";
import { apiFetch } from "../api/client";
import { toDateInput } from "../utils/time";

function scoreToParLabel(diff: number): string {
  if (diff === 0) return "E";
  return diff > 0 ? `+${diff}` : String(diff);
}

function getScoreBadge(strokes: number | null, par: number) {
  if (strokes === null) return { label: "Unplayed", cls: "bg-gray-100 text-gray-500 border-gray-200" };
  const diff = strokes - par;
  if (diff <= -2) return { label: "Eagle+", cls: "bg-amber-100 text-amber-900 border-amber-300 font-bold" };
  if (diff === -1) return { label: "Birdie", cls: "bg-emerald-100 text-emerald-900 border-emerald-300 font-bold" };
  if (diff === 0) return { label: "Par", cls: "bg-fairway/10 text-fairway border-fairway/20 font-bold" };
  if (diff === 1) return { label: "Bogey", cls: "bg-orange-100 text-orange-900 border-orange-200 font-bold" };
  return { label: "Double+", cls: "bg-rose-100 text-rose-900 border-rose-200 font-bold" };
}

interface HoleDetailStats {
  putts: number;
  fairway: "left" | "hit" | "right" | "na";
}

export default function ScorecardEntry() {
  const [holes, setHoles] = useState<CourseHole[]>([]);
  const [scores, setScores] = useState<(number | null)[]>([]);
  const [stats, setStats] = useState<HoleDetailStats[]>([]);
  const [activeHoleIndex, setActiveHoleIndex] = useState(0);
  const [viewMode, setViewMode] = useState<"stepper" | "matrix">("stepper");
  const [courses, setCourses] = useState<{ id: string; name: string }[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [teeBox, setTeeBox] = useState("White");
  const [playedOn, setPlayedOn] = useState(() => toDateInput(new Date()));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  useEffect(() => {
    (async () => {
      try {
        const tenants = await apiFetch<{ id: string; name: string }[]>("/api/tenants");
        setCourses(tenants);
        const initialTenantId = searchParams.get("tenantId") || (tenants.length > 0 ? tenants[0].id : "");
        setSelectedCourseId(initialTenantId);

        if (initialTenantId) {
          const h = await courseApi.getHoles(initialTenantId);
          if (h.length > 0) {
            setHoles(h);
            setScores(h.map(() => null));
            setStats(h.map((hole) => ({ putts: 2, fairway: hole.par === 3 ? "na" : "hit" })));
            return;
          }
        }
      } catch {
        /* fallback */
      } finally {
        setLoading(false);
      }

      const fallbackPar = [4, 4, 3, 5, 4, 4, 3, 5, 4, 4, 3, 5, 4, 4, 3, 4, 5, 4];
      const defaultHoles: CourseHole[] = fallbackPar.map((par, i) => ({
        id: `fallback-${i}`,
        tenantId: "",
        holeNumber: i + 1,
        par,
        handicapIndex: i + 1,
        yardageWhite: 380,
      }));
      setHoles(defaultHoles);
      setScores(defaultHoles.map(() => null));
      setStats(defaultHoles.map((hole) => ({ putts: 2, fairway: hole.par === 3 ? "na" : "hit" })));
    })();
  }, [searchParams]);

  async function handleCourseChange(courseId: string) {
    setSelectedCourseId(courseId);
    setLoading(true);
    try {
      const h = await courseApi.getHoles(courseId);
      if (h.length > 0) {
        setHoles(h);
        setScores(h.map(() => null));
        setStats(h.map((hole) => ({ putts: 2, fairway: hole.par === 3 ? "na" : "hit" })));
        setActiveHoleIndex(0);
      }
    } catch {
      /* keep existing */
    } finally {
      setLoading(false);
    }
  }

  function updateScore(index: number, value: number | null) {
    setScores((prev) => prev.map((s, i) => (i === index ? value : s)));
  }

  function updatePutts(index: number, val: number) {
    setStats((prev) => prev.map((st, i) => (i === index ? { ...st, putts: Math.max(0, val) } : st)));
  }

  function updateFairway(index: number, val: "left" | "hit" | "right" | "na") {
    setStats((prev) => prev.map((st, i) => (i === index ? { ...st, fairway: val } : st)));
  }

  const currentHole = holes[activeHoleIndex] || holes[0];
  const currentStat = stats[activeHoleIndex] || { putts: 2, fairway: "hit" };

  // Calculations
  const holesPlayed = scores.filter((s) => s !== null).length;
  const totalStrokes = scores.reduce((s: number, v) => s + (v ?? 0), 0);
  const playedPar = holes.reduce((s, h, i) => s + (scores[i] !== null ? h.par : 0), 0);
  const totalCoursePar = holes.reduce((s, h) => s + h.par, 0);
  const diff = totalStrokes - playedPar;

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!user) {
      setError("Please log in to save your scorecard.");
      return;
    }
    if (!selectedCourseId) {
      setError("Please select a golf course.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await roundsApi.create(
        {
          tenantId: selectedCourseId,
          playedOn: new Date(playedOn).toISOString(),
          teeBox,
          holes: holes.map((h, i) => ({
            holeNumber: h.holeNumber,
            par: h.par,
            strokes: scores[i] ?? h.par,
          })),
        },
        user.token
      );
      navigate("/rounds");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save scorecard.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F7F9F6] text-gray-900 font-sans flex flex-col pb-28 md:pb-12">
      <div className="bg-gradient-to-br from-[#0B3024] via-[#124233] to-[#08241B] text-white">
        <NavBar />
      </div>

      {/* Floating In-Round Sticky Bar (Mobile & Desktop) */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#E4E8E3] shadow-sm px-4 sm:px-8 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-fairway text-white flex flex-col items-center justify-center font-mono shadow-sm">
              <span className="text-[10px] font-bold text-sand leading-none">THRU</span>
              <span className="text-sm font-black leading-none">{holesPlayed}</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Gross Score</span>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${diff <= 0 ? "bg-emerald-100 text-emerald-800" : "bg-orange-100 text-orange-800"}`}>
                  {holesPlayed > 0 ? scoreToParLabel(diff) : "E"}
                </span>
              </div>
              <div className="text-xl font-display font-black text-gray-900 leading-tight">
                {totalStrokes} <span className="text-xs font-normal text-gray-400 font-mono">/ Par {totalCoursePar}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200">
              <button
                type="button"
                onClick={() => setViewMode("stepper")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  viewMode === "stepper" ? "bg-white text-fairway shadow-sm" : "text-gray-500 hover:text-gray-900"
                }`}
              >
                📱 Hole
              </button>
              <button
                type="button"
                onClick={() => setViewMode("matrix")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  viewMode === "matrix" ? "bg-white text-fairway shadow-sm" : "text-gray-500 hover:text-gray-900"
                }`}
              >
                📋 Matrix
              </button>
            </div>

            <button
              onClick={() => handleSubmit()}
              disabled={saving || holesPlayed === 0}
              className="px-4 py-2 rounded-xl bg-fairway text-white text-xs font-bold hover:bg-fairway/90 transition-colors disabled:opacity-50 shadow-sm"
            >
              {saving ? "Saving..." : "Finish Round"}
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-8 py-6 w-full flex-1">
        {/* Round Setup Strip */}
        <div className="bg-white rounded-2xl border border-[#E4E8E3] p-4 mb-6 shadow-sm flex flex-wrap items-center justify-between gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
              Selected Course
            </label>
            <select
              value={selectedCourseId}
              onChange={(e) => handleCourseChange(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 focus:ring-2 focus:ring-fairway/20 outline-none"
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                Tee Box
              </label>
              <select
                value={teeBox}
                onChange={(e) => setTeeBox(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 focus:ring-2 focus:ring-fairway/20 outline-none"
              >
                <option value="Black">Black (Championship)</option>
                <option value="Blue">Blue (Tournament)</option>
                <option value="White">White (Member)</option>
                <option value="Gold">Gold (Senior)</option>
                <option value="Red">Red (Forward)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                Date Played
              </label>
              <input
                type="date"
                value={playedOn}
                onChange={(e) => setPlayedOn(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 focus:ring-2 focus:ring-fairway/20 outline-none"
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 mb-6 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
            <span>⚠️</span> {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            <div className="h-16 bg-white rounded-2xl border border-gray-200 animate-pulse" />
            <div className="h-80 bg-white rounded-3xl border border-gray-200 animate-pulse" />
          </div>
        ) : (
          <>
            {/* ── MODE 1: MOBILE SINGLE-HOLE STEPPER ───────────────────────────── */}
            {viewMode === "stepper" && currentHole && (
          <div className="space-y-6">
            {/* Horizontal 18-Hole Carousel Pill Ribbon */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
              {holes.map((h, idx) => {
                const s = scores[idx];
                const isActive = idx === activeHoleIndex;
                const badge = getScoreBadge(s, h.par);
                return (
                  <button
                    key={h.holeNumber}
                    type="button"
                    onClick={() => setActiveHoleIndex(idx)}
                    className={`flex-shrink-0 flex flex-col items-center justify-center w-11 h-14 rounded-2xl border transition-all duration-200 ${
                      isActive
                        ? "bg-fairway text-white border-fairway shadow-md scale-105"
                        : s !== null
                        ? "bg-white text-gray-900 border-gray-200 hover:border-fairway/40"
                        : "bg-gray-50 text-gray-400 border-dashed border-gray-200"
                    }`}
                  >
                    <span className={`text-[10px] font-bold ${isActive ? "text-sand" : "text-gray-400"}`}>
                      #{h.holeNumber}
                    </span>
                    <span className="text-xs font-black font-mono mt-0.5">
                      {s !== null ? s : h.par}
                    </span>
                    {s !== null && (
                      <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${isActive ? "bg-gold" : badge.cls.includes("emerald") ? "bg-emerald-500" : badge.cls.includes("amber") ? "bg-amber-500" : badge.cls.includes("orange") ? "bg-orange-500" : "bg-gray-400"}`} />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Current Hole Card Hero */}
            <div className="bg-white rounded-3xl border border-[#E4E8E3] shadow-md p-6 sm:p-8 text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-500 via-fairway to-gold" />

              {/* Hole Header */}
              <div className="flex items-center justify-between mb-4">
                <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-100 text-xs font-bold">
                  Hole {currentHole.holeNumber} of {holes.length}
                </span>
                <div className="flex items-center gap-3 text-xs font-mono text-gray-500 font-semibold">
                  <span>Par <strong>{currentHole.par}</strong></span>
                  {currentHole.yardageWhite && <span>• <strong>{currentHole.yardageWhite}</strong> yds</span>}
                  <span>• SI <strong>{currentHole.handicapIndex}</strong></span>
                </div>
              </div>

              {/* Giant Thumb-Friendly Score Stepper */}
              <div className="my-6">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block mb-2">
                  Strokes
                </span>
                <div className="flex items-center justify-center gap-6">
                  <button
                    type="button"
                    onClick={() => {
                      const cur = scores[activeHoleIndex] ?? currentHole.par;
                      if (cur > 1) updateScore(activeHoleIndex, cur - 1);
                    }}
                    className="w-16 h-16 rounded-3xl bg-gray-100 text-gray-700 text-2xl font-bold flex items-center justify-center hover:bg-gray-200 active:scale-95 transition-all shadow-inner border border-gray-200"
                  >
                    −
                  </button>

                  <div className="flex flex-col items-center">
                    <span className="font-display text-6xl sm:text-7xl font-black text-gray-900 tracking-tight">
                      {scores[activeHoleIndex] ?? currentHole.par}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-extrabold border mt-1 ${getScoreBadge(scores[activeHoleIndex] ?? currentHole.par, currentHole.par).cls}`}>
                      {getScoreBadge(scores[activeHoleIndex] ?? currentHole.par, currentHole.par).label}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const cur = scores[activeHoleIndex] ?? currentHole.par;
                      updateScore(activeHoleIndex, cur + 1);
                    }}
                    className="w-16 h-16 rounded-3xl bg-fairway text-white text-2xl font-bold flex items-center justify-center hover:bg-fairway/90 active:scale-95 transition-all shadow-md"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Detailed In-Round Touch Stats (Putts & Fairway Hit) */}
              <div className="pt-6 mt-6 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                {/* Putts Stepper */}
                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-700">Putts</span>
                    <span className="font-mono text-sm font-bold text-fairway">{currentStat.putts}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {[0, 1, 2, 3, 4].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => updatePutts(activeHoleIndex, num)}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                          currentStat.putts === num
                            ? "bg-fairway text-white shadow-sm"
                            : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-100"
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Fairway Hit Chips */}
                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-700">Fairway</span>
                    <span className="text-xs font-bold text-emerald-800">
                      {currentStat.fairway === "hit" ? "🎯 Hit" : currentStat.fairway === "left" ? "⬅️ Left" : currentStat.fairway === "right" ? "➡️ Right" : "Par 3"}
                    </span>
                  </div>
                  {currentHole.par === 3 ? (
                    <div className="py-2 text-center text-xs text-gray-400 font-semibold italic">Par 3 • N/A</div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateFairway(activeHoleIndex, "left")}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                          currentStat.fairway === "left" ? "bg-orange-500 text-white" : "bg-white text-gray-700 border border-gray-200"
                        }`}
                      >
                        ⬅️ Left
                      </button>
                      <button
                        type="button"
                        onClick={() => updateFairway(activeHoleIndex, "hit")}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                          currentStat.fairway === "hit" ? "bg-emerald-600 text-white" : "bg-white text-gray-700 border border-gray-200"
                        }`}
                      >
                        🎯 Hit
                      </button>
                      <button
                        type="button"
                        onClick={() => updateFairway(activeHoleIndex, "right")}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                          currentStat.fairway === "right" ? "bg-orange-500 text-white" : "bg-white text-gray-700 border border-gray-200"
                        }`}
                      >
                        ➡️ Right
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Prev / Next Hole Touch Navigation */}
              <div className="mt-8 flex items-center justify-between gap-4">
                <button
                  type="button"
                  disabled={activeHoleIndex === 0}
                  onClick={() => setActiveHoleIndex((prev) => Math.max(0, prev - 1))}
                  className="flex-1 py-3.5 rounded-2xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 active:scale-95 disabled:opacity-30 transition-all flex items-center justify-center gap-1.5"
                >
                  ← Hole {activeHoleIndex > 0 ? activeHoleIndex : 1}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    // Set current hole as played if not touched
                    if (scores[activeHoleIndex] === null) {
                      updateScore(activeHoleIndex, currentHole.par);
                    }
                    if (activeHoleIndex < holes.length - 1) {
                      setActiveHoleIndex((prev) => prev + 1);
                    } else {
                      handleSubmit();
                    }
                  }}
                  className="flex-1 py-3.5 rounded-2xl bg-fairway text-white text-xs font-bold hover:bg-fairway/90 active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-md"
                >
                  {activeHoleIndex < holes.length - 1 ? `Hole ${activeHoleIndex + 2} →` : "Review & Finish →"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── MODE 2: FULL 18-HOLE SCORECARD MATRIX ────────────────────────── */}
        {viewMode === "matrix" && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-[#E4E8E3] overflow-hidden shadow-sm">
              <div className="px-6 py-4 bg-[#FAFBF9] border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-sm font-bold text-fairway uppercase tracking-wider">Full 18-Hole Matrix</h3>
                <span className="text-xs text-gray-500 font-mono">Tap any cell to edit</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono text-center border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 text-[11px] font-sans">
                      <th className="py-3 px-3 text-left font-bold sticky left-0 bg-gray-50 z-10">Hole</th>
                      {holes.map((h) => (
                        <th key={h.holeNumber} className="py-3 px-2 font-bold text-fairway">
                          {h.holeNumber}
                        </th>
                      ))}
                      <th className="py-3 px-3 font-black bg-gray-100 text-gray-900">TOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Par Row */}
                    <tr className="border-b border-gray-100 text-gray-500">
                      <td className="py-2.5 px-3 text-left font-sans font-bold sticky left-0 bg-white z-10 text-gray-400">
                        PAR
                      </td>
                      {holes.map((h) => (
                        <td key={h.holeNumber} className="py-2.5 px-2">
                          {h.par}
                        </td>
                      ))}
                      <td className="py-2.5 px-3 font-bold bg-gray-50 text-fairway">{totalCoursePar}</td>
                    </tr>

                    {/* Strokes Row */}
                    <tr className="border-b border-gray-100">
                      <td className="py-3 px-3 text-left font-sans font-bold sticky left-0 bg-white z-10 text-gray-900">
                        SCORE
                      </td>
                      {holes.map((h, idx) => (
                        <td key={h.holeNumber} className="py-2 px-1">
                          <input
                            type="number"
                            min={1}
                            placeholder={String(h.par)}
                            value={scores[idx] ?? ""}
                            onChange={(e) => updateScore(idx, e.target.value === "" ? null : Number(e.target.value))}
                            className="w-8 h-8 rounded-lg border border-gray-200 text-center font-bold text-xs focus:ring-2 focus:ring-fairway outline-none"
                          />
                        </td>
                      ))}
                      <td className="py-3 px-3 font-black text-sm bg-emerald-50 text-emerald-900">
                        {totalStrokes}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="text-right">
              <button
                type="button"
                onClick={() => handleSubmit()}
                disabled={saving}
                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-fairway text-white text-sm font-bold hover:bg-fairway/90 transition-colors shadow-md"
              >
                {saving ? "Saving Round..." : "Save Completed Round"}
              </button>
            </div>
          </div>
        )}
      </>
    )}
  </main>
    </div>
  );
}
