import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "../components/NavBar";
import { useAuth } from "../api/AuthContext";
import { roundsApi } from "../api/rounds";
import { courseApi, type CourseHole } from "../api/course";
import { apiFetch } from "../api/client";

function scoreToParLabel(diff: number): string {
  if (diff === 0) return "E";
  return diff > 0 ? `+${diff}` : String(diff);
}

interface NineProps {
  label: string;
  holes: CourseHole[];
  scores: (number | null)[];
  offset: number;
  onChange: (index: number, value: number | null) => void;
}

// Renders one 9-hole strip (Hole/Par/Score rows + OUT or IN subtotal),
// horizontally scrollable on its own so it never clips on narrow screens.
function NineHoles({ label, holes, scores, offset, onChange }: NineProps) {
  const subtotalPar = holes.reduce((s, h) => s + h.par, 0);
  const subtotalScore = holes.reduce((s, _h, i) => s + (scores[offset + i] ?? 0), 0);
  const subtotalLabel = label === "Front 9" ? "OUT" : "IN";

  return (
    <div className="card overflow-hidden mb-4">
      <div className="px-4 py-2.5 border-b border-line bg-[#FAFBF9] text-xs font-semibold uppercase tracking-wide text-turf">
        {label}
      </div>
      <div className="overflow-x-auto">
        <div
          className="grid text-mono text-[0.82rem] min-w-max"
          style={{ gridTemplateColumns: `72px repeat(${holes.length}, 42px) 52px` }}
        >
          <div className="py-2.5 pl-4 text-left text-ink-soft font-sans font-medium text-xs uppercase bg-[#FAFBF9] border-b border-r border-[#EEF1ED] sticky left-0">Hole</div>
          {holes.map((h) => (
            <div key={h.holeNumber} className="py-2.5 text-center font-semibold text-turf bg-[#FAFBF9] border-b border-r border-[#EEF1ED]">{h.holeNumber}</div>
          ))}
          <div className="py-2.5 text-center font-bold text-fairway bg-mist border-b border-[#EEF1ED]">{subtotalLabel}</div>

          <div className="py-2.5 pl-4 text-left text-ink-soft font-sans font-medium text-xs uppercase border-r border-[#EEF1ED] sticky left-0 bg-white">Par</div>
          {holes.map((h) => (
            <div key={h.holeNumber} className="py-2.5 text-center text-ink-soft border-r border-[#EEF1ED]">{h.par}</div>
          ))}
          <div className="py-2.5 text-center font-bold text-fairway bg-mist">{subtotalPar}</div>

          <div className="py-2 pl-4 text-left text-ink-soft font-sans font-medium text-xs uppercase border-r border-[#EEF1ED] flex items-center sticky left-0 bg-white">Score</div>
          {holes.map((h, i) => (
            <div key={h.holeNumber} className="py-1.5 px-1 border-r border-[#EEF1ED] flex justify-center">
              <input
                type="number"
                inputMode="numeric"
                min={1}
                placeholder={String(h.par)}
                value={scores[offset + i] ?? ""}
                onChange={(e) => onChange(offset + i, e.target.value === "" ? null : Number(e.target.value))}
                className="w-9 h-9 text-center border border-line rounded text-sm outline-none focus:border-turf focus:ring-2 focus:ring-turf/15"
              />
            </div>
          ))}
          <div className="py-2.5 text-center font-bold text-fairway bg-mist">{subtotalScore}</div>
        </div>
      </div>
    </div>
  );
}

export default function ScorecardEntry() {
  const [holes, setHoles] = useState<CourseHole[]>([]);
  const [scores, setScores] = useState<(number | null)[]>([]);
  const [teeBox, setTeeBox] = useState("White");
  const [playedOn, setPlayedOn] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Load the course's holes (par per hole) from the API; fall back to a
  // default 18-hole par layout if no tenant/holes exist yet.
  useEffect(() => {
    (async () => {
      try {
        const tenants = await apiFetch<{ id: string }[]>("/api/tenants");
        if (tenants.length === 0) throw new Error("No courses available.");
        const h = await courseApi.getHoles(tenants[0].id);
        if (h.length > 0) {
          setHoles(h);
          setScores(h.map(() => null));
          return;
        }
      } catch {
        /* fall through to default */
      } finally {
        setLoading(false);
      }
      const fallbackPar = [4, 3, 5, 4, 4, 3, 4, 5, 4, 4, 3, 5, 4, 4, 3, 4, 5, 4];
      setHoles(fallbackPar.map((par, i) => ({
        id: `fallback-${i}`,
        holeNumber: i + 1,
        par,
        yardageWhite: 0,
      })));
      setScores(fallbackPar.map(() => null));
    })();
  }, []);

  function updateScore(index: number, value: number | null) {
    setScores((prev) => prev.map((s, i) => (i === index ? value : s)));
  }

  const total = scores.reduce((s: number, v) => s + (v ?? 0), 0);
  const totalPar = holes.reduce((s, h) => s + h.par, 0);
  const diff = total - totalPar;
  const front9 = holes.slice(0, 9);
  const back9 = holes.slice(9, 18);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      setError("You need to be logged in to save a round.");
      return;
    }
    setError(null);
    try {
      let tenantId: string | null = null;
      try {
        const tenants = await apiFetch<{ id: string }[]>("/api/tenants");
        tenantId = tenants[0]?.id ?? null;
      } catch {
        /* leave null */
      }
      if (!tenantId) {
        setError("No course available to attach this round to.");
        return;
      }
      await roundsApi.create(
        {
          tenantId,
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
      setError(err instanceof Error ? err.message : "Failed to save round.");
    }
  }

  return (
    <div className="min-h-screen">
      <div className="bg-fairway">
        <NavBar />
      </div>
      <div className="max-w-2xl mx-auto px-4 sm:px-8 py-10 sm:py-16">
        <div className="text-mono text-xs tracking-widest uppercase text-turf mb-3">Scorecard</div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-fairway mb-6">Enter your round</h1>

        <form onSubmit={handleSubmit}>
          <div className="mb-6 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-ink-soft">Tee box</label>
              <select
                value={teeBox}
                onChange={(e) => setTeeBox(e.target.value)}
                className="border border-line rounded-md px-3 py-2 text-sm"
              >
                <option>White</option>
                <option>Blue</option>
                <option>Red</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-ink-soft">Date</label>
              <input
                type="date"
                value={playedOn}
                onChange={(e) => setPlayedOn(e.target.value)}
                className="border border-line rounded-md px-3 py-2 text-sm"
              />
            </div>
          </div>

          {loading ? (
            <div className="card p-6 mb-6 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-4 bg-line rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              <NineHoles label="Front 9" holes={front9} scores={scores} offset={0} onChange={updateScore} />
              {back9.length > 0 && (
                <NineHoles label="Back 9" holes={back9} scores={scores} offset={9} onChange={updateScore} />
              )}
            </>
          )}

          <div className="card p-5 mb-6 flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="text-xs uppercase tracking-wide text-ink-soft mb-1">Total score</div>
              <div className="font-display text-3xl font-semibold text-fairway">{total}</div>
            </div>
            <div className="text-right">
              <div className="text-xs uppercase tracking-wide text-ink-soft mb-1">To par ({totalPar})</div>
              <div className={`pill ${diff <= 0 ? "pill-green" : "pill-red"} text-base px-3 py-1`}>{scoreToParLabel(diff)}</div>
            </div>
          </div>

          {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

          <button type="submit" className="btn-primary w-full sm:w-auto">
            Save round
          </button>
        </form>
      </div>
    </div>
  );
}
