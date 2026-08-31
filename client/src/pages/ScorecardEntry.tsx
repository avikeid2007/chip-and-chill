import { useEffect, useState, useMemo } from "react";
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

type RoundFormat = "18" | "front9" | "back9";

export default function ScorecardEntry() {
  const [allCourseHoles, setAllCourseHoles] = useState<CourseHole[]>([]);
  const [roundFormat, setRoundFormat] = useState<RoundFormat>("18");
  const [holeScores, setHoleScores] = useState<Record<number, number | null>>({});
  const [holeStats, setHoleStats] = useState<Record<number, HoleDetailStats>>({});
  const [activeHoleIndex, setActiveHoleIndex] = useState(0);
  const [viewMode, setViewMode] = useState<"stepper" | "matrix">("stepper");
  const [courses, setCourses] = useState<{ id: string; name: string }[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  // BUG-07/10 FIX: Store the selected tenant so we can use its real courseRating and slopeRating
  const [selectedTenant, setSelectedTenant] = useState<import("../api/course").Tenant | null>(null);
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
          // BUG-10 FIX: Fetch full tenant details to get real courseRating and slopeRating
          const tenantDetail = await courseApi.getTenant(initialTenantId).catch(() => null);
          if (tenantDetail) setSelectedTenant(tenantDetail);

          const h = await courseApi.getHoles(initialTenantId);
          if (h.length > 0) {
            setupHoles(h);
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
      setupHoles(defaultHoles);
    })();
  }, [searchParams]);

  function setupHoles(hList: CourseHole[]) {
    setAllCourseHoles(hList);
    const initialScores: Record<number, number | null> = {};
    const initialStats: Record<number, HoleDetailStats> = {};
    hList.forEach((hole) => {
      initialScores[hole.holeNumber] = null;
      initialStats[hole.holeNumber] = { putts: 2, fairway: hole.par === 3 ? "na" : "hit" };
    });
    setHoleScores(initialScores);
    setHoleStats(initialStats);
    setActiveHoleIndex(0);
  }

  async function handleCourseChange(courseId: string) {
    setSelectedCourseId(courseId);
    setLoading(true);
    try {
      // BUG-10 FIX: Fetch tenant details to update real course/slope rating on course change
      const tenantDetail = await courseApi.getTenant(courseId).catch(() => null);
      if (tenantDetail) setSelectedTenant(tenantDetail);

      const h = await courseApi.getHoles(courseId);
      if (h.length > 0) {
        setupHoles(h);
      }
    } catch {
      /* keep existing */
    } finally {
      setLoading(false);
    }
  }

  // Active holes based on round length (18 Holes vs Front 9 vs Back 9)
  const activeHoles = useMemo(() => {
    if (allCourseHoles.length <= 9) return allCourseHoles;
    if (roundFormat === "front9") {
      return allCourseHoles.slice(0, 9);
    }
    if (roundFormat === "back9") {
      return allCourseHoles.slice(9, 18);
    }
    return allCourseHoles;
  }, [allCourseHoles, roundFormat]);

  // Adjust active hole index if switching formats
  useEffect(() => {
    if (activeHoleIndex >= activeHoles.length) {
      setActiveHoleIndex(0);
    }
  }, [activeHoles.length, activeHoleIndex]);

  function updateScoreForHole(holeNum: number, value: number | null) {
    setHoleScores((prev) => ({ ...prev, [holeNum]: value }));
  }

  function updatePuttsForHole(holeNum: number, val: number) {
    setHoleStats((prev) => ({
      ...prev,
      [holeNum]: { ...(prev[holeNum] || { putts: 2, fairway: "hit" }), putts: Math.max(0, val) },
    }));
  }

  function updateFairwayForHole(holeNum: number, val: "left" | "hit" | "right" | "na") {
    setHoleStats((prev) => ({
      ...prev,
      [holeNum]: { ...(prev[holeNum] || { putts: 2, fairway: "hit" }), fairway: val },
    }));
  }

  function handleAutoFillPars() {
    const updated = { ...holeScores };
    activeHoles.forEach((h) => {
      if (updated[h.holeNumber] === null) {
        updated[h.holeNumber] = h.par;
      }
    });
    setHoleScores(updated);
  }

  function handleClearActiveScores() {
    const updated = { ...holeScores };
    activeHoles.forEach((h) => {
      updated[h.holeNumber] = null;
    });
    setHoleScores(updated);
  }

  const currentHole = activeHoles[activeHoleIndex] || activeHoles[0] || {
    holeNumber: 1,
    par: 4,
    handicapIndex: 1,
    yardageWhite: 380,
  };
  const currentStat = (currentHole && holeStats[currentHole.holeNumber]) || { putts: 2, fairway: "hit" };
  const currentHoleScore = currentHole ? holeScores[currentHole.holeNumber] : null;

  // Active calculations
  const holesPlayed = activeHoles.filter((h) => holeScores[h.holeNumber] !== null).length;
  const totalStrokes = activeHoles.reduce((s, h) => s + (holeScores[h.holeNumber] ?? 0), 0);
  const playedPar = activeHoles.reduce((s, h) => s + (holeScores[h.holeNumber] !== null ? h.par : 0), 0);
  const totalRoundPar = activeHoles.reduce((s, h) => s + h.par, 0);
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

    // BUG-04 FIX: Block submission if any active hole has no score entered.
    // Previously, null scores were silently submitted as par, corrupting differentials.
    const unplayedHoles = activeHoles.filter((h) => holeScores[h.holeNumber] === null);
    if (unplayedHoles.length > 0) {
      setError(
        `Please enter scores for all ${activeHoles.length} holes before submitting. ` +
        `Missing: Hole${unplayedHoles.length > 1 ? "s" : ""} ` +
        unplayedHoles.map((h) => h.holeNumber).join(", ") + ". " +
        `Use \"Auto-fill Pars\" to quickly fill unplayed holes with par.`
      );
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payloadHoles = activeHoles.map((h) => ({
        holeNumber: h.holeNumber,
        par: h.par,
        strokes: holeScores[h.holeNumber]!, // safe — we checked for nulls above
      }));

      // BUG-07/10 FIX: Use real courseRating and slopeRating from the selected tenant.
      // Fall back to defaults only if the course hasn't set these values.
      const isNineHole = activeHoles.length <= 9;
      const fallbackCourseRating = isNineHole ? 36.0 : 72.0;
      const fallbackSlopeRating = 113;
      const courseRating = selectedTenant?.courseRating ?? fallbackCourseRating;
      const slopeRating = selectedTenant?.slopeRating ?? fallbackSlopeRating;

      await roundsApi.create(
        {
          tenantId: selectedCourseId,
          playedOn: new Date(playedOn).toISOString(),
          teeBox,
          holes: payloadHoles,
          courseRating,
          slopeRating,
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
              <span className="text-[9px] font-bold text-sand leading-none">THRU</span>
              <span className="text-xs sm:text-sm font-black leading-none">{holesPlayed}/{activeHoles.length}</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  {roundFormat === "18" ? "18-Hole Gross" : roundFormat === "front9" ? "Front 9 Gross" : "Back 9 Gross"}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                    diff <= 0 ? "bg-emerald-100 text-emerald-800" : "bg-orange-100 text-orange-800"
                  }`}
                >
                  {holesPlayed > 0 ? scoreToParLabel(diff) : "E"}
                </span>
              </div>
              <div className="text-xl font-display font-black text-gray-900 leading-tight">
                {totalStrokes} <span className="text-xs font-normal text-gray-400 font-mono">/ Par {totalRoundPar}</span>
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
        {/* Round Setup Strip with 9 vs 18 Hole Switcher */}
        <div className="bg-white rounded-3xl border border-[#E4E8E3] p-4 sm:p-5 mb-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-fairway/70 block">
                Round Setup &amp; Course Selection
              </span>
              <h2 className="font-display font-black text-lg text-fairway">
                Log New Scorecard
              </h2>
            </div>

            {/* ⛳ 9 vs 18 HOLE TOGGLE BAR */}
            <div className="flex items-center p-1 bg-gray-100 rounded-2xl border border-gray-200 text-xs font-bold self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setRoundFormat("18")}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  roundFormat === "18"
                    ? "bg-fairway text-white shadow-xs"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                ⛳ 18 Holes (Full)
              </button>
              <button
                type="button"
                onClick={() => setRoundFormat("front9")}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  roundFormat === "front9"
                    ? "bg-fairway text-white shadow-xs"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                ⛳ 9 Holes (Front 1–9)
              </button>
              {allCourseHoles.length > 9 && (
                <button
                  type="button"
                  onClick={() => setRoundFormat("back9")}
                  className={`px-3 py-1.5 rounded-xl transition-all ${
                    roundFormat === "back9"
                      ? "bg-fairway text-white shadow-xs"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  ⛳ 9 Holes (Back 10–18)
                </button>
              )}
            </div>
          </div>

          {/* Form Fields: Course, Tee Box, Date, Quick Helpers */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
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

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                Tee Box
              </label>
              <select
                value={teeBox}
                onChange={(e) => setTeeBox(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 focus:ring-2 focus:ring-fairway/20 outline-none"
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
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 focus:ring-2 focus:ring-fairway/20 outline-none"
              />
            </div>
          </div>

          {/* Quick Score Utility Buttons */}
          <div className="flex items-center justify-between gap-2 pt-1 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-gray-500">
                Playing: <strong className="text-fairway">{activeHoles.length} Holes</strong> (Par {totalRoundPar})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAutoFillPars}
                className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 font-semibold text-[11px] transition-colors"
                title="Fill remaining unplayed holes with par"
              >
                ⚡ Auto-Fill Pars
              </button>
              {holesPlayed > 0 && (
                <button
                  type="button"
                  onClick={handleClearActiveScores}
                  className="px-2.5 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 text-[11px] font-semibold transition-colors"
                >
                  Clear Scores
                </button>
              )}
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
            {/* ── MODE 1: SINGLE-HOLE TOUCH STEPPER ───────────────────────────── */}
            {viewMode === "stepper" && currentHole && (
              <div className="space-y-6">
                {/* Horizontal Hole Carousel Pill Ribbon (Adjusts dynamically to 9 or 18 holes) */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
                  {activeHoles.map((h, idx) => {
                    const s = holeScores[h.holeNumber];
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
                          <span
                            className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                              isActive
                                ? "bg-gold"
                                : badge.cls.includes("emerald")
                                ? "bg-emerald-500"
                                : badge.cls.includes("amber")
                                ? "bg-amber-500"
                                : badge.cls.includes("orange")
                                ? "bg-orange-500"
                                : "bg-gray-400"
                            }`}
                          />
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
                      Hole {currentHole.holeNumber} ({activeHoleIndex + 1} of {activeHoles.length})
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
                          const cur = currentHoleScore ?? currentHole.par;
                          if (cur > 1) updateScoreForHole(currentHole.holeNumber, cur - 1);
                        }}
                        className="w-16 h-16 rounded-3xl bg-gray-100 text-gray-700 text-2xl font-bold flex items-center justify-center hover:bg-gray-200 active:scale-95 transition-all shadow-inner border border-gray-200"
                      >
                        −
                      </button>

                      <div className="flex flex-col items-center">
                        <span className="font-display text-6xl sm:text-7xl font-black text-gray-900 tracking-tight">
                          {currentHoleScore ?? currentHole.par}
                        </span>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-extrabold border mt-1 ${
                            getScoreBadge(currentHoleScore ?? currentHole.par, currentHole.par).cls
                          }`}
                        >
                          {getScoreBadge(currentHoleScore ?? currentHole.par, currentHole.par).label}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const cur = currentHoleScore ?? currentHole.par;
                          updateScoreForHole(currentHole.holeNumber, cur + 1);
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
                            onClick={() => updatePuttsForHole(currentHole.holeNumber, num)}
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
                          {currentStat.fairway === "hit"
                            ? "🎯 Hit"
                            : currentStat.fairway === "left"
                            ? "⬅️ Left"
                            : currentStat.fairway === "right"
                            ? "➡️ Right"
                            : "Par 3"}
                        </span>
                      </div>
                      {currentHole.par === 3 ? (
                        <div className="py-2 text-center text-xs text-gray-400 font-semibold italic">Par 3 • N/A</div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => updateFairwayForHole(currentHole.holeNumber, "left")}
                            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                              currentStat.fairway === "left"
                                ? "bg-orange-500 text-white"
                                : "bg-white text-gray-700 border border-gray-200"
                            }`}
                          >
                            ⬅️ Left
                          </button>
                          <button
                            type="button"
                            onClick={() => updateFairwayForHole(currentHole.holeNumber, "hit")}
                            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                              currentStat.fairway === "hit"
                                ? "bg-emerald-600 text-white"
                                : "bg-white text-gray-700 border border-gray-200"
                            }`}
                          >
                            🎯 Hit
                          </button>
                          <button
                            type="button"
                            onClick={() => updateFairwayForHole(currentHole.holeNumber, "right")}
                            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                              currentStat.fairway === "right"
                                ? "bg-orange-500 text-white"
                                : "bg-white text-gray-700 border border-gray-200"
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
                      ← Hole {activeHoleIndex > 0 ? activeHoles[activeHoleIndex - 1].holeNumber : activeHoles[0].holeNumber}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        // Set current hole as played if not touched
                        if (currentHoleScore === null) {
                          updateScoreForHole(currentHole.holeNumber, currentHole.par);
                        }
                        if (activeHoleIndex < activeHoles.length - 1) {
                          setActiveHoleIndex((prev) => prev + 1);
                        } else {
                          handleSubmit();
                        }
                      }}
                      className="flex-1 py-3.5 rounded-2xl bg-fairway text-white text-xs font-bold hover:bg-fairway/90 active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-md"
                    >
                      {activeHoleIndex < activeHoles.length - 1
                        ? `Hole ${activeHoles[activeHoleIndex + 1].holeNumber} →`
                        : "Review & Finish →"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── MODE 2: SCORECARD MATRIX (Adjusts to 9 or 18 holes) ─────────── */}
            {viewMode === "matrix" && (
              <div className="space-y-6">
                <div className="bg-white rounded-3xl border border-[#E4E8E3] overflow-hidden shadow-sm">
                  <div className="px-6 py-4 bg-[#FAFBF9] border-b border-gray-200 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-fairway uppercase tracking-wider">
                      {roundFormat === "18"
                        ? "Full 18-Hole Matrix"
                        : roundFormat === "front9"
                        ? "Front 9 Matrix (Holes 1–9)"
                        : "Back 9 Matrix (Holes 10–18)"}
                    </h3>
                    <span className="text-xs text-gray-500 font-mono">Tap any cell to edit</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs font-mono text-center border-collapse">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 text-[11px] font-sans">
                          <th className="py-3 px-3 text-left font-bold sticky left-0 bg-gray-50 z-10">Hole</th>
                          {activeHoles.map((h) => (
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
                          {activeHoles.map((h) => (
                            <td key={h.holeNumber} className="py-2.5 px-2">
                              {h.par}
                            </td>
                          ))}
                          <td className="py-2.5 px-3 font-bold bg-gray-50 text-fairway">{totalRoundPar}</td>
                        </tr>

                        {/* Strokes Row */}
                        <tr className="border-b border-gray-100">
                          <td className="py-3 px-3 text-left font-sans font-bold sticky left-0 bg-white z-10 text-gray-900">
                            SCORE
                          </td>
                          {activeHoles.map((h) => (
                            <td key={h.holeNumber} className="py-2 px-1">
                              <input
                                type="number"
                                min={1}
                                placeholder={String(h.par)}
                                value={holeScores[h.holeNumber] ?? ""}
                                onChange={(e) =>
                                  updateScoreForHole(
                                    h.holeNumber,
                                    e.target.value === "" ? null : Number(e.target.value)
                                  )
                                }
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
                    {saving ? "Saving Round..." : `Save Completed ${activeHoles.length}-Hole Round`}
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
