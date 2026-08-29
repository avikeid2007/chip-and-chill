import { useState, useEffect, useMemo } from "react";
import { tournamentApi } from "../api/tournament";
import type { TournamentHoleScore } from "../types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  tournamentId: string;
  registrationId: string;
  golferName: string;
  handicapIndex?: number | null;
  holesCount?: number;
  roundsCount?: number;
  currentRound?: number;
  initialScores?: TournamentHoleScore[];
  token?: string | null;
  onScoresSaved: () => void;
}

// Standard 18-hole default pars
const DEFAULT_PARS_18 = [4, 4, 3, 5, 4, 4, 3, 4, 5, 4, 4, 3, 5, 4, 4, 3, 4, 5];

export default function TournamentScorecardModal({
  isOpen,
  onClose,
  tenantId,
  tournamentId,
  registrationId,
  golferName,
  handicapIndex,
  holesCount = 18,
  roundsCount = 1,
  currentRound = 1,
  initialScores = [],
  token,
  onScoresSaved,
}: Props) {
  const [activeRound, setActiveRound] = useState(currentRound);
  const [holeScores, setHoleScores] = useState<{ holeNumber: number; grossScore: number; par: number }[]>([]);
  const [activeHalf, setActiveHalf] = useState<"front" | "back" | "all">("front");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize or re-populate scores when registration/modal opens or active round changes
  useEffect(() => {
    if (!isOpen) return;
    const initialMap = new Map<number, { gross: number; par: number }>();
    initialScores
      .filter((s) => (s.roundNumber || 1) === activeRound)
      .forEach((s) => initialMap.set(s.holeNumber, { gross: s.grossScore, par: s.par }));

    const count = holesCount > 0 ? holesCount : 18;
    const list = Array.from({ length: count }, (_, i) => {
      const hNum = i + 1;
      const defaultPar = DEFAULT_PARS_18[(hNum - 1) % DEFAULT_PARS_18.length];
      const existing = initialMap.get(hNum);
      return {
        holeNumber: hNum,
        grossScore: existing ? existing.gross : defaultPar,
        par: existing ? existing.par : defaultPar,
      };
    });

    setHoleScores(list);
    setError(null);
  }, [isOpen, registrationId, initialScores, holesCount, activeRound]);

  function handleScoreChange(holeNumber: number, newScore: number) {
    const clamped = Math.max(1, Math.min(15, newScore));
    setHoleScores((prev) =>
      prev.map((h) => (h.holeNumber === holeNumber ? { ...h, grossScore: clamped } : h))
    );
  }

  function handleParChange(holeNumber: number, newPar: number) {
    const clamped = Math.max(3, Math.min(6, newPar));
    setHoleScores((prev) =>
      prev.map((h) => (h.holeNumber === holeNumber ? { ...h, par: clamped } : h))
    );
  }

  function fillAllWithPar() {
    setHoleScores((prev) => prev.map((h) => ({ ...h, grossScore: h.par })));
  }

  // Live metrics calculations
  const metrics = useMemo(() => {
    const f9 = holeScores.filter((h) => h.holeNumber <= 9);
    const b9 = holeScores.filter((h) => h.holeNumber > 9);

    const f9Gross = f9.reduce((sum, h) => sum + h.grossScore, 0);
    const f9Par = f9.reduce((sum, h) => sum + h.par, 0);
    const b9Gross = b9.reduce((sum, h) => sum + h.grossScore, 0);
    const b9Par = b9.reduce((sum, h) => sum + h.par, 0);

    const totalGross = holeScores.reduce((sum, h) => sum + h.grossScore, 0);
    const totalPar = holeScores.reduce((sum, h) => sum + h.par, 0);
    const toPar = totalGross - totalPar;

    const hcp = handicapIndex !== null && handicapIndex !== undefined ? Math.round(handicapIndex) : 0;
    const totalNet = Math.max(0, totalGross - hcp);
    const netToPar = totalNet - totalPar;

    // Stableford Points
    const stableford = holeScores.reduce((sum, h) => {
      const diff = h.grossScore - h.par;
      if (diff <= -3) return sum + 5;
      if (diff === -2) return sum + 4;
      if (diff === -1) return sum + 3;
      if (diff === 0) return sum + 2;
      if (diff === 1) return sum + 1;
      return sum;
    }, 0);

    return {
      f9Gross,
      f9Par,
      b9Gross,
      b9Par,
      totalGross,
      totalPar,
      toPar,
      totalNet,
      netToPar,
      stableford,
      hcp,
    };
  }, [holeScores, handicapIndex]);

  async function handleSave() {
    if (!tenantId || !tournamentId || !registrationId) return;
    setSaving(true);
    setError(null);
    try {
      await tournamentApi.batchPostScores(
        tenantId,
        tournamentId,
        {
          registrationId,
          roundNumber: activeRound,
          scores: holeScores.map((h) => ({
            holeNumber: h.holeNumber,
            grossScore: h.grossScore,
            par: h.par,
          })),
        },
        token
      );
      onScoresSaved();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to save scorecard.");
    } finally {
      setSaving(false);
    }
  }

  if (!isOpen) return null;

  const displayedHoles =
    activeHalf === "front"
      ? holeScores.filter((h) => h.holeNumber <= 9)
      : activeHalf === "back"
      ? holeScores.filter((h) => h.holeNumber > 9)
      : holeScores;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-sand-dark shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden text-fairway font-sans">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-br from-[#0B3024] to-[#124E3F] text-white flex items-center justify-between relative overflow-hidden flex-shrink-0">
          <div className="relative z-10">
            <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-300 font-bold">
              Tournament Scorecard {roundsCount > 1 ? `· Round ${activeRound} of ${roundsCount}` : ""}
            </span>
            <h3 className="font-display font-black text-xl text-white mt-0.5 flex items-center gap-2">
              <span>{golferName}</span>
              {handicapIndex !== null && handicapIndex !== undefined && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-white/20 text-white font-mono font-medium">
                  HCP {handicapIndex.toFixed(1)}
                </span>
              )}
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="relative z-10 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm font-bold transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Round Switcher Tabs for Multi-round Events */}
        {roundsCount > 1 && (
          <div className="bg-[#062016] px-4 py-2 flex items-center gap-2 border-b border-emerald-800/60">
            <span className="text-[10px] font-mono text-emerald-300 uppercase font-bold mr-1">
              Active Round:
            </span>
            {Array.from({ length: roundsCount }).map((_, rIdx) => {
              const rNum = rIdx + 1;
              const isSelected = activeRound === rNum;
              return (
                <button
                  key={rNum}
                  type="button"
                  onClick={() => setActiveRound(rNum)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                    isSelected
                      ? "bg-gold text-fairway font-black shadow-sm"
                      : "bg-white/10 text-white/70 hover:text-white"
                  }`}
                >
                  Round {rNum}
                </button>
              );
            })}
          </div>
        )}

        {/* Live KPI Bar */}
        <div className="bg-mist p-3.5 border-b border-sand flex items-center justify-around text-center flex-shrink-0 flex-wrap gap-2">
          <div>
            <span className="text-[10px] uppercase font-mono text-fairway/60 block">Round {activeRound} Gross</span>
            <span className="font-display font-black text-xl text-fairway">{metrics.totalGross}</span>
          </div>
          <div className="h-6 w-px bg-sand" />
          <div>
            <span className="text-[10px] uppercase font-mono text-fairway/60 block">To Par</span>
            <span
              className={`font-display font-black text-xl ${
                metrics.toPar < 0 ? "text-emerald-600" : metrics.toPar > 0 ? "text-amber-700" : "text-fairway"
              }`}
            >
              {metrics.toPar === 0 ? "E" : metrics.toPar > 0 ? `+${metrics.toPar}` : metrics.toPar}
            </span>
          </div>
          <div className="h-6 w-px bg-sand" />
          <div>
            <span className="text-[10px] uppercase font-mono text-fairway/60 block">Net Total</span>
            <span className="font-display font-black text-xl text-fairway">
              {metrics.totalNet}{" "}
              <span className="text-xs font-normal text-fairway/50">
                ({metrics.netToPar === 0 ? "E" : metrics.netToPar > 0 ? `+${metrics.netToPar}` : metrics.netToPar})
              </span>
            </span>
          </div>
          <div className="h-6 w-px bg-sand" />
          <div>
            <span className="text-[10px] uppercase font-mono text-fairway/60 block">Stableford</span>
            <span className="font-display font-black text-xl text-gold-dark">{metrics.stableford} pts</span>
          </div>
        </div>

        {/* View Switcher & Quick Fill */}
        <div className="p-3 border-b border-sand flex items-center justify-between flex-wrap gap-2 bg-white flex-shrink-0">
          <div className="flex items-center gap-1.5 bg-mist p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveHalf("front")}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                activeHalf === "front" ? "bg-white text-fairway shadow-sm" : "text-fairway/60 hover:text-fairway"
              }`}
            >
              Front 9 (OUT: {metrics.f9Gross})
            </button>
            {holesCount > 9 && (
              <button
                type="button"
                onClick={() => setActiveHalf("back")}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                  activeHalf === "back" ? "bg-white text-fairway shadow-sm" : "text-fairway/60 hover:text-fairway"
                }`}
              >
                Back 9 (IN: {metrics.b9Gross})
              </button>
            )}
            <button
              type="button"
              onClick={() => setActiveHalf("all")}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                activeHalf === "all" ? "bg-white text-fairway shadow-sm" : "text-fairway/60 hover:text-fairway"
              }`}
            >
              All 18 Holes
            </button>
          </div>

          <button
            type="button"
            onClick={fillAllWithPar}
            className="text-[11px] font-semibold text-turf hover:text-turf/80 bg-turf/10 px-2.5 py-1 rounded-lg transition-colors"
          >
            ⚡ Preset all to Par
          </button>
        </div>

        {/* Holes Matrix List */}
        <div className="p-4 overflow-y-auto flex-1 space-y-2 divide-y divide-sand/60">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
              {error}
            </div>
          )}

          {displayedHoles.map((h) => {
            const diff = h.grossScore - h.par;
            let badgeColor = "bg-gray-100 text-gray-700 border-gray-200";
            let badgeLabel = "Par";
            if (diff <= -2) {
              badgeColor = "bg-amber-100 text-amber-900 border-amber-300 font-black";
              badgeLabel = "Eagle";
            } else if (diff === -1) {
              badgeColor = "bg-emerald-100 text-emerald-900 border-emerald-300 font-bold";
              badgeLabel = "Birdie";
            } else if (diff === 1) {
              badgeColor = "bg-orange-100 text-orange-900 border-orange-200";
              badgeLabel = "Bogey";
            } else if (diff >= 2) {
              badgeColor = "bg-rose-100 text-rose-900 border-rose-200";
              badgeLabel = `+${diff}`;
            }

            return (
              <div
                key={h.holeNumber}
                className="pt-2 first:pt-0 flex items-center justify-between gap-3 text-xs"
              >
                {/* Hole Info */}
                <div className="flex items-center gap-3 w-28">
                  <div className="w-8 h-8 rounded-xl bg-fairway/10 text-fairway font-bold flex items-center justify-center font-mono text-sm">
                    {h.holeNumber}
                  </div>
                  <div>
                    <span className="font-bold text-fairway block text-xs">Hole {h.holeNumber}</span>
                    <div className="flex items-center gap-1 text-[10px] text-fairway/60 font-mono">
                      <span>Par</span>
                      <select
                        value={h.par}
                        onChange={(e) => handleParChange(h.holeNumber, parseInt(e.target.value, 10))}
                        className="bg-transparent font-bold text-fairway border-b border-fairway/30 focus:outline-none"
                      >
                        <option value={3}>3</option>
                        <option value={4}>4</option>
                        <option value={5}>5</option>
                        <option value={6}>6</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Score badge */}
                <div className="w-16 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] border ${badgeColor}`}>
                    {badgeLabel}
                  </span>
                </div>

                {/* Score Quick Stepper */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleScoreChange(h.holeNumber, h.grossScore - 1)}
                    className="w-8 h-8 rounded-xl border border-sand-dark bg-mist hover:bg-sand text-fairway font-bold text-sm flex items-center justify-center transition-colors"
                  >
                    –
                  </button>

                  <input
                    type="number"
                    min={1}
                    max={15}
                    value={h.grossScore}
                    onChange={(e) => handleScoreChange(h.holeNumber, parseInt(e.target.value, 10) || h.par)}
                    className="w-12 h-8 rounded-xl border border-sand-dark text-center font-mono font-black text-sm text-fairway focus:outline-none focus:ring-2 focus:ring-fairway"
                  />

                  <button
                    type="button"
                    onClick={() => handleScoreChange(h.holeNumber, h.grossScore + 1)}
                    className="w-8 h-8 rounded-xl border border-sand-dark bg-mist hover:bg-sand text-fairway font-bold text-sm flex items-center justify-center transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-mist border-t border-sand flex items-center justify-between gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-sand-dark text-fairway font-bold text-xs hover:bg-sand/30 transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-fairway text-white font-extrabold text-xs shadow-md hover:bg-fairway-dark transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? "Saving Card..." : "✓ Save Full Scorecard"}
          </button>
        </div>
      </div>
    </div>
  );
}
