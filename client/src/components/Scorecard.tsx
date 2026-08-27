import type { ScorecardHole } from "../types";

interface ScorecardProps {
  courseName: string;
  date: string;
  teeBox: string;
  holes: ScorecardHole[]; // expects 9 or 18 holes
}

function cellClass(score: number, par: number) {
  const diff = score - par;
  if (diff <= -1) return "text-turf font-bold relative after:absolute after:inset-1 after:rounded-full after:border-[1.5px] after:border-turf";
  if (diff >= 1) return "text-gold";
  return "";
}

export default function Scorecard({ courseName, date, teeBox, holes }: ScorecardProps) {
  const front = holes.slice(0, 9);
  const totalPar = front.reduce((s, h) => s + h.par, 0);
  const totalScore = front.reduce((s, h) => s + h.score, 0);

  return (
    <div className="bg-white rounded-md border border-[#E4E8E3] overflow-hidden shadow-[0_20px_50px_-25px_rgba(27,67,50,0.25)]">
      <div className="flex justify-between items-center px-6 py-5 bg-fairway text-white">
        <h3 className="text-lg font-semibold">{courseName}</h3>
        <span className="text-mono text-xs opacity-70 uppercase">{date} · {teeBox}</span>
      </div>
      <div className="grid text-mono text-[0.82rem]" style={{ gridTemplateColumns: "120px repeat(9, 1fr) 70px" }}>
        <div className="py-2.5 pl-4 text-left text-ink-soft font-sans font-medium text-xs uppercase tracking-wide border-b border-r border-[#EEF1ED] bg-[#FAFBF9]">Hole</div>
        {front.map((h) => (
          <div key={`h-${h.hole}`} className="py-2.5 text-center border-b border-r border-[#EEF1ED] bg-[#FAFBF9] font-semibold text-turf">{h.hole}</div>
        ))}
        <div className="py-2.5 text-center border-b border-[#EEF1ED] bg-mist font-bold text-fairway">OUT</div>

        <div className="py-2.5 pl-4 text-left text-ink-soft font-sans font-medium text-xs uppercase tracking-wide border-b border-r border-[#EEF1ED]">Par</div>
        {front.map((h) => (
          <div key={`p-${h.hole}`} className="py-2.5 text-center border-b border-r border-[#EEF1ED] text-ink-soft">{h.par}</div>
        ))}
        <div className="py-2.5 text-center border-b border-[#EEF1ED] bg-mist font-bold text-fairway">{totalPar}</div>

        <div className="py-2.5 pl-4 text-left text-ink-soft font-sans font-medium text-xs uppercase tracking-wide border-r border-[#EEF1ED]">Score</div>
        {front.map((h) => (
          <div key={`s-${h.hole}`} className={`py-2.5 text-center border-r border-[#EEF1ED] ${cellClass(h.score, h.par)}`}>{h.score}</div>
        ))}
        <div className="py-2.5 text-center bg-mist font-bold text-fairway">{totalScore}</div>
      </div>
    </div>
  );
}
